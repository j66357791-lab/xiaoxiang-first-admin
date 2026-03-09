// src/constants/menuConfig.jsx
import {
  HomeOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  AppstoreOutlined,
  SafetyCertificateOutlined,
  TagsOutlined,
  NotificationOutlined,
  GiftOutlined,
  PayCircleOutlined,
  PlusCircleOutlined,
  ThunderboltOutlined,
  FundOutlined,
  MessageOutlined,
  QuestionCircleOutlined,
  CustomerServiceOutlined,
  EnvironmentOutlined,
  TagOutlined,  // 🆕 使用 TagOutlined 替代 TicketOutlined
} from '@ant-design/icons';

export const menuItems = [
  {
    key: '/overview',
    icon: <HomeOutlined />,
    label: '平台总览',
  },
  {
    key: '/game-dashboard',
    icon: <ThunderboltOutlined />,
    label: '休闲中心数据',
  },
  {
    key: '/publish',
    icon: <PlusCircleOutlined />,
    label: '发布回收商品',
  },
  {
    key: '/tasks',
    icon: <AppstoreOutlined />,
    label: '回收商品管理',
  },
  {
    key: '/orders',
    icon: <ShoppingCartOutlined />,
    label: '回收订单管理',
  },
  // 🆕 新增：仓库管理
  {
    key: '/warehouses',
    icon: <EnvironmentOutlined />,
    label: '仓库管理',
  },
  // 🆕 新增：优惠券管理
  {
    key: '/coupons',
    icon: <TagOutlined />,
    label: '优惠券管理',
  },
  {
    key: '/asset',
    icon: <FundOutlined />,
    label: '资产管理',
  },
  {
    key: '/users',
    icon: <UserOutlined />,
    label: '用户管理',
  },
  {
    key: '/withdrawals',
    icon: <DollarOutlined />,
    label: '提现审核',
  },
  {
    key: '/kyc',
    icon: <SafetyCertificateOutlined />,
    label: '实名审核',
  },
  {
    key: '/payments',
    icon: <PayCircleOutlined />,
    label: '支付管理',
  },
  {
    key: '/gifts',
    icon: <GiftOutlined />,
    label: '礼包管理',
  },
  {
    key: '/categories',
    icon: <TagsOutlined />,
    label: '分类管理',
  },
  {
    key: '/announcements',
    icon: <NotificationOutlined />,
    label: '公告管理',
  },
  // 客服管理
  {
    key: 'customer-service',
    icon: <CustomerServiceOutlined />,
    label: '客服管理',
    children: [
      {
        key: '/service-workbench',
        icon: <MessageOutlined />,
        label: '客服工作台',
      },
      {
        key: '/faq-manage',
        icon: <QuestionCircleOutlined />,
        label: 'FAQ管理',
      },
    ],
  },
];
