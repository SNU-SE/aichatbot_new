/**
 * Performance Optimization Utilities
 * Collection of utilities for optimizing application performance
 */

import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';

/**
 * Debounce function to limit function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Throttle function to limit function execution rate
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memoization utility for expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  }) as T;
}

/**
 * Hook for debounced values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttled callbacks
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttledCallback = useRef<T>();
  
  if (!throttledCallback.current) {
    throttledCallback.current = throttle(callback, delay);
  }
  
  return throttledCallback.current;
}

/**
 * Hook for memoized expensive computations
 */
export function useExpensiveComputation<T>(
  computeFn: () => T,
  deps: React.DependencyList
): T {
  return useMemo(computeFn, deps);
}

/**
 * Batch function calls to reduce re-renders
 */
export class BatchProcessor<T> {
  private batch: T[] = [];
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private processFn: (items: T[]) => void;
  private delay: number;

  constructor(processFn: (items: T[]) => void, delay: number = 100) {
    this.processFn = processFn;
    this.delay = delay;
  }

  add(item: T): void {
    this.batch.push(item);
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.delay);
  }

  flush(): void {
    if (this.batch.length > 0) {
      this.processFn([...this.batch]);
      this.batch = [];
    }
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

/**
 * Request Animation Frame scheduler for smooth animations
 */
export class RAFScheduler {
  private tasks: (() => void)[] = [];
  private isRunning = false;

  schedule(task: () => void): void {
    this.tasks.push(task);
    
    if (!this.isRunning) {
      this.run();
    }
  }

  private run(): void {
    this.isRunning = true;
    
    const processTasks = () => {
      const startTime = performance.now();
      
      // Process tasks for up to 5ms per frame
      while (this.tasks.length > 0 && performance.now() - startTime < 5) {
        const task = this.tasks.shift();
        if (task) task();
      }
      
      if (this.tasks.length > 0) {
        requestAnimationFrame(processTasks);
      } else {
        this.isRunning = false;
      }
    };
    
    requestAnimationFrame(processTasks);
  }
}

/**
 * Intersection Observer utility for lazy loading
 */
export class LazyLoader {
  private observer: IntersectionObserver;
  private callbacks = new Map<Element, () => void>();

  constructor(options: IntersectionObserverInit = {}) {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const callback = this.callbacks.get(entry.target);
          if (callback) {
            callback();
            this.unobserve(entry.target);
          }
        }
      });
    }, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options,
    });
  }

  observe(element: Element, callback: () => void): void {
    this.callbacks.set(element, callback);
    this.observer.observe(element);
  }

  unobserve(element: Element): void {
    this.callbacks.delete(element);
    this.observer.unobserve(element);
  }

  disconnect(): void {
    this.observer.disconnect();
    this.callbacks.clear();
  }
}

/**
 * Web Worker utility for offloading heavy computations
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: Array<{
    data: any;
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(workerScript: string, poolSize: number = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript);
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  async execute<T>(data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject };
      
      if (this.availableWorkers.length > 0) {
        this.runTask(task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  private runTask(task: { data: any; resolve: (value: any) => void; reject: (error: Error) => void }): void {
    const worker = this.availableWorkers.pop()!;
    
    const handleMessage = (event: MessageEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      
      this.availableWorkers.push(worker);
      task.resolve(event.data);
      
      // Process next task in queue
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift()!;
        this.runTask(nextTask);
      }
    };
    
    const handleError = (error: ErrorEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      
      this.availableWorkers.push(worker);
      task.reject(new Error(error.message));
      
      // Process next task in queue
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift()!;
        this.runTask(nextTask);
      }
    };
    
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage(task.data);
  }

  terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
  }
}

/**
 * Image optimization utilities
 */
export const ImageOptimizer = {
  /**
   * Compress image to specified quality
   */
  compressImage(file: File, quality: number = 0.8, maxWidth: number = 1920): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  },

  /**
   * Generate responsive image sizes
   */
  generateResponsiveSizes(file: File, sizes: number[]): Promise<Blob[]> {
    return Promise.all(
      sizes.map(size => this.compressImage(file, 0.8, size))
    );
  },
};

/**
 * Bundle size optimization utilities
 */
export const BundleOptimizer = {
  /**
   * Lazy load module
   */
  async loadModule<T>(importFn: () => Promise<T>): Promise<T> {
    try {
      return await importFn();
    } catch (error) {
      console.error('Failed to load module:', error);
      throw error;
    }
  },

  /**
   * Preload critical resources
   */
  preloadResource(href: string, as: string): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  },

  /**
   * Prefetch non-critical resources
   */
  prefetchResource(href: string): void {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  },
};

// Export singleton instances
export const rafScheduler = new RAFScheduler();
export const lazyLoader = new LazyLoader();
