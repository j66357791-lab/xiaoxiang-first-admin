import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext'; // 新增
import { request } from '../utils/request';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginUser } = useUser(); // 新增

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });

      if (res.ok && res.data.success) {
        // 提取 token 和用户数据
        const { token, user } = res.data.data;
        
        // 保存到 UserContext
        await loginUser(user, token);
        
        message.success('登录成功');
        navigate('/');
      } else {
        message.error(res.data.message || '登录失败');
      }
    } catch (error) {
      message.error('登录失败，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>管理后台登录</h2>
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: '请输入邮箱' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="邮箱" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
              size="large"
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
