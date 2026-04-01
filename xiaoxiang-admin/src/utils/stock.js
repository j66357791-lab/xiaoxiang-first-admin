// ==================== 库存管理工具函数 ====================
//管理员后台-库存管理版块的计算功能，负责算账，清理库存功能

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 格式化金额
 */
export const formatMoney = (amount, decimals = 2) => {
  return `¥${(amount || 0).toFixed(decimals)}`;
};

/**
 * 格式化百分比
 */
export const formatPercent = (rate, decimals = 1) => {
  return `${(rate || 0).toFixed(decimals)}%`;
};

/**
 * 计算库存状态
 */
export const calculateStockStatus = (currentStock, minStock) => {
  if ((currentStock || 0) <= 0) {
    return { status: 'empty', color: '#F44336', text: '无库存' };
  } else if ((currentStock || 0) <= (minStock || 0)) {
    return { status: 'warning', color: '#FF9800', text: '库存不足' };
  } else {
    return { status: 'normal', color: '#4CAF50', text: '库存充足' };
  }
};

/**
 * 计算利润
 */
export const calculateProfit = (salePrice, purchasePrice, settleAmount, expressCost = 0, extraCostTotal = 0) => {
  const productProfit = salePrice - purchasePrice;
  const productProfitRate = salePrice > 0 ? (productProfit / salePrice * 100) : 0;
  
  const platformIncome = salePrice - settleAmount;
  const platformIncomeRate = salePrice > 0 ? (platformIncome / salePrice * 100) : 0;
  
  const platformNetProfit = salePrice - settleAmount - expressCost - extraCostTotal;
  const platformNetProfitRate = salePrice > 0 ? (platformNetProfit / salePrice * 100) : 0;
  
  const userProfit = settleAmount - purchasePrice;
  const userProfitRate = settleAmount > 0 ? (userProfit / settleAmount * 100) : 0;
  
  return {
    productProfit,
    productProfitRate,
    platformIncome,
    platformIncomeRate,
    platformNetProfit,
    platformNetProfitRate,
    userProfit,
    userProfitRate,
  };
};

/**
 * 计算资金预警
 */
export const calculateFundWarning = (pendingSettle, availableFund, threshold = 5000) => {
  const fundGap = pendingSettle - availableFund;
  
  let status = 'safe';
  if (fundGap > threshold) {
    status = 'danger';
  } else if (fundGap > 0) {
    status = 'warning';
  }
  
  return {
    status,
    fundGap: Math.max(0, fundGap),
    isSafe: status === 'safe',
  };
};

/**
 * 格式化日期
 */
export const formatDate = (dateStr, format = 'YYYY-MM-DD') => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes);
};

/**
 * 生成唯一ID
 */
export const generateId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
};

/**
 * 本地存储键名
 */
export const STORAGE_KEYS = {
  PRODUCTS: 'stock_products',
  LOGS: 'stock_logs',
  BIND_DATA: 'order_bind_data',
  AUDIT_RECORDS: 'night_audit_records',
  WARNING_SETTINGS: 'warning_settings',
};

/**
 * 获取本地存储数据
 */
export const getLocalData = async (key) => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`[Storage] 读取 ${key} 失败:`, err);
    return null;
  }
};

/**
 * 设置本地存储数据
 */
export const setLocalData = async (key, data) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error(`[Storage] 写入 ${key} 失败:`, err);
    return false;
  }
};

/**
 * 删除本地存储数据
 */
export const removeLocalData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error(`[Storage] 删除 ${key} 失败:`, err);
    return false;
  }
};

/**
 * 导出数据为文本
 */
export const exportToText = (data, title) => {
  const lines = [`【${title}】`, '========================'];
  
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'object') {
      lines.push(`${key}:`);
      Object.entries(value).forEach(([k, v]) => {
        lines.push(`  ${k}: ${v}`);
      });
    } else {
      lines.push(`${key}: ${value}`);
    }
  });
  
  lines.push('========================');
  lines.push(`导出时间: ${new Date().toLocaleString()}`);
  
  return lines.join('\n');
};
