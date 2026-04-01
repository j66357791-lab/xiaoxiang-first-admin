// src/pages/Team/Rewards.jsx
// 奖励发放管理
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Descriptions,
  Divider,
  Alert,
  Tabs,
  List,
  Avatar,
} from 'antd';
import {
  DollarOutlined,
  TeamOutlined,
} from '@ant-design/icons';

// ✅ 团队长等级配置 - 等级从 1-6
const RANK_CONFIG = {
  1: { name: '大众会员', color: '#999999' },
  2: { name: '普通团队', color: '#8B4513' },
  3: { name: '铜牌团长', color: '#CD7F32' },
  4: { name: '银牌团长', color: '#C0C0C0' },
  5: { name: '金牌团长', color: '#FFD700', weeklyBonusRate: 0.001, monthlyBonusRate: 0.002 },
  6: { name: '钻石团长', color: '#B9F2FF', weeklyBonusRate: 0.002, monthlyBonusRate: 0.008 },
};

export default function TeamRewards() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('weekly');
  const [pendingRewards, setPendingRewards] = useState([]);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [currentReward, setCurrentReward] = useState(null);
  const [yearlyModalVisible, setYearlyModalVisible] = useState(false);
  const [yearlyForm] = Form.useForm();

  const fetchPendingRewards = async (type) => {
    setLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const token = userData.token;

      const res = await fetch(`https://xiaoxiang.zeabur.app/api/users/admin/rewards/pending?type=${type}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await res.json();

      if (json.success) {
        setPendingRewards(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRewards(activeTab);
  }, [activeTab]);

  const handlePreview = async (type, leaderId = null) => {
    setLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const token = userData.token;

      const res = await fetch('https://xiaoxiang.zeabur.app/api/users/admin/rewards/' + type, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ leaderId, dryRun: true }),
      });
      const json = await res.json();

      if (json.success) {
        setCurrentReward({
          type,
          data: json.data || [],
          total: (json.data || []).reduce((sum, r) => sum + (r.amount || 0), 0),
        });
        setConfirmModalVisible(true);
      }
    } catch (e) {
      message.error('预览失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!currentReward) return;
    
    setLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const token = userData.token;

      const res = await fetch('https://xiaoxiang.zeabur.app/api/users/admin/rewards/' + currentReward.type, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ dryRun: false }),
      });
      const json = await res.json();

      if (json.success) {
        message.success(`发放成功，共 ${json.data?.length || 0} 人`);
        setConfirmModalVisible(false);
        fetchPendingRewards(activeTab);
      } else {
        message.error(json.message || '发放失败');
      }
    } catch (e) {
      message.error('发放失败');
    } finally {
      setLoading(false);
    }
  };

  const handleYearlySubmit = async (values) => {
    setLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const token = userData.token;

      const res = await fetch('https://xiaoxiang.zeabur.app/api/users/admin/rewards/yearly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ rewards: values.rewards, dryRun: false }),
      });
      const json = await res.json();

      if (json.success) {
        message.success('年终奖励发放成功');
        setYearlyModalVisible(false);
        yearlyForm.resetFields();
      } else {
        message.error(json.message || '发放失败');
      }
    } catch (e) {
      message.error('发放失败');
    } finally {
      setLoading(false);
    }
  };

  const getColumns = (tabType) => [
    {
      title: '团队长',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Avatar style={{ backgroundColor: '#4364F7' }}>
            {text?.charAt(0) || '小'}
          </Avatar>
          <div>
            <div>{text || '未知'}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.email || '-'}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '等级',
      dataIndex: 'agentRank',
      key: 'agentRank',
      render: (rank) => {
        const config = RANK_CONFIG[rank || 1];
        return <Tag color={config?.color}>{config?.name || '未知'}</Tag>;
      },
    },
    {
      title: tabType === 'weekly' ? '上周订单金额' : '上月订单金额',
      dataIndex: tabType === 'weekly' ? 'lastWeekOrderAmount' : 'lastMonthOrderAmount',
      key: 'orderAmount',
      render: (amount) => `¥${(amount || 0).toLocaleString()}`,
    },
    {
      title: '奖励比例',
      dataIndex: tabType === 'weekly' ? 'weeklyBonusRate' : 'monthlyBonusRate',
      key: 'bonusRate',
      render: (rate) => rate ? `${(rate * 100).toFixed(1)}%` : '-',
    },
    {
      title: '预估奖励',
      dataIndex: 'estimatedReward',
      key: 'estimatedReward',
      render: (amount) => (
        <span style={{ color: '#FF4D4F', fontWeight: 'bold' }}>
          ¥{(amount || 0).toFixed(2)}
        </span>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'weekly',
      label: '周奖励',
      children: (
        <Card
          title="待发放周奖励"
          extra={
            <Space>
              <Button onClick={() => handlePreview('weekly')}>预览发放</Button>
              <Button type="primary" onClick={() => handlePreview('weekly')}>立即发放</Button>
            </Space>
          }
        >
          <Table
            columns={getColumns('weekly')}
            dataSource={pendingRewards}
            rowKey={(record) => record._id || record.id || Math.random().toString()}
            loading={loading}
            pagination={false}
          />
        </Card>
      ),
    },
    {
      key: 'monthly',
      label: '月奖励',
      children: (
        <Card
          title="待发放月奖励"
          extra={
            <Space>
              <Button onClick={() => handlePreview('monthly')}>预览发放</Button>
              <Button type="primary" onClick={() => handlePreview('monthly')}>立即发放</Button>
            </Space>
          }
        >
          <Table
            columns={getColumns('monthly')}
            dataSource={pendingRewards}
            rowKey={(record) => record._id || record.id || Math.random().toString()}
            loading={loading}
            pagination={false}
          />
        </Card>
      ),
    },
    {
      key: 'yearly',
      label: '年终奖励',
      children: (
        <Card
          title="年终奖励发放"
          extra={
            <Button type="primary" onClick={() => setYearlyModalVisible(true)}>
              发放年终奖励
            </Button>
          }
        >
          <Alert
            title="年终奖励仅限钻石团长"
            description="请手动输入每位钻石团长的年终奖励金额"
            type="warning"
            showIcon
          />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <Alert
        title="奖励发放说明"
        description={
          <div>
            <p>• 周奖励：每周一发放，仅限金牌及以上团长（订单金额×0.1%或0.2%）</p>
            <p>• 月奖励：每月1日发放，仅限金牌及以上团长（订单金额×0.2%或0.8%）</p>
            <p>• 年终奖励：年底发放，仅限钻石团长，需手动设置金额</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <Modal
        title="确认发放奖励"
        open={confirmModalVisible}
        onCancel={() => setConfirmModalVisible(false)}
        onOk={handleConfirm}
        confirmLoading={loading}
        width={800}
      >
        {currentReward && (
          <div>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="奖励类型">
                {currentReward.type === 'weekly' ? '周奖励' : '月奖励'}
              </Descriptions.Item>
              <Descriptions.Item label="发放人数">
                {currentReward.data?.length || 0}人
              </Descriptions.Item>
              <Descriptions.Item label="发放总额" span={2}>
                <span style={{ color: '#FF4D4F', fontSize: 18, fontWeight: 'bold' }}>
                  ¥{currentReward.total?.toFixed(2) || '0.00'}
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Divider>发放明细</Divider>

            <List
              dataSource={currentReward.data || []}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar style={{ backgroundColor: '#4364F7' }}>{item.name?.charAt(0) || '小'}</Avatar>}
                    title={item.name || '未知'}
                    description={`等级：${RANK_CONFIG[item.agentRank || 1]?.name || '未知'}`}
                  />
                  <div style={{ color: '#FF4D4F', fontWeight: 'bold' }}>
                    ¥{(item.amount || 0).toFixed(2)}
                  </div>
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>

      <Modal
        title="发放年终奖励"
        open={yearlyModalVisible}
        onCancel={() => setYearlyModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={yearlyForm} onFinish={handleYearlySubmit} layout="vertical">
          <Form.List name="rewards">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'leaderId']}
                      rules={[{ required: true, message: '请输入团队长ID' }]}
                    >
                      <Input placeholder="团队长ID" style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'amount']}
                      rules={[{ required: true, message: '请输入金额' }]}
                    >
                      <InputNumber
                        placeholder="奖励金额"
                        min={0}
                        precision={2}
                        prefix="¥"
                        style={{ width: 150 }}
                      />
                    </Form.Item>
                    <Button type="link" danger onClick={() => remove(name)}>
                      删除
                    </Button>
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<TeamOutlined />}>
                    添加团队长
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
          <Form.Item>
            <Space>
              <Button onClick={() => setYearlyModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                确认发放
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
