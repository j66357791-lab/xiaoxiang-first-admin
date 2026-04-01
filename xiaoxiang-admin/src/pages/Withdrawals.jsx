import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Image, Space, Popconfirm, message, Badge } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, DollarOutlined } from '@ant-design/icons';
import { request } from '../utils/request';

// 状态配置
const STATUS_MAP = {
  'Pending': { text: '待审核', status: 'warning' },
  'Approved': { text: '已通过', status: 'processing' },
  'Rejected': { text: '已拒绝', status: 'error' },
  'Completed': { text: '已打款', status: 'success' },
};

export default function Withdrawals() {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);

  // 获取提现列表
  const fetchData = async () => {
    setLoading(true);
    try {
      // 假设接口地址，如果原接口是嵌在 Context 里的，这里可能需要你确认实际接口路径
      // 通常管理员获取列表的接口是 /api/withdrawals/admin
      const res = await request('/api/withdrawals/admin');
      if (res.ok && res.data.success) {
        setDataSource(res.data.data || []);
      }
    } catch (e) {
      message.error('获取提现列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 处理审核/打款
  const handleStatusChange = async (id, status) => {
    try {
      const res = await request(`/api/withdrawals/admin/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      
      if (res.ok && res.data.success) {
        message.success('操作成功');
        fetchData(); // 刷新列表
      } else {
        message.error(res.data.message || '操作失败');
      }
    } catch (e) {
      message.error('网络错误');
    }
  };

  // 定义表格列
  const columns = [
    {
      title: '申请人',
      dataIndex: 'userId',
      key: 'user',
      render: (user) => user?.email || '-',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (val) => <span style={{ color: '#f50', fontWeight: 'bold' }}>¥{val}</span>,
    },
    {
      title: '提现方式',
      dataIndex: 'paymentMethodId',
      key: 'method',
      render: (method) => {
        const typeName = method?.type === 'alipay' ? '支付宝' : 
                         method?.type === 'wechat' ? '微信' : '银行卡';
        return typeName;
      },
    },
    {
      title: '收款账号',
      dataIndex: 'paymentMethodId',
      key: 'account',
      render: (method) => (
        <div>
          {method?.accountNo && <div style={{ fontFamily: 'monospace' }}>{method.accountNo}</div>}
          {method?.qrCode && (
            <Image 
              src={`https://xiaoxiang.zeabur.app${method.qrCode}`} 
              width={40} 
              height={40} 
              style={{ borderRadius: 4 }} 
            />
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = STATUS_MAP[status] || { text: status, status: 'default' };
        return <Badge status={config.status} text={config.text} />;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        // 不同状态展示不同按钮
        if (record.status === 'Pending') {
          return (
            <Space>
              <Popconfirm
                title="确定通过审核吗？"
                onConfirm={() => handleStatusChange(record.id, 'Approved')}
                okText="确定"
                cancelText="取消"
              >
                <Button type="primary" size="small" icon={<CheckCircleOutlined />}>通过</Button>
              </Popconfirm>
              <Popconfirm
                title="确定拒绝申请吗？余额将退回"
                onConfirm={() => handleStatusChange(record.id, 'Rejected')}
                okText="确定"
                cancelText="取消"
              >
                <Button danger size="small" icon={<CloseCircleOutlined />}>拒绝</Button>
              </Popconfirm>
            </Space>
          );
        }
        
        if (record.status === 'Approved') {
          return (
            <Popconfirm
              title="确认已向用户打款吗？"
              onConfirm={() => handleStatusChange(record.id, 'Completed')}
              okText="确定"
              cancelText="取消"
            >
              <Button type="primary" ghost size="small" icon={<DollarOutlined />}>确认打款</Button>
            </Popconfirm>
          );
        }
        
        return <span style={{ color: '#999' }}>无需操作</span>;
      },
    },
  ];

  return (
    <Card title="提现申请管理">
      <Table
        dataSource={dataSource}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
}
