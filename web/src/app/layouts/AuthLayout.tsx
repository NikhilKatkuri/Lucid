import { Outlet } from 'react-router-dom'
import { Icon } from '../../shared/components'
import '../../features/auth/auth.css'

/**
 * Clean, UI-only authentication shell — no photographic panels.
 * Brand block above a centered 440px card; responsive down to 360px.
 */
export function AuthLayout() {
  return (
    <div className="auth">
      <header className="auth__brand">
        <span className="auth__logo" aria-hidden="true">
          <Icon name="inventory_2" size={26} />
        </span>
        <div className="auth__brand-text">
          <p className="auth__wordmark">INVENTORY</p>
          <p className="auth__tagline">Multi-tenant inventory platform</p>
        </div>
      </header>

      <main className="auth__main">
        <Outlet />
      </main>

      <footer className="auth__footer">
        One organization · Multiple locations · Tenant-scoped inventory
      </footer>
    </div>
  )
}
