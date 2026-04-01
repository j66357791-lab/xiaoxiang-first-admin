// src/pages/Asset/utils/riskControl.js
/**
 * 资产风控算法
 * 
 * 用于动态评估库存资金压力和风险等级
 */

/**
 * 风控配置
 */
export const RISK_CONFIG = {
  // 风险阈值配置
  thresholds: {
    safe: 5000,        // 安全线：5000元以下
    warning: 10000,    // 警戒线：10000元
    danger: 20000,     // 危险线：20000元
    critical: 30000,   // 临界线：30000元
  },
  
  // 压货天数风险权重
  dayWeight: {
    normal: 1,         // 0-2天：正常权重
    warning: 1.2,      // 3-6天：预警权重
    danger: 1.5,       // 7-13天：危险权重
    critical: 2,       // 14天以上：临界权重
  },
  
  // 预警订单风险加成
  warningBonus: {
    danger: 500,       // 紧急预警订单（>=7天）每单加500风险值
    warning: 200,      // 普通预警订单（3-7天）每单加200风险值
    shelved: -100,     // 已搁置订单每单减100风险值（已处理）
  },
  
  // 资金周转率目标
  turnoverTarget: 0.3, // 目标月周转率 30%
};

/**
 * 计算单个资产的风险权重
 * @param {object} asset - 资产对象
 * @returns {number} - 风险权重
 */
export const calculateAssetRiskWeight = (asset) => {
  const { stockDays = 0, isShelved } = asset;
  const { dayWeight, warningBonus } = RISK_CONFIG;
  
  // 基础权重（根据压货天数）
  let weight = 1;
  if (stockDays >= 14) {
    weight = dayWeight.critical;
  } else if (stockDays >= 7) {
    weight = dayWeight.danger;
  } else if (stockDays >= 3) {
    weight = dayWeight.warning;
  } else {
    weight = dayWeight.normal;
  }
  
  // 搁置状态减负
  if (isShelved) {
    weight *= 0.5; // 搁置订单风险减半
  }
  
  return weight;
};

/**
 * 计算库存资金压力（加权风险金额）
 * @param {array} stockItems - 压货中的资产列表
 * @returns {object} - 风险评估结果
 */
export const calculateStockPressure = (stockItems) => {
  const { thresholds, warningBonus } = RISK_CONFIG;
  
  // 1. 基础压货金额
  const baseAmount = stockItems.reduce((sum, item) => sum + (item.costPrice || 0), 0);
  
  // 2. 加权风险金额（考虑压货天数）
  const weightedAmount = stockItems.reduce((sum, item) => {
    const weight = calculateAssetRiskWeight(item);
    return sum + (item.costPrice || 0) * weight;
  }, 0);
  
  // 3. 预警加成
  const dangerCount = stockItems.filter(i => i.stockDays >= 7 && !i.isShelved).length;
  const warningCount = stockItems.filter(i => i.stockDays >= 3 && i.stockDays < 7 && !i.isShelved).length;
  const shelvedCount = stockItems.filter(i => i.isShelved).length;
  
  const warningAddition = 
    dangerCount * warningBonus.danger + 
    warningCount * warningBonus.warning + 
    shelvedCount * warningBonus.shelved;
  
  // 4. 最终风险压力值
  const riskPressure = weightedAmount + warningAddition;
  
  // 5. 风险等级评估
  let riskLevel = 'safe';
  let riskColor = '#52c41a';
  let riskText = '安全';
  
  if (riskPressure >= thresholds.critical) {
    riskLevel = 'critical';
    riskColor = '#722ed1';
    riskText = '临界';
  } else if (riskPressure >= thresholds.danger) {
    riskLevel = 'danger';
    riskColor = '#cf1322';
    riskText = '危险';
  } else if (riskPressure >= thresholds.warning) {
    riskLevel = 'warning';
    riskColor = '#fa8c16';
    riskText = '警戒';
  } else if (riskPressure >= thresholds.safe) {
    riskLevel = 'normal';
    riskColor = '#1890ff';
    riskText = '正常';
  }
  
  // 6. 风险占比
  const riskPercent = Math.min((riskPressure / thresholds.critical) * 100, 100);
  
  return {
    baseAmount,           // 基础压货金额
    weightedAmount,       // 加权风险金额
    warningAddition,      // 预警加成
    riskPressure,         // 最终风险压力值
    riskLevel,            // 风险等级
    riskColor,            // 风险颜色
    riskText,             // 风险文字
    riskPercent,          // 风险占比百分比
    dangerCount,          // 紧急预警数量
    warningCount,         // 普通预警数量
    shelvedCount,         // 搁置数量
    thresholds,           // 阈值配置
  };
};

/**
 * 计算资金周转效率
 * @param {object} stats - 统计数据
 * @returns {object} - 周转效率结果
 */
