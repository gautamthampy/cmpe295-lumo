'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Role = 'parent' | 'student' | null;

interface AuthState {
  role: Role;
  userId: string | null;
  displayName: string | null;
  token: string | null;

  login: (token: string, role: 'parent' | 'student', displayName?: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

function decodePayload(token: string): Record<string, unknown> {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      role: null,
      userId: null,
      displayName: null,
      token: null,

      login: (token, role, displayName) => {
        const payload = decodePayload(token);
        const userId = (payload['sub'] as string) ?? null;
        const name = displayName ?? (payload['display_name'] as string) ?? null;

        if (typeof window !== 'undefined') {
          if (role === 'student') {
            // Student tokens are session-scoped — clear on tab close
            sessionStorage.setItem('lumo_token', token);
            localStorage.removeItem('lumo_token');
          } else {
            // Parent tokens persist across sessions
            localStorage.setItem('lumo_token', token);
            sessionStorage.removeItem('lumo_token');
          }
        }

        set({ role, userId, displayName: name, token });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('lumo_token');
          sessionStorage.removeItem('lumo_token');
        }
        set({ role: null, userId: null, displayName: null, token: null });
      },

      isAuthenticated: () => {
        const { token } = get();
        if (!token) return false;
        try {
          const payload = decodePayload(token);
          const exp = payload['exp'] as number;
          return Date.now() / 1000 < exp;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'lumo-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({} as Storage)
      ),
      // Only persist parent sessions; student sessions live in sessionStorage
      partialize: (state) =>
        state.role === 'parent'
          ? { role: state.role, userId: state.userId, displayName: state.displayName, token: state.token }
          : { role: null, userId: null, displayName: null, token: null },
    }
  )
);
