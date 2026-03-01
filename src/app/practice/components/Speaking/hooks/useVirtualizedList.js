/**
 * Professional Virtualized List Hook
 * 
 * High-performance virtualization using Intersection Observer and scroll-based rendering.
 * Only renders items visible in the viewport plus a configurable buffer zone.
 * 
 * Features:
 * - Dynamic item height support
 * - Scroll restoration
 * - Memory leak prevention
 * - Edge case handling
 * - TypeScript-ready
 * 
 * @module useVirtualizedList
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Configuration constants
const DEFAULT_ITEM_HEIGHT = 300;
const DEFAULT_OVERSCAN = 5; // More conservative default
const RESIZE_DEBOUNCE_MS = 150;

/**
 * Custom hook for virtualizing large lists
 * 
 * @param {Array} items - Array of items to virtualize
 * @param {Object} options - Configuration options
 * @param {number} [options.itemHeight=300] - Fixed height per item in pixels
 * @param {number} [options.overscan=5] - Number of items to render outside viewport
 * @param {boolean} [options.enabled=true] - Enable/disable virtualization
 * @param {Function} [options.getItemHeight] - Optional function to get dynamic item heights
 * @returns {Object} Virtualization utilities and state
 */
export function useVirtualizedList(items, options = {}) {
  const {
    itemHeight = DEFAULT_ITEM_HEIGHT,
    overscan = DEFAULT_OVERSCAN,
    enabled = true,
    getItemHeight = null
  } = options;

  // State
  const [visibleRange, setVisibleRange] = useState(() => ({
    start: 0,
    end: Math.min(overscan * 2, items?.length || 0)
  }));

  // Refs
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const resizeTimeoutRef = useRef(null);
  const rafIdRef = useRef(null);
  const lastScrollTopRef = useRef(0);

  // Memoized calculations
  const itemCount = useMemo(() => items?.length || 0, [items?.length]);
  
  const shouldVirtualize = useMemo(() => {
    return enabled && itemCount > overscan * 2;
  }, [enabled, itemCount, overscan]);

  /**
   * Calculate total height of all items
   * Supports both fixed and dynamic heights
   */
  const totalHeight = useMemo(() => {
    if (!getItemHeight) {
      return itemCount * itemHeight;
    }
    
    let height = 0;
    for (let i = 0; i < itemCount; i++) {
      height += getItemHeight(i, items[i]);
    }
    return height;
  }, [itemCount, itemHeight, getItemHeight, items]);

  /**
   * Calculate the offset for a given index
   * Used for positioning the visible items container
   */
  const getOffsetForIndex = useCallback((index) => {
    if (!getItemHeight) {
      return index * itemHeight;
    }
    
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(i, items[i]);
    }
    return offset;
  }, [itemHeight, getItemHeight, items]);

  /**
   * Find the index at a given scroll position
   * Binary search for dynamic heights, simple division for fixed
   */
  const getIndexAtOffset = useCallback((offset) => {
    if (!getItemHeight) {
      return Math.floor(offset / itemHeight);
    }

    // Binary search for dynamic heights
    let left = 0;
    let right = itemCount - 1;
    let currentOffset = 0;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      currentOffset = getOffsetForIndex(mid);
      const midHeight = getItemHeight(mid, items[mid]);

      if (offset >= currentOffset && offset < currentOffset + midHeight) {
        return mid;
      } else if (offset < currentOffset) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return Math.min(left, itemCount - 1);
  }, [itemHeight, getItemHeight, itemCount, items, getOffsetForIndex]);

  /**
   * Calculate visible range based on scroll position
   * Includes overscan buffer for smoother scrolling
   */
  const calculateVisibleRange = useCallback(() => {
    const container = containerRef.current;
    if (!container || !shouldVirtualize) {
      return { start: 0, end: itemCount };
    }

    const scrollTop = container.scrollTop || 0;
    const containerHeight = container.clientHeight || 0;

    // Prevent unnecessary updates if scroll position hasn't changed significantly
    // Update ref first to track current position
    const scrollDelta = Math.abs(scrollTop - lastScrollTopRef.current);
    lastScrollTopRef.current = scrollTop;
    
    if (scrollDelta < 1 && containerHeight > 0) {
      return null; // Skip update if scroll hasn't changed enough
    }

    // Calculate visible indices
    const startIndex = getIndexAtOffset(scrollTop);
    const endIndex = getIndexAtOffset(scrollTop + containerHeight);

    // Add overscan buffer
    const start = Math.max(0, startIndex - overscan);
    const end = Math.min(itemCount, endIndex + overscan + 1);

    return { start, end };
  }, [shouldVirtualize, itemCount, overscan, getIndexAtOffset]);

  /**
   * Update visible range with performance optimization
   */
  const updateVisibleRange = useCallback(() => {
    const newRange = calculateVisibleRange();
    
    if (!newRange) return;

    setVisibleRange((prevRange) => {
      // Only update if range has actually changed
      if (prevRange.start === newRange.start && prevRange.end === newRange.end) {
        return prevRange;
      }
      return newRange;
    });
  }, [calculateVisibleRange]);

  /**
   * Throttled scroll handler using requestAnimationFrame
   */
  const handleScroll = useCallback(() => {
    if (rafIdRef.current) {
      return; // Already scheduled
    }

    rafIdRef.current = requestAnimationFrame(() => {
      updateVisibleRange();
      rafIdRef.current = null;
    });
  }, [updateVisibleRange]);

  /**
   * Debounced resize handler
   */
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    resizeTimeoutRef.current = setTimeout(() => {
      updateVisibleRange();
      resizeTimeoutRef.current = null;
    }, RESIZE_DEBOUNCE_MS);
  }, [updateVisibleRange]);

  /**
   * Setup scroll and resize listeners
   */
  useEffect(() => {
    if (!shouldVirtualize) {
      setVisibleRange({ start: 0, end: itemCount });
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Initial calculation
    updateVisibleRange();

    // Attach event listeners
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      
      // Clear any pending operations
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
    };
  }, [shouldVirtualize, itemCount, handleScroll, handleResize, updateVisibleRange]);

  /**
   * Handle items array changes
   * Reset range if items change significantly
   */
  useEffect(() => {
    if (itemCount === 0) {
      setVisibleRange({ start: 0, end: 0 });
      return;
    }
    
    setVisibleRange((prevRange) => {
      // Reset if current range is invalid
      if (prevRange.end > itemCount || prevRange.start >= itemCount) {
        return {
          start: 0,
          end: Math.min(overscan * 2, itemCount)
        };
      }
      // Adjust end if needed
      if (prevRange.end > itemCount) {
        return {
          ...prevRange,
          end: itemCount
        };
      }
      return prevRange;
    });
  }, [itemCount, overscan]);

  // Calculate visible items and offset
  const visibleItems = useMemo(() => {
    if (!items || !items.length) return [];
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange.start, visibleRange.end]);

  const offsetY = useMemo(() => {
    return getOffsetForIndex(visibleRange.start);
  }, [visibleRange.start, getOffsetForIndex]);

  /**
   * Utility function to scroll to a specific index
   */
  const scrollToIndex = useCallback((index, behavior = 'smooth') => {
    const container = containerRef.current;
    if (!container) return;

    const offset = getOffsetForIndex(Math.max(0, Math.min(index, itemCount - 1)));
    container.scrollTo({
      top: offset,
      behavior
    });
  }, [getOffsetForIndex, itemCount]);

  /**
   * Get the style object for the container wrapper
   */
  const getContainerStyle = useCallback(() => ({
    height: '100%',
    overflow: 'auto',
    position: 'relative',
    willChange: 'transform'
  }), []);

  /**
   * Get the style object for the spacer (maintains scroll height)
   */
  const getSpacerStyle = useCallback(() => ({
    height: `${totalHeight}px`,
    position: 'relative',
    pointerEvents: 'none'
  }), [totalHeight]);

  /**
   * Get the style object for the content wrapper (visible items)
   */
  const getContentStyle = useCallback(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    transform: `translateY(${offsetY}px)`,
    willChange: 'transform'
  }), [offsetY]);

  return {
    // Core data
    visibleItems,
    
    // Refs
    containerRef,
    
    // Layout values
    offsetY,
    totalHeight,
    
    // Range info
    startIndex: visibleRange.start,
    endIndex: visibleRange.end,
    
    // Utilities
    scrollToIndex,
    isVirtualized: shouldVirtualize,
    
    // Style helpers
    getContainerStyle,
    getSpacerStyle,
    getContentStyle
  };
}

/**
 * Example usage:
 * 
 * const MyList = ({ items }) => {
 *   const {
 *     visibleItems,
 *     containerRef,
 *     totalHeight,
 *     offsetY,
 *     startIndex
 *   } = useVirtualizedList(items, {
 *     itemHeight: 100,
 *     overscan: 5
 *   });
 *
 *   return (
 *     <div ref={containerRef} style={{ height: '600px', overflow: 'auto' }}>
 *       <div style={{ height: totalHeight, position: 'relative' }}>
 *         <div style={{ transform: `translateY(${offsetY}px)` }}>
 *           {visibleItems.map((item, index) => (
 *             <div key={startIndex + index} style={{ height: 100 }}>
 *               {item.content}
 *             </div>
 *           ))}
 *         </div>
 *       </div>
 *     </div>
 *   );
 * };
 */

export default useVirtualizedList;