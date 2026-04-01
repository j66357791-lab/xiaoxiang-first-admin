import React, { useState, useEffect } from 'react';
import { Row, Col, Progress, List, Avatar, Tag, Spin, DatePicker, Button, Tabs, Empty } from 'antd';
import {
  RiseOutlined, FallOutlined, UserOutlined, DollarOutlined, ClockCircleOutlined,
  TrophyOutlined, FireOutlined, ThunderboltOutlined, SyncOutlined, WarningOutlined,
  ShoppingCartOutlined, TeamOutlined, CheckCircleOutlined, CloseCircleOutlined,
  CalendarOutlined, LineChartOutlined,
} from '@ant-design/icons';
import { request } from '../utils/request';
import './Overview.css';

const { RangePicker } = DatePicker;

export default function Overview() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today'); // today | week | month | year
  const [dashboardData, setDashboardData] = useState({
    // 核心指标
    orders: { count: 0, amount: 0, growth: 0 },
    users: { total: 0, new: 0, growth: 0 },
    tasks: { active: 0, completed: 0 },
    
    // 待处理
    pending: {
      withdrawals: 0,
      kyc: 0,
      orders: 0,
      payments: 0,
    },
    
    // 财务
    finance: {
      platformBalance: 0,
      totalRevenue: 0,
      pendingPayment: 0,
      todayIncome: 0,
    },
    
    // 列表数据
    recentOrders: [],
    hotTasks: [],
    topUsers: [],
    
    // 趋势数据
    trendData: [],
  });

  useEffect(() => {
    fetchDashboardData();
    // 每60秒刷新一次
    const timer = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(timer);
  }, [timeRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 并行请求所有数据
      const [
        ordersRes, 
        usersRes, 
        withdrawalsRes, 
        tasksRes, 
        paymentsRes,
        kycRes
      ] = await Promise.all([
        request('/api/jobs').catch(() => null),
        request('/api/users/list?limit=1000').catch(() => null),
        request('/api/withdrawals/admin').catch(() => null),
        request('/api/jobs?limit=100').catch(() => null),
        request('/api/payments/admin').catch(() => null),
        request('/api/users/list?kycStatus=Pending').catch(() => null),
      ]);

      // 解析数据
      const orders = ordersRes?.data?.data?.jobs || ordersRes?.data?.data || [];
      const users = usersRes?.data?.data?.users || usersRes?.data?.data || [];
      const withdrawals = withdrawalsRes?.data?.data || [];
      const tasks = tasksRes?.data?.data?.jobs || tasksRes?.data?.data || [];
      const payments = paymentsRes?.data?.data || [];

      // 时间筛选
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

      let startDate;
      switch (timeRange) {
        case 'today': startDate = today; break;
        case 'week': startDate = weekAgo; break;
        case 'month': startDate = monthAgo; break;
        case 'year': startDate = yearAgo; break;
        default: startDate = today;
      }

      // 筛选时间范围内的数据
      const filteredOrders = orders.filter(o => new Date(o.createdAt) >= startDate);
      const filteredUsers = users.filter(u => new Date(u.createdAt) >= startDate);

      // 计算核心指标
      const ordersAmount = filteredOrders.reduce((sum, o) => {
        const amount = o.jobSnapshot?.amount || o.amount || o.settleAmount || 0;
        return sum + amount;
      }, 0);

      const totalRevenue = orders.reduce((sum, o) => {
        const amount = o.jobSnapshot?.amount || o.amount || o.settleAmount || 0;
        return sum + amount;
      }, 0);

      // 待处理事项
      const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;
      const pendingKyc = users.filter(u => u.kycStatus === 'Pending').length;
      const pendingOrders = orders.filter(o => 
        o.status === 'Applied' || o.status === 'Submitted' || o.status === 'Reviewing'
      ).length;
      const pendingPayments = payments.filter(p => p.status === 'Pending').length;

      // 待打款金额
      const pendingPaymentAmount = orders
        .filter(o => o.status === 'PendingPayment')
        .reduce((sum, o) => sum + (o.settleAmount || o.jobSnapshot?.amount || 0), 0);

      // 平台余额（从用户余额汇总）
      const platformBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);

      // 今日收入
      const todayOrders = orders.filter(o => new Date(o.createdAt) >= today);
      const todayIncome = todayOrders.reduce((sum, o) => {
        const amount = o.jobSnapshot?.amount || o.amount || 0;
        return sum + amount;
      }, 0);

      // 活跃任务
      const activeTasks = tasks.filter(t => 
        !t.isFrozen && 
        t.status !== 'completed' && 
        (!t.deadline || new Date(t.deadline) > now)
      ).length;

      const completedTasks = orders.filter(o => o.status === 'Completed').length;

      // 近期订单（带完整信息）
      const recentOrders = filteredOrders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
        .map(order => ({
          ...order,
          title: order.jobSnapshot?.title || order.job?.title || '未知任务',
          amount: order.jobSnapshot?.amount || order.amount || order.settleAmount || 0,
          orderNumber: order.orderNumber || order.id,
          user: order.userId?.name || order.userId?.email || '未知用户',
        }));

      // 热门任务
      const hotTasks = [...tasks]
        .sort((a, b) => (b.appliedCount || 0) - (a.appliedCount || 0))
        .slice(0, 5);

      // 活跃用户
      const topUsers = [...users]
        .sort((a, b) => (b.balance || 0) - (a.balance || 0))
        .slice(0, 5);

      setDashboardData({
        orders: {
          count: filteredOrders.length,
          amount: ordersAmount,
          growth: 12.5,
        },
        users: {
          total: users.length,
          new: filteredUsers.length,
          growth: 8.3,
        },
        tasks: {
          active: activeTasks,
          completed: completedTasks,
        },
        pending: {
          withdrawals: pendingWithdrawals,
          kyc: pendingKyc,
          orders: pendingOrders,
          payments: pendingPayments,
        },
        finance: {
          platformBalance,
          totalRevenue,
          pendingPayment: pendingPaymentAmount,
          todayIncome,
        },
        recentOrders,
        hotTasks,
        topUsers,
      });
    } catch (e) {
      console.error('获取看板数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) => {
    if (amount >= 10000) {
      return `¥${(amount / 10000).toFixed(2)}万`;
    }
    return `¥${amount.toLocaleString()}`;
  };

  const getStatusConfig = (status) => {
    const configs = {
      'Applied': { text: '已接单', color: 'processing' },
      'Submitted': { text: '已提交', color: 'cyan' },
      'Reviewing': { text: '审核中', color: 'orange' },
      'PendingPayment': { text: '待打款', color: 'magenta' },
      'Completed': { text: '已完成', color: 'success' },
      'Cancelled': { text: '已取消', color: 'default' },
      'Rejected': { text: '已驳回', color: 'error' },
    };
    return configs[status] || { text: status, color: 'default' };
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Spin size="large" />
        <p>数据加载中...</p>
      </div>
    );
  }

  return (
    <div className="tech-dashboard">
      {/* 头部 */}
      <div className="dashboard-header">
        <div className="header-title">
          <ThunderboltOutlined className="title-icon" />
          <span>小象平台数据总览</span>
        </div>
        <div className="header-right">
          <div className="time-filter">
            {[
              { key: 'today', label: '今日' },
              { key: 'week', label: '本周' },
              { key: 'month', label: '本月' },
              { key: 'year', label: '本年' },
            ].map(item => (
              <Button
                key={item.key}
                type={timeRange === item.key ? 'primary' : 'default'}
                size="small"
                onClick={() => setTimeRange(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="header-time">
            <ClockCircleOutlined />
            <span>{new Date().toLocaleString('zh-CN')}</span>
          </div>
        </div>
      </div>

      {/* 第一行：核心指标 */}
      <Row gutter={[16, 16]} className="stat-row">
        <Col xs={24} sm={12} lg={6}>
          <div className="tech-card card-blue">
            <div className="card-icon"><ShoppingCartOutlined /></div>
            <div className="card-content">
              <div className="card-value">{dashboardData.orders.count}</div>
              <div className="card-label">订单总数</div>
            </div>
            <div className="card-trend up">
              <RiseOutlined /> {dashboardData.orders.growth}%
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="tech-card card-green">
            <div className="card-icon"><DollarOutlined /></div>
            <div className="card-content">
              <div className="card-value">{formatMoney(dashboardData.orders.amount)}</div>
              <div className="card-label">订单金额</div>
            </div>
            <div className="card-trend up">
              <RiseOutlined /> {dashboardData.orders.growth}%
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="tech-card card-purple">
            <div className="card-icon"><TeamOutlined /></div>
            <div className="card-content">
              <div className="card-value">{dashboardData.users.total.toLocaleString()}</div>
              <div className="card-label">平台用户</div>
            </div>
            <div className="card-extra">
              新增 <span className="highlight">+{dashboardData.users.new}</span>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="tech-card card-orange">
            <div className="card-icon"><TrophyOutlined /></div>
            <div className="card-content">
              <div className="card-value">{dashboardData.tasks.active}</div>
              <div className="card-label">进行中任务</div>
            </div>
            <div className="card-extra">
              已完成 <span className="highlight">{dashboardData.tasks.completed}</span>
            </div>
          </div>
        </Col>
      </Row>

      {/* 第二行：待处理 + 财务概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={10}>
          <div className="tech-panel">
            <div className="panel-header">
              <span className="panel-title">
                <WarningOutlined /> 待处理事项
              </span>
            </div>
            <div className="panel-body">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div className="pending-card">
                    <div className="pending-icon" style={{ background: 'rgba(255,77,79,0.1)', color: '#ff4d4f' }}>
                      <DollarOutlined />
                    </div>
                    <div className="pending-info">
                      <div className="pending-label">待审核提现</div>
                      <div className="pending-value">{dashboardData.pending.withdrawals}</div>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="pending-card">
                    <div className="pending-icon" style={{ background: 'rgba(250,173,20,0.1)', color: '#faad14' }}>
                      <UserOutlined />
                    </div>
                    <div className="pending-info">
                      <div className="pending-label">待审核实名</div>
                      <div className="pending-value">{dashboardData.pending.kyc}</div>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="pending-card">
                    <div className="pending-icon" style={{ background: 'rgba(24,144,255,0.1)', color: '#1890ff' }}>
                      <ShoppingCartOutlined />
                    </div>
                    <div className="pending-info">
                      <div className="pending-label">待处理订单</div>
                      <div className="pending-value">{dashboardData.pending.orders}</div>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="pending-card">
                    <div className="pending-icon" style={{ background: 'rgba(114,46,209,0.1)', color: '#722ed1' }}>
                      <CheckCircleOutlined />
                    </div>
                    <div className="pending-info">
                      <div className="pending-label">待审核支付</div>
                      <div className="pending-value">{dashboardData.pending.payments}</div>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        </Col>

        <Col xs={24} lg={14}>
          <div className="tech-panel">
            <div className="panel-header">
              <span className="panel-title">
                <LineChartOutlined /> 财务概览
              </span>
            </div>
            <div className="panel-body">
              <Row gutter={16}>
                <Col span={6}>
                  <div className="finance-item-small">
                    <div className="finance-label">平台余额</div>
                    <div className="finance-value">{formatMoney(dashboardData.finance.platformBalance)}</div>
                    <div className="finance-desc">用户余额汇总</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div className="finance-item-small">
                    <div className="finance-label">累计营收</div>
                    <div className="finance-value" style={{ color: '#3fb950' }}>
                      {formatMoney(dashboardData.finance.totalRevenue)}
                    </div>
                    <div className="finance-desc">历史总订单金额</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div className="finance-item-small">
                    <div className="finance-label">今日收入</div>
                    <div className="finance-value" style={{ color: '#58a6ff' }}>
                      {formatMoney(dashboardData.finance.todayIncome)}
                    </div>
                    <div className="finance-desc">今日订单金额</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div className="finance-item-small">
                    <div className="finance-label">待打款</div>
                    <div className="finance-value" style={{ color: '#f0883e' }}>
                      {formatMoney(dashboardData.finance.pendingPayment)}
                    </div>
                    <div className="finance-desc">需支付给用户</div>
                  </div>
                </Col>
              </Row>

              {/* 趋势图 */}
              <div className="chart-placeholder">
                <div className="chart-title">近7日订单趋势</div>
                <div className="mock-chart">
                  {[65, 80, 45, 90, 70, 85, 95].map((h, i) => (
                    <div key={i} className="chart-bar" style={{ height: `${h}%` }}>
                      <span className="bar-value">{Math.floor(h * 10)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* 第三行：近期订单 + 热门任务 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <div className="tech-panel">
            <div className="panel-header">
              <span className="panel-title">
                <SyncOutlined spin /> 近期订单
              </span>
              <span className="panel-badge">{dashboardData.recentOrders.length}</span>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              {dashboardData.recentOrders.length > 0 ? (
                <List
                  dataSource={dashboardData.recentOrders}
                  renderItem={item => {
                    const statusConfig = getStatusConfig(item.status);
                    return (
                      <List.Item className="order-list-item">
                        <List.Item.Meta
                          avatar={
                            <Avatar 
                              style={{ 
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                fontSize: 14,
                              }}
                            >
                              {item.title?.charAt(0) || '订'}
                            </Avatar>
                          }
                          title={
                            <div className="order-title-row">
                              <span className="order-title">{item.title}</span>
                              <span className="order-no">#{item.orderNumber?.slice(-8)}</span>
                            </div>
                          }
                          description={
                            <div className="order-desc">
                              <span className="order-user">
                                <UserOutlined style={{ marginRight: 4 }} />
                                {item.user}
                              </span>
                              <span className="order-time">
                                {new Date(item.createdAt).toLocaleString('zh-CN', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          }
                        />
                        <div className="order-right">
                          <div className="order-amount">+¥{item.amount}</div>
                          <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <Empty description="暂无订单" style={{ padding: 40 }} />
              )}
            </div>
          </div>
        </Col>

        <Col xs={24} lg={12}>
          <div className="tech-panel">
            <div className="panel-header">
              <span className="panel-title">
                <FireOutlined /> 热门任务 TOP5
              </span>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              {dashboardData.hotTasks.length > 0 ? (
                <List
                  dataSource={dashboardData.hotTasks}
                  renderItem={(item, index) => (
                    <List.Item className="task-list-item">
                      <div className="task-rank">
                        <span className={`rank-num rank-${index + 1}`}>{index + 1}</span>
                      </div>
                      <List.Item.Meta
                        title={<span className="task-title">{item.title}</span>}
                        description={
                          <div className="task-stats">
                            <span>佣金 ¥{item.amount}</span>
                            <span>接单 {item.appliedCount || 0}</span>
                            <span>剩余 {item.remainingSlots || item.totalSlots}</span>
                          </div>
                        }
                      />
                      <Progress
                        type="circle"
                        percent={Math.min(100, ((item.appliedCount || 0) / (item.totalSlots || 1)) * 100)}
                        width={50}
                        strokeColor={{
                          '0%': '#108ee9',
                          '100%': '#87d068',
                        }}
                        trailColor="rgba(255,255,255,0.1)"
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="暂无任务" style={{ padding: 40 }} />
              )}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
