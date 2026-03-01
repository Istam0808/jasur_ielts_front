"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

// React Icons
import { HiMicrophone, HiSparkles } from "react-icons/hi2";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

import TranscriptComparison from "./TranscriptComparison";
import styles from "../styles/shadowing/UserTranscript.module.scss";

/**
 * Detects if the current device is a mobile device
 * @returns {boolean} True if device is mobile
 */
const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

const UserTranscript = React.memo(({
  isRecording,
  transcript,
  interimTranscript,
  analysis,
  referenceText,
  recordBlob,
  className = "",
}) => {
  const { t } = useTranslation("speaking");

  // Detect mobile device once
  const isMobile = useMemo(() => isMobileDevice(), []);

  const isProcessing = recordBlob && !transcript && !isRecording;
  const hasAnalysis = !!analysis && !!transcript;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${styles.transcriptCard} ${className} ${hasAnalysis ? styles.isAnalyzed : ""}`}
    >
      <header className={styles.cardHeader}>
        <div className={styles.headerTitle}>
          <div className={`${styles.iconBox} ${isRecording ? styles.pulseIcon : ""}`}>
            {hasAnalysis ? <HiSparkles size={18} /> : <HiMicrophone size={18} />}
          </div>
          <h3>{t("menu.shadowing.player.transcript.yourSpeech")}</h3>
        </div>

        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={styles.liveIndicator}
            >
              <span className={styles.dot} />
              {t("menu.shadowing.player.recording.status.live")}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className={styles.contentBody}>
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div
              key="recording-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={styles.interimWrapper}
            >
              <p className={styles.textStreaming}>
                {isMobile ? (
                  <span className={styles.quiet}>
                    {t("menu.shadowing.player.recording.status.recording")}
                  </span>
                ) : (
                  interimTranscript || <span className={styles.quiet}>...</span>
                )}
              </p>
            </motion.div>
          ) : isProcessing ? (
            <motion.div
              key="processing-state"
              className={styles.statusOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <AiOutlineLoading3Quarters className={styles.spinIcon} />
              <span>{t("menu.shadowing.player.recording.status.processing")}</span>
            </motion.div>
          ) : hasAnalysis ? (
            <motion.div
              key="analysis-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={styles.resultsWrapper}
            >
              <TranscriptComparison
                referenceText={referenceText}
                userTranscript={transcript}
                isAnalyzed={true}
                textMatchScore={analysis?.textMatch?.score}
              />
            </motion.div>
          ) : transcript ? (
            <motion.div key="final-text" className={styles.finalText}>
              {transcript}
            </motion.div>
          ) : (
            <motion.div key="empty-state" className={styles.placeholder}>
              {t("menu.shadowing.player.transcript.placeholder")}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

UserTranscript.displayName = "UserTranscript";
export default UserTranscript;