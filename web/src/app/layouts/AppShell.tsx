import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Avatar, Icon, IconButton, Menu, ProgressBar, accentFor } from '../../shared/components'
import { useAuth } from '../../features/auth/AuthProvider'
import { useTenant } from '../../features/tenant/TenantProvider'
import './shell.css'

interface NavItem {
  to: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/inventory', label: 'Inventory', icon: 'inventory_2' },
  { to: '/transfers', label: 'Transfers', icon: 'swap_horiz' },
  { to: '/movements', label: 'Movements', icon: 'history' },
  { to: '/files', label: 'Files', icon: 'folder' },
  { to: '/members', label: 'Members', icon: 'group' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const { orgs, activeOrg, activeTenant, setActiveTenant } = useTenant()
  const navigate = useNavigate()
  const [navOpen, setNavOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  const tenantAccent = activeTenant ? accentFor(activeTenant.tenantId) : 'blue'

  const switchTo = async (tenantId: string) => {
    if (tenantId === activeTenant?.tenantId) return
    setSwitching(true)
    setActiveTenant(tenantId)
    // Brief top progress bar so the switch is perceptible (DESIGN §8).
    await new Promise((resolve) => setTimeout(resolve, 450))
    setSwitching(false)
  }

  const tenantItems = orgs.flatMap((org, orgIndex) => [
    {
      id: `header-${org.orgId}`,
      label: org.name,
      header: true,
      dividerBefore: orgIndex > 0,
    },
    ...org.tenants.map((tenant) => ({
      id: tenant.tenantId,
      label: `${tenant.name}`,
      selected: tenant.tenantId === activeTenant?.tenantId,
      onSelect: () => void switchTo(tenant.tenantId),
    })),
  ])

  const switcherItems = [
    ...tenantItems,
    {
      id: 'all-workspaces',
      label: 'Choose another workspace',
      icon: 'grid_view',
      dividerBefore: true,
      onSelect: () => navigate('/choose-tenant'),
    },
  ]

  return (
    <div className="shell">
      <header className="shell__bar">
        <div className="shell__bar-left">
          <IconButton
            label="Open navigation"
            className="shell__menu-btn"
            onClick={() => setNavOpen((value) => !value)}
          >
            menu
          </IconButton>

          <div className="shell__brand" aria-hidden="true">
            <span className="shell__logo">
              <Icon name="inventory_2" size={18} />
            </span>
            <span className="shell__wordmark">INVENTORY</span>
          </div>

          {activeTenant && activeOrg && (
            <Menu
              ariaLabel={`Active workspace: ${activeOrg.name}, ${activeTenant.name}`}
              align="start"
              items={switcherItems}
              trigger={
                <span className="shell__tenant">
                  <span
                    className="shell__tenant-dot"
                    style={{ background: `var(--sys-${tenantAccent}-container)` }}
                    aria-hidden="true"
                  />
                  <span className="shell__tenant-org">{activeOrg.name}</span>
                  <Icon name="chevron_right" size={16} className="shell__tenant-sep" />
                  <span className="shell__tenant-name">{activeTenant.name}</span>
                  <Icon name="expand_more" size={18} />
                </span>
              }
            />
          )}
        </div>

        <div className="shell__bar-right">
          <IconButton label="Search" className="shell__bar-icon">
            search
          </IconButton>
          <IconButton label="Notifications" className="shell__bar-icon">
            notifications
          </IconButton>
          <Menu
            ariaLabel="Account menu"
            align="end"
            trigger={
              <span className="shell__avatar-btn">
                <Avatar name={user?.name ?? 'Guest'} seed={user?.id} size={36} />
              </span>
            }
            items={[
              {
                id: 'identity',
                label: user?.email ?? '',
                header: true,
                dividerBefore: true,
              },
              {
                id: 'workspaces',
                label: 'All workspaces',
                icon: 'grid_view',
                onSelect: () => navigate('/choose-tenant'),
              },
              {
                id: 'logout',
                label: 'Sign out',
                icon: 'logout',
                danger: true,
                onSelect: () => {
                  logout()
                  navigate('/login', { replace: true })
                },
              },
            ]}
          />
        </div>
      </header>

      {switching && (
        <ProgressBar className="shell__progress" label="Switching workspace" />
      )}

      <div className="shell__body">
        <nav
          className={['shell__nav', navOpen ? 'is-open' : ''].filter(Boolean).join(' ')}
          aria-label="Main navigation"
        >
          <p className="shell__nav-label">Workspace</p>
          <ul className="shell__nav-list">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    ['shell__nav-item', 'state-layer', isActive ? 'is-active' : '']
                      .filter(Boolean)
                      .join(' ')
                  }
                  onClick={() => setNavOpen(false)}
                >
                  {({ isActive }) => (
                    <>
                      <Icon name={item.icon} filled={isActive} size={22} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="shell__nav-foot">
            <span
              className="shell__nav-foot-dot"
              style={{ background: `var(--sys-${tenantAccent}-container)` }}
              aria-hidden="true"
            />
            <div className="shell__nav-foot-text">
              <span className="shell__nav-foot-tenant">{activeTenant?.name}</span>
              <span className="shell__nav-foot-meta">
                {activeTenant?.role} · {activeTenant?.productCount.toLocaleString('en-US')}{' '}
                products
              </span>
            </div>
          </div>
        </nav>

        {navOpen && (
          <div className="shell__backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />
        )}

        <main className="shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
