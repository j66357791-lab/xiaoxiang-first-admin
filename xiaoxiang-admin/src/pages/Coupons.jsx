// src/pages/Coupons.jsx
// 优惠券管理页面

import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber,
  Select, Switch, message, Popconfirm, Tag, Divider, Row, Col, DatePicker, Statistic
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, GiftOutlined,
  PercentageOutlined, DollarOutlined
} from '@ant-design/icons';
import { request } from '../utils/request';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

export default function Coupons() {
  const [loading, setLoading] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [stats, setStats] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCoupons();
    fetchStats();
  }, []);

  // 获取优惠券列表
  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await request('/api/coupons/admin');
      if (res.ok && res.data.success) {
        setCoupons(res.data.data?.coupons || []);
      }
    } catch (e) {
      message.error('获取优惠券列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const res = await request('/api/coupons/admin/stats');
      if (res.ok && res.data.success) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 打开新建/编辑弹窗
  const handleOpenModal = (coupon = null) => {
    setEditingCoupon(coupon);
    if (coupon) {
      form.setFieldsValue({
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        minAmount: coupon.minAmount,
        maxDiscount: coupon.maxDiscount,
        totalCount: coupon.totalCount,
        perUserLimit: coupon.perUserLimit,
        timeRange: [dayjs(coupon.startTime), dayjs(coupon.endTime)],
        status: coupon.status,
        sort: coupon.sort,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        type: 'fixed',
        status: 'active',
        perUserLimit: 1,
        minAmount: 0,
        sort: 0,
      });
    }
    setModalVisible(true);
  };

  // 提交表单
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const data = {
        code: values.code,
        name: values.name,
        description: values.description,
        type: values.type,
        value: values.value,
        minAmount: values.minAmount || 0,
        maxDiscount: values.maxDiscount,
        totalCount: values.totalCount,
        perUserLimit: values.perUserLimit || 1,
        startTime: values.timeRange[0].toISOString(),
        endTime: values.timeRange[1].toISOString(),
        status: values.status,
        sort: values.sort || 0,
      };

      let res;
      if (editingCoupon) {
        res = await request(`/api/coupons/admin/${editingCoupon._id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } else {
        res = await request('/api/coupons/admin', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }

      if (res.ok && res.data.success) {
        message.success(editingCoupon ? '更新成功' : '创建成功');
        setModalVisible(false);
        fetchCoupons();
        fetchStats();
      } else {
        message.error(res.data?.message || '操作失败');
      }
    } catch (e) {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 删除优惠券
  const handleDelete = async (id) => {
    try {
      const res = await request(`/api/coupons/admin/${id}`, { method: 'DELETE' });
      if (res.ok && res.data.success) {
        message.success('删除成功');
        fetchCoupons();
        fetchStats();
      } else {
        message.error(res.data?.message || '删除失败');
      }
    } catch (e) {
      message.error('网络错误');
    }
  };

  // 更新状态
  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await request(`/api/coupons/admin/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (res.ok && res.data.success) {
        message.success('状态更新成功');
        fetchCoupons();
        fetchStats();
      } else {
        message.error(res.data?.message || '更新失败');
      }
    } catch (e) {
      message.error('网络错误');
    }
  };

  // 生成随机优惠券码
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'CP';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setFieldsValue({ code });
  };

  // 获取状态标签
  const getStatusTag = (coupon) => {
    const now = new Date();
    if (coupon.status === 'inactive') {
      return <Tag color="default">已禁用</Tag>;
    }
    if (new Date(coupon.endTime) < now) {
      return <Tag color="red">已过期</Tag>;
    }
    if (new Date(coupon.startTime) > now) {
      return <Tag color="orange">未开始</Tag>;
    }
    return <Tag color="green">进行中</Tag>;
  };

  // 表格列定义
  const columns = [
    {
      title: '优惠券码',
      dataIndex: 'code',
      key: 'code',
      render: (text) => <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{text}</span>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        type === 'fixed' 
          ? <Tag icon={<DollarOutlined />} color="blue">固定金额</Tag>
          : <Tag icon={<PercentageOutlined />} color="purple">百分比</Tag>
      ),
    },
    {
      title: '优惠值',
      dataIndex: 'value',
      key: 'value',
      render: (value, record) => (
        record.type === 'fixed' ? `¥${value}` : `${value}%`
      ),
    },
    {
      title: '使用条件',
      key: 'condition',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>满 ¥{record.minAmount || 0} 可用</span>
          {record.maxDiscount && <span style={{ color: '#999' }}>最高优惠 ¥{record.maxDiscount}</span>}
        </Space>
      ),
    },
    {
      title: '发放/领取/使用',
      key: 'usage',
      render: (_, record) => (
        <span>
          {record.totalCount} / 
          <span style={{ color: '#1890ff' }}>{record.claimedCount || 0}</span> / 
          <span style={{ color: '#52c41a' }}>{record.usedCount || 0}</span>
        </span>
      ),
    },
    {
      title: '有效期',
      key: 'time',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>{dayjs(record.startTime).format('YYYY-MM-DD HH:mm')}</span>
          <span>至 {dayjs(record.endTime).format('YYYY-MM-DD HH:mm')}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => getStatusTag(record),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            编辑
          </Button>
          {record.status === 'active' ? (
            <Button
              type="link"
              onClick={() => handleUpdateStatus(record._id, 'inactive')}
            >
              禁用
            </Button>
          ) : (
            <Button
              type="link"
              onClick={() => handleUpdateStatus(record._id, 'active')}
            >
              启用
            </Button>
          )}
          <Popconfirm
            title="确定要删除此优惠券吗？"
            onConfirm={() => handleDelete(record._id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 统计卡片 */}
      {stats && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={24}>
            <Col span={6}>
              <Statistic
                title="优惠券总数"
                value={stats.total?.totalCoupons || 0}
                prefix={<GiftOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="发放总量"
                value={stats.total?.totalIssued || 0}
                suffix="张"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="已领取"
                value={stats.total?.totalClaimed || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="已使用"
                value={stats.total?.totalUsed || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      <Card
        title="优惠券管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            新建优惠券
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={coupons}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />

        <Modal
          title={editingCoupon ? '编辑优惠券' : '新建优惠券'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Row gutter={16}>
              <Col span={16}>
                <Form.Item name="code" label="优惠券码" rules={[{ required: true }]}>
                  <Input placeholder="如：NEWYEAR2024" style={{ textTransform: 'uppercase' }} />
                </Form.Item>
              </Col>
              <Col span={8} style={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button onClick={generateCode} block>自动生成</Button>
              </Col>
            </Row>

            <Form.Item name="name" label="优惠券名称" rules={[{ required: true }]}>
              <Input placeholder="如：新用户专享优惠券" />
            </Form.Item>

            <Form.Item name="description" label="描述">
              <Input placeholder="优惠券使用说明" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="type" label="优惠类型" rules={[{ required: true }]}>
                  <Select>
                    <Option value="fixed">固定金额</Option>
                    <Option value="percent">百分比折扣</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="value" 
                  label="优惠值" 
                  rules={[{ required: true }]}
                  extra="固定金额时为元，百分比时为折扣比例（如10表示10%）"
                >
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="minAmount" label="最低使用金额">
                  <InputNumber style={{ width: '100%' }} min={0} prefix="¥" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="maxDiscount" 
                  label="最大优惠金额"
                  extra="百分比折扣时的上限，不填则无上限"
                >
                  <InputNumber style={{ width: '100%' }} min={0} prefix="¥" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="totalCount" label="发放总量" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={1} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="perUserLimit" label="每人限领">
                  <InputNumber style={{ width: '100%' }} min={1} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="timeRange" label="有效期" rules={[{ required: true }]}>
              <RangePicker
                showTime
                style={{ width: '100%' }}
                placeholder={['开始时间', '结束时间']}
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="status" label="状态">
                  <Select>
                    <Option value="active">启用</Option>
                    <Option value="inactive">禁用</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="sort" label="排序">
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ marginTop: 24 }}>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {editingCoupon ? '更新' : '创建'}
                </Button>
                <Button onClick={() => setModalVisible(false)}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  );
}
