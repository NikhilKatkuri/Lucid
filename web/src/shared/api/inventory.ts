import { api, unwrap } from './client'
import { env } from '../config/env'
import * as mock from '../../mocks/db'
import type { Product, Movement, DashboardData } from '../../mocks/db'

interface ServerProduct {
  id: string; tenantId: string; name: string; sku: string; category: string; quantity: number
  reorderLevel: number; price: number; version: number; isArchived: boolean; createdAt: string; updatedAt: string
}
interface ServerMovement {
  id: string; tenantId: string; productId: string; type: string; quantityDelta: number
  beforeQuantity: number; afterQuantity: number; reason: string; createdAt: string
}

const mapProduct = (p: ServerProduct): Product => ({
  ...p, description: '', supplierCost: 0, imageInitial: p.name?.[0]?.toUpperCase() ?? '?',
})
const mapMovement = (m: ServerMovement, productName = m.productId): Movement => ({
  id: m.id, tenantId: m.tenantId, productId: m.productId, productName,
  type: m.type.toLowerCase() as Movement['type'], quantity: m.quantityDelta,
  reference: m.reason, note: '', date: m.createdAt,
})

export async function fetchProducts(_tenantId: string, opts?: { search?: string; category?: string; status?: string }): Promise<Product[]> {
  if (env.VITE_USE_MOCK) return mock.fetchProducts(_tenantId, opts)
  const { data } = await api.get('/inventory/products', { params: {
    search: opts?.search, category: opts?.category,
    stockStatus: opts?.status === 'in_stock' ? 'in' : opts?.status === 'out_of_stock' ? 'out' : opts?.status,
    page: 1, pageSize: 100,
  } })
  return (unwrap<{ items: ServerProduct[] }>(data).items ?? []).map(mapProduct)
}

export async function fetchProduct(_tenantId: string, productId: string): Promise<Product | null> {
  if (env.VITE_USE_MOCK) return mock.fetchProduct(_tenantId, productId)
  const { data } = await api.get(`/inventory/products/${productId}`)
  return mapProduct(unwrap<ServerProduct>(data))
}

export async function createProduct(_tenantId: string, input: Parameters<typeof mock.createProduct>[1]): Promise<Product> {
  if (env.VITE_USE_MOCK) return mock.createProduct(_tenantId, input)
  const { data } = await api.post('/inventory/products', {
    sku: input.sku, name: input.name, category: input.category,
    quantity: input.quantity, reorderLevel: input.reorderLevel, price: input.price,
  })
  return mapProduct(unwrap<ServerProduct>(data))
}

export async function adjustStock(tenantId: string, productId: string, delta: number, reason: string, note: string): Promise<Product> {
  if (env.VITE_USE_MOCK) return mock.adjustStock(tenantId, productId, delta, reason, note)
  await api.post(`/inventory/products/${productId}/adjust`, { quantityDelta: delta, reason, note })
  return fetchProduct(tenantId, productId).then((product) => {
    if (!product) throw new Error('Product not found')
    return product
  })
}

export async function fetchMovements(_tenantId: string, opts?: { search?: string; type?: string }, productId?: string): Promise<Movement[]> {
  if (env.VITE_USE_MOCK) return mock.fetchMovements(_tenantId, opts)
  const { data } = await api.get(productId ? `/inventory/products/${productId}/movements` : '/inventory/movements')
  let movements = (unwrap<ServerMovement[]>(data) ?? []).map((m) => mapMovement(m))
  if (opts?.type) movements = movements.filter((m) => m.type === opts.type)
  if (opts?.search) {
    const q = opts.search.toLowerCase()
    movements = movements.filter((m) => m.productName.toLowerCase().includes(q) || m.reference.toLowerCase().includes(q))
  }
  return movements
}

export async function fetchDashboard(tenantId: string): Promise<DashboardData> {
  if (env.VITE_USE_MOCK) return mock.fetchDashboard(tenantId)
  const { data } = await api.get('/reports/dashboard')
  const result = unwrap<{ totalProducts: number; totalStock: number; lowStockProducts: number; outOfStockProducts: number; inventoryValue: number; lowStockItems: { productId: string; name: string; quantity: number }[]; recentMovements: { movementId: string; productId: string; productName: string; type: string; quantityDelta: number; reason: string; createdAt: string }[] }>(data)
  return {
    tenantId, totalProducts: result.totalProducts, totalUnits: result.totalStock,
    lowStockCount: result.lowStockProducts, outOfStockCount: result.outOfStockProducts,
    inventoryValue: result.inventoryValue, lowStockItems: result.lowStockItems,
    recentMovements: result.recentMovements.map((m) => ({ id: m.movementId, tenantId, productId: m.productId, productName: m.productName, type: m.type.toLowerCase() as Movement['type'], quantity: m.quantityDelta, reference: m.reason, note: '', date: m.createdAt })),
    trendData: [],
  }
}
