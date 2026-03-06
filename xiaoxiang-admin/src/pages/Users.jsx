import React, { useState, useEffect } from 'react';
import {
  Table, Card, Row, Col, Statistic, Input, Button, Tag, Drawer, Descriptions, message, Spin
} from 'antd';
import {
  UserOutlined, SafetyCertificateOutlined, CheckCircleOutlined, TeamOutlined,
  SearchOutlined, ReloadOutlined, ManOutlined, WomanOutlined
} from '@ant-design/icons';
import { request } from '../utils/request';

// 状态配置映射
const KYC_STATUS_CONFIG = {
  'Unverified': { label: '未认证', color: 'default' },
  'Pending': { label: '审核中', color: 'warning' },
  'Verified': { label: '已认证', color: 'success' },
  'Rejected': { label: '已驳回', color: 'error' }
};

const ROLE_CONFIG = {
  'user': { label: '普通用户', color: 'blue' },
  'admin': { label: '管理员', color: 'purple' },
  'superAdmin': { label: '超级管理员', color: 'red' }
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  // 抽屉相关
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // 获取用户列表
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 调用你原项目的接口
      const res = await request('/api/users/list');
      if (res.ok && res.data.success) {
        // 兼容不同的数据结构
        setUsers(res.data.data.users || res.data.data || []);
      } else {
        message.error(res.data.message || '获取用户列表失败');
      }
    } catch (e) {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 计算统计数据
  const getStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      todayNew: users.filter(u => new Date(u.createdAt) >= today).length,
      totalUsers: users.length,
      verifiedUsers: users.filter(u => u.kycStatus === 'Verified').length,
      activeUsers: users.filter(u => u.isActive !== false).length,
    };
  };

  const stats = getStats();

  // 过滤用户列表
  const filteredUsers = users.filter(u => {
    if (!searchText) return true;
    const keyword = searchText.toLowerCase();
    return (u.email && u.email.toLowerCase().includes(keyword)) ||
           (u.name && u.name.toLowerCase().includes(keyword));
  });

  // 表格列定义
  const columns = [
    {
      title: '用户',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, backgroundColor: '#f0f2f5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10,
            color: '#4364F7', fontWeight: 'bold'
          }}>
            {(text || record.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{text || '未设置姓名'}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const config = ROLE_CONFIG[role] || ROLE_CONFIG['user'];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '余额',
      dataIndex: 'balance',
      key: 'balance',
      render: (val) => <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>¥{(val || 0).toFixed(2)}</span>,
    },
    {
      title: '实名状态',
      dataIndex: 'kycStatus',
      key: 'kycStatus',
      render: (status) => {
        const config = KYC_STATUS_CONFIG[status] || KYC_STATUS_CONFIG['Unverified'];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="link" onClick={() => { setCurrentUser(record); setDrawerOpen(true); }}>
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* 统计卡片区域 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="今日新增" value={stats.todayNew} prefix={<UserOutlined />} valueStyle={{ color: '#4CAF50' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="平台总人数" value={stats.totalUsers} prefix={<TeamOutlined />} valueStyle={{ color: '#4364F7' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已实名" value={stats.verifiedUsers} prefix={<SafetyCertificateOutlined />} valueStyle={{ color: '#FF9800' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="活跃用户" value={stats.activeUsers} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#9C27B0' }} />
          </Card>
        </Col>
      </Row>

      {/* 搜索栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索用户邮箱/姓名..."
          allowClear
          enterButton="搜索"
          size="large"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 400, marginRight: 16 }}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading}>
          刷新数据
        </Button>
      </Card>

      {/* 用户列表表格 */}
      <Card title={`用户列表 (共 ${filteredUsers.length} 人)`}>
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey={(record) => record._id || record.id}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 用户详情抽屉 (替代原来的 Modal) */}
      <Drawer
        title="用户详情"
        placement="right"
        size="large"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        {currentUser && (
          <div>
            {/* 用户头部信息 */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20, backgroundColor: '#E8F0FE',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto', fontSize: 26, fontWeight: 'bold', color: '#4364F7'
              }}>
                {(currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase()}
              </div>
              <h2 style={{ marginTop: 12, marginBottom: 4 }}>{currentUser.name || '未设置姓名'}</h2>
              <Tag color={ROLE_CONFIG[currentUser.role]?.color || 'blue'}>
                {ROLE_CONFIG[currentUser.role]?.label || '普通用户'}
              </Tag>
            </div>

            {/* 详细信息分组 */}
            <Descriptions title="基本信息" bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="用户ID">{(currentUser.id || currentUser._id)?.substring(0, 24)}...</Descriptions.Item>
              <Descriptions.Item label="邮箱">{currentUser.email}</Descriptions.Item>
              <Descriptions.Item label="手机">{currentUser.phone || '-'}</Descriptions.Item>
            </Descriptions>

            <Descriptions title="资产信息" bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="余额">¥{(currentUser.balance || 0).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="保证金">¥{(currentUser.deposit || 0).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="积分">{(currentUser.points || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="小象币">{(currentUser.coins || 0).toLocaleString()}</Descriptions.Item>
            </Descriptions>

            <Descriptions title="等级与信誉" bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="等级">{currentUser.level || 'Lv1'}</Descriptions.Item>
              <Descriptions.Item label="信誉分">
                <span style={{ color: (currentUser.creditScore ?? 100) >= 60 ? 'green' : 'red' }}>
                  {currentUser.creditScore ?? 100}
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Descriptions title="实名认证" bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="状态">
                <Tag color={KYC_STATUS_CONFIG[currentUser.kycStatus]?.color}>
                  {KYC_STATUS_CONFIG[currentUser.kycStatus]?.label || '未认证'}
                </Tag>
              </Descriptions.Item>
              {currentUser.idCard && (
                <Descriptions.Item label="身份证">
                  {currentUser.idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Descriptions title="账户状态" bordered column={1} size="small">
              <Descriptions.Item label="状态">
                <Tag color={currentUser.isActive !== false ? 'success' : 'error'}>
                  {currentUser.isActive !== false ? '正常' : '已禁用'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleString('zh-CN') : '-'}
              </Descriptions.Item>
            </Descriptions>

            {/* 操作按钮 */}
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Button type="primary" style={{ marginRight: 8 }}>编辑用户</Button>
              <Button danger>禁用账户</Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
