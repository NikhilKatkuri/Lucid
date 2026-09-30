import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ORGANIZATIONS, findOrg, findTenant } from '../../mocks/tenants'
import type { Organization, Tenant } from '../../mocks/tenants'

interface TenantContextValue {
  orgs: Organization[]
  activeOrg: Organization | null
  activeTenant: Tenant | null
  setActiveTenant: (tenantId: string) => void
  clearActiveTenant: () => void
}

const TenantContext = createContext<TenantContextValue | null>(null)

/**
 * Holds the active tenant for the session. All later phases must scope their
 * query keys by `activeTenant?.tenantId` so data can never leak across
 * tenants.
 */
export function TenantProvider({ children }: { children: ReactNode }) {
  const [activeTenant, setActiveTenantState] = useState<Tenant | null>(null)

  const setActiveTenant = useCallback((tenantId: string) => {
    const tenant = findTenant(tenantId)
    setActiveTenantState(tenant ?? null)
  }, [])

  const clearActiveTenant = useCallback(() => setActiveTenantState(null), [])

  const activeOrg = useMemo(
    () => (activeTenant ? findOrg(activeTenant.orgId) ?? null : null),
    [activeTenant],
  )

  const value = useMemo<TenantContextValue>(
    () => ({
      orgs: ORGANIZATIONS,
      activeOrg,
      activeTenant,
      setActiveTenant,
      clearActiveTenant,
    }),
    [activeOrg, activeTenant, setActiveTenant, clearActiveTenant],
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within TenantProvider')
  return ctx
}
