/**
 * Typed mock tenant data — the shape mirrors the real `GET /me/orgs` payload.
 * IDs are stable; page components must never hard-code tenant ids.
 */

export type TenantType = 'Retail' | 'Warehouse'
export type TenantRole = 'Staff' | 'Manager' | 'Viewer' | 'OrgAdmin'

export interface Tenant {
  tenantId: string
  orgId: string
  name: string
  slug: string
  type: TenantType
  role: TenantRole
  productCount: number
}

export interface Organization {
  orgId: string
  name: string
  tenants: Tenant[]
}

export const ORGANIZATIONS: Organization[] = [
  {
    orgId: 'org_acme_retail',
    name: 'ACME Retail Group',
    tenants: [
      {
        tenantId: 'tnt_acme_hyd_store',
        orgId: 'org_acme_retail',
        name: 'Hyderabad Store',
        slug: 'hyderabad-store',
        type: 'Retail',
        role: 'Manager',
        productCount: 1284,
      },
      {
        tenantId: 'tnt_acme_mum_store',
        orgId: 'org_acme_retail',
        name: 'Mumbai Store',
        slug: 'mumbai-store',
        type: 'Retail',
        role: 'Staff',
        productCount: 682,
      },
      {
        tenantId: 'tnt_acme_blr_store',
        orgId: 'org_acme_retail',
        name: 'Bangalore Store',
        slug: 'bangalore-store',
        type: 'Retail',
        role: 'Viewer',
        productCount: 514,
      },
    ],
  },
  {
    orgId: 'org_acme_warehouse',
    name: 'ACME Warehouse Operations',
    tenants: [
      {
        tenantId: 'tnt_acme_hyd_hub',
        orgId: 'org_acme_warehouse',
        name: 'Hyderabad Hub',
        slug: 'hyderabad-hub',
        type: 'Warehouse',
        role: 'OrgAdmin',
        productCount: 2431,
      },
    ],
  },
]

export function findTenant(tenantId: string): Tenant | undefined {
  for (const org of ORGANIZATIONS) {
    const tenant = org.tenants.find((t) => t.tenantId === tenantId)
    if (tenant) return tenant
  }
  return undefined
}

export function findOrg(orgId: string): Organization | undefined {
  return ORGANIZATIONS.find((o) => o.orgId === orgId)
}
