'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@crossmint/client-sdk-react-ui';
import { useOnboardingStatus } from './api/onboarding';

export function useAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();
  const { data: onboardingStatus, isLoading } = useOnboardingStatus({ enabled: status === 'logged-in' });

  useEffect(() => {
    if (status === 'initializing' || status === 'in-progress') return;
    if (status !== 'logged-in') {
      if (pathname !== '/login') router.replace('/login');
      return;
    }
    if (isLoading) return;
    if (onboardingStatus && !onboardingStatus.completed && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }
  }, [status, onboardingStatus, isLoading, pathname, router]);
}
