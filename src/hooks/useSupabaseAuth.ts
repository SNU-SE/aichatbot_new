import { useEffect } from 'react';
import { setSupabaseAuthToken } from '@/integrations/supabase/client';

const AUTH_TOKEN_KEY = 'authToken';
const LEGACY_STUDENT_TOKEN_KEY = 'studentToken';

const migrateLegacyToken = () => {
  if (typeof window === 'undefined') return null;
  const legacyToken = localStorage.getItem(LEGACY_STUDENT_TOKEN_KEY);
  if (!legacyToken) return null;
  localStorage.setItem(AUTH_TOKEN_KEY, legacyToken);
  localStorage.removeItem(LEGACY_STUDENT_TOKEN_KEY);
  return legacyToken;
};

export const useSupabaseAuth = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      token = migrateLegacyToken();
    }

    setSupabaseAuthToken(token);
  }, []);
};

export const persistAuthToken = (token: string | null) => {
  if (typeof window === 'undefined') return;

  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  setSupabaseAuthToken(token);
};

export const clearAuthToken = () => persistAuthToken(null);
