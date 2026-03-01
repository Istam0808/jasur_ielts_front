'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import './style.scss';

/**
 * SplashScreen component for application loading
 * @param {Object} props - Component props
 * @param {Function} props.onComplete - Callback fired when splash animation completes
 * @param {boolean} props.forceShow - Force show splash screen even if shown before
 * @param {boolean} props.showSkipButton - Show skip button for accessibility
 * @param {number} props.duration - Duration in ms before auto-complete (default: 4000)
 * @returns {JSX.Element|null} SplashScreen component
 */
export default function SplashScreen({
  onComplete,
  forceShow = false,
  showSkipButton = true,
  duration = 4000
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [displayedText, setDisplayedText] = useState('');

  const timersRef = useRef([]);
  const typewriterTimersRef = useRef([]);
  const hasCompletedRef = useRef(false);

  // Memoized completion handler
  const handleComplete = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;

    // Clear all timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    typewriterTimersRef.current.forEach(clearTimeout);
    typewriterTimersRef.current = [];

    // Store completion in sessionStorage
    if (typeof window !== 'undefined' && !forceShow) {
      try {
        sessionStorage.setItem('unitschool-splash-shown', 'true');
      } catch (error) {
        console.warn('SessionStorage unavailable:', error);
      }
    }

    setIsVisible(false);
    onComplete?.();
  }, [onComplete, forceShow]);

  // Handle skip button
  const handleSkip = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);

    const timer = setTimeout(handleComplete, 300);
    timersRef.current.push(timer);
  }, [isExiting, handleComplete]);

  // Check if splash should be shown
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check sessionStorage
    if (!forceShow) {
      try {
        const hasSeenSplash = sessionStorage.getItem('unitschool-splash-shown');
        if (hasSeenSplash === 'true') {
          handleComplete();
          return;
        }
      } catch (error) {
        console.warn('SessionStorage check failed:', error);
      }
    }

    // Show splash screen
    setIsVisible(true);
  }, [forceShow, handleComplete]);

  // Main animation timeline
  useEffect(() => {
    if (!isVisible) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const exitDelay = prefersReducedMotion ? 1500 : duration;
    const completeDelay = exitDelay + 500;

    // Schedule exit animation
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, exitDelay);

    // Schedule completion
    const completeTimer = setTimeout(handleComplete, completeDelay);

    timersRef.current.push(exitTimer, completeTimer);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [isVisible, duration, handleComplete]);

  // Typewriter effect
  useEffect(() => {
    if (!isVisible) return;

    const text = 'Unit School';
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const typingSpeed = prefersReducedMotion ? 50 : 120;

    let index = 0;
    const typeChar = () => {
      if (index <= text.length) {
        setDisplayedText(text.slice(0, index));
        index++;
        const timer = setTimeout(typeChar, typingSpeed);
        typewriterTimersRef.current.push(timer);
      }
    };

    typeChar();

    return () => {
      // Only clear typewriter timers
      typewriterTimersRef.current.forEach(clearTimeout);
      typewriterTimersRef.current = [];
    };
  }, [isVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      typewriterTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  const phaseClass = isExiting ? 'exiting' : 'logo-visible';

  return (
    <div
      className={`splash-screen ${phaseClass}`}
      role="dialog"
      aria-modal="true"
      aria-label="Unit School loading screen"
      aria-live="polite"
    >
      {showSkipButton && (
        <button
          className="splash-skip-btn"
          onClick={handleSkip}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSkip();
            }
          }}
          aria-label="Skip loading animation"
          type="button"
          disabled={isExiting}
        >
          Skip
        </button>
      )}

      <div className="splash-content">
        <div className="logo-container">
          {/* Unit School Logo */}
          <img
            src="/android-chrome-192x192.webp"
            alt="Unit School Logo"
            className="splash-logo splash-logo-placeholder"
            loading="eager"
            decoding="async"
          />
        </div>

        <div className="text-container">
          <h1 className="splash-title" aria-live="polite">
            {displayedText}
            {displayedText.length < 11 && (
              <span className="cursor" aria-hidden="true">|</span>
            )}
          </h1>
          <div className="splash-screen-loading-dots" aria-hidden="true" aria-label="Loading">
            <span className="splash-dot"></span>
            <span className="splash-dot"></span>
            <span className="splash-dot"></span>
          </div>
        </div>
      </div>
    </div>
  );
}