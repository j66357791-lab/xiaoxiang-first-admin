// src/pages/Team/Settings.jsx
// 团队长等级设置
import React, { useState } from 'react';
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
  Divider,
} from 'antd';
import {
  SettingOutlined,
  TrophyOutlined,
  SaveOutlined,
} from '@ant-design/icons';

// ✅ 团队长等级配置（可编辑）- 等级从 1-6
const initialRanks = [
  { 
    rank: 1, 
    name: '大众会员', 
    color: '#999999',
    needTeamValid: 0, 
    needDirectValid: 0, 
    needTeamOrders: 0, 
    perOrderBonus: 0,
    weeklyBonusRate: 0,
    monthlyBonusRate: 0,
    yearlyBonusRate: 0,
  },
  { 
    rank: 2, 
    name: '普通团队', 
    color: '#8B4513',
    needTeamValid: 20, 
    needDirectValid: 0, 
    needTeamOrders: 100, 
    perOrderBonus: 0.1,
    weeklyBonusRate: 0,
    monthlyBonusRate: 0,
    yearlyBonusRate: 0,
  },
  { 
    rank: 3, 
    name: '铜牌团长', 
    color: '#CD7F32',
    needTeamValid: 200, 
    needDirectValid: 100, 
    needTeamOrders: 500, 
    perOrderBonus: 0.5,
    weeklyBonusRate: 0,
    monthlyBonusRate: 0,
    yearlyBonusRate: 0,
  },
  { 
    rank: 4, 
    name: '银牌团长', 
    color: '#C0C0C0',
    needTeamValid: 500, 
    needDirectValid: 300, 
    needTeamOrders: 1000, 
    perOrderBonus: 1.0,
    weeklyBonusRate: 0,
    monthlyBonusRate: 0,
    yearlyBonusRate: 0,
  },
  { 
    rank: 5, 
    name: '金牌团长', 
    color: '#FFD700',
    needTeamValid: 2000, 
    needDirectValid: 800, 
    needTeamOrders: 5000, 
    perOrderBonus: 1.5,
    weeklyBonusRate: 0.001,
    monthlyBonusRate: 0.002,
    yearlyBonusRate: 0,
  },
  { 
    rank: 6, 
    name: '钻石团长', 
    color: '#B9F2FF',
    needTeamValid: 8000, 
    needDirectValid: 2000, 
    needTeamOrders: 20000, 
    perOrderBonus: 3.0,
    weeklyBonusRate: 0.002,
    monthlyBonusRate: 0.008,
    yearlyBonusRate: 'contact',
  },
];

export default function TeamSettings() {
  const [ranks, setRanks] = useState(initialRanks);
  const [editingRank, setEditingRank] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();

  const handleEdit = (rank) => {
    setEditingRank(rank);
    form.setFieldsValue(rank);
    setEditModalVisible(true);
  };

  const handleSave = async (values) => {
    const newRanks = ranks.map(r => 
      r.rank === editingRank.rank ? { ...r, ...values } : r
    );
    setRanks(newRanks);
    setEditModalVisible(false);
    message.success('保存成功');
  };

  const columns = [
    {
      title: '等级',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank) => (
        <Tag color={ranks.find(r => r.rank === rank)?.color}>
          Lv.{rank}
        </Tag>
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Tag color={record.color} style={{ fontSize: 14, padding: '4px 12px' }}>
          <TrophyOutlined style={{ marginRight: 4 }} />
          {name}
        </Tag>
      ),
    },
    {
      title: '团队有效好友',
      dataIndex: 'needTeamValid',
      key: 'needTeamValid',
      render: (val) => `≥${val}人`,
    },
    {
      title: '直推有效好友',
      dataIndex: 'needDirectValid',
      key: 'needDirectValid',
      render: (val) => val ? `≥${val}人` : '-',
    },
    {
      title: '团队有效订单',
      dataIndex: 'needTeamOrders',
      key: 'needTeamOrders',
      render: (val) => `≥${val}单`,
    },
    {
      title: '每单加成',
      dataIndex: 'perOrderBonus',
      key: 'perOrderBonus',
      render: (val) => (
        <span style={{ color: '#52C41A', fontWeight: 'bold' }}>
          +¥{val}
        </span>
      ),
    },
    {
      title: '周奖励比例',
      dataIndex: 'weeklyBonusRate',
      key: 'weeklyBonusRate',
      render: (val) => val ? `${(val * 100).toFixed(1)}%` : '-',
    },
    {
      title: '月奖励比例',
      dataIndex: 'monthlyBonusRate',
      key: 'monthlyBonusRate',
      render: (val) => val ? `${(val * 100).toFixed(1)}%` : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" onClick={() => handleEdit(record)}>
          <SettingOutlined /> 编辑
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>团队长等级设置</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<SaveOutlined />}>
            保存全部配置
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={ranks}
          rowKey="rank"
          pagination={false}
        />
      </Card>

      <Modal
        title={`编辑 ${editingRank?.name}`}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} onFinish={handleSave} layout="vertical">
          <Form.Item name="name" label="等级名称" rules={[{ required: true }]}>
            <Input placeholder="请输入等级名称" />
          </Form.Item>
          
          <Form.Item name="color" label="标签颜色" rules={[{ required: true }]}>
            <Input type="color" style={{ height: 40 }} />
          </Form.Item>

          <Divider>晋升条件</Divider>

          <Form.Item name="needTeamValid" label="团队有效好友数" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="人" />
          </Form.Item>

          <Form.Item name="needDirectValid" label="直推有效好友数">
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="人" />
          </Form.Item>

          <Form.Item name="needTeamOrders" label="团队有效订单数" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="单" />
          </Form.Item>

          <Divider>奖励设置</Divider>

          <Form.Item name="perOrderBonus" label="每单加成金额" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} addonBefore="¥" />
          </Form.Item>

          <Form.Item name="weeklyBonusRate" label="周奖励比例">
            <InputNumber min={0} max={1} step={0.001} precision={4} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="monthlyBonusRate" label="月奖励比例">
            <InputNumber min={0} max={1} step={0.001} precision={4} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
