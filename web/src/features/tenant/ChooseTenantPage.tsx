import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Icon, Menu, Spinner, useSnackbar } from '../../shared/components'
import type { Tenant } from '../../mocks/tenants'
import { useAuth } from '../auth/AuthProvider'
import { useTenant } from './TenantProvider'
import './tenant.css'

export function ChooseTenantPage() {
  const { orgs, setActiveTenant } = useTenant()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { show } = useSnackbar()
  const [openingId, setOpeningId] = useState<string | null>(null)

  const open = async (tenant: Tenant) => {
    if (openingId) return
    setOpeningId(tenant.tenantId)
    // Brief pause so the "Opening…" state reads on the card.
    await new Promise((resolve) => setTimeout(resolve, 350))
    setActiveTenant(tenant.tenantId)
    show(`Switched to ${tenant.name}`, { variant: 'success' })
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="choose">
      <header className="choose__bar">
        <div className="choose__brand">
          <span className="choose__logo" aria-hidden="true">
            <Icon name="inventory_2" size={22} />
          </span>
          <span className="choose__wordmark">INVENTORY</span>
        </div>
        <Menu
          ariaLabel="Account menu"
          align="end"
          trigger={
            <span className="choose__user">
              <Avatar name={user?.name ?? 'Guest'} seed={user?.id} size={36} />
              <span className="choose__user-name">{user?.name}</span>
              <Icon name="expand_more" size={20} />
            </span>
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
        <div className="choose__head">
          <h1 className="t-headline-md">Choose your workspace</h1>
          <p className="choose__subtitle">
            Select the organization and location you want to manage.
          </p>
        </div>

        {orgs.map((org) => (
          <section key={org.orgId} className="org-block" aria-labelledby={`org-${org.orgId}`}>
            <header className="org-block__head">
              <Icon name="domain" size={20} className="org-block__icon" />
              <h2 id={`org-${org.orgId}`} className="org-block__name">
                {org.name}
              </h2>
              <span className="org-block__count">
                {org.tenants.length} location{org.tenants.length === 1 ? '' : 's'}
              </span>
            </header>

            <div className="tenant-grid">
              {org.tenants.map((tenant) => {
                const opening = openingId === tenant.tenantId
                return (
                  <button
                    key={tenant.tenantId}
                    type="button"
                    className="tenant-card"
                    aria-label={`Open workspace ${tenant.name}, ${org.name}`}
                    disabled={openingId !== null}
                    onClick={() => void open(tenant)}
                  >
                    <span className="tenant-card__top">
                      <Avatar name={tenant.name} seed={tenant.tenantId} size={48} />
                      <span className="tenant-card__chips">
                        <span className="chip chip--type">{tenant.type}</span>
                        <span className="chip chip--role">{tenant.role}</span>
                      </span>
                    </span>

                    <span className="tenant-card__name">{tenant.name}</span>

                    <span className="tenant-card__meta">
                      <Icon name="inventory_2" size={16} />
                      <span className="t-num">
                        {tenant.productCount.toLocaleString('en-US')}
                      </span>
                      products
                    </span>

                    <span className="tenant-card__cta">
                      {opening ? (
                        <>
                          <Spinner size={16} />
                          Opening…
                        </>
                      ) : (
                        <>
                          Open workspace
                          <Icon name="arrow_forward" size={18} />
                        </>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </main>

      <footer className="choose__footer">
        Signed in as <strong>{user?.email}</strong> · Demo environment
      </footer>
    </div>
  )
}
