import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../shared/api/queryKeys'
import { fetchDashboard } from '../../shared/api/inventory'

export function useDashboard(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.dashboard(tenantId),
    queryFn: () => fetchDashboard(tenantId),
    enabled: !!tenantId,
  })
}
