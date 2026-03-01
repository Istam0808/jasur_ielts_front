/**
 * Helper functions for Shadowing Player component
 * Pure utility functions for data transformation and formatting
 */

import { MEDIA } from "./shadowingConstants";

/**
 * Format a decimal value (0-1) as a percentage string (0%-100%)
 * 
 * @param {number} value - Decimal value between 0 and 1
 * @returns {string} Formatted percentage string (e.g., "85%")
 * 
 * @example
 * formatPercentage(0.85) // Returns "85%"
 * formatPercentage(0.123) // Returns "12%"
 */
export function formatPercentage(value) {
  return `${Math.round(value * 100)}%`;
}

/**
 * Extract reference text from item data
 * Uses item.text if available, otherwise joins all subtitle texts
 * 
 * @param {Object} item - Item object with text or subtitles array
 * @param {string} [item.text] - Direct text property
 * @param {Array<Object>} [item.subtitles] - Array of subtitle objects with text property
 * @returns {string} Reference text string
 * 
 * @example
 * getReferenceText({ text: "Hello world" }) // Returns "Hello world"
 * getReferenceText({ subtitles: [{ text: "Hello" }, { text: "world" }] }) // Returns "Hello world"
 */
export function getReferenceText(item) {
  if (item?.text) {
    return item.text;
  }
  
  if (Array.isArray(item?.subtitles) && item.subtitles.length > 0) {
    return item.subtitles.map((s) => s.text).join(" ");
  }
  
  return "";
}

/**
 * Determine the best MIME type for MediaRecorder
 * Prefers webm for better browser support, falls back to mp4
 * 
 * @returns {string} MIME type string for audio recording
 * 
 * @example
 * getMimeType() // Returns "audio/webm" or "audio/mp4"
 */
export function getMimeType() {
  return MediaRecorder.isTypeSupported(MEDIA.PREFERRED_MIME_TYPE)
    ? MEDIA.PREFERRED_MIME_TYPE
    : MEDIA.FALLBACK_MIME_TYPE;
}
