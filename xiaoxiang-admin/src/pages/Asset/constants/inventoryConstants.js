// src/pages/Asset/constants/inventoryConstants.js
/**
 * 库存中心常量配置
 */

// ==================== 分类级别 ====================
export const CATEGORY_LEVEL = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
};

// ==================== SKU 状态 ====================
export const SKU_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
};

export const SKU_STATUS_LABELS = {
  [SKU_STATUS.ACTIVE]: '在售',
  [SKU_STATUS.INACTIVE]: '下架',
  [SKU_STATUS.LOW_STOCK]: '库存预警',
  [SKU_STATUS.OUT_OF_STOCK]: '缺货',
};

export const SKU_STATUS_COLORS = {
  [SKU_STATUS.ACTIVE]: 'success',
  [SKU_STATUS.INACTIVE]: 'default',
  [SKU_STATUS.LOW_STOCK]: 'warning',
  [SKU_STATUS.OUT_OF_STOCK]: 'error',
};

// ==================== 售卖状态 ====================
export const SALE_STATUS = {
  NOT_FOR_SALE: 'not_for_sale',
  FOR_SALE: 'for_sale',
  SOLD: 'sold',
  SALE_COMPLETED: 'sale_completed',  // 新增：售卖完毕
};

export const SALE_STATUS_LABELS = {
  [SALE_STATUS.NOT_FOR_SALE]: '不售卖',
  [SALE_STATUS.FOR_SALE]: '售卖中',
  [SALE_STATUS.SOLD]: '已售出',
  [SALE_STATUS.SALE_COMPLETED]: '售卖完毕',
};

export const SALE_STATUS_COLORS = {
  [SALE_STATUS.NOT_FOR_SALE]: 'default',
  [SALE_STATUS.FOR_SALE]: 'processing',
  [SALE_STATUS.SOLD]: 'success',
  [SALE_STATUS.SALE_COMPLETED]: 'success',
};

// ==================== ✅ 售卖平台 ====================
export const SALE_PLATFORMS = [
  { value: 'xianyu', label: '闲鱼' },
  { value: 'zhuanzhuan', label: '转转' },
  { value: 'pdd', label: '拼多多' },
  { value: 'taobao', label: '淘宝' },
  { value: 'jd', label: '京东' },
  { value: 'other', label: '其他' },
];

// ==================== 库存预警阈值 ====================
export const STOCK_WARNING_THRESHOLD = 5;

// ==================== 风险等级 ====================
export const RISK_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

export const RISK_LEVEL_LABELS = {
  [RISK_LEVEL.LOW]: '低风险',
  [RISK_LEVEL.MEDIUM]: '中风险',
  [RISK_LEVEL.HIGH]: '高风险',
};

export const RISK_LEVEL_COLORS = {
  [RISK_LEVEL.LOW]: 'success',
  [RISK_LEVEL.MEDIUM]: 'warning',
  [RISK_LEVEL.HIGH]: 'error',
};

// ==================== 清空测试数据 ====================
export const DEFAULT_CATEGORIES = [];

export const DEFAULT_SKU_LIST = [];

export default {
  CATEGORY_LEVEL,
  SKU_STATUS,
  SKU_STATUS_LABELS,
  SKU_STATUS_COLORS,
  SALE_STATUS,
  SALE_STATUS_LABELS,
  SALE_STATUS_COLORS,
  SALE_PLATFORMS,
  RISK_LEVEL,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  STOCK_WARNING_THRESHOLD,
  DEFAULT_CATEGORIES,
  DEFAULT_SKU_LIST,
};
