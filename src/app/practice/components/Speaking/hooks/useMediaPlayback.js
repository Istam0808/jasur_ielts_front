import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Custom hook for managing audio playback state
 * Handles audio element ref management, play/pause state tracking, and event listeners
 * 
 * @returns {Object} Media playback state and controls
 * @returns {boolean} isPlaying - Whether audio is currently playing
 * @returns {Function} togglePlay - Function to toggle play/pause
 * @returns {React.RefObject<HTMLAudioElement>} audioRef - Ref to the audio element
 */
export function useMediaPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // Effect: Set up audio element event listeners for play/pause state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Event handler: when audio starts playing
    const onPlay = () => setIsPlaying(true);

    // Event handler: when audio is paused
    const onPause = () => setIsPlaying(false);

    // Event handler: when audio playback ends
    const onEnded = () => setIsPlaying(false);

    // Attach event listeners
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    // Cleanup: remove event listeners on unmount
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []); // Empty dependency array = run once on mount

  // Memoized callback: Toggle play/pause for reference audio
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Toggle between play and pause
    if (isPlaying) {
      audio.pause(); // Pause if playing
    } else {
      audio.play().catch(() => {}); // Play if paused (ignore errors)
    }
  }, [isPlaying]);

  return {
    isPlaying,
    togglePlay,
    audioRef,
  };
}
