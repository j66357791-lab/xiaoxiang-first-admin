// 后台管理 - 回收商品管理页面
// 替换原来的 Tasks.jsx

import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Switch,
  Tag, Space, message, Popconfirm, Badge, Tabs, Select, Image
} from 'antd';
import {
  EditOutlined, DeleteOutlined,
  EyeOutlined, PlusOutlined
} from '@ant-design/icons';
import { request } from '../utils/request';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

export default function RecycleProducts() {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [editVisible, setEditVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form] = Form.useForm();

  // 状态配置
  const STATUS_CONFIG = {
    'active': { label: '回收中', color: 'success' },
    'paused': { label: '已暂停', color: 'warning' },
    'ended': { label: '已结束', color: 'default' },
    'draft': { label: '草稿', color: 'processing' },
  };

  // 获取商品列表
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await request('/api/jobs');
      if (res.ok && res.data.success) {
        setProducts(res.data.data.jobs || res.data.data || []);
      }
    } catch (e) {
      message.error('获取商品失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 判断商品状态
  const getProductStatus = (product) => {
    if (product.isFrozen) return 'paused';
    if (product.status) return product.status;
    if (product.endAt && new Date(product.endAt) < new Date()) return 'ended';
    return 'active';
  };

  // 过滤商品
  const getFilteredProducts = () => {
    return products.filter(product => {
      const status = getProductStatus(product);
      const matchTab = activeTab === 'all' || status === activeTab;
      const matchSearch = !searchText || 
        product.title?.toLowerCase().includes(searchText.toLowerCase());
      return matchTab && matchSearch;
    });
  };

  // 统计
  const getStats = () => ({
    all: products.length,
    active: products.filter(t => getProductStatus(t) === 'active').length,
    paused: products.filter(t => getProductStatus(t) === 'paused').length,
    ended: products.filter(t => getProductStatus(t) === 'ended').length,
  });

  // 打开编辑
  const openEdit = (product) => {
    setEditingProduct(product);
    form.setFieldsValue({
      title: product.title,
      subtitle: product.subtitle,
      'pricing.basePrice': product.pricing?.basePrice || product.amount,
      'pricing.minPrice': product.pricing?.minPrice,
      'pricing.maxPrice': product.pricing?.maxPrice,
      description: product.description,
      isActive: product.isActive,
      isFrozen: product.isFrozen,
      sort: product.sort,
    });
    setEditVisible(true);
  };

  // 保存编辑
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      const res = await request(`/api/jobs/${editingProduct._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...values,
          pricing: {
            basePrice: values['pricing.basePrice'],
            minPrice: values['pricing.minPrice'],
            maxPrice: values['pricing.maxPrice'],
          },
        }),
      });
      
      if (res.ok && res.data.success) {
        message.success('更新成功');
        setEditVisible(false);
        fetchProducts();
      } else {
        message.error(res.data.message || '更新失败');
      }
    } catch (e) {
      message.error('更新失败');
    }
  };

  // 冻结/解冻
  const toggleFreeze = async (product) => {
    try {
      const res = await request(`/api/jobs/freeze/${product._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isFrozen: !product.isFrozen }),
      });
      
      if (res.ok && res.data.success) {
        message.success(product.isFrozen ? '已解冻' : '已冻结');
        fetchProducts();
      }
    } catch (e) {
      message.error('操作失败');
    }
  };

  // 删除
  const handleDelete = async (id) => {
    try {
      const res = await request(`/api/jobs/${id}`, { method: 'DELETE' });
      if (res.ok && res.data.success) {
        message.success('删除成功');
        fetchProducts();
      }
    } catch (e) {
      message.error('删除失败');
    }
  };

  // 表格列
  const columns = [
    {
      title: '商品信息',
      key: 'info',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {record.coverImage || record.images?.[0] ? (
            <Image
              src={`https://xiaoxiang.zeabur.app${record.coverImage || record.images[0]}`}
              width={60}
              height={60}
              style={{ borderRadius: 8, objectFit: 'cover' }}
              alt={record.title}
            />
          ) : (
            <div style={{ 
              width: 60, height: 60, borderRadius: 8, background: '#F5F5F5',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: 24 }}>📦</span>
            </div>
          )}
          <div>
            <div style={{ fontWeight: 500 }}>{record.title}</div>
            {record.subtitle && (
              <div style={{ fontSize: 12, color: '#999' }}>{record.subtitle}</div>
            )}
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              {record.categoryL1?.name || '未分类'}
              {record.categoryL2 && ` · ${record.categoryL2.name}`}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '价格区间',
      key: 'price',
      render: (_, record) => {
        const min = record.pricing?.minPrice || record.amount || 0;
        const max = record.pricing?.maxPrice;
        if (max && max !== min) {
          return <span style={{ color: '#f50', fontWeight: 'bold' }}>¥{min} - ¥{max}</span>;
        }
        return <span style={{ color: '#f50', fontWeight: 'bold' }}>¥{min}</span>;
      },
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => {
        const status = getProductStatus(record);
        const config = STATUS_CONFIG[status];
        return <Badge status={config.color} text={config.label} />;
      },
    },
    {
      title: '回收次数',
      key: 'count',
      render: (_, record) => record.stats?.recycleCount || record.appliedCount || 0,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const status = getProductStatus(record);
        return (
          <Space>
            <Button type="link" size="small" onClick={() => { setSelectedProduct(record); setDetailVisible(true); }}>
              详情
            </Button>
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
            {status === 'paused' ? (
              <Button type="link" size="small" onClick={() => toggleFreeze(record)}>
                解冻
              </Button>
            ) : (
              <Button type="link" size="small" onClick={() => toggleFreeze(record)}>
                冻结
              </Button>
            )}
            <Popconfirm
              title="确定删除该商品吗？"
              onConfirm={() => handleDelete(record._id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger size="small">删除</Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const stats = getStats();

  return (
    <div>
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('请使用发布页面创建商品')}>
                发布商品
              </Button>
              <Input.Search
                placeholder="搜索商品名称"
                style={{ width: 200 }}
                onSearch={setSearchText}
                allowClear
              />
            </Space>
          }
        >
          <Tabs.TabPane tab={`全部 (${stats.all})`} key="all" />
          <Tabs.TabPane tab={`回收中 (${stats.active})`} key="active" />
          <Tabs.TabPane tab={`已暂停 (${stats.paused})`} key="paused" />
          <Tabs.TabPane tab={`已结束 (${stats.ended})`} key="ended" />
        </Tabs>

        <Table
          dataSource={getFilteredProducts()}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 编辑弹窗 */}
      <Modal
        title="编辑回收商品"
        open={editVisible}
        onOk={handleSave}
        onCancel={() => setEditVisible(false)}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="商品标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="subtitle" label="副标题">
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item name={['pricing', 'basePrice']} label="基础价格" style={{ width: 150 }}>
              <InputNumber prefix="¥" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name={['pricing', 'minPrice']} label="最低价" style={{ width: 150 }}>
              <InputNumber prefix="¥" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name={['pricing', 'maxPrice']} label="最高价" style={{ width: 150 }}>
              <InputNumber prefix="¥" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="商品描述">
            <TextArea rows={3} />
          </Form.Item>
          <Space>
            <Form.Item name="isActive" valuePropName="checked" noStyle>
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
            <Form.Item name="isFrozen" valuePropName="checked" noStyle>
              <Switch checkedChildren="冻结" unCheckedChildren="正常" />
            </Form.Item>
            <Form.Item name="sort" label="排序" style={{ marginLeft: 16 }}>
              <InputNumber min={0} style={{ width: 80 }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="商品详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {selectedProduct && (
          <div>
            {selectedProduct.images?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Image.PreviewGroup>
                  {selectedProduct.images.map((img, idx) => (
                    <Image
                      key={idx}
                      src={`https://xiaoxiang.zeabur.app${img}`}
                      width={80}
                      height={80}
                      style={{ borderRadius: 8, marginRight: 8, objectFit: 'cover' }}
                    />
                  ))}
                </Image.PreviewGroup>
              </div>
            )}
            
            <p><strong>标题：</strong>{selectedProduct.title}</p>
            {selectedProduct.subtitle && <p><strong>副标题：</strong>{selectedProduct.subtitle}</p>}
            <p><strong>分类：</strong>
              {selectedProduct.categoryL1?.name || '未分类'}
              {selectedProduct.categoryL2 && ` · ${selectedProduct.categoryL2.name}`}
              {selectedProduct.categoryL3 && ` · ${selectedProduct.categoryL3.name}`}
            </p>
            <p><strong>价格：</strong>
              ¥{selectedProduct.pricing?.minPrice || selectedProduct.amount || 0}
              {selectedProduct.pricing?.maxPrice && ` - ¥${selectedProduct.pricing.maxPrice}`}
            </p>
            <p><strong>回收次数：</strong>{selectedProduct.stats?.recycleCount || selectedProduct.appliedCount || 0}</p>
            <p><strong>浏览次数：</strong>{selectedProduct.stats?.viewCount || 0}</p>
            {selectedProduct.description && (
              <p><strong>描述：</strong>{selectedProduct.description}</p>
            )}
            
            {selectedProduct.conditionPrices?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <strong>成色价格档位：</strong>
                <div style={{ marginTop: 8 }}>
                  {selectedProduct.conditionPrices.map((cp, idx) => (
                    <Tag key={idx} color="blue">
                      {cp.condition}: ¥{cp.price || `${Math.round((cp.priceRate || 1) * 100)}%`}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
