'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

const LoadingContext = createContext({
  isLoading: false,
  setIsLoading: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  
  // REMOVED: Body scroll lock during loading causes scrollbar flicker
  // Navigation doesn't require hiding scrollbars - this was the main cause of flicker
  // useEffect(() => {
  //   if (isLoading) {
  //     // Store original body styles
  //     const originalStyle = window.getComputedStyle(document.body);
  //     const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
  //     
  //     // Apply scroll lock
  //     document.body.style.overflow = 'hidden';
  //     document.body.style.paddingRight = `${scrollBarWidth}px`;
  //     
  //     return () => {
  //       // Restore original styles
  //       document.body.style.overflow = originalStyle.overflow;
  //       document.body.style.paddingRight = originalStyle.paddingRight;
  //     };
  //   }
  // }, [isLoading]);
  
  // Custom setIsLoading function with logging
  const setLoadingState = (state) => {
    setIsLoading(state);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading: setLoadingState }}>
      {children}
      {isLoading && (
        <div className="loading-overlay">
          <LoadingSpinner />
        </div>
      )}
    </LoadingContext.Provider>
  );
} 