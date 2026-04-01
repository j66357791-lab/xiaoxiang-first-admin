// src/pages/ServiceWorkbench.jsx
// 客服工作台 - 规范版（参考美团/淘宝客服系统）
// 流程：客户进线 → 客服分流接待 → 会话中选择FAQ/创建工单 → 跟进用户问题 → 完结工单

import React, { useState, useEffect, useRef } from 'react';
import {
  Layout,
  List,
  Avatar,
  Badge,
  Tag,
  Input,
  Button,
  Space,
  Switch,
  message,
  Empty,
  Spin,
  Typography,
  Tabs,
  Select,
  Divider,
  Timeline,
  Modal,
  Form,
  Collapse,
  Tooltip,
  Dropdown,
  Card,
} from 'antd';
import {
  MessageOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SendOutlined,
  CloseCircleOutlined,
  RobotOutlined,
  EyeOutlined,
  SaveOutlined,
  HistoryOutlined,
  PlusOutlined,
  SwapOutlined,
  BookOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
  RightOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { request } from '../utils/request';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { Panel } = Collapse;

// 轮询间隔
const POLL_INTERVAL = 5000;

// 状态配置
const STATUS_CONFIG = {
  ai_chatting: { color: 'purple', text: 'AI对话中', icon: <RobotOutlined /> },
  queuing: { color: 'orange', text: '排队中', icon: <ClockCircleOutlined /> },
  pending: { color: 'orange', text: '待处理', icon: <ClockCircleOutlined /> },
  in_progress: { color: 'blue', text: '处理中', icon: <MessageOutlined /> },
  waiting_user: { color: 'cyan', text: '等待用户', icon: <EyeOutlined /> },
  resolved: { color: 'green', text: '已解决', icon: <CheckCircleOutlined /> },
  closed: { color: 'default', text: '已完结', icon: <CloseCircleOutlined /> },
};

// 分类配置
const CATEGORY_CONFIG = {
  task: { color: 'blue', text: '任务问题' },
  withdraw: { color: 'gold', text: '提现问题' },
  account: { color: 'purple', text: '账号问题' },
  audit: { color: 'cyan', text: '审核问题' },
  other: { color: 'default', text: '其他' },
};

// 问题类型配置
const ISSUE_TYPE_CONFIG = {
  consultation: '咨询类',
  complaint: '投诉类',
  refund: '退款类',
  account: '账号类',
  task: '任务类',
  withdraw: '提现类',
  other: '其他',
};

// 完结类型配置
const CLOSE_TYPE_CONFIG = {
  resolved: '已解决',
  unresolved: '未解决',
  user_cancel: '用户取消',
  timeout: '超时关闭',
  other: '其他',
};

// 快捷回复模板
const QUICK_REPLIES = [
  { title: '您好', content: '您好，请问有什么可以帮您的吗？' },
  { title: '稍等', content: '请稍等，我帮您查询一下~' },
  { title: '已处理', content: '您的问题已经处理好了，请查收~' },
  { title: '感谢', content: '感谢您的支持，祝您生活愉快！' },
];

export default function ServiceWorkbench() {
  const [loading, setLoading] = useState(true);
  const [staffInfo, setStaffInfo] = useState(null);
  const [stats, setStats] = useState({});
  const [pendingTickets, setPendingTickets] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [resolvedTickets, setResolvedTickets] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);

  // FAQ相关
  const [faqCategories, setFaqCategories] = useState([]);
  const [faqFlows, setFaqFlows] = useState({});
  const [activeFaqCategory, setActiveFaqCategory] = useState(null);
  const [showFaqPanel, setShowFaqPanel] = useState(true);

  // 转接相关
  const [onlineStaff, setOnlineStaff] = useState([]);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferForm] = Form.useForm();

  // 创建工单
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();

  // 工单详情表单
  const [detailForm, setDetailForm] = useState({
    userRequirement: '',
    issueType: 'consultation',
    solution: '',
    closeType: 'resolved',
    closeReason: '',
    satisfaction: 5,
    remark: '',
  });

  // 是否是超级管理员
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // 初始化
  useEffect(() => {
    initWorkbench();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // 开始轮询
  const startPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await request.get('/api/help-people/admin/workbench');
        if (res.code === 200) {
          setStats(res.data.stats);
          setPendingTickets(res.data.pendingTickets || []);
          setMyTickets(res.data.myTickets || []);
          setResolvedTickets(res.data.resolvedTickets || []);
          setOnlineStaff(res.data.onlineStaff || []);
        }

        if (currentTicket) {
          refreshMessages();
        }
      } catch (error) {
        console.error('[轮询] 错误:', error);
      }
    }, POLL_INTERVAL);
  };

  // 刷新消息
  const refreshMessages = async () => {
    if (!currentTicket) return;

    try {
      const res = await request.get(`/api/help-people/ticket/${currentTicket.ticketId}`);
      if (res.code === 200) {
        setMessages(res.data.messages || []);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    } catch (error) {
      console.error('[刷新消息] 错误:', error);
    }
  };

  // 初始化工作台
  const initWorkbench = async () => {
    setLoading(true);
    try {
      await request.post('/api/help-people/admin/init');

      const res = await request.get('/api/help-people/admin/workbench');

      if (res.code === 200) {
        setStaffInfo(res.data.staffInfo);
        setStats(res.data.stats);
        setPendingTickets(res.data.pendingTickets || []);
        setMyTickets(res.data.myTickets || []);
        setResolvedTickets(res.data.resolvedTickets || []);
        setFaqCategories(res.data.faqCategories || []);
        setOnlineStaff(res.data.onlineStaff || []);
        setIsSuperAdmin(res.data.isSuperAdmin || false);
      }

      // 获取FAQ流程
      await fetchFAQFlows();

      startPolling();
    } catch (error) {
      console.error('[初始化工作台] 错误:', error);
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取FAQ流程
  const fetchFAQFlows = async () => {
    try {
      const res = await request.get('/api/help-people/faq/tree');
      if (res.code === 200) {
        const flowsMap = {};
        res.data.forEach(cat => {
          flowsMap[cat.categoryId] = cat.flows || [];
        });
        setFaqFlows(flowsMap);
        
        if (res.data.length > 0) {
          setActiveFaqCategory(res.data[0].categoryId);
        }
      }
    } catch (error) {
      console.error('[获取FAQ流程] 错误:', error);
    }
  };

  // 切换在线状态
  const toggleOnline = async (checked) => {
    try {
      if (checked) {
        await request.post('/api/help-people/admin/online');
        message.success('已上线');
      } else {
        await request.post('/api/help-people/admin/offline');
        message.success('已下线');
      }
      initWorkbench();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 选择工单
  const selectTicket = async (ticket) => {
    setCurrentTicket(ticket);
    setMessages([]);
    setTicketDetail(null);

    try {
      const res = await request.get(`/api/help-people/ticket/${ticket.ticketId}/full`);
      if (res.code === 200) {
        setMessages(res.data.messages || []);
        setTicketDetail(res.data.detail);

        if (res.data.detail) {
          setDetailForm({
            userRequirement: res.data.detail.userRequirement || '',
            issueType: res.data.detail.issueType || 'consultation',
            solution: res.data.detail.solution || '',
            closeType: res.data.detail.closeInfo?.closeType || 'resolved',
            closeReason: res.data.detail.closeInfo?.closeReason || '',
            satisfaction: res.data.detail.closeInfo?.satisfaction || 5,
            remark: res.data.detail.closeInfo?.remark || '',
          });
        }

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('[获取工单] 错误:', error);
      message.error('获取工单失败');
    }
  };

  // 发送回复
  const sendReply = async (content = null) => {
    const replyText = content || replyContent;
    if (!replyText.trim() || !currentTicket) return;

    setSending(true);
    try {
      const res = await request.post('/api/help-people/admin/reply', {
        ticketId: currentTicket.ticketId,
        content: replyText.trim(),
      });

      if (res.code === 200) {
        setMessages((prev) => [...prev, res.data]);
        setReplyContent('');
        message.success('发送成功');
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        initWorkbench();
      }
    } catch (error) {
      message.error('发送失败');
    } finally {
      setSending(false);
    }
  };

  // 使用FAQ回复
  const useFAQReply = async (flow) => {
    if (!currentTicket) return;

    setSending(true);
    try {
      const res = await request.post('/api/help-people/admin/faq/use', {
        flowId: flow.flowId,
        ticketId: currentTicket.ticketId,
      });

      if (res.code === 200) {
        setMessages((prev) => [...prev, res.data.message]);
        message.success('FAQ回复成功');
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        initWorkbench();
      }
    } catch (error) {
      message.error('FAQ回复失败');
    } finally {
      setSending(false);
    }
  };

  // 转接工单
  const handleTransfer = async (values) => {
    try {
      const res = await request.post('/api/help-people/admin/transfer', {
        ticketId: currentTicket.ticketId,
        toServiceId: values.toServiceId,
        reason: values.reason,
      });

      if (res.code === 200) {
        message.success('转接成功');
        setTransferModalVisible(false);
        transferForm.resetFields();
        setCurrentTicket(null);
        setMessages([]);
        initWorkbench();
      }
    } catch (error) {
      message.error(error.message || '转接失败');
    }
  };

  // 保存工单详情
  const handleSaveDetail = async () => {
    if (!currentTicket) return;

    setSaving(true);
    try {
      const res = await request.put(
        `/api/help-people/ticket/${currentTicket.ticketId}/detail`,
        {
          ...detailForm,
          addLog: true,
          operatorName: staffInfo?.nickname || '客服',
          action: '更新工单详情',
          logContent: '更新了工单信息',
        }
      );

      if (res.code === 200) {
        message.success('保存成功');
        setTicketDetail(res.data);
        initWorkbench();
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 完结工单
  const handleCloseTicket = async () => {
    if (!currentTicket) return;

    if (!detailForm.closeReason.trim()) {
      message.error('请填写完结原因');
      return;
    }

    setClosing(true);
    try {
      const res = await request.post('/api/help-people/admin/close', {
        ticketId: currentTicket.ticketId,
        closeType: detailForm.closeType,
        closeReason: detailForm.closeReason,
        solution: detailForm.solution,
        satisfaction: detailForm.satisfaction,
        remark: detailForm.remark,
      });

      if (res.code === 200) {
        message.success('工单已完结');
        setCurrentTicket(null);
        setMessages([]);
        setTicketDetail(null);
        initWorkbench();
      }
    } catch (error) {
      message.error('完结失败');
    } finally {
      setClosing(false);
    }
  };

  // 创建工单
  const handleCreateTicket = async (values) => {
    try {
      const res = await request.post('/api/help-people/ticket', {
        userId: values.userId,
        userInfo: {
          nickname: values.userNickname || '用户',
          phone: values.userPhone || '',
        },
        firstMessage: values.description,
      });

      if (res.code === 200) {
        message.success('工单创建成功');
        setCreateModalVisible(false);
        createForm.resetFields();
        initWorkbench();
        if (res.data?.ticket) {
          selectTicket(res.data.ticket);
        }
      }
    } catch (error) {
      message.error('创建工单失败');
    }
  };

  // 渲染消息气泡
  const renderMessage = (msg) => {
    const isUser = msg.senderType === 'user';
    const isSystem = msg.senderType === 'system';
    const isAI = msg.senderType === 'ai';
    const isService = msg.senderType === 'service';
    const isFAQ = msg.messageType === 'faq';

    let bgColor = '#f0f0f0';
    if (isUser) bgColor = '#e6f7ff';
    if (isSystem) bgColor = '#fff7e6';
    if (isAI) bgColor = '#f6ffed';
    if (isFAQ) bgColor = '#f0f5ff';

    const justifyContent = isUser ? 'flex-start' : 'flex-end';

    return (
      <div
        key={msg.messageId || msg.id}
        style={{
          display: 'flex',
          justifyContent,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            maxWidth: '80%',
            padding: '8px 12px',
            borderRadius: 12,
            backgroundColor: bgColor,
          }}
        >
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
            {isUser && (
              <>
                <UserOutlined style={{ marginRight: 4 }} />
                <span style={{ color: '#1890ff', fontWeight: 500 }}>
                  {msg.senderInfo?.nickname || currentTicket?.userInfo?.nickname || '用户'}
                </span>
              </>
            )}
            {isAI && (
              <>
                <RobotOutlined style={{ marginRight: 4 }} />
                <span>{msg.senderInfo?.nickname || '小象客服'}</span>
              </>
            )}
            {isService && (
              <>
                <span>{msg.senderInfo?.nickname || '客服'}</span>
                {msg.senderInfo?.serviceNumber && (
                  <Tag color="blue" style={{ marginLeft: 4, fontSize: 10 }}>
                    {msg.senderInfo.serviceNumber}号
                  </Tag>
                )}
                {isFAQ && (
                  <Tag color="purple" style={{ marginLeft: 4, fontSize: 10 }}>
                    <BookOutlined /> FAQ
                  </Tag>
                )}
              </>
            )}
            {isSystem && (
              <span style={{ color: '#faad14' }}>{msg.senderInfo?.nickname || '系统'}</span>
            )}
            <span style={{ marginLeft: 8 }}>
              {dayjs(msg.createdAt).format('HH:mm')}
            </span>
          </div>
          <div style={{ fontSize: 14, color: '#333', whiteSpace: 'pre-wrap' }}>
            {msg.content}
          </div>
          {msg.faqSource?.flowTitle && (
            <div style={{ fontSize: 11, color: '#999', marginTop: 4, fontStyle: 'italic' }}>
              来源: {msg.faqSource.flowTitle}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染工单卡片
  const renderTicketCard = (ticket) => {
    const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.pending;
    const isActive = currentTicket?.ticketId === ticket.ticketId;

    return (
      <List.Item
        key={ticket.ticketId}
        onClick={() => selectTicket(ticket)}
        style={{
          padding: 12,
          cursor: 'pointer',
          backgroundColor: isActive ? '#e6f7ff' : 'transparent',
          borderRadius: 8,
          marginBottom: 4,
        }}
      >
        <List.Item.Meta
          avatar={
            <Badge count={ticket.unreadCount?.service || 0} size="small">
              <Avatar icon={<UserOutlined />} src={ticket.userInfo?.avatar} />
            </Badge>
          }
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: 14 }}>
                {ticket.userInfo?.nickname || '用户'}
              </Text>
              <Tag color={status.color} style={{ marginLeft: 8 }}>
                {status.text}
              </Tag>
            </div>
          }
          description={
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {ticket.lastMessage?.content?.substring(0, 20) || '暂无消息'}...
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>
                {dayjs(ticket.updatedAt).fromNow()}
              </Text>
            </div>
          }
        />
      </List.Item>
    );
  };

  // 渲染处理日志
  const renderProcessLogs = () => {
    if (!ticketDetail?.processLogs?.length) {
      return <Text type="secondary">暂无处理日志</Text>;
    }

    return (
      <Timeline
        style={{ marginTop: 8 }}
        items={ticketDetail.processLogs.map((log) => ({
          color: 'blue',
          children: (
            <div>
              <div style={{ fontSize: 11, color: '#999' }}>
                {dayjs(log.time).format('MM-DD HH:mm')}
              </div>
              <div style={{ fontSize: 12 }}>
                <Text strong>{log.operatorName}</Text> - {log.action}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>{log.content}</div>
            </div>
          ),
        }))}
      />
    );
  };

  // 渲染FAQ面板
  const renderFAQPanel = () => {
    if (!showFaqPanel) return null;

    return (
      <div
        style={{
          width: 280,
          borderLeft: '1px solid #f0f0f0',
          background: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid #f0f0f0',
            background: '#fff',
          }}
        >
          <Text strong style={{ fontSize: 13 }}>
            <BookOutlined style={{ marginRight: 4 }} />
            FAQ知识库
          </Text>
        </div>

        {/* FAQ分类 */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <Space wrap size={4}>
            {faqCategories.map((cat) => (
              <Tag
                key={cat.categoryId}
                color={activeFaqCategory === cat.categoryId ? 'blue' : 'default'}
                style={{ cursor: 'pointer', marginBottom: 4 }}
                onClick={() => setActiveFaqCategory(cat.categoryId)}
              >
                {cat.name} ({cat.flowCount})
              </Tag>
            ))}
          </Space>
        </div>

        {/* FAQ流程列表 */}
        <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
          {(faqFlows[activeFaqCategory] || []).map((flow) => (
            <Card
              key={flow.flowId}
              size="small"
              style={{ marginBottom: 8, cursor: 'pointer' }}
              hoverable
              onClick={() => {
                if (currentTicket) {
                  Modal.confirm({
                    title: '使用FAQ回复',
                    content: (
                      <div>
                        <p><strong>问题：</strong>{flow.title}</p>
                        <p><strong>话术：</strong>{flow.script?.substring(0, 100)}...</p>
                      </div>
                    ),
                    onOk: () => useFAQReply(flow),
                  });
                }
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                {flow.title}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {flow.script?.substring(0, 60)}...
              </div>
              {flow.needTicket && (
                <Tag color="orange" style={{ marginTop: 4, fontSize: 10 }}>
                  需创建工单
                </Tag>
              )}
            </Card>
          ))}
          {(!faqFlows[activeFaqCategory] || faqFlows[activeFaqCategory].length === 0) && (
            <Empty description="暂无FAQ" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ height: '100vh', background: '#f0f2f5' }}>
      {/* 左侧：工单列表 */}
      <Sider width={300} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        {/* 客服状态栏 */}
        <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Space>
              <Avatar style={{ backgroundColor: '#6A5ACD' }} icon={<UserOutlined />} />
              <div>
                <Text strong style={{ fontSize: 13 }}>{staffInfo?.nickname || '小象客服'}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  工号: {staffInfo?.serviceId || '001'}
                  {isSuperAdmin && <Tag color="red" style={{ marginLeft: 4, fontSize: 10 }}>超管</Tag>}
                </Text>
              </div>
            </Space>
            <Tag color={staffInfo?.onlineStatus === 'online' ? 'green' : 'default'} style={{ fontSize: 11 }}>
              {staffInfo?.onlineStatus === 'online' ? '在线' : '离线'}
            </Tag>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>在线</Text>
              <br />
              <Switch size="small" checked={staffInfo?.onlineStatus === 'online'} onChange={toggleOnline} />
            </div>
          </div>
        </div>

        {/* 统计数据 */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-around', background: '#fafafa' }}>
          <div style={{ textAlign: 'center' }}>
            <Text type="danger" strong style={{ fontSize: 18 }}>{stats.queuing || 0}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>排队中</Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text style={{ color: '#1890ff', fontSize: 18 }} strong>{stats.inProgress || 0}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>处理中</Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text style={{ color: '#52c41a', fontSize: 18 }} strong>{stats.resolved || 0}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>已完成</Text>
          </div>
        </div>

        {/* 创建工单按钮 */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
            创建工单
          </Button>
        </div>

        {/* 工单列表 */}
        <Tabs defaultActiveKey="my" style={{ padding: '0 8px' }} size="small">
          <TabPane tab={`我的工单 (${myTickets.length})`} key="my">
            <div style={{ height: 'calc(100vh - 340px)', overflow: 'auto' }}>
              {myTickets.length === 0 ? (
                <Empty description="暂无工单" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List dataSource={myTickets} renderItem={renderTicketCard} />
              )}
            </div>
          </TabPane>
          <TabPane tab={`待处理 (${pendingTickets.length})`} key="pending">
            <div style={{ height: 'calc(100vh - 340px)', overflow: 'auto' }}>
              {pendingTickets.length === 0 ? (
                <Empty description="暂无待处理工单" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List dataSource={pendingTickets} renderItem={renderTicketCard} />
              )}
            </div>
          </TabPane>
          <TabPane tab={`已完成 (${resolvedTickets.length})`} key="resolved">
            <div style={{ height: 'calc(100vh - 340px)', overflow: 'auto' }}>
              {resolvedTickets.length === 0 ? (
                <Empty description="暂无已完成工单" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List dataSource={resolvedTickets} renderItem={renderTicketCard} />
              )}
            </div>
          </TabPane>
        </Tabs>
      </Sider>

      {/* 中间：聊天区域 */}
      <Content style={{ display: 'flex', flexDirection: 'column', background: '#fff' }}>
        {currentTicket ? (
          <>
            {/* 工单信息栏 */}
            <div style={{ padding: 12, background: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Avatar icon={<UserOutlined />} src={currentTicket.userInfo?.avatar} />
                <div>
                  <Text strong>{currentTicket.userInfo?.nickname || '用户'}</Text>
                  <br />
                  <Space size={4}>
                    <Tag color={CATEGORY_CONFIG[currentTicket.category]?.color} style={{ fontSize: 11 }}>
                      {CATEGORY_CONFIG[currentTicket.category]?.text}
                    </Tag>
                    <Tag color={STATUS_CONFIG[currentTicket.status]?.color} style={{ fontSize: 11 }}>
                      {STATUS_CONFIG[currentTicket.status]?.text}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {currentTicket.ticketId}
                    </Text>
                  </Space>
                </div>
              </Space>
              
              {/* 操作按钮 */}
              <Space>
                <Tooltip title="转接">
                  <Button
                    size="small"
                    icon={<SwapOutlined />}
                    onClick={() => setTransferModalVisible(true)}
                    disabled={onlineStaff.length === 0}
                  >
                    转接
                  </Button>
                </Tooltip>
                <Tooltip title={showFaqPanel ? '隐藏FAQ' : '显示FAQ'}>
                  <Button
                    size="small"
                    icon={<BookOutlined />}
                    onClick={() => setShowFaqPanel(!showFaqPanel)}
                    type={showFaqPanel ? 'primary' : 'default'}
                  >
                    FAQ
                  </Button>
                </Tooltip>
              </Space>
            </div>

            {/* 消息区域 + FAQ面板 */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* 消息列表 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflow: 'auto', padding: 12, background: '#fafafa' }}>
                  {messages.length === 0 ? (
                    <Empty description="暂无消息" style={{ marginTop: 50 }} />
                  ) : (
                    messages.map(renderMessage)
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 快捷回复 */}
                <div style={{ padding: '8px 12px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
                  <Space wrap size={4}>
                    {QUICK_REPLIES.map((item, index) => (
                      <Button key={index} size="small" onClick={() => setReplyContent(item.content)}>
                        {item.title}
                      </Button>
                    ))}
                  </Space>
                </div>

                {/* 输入区域 */}
                <div style={{ padding: 12, background: '#fff', borderTop: '1px solid #f0f0f0' }}>
                  <TextArea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="输入回复内容..."
                    autoSize={{ minRows: 2, maxRows: 4 }}
                  />
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={() => sendReply()}
                      loading={sending}
                      disabled={!replyContent.trim()}
                    >
                      发送
                    </Button>
                  </div>
                </div>
              </div>

              {/* FAQ面板 */}
              {renderFAQPanel()}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fafafa' }}>
            <Empty description="请选择一个工单" />
          </div>
        )}
      </Content>

      {/* 右侧：工单详情 */}
      <Sider width={320} theme="light" style={{ borderLeft: '1px solid #f0f0f0', overflow: 'auto' }}>
        {currentTicket ? (
          <div style={{ padding: 12 }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>工单详情</Text>
              <Space size={4}>
                <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSaveDetail} loading={saving}>
                  保存
                </Button>
                <Button size="small" danger onClick={handleCloseTicket} loading={closing}>
                  完结
                </Button>
              </Space>
            </div>

            {/* 用户需求 */}
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>用户需求</Text>
              <TextArea
                value={detailForm.userRequirement}
                onChange={(e) => setDetailForm({ ...detailForm, userRequirement: e.target.value })}
                placeholder="描述用户的具体需求..."
                rows={2}
                style={{ fontSize: 12 }}
              />
            </div>

            {/* 问题类型 */}
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>问题类型</Text>
              <Select value={detailForm.issueType} onChange={(v) => setDetailForm({ ...detailForm, issueType: v })} style={{ width: '100%' }} size="small">
                {Object.entries(ISSUE_TYPE_CONFIG).map(([key, value]) => (
                  <Option key={key} value={key}>{value}</Option>
                ))}
              </Select>
            </div>

            {/* 解决方案 */}
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>解决方案</Text>
              <TextArea
                value={detailForm.solution}
                onChange={(e) => setDetailForm({ ...detailForm, solution: e.target.value })}
                placeholder="填写解决方案..."
                rows={2}
                style={{ fontSize: 12 }}
              />
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* 完结信息 */}
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 12 }}>完结信息</Text>
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>完结类型</Text>
              <Select value={detailForm.closeType} onChange={(v) => setDetailForm({ ...detailForm, closeType: v })} style={{ width: '100%' }} size="small">
                {Object.entries(CLOSE_TYPE_CONFIG).map(([key, value]) => (
                  <Option key={key} value={key}>{value}</Option>
                ))}
              </Select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>完结原因 *</Text>
              <TextArea
                value={detailForm.closeReason}
                onChange={(e) => setDetailForm({ ...detailForm, closeReason: e.target.value })}
                placeholder="请详细说明完结原因..."
                rows={2}
                style={{ fontSize: 12 }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>预估满意度</Text>
              <Select value={detailForm.satisfaction} onChange={(v) => setDetailForm({ ...detailForm, satisfaction: v })} style={{ width: '100%' }} size="small">
                <Option value={5}>非常满意 (5分)</Option>
                <Option value={4}>满意 (4分)</Option>
                <Option value={3}>一般 (3分)</Option>
                <Option value={2}>不满意 (2分)</Option>
                <Option value={1}>非常不满意 (1分)</Option>
              </Select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>备注</Text>
              <TextArea
                value={detailForm.remark}
                onChange={(e) => setDetailForm({ ...detailForm, remark: e.target.value })}
                placeholder="其他备注信息..."
                rows={1}
                style={{ fontSize: 12 }}
              />
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* 处理日志 */}
            <div>
              <Text strong style={{ fontSize: 12 }}>
                <HistoryOutlined style={{ marginRight: 4 }} />
                处理日志
              </Text>
              {renderProcessLogs()}
            </div>
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Empty description="选择工单查看详情" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        )}
      </Sider>

      {/* 创建工单对话框 */}
      <Modal
        title="创建新工单"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        okText="创建"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateTicket}>
          <Form.Item name="userId" label="用户ID" rules={[{ required: true, message: '请输入用户ID' }]}>
            <Input placeholder="输入用户ID" />
          </Form.Item>
          <Form.Item name="userNickname" label="用户昵称">
            <Input placeholder="输入用户昵称（可选）" />
          </Form.Item>
          <Form.Item name="userPhone" label="用户手机">
            <Input placeholder="输入用户手机（可选）" />
          </Form.Item>
          <Form.Item name="description" label="问题描述" rules={[{ required: true, message: '请输入问题描述' }]}>
            <TextArea rows={3} placeholder="描述用户的问题..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 转接工单对话框 */}
      <Modal
        title="转接工单"
        open={transferModalVisible}
        onCancel={() => {
          setTransferModalVisible(false);
          transferForm.resetFields();
        }}
        onOk={() => transferForm.submit()}
        okText="确认转接"
        cancelText="取消"
      >
        <Form form={transferForm} layout="vertical" onFinish={handleTransfer}>
          <Form.Item name="toServiceId" label="转接给" rules={[{ required: true, message: '请选择客服' }]}>
            <Select placeholder="选择客服">
              {onlineStaff.map((staff) => (
                <Option key={staff.serviceId} value={staff.serviceId}>
                  {staff.nickname} ({staff.serviceId}号)
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="reason" label="转接原因">
            <TextArea rows={2} placeholder="请输入转接原因..." />
          </Form.Item>
        </Form>
        {onlineStaff.length === 0 && (
          <div style={{ color: '#999', textAlign: 'center' }}>
            暂无其他在线客服
          </div>
        )}
      </Modal>
    </Layout>
  );
}
