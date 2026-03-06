import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Statistic, Table, Input, Button, Select, Tag, DatePicker, Space, message, Divider
} from 'antd';
import {
  DollarOutlined, TransactionOutlined, RiseOutlined, BarChartOutlined,
  SearchOutlined, ReloadOutlined, DownloadOutlined
} from '@ant-design/icons';
import { request } from '../utils/request';
import dayjs from 'dayjs'; // 需要安装 dayjs: npm install dayjs

// 类型配置
const TYPE_CONFIG = {
  'points_income': { label: '积分获得', color: 'success' },
  'points_expense': { label: '积分消费', color: 'error' },
  'coins_income': { label: '小象币获得', color: 'warning' },
  'coins_expense': { label: '小象币消费', color: 'volcano' },
  'points_exchange': { label: '积分兑换', color: 'purple' },
  'coins_exchange': { label: '小象币兑换', color: 'cyan' },
};

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [feeStats, setFeeStats] = useState({
    today: { totalGames: 0, totalStake: 0, totalFee: 0, averageFee: 0 },
    allTime: { totalGames: 0, totalStake: 0, totalFee: 0 }
  });
  
  // 流水相关
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // 获取手续费统计
  const fetchFeeStats = async () => {
    try {
      const res = await request('/api/gamescaiquan/stats/fee');
      if (res.ok && res.data.success) {
        setFeeStats(res.data.data);
      }
    } catch (e) {
      console.error('获取统计失败', e);
    }
  };

  // 获取流水记录
  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (searchQuery) params.append('search', searchQuery);
      if (selectedType !== 'all') params.append('type', selectedType);
      if (selectedDate) params.append('date', selectedDate);

      const res = await request(`/api/stats/currency/transactions?${params}`);
      if (res.ok && res.data.success) {
        setTransactions(res.data.data.transactions || []);
        // 如果后端返回了 total，可以更新 pagination.total
      }
    } catch (e) {
      message.error('获取流水失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeStats();
    fetchTransactions();
  }, []);

  // 导出功能
  const handleExport = async () => {
    message.info('正在导出...');
    // 这里可以直接用 window.open 触发下载，或者沿用 fetch 逻辑
    const userStr = localStorage.getItem('user');
    if(!userStr) return;
    const token = JSON.parse(userStr).token;
    window.open(`https://xiaoxiang.zeabur.app/api/stats/currency/export?token=${token}`);
  };

  // 表格列定义
  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const config = TYPE_CONFIG[type] || { label: type, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
      width: 120
    },
    {
      title: '用户',
      dataIndex: 'userId',
      key: 'user',
      render: (user) => user?.email || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'desc',
      ellipsis: true,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (val) => <span style={{ fontWeight: 'bold', color: '#333' }}>{val}</span>,
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'time',
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm'),
      width: 160
    },
  ];

  return (
    <div>
      {/* 第一部分：手续费统计卡片 */}
      <Card title={<><DollarOutlined /> 手续费收入概览</>} style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="今日游戏数" value={feeStats.today.totalGames} suffix="局" />
          </Col>
          <Col span={6}>
            <Statistic title="今日总投注" value={feeStats.today.totalStake} suffix="积分" />
          </Col>
          <Col span={6}>
            <Statistic title="今日手续费" value={feeStats.today.totalFee} suffix="积分" valueStyle={{ color: '#3f8600' }} />
          </Col>
          <Col span={6}>
            <Statistic title="历史总手续费" value={feeStats.allTime.totalFee} suffix="积分" valueStyle={{ color: '#cf1322' }} />
          </Col>
        </Row>
      </Card>

      {/* 第二部分：流水明细 */}
      <Card 
        title={<><TransactionOutlined /> 货币流水明细</>}
        extra={
          <Button icon={<DownloadOutlined />} onClick={handleExport}>导出Excel</Button>
        }
      >
        {/* 搜索筛选区 */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <Input.Search
            placeholder="搜索邮箱/描述"
            allowClear
            style={{ width: 240 }}
            onSearch={(value) => { setSearchQuery(value); fetchTransactions(); }}
          />
          <Select 
            value={selectedType} 
            onChange={(val) => setSelectedType(val)} 
            style={{ width: 150 }}
            options={[
              { label: '全部类型', value: 'all' },
              ...Object.keys(TYPE_CONFIG).map(key => ({ label: TYPE_CONFIG[key].label, value: key }))
            ]}
          />
          <DatePicker 
            placeholder="选择日期" 
            onChange={(date, dateString) => setSelectedDate(dateString)} 
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchTransactions()}>
            查询
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            onChange: (page) => {
              setPagination({ ...pagination, current: page });
              fetchTransactions(page);
            }
          }}
        />
      </Card>
    </div>
  );
}
