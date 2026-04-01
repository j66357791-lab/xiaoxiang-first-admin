// src/pages/FAQManage.jsx
// FAQ知识库管理页面 - 规范版（支持主FAQ和次流程，真正调用后端API）

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  message,
  Popconfirm,
  Tooltip,
  Empty,
  Spin,
  Badge,
  Collapse,
  Row,
  Col,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  FolderOutlined,
  FileTextOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { request } from '../utils/request';

const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;
const { Text } = Typography;

// 分类颜色配置
const CATEGORY_COLORS = [
  { value: '#1890ff', label: '蓝色' },
  { value: '#52c41a', label: '绿色' },
  { value: '#faad14', label: '橙色' },
  { value: '#eb2f96', label: '粉色' },
  { value: '#722ed1', label: '紫色' },
  { value: '#13c2c2', label: '青色' },
];

export default function FAQManage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [flows, setFlows] = useState([]);
  const [treeData, setTreeData] = useState([]);
  
  // 分类相关
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  
  // 流程相关
  const [flowModalVisible, setFlowModalVisible] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [flowForm] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  // 获取数据
  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取树形结构（包含分类和流程）
      const treeRes = await request.get('/api/help-people/faq/tree');
      
      if (treeRes.code === 200) {
        const tree = treeRes.data || [];
        setTreeData(tree);
        
        // 提取分类
        const cats = tree.map(t => ({
          categoryId: t.categoryId,
          name: t.name,
          color: t.color,
          icon: t.icon,
          sortOrder: t.sortOrder,
          isActive: t.isActive,
          flowCount: t.flows?.length || 0,
          _id: t.id,
        }));
        setCategories(cats);
        
        // 提取流程
        const allFlows = tree.flatMap(t => t.flows || []);
        setFlows(allFlows);
      }
    } catch (error) {
      console.error('获取FAQ数据失败:', error);
      message.error('获取数据失败，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  // 初始化默认FAQ数据
  const handleInitDefault = async () => {
    try {
      const res = await request.post('/api/help-people/faq/init');
      if (res.code === 200) {
        message.success(res.data.message);
        fetchData();
      }
    } catch (error) {
      message.error('初始化失败');
    }
  };

  // ==================== 分类操作 ====================

  const openCategoryModal = (category = null) => {
    setEditingCategory(category);
    if (category) {
      categoryForm.setFieldsValue({
        name: category.name,
        icon: category.icon,
        color: category.color,
        sortOrder: category.sortOrder || 0,
        isActive: category.isActive !== false,
      });
    } else {
      categoryForm.resetFields();
      categoryForm.setFieldsValue({ sortOrder: 0, isActive: true, color: '#1890ff' });
    }
    setCategoryModalVisible(true);
  };

  const saveCategory = async () => {
    setSubmitting(true);
    try {
      const values = await categoryForm.validateFields();
      
      let res;
      if (editingCategory) {
        // 更新分类
        res = await request.put(`/api/help-people/faq/category/${editingCategory.categoryId}`, values);
      } else {
        // 新增分类
        res = await request.post('/api/help-people/faq/category', values);
      }
      
      if (res.code === 200) {
        message.success(editingCategory ? '更新成功' : '创建成功');
        setCategoryModalVisible(false);
        fetchData();
      } else {
        message.error(res.message || '操作失败');
      }
    } catch (error) {
      console.error('保存分类失败:', error);
      if (!error.errorFields) {
        message.error('操作失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteCategory = async (categoryId) => {
    try {
      const res = await request.delete(`/api/help-people/faq/category/${categoryId}`);
      if (res.code === 200) {
        message.success('删除成功');
        fetchData();
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  // ==================== 流程操作 ====================

  const openFlowModal = (flow = null, categoryId = null) => {
    setEditingFlow(flow);
    setSelectedCategoryId(categoryId);
    
    if (flow) {
      flowForm.setFieldsValue({
        categoryId: flow.categoryId,
        title: flow.title,
        description: flow.description,
        script: flow.script,
        keywords: flow.keywords?.join(', '),
        needTicket: flow.needTicket,
        ticketType: flow.ticketType || 'consultation',
        sortOrder: flow.sortOrder || 0,
        isActive: flow.isActive !== false,
      });
    } else {
      flowForm.resetFields();
      flowForm.setFieldsValue({
        categoryId: categoryId || (categories[0]?.categoryId || ''),
        needTicket: false,
        ticketType: 'consultation',
        sortOrder: 0,
        isActive: true,
      });
    }
    setFlowModalVisible(true);
  };

  const saveFlow = async () => {
    setSubmitting(true);
    try {
      const values = await flowForm.validateFields();
      const data = {
        ...values,
        keywords: values.keywords
          ? values.keywords.split(/[,，]/).map(k => k.trim()).filter(Boolean)
          : [],
      };
      
      let res;
      if (editingFlow) {
        // 更新流程
        res = await request.put(`/api/help-people/faq/flow/${editingFlow.flowId}`, data);
      } else {
        // 新增流程
        res = await request.post('/api/help-people/faq/flow', data);
      }
      
      if (res.code === 200) {
        message.success(editingFlow ? '更新成功' : '创建成功');
        setFlowModalVisible(false);
        fetchData();
      } else {
        message.error(res.message || '操作失败');
      }
    } catch (error) {
      console.error('保存流程失败:', error);
      if (!error.errorFields) {
        message.error('操作失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteFlow = async (flowId) => {
    try {
      const res = await request.delete(`/api/help-people/faq/flow/${flowId}`);
      if (res.code === 200) {
        message.success('删除成功');
        fetchData();
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 渲染FAQ树
  const renderFAQTree = () => {
    if (treeData.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Empty description="暂无FAQ数据" />
          <Button type="primary" onClick={handleInitDefault} style={{ marginTop: 16 }}>
            初始化默认FAQ数据
          </Button>
        </div>
      );
    }

    return (
      <Collapse
        accordion
        expandIcon={({ isActive }) => <DownOutlined rotate={isActive ? 0 : -90} />}
        style={{ background: '#fff' }}
      >
        {treeData.map((category) => (
          <Panel
            key={category.categoryId}
            header={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                  <FolderOutlined style={{ color: category.color || '#1890ff' }} />
                  <span style={{ fontWeight: 500 }}>{category.name}</span>
                  <Badge count={category.flows?.length || 0} style={{ backgroundColor: category.color || '#1890ff' }} />
                </Space>
                <Space onClick={e => e.stopPropagation()}>
                  <Button
                    type="link"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => openFlowModal(null, category.categoryId)}
                  >
                    添加流程
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openCategoryModal(category)}
                  />
                  <Popconfirm
                    title="确定删除此分类？"
                    description="删除后分类下的流程也会被删除"
                    onConfirm={() => deleteCategory(category.categoryId)}
                  >
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                </Space>
              </div>
            }
            style={{ borderColor: category.color || '#1890ff' }}
          >
            {category.flows && category.flows.length > 0 ? (
              <Table
                dataSource={category.flows}
                rowKey="flowId"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: '问题',
                    dataIndex: 'title',
                    key: 'title',
                    width: 200,
                    render: (text) => <Text strong style={{ fontSize: 13 }}>{text}</Text>,
                  },
                  {
                    title: '话术',
                    dataIndex: 'script',
                    key: 'script',
                    ellipsis: true,
                    render: (text) => (
                      <Tooltip title={text}>
                        <span style={{ color: '#666' }}>{text?.substring(0, 50)}...</span>
                      </Tooltip>
                    ),
                  },
                  {
                    title: '关键词',
                    dataIndex: 'keywords',
                    key: 'keywords',
                    width: 150,
                    render: (keywords) => (
                      <Space size={[4, 4]} wrap>
                        {keywords?.slice(0, 3).map((kw, i) => (
                          <Tag key={i} style={{ margin: 0, fontSize: 11 }}>{kw}</Tag>
                        ))}
                        {keywords?.length > 3 && <Tag style={{ margin: 0 }}>+{keywords.length - 3}</Tag>}
                      </Space>
                    ),
                  },
                  {
                    title: '使用次数',
                    dataIndex: 'useCount',
                    key: 'useCount',
                    width: 80,
                    align: 'center',
                    render: (count) => <Badge count={count || 0} showZero style={{ backgroundColor: '#52c41a' }} />,
                  },
                  {
                    title: '需创建工单',
                    dataIndex: 'needTicket',
                    key: 'needTicket',
                    width: 100,
                    align: 'center',
                    render: (need) => need ? <Tag color="orange">是</Tag> : <Tag>否</Tag>,
                  },
                  {
                    title: '操作',
                    key: 'action',
                    width: 120,
                    render: (_, record) => (
                      <Space>
                        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openFlowModal(record)}>
                          编辑
                        </Button>
                        <Popconfirm title="确定删除？" onConfirm={() => deleteFlow(record.flowId)}>
                          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            删除
                          </Button>
                        </Popconfirm>
                      </Space>
                    ),
                  },
                ]}
              />
            ) : (
              <Empty description="暂无流程，点击上方添加" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Panel>
        ))}
      </Collapse>
    );
  };

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
      <Card bordered={false}>
        {/* 头部 */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong style={{ fontSize: 16 }}>
              <QuestionCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              FAQ知识库管理
            </Text>
            <Text type="secondary" style={{ marginLeft: 16 }}>
              主FAQ分类 → 次流程话术
            </Text>
          </div>
          
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              刷新
            </Button>
            <Button onClick={handleInitDefault}>
              初始化默认数据
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => openCategoryModal()}>
              新增分类
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openFlowModal()}>
              新增流程
            </Button>
          </Space>
        </div>

        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">分类总数</Text>
                <br />
                <Text strong style={{ fontSize: 24, color: '#1890ff' }}>{categories.length}</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">流程总数</Text>
                <br />
                <Text strong style={{ fontSize: 24, color: '#52c41a' }}>{flows.length}</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">启用流程</Text>
                <br />
                <Text strong style={{ fontSize: 24, color: '#722ed1' }}>
                  {flows.filter(f => f.isActive !== false).length}
                </Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">总使用次数</Text>
                <br />
                <Text strong style={{ fontSize: 24, color: '#faad14' }}>
                  {flows.reduce((sum, f) => sum + (f.useCount || 0), 0)}
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* FAQ树形结构 */}
        <Spin spinning={loading}>
          {renderFAQTree()}
        </Spin>
      </Card>

      {/* 分类弹窗 */}
      <Modal
        title={
          <Space>
            <FolderOutlined style={{ color: '#1890ff' }} />
            <span>{editingCategory ? '编辑分类' : '新增分类'}</span>
          </Space>
        }
        open={categoryModalVisible}
        onOk={saveCategory}
        onCancel={() => setCategoryModalVisible(false)}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={500}
      >
        <Form form={categoryForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder="如：提现问题、任务问题" maxLength={50} showCount />
          </Form.Item>
          
          <Form.Item name="icon" label="图标">
            <Input placeholder="图标名称（可选）" />
          </Form.Item>
          
          <Form.Item name="color" label="颜色">
            <Select>
              {CATEGORY_COLORS.map(c => (
                <Option key={c.value} value={c.value}>
                  <Tag color={c.value}>{c.label}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="sortOrder" label="排序权重" extra="数字越大越靠前">
            <InputNumber min={0} max={9999} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item name="isActive" label="是否启用" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 流程弹窗 */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#52c41a' }} />
            <span>{editingFlow ? '编辑流程' : '新增流程'}</span>
          </Space>
        }
        open={flowModalVisible}
        onOk={saveFlow}
        onCancel={() => setFlowModalVisible(false)}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={700}
      >
        <Form form={flowForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="categoryId" label="所属分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select placeholder="选择分类">
              {categories.map(cat => (
                <Option key={cat.categoryId} value={cat.categoryId}>
                  <Tag color={cat.color} style={{ margin: 0 }}>{cat.name}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="title" label="问题标题" rules={[{ required: true, message: '请输入问题标题' }]}>
            <Input placeholder="如：提现失败怎么办？" maxLength={100} showCount />
          </Form.Item>
          
          <Form.Item name="description" label="问题描述">
            <TextArea rows={2} placeholder="详细描述问题场景（可选）" maxLength={500} />
          </Form.Item>
          
          <Form.Item 
            name="script" 
            label="话术模板" 
            rules={[{ required: true, message: '请输入话术模板' }]} 
            extra="客服回复时使用的标准话术"
          >
            <TextArea rows={5} placeholder="输入客服回复的标准话术..." maxLength={2000} showCount />
          </Form.Item>
          
          <Form.Item name="keywords" label="关键词" extra="多个关键词用逗号分隔，用于AI智能匹配">
            <Input placeholder="提现, 失败, 到账, 钱包" maxLength={200} />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="needTicket" label="需要创建工单" valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ticketType" label="工单类型">
                <Select>
                  <Option value="consultation">咨询类</Option>
                  <Option value="complaint">投诉类</Option>
                  <Option value="refund">退款类</Option>
                  <Option value="account">账号类</Option>
                  <Option value="task">任务类</Option>
                  <Option value="withdraw">提现类</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sortOrder" label="排序权重" extra="数字越大越靠前">
                <InputNumber min={0} max={9999} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isActive" label="是否启用" valuePropName="checked">
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
