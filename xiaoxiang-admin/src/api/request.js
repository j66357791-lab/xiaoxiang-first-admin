// 网络缓存处理（Web 端）

const API_BASE_URL = 'https://xiaoxiang.zeabur.app';

/**
 * 底层网络请求驱动
 */
const rawRequest = async (endpoint, options = {}) => {
  try {
    // 1. 获取 Token
    const userStr = localStorage.getItem('user');
    let token = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.token;
      } catch (e) {
        console.error('[Helpers] 解析用户信息失败', e);
      }
    }

    // 2. 处理 URL - 确保有 /api 前缀
    let finalEndpoint = endpoint;
    if (!finalEndpoint.startsWith('/api') && !finalEndpoint.startsWith('http')) {
      finalEndpoint = `/api${finalEndpoint}`;
    }
    const url = `${API_BASE_URL}${finalEndpoint}`;

    console.log(`🚀 [Request] ${options.method || 'GET'} ${url}`);

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
        delete headers['Content-Type'];
      } else if (typeof body === 'object') {
        body = JSON.stringify(body);
      }
    }

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body,
    });

    // 5. 处理 401
    if (response.status === 401) {
      console.error('[Helpers] 401 令牌无效');
      localStorage.removeItem('user');
      throw new Error('请重新登录，访问令牌已失效');
    }

    // 6. 解析数据
    let data = null;
    try {
      data = await response.json();
    } catch (err) {
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
 */
export const request = async (endpoint, p2, p3) => {
  let method = 'GET';
  let body = null;

  if (typeof p2 === 'string') {
    method = p2.toUpperCase();
    body = p3;
  } else if (typeof p2 === 'object') {
    method = p2.method || 'GET';
    body = p2.body;
  }

  const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  // 写操作：不走缓存，直接请求
  if (isWriteOperation) {
    const { response, data } = await rawRequest(endpoint, { method, body });
    
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
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      if (now - cached.timestamp < 120000) {
        console.log(`[Helpers] 💾 使用缓存: ${endpoint}`);
        return {
          ok: true,
          status: 200,
          json: async () => cached.data
        };
      }
    }

    const { data } = await rawRequest(endpoint, { method: 'GET' });

    if (data) {
      localStorage.setItem(cacheKey, JSON.stringify({
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
    const cachedStr = localStorage.getItem(cacheKey);
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
