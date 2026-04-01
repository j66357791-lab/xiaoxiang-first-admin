/**
 * 主题配置 - 统一管理颜色、字体、间距等，目前用于休闲中心
 */
export const COLORS = {
  // 主色调
  primary: '#4364F7',
  secondary: '#FFC107',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#F44336',
  
  // 背景色
  background: '#0f1a13',
  backgroundLight: '#1a2e2c',
  card: 'rgba(26, 46, 44, 0.8)',
  cardLight: 'rgba(255, 255, 255, 0.08)',
  
  // 文字颜色
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#333333',
  
  // 边框
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  borderAccent: 'rgba(235, 247, 67, 0.37)',
  
  // 渐变
  gradients: {
    primary: ['#1a2e2c', '#0f1a13'],
    card: ['#1a2e2c', '#0f1a13'],
    button: ['#FFD700', '#FF8C00'],
    background: ['#0f0c29', '#302b63', '#24243e'],
  },
};

export const FONTS = {
  // 字体大小
  size: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    huge: 32,
  },
  
  // 字重
  weight: {
    normal: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
    extraBold: '800',
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};
