
import { useTenant } from '../tenant/TenantProvider'
import { useAuth } from '../auth/AuthProvider'
import { Icon } from '../../shared/components'
import './settings.css'

export function SettingsPage() {
  const { activeTenant, activeOrg } = useTenant()
  const { user } = useAuth()

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and workspace</p>
      </div>

      <div className="settings-sections">
        {/* Profile */}
        <section className="settings-section">
          <h2 className="settings-section-title">Profile</h2>
          <div className="settings-card">
            <div className="settings-row">
              <div className="settings-avatar">
                {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'}
              </div>
              <div className="settings-info">
                <div className="settings-label">Display Name</div>
                <div className="settings-value">{user?.name ?? '—'}</div>
              </div>
            </div>
            <div className="settings-divider" />
            <div className="settings-row">
              <div className="settings-icon"><Icon name="email" size={20} /></div>
              <div className="settings-info">
                <div className="settings-label">Email</div>
                <div className="settings-value">{user?.email ?? '—'}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Workspace */}
        <section className="settings-section">
          <h2 className="settings-section-title">Active Workspace</h2>
          <div className="settings-card">
            <div className="settings-row">
              <div className="settings-icon tenant-icon">
                <Icon name="business" size={20} />
              </div>
              <div className="settings-info">
                <div className="settings-label">Organization</div>
                <div className="settings-value">{activeOrg?.name ?? '—'}</div>
              </div>
            </div>
            <div className="settings-divider" />
            <div className="settings-row">
              <div className="settings-icon"><Icon name="store" size={20} /></div>
              <div className="settings-info">
                <div className="settings-label">Sub-Account</div>
                <div className="settings-value">{activeTenant?.name ?? '—'}</div>
              </div>
              <div className="settings-meta">
                <span className="role-badge">{activeTenant?.role ?? '—'}</span>
              </div>
            </div>
            <div className="settings-divider" />
            <div className="settings-row">
              <div className="settings-icon"><Icon name="tag" size={20} /></div>
              <div className="settings-info">
                <div className="settings-label">Tenant ID</div>
                <div className="settings-value"><code className="sku-code">{activeTenant?.tenantId ?? '—'}</code></div>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="settings-section">
          <h2 className="settings-section-title">Security</h2>
          <div className="settings-card">
            <div className="settings-row">
              <div className="settings-icon"><Icon name="lock" size={20} /></div>
              <div className="settings-info">
                <div className="settings-label">Password</div>
                <div className="settings-value">Change your account password</div>
              </div>
              <button className="btn btn--tonal btn--sm">Change</button>
            </div>
            <div className="settings-divider" />
            <div className="settings-row">
              <div className="settings-icon"><Icon name="security" size={20} /></div>
              <div className="settings-info">
                <div className="settings-label">Two-Factor Authentication</div>
                <div className="settings-value">Add an extra layer of security</div>
              </div>
              <button className="btn btn--tonal btn--sm">Set up MFA</button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="settings-section">
          <h2 className="settings-section-title settings-section-title--danger">Danger Zone</h2>
          <div className="settings-card settings-card--danger">
            <div className="settings-row">
              <div className="settings-icon"><Icon name="logout" size={20} /></div>
              <div className="settings-info">
                <div className="settings-label">Sign out</div>
                <div className="settings-value">Sign out of all devices</div>
              </div>
              <button className="btn btn--error btn--sm">Sign out</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
