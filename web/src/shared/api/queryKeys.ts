export const queryKeys = {
  dashboard: (tenantId: string) => ['dashboard', tenantId] as const,
  orgDashboard: (orgId: string) => ['org-dashboard', orgId] as const,

  products: (tenantId: string, filters?: Record<string, string>) =>
    filters ? ['products', tenantId, filters] as const : ['products', tenantId] as const,
  product: (tenantId: string, productId: string) => ['products', tenantId, productId] as const,
  productMovements: (tenantId: string, productId: string) =>
    ['products', tenantId, productId, 'movements'] as const,

  transfers: (tenantId: string, filters?: Record<string, string>) =>
    filters ? ['transfers', tenantId, filters] as const : ['transfers', tenantId] as const,

  movements: (tenantId: string, filters?: Record<string, string>) =>
    filters ? ['movements', tenantId, filters] as const : ['movements', tenantId] as const,

  files: (tenantId: string, filters?: Record<string, string>) =>
    filters ? ['files', tenantId, filters] as const : ['files', tenantId] as const,

  members: (orgId: string) => ['members', orgId] as const,

  me: () => ['me'] as const,
  orgs: () => ['me', 'orgs'] as const,
}
