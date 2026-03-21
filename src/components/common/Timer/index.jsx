"use client"
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './style.scss';

/**
 * Timer component for test countdown
 * @param {Object} props
 * @param {number} props.durationInMinutes - Duration in minutes
 * @param {Function} props.onTimeUp - Callback function when timer ends
 * @param {boolean} props.isActive - Whether timer is active
 * @param {number} props.startTime - Timestamp when timer started (for persistence)
 * @param {boolean} props.isReviewMode - Whether in review mode (timer should be paused)
 * @param {number} props.finalTimeLeft - Preserved time left for review mode
 */
const Timer = ({
  durationInMinutes,
  onTimeUp,
  isActive = true,
  startTime,
  isReviewMode = false,
  finalTimeLeft
}) => {
  const { t } = useTranslation('test');

  // Validate and memoize duration
  const validDuration = useMemo(() => Math.max(0, durationInMinutes || 0), [durationInMinutes]);
  const totalTimeSeconds = useMemo(() => validDuration * 60, [validDuration]);

  // Stable ref for onTimeUp to avoid recreating intervals
  const onTimeUpRef = useRef(onTimeUp);
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // Timer state management
  // Initialize with startTime if provided, otherwise will be set when startTime becomes available
  const timerStateRef = useRef({
    startTime: startTime || null,
    pauseStartTime: null,
    accumulatedPauseMs: 0,
    hasCalledTimeUp: false
  });

  const [timeLeft, setTimeLeft] = useState(() => {
    // In review mode, use the preserved time
    if (isReviewMode && finalTimeLeft !== undefined) {
      return finalTimeLeft;
    }
    // Calculate initial time based on startTime if provided
    if (startTime) {
      const elapsedMs = Math.max(0, Date.now() - startTime);
      const remainingMs = Math.max(0, (validDuration * 60 * 1000) - elapsedMs);
      return Math.ceil(remainingMs / 1000);
    }
    // Default to full duration
    return totalTimeSeconds;
  });

  const intervalRef = useRef(null);

  // Calculate time left based on wall clock
  const calculateTimeLeft = useCallback(() => {
    const state = timerStateRef.current;
    
    // If no startTime is set, return full duration
    if (!state.startTime) {
      return totalTimeSeconds;
    }
    
    const now = Date.now();

    // Calculate total paused time
    let totalPauseMs = state.accumulatedPauseMs;
    if (state.pauseStartTime) {
      totalPauseMs += (now - state.pauseStartTime);
    }

    // Calculate elapsed active time
    const elapsedMs = Math.max(0, now - state.startTime - totalPauseMs);
    const remainingMs = Math.max(0, (validDuration * 60 * 1000) - elapsedMs);

    return Math.ceil(remainingMs / 1000);
  }, [validDuration, totalTimeSeconds]);

  // Reset timer when critical props change
  useEffect(() => {
    // In review mode, lock the display
    if (isReviewMode && finalTimeLeft !== undefined) {
      setTimeLeft(finalTimeLeft);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Reset timer state when startTime changes
    // Only update if startTime is provided and actually changed
    if (startTime && timerStateRef.current.startTime !== startTime) {
      timerStateRef.current = {
        startTime: startTime,
        pauseStartTime: null,
        accumulatedPauseMs: 0,
        hasCalledTimeUp: false
      };
      setTimeLeft(calculateTimeLeft());
    } else if (!startTime && timerStateRef.current.startTime !== null) {
      // Reset when startTime is cleared
      timerStateRef.current = {
        startTime: null,
        pauseStartTime: null,
        accumulatedPauseMs: 0,
        hasCalledTimeUp: false
      };
      setTimeLeft(totalTimeSeconds);
    }
  }, [startTime, validDuration, isReviewMode, finalTimeLeft, calculateTimeLeft]);

  // Main timer effect
  useEffect(() => {
    // Don't run timer in review mode
    if (isReviewMode) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const state = timerStateRef.current;

    // Handle pause state changes
    if (!isActive) {
      // Start pause if not already paused
      if (!state.pauseStartTime) {
        state.pauseStartTime = Date.now();
      }
      // Clear interval when paused
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Update display with current time
      setTimeLeft(calculateTimeLeft());
      return;
    }

    // Handle resume from pause
    if (state.pauseStartTime) {
      state.accumulatedPauseMs += (Date.now() - state.pauseStartTime);
      state.pauseStartTime = null;
    }

    // Timer tick function
    const tick = () => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      // Handle time up
      if (remaining <= 0 && !state.hasCalledTimeUp) {
        state.hasCalledTimeUp = true;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // Use ref to get latest callback
        onTimeUpRef.current?.();
      }
    };

    // Start interval
    tick(); // Immediate tick
    intervalRef.current = setInterval(tick, 250);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isReviewMode, calculateTimeLeft]);

  // MM:SS + «N minutes left» (как в listening); при hover — «MM:SS minutes left» с секундами
  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  const minutesCeil = useMemo(
    () => (timeLeft <= 0 ? 0 : Math.ceil(timeLeft / 60)),
    [timeLeft]
  );

  // Второй аргумент — default со строкой интерполяции (см. ContinuousTestTimer). Если в бандле перевод без интерполяции — подставляем числа вручную.
  const compactDisplay = useMemo(() => {
    const raw = t('timer.minutesLeftCompact', '{{count}} minutes left', {
      count: minutesCeil,
      ns: 'test',
    });
    return raw.includes('{{count}}') ? `${minutesCeil} minutes left` : raw;
  }, [minutesCeil, t]);

  const detailedDisplay = useMemo(() => {
    const raw = t('timer.minutesLeftWithSeconds', '{{time}} minutes left', {
      time: formattedTime,
      ns: 'test',
    });
    return raw.includes('{{time}}') ? `${formattedTime} minutes left` : raw;
  }, [formattedTime, t]);

  return (
    <div
      className="timer-text"
      aria-live="polite"
      aria-label={detailedDisplay}
      title={detailedDisplay}
      tabIndex={0}
    >
      <span className="timer-text__compact">{compactDisplay}</span>
      <span className="timer-text__detailed" aria-hidden="true">
        {detailedDisplay}
      </span>
    </div>
  );
};

export default Timer;