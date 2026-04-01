// src/pages/Warehouses.jsx
// 仓库管理页面

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Switch,
  InputNumber,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  CarOutlined,
  ShopOutlined,
} from '@ant-design/icons';

const API_BASE_URL = 'https://xiaoxiang.zeabur.app';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchWarehouses();
  }, []);

  // 封装请求函数
  const fetchData = async (endpoint, options = {}) => {
    const userStr = localStorage.getItem('user');
    let token = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.token;
      } catch (e) {}
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();
    return { ok: response.ok, data };
  };

  // 获取仓库列表
  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await fetchData('/api/warehouses/admin/all');
      if (res.ok && res.data?.success) {
        setWarehouses(res.data.data || []);
      } else {
        message.error('获取仓库列表失败');
      }
    } catch (e) {
      console.error('获取仓库失败:', e);
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 打开创建弹窗
  const handleCreate = () => {
    setEditingWarehouse(null);
    setModalVisible(true);
    // 延迟设置表单值，确保 Modal 已渲染
    setTimeout(() => {
      form.resetFields();
      form.setFieldsValue({
        isActive: true,
        isDefault: false,
        sort: 0,
        supportPickup: false,
        supportSelfDelivery: true,
        freeShipping: true,
        pickupRadius: 10,
        estimatedProcessDays: 3,
        maxDailyOrders: 100,
      });
    }, 0);
  };

  // 打开编辑弹窗
  const handleEdit = (record) => {
    setEditingWarehouse(record);
    setModalVisible(true);
    // 延迟设置表单值
    setTimeout(() => {
      form.setFieldsValue({
        name: record.name,
        code: record.code,
        province: record.address?.province,
        city: record.address?.city,
        district: record.address?.district,
        detail: record.address?.detail,
        longitude: record.address?.longitude,
        latitude: record.address?.latitude,
        contactPerson: record.contact?.person,
        contactPhone: record.contact?.phone,
        contactEmail: record.contact?.email,
        isActive: record.isActive,
        isDefault: record.isDefault,
        sort: record.sort,
        notes: record.notes,
        supportPickup: record.service?.supportPickup,
        supportSelfDelivery: record.service?.supportSelfDelivery,
        freeShipping: record.service?.freeShipping,
        pickupRadius: record.service?.pickupRadius,
        estimatedProcessDays: record.service?.estimatedProcessDays,
        maxDailyOrders: record.capacity?.maxDailyOrders,
        serviceCities: record.pickupConfig?.serviceCities?.join(','),
      });
    }, 0);
  };

  // 提交表单
  const handleSubmit = async (values) => {
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
        isActive: values.isActive,
        isDefault: values.isDefault,
        sort: values.sort,
        notes: values.notes,
        supportPickup: values.supportPickup,
        supportSelfDelivery: values.supportSelfDelivery,
        freeShipping: values.freeShipping,
        pickupRadius: values.pickupRadius,
        estimatedProcessDays: values.estimatedProcessDays,
        maxDailyOrders: values.maxDailyOrders,
        serviceCities: values.serviceCities ? values.serviceCities.split(',').map(s => s.trim()) : [],
      };

      let res;
      if (editingWarehouse) {
        const warehouseId = editingWarehouse._id || editingWarehouse.id;
        res = await fetchData(`/api/warehouses/admin/${warehouseId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } else {
        res = await fetchData('/api/warehouses/admin', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }

      if (res.ok && res.data?.success) {
        message.success(editingWarehouse ? '更新成功' : '创建成功');
        setModalVisible(false);
        fetchWarehouses();
      } else {
        message.error(res.data?.message || '操作失败');
      }
    } catch (e) {
      console.error('提交失败:', e);
      message.error('网络错误');
    }
  };

  // 删除仓库
  const handleDelete = async (record) => {
    try {
      const warehouseId = record._id || record.id;
      const res = await fetchData(`/api/warehouses/admin/${warehouseId}`, {
        method: 'DELETE',
      });

      if (res.ok && res.data?.success) {
        message.success('删除成功');
        fetchWarehouses();
      } else {
        message.error(res.data?.message || '删除失败');
      }
    } catch (e) {
      console.error('删除失败:', e);
      message.error('网络错误');
    }
  };

  // 设置默认仓库
  const setAsDefault = async (record) => {
    try {
      const warehouseId = record._id || record.id;
      const res = await fetchData(`/api/warehouses/admin/${warehouseId}`, {
        method: 'PUT',
        body: JSON.stringify({ isDefault: true }),
      });

      if (res.ok && res.data?.success) {
        message.success('已设为默认仓库');
        fetchWarehouses();
      } else {
        message.error('设置失败');
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
      width: 150,
      render: (text, record) => (
        <Space>
          <ShopOutlined style={{ color: '#4364F7' }} />
          <span>{text}</span>
          {record.isDefault && <Tag color="green">默认</Tag>}
        </Space>
      ),
    },
    {
      title: '编码',
      dataIndex: 'code',
      key: 'code',
      width: 100,
    },
    {
      title: '地址',
      key: 'address',
      width: 250,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>
            <EnvironmentOutlined style={{ marginRight: 4, color: '#999' }} />
            {record.address?.province} {record.address?.city} {record.address?.district}
          </span>
          <span style={{ color: '#999', fontSize: 12 }}>
            {record.address?.detail}
          </span>
        </Space>
      ),
    },
    {
      title: '联系方式',
      key: 'contact',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>
            <PhoneOutlined style={{ marginRight: 4, color: '#999' }} />
            {record.contact?.phone}
          </span>
          {record.contact?.person && (
            <span style={{ color: '#999', fontSize: 12 }}>
              {record.contact?.person}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: '服务',
      key: 'service',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.service?.supportPickup && (
            <Tag icon={<CarOutlined />} color="blue">上门回收</Tag>
          )}
          {record.service?.supportSelfDelivery && (
            <Tag color="orange">自行送达</Tag>
          )}
          {record.service?.freeShipping && (
            <Tag color="green">免费快递</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (active) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {!record.isDefault && (
            <Button
              type="link"
              size="small"
              onClick={() => setAsDefault(record)}
            >
              设为默认
            </Button>
          )}
          <Popconfirm
            title="确定删除此仓库吗？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <ShopOutlined style={{ color: '#4364F7' }} />
            <span>仓库管理</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
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
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editingWarehouse ? '编辑仓库' : '新建仓库'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={700}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="仓库名称"
                rules={[{ required: true, message: '请输入仓库名称' }]}
              >
                <Input placeholder="如：北京质检中心" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="code" label="仓库编码">
                <Input placeholder="如：BJ-WH-001" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">地址信息</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="province" label="省份">
                <Input placeholder="如：北京市" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="city" label="城市">
                <Input placeholder="如：北京市" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="district" label="区县">
                <Input placeholder="如：朝阳区" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="detail" label="详细地址">
            <Input placeholder="如：建国路88号SOHO现代城" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="longitude" label="经度">
                <InputNumber style={{ width: '100%' }} placeholder="如：116.46" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="latitude" label="纬度">
                <InputNumber style={{ width: '100%' }} placeholder="如：39.92" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">联系方式</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contactPerson" label="联系人">
                <Input placeholder="联系人姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactPhone" label="联系电话">
                <Input placeholder="如：010-12345678" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="contactEmail" label="邮箱">
            <Input placeholder="联系邮箱" />
          </Form.Item>

          <Divider orientation="left">服务配置</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="supportPickup" label="支持上门回收" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="supportSelfDelivery" label="支持自行送达" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="freeShipping" label="免费快递" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="pickupRadius" label="上门回收半径">
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="estimatedProcessDays" label="预计处理天数">
                <InputNumber min={1} max={30} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxDailyOrders" label="每日最大订单数">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="serviceCities" label="上门回收服务城市" extra="多个城市用逗号分隔，如：北京市,上海市,广州市">
            <Input placeholder="如：北京市,上海市,广州市" />
          </Form.Item>

          <Divider orientation="left">其他设置</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="isActive" label="是否启用" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isDefault" label="设为默认" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sort" label="排序">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
