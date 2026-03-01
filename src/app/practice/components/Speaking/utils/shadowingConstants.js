/**
 * Constants for Shadowing Player component
 * Centralized configuration values for animations, delays, and media settings
 */

// Animation durations (in milliseconds)
export const ANIMATION_DURATION = {
  REDUCED: 200,      // For low-powered devices
  FULL: 500,         // For standard animations
  SCORE_ANIMATION: 1500,  // Score animation duration
  PROGRESS_BAR: 1500,     // Progress bar animation duration
  PROGRESS_BAR_DELAY_TEXT_MATCH: 0,
  PROGRESS_BAR_DELAY_SPEECH_RATE: 150,
  PROGRESS_BAR_DELAY_COMPLETENESS: 300,
};

// Debounce and throttle delays (in milliseconds)
export const DELAYS = {
  TRANSCRIPT_DEBOUNCE: 150,        // Transcript debounce delay for display
  SPEECH_RECOGNITION_DEBOUNCE: 100, // Speech recognition transcript update delay (desktop)
  SPEECH_RECOGNITION_DEBOUNCE_MOBILE: 200, // Speech recognition transcript update delay (mobile)
  SUBTITLE_SCROLL_THROTTLE: 200,    // Subtitle scrolling throttle delay
  MOBILE_TRANSCRIPT_CAPTURE_DELAY: 350, // Delay before capturing transcript on mobile (ms)
  // Android: Simple delay to allow late-arriving results. With relaxed guard clauses,
  // results are captured immediately in handleResult, so we only need a brief delay.
  ANDROID_TRANSCRIPT_CAPTURE_DELAY: 400, // Brief delay for Android (reduced from 2500ms - no polling needed)
};

// Audio/Media settings
export const MEDIA = {
  PREFERRED_MIME_TYPE: "audio/webm",
  FALLBACK_MIME_TYPE: "audio/mp4",
};

// Score thresholds for styling (0-1 scale)
export const SCORE_THRESHOLDS = {
  EXCELLENT: 0.8,
  GOOD: 0.6,
  FAIR: 0.4,
};

// Animation easing
export const EASING = {
  EASE_OUT: "easeOut",
  EASE_IN_OUT: "easeInOut",
  LINEAR: "linear",
};
