// src/pages/Asset/utils/inventoryUtils.js
/**
 * 库存中心工具函数
 */

import { 
  SKU_STATUS, 
  SKU_STATUS_LABELS, 
  STOCK_WARNING_THRESHOLD,
  RISK_LEVEL,
} from '../constants/inventoryConstants';

/**
 * 生成 SKU 编码
 */
export const generateSkuCode = (prefix = 'SKU') => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return prefix + '-' + dateStr + '-' + random;
};

/**
 * 计算库存状态
 */
export const calculateStockStatus = (stock) => {
  if (stock === 0) return SKU_STATUS.OUT_OF_STOCK;
  if (stock <= STOCK_WARNING_THRESHOLD) return SKU_STATUS.LOW_STOCK;
  return SKU_STATUS.ACTIVE;
};

/**
 * 计算利润
 */
export const calculateProfit = (costPrice, salePrice) => {
  const profit = salePrice - costPrice;
  const profitRate = costPrice > 0 ? (profit / costPrice * 100).toFixed(2) : 0;
  return { profit, profitRate };
};

/**
 * 计算主SKU的总库存和价格范围
 */
export const calculateSkuSummary = (sku) => {
  if (!sku.isParent || !sku.children || sku.children.length === 0) {
    return {
      totalStock: sku.stock || 0,
      minPrice: sku.salePrice || 0,
      maxPrice: sku.salePrice || 0,
      minCost: sku.costPrice || 0,
      maxCost: sku.costPrice || 0,
    };
  }

  const children = sku.children.filter(c => !c.isParent);
  const totalStock = children.reduce((sum, c) => sum + (c.stock || 0), 0);
  const prices = children.map(c => c.salePrice).filter(p => p > 0);
  const costs = children.map(c => c.costPrice).filter(p => p > 0);

  return {
    totalStock,
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    minCost: costs.length > 0 ? Math.min(...costs) : 0,
    maxCost: costs.length > 0 ? Math.max(...costs) : 0,
  };
};

/**
 * 获取所有子SKU（扁平化）
 */
export const getAllSubSkus = (skuList) => {
  const result = [];
  (skuList || []).forEach(sku => {
    if (sku.isParent && sku.children && sku.children.length > 0) {
      sku.children.forEach(child => {
        result.push({
          ...child,
          parentName: sku.name,
          parentSkuCode: sku.skuCode,
        });
      });
    } else if (!sku.isParent) {
      result.push({
        ...sku,
        parentName: sku.name,
        parentSkuCode: sku.skuCode,
      });
    }
  });
  return result;
};

/**
 * 根据ID查找SKU
 */
export const findSkuById = (skuList, skuId) => {
  for (const sku of (skuList || [])) {
    if (sku.id === skuId) return sku;
    if (sku.children && sku.children.length > 0) {
      const found = sku.children.find(c => c.id === skuId);
      if (found) return found;
    }
  }
  return null;
};

/**
 * 更新SKU库存
 */
export const updateSkuStock = (skuList, skuId, quantity) => {
  return (skuList || []).map(sku => {
    if (sku.id === skuId) {
      const newStock = (sku.stock || 0) + quantity;
      return {
        ...sku,
        stock: newStock,
        status: calculateStockStatus(newStock),
        updatedAt: new Date().toISOString(),
      };
    }
    if (sku.children && sku.children.length > 0) {
      const newChildren = sku.children.map(child => {
        if (child.id === skuId) {
          const newStock = (child.stock || 0) + quantity;
          return {
            ...child,
            stock: newStock,
            status: calculateStockStatus(newStock),
            updatedAt: new Date().toISOString(),
          };
        }
        return child;
      });
      
      const totalStock = newChildren.reduce((sum, c) => sum + (c.stock || 0), 0);
      
      return {
        ...sku,
        children: newChildren,
        status: calculateStockStatus(totalStock),
        updatedAt: new Date().toISOString(),
      };
    }
    return sku;
  });
};

/**
 * 构建分类树结构
 */
export const buildCategoryTree = (categories) => {
  const buildTree = (parentId, level) => {
    return (categories || [])
      .filter(c => c.parentId === parentId && c.level === level)
      .sort((a, b) => a.sort - b.sort)
      .map(c => ({
        value: c.id,
        label: c.name,
        children: level < 3 ? buildTree(c.id, level + 1) : undefined,
      }));
  };
  return buildTree(null, 1);
};

/**
 * 获取分类名称
 */
export const getCategoryName = (categoryId, categories) => {
  const cat = (categories || []).find(c => c.id === categoryId);
  return cat ? cat.name : '-';
};

