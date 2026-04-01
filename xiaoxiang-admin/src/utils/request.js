// src/utils/request.js
import { message } from 'antd';

// API 基础地址
const BASE_URL = 'https://xiaoxiang.zeabur.app';

/**
 * 获取 token
 */
function getToken() {
  const userData = localStorage.getItem('user');
  if (userData) {
    try {
      const user = JSON.parse(userData);
      return user.token || '';
    } catch (e) {
      console.error('解析用户数据失败:', e);
    }
  }
  return '';
}

/**
 * 核心请求方法
 */
async function request(url, options = {}) {
  const token = getToken();
  
  // 处理 URL
  const fullUrl = url.startsWith('http') 
    ? url 
    : `${BASE_URL}${url}`;

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

    // 如果 token 过期或无效
    if (response.status === 401) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      message.error('登录已过期，请重新登录');
      window.location.href = '/login';
      return { ok: false, code: 401, message: '未授权' };
    }

    return data;
  } catch (error) {
    console.error('请求失败:', error);
    message.error('网络请求失败');
    return { ok: false, code: 500, message: error.message };
  }
}

/**
 * GET 请求
 */
request.get = async (url, params = {}) => {
  // 构建查询字符串
  const queryString = new URLSearchParams(params).toString();
  const fullUrl = queryString ? `${url}?${queryString}` : url;
  
  return request(fullUrl, { method: 'GET' });
};

/**
 * POST 请求
 */
request.post = async (url, data = {}) => {
  return request(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * PUT 请求
 */
request.put = async (url, data = {}) => {
  return request(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * DELETE 请求
 */
request.delete = async (url) => {
  return request(url, { method: 'DELETE' });
};

/**
 * 上传文件（单图）
 */
export async function uploadFile(file) {
  const token = getToken();
  
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${BASE_URL}/api/upload/single`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      message.error(data.message || '上传失败');
      return { ok: false, data };
    }

    console.log('[Upload] ✅ 上传成功:', data.data?.url);
    return { ok: true, data: data.data };
  } catch (error) {
    console.error('上传失败:', error);
    message.error('上传失败');
    return { ok: false, data: { success: false, message: error.message } };
  }
}

/**
 * 上传多个文件（多图）
 */
export async function uploadFiles(files) {
  const token = getToken();
  
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  try {
    const response = await fetch(`${BASE_URL}/api/upload/multiple`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      message.error(data.message || '上传失败');
      return { ok: false, data };
    }

    console.log('[Upload] ✅ 批量上传成功:', data.data?.length, '张');
    return { ok: true, data: data.data };
  } catch (error) {
    console.error('上传失败:', error);
    message.error('上传失败');
    return { ok: false, data: { success: false, message: error.message } };
  }
}

export { request };
export default request;
