/**
 * System Monitoring Hook
 * Provides real-time system health and performance monitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { monitoringService, SystemHealth, PerformanceMetrics } from '@/services/monitoringService';

interface MonitoringState {
  health: SystemHealth | null;
  metrics: PerformanceMetrics | null;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

interface MonitoringOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enablePerformanceTracking?: boolean;
}

export function useSystemMonitoring(options: MonitoringOptions = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enablePerformanceTracking = true
  } = options;

  const [state, setState] = useState<MonitoringState>({
    health: null,
    metrics: null,
    isLoading: true,
    error: null,
    lastUpdate: null
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const performanceStartRef = useRef<number>(Date.now());

  /**
   * Load system health and performance data
   */
  const loadMonitoringData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const [health, avgMetrics] = await Promise.all([
        monitoringService.getSystemHealth(),
        Promise.resolve(monitoringService.getAveragePerformanceMetrics())
      ]);

      setState({
        health,
        metrics: avgMetrics,
        isLoading: false,
        error: null,
        lastUpdate: new Date()
      });

    } catch (error) {
      console.error('Failed to load monitoring data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  /**
   * Record performance metrics for current operation
   */
  const recordPerformance = useCallback((metrics: Partial<PerformanceMetrics>) => {
    if (enablePerformanceTracking) {
      monitoringService.recordPerformanceMetrics(metrics);
    }
  }, [enablePerformanceTracking]);

  /**
   * Start performance timing
   */
  const startPerformanceTimer = useCallback(() => {
    performanceStartRef.current = Date.now();
    return performanceStartRef.current;
  }, []);

  /**
   * End performance timing and record metrics
   */
  const endPerformanceTimer = useCallback((type: keyof PerformanceMetrics) => {
    const endTime = Date.now();
    const duration = endTime - performanceStartRef.current;
    
    recordPerformance({
      [type]: duration
    });
    
    return duration;
  }, [recordPerformance]);

  /**
   * Check if system is healthy
   */
  const isSystemHealthy = useCallback(() => {
    return state.health?.overall === 'healthy';
  }, [state.health]);

  /**
   * Get unhealthy services
   */
  const getUnhealthyServices = useCallback(() => {
    if (!state.health) return [];
    return state.health.services.filter(service => 
      service.status === 'unhealthy' || service.status === 'degraded'
    );
  }, [state.health]);

  /**
   * Get performance score (0-100)
   */
  const getPerformanceScore = useCallback(() => {
    if (!state.metrics) return null;
    
    // Calculate score based on response times
    const pageLoadScore = Math.max(0, 100 - (state.metrics.pageLoadTime / 30)); // 30ms = 1 point
    const apiScore = Math.max(0, 100 - (state.metrics.apiResponseTime / 20)); // 20ms = 1 point
    const searchScore = Math.max(0, 100 - (state.metrics.searchResponseTime / 50)); // 50ms = 1 point
    
    return Math.round((pageLoadScore + apiScore + searchScore) / 3);
  }, [state.metrics]);

  /**
   * Force refresh monitoring data
   */
  const refresh = useCallback(() => {
    loadMonitoringData();
  }, [loadMonitoringData]);

  /**
   * Start monitoring
   */
  const startMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    loadMonitoringData();
    
    if (autoRefresh) {
      intervalRef.current = setInterval(loadMonitoringData, refreshInterval);
    }
  }, [loadMonitoringData, autoRefresh, refreshInterval]);

  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initialize monitoring on mount
  useEffect(() => {
    startMonitoring();
    
    return () => {
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring]);

  // Performance tracking for page loads
  useEffect(() => {
    if (enablePerformanceTracking) {
      const handleLoad = () => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        recordPerformance({ pageLoadTime: loadTime });
      };

      if (document.readyState === 'complete') {
        handleLoad();
      } else {
        window.addEventListener('load', handleLoad);
        return () => window.removeEventListener('load', handleLoad);
      }
    }
  }, [enablePerformanceTracking, recordPerformance]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network connection restored');
      loadMonitoringData();
    };

    const handleOffline = () => {
      console.warn('Network connection lost');
      setState(prev => ({
        ...prev,
        error: 'Network connection lost'
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadMonitoringData]);

  return {
    // State
    health: state.health,
    metrics: state.metrics,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdate: state.lastUpdate,
    
    // Computed values
    isHealthy: isSystemHealthy(),
    unhealthyServices: getUnhealthyServices(),
    performanceScore: getPerformanceScore(),
    
    // Actions
    refresh,
    startMonitoring,
    stopMonitoring,
    recordPerformance,
    startPerformanceTimer,
    endPerformanceTimer,
    
    // Utilities
    formatUptime: (uptime: number) => {
      const minutes = Math.floor(uptime / 1000 / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 0) return `${days}d ${hours % 24}h`;
      if (hours > 0) return `${hours}h ${minutes % 60}m`;
      return `${minutes}m`;
    },
    
    formatResponseTime: (time: number) => {
      return time < 1000 ? `${Math.round(time)}ms` : `${(time / 1000).toFixed(1)}s`;
    }
  };
}

export default useSystemMonitoring;