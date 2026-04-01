// src/pages/Asset/utils/api.js
/**
 * 资产中心 API 服务
 * 统一管理所有后端请求
 */

import { request } from '../../../utils/request';
import { logger } from './logger';

// ==================== API 端点配置 ====================
const API_ENDPOINTS = {
  // 订单相关
  ORDERS_ADMIN: '/api/orders/admin',
  
  // 资产快照相关
  SNAPSHOT: '/api/assets/snapshot',
  SNAPSHOT_HISTORY: '/api/assets/history',
  SNAPSHOT_RESTORE: (id) => `/api/assets/restore/${id}`,
  SNAPSHOT_DELETE: (id) => `/api/assets/${id}`,
  
  // ✅ 新增：库存快照相关
  INVENTORY_SNAPSHOT: '/api/inventory/snapshot',
  INVENTORY_HISTORY: '/api/inventory/history',
  INVENTORY_RESTORE: (id) => `/api/inventory/restore/${id}`,
  INVENTORY_DELETE: (id) => `/api/inventory/${id}`,
};

// ==================== 响应解析工具 ====================
/**
 * 统一解析 API 响应，处理不同的响应结构
 */
export const parseResponse = (res, context = '') => {
  logger.step(`解析响应 [${context}]`, { res });
  
  // 情况1: res 直接包含 success
  if (res?.success !== undefined) {
    logger.step('响应格式: 直接包含 success', { success: res.success });
    return {
      success: res.success,
      data: res.data,
      message: res.message,
      raw: res
    };
  }
  
  // 情况2: res.data 包含 success (标准格式)
  if (res?.data?.success !== undefined) {
    logger.step('响应格式: res.data 包含 success', { success: res.data.success });
    return {
      success: res.data.success,
      data: res.data.data,
      message: res.data.message,
      raw: res
    };
  }
  
  // 情况3: res.ok 存在 (fetch 标准响应)
  if (res?.ok !== undefined) {
    logger.step('响应格式: res.ok 存在', { ok: res.ok });
    return {
      success: res.ok,
      data: res.data,
      message: res.data?.message || (res.ok ? '成功' : '失败'),
      raw: res
    };
  }
  
  // 未知格式
  logger.warning('未知响应格式', res);
  return {
    success: false,
    data: null,
    message: '未知响应格式',
    raw: res
  };
};

// ==================== 订单 API ====================
/**
 * 获取管理员订单列表
 */
export const fetchAdminOrders = async () => {
  const startTime = Date.now();
  
  try {
    logger.request('拉取订单', API_ENDPOINTS.ORDERS_ADMIN);
    
    const res = await request(API_ENDPOINTS.ORDERS_ADMIN);
    const duration = Date.now() - startTime;
    
    logger.response('拉取订单响应', res, duration);
    
    const parsed = parseResponse(res, '拉取订单');
    
    if (parsed.success && parsed.data) {
      const orders = Array.isArray(parsed.data) ? parsed.data : (parsed.data.data || []);
      return {
        success: true,
        data: orders,
        message: '获取成功'
      };
    }
    
    return {
      success: false,
      data: [],
      message: parsed.message || '获取失败'
    };
    
  } catch (error) {
    logger.error('拉取订单异常', error);
    return {
      success: false,
      data: [],
      message: error.message || '网络请求失败'
    };
  }
};

// ==================== 资产快照 API ====================
/**
 * 保存快照
 */
