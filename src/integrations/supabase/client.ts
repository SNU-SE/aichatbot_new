// Enhanced Supabase client configuration for RAG system
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { supabaseConfig, isDevelopment, debugConfig } from '../../config/environment';

let authToken: string | null = null;

const authAwareFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers || {});
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  return fetch(input, { ...init, headers });
};

// Log configuration in development
if (isDevelopment && debugConfig.debugMode) {
  console.log('🔧 Supabase Configuration:', {
    url: supabaseConfig.url,
    hasAnonKey: !!supabaseConfig.anonKey,
    environment: isDevelopment ? 'development' : 'production'
  });
}

// Create Supabase client with environment configuration
export const supabase = createClient<Database>(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  {
    global: {
      fetch: authAwareFetch
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

export const setSupabaseAuthToken = (token: string | null) => {
  authToken = token;
};

// Export configuration for use in other parts of the application
export { supabaseConfig };
