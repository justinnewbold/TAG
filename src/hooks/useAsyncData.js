import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for managing async data fetching with loading, error, and refresh states
 * Works with the new service pattern that returns { data, error }
 */
export function useAsyncData(fetchFn, options = {}) {
  const {
    initialData = null,
    autoFetch = true,
    dependencies = [],
    onSuccess = null,
    onError = null,
    cacheKey = null,
  } = options;

  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const isMounted = useRef(true);

  const fetch = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn({ forceRefresh });

      if (!isMounted.current) return;

      if (result.error) {
        setError(result.error);
        if (onError) onError(result.error);
      } else {
        setData(result.data);
        setLastUpdated(Date.now());
        if (onSuccess) onSuccess(result.data);
      }
    } catch (e) {
      if (!isMounted.current) return;
      const errorObj = { message: e.message || 'An error occurred', type: 'UNKNOWN' };
      setError(errorObj);
      if (onError) onError(errorObj);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [fetchFn, onSuccess, onError]);

  const refresh = useCallback(() => {
    return fetch(true);
  }, [fetch]);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setIsLoading(false);
    setLastUpdated(null);
  }, [initialData]);

  useEffect(() => {
    isMounted.current = true;
    if (autoFetch) {
      fetch();
    }
    return () => {
      isMounted.current = false;
    };
  }, [...dependencies]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    fetch,
    refresh,
    reset,
    setData,
  };
}

/**
 * Hook for managing mutation operations (POST, PUT, DELETE)
 */
export function useMutation(mutationFn, options = {}) {
  const {
    onSuccess = null,
    onError = null,
    onSettled = null,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const mutate = useCallback(async (...args) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mutationFn(...args);

      if (result.error) {
        setError(result.error);
        if (onError) onError(result.error, ...args);
      } else {
        setData(result.data);
        if (onSuccess) onSuccess(result.data, ...args);
      }

      if (onSettled) onSettled(result.data, result.error, ...args);
      return result;
    } catch (e) {
      const errorObj = { message: e.message || 'An error occurred', type: 'UNKNOWN' };
      setError(errorObj);
      if (onError) onError(errorObj, ...args);
      if (onSettled) onSettled(null, errorObj, ...args);
      return { data: null, error: errorObj };
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, onSuccess, onError, onSettled]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    mutate,
    isLoading,
    error,
    data,
    reset,
  };
}

/**
 * Hook for polling data at intervals
 */
export function usePolling(fetchFn, interval = 30000, options = {}) {
  const { enabled = true, ...asyncOptions } = options;
  const asyncData = useAsyncData(fetchFn, { ...asyncOptions, autoFetch: enabled });
  const intervalRef = useRef(null);

  useEffect(() => {
    if (enabled && interval > 0) {
      intervalRef.current = setInterval(() => {
        asyncData.fetch();
      }, interval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [enabled, interval, asyncData.fetch]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return {
    ...asyncData,
    stop,
  };
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticUpdate(currentData, setCurrentData) {
  const previousDataRef = useRef(null);

  const optimisticUpdate = useCallback((newData) => {
    previousDataRef.current = currentData;
    setCurrentData(newData);
  }, [currentData, setCurrentData]);

  const rollback = useCallback(() => {
    if (previousDataRef.current !== null) {
      setCurrentData(previousDataRef.current);
      previousDataRef.current = null;
    }
  }, [setCurrentData]);

  const confirm = useCallback(() => {
    previousDataRef.current = null;
  }, []);

  return {
    optimisticUpdate,
    rollback,
    confirm,
  };
}

export default {
  useAsyncData,
  useMutation,
  usePolling,
  useOptimisticUpdate,
};
