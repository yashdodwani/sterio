'use client';

import { useAuth } from '@crossmint/client-sdk-react-ui';
import { useAuthGuard } from '@/lib/use-auth-guard';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  useAuthGuard();
  const { status } = useAuth();

  if (status === 'initializing' || status === 'in-progress') {
    return (
      <div className="flex h-screen items-center justify-center bg-(--bg)">
        <div className="w-5 h-5 rounded-full border-2 border-(--primary) border-t-transparent animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