export const saveSnapshot = async (snapshot, remark) => {
  const startTime = Date.now();
  
  try {
    const payload = { snapshot, remark };
    
    logger.request('保存快照', API_ENDPOINTS.SNAPSHOT, {
      remark,
      assetsCount: snapshot?.allAssets?.length || 0,
      snapshotSize: `${(JSON.stringify(snapshot).length / 1024).toFixed(2)} KB`
    });
    
    const res = await request(API_ENDPOINTS.SNAPSHOT, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const duration = Date.now() - startTime;
    logger.response('保存快照响应', res, duration);
    
    const parsed = parseResponse(res, '保存快照');
    
    return {
      success: parsed.success,
      data: parsed.data,
      message: parsed.message || (parsed.success ? '保存成功' : '保存失败')
    };
    
  } catch (error) {
    logger.error('保存快照异常', error);
    return {
      success: false,
      data: null,
      message: error.message || '网络请求失败'
    };
  }
};

/**
 * 获取最新快照
 */
export const fetchLatestSnapshot = async () => {
  const startTime = Date.now();
  
  try {
    logger.request('读取快照', API_ENDPOINTS.SNAPSHOT);
    
    const res = await request(API_ENDPOINTS.SNAPSHOT);
    const duration = Date.now() - startTime;
    
    logger.response('读取快照响应', res, duration);
    
    const parsed = parseResponse(res, '读取快照');
    
    if (parsed.success && parsed.data) {
      return {
        success: true,
        data: parsed.data,
        message: '获取成功'
      };
    }
    
    return {
      success: false,
      data: null,
      message: parsed.message || '暂无快照数据'
    };
    
  } catch (error) {
    logger.error('读取快照异常', error);
    return {
      success: false,
      data: null,
      message: error.message || '网络请求失败'
    };
  }
};

/**
 * 获取历史版本列表
 */
export const fetchVersionHistory = async () => {
  try {
    const res = await request(API_ENDPOINTS.SNAPSHOT_HISTORY);
    const parsed = parseResponse(res, '获取历史版本');
    
    return {
      success: parsed.success,
      data: parsed.data || [],
      message: parsed.message
    };
    
  } catch (error) {
    logger.error('获取历史版本异常', error);
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
};

/**
 * 恢复指定版本
 */
export const restoreVersion = async (versionId) => {
  const startTime = Date.now();
  
  try {
    const url = API_ENDPOINTS.SNAPSHOT_RESTORE(versionId);
    logger.request('恢复版本', url, { versionId });
    
    const res = await request(url, { method: 'POST' });
    const duration = Date.now() - startTime;
    
    logger.response('恢复版本响应', res, duration);
    
    const parsed = parseResponse(res, '恢复版本');
    
    return {
      success: parsed.success,
      data: parsed.data,
      message: parsed.message || (parsed.success ? '恢复成功' : '恢复失败')
    };
    
  } catch (error) {
    logger.error('恢复版本异常', error);
    return {
      success: false,
      data: null,
      message: error.message
    };
  }
};

/**
 * 删除指定版本
 */
export const deleteVersion = async (versionId) => {
  try {
    const url = API_ENDPOINTS.SNAPSHOT_DELETE(versionId);
    const res = await request(url, { method: 'DELETE' });
    const parsed = parseResponse(res, '删除版本');
    
    return {
      success: parsed.success,
      message: parsed.message || (parsed.success ? '删除成功' : '删除失败')
    };
    
  } catch (error) {
    logger.error('删除版本异常', error);
    return {
      success: false,
      message: error.message
    };
  }
};

// ==================== ✅ 库存快照 API ====================

/**
 * 保存库存快照
 * @param {Object} data - { skuList, categories, bindOrders, stats }
 * @param {string} remark - 存档备注
 */
export const saveInventorySnapshot = async (data, remark) => {
  const startTime = Date.now();
  
  try {
    const payload = { data, remark };
    
    logger.request('保存库存快照', API_ENDPOINTS.INVENTORY_SNAPSHOT, {
      remark,
      skuCount: data?.skuList?.length || 0,
      categoryCount: data?.categories?.length || 0,
      bindOrderCount: data?.bindOrders?.length || 0,
    });
    
    const res = await request(API_ENDPOINTS.INVENTORY_SNAPSHOT, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const duration = Date.now() - startTime;
    logger.response('保存库存快照响应', res, duration);
    
    const parsed = parseResponse(res, '保存库存快照');
    
    return {
      success: parsed.success,
      data: parsed.data,
      message: parsed.message || (parsed.success ? '保存成功' : '保存失败')
    };
    
  } catch (error) {
    logger.error('保存库存快照异常', error);
    return {
      success: false,
      data: null,
      message: error.message || '网络请求失败'
    };
  }
};

/**
 * 获取最新库存快照
 */
export const fetchLatestInventorySnapshot = async () => {
  const startTime = Date.now();
  
  try {
    logger.request('读取库存快照', API_ENDPOINTS.INVENTORY_SNAPSHOT);
    
    const res = await request(API_ENDPOINTS.INVENTORY_SNAPSHOT);
    const duration = Date.now() - startTime;
    
    logger.response('读取库存快照响应', res, duration);
    
    const parsed = parseResponse(res, '读取库存快照');
    
    if (parsed.success && parsed.data) {
      return {
        success: true,
        data: parsed.data,
        message: '获取成功'
      };
    }
    
    return {
      success: false,
      data: null,
      message: parsed.message || '暂无库存快照数据'
    };
    
  } catch (error) {
    logger.error('读取库存快照异常', error);
    return {
      success: false,
      data: null,
      message: error.message || '网络请求失败'
    };
  }
};

/**
 * 获取库存历史版本列表
 */
export const fetchInventoryVersionHistory = async () => {
  try {
    const res = await request(API_ENDPOINTS.INVENTORY_HISTORY);
    const parsed = parseResponse(res, '获取库存历史版本');
    
    return {
      success: parsed.success,
      data: parsed.data || [],
      message: parsed.message
    };
    
  } catch (error) {
    logger.error('获取库存历史版本异常', error);
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
};

/**
 * 恢复库存指定版本
 */
export const restoreInventoryVersion = async (versionId) => {
  const startTime = Date.now();
  
  try {
    const url = API_ENDPOINTS.INVENTORY_RESTORE(versionId);
    logger.request('恢复库存版本', url, { versionId });
    
    const res = await request(url, { method: 'POST' });
    const duration = Date.now() - startTime;
    
    logger.response('恢复库存版本响应', res, duration);
    
    const parsed = parseResponse(res, '恢复库存版本');
    
    return {
      success: parsed.success,
      data: parsed.data,
      message: parsed.message || (parsed.success ? '恢复成功' : '恢复失败')
    };
    
  } catch (error) {
    logger.error('恢复库存版本异常', error);
    return {
      success: false,
      data: null,
      message: error.message
    };
  }
};

/**
 * 删除库存指定版本
 */
export const deleteInventoryVersion = async (versionId) => {
  try {
    const url = API_ENDPOINTS.INVENTORY_DELETE(versionId);
    const res = await request(url, { method: 'DELETE' });
    const parsed = parseResponse(res, '删除库存版本');
    
    return {
      success: parsed.success,
      message: parsed.message || (parsed.success ? '删除成功' : '删除失败')
    };
    
  } catch (error) {
    logger.error('删除库存版本异常', error);
    return {
      success: false,
      message: error.message
    };
  }
};

// ==================== 导出所有 API ====================
export default {
  // 订单
  fetchAdminOrders,
  
  // 资产快照
  saveSnapshot,
  fetchLatestSnapshot,
  fetchVersionHistory,
  restoreVersion,
  deleteVersion,
  
  // 库存快照
  saveInventorySnapshot,
  fetchLatestInventorySnapshot,
  fetchInventoryVersionHistory,
  restoreInventoryVersion,
  deleteInventoryVersion,
  
  // 工具
  parseResponse,
};
