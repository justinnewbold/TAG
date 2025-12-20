import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for pull-to-refresh functionality
 * Works with touch devices and mouse for development testing
 */
export function usePullToRefresh(onRefresh, options = {}) {
  const {
    threshold = 80,
    maxPull = 120,
  } = options;

  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const containerRef = useRef(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  const handleTouchStart = useCallback((e) => {
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling || isRefreshing) return;
    
    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;
    
    if (diff > 0) {
      // Apply resistance to make it feel natural
      const resistance = 1 - Math.min(diff / (maxPull * 2), 0.5);
      const adjustedDiff = Math.min(diff * resistance, maxPull);
      setPullDistance(adjustedDiff);
      
      // Prevent default scrolling when pulling
      if (diff > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, isRefreshing, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    if (pullDistance >= threshold && onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setIsPulling(false);
    setPullDistance(0);
  }, [isPulling, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    progress,
    shouldTrigger,
  };
}

/**
 * Pull-to-refresh indicator component
 */
export function PullToRefreshIndicator({ 
  isVisible, 
  progress, 
  isRefreshing,
  pullDistance,
}) {
  if (!isVisible && !isRefreshing) return null;

  return (
    <div 
      className="flex items-center justify-center py-4 transition-all duration-200"
      style={{ 
        height: isRefreshing ? 60 : pullDistance,
        opacity: Math.min(progress, 1),
      }}
    >
      <div 
        className={`w-8 h-8 rounded-full border-2 border-neon-cyan flex items-center justify-center ${
          isRefreshing ? 'animate-spin' : ''
        }`}
        style={{
          transform: isRefreshing ? 'none' : `rotate(${progress * 360}deg)`,
          borderTopColor: progress >= 1 ? 'transparent' : undefined,
        }}
      >
        {!isRefreshing && (
          <span className={`text-neon-cyan transition-opacity ${progress >= 1 ? 'opacity-100' : 'opacity-50'}`}>
            ↓
          </span>
        )}
      </div>
      {progress >= 1 && !isRefreshing && (
        <span className="ml-2 text-sm text-neon-cyan">Release to refresh</span>
      )}
      {isRefreshing && (
        <span className="ml-2 text-sm text-white/50">Refreshing...</span>
      )}
    </div>
  );
}

export default usePullToRefresh;
