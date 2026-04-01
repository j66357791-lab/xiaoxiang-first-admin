import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Image, Space, Popconfirm, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { request } from '../utils/request';

export default function Payments() {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);

  // 获取支付方式列表
  const fetchPayments = async () => {
    setLoading(true);
    try {
      // 假设接口，根据实际情况调整
      const res = await request('/api/payments/admin');
      if (res.ok && res.data.success) {
        setPayments(res.data.data || []);
      }
    } catch (e) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // 审核
  const handleAudit = async (id, status) => {
    try {
      const res = await request(`/api/payments/admin/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      
      if (res.ok && res.data.success) {
        message.success('操作成功');
        fetchPayments();
      } else {
        message.error(res.data.message || '操作失败');
      }
    } catch (e) {
      message.error('网络错误');
    }
  };

  // 类型映射
  const TYPE_MAP = {
    'alipay': { label: '支付宝', color: 'blue' },
    'wechat': { label: '微信', color: 'green' },
    'bank': { label: '银行卡', color: 'orange' },
  };

  // 表格列
  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const config = TYPE_MAP[type] || { label: type, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '申请人',
      dataIndex: 'userId',
      key: 'user',
      render: (user) => user?.email || '-',
    },
    {
      title: '账号信息',
      key: 'account',
      render: (_, record) => (
        <div>
          {record.accountNo && <div>账号: {record.accountNo}</div>}
          {record.bankName && <div>银行: {record.bankName}</div>}
        </div>
      ),
    },
    {
      title: '收款码',
      dataIndex: 'qrCode',
      key: 'qrCode',
      render: (qrCode) => 
        qrCode ? (
          <Image
            src={`https://xiaoxiang.zeabur.app${qrCode}`}
            width={80}
            height={80}
            style={{ borderRadius: 8, objectFit: 'cover' }}
          />
        ) : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="确认通过该收款方式？"
            onConfirm={() => handleAudit(record.id, 'Approved')}
            okText="确定"
            cancelText="取消"
          >
            <Button type="primary" size="small" icon={<CheckCircleOutlined />}>
              通过
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确认拒绝该收款方式？"
            onConfirm={() => handleAudit(record.id, 'Rejected')}
            okText="确定"
            cancelText="取消"
          >
            <Button danger size="small" icon={<CloseCircleOutlined />}>
              拒绝
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="收款方式审核">
      <Table
        dataSource={payments}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
}