export const calculateTurnoverEfficiency = (stats) => {
  const {
    totalCost = 0,        // 总投入（压货成本）
    totalIncome = 0,      // 总回笼（已处置收入）
    stockedCount = 0,     // 压货数量
    disposedCount = 0,    // 已处置数量
    totalShippingCost = 0,
    totalOtherCost = 0,
  } = stats;
  
  // 1. 纯利润（毛利润）= 总回笼 - 商品成本
  const grossProfit = totalIncome - (stats.totalFixedCost || 0);
  
  // 2. 净利润 = 总回笼 - 商品成本 - 快递成本 - 其他成本
  const netProfit = totalIncome - (stats.totalFixedCost || 0) - totalShippingCost - totalOtherCost;
  
  // 3. 纯利润率 = 纯利润 / 总回笼
  const grossProfitRate = totalIncome > 0 ? (grossProfit / totalIncome * 100).toFixed(1) : 0;
  
  // 4. 净利润率 = 净利润 / 总回笼
  const netProfitRate = totalIncome > 0 ? (netProfit / totalIncome * 100).toFixed(1) : 0;
  
  // 5. 资金回笼率 = 总回笼 / 总投入
  const recoveryRate = totalCost > 0 ? (totalIncome / totalCost * 100).toFixed(1) : 0;
  
  // 6. 处置效率 = 已处置 / (已处置 + 压货中)
  const totalAssets = stockedCount + disposedCount;
  const disposeEfficiency = totalAssets > 0 ? (disposedCount / totalAssets * 100).toFixed(1) : 0;
  
  // 7. 平均压货天数（需要从原始数据计算）
  const avgStockDays = stats.avgStockDays || 0;
  
  return {
    grossProfit,          // 纯利润（毛利润）
    netProfit,            // 净利润
    grossProfitRate,      // 纯利润率
    netProfitRate,        // 净利润率
    recoveryRate,         // 资金回笼率
    disposeEfficiency,    // 处置效率
    avgStockDays,         // 平均压货天数
  };
};

/**
 * 生成风控建议
 * @param {object} riskResult - 风险评估结果
 * @param {object} turnoverResult - 周转效率结果
 * @returns {array} - 建议列表
 */
export const generateRiskSuggestions = (riskResult, turnoverResult) => {
  const suggestions = [];
  const { riskLevel, dangerCount, warningCount, riskPressure, thresholds } = riskResult;
  
  // 风险等级建议
  if (riskLevel === 'critical') {
    suggestions.push({
      type: 'critical',
      icon: '🚨',
      text: '库存资金压力已达临界状态，建议立即处置长期压货资产',
      action: '立即行动'
    });
  } else if (riskLevel === 'danger') {
    suggestions.push({
      type: 'danger',
      icon: '⚠️',
      text: '库存资金压力过高，建议优先处置7天以上压货订单',
      action: '优先处理'
    });
  } else if (riskLevel === 'warning') {
    suggestions.push({
      type: 'warning',
      icon: '💡',
      text: '库存资金压力接近警戒线，建议加快处置进度',
      action: '加快处置'
    });
  }
  
  // 预警订单建议
  if (dangerCount > 0) {
    suggestions.push({
      type: 'danger',
      icon: '🔥',
      text: `有 ${dangerCount} 笔订单压货超过7天，存在滞销风险`,
      action: '紧急处置'
    });
  }
  
  if (warningCount > 0) {
    suggestions.push({
      type: 'warning',
      icon: '📋',
      text: `有 ${warningCount} 笔订单压货3-7天，建议关注`,
      action: '关注跟进'
    });
  }
  
  // 周转效率建议
  if (turnoverResult.disposeEfficiency < 50) {
    suggestions.push({
      type: 'info',
      icon: '📊',
      text: `处置效率仅 ${turnoverResult.disposeEfficiency}%，建议提高周转速度`,
      action: '提升效率'
    });
  }
  
  if (turnoverResult.netProfitRate < 10) {
    suggestions.push({
      type: 'warning',
      icon: '💰',
      text: `净利润率 ${turnoverResult.netProfitRate}% 偏低，建议优化成本控制`,
      action: '成本优化'
    });
  }
  
  return suggestions;
};

/**
 * 综合风控评估
 * @param {array} stockItems - 压货中的资产列表
 * @param {object} stats - 统计数据
 * @returns {object} - 综合评估结果
 */
export const comprehensiveRiskAssessment = (stockItems, stats) => {
  // 计算风险压力
  const riskResult = calculateStockPressure(stockItems);
  
  // 计算周转效率
  const turnoverResult = calculateTurnoverEfficiency(stats);
  
  // 生成建议
  const suggestions = generateRiskSuggestions(riskResult, turnoverResult);
  
  // 综合评分（0-100，越高越健康）
  let healthScore = 100;
  
  // 风险压力扣分
  if (riskResult.riskLevel === 'critical') healthScore -= 40;
  else if (riskResult.riskLevel === 'danger') healthScore -= 25;
  else if (riskResult.riskLevel === 'warning') healthScore -= 15;
  else if (riskResult.riskLevel === 'normal') healthScore -= 5;
  
  // 预警订单扣分
  healthScore -= riskResult.dangerCount * 5;
  healthScore -= riskResult.warningCount * 2;
  
  // 周转效率加分
  healthScore += parseFloat(turnoverResult.disposeEfficiency) * 0.2;
  
  // 利润率加分
  healthScore += parseFloat(turnoverResult.netProfitRate) * 0.3;
  
  // 限制在0-100范围内
  healthScore = Math.max(0, Math.min(100, healthScore));
  
  return {
    risk: riskResult,
    turnover: turnoverResult,
    suggestions,
    healthScore: healthScore.toFixed(0),
    healthLevel: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'normal' : healthScore >= 40 ? 'warning' : 'danger',
  };
};

export default {
  RISK_CONFIG,
  calculateAssetRiskWeight,
  calculateStockPressure,
  calculateTurnoverEfficiency,
  generateRiskSuggestions,
  comprehensiveRiskAssessment,
};
