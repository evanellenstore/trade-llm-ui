import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import RequireAuth from '../auth/RequireAuth';
import AdminLayout from '../components/layout/AdminLayout';

import AdminDashboard from '../pages/admin/AdminDashboard';
import TenantList from '../pages/admin/TenantList';
import UserList from '../pages/admin/UserList';
import BrokerAngelOneDocs from '../pages/admin/BrokerAngelOne';
import BrokerLogin from '../pages/admin/BrokerLogin';
import AISettings from '../pages/admin/AISettings';
import AdminSettings from '../pages/admin/AdminSettings';
import TransactionTypes from '../pages/admin/TransactionTypes';
import Profile from '../pages/admin/Profile';
import JobsList from '../pages/admin/JobsList';
import FromPurchase from '../pages/admin/FromPurchase';
import AdminProduct from '../pages/admin/AdminProduct';
import AdminInventory from '../pages/admin/AdminInventory';
import AdminCategory from '../pages/admin/AdminCategory';
import AdminBrand from '../pages/admin/AdminBrand';
import AdminRewards from '../pages/admin/AdminRewards';
import BacktestControl from '../pages/admin/BacktestControl';

import TraderDashboard from '../pages/trader/TraderDashboard';
import Products from '../pages/trader/Products';
import Inventory from '../pages/trader/Inventory';
import Billing from '../pages/trader/Billing';
import TraderRewards from '../pages/trader/TraderRewards';
import StrategyConfig from '../pages/trader/StrategyConfig';

import LoginPage from '../pages/LoginPage';

const AppRoutes: React.FC = () => (
  <Routes>
    {/* Default redirect */}
    <Route path="/" element={<Navigate to="/login" replace />} />

    {/* Public */}
    <Route path="/login" element={<LoginPage />} />

    {/* Admin Routes with Layout */}
    <Route
      path="/admin"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/tenants"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <TenantList />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/users"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <UserList />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/broker-connect"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <BrokerAngelOneDocs />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/broker-login"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <BrokerLogin />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/transaction-types"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <TransactionTypes />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/ai-settings"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <AISettings />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/settings"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <AdminSettings />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/profile"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <Profile />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/market-data"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <BacktestControl />
          </AdminLayout>
        </RequireAuth>
      }
    />

    <Route
      path="/admin/jobs"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <JobsList />
          </AdminLayout>
        </RequireAuth>
      }
    />

    {/* Trader */}
    <Route
      path="/trader"
      element={
        <RequireAuth roles={['TRADER']}>
          <TraderDashboard />
        </RequireAuth>
      }
    />
    <Route
      path="/trader/products"
      element={
        <RequireAuth roles={['TRADER']}>
          <Products />
        </RequireAuth>
      }
    />
    <Route
      path="/trader/inventory"
      element={
        <RequireAuth roles={['TRADER']}>
          <Inventory />
        </RequireAuth>
      }
    />
    <Route
      path="/trader/billing"
      element={
        <RequireAuth roles={['TRADER']}>
          <Billing />
        </RequireAuth>
      }
    />
    <Route
      path="/trader/rewards"
      element={
        <RequireAuth roles={['TRADER']}>
          <TraderRewards />
        </RequireAuth>
      }
    />
    <Route
      path="/trader/strategy-config"
      element={
        <RequireAuth roles={['TRADER']}>
          <StrategyConfig />
        </RequireAuth>
      }
    />

    {/* Legacy shopkeeper redirects */}
    <Route path="/shopkeeper" element={<Navigate to="/trader" replace />} />
    <Route path="/shopkeeper/products" element={<Navigate to="/trader/products" replace />} />
    <Route path="/shopkeeper/inventory" element={<Navigate to="/trader/inventory" replace />} />
    <Route path="/shopkeeper/billing" element={<Navigate to="/trader/billing" replace />} />
    <Route path="/shopkeeper/rewards" element={<Navigate to="/trader/rewards" replace />} />

    {/* Fallback */}
    <Route path="*" element={<h3>Page Not Found</h3>} />
  </Routes>
);

export default AppRoutes;
