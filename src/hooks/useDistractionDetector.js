import { useEffect, useRef, useState } from 'react';

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'pointerdown'
];

export const useDistractionDetector = ({
  enabled = true,
  showModal = true,
  reason = '',
  blurGraceMs = 0,
  inactivityMs = 0,
  onDistraction,
  onReturn
} = {}) => {
  const [isDistracted, setIsDistracted] = useState(false);
  const isDistractedRef = useRef(false);
  const lastReasonRef = useRef(null);
  const blurTimerRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const onDistractionRef = useRef(onDistraction);
  const onReturnRef = useRef(onReturn);

  useEffect(() => {
    onDistractionRef.current = onDistraction;
    onReturnRef.current = onReturn;
  }, [onDistraction, onReturn]);

  useEffect(() => {
    if (!enabled) {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      return;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const clearBlurTimer = () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };

    const clearInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };

    const applyDistractionState = (nextState, source) => {
      if (isDistractedRef.current === nextState) return;
      isDistractedRef.current = nextState;
      setIsDistracted(nextState);
      lastReasonRef.current = source;
      if (nextState) {
        if (typeof onDistractionRef.current === 'function') {
          onDistractionRef.current();
        }
      } else if (typeof onReturnRef.current === 'function') {
        onReturnRef.current();
      }
    };

    const scheduleInactivity = () => {
      clearInactivityTimer();
      if (!inactivityMs || inactivityMs <= 0) return;
      inactivityTimerRef.current = setTimeout(() => {
        applyDistractionState(true, 'inactivity');
      }, inactivityMs);
    };

    const handleBlur = () => {
      clearBlurTimer();
      clearInactivityTimer();
      if (blurGraceMs > 0) {
        blurTimerRef.current = setTimeout(() => {
          applyDistractionState(true, 'blur');
        }, blurGraceMs);
      } else {
        applyDistractionState(true, 'blur');
      }
    };

    const handleFocus = () => {
      clearBlurTimer();
      applyDistractionState(false, 'focus');
      scheduleInactivity();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBlur();
      } else {
        handleFocus();
      }
    };

    const handleActivity = () => {
      if (isDistractedRef.current && lastReasonRef.current === 'inactivity') {
        applyDistractionState(false, 'activity');
      }
      scheduleInactivity();
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    scheduleInactivity();

    return () => {
      clearBlurTimer();
      clearInactivityTimer();
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  }, [enabled, blurGraceMs, inactivityMs, showModal, reason]);

  return { isDistracted };
};
