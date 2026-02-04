import { useRef, useCallback, useMemo, useEffect, useState } from 'react';

/**
 * Collection of performance optimization hooks
 */

/**
 * Debounce hook - delays function execution until after wait ms
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Delay in ms
 */
export function useDebouncedCallback(fn, wait = 300) {
  const timeoutRef = useRef(null);
  const fnRef = useRef(fn);

  // Update fn ref on every render to capture latest closure
  fnRef.current = fn;

  const debouncedFn = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      fnRef.current(...args);
    }, wait);
  }, [wait]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFn;
}

/**
 * Throttle hook - limits function execution to once per limit ms
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Minimum time between executions in ms
 */
export function useThrottledCallback(fn, limit = 300) {
  const lastRunRef = useRef(0);
  const fnRef = useRef(fn);

  fnRef.current = fn;

  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastRunRef.current >= limit) {
      lastRunRef.current = now;
      fnRef.current(...args);
    }
  }, [limit]);
}

/**
 * Debounced value hook - returns debounced version of a value
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in ms
 */
export function useDebouncedValue(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Previous value hook - returns the previous value of a variable
 * @param {any} value - Current value
 */
export function usePrevious(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Stable callback hook - returns a stable reference to a callback
 * Useful when you need a callback that doesn't change reference but always
 * calls the latest version
 */
export function useStableCallback(callback) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args) => {
    return callbackRef.current?.(...args);
  }, []);
}

/**
 * Memoized selector hook - creates a memoized selector from store state
 * @param {Function} selector - Selector function
 * @param {Array} deps - Dependencies for the selector
 */
export function useMemoizedSelector(selector, deps = []) {
  return useMemo(() => selector, deps);
}

/**
 * Intersection observer hook - tracks element visibility
 * @param {Object} options - IntersectionObserver options
 */
export function useIntersectionObserver(options = {}) {
  const [entry, setEntry] = useState(null);
  const [node, setNode] = useState(null);

  const observer = useRef(null);

  useEffect(() => {
    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry);
      },
      {
        rootMargin: '0px',
        threshold: 0,
        ...options,
      }
    );

    const currentNode = node;
    if (currentNode) {
      observer.current.observe(currentNode);
    }

    return () => {
      observer.current?.disconnect();
    };
  }, [node, options.rootMargin, options.threshold, options.root]);

  return [setNode, entry?.isIntersecting ?? false, entry];
}

/**
 * Lazy initialization hook - delays initialization until needed
 * @param {Function} initFn - Initialization function
 */
export function useLazyInit(initFn) {
  const [initialized, setInitialized] = useState(false);
  const valueRef = useRef(null);

  const initialize = useCallback(() => {
    if (!initialized) {
      valueRef.current = initFn();
      setInitialized(true);
    }
    return valueRef.current;
  }, [initFn, initialized]);

  return [valueRef.current, initialize, initialized];
}

/**
 * Window event listener hook with automatic cleanup
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} options - Event listener options
 */
export function useWindowEvent(event, handler, options) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const eventHandler = (...args) => handlerRef.current(...args);
    window.addEventListener(event, eventHandler, options);
    return () => window.removeEventListener(event, eventHandler, options);
  }, [event, options]);
}

/**
 * Media query hook
 * @param {string} query - Media query string
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event) => setMatches(event.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Render count hook - for debugging render performance
 */
export function useRenderCount() {
  const renderCount = useRef(0);
  renderCount.current += 1;
  return renderCount.current;
}

/**
 * Mount state hook - tracks if component is mounted
 */
export function useMountedState() {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(() => mountedRef.current, []);
}

/**
 * Update effect hook - like useEffect but skips the first render
 */
export function useUpdateEffect(effect, deps) {
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    return effect();
  }, deps);
}

export default {
  useDebouncedCallback,
  useThrottledCallback,
  useDebouncedValue,
  usePrevious,
  useStableCallback,
  useMemoizedSelector,
  useIntersectionObserver,
  useLazyInit,
  useWindowEvent,
  useMediaQuery,
  useRenderCount,
  useMountedState,
  useUpdateEffect,
};
