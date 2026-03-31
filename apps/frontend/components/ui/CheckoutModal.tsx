'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@crossmint/client-sdk-react-ui';
import { X, CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react';
import { checkoutItem, getOrder } from '@/lib/api/checkout';
import { useProfile } from '@/lib/api/profile';
import type { components } from '@/src/types/api.d.ts';

type CheckoutResponse = components['schemas']['CheckoutResponse'];
type OrderSummary = components['schemas']['OrderSummary'];
type Step = 'preparing' | 'approving' | 'processing' | 'completed' | 'failed';

interface CheckoutModalProps {
  cartItemId: string;
  itemName: string;
  itemPrice: number; // cents
  onDone: () => void;
  onBack: () => void;
}

export function CheckoutModal({ cartItemId, itemName, itemPrice, onDone, onBack }: CheckoutModalProps) {
  const { wallet, getOrCreateWallet } = useWallet();
  const { data: profile } = useProfile();
  const [step, setStep] = useState<Step>('preparing');
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<CheckoutResponse | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderSummary | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const doneRef = useRef(false);

  const cleanup = useCallback(() => {
    doneRef.current = true;
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startPolling = useCallback((orderId: string) => {
    doneRef.current = false;
    setStep('processing');

    pollingRef.current = setInterval(async () => {
      if (doneRef.current) return;
      try {
        const status = await getOrder(orderId);
        if (doneRef.current) return;
        setOrderStatus(status);
        if (status.phase === 'completed' || status.phase === 'delivery') {
          cleanup();
          setStep('completed');
        } else if (status.phase === 'failed') {
          cleanup();
          setStep('failed');
          setError('Order failed');
        }
      } catch {
        // keep polling on transient errors
      }
    }, 2500);

    timeoutRef.current = setTimeout(() => {
      cleanup();
      setStep('failed');
      setError('Taking longer than expected. Check your order history.');
    }, 60_000);
  }, [cleanup]);

  const approveAndPoll = useCallback(async (txId: string, orderId: string) => {
    setError(null);
    setStep('approving');
    try {
      const w =
        wallet ??
        (await getOrCreateWallet({
          chain: 'mantle-sepolia',
          signer: { type: 'email', email: profile?.email ?? '' },
        }));
      if (!w) throw new Error('Wallet not available');
      await w.approve({ transactionId: txId });
      startPolling(orderId);
    } catch (err: any) {
      setStep('failed');
      setError(err.message ?? 'Approval failed');
    }
  }, [wallet, getOrCreateWallet, profile?.email, startPolling]);

  const handleCheckout = useCallback(async () => {
    setError(null);
    setStep('preparing');
    try {
      const data = await checkoutItem(cartItemId);
      setOrderData(data);
      await approveAndPoll(data.transactionId, data.orderId);
    } catch (err: any) {
      setStep('failed');
      setError(err.message ?? 'Checkout failed');
    }
  }, [cartItemId, approveAndPoll]);

  // Auto-start on mount — guard against StrictMode double-fire
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    handleCheckout();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-(--surface) rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col gap-5 border border-(--border)">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-(--text-primary) text-xs uppercase tracking-widest">Checkout</h2>
          {(step === 'completed' || step === 'failed') && (
            <button
              onClick={step === 'completed' ? onDone : onBack}
              className="p-1 rounded hover:bg-(--surface-elevated) text-(--text-secondary)"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Item summary */}
        <div className="flex items-center justify-between text-xs border border-(--border) rounded-lg px-3 py-2.5 bg-(--surface-elevated)">
          <span className="text-(--text-secondary) truncate max-w-[70%]">{itemName}</span>
          <span className="font-mono font-semibold text-(--text-primary) shrink-0 ml-2">
            ${(itemPrice / 100).toFixed(2)}
          </span>
        </div>

        {/* State views */}
        {step === 'preparing' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 size={28} className="animate-spin text-(--primary)" />
            <p className="text-sm text-(--text-secondary)">Creating order…</p>
          </div>
        )}

        {step === 'approving' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Mail size={22} className="text-amber-400" />
            </div>
            <p className="text-sm font-medium text-(--text-primary)">Check your email</p>
            <p className="text-xs text-(--text-secondary) text-center leading-relaxed">
              Enter the OTP code Crossmint sent you to approve this transaction.
            </p>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 size={28} className="animate-spin text-(--primary)" />
            <p className="text-sm text-(--text-secondary)">Processing order…</p>
          </div>
        )}

        {step === 'completed' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle size={36} className="text-emerald-400" />
            <div className="text-center">
              <p className="text-sm font-semibold text-(--text-primary)">Order placed!</p>
              {orderStatus?.quote?.totalPrice && (
                <p className="text-xs text-(--text-secondary) mt-1 font-mono">
                  Total: ${orderStatus.quote.totalPrice.amount}{' '}
                  {orderStatus.quote.totalPrice.currency.toUpperCase()}
                </p>
              )}
            </div>
            <button
              onClick={onDone}
              className="w-full py-2.5 text-xs font-semibold uppercase tracking-wide rounded-lg bg-(--primary) hover:bg-(--primary-hover) text-white transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {step === 'failed' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <AlertCircle size={36} className="text-red-400" />
            <p className="text-xs text-(--text-secondary) text-center leading-relaxed">
              {error ?? 'Something went wrong'}
            </p>
            <div className="flex gap-2 w-full">
              {orderData && (
                <button
                  onClick={() => approveAndPoll(orderData.transactionId, orderData.orderId)}
                  className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wide rounded-lg bg-(--primary) hover:bg-(--primary-hover) text-white transition-colors"
                >
                  Retry
                </button>
              )}
              <button
                onClick={onBack}
                className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wide rounded-lg bg-(--surface-elevated) hover:bg-(--border) text-(--text-secondary) transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
