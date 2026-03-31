'use client';

import { useAuth } from '@crossmint/client-sdk-react-ui';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

interface Props {
  className?: string;
  children: ReactNode;
}

export function LaunchButton({ className, children }: Props) {
  const { status } = useAuth();
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(status === 'logged-in' ? '/app' : '/login')}
      className={className}
    >
      {children}
    </button>
  );
}
