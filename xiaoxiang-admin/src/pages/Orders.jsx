import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Input, Tabs, Badge, Tooltip, message, Popconfirm } from 'antd';
import { SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, PlayCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { request } from '../utils/request';
import dayjs from 'dayjs';

const STATUS_CONFIG = {
  Applied: { label: '已接单', color: 'blue' },
  Submitted: { label: '已提交', color: 'purple' },
  Reviewing: { label: '审核中', color: 'orange' },
  PendingPayment: { label: '待打款', color: 'red' },
  Completed: { label: '已完成', color: 'green' },
  Cancelled: { label: '已取消', color: 'default' },
  Rejected: { label: '已驳回', color: 'volcano' },
};

export default function Orders() {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [searchText, setSearchText] = useState('');
  
  // 批量选择
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await request('/api/orders/admin');
      if (res.ok && res.data.success) {
        setOrders(res.data.data || []);
      }
    } catch (e) {
      message.error('获取订单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAction = async (orderId, action) => {
    const actionMap = {
      startReview: 'Reviewing',
      approve: 'PendingPayment',
      reject: 'Rejected',
      pay: 'Completed'
    };
    
    const newStatus = actionMap[action];
    
    try {
      const res = await request(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (res.ok && res.data.success) {
        message.success('操作成功');
        fetchOrders();
      } else {
        message.error(res.data.message || '操作失败');
      }
    } catch (e) {
      message.error('网络错误');
    }
  };

  // 🔥 单个录入
  const handleAddToAsset = async (orderId) => {
    try {
      const res = await request('/api/assets/from-order', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      });

      const data = res.data || res;

      if (data.success) {
        message.success(data.message || '已录入资产中心');
      } else {
        message.error(data.message || '录入失败');
      }
    } catch (e) {
      message.error('网络错误，录入失败');
    }
  };

  // 🔥 批量录入
  const handleBatchAddToAsset = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先勾选需要录入的订单');
      return;
    }

    try {
      message.loading({ content: `正在录入 ${selectedRowKeys.length} 个订单...`, key: 'batch' });
      
      // 这里后端需要支持批量接口，或者前端循环调用单个接口
      // 建议后端提供一个 /api/assets/batch-from-orders 接口
      const res = await request('/api/assets/batch-from-orders', {
        method: 'POST',
        body: JSON.stringify({ orderIds: selectedRowKeys }),
      });

      const data = res.data || res;

      if (data.success) {
        message.success({ content: data.message || `成功录入 ${data.count || selectedRowKeys.length} 条`, key: 'batch' });
        setSelectedRowKeys([]); // 清空选择
        fetchOrders();
      } else {
        message.error({ content: data.message || '批量录入失败', key: 'batch' });
      }
    } catch (e) {
      message.error({ content: '网络错误', key: 'batch' });
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchTab = activeTab === 'All' || o.status === activeTab;
    const matchSearch = !searchText || 
      o.orderNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
      o.userId?.email?.toLowerCase().includes(searchText.toLowerCase());
    return matchTab && matchSearch;
  });

  const getTabBadge = (key) => {
    const count = key === 'All' ? orders.length : orders.filter(o => o.status === key).length;
    return count > 0 ? <Badge count={count} style={{ marginLeft: 8 }} /> : null;
  };

  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 180,
      render: (text) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</span>,
    },
    {
      title: '用户/任务',
      key: 'info',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.jobSnapshot?.title || '任务已删除'}</div>
          <div style={{ fontSize: 12, color: '#999' }}>用户: {record.userId?.email || '未知'}</div>
        </div>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (_, record) => `¥${record.jobSnapshot?.amount || 0}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = STATUS_CONFIG[status] || { label: status, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'time',
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, record) => {
        const status = record.status;
        
        if (status === 'Submitted') {
          return (
            <Space>
              <Button type="link" onClick={() => handleAction(record._id, 'startReview')}>开始审核</Button>
              <Button type="link" onClick={() => handleAddToAsset(record._id)}>录入资产</Button>
            </Space>
          );
        }
        
        if (status === 'Reviewing') {
          return (
            <Space>
              <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleAction(record._id, 'approve')}>通过</Button>
              <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => handleAction(record._id, 'reject')}>驳回</Button>
            </Space>
          );
        }
        
        if (status === 'PendingPayment') {
          return (
            <Space>
              <Button type="primary" ghost size="small" onClick={() => handleAction(record._id, 'pay')}>确认打款</Button>
              <Button type="link" size="small" onClick={() => handleAddToAsset(record._id)}>录入资产</Button>
            </Space>
          );
        }

        if (status === 'Completed') {
          return (
            <Button 
              type="link" 
              icon={<PlusCircleOutlined />} 
              onClick={() => handleAddToAsset(record._id)}
            >
              录入资产
            </Button>
          );
        }
        
        return <span style={{ color: '#999' }}>无操作</span>;
      },
    },
  ];

  return (
    <div>
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        tabBarExtraContent={
          <Space>
             <Button 
                type="primary" 
                onClick={handleBatchAddToAsset} 
                disabled={selectedRowKeys.length === 0}
              >
                批量录入资产 ({selectedRowKeys.length})
              </Button>
              <Input.Search
                placeholder="搜订单号/用户邮箱"
                style={{ width: 250 }}
                onSearch={setSearchText}
                allowClear
              />
          </Space>
        }
      >
        <Tabs.TabPane tab={<span>全部订单 {getTabBadge('All')}</span>} key="All" />
        {Object.keys(STATUS_CONFIG).map(key => (
          <Tabs.TabPane 
            tab={<span>{STATUS_CONFIG[key].label} {getTabBadge(key)}</span>} 
            key={key} 
          />
        ))}
      </Tabs>

      <Card>
        <Table
          dataSource={filteredOrders}
          columns={columns}
          rowKey="_id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
