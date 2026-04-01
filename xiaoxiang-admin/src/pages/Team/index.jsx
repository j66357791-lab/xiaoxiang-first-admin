// src/pages/Team/index.jsx
// 团队长管理 - 列表页
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  message,
} from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  TrophyOutlined,
  DollarOutlined,
  SearchOutlined,
  EyeOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;

// ✅ 团队长等级配置 - 等级从 1-6
const RANK_CONFIG = {
  1: { name: '大众会员', color: '#999999', needTeamValid: 0, needDirectValid: 0, needTeamOrders: 0, perOrderBonus: 0 },
  2: { name: '普通团队', color: '#8B4513', needTeamValid: 20, needDirectValid: 0, needTeamOrders: 100, perOrderBonus: 0.1 },
  3: { name: '铜牌团长', color: '#CD7F32', needTeamValid: 200, needDirectValid: 100, needTeamOrders: 500, perOrderBonus: 0.5 },
  4: { name: '银牌团长', color: '#C0C0C0', needTeamValid: 500, needDirectValid: 300, needTeamOrders: 1000, perOrderBonus: 1.0 },
  5: { name: '金牌团长', color: '#FFD700', needTeamValid: 2000, needDirectValid: 800, needTeamOrders: 5000, perOrderBonus: 1.5, weeklyBonusRate: 0.001, monthlyBonusRate: 0.002 },
  6: { name: '钻石团长', color: '#B9F2FF', needTeamValid: 8000, needDirectValid: 2000, needTeamOrders: 20000, perOrderBonus: 3.0, weeklyBonusRate: 0.002, monthlyBonusRate: 0.008 },
};

