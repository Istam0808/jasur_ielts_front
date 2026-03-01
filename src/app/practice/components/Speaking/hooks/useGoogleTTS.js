import { useState, useCallback, useRef, useEffect, useMemo } from "react";

/**
 * @typedef {Object} SpeechOptions
 * @property {number} [rate=1.0] - Speech rate (0.5 to 2.0, mapped to playbackRate)
 * @property {number} [pitch=1.0] - Speech pitch (not directly supported, kept for compatibility)
 * @property {number} [volume=1.0] - Speech volume (0 to 1)
 * @property {string} [lang='en-US'] - Language code
 * @property {string} [voice] - Specific voice name to use
 */

/**
 * @typedef {Object} UseGoogleTTSReturn
 * @property {(text: string, options?: SpeechOptions) => Promise<void>} speak - Speak the given text
 * @property {() => void} stop - Stop current speech
 * @property {() => void} pause - Pause current speech
 * @property {() => void} resume - Resume paused speech
 * @property {() => Array} getAvailableVoices - Get all available voices (returns empty array for compatibility)
 * @property {() => boolean} isSupported - Check if TTS is supported (always true for Google TTS)
 * @property {() => void} clearError - Clear current error
 * @property {() => void} cleanup - Clean up resources
 * @property {boolean} isSpeaking - Whether currently speaking
 * @property {boolean} isLoading - Whether loading/preparing
 * @property {string|null} error - Current error message
 * @property {boolean} voicesLoaded - Whether voices have loaded (always true for Google TTS)
 */

// ========== Constants (module-level to avoid recreation on each render) ==========
const DEBOUNCE_DELAY = 300; // ms
const API_BASE_URL = '/api/google-tts';
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 2000]; // Exponential backoff delays in ms
const FETCH_TIMEOUT = 30000; // 30 seconds
const MAX_TEXT_LENGTH = 5000; // Reasonable limit for TTS

/**
 * Custom React hook for handling Text-to-Speech (TTS) with Google Cloud Text-to-Speech API.
 * Provides high-quality Standard voices for free (4M characters/month free tier).
 * 
 * Features:
 * - Automatic resource cleanup and memory management
 * - Race condition prevention with request cancellation
 * - Debouncing for rapid consecutive calls
 * - Retry logic with exponential backoff
 * - Comprehensive error handling
 * - Development-mode debugging
 * 
 * @returns {UseGoogleTTSReturn}
 */
