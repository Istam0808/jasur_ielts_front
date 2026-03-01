import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpeaking } from '../contexts/SpeakingContext';

const useIELTSTimer = () => {
  const { actions } = useSpeaking();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);

  const startTimer = useCallback((duration) => {
    // Clear any existing timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setTimeRemaining(duration);
    setIsTimerActive(true);
    setIsPaused(false);
    
    // Update context
    actions.startTimer(duration);

    // Start countdown
    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Timer finished
          setIsTimerActive(false);
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [actions]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTimerActive(false);
    setIsPaused(false);
    setTimeRemaining(0);
    
    // Update context
    actions.stopTimer();
  }, [actions]);

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPaused(true);
  }, []);

  const resumeTimer = useCallback(() => {
    if (isPaused && timeRemaining > 0) {
      setIsPaused(false);
      setIsTimerActive(true);

      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerActive(false);
            clearInterval(intervalRef.current);
            return 0;
          }
          const newTime = prev - 1;
          // Update context with time remaining
          actions.updateTimeRemaining(newTime);
          return newTime;
        });
      }, 1000);
    }
  }, [isPaused, timeRemaining, actions]);

  const addTime = useCallback((seconds) => {
    setTimeRemaining((prev) => prev + seconds);
  }, []);

  const setTime = useCallback((seconds) => {
    setTimeRemaining(seconds);
  }, []);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getTimePercentage = useCallback((totalDuration) => {
    if (totalDuration === 0) return 0;
    return ((totalDuration - timeRemaining) / totalDuration) * 100;
  }, [timeRemaining]);

  const isTimeUp = useCallback(() => {
    return timeRemaining === 0 && !isTimerActive;
  }, [timeRemaining, isTimerActive]);

  // Sync timer state with context
  useEffect(() => {
    actions.updateTimeRemaining(timeRemaining);
  }, [timeRemaining, actions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    timeRemaining,
    isTimerActive,
    isPaused,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    addTime,
    setTime,
    formatTime,
    getTimePercentage,
    isTimeUp
  };
};

export { useIELTSTimer };
