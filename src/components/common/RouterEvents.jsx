'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLoading } from './LoadingContext';

export function RouterEvents() {
  const { setIsLoading } = useLoading();
  const router = useRouter();

  useEffect(() => {
    // Patch the router to detect navigation events
    const originalPush = router.push;
    const originalReplace = router.replace;
    
    // Override router.push
    router.push = (...args) => {
      setIsLoading(true);
      return originalPush.apply(router, args);
    };
    
    // Override router.replace
    router.replace = (...args) => {
      setIsLoading(true);
      return originalReplace.apply(router, args);
    };

    // Add navigation start event listener to links
    const handleLinkClick = () => {
      setIsLoading(true);
    };

    // Attach click listeners to all Next.js links
    document.addEventListener('click', (e) => {
      // Check if the clicked element is a link or inside a link
      const link = e.target.closest('a');
      if (link && link.href && link.href.startsWith(window.location.origin)) {
        handleLinkClick();
      }
    });
    
    // Add navigation complete handler to restore scroll behavior
    const handleNavigationComplete = () => {
      setTimeout(() => {
        // Remove any inline overflow styles that might interfere with CSS
        document.documentElement.style.overflowY = '';
        document.body.style.overflowY = '';
        document.documentElement.style.overflowX = '';
        document.body.style.overflowX = '';
      }, 200);
    };
    
    // Listen for navigation completion
    window.addEventListener('popstate', handleNavigationComplete);
    
    return () => {
      // Restore original methods
      router.push = originalPush;
      router.replace = originalReplace;
      window.removeEventListener('popstate', handleNavigationComplete);
    };
  }, [router, setIsLoading]);

  return null;
} 