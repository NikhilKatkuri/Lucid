import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ORGANIZATIONS, findOrg, findTenant } from '../../mocks/tenants'
import type { Organization, Tenant, TenantRole, TenantType } from '../../mocks/tenants'
import { api, setAccessToken, setApiTenant, unwrap } from '../../shared/api/client'
import { env } from '../../shared/config/env'
import { useAuth } from '../auth/AuthProvider'

interface TenantContextValue {
  orgs: Organization[]
  activeOrg: Organization | null
  activeTenant: Tenant | null
  setActiveTenant: (tenantId: string) => Promise<void>
  clearActiveTenant: () => void
}

const TenantContext = createContext<TenantContextValue | null>(null)

/**
 * Holds the active tenant for the session. All later phases must scope their
 * query keys by `activeTenant?.tenantId` so data can never leak across
 * tenants.
 */
export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [apiOrgs, setApiOrgs] = useState<Organization[]>([])
  const [activeTenant, setActiveTenantState] = useState<Tenant | null>(null)

  useEffect(() => {
    if (env.VITE_USE_MOCK || !user) {
      setApiOrgs([])
      setActiveTenantState(null)
      setApiTenant(null)
      return
    }
    let cancelled = false
    void api.get('/auth/me').then(({ data }) => {
      const me = unwrap<{ currentTenant: { tenantId: string; tenantName: string; tenantSlug: string; organizationId: string; organizationName: string; role: number | string } | null; availableTenants: { tenantId: string; organizationId: string; name: string; slug: string; type: number | string; role: number | string; organizationName: string }[] }>(data)
      const mapType = (value: number | string): TenantType => value === 0 || value === 'Warehouse' ? 'Warehouse' : value === 1 || value === 'Store' ? 'Retail' : 'Branch'
      const mapRole = (value: number | string): TenantRole => value === 2 || value === 'Manager' ? 'Manager' : value === 1 || value === 'Staff' ? 'Staff' : 'Viewer'
      if (cancelled) return
      const groups = new Map<string, Organization>()
      for (const item of me.availableTenants) {
        const match = groups.get(item.organizationId) ?? { orgId: item.organizationId, name: item.organizationName, tenants: [] }
        match.tenants.push({ tenantId: item.tenantId, orgId: item.organizationId, name: item.name, slug: item.slug, type: mapType(item.type), role: mapRole(item.role), productCount: 0 })
        groups.set(item.organizationId, match)
      }
      setApiOrgs([...groups.values()])
      const current = me.currentTenant
      if (current) {
        const found = [...groups.values()].flatMap((org) => org.tenants).find((tenant) => tenant.tenantId === current.tenantId)
        if (found) { setActiveTenantState(found); setApiTenant(found.tenantId) }
      }
    }).catch(() => { if (!cancelled) { setApiOrgs([]); setActiveTenantState(null) } })
    return () => { cancelled = true }
  }, [user])

  const setActiveTenant = useCallback(async (tenantId: string) => {
    const tenant = env.VITE_USE_MOCK ? findTenant(tenantId) : apiOrgs.flatMap((org) => org.tenants).find((item) => item.tenantId === tenantId)
    if (!tenant) return
    if (!env.VITE_USE_MOCK) {
      const { data } = await api.post('/auth/switch-tenant', { tenantId })
      const auth = unwrap<{ accessToken: string }>(data)
      setAccessToken(auth.accessToken)
      setApiTenant(tenantId)
    }
    setActiveTenantState(tenant ?? null)
  }, [apiOrgs])

  const clearActiveTenant = useCallback(() => { setActiveTenantState(null); setApiTenant(null) }, [])

  const activeOrg = useMemo(
    () => activeTenant ? (env.VITE_USE_MOCK ? findOrg(activeTenant.orgId) ?? null : apiOrgs.find((org) => org.orgId === activeTenant.orgId) ?? null) : null,
    [activeTenant, apiOrgs],
  )

  const value = useMemo<TenantContextValue>(
    () => ({
      orgs: env.VITE_USE_MOCK ? ORGANIZATIONS : apiOrgs,
      activeOrg,
      activeTenant,
      setActiveTenant,
      clearActiveTenant,
    }),
    [activeOrg, activeTenant, apiOrgs, setActiveTenant, clearActiveTenant],
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within TenantProvider')
  return ctx
}
