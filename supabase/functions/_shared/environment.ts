/**
 * Edge Function Environment Configuration
 * Centralized environment variable management for Supabase Edge Functions
 */

// Environment variable validation and retrieval
export class EnvironmentManager {
  private static instance: EnvironmentManager;
  private envCache: Map<string, string> = new Map();

  private constructor() {}

  static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  /**
   * Get environment variable with validation
   */
  get(key: string, required: boolean = true): string {
    // Check cache first
    if (this.envCache.has(key)) {
      return this.envCache.get(key)!;
    }

    const value = Deno.env.get(key);
    
    if (required && (!value || value.trim() === '')) {
      throw new Error(`Required environment variable ${key} is not set`);
    }

    if (value) {
      this.envCache.set(key, value);
    }

    return value || '';
  }

  /**
   * Get environment variable as number
   */
  getNumber(key: string, defaultValue?: number): number {
    const value = this.get(key, defaultValue === undefined);
    if (!value && defaultValue !== undefined) {
      return defaultValue;
    }
    
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} must be a valid number`);
    }
    
    return parsed;
  }

  /**
   * Get environment variable as boolean
   */
  getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = this.get(key, defaultValue === undefined);
    if (!value && defaultValue !== undefined) {
      return defaultValue;
    }
    
    return value.toLowerCase() === 'true';
  }

  /**
   * Validate all required environment variables
   */
  validateRequired(requiredVars: string[]): void {
    const missing: string[] = [];
    
    for (const varName of requiredVars) {
      try {
        this.get(varName, true);
      } catch {
        missing.push(varName);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please set these variables in your Supabase project settings.'
      );
    }
  }

  /**
   * Clear environment cache (useful for testing)
   */
  clearCache(): void {
    this.envCache.clear();
  }
}

// Singleton instance
export const env = EnvironmentManager.getInstance();

// Common environment configurations
export const supabaseConfig = {
  url: () => env.get('SUPABASE_URL'),
  serviceRoleKey: () => env.get('SUPABASE_SERVICE_ROLE_KEY'),
  jwtSecret: () => env.get('SUPABASE_JWT_SECRET', false),
};

export const aiConfig = {
  openaiApiKey: () => env.get('OPENAI_API_KEY'),
  claudeApiKey: () => env.get('CLAUDE_API_KEY', false),
  openaiOrgId: () => env.get('OPENAI_ORGANIZATION_ID', false),
};

export const databaseConfig = {
  url: () => env.get('DATABASE_URL', false),
  poolSize: () => env.getNumber('DB_POOL_SIZE', 10),
  timeout: () => env.getNumber('DB_TIMEOUT', 30000),
};

export const redisConfig = {
  url: () => env.get('REDIS_URL', false),
  password: () => env.get('REDIS_PASSWORD', false),
};

export const emailConfig = {
  smtpHost: () => env.get('SMTP_HOST', false),
  smtpPort: () => env.getNumber('SMTP_PORT', 587),
  smtpUser: () => env.get('SMTP_USER', false),
  smtpPassword: () => env.get('SMTP_PASSWORD', false),
};

export const monitoringConfig = {
  sentryDsn: () => env.get('SENTRY_DSN', false),
  logLevel: () => env.get('LOG_LEVEL', false) || 'info',
  enableMetrics: () => env.getBoolean('ENABLE_METRICS', true),
};

// Validation helpers
export function validateAIConfig(): void {
  env.validateRequired(['OPENAI_API_KEY']);
}

export function validateSupabaseConfig(): void {
  env.validateRequired(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
}

export function validateDatabaseConfig(): void {
  // Database URL is optional if using Supabase
  if (env.get('DATABASE_URL', false)) {
    env.validateRequired(['DATABASE_URL']);
  }
}

export function validateEmailConfig(): void {
  const smtpHost = env.get('SMTP_HOST', false);
  if (smtpHost) {
    env.validateRequired(['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD']);
  }
}

// Environment info for logging
export const environmentInfo = {
  timestamp: new Date().toISOString(),
  runtime: 'Deno',
  version: Deno.version.deno,
};

// CORS headers helper
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Error response helper
export function createErrorResponse(message: string, status: number = 400) {
  return new Response(
    JSON.stringify({ 
      error: message,
      timestamp: new Date().toISOString()
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

// Success response helper
export function createSuccessResponse(data: any, status: number = 200) {
  return new Response(
    JSON.stringify({
      data,
      timestamp: new Date().toISOString()
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}