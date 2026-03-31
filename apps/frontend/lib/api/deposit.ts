import { apiClient } from './client';

export async function verifyPayment(userId: string, txHash: string): Promise<void> {
  try {
    await apiClient.post('payment/verify', { json: { txHash, userId } });
  } catch (err: any) {
    const body = await err.response?.clone().json().catch(() => null);
    throw new Error(body?.error ?? 'Verification failed');
  }
}
