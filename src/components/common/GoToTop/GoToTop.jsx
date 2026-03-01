"use client"
import { useState, useEffect } from 'react'
import './GoToTop.scss'

export function GoToTop() {
  const [isVisible, setIsVisible] = useState(false)
  const [isFullScreenActive, setIsFullScreenActive] = useState(false)

  // Check for fullscreen mode or scroll-locked modals
  useEffect(() => {
    const checkFullScreenMode = () => {
      const fullscreenElement = document.querySelector('.fullscreen-mode')
      const scrollLockedBody = document.body.classList.contains('scroll-locked')
      setIsFullScreenActive(!!fullscreenElement || scrollLockedBody)
    }

    // Check on mount
    checkFullScreenMode()

    // Create a MutationObserver to watch for changes in the DOM
    const observer = new MutationObserver(checkFullScreenMode)
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  // Simplified scroll detection - always use window
  useEffect(() => {
    const handleScroll = () => {
      // Always use window.scrollY
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      
      const shouldBeVisible = scrollY > 300 && !isFullScreenActive;
      if (shouldBeVisible !== isVisible) {
        setIsVisible(shouldBeVisible);
      }
    };

    // RAF throttling for better performance
    let ticking = false;
    const throttledHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Initial check
    handleScroll();
    
    // Add scroll listener to window
    window.addEventListener('scroll', throttledHandler, { passive: true });

    return () => {
      window.removeEventListener('scroll', throttledHandler);
    };
  }, [isVisible, isFullScreenActive])

  // Simplified scroll to top - always use window
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }

  // Don't render if not visible or if fullscreen mode is active
  if (!isVisible || isFullScreenActive) {
    return null
  }

  return (
    <button
      onClick={scrollToTop}
      className="go-to-top"
      aria-label="Scroll to top"
      title="Go to top"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 4L12 20M12 4L6 10M12 4L18 10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
} 