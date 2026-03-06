import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, InputNumber, Select, DatePicker, Switch, Button,
  Upload, Space, message, Divider, Row, Col
} from 'antd';
import {
  PlusOutlined, MinusCircleOutlined, UploadOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { request } from '../utils/request';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

export default function Publish() {
  const [loading, setLoading] = useState(false);
  const [categoryTree, setCategoryTree] = useState([]);
  const [form] = Form.useForm();

  // 加载分类树
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await request('/api/categories/tree');
        if (res.ok && res.data.success) {
          setCategoryTree(res.data.data || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchCats();
  }, []);

  // 提交表单
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const jsonData = {
        ...values,
        deadlineHours: parseInt(values.deadlineHours),
        totalSlots: parseInt(values.totalSlots),
        depositRequirement: values.depositRequirement ? Number(values.depositRequirement) : 0,
        rewardPoints: parseInt(values.rewardPoints) || 0,
        scheduledAt: values.scheduledAt?.toISOString() || null,
        endAt: values.endAt?.toISOString() || null,
        amountLevels: values.amountLevels.map(l => ({
          ...l,
          amount: parseFloat(l.amount),
        })),
      };

      const res = await request('/api/jobs', {
        method: 'POST',
        body: JSON.stringify(jsonData),
      });

      if (res.ok && res.data.success) {
        message.success('任务发布成功');
        form.resetFields();
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
      options.push(
        <Option key={l1._id} value={l1._id}>
          <span style={{ fontWeight: 500, color: l1.color }}>{l1.name}</span>
        </Option>
      );
      
      if (l1.children) {
        l1.children.forEach(l2 => {
          options.push(
            <Option key={l2._id} value={l2._id}>
              <span style={{ paddingLeft: 16, color: l2.color }}>— {l2.name}</span>
            </Option>
          );
          
          if (l2.children) {
            l2.children.forEach(l3 => {
              options.push(
                <Option key={l3._id} value={l3._id}>
                  <span style={{ paddingLeft: 32, color: l3.color }}>—— {l3.name}</span>
                </Option>
              );
            });
          }
        });
      }
    });
    
    return options;
  };

  return (
    <Card title="发布兼职任务">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          type: 'single',
          totalSlots: 10,
          deadlineHours: 24,
          kycRequired: false,
          isRepeatable: false,
          amountLevels: [{ level: '一级', amount: '' }],
          steps: [{ text: '' }],
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="title"
              label="任务标题"
              rules={[{ required: true, message: '请输入任务标题' }]}
            >
              <Input placeholder="请输入任务标题" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="subtitle" label="任务小标题">
              <Input placeholder="如：双十一大促..." />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="category1"
              label="一级分类"
              rules={[{ required: true, message: '请选择分类' }]}
            >
              <Select placeholder="选择分类">
                {buildCategoryOptions()}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="category2" label="二级分类（可选）">
              <Select placeholder="选择分类" allowClear>
                {buildCategoryOptions()}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="category3" label="三级分类（可选）">
              <Select placeholder="选择分类" allowClear>
                {buildCategoryOptions()}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="content"
          label="任务内容"
          rules={[{ required: true, message: '请填写任务内容' }]}
        >
          <TextArea rows={4} placeholder="详细描述任务要求..." />
        </Form.Item>

        <Divider orientation="left">做单步骤</Divider>
        
        <Form.List name="steps">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, index) => (
                <Row key={field.key} gutter={8} style={{ marginBottom: 8 }}>
                  <Col span={22}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'text']}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder={`步骤 ${index + 1}`} />
                    </Form.Item>
                  </Col>
                  <Col span={2}>
                    {fields.length > 1 && (
                      <MinusCircleOutlined
                        style={{ fontSize: 20, color: '#ff4d4f' }}
                        onClick={() => remove(field.name)}
                      />
                    )}
                  </Col>
                </Row>
              ))}
              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                添加步骤
              </Button>
            </>
          )}
        </Form.List>

        <Divider orientation="left">做单要求</Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="kycRequired" valuePropName="checked" label="实名认证">
              <Switch checkedChildren="需要" unCheckedChildren="不需要" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="isRepeatable" valuePropName="checked" label="重复接单">
              <Switch checkedChildren="允许" unCheckedChildren="禁止" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="depositRequirement" label="保证金要求（元）">
              <InputNumber style={{ width: '100%' }} min={0} placeholder="0表示不限" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="rewardPoints" label="🎁 赠送积分">
              <InputNumber style={{ width: '100%' }} min={0} placeholder="完成任务赠送的积分" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">阶梯金额</Divider>

        <Form.List name="amountLevels">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, index) => (
                <Row key={field.key} gutter={8} style={{ marginBottom: 8 }}>
                  <Col span={10}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'level']}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="等级名称" />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'amount']}
                      rules={[{ required: true, message: '请输入金额' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber style={{ width: '100%' }} min={0} placeholder="金额（元）" />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    {fields.length > 1 && (
                      <MinusCircleOutlined
                        style={{ fontSize: 20, color: '#ff4d4f' }}
                        onClick={() => remove(field.name)}
                      />
                    )}
                  </Col>
                </Row>
              ))}
              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                添加阶梯
              </Button>
            </>
          )}
        </Form.List>

        <Divider orientation="left">基本信息</Divider>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="totalSlots"
              label="需求人数"
              rules={[{ required: true, message: '请输入需求人数' }]}
            >
              <InputNumber style={{ width: '100%' }} min={1} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="deadlineHours"
              label="截止时间（小时）"
              rules={[{ required: true, message: '请输入截止时间' }]}
            >
              <InputNumber style={{ width: '100%' }} min={1} placeholder="24" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="type" label="任务类型">
              <Select>
                <Option value="single">单次任务</Option>
                <Option value="longterm">长期任务</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">⚙️ 高级设置</Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="scheduledAt" label="定时发布">
              <DatePicker showTime style={{ width: '100%' }} placeholder="留空立即发布" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="endAt" label="限时抢购结束时间">
              <DatePicker showTime style={{ width: '100%' }} placeholder="留空则不限时" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginTop: 24 }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            icon={<CheckCircleOutlined />}
            loading={loading}
            block
          >
            立即发布
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
