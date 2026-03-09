// src/pages/Warehouses.jsx
// 仓库管理页面

import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber,
  Select, Switch, message, Popconfirm, Tag, Divider, Row, Col, Tooltip
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EnvironmentOutlined,
  PhoneOutlined, MailOutlined, WechatOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { request } from '../utils/request';

const { Option } = Select;
const { TextArea } = Input;

export default function Warehouses() {
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [form] = Form.useForm();

  // 加载仓库列表
  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await request('/api/warehouses');
      if (res.ok && res.data.success) {
        setWarehouses(res.data.data || []);
      }
    } catch (e) {
      message.error('获取仓库列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 打开新建/编辑弹窗
  const handleOpenModal = (warehouse = null) => {
    setEditingWarehouse(warehouse);
    if (warehouse) {
      form.setFieldsValue({
        name: warehouse.name,
        code: warehouse.code,
        province: warehouse.address?.province,
        city: warehouse.address?.city,
        district: warehouse.address?.district,
        detail: warehouse.address?.detail,
        longitude: warehouse.address?.longitude,
        latitude: warehouse.address?.latitude,
        contactPerson: warehouse.contact?.person,
        contactPhone: warehouse.contact?.phone,
        contactEmail: warehouse.contact?.email,
        contactWechat: warehouse.contact?.wechat,
        maxDailyOrders: warehouse.capacity?.maxDailyOrders,
        supportPickup: warehouse.service?.supportPickup,
        pickupRadius: warehouse.service?.pickupRadius,
        supportSelfDelivery: warehouse.service?.supportSelfDelivery,
        estimatedProcessDays: warehouse.service?.estimatedProcessDays,
        freeShipping: warehouse.service?.freeShipping,
        isActive: warehouse.isActive,
        isDefault: warehouse.isDefault,
        sort: warehouse.sort,
        notes: warehouse.notes,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        isActive: true,
        supportPickup: false,
        supportSelfDelivery: true,
        freeShipping: true,
        isDefault: false,
        pickupRadius: 10,
        estimatedProcessDays: 3,
        maxDailyOrders: 100,
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
        name: values.name,
        code: values.code,
        province: values.province,
        city: values.city,
        district: values.district,
        detail: values.detail,
        longitude: values.longitude,
        latitude: values.latitude,
        contactPerson: values.contactPerson,
        contactPhone: values.contactPhone,
        contactEmail: values.contactEmail,
        contactWechat: values.contactWechat,
        maxDailyOrders: values.maxDailyOrders,
        supportPickup: values.supportPickup,
        pickupRadius: values.pickupRadius,
        supportSelfDelivery: values.supportSelfDelivery,
        estimatedProcessDays: values.estimatedProcessDays,
        freeShipping: values.freeShipping,
        isActive: values.isActive,
        isDefault: values.isDefault,
        sort: values.sort,
        notes: values.notes,
      };

      let res;
      if (editingWarehouse) {
        res = await request(`/api/warehouses/${editingWarehouse._id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } else {
        res = await request('/api/warehouses', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }

      if (res.ok && res.data.success) {
        message.success(editingWarehouse ? '更新成功' : '创建成功');
        setModalVisible(false);
        fetchWarehouses();
      } else {
        message.error(res.data?.message || '操作失败');
      }
    } catch (e) {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 删除仓库
  const handleDelete = async (id) => {
    try {
      const res = await request(`/api/warehouses/${id}`, { method: 'DELETE' });
      if (res.ok && res.data.success) {
        message.success('删除成功');
        fetchWarehouses();
      } else {
        message.error(res.data?.message || '删除失败');
      }
    } catch (e) {
      message.error('网络错误');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '仓库名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {text}
          {record.isDefault && <Tag color="green">默认</Tag>}
          {!record.isActive && <Tag color="red">已禁用</Tag>}
        </Space>
      ),
    },
    {
      title: '编码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '地址',
      key: 'address',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>
            <EnvironmentOutlined /> {record.address?.province} {record.address?.city} {record.address?.district}
          </span>
          <span style={{ color: '#999', fontSize: 12 }}>{record.address?.detail}</span>
        </Space>
      ),
    },
    {
      title: '联系方式',
      key: 'contact',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span><PhoneOutlined /> {record.contact?.phone}</span>
          {record.contact?.person && <span>联系人: {record.contact?.person}</span>}
        </Space>
      ),
    },
    {
      title: '服务配置',
      key: 'service',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.service?.supportPickup && <Tag color="blue">上门回收({record.service?.pickupRadius}km)</Tag>}
          {record.service?.supportSelfDelivery && <Tag color="orange">自行送达</Tag>}
          {record.service?.freeShipping && <Tag color="green">免费快递</Tag>}
        </Space>
      ),
    },
    {
      title: '处理天数',
      dataIndex: ['service', 'estimatedProcessDays'],
      key: 'estimatedProcessDays',
      render: (days) => `${days || 3}天`,
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
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
          <Popconfirm
            title="确定要删除此仓库吗？"
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
    <Card
      title="仓库管理"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
        >
          新建仓库
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={warehouses}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingWarehouse ? '编辑仓库' : '新建仓库'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Divider orientation="left">基本信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="name" label="仓库名称" rules={[{ required: true }]}>
                <Input placeholder="如：北京质检中心" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="code" label="仓库编码">
                <Input placeholder="如：BJ001" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sort" label="排序">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">地址信息</Divider>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="province" label="省份" rules={[{ required: true }]}>
                <Input placeholder="如：北京市" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="city" label="城市" rules={[{ required: true }]}>
                <Input placeholder="如：北京市" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="district" label="区县">
                <Input placeholder="如：朝阳区" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="detail" label="详细地址" rules={[{ required: true }]}>
                <Input placeholder="街道门牌号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="longitude" label="经度">
                <InputNumber style={{ width: '100%' }} placeholder="如：116.4074" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="latitude" label="纬度">
                <InputNumber style={{ width: '100%' }} placeholder="如：39.9042" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">联系信息</Divider>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="contactPerson" label="联系人">
                <Input placeholder="姓名" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="contactPhone" label="联系电话" rules={[{ required: true }]}>
                <Input placeholder="电话" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="contactEmail" label="邮箱">
                <Input placeholder="email@example.com" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="contactWechat" label="微信">
                <Input placeholder="微信号" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">服务配置</Divider>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="supportPickup" valuePropName="checked" label="上门回收">
                <Switch checkedChildren="开" unCheckedChildren="关" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="pickupRadius" label="服务半径(km)">
                <InputNumber style={{ width: '100%' }} min={1} max={100} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="supportSelfDelivery" valuePropName="checked" label="自行送达">
                <Switch checkedChildren="开" unCheckedChildren="关" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="freeShipping" valuePropName="checked" label="免费快递">
                <Switch checkedChildren="开" unCheckedChildren="关" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="estimatedProcessDays" label="预计处理天数">
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxDailyOrders" label="每日最大订单量">
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">状态设置</Divider>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="isActive" valuePropName="checked" label="启用状态">
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="isDefault" valuePropName="checked" label="设为默认">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="备注信息" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingWarehouse ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
