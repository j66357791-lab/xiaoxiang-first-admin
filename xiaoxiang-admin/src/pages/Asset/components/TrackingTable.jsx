// src/pages/Asset/components/TrackingTable.jsx
//      处置状态跟踪表格，跟踪已处置资产的状态流转
import React from 'react';
import { Table, Tag, Button, Space, Input, Select, Popconfirm, Tooltip, Dropdown, Menu } from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DollarOutlined,
  CarOutlined,
  RollbackOutlined,
  MoreOutlined,
  LinkOutlined,
  ShopOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;
const { Search } = Input;

const TrackingTable = ({ dataSource, loading, onViewDetail, onUpdateTracking, onRevert }) => {

  // 本地搜索状态
  const [searchText, setSearchText] = React.useState('');
  const [filterAction, setFilterAction] = React.useState('all');

  // ==================== 跟踪预警逻辑 ====================
  const getTrackingLevel = (record) => {
    const daysSinceDispose = record.disposedAt ? dayjs().diff(dayjs(record.disposedAt), 'day') : 0;

    if (record.disposeAction === '确定售卖' && daysSinceDispose > 7) return 'danger';
    if (record.disposeAction === '确定结算' && daysSinceDispose > 3) return 'warning';
    return 'normal';
  };

  const getRowClassName = (record) => {
    const level = getTrackingLevel(record);
    if (level === 'danger') return 'row-danger';
    if (level === 'warning') return 'row-warning';
    return '';
  };

  // 样式注入
  const styleTag = `
    .row-danger { background-color: #fff1f0 !important; }
    .row-warning { background-color: #fffbe6 !important; }
  `;

  // ==================== 数据筛选 ====================
  const filteredData = dataSource.filter(item => {
    const matchSearch = !searchText ||
      item.orderNumber.toLowerCase().includes(searchText.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchText.toLowerCase());

    const matchAction = filterAction === 'all' || item.disposeAction === filterAction;
    return matchSearch && matchAction;
  }).sort((a, b) => {
    const levelA = getTrackingLevel(a);
    const levelB = getTrackingLevel(b);
    const rankMap = { 'danger': 0, 'warning': 1, 'normal': 2 };
    return rankMap[levelA] - rankMap[levelB];
  });

  // ==================== 🆕 统一回退确认逻辑 ====================
  const handleRevertConfirm = (record, revertType) => {
    if (revertType === 'full') {
      // 完全回退：退回到订单处置总览 (压货状态)
      Popconfirm.confirm({
        title: '确认完全回退？',
        content: '订单将返回"订单处置总览"，需要重新处置。',
        okText: '确认回退',
        okType: 'danger',
        onOk: () => onRevert(record)
      });
    } else {
      // 状态回退：仅改变处置状态
      const targetAction = revertType === 'toSell' ? '确定售卖' : '确定结算';
      onUpdateTracking(record, targetAction);
    }
  };

  // ==================== 表格列 ====================
  const columns = [
    {
      title: '当前状态',
      dataIndex: 'disposeAction',
      width: 140,
      fixed: 'left',
      render: (text, record) => {
        const level = getTrackingLevel(record);

        if (text === '确定售卖') {
          if (level === 'danger') return <Tag color="error" icon={<WarningOutlined />}>售卖(超时)</Tag>;
          return <Tag color="blue" icon={<CarOutlined />}>{text}</Tag>;
        }
        if (text === '确定结算') {
          if (level === 'warning') return <Tag color="warning" icon={<WarningOutlined />}>结算(滞后)</Tag>;
          return <Tag color="orange" icon={<DollarOutlined />}>{text}</Tag>;
        }
        if (text === '确定完结') {
          return <Tag color="success" icon={<CheckCircleOutlined />}>{text}</Tag>;
        }
        return <Tag>{text || '未知'}</Tag>;
      }
    },
    {
      title: '商品/订单信息',
      key: 'info',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.productName}</div>
          <div style={{ fontSize: 12, color: '#666' }}>转售单号: {record.resaleOrderNo || '-'}</div>
          <div style={{ fontSize: 12, color: '#999' }}>原单号: {record.orderNumber}</div>
        </div>
      ),
    },
    {
      title: '转售平台',
      dataIndex: 'resalePlatform',
      width: 100,
      render: (text) => text ? <Tag color="blue" icon={<ShopOutlined />}>{text}</Tag> : '-'
    },
    {
      title: '变现金额',
      dataIndex: 'soldPrice',
      width: 100,
      render: (val) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{val || 0}</span>,
    },
    {
      title: 'SKU绑定',
      dataIndex: 'relatedSkuId',
      width: 80,
      align: 'center',
      render: (relatedSkuId, record) => {
        if (relatedSkuId) {
          return (
            <Tooltip title={record.relatedSkuName}>
              <Tag color="green" icon={<LinkOutlined />}>已绑定</Tag>
            </Tooltip>
          );
        }
        return <Tag>未绑定</Tag>;
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
              {dayjs(text).format('MM-DD HH:mm')}
            </span>
          );
        }
        return <span style={{ color: '#ccc' }}>-</span>;
      }
    },
    {
      title: '物流信息',
      key: 'shipping',
      render: (_, record) => {
        if (!record.shippingNeeded) return <span style={{color:'#999'}}>无需快递</span>;
        return (
          <div style={{ fontSize: 12 }}>
            <div>运单: {record.trackingNo || '-'}</div>
            <div>运费: ¥{record.shippingCost || 0}</div>
          </div>
        );
      }
    },
    {
      title: '处置时间',
      dataIndex: 'disposedAt',
      width: 150,
      render: (text) => text ? dayjs(text).format('MM-DD HH:mm') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      fixed: 'right',
      render: (_, record) => {
        const currentAction = record.disposeAction;

        return (
          <Space>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => onViewDetail(record)}>
              详情
            </Button>

            {/* 确定售卖状态 */}
            {currentAction === '确定售卖' && (
              <>
                <Button
                  type="primary"
                  size="small"
                  ghost
                  onClick={() => onUpdateTracking(record, '确定结算')}
                >
                  确认结算
                </Button>
                <Popconfirm
                  title="确认完全回退？"
                  description="订单将返回'订单处置总览'重新处理。"
                  onConfirm={() => onRevert(record)}
                  okText="确认回退"
                  okType="danger"
                >
                  <Button type="link" size="small" danger icon={<RollbackOutlined />}>
                    回退
                  </Button>
                </Popconfirm>
              </>
            )}

            {/* 确定结算状态 */}
            {currentAction === '确定结算' && (
              <>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => onUpdateTracking(record, '确定完结')}
                >
                  确认完结
                </Button>
                <Tooltip title="退回至'确定售卖'状态">
                  <Button
                    type="link"
                    size="small"
                    onClick={() => onUpdateTracking(record, '确定售卖')}
                  >
                    回退售卖
                  </Button>
                </Tooltip>
                <Popconfirm
                  title="确认完全回退？"
                  description="订单将返回'订单处置总览'重新处理。"
                  onConfirm={() => onRevert(record)}
                  okText="确认"
                  okType="danger"
                >
                  <Button type="link" size="small" danger>
                    完全回退
                  </Button>
                </Popconfirm>
              </>
            )}

            {/* 确定完结状态 */}
            {currentAction === '确定完结' && (
              <>
                <Popconfirm
                  title="重新开启订单？"
                  description="订单将变为'确定结算'状态，可继续处理。"
                  onConfirm={() => onUpdateTracking(record, '确定结算')}
                  okText="确认重开"
                >
                  <Button type="link" size="small">
                    重开订单
                  </Button>
                </Popconfirm>
                <Tooltip title="退回至'确定售卖'状态">
                  <Button
                    type="link"
                    size="small"
                    onClick={() => onUpdateTracking(record, '确定售卖')}
                  >
                    回退售卖
                  </Button>
                </Tooltip>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <style>{styleTag}</style>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Select
          value={filterAction}
          onChange={setFilterAction}
          style={{ width: 150 }}
        >
          <Option value="all">全部状态</Option>
          <Option value="确定售卖">确定售卖</Option>
          <Option value="确定结算">确定结算</Option>
          <Option value="确定完结">确定完结</Option>
        </Select>

        <Search
          placeholder="搜索订单号"
          style={{ width: 250 }}
          onSearch={value => setSearchText(value)}
          allowClear
        />
      </div>

      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey="id"
        loading={loading}
        rowClassName={getRowClassName}
        scroll={{ x: 1400 }}
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条记录`
        }}
      />
    </>
  );
};

export default TrackingTable;
