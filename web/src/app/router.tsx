import { createBrowserRouter } from 'react-router-dom'
import { AuthLayout } from './layouts/AuthLayout'
import { AppShell } from './layouts/AppShell'
import { RedirectIfAuthenticated, RequireAuth, RequireTenant, RootRedirect } from './guards'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage'
import { OtpPage } from '../features/auth/OtpPage'
import { MfaPage } from '../features/auth/MfaPage'
import { ChooseTenantPage } from '../features/tenant/ChooseTenantPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { InventoryPage } from '../features/inventory/InventoryPage'
import { TransfersPage } from '../features/transfers/TransfersPage'
import { MovementsPage } from '../features/movements/MovementsPage'
import { FilesPage } from '../features/files/FilesPage'
import { MembersPage } from '../features/members/MembersPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },

  // Public authentication flow (UI-only, no image panel)
  {
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: (
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        ),
      },
      {
        path: 'register',
        element: (
          <RedirectIfAuthenticated>
            <RegisterPage />
          </RedirectIfAuthenticated>
        ),
      },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'login/otp', element: <OtpPage /> },
      { path: 'login/mfa', element: <MfaPage /> },
    ],
  },

  // Workspace selection (requires an authenticated identity, no tenant yet)
  {
    path: 'choose-tenant',
    element: (
      <RequireAuth>
        <ChooseTenantPage />
      </RequireAuth>
    ),
  },

  // Application shell (requires identity + active tenant)
  {
    element: (
      <RequireAuth>
        <RequireTenant>
          <AppShell />
        </RequireTenant>
      </RequireAuth>
    ),
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'transfers', element: <TransfersPage /> },
      { path: 'movements', element: <MovementsPage /> },
      { path: 'files', element: <FilesPage /> },
      { path: 'members', element: <MembersPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
