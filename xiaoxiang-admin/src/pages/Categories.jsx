import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, ColorPicker, Space,
  message, Popconfirm, Badge, Tooltip
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import { request } from '../utils/request';

export default function Categories() {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form] = Form.useForm();

  // 颜色选项
  const colorOptions = [
    { value: '#4364F7', label: '蓝色' },
    { value: '#F44336', label: '红色' },
    { value: '#4CAF50', label: '绿色' },
    { value: '#FF9800', label: '橙色' },
    { value: '#9C27B0', label: '紫色' },
    { value: '#00BCD4', label: '青色' },
  ];

  // 获取分类列表
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await request('/api/categories');
      if (res.ok && res.data.success) {
        setCategories(res.data.data || []);
      }
    } catch (e) {
      message.error('获取分类失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 构建树形数据
  const buildTree = (data) => {
    const map = {};
    const roots = [];
    
    data.forEach(item => {
      map[item._id] = { ...item, children: [] };
    });
    
    data.forEach(item => {
      if (item.parentId && map[item.parentId]) {
        map[item.parentId].children.push(map[item._id]);
      } else {
        roots.push(map[item._id]);
      }
    });
    
    return roots;
  };

  // 打开新建/编辑弹窗
  const openModal = (record = null) => {
    setEditingCategory(record);
    if (record) {
      form.setFieldsValue({
        name: record.name,
        color: record.color || '#4364F7',
        parentId: record.parentId || undefined,
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 保存分类
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      const url = editingCategory 
        ? `/api/categories/${editingCategory._id}`
        : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';
      
      const res = await request(url, {
        method,
        body: JSON.stringify(values),
      });
      
      if (res.ok && res.data.success) {
        message.success(editingCategory ? '更新成功' : '添加成功');
        setModalVisible(false);
        fetchCategories();
      } else {
        message.error(res.data.message || '操作失败');
      }
    } catch (e) {
      message.error('操作失败');
    }
  };

  // 删除分类
  const handleDelete = async (id) => {
    try {
      const res = await request(`/api/categories/${id}`, { method: 'DELETE' });
      if (res.ok && res.data.success) {
        message.success('删除成功');
        fetchCategories();
      } else {
        message.error(res.data.message || '删除失败');
      }
    } catch (e) {
      message.error('删除失败');
    }
  };

  // 获取可选的父级分类
  const getParentOptions = () => {
    const options = [{ value: null, label: '无（一级分类）' }];
    
    const addOptions = (items, level = 1) => {
      items.forEach(item => {
        if (!editingCategory || item._id !== editingCategory._id) {
          const prefix = '—'.repeat(level - 1);
          options.push({
            value: item._id,
            label: `${prefix}${item.name}`,
            disabled: level >= 3, // 最多三级
          });
          
          if (item.children && item.children.length > 0) {
            addOptions(item.children, level + 1);
          }
        }
      });
    };
    
    addOptions(buildTree(categories));
    return options;
  };

  // 表格列
  const columns = [
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: 3,
            backgroundColor: record.color || '#4364F7',
          }} />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '层级',
      key: 'level',
      render: (_, record) => {
        const level = !record.parentId ? 1 : 
                      categories.find(c => c._id === record.parentId)?.parentId ? 3 : 2;
        return <Badge color={['blue', 'green', 'orange'][level - 1]} text={`${level}级分类`} />;
      },
    },
    {
      title: '子分类数',
      key: 'children',
      render: (_, record) => {
        const children = categories.filter(c => c.parentId === record._id);
        return children.length > 0 ? `${children.length}个` : '-';
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => {
        const hasChildren = categories.some(c => c.parentId === record._id);
        const level = !record.parentId ? 1 : 
                      categories.find(c => c._id === record.parentId)?.parentId ? 3 : 2;
        
        return (
          <Space>
            <Button type="link" size="small" onClick={() => openModal(record)}>
              编辑
            </Button>
            {level < 3 && (
              <Button type="link" size="small" onClick={() => openModal({ parentId: record._id })}>
                添加子分类
              </Button>
            )}
            <Popconfirm
              title={hasChildren ? '该分类下有子分类，无法删除' : '确定删除该分类吗？'}
              onConfirm={() => !hasChildren && handleDelete(record._id)}
              okText="确定"
              cancelText="取消"
              okButtonProps={{ disabled: hasChildren }}
            >
              <Button type="link" danger size="small" disabled={hasChildren}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <Card
      title="分类管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          添加分类
        </Button>
      }
    >
      <Table
        dataSource={buildTree(categories)}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={false}
        defaultExpandAllRows
      />

      <Modal
        title={editingCategory ? '编辑分类' : '添加分类'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>
          
          <Form.Item name="color" label="分类颜色" initialValue="#4364F7">
            <Select>
              {colorOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>
                  <Space>
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      backgroundColor: opt.value,
                    }} />
                    {opt.label}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="parentId" label="父级分类">
            <Select
              placeholder="选择父级分类（可选）"
              allowClear
              options={getParentOptions()}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
