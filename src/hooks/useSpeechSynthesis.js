'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for text-to-speech via browser SpeechSynthesis API.
 * @returns {{ isSpeaking: boolean, toggle: (text: string, lang?: string, rate?: number) => void, stop: () => void }}
 */
export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const toggle = useCallback((text, lang = 'en', rate = 1.0) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;

    if (isSpeaking) {
      stop();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [isSpeaking, stop]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { isSpeaking, toggle, stop };
}
