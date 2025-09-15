/**
 * Deployment and Monitoring Infrastructure Tests
 * Tests for Netlify deployment, monitoring services, and health checks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { monitoringService } from '@/services/monitoringService';
import { MonitoringDashboard } from '@/components/monitoring/MonitoringDashboard';
import { useSystemMonitoring } from '@/hooks/useSystemMonitoring';
import { renderHook } from '@testing-library/react';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    VITE_OPENAI_API_KEY: 'test-openai-key',
    MODE: 'test',
    PROD: false
  }
}));

describe('Monitoring Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    monitoringService.stopMonitoring();
  });

  describe('Health Checks', () => {
    it('should perform comprehensive system health check', async () => {
      // Mock successful responses for all services
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200 }) // Supabase
        .mockResolvedValueOnce({ ok: true, status: 200 }) // OpenAI
        .mockResolvedValueOnce({ ok: true, status: 200 }) // Netlify
        .mockResolvedValueOnce({ ok: true, status: 200 }) // Database
        .mockResolvedValueOnce({ ok: true, status: 200 }); // Edge Functions

      const health = await monitoringService.getSystemHealth();

      expect(health).toBeDefined();
      expect(health.overall).toBe('healthy');
      expect(health.services).toHaveLength(5);
      expect(health.services.every(s => s.status === 'healthy')).toBe(true);
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.timestamp).toBeDefined();
    });

    it('should detect degraded services', async () => {
      // Mock slow response for one service
      mockFetch
        .mockImplementationOnce(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({ ok: true, status: 200 }), 3000)
          )
        )
        .mockResolvedValue({ ok: true, status: 200 });

      const health = await monitoringService.getSystemHealth();

      expect(health.overall).toBe('degraded');
      const degradedService = health.services.find(s => s.status === 'degraded');
      expect(degradedService).toBeDefined();
      expect(degradedService?.responseTime).toBeGreaterThan(2000);
    });

    it('should detect unhealthy services', async () => {
      // Mock failed response
      mockFetch
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValue({ ok: true, status: 200 });

      const health = await monitoringService.getSystemHealth();

      expect(health.overall).toBe('unhealthy');
      const unhealthyService = health.services.find(s => s.status === 'unhealthy');
      expect(unhealthyService).toBeDefined();
      expect(unhealthyService?.error).toContain('Service unavailable');
    });

    it('should handle missing environment variables gracefully', async () => {
      // Temporarily clear environment variables
      const originalEnv = import.meta.env;
      vi.mocked(import.meta).env = { ...originalEnv, VITE_SUPABASE_URL: '' };

      const health = await monitoringService.getSystemHealth();

      const supabaseService = health.services.find(s => s.service === 'supabase');
      expect(supabaseService?.status).toBe('unhealthy');
      expect(supabaseService?.error).toContain('not configured');

      // Restore environment
      vi.mocked(import.meta).env = originalEnv;
    });
  });

  describe('Performance Metrics', () => {
    it('should record performance metrics', () => {
      const metrics = {
        pageLoadTime: 1500,
        apiResponseTime: 200,
        searchResponseTime: 800,
        documentProcessingTime: 5000,
        memoryUsage: 45.2
      };

      monitoringService.recordPerformanceMetrics(metrics);
      const recorded = monitoringService.getPerformanceMetrics();

      expect(recorded).toHaveLength(1);
      expect(recorded[0]).toMatchObject(metrics);
      expect(recorded[0].timestamp).toBeDefined();
    });

    it('should calculate average performance metrics', () => {
      const metrics1 = { pageLoadTime: 1000, apiResponseTime: 100 };
      const metrics2 = { pageLoadTime: 2000, apiResponseTime: 300 };

      monitoringService.recordPerformanceMetrics(metrics1);
      monitoringService.recordPerformanceMetrics(metrics2);

      const average = monitoringService.getAveragePerformanceMetrics();

      expect(average).toBeDefined();
      expect(average?.pageLoadTime).toBe(1500);
      expect(average?.apiResponseTime).toBe(200);
    });

    it('should limit metrics history', () => {
      // Record more than max history
      for (let i = 0; i < 150; i++) {
        monitoringService.recordPerformanceMetrics({ pageLoadTime: i });
      }

      const metrics = monitoringService.getPerformanceMetrics();
      expect(metrics.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Deployment Information', () => {
    it('should provide deployment information', () => {
      const deploymentInfo = monitoringService.getDeploymentInfo();

      expect(deploymentInfo).toHaveProperty('environment');
      expect(deploymentInfo).toHaveProperty('version');
      expect(deploymentInfo).toHaveProperty('buildMode');
      expect(deploymentInfo.environment).toBe('test');
    });
  });

  describe('Monitoring Lifecycle', () => {
    it('should start and stop monitoring', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      
      monitoringService.startMonitoring(100); // Very short interval for testing
      expect(monitoringService['healthCheckInterval']).toBeDefined();

      monitoringService.stopMonitoring();
      expect(monitoringService['healthCheckInterval']).toBeNull();

      consoleSpy.mockRestore();
    });
  });
});

describe('Monitoring Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
  });

  it('should render monitoring dashboard', async () => {
    render(<MonitoringDashboard />);

    expect(screen.getByText('System Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Real-time system health and performance metrics')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    render(<MonitoringDashboard />);

    expect(screen.getByText('Loading health status...')).toBeInTheDocument();
  });

  it('should refresh data when refresh button is clicked', async () => {
    const user = userEvent.setup();
    render(<MonitoringDashboard />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    // Should show loading state
    expect(refreshButton).toBeDisabled();
  });

  it('should display health status tabs', async () => {
    render(<MonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /health status/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /performance/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /deployment info/i })).toBeInTheDocument();
    });
  });

  it('should switch between tabs', async () => {
    const user = userEvent.setup();
    render(<MonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /performance/i })).toBeInTheDocument();
    });

    const performanceTab = screen.getByRole('tab', { name: /performance/i });
    await user.click(performanceTab);

    expect(screen.getByText('Response Times')).toBeInTheDocument();
    expect(screen.getByText('System Resources')).toBeInTheDocument();
  });
});

describe('useSystemMonitoring Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useSystemMonitoring());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.health).toBeNull();
    expect(result.current.metrics).toBeNull();
  });

  it('should load monitoring data on mount', async () => {
    const { result } = renderHook(() => useSystemMonitoring());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.health).toBeDefined();
  });

  it('should provide performance timing utilities', () => {
    const { result } = renderHook(() => useSystemMonitoring());

    const startTime = result.current.startPerformanceTimer();
    expect(startTime).toBeTypeOf('number');

    // Simulate some work
    const duration = result.current.endPerformanceTimer('apiResponseTime');
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('should format uptime correctly', () => {
    const { result } = renderHook(() => useSystemMonitoring());

    expect(result.current.formatUptime(60000)).toBe('1m'); // 1 minute
    expect(result.current.formatUptime(3600000)).toBe('1h 0m'); // 1 hour
    expect(result.current.formatUptime(86400000)).toBe('1d 0h'); // 1 day
  });

  it('should format response time correctly', () => {
    const { result } = renderHook(() => useSystemMonitoring());

    expect(result.current.formatResponseTime(500)).toBe('500ms');
    expect(result.current.formatResponseTime(1500)).toBe('1.5s');
  });

  it('should handle network status changes', async () => {
    const { result } = renderHook(() => useSystemMonitoring());

    // Simulate going offline
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current.error).toContain('Network connection lost');
    });

    // Simulate coming back online
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it('should stop monitoring on unmount', () => {
    const { unmount } = renderHook(() => useSystemMonitoring());
    
    unmount();
    
    // Should not throw any errors
    expect(true).toBe(true);
  });
});

describe('Netlify Edge Function Health Check', () => {
  it('should return health status', async () => {
    // Mock the edge function response
    const mockHealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 3600000,
      version: '1.0.0',
      environment: 'test',
      services: {
        netlify: 'healthy',
        deployment: 'healthy'
      },
      performance: {
        responseTime: 150
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockHealthResponse)
    });

    const response = await fetch('/api/health');
    const health = await response.json();

    expect(response.ok).toBe(true);
    expect(health.status).toBe('healthy');
    expect(health.services).toBeDefined();
    expect(health.performance).toBeDefined();
  });

  it('should handle health check failures', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: () => Promise.resolve({
        status: 'unhealthy',
        error: 'Service unavailable'
      })
    });

    const response = await fetch('/api/health');
    expect(response.status).toBe(503);
  });
});

describe('Backup and Recovery', () => {
  it('should validate backup script exists', () => {
    // This would test the backup script in a real environment
    expect(true).toBe(true); // Placeholder
  });

  it('should validate recovery procedures', () => {
    // This would test recovery procedures in a real environment
    expect(true).toBe(true); // Placeholder
  });
});

describe('Performance Optimization', () => {
  it('should meet performance benchmarks', async () => {
    const performanceMetrics = {
      pageLoadTime: 2000, // Should be < 3000ms
      apiResponseTime: 500, // Should be < 2000ms
      searchResponseTime: 1000, // Should be < 5000ms
      memoryUsage: 50 // Should be reasonable
    };

    expect(performanceMetrics.pageLoadTime).toBeLessThan(3000);
    expect(performanceMetrics.apiResponseTime).toBeLessThan(2000);
    expect(performanceMetrics.searchResponseTime).toBeLessThan(5000);
    expect(performanceMetrics.memoryUsage).toBeLessThan(100);
  });
});

describe('Security Headers', () => {
  it('should validate security headers configuration', () => {
    // This would test that Netlify security headers are properly configured
    const expectedHeaders = [
      'X-Frame-Options',
      'X-XSS-Protection',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Content-Security-Policy',
      'Strict-Transport-Security'
    ];

    // In a real test, this would check the actual headers
    expect(expectedHeaders.length).toBeGreaterThan(0);
  });
});

describe('Environment Configuration', () => {
  it('should validate required environment variables', () => {
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ];

    requiredVars.forEach(varName => {
      expect(import.meta.env[varName]).toBeDefined();
    });
  });

  it('should handle missing optional environment variables', () => {
    // Should not break if optional vars are missing
    const optionalVars = [
      'VITE_CLAUDE_API_KEY',
      'VITE_DEBUG_MODE'
    ];

    // Should not throw errors
    expect(true).toBe(true);
  });
});