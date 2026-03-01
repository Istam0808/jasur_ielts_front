import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useGoogleTTS } from "./useGoogleTTS";
import { useTextToSpeech } from "./useTextToSpeech";

/**
 * @typedef {Object} SpeechOptions
 * @property {number} [rate=1.0] - Speech rate (0.5 to 2.0)
 * @property {number} [pitch=1.0] - Speech pitch (not directly supported, kept for compatibility)
 * @property {number} [volume=1.0] - Speech volume (0 to 1)
 * @property {string} [lang='en-US'] - Language code
 * @property {string} [voice] - Specific voice name to use
 */

/**
 * @typedef {Object} UseHybridTTSReturn
 * @property {(text: string, options?: SpeechOptions) => void} speak - Speak the given text
 * @property {() => void} stop - Stop current speech
 * @property {() => void} pause - Pause current speech
 * @property {() => void} resume - Resume paused speech
 * @property {() => Array} getAvailableVoices - Get all available voices
 * @property {() => boolean} isSupported - Check if TTS is supported (always true)
 * @property {() => void} clearError - Clear current error
 * @property {() => void} cleanup - Clean up resources
 * @property {boolean} isSpeaking - Whether currently speaking
 * @property {boolean} isLoading - Whether loading/preparing
 * @property {string|null} error - Current error message
 * @property {boolean} voicesLoaded - Whether voices have loaded
 * @property {'google'|'native'|null} activeService - Which TTS service is currently active
 */

/**
 * Hybrid TTS hook - Uses Google Cloud TTS as primary with native Web Speech API as fallback.
 * 
 * Features:
 * - High-quality Standard voices from Google Cloud TTS (4M chars/month free)
 * - Automatic fallback to native voices if Google TTS fails or API key not configured
 * - Seamless service switching
 * - Reliable speech always works
 * 
 * @returns {UseHybridTTSReturn}
 */
const useHybridTTS = () => {
    // Use both TTS hooks
    const googleTTS = useGoogleTTS();
    const nativeTTS = useTextToSpeech();

    // Track which service is currently active
    const [activeService, setActiveService] = useState(null);
    const googleTTSFailedRef = useRef(false); // Track if Google TTS has failed
    const pendingFallbackRef = useRef(null); // Track pending fallback requests

    /**
     * Monitor Google TTS errors and trigger fallback
     */
    useEffect(() => {
        if (activeService === 'google' && googleTTS.error && !googleTTSFailedRef.current) {
            // Check if error is due to missing API key or service unavailable
            const isConfigError = googleTTS.error.includes('API key') || 
                                  googleTTS.error.includes('not configured') ||
                                  googleTTS.error.includes('503');

            if (isConfigError || googleTTS.error.includes('synthesis failed')) {
                // Google TTS encountered an error, mark as failed
                googleTTSFailedRef.current = true;
                
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[Hybrid TTS] Google TTS error detected, will use native for next request:', googleTTS.error);
                }
                
                // If we have a pending fallback request, execute it
                if (pendingFallbackRef.current) {
                    const { text, options } = pendingFallbackRef.current;
                    pendingFallbackRef.current = null;
                    
                    googleTTS.stop();
                    googleTTS.clearError();
                    
                    setActiveService('native');
                    nativeTTS.speak(text, options);
                }
            }
        }
    }, [googleTTS.error, activeService, googleTTS, nativeTTS]);

    /**
     * Speak function with automatic fallback
     */
    const speak = useCallback(
        (text, options = {}) => {
            // If Google TTS hasn't failed, try it first
            if (!googleTTSFailedRef.current) {
                setActiveService('google');
                pendingFallbackRef.current = { text, options }; // Store for potential fallback
                
                // Try Google TTS (async, errors handled via useEffect monitoring error state)
                googleTTS.speak(text, options).catch(() => {
                    // Promise rejection handled - error state will trigger fallback via useEffect
                });
            } else {
                // Google TTS has failed before, use native directly
                setActiveService('native');
                pendingFallbackRef.current = null;
                nativeTTS.speak(text, options);
            }
        },
        [googleTTS, nativeTTS]
    );

    /**
     * Stop current speech
     */
    const stop = useCallback(() => {
        googleTTS.stop();
        nativeTTS.stop();
        setActiveService(null);
    }, [googleTTS, nativeTTS]);

    /**
     * Pause current speech
     */
    const pause = useCallback(() => {
        if (activeService === 'google') {
            googleTTS.pause();
        } else if (activeService === 'native') {
            nativeTTS.pause();
        }
    }, [activeService, googleTTS, nativeTTS]);

    /**
     * Resume paused speech
     */
    const resume = useCallback(() => {
        if (activeService === 'google') {
            googleTTS.resume();
        } else if (activeService === 'native') {
            nativeTTS.resume();
        }
    }, [activeService, googleTTS, nativeTTS]);

    /**
     * Get available voices (from native TTS since Google TTS voices are managed server-side)
     */
    const getAvailableVoices = useCallback(() => {
        return nativeTTS.getAvailableVoices();
    }, [nativeTTS]);

    /**
     * Check if TTS is supported (always true since we have fallback)
     */
    const isSupported = useCallback(() => {
        return nativeTTS.isSupported(); // Native is always the fallback
    }, [nativeTTS]);

    /**
     * Clear error
     */
    const clearError = useCallback(() => {
        googleTTS.clearError();
        nativeTTS.clearError();
        // Reset Google TTS failure flag to allow retry
        googleTTSFailedRef.current = false;
        pendingFallbackRef.current = null;
    }, [googleTTS, nativeTTS]);

    /**
     * Cleanup
     */
    const cleanup = useCallback(() => {
        googleTTS.cleanup();
        nativeTTS.cleanup();
        setActiveService(null);
        googleTTSFailedRef.current = false;
        pendingFallbackRef.current = null;
    }, [googleTTS, nativeTTS]);

    // Determine current state (prioritize Google TTS if active, otherwise native)
    const isSpeaking = activeService === 'google' ? googleTTS.isSpeaking : nativeTTS.isSpeaking;
    const isLoading = activeService === 'google' ? googleTTS.isLoading : nativeTTS.isLoading;
    const error = activeService === 'google' ? googleTTS.error : nativeTTS.error;
    const voicesLoaded = nativeTTS.voicesLoaded; // Native voices are what we expose

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
            activeService,
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
            activeService,
        ]
    );
};

export { useHybridTTS };
