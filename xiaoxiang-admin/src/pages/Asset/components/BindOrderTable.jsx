// src/pages/Asset/components/Inventory/BindOrderTable.jsx
/**
 * 绑定订单表格组件
 */
import React from 'react';
import { Table, Tag, Tooltip, Empty } from 'antd';
import {
  LinkOutlined,
  ShopOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const BindOrderTable = ({ bindOrders, loading }) => {
  // 判断订单状态
  const getOrderStatus = (record) => {
    if (record.disposeAction === '确定完结') {
      return { text: '已完结', color: 'success', icon: <CheckCircleOutlined /> };
    }
    if (record.disposeAction === '确定结算') {
      return { text: '结算中', color: 'processing', icon: <ClockCircleOutlined /> };
    }
    if (record.disposeAction === '确定售卖') {
      return { text: '售卖中', color: 'warning', icon: <ShopOutlined /> };
    }
    return { text: '未知', color: 'default', icon: null };
  };

  // 判断是否为冻结状态（未完结）
  const isFrozen = (record) => {
    return record.disposeAction !== '确定完结';
  };

  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNumber',
      width: 180,
      render: (text) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</span>
      ),
    },
    {
      title: '商品名称',
      dataIndex: 'productName',
      width: 200,
      render: (text) => text || '-',
    },
    {
      title: '绑定SKU',
      key: 'sku',
      width: 180,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            <LinkOutlined style={{ marginRight: 4, color: '#52c41a' }} />
            {record.relatedSkuName || '-'}
          </div>
          {record.relatedSkuSpec && (
            <div style={{ fontSize: 12, color: '#999' }}>{record.relatedSkuSpec}</div>
          )}
        </div>
      ),
    },
    {
      title: '绑定数量',
      dataIndex: 'relatedQuantity',
      width: 80,
      align: 'center',
      render: (val) => (
        <Tag color={val > 1 ? 'blue' : 'default'}>{val || 1}</Tag>
      ),
    },
    {
      title: '冻结状态',
      key: 'frozen',
      width: 100,
      align: 'center',
      render: (_, record) => {
        if (isFrozen(record)) {
          return (
            <Tooltip title="订单未完结，库存处于冻结状态">
              <Tag color="orange" icon={<span>🔒</span>}>冻结中</Tag>
            </Tooltip>
          );
        }
        return (
          <Tooltip title="订单已完结，库存已释放">
            <Tag color="green" icon={<CheckCircleOutlined />}>已释放</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '售卖平台',
      dataIndex: 'resalePlatform',
      width: 100,
      render: (text) => text ? (
        <Tag color="blue" icon={<ShopOutlined />}>{text}</Tag>
      ) : '-',
    },
    {
      title: '变现金额',
      dataIndex: 'soldPrice',
      width: 100,
      align: 'right',
      render: (val) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
          <DollarOutlined /> ¥{val || 0}
        </span>
      ),
    },
    {
      title: '订单状态',
      key: 'status',
      width: 100,
      render: (_, record) => {
        const status = getOrderStatus(record);
        return (
          <Tag color={status.color} icon={status.icon}>
            {status.text}
          </Tag>
        );
      },
    },
    {
      title: '售卖时间',
      dataIndex: 'completedAt',
      width: 150,
      render: (text, record) => {
        if (record.disposeAction === '确定完结' && text) {
          return (
            <span>
              <ClockCircleOutlined style={{ marginRight: 4, color: '#52c41a' }} />
              {dayjs(text).format('YYYY-MM-DD HH:mm')}
            </span>
          );
        }
        return <span style={{ color: '#ccc' }}>-</span>;
      },
    },
    {
      title: '绑定时间',
      dataIndex: 'bindTime',
      width: 150,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
    },
  ];

  if (!bindOrders || bindOrders.length === 0) {
    return (
      <Empty
        description="暂无绑定订单"
        style={{ padding: '40px 0' }}
      />
    );
  }

  // 统计信息
  const frozenCount = bindOrders.filter(o => isFrozen(o)).length;
  const completedCount = bindOrders.filter(o => o.disposeAction === '确定完结').length;

  return (
    <div>
      {/* 统计信息 */}
      <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 4 }}>
        <span style={{ marginRight: 24 }}>
          总绑定订单：<b>{bindOrders.length}</b> 单
        </span>
        <span style={{ marginRight: 24 }}>
          冻结中：<Tag color="orange">{frozenCount}</Tag> 单
        </span>
        <span>
          已完结：<Tag color="green">{completedCount}</Tag> 单
        </span>
      </div>

      <Table
        dataSource={bindOrders}
        columns={columns}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1300 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        size="small"
        rowClassName={(record) => isFrozen(record) ? 'row-frozen' : ''}
      />

      <style>{`
        .row-frozen {
          background-color: #fffbe6;
        }
        .row-frozen:hover > td {
          background-color: #fff1b8 !important;
        }
      `}</style>
    </div>
  );
};

export default BindOrderTable;
