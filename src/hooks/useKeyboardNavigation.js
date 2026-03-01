'use client';

import { useRef, useEffect, useCallback } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container) {
  if (!container || typeof container.querySelectorAll !== 'function') return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent != null && !el.hasAttribute('disabled')
  );
}

/**
 * Focus trap: keeps focus inside container, Escape calls onClose, optional autoFocus.
 */
export function useFocusTrap({ isOpen, onClose, autoFocus = true }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen || typeof onClose !== 'function') return;

    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    if (autoFocus) {
      const focusable = getFocusableElements(container);
      const toFocus = focusable[0];
      if (toFocus) {
        requestAnimationFrame(() => { toFocus.focus(); });
      }
    }

    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, autoFocus]);

  return { containerRef };
}

/**
 * Arrow key navigation between focusable items (e.g. horizontal button row).
 */
export function useArrowNavigation({ enabled = true, orientation = 'horizontal' }) {
  const containerRef = useRef(null);

  const isHorizontal = orientation === 'horizontal';

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e) => {
      const key = e.key;
      const isArrow = isHorizontal
        ? (key === 'ArrowLeft' || key === 'ArrowRight')
        : (key === 'ArrowUp' || key === 'ArrowDown');
      if (!isArrow) return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const currentIndex = focusable.indexOf(document.activeElement);
      let nextIndex = currentIndex;

      if (isHorizontal) {
        nextIndex = key === 'ArrowRight' ? currentIndex + 1 : currentIndex - 1;
      } else {
        nextIndex = key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
      }

      if (nextIndex < 0) nextIndex = focusable.length - 1;
      if (nextIndex >= focusable.length) nextIndex = 0;

      e.preventDefault();
      focusable[nextIndex].focus();
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [enabled, isHorizontal]);

  return { containerRef };
}
