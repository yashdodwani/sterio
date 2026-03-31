'use client';

import { useState, useRef } from 'react';
import { X, Copy, Check, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useProfile } from '@/lib/api/profile';
import { verifyPayment } from '@/lib/api/deposit';
import { useQueryClient } from '@tanstack/react-query';

type Step = 'address' | 'verify' | 'verifying' | 'success' | 'error';

interface DepositModalProps {
  onClose: () => void;
}

const GUIDE_STEPS = [
  'Copy the deposit address below',
  'Open MetaMask and send PAS to that address',
  'Copy the transaction hash MetaMask gives you',
  "Click \"I've sent the transaction\" to proceed",
];

export function DepositModal({ onClose }: DepositModalProps) {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('address');
  const [txHash, setTxHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const txInputRef = useRef<HTMLInputElement>(null);

  const walletAddress = profile?.walletAddress ?? '';

  function handleCopyAddress() {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleFocusTxInput() {
    try {
      const text = await navigator.clipboard.readText();
      if (text && !txHash) setTxHash(text.trim());
    } catch {
      // clipboard permission denied
    }
  }

  async function handleVerify() {
    if (!txHash.trim() || !profile) return;
    setStep('verifying');
    try {
      await verifyPayment(profile.userId, txHash.trim());
      setStep('success');
    } catch (err: any) {
      setError(err.message ?? 'Verification failed');
      setStep('error');
    }
  }

  function handleDone() {
    queryClient.invalidateQueries({ queryKey: ['wallet', 'balance', 'mnt'] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="modal-enter relative bg-(--surface) rounded-2xl shadow-2xl w-full max-w-sm mx-4 border border-(--border) overflow-hidden">
        {/* Purple accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-(--primary)/60 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2">
            {(step === 'verify' || step === 'error') && (
              <button
                onClick={() => { setStep(step === 'error' ? 'verify' : 'address'); setError(null); }}
                className="p-1 -ml-1 rounded-lg hover:bg-(--surface-elevated) text-(--text-muted) hover:text-(--text-secondary) transition-colors"
              >
                <ArrowLeft size={14} />
              </button>
            )}
            <h2 className="text-xs font-semibold uppercase tracking-widest text-(--text-primary)">
              {step === 'address' && 'Top Up Balance'}
              {step === 'verify' && 'Verify Payment'}
              {step === 'verifying' && 'Verifying…'}
              {step === 'success' && 'Deposit Confirmed'}
              {step === 'error' && 'Verification Failed'}
            </h2>
          </div>
          {step !== 'verifying' && (
            <button
              onClick={step === 'success' ? handleDone : onClose}
              className="p-1 rounded-lg hover:bg-(--surface-elevated) text-(--text-muted) hover:text-(--text-primary) transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* address step */}
        {step === 'address' && (
          <div className="px-5 pb-5 flex flex-col gap-5">
            <ol className="space-y-3">
              {GUIDE_STEPS.map((text, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-none w-5 h-5 rounded-full border border-(--primary)/40 bg-(--primary)/10 flex items-center justify-center text-[10px] font-semibold text-(--primary-light) mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-xs text-(--text-secondary) leading-relaxed">{text}</span>
                </li>
              ))}
            </ol>

            <div className="rounded-xl border border-(--border) bg-(--surface-elevated) p-0.5">
              <div className="rounded-[10px] bg-(--surface) px-3 py-3 flex items-center gap-2">
                <span className="flex-1 text-[11px] font-mono text-(--text-secondary) break-all select-all leading-relaxed">
                  {walletAddress || '—'}
                </span>
                <button
                  onClick={handleCopyAddress}
                  disabled={!walletAddress}
                  className="flex-none p-1.5 rounded-md hover:bg-(--surface-elevated) text-(--text-muted) hover:text-(--primary-light) transition-colors disabled:opacity-40"
                  title="Copy address"
                >
                  {copied ? <Check size={13} className="text-(--success)" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <button
              onClick={() => setStep('verify')}
              disabled={!walletAddress}
              className="w-full py-2.5 rounded-xl bg-(--primary) hover:bg-(--primary-hover) text-white text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-40"
            >
              I've sent the transaction
            </button>
          </div>
        )}

        {/* verify step */}
        {step === 'verify' && (
          <div className="px-5 pb-5 flex flex-col gap-4">
            <p className="text-xs text-(--text-secondary)">
              Paste your transaction hash to confirm your deposit.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-(--text-muted) uppercase tracking-wide">Transaction hash</label>
              <input
                ref={txInputRef}
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                onFocus={handleFocusTxInput}
                placeholder="0x…"
                className="w-full font-mono text-xs bg-(--surface-elevated) border border-(--border) rounded-xl px-3 py-2.5 text-(--text-primary) placeholder:text-(--text-muted) outline-none focus:border-(--primary)/60 transition-colors"
              />
            </div>

            <button
              onClick={handleVerify}
              disabled={!txHash.trim()}
              className="w-full py-2.5 rounded-xl bg-(--primary) hover:bg-(--primary-hover) text-white text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Verify Payment
            </button>
          </div>
        )}

        {/* verifying step */}
        {step === 'verifying' && (
          <div className="px-5 pb-8 flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-(--primary)" />
            <p className="text-sm text-(--text-secondary)">Verifying transaction…</p>
          </div>
        )}

        {/* success step */}
        {step === 'success' && (
          <div className="px-5 pb-5 flex flex-col items-center gap-4">
            <CheckCircle size={36} className="text-emerald-400" />
            <p className="text-sm font-semibold text-(--text-primary)">Deposit confirmed!</p>
            <button
              onClick={handleDone}
              className="w-full py-2.5 rounded-xl bg-(--primary) hover:bg-(--primary-hover) text-white text-xs font-semibold uppercase tracking-wide transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {/* error step */}
        {step === 'error' && (
          <div className="px-5 pb-5 flex flex-col items-center gap-4">
            <AlertCircle size={36} className="text-red-400" />
            <p className="text-xs text-(--text-secondary) text-center leading-relaxed">
              {error ?? 'Something went wrong'}
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => { setStep('verify'); setError(null); }}
                className="flex-1 py-2.5 rounded-xl bg-(--primary) hover:bg-(--primary-hover) text-white text-xs font-semibold uppercase tracking-wide transition-colors"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-(--surface-elevated) hover:bg-(--border) text-(--text-secondary) text-xs font-semibold uppercase tracking-wide transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
