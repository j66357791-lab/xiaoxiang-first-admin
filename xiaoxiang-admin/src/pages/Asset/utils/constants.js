// src/pages/Asset/utils/constants.js
/**
 * 资产中心常量配置
 */

// ==================== 本地存储键名 ====================
export const STORAGE_KEYS = {
  DRAFT: 'asset_draft_data',
  SETTINGS: 'asset_settings',
};

// ==================== 默认值 ====================
export const DEFAULTS = {
  PAGE_SIZE: 10,
  MAX_HISTORY_VERSIONS: 4,
  WARNING_DAYS: {
    DANGER: 7,    // 紧急预警天数
    WARNING: 3,   // 普通预警天数
  },
};

// ==================== 菜单配置 ====================
export const MENU_ITEMS = [
  { key: 'overview', icon: 'DashboardOutlined', label: '资产中心总览' },
  { key: 'orders', icon: 'OrderedListOutlined', label: '订单处置总览' },
  { key: 'tracking', icon: 'AuditOutlined', label: '处置状态跟踪' },
  { key: 'revenue', icon: 'DollarOutlined', label: '收益中心' },
  { key: 'logs', icon: 'FileTextOutlined', label: '日志中心' },
];

// ==================== 处置动作 ====================
export const DISPOSE_ACTIONS = {
  SELL: '确定售卖',
  SETTLE: '确定结算',
  COMPLETE: '确定完结',
};

export const DISPOSE_ACTION_OPTIONS = [
  { value: DISPOSE_ACTIONS.SELL, label: DISPOSE_ACTIONS.SELL },
  { value: DISPOSE_ACTIONS.SETTLE, label: DISPOSE_ACTIONS.SETTLE },
  { value: DISPOSE_ACTIONS.COMPLETE, label: DISPOSE_ACTIONS.COMPLETE },
];

// ==================== 转售平台 ====================
export const RESALE_PLATFORMS = {
  XIANYU: '闲鱼',
  ZHUANZHUAN: '转转',
  PAIPAI: '拍拍',
  OTHER: '其他',
};

export const RESALE_PLATFORM_OPTIONS = [
  { value: RESALE_PLATFORMS.XIANYU, label: RESALE_PLATFORMS.XIANYU },
  { value: RESALE_PLATFORMS.ZHUANZHUAN, label: RESALE_PLATFORMS.ZHUANZHUAN },
  { value: RESALE_PLATFORMS.PAIPAI, label: RESALE_PLATFORMS.PAIPAI },
  { value: RESALE_PLATFORMS.OTHER, label: RESALE_PLATFORMS.OTHER },
];

// ==================== 状态颜色映射 ====================
export const STATUS_COLORS = {
  STOCKED: 'blue',
  DISPOSED: 'green',
};

export const WARNING_LEVEL_COLORS = {
  normal: '',
  warning: '#fffbe6',
  danger: '#fff1f0',
  shelved: '#f5f5f5',
  invalid: '#fff2f0',
};

// ==================== 导出 ====================
export default {
  STORAGE_KEYS,
  DEFAULTS,
  MENU_ITEMS,
  DISPOSE_ACTIONS,
  DISPOSE_ACTION_OPTIONS,
  RESALE_PLATFORMS,
  RESALE_PLATFORM_OPTIONS,
  STATUS_COLORS,
  WARNING_LEVEL_COLORS,
};
