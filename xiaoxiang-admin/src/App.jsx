import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';

// 平台管理
import Overview from './pages/Overview';
import GameDashboard from './pages/Dashboard';
import Users from './pages/Users';
import Withdrawals from './pages/Withdrawals';
import Orders from './pages/Orders';
import Categories from './pages/Categories';
import Announcements from './pages/Announcements';
import KYC from './pages/KYC';
import Tasks from './pages/Tasks';
import Payments from './pages/Payments';
import Gifts from './pages/Gifts';
import Publish from './pages/Publish';

// 资产管理
import AssetDashboard from './pages/Asset/index';

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AdminLayout />}>
            {/* 默认重定向到平台总览 */}
            <Route index element={<Navigate to="/overview" replace />} />
            
            {/* 平台管理 */}
            <Route path="overview" element={<Overview />} />
            <Route path="game-dashboard" element={<GameDashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="orders" element={<Orders />} />
            <Route path="withdrawals" element={<Withdrawals />} />
            <Route path="kyc" element={<KYC />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="categories" element={<Categories />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="payments" element={<Payments />} />
            <Route path="gifts" element={<Gifts />} />
            <Route path="publish" element={<Publish />} />
            
            {/* 资产管理中心 */}
            <Route path="asset" element={<AssetDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;
