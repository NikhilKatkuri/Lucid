export type Role = 'OrgAdmin' | 'Manager' | 'Staff' | 'Viewer'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

export interface Tenant {
  tenantId: string
  name: string
  slug: string
  type: 'store' | 'warehouse' | 'office'
  role: Role
}

export interface Organization {
  orgId: string
  name: string
  tenants: Tenant[]
}

export type StockStatus = 'in_stock' | 'low' | 'out_of_stock'

export interface Product {
  id: string
  tenantId: string
  name: string
  sku: string
  category: string
  description: string
  quantity: number
  reorderLevel: number
  price: number
  supplierCost: number
  imageInitial: string
  version?: number
  createdAt: string
  updatedAt: string
}

export type MovementType = 'received' | 'sale' | 'transfer' | 'adjustment' | 'return' | 'damaged'

export interface Movement {
  id: string
  tenantId: string
  productId: string
  productName: string
  type: MovementType
  quantity: number
  reference: string
  note: string
  date: string
}

export type TransferStatus = 'pending' | 'in_transit' | 'completed' | 'cancelled'

export interface Transfer {
  id: string
  orgId: string
  fromTenantId: string
  fromTenantName: string
  toTenantId: string
  toTenantName: string
  items: number
  status: TransferStatus
  note: string
  createdAt: string
}

export type FileType = 'image' | 'document' | 'other'

export interface MockFile {
  id: string
  tenantId: string
  name: string
  type: FileType
  size: number
  mimeType: string
  uploadedAt: string
  productId?: string
  downloadUrl?: string
}

export interface Member {
  id: string
  orgId: string
  name: string
  email: string
  role: Role
  status: 'active' | 'invited'
  mfaEnabled: boolean
  joinedAt: string
}

export interface DashboardData {
  tenantId: string
  totalProducts: number
  totalUnits: number
  lowStockCount: number
  outOfStockCount: number
  inventoryValue: number
  lowStockItems: { productId: string; name: string; quantity: number }[]
  recentMovements: Movement[]
  trendData: { label: string; value: number; units: number }[]
}

export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  code?: string
  errors?: Record<string, string[]>
}
