import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, Switch, Image,
  message, Popconfirm, Tag, Space, Upload
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined,
  FileTextOutlined, UploadOutlined
} from '@ant-design/icons';
import { request } from '../utils/request';

const { TextArea } = Input;

export default function Announcements() {
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  // 获取公告列表
  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await request('/api/announcements/admin/all');
      if (res.ok && res.data.success) {
        setAnnouncements(res.data.data || []);
      }
    } catch (e) {
      message.error('获取公告失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // 打开新建/编辑弹窗
  const openModal = (record = null) => {
    setEditingId(record?.id || null);
    if (record) {
      form.setFieldsValue({
        title: record.title,
        content: record.content,
        type: record.type || 'text',
        imageUrl: record.imageUrl,
        isActive: record.isActive,
        isBold: record.isBold,
        isCenter: record.isCenter,
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 保存公告
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      const url = editingId 
        ? `/api/announcements/admin/${editingId}`
        : '/api/announcements/admin';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await request(url, {
        method,
        body: JSON.stringify(values),
      });
      
      if (res.ok && res.data.success) {
        message.success(editingId ? '更新成功' : '发布成功');
        setModalVisible(false);
        fetchAnnouncements();
      } else {
        message.error(res.data.message || '操作失败');
      }
    } catch (e) {
      message.error('操作失败');
    }
  };

  // 删除公告
  const handleDelete = async (id) => {
    try {
      const res = await request(`/api/announcements/admin/${id}`, { method: 'DELETE' });
      if (res.ok && res.data.success) {
        message.success('删除成功');
        fetchAnnouncements();
      }
    } catch (e) {
      message.error('删除失败');
    }
  };

  // 切换状态
  const toggleActive = async (record) => {
    try {
      const res = await request(`/api/announcements/admin/${record.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !record.isActive }),
      });
      if (res.ok && res.data.success) {
        fetchAnnouncements();
      }
    } catch (e) {
      message.error('操作失败');
    }
  };

  // 表格列
  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type) => (
        <Tag color={type === 'image' ? 'green' : 'blue'}>
          {type === 'image' ? '图片' : '文字'}
        </Tag>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <span style={{ fontWeight: record.isBold ? 'bold' : 'normal' }}>
          {text}
        </span>
      ),
    },
    {
      title: '内容/图片',
      key: 'content',
      ellipsis: true,
      render: (_, record) => {
        if (record.type === 'image' && record.imageUrl) {
          return (
            <Image 
              src={record.imageUrl.startsWith('http') ? record.imageUrl : `https://xiaoxiang.zeabur.app${record.imageUrl}`}
              width={60}
              height={40}
              style={{ borderRadius: 4, objectFit: 'cover' }}
            />
          );
        }
        return <span style={{ color: '#666' }}>{record.content?.substring(0, 50)}...</span>;
      },
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (val, record) => (
        <Switch
          checked={val}
          onChange={() => toggleActive(record)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (time) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该公告吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="公告管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          发布公告
        </Button>
      }
    >
      <Table
        dataSource={announcements}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingId ? '编辑公告' : '发布公告'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical" initialValues={{ type: 'text', isActive: true }}>
          <Form.Item
            name="type"
            label="公告类型"
          >
            <Select>
              <Select.Option value="text">
                <Space><FileTextOutlined /> 文字公告</Space>
              </Select.Option>
              <Select.Option value="image">
                <Space><PictureOutlined /> 图片公告</Space>
              </Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="title"
            label="公告标题"
            rules={[{ required: true, message: '请输入公告标题' }]}
          >
            <Input placeholder="请输入公告标题" />
          </Form.Item>
          
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.type !== cur.type}
          >
            {({ getFieldValue }) => 
              getFieldValue('type') === 'text' ? (
                <>
                  <Form.Item
                    name="content"
                    label="公告内容"
                    rules={[{ required: true, message: '请输入公告内容' }]}
                  >
                    <TextArea rows={4} placeholder="请输入公告内容" />
                  </Form.Item>
                  
                  <Form.Item label="格式设置">
                    <Space>
                      <Form.Item name="isBold" valuePropName="checked" noStyle>
                        <Switch checkedChildren="加粗" unCheckedChildren="正常" />
                      </Form.Item>
                      <Form.Item name="isCenter" valuePropName="checked" noStyle>
                        <Switch checkedChildren="居中" unCheckedChildren="左对齐" />
                      </Form.Item>
                    </Space>
                  </Form.Item>
                </>
              ) : (
                <Form.Item
                  name="imageUrl"
                  label="图片地址"
                  rules={[{ required: true, message: '请输入图片地址' }]}
                >
                  <Input placeholder="请输入图片URL或上传" />
                </Form.Item>
              )
            }
          </Form.Item>
          
          <Form.Item
            name="isActive"
            label="立即启用"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
