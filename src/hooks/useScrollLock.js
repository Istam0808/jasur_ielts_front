'use client';

import { useEffect } from 'react';

/**
 * Locks or unlocks body scroll (e.g. when a modal is open).
 * @param {boolean} lock - When true, body scroll is locked; when false, restored.
 */
export default function useScrollLock(lock) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (lock) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      const prevOverflow = document.body.style.overflow;
      const prevPaddingRight = document.body.style.paddingRight;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.paddingRight = prevPaddingRight;
      };
    }
  }, [lock]);
}