const useGoogleTTS = () => {
    // ========== State Management ==========
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [voicesLoaded] = useState(true); // Always true for Google TTS

    // ========== Refs ==========
    const audioRef = useRef(null);
    const blobUrlRef = useRef(null);
    const isMountedRef = useRef(true);
    const lastSpeakTimeRef = useRef(0);
    const pendingSpeakRef = useRef(null);
    const abortControllerRef = useRef(null);
    const retryCountRef = useRef(0);
    const currentRequestIdRef = useRef(0);

    // ========== Helper Functions ==========

    /**
     * Clamp a value between min and max
     */
    const clamp = useCallback((value, min, max) => {
        const num = Number(value);
        if (isNaN(num)) return min;
        return Math.min(Math.max(num, min), max);
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
     * Clean up audio resources safely
     */
    const cleanupAudio = useCallback(() => {
        // Stop and clean up audio element
        if (audioRef.current) {
            try {
                // Remove event listeners to prevent memory leaks
                audioRef.current.onloadstart = null;
                audioRef.current.oncanplay = null;
                audioRef.current.onplay = null;
                audioRef.current.onended = null;
                audioRef.current.onpause = null;
                audioRef.current.onerror = null;

                // Pause and reset audio
                audioRef.current.pause();
                audioRef.current.src = '';
                audioRef.current.load();
            } catch (err) {
                if (process.env.NODE_ENV === "development") {
                    console.warn('[Google TTS] Error cleaning up audio:', err);
                }
            }
            audioRef.current = null;
        }

        // Revoke blob URL to free memory
        if (blobUrlRef.current) {
            try {
                URL.revokeObjectURL(blobUrlRef.current);
            } catch (err) {
                if (process.env.NODE_ENV === "development") {
                    console.warn('[Google TTS] Error revoking blob URL:', err);
                }
            }
            blobUrlRef.current = null;
        }
    }, []);

    /**
     * Abort ongoing fetch request
     */
    const abortRequest = useCallback(() => {
        if (abortControllerRef.current) {
            try {
                abortControllerRef.current.abort();
            } catch (err) {
                if (process.env.NODE_ENV === "development") {
                    console.warn('[Google TTS] Error aborting request:', err);
                }
            }
            abortControllerRef.current = null;
        }
    }, []);

    /**
     * Check if Google TTS is supported (always true in browser)
     */
    const isSupported = useCallback(() => {
        return typeof window !== "undefined" && typeof Audio !== "undefined";
    }, []);

    /**
     * Clear current error
     */
    const clearError = useCallback(() => {
        safeSetState(() => setError(null));
    }, [safeSetState]);

    /**
     * Stop current speech completely
     */
    const stop = useCallback(() => {
        abortRequest();
        cleanupAudio();
        retryCountRef.current = 0;
        currentRequestIdRef.current += 1;

        safeSetState(() => {
            setIsSpeaking(false);
            setIsLoading(false);
        });

        pendingSpeakRef.current = null;

        if (process.env.NODE_ENV === "development") {
            console.debug("[Google TTS] Speech stopped");
        }
    }, [abortRequest, cleanupAudio, safeSetState]);

    /**
     * Pause current speech
     */
    const pause = useCallback(() => {
        if (audioRef.current && !audioRef.current.paused) {
            try {
                audioRef.current.pause();
                safeSetState(() => setIsSpeaking(false));

                if (process.env.NODE_ENV === "development") {
                    console.debug("[Google TTS] Speech paused");
                }
            } catch (err) {
                console.error("[Google TTS] Error pausing speech:", err);
                safeSetState(() => setError("Failed to pause speech"));
            }
        }
    }, [safeSetState]);

    /**
     * Resume paused speech
     */
    const resume = useCallback(() => {
        if (audioRef.current && audioRef.current.paused && audioRef.current.src) {
            const audio = audioRef.current;

            audio.play()
                .then(() => {
                    safeSetState(() => setIsSpeaking(true));
                    if (process.env.NODE_ENV === "development") {
                        console.debug("[Google TTS] Speech resumed");
                    }
                })
                .catch((err) => {
                    console.error("[Google TTS] Error resuming speech:", err);
                    safeSetState(() => {
                        setError("Failed to resume speech");
                        setIsSpeaking(false);
                    });
                });
        }
    }, [safeSetState]);

    /**
     * Get available voices (returns empty array for compatibility with Web Speech API interface)
     */
    const getAvailableVoices = useCallback(() => {
        return [];
    }, []);

    /**
     * Fetch audio from API with timeout and retry logic
     */
    const fetchAudioWithRetry = useCallback(
        async (apiUrl, retryCount = 0) => {
            const controller = new AbortController();
            abortControllerRef.current = controller;

            // Set up timeout
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, FETCH_TIMEOUT);

            try {
                const response = await fetch(apiUrl, {
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMsg = errorData.error || `HTTP error! status: ${response.status}`;

                    // Retry on server errors (5xx) or rate limiting (429)
                    if ((response.status >= 500 || response.status === 429) && retryCount < MAX_RETRIES) {
                        const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];

                        if (process.env.NODE_ENV === "development") {
                            console.debug(`[Google TTS] Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
                        }

                        await new Promise(resolve => setTimeout(resolve, delay));
                        return fetchAudioWithRetry(apiUrl, retryCount + 1);
                    }

                    throw new Error(errorMsg);
                }

                // Get audio data as blob
                const audioBlob = await response.blob();

                // Validate blob
                if (!audioBlob || audioBlob.size === 0) {
                    throw new Error("Received empty audio data");
                }

                return audioBlob;
            } catch (err) {
                clearTimeout(timeoutId);

                // Handle abort
                if (err.name === 'AbortError') {
                    throw new Error("Request was cancelled");
                }

                // Handle timeout
                if (err.message.includes('timeout')) {
                    if (retryCount < MAX_RETRIES) {
                        const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return fetchAudioWithRetry(apiUrl, retryCount + 1);
                    }
                    throw new Error("Request timed out");
                }

                throw err;
            } finally {
                abortControllerRef.current = null;
            }
        },
        [] // Constants are module-level, no need to include in dependencies
    );

    /**
     * Main speak function with comprehensive error handling and race condition prevention
     */
    const speak = useCallback(
        async (text, options = {}) => {
            // Generate unique request ID to handle race conditions
            const requestId = ++currentRequestIdRef.current;

            // Validation - Browser support
            if (!isSupported()) {
                const errorMsg = "Google TTS is not supported in this browser";
                safeSetState(() => setError(errorMsg));
                console.warn(`[Google TTS] ${errorMsg}`);
                return;
            }

            // Validation - Text
            if (typeof text !== "string" || !text.trim()) {
                if (process.env.NODE_ENV === "development") {
                    console.warn("[Google TTS] Invalid or empty text provided:", text);
                }
                return;
            }

            // Validation - Text length
            if (text.length > MAX_TEXT_LENGTH) {
                const errorMsg = `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`;
                safeSetState(() => setError(errorMsg));
                console.warn(`[Google TTS] ${errorMsg}`);
                return;
            }

            // Debounce rapid consecutive calls
            const now = Date.now();
            if (now - lastSpeakTimeRef.current < DEBOUNCE_DELAY) {
                if (process.env.NODE_ENV === "development") {
                    console.debug("[Google TTS] Speech request debounced");
                }
                return;
            }
            lastSpeakTimeRef.current = now;

            // Store pending speak request
            pendingSpeakRef.current = { text, options, requestId };

            // Cleanup previous speech and abort any ongoing requests
            abortRequest();
            cleanupAudio();
            retryCountRef.current = 0;

            safeSetState(() => {
                setIsLoading(true);
                setError(null);
                setIsSpeaking(false);
            });

            try {
                // Check if request is still valid (not superseded by another request)
                if (requestId !== currentRequestIdRef.current) {
                    if (process.env.NODE_ENV === "development") {
                        console.debug("[Google TTS] Request superseded by newer request");
                    }
                    return;
                }

                // Prepare and validate options
                const lang = typeof options.lang === 'string' ? options.lang : "en-US";
                const voice = options.voice || null;
                const volume = clamp(options.volume ?? 1.0, 0, 1);
                const rate = clamp(options.rate ?? 1.0, 0.5, 2.0);

                // Build API URL with proper encoding
                const params = new URLSearchParams();
                params.append('text', text.trim());
                params.append('lang', lang);

                if (voice) {
                    params.append('voice', voice);
                }

                const apiUrl = `${API_BASE_URL}?${params.toString()}`;

                if (process.env.NODE_ENV === "development") {
                    console.debug("[Google TTS] Fetching audio from API");
                }

                // Fetch audio with retry logic
                const audioBlob = await fetchAudioWithRetry(apiUrl);

                // Check if request is still valid after async operation
                if (requestId !== currentRequestIdRef.current) {
                    if (process.env.NODE_ENV === "development") {
                        console.debug("[Google TTS] Request superseded after fetch");
                    }
                    return;
                }

                // Create blob URL
                const blobUrl = URL.createObjectURL(audioBlob);
                blobUrlRef.current = blobUrl;

                // Create audio element
                const audio = new Audio(blobUrl);
                audioRef.current = audio;

                // Set audio properties
                audio.volume = volume;
                audio.playbackRate = rate;
                audio.preload = 'auto';

                // Set up event handlers with request ID validation
                audio.onloadstart = () => {
                    if (!isMountedRef.current || requestId !== currentRequestIdRef.current) return;
                    safeSetState(() => {
                        setIsLoading(true);
                        setIsSpeaking(false);
                    });
                };

                audio.oncanplay = () => {
                    if (!isMountedRef.current || requestId !== currentRequestIdRef.current) return;
                    safeSetState(() => {
                        setIsLoading(false);
                    });
                };

                audio.onplay = () => {
                    if (!isMountedRef.current || requestId !== currentRequestIdRef.current) return;
                    safeSetState(() => {
                        setIsSpeaking(true);
                        setIsLoading(false);
                    });

                    // Clear pending request only if it matches current request
                    if (pendingSpeakRef.current?.requestId === requestId) {
                        pendingSpeakRef.current = null;
                    }

                    if (process.env.NODE_ENV === "development") {
                        console.debug("[Google TTS] Speech started");
                    }
                };

                audio.onended = () => {
                    if (!isMountedRef.current || requestId !== currentRequestIdRef.current) return;

                    cleanupAudio();
                    retryCountRef.current = 0;

                    safeSetState(() => {
                        setIsSpeaking(false);
                        setIsLoading(false);
                    });

                    if (pendingSpeakRef.current?.requestId === requestId) {
                        pendingSpeakRef.current = null;
                    }

                    if (process.env.NODE_ENV === "development") {
                        console.debug("[Google TTS] Speech ended");
                    }
                };

                audio.onpause = () => {
                    if (!isMountedRef.current || requestId !== currentRequestIdRef.current) return;
                    safeSetState(() => setIsSpeaking(false));

                    if (process.env.NODE_ENV === "development") {
                        console.debug("[Google TTS] Speech paused");
                    }
                };

                audio.onerror = (event) => {
                    if (!isMountedRef.current || requestId !== currentRequestIdRef.current) return;

                    const audioError = event.target?.error;
                    const errorCode = audioError?.code;
                    let errorMsg = "Failed to play audio";

                    // Provide more specific error messages based on error code
                    if (errorCode === MediaError.MEDIA_ERR_ABORTED) {
                        errorMsg = "Audio playback was aborted";
                    } else if (errorCode === MediaError.MEDIA_ERR_NETWORK) {
                        errorMsg = "Network error occurred during audio playback";
                    } else if (errorCode === MediaError.MEDIA_ERR_DECODE) {
                        errorMsg = "Audio decoding failed";
                    } else if (errorCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                        errorMsg = "Audio format not supported";
                    }

                    console.error("[Google TTS] Audio playback error:", errorMsg, event);

                    cleanupAudio();
                    retryCountRef.current = 0;

                    safeSetState(() => {
                        setError(errorMsg);
                        setIsSpeaking(false);
                        setIsLoading(false);
                    });

                    if (pendingSpeakRef.current?.requestId === requestId) {
                        pendingSpeakRef.current = null;
                    }
                };

                // Start playback with improved error handling for autoplay policy
                try {
                    await audio.play();
                } catch (playError) {
                    // Handle autoplay policy violations
                    if (playError.name === 'NotAllowedError' || playError.name === 'NotSupportedError') {
                        const autoplayErrorMsg = "Audio playback blocked by browser. Please interact with the page first (e.g., click anywhere) to enable audio playback.";
                        console.warn("[Google TTS] Autoplay blocked:", autoplayErrorMsg);
                        
                        // Try to provide helpful feedback
                        safeSetState(() => {
                            setError(autoplayErrorMsg);
                            setIsLoading(false);
                            setIsSpeaking(false);
                        });
                        
                        // Clean up audio resources
                        cleanupAudio();
                        retryCountRef.current = 0;
                        
                        if (pendingSpeakRef.current?.requestId === requestId) {
                            pendingSpeakRef.current = null;
                        }
                        
                        return;
                    }
                    
                    // Re-throw other errors to be handled by outer catch
                    throw playError;
                }

            } catch (err) {
                // Only handle error if this request is still current
                if (requestId !== currentRequestIdRef.current) {
                    if (process.env.NODE_ENV === "development") {
                        console.debug("[Google TTS] Error from superseded request, ignoring");
                    }
                    return;
                }

                console.error("[Google TTS] Error in speak function:", err);

                cleanupAudio();
                retryCountRef.current = 0;

                const errorMsg = err.message || "Failed to synthesize speech";
                safeSetState(() => {
                    setError(errorMsg);
                    setIsLoading(false);
                    setIsSpeaking(false);
                });

                if (pendingSpeakRef.current?.requestId === requestId) {
                    pendingSpeakRef.current = null;
                }
            }
        },
        [isSupported, safeSetState, abortRequest, cleanupAudio, clamp, fetchAudioWithRetry]
    );

    /**
     * Public cleanup function
     */
    const cleanup = useCallback(() => {
        abortRequest();
        cleanupAudio();
        retryCountRef.current = 0;
        currentRequestIdRef.current += 1;

        safeSetState(() => {
            setIsSpeaking(false);
            setIsLoading(false);
        });
    }, [abortRequest, cleanupAudio, safeSetState]);

    // ========== Effects ==========

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;

            // Abort any ongoing requests
            if (abortControllerRef.current) {
                try {
                    abortControllerRef.current.abort();
                } catch (err) {
                    // Ignore errors during unmount
                }
            }

            // Clean up audio resources
            cleanupAudio();
        };
    }, [cleanupAudio]);

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

export { useGoogleTTS };
