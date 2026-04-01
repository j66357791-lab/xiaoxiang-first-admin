import React, { useState, useEffect } from 'react';
import {
  Card, Table, Tabs, Button, Image, Tag, Space, Modal, Descriptions,
  message, Badge, Input, Row, Col, Statistic, Tooltip, Alert, Typography, Popconfirm,
  Select, Divider
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, WarningOutlined,
  EyeOutlined, SafetyCertificateOutlined,
  UserOutlined, IdcardOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  RollbackOutlined, SyncOutlined
} from '@ant-design/icons';
import { request } from '../utils/request';

const { Text } = Typography;
const { Option } = Select;

export default function KYC() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('Pending');
  const [searchText, setSearchText] = useState('');
  const [verifyFilter, setVerifyFilter] = useState('all');
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [reverifyLoading, setReverifyLoading] = useState(false);

  // 状态配置
  const STATUS_CONFIG = {
    'Pending': { label: '待审批', color: 'warning', badge: 'warning' },
    'Verified': { label: '已通过', color: 'success', badge: 'success' },
    'Rejected': { label: '已拒绝', color: 'error', badge: 'error' },
  };

  // 获取用户列表
  const fetchUsers = async () => {
    console.log('========== [KYC] 开始获取用户列表 ==========');
    setLoading(true);
    try {
      const res = await request('/api/users/list?limit=100');
      console.log('[KYC] API 原始响应:', res);
      console.log('[KYC] res.success:', res?.success);
      console.log('[KYC] res.data 类型:', typeof res?.data, Array.isArray(res?.data));
      
      let userList = [];
      if (res.success && Array.isArray(res.data)) {
        userList = res.data;
        console.log('[KYC] 使用 res.data (数组)');
      } else if (res.data?.users) {
        userList = res.data.users;
        console.log('[KYC] 使用 res.data.users');
      } else if (res.data?.data?.users) {
        userList = res.data.data.users;
        console.log('[KYC] 使用 res.data.data.users');
      } else if (Array.isArray(res)) {
        userList = res;
        console.log('[KYC] 使用 res (数组)');
      }
      
      console.log('[KYC] 解析出的用户列表数量:', userList.length);
      
      if (userList.length > 0) {
        console.log('[KYC] 第一个用户数据示例:', JSON.stringify(userList[0], null, 2));
      }
      
      // 过滤出有 KYC 信息的用户
      const kycUsers = userList.filter(u => {
        const hasKyc = u.kycStatus !== 'Unverified' || u.idCard || u.realName;
        return hasKyc;
      });
      
      console.log('[KYC] 过滤后的 KYC 用户数量:', kycUsers.length);
      console.log('[KYC] KYC 用户状态分布:', {
        Pending: kycUsers.filter(u => u.kycStatus === 'Pending').length,
        Verified: kycUsers.filter(u => u.kycStatus === 'Verified').length,
        Rejected: kycUsers.filter(u => u.kycStatus === 'Rejected').length,
        Unverified: kycUsers.filter(u => u.kycStatus === 'Unverified').length,
        无状态: kycUsers.filter(u => !u.kycStatus).length,
      });
      
      setUsers(kycUsers);
    } catch (e) {
      console.error('[KYC] 请求异常:', e);
      console.error('[KYC] 异常堆栈:', e.stack);
      message.error('获取数据失败: ' + e.message);
    } finally {
      setLoading(false);
      console.log('========== [KYC] 获取用户列表结束 ==========');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 过滤用户
  const getFilteredUsers = () => {
    console.log('[KYC] 开始过滤用户, activeTab:', activeTab, 'searchText:', searchText, 'verifyFilter:', verifyFilter);
    
    const filtered = users.filter(u => {
      const matchStatus = u.kycStatus === activeTab;
      const matchSearch = !searchText || 
        (u.realName && u.realName.includes(searchText)) ||
        (u.name && u.name.includes(searchText)) ||
        (u.email && u.email.includes(searchText));
      
      let matchVerify = true;
      if (verifyFilter === 'verified') {
        matchVerify = !!u.realName;
      } else if (verifyFilter === 'failed') {
        matchVerify = !!u.abnormalReason && !u.realName;
      }
      
      return matchStatus && matchSearch && matchVerify;
    });
    
    console.log('[KYC] 过滤后用户数量:', filtered.length);
    return filtered;
  };

  // 统计
  const getStats = () => ({
    pending: users.filter(u => u.kycStatus === 'Pending').length,
    verified: users.filter(u => u.kycStatus === 'Verified').length,
    rejected: users.filter(u => u.kycStatus === 'Rejected').length,
    thirdPartyVerified: users.filter(u => u.realName).length,
    thirdPartyFailed: users.filter(u => u.abnormalReason && !u.realName).length,
  });

  // 审核操作
  const handleAudit = async (userId, status) => {
    console.log('========== [KYC] 开始审核操作 ==========');
    console.log('[KYC] userId:', userId, '类型:', typeof userId);
    console.log('[KYC] status:', status);
    
    if (!userId) {
      console.error('[KYC] 用户ID为空!');
      message.error('用户ID不存在');
      return;
    }
    
    try {
      const url = `/api/users/${userId}/kyc`;
      console.log('[KYC] 请求URL:', url);
      console.log('[KYC] 请求方法: PATCH');
      console.log('[KYC] 请求体:', JSON.stringify({ status }));
      
      const res = await request(url, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      
      console.log('[KYC] 审核响应:', res);
      
      if (res.success || res.data?.success) {
        message.success(status === 'Verified' ? '审核通过' : status === 'Rejected' ? '已拒绝' : '已打回重审');
        setDetailVisible(false);
        fetchUsers();
      } else {
        console.error('[KYC] 审核失败:', res);
        message.error(res.message || res.data?.message || '操作失败');
      }
    } catch (e) {
      console.error('[KYC] 审核异常:', e);
      message.error('操作失败: ' + e.message);
    }
    console.log('========== [KYC] 审核操作结束 ==========');
  };

  // 再次核验
  const handleReverify = async (user) => {
    console.log('========== [KYC] 开始重新核验 ==========');
    console.log('[KYC] user:', user);
    console.log('[KYC] user.id:', user?.id, '类型:', typeof user?.id);
    
    if (!user?.id) {
      console.error('[KYC] 用户ID为空!');
      message.error('用户ID不存在');
      return;
    }
    
    setReverifyLoading(true);
    try {
      const url = `/api/users/${user.id}/kyc/reverify`;
      console.log('[KYC] 请求URL:', url);
      console.log('[KYC] 请求方法: POST');
      
      const res = await request(url, {
        method: 'POST',
      });
      
      console.log('[KYC] 重新核验响应:', res);
      
      if (res.success || res.data?.success) {
        message.success('已重新核验');
        setDetailVisible(false);
        fetchUsers();
      } else {
        console.error('[KYC] 核验失败:', res);
        message.error(res.message || res.data?.message || '核验失败');
      }
    } catch (e) {
      console.error('[KYC] 核验异常:', e);
      message.error('核验失败: ' + e.message);
    } finally {
      setReverifyLoading(false);
    }
    console.log('========== [KYC] 重新核验结束 ==========');
  };

  // 获取图片URL
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    let cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `https://xiaoxiang.zeabur.app${cleanPath}`;
  };

  // 打开详情
  const openDetail = (user) => {
    console.log('[KYC] 打开详情, user:', user);
    console.log('[KYC] user.id:', user.id);
    console.log('[KYC] user.kycStatus:', user.kycStatus);
    console.log('[KYC] user.realName:', user.realName);
    console.log('[KYC] user.abnormalReason:', user.abnormalReason);
    
    setSelectedUser(user);
    setDetailVisible(true);
  };

  // 表格列
  const columns = [
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            <UserOutlined style={{ marginRight: 6, color: '#4364F7' }} />
            {record.realName || record.name || '未设置'}
          </div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{record.email}</div>
        </div>
      ),
    },
    {
      title: '身份证号',
      dataIndex: 'idCard',
      key: 'idCard',
      render: (id) => id ? (
        <span>
          <IdcardOutlined style={{ marginRight: 6, color: '#666' }} />
          {id.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')}
        </span>
      ) : (
        <span style={{ color: '#999' }}>未填写</span>
      ),
    },
    {
      title: '第三方核验',
      key: 'verify',
      render: (_, record) => {
        if (record.realName) {
          return <Tag icon={<SafetyCertificateOutlined />} color="success">核验通过</Tag>;
        }
        if (record.abnormalReason) {
          return (
            <Tooltip title={record.abnormalReason}>
              <Tag icon={<ExclamationCircleOutlined />} color="error">核验失败</Tag>
            </Tooltip>
          );
        }
        if (record.kycStatus === 'Verified' && !record.realName) {
          return (
            <Tooltip title="旧数据，未经过第三方核验">
              <Tag icon={<ClockCircleOutlined />} color="default">未核验(旧)</Tag>
            </Tooltip>
          );
        }
        return <Tag icon={<ClockCircleOutlined />} color="warning">待核验</Tag>;
      },
    },
    {
      title: '身份证照片',
      key: 'images',
      render: (_, record) => {
        const frontUrl = getImageUrl(record.idCardFront);
        const backUrl = getImageUrl(record.idCardBack);
        
        if (!frontUrl && !backUrl) {
          return <span style={{ color: '#999' }}>无照片</span>;
        }
        
        return (
          <Space>
            {frontUrl ? (
              <Image src={frontUrl} width={60} height={40} style={{ borderRadius: 4, objectFit: 'cover' }} placeholder />
            ) : (
              <div style={{ width: 60, height: 40, background: '#f5f5f5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#999' }}>无</div>
            )}
            {backUrl ? (
              <Image src={backUrl} width={60} height={40} style={{ borderRadius: 4, objectFit: 'cover' }} placeholder />
            ) : (
              <div style={{ width: 60, height: 40, background: '#f5f5f5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#999' }}>无</div>
            )}
          </Space>
        );
      },
    },
    {
      title: '提交时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (time) => time ? new Date(time).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>详情</Button>
          {activeTab === 'Pending' && (
            <>
              <Button type="primary" size="small" onClick={() => handleAudit(record.id, 'Verified')}>通过</Button>
              <Button danger size="small" onClick={() => handleAudit(record.id, 'Rejected')}>拒绝</Button>
            </>
          )}
          {activeTab === 'Verified' && (
            <Popconfirm title="确认打回重审？" onConfirm={() => handleAudit(record.id, 'Pending')} okText="确认" cancelText="取消">
              <Button size="small" icon={<RollbackOutlined />} style={{ color: '#faad14', borderColor: '#faad14' }}>打回</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const stats = getStats();

  const tabItems = Object.keys(STATUS_CONFIG).map(key => ({
    key,
    label: (
      <span>
        <Badge status={STATUS_CONFIG[key].badge} />
        {STATUS_CONFIG[key].label}
        <span style={{ marginLeft: 8, color: '#999' }}>
          ({key === 'Pending' ? stats.pending : key === 'Verified' ? stats.verified : stats.rejected})
        </span>
      </span>
    ),
  }));

  return (
    <div>
      <Alert
        message="实名认证管理"
        description={
          <div>
            <p>• 新提交的认证会自动调用聚合数据API核验姓名与身份证号</p>
            <p>• 第三方核验通过：{stats.thirdPartyVerified} 人 | 核验失败：{stats.thirdPartyFailed} 人</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card><Statistic title="待审批" value={stats.pending} styles={{ content: { color: '#faad14' } }} prefix={<WarningOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="已通过" value={stats.verified} styles={{ content: { color: '#52c41a' } }} prefix={<CheckCircleOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="已拒绝" value={stats.rejected} styles={{ content: { color: '#ff4d4f' } }} prefix={<CloseCircleOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="第三方核验通过" value={stats.thirdPartyVerified} styles={{ content: { color: '#52c41a' } }} prefix={<SafetyCertificateOutlined />} /></Card>
        </Col>
      </Row>

      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          items={tabItems}
          tabBarExtraContent={
            <Space>
              <Select value={verifyFilter} onChange={setVerifyFilter} style={{ width: 140 }}>
                <Option value="all">全部核验状态</Option>
                <Option value="verified">核验通过</Option>
                <Option value="failed">核验失败</Option>
              </Select>
              <Input.Search placeholder="搜索姓名/邮箱" style={{ width: 200 }} onSearch={setSearchText} allowClear />
            </Space>
          }
        />

        <Table 
          dataSource={getFilteredUsers()} 
          columns={columns} 
          rowKey={(record) => record.id || record.id} 
          loading={loading} 
          pagination={{ pageSize: 10 }} 
        />
      </Card>

      <Modal
        title="实名认证详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {selectedUser && (
          <div>
            {/* 调试信息 */}
            <Alert
              message="调试信息"
              description={
                <div style={{ fontSize: 12 }}>
                  <p>ID: {selectedUser.id}</p>
                  <p>kycStatus: {selectedUser.kycStatus}</p>
                  <p>realName: {selectedUser.realName || '无'}</p>
                  <p>abnormalReason: {selectedUser.abnormalReason || '无'}</p>
                </div>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />

            {/* 第三方核验结果 */}
            {selectedUser.realName ? (
              <Alert
                message="第三方核验通过"
                description={`姓名「${selectedUser.realName}」与身份证号匹配`}
                type="success"
                showIcon
                icon={<SafetyCertificateOutlined />}
                style={{ marginBottom: 16 }}
              />
            ) : selectedUser.abnormalReason ? (
              <Alert
                message="第三方核验失败"
                description={selectedUser.abnormalReason}
                type="error"
                showIcon
                icon={<ExclamationCircleOutlined />}
                style={{ marginBottom: 16 }}
                action={
                  <Button size="small" type="primary" ghost onClick={() => handleReverify(selectedUser)} loading={reverifyLoading}>
                    重新核验
                  </Button>
                }
              />
            ) : selectedUser.kycStatus === 'Verified' ? (
              <Alert
                message="旧数据 - 未经过第三方核验"
                description="该用户是在接入第三方核验之前通过的实名认证"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                action={
                  <Button size="small" type="primary" ghost onClick={() => handleReverify(selectedUser)} loading={reverifyLoading}>
                    补充核验
                  </Button>
                }
              />
            ) : null}

            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="真实姓名">{selectedUser.realName || selectedUser.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{selectedUser.email}</Descriptions.Item>
              <Descriptions.Item label="身份证号" span={2}>{selectedUser.idCard || '未填写'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_CONFIG[selectedUser.kycStatus]?.color}>{STATUS_CONFIG[selectedUser.kycStatus]?.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">{selectedUser.updatedAt ? new Date(selectedUser.updatedAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
              {selectedUser.abnormalReason && (
                <Descriptions.Item label="失败原因" span={2}>
                  <Text type="danger">{selectedUser.abnormalReason}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
            
            <Divider>身份证照片</Divider>
            
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>人像面</div>
                {selectedUser.idCardFront ? (
                  <Image src={getImageUrl(selectedUser.idCardFront)} width="100%" height={150} style={{ borderRadius: 8, objectFit: 'cover' }} />
                ) : (
                  <div style={{ height: 150, background: '#f5f5f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>暂无图片</div>
                )}
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>国徽面</div>
                {selectedUser.idCardBack ? (
                  <Image src={getImageUrl(selectedUser.idCardBack)} width="100%" height={150} style={{ borderRadius: 8, objectFit: 'cover' }} />
                ) : (
                  <div style={{ height: 150, background: '#f5f5f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>暂无图片</div>
                )}
              </Col>
            </Row>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Space>
                {selectedUser.kycStatus === 'Pending' && (
                  <>
                    <Button type="primary" size="large" onClick={() => handleAudit(selectedUser.id, 'Verified')}>审核通过</Button>
                    <Button danger size="large" onClick={() => handleAudit(selectedUser.id, 'Rejected')}>拒绝申请</Button>
                  </>
                )}
                {selectedUser.kycStatus === 'Verified' && (
                  <Popconfirm title="确认打回重审？" onConfirm={() => handleAudit(selectedUser.id, 'Pending')} okText="确认" cancelText="取消">
                    <Button size="large" icon={<RollbackOutlined />} style={{ color: '#faad14', borderColor: '#faad14' }}>打回重审</Button>
                  </Popconfirm>
                )}
                {!selectedUser.realName && (
                  <Button size="large" icon={<SyncOutlined />} onClick={() => handleReverify(selectedUser)} loading={reverifyLoading}>重新核验</Button>
                )}
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
