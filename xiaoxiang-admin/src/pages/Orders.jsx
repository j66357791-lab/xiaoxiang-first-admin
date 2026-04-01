import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Input, Tabs, Badge, message, Modal, Descriptions, InputNumber, Divider, Popconfirm, Typography, Segmented } from 'antd';
import { SearchOutlined, CheckCircleOutlined, EyeOutlined, DollarOutlined, CopyOutlined, ToolOutlined, DollarCircleOutlined, SendOutlined, RollbackOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

// 回收订单状态
const RECYCLE_STATUS = {
  Submitted: { label: '已提交', color: 'purple' },
  Shipping: { label: '寄送中', color: 'blue' },
  Received: { label: '已收货', color: 'cyan' },
  Inspecting: { label: '质检中', color: 'orange' },
  Quoted: { label: '已报价', color: 'gold' },
  Accepted: { label: '已接受', color: 'lime' },
  Completed: { label: '已完成', color: 'green' },
  Cancelled: { label: '已取消', color: 'default' },
};

// 回寄订单状态
const RETURN_STATUS = {
  Rejected: { label: '待处理回寄', color: 'red' },
  Returning: { label: '回寄中', color: 'blue' },
  ReturnConfirmed: { label: '回寄完成', color: 'green' },
};

const API_BASE_URL = 'https://xiaoxiang.zeabur.app';

export default function Orders() {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [orderType, setOrderType] = useState('recycle'); // recycle | return
  
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  
  const [quoteVisible, setQuoteVisible] = useState(false);
  const [quoteOrderId, setQuoteOrderId] = useState(null);
  const [quotedPrice, setQuotedPrice] = useState(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  
  const [returnVisible, setReturnVisible] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState(null);
  const [returnExpress, setReturnExpress] = useState('');
  const [returnTracking, setReturnTracking] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  const fetchData = async (endpoint, options = {}) => {
    const userStr = localStorage.getItem('user');
    let token = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.token;
      } catch (e) {}
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    return { ok: response.ok, data };
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const endpoint = orderType === 'return' ? '/api/orders/admin/returns' : '/api/orders/admin/all';
      const res = await fetchData(endpoint);
      if (res.ok && res.data?.success) {
        setOrders(res.data.data || []);
      } else {
        message.error(res.data?.message || '获取订单失败');
      }
    } catch (e) {
      message.error('获取订单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [orderType]);

  const handleConfirmReceive = async (orderId) => {
    if (!orderId) {
      message.error('订单ID无效');
      return;
    }
    try {
      const res = await fetchData(`/api/orders/${orderId}/receive`, { method: 'POST' });
      if (res.ok && res.data?.success) {
        message.success('已确认收货');
        fetchOrders();
        setDetailVisible(false);
      } else {
        message.error(res.data?.message || '操作失败');
      }
    } catch (e) {
      message.error('网络错误');
    }
  };

  const handleStartInspect = async (orderId) => {
    if (!orderId) {
      message.error('订单ID无效');
      return;
    }
    try {
      const res = await fetchData(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Inspecting' }),
      });
      if (res.ok && res.data?.success) {
        message.success('已开始质检');
        fetchOrders();
        setDetailVisible(false);
      } else {
        message.error(res.data?.message || '操作失败');
      }
    } catch (e) {
      message.error('网络错误');
    }
  };

  const handleSubmitQuote = async () => {
    if (!quotedPrice || quotedPrice <= 0) {
      message.error('请输入有效报价');
      return;
    }
    
    setQuoteLoading(true);
    try {
      const res = await fetchData(`/api/orders/${quoteOrderId}/quote`, {
        method: 'POST',
        body: JSON.stringify({ quotedPrice }),
      });
      
      if (res.ok && res.data?.success) {
        message.success('报价已提交');
        setQuoteVisible(false);
        fetchOrders();
      } else {
        message.error(res.data?.message || '报价失败');
      }
    } catch (e) {
      message.error('网络错误');
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleConfirmPayment = async (orderId) => {
    if (!orderId) {
      message.error('订单ID无效');
      return;
    }
    try {
      const res = await fetchData(`/api/orders/${orderId}/payment`, { method: 'POST' });
      if (res.ok && res.data?.success) {
        message.success('打款成功');
        fetchOrders();
        setDetailVisible(false);
      } else {
        message.error(res.data?.message || '操作失败');
      }
    } catch (e) {
      message.error('网络错误');
    }
  };

  // 安排回寄
  const handleArrangeReturn = async () => {
    if (!returnTracking) {
      message.error('请填写快递单号');
      return;
    }
    
    setReturnLoading(true);
    try {
      const res = await fetchData(`/api/orders/${returnOrderId}/arrange-return`, {
        method: 'POST',
        body: JSON.stringify({
          expressCompany: returnExpress,
          trackingNumber: returnTracking,
          notes: returnNotes,
        }),
      });
      
      if (res.ok && res.data?.success) {
        message.success('已安排回寄');
        setReturnVisible(false);
        setReturnExpress('');
        setReturnTracking('');
        setReturnNotes('');
        fetchOrders();
      } else {
        message.error(res.data?.message || '操作失败');
      }
    } catch (e) {
      message.error('网络错误');
    } finally {
      setReturnLoading(false);
    }
  };

  // 确认回寄发出
  const handleConfirmReturnShipped = async (orderId) => {
    if (!orderId) {
      message.error('订单ID无效');
      return;
    }
    try {
      const res = await fetchData(`/api/orders/${orderId}/confirm-return-shipped`, { method: 'POST' });
      if (res.ok && res.data?.success) {
        message.success('已确认发出');
        fetchOrders();
      } else {
        message.error(res.data?.message || '操作失败');
      }
    } catch (e) {
      message.error('网络错误');
    }
  };

  const handleViewDetail = (record) => {
    setCurrentOrder(record);
    setDetailVisible(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    message.success('已复制');
  };

  const STATUS_CONFIG = orderType === 'return' ? RETURN_STATUS : RECYCLE_STATUS;

  const filteredOrders = orders.filter(o => {
    const matchTab = activeTab === 'All' || o.status === activeTab;
    const matchSearch = !searchText || 
      o.orderNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
      o.userId?.email?.toLowerCase().includes(searchText.toLowerCase());
    return matchTab && matchSearch;
  });

  const getTabBadge = (key) => {
    const count = key === 'All' ? orders.length : orders.filter(o => o.status === key).length;
    return count > 0 ? <Badge count={count} style={{ marginLeft: 8 }} /> : null;
  };

  // ✅ 修复：获取订单ID的辅助函数
  const getOrderId = (record) => record._id || record.id;

  // 回收订单操作
  const getRecycleActions = (record) => {
    const status = record.status;
    const orderId = getOrderId(record);  // ✅ 使用辅助函数
    const actions = [];

    actions.push(
      <Button key="detail" type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
        详情
      </Button>
    );

    if (status === 'Shipping') {
      actions.push(
        <Popconfirm key="receive" title="确认收货？" onConfirm={() => handleConfirmReceive(orderId)}>
          <Button type="primary" size="small" icon={<CheckCircleOutlined />}>确认收货</Button>
        </Popconfirm>
      );
    }

    if (status === 'Received') {
      actions.push(
        <Button key="inspect" type="primary" size="small" icon={<ToolOutlined />} onClick={() => handleStartInspect(orderId)}>
          开始质检
        </Button>
      );
    }

    if (status === 'Inspecting') {
      actions.push(
        <Button key="quote" type="primary" size="small" icon={<DollarOutlined />} onClick={() => {
          setQuoteOrderId(orderId);
          setQuotedPrice(record.pricing?.estimatedPrice || 0);
          setQuoteVisible(true);
        }}>
          提交报价
        </Button>
      );
    }

    if (status === 'Accepted') {
      actions.push(
        <Popconfirm key="payment" title="确认打款？" onConfirm={() => handleConfirmPayment(orderId)}>
          <Button type="primary" ghost size="small" icon={<DollarCircleOutlined />}>确认打款</Button>
        </Popconfirm>
      );
    }

    return actions;
  };

  // 回寄订单操作
  const getReturnActions = (record) => {
    const status = record.status;
    const orderId = getOrderId(record);  // ✅ 使用辅助函数
    const actions = [];

    actions.push(
      <Button key="detail" type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
        详情
      </Button>
    );

    if (status === 'Rejected') {
      actions.push(
        <Button key="arrange" type="primary" size="small" icon={<RollbackOutlined />} onClick={() => {
          setReturnOrderId(orderId);
          setReturnVisible(true);
        }}>
          安排回寄
        </Button>
      );
    }

    if (status === 'Returning') {
      if (!record.returnShipping?.shippedAt) {
        actions.push(
          <Popconfirm key="shipped" title="确认已发出？" onConfirm={() => handleConfirmReturnShipped(orderId)}>
            <Button type="primary" size="small" icon={<SendOutlined />}>确认发出</Button>
          </Popconfirm>
        );
      }
    }

    return actions;
  };

  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 160,
      render: (text) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</span>,
    },
    {
      title: '商品信息',
      key: 'product',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.jobSnapshot?.title || '商品'}</div>
          <div style={{ fontSize: 12, color: '#999' }}>成色: {record.productInfo?.condition || '-'}</div>
        </div>
      ),
    },
    {
      title: '预估价/报价',
      key: 'price',
      render: (_, record) => (
        <div>
          <div>预估: ¥{record.pricing?.estimatedPrice || 0}</div>
          {record.pricing?.quotedPrice && (
            <div style={{ color: '#FF5722', fontWeight: 'bold' }}>报价: ¥{record.pricing.quotedPrice}</div>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = STATUS_CONFIG[status] || { label: status, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'time',
      render: (time) => dayjs(time).format('MM-DD HH:mm'),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_, record) => (
        <Space size="small">
          {orderType === 'return' ? getReturnActions(record) : getRecycleActions(record)}
        </Space>
      ),
    },
  ];

  const renderDetailFooter = () => {
    if (!currentOrder) return null;
    const orderId = getOrderId(currentOrder);  // ✅ 使用辅助函数
    const buttons = [];
    
    if (orderType === 'recycle') {
      if (currentOrder.status === 'Shipping') {
        buttons.push(
          <Popconfirm key="receive" title="确认收货？" onConfirm={() => handleConfirmReceive(orderId)}>
            <Button type="primary" icon={<CheckCircleOutlined />}>确认收货</Button>
          </Popconfirm>
        );
      }
      if (currentOrder.status === 'Received') {
        buttons.push(
          <Button key="inspect" type="primary" icon={<ToolOutlined />} onClick={() => handleStartInspect(orderId)}>
            开始质检
          </Button>
        );
      }
      if (currentOrder.status === 'Inspecting') {
        buttons.push(
          <Button key="quote" type="primary" icon={<DollarOutlined />} onClick={() => {
            setQuoteOrderId(orderId);
            setQuotedPrice(currentOrder.pricing?.estimatedPrice || 0);
            setQuoteVisible(true);
          }}>
            提交报价
          </Button>
        );
      }
      if (currentOrder.status === 'Accepted') {
        buttons.push(
          <Popconfirm key="payment" title="确认打款？" onConfirm={() => handleConfirmPayment(orderId)}>
            <Button type="primary" icon={<DollarCircleOutlined />}>确认打款</Button>
          </Popconfirm>
        );
      }
    } else {
      if (currentOrder.status === 'Rejected') {
        buttons.push(
          <Button key="arrange" type="primary" icon={<RollbackOutlined />} onClick={() => {
            setReturnOrderId(orderId);
            setReturnVisible(true);
          }}>
            安排回寄
          </Button>
        );
      }
      if (currentOrder.status === 'Returning' && !currentOrder.returnShipping?.shippedAt) {
        buttons.push(
          <Popconfirm key="shipped" title="确认已发出？" onConfirm={() => handleConfirmReturnShipped(orderId)}>
            <Button type="primary" icon={<SendOutlined />}>确认发出</Button>
          </Popconfirm>
        );
      }
    }
    
    buttons.push(<Button key="close" onClick={() => setDetailVisible(false)}>关闭</Button>);
    return <Space>{buttons}</Space>;
  };

  return (
    <div>
      {/* 订单类型切换 */}
      <div style={{ marginBottom: 16 }}>
        <Segmented
          value={orderType}
          onChange={(value) => {
            setOrderType(value);
            setActiveTab('All');
          }}
          options={[
            { label: '📦 回收订单', value: 'recycle' },
            { label: '🔄 回寄订单', value: 'return' },
          ]}
          size="large"
        />
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        tabBarExtraContent={
          <Input.Search
            placeholder="搜订单号/用户邮箱"
            style={{ width: 250 }}
            onSearch={setSearchText}
            allowClear
          />
        }
      >
        <Tabs.TabPane tab={<span>全部 {getTabBadge('All')}</span>} key="All" />
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <Tabs.TabPane tab={<span>{config.label} {getTabBadge(key)}</span>} key={key} />
        ))}
      </Tabs>

      <Card>
        <Table
          dataSource={filteredOrders}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1100 }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title={orderType === 'return' ? '回寄订单详情' : '订单详情'}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={renderDetailFooter()}
        width={750}
      >
        {currentOrder && (
          <div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="订单号">
                <Space>
                  <span style={{ fontFamily: 'monospace' }}>{currentOrder.orderNumber}</span>
                  <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(currentOrder.orderNumber)} />
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_CONFIG[currentOrder.status]?.color}>{STATUS_CONFIG[currentOrder.status]?.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">{dayjs(currentOrder.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              <Descriptions.Item label="用户">{currentOrder.userId?.email || currentOrder.userId?.nickname || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">📦 商品信息</Divider>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="商品名称" span={2}>{currentOrder.jobSnapshot?.title || '-'}</Descriptions.Item>
              <Descriptions.Item label="商品成色">{currentOrder.productInfo?.condition || '-'}</Descriptions.Item>
              <Descriptions.Item label="商品描述" span={2}>{currentOrder.productInfo?.description || '-'}</Descriptions.Item>
            </Descriptions>

            {/* 回寄订单显示拒绝原因和回寄物流 */}
            {orderType === 'return' && (
              <>
                {currentOrder.rejectReason && (
                  <>
                    <Divider orientation="left">❌ 拒绝原因</Divider>
                    <div style={{ padding: 12, backgroundColor: '#FFF2F0', borderRadius: 8 }}>
                      <Text type="danger">{currentOrder.rejectReason}</Text>
                    </div>
                  </>
                )}
                
                {currentOrder.returnShipping?.trackingNumber && (
                  <>
                    <Divider orientation="left">🚚 回寄物流信息</Divider>
                    <Descriptions column={2} bordered size="small">
                      <Descriptions.Item label="快递公司">{currentOrder.returnShipping.expressCompany || '-'}</Descriptions.Item>
                      <Descriptions.Item label="快递单号">
                        <Space>
                          <span style={{ fontFamily: 'monospace', color: '#1890ff' }}>{currentOrder.returnShipping.trackingNumber}</span>
                          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(currentOrder.returnShipping.trackingNumber)} />
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label="发出时间">
                        {currentOrder.returnShipping.shippedAt ? dayjs(currentOrder.returnShipping.shippedAt).format('YYYY-MM-DD HH:mm') : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="确认收货时间">
                        {currentOrder.returnShipping.confirmedAt ? dayjs(currentOrder.returnShipping.confirmedAt).format('YYYY-MM-DD HH:mm') : '-'}
                      </Descriptions.Item>
                      {currentOrder.returnShipping.notes && (
                        <Descriptions.Item label="备注" span={2}>{currentOrder.returnShipping.notes}</Descriptions.Item>
                      )}
                    </Descriptions>
                  </>
                )}
              </>
            )}

            {orderType === 'recycle' && (
              <>
                <Divider orientation="left">💰 价格信息</Divider>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="预估价格">¥{currentOrder.pricing?.estimatedPrice || 0}</Descriptions.Item>
                  <Descriptions.Item label="报价价格">
                    {currentOrder.pricing?.quotedPrice ? `¥${currentOrder.pricing.quotedPrice}` : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="最终价格" span={2}>
                    <span style={{ fontSize: 18, color: '#FF5722', fontWeight: 'bold' }}>
                      ¥{currentOrder.pricing?.finalPrice || currentOrder.amount || 0}
                    </span>
                  </Descriptions.Item>
                </Descriptions>

                <Divider orientation="left">🚚 物流信息</Divider>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="快递公司">{currentOrder.shipping?.expressCompany || '-'}</Descriptions.Item>
                  <Descriptions.Item label="快递单号">
                    {currentOrder.shipping?.trackingNumber ? (
                      <Space>
                        <span style={{ fontFamily: 'monospace', color: '#1890ff' }}>{currentOrder.shipping.trackingNumber}</span>
                        <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(currentOrder.shipping.trackingNumber)} />
                      </Space>
                    ) : '-'}
                  </Descriptions.Item>
                </Descriptions>

                <Divider orientation="left">💳 收款信息</Divider>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="收款方式">
                    {currentOrder.payment?.method === 'alipay' ? '支付宝' : 
                     currentOrder.payment?.method === 'wechat' ? '微信' : '银行卡'}
                  </Descriptions.Item>
                  <Descriptions.Item label="收款账号">{currentOrder.payment?.account || '-'}</Descriptions.Item>
                </Descriptions>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* 报价弹窗 */}
      <Modal
        title="提交报价"
        open={quoteVisible}
        onCancel={() => setQuoteVisible(false)}
        onOk={handleSubmitQuote}
        confirmLoading={quoteLoading}
      >
        <div style={{ marginBottom: 16 }}>
          <label>质检报价金额：</label>
          <InputNumber
            style={{ width: '100%', marginTop: 8 }}
            prefix="¥"
            value={quotedPrice}
            onChange={setQuotedPrice}
            min={0}
            precision={2}
            size="large"
          />
        </div>
      </Modal>

      {/* 安排回寄弹窗 */}
      <Modal
        title="安排回寄"
        open={returnVisible}
        onCancel={() => setReturnVisible(false)}
        onOk={handleArrangeReturn}
        confirmLoading={returnLoading}
      >
        <div style={{ marginBottom: 16 }}>
          <label>快递公司：</label>
          <Input
            style={{ marginTop: 8 }}
            placeholder="如：顺丰、圆通、中通..."
            value={returnExpress}
            onChange={(e) => setReturnExpress(e.target.value)}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>快递单号：</label>
          <Input
            style={{ marginTop: 8 }}
            placeholder="请输入快递单号"
            value={returnTracking}
            onChange={(e) => setReturnTracking(e.target.value)}
          />
        </div>
        <div>
          <label>备注：</label>
          <Input.TextArea
            style={{ marginTop: 8 }}
            placeholder="回寄备注（可选）"
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
}
 