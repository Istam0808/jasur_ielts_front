import { useState, useCallback, useRef, useEffect, useMemo } from "react";

/**
 * @typedef {Object} SpeechOptions
 * @property {number} [rate=0.9] - Speech rate (0.1 to 2.0)
 * @property {number} [pitch=1.0] - Speech pitch (0 to 2)
 * @property {number} [volume=1.0] - Speech volume (0 to 1)
 * @property {string} [lang='en-US'] - Language code
 * @property {SpeechSynthesisVoice} [voice] - Specific voice to use
 */

/**
 * @typedef {Object} UseTextToSpeechReturn
 * @property {(text: string, options?: SpeechOptions) => void} speak - Speak the given text
 * @property {() => void} stop - Stop current speech
 * @property {() => void} pause - Pause current speech
 * @property {() => void} resume - Resume paused speech
 * @property {() => SpeechSynthesisVoice[]} getAvailableVoices - Get all available voices
 * @property {() => boolean} isSupported - Check if TTS is supported
 * @property {() => void} clearError - Clear current error
 * @property {() => void} cleanup - Clean up resources
 * @property {boolean} isSpeaking - Whether currently speaking
 * @property {boolean} isLoading - Whether loading/preparing
 * @property {string|null} error - Current error message
 * @property {boolean} voicesLoaded - Whether voices have loaded
 */

/**
 * Custom React hook for handling Text-to-Speech (TTS) with the Web Speech API.
 * Provides robust error handling, retry logic, and voice management.
 * 
 * @returns {UseTextToSpeechReturn}
 */
