import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { extractUserFriendlyError } from "../utils/audioAnalysis";
import { analyzeRecordingWithWorker } from "../utils/audioAnalysisWorkerHelper";
import { getMimeType } from "../utils/shadowingHelpers";
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
 * Extracts transcript from recognition event results
 * Only extracts final results to avoid duplication
 * 
 * @param {SpeechRecognitionEvent} event - Recognition result event
 * @returns {string} Extracted final transcript
 */
const extractFinalTranscriptFromEvent = (event) => {
  if (!event?.results || event.results.length === 0) {
    return "";
  }

  const finals = [];
  for (let i = 0; i < event.results.length; i++) {
    const result = event.results[i];
    if (result?.isFinal && result[0]?.transcript) {
      finals.push(result[0].transcript);
    }
  }

  return finals.join(" ").trim();
};


/**
 * Enhanced getUserMedia with comprehensive diagnostics and fallbacks
 * Handles Chrome mobile, HTTPS requirements, and permission issues
 * 
 * @param {MediaStreamConstraints} constraints - Media constraints
 * @returns {Promise<MediaStream>} Media stream
 * @throws {Error} With detailed diagnostic information
 */
const getUserMedia = async (constraints) => {
  // Diagnostic: Log current environment
  console.log("[getUserMedia] Environment check:", {
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    isSecureContext: window.isSecureContext,
    userAgent: navigator.userAgent,
  });

  // CRITICAL FIX: Check if we're on HTTP (not HTTPS)
  // Chrome requires HTTPS for getUserMedia (except localhost)
  if (!window.isSecureContext && window.location.hostname !== 'localhost') {
    console.error("[getUserMedia] Not a secure context!");
    throw new Error(
      "HTTPS_REQUIRED: Microphone access requires HTTPS connection. " +
      "Current protocol: " + window.location.protocol
    );
  }

  // Check if navigator.mediaDevices exists at all
  if (!navigator.mediaDevices) {
    console.error("[getUserMedia] navigator.mediaDevices is undefined");

    // Try to determine why
    if (!window.isSecureContext) {
      throw new Error(
        "INSECURE_CONTEXT: navigator.mediaDevices is unavailable because " +
        "the page is not served over HTTPS"
      );
    }

    // On some mobile browsers, navigator.mediaDevices might be undefined
    // even on HTTPS if permissions were previously denied
    console.log("[getUserMedia] Attempting legacy API fallback...");

    // Try legacy API
    const legacyGetUserMedia =
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia;

    if (legacyGetUserMedia) {
      console.log("[getUserMedia] Using legacy API");
      return new Promise((resolve, reject) => {
        legacyGetUserMedia.call(navigator, constraints, resolve, reject);
      });
    }

    throw new Error(
      "NOT_SUPPORTED: getUserMedia is not supported in this browser. " +
      "This may be due to: 1) Insecure connection (use HTTPS), " +
      "2) Permissions previously denied, or 3) Browser not supported"
    );
  }

  // Check if getUserMedia method exists
  if (!navigator.mediaDevices.getUserMedia) {
    console.error("[getUserMedia] navigator.mediaDevices.getUserMedia is undefined");
    throw new Error(
      "METHOD_MISSING: getUserMedia method is not available. " +
      "Check browser compatibility and permissions."
    );
  }

  try {
    console.log("[getUserMedia] Requesting media with constraints:", constraints);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log("[getUserMedia] Successfully obtained media stream");
    return stream;
  } catch (err) {
    console.error("[getUserMedia] Error:", {
      name: err.name,
      message: err.message,
      constraint: err.constraint,
    });

    // Enhance error with context
    if (err.name === "NotAllowedError") {
      throw new Error(
        "PERMISSION_DENIED: Microphone permission was denied. " +
        "Please check browser settings and allow microphone access."
      );
    }

    if (err.name === "NotFoundError") {
      throw new Error(
        "NO_DEVICE: No microphone found on this device."
      );
    }

    if (err.name === "NotReadableError") {
      throw new Error(
        "DEVICE_IN_USE: Microphone is being used by another application."
      );
    }

    if (err.name === "OverconstrainedError") {
      throw new Error(
        "CONSTRAINTS_ERROR: Microphone doesn't support the requested settings."
      );
    }

    if (err.name === "SecurityError") {
      throw new Error(
        "SECURITY_ERROR: Access blocked due to security restrictions. " +
        "Ensure the page is served over HTTPS."
      );
    }

    // Re-throw with context
    throw err;
  }
};

