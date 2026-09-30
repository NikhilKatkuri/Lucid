import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Icon, Menu, Spinner, TextField, useSnackbar } from '../../shared/components'
import type { Tenant } from '../../mocks/tenants'
import { useAuth } from '../auth/AuthProvider'
import { useTenant } from './TenantProvider'
import './tenant.css'
import { env } from '../../shared/config/env'

export function ChooseTenantPage() {
  const { orgs, setActiveTenant } = useTenant()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { show } = useSnackbar()
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'store' | 'warehouse' | 'hub'>('all')

  const totalTenants = useMemo(
    () => orgs.reduce((acc, org) => acc + org.tenants.length, 0),
    [orgs],
  )

  const totalProducts = useMemo(
    () =>
      orgs.reduce(
        (acc, org) =>
          acc + org.tenants.reduce((tAcc, t) => tAcc + t.productCount, 0),
        0,
      ),
    [orgs],
  )

  const open = async (tenant: Tenant) => {
    if (openingId) return
    setOpeningId(tenant.tenantId)
    try {
      if (env.VITE_USE_MOCK) await new Promise((resolve) => setTimeout(resolve, 350))
      await setActiveTenant(tenant.tenantId)
      show(`Switched to ${tenant.name}`, { variant: 'success' })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      show(error instanceof Error ? error.message : 'Unable to open this workspace.', { variant: 'error' })
      setOpeningId(null)
    }
  }

  // Filter organizations and tenants based on search query and type filter
  const filteredOrgs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orgs
      .map((org) => {
        const matchingTenants = org.tenants.filter((t) => {
          const matchesSearch =
            !q ||
            t.name.toLowerCase().includes(q) ||
            t.type.toLowerCase().includes(q) ||
            t.role.toLowerCase().includes(q) ||
            org.name.toLowerCase().includes(q)

          const matchesType =
            typeFilter === 'all' ||
            (typeFilter === 'store' && t.type.toLowerCase().includes('store')) ||
            (typeFilter === 'warehouse' && t.type.toLowerCase().includes('warehouse')) ||
            (typeFilter === 'hub' && t.type.toLowerCase().includes('hub'))

          return matchesSearch && matchesType
        })
        return { ...org, tenants: matchingTenants }
      })
      .filter((org) => org.tenants.length > 0)
  }, [orgs, search, typeFilter])

  const getTenantIcon = (type: string) => {
    const lower = type.toLowerCase()
    if (lower.includes('warehouse')) return 'warehouse'
    if (lower.includes('store') || lower.includes('retail')) return 'storefront'
    if (lower.includes('hub') || lower.includes('center')) return 'hub'
    return 'domain'
  }

  return (
    <div className="choose">
      <div className="choose__glow choose__glow--1" aria-hidden="true" />
      <div className="choose__glow choose__glow--2" aria-hidden="true" />

      <header className="choose__bar">
        <div className="choose__brand">
          <span className="choose__logo" aria-hidden="true">
            <Icon name="inventory_2" size={22} />
          </span>
          <span className="choose__wordmark">LUCID INVENTORY</span>
        </div>
        <Menu
          ariaLabel="Account menu"
          align="end"
          trigger={
            <button type="button" className="choose__user">
              <Avatar name={user?.name ?? 'Guest'} seed={user?.id} size={36} />
              <span className="choose__user-info">
                <span className="choose__user-name">{user?.name}</span>
                <span className="choose__user-email">{user?.email}</span>
              </span>
              <Icon name="expand_more" size={20} />
            </button>
          }
          items={[
            { id: 'email', label: user?.email ?? '', header: true, dividerBefore: true },
            {
              id: 'logout',
              label: 'Sign out',
              icon: 'logout',
              danger: true,
              onSelect: () => {
                logout()
                show('Signed out')
                navigate('/login', { replace: true })
              },
            },
          ]}
        />
      </header>

      <main className="choose__main">
        <div className="choose__hero">
          <div className="choose__hero-badge">
            <span className="choose__pulse-dot" />
            Multi-Tenant Hub
          </div>
          <h1 className="choose__title">Choose your workspace</h1>
          <p className="choose__subtitle">
            Select an organization location to manage inventory, track movements, and run transfers.
          </p>

          <div className="choose__stats-bar">
            <div className="choose__stat">
              <span className="choose__stat-val">{orgs.length}</span>
              <span className="choose__stat-lbl">Organizations</span>
            </div>
            <div className="choose__stat-divider" />
            <div className="choose__stat">
              <span className="choose__stat-val">{totalTenants}</span>
              <span className="choose__stat-lbl">Workspaces</span>
            </div>
            <div className="choose__stat-divider" />
            <div className="choose__stat">
              <span className="choose__stat-val">{totalProducts.toLocaleString()}</span>
              <span className="choose__stat-lbl">Total Products</span>
            </div>
          </div>
        </div>

        <div className="choose__controls">
          <div className="choose__search">
            <TextField
              label=""
              placeholder="Search workspaces by name, location type, or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startIcon="search"
              endAdornment={
                search ? (
                  <button
                    type="button"
                    className="choose__clear-btn"
                    onClick={() => setSearch('')}
                    title="Clear search"
                  >
                    <Icon name="close" size={18} />
                  </button>
                ) : null
              }
            />
          </div>

          <div className="choose__filters">
            <button
              type="button"
              className={`choose__filter-chip ${typeFilter === 'all' ? 'choose__filter-chip--active' : ''}`}
              onClick={() => setTypeFilter('all')}
            >
              All Workspaces
            </button>
            <button
              type="button"
              className={`choose__filter-chip ${typeFilter === 'store' ? 'choose__filter-chip--active' : ''}`}
              onClick={() => setTypeFilter('store')}
            >
              <Icon name="storefront" size={16} />
              Stores
            </button>
            <button
              type="button"
              className={`choose__filter-chip ${typeFilter === 'warehouse' ? 'choose__filter-chip--active' : ''}`}
              onClick={() => setTypeFilter('warehouse')}
            >
              <Icon name="warehouse" size={16} />
              Warehouses
            </button>
            <button
              type="button"
              className={`choose__filter-chip ${typeFilter === 'hub' ? 'choose__filter-chip--active' : ''}`}
              onClick={() => setTypeFilter('hub')}
            >
              <Icon name="hub" size={16} />
              Fulfillment Hubs
            </button>
          </div>
        </div>

        {filteredOrgs.length === 0 ? (
          <div className="choose__empty">
            <div className="choose__empty-icon">
              <Icon name="search_off" size={40} />
            </div>
            <h3>No workspaces found</h3>
            <p>No workspace matches &ldquo;{search}&rdquo;. Try clearing filters or searching another keyword.</p>
            <button
              type="button"
              className="choose__reset-btn"
              onClick={() => {
                setSearch('')
                setTypeFilter('all')
              }}
            >
              Reset filters
            </button>
          </div>
        ) : (
          filteredOrgs.map((org) => (
            <section key={org.orgId} className="org-block" aria-labelledby={`org-${org.orgId}`}>
              <header className="org-block__head">
                <div className="org-block__title-group">
                  <span className="org-block__icon-box">
                    <Icon name="domain" size={20} />
                  </span>
                  <div>
                    <h2 id={`org-${org.orgId}`} className="org-block__name">
                      {org.name}
                    </h2>
                    <span className="org-block__sub">
                      {org.tenants.length} location{org.tenants.length === 1 ? '' : 's'} available
                    </span>
                  </div>
                </div>
              </header>

              <div className="tenant-grid">
                {org.tenants.map((tenant) => {
                  const opening = openingId === tenant.tenantId
                  const typeIcon = getTenantIcon(tenant.type)
                  return (
                    <button
                      key={tenant.tenantId}
                      type="button"
                      className={`tenant-card ${opening ? 'tenant-card--opening' : ''}`}
                      aria-label={`Open workspace ${tenant.name}, ${org.name}`}
                      disabled={openingId !== null}
                      onClick={() => void open(tenant)}
                    >
                      <div className="tenant-card__header">
                        <div className="tenant-card__avatar-wrap">
                          <Avatar name={tenant.name} seed={tenant.tenantId} size={48} />
                          <span className="tenant-card__icon-badge" title={tenant.type}>
                            <Icon name={typeIcon} size={14} />
                          </span>
                        </div>
                        <div className="tenant-card__badges">
                          <span className={`chip chip--role chip--role-${tenant.role.toLowerCase()}`}>
                            {tenant.role}
                          </span>
                          <span className="chip chip--type">{tenant.type}</span>
                        </div>
                      </div>

                      <div className="tenant-card__body">
                        <h3 className="tenant-card__name">{tenant.name}</h3>
                        <p className="tenant-card__org-name">{org.name}</p>
                      </div>

                      <div className="tenant-card__stats">
                        <div className="tenant-card__stat-item">
                          <Icon name="inventory_2" size={16} />
                          <span>
                            <strong>{tenant.productCount.toLocaleString()}</strong> products
                          </span>
                        </div>
                        <div className="tenant-card__stat-item tenant-card__stat-item--sync">
                          <span className="tenant-card__live-dot" />
                          <span>Live Sync</span>
                        </div>
                      </div>

                      <div className="tenant-card__cta">
                        {opening ? (
                          <>
                            <Spinner size={16} />
                            Opening Workspace…
                          </>
                        ) : (
                          <>
                            Launch Workspace
                            <Icon name="arrow_forward" size={18} className="tenant-card__arrow" />
                          </>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </main>

      <footer className="choose__footer">
        <p>
          Signed in as <strong>{user?.email}</strong> · Multi-Tenant Inventory System
        </p>
      </footer>
    </div>
  )
}
