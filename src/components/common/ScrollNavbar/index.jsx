"use client"

import React, { useState, useEffect, useCallback } from 'react';
import SimpleNavbar from '../SimpleNavbar';
import { useNavbarScroll } from '@/hooks/useNavbarScroll';
import './style.scss';

function ScrollNavbar() {
  const [isVisible, setIsVisible] = useState(false);

  // Use the enhanced hook for smooth navbar scroll management
  useNavbarScroll(80, 100); // 50vh to start, 100vh for full opacity

  const checkScrollPosition = useCallback(() => {
    const scrollY = Math.max(
      window.scrollY || 0,
      document.documentElement.scrollTop || 0,
      document.body.scrollTop || 0
    );

    const viewportHeight = Math.max(
      window.innerHeight || 0,
      document.documentElement.clientHeight || 0
    );

    const threshold = viewportHeight * 1.05; // 105vh
    const shouldBeVisible = scrollY > threshold;
    
    if (shouldBeVisible !== isVisible) {
      setIsVisible(shouldBeVisible);
    }
  }, [isVisible]);

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          checkScrollPosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    checkScrollPosition(); // Initial check
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', checkScrollPosition, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [checkScrollPosition]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="scroll-navbar-container">
      <SimpleNavbar />
    </div>
  );
}

export default ScrollNavbar; 