"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../styles/shadowing/player-recordingStatus.module.scss";

/**
 * Memoized AudioBar component for individual bar rendering
 * Optimized with spring physics for natural, responsive movement
 */
const AudioBar = React.memo(({ level, isPaused, index, styles }) => {
  return (
    <motion.div
      className={styles["audio-bar-live"]}
      initial={{ scaleY: 0.15 }}
      animate={{
        scaleY: isPaused ? 0.15 : level,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 0.5
      }}
      style={{
        transformOrigin: "bottom center"
      }}
      aria-hidden="true"
    />
  );
});

AudioBar.displayName = 'AudioBar';

/**
 * RecordingStatusDisplay Component
 * Professional recording status display with timer, audio visualization, and status badge
 * 
 * @param {number} duration - Recording duration in seconds
 * @param {Array<number>} audioLevels - Array of 10 audio level values (0-1)
 * @param {boolean} isPaused - Whether recording is paused
 * @param {Function} formatTime - Function to format duration as MM:SS
 */
const RecordingStatusDisplay = React.memo(({
  duration,
  audioLevels,
  isPaused,
  formatTime
}) => {
  // Determine number of bars based on window width (responsive)
  const [barCount, setBarCount] = React.useState(10);

  React.useEffect(() => {
    const updateBarCount = () => {
      setBarCount(window.innerWidth < 768 ? 6 : 10);
    };

    updateBarCount();
    window.addEventListener('resize', updateBarCount);
    return () => window.removeEventListener('resize', updateBarCount);
  }, []);

  // Slice audio levels array to match bar count
  const displayLevels = audioLevels.slice(0, barCount);

  // Detect if audio is actively being detected (above threshold)
  const isAudioActive = React.useMemo(() => {
    if (isPaused) return false;
    const avgLevel = displayLevels.reduce((sum, level) => sum + level, 0) / displayLevels.length;
    return avgLevel > 0.2; // Threshold for "active" audio detection
  }, [displayLevels, isPaused]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className={styles["recording-status-display"]}
      role="status"
      aria-live="polite"
    >
      {/* Duration Timer */}
      <div className={styles["recording-timer"]}>
        <span
          className={styles["timer-value"]}
          aria-label={`Recording duration: ${formatTime(duration)}`}
        >
          {formatTime(duration)}
        </span>
        <span className={styles["timer-label"]}>Recording</span>
      </div>

      {/* Live Audio Visualization */}
      <div className={`${styles["audio-visualizer-live"]} ${isAudioActive ? styles["audio-active"] : ''}`}>
        {displayLevels.map((level, i) => (
          <AudioBar
            key={i}
            level={level}
            isPaused={isPaused}
            index={i}
            styles={styles}
          />
        ))}
      </div>

      {/* Status Badge */}
      <div className={styles["live-indicator"]}>
        <motion.div
          animate={{
            scale: isPaused ? 1 : [1, 1.5, 1],
            opacity: isPaused ? 0.5 : [1, 0.3, 1]
          }}
          transition={{
            duration: isPaused ? 0.3 : 1.5,
            repeat: isPaused ? 0 : Infinity
          }}
          className={styles["pulse-dot"]}
          aria-hidden="true"
        />
        <span>{isPaused ? 'PAUSED' : 'LIVE'}</span>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if these props change meaningfully
  return (
    prevProps.duration === nextProps.duration &&
    prevProps.isPaused === nextProps.isPaused &&
    prevProps.formatTime === nextProps.formatTime &&
    prevProps.audioLevels.length === nextProps.audioLevels.length &&
    prevProps.audioLevels.every((val, i) => Math.abs(val - nextProps.audioLevels[i]) < 0.05) // Threshold for audio levels
  );
});

RecordingStatusDisplay.displayName = 'RecordingStatusDisplay';

export default RecordingStatusDisplay;
