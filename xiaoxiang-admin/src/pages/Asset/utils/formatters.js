// src/pages/Asset/utils/formatters.js
/**
 * 资产中心数据格式化工具
 * 统一处理数据转换和格式化
 */

import dayjs from 'dayjs';
import { ASSET_STATUS } from '../../../constants/asset';

// ==================== 订单格式化 ====================

/**
 * 筛选回收订单
 * @param {array} orders - 订单列表
 * @returns {array} - 筛选后的回收订单
 */
export const filterRecycleOrders = (orders) => {
  if (!Array.isArray(orders)) return [];
  
  return orders.filter(order => {
    const job = order.jobSnapshot || {};
    const isRecycle = job.categories?.name?.includes('回收') || job.title?.includes('回收');
    const isValid = !['Cancelled', 'Rejected'].includes(order.status);
    return isRecycle && isValid;
  });
};

/**
 * 格式化单个订单为资产格式
 * @param {object} order - 订单对象
 * @returns {object} - 格式化后的资产对象
 */
export const formatOrderToAsset = (order) => {
  const job = order.jobSnapshot || {};
  const createdTime = dayjs(order.createdAt);
  
  // 安全获取用户ID
  let userId = '';
  if (order.userId) {
    userId = (typeof order.userId === 'object') ? (order.userId.id || order.userId.id) : order.userId;
  }
  
  return {
    id: order.id,
    orderNumber: order.orderNumber || '无编号',
    productName: job.title || '未知',
    userName: (typeof order.userId === 'object') ? order.userId?.email : '未知用户',
    costPrice: job.amount || 0,
    status: ASSET_STATUS.STOCKED,
    stockDays: dayjs().diff(createdTime, 'day'),
    rawOrderId: order.id,
    rawUserId: userId,
    createdAt: createdTime.format('YYYY-MM-DD HH:mm'),
  };
};

/**
 * 批量格式化订单为资产
 * @param {array} orders - 订单列表
 * @returns {array} - 格式化后的资产列表
 */
export const formatOrdersToAssets = (orders) => {
  const recycleOrders = filterRecycleOrders(orders);
  return recycleOrders.map(formatOrderToAsset);
};

// ==================== 快照格式化 ====================

/**
 * 构建快照数据
 * @param {array} allAssets - 所有资产
 * @param {string} remark - 备注
 * @returns {object} - 快照对象
 */
export const buildSnapshot = (allAssets, remark) => {
  return {
    allAssets: allAssets,
    lastArchiveInfo: {
      time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      remark: remark
    },
    savedAt: new Date().toISOString()
  };
};

/**
 * 解析快照数据
 * @param {object} snapshotData - 快照数据
 * @returns {object} - 解析后的数据
 */
export const parseSnapshotData = (snapshotData) => {
  if (!snapshotData) return null;
  
  const { snapshot, remark, version, createdAt } = snapshotData;
  
  return {
    assets: snapshot?.allAssets || [],
    lastArchiveInfo: snapshot?.lastArchiveInfo || {
      time: dayjs(createdAt).format('YYYY-MM-DD HH:mm:ss'),
      remark: remark || '无备注'
    },
    version,
    createdAt
  };
};

// ==================== 状态格式化 ====================

/**
 * 状态比较（忽略大小写）
 * @param {string} recordStatus - 记录状态
 * @param {string} targetStatus - 目标状态
 * @returns {boolean}
 */
export const isStatus = (recordStatus, targetStatus) => {
  return (recordStatus || '').toLowerCase() === (targetStatus || '').toLowerCase();
};

/**
 * 获取状态标签
 * @param {string} status - 状态值
 * @returns {object} - { text, color }
 */
export const getStatusTag = (status) => {
  const statusMap = {
    'stocked': { text: '压货中', color: 'blue' },
    'disposed': { text: '已处置', color: 'green' },
    'Stocked': { text: '压货中', color: 'blue' },
    'Disposed': { text: '已处置', color: 'green' }
  };
  return statusMap[status] || { text: status || '未知', color: 'default' };
};

// ==================== 日期格式化 ====================

/**
 * 安全解析日期
 * @param {any} dateValue - 日期值
 * @returns {dayjs|null}
 */
export const parseDate = (dateValue) => {
  if (!dateValue) return null;
  try {
    const parsed = dayjs(dateValue);
    return parsed.isValid() ? parsed : null;
  } catch (e) {
    return null;
  }
};

/**
 * 格式化日期显示
 * @param {any} dateValue - 日期值
 * @param {string} format - 格式化模板
 * @returns {string}
 */
export const formatDate = (dateValue, format = 'YYYY-MM-DD HH:mm') => {
  const date = parseDate(dateValue);
  return date ? date.format(format) : '-';
};

