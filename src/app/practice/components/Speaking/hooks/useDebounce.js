import { useState, useEffect } from "react";

/**
 * Custom hook that debounces a value
 * Delays updating a value until after a specified delay has elapsed since the last change
 * Useful for reducing the frequency of expensive operations like re-renders
 * 
 * @param {*} value - The value to debounce
 * @param {number} delay - Delay in milliseconds before updating the debounced value
 * @returns {*} The debounced value
 * 
 * @example
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 * // searchTerm changes immediately, but debouncedSearchTerm updates 300ms later
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if the value changes before the delay expires
    // This prevents stale updates and ensures only the latest value is used
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Re-run effect when value or delay changes

  return debouncedValue;
}
