//	操作日志中心，记录所有操作历史

import React, { useState, useEffect } from 'react';
import { Table, Card, DatePicker, Input, Space, Tag, Select, Spin, message } from 'antd';
import { SearchOutlined, ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { request } from '../../../utils/request';

const { RangePicker } = DatePicker;
const { Option } = Select;

const LogCenter = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  // 从后端获取日志
  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pagination.pageSize.toString()
      });
      
      if (actionFilter && actionFilter !== 'all') {
        params.append('action', actionFilter);
      }
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }
      if (searchText) {
        params.append('keyword', searchText);
      }

      const res = await request(`/api/logs?${params.toString()}`);
      
      if (res.success) {
        setLogs(res.data || []);
        setPagination(prev => ({
          ...prev,
          current: page,
          total: res.pagination?.total || 0
        }));
      } else {
        message.error('获取日志失败');
      }
    } catch (error) {
      console.error('[LogCenter] 获取日志失败:', error);
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter]); // 筛选条件变化时重新加载

  // 日期范围变化
  const handleDateChange = (dates) => {
    setDateRange(dates);
  };

  // 搜索
  const handleSearch = (value) => {
    setSearchText(value);
  };

  // 执行搜索
  const executeSearch = () => {
    fetchLogs(1);
  };

  // 分页变化
  const handleTableChange = (newPagination) => {
    fetchLogs(newPagination.current);
  };

  // 操作类型颜色映射
  const getActionColor = (action) => {
    const colorMap = {
      '回退订单': 'error',
      '删除资产': 'error',
      '处置订单': 'success',
      '更新状态': 'processing',
      '同步数据': 'cyan',
      '搁置': 'orange',
      '取消搁置': 'green',
      '批量录入': 'purple',
      '编辑资产': 'blue'
    };
    return colorMap[action] || 'default';
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'time',
      width: 180,
      render: (text) => (
        <span style={{ color: '#666' }}>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          {text}
        </span>
      )
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      width: 150,
      render: (text) => <span style={{ color: '#1890ff' }}>{text}</span>
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      width: 120,
      render: (text) => <Tag color={getActionColor(text)}>{text}</Tag>
    },
    {
      title: '关联订单',
      dataIndex: 'orderId',
      width: 180,
      render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>
    },
    {
      title: '详情',
      dataIndex: 'details',
      render: (text) => <span style={{ color: '#888' }}>{text || '-'}</span>
    }
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle" wrap>
          <Select 
            value={actionFilter} 
            onChange={setActionFilter} 
            style={{ width: 150 }}
          >
            <Option value="all">全部操作</Option>
            <Option value="处置订单">处置订单</Option>
            <Option value="更新状态">更新状态</Option>
            <Option value="回退订单">回退订单</Option>
            <Option value="搁置">搁置</Option>
            <Option value="取消搁置">取消搁置</Option>
            <Option value="删除资产">删除资产</Option>
            <Option value="同步数据">同步数据</Option>
            <Option value="批量录入">批量录入</Option>
          </Select>
          
          <RangePicker 
            value={dateRange}
            onChange={handleDateChange}
            placeholder={['开始日期', '结束日期']}
          />
          
          <Input.Search
            placeholder="搜索订单号/操作人/详情"
            style={{ width: 250 }}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            onSearch={executeSearch}
            allowClear
            enterButton={<SearchOutlined />}
          />
          
          <Spin spinning={loading}>
            <a onClick={() => fetchLogs(pagination.current)}>
              <ReloadOutlined /> 刷新
            </a>
          </Spin>
        </Space>
      </Card>

      <Table 
        dataSource={logs}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`
        }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default LogCenter;
