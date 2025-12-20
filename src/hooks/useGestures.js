import { useRef, useState, useCallback } from 'react';

/**
 * Custom hook for swipe gesture detection
 * Supports: swipe up, down, left, right
 */
export function useSwipe(options = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipeStart,
    onSwipeMove,
    onSwipeEnd,
    threshold = 50, // Minimum distance for swipe
    velocityThreshold = 0.3, // Minimum velocity
    preventScroll = false
  } = options;

  const touchStart = useRef({ x: 0, y: 0, time: 0 });
  const touchEnd = useRef({ x: 0, y: 0 });
  const [swiping, setSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [swipeDistance, setSwipeDistance] = useState({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStart.current = { 
      x: touch.clientX, 
      y: touch.clientY,
      time: Date.now()
    };
    touchEnd.current = { x: touch.clientX, y: touch.clientY };
    setSwiping(true);
    setSwipeDistance({ x: 0, y: 0 });
    onSwipeStart?.({ x: touch.clientX, y: touch.clientY });
  }, [onSwipeStart]);

  const handleTouchMove = useCallback((e) => {
    if (!swiping) return;
    
    const touch = e.touches[0];
    touchEnd.current = { x: touch.clientX, y: touch.clientY };
    
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    
    setSwipeDistance({ x: deltaX, y: deltaY });
    
    // Determine direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    } else {
      setSwipeDirection(deltaY > 0 ? 'down' : 'up');
    }
    
    onSwipeMove?.({ x: deltaX, y: deltaY, direction: swipeDirection });
    
    // Prevent scroll if horizontal swipe or if option set
    if (preventScroll || Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
    }
  }, [swiping, swipeDirection, onSwipeMove, preventScroll]);

  const handleTouchEnd = useCallback(() => {
    if (!swiping) return;
    
    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;
    
    const velocityX = Math.abs(deltaX) / deltaTime;
    const velocityY = Math.abs(deltaY) / deltaTime;
    
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    const distance = isHorizontal ? Math.abs(deltaX) : Math.abs(deltaY);
    const velocity = isHorizontal ? velocityX : velocityY;
    
    // Check if swipe meets threshold
    if (distance > threshold || velocity > velocityThreshold) {
      if (isHorizontal) {
        if (deltaX > 0) {
          onSwipeRight?.({ distance: deltaX, velocity: velocityX });
        } else {
          onSwipeLeft?.({ distance: Math.abs(deltaX), velocity: velocityX });
        }
      } else {
        if (deltaY > 0) {
          onSwipeDown?.({ distance: deltaY, velocity: velocityY });
        } else {
          onSwipeUp?.({ distance: Math.abs(deltaY), velocity: velocityY });
        }
      }
    }
    
    onSwipeEnd?.({ 
      x: deltaX, 
      y: deltaY, 
      direction: swipeDirection,
      velocity: { x: velocityX, y: velocityY }
    });
    
    setSwiping(false);
    setSwipeDirection(null);
    setSwipeDistance({ x: 0, y: 0 });
  }, [swiping, swipeDirection, threshold, velocityThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipeEnd]);

  const handlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };

  return {
    handlers,
    swiping,
    swipeDirection,
    swipeDistance
  };
}

/**
 * Hook for detecting long press
 */
export function useLongPress(callback, options = {}) {
  const { delay = 500, onStart, onCancel } = options;
  const timeoutRef = useRef(null);
  const targetRef = useRef(null);
  const [pressing, setPressing] = useState(false);

  const start = useCallback((e) => {
    targetRef.current = e.target;
    setPressing(true);
    onStart?.(e);
    
    timeoutRef.current = setTimeout(() => {
      callback(e);
      if ('vibrate' in navigator) {
        navigator.vibrate([30, 20, 50]);
      }
    }, delay);
  }, [callback, delay, onStart]);

  const cancel = useCallback((e) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setPressing(false);
    onCancel?.(e);
  }, [onCancel]);

  const handlers = {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel
  };

  return { handlers, pressing };
}

/**
 * Hook for pull-to-refresh gesture
 */
export function usePullToRefresh(onRefresh, options = {}) {
  const { threshold = 80, resistance = 2.5 } = options;
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const scrollTop = useRef(0);

  const handleTouchStart = useCallback((e) => {
    scrollTop.current = document.documentElement.scrollTop || document.body.scrollTop;
    if (scrollTop.current <= 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!pulling || refreshing) return;
    
    const currentY = e.touches[0].clientY;
    const delta = (currentY - startY.current) / resistance;
    
    if (delta > 0 && scrollTop.current <= 0) {
      setPullDistance(Math.min(delta, threshold * 1.5));
      e.preventDefault();
    }
  }, [pulling, refreshing, resistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      if ('vibrate' in navigator) {
        navigator.vibrate([20, 30, 40]);
      }
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
      }
    }
    
    setPulling(false);
    setPullDistance(0);
  }, [pulling, pullDistance, threshold, refreshing, onRefresh]);

  const handlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };

  return {
    handlers,
    pulling,
    pullDistance,
    refreshing,
    progress: Math.min(pullDistance / threshold, 1)
  };
}

export default { useSwipe, useLongPress, usePullToRefresh };
