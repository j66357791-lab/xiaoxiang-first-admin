// src/pages/Asset/index.jsx
/**
 * 资产管理中心主页面
 */
import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Tag, Menu, Descriptions, Modal, Input, message, Dropdown } from 'antd';
import { 
  SyncOutlined, 
  DashboardOutlined, 
  OrderedListOutlined, 
  AuditOutlined,
  FileTextOutlined,
  DollarOutlined,
  AppstoreOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  EyeOutlined,
  HistoryOutlined,
  DeleteOutlined,
  DownOutlined
} from '@ant-design/icons';

import { useAssetLogic } from './logic/useAssetLogic';
import { ASSET_STATUS } from '../../constants/asset';

import StatsCards from './components/StatsCards';
import AssetTable from './components/AssetTable';
import TrackingTable from './components/TrackingTable';
import LogCenter from './components/LogCenter';
import RevenueCenter from './components/RevenueCenter';
import DisposeModal from './components/DisposeModal';
import DetailModal from './components/DetailModal';
import InventoryCenter from './components/InventoryCenter';
import dayjs from 'dayjs';

const AssetDashboard = () => {
  const [currentView, setCurrentView] = useState('overview');
  const [filterStatus, setFilterStatus] = useState(ASSET_STATUS.ALL);
  const [searchKeyword, setSearchKeyword] = useState('');

  const logicResult = useAssetLogic() || {};
  
  const {
    loading = false, 
    permissions = {}, 
    stats = {}, 
    stockData = [], 
    disposedData = [], 
    revenueStats = {},
    activeRecord, 
    showDetailModal, 
    setShowDetailModal, 
    showDisposeModal, 
    setShowDisposeModal,
    isPreviewMode = false,
    lastArchiveInfo,
    versionHistory = [],
    pullFrontendOrders,
    saveSnapshot,
    loadLatestSnapshot,
    getVersionHistory,
    restoreVersion,
    deleteVersion,
    cleanGarbageData,
    handleViewDetail, 
    handleDispose, 
    handleShelve,
    handleSaveDispose, 
    handleUpdateTracking, 
    handleRevert, 
    handleDeleteInvalidAsset,
    // SKU相关
    skuList,
    setSkuList,
    categories,
    setCategories,
    handleBindSku,
    getBindOrders,
    // ✅ 同步订单状态相关
    handleSyncOrderStatus,
    handleExecuteSync,
    calculateFrozenStock,
    refreshFrozenStock,
    // 库存快照相关
    inventorySnapshotInfo,
    inventoryVersionHistory,
    hasInventoryChanges,
    handleSaveInventorySnapshot,
    handleLoadInventorySnapshot,
    handleRestoreInventoryVersion,
    handleDeleteInventoryVersion,
    handleClearInventoryData,
  } = logicResult;

  useEffect(() => {
    if (typeof getVersionHistory === 'function') {
      try {
        getVersionHistory();
      } catch (e) {
        console.error('getVersionHistory error:', e);
      }
    }
  }, [getVersionHistory]);

  const menuItems = [
    { key: 'overview', icon: <DashboardOutlined />, label: '资产中心总览' },
    { key: 'orders', icon: <OrderedListOutlined />, label: '订单处置总览' },
    { key: 'tracking', icon: <AuditOutlined />, label: '处置状态跟踪' },
    { key: 'revenue', icon: <DollarOutlined />, label: '收益中心' },
    { key: 'inventory', icon: <AppstoreOutlined />, label: '库存中心' },
    { key: 'logs', icon: <FileTextOutlined />, label: '日志中心' },
  ];

  const handleArchiveClick = () => {
    let inputValue = '';
    const allAssetsCount = (stockData?.length || 0) + (disposedData?.length || 0);
    
    Modal.confirm({
      title: '保存快照',
      icon: null,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>即将保存 <b style={{ color: '#1890ff' }}>{allAssetsCount}</b> 条资产数据。</p>
          <Input.TextArea 
            placeholder="请输入本次存档备注（必填）"
            rows={3}
            onChange={(e) => { inputValue = e.target.value; }}
          />
        </div>
      ),
      okText: '确认保存',
      cancelText: '取消',
      onOk: () => {
        if (!inputValue || !inputValue.trim()) {
          message.error('请输入存档备注');
          return Promise.reject();
        }
        if (typeof saveSnapshot === 'function') {
          return saveSnapshot(inputValue);
        }
        return Promise.resolve();
      }
    });
  };

  const historyMenuItems = (versionHistory || []).map(item => ({
    key: item.id,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 280 }}>
        <span>
          {item.isLatest && <Tag color="green" style={{ marginRight: 4 }}>当前</Tag>}
          V{item.version} - {item.remark || '无备注'}
        </span>
        <span style={{ color: '#999', fontSize: 12 }}>
          {dayjs(item.createdAt).format('MM-DD HH:mm')}
        </span>
      </div>
    ),
    onClick: () => handleVersionClick(item)
  }));

  const handleVersionClick = (item) => {
    if (item.isLatest) return;
    
    Modal.confirm({
      title: '恢复历史版本',
      content: (
        <div>
          <p>确定恢复到版本 <b>V{item.version}</b> 吗？</p>
          <p style={{ color: '#666', fontSize: 12 }}>
            备注：{item.remark || '无'}<br/>
            时间：{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </p>
        </div>
      ),
      okText: '确认恢复',
      cancelText: '取消',
      onOk: () => {
        if (typeof restoreVersion === 'function') {
          return restoreVersion(item.id);
        }
      }
    });
  };

  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return (
          <Card 
            title={
              <Space>
                <span style={{ fontSize: 18, fontWeight: 'bold' }}>🧠 资产数据总览</span>
                {isPreviewMode ? (
                  <Tag color="processing" icon={<EyeOutlined />}>前端预览模式</Tag>
                ) : (
                  <Tag color="success" icon={<CloudUploadOutlined />}>已保存快照</Tag>
                )}
              </Space>
            }
            extra={
              <Space>
                <Button 
                  type="default" 
                  icon={<SyncOutlined spin={loading} />} 
                  onClick={pullFrontendOrders} 
                  loading={loading}
                >
                  拉取前端订单
                </Button>
                <span style={{ color: '#d9d9d9', margin: '0 8px' }}>|</span>
                <Button 
                  type="primary" 
                  icon={<CloudUploadOutlined />} 
                  onClick={handleArchiveClick}
                  loading={loading}
                  disabled={stockData.length === 0 && disposedData.length === 0} 
                >
                  保存快照
                </Button>
                <Button 
                  type="default" 
                  icon={<CloudDownloadOutlined />} 
                  onClick={loadLatestSnapshot} 
                  loading={loading}
                >
                  读取快照
                </Button>
                <Dropdown 
                  menu={{ items: historyMenuItems }} 
                  placement="bottomRight"
                  disabled={!versionHistory || versionHistory.length === 0}
                >
                  <Button icon={<HistoryOutlined />}>
                    历史版本 <DownOutlined />
                  </Button>
                </Dropdown>
                <Button 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={cleanGarbageData} 
                  loading={loading}
                  disabled={isPreviewMode || (stockData.length === 0 && disposedData.length === 0)} 
                >
                  清理脏数据
                </Button>
              </Space>
            }
          >
            {lastArchiveInfo && (
              <Descriptions size="small" style={{ marginBottom: 16, background: '#f6ffed', padding: '10px 20px', borderRadius: 4 }}>
                <Descriptions.Item label={<span style={{fontWeight: 'bold'}}><HistoryOutlined /> 上次存档时间</span>}>
                  {lastArchiveInfo.time}
                </Descriptions.Item>
                <Descriptions.Item label="存档备注">
                  {lastArchiveInfo.remark}
                </Descriptions.Item>
              </Descriptions>
            )}
            {permissions.canViewMoney && <StatsCards stats={stats} loading={loading} />}
          </Card>
        );

      case 'orders':
        return (
          <Card 
            title={<span style={{ fontSize: 18, fontWeight: 'bold' }}>📋 订单处置总览</span>}
            extra={<span style={{ color: '#999', fontSize: 12 }}>库存总数：{stockData.length}</span>}
          >
            <AssetTable
              dataSource={stockData} 
              loading={loading}
              permissions={permissions}
              filterStatus={filterStatus}
              searchKeyword={searchKeyword}
              onFilterStatusChange={setFilterStatus}
              onSearch={setSearchKeyword}
              onDispose={handleDispose}
              onViewDetail={handleViewDetail}
              onShelve={handleShelve}
              onDeleteInvalidAsset={handleDeleteInvalidAsset}
              onBindSku={handleBindSku}
              skuList={skuList}
            />
          </Card>
        );

      case 'tracking':
        return (
          <Card title={<span style={{ fontSize: 18, fontWeight: 'bold' }}>🕵️ 处置状态跟踪</span>}>
            <TrackingTable 
              dataSource={disposedData}
              loading={loading}
              onViewDetail={handleViewDetail}
              onUpdateTracking={handleUpdateTracking}
              onRevert={handleRevert}
            />
          </Card>
        );

      case 'logs':
        return (
          <Card title={<span style={{ fontSize: 18, fontWeight: 'bold' }}>📜 操作日志中心</span>}>
            <LogCenter />
          </Card>
        );

      case 'revenue':
        return (
          <RevenueCenter 
            revenueStats={revenueStats} 
            onViewDetail={handleViewDetail}
          />
        );

      case 'inventory':
        return (
          <InventoryCenter 
            bindOrders={getBindOrders ? getBindOrders() : []}
            // 库存快照相关
            inventorySnapshotInfo={inventorySnapshotInfo}
            inventoryVersionHistory={inventoryVersionHistory}
            hasInventoryChanges={hasInventoryChanges}
            onSaveSnapshot={handleSaveInventorySnapshot}
            onLoadSnapshot={handleLoadInventorySnapshot}
            onRestoreVersion={handleRestoreInventoryVersion}
            onDeleteVersion={handleDeleteInventoryVersion}
            onClearData={handleClearInventoryData}
            // SKU相关
            skuList={skuList}
            setSkuList={setSkuList}
            categories={categories}
            setCategories={setCategories}
            // ✅ 同步订单状态相关
            onSyncOrderStatus={handleSyncOrderStatus}
            onExecuteSync={handleExecuteSync}
            refreshFrozenStock={refreshFrozenStock}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ background: '#fff', padding: '0 24px', marginBottom: 24, boxShadow: '0 2px 8px #f0f1f2' }}>
        <Menu 
          mode="horizontal" 
          selectedKeys={[currentView]} 
          onClick={(e) => setCurrentView(e.key)}
          items={menuItems}
          style={{ borderBottom: 'none' }}
        />
      </div>

      <div style={{ padding: '0 24px 24px' }}>
        {renderContent()}
      </div>

      <DetailModal
        visible={showDetailModal}
        record={activeRecord}
        onCancel={() => setShowDetailModal && setShowDetailModal(false)}
      />

      <DisposeModal
        visible={showDisposeModal}
        record={activeRecord}
        onOk={handleSaveDispose}
        onCancel={() => setShowDisposeModal && setShowDisposeModal(false)}
      />
    </div>
  );
};

export default AssetDashboard;