const useTextToSpeech = () => {
  // ========== State Management ==========
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  // ========== Refs ==========
  const utteranceRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const lastSpeakTimeRef = useRef(0);
  const retryCountRef = useRef(0);
  const safetyTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const voicesCacheRef = useRef([]);
  const pendingSpeakRef = useRef(null);

  // ========== Constants ==========
  const DEBOUNCE_DELAY = 300; // ms
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // ms
  const SAFETY_TIMEOUT = 30000; // 30 seconds max speech duration
  const VOICE_LOAD_TIMEOUT = 5000; // 5 seconds to wait for voices

  // ========== Helper Functions ==========

  /**
   * Clamp a value between min and max
   */
  const clamp = useCallback((value, min, max) => {
    return Math.min(Math.max(value, min), max);
  }, []);

  /**
   * Check if Web Speech API is supported
   */
  const isSupported = useCallback(() => {
    return (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof SpeechSynthesisUtterance !== "undefined"
    );
  }, []);

  /**
   * Safe state setter that only updates if component is mounted
   */
  const safeSetState = useCallback((setter) => {
    if (isMountedRef.current) {
      setter();
    }
  }, []);

  /**
   * Clear retry timeout safely
   */
  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  /**
   * Clear safety timeout safely
   */
  const clearSafetyTimeout = useCallback(() => {
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  }, []);

  /**
   * Complete cleanup of all resources
   */
  const performCleanup = useCallback(() => {
    clearRetryTimeout();
    clearSafetyTimeout();

    if (isSupported()) {
      try {
        speechSynthesis.cancel();
      } catch (err) {
        console.error("Error cancelling speech:", err);
      }
    }

    utteranceRef.current = null;
    pendingSpeakRef.current = null;
    retryCountRef.current = 0;
  }, [clearRetryTimeout, clearSafetyTimeout, isSupported]);

  // ========== Voice Management ==========

  /**
   * Load and cache available voices
   */
  const loadVoices = useCallback(() => {
    if (!isSupported()) return;

    try {
      const voices = speechSynthesis.getVoices();

      if (voices.length > 0) {
        voicesCacheRef.current = voices;
        safeSetState(() => setVoicesLoaded(true));

        if (process.env.NODE_ENV === "development") {
          console.debug(
            `[TTS] Loaded ${voices.length} voices:`,
            voices.slice(0, 5).map((v) => ({
              name: v.name,
              lang: v.lang,
              default: v.default,
              localService: v.localService,
            }))
          );
        }
      }
    } catch (err) {
      console.error("[TTS] Error loading voices:", err);
    }
  }, [isSupported, safeSetState]);

  /**
   * Select best voice from a list using quality scoring
   */
  const selectBestVoiceFromList = useCallback((voices) => {
    if (voices.length === 0) return null;
    if (voices.length === 1) return voices[0];

    return voices.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Prefer local voices (faster, more reliable)
      if (a.localService) scoreA += 10;
      if (b.localService) scoreB += 10;

      // Prefer default voice
      if (a.default) scoreA += 5;
      if (b.default) scoreB += 5;

      // Prefer high-quality voice names (prioritize better quality voices)
      const highQualityNames = [
        "Google",        // Google voices (best quality on Chrome)
        "Microsoft",     // Microsoft voices (good quality)
        "Zira",          // Windows 10/11 female voice (good quality)
        "Mark",          // Windows 10/11 male voice (good quality)
        "Aria",          // Windows 11 neural voice
        "Jenny",         // Windows 11 neural voice
        "Samantha",      // macOS female voice (good quality)
        "Alex",          // macOS male voice (good quality)
        "Daniel",        // macOS UK voice
        "Karen",         // macOS Australian voice
        "Moira",         // macOS Irish voice
        "Tessa",         // macOS South African voice
        "Premium",       // Premium voices
        "Enhanced",      // Enhanced voices
        "Natural",       // Natural voices
        "Neural",        // Neural voices (if available)
      ];

      // Prioritize Google and Microsoft voices (highest quality)
      if (a.name.includes("Google")) scoreA += 5;
      if (b.name.includes("Google")) scoreB += 5;
      if (a.name.includes("Microsoft")) scoreA += 4;
      if (b.name.includes("Microsoft")) scoreB += 4;
      
      // Other high-quality voices
      highQualityNames.slice(2).forEach((name) => {
        if (a.name.includes(name)) scoreA += 3;
        if (b.name.includes(name)) scoreB += 3;
      });
      
      // Penalize system/default voices that are usually lower quality
      if (a.name.includes("System Voice") || a.name.includes("Default")) scoreA -= 5;
      if (b.name.includes("System Voice") || b.name.includes("Default")) scoreB -= 5;

      // Prefer shorter names (often better quality)
      scoreA -= a.name.length * 0.1;
      scoreB -= b.name.length * 0.1;

      return scoreB - scoreA;
    })[0];
  }, []);

  /**
   * Get the best voice for the given language with improved scoring
   */
  const getBestVoice = useCallback((lang = "en-US") => {
    if (!isSupported()) return null;

    const voices = voicesCacheRef.current.length > 0
      ? voicesCacheRef.current
      : speechSynthesis.getVoices();

    if (voices.length === 0) return null;

    // Try to find exact language match first
    const exactMatches = voices.filter((v) => v.lang === lang);
    if (exactMatches.length > 0) {
      return selectBestVoiceFromList(exactMatches);
    }

    // Fall back to language prefix match (e.g., 'en' for 'en-US')
    const langPrefix = lang.split("-")[0];
    const prefixMatches = voices.filter((v) => v.lang.startsWith(langPrefix));
    if (prefixMatches.length > 0) {
      return selectBestVoiceFromList(prefixMatches);
    }

    // Last resort: return first available voice
    return voices[0];
  }, [isSupported, selectBestVoiceFromList]);

  /**
   * Get all available voices
   */
  const getAvailableVoices = useCallback(() => {
    if (!isSupported()) return [];

    try {
      return voicesCacheRef.current.length > 0
        ? voicesCacheRef.current
        : speechSynthesis.getVoices();
    } catch (err) {
      console.error("[TTS] Error fetching voices:", err);
      return [];
    }
  }, [isSupported]);

  // ========== Core Speech Functions ==========

  /**
   * Main speak function with enhanced error handling and retry logic
   */
  const speak = useCallback(
    (text, options = {}) => {
      // Validation
      if (!isSupported()) {
        const errorMsg = "Speech synthesis is not supported in this browser";
        safeSetState(() => setError(errorMsg));
        console.warn(`[TTS] ${errorMsg}`);
        return;
      }

      if (typeof text !== "string" || !text.trim()) {
        console.warn("[TTS] Invalid text for speech synthesis:", text);
        return;
      }

      // Debounce rapid consecutive calls
      const now = Date.now();
      if (now - lastSpeakTimeRef.current < DEBOUNCE_DELAY) {
        console.debug("[TTS] Speech request debounced");
        return;
      }
      lastSpeakTimeRef.current = now;

      // Store pending speak request for potential retry
      pendingSpeakRef.current = { text, options };

      // Cleanup previous speech
      performCleanup();

      safeSetState(() => {
        setIsLoading(true);
        setError(null);
      });

      try {
        // Create new utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;

        // Apply options with clamping
        utterance.rate = clamp(options.rate ?? 0.9, 0.1, 2.0);
        utterance.pitch = clamp(options.pitch ?? 1.0, 0, 2);
        utterance.volume = clamp(options.volume ?? 1.0, 0, 1);
        utterance.lang = options.lang || "en-US";

        // Set voice (custom or best available)
        const voice = options.voice || getBestVoice(utterance.lang);
        if (voice) {
          utterance.voice = voice;
        } else {
          console.warn("[TTS] No suitable voice found");
        }

        // Safety timeout to prevent hung speech
        safetyTimeoutRef.current = setTimeout(() => {
          if (utteranceRef.current === utterance) {
            console.warn("[TTS] Speech synthesis timeout - cancelling");
            performCleanup();
            safeSetState(() => {
              setIsSpeaking(false);
              setIsLoading(false);
            });
          }
        }, SAFETY_TIMEOUT);

        // Event handlers
        utterance.onstart = () => {
          if (!isMountedRef.current) return;

          clearSafetyTimeout();
          safeSetState(() => {
            setIsSpeaking(true);
            setIsLoading(false);
          });
          retryCountRef.current = 0;

          if (process.env.NODE_ENV === "development") {
            console.debug("[TTS] Speech started");
          }
        };

        utterance.onend = () => {
          if (!isMountedRef.current) return;

          clearSafetyTimeout();
          utteranceRef.current = null;
          pendingSpeakRef.current = null;
          retryCountRef.current = 0;

          safeSetState(() => setIsSpeaking(false));

          if (process.env.NODE_ENV === "development") {
            console.debug("[TTS] Speech ended");
          }
        };

        utterance.onerror = (event) => {
          if (!isMountedRef.current) return;

          clearSafetyTimeout();

          // "interrupted" is normal user action, not an error
          if (event.error === "interrupted") {
            console.debug("[TTS] Speech interrupted (expected behavior)");
            performCleanup();
            safeSetState(() => {
              setIsSpeaking(false);
              setIsLoading(false);
            });
            return;
          }

          // "canceled" is also expected
          if (event.error === "canceled") {
            console.debug("[TTS] Speech canceled");
            performCleanup();
            safeSetState(() => {
              setIsSpeaking(false);
              setIsLoading(false);
            });
            return;
          }

          // Determine if error is retryable
          const retryableErrors = [
            "audio-busy",
            "network",
            "synthesis-failed",
            "synthesis-unavailable",
          ];

          const isRetryable =
            retryableErrors.includes(event.error) &&
            retryCountRef.current < MAX_RETRIES;

          if (isRetryable && pendingSpeakRef.current) {
            retryCountRef.current++;
            const backoffDelay =
              RETRY_DELAY * Math.pow(2, retryCountRef.current - 1);

            console.log(
              `[TTS] Retrying speech synthesis (attempt ${retryCountRef.current}/${MAX_RETRIES}) in ${backoffDelay}ms`
            );

            retryTimeoutRef.current = setTimeout(() => {
              if (pendingSpeakRef.current) {
                speak(
                  pendingSpeakRef.current.text,
                  pendingSpeakRef.current.options
                );
              }
            }, backoffDelay);
            return;
          }

          // Non-retryable error or max retries exceeded
          retryCountRef.current = 0;
          pendingSpeakRef.current = null;

          const errorMessages = {
            network: "Network error during speech synthesis",
            "synthesis-failed": "Failed to generate audio",
            "synthesis-unavailable": "Speech synthesis temporarily unavailable",
            "audio-busy": "Audio device is busy. Please try again.",
            "audio-hardware": "Audio hardware error",
            "language-unavailable": `Language '${utterance.lang}' is not available`,
            "voice-unavailable": "Selected voice is unavailable",
            "text-too-long": "Text is too long for speech synthesis",
            "invalid-argument": "Invalid argument provided",
            "not-allowed": "Speech synthesis not allowed (check permissions)",
          };

          const errorMsg =
            errorMessages[event.error] || `Speech error: ${event.error}`;

          console.error(`[TTS] ${errorMsg}`, event);

          safeSetState(() => {
            setError(errorMsg);
            setIsSpeaking(false);
            setIsLoading(false);
          });

          utteranceRef.current = null;
        };

        utterance.onpause = () => {
          if (!isMountedRef.current) return;
          safeSetState(() => setIsSpeaking(false));
          if (process.env.NODE_ENV === "development") {
            console.debug("[TTS] Speech paused");
          }
        };

        utterance.onresume = () => {
          if (!isMountedRef.current) return;
          safeSetState(() => setIsSpeaking(true));
          if (process.env.NODE_ENV === "development") {
            console.debug("[TTS] Speech resumed");
          }
        };

        // Start speaking
        speechSynthesis.speak(utterance);

      } catch (err) {
        console.error("[TTS] Error creating speech utterance:", err);
        const errorMsg = `Failed to create speech: ${err.message}`;

        safeSetState(() => {
          setError(errorMsg);
          setIsLoading(false);
        });

        utteranceRef.current = null;
        pendingSpeakRef.current = null;
      }
    },
    [
      isSupported,
      safeSetState,
      performCleanup,
      clearSafetyTimeout,
      clamp,
      getBestVoice,
    ]
  );

  /**
   * Stop current speech
   */
  const stop = useCallback(() => {
    if (!isSupported()) return;

    try {
      performCleanup();
    } finally {
      safeSetState(() => {
        setIsSpeaking(false);
        setIsLoading(false);
      });
    }

    if (process.env.NODE_ENV === "development") {
      console.debug("[TTS] Speech stopped");
    }
  }, [isSupported, performCleanup, safeSetState]);

  /**
   * Pause current speech
   */
  const pause = useCallback(() => {
    if (!isSupported()) return;

    try {
      if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        if (process.env.NODE_ENV === "development") {
          console.debug("[TTS] Speech paused");
        }
      }
    } catch (err) {
      console.error("[TTS] Error pausing speech:", err);
    }
  }, [isSupported]);

  /**
   * Resume paused speech
   */
  const resume = useCallback(() => {
    if (!isSupported()) return;

    try {
      if (speechSynthesis.paused) {
        speechSynthesis.resume();
        if (process.env.NODE_ENV === "development") {
          console.debug("[TTS] Speech resumed");
        }
      }
    } catch (err) {
      console.error("[TTS] Error resuming speech:", err);
    }
  }, [isSupported]);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    safeSetState(() => setError(null));
  }, [safeSetState]);

  /**
   * Public cleanup function
   */
  const cleanup = useCallback(() => {
    performCleanup();
    safeSetState(() => {
      setIsSpeaking(false);
      setIsLoading(false);
    });
  }, [performCleanup, safeSetState]);

  // ========== Effects ==========

  /**
   * Initialize voice loading
   */
  useEffect(() => {
    if (!isSupported()) return;

    // Immediate attempt
    loadVoices();

    // Listen for voices changed event
    const handleVoicesChanged = () => {
      loadVoices();
    };

    speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);

    // Fallback: try loading again after timeout
    const timeout = setTimeout(() => {
      if (!voicesLoaded) {
        loadVoices();
      }
    }, VOICE_LOAD_TIMEOUT);

    return () => {
      clearTimeout(timeout);
      speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
    };
  }, [isSupported, loadVoices, voicesLoaded]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      performCleanup();
    };
  }, [performCleanup]);

  /**
   * Handle visibility change (pause when tab is hidden)
   */
  useEffect(() => {
    if (!isSupported()) return;

    const handleVisibilityChange = () => {
      if (document.hidden && isSpeaking) {
        // Optionally pause when tab is hidden
        // Uncomment if desired:
        // pause();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSupported, isSpeaking]); 

  
  // ========== Return Public API ==========

  return useMemo(
    () => ({
      speak,
      stop,
      pause,
      resume,
      getAvailableVoices,
      isSupported,
      clearError,
      cleanup,
      isSpeaking,
      isLoading,
      error,
      voicesLoaded,
    }),
    [
      speak,
      stop,
      pause,
      resume,
      getAvailableVoices,
      isSupported,
      clearError,
      cleanup,
      isSpeaking,
      isLoading,
      error,
      voicesLoaded,
    ]
  );
};

export { useTextToSpeech };