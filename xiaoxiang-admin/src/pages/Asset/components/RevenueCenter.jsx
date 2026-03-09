// src/pages/Asset/components/RevenueCenter.jsx
/**
 * 收益中心组件 - 修复版
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Table, DatePicker, Input, Space, Button, message, Dropdown, Menu, Empty } from 'antd';
import { 
  DollarOutlined, 
  RiseOutlined, 
  FallOutlined, 
  ShopOutlined,
  SearchOutlined,
  CarOutlined,
  ToolOutlined,
  EyeOutlined,
  DownloadOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const RevenueCenter = ({ revenueStats, onViewDetail }) => {
  const [dateRange, setDateRange] = useState(null);
  const [searchText, setSearchText] = useState('');

  // ✅ 安全获取 disposedItems
  const disposedItems = useMemo(() => {
    if (!revenueStats) return [];
    if (!revenueStats.disposedItems) return [];
    if (!Array.isArray(revenueStats.disposedItems)) return [];
    return revenueStats.disposedItems;
  }, [revenueStats]);

  // ✅ 安全的日期解析
  const parseDate = (dateValue) => {
    if (!dateValue) return null;
    try {
      const parsed = dayjs(dateValue);
      return parsed.isValid() ? parsed : null;
    } catch (e) {
      return null;
    }
  };

  // ✅ 筛选后的订单
  const filteredOrders = useMemo(() => {
    let filteredList = [...disposedItems];

    // 日期筛选
    if (dateRange && dateRange[0] && dateRange[1]) {
      try {
        filteredList = filteredList.filter(item => {
          const disposeTime = parseDate(item.disposedAt);
          if (!disposeTime) return false;
          return disposeTime.isAfter(dateRange[0].startOf('day')) && 
                 disposeTime.isBefore(dateRange[1].endOf('day'));
        });
      } catch (e) {
        console.error('日期筛选错误:', e);
      }
    }

    // 搜索筛选
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      filteredList = filteredList.filter(item => {
        try {
          return (item.resalePlatform && item.resalePlatform.toLowerCase().includes(lowerSearch)) ||
                 (item.orderNumber && item.orderNumber.toLowerCase().includes(lowerSearch)) ||
                 (item.resaleOrderNo && item.resaleOrderNo.toLowerCase().includes(lowerSearch)) ||
                 (item.productName && item.productName.toLowerCase().includes(lowerSearch));
        } catch (e) {
          return false;
        }
      });
    }

    // 排序
    try {
      filteredList.sort((a, b) => {
        const timeA = parseDate(a.disposedAt);
        const timeB = parseDate(b.disposedAt);
        if (!timeA && !timeB) return 0;
        if (!timeA) return 1;
        if (!timeB) return -1;
        return timeB.unix() - timeA.unix();
      });
    } catch (e) {
      console.error('排序错误:', e);
    }

    return filteredList;
  }, [disposedItems, dateRange, searchText]);

  // ✅ 计算统计
  const filteredStats = useMemo(() => {
    let income = 0, fixedCost = 0, shippingCost = 0, otherCost = 0;

    filteredOrders.forEach(item => {
      try {
        income += (Number(item.soldPrice) || 0);
        fixedCost += (Number(item.costPrice) || 0);
        shippingCost += (Number(item.shippingCost) || 0);
        otherCost += (Number(item.otherCostAmount) || 0);
      } catch (e) {}
    });

    return {
      count: filteredOrders.length,
      totalIncome: income,
      totalFixedCost: fixedCost,
      totalShippingCost: shippingCost,
      totalOtherCost: otherCost,
      netProfit: income - fixedCost - shippingCost - otherCost,
    };
  }, [filteredOrders]);

  const disabledDate = (current) => {
    if (!dateRange || !dateRange[0]) return current && current > dayjs().endOf('day');
    const tooLate = dateRange[0] && current.diff(dateRange[0], 'days') > 365;
    const tooEarly = dateRange[1] && dateRange[1].diff(current, 'days') > 365;
    return current && (tooLate || tooEarly || current > dayjs().endOf('day'));
  };

  // 导出 CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }

    try {
      const headers = ['处置时间', '商品名称', '内部订单号', '转售平台', '外部订单号', '收入', '原成本', '快递成本', '其他成本', '净利润'];
      
      const rows = filteredOrders.map(item => {
        const profit = (Number(item.soldPrice) || 0) - (Number(item.costPrice) || 0) - (Number(item.shippingCost) || 0) - (Number(item.otherCostAmount) || 0);
        return [
          item.disposedAt ? dayjs(item.disposedAt).format('YYYY-MM-DD HH:mm') : '',
          item.productName || '',
          item.orderNumber || '',
          item.resalePlatform || '',
          item.resaleOrderNo || '',
          Number(item.soldPrice) || 0,
          Number(item.costPrice) || 0,
          Number(item.shippingCost) || 0,
          Number(item.otherCostAmount) || 0,
          profit.toFixed(2)
        ];
      });

      rows.push([]);
      rows.push(['汇总', '', '', '', '', 
        filteredStats.totalIncome || 0,
        filteredStats.totalFixedCost || 0,
        filteredStats.totalShippingCost || 0,
        filteredStats.totalOtherCost || 0,
        (filteredStats.netProfit || 0).toFixed(2)
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = dayjs().format('YYYY-MM-DD');
      const rangeStr = dateRange && dateRange[0] 
        ? `_${dateRange[0].format('MMDD')}-${dateRange[1].format('MMDD')}` 
        : '';
      link.download = `收益报表${rangeStr}_${dateStr}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      message.success(`已导出 ${filteredOrders.length} 条记录`);
    } catch (e) {
      console.error('导出错误:', e);
      message.error('导出失败');
    }
  };

  // 导出菜单
  const exportMenuItems = [
    { key: 'simple', icon: <FileExcelOutlined />, label: '简洁报表 (CSV)', onClick: handleExportCSV },
  ];

  // 表格列
  const columns = [
    {
      title: '处置时间',
      dataIndex: 'disposedAt',
      width: 150,
      render: text => {
        const date = parseDate(text);
        return date ? date.format('MM-DD HH:mm') : '-';
      }
    },
    { 
      title: '商品信息', 
      key: 'info',
      width: 220,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.productName || '-'}</div>
          <div style={{ fontSize: 12, color: '#999' }}>内部单号: {record.orderNumber || '-'}</div>
        </div>
      )
    },
    { 
      title: '转售平台', 
      dataIndex: 'resalePlatform', 
      width: 100,
      render: text => <span style={{ color: '#1890ff' }}><ShopOutlined /> {text || '-'}</span>
    },
    { 
      title: '收入', 
      dataIndex: 'soldPrice', 
      width: 100, 
      align: 'right',
      render: val => <span style={{ color: '#3f8600', fontWeight: 'bold' }}>+{Number(val) || 0}</span>
    },
    { 
      title: '原成本', 
      dataIndex: 'costPrice', 
      width: 90, 
      align: 'right',
      render: val => <span style={{ color: '#999' }}>-{Number(val) || 0}</span>
    },
    { 
      title: '快递', 
      dataIndex: 'shippingCost', 
      width: 80, 
      align: 'right',
      render: val => Number(val) > 0 ? <span style={{ color: '#faad14' }}>-{Number(val)}</span> : '0'
    },
    { 
      title: '其他', 
      dataIndex: 'otherCostAmount', 
      width: 80, 
      align: 'right',
      render: val => Number(val) > 0 ? <span style={{ color: '#eb2f96' }}>-{Number(val)}</span> : '0'
    },
    { 
      title: '净利润', 
      key: 'profit',
      width: 100, 
      align: 'right',
      fixed: 'right',
      render: (_, record) => {
        const profit = (Number(record.soldPrice) || 0) - (Number(record.costPrice) || 0) - (Number(record.shippingCost) || 0) - (Number(record.otherCostAmount) || 0);
        return <span style={{ color: profit >= 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold', fontSize: 15 }}>¥{profit.toFixed(2)}</span>;
      }
    },
    {
      title: '订单快照',
      key: 'action',
      width: 90,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Button type="primary" ghost size="small" icon={<EyeOutlined />} onClick={() => onViewDetail && onViewDetail(record)}>
          详细
        </Button>
      )
    }
  ];

  // 空数据状态
  if (disposedItems.length === 0) {
    return (
      <Card>
        <Empty description="暂无已处置订单数据" style={{ padding: '40px 0' }} />
      </Card>
    );
  }

  return (
    <div>
      {/* 筛选控制区 */}
      <Card style={{ marginBottom: 24 }}>
        <Space size="large">
          <div>
            <span style={{ marginRight: 8, color: '#666' }}>日期范围：</span>
            <RangePicker 
              value={dateRange}
              onChange={setDateRange}
              disabledDate={disabledDate}
              allowClear
              placeholder={['开始日期', '结束日期']}
              style={{ width: 300 }}
            />
          </div>
          
          <Input.Search
            placeholder="搜索平台/订单号/商品名"
            style={{ width: 250 }}
            onSearch={value => setSearchText(value)}
            allowClear
            enterButton={<SearchOutlined />}
          />

          {/* ✅ 修复：使用 span 代替废弃的 Divider type="vertical" */}
          <span style={{ color: '#d9d9d9', margin: '0 8px' }}>|</span>

          <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
            <Button type="primary" icon={<DownloadOutlined />}>
              导出报表
            </Button>
          </Dropdown>
        </Space>
      </Card>

      {/* 收益概览卡片 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            {/* ✅ 修复：valueStyle 改为 styles.content */}
            <Statistic 
              title="筛选总收入" 
              value={filteredStats.totalIncome || 0} 
              precision={2} 
              prefix={<DollarOutlined />} 
              styles={{ content: { color: '#1890ff' } }} 
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="商品原成本" 
              value={filteredStats.totalFixedCost || 0} 
              precision={2} 
              prefix={<FallOutlined />} 
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="快递成本" 
              value={filteredStats.totalShippingCost || 0} 
              precision={2} 
              prefix={<CarOutlined />} 
              styles={{ content: { color: '#faad14' } }} 
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="其他成本" 
              value={filteredStats.totalOtherCost || 0} 
              precision={2} 
              prefix={<ToolOutlined />} 
              styles={{ content: { color: '#eb2f96' } }} 
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="净利润" 
              value={filteredStats.netProfit || 0} 
              precision={2} 
              prefix={<RiseOutlined />}
              styles={{ content: { color: (filteredStats.netProfit || 0) >= 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold' } }}
            />
          </Col>
        </Row>
      </Card>

      {/* 订单明细表 */}
      <Card title={`订单明细列表 (共 ${filteredOrders.length} 单)`}>
        <Table 
          dataSource={filteredOrders}
          columns={columns}
          rowKey="id"
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default RevenueCenter;
