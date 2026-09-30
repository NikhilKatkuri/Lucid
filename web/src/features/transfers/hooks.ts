import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../shared/api/queryKeys'
import { fetchTransfers, createTransfer } from '../../mocks/db'
import type { Transfer } from '../../mocks/db'

export function useTransfers(orgId: string, tenantId: string) {
  return useQuery({
    queryKey: queryKeys.transfers(tenantId),
    queryFn: () => fetchTransfers(orgId, tenantId),
    enabled: !!tenantId && !!orgId,
  })
}

export function useCreateTransfer(tenantId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Transfer, 'id' | 'createdAt'>) => createTransfer(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transfers(tenantId) })
    },
  })
}
