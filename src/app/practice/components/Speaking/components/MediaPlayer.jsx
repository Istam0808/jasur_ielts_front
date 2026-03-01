"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { FaVolumeUp, FaPlay, FaPause } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { scrollToTop } from "@/utils/common";
import styles from "../styles/shadowing/player-mediaCard.module.scss";
import { getYouTubeVideoId } from "@/utils/youtubeHelpers";

// YouTube Player States
const YOUTUBE_PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
};

// Configuration constants
const API_LOAD_TIMEOUT = 10000; // 10 seconds
const PLAYER_INIT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

const MediaPlayer = React.memo(function MediaPlayer({
  item,
  isPlaying,
  onTogglePlay,
  shouldReduceAnimations,
  audioRef,
  className = "",
}) {
  const { t } = useTranslation("speaking");

  // Refs
  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const retryCountRef = useRef(0);
  const currentVideoIdRef = useRef(null);
  const apiCheckIntervalRef = useRef(null);
  const initTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const wasPlayingBeforeHiddenRef = useRef(false);
  const isInitializingRef = useRef(false);
  const userInteractedRef = useRef(false);

  // State
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const [playerError, setPlayerError] = useState(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Extract YouTube ID from videoUrl
  const youtubeVideoId = useMemo(() => {
    if (!item?.videoUrl) return null;
    return getYouTubeVideoId(item.videoUrl);
  }, [item?.videoUrl]);

  // Memoized values - CHANGED: Check youtubeVideoId instead of item?.youtubeId
  const hasYouTubeContent = useMemo(() => Boolean(youtubeVideoId), [youtubeVideoId]);
  const hasAudioContent = useMemo(() => Boolean(item?.audioUrl), [item?.audioUrl]);
  const shouldReduceMotion = useMemo(() =>
    typeof shouldReduceAnimations === 'function' ? shouldReduceAnimations() : false,
    [shouldReduceAnimations]
  );

  // Build YouTube embed URL
  const youtubeEmbedUrl = useMemo(() => {
    if (!youtubeVideoId) return "";

    let origin = "";
    if (typeof window !== "undefined" && window.location) {
      const protocol = window.location.protocol || "https:";
      const host = window.location.host;
      origin = host ? `${protocol}//${host}` : "";
    }

    const baseUrl = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}`;
    const params = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      showinfo: "0",
      controls: "0",
      iv_load_policy: "3",
      enablejsapi: "1",
      playsinline: "1",
      fs: "0",
      cc_load_policy: "0",
      disablekb: "1",
      ...(origin && { origin }),
    });

    return `${baseUrl}?${params.toString()}`;
  }, [youtubeVideoId]);

  /**
   * Safely calls YouTube player methods with error handling
   */
  const safePlayerCall = useCallback((methodName, ...args) => {
    if (!playerRef.current) {
      console.debug(`YouTube player not available for ${methodName}`);
      return false;
    }

    try {
      const method = playerRef.current[methodName];
      if (typeof method === "function") {
        method.apply(playerRef.current, args);
        return true;
      }
      console.debug(`YouTube player method ${methodName} not available`);
      return false;
    } catch (error) {
      // Ignore postMessage origin errors - they don't affect functionality
      if (error.message?.includes("postMessage")) {
        console.debug(`YouTube postMessage error in ${methodName} (non-critical):`, error.message);
      } else {
        console.error(`Error calling YouTube player ${methodName}:`, error);
      }
      return false;
    }
  }, []);

  /**
   * Handles YouTube player state changes
   */
  const handlePlayerStateChange = useCallback((event) => {
    try {
      const state = event.data;
      setIsVideoPlaying(state === YOUTUBE_PLAYER_STATE.PLAYING);
    } catch (error) {
      console.debug("Error handling YouTube player state change:", error);
    }
  }, []);

  /**
   * Handles YouTube player errors
   */
  const handlePlayerError = useCallback((event) => {
    const errorCode = event.data;
    const errorMessages = {
      2: "Invalid parameter value",
      5: "HTML5 player error",
      100: "Video not found or private",
      101: "Video owner does not allow embedding",
      150: "Video owner does not allow embedding",
    };

    const message = errorMessages[errorCode] || `Unknown error (code: ${errorCode})`;
    console.warn("YouTube player error:", message);
    setPlayerError(message);
  }, []);

  /**
   * Handles custom play button click with autoplay policy handling
   */
  const handleCustomPlayClick = useCallback(() => {
    scrollToTop();
    
    if (!playerRef.current || !isPlayerReady) {
      console.debug("Player not ready for playback");
      return;
    }

    // Mark user interaction for visibility resume logic
    userInteractedRef.current = true;

    try {
      // Unmute before playing (in case it was muted for autoplay)
      safePlayerCall("unMute");
      
      const success = safePlayerCall("playVideo");
      if (success) {
        setIsVideoPlaying(true);
      } else {
        // Player might not be ready or autoplay blocked
        // The state change handler will update isVideoPlaying when playback actually starts
        console.debug("Play command sent, waiting for state change");
      }
    } catch (error) {
      // Handle autoplay policy errors gracefully
      if (error.name === "NotAllowedError" || error.message?.includes("autoplay")) {
        console.debug("Autoplay blocked by browser policy");
        setPlayerError("Please click the play button to start the video");
        // Clear error after a moment
        setTimeout(() => setPlayerError(null), 3000);
      } else {
        console.debug("Error playing video:", error);
      }
    }
  }, [safePlayerCall, isPlayerReady]);

  /**
   * Cleans up all timers and intervals
   */
  const cleanupTimers = useCallback(() => {
    if (apiCheckIntervalRef.current) {
      clearInterval(apiCheckIntervalRef.current);
      apiCheckIntervalRef.current = null;
    }
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  /**
   * Destroys player instance and cleans up (centralized destruction)
   */
  const destroyPlayer = useCallback(() => {
    return new Promise((resolve) => {
      // Clear all timers first
      cleanupTimers();
      
      if (playerRef.current) {
        try {
          if (typeof playerRef.current.destroy === "function") {
            playerRef.current.destroy();
          }
        } catch (e) {
          console.debug("Error destroying YouTube player:", e);
        }
        playerRef.current = null;
      }
      
      setIsPlayerReady(false);
      setIsVideoPlaying(false);
      isInitializingRef.current = false;
      
      // Small delay to ensure destruction is complete
      setTimeout(resolve, 100);
    });
  }, [cleanupTimers]);

  /**
   * Verifies player is functional after onReady
   */
  const verifyPlayerFunctionality = useCallback((player) => {
    try {
      if (!player) return false;

      // Check if player methods are available
      if (typeof player.getPlayerState !== "function" ||
          typeof player.playVideo !== "function") {
        console.debug("Player methods not available");
        return false;
      }

      // Check player state (should not be in error state - UNSTARTED is -1, which is normal)
      const state = player.getPlayerState();
      // UNSTARTED (-1) is normal for a newly initialized player
      if (state !== YOUTUBE_PLAYER_STATE.UNSTARTED && 
          state !== YOUTUBE_PLAYER_STATE.CUED && 
          state !== YOUTUBE_PLAYER_STATE.PAUSED) {
        // If state is something unexpected, log but don't fail
        console.debug(`Player state: ${state}`);
      }

      // Verify video ID matches using getVideoData (more reliable than duration)
      try {
        if (typeof player.getVideoData === "function") {
          const videoData = player.getVideoData();
          if (videoData?.video_id && videoData.video_id !== youtubeVideoId) {
            console.debug("Player video ID mismatch");
            return false;
          }
        }
      } catch (e) {
        // getVideoData might not be available immediately, that's okay
        console.debug("getVideoData not available yet (non-critical)");
      }

      return true;
    } catch (error) {
      console.debug("Error verifying player functionality:", error);
      return false;
    }
  }, [youtubeVideoId]);

  /**
   * Load YouTube IFrame API with singleton pattern (prevents race conditions)
   */
  useEffect(() => {
    if (!hasYouTubeContent) {
      setIsApiReady(false);
      return;
    }

    // Check if API is already loaded
    if (window.YT?.Player) {
      setIsApiReady(true);
      return;
    }

    // Set up timeout for API loading
    const apiTimeout = setTimeout(() => {
      if (!window.YT?.Player) {
        console.error("YouTube API failed to load within timeout");
        setPlayerError("Failed to load video player. Please refresh the page.");
      }
    }, API_LOAD_TIMEOUT);

    // Use singleton pattern to prevent race conditions
    if (!window.__YT_API_LOADING__) {
      window.__YT_API_LOADING__ = true;

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
      if (!existingScript) {
        // Load the API script
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;

        script.onerror = () => {
          window.__YT_API_LOADING__ = false;
          clearTimeout(apiTimeout);
          console.error("Failed to load YouTube API script");
          setPlayerError("Failed to load video player. Please check your connection.");
        };

        document.head.appendChild(script);
      }

      // Set up global callback (singleton - only one instance sets this)
      window.onYouTubeIframeAPIReady = () => {
        window.__YT_API_READY__ = true;
        window.__YT_API_LOADING__ = false;
        clearTimeout(apiTimeout);
        // Dispatch event for all listeners
        document.dispatchEvent(new Event("yt-api-ready"));
      };
    }

    // Listen for API ready event
    const handleApiReady = () => {
      clearTimeout(apiTimeout);
      setIsApiReady(true);
    };

    // Check if already ready
    if (window.__YT_API_READY__) {
      clearTimeout(apiTimeout);
      setIsApiReady(true);
    } else {
      // Wait for API ready event
      document.addEventListener("yt-api-ready", handleApiReady, { once: true });
    }

    // Polling fallback (in case event doesn't fire)
    apiCheckIntervalRef.current = setInterval(() => {
      if (window.YT?.Player) {
        clearTimeout(apiTimeout);
        setIsApiReady(true);
        clearInterval(apiCheckIntervalRef.current);
        apiCheckIntervalRef.current = null;
      }
    }, 100);

    return () => {
      clearTimeout(apiTimeout);
      if (apiCheckIntervalRef.current) {
        clearInterval(apiCheckIntervalRef.current);
        apiCheckIntervalRef.current = null;
      }
      document.removeEventListener("yt-api-ready", handleApiReady);
    };
  }, [hasYouTubeContent]);

  /**
   * Initialize YouTube player when API is ready (with retry mechanism)
   */
  useEffect(() => {
    // Skip if conditions not met
    if (!hasYouTubeContent || !isApiReady || !iframeRef.current) {
      return;
    }

    // Skip if page is hidden (visibility API)
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }

    // Skip if already initializing
    if (isInitializingRef.current) {
      return;
    }

    // If video ID changed, cleanup old player first
    if (currentVideoIdRef.current !== null && currentVideoIdRef.current !== youtubeVideoId) {
      destroyPlayer().then(() => {
        // Reset state for new video
        retryCountRef.current = 0;
        setPlayerError(null);
        setIsPlayerReady(false);
        currentVideoIdRef.current = youtubeVideoId;
      });
      return;
    }

    // Mark as initializing and set current video ID
    isInitializingRef.current = true;
    currentVideoIdRef.current = youtubeVideoId;

    const initializePlayer = async () => {
      // Check if page became hidden during initialization
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        isInitializingRef.current = false;
        return;
      }

      try {
        const iframe = iframeRef.current;
        if (!iframe || currentVideoIdRef.current !== youtubeVideoId) {
          isInitializingRef.current = false;
          return;
        }

        // Ensure iframe has an ID
        if (!iframe.id) {
          iframe.id = `youtube-player-${youtubeVideoId}-${Date.now()}`;
        }

        // Verify API availability
        if (!window.YT?.Player) {
          console.debug("YouTube API not available");
          handleInitializationFailure();
          return;
        }

        // Initialize player with robust error handling
        try {
          const playerInstance = new window.YT.Player(iframe.id, {
            events: {
              onReady: (event) => {
                try {
                  // Clear initialization timeout first
                  if (initTimeoutRef.current) {
                    clearTimeout(initTimeoutRef.current);
                    initTimeoutRef.current = null;
                  }

                  const player = event.target;
                  
                  // Verify player is functional
                  if (!verifyPlayerFunctionality(player)) {
                    console.debug("Player verification failed");
                    handleInitializationFailure();
                    return;
                  }

                  // Clear any existing errors
                  setPlayerError(null);
                  setIsPlayerReady(true);
                  isInitializingRef.current = false;
                  retryCountRef.current = 0; // Reset retry count on success

                  console.debug("YouTube player initialized and verified successfully");
                } catch (error) {
                  console.error("Error in onReady callback:", error);
                  handleInitializationFailure();
                }
              },
              onStateChange: handlePlayerStateChange,
              onError: handlePlayerError,
            },
          });

          playerRef.current = playerInstance;

          // Set timeout for player initialization
          initTimeoutRef.current = setTimeout(() => {
            if (!isPlayerReady && playerRef.current) {
              console.debug("Player initialization timeout");
              handleInitializationFailure();
            }
          }, PLAYER_INIT_TIMEOUT);

        } catch (playerError) {
          // Handle initialization errors gracefully
          if (playerError.message?.includes("postMessage")) {
            console.debug("YouTube postMessage error during initialization (non-critical):", playerError.message);
            // Don't treat postMessage errors as failures
            isInitializingRef.current = false;
          } else {
            console.error("Error creating YouTube player:", playerError);
            handleInitializationFailure();
          }
        }
      } catch (error) {
        console.error("Error initializing YouTube player:", error);
        handleInitializationFailure();
      }
    };

    const handleInitializationFailure = () => {
      isInitializingRef.current = false;
      
      // Check if we should retry
      if (retryCountRef.current < MAX_RETRIES && currentVideoIdRef.current === youtubeVideoId) {
        const retryDelay = RETRY_DELAYS[retryCountRef.current];
        retryCountRef.current += 1;
        
        console.debug(`Retrying player initialization (attempt ${retryCountRef.current}/${MAX_RETRIES}) after ${retryDelay}ms`);
        
        retryTimeoutRef.current = setTimeout(() => {
          if (currentVideoIdRef.current === youtubeVideoId && hasYouTubeContent && isApiReady) {
            initializePlayer();
          }
        }, retryDelay);
      } else {
        // Max retries reached or video changed
        setPlayerError("Failed to load video player. Please try refreshing the page.");
        setIsPlayerReady(false);
        retryCountRef.current = 0;
      }
    };

    // Start initialization
    initializePlayer();

    return () => {
      // Cleanup: stop initialization and destroy player if needed
      cleanupTimers();
      isInitializingRef.current = false;
      
      // Only destroy if video ID changed or component unmounting
      // Don't destroy on every effect run to avoid double-destroy
      if (currentVideoIdRef.current !== youtubeVideoId || !hasYouTubeContent) {
        destroyPlayer();
      }
    };
  }, [hasYouTubeContent, isApiReady, youtubeVideoId, handlePlayerStateChange, handlePlayerError, verifyPlayerFunctionality, destroyPlayer, cleanupTimers]);

  /**
   * Reset state when YouTube ID changes
   */
  useEffect(() => {
    if (currentVideoIdRef.current !== youtubeVideoId) {
      retryCountRef.current = 0;
      setPlayerError(null);
      setIsPlayerReady(false);
      isInitializingRef.current = false;
      userInteractedRef.current = false;
      currentVideoIdRef.current = youtubeVideoId;
    }
  }, [youtubeVideoId]);

  /**
   * Handle page visibility changes (pause/resume player)
   */
  useEffect(() => {
    if (!hasYouTubeContent || !isPlayerReady) return;

    const handleVisibilityChange = () => {
      if (!playerRef.current) return;

      if (document.visibilityState === "hidden") {
        // Page became hidden - pause if playing
        try {
          const state = playerRef.current.getPlayerState();
          if (state === YOUTUBE_PLAYER_STATE.PLAYING) {
            wasPlayingBeforeHiddenRef.current = true;
            safePlayerCall("pauseVideo");
          } else {
            wasPlayingBeforeHiddenRef.current = false;
          }
        } catch (error) {
          console.debug("Error pausing player on visibility change:", error);
        }
      } else if (document.visibilityState === "visible") {
        // Page became visible - resume only if user previously interacted
        if (wasPlayingBeforeHiddenRef.current && userInteractedRef.current) {
          wasPlayingBeforeHiddenRef.current = false;
          // Small delay to ensure page is fully visible
          setTimeout(() => {
            if (playerRef.current && document.visibilityState === "visible") {
              // Unmute before resuming (in case it was muted)
              safePlayerCall("unMute");
              safePlayerCall("playVideo");
            }
          }, 100);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasYouTubeContent, isPlayerReady, safePlayerCall]);


  /**
   * Render YouTube player
   */
  const renderYouTubePlayer = () => (
    <div className={styles["youtube-wrapper"]}>
      <motion.iframe
        key={youtubeVideoId}
        ref={iframeRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        title={`${t("menu.shadowing.player.media.referenceAudio")}: ${item.title || t("menu.shadowing.player.title")}`}
        className={styles["youtube-iframe-clean"]}
        src={youtubeEmbedUrl}
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        aria-label={`${t("menu.shadowing.player.media.referenceAudio")}: ${item.title || t("menu.shadowing.player.title")}`}
      />

      {/* Custom play button overlay */}
      {!isVideoPlaying && (
        <div className={styles["youtube-play-overlay"]}>
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCustomPlayClick}
            className={styles["youtube-custom-play-button"]}
            aria-label={t("menu.shadowing.player.media.playButton")}
          >
            <FaPlay className={styles["play-icon"]} aria-hidden="true" />
          </motion.button>
        </div>
      )}

      {/* Overlay divs to block interaction with YouTube UI elements */}
      <div className={styles["youtube-overlay-top-right"]} aria-hidden="true" />
      <div className={styles["youtube-overlay-bottom-right"]} aria-hidden="true" />
      <div className={styles["youtube-overlay-top-left"]} aria-hidden="true" />

      {/* Error message */}
      {playerError && (
        <div
          className={styles["youtube-error"]}
          role="alert"
          aria-live="polite"
        >
          {playerError}
        </div>
      )}
    </div>
  );

  /**
   * Render audio visualizer
   */
  const renderAudioVisualizer = () => (
    <div className={styles["audio-visualizer"]}>
      {/* Waveform visualization */}
      <div className={styles.waveform} aria-hidden="true">
        {[...Array(14)].map((_, i) => (
          <motion.div
            key={i}
            className={styles["wave-bar"]}
            animate={{
              scaleY: isPlaying && !shouldReduceMotion ? [0.3, 1.8, 0.3] : 0.4,
            }}
            transition={{
              duration: shouldReduceMotion ? 0.3 : 0.6,
              repeat: shouldReduceMotion ? 0 : Infinity,
              delay: shouldReduceMotion ? 0 : i * 0.08,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Audio label */}
      <div className={styles["audio-label"]}>
        <FaVolumeUp size={24} aria-hidden="true" />
        <span>{t("menu.shadowing.player.media.referenceAudio")}</span>
      </div>

      {/* Play/pause button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onTogglePlay}
        className={styles["play-button"]}
        aria-label={
          isPlaying
            ? t("menu.shadowing.player.media.pauseButton")
            : t("menu.shadowing.player.media.playButton")
        }
      >
        {isPlaying ? (
          <FaPause aria-hidden="true" />
        ) : (
          <FaPlay style={{ marginLeft: "4px" }} aria-hidden="true" />
        )}
      </motion.button>
    </div>
  );

  return (
    <div className={`${styles["media-display"]} ${className}`}>
      {hasYouTubeContent ? renderYouTubePlayer() : renderAudioVisualizer()}

      {/* Hidden audio element for audio playback */}
      {!hasYouTubeContent && hasAudioContent && (
        <audio
          ref={audioRef}
          src={item.audioUrl}
          preload="metadata"
          style={{ display: "none" }}
          aria-hidden="true"
        />
      )}
    </div>
  );
});

MediaPlayer.displayName = "MediaPlayer";

export default MediaPlayer;