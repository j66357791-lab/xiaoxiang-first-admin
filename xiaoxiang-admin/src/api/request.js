//网络缓存处理

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://xiaoxiang.zeabur.app';

/**
 * 底层网络请求驱动
 * @param {string} endpoint - 接口路径
 * @param {object} options - 配置项 { method, body, headers }
 */
const rawRequest = async (endpoint, options = {}) => {
  try {
    // 1. 获取 Token
    const userStr = await AsyncStorage.getItem('user');
    let token = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.token;
      } catch (e) {
        console.error('[Helpers] 解析用户信息失败', e);
      }
    }

    // 2. 处理 URL
    let finalEndpoint = endpoint;
    if (!finalEndpoint.startsWith('/api')) {
      finalEndpoint = `/api${finalEndpoint}`;
    }
    const url = `${API_BASE_URL}${finalEndpoint}`;

    // 3. 设置 Headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 4. 处理 Body
    let body = options.body;
    if (body) {
      if (body instanceof FormData) {
        delete headers['Content-Type']; // 让浏览器自动处理
      } else if (typeof body === 'object') {
        body = JSON.stringify(body);
      }
    }

    console.log(`🚀 [Request] ${options.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body,
    });

    // 5. 处理 401
    if (response.status === 401) {
      console.error('[Helpers] 401 令牌无效');
      await AsyncStorage.removeItem('user');
      // 这里可以抛出错误，或者返回特定格式让上层处理
      throw new Error('请重新登录，访问令牌已失效');
    }

    // 6. 解析数据
    let data = null;
    try {
      data = await response.json();
    } catch (err) {
      // 如果返回不是 JSON (如 204 No Content)
      data = { success: response.ok };
    }

    if (!response.ok) {
      throw new Error(data?.message || `请求失败: ${response.status}`);
    }

    return { response, data };

  } catch (error) {
    console.error('[Helpers] 网络请求异常:', error.message);
    throw error;
  }
};

/**
 * 封装请求函数
 * 支持: request(url, method, data) 和 request(url, options)
 */
export const request = async (endpoint, p2, p3) => {
  let method = 'GET';
  let body = null;

  // 智能参数识别
  if (typeof p2 === 'string') {
    // 调用方式: request(url, 'POST', data)
    method = p2.toUpperCase();
    body = p3;
  } else if (typeof p2 === 'object') {
    // 调用方式: request(url, { method, body })
    method = p2.method || 'GET';
    body = p2.body;
  }

  const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  // 写操作：不走缓存，直接请求
  if (isWriteOperation) {
    const { response, data } = await rawRequest(endpoint, { method, body });
    
    // 返回类似 fetch 的 Response 对象，兼容 invite.js 中的 res.json()
    return {
      ok: response.ok,
      status: response.status,
      json: async () => data 
    };
  }

  // 读操作：走缓存策略
  const cacheKey = `cache_${endpoint}`;
  const now = Date.now();

  try {
    // A. 尝试读取缓存
    const cachedStr = await AsyncStorage.getItem(cacheKey);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      // 缓存有效期 2 分钟
      if (now - cached.timestamp < 120000) {
        console.log(`[Helpers] 💾 使用缓存: ${endpoint}`);
        return {
          ok: true,
          status: 200,
          json: async () => cached.data
        };
      }
    }

    // B. 发起网络请求
    const { data } = await rawRequest(endpoint, { method: 'GET' });

    // C. 更新缓存
    if (data) {
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        data: data,
        timestamp: now
      }));
    }

    return {
      ok: true,
      status: 200,
      json: async () => data
    };

  } catch (error) {
    // D. 网络失败，尝试降级使用旧缓存
    const cachedStr = await AsyncStorage.getItem(cacheKey);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      return {
        ok: true,
        status: 200,
        json: async () => cached.data
      };
    }
    throw error;
  }
};