/**
 * 计算风险等级
 */
export const calculateRiskLevel = (listedAt, soldAt) => {
  if (!listedAt) return RISK_LEVEL.LOW;
  
  const now = new Date();
  const listedDate = new Date(listedAt);
  const soldDate = soldAt ? new Date(soldAt) : null;
  
  const daysOnSale = soldDate 
    ? Math.floor((soldDate - listedDate) / (1000 * 60 * 60 * 24))
    : Math.floor((now - listedDate) / (1000 * 60 * 60 * 24));
  
  if (daysOnSale <= 7) return RISK_LEVEL.LOW;
  if (daysOnSale <= 14) return RISK_LEVEL.MEDIUM;
  return RISK_LEVEL.HIGH;
};

/**
 * 计算绑定订单的风险统计
 */
export const calculateBindOrderRiskStats = (bindOrders) => {
  const stats = {
    total: bindOrders.length,
    sold: 0,
    unsold: 0,
    lowRisk: 0,
    mediumRisk: 0,
    highRisk: 0,
    avgDaysToSell: 0,
    platformStats: {},
  };
  
  let totalDaysToSell = 0;
  let soldCount = 0;
  
  bindOrders.forEach(order => {
    if (order.isForSale) {
      stats.sold++;
      
      if (order.listedAt && order.soldAt) {
        const days = Math.floor(
          (new Date(order.soldAt) - new Date(order.listedAt)) / (1000 * 60 * 60 * 24)
        );
        totalDaysToSell += days;
        soldCount++;
        
        const risk = calculateRiskLevel(order.listedAt, order.soldAt);
        if (risk === RISK_LEVEL.LOW) stats.lowRisk++;
        else if (risk === RISK_LEVEL.MEDIUM) stats.mediumRisk++;
        else stats.highRisk++;
      }
    } else {
      stats.unsold++;
      
      if (order.listedAt) {
        const risk = calculateRiskLevel(order.listedAt, null);
        if (risk === RISK_LEVEL.LOW) stats.lowRisk++;
        else if (risk === RISK_LEVEL.MEDIUM) stats.mediumRisk++;
        else stats.highRisk++;
      }
    }
    
    if (order.salePlatform) {
      stats.platformStats[order.salePlatform] = (stats.platformStats[order.salePlatform] || 0) + 1;
    }
  });
  
  stats.avgDaysToSell = soldCount > 0 ? (totalDaysToSell / soldCount).toFixed(1) : 0;
  
  return stats;
};

/**
 * 导出 SKU 数据为 CSV
 */
export const exportSkuToCsv = (skuList, categories) => {
  const headers = [
    'SKU编码', '商品名称', '分类', '规格', '库存', '成本价', '售价', 
    '是否售卖', '售卖平台', '上架时间', '状态'
  ];

  const rows = [];
  
  (skuList || []).forEach(sku => {
    if (sku.isParent && sku.children && sku.children.length > 0) {
      const summary = calculateSkuSummary(sku);
      rows.push([
        sku.skuCode,
        sku.name,
        getCategoryName(sku.category1, categories),
        '-',
        summary.totalStock,
        summary.minCost,
        summary.minPrice,
        '-', '-', '-',
        SKU_STATUS_LABELS[sku.status] || '',
      ]);
      
      sku.children.forEach(child => {
        rows.push([
          '  ' + child.skuCode,
          '  └ ' + child.name,
          '',
          child.spec || '',
          child.stock,
          child.costPrice,
          child.salePrice,
          child.isForSale ? '是' : '否',
          child.salePlatform || '-',
          child.listedAt || '-',
          SKU_STATUS_LABELS[child.status] || '',
        ]);
      });
    } else {
      rows.push([
        sku.skuCode,
        sku.name,
        getCategoryName(sku.category1, categories),
        sku.spec || '',
        sku.stock,
        sku.costPrice,
        sku.salePrice,
        sku.isForSale ? '是' : '否',
        sku.salePlatform || '-',
        sku.listedAt || '-',
        SKU_STATUS_LABELS[sku.status] || '',
      ]);
    }
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => '"' + cell + '"').join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'SKU导出_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default {
  generateSkuCode,
  calculateStockStatus,
  calculateProfit,
  calculateSkuSummary,
  getAllSubSkus,
  findSkuById,
  updateSkuStock,
  buildCategoryTree,
  getCategoryName,
  calculateRiskLevel,
  calculateBindOrderRiskStats,
  exportSkuToCsv,
};
