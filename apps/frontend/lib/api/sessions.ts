import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { components } from '@/src/types/api.d';

type ChatSession = components['schemas']['ChatSession'];
type SessionList = components['schemas']['SessionList'];
type SessionWithMessages = components['schemas']['SessionWithMessages'];

export const SESSIONS_KEY = ['sessions'] as const;

export function createChatSession(title?: string): Promise<ChatSession> {
  return apiClient.post('sessions', { json: title ? { title } : {} }).json<ChatSession>();
}

export function getChatSession(id: string): Promise<SessionWithMessages> {
  return apiClient.get(`sessions/${id}`).json<SessionWithMessages>();
}

function listChatSessions(): Promise<SessionList> {
  return apiClient.get('sessions', { searchParams: { limit: 100 } }).json<SessionList>();
}

export function useListSessions() {
  return useQuery({ queryKey: SESSIONS_KEY, queryFn: listChatSessions });
}

export function useInvalidateSessions() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: SESSIONS_KEY });
}

export async function deleteChatSession(id: string): Promise<void> {
  await apiClient.delete(`sessions/${id}`);
}

