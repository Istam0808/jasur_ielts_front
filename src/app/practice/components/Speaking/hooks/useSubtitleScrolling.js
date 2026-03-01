import { useRef, useEffect } from "react";
import { DELAYS } from "../utils/shadowingConstants";

/**
 * Custom hook for managing subtitle auto-scrolling
 * Automatically scrolls to the active subtitle based on audio playback time
 * Uses throttling to optimize performance
 * 
 * @param {HTMLAudioElement|null} audioElement - Audio element reference
 * @param {Array<Object>} subtitles - Array of subtitle objects with start and text properties
 * @returns {React.RefObject<HTMLDivElement>} transcriptScrollRef - Ref to the scrollable container
 */
export function useSubtitleScrolling(audioElement, subtitles) {
  const transcriptScrollRef = useRef(null);

  // Effect: Throttled subtitle auto-scroll for better performance
  useEffect(() => {
    const audio = audioElement;
    const scrollContainer = transcriptScrollRef.current;

    // Exit if any required elements missing or no subtitles
    if (
      !audio ||
      !scrollContainer ||
      !Array.isArray(subtitles) ||
      subtitles.length === 0
    ) {
      return;
    }

    let lastUpdateTime = 0; // Track last update time for throttling

    // Event handler: Called every time audio time updates
    const handleTimeUpdate = () => {
      const now = Date.now(); // Get current timestamp

      // Skip update if too soon since last update (throttling)
      if (now - lastUpdateTime < DELAYS.SUBTITLE_SCROLL_THROTTLE) return;
      lastUpdateTime = now; // Update last update time

      const currentTime = audio.currentTime; // Get current audio playback time

      // Find the current subtitle index based on audio time
      const currentIndex = subtitles.findIndex((sub, idx) => {
        const nextSub = subtitles[idx + 1]; // Get next subtitle
        const start = sub.start || 0; // Start time of current subtitle
        const end = nextSub ? nextSub.start : Infinity; // End time (start of next, or infinity for last)

        // Check if current time falls within this subtitle's time range
        return currentTime >= start && currentTime < end;
      });

      // If a matching subtitle was found
      if (currentIndex !== -1) {
        // Find the subtitle DOM element using data attribute
        const subtitleElement = scrollContainer.querySelector(
          `[data-subtitle-index="${currentIndex}"]`
        );

        if (subtitleElement) {
          // Scroll the element into view (centered vertically)
          subtitleElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          // Remove 'active' class from all subtitle items
          scrollContainer
            .querySelectorAll(".subtitle-item")
            .forEach((el) => el.classList.remove("active"));

          // Add 'active' class to current subtitle
          subtitleElement.classList.add("active");
        }
      }
    };

    // Attach event listener to audio element
    audio.addEventListener("timeupdate", handleTimeUpdate);

    // Cleanup: remove event listener on unmount or when dependencies change
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
  }, [audioElement, subtitles]); // Re-run when subtitles change

  return transcriptScrollRef;
}
