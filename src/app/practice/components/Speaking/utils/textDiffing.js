/**
 * Text Diffing Utility for Word-Level Comparison
 * 
 * Implements a sophisticated word-level alignment algorithm to compare
 * reference text with user transcript, identifying matches, mismatches,
 * missing words, and extra words.
 * 
 * Uses dynamic programming (Needleman-Wunsch style) for optimal alignment
 * with fuzzy matching support for near-matches.
 * 
 */

import { tokenize, normalizeText, levenshteinDistance } from './textProcessing';

/**
 * Configuration constants
 */
const FUZZY_MATCH_THRESHOLD = 0.85; // 85% similarity counts as correct
const SHORT_WORD_LENGTH = 3; // Words shorter than this require exact match
const MATCH_SCORE = 2;
const MISMATCH_PENALTY = -1;
const GAP_PENALTY = -1;

/**
 * Alignment operation types
 */
const ALIGNMENT_OP = {
  MATCH: 'match',
  INSERT: 'insert',    // Word in transcript but not in reference (extra)
  DELETE: 'delete',    // Word in reference but not in transcript (missing)
  SUBSTITUTE: 'substitute' // Word replaced with different word
};

/**
 * Operation codes for efficient path tracking (instead of storing objects)
 */
const OP_CODE = {
  MATCH: 0,
  SUBSTITUTE: 1,
  DELETE: 2,
  INSERT: 3
};

/**
 * Calculates similarity between two words using Levenshtein distance
 * 
 * @param {string} word1 - First word (must be non-empty string)
 * @param {string} word2 - Second word (must be non-empty string)
 * @returns {number} Similarity score between 0 and 1
 */
function wordSimilarity(word1, word2) {
  if (word1 === word2) return 1;

  // For very short words, require exact match
  if (word1.length < SHORT_WORD_LENGTH || word2.length < SHORT_WORD_LENGTH) {
    return 0;
  }

  const maxLen = Math.max(word1.length, word2.length);
  const distance = levenshteinDistance(word1, word2, maxLen);

  // Ensure result is clamped between 0 and 1
  return Math.max(0, Math.min(1, 1 - (distance / maxLen)));
}

/**
 * Determines if two words should be considered a match
 * 
 * @param {string} word1 - First word
 * @param {string} word2 - Second word
 * @returns {boolean} True if words match (exact or fuzzy)
 */
function isWordMatch(word1, word2) {
  if (word1 === word2) return true;
  return wordSimilarity(word1, word2) >= FUZZY_MATCH_THRESHOLD;
}

/**
 * Performs word-level alignment using dynamic programming
 * Optimized Needleman-Wunsch algorithm for word sequences
 * 
 * Memory optimization: Uses operation codes instead of objects in path matrix
 * 
 * @param {string[]} refWords - Reference words (must be array)
 * @param {string[]} transcriptWords - Transcript words (must be array)
 * @returns {Array<Object>} Alignment operations
 */
function alignWords(refWords, transcriptWords) {
  const m = refWords.length;
  const n = transcriptWords.length;

  // Base cases - handle empty inputs
  if (m === 0 && n === 0) return [];

  if (m === 0) {
    return transcriptWords.map(word => ({
      type: ALIGNMENT_OP.INSERT,
      refWord: null,
      transcriptWord: word,
      similarity: 0
    }));
  }

  if (n === 0) {
    return refWords.map(word => ({
      type: ALIGNMENT_OP.DELETE,
      refWord: word,
      transcriptWord: null,
      similarity: 0
    }));
  }

  // Optimized matrix allocation - use typed arrays for better performance
  const score = Array(m + 1);
  const pathOp = Array(m + 1);  // Store operation codes instead of objects
  const pathSim = Array(m + 1); // Store similarity separately

  for (let i = 0; i <= m; i++) {
    score[i] = new Float32Array(n + 1);
    pathOp[i] = new Uint8Array(n + 1);
    pathSim[i] = new Float32Array(n + 1);
  }

  // Initialize base cases
  for (let i = 1; i <= m; i++) {
    score[i][0] = score[i - 1][0] + GAP_PENALTY;
    pathOp[i][0] = OP_CODE.DELETE;
    pathSim[i][0] = 0;
  }

  for (let j = 1; j <= n; j++) {
    score[0][j] = score[0][j - 1] + GAP_PENALTY;
    pathOp[0][j] = OP_CODE.INSERT;
    pathSim[0][j] = 0;
  }

  // Pre-compute similarity matrix to avoid redundant calculations
  const simMatrix = Array(m);
  for (let i = 0; i < m; i++) {
    simMatrix[i] = new Float32Array(n);
    for (let j = 0; j < n; j++) {
      simMatrix[i][j] = wordSimilarity(refWords[i], transcriptWords[j]);
    }
  }

  // Fill the scoring matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const sim = simMatrix[i - 1][j - 1];
      const isMatch = sim >= FUZZY_MATCH_THRESHOLD;

      // Calculate scores for different operations
      const matchScore = score[i - 1][j - 1] + (isMatch ? MATCH_SCORE : MISMATCH_PENALTY);
      const deleteScore = score[i - 1][j] + GAP_PENALTY;
      const insertScore = score[i][j - 1] + GAP_PENALTY;

      // Choose best operation (prefer matches in ties)
      if (matchScore >= deleteScore && matchScore >= insertScore) {
        score[i][j] = matchScore;
        pathOp[i][j] = isMatch ? OP_CODE.MATCH : OP_CODE.SUBSTITUTE;
        pathSim[i][j] = sim;
      } else if (deleteScore >= insertScore) {
        score[i][j] = deleteScore;
        pathOp[i][j] = OP_CODE.DELETE;
        pathSim[i][j] = 0;
      } else {
        score[i][j] = insertScore;
        pathOp[i][j] = OP_CODE.INSERT;
        pathSim[i][j] = 0;
      }
    }
  }

  // Trace back to build alignment
  const alignment = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    const op = pathOp[i][j];
    const sim = pathSim[i][j];

    switch (op) {
      case OP_CODE.MATCH:
        alignment.push({
          type: ALIGNMENT_OP.MATCH,
          refWord: refWords[i - 1],
          transcriptWord: transcriptWords[j - 1],
          similarity: sim
        });
        i--;
        j--;
        break;

      case OP_CODE.SUBSTITUTE:
        alignment.push({
          type: ALIGNMENT_OP.SUBSTITUTE,
          refWord: refWords[i - 1],
          transcriptWord: transcriptWords[j - 1],
          similarity: sim
        });
        i--;
        j--;
        break;

      case OP_CODE.DELETE:
        alignment.push({
          type: ALIGNMENT_OP.DELETE,
          refWord: refWords[i - 1],
          transcriptWord: null,
          similarity: 0
        });
        i--;
        break;

      case OP_CODE.INSERT:
        alignment.push({
          type: ALIGNMENT_OP.INSERT,
          refWord: null,
          transcriptWord: transcriptWords[j - 1],
          similarity: 0
        });
        j--;
        break;

      default:
        // Safety check - should never happen
        console.warn(`Unexpected operation code: ${op} at position [${i}, ${j}]`);
        break;
    }
  }

  // Reverse to get correct order (we built it backwards)
  return alignment.reverse();
}

