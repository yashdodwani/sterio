import { apiClient } from './client';
import type { components } from '@/src/types/api.d.ts';

type CheckoutResponse = components['schemas']['CheckoutResponse'];
type OrderSummary = components['schemas']['OrderSummary'];

export async function checkoutItem(cartItemId: string): Promise<CheckoutResponse> {
  try {
    return await apiClient.post('checkout', { json: { cartItemId } }).json<CheckoutResponse>();
  } catch (err: any) {
    const body = await err.response?.clone().json().catch(() => null);
    const code = body?.code ?? '';
    if (code === 'CheckoutNoWalletError') throw new Error('Complete onboarding first — wallet required');
    if (code === 'CheckoutMissingAddressError') throw new Error('Complete onboarding first — address required');
    if (code === 'InsufficientFundsError') throw new Error('Insufficient USDC balance');
    throw new Error(body?.error ?? 'Checkout failed');
  }
}

export async function getOrder(orderId: string): Promise<OrderSummary> {
  return apiClient.get(`orders/${orderId}`).json<OrderSummary>();
}
