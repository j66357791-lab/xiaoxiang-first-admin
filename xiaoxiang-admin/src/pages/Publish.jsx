// src/pages/Publish.jsx
// 发布回收商品页面（优化版）

import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, InputNumber, Select, DatePicker, Switch, Button,
  Upload, Space, message, Divider, Row, Col, Image, Tag, Collapse
} from 'antd';
import {
  PlusOutlined, MinusCircleOutlined, UploadOutlined, CheckCircleOutlined,
  EnvironmentOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { request, uploadFile } from '../utils/request';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

export default function PublishRecycleProduct() {
  const [loading, setLoading] = useState(false);
  const [categoryTree, setCategoryTree] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [form] = Form.useForm();
  
  // 图片上传状态
  const [coverImage, setCoverImage] = useState(null);
  const [contentImages, setContentImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // 监听寄送方式变化
  const shippingMethods = Form.useWatch('shippingMethods', form);
  const supportPickup = shippingMethods?.pickup;

  // 加载分类和仓库
  useEffect(() => {
    const loadData = async () => {
      try {
        const [catRes, whRes] = await Promise.all([
          request('/api/categories/tree'),
          request('/api/warehouses'),
        ]);
        if (catRes.ok && catRes.data.success) {
          setCategoryTree(catRes.data.data || []);
        }
        if (whRes.ok && whRes.data.success) {
          setWarehouses(whRes.data.data || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
  }, []);

  // 上传封面图
  const handleUploadCover = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    
    try {
      const result = await uploadFile(file);
      if (result.ok) {
        setCoverImage(result.data.url);
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

  // 上传内容图片
  const handleUploadContentImages = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    
    try {
      const result = await uploadFile(file);
      if (result.ok) {
        const newImage = { uid: Date.now(), url: result.data.url, status: 'done' };
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
        coverImage: coverImage,
        images: contentImages.map(img => img.url),
        
        // 🆕 价格设置
        pricing: {
          basePrice: values.basePrice || 0,
          minPrice: values.minPrice || 0,
          maxPrice: values.maxPrice || 0,
        },
        
        // 🆕 预估价格（管理员填写）
        estimatedPrice: values.estimatedPrice || values.basePrice || 0,
        
        // 🆕 预估打款时间
        estimatedPaymentHours: values.estimatedPaymentHours || 72,
        
        // 成色价格档位
        conditionPrices: values.conditionPrices?.map(cp => ({
          condition: cp.condition,
          priceRate: cp.priceRate,
          price: cp.price,
        })) || [],
        
        // 仓库设置
        warehouse: values.warehouse ? { id: values.warehouse } : null,
        assignedWarehouse: values.warehouse || null,
        
        // 🆕 寄送方式配置
        shippingMethods: {
          express: { enabled: values.shippingMethods?.express ?? true },
          pickup: { enabled: values.shippingMethods?.pickup ?? false },
          self: { enabled: values.shippingMethods?.self ?? false },
        },
        
        // 🆕 上门回收配置
        pickupConfig: values.shippingMethods?.pickup ? {
          enabled: true,
          pickupRadius: values.pickupRadius || 10,
          serviceAreas: values.serviceAreas || [],
          notice: values.pickupNotice,
        } : { enabled: false },
        
        // 回收配置
        recycleConfig: {
          enableRecycle: values.enableRecycle ?? true,
          freeShipping: values.freeShipping ?? true,
          estimatedDays: values.estimatedDays || 3,
        },
        
        scheduledAt: values.scheduledAt?.toISOString() || null,
        endAt: values.endAt?.toISOString() || null,
        sort: values.sort || 0,
        isActive: values.isActive ?? true,
        amount: values.estimatedPrice || values.basePrice || 0,
        totalSlots: 999,
      };

      const res = await request('/api/jobs', {
        method: 'POST',
        body: JSON.stringify(jsonData),
      });

      if (res.ok && res.data.success) {
        message.success('回收商品发布成功');
        form.resetFields();
        setCoverImage(null);
        setContentImages([]);
      } else {
        message.error(res.data.message || '发布失败');
      }
    } catch (e) {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 构建分类选项
  const buildCategoryOptions = () => {
    const options = [];
    categoryTree.forEach(l1 => {
      options.push(<Option key={l1._id} value={l1._id}><span style={{ fontWeight: 500 }}>{l1.name}</span></Option>);
      if (l1.children) {
        l1.children.forEach(l2 => {
          options.push(<Option key={l2._id} value={l2._id}><span style={{ paddingLeft: 16 }}>— {l2.name}</span></Option>);
        });
      }
    });
    return options;
  };

  const conditionOptions = ['全新', '99新', '95新', '9成新', '8成新', '7成新以下'];

  return (
    <Card title="发布回收商品">
      <Form form={form} layout="vertical" onFinish={handleSubmit}
        initialValues={{
          enableRecycle: true,
          freeShipping: true,
          estimatedDays: 3,
          isActive: true,
          estimatedPaymentHours: 72,
          conditionPrices: [{ condition: '95新', priceRate: 0.9 }],
          shippingMethods: {
            express: true,
            pickup: false,
            self: false,
          },
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
            <Form.Item name="categoryL1" label="一级分类" rules={[{ required: true }]}>
              <Select placeholder="选择分类">{buildCategoryOptions()}</Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="categoryL2" label="二级分类">
              <Select placeholder="选择分类" allowClear>{buildCategoryOptions()}</Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="categoryL3" label="三级分类">
              <Select placeholder="选择分类" allowClear>{buildCategoryOptions()}</Select>
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
                  <Image src={`https://xiaoxiang.zeabur.app${coverImage}`} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }} />
                  <Button type="link" danger size="small" style={{ position: 'absolute', top: -8, right: -8 }} onClick={() => setCoverImage(null)}>删除</Button>
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
              <Upload multiple listType="picture-card" fileList={contentImages}
                customRequest={handleUploadContentImages}
                onRemove={(file) => setContentImages(prev => prev.filter(img => img.uid !== file.uid))}
                accept="image/*" maxCount={9}
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
              extra="管理员发布的预估价格，展示给用户"
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
            <Form.Item 
              name="estimatedPaymentHours" 
              label="预估打款时间"
              extra="单位：小时，默认72小时（3天）"
            >
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
              <Select placeholder="选择仓库" allowClear>
                {warehouses.map(wh => (
                  <Option key={wh._id} value={wh._id}>
                    <Space>{wh.name}{wh.isDefault && <Tag color="green">默认</Tag>}</Space>
                  </Option>
                ))}
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

        {/* 上门回收配置 */}
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

        <Divider orientation="left">高级设置</Divider>
        
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="scheduledAt" label="定时发布">
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="endAt" label="结束时间">
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="sort" label="排序">
              <InputNumber style={{ width: '100%' }} min={0} />
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
