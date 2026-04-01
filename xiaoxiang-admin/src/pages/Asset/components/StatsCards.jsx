//统计卡片组件（丰富的资产总览统计）
// src/pages/Asset/components/StatsCards.jsx
import React from 'react';
import { Card, Row, Col, Statistic, Tooltip, Progress, Tag } from 'antd';
import { 
  DollarOutlined, 
  StockOutlined, 
  RiseOutlined, 
  FallOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CarOutlined,
  ToolOutlined,
  ThunderboltOutlined,
  ShoppingOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import { 
  calculateStockPressure, 
  calculateTurnoverEfficiency,
  generateRiskSuggestions 
} from '../utils/riskControl';

// ✅ 自定义垂直分隔线组件（替代废弃的 Divider type="vertical"）
const VerticalDivider = () => (
  <div style={{ 
    width: 1, 
    height: 40, 
    background: '#d9d9d9', 
    margin: '0 16px' 
  }} />
);

const StatsCards = ({ stats, loading }) => {
  // ✅ 安全获取 stats，防止 undefined 错误
  const safeStats = stats || {};
  
  const {
    totalCost = 0,
    totalIncome = 0,
    stockedCount = 0,
    dangerCount = 0,
    warningCount = 0,
    invalidOrderCount = 0,
    disposedCount = 0,
    totalShippingCost = 0,
    totalOtherCost = 0,
    totalFixedCost = 0,
    stockItems = [],
  } = safeStats;

  // ==================== 利润计算 ====================
  const grossProfit = totalIncome - totalFixedCost;
  const netProfit = totalIncome - totalFixedCost - totalShippingCost - totalOtherCost;
  const grossProfitRate = totalIncome > 0 ? (grossProfit / totalIncome * 100) : 0;
  const netProfitRate = totalIncome > 0 ? (netProfit / totalIncome * 100) : 0;

  // ==================== 风控计算 ====================
  // ✅ 安全调用风控函数
  let riskResult = {
    riskPressure: 0,
    riskLevel: 'safe',
    riskColor: '#52c41a',
    riskText: '安全',
    riskPercent: 0
  };
  let suggestions = [];
  
  try {
    riskResult = calculateStockPressure(stockItems || []);
    const turnoverResult = calculateTurnoverEfficiency({
      ...safeStats,
      totalFixedCost,
      avgStockDays: safeStats.avgStockDays || 0
    });
    suggestions = generateRiskSuggestions(riskResult, turnoverResult);
  } catch (e) {
    console.error('风控计算错误:', e);
  }

  const totalWarning = dangerCount + warningCount;

  return (
    <div>
      {/* 第一行：核心财务指标 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {/* 纯利润收入（总回笼） */}
        <Col span={6}>
          <Card loading={loading} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={
                <span>
                  <StockOutlined style={{ marginRight: 4 }} />
                  纯利润收入
                  <Tooltip title="已处置资产变现的总收入（不含成本）">
                    <span style={{ marginLeft: 4, color: '#999', fontSize: 12 }}>?</span>
                  </Tooltip>
                </span>
              }
              value={totalIncome}
              precision={2}
              prefix="¥"
              styles={{ content: { color: '#3f8600', fontWeight: 'bold' } }}
            />
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#666', fontSize: 12 }}>已处置 {disposedCount} 件</span>
              <Tag color="green" style={{ margin: 0 }}>
                纯利润率 {grossProfitRate.toFixed(1)}%
              </Tag>
            </div>
          </Card>
        </Col>

        {/* 纯利润（毛利润） */}
        <Col span={6}>
          <Card loading={loading} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={
                <span>
                  <DollarOutlined style={{ marginRight: 4 }} />
                  纯利润（毛利）
                  <Tooltip title="总回笼 - 商品成本">
                    <span style={{ marginLeft: 4, color: '#999', fontSize: 12 }}>?</span>
                  </Tooltip>
                </span>
              }
              value={grossProfit}
              precision={2}
              prefix={grossProfit >= 0 ? '+¥' : '-¥'}
              styles={{ content: { color: grossProfit >= 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold' } }}
            />
            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              扣除商品成本后的利润
            </div>
          </Card>
        </Col>

        {/* 净利润 */}
        <Col span={6}>
          <Card 
            loading={loading} 
            style={{ 
              borderRadius: 8, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              background: netProfit >= 0 ? '#f6ffed' : '#fff2f0'
            }}
          >
            <Statistic
              title={
                <span>
                  {netProfit >= 0 ? <RiseOutlined style={{ marginRight: 4 }} /> : <FallOutlined style={{ marginRight: 4 }} />}
                  净利润
                  <Tooltip title="总回笼 - 商品成本 - 快递成本 - 其他成本">
                    <span style={{ marginLeft: 4, color: '#999', fontSize: 12 }}>?</span>
                  </Tooltip>
                </span>
              }
              value={netProfit}
              precision={2}
              prefix={netProfit >= 0 ? '+¥' : '-¥'}
              styles={{ content: { color: netProfit >= 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold', fontSize: 28 } }}
            />
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#666', fontSize: 12 }}>扣除所有成本后</span>
              <Tag color={netProfit >= 0 ? 'success' : 'error'} style={{ margin: 0 }}>
                净利润率 {netProfitRate.toFixed(1)}%
              </Tag>
            </div>
          </Card>
        </Col>

        {/* 库存资金压力（风控） */}
        <Col span={6}>
          <Card 
            loading={loading} 
            style={{ 
              borderRadius: 8, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              borderLeft: `4px solid ${riskResult.riskColor}`
            }}
          >
            <Statistic
              title={
                <span>
                  <SafetyOutlined style={{ marginRight: 4 }} />
                  库存资金压力
                  <Tooltip title={`风控评估：${riskResult.riskText}（加权风险金额）`}>
                    <span style={{ marginLeft: 4, color: '#999', fontSize: 12 }}>?</span>
                  </Tooltip>
                </span>
              }
              value={riskResult.riskPressure}
              precision={2}
              prefix="¥"
              styles={{ content: { color: riskResult.riskColor, fontWeight: 'bold' } }}
            />
            <div style={{ marginTop: 8 }}>
              <Progress 
                percent={riskResult.riskPercent} 
                size="small" 
                showInfo={false}
                strokeColor={riskResult.riskColor}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ color: '#666', fontSize: 12 }}>风险等级：{riskResult.riskText}</span>
                <Tag color={riskResult.riskLevel === 'safe' ? 'success' : riskResult.riskLevel === 'normal' ? 'blue' : 'error'} style={{ margin: 0 }}>
                  {stockedCount} 件
                </Tag>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 第二行：运营指标 */}
      <Row gutter={16}>
        {/* 预警中心 */}
        <Col span={6}>
          <Card 
            loading={loading} 
            style={{ 
              borderRadius: 8, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              borderLeft: totalWarning > 0 ? '4px solid #ff4d4f' : '4px solid #52c41a'
            }}
          >
            <Statistic
              title={
                <span>
                  <ThunderboltOutlined style={{ marginRight: 4 }} />
                  预警中心
                </span>
              }
              value={totalWarning}
              suffix="件"
              styles={{ content: { color: totalWarning > 0 ? '#cf1322' : '#52c41a', fontWeight: 'bold' } }}
            />
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              {dangerCount > 0 && (
                <Tag color="error" icon={<WarningOutlined />}>
                  紧急 {dangerCount}
                </Tag>
              )}
              {warningCount > 0 && (
                <Tag color="warning" icon={<WarningOutlined />}>
                  预警 {warningCount}
                </Tag>
              )}
              {totalWarning === 0 && (
                <Tag color="success" icon={<CheckCircleOutlined />}>
                  状态良好
                </Tag>
              )}
            </div>
          </Card>
        </Col>

        {/* 快递成本 */}
        <Col span={6}>
          <Card loading={loading} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={
                <span>
                  <CarOutlined style={{ marginRight: 4 }} />
                  快递成本
                  <Tooltip title="已处置订单的总快递费用">
                    <span style={{ marginLeft: 4, color: '#999', fontSize: 12 }}>?</span>
                  </Tooltip>
                </span>
              }
              value={totalShippingCost}
              precision={2}
              prefix="¥"
              styles={{ content: { color: '#fa8c16', fontWeight: 'bold' } }}
            />
            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              占纯利润 {grossProfit > 0 ? (totalShippingCost / grossProfit * 100).toFixed(1) : 0}%
            </div>
          </Card>
        </Col>

        {/* 其他成本 */}
        <Col span={6}>
          <Card loading={loading} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={
                <span>
                  <ToolOutlined style={{ marginRight: 4 }} />
                  其他成本
                  <Tooltip title="维修费、包装费等额外支出">
                    <span style={{ marginLeft: 4, color: '#999', fontSize: 12 }}>?</span>
                  </Tooltip>
                </span>
              }
              value={totalOtherCost}
              precision={2}
              prefix="¥"
              styles={{ content: { color: '#eb2f96', fontWeight: 'bold' } }}
            />
            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              占纯利润 {grossProfit > 0 ? (totalOtherCost / grossProfit * 100).toFixed(1) : 0}%
            </div>
          </Card>
        </Col>

        {/* 失效订单 */}
        <Col span={6}>
          <Card 
            loading={loading} 
            style={{ 
              borderRadius: 8, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              opacity: invalidOrderCount > 0 ? 1 : 0.7
            }}
          >
            <Statistic
              title={
                <span>
                  <ShoppingOutlined style={{ marginRight: 4 }} />
                  失效订单
                  <Tooltip title="原订单已取消/驳回，需要清理">
                    <span style={{ marginLeft: 4, color: '#999', fontSize: 12 }}>?</span>
                  </Tooltip>
                </span>
              }
              value={invalidOrderCount}
              suffix="件"
              styles={{ content: { color: invalidOrderCount > 0 ? '#cf1322' : '#999', fontWeight: 'bold' } }}
            />
            <div style={{ marginTop: 8 }}>
              {invalidOrderCount > 0 ? (
                <Tag color="error">需要清理</Tag>
              ) : (
                <Tag color="default">无失效订单</Tag>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 风控建议 */}
      {suggestions.length > 0 && (
        <Card 
          size="small" 
          style={{ 
            marginTop: 16, 
            borderRadius: 8,
            background: riskResult.riskLevel === 'safe' ? '#f6ffed' : 
                       riskResult.riskLevel === 'normal' ? '#e6f7ff' : 
                       riskResult.riskLevel === 'warning' ? '#fffbe6' : '#fff2f0'
          }}
        >
          <div style={{ marginBottom: 8, fontWeight: 'bold', color: '#666' }}>
            <SafetyOutlined style={{ marginRight: 4 }} />
            风控建议
          </div>
          {suggestions.map((item, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: 4,
              padding: '4px 8px',
              background: 'rgba(255,255,255,0.6)',
              borderRadius: 4
            }}>
              <span style={{ marginRight: 8 }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{item.text}</span>
              <Tag color={
                item.type === 'critical' ? 'purple' :
                item.type === 'danger' ? 'error' :
                item.type === 'warning' ? 'warning' : 'blue'
              }>
                {item.action}
              </Tag>
            </div>
          ))}
        </Card>
      )}

      {/* 快速摘要 */}
      <Card 
        size="small" 
        style={{ 
          marginTop: 16, 
          borderRadius: 8, 
          background: '#fafafa',
          border: '1px dashed #d9d9d9'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>{stockedCount + disposedCount}</div>
            <div style={{ fontSize: 12, color: '#666' }}>总资产数</div>
          </div>
          <VerticalDivider />
          <div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#52c41a' }}>{disposedCount}</div>
            <div style={{ fontSize: 12, color: '#666' }}>已处置</div>
          </div>
          <VerticalDivider />
          <div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>{stockedCount}</div>
            <div style={{ fontSize: 12, color: '#666' }}>压货中</div>
          </div>
          <VerticalDivider />
          <div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: totalWarning > 0 ? '#cf1322' : '#52c41a' }}>
              {totalWarning}
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>待处理预警</div>
          </div>
          <VerticalDivider />
          <div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: grossProfit >= 0 ? '#52c41a' : '#cf1322' }}>
              {grossProfitRate.toFixed(1)}%
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>纯利润率</div>
          </div>
          <VerticalDivider />
          <div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: netProfit >= 0 ? '#52c41a' : '#cf1322' }}>
              {netProfitRate.toFixed(1)}%
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>净利润率</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StatsCards;