/**
 * Safely stops all tracks in a MediaStream
 * Prevents memory leaks and ensures microphone release
 * 
 * @param {MediaStream|null} stream - Media stream to stop
 */
const stopMediaStream = (stream) => {
  if (!stream) return;

  try {
    stream.getTracks().forEach((track) => {
      track.stop();
      // Remove event listeners to prevent memory leaks
      track.onended = null;
      track.onmute = null;
      track.onunmute = null;
    });
  } catch (error) {
    console.warn("Error stopping media stream:", error);
  }
};


/**
 * Custom hook for managing audio recording lifecycle
 * 
 * Features:
 * - Comprehensive error handling and recovery
 * - Memory leak prevention with proper cleanup
 * - Race condition prevention
 * - Browser compatibility with fallbacks
 * - Abort controller for cancellable operations
 * - Proper state synchronization
 * - Enhanced diagnostics for Chrome mobile issues
 * 
 * @param {Object} options - Hook configuration
 * @param {string} options.referenceText - Reference text for pronunciation analysis
 * @param {React.RefObject} options.recognitionRef - Speech recognition instance ref
 * @param {React.RefObject} options.audioRef - Audio element ref for playback
 * @param {React.RefObject} options.transcriptRef - Current transcript ref
 * 
 * @returns {Object} Recording state and control functions
 */
