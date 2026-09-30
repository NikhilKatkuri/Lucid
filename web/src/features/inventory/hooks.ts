import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../shared/api/queryKeys'
import {
  fetchProducts,
  fetchProduct,
  adjustStock,
  createProduct,
  fetchMovements,
} from '../../mocks/db'

export function useProducts(tenantId: string, opts?: { search?: string; category?: string; status?: string }) {
  const filters = {
    ...(opts?.search ? { search: opts.search } : {}),
    ...(opts?.category ? { category: opts.category } : {}),
    ...(opts?.status ? { status: opts.status } : {}),
  }
  return useQuery({
    queryKey: queryKeys.products(tenantId, filters),
    queryFn: () => fetchProducts(tenantId, opts),
    enabled: !!tenantId,
  })
}

export function useProduct(tenantId: string, productId: string) {
  return useQuery({
    queryKey: queryKeys.product(tenantId, productId),
    queryFn: () => fetchProduct(tenantId, productId),
    enabled: !!tenantId && !!productId,
  })
}

export function useProductMovements(tenantId: string, productId: string) {
  return useQuery({
    queryKey: queryKeys.productMovements(tenantId, productId),
    queryFn: () => fetchMovements(tenantId, {}),
    select: (data) => data.filter((m) => m.productId === productId),
    enabled: !!tenantId && !!productId,
  })
}

export function useAdjustStock(tenantId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      productId,
      delta,
      reason,
      note,
    }: {
      productId: string
      delta: number
      reason: string
      note: string
    }) => adjustStock(tenantId, productId, delta, reason, note),
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.products(tenantId) })
      qc.invalidateQueries({ queryKey: queryKeys.product(tenantId, productId) })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(tenantId) })
      qc.invalidateQueries({ queryKey: queryKeys.movements(tenantId) })
    },
  })
}

export function useCreateProduct(tenantId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createProduct>[1]) => createProduct(tenantId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products(tenantId) })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(tenantId) })
    },
  })
}
