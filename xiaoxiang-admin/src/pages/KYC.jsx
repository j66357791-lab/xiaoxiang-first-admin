import React, { useState, useEffect } from 'react';
import {
  Card, Table, Tabs, Button, Image, Tag, Space, Modal, Descriptions,
  message, Badge, Input, Row, Col, Statistic, Tooltip
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, WarningOutlined,
  EyeOutlined, CopyOutlined, LinkOutlined
} from '@ant-design/icons';
import { request } from '../utils/request';

export default function KYC() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('Pending');
  const [searchText, setSearchText] = useState('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // 状态配置
  const STATUS_CONFIG = {
    'Pending': { label: '待审批', color: 'warning' },
    'Verified': { label: '已通过', color: 'success' },
    'Rejected': { label: '已拒绝', color: 'error' },
  };

  // 获取用户列表
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await request('/api/users/list');
      if (res.ok && res.data.success) {
        setUsers(res.data.data.users || res.data.data || []);
      }
    } catch (e) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 过滤用户
  const getFilteredUsers = () => {
    return users.filter(u => {
      const matchStatus = u.kycStatus === activeTab;
      const matchSearch = !searchText || 
        (u.name && u.name.includes(searchText)) ||
        (u.email && u.email.includes(searchText));
      return matchStatus && matchSearch && u.idCard;
    });
  };

  // 统计
  const getStats = () => ({
    pending: users.filter(u => u.kycStatus === 'Pending' && u.idCard).length,
    verified: users.filter(u => u.kycStatus === 'Verified').length,
    rejected: users.filter(u => u.kycStatus === 'Rejected').length,
  });

  // 审核操作
  const handleAudit = async (userId, status) => {
    try {
      const res = await request(`/api/users/${userId}/kyc`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      
      if (res.ok && res.data.success) {
        message.success(status === 'Verified' ? '审核通过' : '已拒绝');
        fetchUsers();
      } else {
        message.error(res.data.message || '操作失败');
      }
    } catch (e) {
      message.error('操作失败');
    }
  };

  // 获取图片URL - 修复版本
  const getImageUrl = (path) => {
    if (!path) return null;
    
    // 如果已经是完整URL
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    
    // 处理路径拼接
    let cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    return `https://xiaoxiang.zeabur.app${cleanPath}`;
  };

  // 打开详情
  const openDetail = (user) => {
    setSelectedUser(user);
    setDetailVisible(true);
  };

  // 复制链接
  const copyImageUrl = (path) => {
    const url = getImageUrl(path);
    if (url) {
      navigator.clipboard.writeText(url);
      message.success('链接已复制');
    }
  };

  // 表格列
  const columns = [
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name || '未设置'}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
        </div>
      ),
    },
    {
      title: '身份证号',
      dataIndex: 'idCard',
      key: 'idCard',
      render: (id) => id?.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2'),
    },
    {
      title: '身份证照片',
      key: 'images',
      render: (_, record) => {
        const frontUrl = getImageUrl(record.idCardFront);
        const backUrl = getImageUrl(record.idCardBack);
        
        return (
          <Space>
            {frontUrl ? (
              <Tooltip title="点击查看大图">
                <Image
                  src={frontUrl}
                  width={60}
                  height={40}
                  style={{ borderRadius: 4, objectFit: 'cover', cursor: 'pointer' }}
                  placeholder
                  fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                  onError={(e) => {
                    console.error('图片加载失败:', frontUrl);
                  }}
                />
              </Tooltip>
            ) : (
              <div style={{ 
                width: 60, 
                height: 40, 
                background: '#f5f5f5', 
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: '#999'
              }}>
                无正面
              </div>
            )}
            {backUrl ? (
              <Tooltip title="点击查看大图">
                <Image
                  src={backUrl}
                  width={60}
                  height={40}
                  style={{ borderRadius: 4, objectFit: 'cover', cursor: 'pointer' }}
                  placeholder
                  fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                  onError={(e) => {
                    console.error('图片加载失败:', backUrl);
                  }}
                />
              </Tooltip>
            ) : (
              <div style={{ 
                width: 60, 
                height: 40, 
                background: '#f5f5f5', 
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: '#999'
              }}>
                无背面
              </div>
            )}
          </Space>
        );
      },
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          {activeTab === 'Pending' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleAudit(record._id, 'Verified')}
              >
                通过
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => handleAudit(record._id, 'Rejected')}
              >
                拒绝
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const stats = getStats();

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="待审批"
              value={stats.pending}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="已通过"
              value={stats.verified}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="已拒绝"
              value={stats.rejected}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 主内容 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            <Input.Search
              placeholder="搜索姓名/邮箱"
              style={{ width: 200 }}
              onSearch={setSearchText}
              allowClear
            />
          }
        >
          {Object.keys(STATUS_CONFIG).map(key => (
            <Tabs.TabPane
              tab={
                <span>
                  <Badge status={STATUS_CONFIG[key].color} />
                  {STATUS_CONFIG[key].label}
                  <span style={{ marginLeft: 8, color: '#999' }}>
                    ({key === 'Pending' ? stats.pending : key === 'Verified' ? stats.verified : stats.rejected})
                  </span>
                </span>
              }
              key={key}
            />
          ))}
        </Tabs>

        <Table
          dataSource={getFilteredUsers()}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title="实名认证详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {selectedUser && (
          <div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="姓名">{selectedUser.name}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{selectedUser.email}</Descriptions.Item>
              <Descriptions.Item label="身份证号" span={2}>
                {selectedUser.idCard}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_CONFIG[selectedUser.kycStatus]?.color}>
                  {STATUS_CONFIG[selectedUser.kycStatus]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">
                {new Date(selectedUser.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>
            
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>身份证照片</div>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
                    人像面
                    {selectedUser.idCardFront && (
                      <Button 
                        type="link" 
                        size="small" 
                        icon={<LinkOutlined />}
                        onClick={() => copyImageUrl(selectedUser.idCardFront)}
                      >
                        复制链接
                      </Button>
                    )}
                  </div>
                  {selectedUser.idCardFront ? (
                    <Image
                      src={getImageUrl(selectedUser.idCardFront)}
                      width="100%"
                      height={150}
                      style={{ borderRadius: 8, objectFit: 'cover' }}
                      fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                    />
                  ) : (
                    <div style={{ 
                      height: 150, 
                      background: '#f5f5f5', 
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#999'
                    }}>
                      暂无图片
                    </div>
                  )}
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
                    国徽面
                    {selectedUser.idCardBack && (
                      <Button 
                        type="link" 
                        size="small" 
                        icon={<LinkOutlined />}
                        onClick={() => copyImageUrl(selectedUser.idCardBack)}
                      >
                        复制链接
                      </Button>
                    )}
                  </div>
                  {selectedUser.idCardBack ? (
                    <Image
                      src={getImageUrl(selectedUser.idCardBack)}
                      width="100%"
                      height={150}
                      style={{ borderRadius: 8, objectFit: 'cover' }}
                      fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                    />
                  ) : (
                    <div style={{ 
                      height: 150, 
                      background: '#f5f5f5', 
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#999'
                    }}>
                      暂无图片
                    </div>
                  )}
                </Col>
              </Row>
            </div>

            {selectedUser.kycStatus === 'Pending' && (
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Space>
                  <Button
                    type="primary"
                    size="large"
                    icon={<CheckCircleOutlined />}
                    onClick={() => {
                      handleAudit(selectedUser._id, 'Verified');
                      setDetailVisible(false);
                    }}
                  >
                    审核通过
                  </Button>
                  <Button
                    danger
                    size="large"
                    icon={<CloseCircleOutlined />}
                    onClick={() => {
                      handleAudit(selectedUser._id, 'Rejected');
                      setDetailVisible(false);
                    }}
                  >
                    拒绝申请
                  </Button>
                </Space>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
