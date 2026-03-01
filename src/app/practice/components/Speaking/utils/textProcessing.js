/**
 * Text Processing Utilities for Speech Analysis
 * 
 * A comprehensive suite of pure functions for text normalization, tokenization,
 * similarity analysis, and speech metrics calculation. Optimized for performance
 * and reliability in speech shadowing applications.
 * 
 * @module textProcessing
 * @version 2.0.0
 */

import i18n from '@/i18n/config';

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/**
 * Speech rate configuration for analysis
 * Typical conversational rates: 150-160 WPM (2.5-2.67 WPS)
 * @constant
 */
const SPEECH_RATE = Object.freeze({
  EXPECTED: 2.5,        // words per second (typical conversational rate)
  MIN: 1.5,             // minimum acceptable rate (90 WPM)
  MAX: 3.5,             // maximum acceptable rate (210 WPM)
  TOLERANCE: 0.2        // tolerance for "perfect" classification (±8%)
});

/**
 * Completeness thresholds for classification
 * @constant
 */
const COMPLETENESS_THRESHOLDS = Object.freeze({
  COMPLETE: 0.9,        // 90%+ considered complete
  ALMOST: 0.7,          // 70-89% almost there
  HALF: 0.5             // 50-69% halfway
});

/**
 * Validation thresholds for completeness scoring
 * @constant
 */
const COMPLETENESS_VALIDATION = Object.freeze({
  MIN_DURATION_RATIO: 0.7,      // 70% minimum duration
  MAX_DURATION_RATIO: 1.5,      // 150% maximum duration
  MIN_WORD_RATIO: 0.3,          // 30% minimum words
  MAX_WORD_RATIO: 2.0,          // 200% maximum words
  AUDIO_ENERGY_THRESHOLD: 0.01, // Voice detection threshold
  MIN_ACTIVE_RATIO: 0.3         // 30% of audio should be active speech
});

/**
 * Score classification thresholds
 * @constant
 */
const SCORE_THRESHOLDS = Object.freeze({
  EXCELLENT: 0.8,
  GOOD: 0.6
});

/**
 * Cache configuration
 * @constant
 */
const CACHE_CONFIG = Object.freeze({
  MAX_TOKEN_CACHE_SIZE: 100,
  MAX_SPEECH_RATE_CACHE_SIZE: 50,
  CACHE_CLEANUP_THRESHOLD: 0.9 // Clean when 90% full
});

/**
 * Text processing constants
 * @constant
 */
const TEXT_PROCESSING = Object.freeze({
  MAX_TEXT_LENGTH: 1000000,        // 1MB character limit for safety
  MIN_OVERLAP_RATIO: 0.1,          // 10% minimum word overlap
  MAX_LEVENSHTEIN_THRESHOLD: 1000  // Maximum distance calculation threshold
});

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * LRU Cache implementation with automatic cleanup and memory management
 * @class
 * @template K, V
 */
