// src/utils/request.js
import { message } from 'antd';

export async function request(url, options = {}) {
  // 从 localStorage 读取 token
  const userData = localStorage.getItem('user');
  let token = '';
  
  if (userData) {
    try {
      const user = JSON.parse(userData);
      token = user.token || '';
    } catch (e) {
      console.error('解析用户数据失败:', e);
    }
  }

  // 处理 URL
  const fullUrl = url.startsWith('http') 
    ? url 
    : `https://xiaoxiang.zeabur.app${url}`;

  // 默认 headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 添加 Authorization
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    const data = await response.json();

    // 如果返回的是 Response 对象（有些接口直接返回 res）
    if (!data.success && response.ok) {
      return { ok: true, data };
    }

    // 如果 token 过期或无效
    if (response.status === 401) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      message.error('登录已过期，请重新登录');
      window.location.href = '/login';
      return { ok: false, data };
    }

    return { ok: response.ok, data };
  } catch (error) {
    console.error('请求失败:', error);
    message.error('网络请求失败');
    return { ok: false, data: { success: false, message: error.message } };
  }
}
