// src/pages/Team/Detail.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Divider,
  Tabs,
  Badge,
  Popconfirm,
  Tooltip,
  Alert,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  ArrowLeftOutlined,
  TrophyOutlined,
  TeamOutlined,
  DollarOutlined,
  WarningOutlined,
  RollbackOutlined,
  HistoryOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import request from '@/utils/request';

// 团队长等级配置
const RANK_CONFIG = {
  1: { name: '大众会员', color: '#999999' },
  2: { name: '普通团队', color: '#8B4513' },
  3: { name: '铜牌团长', color: '#CD7F32' },
  4: { name: '银牌团长', color: '#C0C0C0' },
  5: { name: '金牌团长', color: '#FFD700' },
  6: { name: '钻石团长', color: '#B9F2FF' },
};

export default function TeamLeaderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [leader, setLeader] = useState(null);
  const [directMembers, setDirectMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [rewardHistory, setRewardHistory] = useState([]);
  const [revokeModalVisible, setRevokeModalVisible] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [revokeForm] = Form.useForm();

  useEffect(() => {
    fetchLeaderDetail();
  }, [id]);

  const fetchLeaderDetail = async () => {
    setLoading(true);
    try {
      const res = await request(`/api/users/admin/team-leaders/${id}`);
      const json = await res.json();
      if (json.success) {
        setLeader(json.data.leader);
        setDirectMembers(json.data.directMembers || []);
      }
    } catch (e) {
      message.error('获取团队长详情失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchRewardHistory = async (memberId) => {
    setHistoryLoading(true);
    try {
      const res = await request(`/api/users/admin/team-members/${memberId}/reward-history`);
      const json = await res.json();
      if (json.success) {
        setRewardHistory(json.data);
      }
    } catch (e) {
      message.error('获取奖励历史失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleViewHistory = (member) => {
    setSelectedMember(member);
    setHistoryModalVisible(true);
    fetchRewardHistory(member._id);
  };

  const handleRevoke = async (values) => {
    if (!selectedMember) return;
    
    setRevokeLoading(true);
    try {
      const res = await request(`/api/users/admin/team-members/${selectedMember._id}/rewards`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: values.reason })
      });
      const json = await res.json();
      
      if (json.success) {
        message.success(`已撤回 ¥${json.data.revokedAmount} 奖励`);
        setRevokeModalVisible(false);
        setHistoryModalVisible(false);
        revokeForm.resetFields();
        fetchLeaderDetail();
      } else {
        message.error(json.message || '撤回失败');
      }
    } catch (e) {
      message.error('撤回失败');
    } finally {
      setRevokeLoading(false);
    }
  };

  const openRevokeModal = () => {
    setRevokeModalVisible(true);
  };

  const memberColumns = [
    {
      title: '用户',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#4364F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            fontWeight: 'bold'
          }}>
            {text?.charAt(0) || '小'}
          </div>
          <div>
            <div>{text || '小象用户'}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
          </div>
        </Space>
      )
    },
    {
      title: '实名状态',
      dataIndex: 'kycStatus',
      key: 'kycStatus',
      render: (status) => (
        <Tag color={status === 'Verified' ? 'green' : 'orange'}>
          {status === 'Verified' ? '已实名' : '未实名'}
        </Tag>
      )
    },
    {
      title: '有效状态',
      dataIndex: 'isValidMember',
      key: 'isValidMember',
      render: (valid) => (
        <Tag color={valid ? 'green' : 'default'}>
          {valid ? '有效' : '无效'}
        </Tag>
      )
    },
    {
      title: '订单数',
      dataIndex: 'personalOrderCount',
      key: 'personalOrderCount',
      render: (count) => `${count || 0}单`
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time) => new Date(time).toLocaleDateString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<HistoryOutlined />}
            onClick={() => handleViewHistory(record)}
          >
            奖励记录
          </Button>
        </Space>
      )
    }
  ];

  const rewardColumns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (time) => new Date(time).toLocaleString()
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text, record) => (
        <span style={{ 
          color: record.metadata?.revoked ? '#999' : 'inherit',
          textDecoration: record.metadata?.revoked ? 'line-through' : 'none'
        }}>
          {text}
        </span>
      )
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount, record) => (
        <span style={{ 
          color: record.metadata?.revoked ? '#999' : '#FF4D4F',
          textDecoration: record.metadata?.revoked ? 'line-through' : 'none',
          fontWeight: 'bold'
        }}>
          ¥{amount?.toFixed(2)}
        </span>
      )
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (_, record) => {
        if (record.metadata?.revoked) {
          return <Tag color="red">已撤回</Tag>;
        }
        if (record.description?.includes('[冻结]')) {
          return <Tag color="orange">冻结中</Tag>;
        }
        if (record.description?.includes('[解冻]')) {
          return <Tag color="green">已解冻</Tag>;
        }
        return <Tag color="blue">已发放</Tag>;
      }
    }
  ];

  if (loading) {
    return (
      <Card loading>
        <div style={{ height: 400 }} />
      </Card>
    );
  }

  if (!leader) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p>团队长不存在</p>
          <Button onClick={() => navigate(-1)}>返回</Button>
        </div>
      </Card>
    );
  }

  const currentRank = RANK_CONFIG[leader.agentRank || 1] || RANK_CONFIG[1];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            返回列表
          </Button>
        </div>

        <Descriptions title="团队长信息" bordered column={2}>
          <Descriptions.Item label="用户名">{leader.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{leader.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="等级">
            <Tag color={currentRank.color}>
              <TrophyOutlined style={{ marginRight: 4 }} />
              {currentRank.name}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="注册时间">
            {new Date(leader.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="直推有效人数">
            <Badge count={leader.validDirectCount || 0} showZero color="#52C41A" />
          </Descriptions.Item>
          <Descriptions.Item label="团队有效人数">
            <Badge count={leader.validTeamCount || 0} showZero color="#1890FF" />
          </Descriptions.Item>
          <Descriptions.Item label="团队订单数">
            {leader.teamOrderCount || 0}单
          </Descriptions.Item>
          <Descriptions.Item label="累计邀请收益">
            <span style={{ color: '#FF4D4F', fontWeight: 'bold' }}>
              ¥{leader.inviteEarnings?.totalFromInvite?.toFixed(2) || '0.00'}
            </span>
          </Descriptions.Item>
        </Descriptions>

        {/* 冻结奖励提示 */}
        {(leader.frozenEarnings || 0) > 0 && (
          <Alert
            style={{ marginTop: 16 }}
            type="warning"
            showIcon
            icon={<LockOutlined />}
            message={`有 ¥${leader.frozenEarnings?.toFixed(2)} 奖励因好友未实名而冻结`}
            description="好友完成实名认证后，冻结的奖励将自动解冻发放"
          />
        )}

        <Divider orientation="left">
          <TeamOutlined /> 直推好友列表 ({directMembers.length}人)
        </Divider>

        <Table
          columns={memberColumns}
          dataSource={directMembers}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 奖励历史弹窗 */}
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            <span>{selectedMember?.name || '好友'} - 奖励记录</span>
          </Space>
        }
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={
          <Space>
            <Button onClick={() => setHistoryModalVisible(false)}>关闭</Button>
            <Popconfirm
              title="确认撤回该好友的所有奖励？"
              description="此操作将从邀请人余额中扣除已发放的奖励，并重置该好友的订单进度"
              onConfirm={openRevokeModal}
              okText="确认"
              cancelText="取消"
            >
              <Button type="primary" danger icon={<RollbackOutlined />}>
                撤回奖励
              </Button>
            </Popconfirm>
          </Space>
        }
        width={800}
      >
        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : (
          <>
            {/* 统计信息 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Statistic
                  title="已发放奖励"
                  value={rewardHistory.totalRewarded || 0}
                  prefix="¥"
                  valueStyle={{ color: '#3F8600' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="冻结中"
                  value={rewardHistory.totalFrozen || 0}
                  prefix="¥"
                  valueStyle={{ color: '#FAAD14' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="已撤回"
                  value={rewardHistory.totalRevoked || 0}
                  prefix="¥"
                  valueStyle={{ color: '#FF4D4F' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="好友状态"
                  value={rewardHistory.friend?.isValidMember ? '有效' : '无效'}
                  valueStyle={{ 
                    color: rewardHistory.friend?.isValidMember ? '#52C41A' : '#999' 
                  }}
                />
              </Col>
            </Row>

            <Divider>奖励明细</Divider>

            <Table
              columns={rewardColumns}
              dataSource={rewardHistory.rewards || []}
              rowKey="_id"
              pagination={{ pageSize: 5 }}
              size="small"
            />

            {/* 冻结奖励列表 */}
            {(rewardHistory.frozenRewards?.length || 0) > 0 && (
              <>
                <Divider>冻结中的奖励</Divider>
                <Table
                  columns={[
                    { title: '描述', dataIndex: 'description' },
                    { 
                      title: '金额', 
                      dataIndex: 'amount',
                      render: (v) => <span style={{ color: '#FAAD14' }}>¥{v?.toFixed(2)}</span>
                    },
                    { 
                      title: '冻结原因', 
                      dataIndex: 'reason',
                      render: (v) => <Tag color="orange">{v}</Tag>
                    },
                    { 
                      title: '时间', 
                      dataIndex: 'createdAt',
                      render: (v) => new Date(v).toLocaleString()
                    }
                  ]}
                  dataSource={rewardHistory.frozenRewards || []}
                  rowKey={(r, i) => `frozen-${i}`}
                  pagination={false}
                  size="small"
                />
              </>
            )}
          </>
        )}
      </Modal>

      {/* 撤回确认弹窗 */}
      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: '#FF4D4F' }} />
            <span>撤回奖励确认</span>
          </Space>
        }
        open={revokeModalVisible}
        onCancel={() => setRevokeModalVisible(false)}
        footer={null}
      >
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="警告：此操作不可逆"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>将从邀请人余额中扣除已发放的奖励</li>
              <li>将重置该好友的订单进度为0</li>
              <li>将更新邀请人的团队统计数据</li>
            </ul>
          }
        />

        <Form form={revokeForm} onFinish={handleRevoke} layout="vertical">
          <Form.Item
            name="reason"
            label="撤回原因"
            rules={[{ required: true, message: '请填写撤回原因' }]}
          >
            <Input.TextArea 
              rows={3} 
              placeholder="请填写撤回原因，如：异常订单、作弊行为等" 
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setRevokeModalVisible(false)}>取消</Button>
              <Button type="primary" danger htmlType="submit" loading={revokeLoading}>
                确认撤回
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
