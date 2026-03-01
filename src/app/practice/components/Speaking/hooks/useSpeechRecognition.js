import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { extractUserFriendlyError } from "../utils/audioAnalysis";
import { DELAYS } from "../utils/shadowingConstants";

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

/**
 * Detects if the current device is an Android device
 * @returns {boolean} True if device is Android
 */
const isAndroidDevice = () => {
  if (typeof window === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
};

/**
 * Recognition states for better state machine management
 */
const RecognitionState = Object.freeze({
  IDLE: "idle",
  STARTING: "starting",
  ACTIVE: "active",
  STOPPING: "stopping",
  ERROR: "error",
});

/**
 * Error types for categorized error handling
 */
const ErrorType = Object.freeze({
  NOT_ALLOWED: "not-allowed",
  ABORTED: "aborted",
  NO_SPEECH: "no-speech",
  AUDIO_CAPTURE: "audio-capture",
  NETWORK: "network",
  NOT_SUPPORTED: "not-supported",
  LANGUAGE_NOT_SUPPORTED: "language-not-supported",
});

/**
 * Custom hook for managing speech recognition
 * Handles SpeechRecognition API initialization, transcript processing, and error handling
 * 
 * Enhanced with:
 * - Proper state machine for recognition lifecycle
 * - Race condition prevention
 * - Memory leak safeguards
 * - Mobile-specific optimizations
 * - Comprehensive error handling
 * - Performance optimizations
 * 
 * @param {string} language - Language code for speech recognition (default: "en-US")
 * @param {boolean} isRecordingActive - Whether recording is currently active (controls recognition lifecycle)
 * @returns {Object} Speech recognition state and controls
 * @returns {string} transcript - Final transcript text
 * @returns {string} interimTranscript - Interim (partial) transcript text
 * @returns {string|null} error - Error message if recognition fails
 * @returns {React.RefObject} recognitionRef - Ref to the SpeechRecognition instance
 * @returns {React.RefObject} transcriptRef - Ref to the current transcript (for immediate access)
 */
export function useSpeechRecognition(language = "en-US", isRecordingActive = false) {
  const { t } = useTranslation("speaking");
  
  // State management
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState(null);

  // Core refs
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const isMountedRef = useRef(true);
  
  // State machine refs
  const recognitionStateRef = useRef(RecognitionState.IDLE);
  const isRecordingActiveRef = useRef(isRecordingActive);
  const previousRecordingStateRef = useRef(isRecordingActive);
  
  // Processing refs
  const lastFinalTranscriptIndexRef = useRef(0);
  const debounceTimerRef = useRef(null);
  const errorRef = useRef(null);
  
  // Restart control refs (prevent rapid restart loops)
  const restartAttemptCountRef = useRef(0);
  const lastRestartTimeRef = useRef(0);
  const restartTimeoutRef = useRef(null);

  // Constants
  const MAX_RESTART_ATTEMPTS = 3;
  const RESTART_COOLDOWN_MS = 1000; // Minimum time between restarts
  const RESTART_RESET_WINDOW_MS = 5000; // Reset attempt counter after this time

  // Device detection - memoized once
  const isMobile = useMemo(() => isMobileDevice(), []);

  // Get appropriate debounce delay based on device type
  const debounceDelay = useMemo(
    () => (isMobile ? DELAYS.SPEECH_RECOGNITION_DEBOUNCE_MOBILE : DELAYS.SPEECH_RECOGNITION_DEBOUNCE),
    [isMobile]
  );

  /**
   * Safely updates recognition state
   */
  const updateRecognitionState = useCallback((newState) => {
    recognitionStateRef.current = newState;
  }, []);

  /**
   * Checks if we can attempt a restart based on rate limiting
   */
  const canAttemptRestart = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRestart = now - lastRestartTimeRef.current;
    
    // Reset attempt counter if enough time has passed
    if (timeSinceLastRestart > RESTART_RESET_WINDOW_MS) {
      restartAttemptCountRef.current = 0;
    }
    
    // Check cooldown period
    if (timeSinceLastRestart < RESTART_COOLDOWN_MS) {
      return false;
    }
    
    // Check attempt limit
    if (restartAttemptCountRef.current >= MAX_RESTART_ATTEMPTS) {
      console.warn("Max restart attempts reached. Pausing auto-restart.");
      return false;
    }
    
    return true;
  }, []);

  /**
   * Attempts to restart recognition with rate limiting
   */
  const attemptRestart = useCallback(() => {
    const recognition = recognitionRef.current;
    
    if (
      !recognition ||
      !isMountedRef.current ||
      !isRecordingActiveRef.current ||
      errorRef.current ||
      recognitionStateRef.current === RecognitionState.ACTIVE ||
      recognitionStateRef.current === RecognitionState.STARTING
    ) {
      return;
    }

    if (!canAttemptRestart()) {
      return;
    }

    try {
      updateRecognitionState(RecognitionState.STARTING);
      recognition.start();
      
      restartAttemptCountRef.current++;
      lastRestartTimeRef.current = Date.now();
    } catch (e) {
      // InvalidStateError means already started, which is fine
      if (e.name === "InvalidStateError") {
        updateRecognitionState(RecognitionState.ACTIVE);
      } else {
        console.error("Failed to restart recognition:", e);
        updateRecognitionState(RecognitionState.ERROR);
      }
    }
  }, [canAttemptRestart, updateRecognitionState]);

  /**
   * Clears all pending timers
   */
  const clearTimers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  /**
   * Memoized error handler with comprehensive error categorization
   */
  const handleError = useCallback((e) => {
    if (!isMountedRef.current) return;

    const errorType = e.error;
    
    // Handle specific error types
    switch (errorType) {
      case ErrorType.NOT_ALLOWED:
        const permissionError = t("menu.shadowing.player.errors.microphoneDenied");
        setError(permissionError);
        errorRef.current = permissionError;
        updateRecognitionState(RecognitionState.ERROR);
        break;
        
      case ErrorType.ABORTED:
        // Aborted errors are normal during cleanup/stop, ignore them
        // Don't change state as this is expected
        break;
        
      case ErrorType.NO_SPEECH:
        // No-speech is normal in continuous mode
        // On mobile, we're more conservative with restarts
        // The onend handler will manage restart logic
        break;
        
      case ErrorType.AUDIO_CAPTURE:
        const audioError = "Unable to capture audio. Please check your microphone.";
        setError(audioError);
        errorRef.current = audioError;
        updateRecognitionState(RecognitionState.ERROR);
        break;
        
      case ErrorType.NETWORK:
        const networkError = "Network error occurred. Please check your connection.";
        setError(networkError);
        errorRef.current = networkError;
        updateRecognitionState(RecognitionState.ERROR);
        break;
        
      case ErrorType.NOT_SUPPORTED:
      case ErrorType.LANGUAGE_NOT_SUPPORTED:
        const supportError = extractUserFriendlyError(errorType) || 
          "Speech recognition is not supported for this language.";
        setError(supportError);
        errorRef.current = supportError;
        updateRecognitionState(RecognitionState.ERROR);
        break;
        
      default:
        const errorMessage = extractUserFriendlyError(errorType);
        if (errorMessage) {
          setError(errorMessage);
          errorRef.current = errorMessage;
          updateRecognitionState(RecognitionState.ERROR);
        }
        break;
    }
  }, [t, updateRecognitionState]);

  /**
   * Memoized result handler with optimized transcript processing
   */
  const handleResult = useCallback((event) => {
    const isAndroid = isAndroidDevice();
    const currentState = recognitionStateRef.current;
    const isActive = isRecordingActiveRef.current;
    
    console.log("[useSpeechRecognition.handleResult] Called", {
      hasResults: !!event?.results,
      resultsLength: event?.results?.length,
      isRecordingActive: isActive,
      recognitionState: currentState,
      isMounted: isMountedRef.current,
      isAndroid: isAndroid
    });
    
    // Guard clauses - relaxed for Android
    // On Android, results may arrive slightly after state changes, so we allow processing
    // even when state is not ACTIVE to capture late-arriving results
    if (!isMountedRef.current) {
      console.log("[useSpeechRecognition.handleResult] Blocked: component not mounted");
      return;
    }
    
    // For Android: allow processing if recording is active, even if state is not ACTIVE
    // For other devices: require ACTIVE state
    if (isAndroid) {
      if (!isActive) {
        console.log("[useSpeechRecognition.handleResult] Blocked on Android: recording not active", {
          recognitionState: currentState,
          isRecordingActive: isActive
        });
        return;
      }
      // Android: process results even if state is not ACTIVE (captures late results)
      console.log("[useSpeechRecognition.handleResult] Android: Processing results despite state", {
        recognitionState: currentState,
        isRecordingActive: isActive
      });
    } else {
      // Non-Android: strict guard clauses
      if (
        currentState !== RecognitionState.ACTIVE ||
        !isActive
      ) {
        console.log("[useSpeechRecognition.handleResult] Blocked by guard clause", {
          recognitionState: currentState,
          isRecordingActive: isActive
        });
        return;
      }
    }

    // Early exit if no results
    if (!event.results || event.results.length === 0) {
      console.log("[useSpeechRecognition.handleResult] No results in event");
      return;
    }

    let interim = "";
    
    // Build complete transcript from all final results
    // This is more efficient than concatenating in the loop
    const finalParts = [];
    
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      
      if (!result || !result[0]) continue;
      
      const text = result[0].transcript;
      
      if (result.isFinal) {
        finalParts.push(text);
        // Update the index only for processed final results
        if (i >= lastFinalTranscriptIndexRef.current) {
          lastFinalTranscriptIndexRef.current = i + 1;
        }
      } else {
        // Collect interim results (typically only the last result is interim)
        interim += text;
      }
    }

    // Construct complete transcript
    const completeTranscript = finalParts.join(" ");
    const currentFullTranscript = (completeTranscript + (interim ? " " + interim : "")).trim();

    // Update only if there's actual content
    if (currentFullTranscript) {
      // Update ref immediately for synchronous access
      // CRITICAL: Always update transcriptRef with latest text, especially for Android
      transcriptRef.current = currentFullTranscript;
      
      console.log("[useSpeechRecognition.handleResult] Updated transcriptRef", {
        isAndroid: isAndroid,
        length: currentFullTranscript.length,
        hasFinal: completeTranscript.length > 0,
        hasInterim: interim.length > 0,
        preview: currentFullTranscript.substring(0, 100)
      });

      // Clear existing debounce timer
      clearTimers();

      // Debounce state updates to reduce re-renders
      debounceTimerRef.current = setTimeout(() => {
        // Double-check mount status and recording state before state update
        // For Android, be more lenient with state checks
        const canUpdate = isAndroid 
          ? (isMountedRef.current && isRecordingActiveRef.current)
          : (isMountedRef.current && 
             recognitionStateRef.current === RecognitionState.ACTIVE && 
             isRecordingActiveRef.current);
             
        if (canUpdate) {
          setTranscript(currentFullTranscript);
        }
      }, debounceDelay);
    } else if (isAndroid && interim) {
      // Android-specific: capture interim-only results as backup
      // This handles cases where Android doesn't send final results
      const currentRefValue = transcriptRef.current || "";
      if (interim && interim !== currentRefValue) {
        transcriptRef.current = interim;
        console.log("[useSpeechRecognition.handleResult] Android: Captured interim-only result:", {
          length: interim.length,
          preview: interim.substring(0, 100)
        });
      }
    }

    // Update interim immediately for real-time feedback
    // Only update if it actually changed to prevent unnecessary renders
    if (isMountedRef.current) {
      setInterimTranscript(interim);
    }
  }, [debounceDelay, clearTimers]);

  /**
   * Handle recognition start event
   */
  const handleStart = useCallback(() => {
    if (!isMountedRef.current) return;
    
    updateRecognitionState(RecognitionState.ACTIVE);
    // Reset the final transcript index when starting fresh
    lastFinalTranscriptIndexRef.current = 0;
    // Reset restart counter on successful start
    restartAttemptCountRef.current = 0;
  }, [updateRecognitionState]);

  /**
   * Handle recognition end event with smart restart logic
   */
  const handleEnd = useCallback(() => {
    if (!isMountedRef.current) return;
    
    // Only update state if we're not already stopping/stopped
    if (recognitionStateRef.current === RecognitionState.ACTIVE) {
      updateRecognitionState(RecognitionState.IDLE);
    }

    // Auto-restart logic with checks:
    // 1. Component is still mounted
    // 2. No error occurred
    // 3. Recording is still active
    // 4. Not already in an active/starting state (prevent double-start)
    if (
      isMountedRef.current &&
      !errorRef.current &&
      isRecordingActiveRef.current &&
      recognitionStateRef.current !== RecognitionState.ACTIVE &&
      recognitionStateRef.current !== RecognitionState.STARTING
    ) {
      // Use a small delay for mobile to prevent rapid restart loops
      const restartDelay = isMobile ? 100 : 0;
      
      if (restartDelay > 0) {
        restartTimeoutRef.current = setTimeout(() => {
          attemptRestart();
        }, restartDelay);
      } else {
        attemptRestart();
      }
    }
  }, [updateRecognitionState, attemptRestart, isMobile]);

  /**
   * Initialize speech recognition
   */
  useEffect(() => {
    isMountedRef.current = true;

    // Check for API availability
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("SpeechRecognition API is not available in this browser");
      const notSupportedError = "Speech recognition is not supported in this browser.";
      setError(notSupportedError);
      errorRef.current = notSupportedError;
      return;
    }

    // Create recognition instance
    const recognition = new SpeechRecognition();

    // Configuration
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    // Attach event handlers
    recognition.onstart = handleStart;
    recognition.onend = handleEnd;
    recognition.onresult = handleResult;
    recognition.onerror = handleError;

    // Store reference
    recognitionRef.current = recognition;

    // Cleanup
    return () => {
      isMountedRef.current = false;
      
      // Clear all timers
      clearTimers();

      // Stop and cleanup recognition
      if (recognition) {
        try {
          // Update state before stopping
          updateRecognitionState(RecognitionState.STOPPING);
          
          // Remove event handlers first to prevent any callbacks during cleanup
          recognition.onstart = null;
          recognition.onend = null;
          recognition.onresult = null;
          recognition.onerror = null;

          // Stop recognition
          recognition.stop();
        } catch (e) {
          // Ignore errors during cleanup
          console.debug("Error during recognition cleanup:", e);
        }
      }

      // Final state update
      updateRecognitionState(RecognitionState.IDLE);
    };
  }, [language, handleStart, handleEnd, handleResult, handleError, clearTimers, updateRecognitionState]);

  /**
   * Sync refs with state changes
   */
  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  useEffect(() => {
    isRecordingActiveRef.current = isRecordingActive;
  }, [isRecordingActive]);

  /**
   * Control recognition lifecycle based on isRecordingActive
   * This is the main control point for starting/stopping recognition
   */
  useEffect(() => {
    const recognition = recognitionRef.current;
    
    // Exit if no recognition instance
    if (!recognition) return;

    // Only act if recording state actually changed
    if (previousRecordingStateRef.current === isRecordingActive) {
      return;
    }

    // Update previous state
    previousRecordingStateRef.current = isRecordingActive;

    if (isRecordingActive) {
      // Starting recording
      
      // Clear any existing timers
      clearTimers();
      
      // Reset state
      setTranscript("");
      setInterimTranscript("");
      transcriptRef.current = "";
      lastFinalTranscriptIndexRef.current = 0;
      setError(null);
      errorRef.current = null;
      restartAttemptCountRef.current = 0;
      lastRestartTimeRef.current = 0;

      // Start recognition
      try {
        updateRecognitionState(RecognitionState.STARTING);
        recognition.start();
      } catch (e) {
        // Handle start errors
        if (e.name === "InvalidStateError") {
          // Already started - this is okay
          console.debug("Recognition already started");
          updateRecognitionState(RecognitionState.ACTIVE);
        } else {
          console.error("Failed to start recognition:", e);
          const errorMsg = extractUserFriendlyError(e.message) || 
            "Failed to start speech recognition";
          
          if (isMountedRef.current) {
            setError(errorMsg);
            errorRef.current = errorMsg;
            updateRecognitionState(RecognitionState.ERROR);
          }
        }
      }
    } else {
      // Stopping recording
      
      // Clear any pending restart attempts
      clearTimers();
      
      try {
        updateRecognitionState(RecognitionState.STOPPING);
        recognition.stop();
      } catch (e) {
        // Handle stop errors
        if (e.name !== "InvalidStateError") {
          console.debug("Error stopping recognition:", e);
        }
        // Always update state to idle after stop attempt
        updateRecognitionState(RecognitionState.IDLE);
      }
    }
  }, [isRecordingActive, clearTimers, updateRecognitionState]);

  /**
   * Force update transcript state from ref
   * Used when transcript needs to be updated after recognition has stopped
   * (e.g., Android finalization)
   */
  const forceUpdateTranscript = useCallback(() => {
    if (isMountedRef.current && transcriptRef.current) {
      console.log("[useSpeechRecognition] Force updating transcript:", {
        length: transcriptRef.current.length,
        preview: transcriptRef.current.substring(0, 100)
      });
      setTranscript(transcriptRef.current);
    }
  }, []);

  // Return the same interface as before
  return {
    transcript,
    interimTranscript,
    error,
    recognitionRef,
    transcriptRef,
    forceUpdateTranscript,
  };
}