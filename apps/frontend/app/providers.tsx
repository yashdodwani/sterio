'use client'

import { CrossmintProvider, CrossmintAuthProvider, CrossmintWalletProvider } from '@crossmint/client-sdk-react-ui'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })
  )

  return (
    <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_API_KEY ?? ''}>
      <CrossmintAuthProvider loginMethods={['email', 'google']}>
        <CrossmintWalletProvider>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  )
}
