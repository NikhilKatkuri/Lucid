import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { useTenant } from '../features/tenant/TenantProvider'

/** Sends anonymous users to the sign-in screen. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children ?? <Outlet />}</>
}

/** Sends users without an active tenant to the workspace picker. */
export function RequireTenant({ children }: { children?: ReactNode }) {
  const { activeTenant } = useTenant()
  if (!activeTenant) return <Navigate to="/choose-tenant" replace />
  return <>{children ?? <Outlet />}</>
}

/** Keeps signed-in users out of /login and /register. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const { activeTenant } = useTenant()
  if (isAuthenticated) {
    return <Navigate to={activeTenant ? '/dashboard' : '/choose-tenant'} replace />
  }
  return <>{children}</>
}

/** `/` landing rule. */
export function RootRedirect() {
  const { isAuthenticated } = useAuth()
  const { activeTenant } = useTenant()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={activeTenant ? '/dashboard' : '/choose-tenant'} replace />
}
