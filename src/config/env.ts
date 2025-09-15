// Environment Configuration
// This file centralizes all environment variable access and validation

interface EnvConfig {
  // Supabase
  supabase: {
    url: string;
    anonKey: string;
  };
  
  // AI Providers
  ai: {
    openaiApiKey?: string;
    claudeApiKey?: string;
  };
  
  // Application
  app: {
    name: string;
    version: string;
    debugMode: boolean;
    logLevel: string;
  };
  
  // File Upload
  upload: {
    maxFileSize: number;
    allowedFileTypes: string[];
  };
  
  // Vector Search
  search: {
    defaultSimilarityThreshold: number;
    maxSearchResults: number;
    embeddingDimension: number;
  };
  
  // Chat
  chat: {
    maxChatHistory: number;
    chatTimeout: number;
  };
}

// Helper function to get environment variable with validation
function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Helper function to get optional environment variable
function getOptionalEnvVar(key: string, defaultValue?: string): string | undefined {
  return import.meta.env[key] || defaultValue;
}

// Helper function to parse boolean environment variable
function getBooleanEnvVar(key: string, defaultValue: boolean = false): boolean {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

// Helper function to parse number environment variable
function getNumberEnvVar(key: string, defaultValue: number): number {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number value for environment variable ${key}: ${value}`);
  }
  return parsed;
}

// Helper function to parse array environment variable
function getArrayEnvVar(key: string, defaultValue: string[] = []): string[] {
  const value = import.meta.env[key];
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

// Create and export the configuration object
export const env: EnvConfig = {
  supabase: {
    url: getEnvVar('VITE_SUPABASE_URL'),
    anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY'),
  },
  
  ai: {
    openaiApiKey: getOptionalEnvVar('VITE_OPENAI_API_KEY'),
    claudeApiKey: getOptionalEnvVar('VITE_CLAUDE_API_KEY'),
  },
  
  app: {
    name: getEnvVar('VITE_APP_NAME', 'Enhanced RAG Education Platform'),
    version: getEnvVar('VITE_APP_VERSION', '1.0.0'),
    debugMode: getBooleanEnvVar('VITE_DEBUG_MODE', false),
    logLevel: getEnvVar('VITE_LOG_LEVEL', 'info'),
  },
  
  upload: {
    maxFileSize: getNumberEnvVar('VITE_MAX_FILE_SIZE', 52428800), // 50MB
    allowedFileTypes: getArrayEnvVar('VITE_ALLOWED_FILE_TYPES', ['application/pdf']),
  },
  
  search: {
    defaultSimilarityThreshold: parseFloat(getEnvVar('VITE_DEFAULT_SIMILARITY_THRESHOLD', '0.7')),
    maxSearchResults: getNumberEnvVar('VITE_MAX_SEARCH_RESULTS', 10),
    embeddingDimension: getNumberEnvVar('VITE_EMBEDDING_DIMENSION', 1536),
  },
  
  chat: {
    maxChatHistory: getNumberEnvVar('VITE_MAX_CHAT_HISTORY', 50),
    chatTimeout: getNumberEnvVar('VITE_CHAT_TIMEOUT', 30000),
  },
};

// Validation function to check if all required environment variables are set
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    // Check required Supabase variables
    if (!env.supabase.url) {
      errors.push('VITE_SUPABASE_URL is required');
    }
    if (!env.supabase.anonKey) {
      errors.push('VITE_SUPABASE_ANON_KEY is required');
    }
    
    // Validate URL format
    if (env.supabase.url && !env.supabase.url.startsWith('https://')) {
      errors.push('VITE_SUPABASE_URL must be a valid HTTPS URL');
    }
    
    // Validate file size limits
    if (env.upload.maxFileSize <= 0) {
      errors.push('VITE_MAX_FILE_SIZE must be a positive number');
    }
    
    // Validate similarity threshold
    if (env.search.defaultSimilarityThreshold < 0 || env.search.defaultSimilarityThreshold > 1) {
      errors.push('VITE_DEFAULT_SIMILARITY_THRESHOLD must be between 0 and 1');
    }
    
    // Validate embedding dimension
    if (env.search.embeddingDimension <= 0) {
      errors.push('VITE_EMBEDDING_DIMENSION must be a positive number');
    }
    
  } catch (error) {
    errors.push(`Environment validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Development helper to log configuration (excluding sensitive data)
export function logConfiguration(): void {
  if (!env.app.debugMode) return;
  
  console.log('🔧 Environment Configuration:', {
    app: env.app,
    upload: env.upload,
    search: env.search,
    chat: env.chat,
    supabase: {
      url: env.supabase.url,
      anonKey: env.supabase.anonKey ? '[CONFIGURED]' : '[MISSING]',
    },
    ai: {
      openaiApiKey: env.ai.openaiApiKey ? '[CONFIGURED]' : '[MISSING]',
      claudeApiKey: env.ai.claudeApiKey ? '[CONFIGURED]' : '[MISSING]',
    },
  });
}

// Export individual configurations for convenience
export const {
  supabase: supabaseConfig,
  ai: aiConfig,
  app: appConfig,
  upload: uploadConfig,
  search: searchConfig,
  chat: chatConfig,
} = env;