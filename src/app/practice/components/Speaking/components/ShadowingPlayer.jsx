"use client";

import React, { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaExclamationCircle } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import { cleanupAudioContext } from "../utils/audioAnalysis";
import { cleanupWorker } from "../utils/audioAnalysisWorkerHelper";
import { useDebounce } from "../hooks/useDebounce";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useRecording } from "../hooks/useRecording";
import { useMediaPlayback } from "../hooks/useMediaPlayback";
import { useScoreAnimation } from "../hooks/useScoreAnimation";
import { useRecordingTimer } from "../hooks/useRecordingTimer";
import { useAudioVisualizer } from "../hooks/useAudioVisualizer";
import { getReferenceText } from "../utils/shadowingHelpers";
import { DELAYS, ANIMATION_DURATION } from "../utils/shadowingConstants";
import PlayerHeader from "./PlayerHeader";
import MediaPlayer from "./MediaPlayer";
import RecordingControls from "./RecordingControls";
import ReferenceText from "./ReferenceText";
import UserTranscript from "./UserTranscript";
import MetricsDisplay from "./MetricsDisplay";
import rootStyles from "../styles/shadowing/player-root.module.scss";
import layoutStyles from "../styles/shadowing/player-layout.module.scss";
import headerStyles from "../styles/shadowing/player-header.module.scss";
import cardStyles from "../styles/shadowing/player-cards.module.scss";
import mediaCardStyles from "../styles/shadowing/player-mediaCard.module.scss";

/**
 * ShadowingPlayer Component
 * Main component for shadowing practice - orchestrates recording, playback, and analysis
 * 
 * Features:
 * - Real-time speech recognition and recording
 * - Audio visualization with level metering
 * - Automatic subtitle scrolling synced to media playback
 * - Performance-optimized animations
 * - Comprehensive error handling and recovery
 * - Memory leak prevention with proper cleanup
 * 
 * @param {Object} props - Component props
 * @param {Object} props.item - Video/audio item data
 * @param {string} [props.item.title] - Media title
 * @param {string} [props.item.description] - Media description
 * @param {string} [props.item.lang="en-US"] - Language code for speech recognition
 * @param {Array} [props.item.subtitles] - Array of subtitle objects with {start, text}
 * @param {string} [props.item.text] - Fallback reference text if no subtitles
 * @param {Function} [props.onBack] - Callback when back button is clicked
 */
