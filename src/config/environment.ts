/**
 * Environment Configuration
 * Centralized environment variable management with validation and type safety
 */

import { z } from 'zod';

// Environment validation schemas
const environmentSchema = z.object({
  // Supabase Configuration
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),

  // Application Configuration
  VITE_APP_NAME: z.string().default('Enhanced RAG Education Platform'),
  VITE_APP_VERSION: z.string().default('1.0.0'),
  VITE_APP_ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),

  // File Upload Configuration
  VITE_MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number().positive()).default('52428800'),
  VITE_ALLOWED_FILE_TYPES: z.string().default('application/pdf'),
  VITE_MAX_FILES_PER_UPLOAD: z.string().transform(Number).pipe(z.number().positive()).default('10'),

  // Vector Search Configuration
  VITE_DEFAULT_SIMILARITY_THRESHOLD: z.string().transform(Number).pipe(z.number().min(0).max(1)).default('0.7'),
  VITE_MAX_SEARCH_RESULTS: z.string().transform(Number).pipe(z.number().positive()).default('20'),
  VITE_EMBEDDING_DIMENSION: z.string().transform(Number).pipe(z.number().positive()).default('1536'),
  VITE_SEARCH_TIMEOUT: z.string().transform(Number).pipe(z.number().positive()).default('10000'),

  // Chat Configuration
  VITE_MAX_CHAT_HISTORY: z.string().transform(Number).pipe(z.number().positive()).default('100'),
  VITE_CHAT_TIMEOUT: z.string().transform(Number).pipe(z.number().positive()).default('30000'),
  VITE_MAX_MESSAGE_LENGTH: z.string().transform(Number).pipe(z.number().positive()).default('4000'),
  VITE_STREAMING_ENABLED: z.string().transform(val => val === 'true').default('true'),

  // Performance Configuration
  VITE_ENABLE_CACHING: z.string().transform(val => val === 'true').default('true'),
  VITE_CACHE_TTL: z.string().transform(Number).pipe(z.number().positive()).default('300000'),
  VITE_LAZY_LOADING_ENABLED: z.string().transform(val => val === 'true').default('true'),
  VITE_VIRTUAL_SCROLLING_ENABLED: z.string().transform(val => val === 'true').default('true'),

  // Analytics Configuration
  VITE_ANALYTICS_ENABLED: z.string().transform(val => val === 'true').default('true'),
  VITE_PRIVACY_MODE: z.string().transform(val => val === 'true').default('true'),

  // Security Configuration
  VITE_RATE_LIMIT_ENABLED: z.string().transform(val => val === 'true').default('true'),
  VITE_MAX_REQUESTS_PER_MINUTE: z.string().transform(Number).pipe(z.number().positive()).default('60'),

  // Development Configuration
  VITE_DEBUG_MODE: z.string().transform(val => val === 'true').default('false'),
  VITE_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  VITE_ENABLE_DEVTOOLS: z.string().transform(val => val === 'true').default('false'),
});

// Validate environment variables
function validateEnvironment() {
  try {
    return environmentSchema.parse(import.meta.env);
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw new Error('Invalid environment configuration. Please check your .env.local file.');
  }
}

// Export validated environment configuration
export const env = validateEnvironment();

// Environment utilities
export const isDevelopment = env.VITE_APP_ENVIRONMENT === 'development';
export const isProduction = env.VITE_APP_ENVIRONMENT === 'production';
export const isStaging = env.VITE_APP_ENVIRONMENT === 'staging';

// Configuration objects for different services
export const supabaseConfig = {
  url: env.VITE_SUPABASE_URL,
  anonKey: env.VITE_SUPABASE_ANON_KEY,
} as const;

export const uploadConfig = {
  maxFileSize: env.VITE_MAX_FILE_SIZE,
  allowedTypes: env.VITE_ALLOWED_FILE_TYPES.split(',').map(type => type.trim()),
  maxFilesPerUpload: env.VITE_MAX_FILES_PER_UPLOAD,
} as const;

export const searchConfig = {
  defaultSimilarityThreshold: env.VITE_DEFAULT_SIMILARITY_THRESHOLD,
  maxResults: env.VITE_MAX_SEARCH_RESULTS,
  embeddingDimension: env.VITE_EMBEDDING_DIMENSION,
  timeout: env.VITE_SEARCH_TIMEOUT,
} as const;

export const chatConfig = {
  maxHistory: env.VITE_MAX_CHAT_HISTORY,
  timeout: env.VITE_CHAT_TIMEOUT,
  maxMessageLength: env.VITE_MAX_MESSAGE_LENGTH,
  streamingEnabled: env.VITE_STREAMING_ENABLED,
} as const;

export const performanceConfig = {
  enableCaching: env.VITE_ENABLE_CACHING,
  cacheTTL: env.VITE_CACHE_TTL,
  lazyLoadingEnabled: env.VITE_LAZY_LOADING_ENABLED,
  virtualScrollingEnabled: env.VITE_VIRTUAL_SCROLLING_ENABLED,
} as const;

export const analyticsConfig = {
  enabled: env.VITE_ANALYTICS_ENABLED,
  privacyMode: env.VITE_PRIVACY_MODE,
} as const;

export const securityConfig = {
  rateLimitEnabled: env.VITE_RATE_LIMIT_ENABLED,
  maxRequestsPerMinute: env.VITE_MAX_REQUESTS_PER_MINUTE,
} as const;

export const debugConfig = {
  debugMode: env.VITE_DEBUG_MODE,
  logLevel: env.VITE_LOG_LEVEL,
  enableDevtools: env.VITE_ENABLE_DEVTOOLS,
} as const;

// Environment validation helper for runtime checks
export function validateRequiredEnvVars(requiredVars: string[]): void {
  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
}

// Environment info for debugging
export const environmentInfo = {
  name: env.VITE_APP_NAME,
  version: env.VITE_APP_VERSION,
  environment: env.VITE_APP_ENVIRONMENT,
  debugMode: env.VITE_DEBUG_MODE,
  buildTime: new Date().toISOString(),
} as const;

// Export type for TypeScript support
export type Environment = typeof env;