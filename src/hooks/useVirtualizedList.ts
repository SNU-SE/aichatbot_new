/**
 * Virtualized List Hook
 * Provides virtual scrolling for large document collections
 */

import { useState, useEffect, useMemo, useCallback } from 'react';

export interface VirtualizedItem {
  id: string;
  height?: number;
  data: any;
}

export interface VirtualizedListOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  estimatedItemHeight?: number;
  getItemHeight?: (index: number, item: VirtualizedItem) => number;
}

export interface VirtualizedListState {
  visibleItems: VirtualizedItem[];
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  scrollTop: number;
  isScrolling: boolean;
}

/**
 * Hook for virtual scrolling large lists
 */
export function useVirtualizedList(
  items: VirtualizedItem[],
  options: VirtualizedListOptions
) {
  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    estimatedItemHeight,
    getItemHeight,
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);

  // Calculate item heights
  const itemHeights = useMemo(() => {
    if (getItemHeight) {
      return items.map((item, index) => getItemHeight(index, item));
    }
    return items.map(() => estimatedItemHeight || itemHeight);
  }, [items, getItemHeight, estimatedItemHeight, itemHeight]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    return itemHeights.reduce((sum, height) => sum + height, 0);
  }, [itemHeights]);

  // Calculate visible range
  const { startIndex, endIndex } = useMemo(() => {
    let accumulatedHeight = 0;
    let start = 0;
    let end = items.length - 1;

    // Find start index
    for (let i = 0; i < items.length; i++) {
      if (accumulatedHeight + itemHeights[i] > scrollTop) {
        start = Math.max(0, i - overscan);
        break;
      }
      accumulatedHeight += itemHeights[i];
    }

    // Find end index
    accumulatedHeight = 0;
    for (let i = 0; i < items.length; i++) {
      accumulatedHeight += itemHeights[i];
      if (accumulatedHeight > scrollTop + containerHeight) {
        end = Math.min(items.length - 1, i + overscan);
        break;
      }
    }

    return { startIndex: start, endIndex: end };
  }, [scrollTop, containerHeight, itemHeights, items.length, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1);
  }, [items, startIndex, endIndex]);

  // Calculate offset for visible items
  const offsetY = useMemo(() => {
    return itemHeights.slice(0, startIndex).reduce((sum, height) => sum + height, 0);
  }, [itemHeights, startIndex]);

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    // Set new timeout to detect scroll end
    const timeout = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
    setScrollTimeout(timeout);
  }, [scrollTimeout]);

  // Scroll to specific item
  const scrollToItem = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (index < 0 || index >= items.length) return;

    const itemOffset = itemHeights.slice(0, index).reduce((sum, height) => sum + height, 0);
    let targetScrollTop = itemOffset;

    if (align === 'center') {
      targetScrollTop = itemOffset - containerHeight / 2 + itemHeights[index] / 2;
    } else if (align === 'end') {
      targetScrollTop = itemOffset - containerHeight + itemHeights[index];
    }

    targetScrollTop = Math.max(0, Math.min(targetScrollTop, totalHeight - containerHeight));
    setScrollTop(targetScrollTop);
  }, [items.length, itemHeights, containerHeight, totalHeight]);

  // Get item style for positioning
  const getItemStyle = useCallback((index: number) => {
    const actualIndex = startIndex + index;
    const top = itemHeights.slice(0, actualIndex).reduce((sum, height) => sum + height, 0) - scrollTop;
    
    return {
      position: 'absolute' as const,
      top,
      left: 0,
      right: 0,
      height: itemHeights[actualIndex],
    };
  }, [startIndex, itemHeights, scrollTop]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [scrollTimeout]);

  return {
    // State
    visibleItems,
    startIndex,
    endIndex,
    totalHeight,
    scrollTop,
    isScrolling,
    offsetY,

    // Methods
    handleScroll,
    scrollToItem,
    getItemStyle,

    // Container props
    containerProps: {
      style: {
        height: containerHeight,
        overflow: 'auto',
      },
      onScroll: handleScroll,
    },

    // Inner container props (for absolute positioning)
    innerProps: {
      style: {
        height: totalHeight,
        position: 'relative' as const,
      },
    },
  };
}

/**
 * Hook for virtualized grid layout
 */
export function useVirtualizedGrid(
  items: VirtualizedItem[],
  options: {
    itemWidth: number;
    itemHeight: number;
    containerWidth: number;
    containerHeight: number;
    gap?: number;
    overscan?: number;
  }
) {
  const {
    itemWidth,
    itemHeight,
    containerWidth,
    containerHeight,
    gap = 0,
    overscan = 5,
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Calculate columns per row
  const columnsPerRow = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const totalRows = Math.ceil(items.length / columnsPerRow);
  const rowHeight = itemHeight + gap;

  // Calculate visible range
  const { startRow, endRow } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const end = Math.min(
      totalRows - 1,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
    );
    return { startRow: start, endRow: end };
  }, [scrollTop, containerHeight, rowHeight, totalRows, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    const startIndex = startRow * columnsPerRow;
    const endIndex = Math.min(items.length - 1, (endRow + 1) * columnsPerRow - 1);
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      ...item,
      gridIndex: startIndex + index,
    }));
  }, [items, startRow, endRow, columnsPerRow]);

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
    setIsScrolling(true);

    // Debounce scroll end detection
    setTimeout(() => setIsScrolling(false), 150);
  }, []);

  // Get item position
  const getItemPosition = useCallback((gridIndex: number) => {
    const row = Math.floor(gridIndex / columnsPerRow);
    const col = gridIndex % columnsPerRow;
    
    return {
      x: col * (itemWidth + gap),
      y: row * rowHeight,
    };
  }, [columnsPerRow, itemWidth, itemHeight, gap, rowHeight]);

  // Get item style
  const getItemStyle = useCallback((gridIndex: number) => {
    const { x, y } = getItemPosition(gridIndex);
    
    return {
      position: 'absolute' as const,
      left: x,
      top: y,
      width: itemWidth,
      height: itemHeight,
    };
  }, [getItemPosition, itemWidth, itemHeight]);

  return {
    visibleItems,
    totalHeight: totalRows * rowHeight,
    isScrolling,
    columnsPerRow,
    handleScroll,
    getItemStyle,
    getItemPosition,

    containerProps: {
      style: {
        height: containerHeight,
        overflow: 'auto',
      },
      onScroll: handleScroll,
    },

    innerProps: {
      style: {
        height: totalRows * rowHeight,
        position: 'relative' as const,
      },
    },
  };
}

/**
 * Hook for infinite scrolling with virtualization
 */
export function useInfiniteVirtualizedList(
  items: VirtualizedItem[],
  options: VirtualizedListOptions & {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
    threshold?: number;
  }
) {
  const { hasNextPage, isFetchingNextPage, fetchNextPage, threshold = 5 } = options;
  
  const virtualizedList = useVirtualizedList(items, options);

  // Check if we need to load more items
  useEffect(() => {
    const { endIndex } = virtualizedList;
    const shouldFetchMore = 
      hasNextPage && 
      !isFetchingNextPage && 
      endIndex >= items.length - threshold;

    if (shouldFetchMore) {
      fetchNextPage();
    }
  }, [virtualizedList.endIndex, hasNextPage, isFetchingNextPage, fetchNextPage, items.length, threshold]);

  return {
    ...virtualizedList,
    hasNextPage,
    isFetchingNextPage,
  };
}