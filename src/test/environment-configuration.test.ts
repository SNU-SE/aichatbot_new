/**
 * Environment Configuration Tests
 * Tests for environment variable loading, validation, and configuration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock import.meta.env for testing
const mockEnv = {
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.key',
  VITE_APP_NAME: 'Test App',
  VITE_APP_VERSION: '1.0.0',
  VITE_APP_ENVIRONMENT: 'development',
  VITE_MAX_FILE_SIZE: '52428800',
  VITE_ALLOWED_FILE_TYPES: 'application/pdf,text/plain',
  VITE_MAX_FILES_PER_UPLOAD: '10',
  VITE_DEFAULT_SIMILARITY_THRESHOLD: '0.7',
  VITE_MAX_SEARCH_RESULTS: '20',
  VITE_EMBEDDING_DIMENSION: '1536',
  VITE_SEARCH_TIMEOUT: '10000',
  VITE_MAX_CHAT_HISTORY: '100',
  VITE_CHAT_TIMEOUT: '30000',
  VITE_MAX_MESSAGE_LENGTH: '4000',
  VITE_STREAMING_ENABLED: 'true',
  VITE_ENABLE_CACHING: 'true',
  VITE_CACHE_TTL: '300000',
  VITE_LAZY_LOADING_ENABLED: 'true',
  VITE_VIRTUAL_SCROLLING_ENABLED: 'true',
  VITE_ANALYTICS_ENABLED: 'true',
  VITE_PRIVACY_MODE: 'true',
  VITE_RATE_LIMIT_ENABLED: 'true',
  VITE_MAX_REQUESTS_PER_MINUTE: '60',
  VITE_DEBUG_MODE: 'false',
  VITE_LOG_LEVEL: 'info',
  VITE_ENABLE_DEVTOOLS: 'false'
};

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: mockEnv
});

describe('Environment Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Environment Loading', () => {
    it('should load environment variables correctly', async () => {
      // Dynamically import to ensure mocked env is used
      const { env } = await import('../config/environment');
      
      expect(env.VITE_SUPABASE_URL).toBe('https://test.supabase.co');
      expect(env.VITE_SUPABASE_ANON_KEY).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.key');
      expect(env.VITE_APP_NAME).toBe('Test App');
      expect(env.VITE_APP_VERSION).toBe('1.0.0');
    });

    it('should apply default values for missing variables', async () => {
      // Test with minimal environment
      vi.stubGlobal('import.meta', {
        env: {
          VITE_SUPABASE_URL: 'https://test.supabase.co',
          VITE_SUPABASE_ANON_KEY: 'test-key'
        }
      });

      const { env } = await import('../config/environment');
      
      expect(env.VITE_APP_NAME).toBe('Enhanced RAG Education Platform');
      expect(env.VITE_APP_VERSION).toBe('1.0.0');
      expect(env.VITE_APP_ENVIRONMENT).toBe('development');
    });

    it('should transform string values to appropriate types', async () => {
      const { env } = await import('../config/environment');
      
      expect(typeof env.VITE_MAX_FILE_SIZE).toBe('number');
      expect(typeof env.VITE_STREAMING_ENABLED).toBe('boolean');
      expect(typeof env.VITE_DEBUG_MODE).toBe('boolean');
      expect(env.VITE_MAX_FILE_SIZE).toBe(52428800);
      expect(env.VITE_STREAMING_ENABLED).toBe(true);
      expect(env.VITE_DEBUG_MODE).toBe(false);
    });
  });

  describe('Environment Validation', () => {
    it('should validate required Supabase URL format', async () => {
      vi.stubGlobal('import.meta', {
        env: {
          ...mockEnv,
          VITE_SUPABASE_URL: 'invalid-url'
        }
      });

      await expect(async () => {
        await import('../config/environment');
      }).rejects.toThrow();
    });

    it('should validate similarity threshold range', async () => {
      vi.stubGlobal('import.meta', {
        env: {
          ...mockEnv,
          VITE_DEFAULT_SIMILARITY_THRESHOLD: '1.5'
        }
      });

      await expect(async () => {
        await import('../config/environment');
      }).rejects.toThrow();
    });

    it('should validate positive numbers', async () => {
      vi.stubGlobal('import.meta', {
        env: {
          ...mockEnv,
          VITE_MAX_FILE_SIZE: '-1'
        }
      });

      await expect(async () => {
        await import('../config/environment');
      }).rejects.toThrow();
    });

    it('should validate log level enum', async () => {
      vi.stubGlobal('import.meta', {
        env: {
          ...mockEnv,
          VITE_LOG_LEVEL: 'invalid'
        }
      });

      await expect(async () => {
        await import('../config/environment');
      }).rejects.toThrow();
    });
  });

  describe('Configuration Objects', () => {
    it('should create supabase configuration object', async () => {
      const { supabaseConfig } = await import('../config/environment');
      
      expect(supabaseConfig.url).toBe('https://test.supabase.co');
      expect(supabaseConfig.anonKey).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.key');
    });

    it('should create upload configuration object', async () => {
      const { uploadConfig } = await import('../config/environment');
      
      expect(uploadConfig.maxFileSize).toBe(52428800);
      expect(uploadConfig.allowedTypes).toEqual(['application/pdf', 'text/plain']);
      expect(uploadConfig.maxFilesPerUpload).toBe(10);
    });

    it('should create search configuration object', async () => {
      const { searchConfig } = await import('../config/environment');
      
      expect(searchConfig.defaultSimilarityThreshold).toBe(0.7);
      expect(searchConfig.maxResults).toBe(20);
      expect(searchConfig.embeddingDimension).toBe(1536);
      expect(searchConfig.timeout).toBe(10000);
    });

    it('should create chat configuration object', async () => {
      const { chatConfig } = await import('../config/environment');
      
      expect(chatConfig.maxHistory).toBe(100);
      expect(chatConfig.timeout).toBe(30000);
      expect(chatConfig.maxMessageLength).toBe(4000);
      expect(chatConfig.streamingEnabled).toBe(true);
    });
  });

  describe('Environment Utilities', () => {
    it('should detect development environment', async () => {
      const { isDevelopment, isProduction, isStaging } = await import('../config/environment');
      
      expect(isDevelopment).toBe(true);
      expect(isProduction).toBe(false);
      expect(isStaging).toBe(false);
    });

    it('should detect production environment', async () => {
      vi.stubGlobal('import.meta', {
        env: {
          ...mockEnv,
          VITE_APP_ENVIRONMENT: 'production'
        }
      });

      const { isDevelopment, isProduction, isStaging } = await import('../config/environment');
      
      expect(isDevelopment).toBe(false);
      expect(isProduction).toBe(true);
      expect(isStaging).toBe(false);
    });

    it('should provide environment info', async () => {
      const { environmentInfo } = await import('../config/environment');
      
      expect(environmentInfo.name).toBe('Test App');
      expect(environmentInfo.version).toBe('1.0.0');
      expect(environmentInfo.environment).toBe('development');
      expect(environmentInfo.debugMode).toBe(false);
      expect(environmentInfo.buildTime).toBeDefined();
    });
  });

  describe('Required Variables Validation', () => {
    it('should validate required variables successfully', async () => {
      const { validateRequiredEnvVars } = await import('../config/environment');
      
      expect(() => {
        validateRequiredEnvVars(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']);
      }).not.toThrow();
    });

    it('should throw error for missing required variables', async () => {
      vi.stubGlobal('import.meta', {
        env: {
          VITE_SUPABASE_URL: 'https://test.supabase.co'
          // Missing VITE_SUPABASE_ANON_KEY
        }
      });

      const { validateRequiredEnvVars } = await import('../config/environment');
      
      expect(() => {
        validateRequiredEnvVars(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']);
      }).toThrow('Missing required environment variables');
    });
  });

  describe('Performance Configuration', () => {
    it('should configure performance settings correctly', async () => {
      const { performanceConfig } = await import('../config/environment');
      
      expect(performanceConfig.enableCaching).toBe(true);
      expect(performanceConfig.cacheTTL).toBe(300000);
      expect(performanceConfig.lazyLoadingEnabled).toBe(true);
      expect(performanceConfig.virtualScrollingEnabled).toBe(true);
    });
  });

  describe('Security Configuration', () => {
    it('should configure security settings correctly', async () => {
      const { securityConfig } = await import('../config/environment');
      
      expect(securityConfig.rateLimitEnabled).toBe(true);
      expect(securityConfig.maxRequestsPerMinute).toBe(60);
    });
  });

  describe('Analytics Configuration', () => {
    it('should configure analytics settings correctly', async () => {
      const { analyticsConfig } = await import('../config/environment');
      
      expect(analyticsConfig.enabled).toBe(true);
      expect(analyticsConfig.privacyMode).toBe(true);
    });
  });

  describe('Debug Configuration', () => {
    it('should configure debug settings correctly', async () => {
      const { debugConfig } = await import('../config/environment');
      
      expect(debugConfig.debugMode).toBe(false);
      expect(debugConfig.logLevel).toBe('info');
      expect(debugConfig.enableDevtools).toBe(false);
    });
  });
});

describe('Edge Function Environment Manager', () => {
  // Mock Deno environment for Edge Function tests
  const mockDeno = {
    env: {
      get: vi.fn()
    }
  };

  beforeEach(() => {
    vi.stubGlobal('Deno', mockDeno);
    vi.clearAllMocks();
  });

  it('should get environment variable with validation', async () => {
    mockDeno.env.get.mockReturnValue('test-value');
    
    const { EnvironmentManager } = await import('../../supabase/functions/_shared/environment');
    const env = EnvironmentManager.getInstance();
    
    const value = env.get('TEST_VAR');
    expect(value).toBe('test-value');
    expect(mockDeno.env.get).toHaveBeenCalledWith('TEST_VAR');
  });

  it('should throw error for missing required variable', async () => {
    mockDeno.env.get.mockReturnValue(undefined);
    
    const { EnvironmentManager } = await import('../../supabase/functions/_shared/environment');
    const env = EnvironmentManager.getInstance();
    
    expect(() => {
      env.get('REQUIRED_VAR', true);
    }).toThrow('Required environment variable REQUIRED_VAR is not set');
  });

  it('should convert string to number', async () => {
    mockDeno.env.get.mockReturnValue('42');
    
    const { EnvironmentManager } = await import('../../supabase/functions/_shared/environment');
    const env = EnvironmentManager.getInstance();
    
    const value = env.getNumber('NUMBER_VAR');
    expect(value).toBe(42);
  });

  it('should convert string to boolean', async () => {
    mockDeno.env.get.mockReturnValue('true');
    
    const { EnvironmentManager } = await import('../../supabase/functions/_shared/environment');
    const env = EnvironmentManager.getInstance();
    
    const value = env.getBoolean('BOOLEAN_VAR');
    expect(value).toBe(true);
  });

  it('should validate multiple required variables', async () => {
    mockDeno.env.get.mockImplementation((key) => {
      if (key === 'VAR1') return 'value1';
      if (key === 'VAR2') return undefined;
      return undefined;
    });
    
    const { EnvironmentManager } = await import('../../supabase/functions/_shared/environment');
    const env = EnvironmentManager.getInstance();
    
    expect(() => {
      env.validateRequired(['VAR1', 'VAR2', 'VAR3']);
    }).toThrow('Missing required environment variables: VAR2, VAR3');
  });

  it('should cache environment variables', async () => {
    mockDeno.env.get.mockReturnValue('cached-value');
    
    const { EnvironmentManager } = await import('../../supabase/functions/_shared/environment');
    const env = EnvironmentManager.getInstance();
    
    // First call
    const value1 = env.get('CACHED_VAR');
    // Second call should use cache
    const value2 = env.get('CACHED_VAR');
    
    expect(value1).toBe('cached-value');
    expect(value2).toBe('cached-value');
    expect(mockDeno.env.get).toHaveBeenCalledTimes(1);
  });
});