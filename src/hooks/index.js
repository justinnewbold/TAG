/**
 * Hooks barrel export
 * All custom hooks exported from one place for easier imports
 */

// Async data hooks
export { useAsyncData, useMutation, usePolling, useOptimisticUpdate } from './useAsyncData';

// Form validation hooks
export { useFormValidation, createValidators, ValidatedInput } from './useFormValidation';

// Performance optimization hooks
export {
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
} from './usePerformance';
