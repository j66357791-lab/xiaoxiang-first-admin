// src/pages/Publish.jsx
// 发布回收商品页面（修复版 - 解决 key 为 null 和接口错误问题）

import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, InputNumber, Select, DatePicker, Switch, Button,
  Upload, Space, message, Divider, Row, Col, Image, Tag, Empty, Spin
} from 'antd';
import {
  PlusOutlined, MinusCircleOutlined, UploadOutlined, CheckCircleOutlined,
  EnvironmentOutlined, ReloadOutlined
} from '@ant-design/icons';
import { request, uploadFile } from '../utils/request';

const { TextArea } = Input;
const { Option } = Select;

// ============ 工具函数 ============

/**
 * 获取完整的图片URL
 * 统一处理图片URL拼接问题
 */
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // 如果已经是完整URL，直接返回
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // 如果是相对路径，拼接基础URL
  const API_BASE_URL = 'https://xiaoxiang.zeabur.app';
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

/**
 * 从上传结果中提取相对路径
 * 确保存储到数据库的是相对路径
 */
const extractRelativePath = (url) => {
  if (!url) return null;
  
  // 如果是完整URL，提取路径部分
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch (e) {
      return url;
    }
  }
  
  // 已经是相对路径，直接返回
  return url;
};

export default function PublishRecycleProduct() {
  const [loading, setLoading] = useState(false);
  const [categoryTree, setCategoryTree] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [form] = Form.useForm();
  
  // 数据加载状态
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  
  // 图片上传状态
  const [coverImage, setCoverImage] = useState(null);
  const [contentImages, setContentImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // 选中的分类
  const [selectedL1, setSelectedL1] = useState(null);
  const [selectedL2, setSelectedL2] = useState(null);

  // 监听寄送方式变化
  const shippingMethods = Form.useWatch('shippingMethods', form);
  const supportPickup = shippingMethods?.pickup;

  // 加载分类和仓库
  useEffect(() => {
    loadCategories();
    loadWarehouses();
  }, []);

  // 加载分类数据
  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const catRes = await request('/api/categories/tree');
      console.log('分类接口原始返回:', catRes);
      
      // 兼容多种响应结构
      let catData = [];
      if (catRes && catRes.success && Array.isArray(catRes.data)) {
        catData = catRes.data;
      } else if (catRes && catRes.data && catRes.data.success && Array.isArray(catRes.data.data)) {
        catData = catRes.data.data;
      } else if (catRes && catRes.data && Array.isArray(catRes.data)) {
        catData = catRes.data;
      } else if (Array.isArray(catRes)) {
        catData = catRes;
      }
      
      // 过滤掉无效数据
      catData = catData.filter(item => item && (item.id != null || item._id != null));
      
      console.log('解析后的分类数据:', catData);
      setCategoryTree(catData);
    } catch (e) {
      console.error('加载分类数据失败:', e);
      setCategoryTree([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // 加载仓库数据
  const loadWarehouses = async () => {
    setLoadingWarehouses(true);
    try {
      const whRes = await request('/api/warehouses/admin/all');
      console.log('仓库接口原始返回:', whRes);
      
      let whData = [];
      if (whRes && whRes.success && Array.isArray(whRes.data)) {
        whData = whRes.data;
      } else if (whRes && whRes.data && whRes.data.success && Array.isArray(whRes.data.data)) {
        whData = whRes.data.data;
      } else if (whRes && whRes.data && Array.isArray(whRes.data)) {
        whData = whRes.data;
      } else if (Array.isArray(whRes)) {
        whData = whRes;
      }
      
      // 过滤掉无效数据
      whData = whData.filter(item => item && (item.id != null || item._id != null));
      
      console.log('解析后的仓库数据:', whData);
      setWarehouses(whData);
    } catch (e) {
      console.error('加载仓库数据失败:', e);
      // 仓库接口失败时，设置为空数组，不影响其他功能
      setWarehouses([]);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  // 监听一级分类变化
  const handleL1Change = (value) => {
    console.log('选择一级分类:', value);
    setSelectedL1(value);
    setSelectedL2(null);
    form.setFieldsValue({
      categoryL1: value,
      categoryL2: undefined,
      categoryL3: undefined,
    });
  };

  // 监听二级分类变化
  const handleL2Change = (value) => {
    console.log('选择二级分类:', value);
    setSelectedL2(value);
    form.setFieldsValue({
      categoryL2: value,
      categoryL3: undefined,
    });
  };

  // 获取一级分类选项
  const getL1Options = () => {
    if (loadingCategories) {
      return <Option key="loading" value="" disabled>
        <Spin size="small" /> 加载中...
      </Option>;
    }
    
    if (!categoryTree || categoryTree.length === 0) {
      return <Option key="empty" value="" disabled>暂无分类数据</Option>;
    }
    
    return categoryTree
      .filter(l1 => l1 && (l1.id != null || l1._id != null))
      .map((l1, index) => {
        const id = l1.id ?? l1._id;
        return (
          <Option key={id ?? `l1-${index}`} value={id}>
            <span style={{ fontWeight: 500 }}>{l1.name}</span>
          </Option>
        );
      });
  };

  // 获取二级分类选项
  const getL2Options = () => {
    if (!selectedL1) {
      return <Option key="empty" value="" disabled>请先选择一级分类</Option>;
    }
    
    const l1Category = categoryTree.find(c => (c.id === selectedL1 || c._id === selectedL1));
    
    if (!l1Category || !l1Category.children || l1Category.children.length === 0) {
      return <Option key="empty" value="" disabled>该分类暂无子分类</Option>;
    }
    
    return l1Category.children
      .filter(l2 => l2 && (l2.id != null || l2._id != null))
      .map((l2, index) => {
        const id = l2.id ?? l2._id;
        return <Option key={id ?? `l2-${index}`} value={id}>{l2.name}</Option>;
      });
  };

  // 获取三级分类选项
  const getL3Options = () => {
    if (!selectedL1 || !selectedL2) {
      return <Option key="empty" value="" disabled>请先选择二级分类</Option>;
    }
    
    const l1Category = categoryTree.find(c => (c.id === selectedL1 || c._id === selectedL1));
    if (!l1Category || !l1Category.children) {
      return <Option key="empty" value="" disabled>暂无子分类</Option>;
    }
    
    const l2Category = l1Category.children.find(c => (c.id === selectedL2 || c._id === selectedL2));
    
    if (!l2Category || !l2Category.children || l2Category.children.length === 0) {
      return <Option key="empty" value="" disabled>该分类暂无子分类</Option>;
    }
    
    return l2Category.children
      .filter(l3 => l3 && (l3.id != null || l3._id != null))
      .map((l3, index) => {
        const id = l3.id ?? l3._id;
        return <Option key={id ?? `l3-${index}`} value={id}>{l3.name}</Option>;
      });
  };

  // 上传封面图 - 修复：存储相对路径
  const handleUploadCover = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    
    try {
      const result = await uploadFile(file);
      if (result.ok) {
        // 提取相对路径存储，避免存储完整URL
        const relativePath = extractRelativePath(result.data.url);
        setCoverImage(relativePath);
        onSuccess(result.data);
        message.success('封面上传成功');
      } else {
        onError(new Error('上传失败'));
      }
    } catch (error) {
      onError(error);
    } finally {
      setUploading(false);
    }
  };

  // 上传内容图片 - 修复：存储相对路径
  const handleUploadContentImages = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    
    try {
      const result = await uploadFile(file);
      if (result.ok) {
        // 提取相对路径存储
        const relativePath = extractRelativePath(result.data.url);
        const newImage = { uid: Date.now(), url: relativePath, status: 'done' };
        setContentImages(prev => [...prev, newImage]);
        onSuccess(result.data);
      } else {
        onError(new Error('上传失败'));
      }
    } catch (error) {
      onError(error);
    } finally {
      setUploading(false);
    }
  };

  // 提交表单
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const jsonData = {
        title: values.title,
        subtitle: values.subtitle,
        description: values.description,
        categoryL1: values.categoryL1,
        categoryL2: values.categoryL2 || null,
        categoryL3: values.categoryL3 || null,
        // 确保存储的是相对路径
        coverImage: coverImage,
        images: contentImages.map(img => img.url),
        
        // 价格设置 - 修复：确保所有价格字段都正确设置
        pricing: {
          basePrice: Number(values.basePrice) || 0,
          minPrice: Number(values.minPrice) || 0,
          maxPrice: Number(values.maxPrice) || 0,
          estimatedPrice: Number(values.estimatedPrice) || Number(values.basePrice) || 0,
        },
        
        // 顶层 estimatedPrice 也要设置，确保兼容性
        estimatedPrice: Number(values.estimatedPrice) || Number(values.basePrice) || 0,
        estimatedPaymentHours: values.estimatedPaymentHours || 72,
        
        conditionPrices: values.conditionPrices?.map(cp => ({
          condition: cp.condition,
          priceRate: Number(cp.priceRate) || 1,
          price: Number(cp.price) || 0,
        })) || [],
        
        warehouse: values.warehouse ? { id: values.warehouse } : null,
        assignedWarehouse: values.warehouse || null,
        
        shippingMethods: {
          express: { enabled: values.shippingMethods?.express ?? true },
          pickup: { enabled: values.shippingMethods?.pickup ?? false },
          self: { enabled: values.shippingMethods?.self ?? false },
        },
        
        pickupConfig: values.shippingMethods?.pickup ? {
          enabled: true,
          pickupRadius: values.pickupRadius || 10,
          serviceAreas: values.serviceAreas || [],
          notice: values.pickupNotice,
        } : { enabled: false },
        
        recycleConfig: {
          enableRecycle: values.enableRecycle ?? true,
          freeShipping: values.freeShipping ?? true,
          estimatedDays: values.estimatedDays || 3,
        },
        
        scheduledAt: values.scheduledAt?.toISOString() || null,
        endAt: values.endAt?.toISOString() || null,
        sort: values.sort || 0,
        isActive: values.isActive ?? true,
        amount: Number(values.estimatedPrice) || Number(values.basePrice) || 0,
        totalSlots: 999,
      };

      console.log('提交数据:', jsonData);

      const res = await request('/api/jobs', {
        method: 'POST',
        body: JSON.stringify(jsonData),
      });

      console.log('提交响应:', res);

      // 修复：兼容多种响应结构
      const isSuccess = res.ok || res.success || res.data?.success;
      
      if (isSuccess) {
        message.success('回收商品发布成功');
        form.resetFields();
        setCoverImage(null);
        setContentImages([]);
        setSelectedL1(null);
        setSelectedL2(null);
      } else {
        message.error(res.data?.message || res.message || '发布失败');
      }
    } catch (e) {
      console.error('提交错误:', e);
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const conditionOptions = ['全新', '99新', '95新', '9成新', '8成新', '7成新以下'];

  return (
    <Card 
      title="发布回收商品"
      extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => { loadCategories(); loadWarehouses(); }}
            loading={loadingCategories || loadingWarehouses}
          >
            刷新数据
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}
        initialValues={{
          enableRecycle: true,
          freeShipping: true,
          estimatedDays: 3,
          isActive: true,
          estimatedPaymentHours: 72,
          conditionPrices: [{ condition: '95新', priceRate: 0.9 }],
          shippingMethods: { express: true, pickup: false, self: false },
        }}
      >
        <Divider orientation="left">基本信息</Divider>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="title" label="商品标题" rules={[{ required: true }]}>
              <Input placeholder="如：iPhone 14 Pro 回收" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="subtitle" label="副标题">
              <Input placeholder="如：高价回收，极速打款" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="categoryL1" label="一级分类" rules={[{ required: true, message: '请选择一级分类' }]}>
              <Select 
                placeholder={categoryTree.length > 0 ? "请选择一级分类" : "加载中..."}
                onChange={handleL1Change}
                showSearch
                filterOption={(input, option) => {
                  const text = option.children?.props?.children || option.children || '';
                  return text.toLowerCase().includes(input.toLowerCase());
                }}
                notFoundContent={loadingCategories ? <Spin size="small" /> : <Empty description="暂无分类" />}
              >
                {getL1Options()}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="categoryL2" label="二级分类">
              <Select 
                placeholder={selectedL1 ? "请选择二级分类" : "请先选择一级分类"} 
                onChange={handleL2Change}
                disabled={!selectedL1}
                allowClear
              >
                {getL2Options()}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="categoryL3" label="三级分类">
              <Select 
                placeholder={selectedL2 ? "请选择三级分类" : "请先选择二级分类"} 
                disabled={!selectedL2}
                allowClear
              >
                {getL3Options()}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="商品描述">
          <TextArea rows={4} placeholder="详细描述回收商品的要求..." />
        </Form.Item>

        <Divider orientation="left">商品图片</Divider>
        
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="封面图">
              {coverImage ? (
                <div style={{ position: 'relative', width: 120, height: 120 }}>
                  {/* 修复：使用统一的URL处理函数 */}
                  <Image 
                    src={getImageUrl(coverImage)} 
                    style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }} 
                  />
                  <Button 
                    type="link" 
                    danger 
                    size="small" 
                    style={{ position: 'absolute', top: -8, right: -8 }} 
                    onClick={() => setCoverImage(null)}
                  >
                    删除
                  </Button>
                </div>
              ) : (
                <Upload customRequest={handleUploadCover} showUploadList={false} accept="image/*">
                  <Button icon={<UploadOutlined />} loading={uploading}>上传封面</Button>
                </Upload>
              )}
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item label="商品图片（最多9张）">
              <Upload 
                multiple 
                listType="picture-card" 
                fileList={contentImages.map(img => ({
                  ...img,
                  // 修复：显示时使用完整URL
                  url: getImageUrl(img.url)
                }))}
                customRequest={handleUploadContentImages}
                onRemove={(file) => setContentImages(prev => prev.filter(img => img.uid !== file.uid))}
                accept="image/*" 
                maxCount={9}
              >
                {contentImages.length >= 9 ? null : <div><UploadOutlined /><div style={{ marginTop: 8 }}>上传</div></div>}
              </Upload>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">💰 价格设置</Divider>
        
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item 
              name="estimatedPrice" 
              label="预估回收价格" 
              rules={[{ required: true, message: '请填写预估价格' }]}
              extra="此价格将显示在用户端列表页"
            >
              <InputNumber prefix="¥" style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="basePrice" label="基础参考价">
              <InputNumber prefix="¥" style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="estimatedPaymentHours" label="预估打款时间(小时)">
              <InputNumber style={{ width: '100%' }} min={1} placeholder="72" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="minPrice" label="最低回收价">
              <InputNumber prefix="¥" style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="maxPrice" label="最高回收价">
              <InputNumber prefix="¥" style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">成色价格档位</Divider>
        
        <Form.List name="conditionPrices">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Row key={field.key} gutter={8} style={{ marginBottom: 8 }}>
                  <Col span={6}>
                    <Form.Item {...field} name={[field.name, 'condition']} style={{ marginBottom: 0 }}>
                      <Select placeholder="成色">{conditionOptions.map(opt => <Option key={opt} value={opt}>{opt}</Option>)}</Select>
                    </Form.Item>
                  </Col>
                  <Col span={5}>
                    <Form.Item {...field} name={[field.name, 'priceRate']} style={{ marginBottom: 0 }}>
                      <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.1} placeholder="系数" />
                    </Form.Item>
                  </Col>
                  <Col span={5}>
                    <Form.Item {...field} name={[field.name, 'price']} style={{ marginBottom: 0 }}>
                      <InputNumber prefix="¥" style={{ width: '100%' }} min={0} placeholder="固定价" />
                    </Form.Item>
                  </Col>
                  <Col span={2}>
                    {fields.length > 1 && <MinusCircleOutlined onClick={() => remove(field.name)} />}
                  </Col>
                </Row>
              ))}
              <Button type="dashed" onClick={() => add({ condition: '95新', priceRate: 0.9 })} block icon={<PlusOutlined />}>添加档位</Button>
            </>
          )}
        </Form.List>

        <Divider orientation="left">🏭 仓库设置</Divider>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="warehouse" label="质检仓库">
              <Select 
                placeholder={loadingWarehouses ? "加载中..." : (warehouses.length > 0 ? "选择仓库" : "暂无仓库数据")} 
                allowClear
                notFoundContent={loadingWarehouses ? <Spin size="small" /> : <Empty description="暂无仓库" />}
              >
                {warehouses
                  .filter(wh => wh && (wh.id != null || wh._id != null))
                  .map((wh, index) => {
                    const id = wh.id ?? wh._id;
                    return (
                      <Option key={id ?? `wh-${index}`} value={id}>
                        <Space>{wh.name}{wh.isDefault && <Tag color="green">默认</Tag>}</Space>
                      </Option>
                    );
                  })}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="estimatedDays" label="预计处理天数">
              <InputNumber style={{ width: '100%' }} min={1} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">🚚 寄送方式配置</Divider>
        
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name={['shippingMethods', 'express']} valuePropName="checked" label="快递寄送">
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name={['shippingMethods', 'pickup']} valuePropName="checked" label="上门回收">
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name={['shippingMethods', 'self']} valuePropName="checked" label="自行送达">
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
          </Col>
        </Row>

        {supportPickup && (
          <Card size="small" title={<><EnvironmentOutlined /> 上门回收配置</>} style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="pickupRadius" label="服务半径(km)">
                  <InputNumber style={{ width: '100%' }} min={1} max={100} placeholder="10" />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item name="pickupNotice" label="上门回收须知">
                  <TextArea rows={2} placeholder="如：请确保商品在预约时间内可取..." />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        )}

        <Divider orientation="left">回收配置</Divider>
        
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="enableRecycle" valuePropName="checked" label="开启回收">
              <Switch checkedChildren="开" unCheckedChildren="关" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="freeShipping" valuePropName="checked" label="免费快递">
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="isActive" valuePropName="checked" label="立即上架">
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" size="large" icon={<CheckCircleOutlined />} loading={loading || uploading} block>
            立即发布
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