// ==================== 数值格式化 ====================

/**
 * 安全转换为数字
 * @param {any} value - 值
 * @param {number} defaultValue - 默认值
 * @returns {number}
 */
export const toNumber = (value, defaultValue = 0) => {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * 格式化金额
 * @param {number} value - 金额
 * @param {number} precision - 精度
 * @returns {string}
 */
export const formatMoney = (value, precision = 2) => {
  const num = toNumber(value);
  return num.toFixed(precision);
};

// ==================== 统计计算 ====================

/**
 * 计算统计数据
 * @param {array} allAssets - 所有资产
 * @returns {object} - 统计结果
 */
export const calculateStats = (allAssets) => {
  if (!Array.isArray(allAssets)) {
    return getEmptyStats();
  }
  
  const validAssets = allAssets.filter(i => i.orderNumber !== '无编号' || i.productName);
  
  const stockItems = validAssets.filter(i => isStatus(i.status, 'stocked') && !i.isOrderInvalid);
  const disposedItems = validAssets.filter(i => isStatus(i.status, 'disposed'));
  
  // 计算各项成本
  const totalCost = stockItems.reduce((s, i) => s + toNumber(i.costPrice), 0);
  const totalIncome = disposedItems.reduce((s, i) => s + toNumber(i.soldPrice), 0);
  const totalFixedCost = disposedItems.reduce((s, i) => s + toNumber(i.costPrice), 0);
  const totalShippingCost = disposedItems.reduce((s, i) => s + toNumber(i.shippingCost), 0);
  const totalOtherCost = disposedItems.reduce((s, i) => s + toNumber(i.otherCostAmount), 0);
  
  // 利润计算
  const grossProfit = totalIncome - totalFixedCost;
  const netProfit = totalIncome - totalFixedCost - totalShippingCost - totalOtherCost;
  
  // 平均压货天数
  const avgStockDays = stockItems.length > 0 
    ? (stockItems.reduce((s, i) => s + toNumber(i.stockDays), 0) / stockItems.length).toFixed(1)
    : 0;
  
  return {
    // 核心财务指标
    totalCost,
    totalIncome,
    grossProfit,
    netProfit,
    
    // 数量统计
    stockedCount: stockItems.length,
    disposedCount: disposedItems.length,
    
    // 预警统计
    dangerCount: stockItems.filter(i => i.stockDays >= 7 && !i.isShelved).length,
    warningCount: stockItems.filter(i => i.stockDays >= 3 && i.stockDays < 7 && !i.isShelved).length,
    invalidOrderCount: allAssets.filter(i => i.isOrderInvalid).length,
    
    // 成本明细
    totalFixedCost,
    totalShippingCost,
    totalOtherCost,
    
    // 风控数据
    stockItems,
    avgStockDays,
  };
};

/**
 * 获取空统计数据
 * @returns {object}
 */
export const getEmptyStats = () => ({
  totalCost: 0,
  totalIncome: 0,
  grossProfit: 0,
  netProfit: 0,
  stockedCount: 0,
  disposedCount: 0,
  dangerCount: 0,
  warningCount: 0,
  invalidOrderCount: 0,
  totalFixedCost: 0,
  totalShippingCost: 0,
  totalOtherCost: 0,
  stockItems: [],
  avgStockDays: 0,
});

/**
 * 计算收益统计
 * @param {array} allAssets - 所有资产
 * @returns {object}
 */
export const calculateRevenueStats = (allAssets) => {
  if (!Array.isArray(allAssets)) {
    return { disposedItems: [] };
  }
  
  const disposedItems = allAssets.filter(i => isStatus(i.status, 'disposed'));
  
  let totalSoldIncome = 0, totalFixedCost = 0, totalShippingCost = 0, totalOtherCost = 0;
  
  disposedItems.forEach(item => {
    totalSoldIncome += toNumber(item.soldPrice);
    totalFixedCost += toNumber(item.costPrice);
    totalShippingCost += toNumber(item.shippingCost);
    totalOtherCost += toNumber(item.otherCostAmount);
  });
  
  return {
    totalSoldIncome,
    totalFixedCost,
    totalShippingCost,
    totalOtherCost,
    netProfit: totalSoldIncome - totalFixedCost - totalShippingCost - totalOtherCost,
    disposedItems
  };
};

// ==================== 导出 ====================
export default {
  filterRecycleOrders,
  formatOrderToAsset,
  formatOrdersToAssets,
  buildSnapshot,
  parseSnapshotData,
  isStatus,
  getStatusTag,
  parseDate,
  formatDate,
  toNumber,
  formatMoney,
  calculateStats,
  getEmptyStats,
  calculateRevenueStats,
};