const ShadowingPlayer = React.memo(function ShadowingPlayer({
  item = {},
  onBack = () => { },
}) {
  const { t } = useTranslation("speaking");
  const { shouldReduceAnimations } = usePerformanceMonitor();

  // State for component-level error handling
  const [componentError, setComponentError] = useState(null);

  // Refs for cleanup tracking
  const isMountedRef = useRef(true);

  // Extract and memoize reference text from item
  const referenceText = useMemo(() => {
    try {
      return getReferenceText(item) || "";
    } catch (error) {
      console.error("[ShadowingPlayer] Error getting reference text:", error);
      return "";
    }
  }, [item]);

  // Effect: Handle reference text errors
  useEffect(() => {
    if (!referenceText && item && (item.text || item.subtitles)) {
      setComponentError(
        t("menu.shadowing.player.errors.invalidReferenceText") || 
        "Invalid reference text"
      );
    }
  }, [referenceText, item, t]);

  // Memoize language with fallback
  const language = useMemo(() => item?.lang || "en-US", [item?.lang]);

  // Calculate animation duration based on device capabilities
  const animationDuration = useMemo(() => {
    const shouldReduce = shouldReduceAnimations();
    return shouldReduce
      ? ANIMATION_DURATION.REDUCED / 1000
      : ANIMATION_DURATION.FULL / 1000;
  }, [shouldReduceAnimations]);

  // Shared recording state - controls both recording and speech recognition
  const [isRecordingActive, setIsRecordingActive] = useState(false);

  // Speech recognition hook - controlled by recording state
  const {
    transcript,
    interimTranscript,
    error: recognitionError,
    recognitionRef,
    transcriptRef,
    forceUpdateTranscript,
  } = useSpeechRecognition(language, isRecordingActive);

  // Media playback hook
  const { isPlaying, togglePlay, audioRef } = useMediaPlayback();

  // Recording hook with proper dependencies
  const {
    isRecording,
    isPaused,
    recordBlob,
    mediaStream,
    analysis,
    isAnalyzing,
    error: recordingError,
    startRecording,
    stopRecording,
    pauseRecording,
    downloadRecording,
  } = useRecording({
    referenceText,
    recognitionRef,
    audioRef,
    transcriptRef,
    setIsRecordingActive,
    forceUpdateTranscript,
  });

  // Recording timer hook - uses values from recording hook
  const {
    duration: recordingDuration,
    formatTime,
    reset: resetTimer,
  } = useRecordingTimer(isRecording, isPaused);

  // Audio visualizer hook
  const audioLevels = useAudioVisualizer(isRecording, isPaused, mediaStream);

  // Debounced transcript for display - prevent excessive re-renders
  const debouncedTranscript = useDebounce(transcript, DELAYS.TRANSCRIPT_DEBOUNCE);

  // Score animation hook for smooth metric transitions
  const animatedScores = useScoreAnimation(analysis);

  // Refs for subtitle scrolling
  const transcriptScrollRef = useRef(null);
  const activeSubtitleIndexRef = useRef(-1);
  const lastScrollTimeRef = useRef(0);
  const scrollTimeoutRef = useRef(null);

  /**
   * Helper function to get error message with proper fallback handling
   * Prioritizes error message, then translation, then fallback
   * 
   * @param {Error|null} error - Error object
   * @param {string} translationKey - Translation key for i18n
   * @param {string} fallback - Fallback message if translation is missing
   * @returns {string} Error message
   */
  const getErrorMessage = useCallback((error, translationKey, fallback) => {
    const errorMessage = error?.message?.trim();
    if (errorMessage) {
      return errorMessage;
    }
    const translated = t(translationKey);
    return translated || fallback;
  }, [t]);

  /**
   * Enhanced recording start with error recovery
   */
  const handleStartRecording = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setComponentError(null);
      resetTimer();
      await startRecording();
    } catch (error) {
      console.error("[ShadowingPlayer] Error starting recording:", error);
      setComponentError(
        getErrorMessage(
          error,
          "menu.shadowing.player.errors.recordingStart",
          "Failed to start recording"
        )
      );
    }
  }, [startRecording, resetTimer, t]);

  /**
   * Enhanced recording stop with proper cleanup
   */
  const handleStopRecording = useCallback(() => {
    if (!isMountedRef.current) return;

    try {
      stopRecording();
      resetTimer();
    } catch (error) {
      console.error("[ShadowingPlayer] Error stopping recording:", error);
      setComponentError(
        getErrorMessage(
          error,
          "menu.shadowing.player.errors.recordingStop",
          "Failed to stop recording"
        )
      );
    }
  }, [stopRecording, resetTimer, t]);

  /**
   * Enhanced pause handling
   */
  const handlePauseRecording = useCallback(() => {
    if (!isMountedRef.current) return;

    try {
      pauseRecording();
    } catch (error) {
      console.error("[ShadowingPlayer] Error pausing recording:", error);
      setComponentError(
        getErrorMessage(
          error,
          "menu.shadowing.player.errors.recordingPause",
          "Failed to pause recording"
        )
      );
    }
  }, [pauseRecording, t]);

  /**
   * Enhanced download with error handling
   */
  const handleDownloadRecording = useCallback(() => {
    if (!isMountedRef.current || !recordBlob) return;

    try {
      downloadRecording();
    } catch (error) {
      console.error("[ShadowingPlayer] Error downloading recording:", error);
      setComponentError(
        getErrorMessage(
          error,
          "menu.shadowing.player.errors.downloadFailed",
          "Failed to download recording"
        )
      );
    }
  }, [downloadRecording, recordBlob, t]);

  /**
   * Optimized subtitle scrolling with throttling and intersection observer
   */
  useEffect(() => {
    const audio = audioRef.current;
    const scrollContainer = transcriptScrollRef.current;
    const subtitles = item?.subtitles;

    // Validation checks
    if (!audio || !scrollContainer || !Array.isArray(subtitles) || subtitles.length === 0) {
      return;
    }

    const throttleDelay = DELAYS.SUBTITLE_SCROLL_THROTTLE || 100;
    let animationFrameId = null;
    let isScrolling = false;

    /**
     * Find current subtitle index based on audio time
     */
    const findCurrentSubtitleIndex = (currentTime) => {
      // Binary search for better performance with large subtitle arrays
      if (subtitles.length > 50) {
        let left = 0;
        let right = subtitles.length - 1;

        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          const sub = subtitles[mid];
          const nextSub = subtitles[mid + 1];
          const start = sub?.start ?? 0;
          const end = nextSub?.start ?? Infinity;

          if (currentTime >= start && currentTime < end) {
            return mid;
          } else if (currentTime < start) {
            right = mid - 1;
          } else {
            left = mid + 1;
          }
        }
        return -1;
      }

      // Linear search for smaller arrays
      return subtitles.findIndex((sub, idx) => {
        const nextSub = subtitles[idx + 1];
        const start = sub?.start ?? 0;
        const end = nextSub?.start ?? Infinity;
        return currentTime >= start && currentTime < end;
      });
    };

    /**
     * Scroll to subtitle with smooth animation
     */
    const scrollToSubtitle = (index) => {
      if (isScrolling || index === activeSubtitleIndexRef.current) {
        return;
      }

      const subtitleElement = scrollContainer.querySelector(
        `[data-subtitle-index="${index}"]`
      );

      if (!subtitleElement) return;

      isScrolling = true;
      activeSubtitleIndexRef.current = index;

      // Remove active class from all subtitles
      const allSubtitles = scrollContainer.querySelectorAll(".subtitle-item");
      allSubtitles.forEach((el) => {
        if (el !== subtitleElement) {
          el.classList.remove("active");
        }
      });

      // Add active class to current subtitle
      subtitleElement.classList.add("active");

      // Scroll with smooth behavior
      try {
        subtitleElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest"
        });
      } catch (error) {
        // Fallback for browsers that don't support smooth scrolling
        console.warn("[ShadowingPlayer] Smooth scroll not supported:", error);
        subtitleElement.scrollIntoView(false);
      }

      // Reset scrolling flag after animation completes
      // Use a ref to track timeout for proper cleanup
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        isScrolling = false;
        scrollTimeoutRef.current = null;
      }, 300);
    };

    /**
     * Throttled time update handler using RAF for better performance
     */
    const handleTimeUpdate = () => {
      if (animationFrameId) return;

      const now = Date.now();
      if (now - lastScrollTimeRef.current < throttleDelay) {
        return;
      }

      animationFrameId = requestAnimationFrame(() => {
        animationFrameId = null;

        if (!isMountedRef.current) return;

        lastScrollTimeRef.current = now;
        const currentTime = audio.currentTime;

        // Handle edge cases
        if (isNaN(currentTime) || currentTime < 0) {
          return;
        }

        const currentIndex = findCurrentSubtitleIndex(currentTime);

        if (currentIndex !== -1 && currentIndex !== activeSubtitleIndexRef.current) {
          scrollToSubtitle(currentIndex);
        }
      });
    };

    // Attach event listener
    audio.addEventListener("timeupdate", handleTimeUpdate);

    // Cleanup function
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      // Clear scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }

      // Clear active subtitle
      if (scrollContainer) {
        const allSubtitles = scrollContainer.querySelectorAll(".subtitle-item");
        allSubtitles.forEach((el) => el.classList.remove("active"));
      }

      activeSubtitleIndexRef.current = -1;
    };
  }, [audioRef, item?.subtitles]);

  /**
   * Combine all errors with priority handling
   */
  const error = useMemo(() => {
    return componentError || recognitionError || recordingError;
  }, [componentError, recognitionError, recordingError]);

  // Refs to capture current values for cleanup
  const mediaStreamRef = useRef(mediaStream);
  const isRecordingRef = useRef(isRecording);
  const stopRecordingRef = useRef(stopRecording);
  const audioRefForCleanup = useRef(audioRef);

  // Keep refs in sync with current values
  useEffect(() => {
    mediaStreamRef.current = mediaStream;
    isRecordingRef.current = isRecording;
    stopRecordingRef.current = stopRecording;
    audioRefForCleanup.current = audioRef;
  }, [mediaStream, isRecording, stopRecording, audioRef]);

  /**
   * Effect: Master cleanup on unmount only
   * Ensures all resources are properly released
   * Note: Empty dependency array ensures cleanup only runs on unmount, not on state changes
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Cleanup audio context and workers
      try {
        cleanupAudioContext();
      } catch (error) {
        console.error("[ShadowingPlayer] Audio context cleanup error:", error);
      }

      try {
        // cleanupWorker() will check if analysis is in progress internally
        // and skip cleanup if needed (worker will be cleaned up via idle timeout)
        cleanupWorker();
      } catch (error) {
        console.error("[ShadowingPlayer] Worker cleanup error:", error);
      }

      // Cleanup media stream tracks (use ref to get current value)
      const currentMediaStream = mediaStreamRef.current;
      if (currentMediaStream) {
        try {
          const tracks = currentMediaStream.getTracks();
          tracks.forEach((track) => {
            try {
              track.stop();
            } catch (error) {
              console.error("[ShadowingPlayer] Track stop error:", error);
            }
          });
        } catch (error) {
          console.error("[ShadowingPlayer] Media stream cleanup error:", error);
        }
      }

      // Stop any ongoing recording (use ref to get current value)
      if (isRecordingRef.current) {
        try {
          stopRecordingRef.current();
        } catch (error) {
          console.error("[ShadowingPlayer] Stop recording on unmount error:", error);
        }
      }

      // Pause media playback (use ref to get current value)
      const currentAudioRef = audioRefForCleanup.current;
      if (currentAudioRef?.current && !currentAudioRef.current.paused) {
        try {
          currentAudioRef.current.pause();
        } catch (error) {
          console.error("[ShadowingPlayer] Audio pause error:", error);
        }
      }
    };
  }, []); // Empty array = cleanup only runs on unmount

  /**
   * Effect: Prevent recording and playback at the same time
   */
  useEffect(() => {
    if (isRecording && isPlaying) {
      try {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
      } catch (error) {
        console.error("[ShadowingPlayer] Error pausing audio during recording:", error);
      }
    }
  }, [isRecording, isPlaying, audioRef]);

  /**
   * Effect: Auto-pause recording if media starts playing
   */
  useEffect(() => {
    if (isPlaying && isRecording && !isPaused) {
      try {
        pauseRecording();
      } catch (error) {
        console.error("[ShadowingPlayer] Error pausing recording when media plays:", error);
      }
    }
  }, [isPlaying, isRecording, isPaused, pauseRecording]);

  /**
   * Memoized animation variants for error banner
   */
  const errorBannerVariants = useMemo(() => ({
    initial: { opacity: 0, y: -20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 }
  }), []);

  /**
   * Memoized transition config
   */
  const errorBannerTransition = useMemo(() => ({
    type: "spring",
    stiffness: 300,
    damping: 25,
    duration: animationDuration
  }), [animationDuration]);

  /**
   * Memoized media card animation
   */
  const mediaCardAnimation = useMemo(() => ({
    initial: { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0 },
    transition: {
      delay: 0.2,
      duration: animationDuration,
      type: "spring"
    }
  }), [animationDuration]);

  return (
    <div className={rootStyles["shadowing-player-root"]}>
      <div className={rootStyles["shadowing-player-container"]}>
        {/* Header Section */}
        <PlayerHeader
          title={item?.title || t("menu.shadowing.player.title")}
          description={item?.description || ""}
          onBack={onBack}
          animationDuration={animationDuration}
          shouldReduceAnimations={shouldReduceAnimations}
        />

        {/* Error Banner with improved accessibility */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error-banner"
              variants={errorBannerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={errorBannerTransition}
              className={headerStyles["error-banner"]}
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              <FaExclamationCircle size={20} aria-hidden="true" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Layout */}
        <div className={layoutStyles["new-horizontal-layout"]}>
          {/* Top Row: Media + Reference Text */}
          <div className={layoutStyles["top-row-horizontal"]}>
            {/* Left: Media Card with Recording Controls */}
            <motion.div
              {...mediaCardAnimation}
              className={`${cardStyles.card} ${mediaCardStyles["media-card-new"]}`}
            >
              <MediaPlayer
                item={item}
                isPlaying={isPlaying}
                onTogglePlay={togglePlay}
                shouldReduceAnimations={shouldReduceAnimations}
                audioRef={audioRef}
              />

              <RecordingControls
                isRecording={isRecording}
                isPaused={isPaused}
                recordBlob={recordBlob}
                recordingDuration={recordingDuration}
                audioLevels={audioLevels}
                formatTime={formatTime}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                onPauseRecording={handlePauseRecording}
                onDownload={handleDownloadRecording}
              />
            </motion.div>

            {/* Right: Reference Text */}
            <ReferenceText
              item={item}
              referenceText={referenceText}
              transcriptScrollRef={transcriptScrollRef}
            />
          </div>

          {/* Middle Row: User Transcript */}
          <UserTranscript
            isRecording={isRecording}
            transcript={debouncedTranscript}
            interimTranscript={interimTranscript}
            analysis={analysis}
            referenceText={referenceText}
            recordBlob={recordBlob}
          />

          {/* Bottom Row: Metrics Display */}
          <MetricsDisplay
            analysis={analysis}
            isAnalyzing={isAnalyzing}
            animatedScores={animatedScores}
          />
        </div>
      </div>
    </div>
  );
});

ShadowingPlayer.displayName = "ShadowingPlayer";

export default ShadowingPlayer;