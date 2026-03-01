'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/** IELTS Writing Task 1: 20 minutes */
const TASK_1_MINUTES = 20;
const SECONDS_PER_MINUTE = 60;

/**
 * Writing timer hook: start/pause/reset, time limit, start time ref.
 * Uses IELTS Task 1 time (20 min) by default.
 * @param {{
 *   difficulty?: string,
 *   isPlacementTest?: boolean,
 *   externalTimerStartTime?: number,
 *   externalTimerDuration?: number,
 *   externalTimerPaused?: boolean
 * }} options
 * @returns {{ isTimerRunning: boolean, hasTimerStarted: boolean, timeLimit: number, startTimeRef: React.MutableRefObject<number|null>, handleStartTimer: () => void, pauseTimer: () => void, resetTimer: () => void }}
 */
export function useWritingTimer({
  difficulty,
  isPlacementTest,
  externalTimerStartTime,
  externalTimerDuration,
  externalTimerPaused = false
}) {
  const startTimeRef = useRef(null);
  const [hasTimerStarted, setHasTimerStarted] = useState(!!externalTimerStartTime);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // IELTS Task 1: 20 minutes (or external override)
  const timeLimit = externalTimerDuration != null
    ? (typeof externalTimerDuration === 'number' && externalTimerDuration > 0
        ? externalTimerDuration * SECONDS_PER_MINUTE
        : TASK_1_MINUTES * SECONDS_PER_MINUTE)
    : TASK_1_MINUTES * SECONDS_PER_MINUTE;

  // Sync external start time into ref
  useEffect(() => {
    if (externalTimerStartTime != null) {
      startTimeRef.current = externalTimerStartTime;
      setHasTimerStarted(true);
    }
  }, [externalTimerStartTime]);

  // Respect external pause
  useEffect(() => {
    if (externalTimerPaused) {
      setIsTimerRunning(false);
    }
  }, [externalTimerPaused]);

  const handleStartTimer = useCallback(() => {
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }
    setHasTimerStarted(true);
    setIsTimerRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsTimerRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    startTimeRef.current = null;
    setHasTimerStarted(false);
    setIsTimerRunning(false);
  }, []);

  return {
    isTimerRunning: isTimerRunning && !externalTimerPaused,
    hasTimerStarted,
    timeLimit,
    startTimeRef,
    handleStartTimer,
    pauseTimer,
    resetTimer
  };
}
