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
  imageUrl?: string
  imageKey?: string | null
  version?: number
  createdAt: string
  updatedAt: string
}

export interface ProductFilters {
  search: string
  category: string
  status: string
  sort: string
  page: number
}

export function getStockStatus(quantity: number, reorderLevel: number): StockStatus {
  if (quantity <= 0) return 'out_of_stock'
  if (quantity <= reorderLevel) return 'low'
  return 'in_stock'
}
