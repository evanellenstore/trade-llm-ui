import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import RequireAuth from '../auth/RequireAuth';
import AdminLayout from '../components/layout/AdminLayout';

import AdminDashboard from '../pages/admin/AdminDashboard';
import TenantList from '../pages/admin/TenantList';
import UserList from '../pages/admin/UserList';
import DocumentList from '../pages/admin/DocumentList';
import BrokerAngelOneDocs from '../pages/admin/BrokerAngelOneDocs';
import EDITransform from '../pages/admin/EDITransform';
import Transactions from '../pages/admin/Transactions';
import AISettings from '../pages/admin/AISettings';
import PromptTemplates from '../pages/admin/PromptTemplates';
import AdminSettings from '../pages/admin/AdminSettings';
import TransactionTypes from '../pages/admin/TransactionTypes';
import Profile from '../pages/admin/Profile';
import JobsList from '../pages/admin/JobsList';
import LogsList from '../pages/admin/LogsList';
import Reports from '../pages/admin/Reports';
import FromPurchase from '../pages/admin/FromPurchase';
import AdminProduct from '../pages/admin/AdminProduct';
import AdminInventory from '../pages/admin/AdminInventory';
import AdminCategory from '../pages/admin/AdminCategory';
import AdminBrand from '../pages/admin/AdminBrand';
import AdminRewards from '../pages/admin/AdminRewards';

import TraderDashboard from '../pages/trader/TraderDashboard';
import Products from '../pages/trader/Products';
import Inventory from '../pages/trader/Inventory';
import Billing from '../pages/trader/Billing';
import TraderRewards from '../pages/trader/TraderRewards';

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
      path="/admin/documents"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <DocumentList />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/broker-api-docs"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <BrokerAngelOneDocs />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/edi-transform"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <EDITransform />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/transactions"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <Transactions />
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
      path="/admin/prompts"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <PromptTemplates />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/reports"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <Reports />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/logs"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <LogsList />
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
