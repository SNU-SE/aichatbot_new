/**
 * Lazy Load Wrapper Component
 * Provides lazy loading functionality for components and images
 */

import React, { 
  useState, 
  useEffect, 
  useRef, 
  useCallback, 
  Suspense,
  ComponentType,
  ReactNode 
} from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyLoadWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  once?: boolean;
  className?: string;
  minHeight?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Lazy load wrapper using Intersection Observer
 */
export function LazyLoadWrapper({
  children,
  fallback,
  rootMargin = '50px',
  threshold = 0.1,
  once = true,
  className,
  minHeight = 100,
  onLoad,
  onError,
}: LazyLoadWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Handle intersection
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    
    if (entry.isIntersecting) {
      setIsVisible(true);
      
      if (once && observerRef.current) {
        observerRef.current.disconnect();
      }
    } else if (!once) {
      setIsVisible(false);
    }
  }, [once]);

  // Set up intersection observer
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, rootMargin, threshold]);

  // Handle load success
  const handleLoad = useCallback(() => {
    setHasLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Handle load error
  const handleError = useCallback((err: Error) => {
    setError(err);
    onError?.(err);
  }, [onError]);

  // Render fallback while not visible
  if (!isVisible) {
    return (
      <div 
        ref={elementRef} 
        className={className}
        style={{ minHeight }}
      >
        {fallback || <Skeleton className="w-full h-full" />}
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div 
        ref={elementRef} 
        className={`${className} flex items-center justify-center text-red-500`}
        style={{ minHeight }}
      >
        <p>Failed to load content</p>
      </div>
    );
  }

  // Render content with error boundary
  return (
    <div ref={elementRef} className={className}>
      <ErrorBoundary onError={handleError}>
        <Suspense fallback={fallback || <Skeleton className="w-full h-full" />}>
          <LoadTracker onLoad={handleLoad}>
            {children}
          </LoadTracker>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

/**
 * Error boundary for lazy loaded content
 */
class ErrorBoundary extends React.Component<
  { children: ReactNode; onError?: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-4 text-red-500">
          <p>Something went wrong loading this content.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Component to track when content has loaded
 */
function LoadTracker({ children, onLoad }: { children: ReactNode; onLoad: () => void }) {
  useEffect(() => {
    // Simulate load completion
    const timer = setTimeout(onLoad, 0);
    return () => clearTimeout(timer);
  }, [onLoad]);

  return <>{children}</>;
}

/**
 * Lazy image component with progressive loading
 */
interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  width?: number;
  height?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export function LazyImage({
  src,
  alt,
  placeholder,
  className,
  width,
  height,
  onLoad,
  onError,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleImageError = useCallback(() => {
    setHasError(true);
    onError?.(new Error(`Failed to load image: ${src}`));
  }, [src, onError]);

  // Intersection observer for lazy loading
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    observer.observe(img);

    return () => observer.disconnect();
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ width, height }}
        >
          {placeholder && (
            <img
              src={placeholder}
              alt=""
              className="w-full h-full object-cover opacity-50"
            />
          )}
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div 
          className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-500"
          style={{ width, height }}
        >
          <span>Failed to load image</span>
        </div>
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={isVisible ? src : undefined}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        width={width}
        height={height}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
      />
    </div>
  );
}

/**
 * HOC for lazy loading components
 */
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  options: {
    fallback?: ReactNode;
    rootMargin?: string;
    threshold?: number;
  } = {}
) {
  const LazyComponent = React.forwardRef<any, P>((props, ref) => {
    return (
      <LazyLoadWrapper {...options}>
        <Component {...props} ref={ref} />
      </LazyLoadWrapper>
    );
  });

  LazyComponent.displayName = `LazyLoaded(${Component.displayName || Component.name})`;

  return LazyComponent;
}

/**
 * Hook for lazy loading data
 */
export function useLazyLoad<T>(
  loadFn: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  // Load data when visible
  useEffect(() => {
    if (!isVisible || isLoading || data) return;

    setIsLoading(true);
    setError(null);

    loadFn()
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [isVisible, isLoading, data, loadFn, ...deps]);

  // Set up intersection observer
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return {
    data,
    isLoading,
    error,
    isVisible,
    elementRef,
  };
}

/**
 * Lazy loading container for lists
 */
interface LazyListProps {
  items: any[];
  renderItem: (item: any, index: number) => ReactNode;
  itemHeight?: number;
  batchSize?: number;
  className?: string;
}

export function LazyList({
  items,
  renderItem,
  itemHeight = 100,
  batchSize = 10,
  className,
}: LazyListProps) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load more items when scrolling near bottom
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage > 0.8 && visibleCount < items.length) {
      setIsLoading(true);
      
      // Simulate loading delay
      setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + batchSize, items.length));
        setIsLoading(false);
      }, 100);
    }
  }, [isLoading, visibleCount, items.length, batchSize]);

  // Throttled scroll handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', throttledScroll);
    return () => container.removeEventListener('scroll', throttledScroll);
  }, [handleScroll]);

  const visibleItems = items.slice(0, visibleCount);

  return (
    <div 
      ref={containerRef}
      className={`overflow-auto ${className}`}
    >
      {visibleItems.map((item, index) => (
        <div key={index} style={{ minHeight: itemHeight }}>
          {renderItem(item, index)}
        </div>
      ))}
      
      {isLoading && (
        <div className="flex justify-center p-4">
          <Skeleton className="w-full h-20" />
        </div>
      )}
      
      {visibleCount >= items.length && items.length > 0 && (
        <div className="text-center p-4 text-gray-500">
          All items loaded
        </div>
      )}
    </div>
  );
}