export default function TeamList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchParams, setSearchParams] = useState({ keyword: '', rank: null });
  
  // 升降级弹窗
  const [rankModalVisible, setRankModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [rankForm] = Form.useForm();

  // 获取团队长列表
  const fetchTeamLeaders = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const token = userData.token;
      
      const params = new URLSearchParams({
        page,
        limit: pageSize,
        ...(searchParams.keyword && { keyword: searchParams.keyword }),
        ...(searchParams.rank !== null && searchParams.rank !== undefined && { rank: searchParams.rank }),
      });

      const res = await fetch(`https://xiaoxiang.zeabur.app/api/users/admin/team-leaders?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await res.json();

      if (json.success) {
        setDataSource(json.data.leaders || []);
        setPagination({
          current: json.data.page,
          pageSize: json.data.limit,
          total: json.data.total,
        });
      }
    } catch (e) {
      console.error('获取团队长列表失败:', e);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamLeaders();
  }, [searchParams]);

  // 搜索
  const handleSearch = (value) => {
    setSearchParams({ ...searchParams, keyword: value });
  };

  // 等级筛选
  const handleRankFilter = (value) => {
    setSearchParams({ ...searchParams, rank: value });
  };

  // 查看详情
  const handleViewDetail = (record) => {
    const userId = record._id || record.id;
    if (!userId) {
      message.error('用户ID不存在');
      return;
    }
    navigate(`/team/${userId}`);
  };

  // 打开升降级弹窗
  const openRankModal = (record, isUpgrade) => {
    const userId = record._id || record.id;
    if (!userId) {
      message.error('用户ID不存在');
      return;
    }
    
    // ✅ 默认等级为 1
    const currentRank = record.agentRank || 1;
    
    setCurrentUser({ 
      ...record, 
      _id: userId,
      agentRank: currentRank,
      isUpgrade 
    });
    rankForm.setFieldsValue({
      newRank: isUpgrade ? currentRank + 1 : Math.max(1, currentRank - 1),
      reason: '',
    });
    setRankModalVisible(true);
  };

  // 提交升降级
  const handleRankChange = async (values) => {
    if (!currentUser || !currentUser._id) {
      message.error('用户信息不完整');
      return;
    }

    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const token = userData.token;
      
      const url = currentUser.isUpgrade
        ? `https://xiaoxiang.zeabur.app/api/users/admin/team-leaders/${currentUser._id}/upgrade`
        : `https://xiaoxiang.zeabur.app/api/users/admin/team-leaders/${currentUser._id}/downgrade`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      const json = await res.json();

      if (json.success) {
        message.success(currentUser.isUpgrade ? '升级成功' : '降级成功');
        setRankModalVisible(false);
        fetchTeamLeaders(pagination.current, pagination.pageSize);
      } else {
        message.error(json.message || '操作失败');
      }
    } catch (e) {
      console.error('升降级失败:', e);
      message.error('操作失败');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '用户信息',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text, record) => (
        <Space>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#4364F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
          }}>
            {text?.charAt(0) || '小'}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{text || '小象用户'}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '团长等级',
      dataIndex: 'agentRank',
      key: 'agentRank',
      width: 120,
      render: (rank) => {
        // ✅ 默认等级为 1
        const config = RANK_CONFIG[rank || 1];
        return (
          <Tag color={config.color} style={{ fontWeight: 500 }}>
            <TrophyOutlined style={{ marginRight: 4 }} />
            {config.name}
          </Tag>
        );
      },
    },
    {
      title: '团队数据',
      key: 'teamData',
      width: 300,
      render: (_, record) => {
        const agentRank = record.agentRank || 1;
        const config = RANK_CONFIG[agentRank];
        const nextConfig = RANK_CONFIG[agentRank + 1];
        
        return (
          <div style={{ fontSize: 12 }}>
            <div style={{ marginBottom: 4 }}>
              <TeamOutlined style={{ marginRight: 4, color: '#4364F7' }} />
              团队有效好友：<b>{record.validTeamCount || 0}</b>人
              {nextConfig && <span style={{ color: '#999' }}> / {nextConfig.needTeamValid}</span>}
            </div>
            <div style={{ marginBottom: 4 }}>
              <UserOutlined style={{ marginRight: 4, color: '#52C41A' }} />
              直推有效好友：<b>{record.validDirectCount || 0}</b>人
              {nextConfig && nextConfig.needDirectValid > 0 && <span style={{ color: '#999' }}> / {nextConfig.needDirectValid}</span>}
            </div>
            <div>
              <DollarOutlined style={{ marginRight: 4, color: '#FAAD14' }} />
              团队有效订单：<b>{record.teamOrderCount || 0}</b>单
              {nextConfig && <span style={{ color: '#999' }}> / {nextConfig.needTeamOrders}</span>}
            </div>
          </div>
        );
      },
    },
    {
      title: '邀请收益',
      key: 'earnings',
      width: 150,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>总收益：<b style={{ color: '#FF4D4F' }}>¥{record.inviteEarnings?.totalFromInvite || 0}</b></div>
          <div style={{ color: '#999' }}>首单奖金：¥{record.inviteEarnings?.firstOrderBonus || 0}</div>
          <div style={{ color: '#999' }}>分润收益：¥{record.inviteEarnings?.commissionEarned || 0}</div>
        </div>
      ),
    },
    {
      title: '业绩奖励',
      key: 'performanceRewards',
      width: 150,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>周奖励：¥{record.performanceRewards?.weeklyTotal || 0}</div>
          <div>月奖励：¥{record.performanceRewards?.monthlyTotal || 0}</div>
          <div>年奖励：¥{record.performanceRewards?.yearlyTotal || 0}</div>
        </div>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => {
        const userId = record._id || record.id;
        // ✅ 默认等级为 1
        const agentRank = record.agentRank || 1;
        return (
          <Space>
            <Button type="link" size="small" onClick={() => handleViewDetail(record)}>
              <EyeOutlined /> 详情
            </Button>
            {/* ✅ 最高级是6，小于6才能升级 */}
            {agentRank < 6 && (
              <Button type="link" size="small" onClick={() => openRankModal(record, true)}>
                <ArrowUpOutlined /> 升级
              </Button>
            )}
            {/* ✅ 最低级是1，大于1才能降级 */}
            {agentRank > 1 && (
              <Button type="link" size="small" danger onClick={() => openRankModal(record, false)}>
                <ArrowDownOutlined /> 降级
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      {/* 统计卡片 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Card style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#4364F7' }}>
              {pagination.total}
            </div>
            <div style={{ color: '#666' }}>团队长总数</div>
          </div>
        </Card>
        
        <Card style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52C41A' }}>
              {dataSource.filter(d => (d.agentRank || 1) >= 5).length}
            </div>
            <div style={{ color: '#666' }}>金牌以上</div>
          </div>
        </Card>
        
        <Card style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#FF4D4F' }}>
              ¥{dataSource.reduce((sum, d) => sum + (d.inviteEarnings?.totalFromInvite || 0), 0).toFixed(2)}
            </div>
            <div style={{ color: '#666' }}>总发放收益</div>
          </div>
        </Card>
        
        <Card style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#FAAD14' }}>
              ¥{dataSource.reduce((sum, d) => sum + (d.performanceRewards?.weeklyTotal || 0), 0).toFixed(2)}
            </div>
            <div style={{ color: '#666' }}>周奖励总额</div>
          </div>
        </Card>
      </div>

      {/* 主表格 */}
      <Card
        title={
          <Space>
            <TeamOutlined />
            <span>团队长管理</span>
          </Space>
        }
        extra={
          <Space>
            <Select
              style={{ width: 140 }}
              placeholder="等级筛选"
              allowClear
              onChange={handleRankFilter}
            >
              {/* ✅ 等级从 1-6 */}
              <Option value={1}>大众会员</Option>
              <Option value={2}>普通团队</Option>
              <Option value={3}>铜牌团长</Option>
              <Option value={4}>银牌团长</Option>
              <Option value={5}>金牌团长</Option>
              <Option value={6}>钻石团长</Option>
            </Select>
            <Search
              placeholder="搜索用户名/邮箱"
              allowClear
              onSearch={handleSearch}
              style={{ width: 200 }}
            />
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey={(record) => record._id || record.id || Math.random().toString()}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={(p) => fetchTeamLeaders(p.current, p.pageSize)}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 升降级弹窗 */}
      <Modal
        title={currentUser?.isUpgrade ? '升级团队长' : '降级团队长'}
        open={rankModalVisible}
        onCancel={() => setRankModalVisible(false)}
        footer={null}
      >
        {currentUser && (
          <Form form={rankForm} onFinish={handleRankChange} layout="vertical">
            <Form.Item label="当前用户">
              <Input value={currentUser.name || '未知用户'} disabled />
            </Form.Item>
            <Form.Item label="当前等级">
              <Tag color={RANK_CONFIG[currentUser.agentRank]?.color || '#999'}>
                {RANK_CONFIG[currentUser.agentRank]?.name || '未知'}
              </Tag>
            </Form.Item>
            <Form.Item
              name="newRank"
              label="目标等级"
              rules={[{ required: true, message: '请选择目标等级' }]}
            >
              <Select>
                {Object.entries(RANK_CONFIG).map(([rank, config]) => (
                  <Option key={rank} value={Number(rank)}>
                    <Tag color={config.color}>{config.name}</Tag>
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="reason"
              label="操作原因"
              rules={[{ required: true, message: '请填写操作原因' }]}
            >
              <Input.TextArea rows={3} placeholder="请填写升降级原因" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button onClick={() => setRankModalVisible(false)}>取消</Button>
                <Button type="primary" htmlType="submit">
                  确认{currentUser.isUpgrade ? '升级' : '降级'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
