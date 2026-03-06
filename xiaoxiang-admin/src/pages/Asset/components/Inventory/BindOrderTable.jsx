// src/pages/Asset/components/Inventory/BindOrderTable.jsx
/**
 * 绑定订单表格 - 支持筛选搜索
 */
import React, { useState, useMemo } from 'react';
import { Table, Tag, Input, Select, Space, DatePicker, Button } from 'antd';
import { SearchOutlined, ExportOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { 
  SALE_STATUS, 
  SALE_STATUS_LABELS, 
  SALE_STATUS_COLORS,
  RISK_LEVEL,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
} from '../../constants/inventoryConstants';

import { calculateRiskLevel } from '../../utils/inventoryUtils';

const { RangePicker } = DatePicker;

const BindOrderTable = ({ bindOrders }) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterSaleStatus, setFilterSaleStatus] = useState(null);
  const [filterRisk, setFilterRisk] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  // 筛选后的数据
  const filteredOrders = useMemo(() => {
    let list = bindOrders || [];
    
    // 搜索
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      list = list.filter(order => 
        order.orderNumber?.toLowerCase().includes(keyword) ||
        order.productName?.toLowerCase().includes(keyword) ||
        order.relatedSkuName?.toLowerCase().includes(keyword)
      );
    }
    
    // 售卖状态筛选
    if (filterSaleStatus) {
      list = list.filter(order => order.saleStatus === filterSaleStatus);
    }
    
    // 风险等级筛选
    if (filterRisk) {
      list = list.filter(order => {
        const risk = calculateRiskLevel(order.listedAt, order.soldAt);
        return risk === filterRisk;
      });
    }
    
    // 日期范围筛选
    if (dateRange && dateRange[0] && dateRange[1]) {
      list = list.filter(order => {
        const bindTime = order.bindTime ? dayjs(order.bindTime) : null;
        if (!bindTime) return false;
        return bindTime.isAfter(dateRange[0].startOf('day')) && 
               bindTime.isBefore(dateRange[1].endOf('day'));
      });
    }
    
    return list;
  }, [bindOrders, searchKeyword, filterSaleStatus, filterRisk, dateRange]);

  // 导出
  const handleExport = () => {
    const headers = ['订单号', '商品名称', '绑定SKU', '规格', '绑定数量', '绑定时间', 
                     '是否售卖', '售卖平台', '售卖状态', '上架时间', '售出时间', '风险等级'];
    
    const rows = filteredOrders.map(order => {
      const risk = calculateRiskLevel(order.listedAt, order.soldAt);
      return [
        order.orderNumber,
        order.productName,
        order.relatedSkuName,
        order.relatedSkuSpec,
        order.relatedQuantity,
        order.bindTime ? dayjs(order.bindTime).format('YYYY-MM-DD HH:mm') : '-',
        order.isForSale ? '是' : '否',
        order.salePlatform || '-',
        SALE_STATUS_LABELS[order.saleStatus] || '-',
        order.listedAt ? dayjs(order.listedAt).format('YYYY-MM-DD HH:mm') : '-',
        order.soldAt ? dayjs(order.soldAt).format('YYYY-MM-DD HH:mm') : '-',
        RISK_LEVEL_LABELS[risk],
      ];
    });
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => '"' + cell + '"').join(','))
      .join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '绑定订单_' + dayjs().format('YYYY-MM-DD') + '.csv';
    link.click();
  };

  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNumber',
      width: 140,
      render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>,
    },
    {
      title: '商品名称',
      dataIndex: 'productName',
      width: 180,
      ellipsis: true,
    },
    {
      title: '绑定SKU',
      key: 'sku',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.relatedSkuName || '-'}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.relatedSkuCode || ''}</div>
        </div>
      ),
    },
    {
      title: '规格',
      dataIndex: 'relatedSkuSpec',
      width: 120,
      ellipsis: true,
    },
    {
      title: '绑定数量',
      dataIndex: 'relatedQuantity',
      width: 80,
      align: 'center',
    },
    {
      title: '绑定时间',
      dataIndex: 'bindTime',
      width: 140,
      render: (text) => text ? dayjs(text).format('MM-DD HH:mm') : '-',
    },
    {
      title: '是否售卖',
      dataIndex: 'isForSale',
      width: 80,
      align: 'center',
      render: (isForSale) => (
        <Tag color={isForSale ? 'success' : 'default'}>{isForSale ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '售卖平台',
      dataIndex: 'salePlatform',
      width: 80,
      render: (platform) => platform ? <Tag color="blue">{platform}</Tag> : '-',
    },
    {
      title: '售卖状态',
      dataIndex: 'saleStatus',
      width: 90,
      render: (status) => (
        <Tag color={SALE_STATUS_COLORS[status] || 'default'}>
          {SALE_STATUS_LABELS[status] || '-'}
        </Tag>
      ),
    },
    {
      title: '上架时间',
      dataIndex: 'listedAt',
      width: 140,
      render: (text) => text ? dayjs(text).format('MM-DD HH:mm') : '-',
    },
    {
      title: '风险等级',
      key: 'risk',
      width: 90,
      render: (_, record) => {
        const risk = calculateRiskLevel(record.listedAt, record.soldAt);
        return (
          <Tag color={RISK_LEVEL_COLORS[risk]}>
            {RISK_LEVEL_LABELS[risk]}
          </Tag>
        );
      },
    },
    {
      title: '成本价',
      dataIndex: 'costPrice',
      width: 90,
      align: 'right',
      render: (val) => <span>¥{val || 0}</span>,
    },
  ];

  return (
    <div>
      {/* 筛选工具栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input.Search
            placeholder="搜索订单号/商品名"
            style={{ width: 180 }}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
            enterButton={<SearchOutlined />}
          />
          <Select
            placeholder="售卖状态"
            style={{ width: 100 }}
            value={filterSaleStatus}
            onChange={setFilterSaleStatus}
            allowClear
          >
            <Select.Option value={SALE_STATUS.NOT_FOR_SALE}>不售卖</Select.Option>
            <Select.Option value={SALE_STATUS.FOR_SALE}>售卖中</Select.Option>
            <Select.Option value={SALE_STATUS.SOLD}>已售出</Select.Option>
          </Select>
          <Select
            placeholder="风险等级"
            style={{ width: 100 }}
            value={filterRisk}
            onChange={setFilterRisk}
            allowClear
          >
            <Select.Option value={RISK_LEVEL.LOW}>低风险</Select.Option>
            <Select.Option value={RISK_LEVEL.MEDIUM}>中风险</Select.Option>
            <Select.Option value={RISK_LEVEL.HIGH}>高风险</Select.Option>
          </Select>
          <RangePicker
            placeholder={['绑定开始', '绑定结束']}
            style={{ width: 220 }}
            value={dateRange}
            onChange={setDateRange}
            allowClear
          />
        </Space>
        <Button icon={<ExportOutlined />} onClick={handleExport}>导出</Button>
      </div>

      {/* 表格 */}
      <Table
        dataSource={filteredOrders}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10, showTotal: (total) => '共 ' + total + ' 条' }}
        scroll={{ x: 1300 }}
        size="small"
      />
    </div>
  );
};

export default BindOrderTable;
