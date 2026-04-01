// src/pages/Asset/components/Inventory/CategoryTable.jsx
/**
 * 【记忆锚点】资产库存 - 本地分类表格组件
 * 
 * 【重要警告】这是一个“纯前端/纯本地”的组件！
 * 它没有任何 fetch/axios 请求，所有的增删改都是在操作内存里的数组（假数据）。
 * 它的存在只是为了在“资产管理->库存”页面里，配合 SKU 列表做前端的联动展示用的。
 * 千万不要把它当成全局的分类管理页面去用！全局分类管理在 /src/pages/Categories.jsx
 */
import React, { useState } from 'react';
import { Table, Button, Space, Tag, Modal, Form, InputNumber, Input, message, Popconfirm, Badge } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

// 组件接收的 props：
// categories: 外部传进来的分类数组（通常是父组件的 state）
// setCategories: 外部传进来的修改分类数组的函数（用于纯本地修改）
// skuList: 外部传进来的 SKU 商品列表（用于统计每个分类下有多少个商品）
const CategoryTable = ({ categories, setCategories, skuList }) => {
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryLevel, setCategoryLevel] = useState(1);
  const [categoryForm] = Form.useForm();

  // 【纯本地操作】打开“新增”弹窗
  const handleAddCategory = (level, parentId = null) => {
    setCategoryLevel(level);
    setEditingCategory(null); // 置空代表是新增模式
    categoryForm.resetFields();
    categoryForm.setFieldsValue({ level, parentId });
    setCategoryModalVisible(true);
  };

  // 【纯本地操作】打开“编辑”弹窗
  const handleEditCategory = (record) => {
    setEditingCategory(record); // 传入当前行数据，代表是编辑模式
    setCategoryLevel(record.level);
    categoryForm.setFieldsValue(record);
    setCategoryModalVisible(true);
  };

  // 【纯本地操作】删除分类
  const handleDeleteCategory = (id) => {
    // 安全校验1：本地检查有没有子分类
    const hasChildren = categories.some(c => c.parentId === id);
    if (hasChildren) {
      message.error('该分类下有子分类，无法删除');
      return;
    }
    // 安全校验2：本地检查这个分类下有没有绑定的 SKU 商品
    const hasSku = (skuList || []).some(s => s.category1 === id || s.category2 === id || s.category3 === id );
    if (hasSku) {
      message.error('该分类下有 SKU，无法删除');
      return;
    }
    // 直接操作前端数组，把这条数据过滤掉（不会发请求给后端）
    setCategories(prev => prev.filter(c => c.id !== id));
    message.success('分类已删除');
  };

  // 【纯本地操作】点击弹窗的“保存”按钮
  const handleSaveCategory = async () => {
    try {
      const values = await categoryForm.validateFields();
      if (editingCategory) {
        // 如果是编辑：在本地数组里找到这一条，把表单数据覆盖进去
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...values } : c ));
        message.success('分类更新成功');
      } else {
        // 如果是新增：【注意看这里！】伪造了一个前端的假 id ('cat_时间戳')，没有调后端接口！
        const newCategory = {
          ...values,
          id: 'cat_' + Date.now(), 
          sort: values.sort || 99,
        };
        // 直接把假数据塞进前端数组里
        setCategories(prev => [...prev, newCategory]);
        message.success('分类创建成功'); // 这里的成功是骗人的，一刷新就没了
      }
      setCategoryModalVisible(false);
    } catch (e) {
      console.error('表单验证失败:', e);
    }
  };

  // 表格列配置（复用同一套列配置）
  const getCategoryColumns = () => [
    { title: '排序', dataIndex: 'sort', width: 60, align: 'center' },
    { title: '分类名称', dataIndex: 'name', render: (text) => <span style={{ fontWeight: 500 }}>{text}</span> },
    {
      title: 'SKU数量', // 这个列只有这个组件有，因为只有它接收了 skuList
      key: 'skuCount',
      width: 100,
      align: 'center',
      render: (_, record) => {
        // 根据分类的 level，去 skuList 里找对应的数量
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

  // 【核心UI逻辑】把一维数组，按 level 拆成三个独立的表格并排展示
  const getCategoriesByLevel = (level) => {
    return (categories || []).filter(c => c.level === level).sort((a, b) => a.sort - b.sort);
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddCategory(1)}>新建一级分类</Button>
      </div>
      {/* 下面是三列并排的布局，分别展示 1级、2级、3级 */}
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
      <Modal title={'编辑' + categoryLevel + '级分类'} open={categoryModalVisible} onOk={handleSaveCategory} onCancel={() => setCategoryModalVisible(false)} width={400} okText="保存" cancelText="取消" >
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
