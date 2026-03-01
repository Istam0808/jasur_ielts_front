'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useLoading } from './LoadingContext';

export function NavigationEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setIsLoading } = useLoading();

  // Listen for changes in pathname and searchParams to detect navigation
  useEffect(() => {
    const handleStart = () => {
      setIsLoading(true);
    };

    const handleComplete = () => {
      setIsLoading(false);
      
      // Ensure scrollbar is restored after navigation - let CSS handle overflow
      setTimeout(() => {
        // Remove any inline overflow styles that might interfere with CSS
        document.documentElement.style.overflowY = '';
        document.body.style.overflowY = '';
        document.documentElement.style.overflowX = '';
        document.body.style.overflowX = '';
      }, 100);
    };

    // In App Router, we need to use window events
    window.addEventListener('beforeunload', handleStart);
    
    // For client-side navigation in Next.js App Router
    // Check for navigation state using a MutationObserver on the document body
    const observer = new MutationObserver((mutations) => {
      // Check if navigation state attribute changes
      if (document.body.getAttribute('data-navigation-state') === 'loading') {
        handleStart();
      } else {
        handleComplete();
      }
    });
    
    // Set up the observer to watch for changes to the body's attributes
    observer.observe(document.body, { attributes: true });

    // Manually trigger loading on first render
    if (document.readyState !== 'complete') {
      handleStart();
      window.addEventListener('load', handleComplete);
    }

    return () => {
      window.removeEventListener('beforeunload', handleStart);
      window.removeEventListener('load', handleComplete);
      observer.disconnect();
    };
  }, [setIsLoading]);

  // When pathname or search params change, this component re-renders
  // Indicating that navigation has completed
  useEffect(() => {
    // Short delay to ensure UI has time to update
    setTimeout(() => {
      setIsLoading(false);
      
      // Remove any inline overflow styles that might interfere with CSS
      document.documentElement.style.overflowY = '';
      document.body.style.overflowY = '';
      document.documentElement.style.overflowX = '';
      document.body.style.overflowX = '';
    }, 300);
  }, [pathname, searchParams, setIsLoading]);

  return null;
} 