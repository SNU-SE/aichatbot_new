import { useEffect } from 'react';
import { setSupabaseAuthToken } from '@/integrations/supabase/client';

const STUDENT_TOKEN_KEY = 'studentToken';

export const useSupabaseAuth = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem(STUDENT_TOKEN_KEY);
    if (token) {
      setSupabaseAuthToken(token);
    }
  }, []);
};

export const persistStudentToken = (token: string | null) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(STUDENT_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(STUDENT_TOKEN_KEY);
  }
  setSupabaseAuthToken(token);
};
