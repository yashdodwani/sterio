'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import {
  useOnboardingStatus,
  useOnboardingStep1,
  useOnboardingStep2,
  useOnboardingStep3,
} from '@/lib/api/onboarding';

// --- Schemas aligned with backend ---

const step1Schema = z.object({
  displayName: z.string().min(1).max(50),
});

const step2Schema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  street: z.string().min(5).max(200),
  apt: z.string().max(50).optional(),
  city: z.string().min(2).max(100),
  state: z.string().max(100).optional(),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/),
  country: z.enum(['US', 'GB', 'AU', 'CA', 'DE', 'FR', 'JP', 'SG', 'IN']),
});

const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'CA', label: 'Canada' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'JP', label: 'Japan' },
  { code: 'SG', label: 'Singapore' },
  { code: 'IN', label: 'India' },
] as const;

const TOPS_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
const BOTTOMS_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38'] as const;
const SHOE_SIZES = ['5', '6', '7', '8', '9', '10', '11', '12', '13'] as const;

type FormData = {
  displayName: string;
  firstName: string;
  lastName: string;
  street: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  country: 'US' | 'GB' | 'AU' | 'CA' | 'DE' | 'FR' | 'JP' | 'SG' | 'IN';
  topsSize: string;
  bottomsSize: string;
  footwearSize: string;
};

const INITIAL: FormData = {
  displayName: '',
  firstName: '', lastName: '',
  street: '', apt: '', city: '', state: '', zip: '', country: 'US',
  topsSize: '', bottomsSize: '', footwearSize: '',
};

