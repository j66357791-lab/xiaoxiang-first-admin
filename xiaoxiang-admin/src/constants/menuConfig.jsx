// src/constants/menuConfig.jsx
import {
  HomeOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  SettingOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  TagsOutlined,
  NotificationOutlined,
  GiftOutlined,
  PayCircleOutlined,
  PlusCircleOutlined,
  InboxOutlined,
  DashboardOutlined,
  ThunderboltOutlined,
  FundOutlined,  // 新增图标
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
    label: '发布兼职任务',
  },
  {
    key: '/tasks',
    icon: <AppstoreOutlined />,
    label: '兼职任务管理',
  },
  {
    key: '/orders',
    icon: <ShoppingCartOutlined />,
    label: '兼职订单管理',
  },
  {
    key: '/stock',
    icon: <InboxOutlined />,
    label: '库存管理',
  },
  // ✅ 新增：资产管理菜单
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
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系统设置',
  },
];
