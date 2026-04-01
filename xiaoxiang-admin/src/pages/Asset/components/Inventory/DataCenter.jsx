// src/pages/Asset/components/Inventory/DataCenter.jsx
/**
 * 数据中心 - 风险监测功能
 */
import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, Progress, Tag, Table, Empty } from 'antd';
import {
  DashboardOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import {
  RISK_LEVEL,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
} from '../../constants/inventoryConstants';

import { calculateBindOrderRiskStats, calculateRiskLevel } from '../../utils/inventoryUtils';

const DataCenter = ({ bindOrders }) => {
  // 计算统计数据
  const stats = useMemo(() => {
    return calculateBindOrderRiskStats(bindOrders || []);
  }, [bindOrders]);

  // 风险分布数据
  const riskDistribution = useMemo(() => {
    const total = stats.lowRisk + stats.mediumRisk + stats.highRisk;
    if (total === 0) return { low: 0, medium: 0, high: 0 };
    return {
      low: Math.round((stats.lowRisk / total) * 100),
      medium: Math.round((stats.mediumRisk / total) * 100),
      high: Math.round((stats.highRisk / total) * 100),
    };
  }, [stats]);

  // 高风险订单列表
  const highRiskOrders = useMemo(() => {
    return (bindOrders || []).filter(order => {
      const risk = calculateRiskLevel(order.listedAt, order.soldAt);
      return risk === RISK_LEVEL.HIGH;
    });
  }, [bindOrders]);

  // 平台销售排行
  const platformRanking = useMemo(() => {
    const result = [];
    Object.entries(stats.platformStats).forEach(([platform, count]) => {
      result.push({
        platform,
        count,
        percent: stats.sold > 0 ? Math.round((count / stats.sold) * 100) : 0,
      });
    });
    return result.sort((a, b) => b.count - a.count);
  }, [stats]);

  // 高风险订单表格列
  const highRiskColumns = [
    {
      title: '订单号',
      dataIndex: 'orderNumber',
      width: 140,
    },
    {
      title: '商品名称',
      dataIndex: 'productName',
      width: 180,
      ellipsis: true,
    },
    {
      title: '上架时间',
      dataIndex: 'listedAt',
      width: 140,
      render: (text) => text ? dayjs(text).format('MM-DD HH:mm') : '-',
    },
    {
      title: '已上架天数',
      key: 'days',
      width: 100,
      render: (_, record) => {
        if (!record.listedAt) return '-';
        const days = Math.floor((dayjs() - dayjs(record.listedAt)) / (1000 * 60 * 60 * 24));
        return <Tag color="error">{days} 天</Tag>;
      },
    },
    {
      title: '售卖平台',
      dataIndex: 'salePlatform',
      width: 100,
      render: (platform) => platform || '-',
    },
  ];

  if (!bindOrders || bindOrders.length === 0) {
    return (
      <Card>
        <Empty description="暂无绑定订单数据" />
      </Card>
    );
  }

  return (
    <div>
      {/* 概览统计 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <Statistic 
              title="绑定订单总数" 
              value={stats.total} 
              prefix={<DashboardOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic 
              title="已售出" 
              value={stats.sold} 
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic 
              title="待售卖" 
              value={stats.unsold} 
              prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic 
              title="平均售出天数" 
              value={stats.avgDaysToSell} 
              suffix="天"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic 
              title="售出率" 
              value={stats.total > 0 ? Math.round((stats.sold / stats.total) * 100) : 0}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic 
              title="高风险订单" 
              value={stats.highRisk} 
              prefix={<WarningOutlined style={{ color: '#cf1322' }} />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* 风险分布 */}
        <Col span={8}>
          <Card title="风险分布" style={{ height: 300 }}>
            <div style={{ padding: '20px 0' }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span><Tag color="success">低风险</Tag></span>
                  <span>{stats.lowRisk} 单 ({riskDistribution.low}%)</span>
                </div>
                <Progress percent={riskDistribution.low} strokeColor="#52c41a" showInfo={false} />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span><Tag color="warning">中风险</Tag></span>
                  <span>{stats.mediumRisk} 单 ({riskDistribution.medium}%)</span>
                </div>
                <Progress percent={riskDistribution.medium} strokeColor="#faad14" showInfo={false} />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span><Tag color="error">高风险</Tag></span>
                  <span>{stats.highRisk} 单 ({riskDistribution.high}%)</span>
                </div>
                <Progress percent={riskDistribution.high} strokeColor="#cf1322" showInfo={false} />
              </div>
            </div>
          </Card>
        </Col>

        {/* 平台销售排行 */}
        <Col span={8}>
          <Card title="平台销售排行" style={{ height: 300 }}>
            {platformRanking.length === 0 ? (
              <Empty description="暂无数据" />
            ) : (
              <div style={{ padding: '10px 0' }}>
                {platformRanking.map((item, index) => (
                  <div 
                    key={item.platform}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '8px 0',
                      borderBottom: index < platformRanking.length - 1 ? '1px solid #f0f0f0' : 'none'
                    }}
                  >
                    <span style={{ width: 30, fontWeight: 'bold', color: index === 0 ? '#faad14' : '#666' }}>
                      {index + 1}
                    </span>
                    <Tag color="blue" icon={<ShopOutlined />} style={{ marginRight: 8 }}>
                      {item.platform}
                    </Tag>
                    <span style={{ flex: 1 }}>{item.count} 单</span>
                    <span style={{ color: '#999' }}>{item.percent}%</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* 风险提示 */}
        <Col span={8}>
          <Card 
            title={
              <span>
                <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                风险提示
              </span>
            } 
            style={{ height: 300 }}
          >
            <div style={{ padding: '10px 0' }}>
              {stats.highRisk > 0 && (
                <div style={{ marginBottom: 16, padding: 12, background: '#fff2f0', borderRadius: 4 }}>
                  <div style={{ fontWeight: 500, color: '#cf1322', marginBottom: 4 }}>
                    ⚠️ 高风险预警
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    有 {stats.highRisk} 个订单上架超过14天未售出，建议降价或更换平台
                  </div>
                </div>
              )}
              
              {stats.mediumRisk > 0 && (
                <div style={{ marginBottom: 16, padding: 12, background: '#fffbe6', borderRadius: 4 }}>
                  <div style={{ fontWeight: 500, color: '#d48806', marginBottom: 4 }}>
                    ⚡ 中风险提醒
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    有 {stats.mediumRisk} 个订单上架7-14天，需关注
                  </div>
                </div>
              )}
              
              {stats.avgDaysToSell > 7 && (
                <div style={{ padding: 12, background: '#e6f7ff', borderRadius: 4 }}>
                  <div style={{ fontWeight: 500, color: '#1890ff', marginBottom: 4 }}>
                    📊 数据分析
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    平均售出周期 {stats.avgDaysToSell} 天，建议优化定价策略
                  </div>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 高风险订单列表 */}
      {highRiskOrders.length > 0 && (
        <Card 
          title={
            <span>
              <WarningOutlined style={{ color: '#cf1322', marginRight: 8 }} />
              高风险订单列表
            </span>
          }
          style={{ marginTop: 16 }}
        >
          <Table
            dataSource={highRiskOrders}
            columns={highRiskColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}
    </div>
  );
};

export default DataCenter;
