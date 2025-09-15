/**
 * Monitoring Service for Enhanced RAG System
 * Provides health checks, performance monitoring, and error tracking
 */

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  timestamp: string;
  details?: Record<string, any>;
  error?: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResult[];
  timestamp: string;
  uptime: number;
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  searchResponseTime: number;
  documentProcessingTime: number;
  memoryUsage: number;
  timestamp: string;
}

class MonitoringService {
  private startTime = Date.now();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private performanceMetrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 100;

  /**
   * Start continuous health monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        this.logHealthStatus(health);
        
        // Send alerts if system is unhealthy
        if (health.overall === 'unhealthy') {
          this.sendAlert('System Health Alert', `System is unhealthy: ${JSON.stringify(health)}`);
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Get comprehensive system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const services = await Promise.all([
      this.checkSupabaseHealth(),
      this.checkOpenAIHealth(),
      this.checkNetlifyHealth(),
      this.checkDatabaseHealth(),
      this.checkEdgeFunctionsHealth()
    ]);

    const unhealthyServices = services.filter(s => s.status === 'unhealthy');
    const degradedServices = services.filter(s => s.status === 'degraded');

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyServices.length > 0) {
      overall = 'unhealthy';
    } else if (degradedServices.length > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      services,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Check Supabase connectivity and response time
   */
  private async checkSupabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
        }
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          service: 'supabase',
          status: responseTime > 2000 ? 'degraded' : 'healthy',
          responseTime,
          timestamp: new Date().toISOString(),
          details: { statusCode: response.status }
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      return {
        service: 'supabase',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check OpenAI API health
   */
  private async checkOpenAIHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        return {
          service: 'openai',
          status: 'degraded',
          responseTime: 0,
          timestamp: new Date().toISOString(),
          details: { message: 'API key not configured' }
        };
      }

      // Simple models list request to check API health
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          service: 'openai',
          status: responseTime > 3000 ? 'degraded' : 'healthy',
          responseTime,
          timestamp: new Date().toISOString(),
          details: { statusCode: response.status }
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      return {
        service: 'openai',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check Netlify deployment health
   */
  private async checkNetlifyHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Check if we can reach our own deployment
      const response = await fetch(window.location.origin + '/manifest.json');
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          service: 'netlify',
          status: responseTime > 1000 ? 'degraded' : 'healthy',
          responseTime,
          timestamp: new Date().toISOString(),
          details: { statusCode: response.status }
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      return {
        service: 'netlify',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check database connectivity
   */
  private async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Database configuration missing');
      }

      // Simple query to check database connectivity
      const response = await fetch(`${supabaseUrl}/rest/v1/documents?select=count`, {
        method: 'HEAD',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'count=exact'
        }
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          service: 'database',
          status: responseTime > 2000 ? 'degraded' : 'healthy',
          responseTime,
          timestamp: new Date().toISOString(),
          details: { statusCode: response.status }
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check Edge Functions health
   */
  private async checkEdgeFunctionsHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Edge Functions configuration missing');
      }

      // Health check for document processor function
      const response = await fetch(`${supabaseUrl}/functions/v1/enhanced-document-processor`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'health-check' })
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok || response.status === 400) { // 400 is expected for health check
        return {
          service: 'edge-functions',
          status: responseTime > 5000 ? 'degraded' : 'healthy',
          responseTime,
          timestamp: new Date().toISOString(),
          details: { statusCode: response.status }
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      return {
        service: 'edge-functions',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Record performance metrics
   */
  recordPerformanceMetrics(metrics: Partial<PerformanceMetrics>): void {
    const fullMetrics: PerformanceMetrics = {
      pageLoadTime: metrics.pageLoadTime || 0,
      apiResponseTime: metrics.apiResponseTime || 0,
      searchResponseTime: metrics.searchResponseTime || 0,
      documentProcessingTime: metrics.documentProcessingTime || 0,
      memoryUsage: this.getMemoryUsage(),
      timestamp: new Date().toISOString()
    };

    this.performanceMetrics.push(fullMetrics);
    
    // Keep only recent metrics
    if (this.performanceMetrics.length > this.maxMetricsHistory) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Get performance metrics history
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  /**
   * Get average performance metrics
   */
  getAveragePerformanceMetrics(): PerformanceMetrics | null {
    if (this.performanceMetrics.length === 0) return null;

    const totals = this.performanceMetrics.reduce((acc, metrics) => ({
      pageLoadTime: acc.pageLoadTime + metrics.pageLoadTime,
      apiResponseTime: acc.apiResponseTime + metrics.apiResponseTime,
      searchResponseTime: acc.searchResponseTime + metrics.searchResponseTime,
      documentProcessingTime: acc.documentProcessingTime + metrics.documentProcessingTime,
      memoryUsage: acc.memoryUsage + metrics.memoryUsage
    }), {
      pageLoadTime: 0,
      apiResponseTime: 0,
      searchResponseTime: 0,
      documentProcessingTime: 0,
      memoryUsage: 0
    });

    const count = this.performanceMetrics.length;
    
    return {
      pageLoadTime: totals.pageLoadTime / count,
      apiResponseTime: totals.apiResponseTime / count,
      searchResponseTime: totals.searchResponseTime / count,
      documentProcessingTime: totals.documentProcessingTime / count,
      memoryUsage: totals.memoryUsage / count,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get memory usage information
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * Log health status
   */
  private logHealthStatus(health: SystemHealth): void {
    const logLevel = health.overall === 'healthy' ? 'info' : 
                    health.overall === 'degraded' ? 'warn' : 'error';
    
    console[logLevel]('System Health Check:', {
      overall: health.overall,
      uptime: Math.round(health.uptime / 1000 / 60), // minutes
      services: health.services.map(s => ({
        service: s.service,
        status: s.status,
        responseTime: s.responseTime
      }))
    });
  }

  /**
   * Send alert (placeholder for integration with alerting service)
   */
  private sendAlert(title: string, message: string): void {
    console.error(`ALERT: ${title}`, message);
    
    // In production, integrate with:
    // - Slack webhooks
    // - Email notifications
    // - PagerDuty
    // - Discord webhooks
    // - etc.
  }

  /**
   * Get deployment information
   */
  getDeploymentInfo(): Record<string, any> {
    return {
      environment: import.meta.env.MODE,
      buildMode: import.meta.env.VITE_BUILD_MODE || 'unknown',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      buildTime: import.meta.env.VITE_BUILD_TIME || 'unknown',
      commitHash: import.meta.env.VITE_COMMIT_HASH || 'unknown',
      netlifyContext: import.meta.env.CONTEXT || 'unknown'
    };
  }
}

export const monitoringService = new MonitoringService();

// Auto-start monitoring in production
if (import.meta.env.PROD) {
  monitoringService.startMonitoring(60000); // Check every minute
}

export default monitoringService;