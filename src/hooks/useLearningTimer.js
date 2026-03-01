'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Learning timer: track session and optional daily total. Supports manualStart/manualStop and optional activityTag/renderless.
 * Used by FullscreenReadingMode, NormalReadingMode, Vocabulary, Grammar LearnMode, LearningTimer component.
 */
export function useLearningTimer(options = {}) {
  const { activityTag, renderless = false } = options;
  const [isActive, setIsActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [dailyTotal, setDailyTotal] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const manualStart = useCallback(() => {
    if (intervalRef.current) return;
    startTimeRef.current = Date.now();
    setIsActive(true);
    intervalRef.current = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const manualStop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false);
    setSessionDuration((prev) => {
      const minutes = Math.floor(prev / 60);
      setDailyTotal((d) => d + minutes);
      return 0;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const formatSeconds = useCallback((seconds) => {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }, []);

  const formatMinutes = useCallback((minutes) => {
    const m = Math.max(0, Math.floor(minutes));
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h > 0) return `${h}h ${min}m`;
    return `${min} min`;
  }, []);

  const formattedSessionTime = formatSeconds(sessionDuration);
  const formattedDailyTotal = formatMinutes(dailyTotal);

  return {
    isActive,
    sessionDuration,
    dailyTotal,
    manualStart,
    manualStop,
    startSession: manualStart,
    stopSession: manualStop,
    formatSeconds,
    formatMinutes,
    formattedSessionTime,
    formattedDailyTotal,
  };
}
