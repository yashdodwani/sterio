import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SessionStore = {
  _hasHydrated: boolean;
  clientId: string;
  sessionId: string | null;
  setSessionId: (id: string) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      clientId: '',
      sessionId: null,
      setSessionId: (id) => set({ sessionId: id }),
      clearSession: () => set({ sessionId: null }),
    }),
    {
      name: 'purch-session',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!state.clientId) state.clientId = crypto.randomUUID();
        state._hasHydrated = true;
      },
    },
  ),
);
