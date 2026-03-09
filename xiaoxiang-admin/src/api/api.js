// src/api/api.js
import { API_URL } from '@/constants/api';

// ==================== Web端适配：Token获取 ====================
// [注意] Web端使用 localStorage 替代 React Native 的 AsyncStorage
const getToken = () => {
  try {
    const userDataStr = localStorage.getItem('user');
    if (!userDataStr) return null;
    const userData = JSON.parse(userDataStr);
    return userData.token;
  } catch (error) {
    console.error('[API] 获取Token失败:', error);
    return null;
  }
};

// ==================== 核心请求方法 ====================
/**
 * 通用请求方法
 * @param {string} endpoint - 接口路径
 * @param {object} options - 配置项 { method, body, headers, ... }
 */
const request = async (endpoint, options = {}) => {
  try {
    // 1. 获取 Token
    const token = getToken();

    // 2. 设置 Headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 3. 处理 URL
    const url = `${API_URL}${endpoint}`;

    // 4. 发起请求
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 5. 处理响应
    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || '请求失败', data };
    }

    return data;

  } catch (error) {
    console.error(`[API] ${endpoint} 请求失败:`, error);
    return { success: false, message: '网络错误，请检查网络连接' };
  }
};

// ==================== 转盘游戏 API ====================

// 开始游戏
export const startGame = async (ticketPrice = 10) => {
  return request('/api/games/wheel5600/start', {
    method: 'POST',
    body: JSON.stringify({ ticketPrice }),
  });
};

// 旋转转盘
export const spinWheel = async (round) => {
  return request('/api/games/wheel5600/spin', {
    method: 'POST',
    body: JSON.stringify({ round }),
  });
};

// 获取奖池信息
export const getJackpotInfo = async () => {
  return request('/api/games/wheel5600/jackpot');
};

// 获取游戏历史
export const getGameHistory = async (limit = 20) => {
  return request(`/api/games/wheel5600/history?limit=${limit}`);
};

// 获取投注选项
export const getBetOptions = async () => {
  return request('/api/games/wheel5600/bet-options');
};

// 获取大奖名单
export const getJackpotWinners = async () => {
  return request('/api/games/wheel5600/winners');
};

// 获取当前进行中的游戏
export const getCurrentGame = async () => {
  return request('/api/games/wheel5600/current');
};

// ==================== 神秘商店 API ====================

// 获取商店状态
export const getMysteryShopStatus = async () => {
  return request('/api/mystery-shop/status');
};

// 切换场阶
export const switchMysteryShopLevel = async (level) => {
  return request('/api/mystery-shop/switch-level', {
    method: 'POST',
    body: JSON.stringify({ level }),
  });
};

// 抽奖
export const mysteryShopDraw = async () => {
  return request('/api/mystery-shop/draw', {
    method: 'POST',
  });
};

// 获取抽奖历史
export const getMysteryShopHistory = async (page = 1, limit = 20) => {
  return request(`/api/mystery-shop/history?page=${page}&limit=${limit}`);
};

// ==================== 用户资产 API ====================

// 获取用户信息
export const getUserInfo = async () => {
  return request('/api/users/me');
};

// 更新积分
export const updatePoints = async (amount, type, description) => {
  return request('/api/users/me/points', {
    method: 'POST',
    body: JSON.stringify({ amount, type, description }),
  });
};

// ==================== 资产管理 API (新增) ====================

/**
 * 从订单创建资产
 * @param {String} orderId - 订单ID
 * @returns {Promise}
 */
export const createAssetFromOrder = async (orderId) => {
  return request('/api/assets/from-order', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
};