class LRUCache {
  /**
   * Creates a new LRU cache
   * @param {number} maxSize - Maximum number of entries
   */
  constructor(maxSize) {
    if (!Number.isInteger(maxSize) || maxSize <= 0) {
      throw new TypeError('maxSize must be a positive integer');
    }
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  /**
   * Gets a value from cache and updates its position
   * @param {K} key - Cache key
   * @returns {V|undefined} Cached value or undefined
   */
  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * Sets a value in cache with automatic eviction of oldest entry if needed
   * @param {K} key - Cache key
   * @param {V} value - Value to cache
   * @returns {void}
   */
  set(key, value) {
    // Remove if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (first item) when at capacity
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  /**
   * Checks if key exists in cache
   * @param {K} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Clears all cache entries
   * @returns {void}
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Gets current cache size
   * @returns {number}
   */
  get size() {
    return this.cache.size;
  }
}

// Initialize caches
const tokenCache = new LRUCache(CACHE_CONFIG.MAX_TOKEN_CACHE_SIZE);
const speechRateCache = new LRUCache(CACHE_CONFIG.MAX_SPEECH_RATE_CACHE_SIZE);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates and sanitizes string input
 * @private
 * @param {*} text - Input to validate
 * @param {number} [maxLength=TEXT_PROCESSING.MAX_TEXT_LENGTH] - Maximum allowed length
 * @returns {string} Validated string or empty string
 */
function validateString(text, maxLength = TEXT_PROCESSING.MAX_TEXT_LENGTH) {
  if (text == null || typeof text !== 'string') {
    return '';
  }

  // Prevent excessive memory usage
  if (text.length > maxLength) {
    console.warn(`Text truncated from ${text.length} to ${maxLength} characters`);
    return text.substring(0, maxLength);
  }

  return text;
}

/**
 * Validates numeric input with finite check
 * @private
 * @param {*} value - Value to validate
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Validated number
 */
function validateNumber(value, defaultValue = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultValue;
  }
  return value;
}

/**
 * Clamps a number between min and max values
 * @private
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Helper function to safely get translation with fallback
 * @private
 * @param {string} key - Translation key
 * @param {string} fallback - Fallback string
 * @param {Object} [options={}] - Translation options
 * @returns {string} Translated string
 */
function getTranslation(key, fallback, options = {}) {
  try {
    if (!i18n || typeof i18n.t !== 'function') {
      return fallback;
    }
    const translated = i18n.t(key, {
      ...options,
      defaultValue: fallback,
      ns: 'speaking'
    });
    return translated || fallback;
  } catch (error) {
    console.warn(`Translation failed for key: ${key}`, error);
    return fallback;
  }
}

// ============================================================================
// CORE TEXT PROCESSING
// ============================================================================

/**
 * Normalizes text by converting to lowercase, removing punctuation, and collapsing whitespace.
 * Uses Unicode-aware regex for international character support.
 * 
 * @param {string} text - The text to normalize
 * @returns {string} Normalized text, or empty string if input is invalid
 * 
 * @example
 * normalizeText("Hello, World! 123") // "hello world 123"
 * normalizeText("Café-résumé") // "café résumé"
 */
export function normalizeText(text) {
  const validated = validateString(text);
  if (!validated) {
    return '';
  }

  try {
    return validated
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')  // Keep letters, numbers, whitespace
      .replace(/\s+/g, ' ')                 // Collapse multiple spaces
      .trim();
  } catch (error) {
    // Fallback to ASCII-only normalization if Unicode regex fails
    console.warn('Unicode normalization failed, using ASCII fallback', error);
    return validated
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

/**
 * Tokenizes text into an array of words.
 * Performs normalization before tokenization.
 * Uses LRU cache to reduce redundant calculations.
 * 
 * @param {string} text - The text to tokenize
 * @returns {string[]} Array of words, or empty array if input is invalid
 * 
 * @example
 * tokenize("Hello, world!") // ["hello", "world"]
 * tokenize("  multiple   spaces  ") // ["multiple", "spaces"]
 */
export function tokenize(text) {
  const validated = validateString(text);
  if (!validated) {
    return [];
  }

  // Check cache first
  if (tokenCache.has(validated)) {
    return tokenCache.get(validated);
  }

  const normalized = normalizeText(validated);
  const tokens = normalized ? normalized.split(/\s+/).filter(Boolean) : [];

  // Cache the result
  tokenCache.set(validated, tokens);
  return tokens;
}

// ============================================================================
// STRING DISTANCE AND SIMILARITY
// ============================================================================

/**
 * Calculates the Levenshtein distance between two strings using dynamic programming.
 * Optimized with space-efficient single-array approach (O(n) space instead of O(m*n)).
 * Includes early exit optimization for better performance.
 * 
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {number} [maxDistance=Infinity] - Maximum distance threshold for early exit
 * @returns {number} Edit distance (minimum number of single-character edits)
 * 
 * @example
 * levenshteinDistance("kitten", "sitting") // 3
 * levenshteinDistance("", "hello") // 5
 * levenshteinDistance("hello", "hello") // 0
 */
export function levenshteinDistance(str1, str2, maxDistance = Infinity) {
  // Validate inputs
  const s1 = validateString(str1, TEXT_PROCESSING.MAX_LEVENSHTEIN_THRESHOLD);
  const s2 = validateString(str2, TEXT_PROCESSING.MAX_LEVENSHTEIN_THRESHOLD);

  // Early exits
  if (s1 === s2) return 0;
  if (!s1) return s2.length;
  if (!s2) return s1.length;

  const len1 = s1.length;
  const len2 = s2.length;

  // If length difference exceeds max, no need to calculate
  if (Math.abs(len1 - len2) > maxDistance) {
    return maxDistance + 1;
  }

  // Optimize: ensure str2 is the shorter string (reduces space complexity)
  if (len1 < len2) {
    return levenshteinDistance(s2, s1, maxDistance);
  }

  // Use rolling arrays for O(min(m,n)) space complexity
  let prev = new Array(len2 + 1);
  let curr = new Array(len2 + 1);

  // Initialize first row
  for (let j = 0; j <= len2; j++) {
    prev[j] = j;
  }

  // Dynamic programming: fill the matrix with early exit
  for (let i = 1; i <= len1; i++) {
    curr[0] = i;
    let rowMin = i;

    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;

      curr[j] = Math.min(
        prev[j] + 1,      // Deletion
        curr[j - 1] + 1,  // Insertion
        prev[j - 1] + cost // Substitution
      );

      rowMin = Math.min(rowMin, curr[j]);
    }

    // Early exit: if minimum in this row > maxDistance, stop
    if (rowMin > maxDistance) {
      return maxDistance + 1;
    }

    // Swap arrays for next iteration
    [prev, curr] = [curr, prev];
  }

  return prev[len2];
}

/**
 * Calculates similarity ratio between two strings (0-1 scale).
 * Uses normalized Levenshtein distance with optimization.
 * Handles edge cases gracefully.
 * 
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0 (completely different) and 1 (identical)
 * 
 * @example
 * calculateSimilarity("hello", "hello") // 1
 * calculateSimilarity("hello", "hallo") // 0.8
 * calculateSimilarity("", "") // 1
 * calculateSimilarity("abc", "") // 0
 */
function calculateSimilarity(str1, str2) {
  const s1 = validateString(str1);
  const s2 = validateString(str2);

  // Handle edge cases
  if (!s1 && !s2) return 1;
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  const maxLen = Math.max(s1.length, s2.length);

  // Early exit if strings are too different in length
  if (Math.abs(s1.length - s2.length) > maxLen * 0.5) {
    const distance = levenshteinDistance(s1, s2, Math.ceil(maxLen * 0.5));
    return Math.max(0, 1 - (distance / maxLen));
  }

  const distance = levenshteinDistance(s1, s2, maxLen);
  return Math.max(0, 1 - (distance / maxLen));
}

// ============================================================================
// SEQUENCE ANALYSIS
// ============================================================================

/**
 * Calculates Longest Common Subsequence (LCS) length between two arrays.
 * Uses space-optimized dynamic programming approach.
 * 
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {number} Length of LCS
 * 
 * @example
 * longestCommonSubsequence([1,2,3], [1,3,2]) // 2
 * longestCommonSubsequence([], [1,2,3]) // 0
 * longestCommonSubsequence(["a","b"], ["a","b"]) // 2
 */
function longestCommonSubsequence(arr1, arr2) {
  // Validation
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
    return 0;
  }

  const m = arr1.length;
  const n = arr2.length;

  if (m === 0 || n === 0) return 0;

  // Optimize: ensure arr2 is the shorter array
  if (m < n) {
    return longestCommonSubsequence(arr2, arr1);
  }

  // Use space-optimized version (two rows instead of full matrix)
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/**
 * Calculates word overlap ratio between two sets of words
 * Uses Set for O(1) lookup performance
 * 
 * @private
 * @param {string[]} refWords - Reference words
 * @param {string[]} hypWords - Hypothesis words
 * @returns {number} Overlap ratio (0-1)
 */
function calculateWordOverlap(refWords, hypWords) {
  if (!Array.isArray(refWords) || !Array.isArray(hypWords)) {
    return 0;
  }

  if (refWords.length === 0) return 0;
  if (hypWords.length === 0) return 0;

  const hypSet = new Set(hypWords);
  const matchedWords = refWords.filter(w => hypSet.has(w)).length;

  return matchedWords / refWords.length;
}

// ============================================================================
// TEXT MATCH VALIDATION
// ============================================================================

/**
 * Validates text match inputs and provides early exit for unrelated content.
 * 
 * @private
 * @param {string} reference - Reference text
 * @param {string} transcript - Transcript text
 * @returns {Object} Validation result with isValid flag and optional score/reason
 */
function validateTextMatchInputs(reference, transcript) {
  const refWords = tokenize(reference);
  const hypWords = tokenize(transcript);

  // If no transcript words, return 0
  if (hypWords.length === 0) {
    return {
      isValid: false,
      score: 0,
      reason: 'no_transcript'
    };
  }

  // If no reference, return 1 (nothing to compare against)
  if (refWords.length === 0) {
    return {
      isValid: false,
      score: 1,
      reason: 'no_reference'
    };
  }

  // Calculate word overlap ratio
  const overlapRatio = calculateWordOverlap(refWords, hypWords);

  // If less than minimum overlap threshold, likely unrelated content
  if (overlapRatio < TEXT_PROCESSING.MIN_OVERLAP_RATIO) {
    return {
      isValid: false,
      score: 0,
      reason: 'minimal_overlap'
    };
  }

  return { isValid: true };
}

// ============================================================================
// WORD SEQUENCE SCORING
// ============================================================================

/**
 * Calculates word sequence score using LCS for position awareness.
 * Provides comprehensive metrics including precision, recall, and F1 score.
 * 
 * @private
 * @param {Array<string>} refWords - Reference words
 * @param {Array<string>} hypWords - Hypothesis words
 * @returns {Object} Word analysis with sequence score, presence score, and combined score
 */
function calculateWordSequenceScore(refWords, hypWords) {
  // Validation
  if (!Array.isArray(refWords) || !Array.isArray(hypWords)) {
    return {
      sequenceScore: 0,
      presenceScore: 0,
      combinedScore: 0,
      precision: 0,
      recall: 0
    };
  }

  // Handle empty arrays
  if (refWords.length === 0 && hypWords.length === 0) {
    return {
      sequenceScore: 1,
      presenceScore: 1,
      combinedScore: 1,
      precision: 1,
      recall: 1
    };
  }

  if (refWords.length === 0) {
    return {
      sequenceScore: 0,
      presenceScore: 0,
      combinedScore: 0,
      precision: 0,
      recall: 1
    };
  }

  if (hypWords.length === 0) {
    return {
      sequenceScore: 0,
      presenceScore: 0,
      combinedScore: 0,
      precision: 1,
      recall: 0
    };
  }

  // LCS for word order/position awareness
  const lcs = longestCommonSubsequence(refWords, hypWords);
  const sequenceScore = lcs / refWords.length;

  // Word presence score using precision/recall/F1
  const hypSet = new Set(hypWords);
  const refSet = new Set(refWords);

  const matchedInRef = refWords.filter(w => hypSet.has(w)).length;
  const matchedInHyp = hypWords.filter(w => refSet.has(w)).length;

  const precision = matchedInHyp / hypWords.length;
  const recall = matchedInRef / refWords.length;

  // F1 score (harmonic mean of precision and recall)
  const f1Score = (precision + recall) > 0
    ? (2 * precision * recall) / (precision + recall)
    : 0;

  // Combined score: sequence matters more than mere word presence
  const combinedScore = sequenceScore * 0.6 + f1Score * 0.4;

  return {
    sequenceScore,
    presenceScore: f1Score,
    combinedScore,
    precision,
    recall
  };
}

// ============================================================================
// TEXT MATCH CALCULATION
// ============================================================================

/**
 * Calculates comprehensive text match score between reference and transcript.
 * Provides both character-level and word-level analysis with position awareness.
 * 
 * @param {string} reference - Reference text (expected output)
 * @param {string} transcript - User transcript (actual output)
 * @returns {Object} Match analysis with score and detailed metrics
 * @returns {number} return.score - Overall match score (0-1)
 * @returns {Object} return.details - Detailed metrics
 * 
 * @example
 * calculateTextMatch("hello world", "hello world")
 * // { score: 1, details: { similarity: 100, wordAccuracy: 100, ... } }
 */
export function calculateTextMatch(reference, transcript) {
  const ref = normalizeText(reference);
  const hyp = normalizeText(transcript);

  // Validation layer with early exit
  const validation = validateTextMatchInputs(ref, hyp);
  if (!validation.isValid) {
    const score = validation.score || 0;
    return {
      score,
      details: {
        similarity: Math.round(score * 100),
        wordAccuracy: Math.round(score * 100),
        sequenceAccuracy: Math.round(score * 100),
        lengthRatio: score,
        referenceLength: ref.length,
        transcriptLength: hyp.length,
        referenceWords: 0,
        transcriptWords: 0,
        reason: validation.reason
      }
    };
  }

  const refWords = tokenize(ref);
  const hypWords = tokenize(hyp);

  // Word-level analysis (position-aware)
  const wordAnalysis = calculateWordSequenceScore(refWords, hypWords);

  // Character-level similarity (only if words have decent overlap)
  // This saves computation for clearly unrelated texts
  const charSimilarity = wordAnalysis.presenceScore > 0.2
    ? calculateSimilarity(ref, hyp)
    : 0;

  // Length ratio with bounds checking
  const maxLen = Math.max(hyp.length, ref.length) || 1;
  const minLen = Math.min(hyp.length, ref.length);
  const lengthRatio = minLen / maxLen;

  // Length penalty for excessive or insufficient content
  let lengthPenalty = 1.0;
  if (lengthRatio < 0.5) {
    lengthPenalty = 0.5; // Heavy penalty for very short/long text
  } else if (lengthRatio < 0.7) {
    lengthPenalty = 0.8; // Moderate penalty
  }

  // Weighted composite score - prioritize word sequence
  const rawScore = (
    wordAnalysis.sequenceScore * 0.45 +      // Sequence/order matters most
    wordAnalysis.presenceScore * 0.30 +      // Word presence matters
    charSimilarity * 0.15 +                  // Character similarity (typos)
    lengthRatio * 0.10                       // Length appropriateness
  );

  const finalScore = clamp(rawScore * lengthPenalty, 0, 1);

  return {
    score: finalScore,
    details: {
      similarity: Math.round(charSimilarity * 100),
      wordAccuracy: Math.round(wordAnalysis.presenceScore * 100),
      sequenceAccuracy: Math.round(wordAnalysis.sequenceScore * 100),
      lengthRatio: parseFloat(lengthRatio.toFixed(2)),
      referenceLength: ref.length,
      transcriptLength: hyp.length,
      referenceWords: refWords.length,
      transcriptWords: hypWords.length
    }
  };
}

// ============================================================================
// SPEECH RATE ANALYSIS
// ============================================================================

/**
 * Calculates speed score using bidirectional piecewise function with tolerance zone.
 * 
 * @private
 * @param {number} userRate - User's speech rate (words per second)
 * @param {number} expected - Expected speech rate
 * @param {number} tolerance - Tolerance for perfect zone
 * @param {number} min - Minimum acceptable rate
 * @param {number} max - Maximum acceptable rate
 * @returns {Object} Score and zone information
 */
function calculateSpeedScore(userRate, expected, tolerance, min, max) {
  // Validation
  const rate = validateNumber(userRate, 0);

  if (rate <= 0) {
    return {
      score: 0,
      zone: 'poor',
      direction: 'perfect'
    };
  }

  // Perfect zone - within tolerance
  const deviation = Math.abs(rate - expected);
  if (deviation <= tolerance) {
    return {
      score: 1.0,
      zone: 'perfect',
      direction: 'perfect'
    };
  }

  // Outside acceptable range - exponential decay with cubic penalty
  if (rate < min) {
    const severity = Math.min(1, (min - rate) / min);
    const score = Math.max(0, Math.pow(1 - severity, 3));
    return {
      score,
      zone: 'poor',
      direction: 'slower'
    };
  }

  if (rate > max) {
    const severity = Math.min(1, (rate - max) / max);
    const score = Math.max(0, Math.pow(1 - severity, 3));
    return {
      score,
      zone: 'poor',
      direction: 'faster'
    };
  }

  // Between tolerance and min/max - graduated penalty
  const distance = rate < expected
    ? (expected - tolerance) - rate
    : rate - (expected + tolerance);

  const maxDistance = rate < expected
    ? (expected - tolerance) - min
    : max - (expected + tolerance);

  const ratio = maxDistance > 0 ? distance / maxDistance : 0;
  const score = 1 - (ratio * 0.3); // Max 30% penalty in this zone

  // Determine zone
  let zone;
  if (score >= 0.85) {
    zone = 'good';
  } else if (score >= 0.60) {
    zone = 'acceptable';
  } else {
    zone = 'poor';
  }

  return {
    score: clamp(score, 0, 1),
    zone,
    direction: rate < expected ? 'slower' : 'faster'
  };
}

/**
 * Status message lookup table for consistent messaging
 * @private
 * @returns {Array} Status message thresholds
 */
function getStatusLookup() {
  return [
    {
      threshold: 0.95,
      message: getTranslation(
        'menu.shadowing.player.analysis.messages.speechRate.perfectPace',
        "Perfect pace!"
      )
    },
    {
      threshold: 0.80,
      message: getTranslation(
        'menu.shadowing.player.analysis.messages.speechRate.greatRhythm',
        "Great rhythm!"
      )
    },
    {
      threshold: 0.60,
      message: getTranslation(
        'menu.shadowing.player.analysis.messages.speechRate.goodAttempt',
        "Good attempt - minor adjustments needed"
      )
    },
    {
      threshold: 0.40,
      message: getTranslation(
        'menu.shadowing.player.analysis.messages.speechRate.adjustPace',
        "Adjust your pace"
      )
    },
    {
      threshold: 0,
      message: getTranslation(
        'menu.shadowing.player.analysis.messages.speechRate.tryAgain',
        "Try again"
      )
    }
  ];
}

/**
 * Gets status message based on score and direction
 * 
 * @private
 * @param {number} score - Speech rate score
 * @param {string} direction - Direction of deviation ('perfect' | 'slower' | 'faster')
 * @returns {string} Status message
 */
function getStatusMessage(score, direction) {
  const STATUS_LOOKUP = getStatusLookup();
  const base = STATUS_LOOKUP.find(s => score >= s.threshold)
    || STATUS_LOOKUP[STATUS_LOOKUP.length - 1];

  if (direction === 'perfect') {
    return base.message;
  }

  // Add directional guidance for non-perfect scores
  if (score < 0.40) {
    return direction === 'faster'
      ? getTranslation(
        'menu.shadowing.player.analysis.messages.speechRate.wayTooFast',
        "Way too fast - please slow down"
      )
      : getTranslation(
        'menu.shadowing.player.analysis.messages.speechRate.wayTooSlow',
        "Way too slow - please speed up"
      );
  }

  if (score < 0.60) {
    const baseMsg = base.message;
    return direction === 'faster'
      ? getTranslation(
        'menu.shadowing.player.analysis.messages.speechRate.slowDown',
        "{{message}} - slow down a bit",
        { message: baseMsg }
      )
      : getTranslation(
        'menu.shadowing.player.analysis.messages.speechRate.speedUp',
        "{{message}} - speed up a bit",
        { message: baseMsg }
      );
  }

  // For scores >= 0.60 but direction is not perfect, still provide directional guidance
  // This prevents contradictions like "Great rhythm!" with "Too Slow" badge
  const baseMsg = base.message;
  return direction === 'faster'
    ? getTranslation(
      'menu.shadowing.player.analysis.messages.speechRate.slowDown',
      "{{message}} - slow down a bit",
      { message: baseMsg }
    )
    : getTranslation(
      'menu.shadowing.player.analysis.messages.speechRate.speedUp',
      "{{message}} - speed up a bit",
      { message: baseMsg }
    );
}

/**
 * Validates audio buffer input
 * 
 * @private
 * @param {AudioBuffer|Object} audioBuffer - Audio buffer to validate
 * @returns {Object} Validation result with isValid and duration
 */
function validateAudioBuffer(audioBuffer) {
  if (!audioBuffer || typeof audioBuffer !== 'object') {
    return { isValid: false, duration: 0, reason: 'invalid_buffer' };
  }

  const duration = audioBuffer.duration;

  if (typeof duration !== 'number' || !Number.isFinite(duration)) {
    return { isValid: false, duration: 0, reason: 'invalid_duration' };
  }

  if (duration < 0) {
    return { isValid: false, duration: 0, reason: 'negative_duration' };
  }

  // Check for suspiciously short duration
  if (duration < 0.1) {
    return { isValid: false, duration: 0, reason: 'too_short' };
  }

  return { isValid: true, duration };
}

/**
 * Calculates speech rate and provides feedback based on transcript and audio duration.
 * Uses bidirectional scoring with tolerance zones for accurate detection of too slow/fast speech.
 * 
 * @param {AudioBuffer|Object} audioBuffer - Audio buffer with duration property
 * @param {string} transcript - User transcript
 * @returns {Object} Speech rate analysis with score and feedback
 * 
 * @example
 * calculateSpeechRate({duration: 10}, "one two three four five")
 * // { score: 0.8, details: { userRate: "0.5", expectedRate: "2.5", ... } }
 */
export function calculateSpeechRate(audioBuffer, transcript) {
  // Validate audio buffer
  const audioValidation = validateAudioBuffer(audioBuffer);
  const transcriptText = validateString(transcript);

  // Create cache key
  const cacheKey = `${audioValidation.duration.toFixed(3)}-${transcriptText}`;

  // Check cache first
  if (speechRateCache.has(cacheKey)) {
    return speechRateCache.get(cacheKey);
  }

  /**
   * Helper to create and cache result
   * @private
   */
  const createResult = (score, details) => {
    const result = {
      score: clamp(score, 0, 1),
      details
    };
    speechRateCache.set(cacheKey, result);
    return result;
  };

  // Handle invalid audio
  if (!audioValidation.isValid) {
    const errorMessage = audioValidation.reason === 'too_short'
      ? getTranslation(
        'menu.shadowing.player.analysis.messages.errors.audioTooShort',
        "Audio too short to analyze"
      )
      : getTranslation(
        'menu.shadowing.player.analysis.messages.errors.invalidAudio',
        "Invalid audio data"
      );

    return createResult(0, {
      userRate: '0.0',
      expectedRate: SPEECH_RATE.EXPECTED.toFixed(1),
      deviation: '0.0',
      deviationPercent: '0%',
      zone: 'poor',
      direction: 'perfect',
      status: errorMessage,
      wordCount: 0,
      duration: '0.0'
    });
  }

  const duration = audioValidation.duration;
  const words = tokenize(transcriptText);

  // Handle no speech
  if (words.length === 0) {
    return createResult(0, {
      userRate: '0.0',
      expectedRate: SPEECH_RATE.EXPECTED.toFixed(1),
      deviation: '0.0',
      deviationPercent: '0%',
      zone: 'poor',
      direction: 'perfect',
      status: getTranslation(
        'menu.shadowing.player.analysis.messages.errors.noSpeechDetected',
        "No speech detected"
      ),
      wordCount: 0,
      duration: duration.toFixed(1)
    });
  }

  const userRate = words.length / duration;
  const expectedRate = SPEECH_RATE.EXPECTED;

  // Calculate score using bidirectional algorithm
  const { score, zone, direction } = calculateSpeedScore(
    userRate,
    expectedRate,
    SPEECH_RATE.TOLERANCE,
    SPEECH_RATE.MIN,
    SPEECH_RATE.MAX
  );

  // Calculate deviation metrics
  const deviation = userRate - expectedRate;
  const deviationPercent = ((deviation / expectedRate) * 100).toFixed(0);
  const deviationSign = deviation >= 0 ? '+' : '';

  // Generate status message
  const status = getStatusMessage(score, direction);

  return createResult(score, {
    userRate: userRate.toFixed(1),
    expectedRate: expectedRate.toFixed(1),
    deviation: `${deviationSign}${deviation.toFixed(1)}`,
    deviationPercent: `${deviationSign}${deviationPercent}%`,
    zone,
    direction,
    status,
    wordCount: words.length,
    duration: duration.toFixed(1)
  });
}

// ============================================================================
// COMPLETENESS ANALYSIS
// ============================================================================

/**
 * Calculates word count match score between transcript and reference
 * 
 * @private
 * @param {string} transcript - User transcript
 * @param {string} referenceText - Reference text
 * @returns {Object} Word count analysis with score and details
 */
function calculateWordCountScore(transcript, referenceText) {
  const transcriptWords = tokenize(transcript);
  const refWords = tokenize(referenceText);

  if (refWords.length === 0) {
    return {
      score: 1,
      ratio: 1,
      transcriptWordCount: transcriptWords.length,
      referenceWordCount: 0
    };
  }

  if (transcriptWords.length === 0) {
    return {
      score: 0,
      ratio: 0,
      transcriptWordCount: 0,
      referenceWordCount: refWords.length
    };
  }

  const wordRatio = transcriptWords.length / refWords.length;

  // Calculate score with penalties for too few or too many words
  let score;
  if (wordRatio < COMPLETENESS_VALIDATION.MIN_WORD_RATIO) {
    // Too few words - linear penalty
    score = wordRatio / COMPLETENESS_VALIDATION.MIN_WORD_RATIO * 0.5;
  } else if (wordRatio > COMPLETENESS_VALIDATION.MAX_WORD_RATIO) {
    // Too many words - exponential penalty
    const excess = wordRatio - COMPLETENESS_VALIDATION.MAX_WORD_RATIO;
    score = Math.max(0, 1 - (excess / COMPLETENESS_VALIDATION.MAX_WORD_RATIO));
  } else {
    // Good range - full score
    score = 1;
  }

  return {
    score: clamp(score, 0, 1),
    ratio: wordRatio,
    transcriptWordCount: transcriptWords.length,
    referenceWordCount: refWords.length
  };
}

/**
 * Calculates duration match score with upper and lower bounds
 * 
 * @private
 * @param {number} duration - Actual duration
 * @param {number} expectedDuration - Expected duration
 * @returns {Object} Duration analysis with score and details
 */
function calculateDurationScore(duration, expectedDuration) {
  const validDuration = validateNumber(duration, 0);
  const validExpected = validateNumber(expectedDuration, 0);

  if (validExpected <= 0) {
    return {
      score: 1,
      ratio: 1,
      durationRatio: 1
    };
  }

  const durationRatio = validDuration / validExpected;

  let score;
  if (durationRatio < COMPLETENESS_VALIDATION.MIN_DURATION_RATIO) {
    // Too short - linear penalty
    score = durationRatio / COMPLETENESS_VALIDATION.MIN_DURATION_RATIO * 0.6;
  } else if (durationRatio > COMPLETENESS_VALIDATION.MAX_DURATION_RATIO) {
    // Too long - exponential penalty
    const excess = durationRatio - COMPLETENESS_VALIDATION.MAX_DURATION_RATIO;
    score = Math.max(0, 1 - (excess / COMPLETENESS_VALIDATION.MAX_DURATION_RATIO));
  } else {
    // Good range - full score
    score = 1;
  }

  return {
    score: clamp(score, 0, 1),
    ratio: durationRatio,
    durationRatio
  };
}

/**
 * Calculates audio activity score
 * 
 * @private
 * @param {Object|null} audioActivity - Audio activity analysis
 * @returns {number} Audio activity score (0-1)
 */
function calculateAudioActivityScore(audioActivity) {
  if (!audioActivity || typeof audioActivity !== 'object') {
    return 1; // Default to full score if not provided
  }

  const activeRatio = validateNumber(audioActivity.activeRatio, 0);

  if (activeRatio < COMPLETENESS_VALIDATION.MIN_ACTIVE_RATIO) {
    // Too much silence - penalty
    return activeRatio / COMPLETENESS_VALIDATION.MIN_ACTIVE_RATIO * 0.7;
  }

  // Good speech activity
  return Math.min(1, activeRatio);
}

/**
 * Generates completeness status message
 * 
 * @private
 * @param {number} completeness - Completeness score
 * @param {number} durationRatio - Duration ratio
 * @param {number} wordCountRatio - Word count ratio
 * @returns {string} Status message
 */
function getCompletenessStatus(completeness, durationRatio, wordCountRatio) {
  // Check for issues first (order matters - most specific first)
  if (durationRatio > COMPLETENESS_VALIDATION.MAX_DURATION_RATIO) {
    return getTranslation(
      'menu.shadowing.player.analysis.messages.completeness.audioTooLong',
      "Audio too long - be more concise ⏱️"
    );
  }

  if (wordCountRatio > COMPLETENESS_VALIDATION.MAX_WORD_RATIO) {
    return getTranslation(
      'menu.shadowing.player.analysis.messages.completeness.excessiveContent',
      "Excessive content - stick to the reference 📖"
    );
  }

  if (durationRatio < COMPLETENESS_VALIDATION.MIN_DURATION_RATIO) {
    return getTranslation(
      'menu.shadowing.player.analysis.messages.completeness.tooBrief',
      "Too brief - complete the full text 📝"
    );
  }

  if (wordCountRatio < COMPLETENESS_VALIDATION.MIN_WORD_RATIO) {
    return getTranslation(
      'menu.shadowing.player.analysis.messages.completeness.tooFewWords',
      "Too few words - complete the full text 📝"
    );
  }

  // Positive feedback based on completeness level
  if (completeness >= COMPLETENESS_THRESHOLDS.COMPLETE) {
    return getTranslation(
      'menu.shadowing.player.analysis.messages.completeness.complete',
      "Complete ✓"
    );
  }

  if (completeness >= COMPLETENESS_THRESHOLDS.ALMOST) {
    return getTranslation(
      'menu.shadowing.player.analysis.messages.completeness.almostThere',
      "Almost there 📝"
    );
  }

  if (completeness >= COMPLETENESS_THRESHOLDS.HALF) {
    return getTranslation(
      'menu.shadowing.player.analysis.messages.completeness.halfDone',
      "Half done - keep going"
    );
  }

  return getTranslation(
    'menu.shadowing.player.analysis.messages.completeness.tooShort',
    "Too short - try again"
  );
}

/**
 * Calculates speech completeness based on multiple validation factors:
 * - Audio duration vs expected duration
 * - Word count in transcript vs reference
 * - Audio activity (voice detection)
 * 
 * @param {AudioBuffer|Object} audioBuffer - Audio buffer with duration property
 * @param {string} referenceText - Reference text to calculate expected duration
 * @param {string} [transcript=''] - User transcript for word count validation
 * @param {Object} [audioActivity=null] - Optional audio activity analysis
 * @returns {Object} Completeness analysis with score and status
 * 
 * @example
 * calculateCompleteness({duration: 8}, "one two three four five", "one two three")
 * // { score: 0.8, details: { duration: "8.0", expectedDuration: "2.0", ... } }
 */
export function calculateCompleteness(
  audioBuffer,
  referenceText,
  transcript = '',
  audioActivity = null
) {
  // Validate audio buffer
  const audioValidation = validateAudioBuffer(audioBuffer);
  const refText = validateString(referenceText);
  const transcriptText = validateString(transcript);

  if (!audioValidation.isValid) {
    return {
      score: 0,
      details: {
        duration: '0.0',
        expectedDuration: '0.0',
        status: getTranslation(
          'menu.shadowing.player.analysis.messages.errors.invalidAudio',
          "Invalid audio data"
        ),
        percentage: 0,
        wordCount: 0,
        expectedWordCount: 0,
        hasSpeech: false
      }
    };
  }

  const duration = audioValidation.duration;
  const refWords = tokenize(refText);
  const transcriptWords = tokenize(transcriptText);
  const expectedDuration = refWords.length > 0
    ? refWords.length / SPEECH_RATE.EXPECTED
    : 0;

  // Handle edge case where reference is empty
  if (refWords.length === 0) {
    return {
      score: 1,
      details: {
        duration: duration.toFixed(1),
        expectedDuration: '0.0',
        status: getTranslation(
          'menu.shadowing.player.analysis.messages.completeness.noReference',
          "No reference text"
        ),
        percentage: 100,
        wordCount: transcriptWords.length,
        expectedWordCount: 0,
        hasSpeech: true
      }
    };
  }

  // CRITICAL: Check for no speech detected
  const hasSpeech = audioActivity
    ? Boolean(audioActivity.hasSpeech)
    : transcriptWords.length > 0;

  if (!hasSpeech) {
    return {
      score: 0,
      details: {
        duration: duration.toFixed(1),
        expectedDuration: expectedDuration.toFixed(1),
        percentage: 0,
        status: getTranslation(
          'menu.shadowing.player.analysis.messages.errors.noSpeechDetectedMicrophone',
          "No speech detected - please speak clearly 🎤"
        ),
        wordCount: transcriptWords.length,
        expectedWordCount: refWords.length,
        hasSpeech: false
      }
    };
  }

  // Calculate duration score
  const durationScore = calculateDurationScore(duration, expectedDuration);

  // Calculate word count score
  const wordCountScore = calculateWordCountScore(transcriptText, refText);

  // Calculate audio activity score
  const audioActivityScore = calculateAudioActivityScore(audioActivity);

  // Multi-factor scoring: duration (40%), word count (40%), audio activity (20%)
  const completeness = (
    durationScore.score * 0.4 +
    wordCountScore.score * 0.4 +
    audioActivityScore * 0.2
  );

  // Generate comprehensive status message
  const status = getCompletenessStatus(
    completeness,
    durationScore.durationRatio,
    wordCountScore.ratio
  );

  return {
    score: clamp(completeness, 0, 1),
    details: {
      duration: duration.toFixed(1),
      expectedDuration: expectedDuration.toFixed(1),
      percentage: Math.round(completeness * 100),
      status,
      wordCount: wordCountScore.transcriptWordCount,
      expectedWordCount: wordCountScore.referenceWordCount,
      hasSpeech
    }
  };
}

// ============================================================================
// COMPREHENSIVE SPEECH ANALYSIS
// ============================================================================

/**
 * Performs comprehensive speech analysis combining all metrics.
 * Provides an overall assessment and detailed breakdown.
 * 
 * Note: This function requires audioActivity analysis. For full validation,
 * use analyzeRecording from audioAnalysis.js which includes audio activity detection.
 * 
 * @param {AudioBuffer|Object} audioBuffer - Audio buffer with duration property
 * @param {string} reference - Reference text
 * @param {string} transcript - User transcript
 * @param {Object} [audioActivity=null] - Optional audio activity analysis
 * @returns {Object} Comprehensive analysis with overall score and all metrics
 * 
 * @example
 * analyzeSpeech(audioBuffer, "hello world", "hello world")
 * // { overall: 0.95, metrics: { textMatch: {...}, speechRate: {...}, completeness: {...} } }
 */
export function analyzeSpeech(
  audioBuffer,
  reference,
  transcript,
  audioActivity = null
) {
  // Validate inputs
  const refText = validateString(reference);
  const transcriptText = validateString(transcript);

  // Calculate individual metrics
  const textMatch = calculateTextMatch(refText, transcriptText);
  const speechRate = calculateSpeechRate(audioBuffer, transcriptText);
  const completeness = calculateCompleteness(
    audioBuffer,
    refText,
    transcriptText,
    audioActivity
  );

  // Weighted overall score
  // Text match is most important (43.75%)
  // Speech rate is second (31.25%)
  // Completeness is third (25%)
  const overall = (
    textMatch.score * 0.4375 +
    speechRate.score * 0.3125 +
    completeness.score * 0.25
  );

  return {
    overall: parseFloat(clamp(overall, 0, 1).toFixed(2)),
    metrics: {
      textMatch,
      speechRate,
      completeness
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Export configuration constants for external use
 */
export const config = {
  SPEECH_RATE,
  COMPLETENESS_THRESHOLDS,
  COMPLETENESS_VALIDATION,
  SCORE_THRESHOLDS,
  TEXT_PROCESSING
};

/**
 * Export cache management utilities for advanced use cases
 */
export const cacheUtils = {
  /**
   * Clears the token cache
   * @returns {void}
   */
  clearTokenCache: () => tokenCache.clear(),

  /**
   * Clears the speech rate cache
   * @returns {void}
   */
  clearSpeechRateCache: () => speechRateCache.clear(),

  /**
   * Clears all caches
   * @returns {void}
   */
  clearAllCaches: () => {
    tokenCache.clear();
    speechRateCache.clear();
  },

  /**
   * Gets cache statistics
   * @returns {Object} Cache size and capacity information
   */
  getCacheStats: () => ({
    tokenCache: {
      size: tokenCache.size,
      maxSize: CACHE_CONFIG.MAX_TOKEN_CACHE_SIZE,
      utilizationPercent: Math.round(
        (tokenCache.size / CACHE_CONFIG.MAX_TOKEN_CACHE_SIZE) * 100
      )
    },
    speechRateCache: {
      size: speechRateCache.size,
      maxSize: CACHE_CONFIG.MAX_SPEECH_RATE_CACHE_SIZE,
      utilizationPercent: Math.round(
        (speechRateCache.size / CACHE_CONFIG.MAX_SPEECH_RATE_CACHE_SIZE) * 100
      )
    }
  })
};