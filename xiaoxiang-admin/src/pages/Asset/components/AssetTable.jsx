// src/pages/Asset/components/AssetTable.jsx
import React, { useState, useMemo } from 'react';
import { Table, Tag, Button, Space, Input, Radio, Popconfirm, Tooltip } from 'antd';
import { 
  SearchOutlined, 
  EyeOutlined, 
  ToolOutlined,
  WarningOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  LinkOutlined,  // ✅ 新增
} from '@ant-design/icons';
import { ASSET_STATUS, ASSET_STATUS_LABELS, ASSET_STATUS_COLORS } from '../../../constants/asset';
import BindSkuModal from './BindSkuModal';  // ✅ 新增

// ==================== 辅助函数：状态比较（忽略大小写） ====================
const isStatus = (recordStatus, targetStatus) => {
  return (recordStatus || '').toLowerCase() === (targetStatus || '').toLowerCase();
};

const AssetTable = ({
  dataSource,
  loading,
  permissions,
  filterStatus,
  searchKeyword,
  onFilterStatusChange,
  onSearch,
  onDispose,
  onViewDetail,
  onShelve,
  onDeleteInvalidAsset,
  // ✅ 新增：绑定相关props
  onBindSku,
  skuList,
}) => {

  // ✅ 修改：只维护 currentRecordId，而不是整个 record 对象
  const [bindModalVisible, setBindModalVisible] = useState(false);
  const [currentRecordId, setCurrentRecordId] = useState(null);

  // ✅ 新增：从 dataSource 中实时获取最新的订单数据
  const currentRecord = useMemo(() => {
    if (!currentRecordId) return null;
    return dataSource.find(item => item.id === currentRecordId) || null;
  }, [dataSource, currentRecordId]);

  // ✅ 修改：打开绑定弹窗时只保存 ID
  const handleOpenBindModal = (record) => {
    setCurrentRecordId(record.id);
    setBindModalVisible(true);
  };

  // ✅ 新增：绑定成功
  const handleBindOk = (bindData) => {
    if (onBindSku && currentRecord) {
      onBindSku(currentRecord.id, bindData);
    }
    setBindModalVisible(false);
    setCurrentRecordId(null);
  };

  // ✅ 新增：关闭绑定弹窗
  const handleBindCancel = () => {
    setBindModalVisible(false);
    setCurrentRecordId(null);
  };

  // ==================== 智慧预警逻辑 ====================
  const getWarningLevel = (record) => {
    // 最高优先级：订单已失效
    if (record.isOrderInvalid) return 'invalid';
    if (record.isShelved) return 'shelved';
    if (isStatus(record.status, 'stocked') && record.stockDays >= 7) return 'danger';
    if (isStatus(record.status, 'stocked') && record.stockDays >= 3) return 'warning';
    return 'normal';
  };

  // 智能排序 (失效订单排最前)
  const sortedData = [...dataSource].sort((a, b) => {
    const levelA = getWarningLevel(a);
    const levelB = getWarningLevel(b);
    const rankMap = { 'invalid': 0, 'shelved': 1, 'danger': 2, 'warning': 3, 'normal': 4 };
    
    if (rankMap[levelA] !== rankMap[levelB]) {
      return rankMap[levelA] - rankMap[levelB];
    }
    return b.stockDays - a.stockDays;
  });

  // 前端筛选（忽略大小写）
  const filteredData = sortedData.filter(item => {
    const matchStatus = filterStatus === ASSET_STATUS.ALL || isStatus(item.status, filterStatus);
    const matchSearch = !searchKeyword || 
      item.orderNumber.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchKeyword.toLowerCase());
    return matchStatus && matchSearch;
  });

  // 行样式
  const getRowClassName = (record) => {
    const level = getWarningLevel(record);
    if (level === 'invalid') return 'row-invalid';
    if (level === 'shelved') return 'row-shelved';
    if (level === 'danger') return 'row-danger';
    if (level === 'warning') return 'row-warning';
    return '';
  };

  // 行样式CSS
  const styleTag = `
    .row-invalid { background-color: #fff2f0 !important; border-left: 4px solid #ff4d4f; }
    .row-invalid:hover > td { background-color: #ffccc7 !important; }
    .row-danger { background-color: #fff1f0 !important; }
    .row-danger:hover > td { background-color: #ffccc7 !important; }
    .row-warning { background-color: #fffbe6 !important; }
    .row-warning:hover > td { background-color: #fff1b8 !important; }
    .row-shelved { background-color: #f5f5f5 !important; opacity: 0.8; }
    .row-shelved:hover > td { background-color: #e8e8e8 !important; }
  `;

  // ==================== 表格列定义 ====================
  const columns = [
    {
      title: '状态标记',
      width: 120,
      fixed: 'left',
      render: (_, record) => {
        // 订单失效状态
        if (record.isOrderInvalid) {
          return (
            <Tooltip title={`原订单已${record.orderStatus === 'Cancelled' ? '取消' : '驳回'}`}>
              <Tag color="error" icon={<ExclamationCircleOutlined />}>
                订单失效
              </Tag>
            </Tooltip>
          );
        }
        
        const level = getWarningLevel(record);
        if (level === 'shelved') return <Tag color="default">已搁置</Tag>;
        if (level === 'danger') return <Tag color="error" icon={<WarningOutlined />}>紧急</Tag>;
        if (level === 'warning') return <Tag color="warning" icon={<WarningOutlined />}>预警</Tag>;
        if (isStatus(record.status, 'disposed')) return <Tag color="success">已处置</Tag>;
        return <Tag color="blue">正常</Tag>;
      },
    },
    {
      title: '订单号',
      dataIndex: 'orderNumber',
      width: 180,
      render: (text, record) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {text}
          {record.isOrderInvalid && (
            <Tooltip title={`订单状态: ${record.orderStatus === 'Cancelled' ? '已取消' : '已驳回'}`}>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginLeft: 4 }} />
            </Tooltip>
          )}
        </span>
      ),
    },
    {
      title: '商品信息',
      key: 'info',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.productName}</div>
          <div style={{ fontSize: 12, color: '#999' }}>用户: {record.userName}</div>
        </div>
      ),
    },
    {
      title: '成本(元)',
      dataIndex: 'costPrice',
      width: 100,
      render: (val) => `¥${val}`,
    },
    {
      title: '压货天数',
      dataIndex: 'stockDays',
      width: 100,
      sorter: (a, b) => a.stockDays - b.stockDays,
      render: (days, record) => {
        if (isStatus(record.status, 'disposed')) return '-';
        return <span style={{ fontWeight: 'bold' }}>{days} 天</span>;
      },
    },
    {
      title: '处置情况',
      key: 'disposeInfo',
      width: 250,
      render: (_, record) => {
        if (isStatus(record.status, 'disposed')) {
          return (
            <div style={{ fontSize: 12 }}>
              <div><b>动作:</b> {record.disposeAction || '已处置'}</div>
              <div><b>平台:</b> {record.resalePlatform || '-'} ({record.resaleOrderNo || '-'})</div>
              <div><b>金额:</b> ¥{record.soldPrice || 0}</div>
              {record.shippingNeeded && (
                <div><b>运单:</b> {record.trackingNo} (运费: ¥{record.shippingCost})</div>
              )}
            </div>
          );
        }
        return <span style={{ color: '#999' }}>未处置</span>;
      }
    },
    // ✅ 新增：SKU绑定列
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
      title: '操作',
      key: 'action',
      width: 280,  // ✅ 修改：宽度增加以容纳绑定按钮
      fixed: 'right',
      render: (_, record) => {
        // 失效订单显示删除按钮
        if (record.isOrderInvalid) {
          return (
            <Space>
              <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => onViewDetail(record)}>
                详情
              </Button>
              <Popconfirm
                title="确认删除该资产？"
                description="原订单已取消/驳回，删除后不可恢复。"
                onConfirm={() => onDeleteInvalidAsset(record)}
                okText="确认删除"
                okType="danger"
                cancelText="取消"
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </Space>
          );
        }

        const isShelved = record.isShelved;
        
        // ✅ 关键修复：使用 isStatus 函数比较状态（忽略大小写）
        const isStocked = isStatus(record.status, 'stocked');
        
        return (
          <Space>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => onViewDetail(record)}>
              详情
            </Button>
            
            {/* ✅ 新增：绑定按钮 */}
            <Button 
              type="link" 
              size="small" 
              icon={<LinkOutlined />}
              onClick={() => handleOpenBindModal(record)}
              style={record.relatedSkuId ? { color: '#52c41a' } : {}}
            >
              {record.relatedSkuId ? '已绑定' : '绑定'}
            </Button>
            
            {/* ✅ 压货中状态显示处置按钮 */}
            {isStocked && (
              <>
                <Button type="link" size="small" danger icon={<ToolOutlined />} onClick={() => onDispose(record)}>
                  处置
                </Button>
                
                <Button 
                  type="link" 
                  size="small" 
                  style={{ color: isShelved ? '#52c41a' : '#999' }}
                  icon={isShelved ? <CheckCircleOutlined /> : <PauseCircleOutlined />}
                  onClick={() => onShelve(record)}
                >
                  {isShelved ? '取消搁置' : '搁置'}
                </Button>
              </>
            )}
            
            {/* ✅ 已处置状态显示提示 */}
            {!isStocked && (
              <Tag color="default">已处置</Tag>
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
        <Radio.Group 
          value={filterStatus} 
          onChange={(e) => onFilterStatusChange(e.target.value)}
          buttonStyle="solid"
        >
          <Radio.Button value={ASSET_STATUS.ALL}>全部</Radio.Button>
          <Radio.Button value={ASSET_STATUS.STOCKED}>压货中</Radio.Button>
          <Radio.Button value={ASSET_STATUS.DISPOSED}>已处置</Radio.Button>
        </Radio.Group>

        <Input.Search
          placeholder="搜索订单号/商品名"
          style={{ width: 250 }}
          value={searchKeyword}
          onChange={(e) => onSearch(e.target.value)}
          allowClear
          enterButton={<SearchOutlined />}
        />
      </div>

      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey="id"
        loading={loading}
        rowClassName={getRowClassName}
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`
        }}
      />

      {/* ✅ 新增：绑定SKU弹窗 */}
      <BindSkuModal
        visible={bindModalVisible}
        record={currentRecord}
        skuList={skuList || []}
        onOk={handleBindOk}
        onCancel={handleBindCancel}
      />
    </>
  );
};

export default AssetTable;
