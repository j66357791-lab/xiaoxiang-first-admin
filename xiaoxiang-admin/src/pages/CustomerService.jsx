// src/pages/CustomerService.jsx
// 客服工单管理页面 - 完整版

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Badge,
  Avatar,
  Input,
  Select,
  Tabs,
  Modal,
  message,
  Popconfirm,
  Tooltip,
  Statistic,
  Row,
  Col,
  Empty,
  Spin,
} from 'antd';
import {
  MessageOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  UserOutlined,
  RobotOutlined,
  SendOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { request } from '../utils/request';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Search } = Input;
const { TabPane } = Tabs;

// 状态配置
const STATUS_CONFIG = {
  ai_chatting: { color: 'green', text: 'AI接待中', icon: <RobotOutlined /> },
  pending: { color: 'orange', text: '待处理', icon: <ClockCircleOutlined /> },
  in_progress: { color: 'blue', text: '处理中', icon: <MessageOutlined /> },
  resolved: { color: 'cyan', text: '已解决', icon: <CheckCircleOutlined /> },
  closed: { color: 'default', text: '已关闭', icon: <CloseCircleOutlined /> },
};

// 分类配置
const CATEGORY_CONFIG = {
  task: { color: 'blue', text: '任务问题' },
  withdraw: { color: 'gold', text: '提现问题' },
  account: { color: 'purple', text: '账号问题' },
  audit: { color: 'cyan', text: '审核问题' },
  other: { color: 'default', text: '其他' },
};

