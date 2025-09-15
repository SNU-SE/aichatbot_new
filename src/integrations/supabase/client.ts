// Enhanced Supabase client configuration for RAG system
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { supabaseConfig, isDevelopment, debugConfig } from '../../config/environment';

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

// Export configuration for use in other parts of the application
export { supabaseConfig };