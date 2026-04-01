// src/constants/asset.js

// ==================== 角色权限配置 ====================
export const ROLE_CONFIG = {
  admin: {
    label: '超级管理员',
    canViewMoney: true,
    canDispose: true,
    canViewBuyer: true,
    canViewAllStatus: true
  },
  finance: {
    label: '财务',
    canViewMoney: true,
    canDispose: false,
    canViewBuyer: false,
    canViewAllStatus: true
  },
  seller: {
    label: '分流售卖方',
    canViewMoney: true,
    canDispose: true,
    canViewBuyer: true,
    canViewAllStatus: false
  },
  stock_keeper: {
    label: '库存员',
    canViewMoney: false,
    canDispose: false,
    canViewBuyer: false,
    canViewAllStatus: true
  }
};

// ==================== 资产状态枚举 ====================
export const ASSET_STATUS = {
  STOCKED: 'stocked',
  DISPOSED: 'disposed',
  ALL: 'all'
};

export const ASSET_STATUS_LABELS = {
  [ASSET_STATUS.STOCKED]: '压货中',
  [ASSET_STATUS.DISPOSED]: '已处置'
};

export const ASSET_STATUS_COLORS = {
  [ASSET_STATUS.STOCKED]: 'error',
  [ASSET_STATUS.DISPOSED]: 'success'
};

// ==================== 处置方式枚举 ====================
export const DISPOSE_METHODS = {
  SOLD: 'sold',
  SCRAPPED: 'scrapped',
  RETURNED: 'returned'
};

export const DISPOSE_METHOD_LABELS = {
  [DISPOSE_METHODS.SOLD]: '卖出变现',
  [DISPOSE_METHODS.SCRAPPED]: '报废处理',
  [DISPOSE_METHODS.RETURNED]: '退回用户'
};

// ==================== 预警配置 ====================
export const WARNING_CONFIG = {
  STOCK_DAYS_WARNING: 7,
  STOCK_DAYS_DANGER: 15
};