function SizeGrid({ options, selected, onSelect }: { options: readonly string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${selected === s
              ? 'border-(--primary) bg-(--primary) text-white'
              : 'border-(--border) bg-(--surface-elevated) text-(--text-secondary) hover:border-(--primary-light) hover:text-(--text-primary)'
            }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: statusData, isLoading: statusLoading } = useOnboardingStatus();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const step1Mutation = useOnboardingStep1();
  const step2Mutation = useOnboardingStep2();
  const step3Mutation = useOnboardingStep3();

  // Resume from current backend step
  useEffect(() => {
    if (!statusData) return;
    if (statusData.completed) { router.replace('/app'); return; }
    setStep(Math.min(statusData.step + 1, 3));
  }, [statusData, router]);

  const isPending =
    step1Mutation.isPending || step2Mutation.isPending || step3Mutation.isPending;

  function set(field: keyof FormData, value: string) {
    setData((d) => ({ ...d, [field]: value }));
    setErrors((e) => { const next = { ...e }; delete next[field]; return next; });
  }

  function validateStep(): boolean {
    if (step === 1) {
      const r = step1Schema.safeParse({ displayName: data.displayName });
      if (!r.success) {
        const errs: Record<string, string> = {};
        r.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
        setErrors(errs);
        return false;
      }
    }
    if (step === 2) {
      const r = step2Schema.safeParse({
        firstName: data.firstName, lastName: data.lastName,
        street: data.street, apt: data.apt || undefined,
        city: data.city, state: data.state || undefined,
        zip: data.zip, country: data.country,
      });
      if (!r.success) {
        const errs: Record<string, string> = {};
        r.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
        setErrors(errs);
        return false;
      }
    }
    return true;
  }

  async function handleNext() {
    if (!validateStep()) return;
    setErrors({});

    if (step === 1) {
      await step1Mutation.mutateAsync({ displayName: data.displayName });
      setStep(2);
    } else if (step === 2) {
      await step2Mutation.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        street: data.street,
        apt: data.apt || undefined,
        city: data.city,
        state: data.state || undefined,
        zip: data.zip,
        country: data.country,
      });
      setStep(3);
    }
  }

  async function handleFinish() {
    if (!data.topsSize || !data.bottomsSize || !data.footwearSize) {
      setErrors({ sizes: 'Please select all sizes' });
      return;
    }
    setErrors({});
    await step3Mutation.mutateAsync({
      topsSize: data.topsSize as typeof TOPS_SIZES[number],
      bottomsSize: data.bottomsSize,
      footwearSize: data.footwearSize,
    });
    router.replace('/app');
  }

  const mutationError =
    step1Mutation.error || step2Mutation.error || step3Mutation.error;

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--bg)">
        <p className="text-sm text-(--text-muted)">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-(--bg) px-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-(--text-primary)">
            {step === 1 ? 'Create your profile' : step === 2 ? 'Shipping address' : 'Your sizes'}
          </h1>
          <p className="text-sm text-(--text-muted) mt-1">
            {step === 1 ? 'Choose a display name' : step === 2 ? 'Name & default shipping address' : 'For better recommendations'}
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? 'bg-(--primary)' : 'bg-(--border)'}`} />
          ))}
        </div>

        {/* Step 1 — Display name */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <Field label="Display name" error={errors.displayName}>
              <input
                value={data.displayName}
                onChange={(e) => set('displayName', e.target.value)}
                placeholder="e.g. Jane"
                className={inputCls(!!errors.displayName)}
              />
            </Field>
          </div>
        )}

        {/* Step 2 — Name + Address */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" error={errors.firstName}>
                <input value={data.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Jane" className={inputCls(!!errors.firstName)} />
              </Field>
              <Field label="Last name" error={errors.lastName}>
                <input value={data.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Doe" className={inputCls(!!errors.lastName)} />
              </Field>
            </div>
            <Field label="Street address" error={errors.street}>
              <input value={data.street} onChange={(e) => set('street', e.target.value)} placeholder="123 Main St" className={inputCls(!!errors.street)} />
            </Field>
            <Field label="Apt / Suite (optional)">
              <input value={data.apt} onChange={(e) => set('apt', e.target.value)} placeholder="Apt 4B" className={inputCls(false)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" error={errors.city}>
                <input value={data.city} onChange={(e) => set('city', e.target.value)} placeholder="New York" className={inputCls(!!errors.city)} />
              </Field>
              <Field label="State / Province">
                <input value={data.state} onChange={(e) => set('state', e.target.value)} placeholder="NY" className={inputCls(false)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ZIP code" error={errors.zip}>
                <input value={data.zip} onChange={(e) => set('zip', e.target.value)} placeholder="10001" className={inputCls(!!errors.zip)} />
              </Field>
              <Field label="Country" error={errors.country}>
                <select
                  value={data.country}
                  onChange={(e) => set('country', e.target.value)}
                  className={inputCls(!!errors.country)}
                >
                  {COUNTRIES.map(({ code, label }) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* Step 3 — Sizes */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <Field label="Tops">
              <SizeGrid options={TOPS_SIZES} selected={data.topsSize} onSelect={(v) => set('topsSize', v)} />
            </Field>
            <Field label="Bottoms">
              <SizeGrid options={BOTTOMS_SIZES} selected={data.bottomsSize} onSelect={(v) => set('bottomsSize', v)} />
            </Field>
            <Field label="Footwear (US)">
              <SizeGrid options={SHOE_SIZES} selected={data.footwearSize} onSelect={(v) => set('footwearSize', v)} />
            </Field>
            {errors.sizes && <p className="text-xs text-(--error)">{errors.sizes}</p>}
          </div>
        )}

        {/* API error */}
        {mutationError && (
          <p className="text-xs text-(--error)">
            {(mutationError as { message?: string }).message ?? 'Something went wrong. Please try again.'}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={isPending}
              className="flex-1 py-3 rounded-xl border border-(--border) text-(--text-secondary) hover:text-(--text-primary) text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              Back
            </button>
          )}
          <button
            onClick={step < 3 ? handleNext : handleFinish}
            disabled={isPending}
            className="flex-1 py-3 rounded-xl bg-(--primary) hover:bg-(--primary-hover) text-white text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer"
          >
            {isPending ? 'Saving…' : step < 3 ? 'Continue' : 'Finish'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-(--text-secondary) uppercase tracking-wide">{label}</label>
      {children}
      {error && <p className="text-xs text-(--error)">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `px-3 py-2.5 rounded-lg border text-sm text-(--text-primary) placeholder-[var(--text-muted)] bg-(--surface-elevated) focus:outline-none transition-colors ${hasError ? 'border-(--error) focus:border-(--error)' : 'border-(--border) focus:border-(--primary)'
    }`;
}
