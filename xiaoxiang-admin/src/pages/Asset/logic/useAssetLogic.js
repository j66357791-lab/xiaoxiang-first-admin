// src/pages/Asset/logic/useAssetLogic.js
/**
 * 资产中心业务逻辑 Hook
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { message, Modal } from 'antd';
import { useUser } from '../../../context/UserContext';
import { ROLE_CONFIG } from '../../../constants/asset';
import { logger } from '../utils/logger';
import { STORAGE_KEYS } from '../utils/constants';
import { 
  fetchAdminOrders, 
  saveSnapshot as apiSaveSnapshot,
  fetchLatestSnapshot,
  fetchVersionHistory,
  restoreVersion as apiRestoreVersion,
  deleteVersion as apiDeleteVersion,
  // ✅ 库存快照API
  saveInventorySnapshot,
  fetchLatestInventorySnapshot,
  fetchInventoryVersionHistory,
  restoreInventoryVersion,
  deleteInventoryVersion,
} from '../utils/api';
import {
  formatOrdersToAssets,
  buildSnapshot,
  parseSnapshotData,
  calculateStats,
  calculateRevenueStats,
  isStatus,
} from '../utils/formatters';

import { DEFAULT_SKU_LIST, DEFAULT_CATEGORIES, SALE_STATUS } from '../constants/inventoryConstants';
import { updateSkuStock } from '../utils/inventoryUtils';

// ==================== 主 Hook ====================
export const useAssetLogic = () => {
  // 用户权限
  const { user } = useUser();
  const currentRole = user?.role || 'admin';
  const permissions = ROLE_CONFIG[currentRole] || ROLE_CONFIG.admin;

  // ==================== 状态定义 ====================
  const [loading, setLoading] = useState(false);
  const [allAssets, setAllAssets] = useState([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [lastArchiveInfo, setLastArchiveInfo] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);

  // 弹窗状态
  const [activeRecord, setActiveRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDisposeModal, setShowDisposeModal] = useState(false);

  // ✅ SKU相关状态
  const [skuList, setSkuList] = useState(DEFAULT_SKU_LIST);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  // ✅ 库存快照状态
  const [inventorySnapshotInfo, setInventorySnapshotInfo] = useState(null);
  const [inventoryVersionHistory, setInventoryVersionHistory] = useState([]);
  const [hasInventoryChanges, setHasInventoryChanges] = useState(false);

  // ==================== 1. 拉取前端订单 ====================
  const pullFrontendOrders = useCallback(async () => {
    logger.startFlow('拉取前端订单');
    setLoading(true);
    message.loading({ content: '正在拉取订单中心数据...', key: 'pull' });

    try {
      const result = await fetchAdminOrders();

      if (result.success && result.data.length > 0) {
        logger.data('订单中心原始数据', result.data);
        
        const formattedAssets = formatOrdersToAssets(result.data);
        logger.data('格式化后的资产数据', formattedAssets);

        setAllAssets(formattedAssets);
        setIsPreviewMode(true);
        setLastArchiveInfo(null);

        message.success({ 
          content: '成功拉取 ' + formattedAssets.length + ' 条订单 (预览模式)', 
          key: 'pull' 
        });
        logger.success('拉取成功', '共 ' + formattedAssets.length + ' 条');

      } else if (result.success && result.data.length === 0) {
        message.warning({ content: '订单中心暂无数据', key: 'pull' });
        setAllAssets([]);
      } else {
        message.error({ content: result.message || '拉取失败', key: 'pull' });
      }

    } catch (error) {
      logger.error('拉取异常', error);
      message.error({ content: '拉取异常: ' + error.message, key: 'pull' });
    } finally {
      setLoading(false);
      logger.endFlow('拉取前端订单');
    }
  }, []);

  // ==================== 2. 保存资产快照 ====================
  const saveSnapshot = useCallback(async (remark) => {
    logger.startFlow('保存快照');

    if (allAssets.length === 0) {
      message.warning('没有数据需要保存');
      return;
    }

    if (!remark) {
      message.error('存档备注不能为空');
      return;
    }

    setLoading(true);
    message.loading({ content: '正在保存快照...', key: 'save' });

    try {
      const snapshot = buildSnapshot(allAssets, remark);
      const result = await apiSaveSnapshot(snapshot, remark);

      if (result.success) {
        setLastArchiveInfo({
          time: snapshot.lastArchiveInfo.time,
          remark: remark
        });
        setIsPreviewMode(false);
        clearLocalDraft();
        await getVersionHistory();

        message.success({ 
          content: '快照保存成功！版本号: ' + (result.data?.version || ''), 
          key: 'save' 
        });
        logger.success('保存成功', result.data);
      } else {
        message.error({ content: result.message || '保存失败', key: 'save' });
      }

    } catch (error) {
      logger.error('保存异常', error);
      message.error({ content: '保存失败: ' + error.message, key: 'save' });
    } finally {
      setLoading(false);
      logger.endFlow('保存快照');
    }
  }, [allAssets]);

  // ==================== 3. 读取最新资产快照 ====================
  const loadLatestSnapshot = useCallback(async () => {
    logger.startFlow('读取最新快照');
    setLoading(true);
    message.loading({ content: '正在读取快照...', key: 'load' });

    try {
      const result = await fetchLatestSnapshot();

      if (result.success && result.data) {
        const parsed = parseSnapshotData(result.data);

        if (parsed && parsed.assets.length > 0) {
          setAllAssets(parsed.assets);
          setLastArchiveInfo(parsed.lastArchiveInfo);
          setIsPreviewMode(false);

          message.success({ 
            content: '读取成功，版本 ' + parsed.version + '，共 ' + parsed.assets.length + ' 条数据', 
            key: 'load' 
          });
          logger.success('读取成功', '版本 ' + parsed.version);
        } else {
          setAllAssets([]);
          setLastArchiveInfo(null);
          message.info({ content: '暂无快照数据', key: 'load' });
        }
      } else {
        setAllAssets([]);
        setLastArchiveInfo(null);
        message.info({ content: '暂无快照数据', key: 'load' });
      }

      await getVersionHistory();

    } catch (error) {
      logger.error('读取失败', error);
      message.error({ content: '读取失败', key: 'load' });
    } finally {
      setLoading(false);
      logger.endFlow('读取最新快照');
    }
  }, []);

  // ==================== 4. 获取资产历史版本 ====================
  const getVersionHistory = useCallback(async () => {
    const result = await fetchVersionHistory();
    if (result.success) {
      setVersionHistory(result.data);
    }
  }, []);

  // ==================== 5. 恢复资产版本 ====================
  const restoreVersion = useCallback(async (versionId) => {
    logger.startFlow('恢复历史版本');
    setLoading(true);
    message.loading({ content: '正在恢复版本...', key: 'restore' });

    try {
      const result = await apiRestoreVersion(versionId);

      if (result.success && result.data) {
        const parsed = parseSnapshotData(result.data);

        if (parsed && parsed.assets.length > 0) {
          setAllAssets(parsed.assets);
          setLastArchiveInfo(parsed.lastArchiveInfo);
          setIsPreviewMode(false);
          await getVersionHistory();

          message.success({ content: '已恢复到版本 ' + parsed.version, key: 'restore' });
        }
      } else {
        message.error({ content: result.message || '恢复失败', key: 'restore' });
      }

    } catch (error) {
      logger.error('恢复失败', error);
      message.error({ content: '恢复失败', key: 'restore' });
    } finally {
      setLoading(false);
      logger.endFlow('恢复历史版本');
    }
  }, []);

  // ==================== 6. 删除资产版本 ====================
  const deleteVersion = useCallback((versionId) => {
    Modal.confirm({
      title: '确认删除该版本？',
      content: '删除后不可恢复',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const result = await apiDeleteVersion(versionId);
        if (result.success) {
          message.success('版本已删除');
          await getVersionHistory();
        } else {
          message.error(result.message || '删除失败');
        }
      }
    });
  }, [getVersionHistory]);

  // ==================== 本地存储功能 ====================
  
  useEffect(() => {
    if (isPreviewMode && allAssets.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify({
          timestamp: new Date().toISOString(),
          data: allAssets
        }));
      } catch (e) {
        logger.warning('存储空间不足', e);
      }
    }
  }, [allAssets, isPreviewMode]);

  const clearLocalDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.DRAFT);
  }, []);

  // ==================== 资产操作 ====================

  const handleViewDetail = useCallback((record) => {
    setActiveRecord(record);
    setShowDetailModal(true);
  }, []);

  const handleDispose = useCallback((record) => {
    setActiveRecord(record);
    setShowDisposeModal(true);
  }, []);

  const handleShelve = useCallback((record) => {
    const newStatus = !record.isShelved;
    setAllAssets(prev => prev.map(item => 
      item.id === record.id ? { ...item, isShelved: newStatus } : item
    ));
    message.success(newStatus ? '已搁置' : '已取消搁置');
  }, []);

  const handleSaveDispose = useCallback((values) => {
    const now = new Date().toISOString();
    setAllAssets(prev => prev.map(item => 
      item.id === activeRecord.id 
        ? { ...item, ...values, status: 'Disposed', disposedAt: now } 
        : item
    ));
    message.success('处置成功');
    setShowDisposeModal(false);
  }, [activeRecord]);

  const handleUpdateTracking = useCallback((record, newAction) => {
    const now = new Date().toISOString();
    logger.sync.log(`handleUpdateTracking: ${record.orderNumber} -> ${newAction}`);

    // 更新订单数据
    setAllAssets(prev => prev.map(item => {
      if (item.id === record.id) {
        const updates = { ...item, disposeAction: newAction };

        // 如果状态变为"确定完结"，记录完结时间
        if (newAction === '确定完结') {
          updates.completedAt = now;
          updates._saleSynced = true; // 标记已同步，避免重复同步
          logger.sync.log(`设置 completedAt: ${now}, _saleSynced: true`);
        }

        return updates;
      }
      return item;
    }));

    // 如果状态变为"确定完结"且绑定了SKU，更新SKU售卖数量
    if (newAction === '确定完结' && record.relatedSkuId) {
      setSkuList(prev => {
        return prev.map(sku => {
          if (sku.isParent && sku.children) {
            // 查找子SKU
            const newChildren = sku.children.map(child => {
              if (child.id === record.relatedSkuId) {
                return {
                  ...child,
                  soldQuantity: (child.soldQuantity || 0) + (record.relatedQuantity || 1),
                  saleAmount: (child.saleAmount || 0) + (record.soldPrice || 0),
                  lastSoldAt: now,
                  frozenStock: Math.max(0, (child.frozenStock || 0) - (record.relatedQuantity || 1)),
                };
              }
              return child;
            });

            // 计算主SKU的总售卖数量和冻结库存
            const totalSoldQuantity = newChildren.reduce((sum, c) => sum + (c.soldQuantity || 0), 0);
            const totalSaleAmount = newChildren.reduce((sum, c) => sum + (c.saleAmount || 0), 0);
            const totalFrozenStock = newChildren.reduce((sum, c) => sum + (c.frozenStock || 0), 0);

            return {
              ...sku,
              children: newChildren,
              soldQuantity: totalSoldQuantity,
              saleAmount: totalSaleAmount,
              frozenStock: totalFrozenStock,
            };
          } else if (sku.id === record.relatedSkuId) {
            // 简单SKU
            return {
              ...sku,
              soldQuantity: (sku.soldQuantity || 0) + (record.relatedQuantity || 1),
              saleAmount: (sku.saleAmount || 0) + (record.soldPrice || 0),
              lastSoldAt: now,
              frozenStock: Math.max(0, (sku.frozenStock || 0) - (record.relatedQuantity || 1)),
            };
          }
          return sku;
        });
      });

      setHasInventoryChanges(true);
    }

    // 如果状态从"确定完结"变为其他状态（回退），需要减少售卖数量，增加冻结库存
    if (record.disposeAction === '确定完结' && newAction !== '确定完结' && record.relatedSkuId) {
      setSkuList(prev => {
        return prev.map(sku => {
          if (sku.isParent && sku.children) {
            const newChildren = sku.children.map(child => {
              if (child.id === record.relatedSkuId) {
                return {
                  ...child,
                  soldQuantity: Math.max(0, (child.soldQuantity || 0) - (record.relatedQuantity || 1)),
                  saleAmount: Math.max(0, (child.saleAmount || 0) - (record.soldPrice || 0)),
                  frozenStock: (child.frozenStock || 0) + (record.relatedQuantity || 1),
                };
              }
              return child;
            });

            const totalSoldQuantity = newChildren.reduce((sum, c) => sum + (c.soldQuantity || 0), 0);
            const totalSaleAmount = newChildren.reduce((sum, c) => sum + (c.saleAmount || 0), 0);
            const totalFrozenStock = newChildren.reduce((sum, c) => sum + (c.frozenStock || 0), 0);

            return {
              ...sku,
              children: newChildren,
              soldQuantity: totalSoldQuantity,
              saleAmount: totalSaleAmount,
              frozenStock: totalFrozenStock,
            };
          } else if (sku.id === record.relatedSkuId) {
            return {
              ...sku,
              soldQuantity: Math.max(0, (sku.soldQuantity || 0) - (record.relatedQuantity || 1)),
              saleAmount: Math.max(0, (sku.saleAmount || 0) - (record.soldPrice || 0)),
              frozenStock: (sku.frozenStock || 0) + (record.relatedQuantity || 1),
            };
          }
          return sku;
        });
      });

      setHasInventoryChanges(true);
    }

    message.success('状态更新为：' + newAction);
  }, []);

  const handleRevert = useCallback((record) => {
    setAllAssets(prev => prev.map(item => 
      item.id === record.id 
        ? { ...item, status: 'Stocked', disposeAction: null, disposedAt: null } 
        : item
    ));
    message.success('已回退至压货中');
  }, []);

  const handleDeleteInvalidAsset = useCallback((record) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定删除资产记录吗？',
      okText: '删除',
      okType: 'danger',
      onOk: () => {
        setAllAssets(prev => prev.filter(item => item.id !== record.id));
        message.success('已删除');
      }
    });
  }, []);

  const cleanGarbageData = useCallback(() => {
    const garbageItems = allAssets.filter(item => 
      item.orderNumber === '无编号' || !item.productName
    );

    if (garbageItems.length === 0) {
      message.success('数据很干净，无需清理！');
      return;
    }

    Modal.confirm({
      title: '发现脏数据',
      content: '检测到 ' + garbageItems.length + ' 条无效数据，是否一键删除？',
      okText: '立即删除',
      okType: 'danger',
      onOk: () => {
        setAllAssets(prev => prev.filter(item => 
          item.orderNumber !== '无编号' && item.productName
        ));
        message.success('成功清理 ' + garbageItems.length + ' 条脏数据');
      }
    });
  }, [allAssets]);

  // ==================== ✅ 同步订单状态 ====================

  // 辅助函数：查找SKU（移到前面定义）
  const findSkuById = useCallback((skuId) => {
    for (const sku of skuList) {
      if (sku.id === skuId) return sku;
      if (sku.isParent && sku.children) {
        const child = sku.children.find(c => c.id === skuId);
        if (child) return child;
      }
    }
    return null;
  }, [skuList]);

  // 计算SKU的冻结库存（绑定订单中未完结的数量）
  const calculateFrozenStock = useCallback((skuId) => {
    const bindOrders = allAssets.filter(item => 
      item.relatedSkuId === skuId && 
      item.status === 'Disposed' && 
      item.disposeAction !== '确定完结'
    );
    return bindOrders.reduce((sum, item) => sum + (item.relatedQuantity || 1), 0);
  }, [allAssets]);

  // 同步订单状态 - 检查并更新
  const handleSyncOrderStatus = useCallback(async () => {
    logger.sync.start('同步订单状态检查');
    setLoading(true);
    message.loading({ content: '正在检查订单状态...', key: 'sync' });

    try {
      // 1. 获取所有绑定订单
      const bindOrders = allAssets.filter(item => item.relatedSkuId);
      logger.sync.data('绑定订单数量', bindOrders.length);
      
      if (bindOrders.length === 0) {
        logger.sync.warning('暂无绑定订单需要同步');
        message.info({ content: '暂无绑定订单需要同步', key: 'sync' });
        setLoading(false);
        return { needUpdate: false, orders: [] };
      }

      // 打印绑定订单详情
      logger.sync.table('绑定订单详情', bindOrders.map(o => ({
        订单号: o.orderNumber,
        处置状态: o.disposeAction,
        SKU_ID: o.relatedSkuId,
        SKU名称: o.relatedSkuName,
        售价: o.soldPrice,
        完结时间: o.completedAt,
        已同步: o._saleSynced,
      })));

      // 2. 检查哪些订单需要同步
      const ordersNeedUpdate = bindOrders.filter(order => {
        logger.sync.log(`检查订单 ${order.orderNumber}`, {
          disposeAction: order.disposeAction,
          _saleSynced: order._saleSynced,
          completedAt: order.completedAt,
        });
        
        // 已完结但未同步的订单
        if (order.disposeAction === '确定完结' && !order._saleSynced) {
          logger.sync.log(`  -> 需要同步: 已完结但未标记同步`);
          return true;
        }
        // 已完结但没有完结时间的订单
        if (order.disposeAction === '确定完结' && !order.completedAt) {
          logger.sync.log(`  -> 需要同步: 已完结但没有完结时间`);
          return true;
        }
        return false;
      });

      logger.sync.data('需要同步的订单数量', ordersNeedUpdate.length);

      // 3. 计算冻结库存变化
      const frozenStockChanges = {};
      bindOrders.forEach(order => {
        if (!frozenStockChanges[order.relatedSkuId]) {
          frozenStockChanges[order.relatedSkuId] = {
            frozen: 0,
            sold: 0,
            saleAmount: 0,
            skuName: order.relatedSkuName,
          };
        }
        
        if (order.status === 'Disposed' && order.disposeAction !== '确定完结') {
          // 未完结的绑定订单 = 冻结库存
          frozenStockChanges[order.relatedSkuId].frozen += order.relatedQuantity || 1;
          logger.sync.log(`订单 ${order.orderNumber} 未完结，计入冻结库存`);
        } else if (order.disposeAction === '确定完结' && !order._saleSynced) {
          // 已完结但未同步的 = 需要更新售卖数量
          frozenStockChanges[order.relatedSkuId].sold += order.relatedQuantity || 1;
          frozenStockChanges[order.relatedSkuId].saleAmount += order.soldPrice || 0;
          logger.sync.log(`订单 ${order.orderNumber} 已完结未同步，计入售卖数量: +${order.relatedQuantity || 1}, 金额: +${order.soldPrice || 0}`);
        }
      });

      logger.sync.data('冻结库存变化计算结果', frozenStockChanges);

      setLoading(false);
      message.destroy('sync');

      // 4. 返回检查结果
      const result = {
        needUpdate: ordersNeedUpdate.length > 0,
        ordersNeedUpdate: ordersNeedUpdate.length,
        bindOrdersCount: bindOrders.length,
        frozenStockChanges,
        ordersNeedUpdateList: ordersNeedUpdate,
        details: {
          totalBindOrders: bindOrders.length,
          pendingOrders: bindOrders.filter(o => o.disposeAction !== '确定完结').length,
          completedOrders: bindOrders.filter(o => o.disposeAction === '确定完结').length,
        }
      };

      logger.sync.data('同步检查结果', result);
      logger.sync.end('同步订单状态检查', true);

      return result;

    } catch (error) {
      logger.sync.error('同步检查失败', error);
      setLoading(false);
      message.error({ content: '检查失败: ' + error.message, key: 'sync' });
      return { needUpdate: false, orders: [] };
    }
  }, [allAssets, skuList]);

  // 执行同步更新
  const handleExecuteSync = useCallback((syncResult) => {
    logger.sync.start('执行同步更新');
    logger.sync.data('同步结果', syncResult);
    
    const now = new Date().toISOString();
    let updatedSkuCount = 0;
    let updatedOrderCount = 0;

    // 1. 更新订单数据 - 设置完结时间和同步标记
    setAllAssets(prev => {
      const newAssets = prev.map(item => {
        // 检查是否是需要同步的订单
        const needSync = syncResult.ordersNeedUpdateList?.some(o => o.id === item.id);
        
        if (needSync || (item.disposeAction === '确定完结' && !item._saleSynced)) {
          updatedOrderCount++;
          logger.sync.log(`更新订单 ${item.orderNumber}`, {
            设置: 'completedAt 和 _saleSynced',
          });
          return {
            ...item,
            completedAt: item.completedAt || now,
            _saleSynced: true,
          };
        }
        return item;
      });
      logger.sync.success(`更新了 ${updatedOrderCount} 个订单`);
      return newAssets;
    });

    // 2. 更新SKU的冻结库存和售卖数量
    let tempUpdatedSkuCount = 0;
    
    setSkuList(prev => {
      // ✅ 调试：打印所有 SKU ID
      logger.sync.log('开始更新 SKU，打印所有 SKU ID:');
      prev.forEach(sku => {
        if (sku.isParent && sku.children) {
          logger.sync.log(`主SKU ${sku.name} (id: ${sku.id}) 的子SKU:`, sku.children.map(c => ({ id: c.id, name: c.name })));
        } else {
          logger.sync.log(`简单SKU ${sku.name} (id: ${sku.id})`);
        }
      });
      logger.sync.log('frozenStockChanges 的 key:', Object.keys(syncResult.frozenStockChanges));
      
      const newSkuList = prev.map(sku => {
        if (sku.isParent && sku.children) {
          // 主SKU：更新所有子SKU
          const newChildren = sku.children.map(child => {
            logger.sync.log(`检查子SKU ${child.name} (id: ${child.id})`, {
              是否在frozenStockChanges中: !!syncResult.frozenStockChanges[child.id],
            });
            
            const changes = syncResult.frozenStockChanges[child.id];
            if (changes) {
              tempUpdatedSkuCount++;
              logger.sync.log(`✅ 更新子SKU ${child.name}`, {
                frozenStock: changes.frozen,
                soldQuantity: (child.soldQuantity || 0) + changes.sold,
                saleAmount: (child.saleAmount || 0) + changes.saleAmount,
              });
              return {
                ...child,
                frozenStock: changes.frozen,
                soldQuantity: (child.soldQuantity || 0) + changes.sold,
                saleAmount: (child.saleAmount || 0) + changes.saleAmount,
                lastSoldAt: changes.sold > 0 ? now : child.lastSoldAt,
              };
            }
            // 重新计算冻结库存
            const newFrozen = calculateFrozenStock(child.id);
            return {
              ...child,
              frozenStock: newFrozen,
            };
          });

          // 计算主SKU汇总
          const totalFrozenStock = newChildren.reduce((sum, c) => sum + (c.frozenStock || 0), 0);
          const totalSoldQuantity = newChildren.reduce((sum, c) => sum + (c.soldQuantity || 0), 0);
          const totalSaleAmount = newChildren.reduce((sum, c) => sum + (c.saleAmount || 0), 0);

          return {
            ...sku,
            children: newChildren,
            frozenStock: totalFrozenStock,
            soldQuantity: totalSoldQuantity,
            saleAmount: totalSaleAmount,
          };
        } else {
          // 简单SKU
          logger.sync.log(`检查简单SKU ${sku.name} (id: ${sku.id})`, {
            是否在frozenStockChanges中: !!syncResult.frozenStockChanges[sku.id],
          });
          
          const changes = syncResult.frozenStockChanges[sku.id];
          if (changes) {
            tempUpdatedSkuCount++;
            logger.sync.log(`✅ 更新SKU ${sku.name}`, changes);
            return {
              ...sku,
              frozenStock: changes.frozen,
              soldQuantity: (sku.soldQuantity || 0) + changes.sold,
              saleAmount: (sku.saleAmount || 0) + changes.saleAmount,
              lastSoldAt: changes.sold > 0 ? now : sku.lastSoldAt,
            };
          }
          // 重新计算冻结库存
          return {
            ...sku,
            frozenStock: calculateFrozenStock(sku.id),
          };
        }
      });
      
      // 在 setSkuList 回调内部打印最终结果
      logger.sync.success(`SKU 更新完成，共更新 ${tempUpdatedSkuCount} 个SKU`);
      
      return newSkuList;
    });

    setHasInventoryChanges(true);
    logger.sync.success(`同步完成！更新了 ${tempUpdatedSkuCount} 个SKU，${updatedOrderCount} 个订单`);
    logger.sync.end('执行同步更新', true);
    message.success(`同步完成！更新了 ${tempUpdatedSkuCount} 个SKU，${updatedOrderCount} 个订单`);
  }, [calculateFrozenStock]);

  // 刷新所有SKU的冻结库存
  const refreshFrozenStock = useCallback(() => {
    setSkuList(prev => {
      return prev.map(sku => {
        if (sku.isParent && sku.children) {
          const newChildren = sku.children.map(child => ({
            ...child,
            frozenStock: calculateFrozenStock(child.id),
          }));

          const totalFrozenStock = newChildren.reduce((sum, c) => sum + (c.frozenStock || 0), 0);

          return {
            ...sku,
            children: newChildren,
            frozenStock: totalFrozenStock,
          };
        } else {
          return {
            ...sku,
            frozenStock: calculateFrozenStock(sku.id),
          };
        }
      });
    });
  }, [calculateFrozenStock]);

  // ==================== ✅ SKU绑定操作 ====================

  const handleBindSku = useCallback((assetId, bindData) => {
    // 获取当前订单状态
    const currentOrder = allAssets.find(item => item.id === assetId);
    const isDisposed = currentOrder && currentOrder.status === 'Disposed';
    const isCompleted = currentOrder && currentOrder.disposeAction === '确定完结';

    // 更新订单数据
    setAllAssets(prev => prev.map(item => {
      if (item.id === assetId) {
        return { ...item, ...bindData };
      }
      return item;
    }));

    // 更新SKU库存和冻结库存
    if (bindData.relatedSkuId && bindData.relatedQuantity) {
      setSkuList(prev => {
        return prev.map(sku => {
          if (sku.isParent && sku.children) {
            const newChildren = sku.children.map(child => {
              if (child.id === bindData.relatedSkuId) {
                const updates = {
                  ...child,
                  stock: (child.stock || 0) + bindData.relatedQuantity,
                };

                // 如果订单已处置但未完结，增加冻结库存
                if (isDisposed && !isCompleted) {
                  updates.frozenStock = (child.frozenStock || 0) + bindData.relatedQuantity;
                }

                // 如果订单已完结，增加售卖数量
                if (isCompleted) {
                  updates.soldQuantity = (child.soldQuantity || 0) + bindData.relatedQuantity;
                  updates.saleAmount = (child.saleAmount || 0) + (currentOrder.soldPrice || 0);
                }

                return updates;
              }
              return child;
            });

            // 计算主SKU汇总
            const totalStock = newChildren.reduce((sum, c) => sum + (c.stock || 0), 0);
            const totalFrozenStock = newChildren.reduce((sum, c) => sum + (c.frozenStock || 0), 0);
            const totalSoldQuantity = newChildren.reduce((sum, c) => sum + (c.soldQuantity || 0), 0);
            const totalSaleAmount = newChildren.reduce((sum, c) => sum + (c.saleAmount || 0), 0);

            return {
              ...sku,
              children: newChildren,
              stock: totalStock,
              frozenStock: totalFrozenStock,
              soldQuantity: totalSoldQuantity,
              saleAmount: totalSaleAmount,
            };
          } else if (sku.id === bindData.relatedSkuId) {
            const updates = {
              ...sku,
              stock: (sku.stock || 0) + bindData.relatedQuantity,
            };

            if (isDisposed && !isCompleted) {
              updates.frozenStock = (sku.frozenStock || 0) + bindData.relatedQuantity;
            }

            if (isCompleted) {
              updates.soldQuantity = (sku.soldQuantity || 0) + bindData.relatedQuantity;
              updates.saleAmount = (sku.saleAmount || 0) + (currentOrder.soldPrice || 0);
            }

            return updates;
          }
          return sku;
        });
      });

      setHasInventoryChanges(true);
    }

    // 解除绑定
    if (!bindData.relatedSkuId && currentOrder && currentOrder.relatedSkuId) {
      const oldSkuId = currentOrder.relatedSkuId;
      const oldQuantity = currentOrder.relatedQuantity || 1;

      setSkuList(prev => {
        return prev.map(sku => {
          if (sku.isParent && sku.children) {
            const newChildren = sku.children.map(child => {
              if (child.id === oldSkuId) {
                return {
                  ...child,
                  stock: Math.max(0, (child.stock || 0) - oldQuantity),
                  frozenStock: Math.max(0, (child.frozenStock || 0) - oldQuantity),
                };
              }
              return child;
            });

            const totalStock = newChildren.reduce((sum, c) => sum + (c.stock || 0), 0);
            const totalFrozenStock = newChildren.reduce((sum, c) => sum + (c.frozenStock || 0), 0);

            return {
              ...sku,
              children: newChildren,
              stock: totalStock,
              frozenStock: totalFrozenStock,
            };
          } else if (sku.id === oldSkuId) {
            return {
              ...sku,
              stock: Math.max(0, (sku.stock || 0) - oldQuantity),
              frozenStock: Math.max(0, (sku.frozenStock || 0) - oldQuantity),
            };
          }
          return sku;
        });
      });

      setHasInventoryChanges(true);
    }

    message.success(bindData.relatedSkuId ? '绑定成功，库存已更新' : '已解除绑定');
  }, [allAssets]);

  // ✅ 获取绑定订单列表
  const getBindOrders = useCallback(() => {
    return allAssets.filter(item => item.relatedSkuId);
  }, [allAssets]);

  // ==================== ✅ 库存快照操作 ====================

  // 保存库存快照
  const handleSaveInventorySnapshot = useCallback(async (remark) => {
    if ((skuList || []).length === 0 && (categories || []).length === 0) {
      message.warning('没有数据需要保存');
      return;
    }

    if (!remark) {
      message.error('请输入存档备注');
      return;
    }

    setLoading(true);
    message.loading({ content: '正在保存库存快照...', key: 'inventorySave' });

    try {
      const data = {
        skuList: skuList,
        categories: categories,
        bindOrders: getBindOrders(),
        stats: {
          totalSku: (skuList || []).length,
          totalStock: (skuList || []).reduce((sum, s) => {
            if (s.isParent && s.children) {
              return sum + s.children.reduce((cSum, c) => cSum + (c.stock || 0), 0);
            }
            return sum + (s.stock || 0);
          }, 0),
          totalBindOrders: getBindOrders().length,
        },
      };

      const result = await saveInventorySnapshot(data, remark);

      if (result.success) {
        setInventorySnapshotInfo({
          version: result.data?.version,
          timestamp: new Date().toISOString(),
          remark: remark,
        });
        setHasInventoryChanges(false);
        await getInventoryVersionHistory();

        message.success({ 
          content: '库存快照保存成功！版本号: ' + (result.data?.version || ''), 
          key: 'inventorySave' 
        });
      } else {
        message.error({ content: result.message || '保存失败', key: 'inventorySave' });
      }
    } catch (error) {
      message.error({ content: '保存失败: ' + error.message, key: 'inventorySave' });
    } finally {
      setLoading(false);
    }
  }, [skuList, categories, getBindOrders]);

  // 读取最新库存快照
  const handleLoadInventorySnapshot = useCallback(async () => {
    setLoading(true);
    message.loading({ content: '正在读取库存快照...', key: 'inventoryLoad' });

    try {
      const result = await fetchLatestInventorySnapshot();

      if (result.success && result.data) {
        const { data, version, remark } = result.data;

        if (data) {
          setSkuList(data.skuList || []);
          setCategories(data.categories || []);
          setInventorySnapshotInfo({ version, remark, timestamp: new Date().toISOString() });
          setHasInventoryChanges(false);

          // 同步更新订单处置总览的绑定信息
          if (data.bindOrders && data.bindOrders.length > 0) {
            setAllAssets(prev => prev.map(item => {
              const bindInfo = data.bindOrders.find(b => b.id === item.id);
              if (bindInfo) {
                return { ...item, ...bindInfo };
              }
              return item;
            }));
          }

          message.success({ 
            content: '读取成功，版本 ' + version + '，共 ' + (data.skuList || []).length + ' 个SKU', 
            key: 'inventoryLoad' 
          });
        }
      } else {
        message.info({ content: '暂无库存快照数据', key: 'inventoryLoad' });
      }

      await getInventoryVersionHistory();
    } catch (error) {
      message.error({ content: '读取失败', key: 'inventoryLoad' });
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取库存历史版本
  const getInventoryVersionHistory = useCallback(async () => {
    const result = await fetchInventoryVersionHistory();
    if (result.success) {
      setInventoryVersionHistory(result.data);
    }
  }, []);

  // 恢复库存版本
  const handleRestoreInventoryVersion = useCallback(async (versionId) => {
    setLoading(true);
    message.loading({ content: '正在恢复版本...', key: 'inventoryRestore' });

    try {
      const result = await restoreInventoryVersion(versionId);

      if (result.success && result.data) {
        const { data, version, remark } = result.data;

        if (data) {
          setSkuList(data.skuList || []);
          setCategories(data.categories || []);
          setInventorySnapshotInfo({ version, remark, timestamp: new Date().toISOString() });
          setHasInventoryChanges(false);

          // 同步绑定信息
          if (data.bindOrders && data.bindOrders.length > 0) {
            setAllAssets(prev => prev.map(item => {
              const bindInfo = data.bindOrders.find(b => b.id === item.id);
              if (bindInfo) {
                return { ...item, ...bindInfo };
              }
              return item;
            }));
          }

          await getInventoryVersionHistory();
          message.success({ content: '已恢复到版本 ' + version, key: 'inventoryRestore' });
        }
      } else {
        message.error({ content: result.message || '恢复失败', key: 'inventoryRestore' });
      }
    } catch (error) {
      message.error({ content: '恢复失败', key: 'inventoryRestore' });
    } finally {
      setLoading(false);
    }
  }, []);

  // 删除库存版本
  const handleDeleteInventoryVersion = useCallback((versionId) => {
    Modal.confirm({
      title: '确认删除该版本？',
      content: '删除后不可恢复',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const result = await deleteInventoryVersion(versionId);
        if (result.success) {
          message.success('版本已删除');
          await getInventoryVersionHistory();
        } else {
          message.error(result.message || '删除失败');
        }
      }
    });
  }, [getInventoryVersionHistory]);

  // 清理库存数据
  const handleClearInventoryData = useCallback(() => {
    Modal.confirm({
      title: '确认清理库存数据？',
      content: '将清空所有SKU和分类数据，此操作不可恢复。',
      okText: '确认清理',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setSkuList([]);
        setCategories([]);
        setHasInventoryChanges(true);
        message.success('库存数据已清空');
      }
    });
  }, []);

  // ==================== 派生状态 ====================
  
  const stats = useMemo(() => calculateStats(allAssets), [allAssets]);
  const revenueStats = useMemo(() => calculateRevenueStats(allAssets), [allAssets]);
  
  const stockData = useMemo(() => 
    allAssets.filter(i => isStatus(i.status, 'stocked') && (i.orderNumber !== '无编号' || i.productName)),
    [allAssets]
  );
  
  const disposedData = useMemo(() => 
    allAssets.filter(i => isStatus(i.status, 'disposed')),
    [allAssets]
  );

  // ==================== 返回 ====================
  return {
    // 状态
    loading,
    permissions,
    stats,
    stockData,
    disposedData,
    revenueStats,
    
    // 弹窗
    activeRecord,
    showDetailModal,
    setShowDetailModal,
    showDisposeModal,
    setShowDisposeModal,
    
    // 资产快照状态
    isPreviewMode,
    lastArchiveInfo,
    versionHistory,
    
    // 资产API操作
    pullFrontendOrders,
    saveSnapshot,
    loadLatestSnapshot,
    getVersionHistory,
    restoreVersion,
    deleteVersion,
    
    // 资产操作
    handleViewDetail,
    handleDispose,
    handleShelve,
    handleSaveDispose,
    handleUpdateTracking,
    handleRevert,
    handleDeleteInvalidAsset,
    cleanGarbageData,

    // ✅ SKU相关
    skuList,
    setSkuList,
    categories,
    setCategories,
    handleBindSku,
    getBindOrders,

    // ✅ 同步订单状态相关
    handleSyncOrderStatus,
    handleExecuteSync,
    calculateFrozenStock,
    refreshFrozenStock,

    // ✅ 库存快照相关
    inventorySnapshotInfo,
    inventoryVersionHistory,
    hasInventoryChanges,
    handleSaveInventorySnapshot,
    handleLoadInventorySnapshot,
    getInventoryVersionHistory,
    handleRestoreInventoryVersion,
    handleDeleteInventoryVersion,
    handleClearInventoryData,
  };
};
