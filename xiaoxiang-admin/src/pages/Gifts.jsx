import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Tag, Space,
  message, Popconfirm, Row, Col, Statistic, Progress
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, BarChartOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { request } from '../utils/request';

export default function Gifts() {
  const [loading, setLoading] = useState(false);
  const [gifts, setGifts] = useState([]);
  const [stats, setStats] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form] = Form.useForm();

  // 状态配置
  const STATUS_CONFIG = {
    'available': { label: '上架中', color: 'success' },
    'sold_out': { label: '已售罄', color: 'warning' },
    'offline': { label: '已下架', color: 'error' },
  };

  // 获取数据
  const fetchData = async () => {
    setLoading(true);
    try {
      const [giftsRes, statsRes] = await Promise.all([
        request('/api/gift/admin/all'),
        request('/api/gift/admin/stats'),
      ]);
      
      if (giftsRes.ok && giftsRes.data.success) {
        setGifts(giftsRes.data.data || []);
      }
      if (statsRes.ok && statsRes.data.success) {
        setStats(statsRes.data.data || []);
      }
    } catch (e) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 打开编辑/创建弹窗
  const openModal = (record = null) => {
    setEditData(record);
    if (record) {
      form.setFieldsValue({
        giftId: record.giftId,
        name: record.name,
        price: record.price,
        totalStock: record.totalStock,
        purchaseLimit: record.purchaseLimit || 1,
        rewards: record.rewards,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        rewards: [{ points: null, probability: null, label: '' }],
      });
    }
    setModalVisible(true);
  };

  // 保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      // 验证概率总和
      const totalProb = values.rewards.reduce((sum, r) => sum + (r.probability || 0), 0);
      if (Math.abs(totalProb - 100) > 0.01) {
        message.error(`概率总和必须为100%，当前为${totalProb}%`);
        return;
      }

      // 确保 label 有值
      const rewards = values.rewards.map(r => ({
        ...r,
        label: r.label && r.label.trim() ? r.label.trim() : `${r.points}积分`,
      }));

      const url = editData 
        ? `/api/gift/admin/${editData.giftId}`
        : '/api/gift/admin/create';
      const method = editData ? 'PUT' : 'POST';
      
      const res = await request(url, {
        method,
        body: JSON.stringify({ ...values, rewards }),
      });
      
      if (res.ok && res.data.success) {
        message.success(editData ? '更新成功' : '创建成功');
        setModalVisible(false);
        fetchData();
      } else {
        message.error(res.data.message || '操作失败');
      }
    } catch (e) {
      message.error('操作失败');
    }
  };

  // 下架
  const handleDelete = async (giftId) => {
    try {
      const res = await request(`/api/gift/admin/${giftId}`, { method: 'DELETE' });
      if (res.ok && res.data.success) {
        message.success('已下架');
        fetchData();
      }
    } catch (e) {
      message.error('操作失败');
    }
  };

  // 表格列
  const columns = [
    {
      title: '礼包名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#999' }}>ID: {record.giftId}</div>
        </div>
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (val) => <span style={{ color: '#f50', fontWeight: 'bold' }}>¥{val}</span>,
    },
    {
      title: '库存/已售',
      key: 'stock',
      render: (_, record) => `${record.soldCount || 0}/${record.totalStock}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG['offline'];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '奖励配置',
      dataIndex: 'rewards',
      key: 'rewards',
      render: (rewards) => (
        <div style={{ maxWidth: 200 }}>
          {rewards?.slice(0, 3).map((r, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 12 }}>{r.label}: </span>
              <Progress 
                percent={r.probability} 
                size="small" 
                showInfo={false}
                style={{ width: 60, display: 'inline-block' }}
              />
              <span style={{ fontSize: 12, marginLeft: 4 }}>{r.probability}%</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openModal(record)}>
            编辑
          </Button>
          {record.status !== 'offline' && (
            <Popconfirm
              title="确定下架该礼包吗？"
              onConfirm={() => handleDelete(record.giftId)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger size="small">下架</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 汇总统计
  const totalRevenue = stats.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);
  const availableCount = gifts.filter(g => g.status === 'available').length;

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic title="礼包总数" value={gifts.length} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="上架中" value={availableCount} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="总营收" value={totalRevenue} prefix="¥" valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
      </Row>

      {/* 礼包列表 */}
      <Card
        title="礼包管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            创建礼包
          </Button>
        }
      >
        <Table
          dataSource={gifts}
          columns={columns}
          rowKey="giftId"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editData ? '编辑礼包' : '创建礼包'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={700}
      >
        <Form form={form} layout="vertical" initialValues={{ purchaseLimit: 1 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="giftId"
                label="礼包ID（唯一标识）"
                rules={[{ required: true, message: '请输入礼包ID' }]}
              >
                <Input placeholder="例如: spring_2024" disabled={!!editData} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="礼包名称"
                rules={[{ required: true, message: '请输入礼包名称' }]}
              >
                <Input placeholder="例如: 🌸 春节礼包" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="price"
                label="价格（元）"
                rules={[{ required: true, message: '请输入价格' }]}
              >
                <InputNumber prefix="¥" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="totalStock"
                label="库存数量"
                rules={[{ required: true, message: '请输入库存' }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="purchaseLimit" label="每人限购">
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
          </Row>

          <Form.List name="rewards">
            {(fields, { add, remove }) => (
              <div>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>
                  奖励配置（概率总和必须为100%）
                </div>
                {fields.map((field, index) => (
                  <Row key={field.key} gutter={8} style={{ marginBottom: 8 }}>
                    <Col span={8}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'points']}
                        rules={[{ required: true, message: '请输入积分' }]}
                      >
                        <InputNumber placeholder="积分" style={{ width: '100%' }} min={0} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'probability']}
                        rules={[{ required: true, message: '请输入概率' }]}
                      >
                        <InputNumber placeholder="概率%" style={{ width: '100%' }} min={0} max={100} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item {...field} name={[field.name, 'label']}>
                        <Input placeholder="标签（可选）" />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      {fields.length > 1 && (
                        <Button type="link" danger onClick={() => remove(field.name)}>
                          删除
                        </Button>
                      )}
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  添加奖励档位
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
