// src/pages/Asset/components/InventoryCenter.jsx
/**
 * 库存中心组件 - 主文件
 */
import React, { useState, useMemo } from 'react';
import { 
  Card, Tabs, Row, Col, Statistic, Badge, Button, Space, Tag, 
  Modal, Input, message, Dropdown, Descriptions, Alert, Divider
} from 'antd';
import {
  BoxPlotOutlined,
  WarningOutlined,
  TagsOutlined,
  LinkOutlined,
  DashboardOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  HistoryOutlined,
  DeleteOutlined,
  SyncOutlined,
  DownOutlined,
  LockOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { SKU_STATUS } from '../constants/inventoryConstants';
import { calculateSkuSummary, buildCategoryTree, exportSkuToCsv } from '../utils/inventoryUtils';

import SkuTable from './Inventory/SkuTable';
import CategoryTable from './Inventory/CategoryTable';
import BindOrderTable from './Inventory/BindOrderTable';
import DataCenter from './Inventory/DataCenter';

const { TabPane } = Tabs;

const InventoryCenter = ({ 
  bindOrders,
  // 快照相关 props
  inventorySnapshotInfo,
  inventoryVersionHistory,
  hasInventoryChanges,
  onSaveSnapshot,
  onLoadSnapshot,
  onRestoreVersion,
  onDeleteVersion,
  onClearData,
  // SKU 相关 props
  skuList,
  setSkuList,
  categories,
  setCategories,
  // ✅ 同步订单状态相关 props
  onSyncOrderStatus,
  onExecuteSync,
  refreshFrozenStock,
}) => {
  const [activeTab, setActiveTab] = useState('sku');
  
  // ✅ 同步订单状态相关状态
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // ==================== 统计数据 ====================
  const stats = useMemo(() => {
    let total = 0;
    let active = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalStock = 0;
    let totalCost = 0;
    let totalFrozenStock = 0;
    let totalSoldQuantity = 0;
    let totalSaleAmount = 0;

    (skuList || []).forEach(sku => {
      if (sku.isParent && sku.children && sku.children.length > 0) {
        total += 1;
        sku.children.forEach(child => {
          totalStock += child.stock || 0;
          totalCost += (child.costPrice || 0) * (child.stock || 0);
          totalFrozenStock += child.frozenStock || 0;
          totalSoldQuantity += child.soldQuantity || 0;
          totalSaleAmount += child.saleAmount || 0;
          
          if (child.status === SKU_STATUS.ACTIVE) active++;
          else if (child.status === SKU_STATUS.LOW_STOCK) lowStock++;
          else if (child.status === SKU_STATUS.OUT_OF_STOCK) outOfStock++;
        });
      } else {
        total += 1;
        totalStock += sku.stock || 0;
        totalCost += (sku.costPrice || 0) * (sku.stock || 0);
        totalFrozenStock += sku.frozenStock || 0;
        totalSoldQuantity += sku.soldQuantity || 0;
        totalSaleAmount += sku.saleAmount || 0;
        
        if (sku.status === SKU_STATUS.ACTIVE) active++;
        else if (sku.status === SKU_STATUS.LOW_STOCK) lowStock++;
        else if (sku.status === SKU_STATUS.OUT_OF_STOCK) outOfStock++;
      }
    });
    
    // 绑定订单统计
    const bindOrderStats = {
      total: (bindOrders || []).length,
      pending: (bindOrders || []).filter(o => o.disposeAction !== '确定完结').length,
      completed: (bindOrders || []).filter(o => o.disposeAction === '确定完结').length,
    };
    
    return { 
      total, active, lowStock, outOfStock, totalStock, totalCost,
      totalFrozenStock, totalSoldQuantity, totalSaleAmount, bindOrderStats
    };
  }, [skuList, bindOrders]);

  const categoryTree = useMemo(() => buildCategoryTree(categories || []), [categories]);

  const handleExport = () => {
    exportSkuToCsv(skuList || [], categories || []);
  };

  // ==================== ✅ 同步订单状态 ====================
  
  // 同步检查
  const handleSyncClick = async () => {
    console.log('%c[InventoryCenter] 点击同步按钮', 'color: #1890ff; font-weight: bold;');
    console.log('[InventoryCenter] onSyncOrderStatus:', typeof onSyncOrderStatus);
    console.log('[InventoryCenter] bindOrders:', bindOrders);
    
    setSyncing(true);
    try {
      if (onSyncOrderStatus) {
        console.log('[InventoryCenter] 调用 onSyncOrderStatus');
        const result = await onSyncOrderStatus();
        console.log('[InventoryCenter] 同步结果:', result);
        setSyncResult(result);
        setSyncModalVisible(true);
      } else {
        console.log('[InventoryCenter] 没有传入 onSyncOrderStatus，使用本地模拟');
        // 如果没有传入同步函数，使用本地模拟
        const result = {
          needUpdate: (bindOrders || []).some(o => o.disposeAction === '确定完结' && !o._saleSynced),
          ordersNeedUpdate: (bindOrders || []).filter(o => o.disposeAction === '确定完结' && !o._saleSynced).length,
          bindOrdersCount: (bindOrders || []).length,
          frozenStockChanges: {},
          ordersNeedUpdateList: (bindOrders || []).filter(o => o.disposeAction === '确定完结' && !o._saleSynced),
          details: {
            totalBindOrders: (bindOrders || []).length,
            pendingOrders: (bindOrders || []).filter(o => o.disposeAction !== '确定完结').length,
            completedOrders: (bindOrders || []).filter(o => o.disposeAction === '确定完结').length,
          }
        };
        console.log('[InventoryCenter] 本地模拟结果:', result);
        setSyncResult(result);
        setSyncModalVisible(true);
      }
    } catch (error) {
      console.error('[InventoryCenter] 同步检查失败:', error);
      message.error('同步检查失败: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  // 执行同步
  const handleExecuteSync = () => {
    console.log('%c[InventoryCenter] 执行同步', 'color: #52c41a; font-weight: bold;');
    console.log('[InventoryCenter] syncResult:', syncResult);
    console.log('[InventoryCenter] onExecuteSync:', typeof onExecuteSync);
    
    if (syncResult && onExecuteSync) {
      console.log('[InventoryCenter] 调用 onExecuteSync');
      onExecuteSync(syncResult);
      setSyncModalVisible(false);
      setSyncResult(null);
    } else {
      console.log('[InventoryCenter] 没有传入 onExecuteSync，仅刷新冻结库存');
      // 刷新冻结库存
      if (refreshFrozenStock) {
        refreshFrozenStock();
      }
      message.success('同步完成！');
      setSyncModalVisible(false);
      setSyncResult(null);
    }
  };

  // ==================== 保存快照 ====================
  const handleSaveClick = () => {
    let inputValue = '';
    
    Modal.confirm({
      title: '保存库存快照',
      icon: null,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>
            即将保存 <b style={{ color: '#1890ff' }}>{(skuList || []).length}</b> 个SKU 和{' '}
            <b style={{ color: '#1890ff' }}>{(categories || []).length}</b> 个分类。
          </p>
          <Input.TextArea 
            placeholder="请输入本次存档备注（必填）"
            rows={3}
            onChange={(e) => { inputValue = e.target.value; }}
          />
        </div>
      ),
      okText: '确认保存',
      cancelText: '取消',
      onOk: () => {
        if (!inputValue || !inputValue.trim()) {
          message.error('请输入存档备注');
          return Promise.reject();
        }
        if (onSaveSnapshot) {
          return onSaveSnapshot(inputValue);
        }
        return Promise.resolve();
      },
    });
  };

  // ==================== 历史版本菜单 ====================
  const historyMenuItems = (inventoryVersionHistory || []).map(item => ({
    key: item.id,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 280 }}>
        <span>
          {item.isLatest && <Tag color="green" style={{ marginRight: 4 }}>当前</Tag>}
          V{item.version} - {item.remark || '无备注'}
        </span>
        <span style={{ color: '#999', fontSize: 12 }}>
          {dayjs(item.createdAt).format('MM-DD HH:mm')}
        </span>
      </div>
    ),
    onClick: () => handleVersionClick(item),
  }));

  const handleVersionClick = (item) => {
    if (item.isLatest) return;
    
    Modal.confirm({
      title: '恢复历史版本',
      content: (
        <div>
          <p>确定恢复到版本 <b>V{item.version}</b> 吗？</p>
          <p style={{ color: '#666', fontSize: 12 }}>
            备注：{item.remark || '无'}<br/>
            时间：{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </p>
        </div>
      ),
      okText: '确认恢复',
      cancelText: '取消',
      onOk: () => {
        if (onRestoreVersion) {
          return onRestoreVersion(item.id);
        }
      },
    });
  };

  // ==================== 渲染 ====================
  return (
    <div>
      {/* 统计概览 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={3}>
            <Statistic title="SKU 总数" value={stats.total} prefix={<BoxPlotOutlined />} />
          </Col>
          <Col span={3}>
            <Statistic title="总库存" value={stats.totalStock} suffix="件" />
          </Col>
          <Col span={3}>
            <Statistic 
              title="冻结库存" 
              value={stats.totalFrozenStock} 
              prefix={<LockOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
          <Col span={3}>
            <Statistic 
              title="已售数量" 
              value={stats.totalSoldQuantity}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={3}>
            <Statistic 
              title="售卖金额" 
              value={stats.totalSaleAmount}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={3}>
            <Statistic 
              title="绑定订单" 
              value={stats.bindOrderStats.total}
              prefix={<LinkOutlined />}
            />
          </Col>
          <Col span={3}>
            <Statistic 
              title="待完结" 
              value={stats.bindOrderStats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={3}>
            <Statistic 
              title="已完结" 
              value={stats.bindOrderStats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 冻结库存说明 */}
      {stats.totalFrozenStock > 0 && (
        <Alert
          title={`当前有 ${stats.totalFrozenStock} 件商品处于冻结状态`}
          description="冻结库存 = 绑定订单中未完结的数量。订单完结后，冻结库存自动转为已售数量。点击「同步订单状态」按钮可检查并更新库存状态。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 主内容区 */}
      <Card 
        title={
          <Space>
            <span style={{ fontSize: 16, fontWeight: 'bold' }}>📦 库存中心</span>
            {/* 状态标签 */}
            {hasInventoryChanges ? (
              <Tag color="warning" icon={<SyncOutlined />}>有未保存变更</Tag>
            ) : inventorySnapshotInfo ? (
              <Tag color="success" icon={<CloudUploadOutlined />}>已保存快照</Tag>
            ) : (
              <Tag color="default">未保存</Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            {/* 保存快照 */}
            <Button 
              type="primary" 
              icon={<CloudUploadOutlined />} 
              onClick={handleSaveClick}
              disabled={(skuList || []).length === 0 && (categories || []).length === 0}
            >
              保存快照
            </Button>
            
            {/* 读取快照 */}
            <Button 
              icon={<CloudDownloadOutlined />} 
              onClick={onLoadSnapshot}
            >
              读取快照
            </Button>
            
            {/* 历史版本 */}
            <Dropdown 
              menu={{ items: historyMenuItems }} 
              placement="bottomRight"
              disabled={!inventoryVersionHistory || inventoryVersionHistory.length === 0}
            >
              <Button icon={<HistoryOutlined />}>
                历史版本 <DownOutlined />
              </Button>
            </Dropdown>
            
            <Divider type="vertical" />
            
            {/* ✅ 同步订单状态 */}
            <Button 
              type="default"
              icon={<SyncOutlined spin={syncing} />} 
              onClick={handleSyncClick}
              loading={syncing}
              style={{ borderColor: '#1890ff', color: '#1890ff' }}
            >
              同步订单状态
            </Button>
            
            {/* 清理数据 */}
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              onClick={onClearData}
              disabled={(skuList || []).length === 0 && (categories || []).length === 0}
            >
              清理数据
            </Button>
          </Space>
        }
      >
        {/* 快照信息 */}
        {inventorySnapshotInfo && (
          <Descriptions size="small" style={{ marginBottom: 16, background: '#f6ffed', padding: '10px 20px', borderRadius: 4 }}>
            <Descriptions.Item label={<span style={{ fontWeight: 'bold' }}><HistoryOutlined /> 上次存档版本</span>}>
              V{inventorySnapshotInfo.version}
            </Descriptions.Item>
            <Descriptions.Item label="存档时间">
              {inventorySnapshotInfo.timestamp ? dayjs(inventorySnapshotInfo.timestamp).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="存档备注">
              {inventorySnapshotInfo.remark}
            </Descriptions.Item>
          </Descriptions>
        )}

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane 
            tab={<span><BoxPlotOutlined /> SKU 管理</span>} 
            key="sku"
          >
            <SkuTable 
              skuList={skuList || []}
              setSkuList={setSkuList}
              categories={categories || []}
              categoryTree={categoryTree}
              onExport={handleExport}
            />
          </TabPane>

          <TabPane 
            tab={<span><TagsOutlined /> 分类管理</span>} 
            key="category"
          >
            <CategoryTable 
              categories={categories || []}
              setCategories={setCategories}
              skuList={skuList || []}
            />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <LinkOutlined /> 
                绑定订单 
                {bindOrders && bindOrders.length > 0 && (
                  <Badge count={bindOrders.length} style={{ marginLeft: 4 }} />
                )}
              </span>
            } 
            key="bindOrders"
          >
            <BindOrderTable bindOrders={bindOrders || []} />
          </TabPane>

          <TabPane 
            tab={<span><DashboardOutlined /> 数据中心</span>} 
            key="dataCenter"
          >
            <DataCenter bindOrders={bindOrders || []} />
          </TabPane>
        </Tabs>
      </Card>

      {/* ✅ 同步订单状态结果弹窗 */}
      <Modal
        title={
          <span>
            <SyncOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            同步订单状态检查结果
          </span>
        }
        open={syncModalVisible}
        onCancel={() => {
          setSyncModalVisible(false);
          setSyncResult(null);
        }}
        onOk={handleExecuteSync}
        okText="确认同步"
        cancelText="取消"
        okButtonProps={{ disabled: !syncResult?.needUpdate }}
        width={600}
      >
        {syncResult && (
          <>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="绑定订单总数">
                {syncResult.bindOrdersCount || 0}
              </Descriptions.Item>
              <Descriptions.Item label="待同步订单">
                <Tag color={syncResult.ordersNeedUpdate > 0 ? 'orange' : 'default'}>
                  {syncResult.ordersNeedUpdate || 0}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="待处理订单">
                {syncResult.details?.pendingOrders || 0}
              </Descriptions.Item>
              <Descriptions.Item label="已完结订单">
                {syncResult.details?.completedOrders || 0}
              </Descriptions.Item>
            </Descriptions>

            {syncResult.needUpdate ? (
              <Alert
                message="检测到需要更新的订单状态"
                description={
                  <div>
                    <p>以下内容将被更新：</p>
                    <ul style={{ marginBottom: 0 }}>
                      <li>SKU冻结库存将重新计算</li>
                      <li>已完结订单的售卖数量将同步到SKU</li>
                      <li>售卖金额将同步到SKU</li>
                    </ul>
                  </div>
                }
                type="info"
                showIcon
              />
            ) : (
              <Alert
                message="所有订单状态已是最新"
                description="无需同步更新"
                type="success"
                showIcon
              />
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default InventoryCenter;
