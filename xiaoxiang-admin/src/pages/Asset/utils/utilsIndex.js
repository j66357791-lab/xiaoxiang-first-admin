// src/pages/Asset/utils/index.js
/**
 * 资产中心工具模块统一导出
 */

// API 服务
export { 
  fetchAdminOrders,
  saveSnapshot,
  fetchLatestSnapshot,
  fetchVersionHistory,
  restoreVersion,
  deleteVersion,
  parseResponse,
} from './api';

// 数据格式化
export {
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
} from './formatters';

// 常量
export {
  STORAGE_KEYS,
  DEFAULTS,
  MENU_ITEMS,
  DISPOSE_ACTIONS,
  DISPOSE_ACTION_OPTIONS,
  RESALE_PLATFORMS,
  RESALE_PLATFORM_OPTIONS,
  STATUS_COLORS,
  WARNING_LEVEL_COLORS,
} from './constants';

// 风控算法
export {
  RISK_CONFIG,
  calculateAssetRiskWeight,
  calculateStockPressure,
  calculateTurnoverEfficiency,
  generateRiskSuggestions,
  comprehensiveRiskAssessment,
} from './riskControl';

// 日志工具
export { logger } from './logger';
