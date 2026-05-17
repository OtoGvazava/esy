/* global process */
// Performance utilities
import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';

// Higher-order component for memoization
export const withMemo = (Component, propsAreEqual) => {
  return memo(Component, propsAreEqual);
};

// Memoized selector for context values
export const createMemoizedSelector = (selector) => {
  return (state) => useMemo(() => selector(state), [state]);
};

// Simple debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Debounced callback hook
export const useDebouncedCallback = (callback, delay, deps = []) => {
  return useCallback(
    debounce(callback, delay),
    deps,
  );
};

// Lazy loading utility
export const lazyLoad = (importFunc) => {
  return React.lazy(importFunc);
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (ref, options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        rootMargin: '200px',
        threshold: 0.1,
        ...options,
      },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref, hasIntersected, options]);

  return { isIntersecting, hasIntersected };
};

// Performance monitoring utilities
export const measurePerformance = (name, fn) => {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  }
  return fn();
};

// Memoized component wrapper with performance logging
export const withPerformanceLogging = (Component, componentName) => {
  return memo((props) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} rendered with props:`, props);
    }
    return <Component {...props} />;
  });
};

