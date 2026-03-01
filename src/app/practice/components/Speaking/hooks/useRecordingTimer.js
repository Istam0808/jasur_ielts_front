import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for managing recording timer
 * Handles duration tracking, formatting, and cleanup
 * 
 * @param {boolean} isRecording - Whether recording is active
 * @param {boolean} isPaused - Whether recording is paused
 * @returns {Object} { duration, formatTime, reset }
 */
export const useRecordingTimer = (isRecording, isPaused) => {
  const [duration, setDuration] = useState(0);
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  // Format time as MM:SS
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Reset timer
  const reset = useCallback(() => {
    setDuration(0);
    startTimeRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Timer effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      // Initialize start time if not set
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }

      // Update duration every second
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // Clear interval when paused or not recording
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isRecording, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    duration,
    formatTime,
    reset
  };
};
