import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Switch,
  Tag, Space, message, Popconfirm, Badge, Tabs
} from 'antd';
import {
  EditOutlined, DeleteOutlined, LockOutlined, UnlockOutlined,
  SyncOutlined, EyeOutlined
} from '@ant-design/icons';
import { request } from '../utils/request';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

export default function Tasks() {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [editVisible, setEditVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [form] = Form.useForm();

  // 状态配置
  const STATUS_CONFIG = {
    'published': { label: '已发布', color: 'success' },
    'ended': { label: '已结束', color: 'default' },
    'frozen': { label: '已冻结', color: 'error' },
  };

  // 获取任务列表
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await request('/api/jobs');
      if (res.ok && res.data.success) {
        setTasks(res.data.data.jobs || res.data.data || []);
      }
    } catch (e) {
      message.error('获取任务失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // 判断任务状态
  const getTaskStatus = (task) => {
    if (task.isFrozen) return 'frozen';
    if (task.deadline && new Date(task.deadline) < new Date()) return 'ended';
    return 'published';
  };

  // 过滤任务
  const getFilteredTasks = () => {
    return tasks.filter(task => {
      const status = getTaskStatus(task);
      const matchTab = activeTab === 'all' || status === activeTab;
      const matchSearch = !searchText || 
        task.title?.toLowerCase().includes(searchText.toLowerCase());
      return matchTab && matchSearch;
    });
  };

  // 统计
  const getStats = () => ({
    all: tasks.length,
    published: tasks.filter(t => getTaskStatus(t) === 'published').length,
    ended: tasks.filter(t => getTaskStatus(t) === 'ended').length,
    frozen: tasks.filter(t => getTaskStatus(t) === 'frozen').length,
  });

  // 打开编辑
  const openEdit = (task) => {
    setEditingTask(task);
    form.setFieldsValue({
      title: task.title,
      subtitle: task.subtitle,
      amount: task.amount,
      totalSlots: task.totalSlots,
      deadline: task.deadline ? dayjs(task.deadline) : null,
      description: task.description,
      isRepeatable: task.isRepeatable,
      kycRequired: task.kycRequired,
    });
    setEditVisible(true);
  };

  // 保存编辑
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      const res = await request(`/api/jobs/${editingTask._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...values,
          deadline: values.deadline?.toISOString(),
        }),
      });
      
      if (res.ok && res.data.success) {
        message.success('更新成功');
        setEditVisible(false);
        fetchTasks();
      } else {
        message.error(res.data.message || '更新失败');
      }
    } catch (e) {
      message.error('更新失败');
    }
  };

  // 冻结/解冻
  const toggleFreeze = async (task) => {
    try {
      const res = await request(`/api/jobs/freeze/${task._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isFrozen: !task.isFrozen }),
      });
      
      if (res.ok && res.data.success) {
        message.success(task.isFrozen ? '已解冻' : '已冻结');
        fetchTasks();
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
        fetchTasks();
      }
    } catch (e) {
      message.error('删除失败');
    }
  };

  // 恢复任务
  const restoreTask = async (task) => {
    const newDeadline = new Date();
    newDeadline.setDate(newDeadline.getDate() + 7);
    
    try {
      const res = await request(`/api/jobs/${task._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          deadline: newDeadline.toISOString(),
          isFrozen: false,
        }),
      });
      
      if (res.ok && res.data.success) {
        message.success('任务已恢复');
        fetchTasks();
      }
    } catch (e) {
      message.error('恢复失败');
    }
  };

  // 表格列
  const columns = [
    {
      title: '任务名称',
      key: 'title',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.title}</div>
          {record.subtitle && (
            <div style={{ fontSize: 12, color: '#999' }}>{record.subtitle}</div>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => {
        const status = getTaskStatus(record);
        const config = STATUS_CONFIG[status];
        return <Badge status={config.color} text={config.label} />;
      },
    },
    {
      title: '佣金',
      dataIndex: 'amount',
      key: 'amount',
      render: (val) => <span style={{ color: '#f50', fontWeight: 'bold' }}>¥{val}</span>,
    },
    {
      title: '接单情况',
      key: 'slots',
      render: (_, record) => `${record.appliedCount || 0}/${record.totalSlots}`,
    },
    {
      title: '截止时间',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const status = getTaskStatus(record);
        return (
          <Space>
            <Button type="link" size="small" onClick={() => { setSelectedTask(record); setDetailVisible(true); }}>
              详情
            </Button>
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
            {status === 'frozen' ? (
              <Button type="link" size="small" onClick={() => toggleFreeze(record)}>
                解冻
              </Button>
            ) : (
              <Button type="link" size="small" onClick={() => toggleFreeze(record)}>
                冻结
              </Button>
            )}
            {status === 'ended' && (
              <Button type="link" size="small" onClick={() => restoreTask(record)}>
                恢复
              </Button>
            )}
            <Popconfirm
              title="确定删除该任务吗？"
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
            <Input.Search
              placeholder="搜索任务名称"
              style={{ width: 200 }}
              onSearch={setSearchText}
              allowClear
            />
          }
        >
          <Tabs.TabPane tab={`全部 (${stats.all})`} key="all" />
          <Tabs.TabPane tab={`已发布 (${stats.published})`} key="published" />
          <Tabs.TabPane tab={`已结束 (${stats.ended})`} key="ended" />
          <Tabs.TabPane tab={`已冻结 (${stats.frozen})`} key="frozen" />
        </Tabs>

        <Table
          dataSource={getFilteredTasks()}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 编辑弹窗 */}
      <Modal
        title="编辑任务"
        open={editVisible}
        onOk={handleSave}
        onCancel={() => setEditVisible(false)}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="任务标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="subtitle" label="副标题">
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item name="amount" label="佣金" style={{ width: 150 }}>
              <InputNumber prefix="¥" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="totalSlots" label="名额" style={{ width: 150 }}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="deadline" label="截止时间">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="任务描述">
            <TextArea rows={3} />
          </Form.Item>
          <Space>
            <Form.Item name="isRepeatable" valuePropName="checked" noStyle>
              <Switch checkedChildren="可重复" unCheckedChildren="不可重复" />
            </Form.Item>
            <Form.Item name="kycRequired" valuePropName="checked" noStyle>
              <Switch checkedChildren="需实名" unCheckedChildren="无需实名" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="任务详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={600}
      >
        {selectedTask && (
          <div>
            <p><strong>标题：</strong>{selectedTask.title}</p>
            <p><strong>佣金：</strong>¥{selectedTask.amount}</p>
            <p><strong>接单：</strong>{selectedTask.appliedCount}/{selectedTask.totalSlots}</p>
            <p><strong>截止：</strong>{selectedTask.deadline ? dayjs(selectedTask.deadline).format('YYYY-MM-DD HH:mm') : '-'}</p>
            <p><strong>描述：</strong>{selectedTask.description || '-'}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
