/**
 * Performance Monitor Hook
 * Monitors and tracks application performance metrics
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte

  // Custom metrics
  renderTime: number;
  memoryUsage?: number;
  jsHeapSize?: number;
  domNodes?: number;
  
  // Network metrics
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;

  // Component-specific metrics
  componentMountTime?: number;
  componentUpdateTime?: number;
  apiResponseTime?: number;
}

export interface PerformanceAlert {
  type: 'warning' | 'error';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
}

/**
 * Hook for monitoring application performance
 */
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({ renderTime: 0 });
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const observerRef = useRef<PerformanceObserver | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Performance thresholds
  const thresholds = {
    lcp: 2500, // 2.5s
    fid: 100, // 100ms
    cls: 0.1, // 0.1
    fcp: 1800, // 1.8s
    ttfb: 800, // 800ms
    renderTime: 16, // 16ms (60fps)
    memoryUsage: 50 * 1024 * 1024, // 50MB
    apiResponseTime: 1000, // 1s
  };

  /**
   * Create performance alert
   */
  const createAlert = useCallback((
    type: 'warning' | 'error',
    metric: string,
    value: number,
    threshold: number
  ) => {
    const alert: PerformanceAlert = {
      type,
      metric,
      value,
      threshold,
      message: `${metric} (${value.toFixed(2)}) exceeded threshold (${threshold})`,
      timestamp: new Date(),
    };

    setAlerts(prev => [...prev.slice(-9), alert]); // Keep last 10 alerts
  }, []);

  /**
   * Check metric against threshold
   */
  const checkThreshold = useCallback((metric: string, value: number) => {
    const threshold = thresholds[metric as keyof typeof thresholds];
    if (threshold && value > threshold) {
      const type = value > threshold * 1.5 ? 'error' : 'warning';
      createAlert(type, metric, value, threshold);
    }
  }, [createAlert]);

  /**
   * Measure render time
   */
  const measureRenderTime = useCallback(() => {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      setMetrics(prev => ({ ...prev, renderTime }));
      checkThreshold('renderTime', renderTime);
    };
  }, [checkThreshold]);

  /**
   * Measure API response time
   */
  const measureApiCall = useCallback((url: string) => {
    const startTime = performance.now();
    
    return () => {
      const responseTime = performance.now() - startTime;
      setMetrics(prev => ({ ...prev, apiResponseTime: responseTime }));
      checkThreshold('apiResponseTime', responseTime);
      
      // Mark the API call in performance timeline
      performance.mark(`api-call-end-${url}`);
      performance.measure(`api-call-${url}`, `api-call-start-${url}`, `api-call-end-${url}`);
    };
  }, [checkThreshold]);

  /**
   * Start API call measurement
   */
  const startApiMeasurement = useCallback((url: string) => {
    performance.mark(`api-call-start-${url}`);
    return measureApiCall(url);
  }, [measureApiCall]);

  /**
   * Get memory usage information
   */
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        memoryUsage: memory.usedJSHeapSize,
        jsHeapSize: memory.totalJSHeapSize,
        heapLimit: memory.jsHeapSizeLimit,
      };
    }
    return {};
  }, []);

  /**
   * Get network information
   */
  const getNetworkInfo = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        connectionType: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      };
    }
    return {};
  }, []);

  /**
   * Get DOM metrics
   */
  const getDOMMetrics = useCallback(() => {
    return {
      domNodes: document.querySelectorAll('*').length,
    };
  }, []);

  /**
   * Update all metrics
   */
  const updateMetrics = useCallback(() => {
    const newMetrics: PerformanceMetrics = {
      ...metrics,
      ...getMemoryUsage(),
      ...getNetworkInfo(),
      ...getDOMMetrics(),
    };

    setMetrics(newMetrics);

    // Check thresholds
    Object.entries(newMetrics).forEach(([key, value]) => {
      if (typeof value === 'number') {
        checkThreshold(key, value);
      }
    });
  }, [metrics, getMemoryUsage, getNetworkInfo, getDOMMetrics, checkThreshold]);

  /**
   * Start performance monitoring
   */
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    startTimeRef.current = Date.now();

    // Set up Performance Observer for Web Vitals
    if ('PerformanceObserver' in window) {
      observerRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          const newMetrics: Partial<PerformanceMetrics> = {};

          switch (entry.entryType) {
            case 'largest-contentful-paint':
              newMetrics.lcp = entry.startTime;
              checkThreshold('lcp', entry.startTime);
              break;
            
            case 'first-input':
              newMetrics.fid = (entry as any).processingStart - entry.startTime;
              checkThreshold('fid', newMetrics.fid);
              break;
            
            case 'layout-shift':
              if (!(entry as any).hadRecentInput) {
                setMetrics(prev => {
                  const newCls = (prev.cls || 0) + (entry as any).value;
                  checkThreshold('cls', newCls);
                  return { ...prev, cls: newCls };
                });
              }
              break;
            
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                newMetrics.fcp = entry.startTime;
                checkThreshold('fcp', entry.startTime);
              }
              break;
            
            case 'navigation':
              const navEntry = entry as PerformanceNavigationTiming;
              newMetrics.ttfb = navEntry.responseStart - navEntry.requestStart;
              checkThreshold('ttfb', newMetrics.ttfb);
              break;
          }

          if (Object.keys(newMetrics).length > 0) {
            setMetrics(prev => ({ ...prev, ...newMetrics }));
          }
        });
      });

      // Observe different entry types
      try {
        observerRef.current.observe({ entryTypes: ['largest-contentful-paint'] });
        observerRef.current.observe({ entryTypes: ['first-input'] });
        observerRef.current.observe({ entryTypes: ['layout-shift'] });
        observerRef.current.observe({ entryTypes: ['paint'] });
        observerRef.current.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('Some performance entry types not supported:', error);
      }
    }

    // Update metrics periodically
    const interval = setInterval(updateMetrics, 5000); // Every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, [isMonitoring, updateMetrics, checkThreshold]);

  /**
   * Stop performance monitoring
   */
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  /**
   * Get performance report
   */
  const getPerformanceReport = useCallback(() => {
    const report = {
      metrics,
      alerts,
      monitoringDuration: Date.now() - startTimeRef.current,
      timestamp: new Date(),
    };

    return report;
  }, [metrics, alerts]);

  /**
   * Clear alerts
   */
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  /**
   * Mark custom performance event
   */
  const markEvent = useCallback((name: string, detail?: any) => {
    performance.mark(name);
    
    if (detail) {
      // Store custom event data
      console.log(`Performance Event: ${name}`, detail);
    }
  }, []);

  /**
   * Measure custom operation
   */
  const measureOperation = useCallback((name: string) => {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    
    performance.mark(startMark);
    
    return () => {
      performance.mark(endMark);
      performance.measure(name, startMark, endMark);
      
      const measure = performance.getEntriesByName(name, 'measure')[0];
      if (measure) {
        console.log(`Operation ${name} took ${measure.duration.toFixed(2)}ms`);
        return measure.duration;
      }
      return 0;
    };
  }, []);

  // Start monitoring on mount
  useEffect(() => {
    startMonitoring();
    return stopMonitoring;
  }, [startMonitoring, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    // State
    metrics,
    alerts,
    isMonitoring,

    // Methods
    measureRenderTime,
    startApiMeasurement,
    startMonitoring,
    stopMonitoring,
    getPerformanceReport,
    clearAlerts,
    markEvent,
    measureOperation,
    updateMetrics,

    // Utilities
    thresholds,
  };
}

/**
 * Hook for component-specific performance monitoring
 */
export function useComponentPerformance(componentName: string) {
  const mountTimeRef = useRef<number>(0);
  const updateCountRef = useRef<number>(0);
  const { measureRenderTime, markEvent, measureOperation } = usePerformanceMonitor();

  // Measure mount time
  useEffect(() => {
    mountTimeRef.current = performance.now();
    markEvent(`${componentName}-mount`);
    
    return () => {
      const mountDuration = performance.now() - mountTimeRef.current;
      markEvent(`${componentName}-unmount`, { mountDuration });
    };
  }, [componentName, markEvent]);

  // Measure update time
  useEffect(() => {
    if (updateCountRef.current > 0) {
      markEvent(`${componentName}-update`, { updateCount: updateCountRef.current });
    }
    updateCountRef.current++;
  });

  // Measure render time
  const measureRender = useCallback(() => {
    return measureRenderTime();
  }, [measureRenderTime]);

  // Measure specific operation
  const measureComponentOperation = useCallback((operationName: string) => {
    return measureOperation(`${componentName}-${operationName}`);
  }, [componentName, measureOperation]);

  return {
    measureRender,
    measureOperation: measureComponentOperation,
    updateCount: updateCountRef.current,
  };
}