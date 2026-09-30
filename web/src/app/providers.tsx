import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { SnackbarProvider } from '../shared/components'
import { AuthProvider } from '../features/auth/AuthProvider'
import { TenantProvider } from '../features/tenant/TenantProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

/** Query → Snackbar → Auth → Tenant (outermost first). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider>
        <AuthProvider>
          <TenantProvider>{children}</TenantProvider>
        </AuthProvider>
      </SnackbarProvider>
    </QueryClientProvider>
  )
}

export { queryClient }
