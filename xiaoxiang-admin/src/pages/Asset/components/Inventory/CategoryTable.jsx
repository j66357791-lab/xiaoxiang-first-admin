// src/pages/Asset/components/Inventory/CategoryTable.jsx
/**
 * 分类管理表格
 */
import React, { useState } from 'react';
import { Table, Button, Space, Tag, Modal, Form, InputNumber, Input, message, Popconfirm, Badge } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const CategoryTable = ({ categories, setCategories, skuList }) => {
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryLevel, setCategoryLevel] = useState(1);
  
  const [categoryForm] = Form.useForm();

  const handleAddCategory = (level, parentId = null) => {
    setCategoryLevel(level);
    setEditingCategory(null);
    categoryForm.resetFields();
    categoryForm.setFieldsValue({ level, parentId });
    setCategoryModalVisible(true);
  };

  const handleEditCategory = (record) => {
    setEditingCategory(record);
    setCategoryLevel(record.level);
    categoryForm.setFieldsValue(record);
    setCategoryModalVisible(true);
  };

  const handleDeleteCategory = (id) => {
    const hasChildren = categories.some(c => c.parentId === id);
    if (hasChildren) {
      message.error('该分类下有子分类，无法删除');
      return;
    }
    
    const hasSku = (skuList || []).some(s => 
      s.category1 === id || s.category2 === id || s.category3 === id
    );
    if (hasSku) {
      message.error('该分类下有 SKU，无法删除');
      return;
    }
    
    setCategories(prev => prev.filter(c => c.id !== id));
    message.success('分类已删除');
  };

  const handleSaveCategory = async () => {
    try {
      const values = await categoryForm.validateFields();
      
      if (editingCategory) {
        setCategories(prev => prev.map(c => 
          c.id === editingCategory.id ? { ...c, ...values } : c
        ));
        message.success('分类更新成功');
      } else {
        const newCategory = {
          ...values,
          id: 'cat_' + Date.now(),
          sort: values.sort || 99,
        };
        setCategories(prev => [...prev, newCategory]);
        message.success('分类创建成功');
      }
      
      setCategoryModalVisible(false);
    } catch (e) {
      console.error('表单验证失败:', e);
    }
  };

  const getCategoryColumns = () => [
    { title: '排序', dataIndex: 'sort', width: 60, align: 'center' },
    { title: '分类名称', dataIndex: 'name', render: (text) => <span style={{ fontWeight: 500 }}>{text}</span> },
    {
      title: 'SKU数量',
      key: 'skuCount',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const count = (skuList || []).filter(s => {
          if (record.level === 1) return s.category1 === record.id;
          if (record.level === 2) return s.category2 === record.id;
          return s.category3 === record.id;
        }).length;
        return <Badge count={count} showZero color={count > 0 ? '#1890ff' : '#d9d9d9'} />;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEditCategory(record)}>编辑</Button>
          {record.level < 3 && (
            <Button type="link" size="small" onClick={() => handleAddCategory(record.level + 1, record.id)}>
              添加子分类
            </Button>
          )}
          <Popconfirm title="确定删除该分类？" onConfirm={() => handleDeleteCategory(record.id)} okText="删除" okType="danger">
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const getCategoriesByLevel = (level) => {
    return (categories || []).filter(c => c.level === level).sort((a, b) => a.sort - b.sort);
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddCategory(1)}>新建一级分类</Button>
      </div>
      
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <Tag color="blue" style={{ marginBottom: 8 }}>一级分类</Tag>
          <Table dataSource={getCategoriesByLevel(1)} columns={getCategoryColumns()} rowKey="id" pagination={false} size="small" />
        </div>
        <div style={{ flex: 1 }}>
          <Tag color="green" style={{ marginBottom: 8 }}>二级分类</Tag>
          <Table dataSource={getCategoriesByLevel(2)} columns={getCategoryColumns()} rowKey="id" pagination={false} size="small" />
        </div>
        <div style={{ flex: 1 }}>
          <Tag color="orange" style={{ marginBottom: 8 }}>三级分类</Tag>
          <Table dataSource={getCategoriesByLevel(3)} columns={getCategoryColumns()} rowKey="id" pagination={false} size="small" />
        </div>
      </div>

      <Modal
        title={'编辑' + categoryLevel + '级分类'}
        open={categoryModalVisible}
        onOk={handleSaveCategory}
        onCancel={() => setCategoryModalVisible(false)}
        width={400}
        okText="保存"
        cancelText="取消"
      >
        <Form form={categoryForm} layout="vertical">
          <Form.Item name="level" hidden><Input /></Form.Item>
          <Form.Item name="parentId" hidden><Input /></Form.Item>
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder="请输入分类名称" />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="数字越小越靠前" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CategoryTable;
