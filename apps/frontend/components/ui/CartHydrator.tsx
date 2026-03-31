'use client';

import { useEffect } from 'react';
import { cartApi } from '@/lib/api/cart';

export function CartHydrator() {
  useEffect(() => {
    cartApi.hydrate();
  }, []);
  return null;
}