/**
 * Converts alignment operations to word status objects for rendering
 * 
 * @param {Array<Object>} alignment - Alignment operations from alignWords
 * @returns {Array<Object>} Word objects with status and display information
 */
function alignmentToWordStatuses(alignment) {
  return alignment.map(op => {
    switch (op.type) {
      case ALIGNMENT_OP.MATCH:
        return {
          status: 'correct',
          text: op.transcriptWord,
          referenceText: op.refWord,
          similarity: op.similarity
        };

      case ALIGNMENT_OP.SUBSTITUTE:
        return {
          status: 'incorrect',
          text: op.transcriptWord,
          referenceText: op.refWord,
          similarity: op.similarity
        };

      case ALIGNMENT_OP.DELETE:
        return {
          status: 'missing',
          text: op.refWord,
          referenceText: op.refWord,
          similarity: 0
        };

      case ALIGNMENT_OP.INSERT:
        return {
          status: 'extra',
          text: op.transcriptWord,
          referenceText: null,
          similarity: 0
        };

      default:
        // Fallback for unexpected types
        return {
          status: 'unknown',
          text: op.transcriptWord || op.refWord || '',
          referenceText: op.refWord || null,
          similarity: 0
        };
    }
  });
}

/**
 * Main function to compute word-level diff between reference and transcript
 * 
 * @param {string} referenceText - The expected/reference text
 * @param {string} transcript - The user's transcript
 * @returns {Object} Diff result with word statuses and statistics
 * @returns {Array<Object>} return.words - Array of word objects with status
 * @returns {Object} return.stats - Statistics about the comparison
 * 
 * @example
 * const result = computeTextDiff("hello world", "hello word");
 * // Returns: {
 * //   words: [
 * //     { status: 'correct', text: 'hello', ... },
 * //     { status: 'incorrect', text: 'word', referenceText: 'world', ... }
 * //   ],
 * //   stats: { correct: 1, incorrect: 1, ... }
 * // }
 */
export function computeTextDiff(referenceText, transcript) {
  // Robust input validation and normalization
  if (referenceText == null || typeof referenceText !== 'string') {
    referenceText = '';
  }
  if (transcript == null || typeof transcript !== 'string') {
    transcript = '';
  }

  // Normalize and tokenize
  const refNormalized = normalizeText(referenceText);
  const transNormalized = normalizeText(transcript);

  const refWords = tokenize(refNormalized);
  const transWords = tokenize(transNormalized);

  // Handle empty inputs
  if (refWords.length === 0 && transWords.length === 0) {
    return {
      words: [],
      stats: {
        total: 0,
        correct: 0,
        incorrect: 0,
        missing: 0,
        extra: 0,
        accuracy: 1
      }
    };
  }

  // Perform alignment
  const alignment = alignWords(refWords, transWords);

  // Convert to word statuses
  const words = alignmentToWordStatuses(alignment);

  // Calculate statistics
  const correct = words.filter(w => w.status === 'correct').length;
  const incorrect = words.filter(w => w.status === 'incorrect').length;
  const missing = words.filter(w => w.status === 'missing').length;
  const extra = words.filter(w => w.status === 'extra').length;
  const total = refWords.length;

  // Accuracy calculation with proper handling of edge cases
  let accuracy = 0;
  if (total > 0) {
    accuracy = correct / total;
  } else if (transWords.length === 0) {
    // Both empty - perfect match
    accuracy = 1;
  }
  // else: reference empty but transcript not empty - accuracy remains 0

  const stats = {
    total,
    correct,
    incorrect,
    missing,
    extra,
    accuracy
  };

  return {
    words,
    stats
  };
}

/**
 * Export alignment operation constants for external use
 */
export { ALIGNMENT_OP };