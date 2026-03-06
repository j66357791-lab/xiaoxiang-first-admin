// src/context/UserContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';

const defaultUser = {
  id: '',
  email: '',
  balance: 0.00,
  name: '小象用户',
  token: '',
  role: 'user',
  points: 0,
  coins: 0,
  deposit: 0,
  kycStatus: null,
  level: 'Lv1',
  creditScore: 100,
  vipLevel: 'none',
};

const UserContext = createContext(undefined);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(defaultUser);
  const [isLoaded, setIsLoaded] = useState(false);

  // 从 localStorage 加载用户
  useEffect(() => {
    const loadUser = () => {
      try {
        const userDataStr = localStorage.getItem('user');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          setUser({ ...defaultUser, ...userData });
        }
      } catch (e) {
        console.error('读取用户数据失败:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadUser();
  }, []);

  // 登录
  const loginUser = async (userData, token) => {
    const userId = userData.id || userData._id || userData.userId || userData.user_id || '';
    if (!userId || !token) throw new Error('缺少用户ID或Token');

    const newUser = {
      ...defaultUser,
      id: userId,
      email: userData.email || '',
      name: userData.name || '小象用户',
      token: token,
      role: userData.role || 'user',
      balance: userData.balance || 0,
      points: userData.points || 0,
      coins: userData.coins || 0,
      deposit: userData.deposit || 0,
      kycStatus: userData.kycStatus || null,
      level: userData.level || 'Lv1',
      creditScore: userData.creditScore || 100,
      vipLevel: userData.vipLevel || 'none',
    };

    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
    console.log('✅ 登录成功，用户ID:', userId);
  };

  // 更新用户信息
  const updateProfile = (updates) => {
    const newUser = { ...user, ...updates };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  // 登出
  const logoutUser = async () => {
    setUser(defaultUser);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // 同步用户数据
  const syncUserData = async () => {
    try {
      if (!user.token) return null;
      
      const res = await fetch('https://xiaoxiang.zeabur.app/api/users/me', {
        headers: { 'Authorization': `Bearer ${user.token}` },
      });
      const json = await res.json();
      
      if (json.success && json.data) {
        const newUser = { ...user, ...json.data, id: user.id || json.data._id };
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
        return newUser;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const updatePoints = (newPoints) => setUser({ ...user, points: newPoints });
  const updateCoins = (newCoins) => setUser({ ...user, coins: newCoins });
  const updateLeisureCurrency = (data) => setUser({ ...user, ...data });

  return (
    <UserContext.Provider value={{ 
      user, 
      loginUser, 
      updateProfile, 
      logoutUser, 
      isLoaded, 
      updatePoints, 
      updateCoins, 
      updateLeisureCurrency, 
      syncUserData 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserProvider;
