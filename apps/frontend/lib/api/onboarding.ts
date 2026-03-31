import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { components } from '@/src/types/api.d';

type OnboardingStatus = components['schemas']['OnboardingStatus'];
type Step1Body = components['schemas']['OnboardingStep1'];
type Step2Body = components['schemas']['OnboardingStep2'];
type Step3Body = components['schemas']['OnboardingStep3'];
type StepResponse = components['schemas']['OnboardingStepResponse'];

export const ONBOARDING_KEY = ['onboarding', 'status'] as const;

export function useOnboardingStatus({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ONBOARDING_KEY,
    queryFn: () => apiClient.get('onboarding/status').json<OnboardingStatus>(),
    enabled,
  });
}

export function useOnboardingStep1() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Step1Body) =>
      apiClient.post('onboarding/step-1', { json: body }).json<StepResponse>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ONBOARDING_KEY }),
  });
}

export function useOnboardingStep2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Step2Body) =>
      apiClient.post('onboarding/step-2', { json: body }).json<StepResponse>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ONBOARDING_KEY }),
  });
}

export function useOnboardingStep3() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Step3Body) =>
      apiClient.post('onboarding/step-3', { json: body }).json<StepResponse>(),
    onSuccess: () => qc.setQueryData(ONBOARDING_KEY, { step: 3, completed: true }),
  });
}