export function useRecording({
  referenceText,
  recognitionRef,
  audioRef,
  transcriptRef,
  setIsRecordingActive,
  forceUpdateTranscript,
}) {
  const { t } = useTranslation("speaking");

  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordBlob, setRecordBlob] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // Refs for managing recording state
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const abortControllerRef = useRef(null);
  const cleanupTimeoutRef = useRef(null);
  const isCleaningUpRef = useRef(false);

  /**
   * Comprehensive cleanup function
   * Ensures all resources are properly released
   * Prevents memory leaks and zombie processes
   */
  // Refs to capture current values for cleanup
  const mediaStreamForCleanup = useRef(mediaStream);

  // Keep refs in sync
  useEffect(() => {
    mediaStreamForCleanup.current = mediaStream;
  }, [mediaStream]);

  /**
   * Cleanup function that uses refs instead of closure
   * This prevents the function from recreating when dependencies change
   */
  const cleanup = useCallback(() => {
    // Prevent concurrent cleanup calls
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    try {
      // Abort any ongoing async operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Clear any pending timeouts
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }

      // Stop media recorder
      if (mediaRecorderRef.current) {
        const recorder = mediaRecorderRef.current;

        // Remove event listeners to prevent memory leaks
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        recorder.onpause = null;
        recorder.onresume = null;
        recorder.onstart = null;

        // Stop recording if active
        if (recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch (error) {
            console.warn("Error stopping recorder:", error);
          }
        }

        mediaRecorderRef.current = null;
      }

      // Stop media stream (use ref to get current value)
      stopMediaStream(mediaStreamForCleanup.current);
    } finally {
      isCleaningUpRef.current = false;
    }
  }, []); // Empty deps = stable function reference

  /**
   * Cleanup on unmount only
   * Prevents resource leaks when component unmounts
   * Note: Empty dependency array ensures this only runs on unmount
   */
  useEffect(() => {
    return () => {
      // Prevent concurrent cleanup calls
      if (isCleaningUpRef.current) return;
      isCleaningUpRef.current = true;

      try {
        // Abort any ongoing async operations
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }

        // Clear any pending timeouts
        if (cleanupTimeoutRef.current) {
          clearTimeout(cleanupTimeoutRef.current);
          cleanupTimeoutRef.current = null;
        }

        // Stop media recorder
        if (mediaRecorderRef.current) {
          const recorder = mediaRecorderRef.current;

          // Remove event listeners to prevent memory leaks
          recorder.ondataavailable = null;
          recorder.onstop = null;
          recorder.onerror = null;
          recorder.onpause = null;
          recorder.onresume = null;
          recorder.onstart = null;

          // Stop recording if active
          if (recorder.state !== "inactive") {
            try {
              recorder.stop();
            } catch (error) {
              console.warn("Error stopping recorder:", error);
            }
          }

          mediaRecorderRef.current = null;
        }

        // Stop media stream (use ref to get current value)
        stopMediaStream(mediaStreamForCleanup.current);

        // Final cleanup of chunks
        chunksRef.current = [];
      } finally {
        isCleaningUpRef.current = false;
      }
    };
  }, []); // Empty array = cleanup only runs on unmount

  /**
   * Start recording user's voice
   * Handles permission requests, stream setup, and error recovery
   */
  const startRecording = useCallback(async () => {
    console.log("[startRecording] Called");

    // Prevent starting if already recording
    if (isRecording) {
      console.warn("Recording already in progress");
      return;
    }

    // Prevent starting if currently cleaning up
    if (isCleaningUpRef.current) {
      console.warn("Cleanup in progress, cannot start recording");
      return;
    }

    // Reset state for fresh recording
    setError(null);
    setAnalysis(null);
    setRecordBlob(null);
    setIsAnalyzing(false);
    chunksRef.current = [];

    // Create new abort controller for this recording session
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    let stream = null;
    let recorder = null;

    try {
      // Check if operation was aborted before requesting microphone
      if (signal.aborted) {
        throw new Error("Recording was cancelled");
      }

      console.log("[startRecording] Requesting microphone access...");

      // Request microphone access with enhanced constraints
      stream = await getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log("[startRecording] Microphone access granted");

      // Check if operation was aborted after getting stream
      if (signal.aborted) {
        stopMediaStream(stream);
        throw new Error("Recording was cancelled");
      }

      setMediaStream(stream);

      // Get optimal MIME type for this browser
      const mimeType = getMimeType();
      console.log("[startRecording] Using MIME type:", mimeType);

      // Validate MIME type support
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.error("[startRecording] MIME type not supported:", mimeType);
        throw new Error(`MIME type ${mimeType} is not supported`);
      }

      // Create MediaRecorder with optimized settings
      recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128 kbps for good quality
      });

      console.log("[startRecording] MediaRecorder created");

      // Handle data availability (during recording)
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording errors
      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        setError(
          extractUserFriendlyError(event.error) ||
          t("menu.shadowing.player.errors.recordingFailed") ||
          "Recording failed"
        );
        cleanup();
      };

      // Handle recording stop
      recorder.onstop = async () => {
        console.log("[recorder.onstop] Recording stopped");

        // Prevent processing if aborted
        if (signal.aborted) {
          cleanup();
          return;
        }

        let finalTranscript = transcriptRef.current || "";

        // Android-specific: Simple delay to allow final results to arrive
        // With relaxed guard clauses in useSpeechRecognition, results should already be captured
        // This small delay ensures any late-arriving results are processed
        if (isAndroidDevice()) {
          console.log("[recorder.onstop] Android device detected, waiting for final results", {
            transcriptBeforeDelay: finalTranscript?.substring(0, 100) || "(empty)",
            transcriptLength: finalTranscript?.length || 0
          });
          
          // Simple delay - no polling needed since transcriptRef is updated immediately in handleResult
          const delay = DELAYS.ANDROID_TRANSCRIPT_CAPTURE_DELAY || 400;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Capture whatever is in transcriptRef now
          finalTranscript = transcriptRef.current || "";
          
          console.log("[recorder.onstop] After delay:", {
            finalTranscriptLength: finalTranscript?.length || 0,
            finalTranscriptValue: finalTranscript?.substring(0, 100) || "(empty)",
            transcriptRefLength: transcriptRef.current?.length || 0
          });
          
          // Force update transcript state for UI if we have content
          if (finalTranscript && forceUpdateTranscript) {
            console.log("[recorder.onstop] Force updating transcript state for Android");
            forceUpdateTranscript();
          } else if (!finalTranscript) {
            console.warn("[recorder.onstop] WARNING: Transcript is empty on Android after delay", {
              transcriptRefValue: transcriptRef.current?.substring(0, 200) || "(empty)"
            });
          }
        } else if (isMobileDevice()) {
          // Other mobile devices use simple delay
          const delay = DELAYS.MOBILE_TRANSCRIPT_CAPTURE_DELAY || 350;
          await new Promise(resolve => setTimeout(resolve, delay));
          finalTranscript = transcriptRef.current || "";
        }

        console.log("[recorder.onstop] Final transcript before stopping recognition:", {
          length: finalTranscript?.length || 0,
          isEmpty: !finalTranscript,
          isAndroid: isAndroidDevice(),
          isMobile: isMobileDevice(),
          preview: finalTranscript?.substring(0, 100) || ""
        });

        // Stop media stream
        stopMediaStream(stream);
        setMediaStream(null);

        // Stop speech recognition immediately after transcript capture
        // This prevents recognition from interfering with analysis
        setIsRecordingActive(false);

        // Validate we have audio data
        if (chunksRef.current.length === 0) {
          setError(
            t("menu.shadowing.player.errors.noAudioData") ||
            "No audio data recorded"
          );
          setIsAnalyzing(false);
          return;
        }

        // Create blob from recorded chunks
        const blob = new Blob(chunksRef.current, { type: mimeType });

        // Validate blob size (minimum 1KB to ensure valid audio)
        if (blob.size < 1000) {
          setError(
            t("menu.shadowing.player.errors.recordingTooShort") ||
            "Recording too short"
          );
          setIsAnalyzing(false);
          return;
        }

        setRecordBlob(blob);
        setIsAnalyzing(true);

        try {
          // Check if aborted before analysis
          if (signal.aborted) {
            throw new Error("Analysis cancelled");
          }

          console.log("[recorder.onstop] Starting analysis...", {
            blobSize: blob.size,
            referenceTextLength: referenceText?.length || 0,
            transcriptLength: finalTranscript?.length || 0,
            transcriptValue: finalTranscript, // Show actual transcript
            transcriptRefValue: transcriptRef.current // Show ref value
          });

          // Fallback: Check for empty transcript on Android and provide helpful message
          if (!finalTranscript || finalTranscript.trim().length === 0) {
            if (isAndroidDevice()) {
              console.warn("[recorder.onstop] Empty transcript on Android - analysis cannot proceed");
              setError(
                t("menu.shadowing.player.errors.androidTranscriptNotCaptured") ||
                "Speech recognition did not capture your speech. The audio was recorded successfully. Please try speaking more clearly and ensure your microphone permissions are enabled."
              );
              setIsAnalyzing(false);
              return;
            }
          }

          // Analyze recording with timeout protection
          const analysisPromise = analyzeRecordingWithWorker(
            blob,
            referenceText,
            finalTranscript
          );

          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => {
            cleanupTimeoutRef.current = setTimeout(() => {
              reject(new Error("Analysis timeout"));
            }, 30000); // 30 second timeout
          });

          const result = await Promise.race([
            analysisPromise,
            timeoutPromise,
          ]);

          // Clear timeout if analysis completed
          if (cleanupTimeoutRef.current) {
            clearTimeout(cleanupTimeoutRef.current);
            cleanupTimeoutRef.current = null;
          }

          // Check if aborted after analysis
          if (signal.aborted) {
            throw new Error("Analysis cancelled");
          }

          console.log("[recorder.onstop] Analysis completed", {
            hasResult: !!result,
            hasError: !!result?.error,
            resultKeys: result ? Object.keys(result) : []
          });

          // Handle analysis result
          if (result?.error) {
            const userFriendlyError = extractUserFriendlyError(result.error);
            console.error("[recorder.onstop] Analysis returned error:", userFriendlyError);
            setError(
              userFriendlyError ||
              t("menu.shadowing.player.errors.analysisFailed") ||
              "Analysis failed"
            );
          } else if (result) {
            console.log("[recorder.onstop] Analysis successful, setting results");
            setAnalysis(result);
            setError(null); // Clear any previous errors
          } else {
            console.warn("[recorder.onstop] Analysis returned no result");
            setError(
              t("menu.shadowing.player.errors.analysisNoResult") ||
              "Analysis returned no result"
            );
          }
        } catch (err) {
          // Don't show error if operation was aborted (user action)
          if (!signal.aborted) {
            console.error("[recorder.onstop] Analysis error:", err);
            const errorMessage =
              extractUserFriendlyError(err) ||
              t("menu.shadowing.player.errors.analysisFailed") ||
              "Analysis failed";
            setError(errorMessage);
          } else {
            console.log("[recorder.onstop] Analysis cancelled (aborted)");
          }
        } finally {
          console.log("[recorder.onstop] Analysis finished, setting isAnalyzing to false");
          setIsAnalyzing(false);
        }
      };

      // Store recorder reference
      mediaRecorderRef.current = recorder;

      // Start recording with timeslice for progressive data availability
      recorder.start(100); // Capture data every 100ms
      console.log("[startRecording] Recording started");

      // Update state
      setIsRecording(true);
      setIsPaused(false);
      setIsRecordingActive(true); // Triggers speech recognition via hook

      // Auto-play reference audio if available and paused
      if (audioRef.current?.paused) {
        audioRef.current.play().catch((err) => {
          console.warn("Could not auto-play audio:", err);
        });
      }
    } catch (err) {
      console.error("[startRecording] Error:", err);

      // Clean up on error
      if (stream) {
        stopMediaStream(stream);
        setMediaStream(null);
      }

      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch (stopError) {
          console.warn("Error stopping recorder after error:", stopError);
        }
      }

      // Don't show error if operation was aborted (user action)
      if (!signal.aborted) {
        let errorMessage = extractUserFriendlyError(err);

        // Handle specific error cases with enhanced messaging
        if (err.message?.includes("HTTPS_REQUIRED") || err.message?.includes("INSECURE_CONTEXT")) {
          errorMessage =
            t("menu.shadowing.player.errors.httpsRequired") ||
            "🔒 Microphone access requires a secure connection (HTTPS). " +
            "Please access this page via HTTPS or contact your administrator.";
        } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError" || err.message?.includes("PERMISSION_DENIED")) {
          errorMessage =
            t("menu.shadowing.player.errors.microphoneDenied") ||
            "Microphone permission denied. Please allow microphone access in your browser settings.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError" || err.message?.includes("NO_DEVICE")) {
          errorMessage =
            t("menu.shadowing.player.errors.microphoneNotFound") ||
            "No microphone found on this device.";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError" || err.message?.includes("DEVICE_IN_USE")) {
          errorMessage =
            t("menu.shadowing.player.errors.microphoneInUse") ||
            "Microphone is in use by another application.";
        } else if (err.message?.includes("not supported") || err.message?.includes("NOT_SUPPORTED")) {
          errorMessage =
            t("menu.shadowing.player.errors.microphoneNotSupported") ||
            "⚠️ Microphone access is not supported. This may be due to:\n" +
            "• Insecure connection (HTTP instead of HTTPS)\n" +
            "• Previously denied permissions\n" +
            "• Browser compatibility issues\n\n" +
            "Please ensure you're using HTTPS and check browser permissions.";
        } else if (!errorMessage) {
          errorMessage =
            t("menu.shadowing.player.errors.recordingFailed") ||
            "Failed to start recording";
        }

        setError(errorMessage);
      }

      // Reset state
      setIsRecording(false);
      setIsPaused(false);
      setIsRecordingActive(false); // Reset speech recognition state on error
    }
  }, [
    isRecording,
    referenceText,
    recognitionRef,
    audioRef,
    transcriptRef,
    setIsRecordingActive,
    t,
    cleanup,
  ]);

  /**
   * Stop recording and trigger analysis
   * Ensures proper state synchronization and cleanup
   */
  const stopRecording = useCallback(() => {
    // Prevent stopping if not recording
    if (!isRecording) {
      return;
    }

    console.log("[stopRecording] Stopping recording");

    // Update state FIRST for React's batched updates
    // This ensures child components see updated state immediately
    setIsRecording(false);
    setIsPaused(false);
    // Note: setIsRecordingActive(false) is called in recorder.onstop handler
    // after capturing the transcript to ensure transcript is available for analysis

    // Stop MediaRecorder (triggers onstop handler)
    if (mediaRecorderRef.current) {
      const recorder = mediaRecorderRef.current;
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch (error) {
          console.warn("Error stopping recorder:", error);
          // Force cleanup even if stop fails
          cleanup();
        }
      }
    } else {
      // No recorder found, force cleanup
      cleanup();
    }
  }, [isRecording, setIsRecordingActive, cleanup]); // cleanup has empty deps, so it's stable

  /**
   * Pause or resume recording
   * Synchronizes MediaRecorder and speech recognition states
   */
  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;

    // Validate recorder exists and is in valid state
    if (!recorder || !isRecording) {
      return;
    }

    try {
      if (recorder.state === "recording") {
        // Pause recording
        recorder.pause();
        setIsRecordingActive(false); // Pauses speech recognition via hook
        setIsPaused(true);
      } else if (recorder.state === "paused") {
        // Resume recording
        recorder.resume();
        setIsRecordingActive(true); // Resumes speech recognition via hook
        setIsPaused(false);
      }
    } catch (error) {
      console.error("Error toggling pause:", error);
      setError(
        extractUserFriendlyError(error) ||
        t("menu.shadowing.player.errors.pauseFailed") ||
        "Failed to pause/resume recording"
      );
    }
  }, [isRecording, setIsRecordingActive, t]);

  /**
   * Retake recording
   * Clears all recording data and resets to initial state
   */
  const retake = useCallback(() => {
    // Stop any ongoing recording first
    if (isRecording) {
      stopRecording();
    }

    // Clear all recording-related state
    setRecordBlob(null);
    setAnalysis(null);
    setError(null);
    setIsAnalyzing(false);

    // Clear audio chunks
    chunksRef.current = [];
  }, [isRecording, stopRecording]);

  /**
   * Download recorded audio
   * Creates a temporary download link with proper cleanup
   * iOS Safari doesn't support the download attribute, so we open in new window
   */
  const downloadRecording = useCallback(() => {
    if (!recordBlob) {
      console.warn("No recording available to download");
      return;
    }

    try {
      // Create blob URL
      const url = URL.createObjectURL(recordBlob);

      // Detect iOS devices
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;

      if (isIOS) {
        // iOS Safari doesn't support the download attribute
        // Open in new window/tab so user can use share menu to save
        const newWindow = window.open(url, '_blank');
        
        // Cleanup after a delay (longer for iOS since user needs time to interact)
        setTimeout(() => {
          // Only revoke if window was closed or after longer delay
          if (!newWindow || newWindow.closed) {
            URL.revokeObjectURL(url);
          } else {
            // Give user more time to interact with the share menu
            setTimeout(() => URL.revokeObjectURL(url), 5000);
          }
        }, 1000);
      } else {
        // Standard download approach for non-iOS devices
        const link = document.createElement("a");
        link.href = url;
        link.download = `recording_${new Date().toISOString()}.webm`;
        link.style.display = "none";

        // Append to DOM (required for Firefox)
        document.body.appendChild(link);

        // Trigger download
        link.click();

        // Cleanup with slight delay to ensure download starts
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }
    } catch (error) {
      console.error("Error downloading recording:", error);
      setError(
        t("menu.shadowing.player.errors.downloadFailed") ||
        "Failed to download recording"
      );
    }
  }, [recordBlob, t]);

  return {
    // State
    isRecording,
    isPaused,
    recordBlob,
    mediaStream,
    analysis,
    isAnalyzing,
    error,

    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    retake,
    downloadRecording,
  };
}