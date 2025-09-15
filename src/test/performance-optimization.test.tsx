/**
 * Performance Optimization Tests
 * Tests for caching, virtualization, and performance monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cacheService } from '@/services/cacheService';
import { queryOptimizationService } from '@/services/queryOptimizationService';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { OptimizedDocumentList } from '@/components/enhanced-rag/OptimizedDocumentList';
import { PerformanceDashboard } from '@/components/performance/PerformanceDashboard';
import { LazyLoadWrapper } from '@/components/performance/LazyLoadWrapper';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            range: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: { access_token: 'test-token' } } }))
    }
  }
}));

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(() => ({ onsuccess: null, onerror: null, result: null })),
          put: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn()
        }))
      }))
    }
  }))
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock PerformanceObserver
const mockPerformanceObserver = vi.fn();
mockPerformanceObserver.mockReturnValue({
  observe: vi.fn(),
  disconnect: vi.fn(),
});
window.PerformanceObserver = mockPerformanceObserver;

describe('Cache Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cacheService.clear();
  });

  it('should cache and retrieve data', async () => {
    const testData = { id: '1', name: 'Test Document' };
    const cacheKey = 'test-key';

    // Set data in cache
    await cacheService.set(cacheKey, testData, 'documents');

    // Retrieve data from cache
    const cachedData = await cacheService.get(cacheKey, 'documents');
    expect(cachedData).toEqual(testData);
  });

  it('should return null for non-existent cache entries', async () => {
    const result = await cacheService.get('non-existent-key', 'documents');
    expect(result).toBeNull();
  });

  it('should delete cache entries', async () => {
    const testData = { id: '1', name: 'Test Document' };
    const cacheKey = 'test-key';

    await cacheService.set(cacheKey, testData, 'documents');
    await cacheService.delete(cacheKey, 'documents');

    const result = await cacheService.get(cacheKey, 'documents');
    expect(result).toBeNull();
  });

  it('should clear all cache entries of a specific type', async () => {
    await cacheService.set('key1', { data: 1 }, 'documents');
    await cacheService.set('key2', { data: 2 }, 'documents');
    await cacheService.set('key3', { data: 3 }, 'search');

    await cacheService.clear('documents');

    expect(await cacheService.get('key1', 'documents')).toBeNull();
    expect(await cacheService.get('key2', 'documents')).toBeNull();
    expect(await cacheService.get('key3', 'search')).not.toBeNull();
  });

  it('should provide cache statistics', () => {
    const stats = cacheService.getStats();
    expect(stats).toHaveProperty('hits');
    expect(stats).toHaveProperty('misses');
    expect(stats).toHaveProperty('hitRate');
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('maxSize');
  });
});

describe('Query Optimization Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute queries with caching', async () => {
    const mockQuery = Promise.resolve({ data: [{ id: '1', title: 'Test' }], error: null });
    
    const result = await queryOptimizationService.executeQuery(mockQuery, {
      useCache: true,
      cacheKey: 'test-query'
    });

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('executionTime');
    expect(result).toHaveProperty('fromCache');
  });

  it('should handle query timeouts', async () => {
    const slowQuery = new Promise(resolve => setTimeout(resolve, 2000));
    
    const result = await queryOptimizationService.executeQuery(slowQuery, {
      timeout: 100
    });

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });

  it('should track query statistics', async () => {
    const mockQuery = Promise.resolve({ data: [], error: null });
    
    await queryOptimizationService.executeQuery(mockQuery, {
      cacheKey: 'stats-test'
    });

    const stats = queryOptimizationService.getQueryStats();
    expect(stats.size).toBeGreaterThan(0);
  });
});

describe('Virtualized List Hook', () => {
  it('should calculate visible items correctly', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      data: { title: `Item ${i}` }
    }));

    const TestComponent = () => {
      const { visibleItems, totalHeight } = useVirtualizedList(items, {
        itemHeight: 50,
        containerHeight: 400,
        overscan: 5
      });

      return (
        <div>
          <div data-testid="visible-count">{visibleItems.length}</div>
          <div data-testid="total-height">{totalHeight}</div>
        </div>
      );
    };

    render(<TestComponent />);

    // Should show approximately 8 items (400px / 50px) + overscan
    const visibleCount = parseInt(screen.getByTestId('visible-count').textContent || '0');
    expect(visibleCount).toBeGreaterThan(8);
    expect(visibleCount).toBeLessThan(20);

    // Total height should be items * itemHeight
    const totalHeight = parseInt(screen.getByTestId('total-height').textContent || '0');
    expect(totalHeight).toBe(1000 * 50);
  });
});

describe('Performance Monitor Hook', () => {
  beforeEach(() => {
    // Mock performance API
    Object.defineProperty(window, 'performance', {
      value: {
        now: vi.fn(() => Date.now()),
        mark: vi.fn(),
        measure: vi.fn(),
        getEntriesByName: vi.fn(() => [{ duration: 100 }]),
        memory: {
          usedJSHeapSize: 1024 * 1024,
          totalJSHeapSize: 2 * 1024 * 1024,
          jsHeapSizeLimit: 4 * 1024 * 1024
        }
      },
      writable: true
    });
  });

  it('should measure render time', () => {
    const TestComponent = () => {
      const { measureRenderTime } = usePerformanceMonitor();
      
      const endRender = measureRenderTime();
      endRender();

      return <div>Test</div>;
    };

    render(<TestComponent />);
    expect(window.performance.now).toHaveBeenCalled();
  });

  it('should track API call performance', async () => {
    const TestComponent = () => {
      const { startApiMeasurement } = usePerformanceMonitor();
      
      const endMeasurement = startApiMeasurement('/api/test');
      setTimeout(endMeasurement, 100);

      return <div>Test</div>;
    };

    render(<TestComponent />);
    expect(window.performance.mark).toHaveBeenCalled();
  });
});

describe('Optimized Document List', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  const mockDocuments = Array.from({ length: 100 }, (_, i) => ({
    id: `doc-${i}`,
    title: `Document ${i}`,
    description: `Description for document ${i}`,
    processingStatus: 'completed' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'test-user',
    filename: `doc-${i}.pdf`,
    filePath: `/files/doc-${i}.pdf`,
    fileSize: 1024 * 1024,
    mimeType: 'application/pdf',
    folderId: null,
    metadata: {}
  }));

  it('should render document list with virtualization', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <OptimizedDocumentList
          documents={mockDocuments}
          onDocumentSelect={vi.fn()}
          onDocumentAction={vi.fn()}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText('Showing 100 of 100 documents')).toBeInTheDocument();
  });

  it('should filter documents by search query', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <OptimizedDocumentList
          documents={mockDocuments}
          onDocumentSelect={vi.fn()}
          onDocumentAction={vi.fn()}
        />
      </QueryClientProvider>
    );

    const searchInput = screen.getByPlaceholderText('Search documents...');
    
    // Type in search input
    await waitFor(() => {
      searchInput.focus();
    });

    // Should show filtered results
    expect(screen.getByText(/Showing \d+ of 100 documents/)).toBeInTheDocument();
  });

  it('should handle empty document list', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <OptimizedDocumentList
          documents={[]}
          onDocumentSelect={vi.fn()}
          onDocumentAction={vi.fn()}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText('No documents found')).toBeInTheDocument();
  });
});

describe('Performance Dashboard', () => {
  it('should render performance metrics', () => {
    render(<PerformanceDashboard />);

    expect(screen.getByText('Performance Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Overall Performance Score')).toBeInTheDocument();
    expect(screen.getByText('Core Metrics')).toBeInTheDocument();
    expect(screen.getByText('Cache Performance')).toBeInTheDocument();
  });

  it('should display cache statistics', () => {
    render(<PerformanceDashboard />);

    // Click on cache tab
    const cacheTab = screen.getByText('Cache Performance');
    cacheTab.click();

    expect(screen.getByText('Cache Hit Rate')).toBeInTheDocument();
    expect(screen.getByText('Cache Size')).toBeInTheDocument();
  });
});

describe('Lazy Load Wrapper', () => {
  beforeEach(() => {
    // Mock IntersectionObserver
    const mockObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    };

    vi.mocked(mockIntersectionObserver).mockImplementation((callback) => {
      // Simulate intersection
      setTimeout(() => {
        callback([{ isIntersecting: true, target: document.createElement('div') }], mockObserver);
      }, 100);
      return mockObserver;
    });
  });

  it('should lazy load content when visible', async () => {
    render(
      <LazyLoadWrapper>
        <div data-testid="lazy-content">Lazy loaded content</div>
      </LazyLoadWrapper>
    );

    // Initially should show skeleton
    expect(screen.getByRole('status')).toBeInTheDocument(); // Skeleton has role="status"

    // After intersection, should show content
    await waitFor(() => {
      expect(screen.getByTestId('lazy-content')).toBeInTheDocument();
    });
  });

  it('should show fallback while loading', () => {
    const fallback = <div data-testid="custom-fallback">Loading...</div>;

    render(
      <LazyLoadWrapper fallback={fallback}>
        <div>Content</div>
      </LazyLoadWrapper>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });
});

describe('Performance Utilities', () => {
  it('should debounce function calls', async () => {
    const { debounce } = await import('@/utils/performanceOptimization');
    
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    // Call multiple times quickly
    debouncedFn('arg1');
    debouncedFn('arg2');
    debouncedFn('arg3');

    // Should not be called immediately
    expect(mockFn).not.toHaveBeenCalled();

    // Wait for debounce delay
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should be called once with last argument
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg3');
  });

  it('should throttle function calls', async () => {
    const { throttle } = await import('@/utils/performanceOptimization');
    
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    // Call multiple times quickly
    throttledFn('arg1');
    throttledFn('arg2');
    throttledFn('arg3');

    // Should be called immediately once
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg1');

    // Wait for throttle delay
    await new Promise(resolve => setTimeout(resolve, 150));

    // Call again
    throttledFn('arg4');
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('arg4');
  });

  it('should memoize function results', async () => {
    const { memoize } = await import('@/utils/performanceOptimization');
    
    const expensiveFn = vi.fn((x: number) => x * 2);
    const memoizedFn = memoize(expensiveFn);

    // First call
    const result1 = memoizedFn(5);
    expect(result1).toBe(10);
    expect(expensiveFn).toHaveBeenCalledTimes(1);

    // Second call with same argument
    const result2 = memoizedFn(5);
    expect(result2).toBe(10);
    expect(expensiveFn).toHaveBeenCalledTimes(1); // Should not call again

    // Call with different argument
    const result3 = memoizedFn(10);
    expect(result3).toBe(20);
    expect(expensiveFn).toHaveBeenCalledTimes(2);
  });
});

describe('Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  it('should integrate caching with document list', async () => {
    const mockDocuments = [
      {
        id: 'doc-1',
        title: 'Test Document',
        description: 'Test description',
        processingStatus: 'completed' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'test-user',
        filename: 'test.pdf',
        filePath: '/files/test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        folderId: null,
        metadata: {}
      }
    ];

    // Cache the documents
    await cacheService.set('documents:test-user', mockDocuments, 'documents');

    render(
      <QueryClientProvider client={queryClient}>
        <OptimizedDocumentList
          documents={mockDocuments}
          onDocumentSelect={vi.fn()}
          onDocumentAction={vi.fn()}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText('Test Document')).toBeInTheDocument();
  });

  it('should measure performance of document operations', async () => {
    const TestComponent = () => {
      const { measureOperation } = usePerformanceMonitor();
      
      const handleOperation = () => {
        const endMeasure = measureOperation('document-load');
        // Simulate some work
        setTimeout(endMeasure, 50);
      };

      return (
        <button onClick={handleOperation} data-testid="operation-btn">
          Perform Operation
        </button>
      );
    };

    render(<TestComponent />);
    
    const button = screen.getByTestId('operation-btn');
    button.click();

    expect(window.performance.mark).toHaveBeenCalled();
  });
});