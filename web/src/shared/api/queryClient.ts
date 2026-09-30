import { QueryClient } from '@tanstack/react-query'
import { env } from '../config/env'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,        // 30 seconds
      gcTime: 1000 * 60 * 5,       // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 401, 403, 404
        if (error instanceof Error && 'status' in error) {
          const status = (error as { status: number }).status
          if ([401, 403, 404].includes(status)) return false
        }
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})

// Re-export for convenience
export { env }
