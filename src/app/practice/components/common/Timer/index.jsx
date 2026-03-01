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

  // Memoized timer configuration
  const timerConfig = useMemo(() => ({
    radius: 45,
    strokeWidth: 6,
    circumference: 2 * Math.PI * 45,
    svgSize: (45 + 6) * 2,
    center: 45 + 6
  }), []);

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

  // Memoized timer state calculations
  const timerVisualState = useMemo(() => {
    if (totalTimeSeconds === 0) {
      return {
        progress: 0,
        percentageLeft: 0,
        isWarning: false,
        isCritical: false,
        isTimeUp: true,
        strokeDashoffset: timerConfig.circumference
      };
    }

    const percentageLeft = (timeLeft / totalTimeSeconds) * 100;
    const progress = ((totalTimeSeconds - timeLeft) / totalTimeSeconds) * timerConfig.circumference;
    const strokeDashoffset = timerConfig.circumference - progress;

    return {
      progress: Number.isFinite(progress) ? progress : 0,
      percentageLeft: Number.isFinite(percentageLeft) ? percentageLeft : 0,
      isWarning: percentageLeft <= 50,
      isCritical: percentageLeft <= 20,
      isTimeUp: timeLeft === 0,
      strokeDashoffset: Number.isFinite(strokeDashoffset) ? strokeDashoffset : timerConfig.circumference
    };
  }, [timeLeft, totalTimeSeconds, timerConfig.circumference]);

  // Memoized time formatter
  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  // Memoized container classes
  const containerClasses = useMemo(() => {
    const classes = ['timer-circular'];
    if (timerVisualState.isWarning) classes.push('warning');
    if (timerVisualState.isCritical) classes.push('critical');
    if (timerVisualState.isTimeUp) classes.push('time-up');
    return classes.join(' ');
  }, [timerVisualState.isWarning, timerVisualState.isCritical, timerVisualState.isTimeUp]);

  // Memoized circle style for CSS variables
  const circleStyle = useMemo(() => ({
    '--progress': timerVisualState.progress,
    '--percentage': timerVisualState.percentageLeft
  }), [timerVisualState.progress, timerVisualState.percentageLeft]);

  return (
    <div className={containerClasses}>
      <div className="timer-circle-container">
        <div className="timer-circle-bg"></div>

        <svg
          className="timer-progress-svg"
          viewBox={`0 0 ${timerConfig.svgSize} ${timerConfig.svgSize}`}
          aria-hidden="true"
        >
          <circle
            cx={timerConfig.center}
            cy={timerConfig.center}
            r={timerConfig.radius}
            fill="none"
            className="timer-track"
            strokeWidth={timerConfig.strokeWidth}
            style={circleStyle}
          />

          <circle
            cx={timerConfig.center}
            cy={timerConfig.center}
            r={timerConfig.radius}
            fill="none"
            className="timer-progress-ring"
            strokeWidth={timerConfig.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={timerConfig.circumference}
            strokeDashoffset={timerVisualState.strokeDashoffset}
          />
        </svg>

        <div className="timer-display-center">
          <div className="timer-value-large" aria-live="polite">
            {formattedTime}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timer;