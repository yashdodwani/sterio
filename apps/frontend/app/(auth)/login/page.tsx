'use client'

import { useAuth } from '@crossmint/client-sdk-react-ui'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useOnboardingStatus } from '@/lib/api/onboarding'

export default function LoginPage() {
  const router = useRouter()
  const { login, user, status } = useAuth()
  const { data: onboardingStatus } = useOnboardingStatus({ enabled: !!user })

  useEffect(() => {
    if (!user) return;
    if (onboardingStatus) {
      router.push(onboardingStatus.completed ? '/app' : '/onboarding')
    }
  }, [user, onboardingStatus, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-(--bg) px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-(--primary) to-(--primary-light) flex items-center justify-center">
            <span className="text-white font-bold text-xl">P</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-(--text-primary)">Purch</h1>
            <p className="text-sm text-(--text-secondary) mt-1">AI-powered shopping assistant</p>
          </div>
        </div>

        <div className="w-full flex flex-col gap-2">
          {status === 'initializing' || status === 'in-progress' ? (
            <p className="text-sm text-(--text-secondary) text-center py-3">Loading…</p>
          ) : (
            <button
              onClick={login}
              className="w-full py-2.5 px-4 rounded-lg border border-(--border) bg-(--surface) hover:bg-(--surface-elevated) text-(--text-secondary) hover:text-(--text-primary) text-sm transition-colors"
            >
              Sign in
            </button>
          )}
        </div>

        <p className="text-xs text-(--text-muted)">Powered by Crossmint</p>
      </div>
    </div>
  )
}
