'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import {
  clearStudentTokenCookie,
  DISPLAY_NAME_STORAGE_KEY,
  GRADE_LEVEL_STORAGE_KEY,
  readStudentTokenFromBrowser,
  ROLE_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  writeStudentTokenCookie,
} from '@/lib/auth-storage';

export type Role = 'parent' | 'student' | null;

interface AuthState {
  role: Role;
  userId: string | null;
  displayName: string | null;
  gradeLevel: number | null;
  token: string | null;

  login: (token: string, role: 'parent' | 'student', displayName?: string, gradeLevel?: number | null) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  syncFromBrowserStorage: () => void;
}

type LegacyPersistedAuthState = {
  state?: {
    role?: Role;
    userId?: string | null;
    displayName?: string | null;
    gradeLevel?: number | null;
    token?: string | null;
  };
};

function decodePayload(token: string): Record<string, unknown> {
  try {
    const normalized = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/') ?? '';
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

function readLegacyStudentState() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem('lumo-auth');
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as LegacyPersistedAuthState;
    const state = parsed.state;
    if (state?.role !== 'student' || !state.token) {
      return null;
    }

    return {
      token: state.token,
      userId: state.userId ?? null,
      displayName: state.displayName ?? null,
      gradeLevel: typeof state.gradeLevel === 'number' ? state.gradeLevel : null,
    };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      role: null,
      userId: null,
      displayName: null,
      gradeLevel: null,
      token: null,

      login: (token, role, displayName, gradeLevel) => {
        const payload = decodePayload(token);
        const userId = (payload['sub'] as string) ?? null;
        const name = displayName ?? (payload['display_name'] as string) ?? null;
        const nextGradeLevel = typeof gradeLevel === 'number' ? gradeLevel : null;

        if (typeof window !== 'undefined') {
          if (role === 'student') {
            sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
            sessionStorage.setItem(ROLE_STORAGE_KEY, role);
            writeStudentTokenCookie(token);
            if (name) {
              sessionStorage.setItem(DISPLAY_NAME_STORAGE_KEY, name);
            } else {
              sessionStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
            }
            if (nextGradeLevel !== null) {
              sessionStorage.setItem(GRADE_LEVEL_STORAGE_KEY, String(nextGradeLevel));
            } else {
              sessionStorage.removeItem(GRADE_LEVEL_STORAGE_KEY);
            }
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          } else {
            localStorage.setItem(TOKEN_STORAGE_KEY, token);
            sessionStorage.removeItem(TOKEN_STORAGE_KEY);
            sessionStorage.removeItem(ROLE_STORAGE_KEY);
            sessionStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
            sessionStorage.removeItem(GRADE_LEVEL_STORAGE_KEY);
            clearStudentTokenCookie();
          }
        }

        set({ role, userId, displayName: name, gradeLevel: nextGradeLevel, token });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          sessionStorage.removeItem(ROLE_STORAGE_KEY);
          sessionStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
          sessionStorage.removeItem(GRADE_LEVEL_STORAGE_KEY);
          clearStudentTokenCookie();
        }
        set({ role: null, userId: null, displayName: null, gradeLevel: null, token: null });
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

      syncFromBrowserStorage: () => {
        if (typeof window === 'undefined') {
          return;
        }

        const { token } = get();
        if (token) {
          return;
        }

        const storedToken = readStudentTokenFromBrowser();
        const legacyState = storedToken ? null : readLegacyStudentState();
        const resolvedToken = storedToken ?? legacyState?.token ?? null;

        if (!resolvedToken) {
          return;
        }

        const payload = decodePayload(resolvedToken);
        const expiresAt = payload['exp'];
        if (typeof expiresAt === 'number' && Date.now() / 1000 >= expiresAt) {
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          sessionStorage.removeItem(ROLE_STORAGE_KEY);
          sessionStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
          sessionStorage.removeItem(GRADE_LEVEL_STORAGE_KEY);
          clearStudentTokenCookie();
          return;
        }

        const userId = legacyState?.userId ?? ((payload['sub'] as string) ?? null);
        const displayName = sessionStorage.getItem(DISPLAY_NAME_STORAGE_KEY) ?? legacyState?.displayName ?? ((payload['display_name'] as string) ?? null);
        const gradeLevelValue = sessionStorage.getItem(GRADE_LEVEL_STORAGE_KEY);
        const tokenGradeLevel = typeof payload['grade_level'] === 'number' ? payload['grade_level'] : null;
        const gradeLevel = gradeLevelValue ? Number(gradeLevelValue) : legacyState?.gradeLevel ?? tokenGradeLevel;

        sessionStorage.setItem(TOKEN_STORAGE_KEY, resolvedToken);
        sessionStorage.setItem(ROLE_STORAGE_KEY, 'student');
        writeStudentTokenCookie(resolvedToken);
        if (displayName) {
          sessionStorage.setItem(DISPLAY_NAME_STORAGE_KEY, displayName);
        }
        if (gradeLevel !== null && Number.isFinite(gradeLevel)) {
          sessionStorage.setItem(GRADE_LEVEL_STORAGE_KEY, String(gradeLevel));
        }

        set({ role: 'student', userId, displayName, gradeLevel: Number.isFinite(gradeLevel) ? gradeLevel : null, token: resolvedToken });
      },
    }),
    {
      name: 'lumo-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({} as Storage)
      ),
      partialize: (state) =>
        state.role === 'parent'
          ? { role: state.role, userId: state.userId, displayName: state.displayName, gradeLevel: null, token: state.token }
          : { role: null, userId: null, displayName: null, gradeLevel: null, token: null },
    }
  )
);
