"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaMicrophone,
  FaStop,
  FaDownload,
  FaPause,
  FaPlay,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";
import RecordingStatusDisplay from "./RecordingStatusDisplay";
import styles from "../styles/shadowing/player-recording.module.scss";

/**
 * RecordingControls Component
 * Recording section with status display and control buttons
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isRecording - Whether recording is active
 * @param {boolean} props.isPaused - Whether recording is paused
 * @param {Blob|null} props.recordBlob - Recorded audio blob
 * @param {number} props.recordingDuration - Recording duration in seconds
 * @param {Array<number>} props.audioLevels - Array of audio level values (0-1)
 * @param {Function} props.formatTime - Function to format time as MM:SS
 * @param {Function} props.onStartRecording - Callback when start recording button is clicked
 * @param {Function} props.onStopRecording - Callback when stop recording button is clicked
 * @param {Function} props.onPauseRecording - Callback when pause/resume button is clicked
 * @param {Function} props.onDownload - Callback when download button is clicked
 * @param {string} [props.className] - Additional CSS classes
 */
const RecordingControls = React.memo(function RecordingControls({
  isRecording,
  isPaused,
  recordBlob,
  recordingDuration,
  audioLevels,
  formatTime,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onDownload,
  className = "",
}) {
  const { t } = useTranslation("speaking");

  return (
    <div className={`${styles["recording-section"]} ${className}`}>
      {/* Section label */}
      <div className={styles["section-label"]}>
        {/* Animated microphone icon */}
        <motion.div
          initial={{ scale: 1 }}
          animate={
            isRecording
              ? { scale: [1, 1.2, 1] } // Pulse animation when recording
              : { scale: 1 } // Static when not recording
          }
          transition={
            isRecording
              ? { duration: 1, repeat: Infinity } // Infinite loop when recording
              : { duration: 0.3 } // Quick transition when stopping
          }
        >
          <FaMicrophone aria-hidden="true" />
        </motion.div>
        <h3>{t("menu.shadowing.player.recording.title")}</h3>
      </div>

      {/* Professional Recording Status Display (only shown when recording) */}
      <AnimatePresence>
        {isRecording && (
          <RecordingStatusDisplay
            duration={recordingDuration}
            audioLevels={audioLevels}
            isPaused={isPaused}
            formatTime={formatTime}
          />
        )}
      </AnimatePresence>

      {/* Recording control buttons */}
      <div
        className={styles["button-group"]}
        role="group"
        aria-label={t("menu.shadowing.player.recording.title")}
      >
        {isRecording ? (
          // If recording, show stop and pause buttons
          <>
            {/* Stop button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStopRecording}
              className={styles["btn-stop"]}
              aria-label={t("menu.shadowing.player.recording.stopButton")}
            >
              <FaStop aria-hidden="true" />
              {t("menu.shadowing.player.recording.stopButton")}
            </motion.button>

            {/* Pause/Resume button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onPauseRecording}
              className={styles["btn-pause"]}
              aria-label={
                isPaused
                  ? t("menu.shadowing.player.recording.resumeButton")
                  : t("menu.shadowing.player.recording.pauseButton")
              }
            >
              {isPaused ? (
                <FaPlay aria-hidden="true" />
              ) : (
                <FaPause aria-hidden="true" />
              )}
              {isPaused
                ? t("menu.shadowing.player.recording.resumeButton")
                : t("menu.shadowing.player.recording.pauseButton")}
            </motion.button>
          </>
        ) : (
          // If not recording, show start button and optionally download button
          <>
            {/* Start button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartRecording}
              className={styles["btn-record"]}
              aria-label={t("menu.shadowing.player.recording.startButton")}
            >
              <FaMicrophone aria-hidden="true" />
              {t("menu.shadowing.player.recording.startButton")}
            </motion.button>

            {/* Download button - only shown when recording exists */}
            {recordBlob && (
              <motion.button
                onClick={onDownload}
                className={styles["btn-download"]}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label={t("menu.shadowing.player.recording.downloadButton")}
              >
                <FaDownload aria-hidden="true" />
                {t("menu.shadowing.player.recording.downloadButton")}
              </motion.button>
            )}
          </>
        )}
      </div>
    </div>
  );
});

RecordingControls.displayName = "RecordingControls";

export default RecordingControls;