// 消息气泡组件
const MessageBubble = ({ message }) => {
  const isUser = message.senderType === 'user';
  const isSystem = message.senderType === 'system';
  const isAI = message.senderType === 'ai';
  
  const getBgColor = () => {
    if (isUser) return '#e6f7ff';
    if (isSystem) return '#fff7e6';
    if (isAI) return '#f6ffed';
    return '#f0f0f0';
  };
  
  const getSenderName = () => {
    if (isUser) return message.senderInfo?.nickname || '用户';
    if (isSystem) return '系统';
    if (isAI) return '小象客服';
    return message.senderInfo?.nickname || '客服';
  };
  
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-start' : 'flex-end',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          maxWidth: '70%',
          padding: '10px 14px',
          borderRadius: 12,
          backgroundColor: getBgColor(),
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ 
          fontSize: 12, 
          color: '#999', 
          marginBottom: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          {isAI && <RobotOutlined style={{ color: '#52c41a' }} />}
          {isUser && <UserOutlined style={{ color: '#1890ff' }} />}
          {isSystem && <ExclamationCircleOutlined style={{ color: '#faad14' }} />}
          <span>{getSenderName()}</span>
          <span style={{ marginLeft: 8 }}>
            {dayjs(message.createdAt).format('MM-DD HH:mm')}
          </span>
        </div>
        <div style={{ 
          fontSize: 14, 
          color: '#333', 
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {message.content}
        </div>
      </div>
    </div>
  );
};

export default function CustomerService() {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // 获取工单列表
  const fetchTickets = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: pagination.pageSize,
      });
      
      if (activeTab !== 'all') {
        params.append('status', activeTab);
      }
      
      const res = await request.get(`/help-people/admin/tickets?${params}`);
      
      if (res.code === 200) {
        setTickets(res.data.list || []);
        setPagination(prev => ({ 
          ...prev, 
          current: page, 
          total: res.data.pagination?.total || 0 
        }));
        setStats(res.data.stats || {});
      }
    } catch (error) {
      console.error('获取工单列表失败:', error);
      message.error('获取工单列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化
  useEffect(() => {
    fetchTickets();
  }, [activeTab]);

  // 滚动到底部
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 打开聊天窗口
  const openChat = async (ticket) => {
    setCurrentTicket(ticket);
    setChatModalVisible(true);
    setMessagesLoading(true);
    setMessages([]);
    
    try {
      const res = await request.get(`/help-people/ticket/${ticket.ticketId}`);
      if (res.code === 200) {
        setMessages(res.data.messages || []);
        scrollToBottom();
      }
    } catch (error) {
      console.error('获取消息失败:', error);
      message.error('获取消息失败');
    } finally {
      setMessagesLoading(false);
    }
  };

  // 发送回复
  const sendReply = async () => {
    if (!replyContent.trim()) {
      message.warning('请输入回复内容');
      return;
    }
    
    setSending(true);
    try {
      const res = await request.post('/help-people/admin/reply', {
        ticketId: currentTicket.ticketId,
        content: replyContent.trim(),
      });
      
      if (res.code === 200) {
        setMessages(prev => [...prev, res.data]);
        setReplyContent('');
        message.success('回复成功');
        scrollToBottom();
        fetchTickets(pagination.current);
      }
    } catch (error) {
      console.error('回复失败:', error);
      message.error('回复失败');
    } finally {
      setSending(false);
    }
  };

  // 关闭工单
  const closeTicket = async (ticketId) => {
    try {
      const res = await request.post('/help-people/admin/close', { ticketId });
      if (res.code === 200) {
        message.success('工单已关闭');
        fetchTickets(pagination.current);
        if (currentTicket?.ticketId === ticketId) {
          setChatModalVisible(false);
        }
      }
    } catch (error) {
      console.error('关闭工单失败:', error);
      message.error('关闭工单失败');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '工单号',
      dataIndex: 'ticketId',
      key: 'ticketId',
      width: 170,
      render: (text) => (
        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{text}</span>
      ),
    },
    {
      title: '用户',
      dataIndex: 'userInfo',
      key: 'user',
      width: 140,
      render: (info) => (
        <Space>
          <Avatar 
            size="small" 
            icon={<UserOutlined />} 
            src={info?.avatar}
            style={{ backgroundColor: '#6A5ACD' }}
          />
          <span>{info?.nickname || '用户'}</span>
        </Space>
      ),
    },
    {
      title: '主题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text || '无主题'}</span>
        </Tooltip>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (cat) => {
        const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.closed;
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '最后消息',
      dataIndex: 'lastMessage',
      key: 'lastMessage',
      width: 200,
      render: (msg) => (
        <div>
          <div style={{ fontSize: 13, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {msg?.content || '-'}
          </div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
            {msg?.createdAt ? dayjs(msg.createdAt).fromNow() : '-'}
          </div>
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (time) => (
        <span style={{ fontSize: 13 }}>
          {dayjs(time).format('MM-DD HH:mm')}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<MessageOutlined />}
            onClick={() => openChat(record)}
          >
            回复
          </Button>
          {record.status !== 'closed' && (
            <Popconfirm
              title="确定关闭此工单？"
              description="关闭后用户需要重新进线"
              onConfirm={() => closeTicket(record.ticketId)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger>
                关闭
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card bordered={false}>
            <Statistic
              title="总工单"
              value={stats.totalTickets || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card bordered={false}>
            <Statistic
              title="待处理"
              value={stats.pending || 0}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card bordered={false}>
            <Statistic
              title="AI接待中"
              value={stats.ai_chatting || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<RobotOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card bordered={false}>
            <Statistic
              title="处理中"
              value={stats.in_progress || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card bordered={false}>
            <Statistic
              title="已解决"
              value={stats.resolved || 0}
              valueStyle={{ color: '#13c2c2' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card bordered={false}>
            <Statistic
              title="平均评分"
              value={stats.avgRating || '0.0'}
              suffix="/ 5"
            />
          </Card>
        </Col>
      </Row>

      {/* 工单列表 */}
      <Card bordered={false}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            style={{ marginBottom: 0 }}
            tabBarStyle={{ marginBottom: 0 }}
          >
            <TabPane tab="全部" key="all" />
            <TabPane 
              tab={
                <Badge count={stats.pending || 0} offset={[10, 0]}>
                  <span>待处理</span>
                </Badge>
              } 
              key="pending" 
            />
            <TabPane tab="AI接待中" key="ai_chatting" />
            <TabPane tab="处理中" key="in_progress" />
            <TabPane tab="已解决" key="resolved" />
            <TabPane tab="已关闭" key="closed" />
          </Tabs>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => fetchTickets(pagination.current)}
          >
            刷新
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="ticketId"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page) => fetchTickets(page),
          }}
          locale={{
            emptyText: <Empty description="暂无工单" />
          }}
        />
      </Card>

      {/* 聊天弹窗 */}
      <Modal
        title={
          <Space>
            <MessageOutlined style={{ color: '#1890ff' }} />
            <span>工单: {currentTicket?.ticketId}</span>
            <Tag color={STATUS_CONFIG[currentTicket?.status]?.color}>
              {STATUS_CONFIG[currentTicket?.status]?.text}
            </Tag>
            {currentTicket?.isTransferredToHuman && (
              <Tag color="orange">已转人工</Tag>
            )}
          </Space>
        }
        open={chatModalVisible}
        onCancel={() => setChatModalVisible(false)}
        footer={null}
        width={650}
        bodyStyle={{ padding: 0 }}
      >
        {/* 用户信息 */}
        <div style={{ 
          padding: '12px 16px', 
          background: '#fafafa', 
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Space>
            <Avatar 
              size="small" 
              icon={<UserOutlined />}
              src={currentTicket?.userInfo?.avatar}
            />
            <span>{currentTicket?.userInfo?.nickname || '用户'}</span>
            <Tag color={CATEGORY_CONFIG[currentTicket?.category]?.color}>
              {CATEGORY_CONFIG[currentTicket?.category]?.text}
            </Tag>
          </Space>
          <span style={{ fontSize: 12, color: '#999' }}>
            创建于 {dayjs(currentTicket?.createdAt).format('YYYY-MM-DD HH:mm')}
          </span>
        </div>
        
        {/* 消息列表 */}
        <div style={{ 
          height: 400, 
          overflow: 'auto', 
          padding: 16,
          background: '#fff',
        }}>
          {messagesLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Spin />
            </div>
          ) : messages.length === 0 ? (
            <Empty description="暂无消息" />
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.messageId || msg.id} message={msg} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* 回复区域 */}
        <div style={{ 
          padding: 16, 
          borderTop: '1px solid #f0f0f0',
          background: '#fafafa',
        }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入回复内容..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onPressEnter={sendReply}
              disabled={currentTicket?.status === 'closed'}
            />
            <Button 
              type="primary" 
              onClick={sendReply}
              loading={sending}
              disabled={currentTicket?.status === 'closed'}
              icon={<SendOutlined />}
            >
              发送
            </Button>
            {currentTicket?.status !== 'closed' && (
              <Popconfirm
                title="确定关闭此工单？"
                onConfirm={() => closeTicket(currentTicket.ticketId)}
              >
                <Button danger>关闭工单</Button>
              </Popconfirm>
            )}
          </Space.Compact>
          {currentTicket?.status === 'closed' && (
            <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
              此工单已关闭，用户需重新进线
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
