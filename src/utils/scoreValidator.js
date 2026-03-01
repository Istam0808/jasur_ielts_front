/**
 * Writing score validation helpers.
 * Keeps criterion scores within IELTS-like boundaries and flags inconsistencies.
 */

const SCORE_MIN = 0;
const SCORE_MAX = 9;
const SCORE_STEP = 0.5;

const IELTS_SCORE_LIMITS = { min: SCORE_MIN, max: SCORE_MAX };

const CRITERIA_KEYS = [
  'taskResponse',
  'coherenceCohesion',
  'lexicalResource',
  'grammaticalRange'
];

function normalizeLevel(level) {
  return String(level || 'IELTS').toUpperCase();
}

function clamp(value, min = SCORE_MIN, max = SCORE_MAX) {
  return Math.min(max, Math.max(min, value));
}

function toNearestHalfBand(score) {
  return Math.round(score / SCORE_STEP) * SCORE_STEP;
}

function toSafeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

/**
 * Checks if score is acceptable for a target CEFR level.
 */
export function isScoreValidForLevel(score, level) {
  const normalizedLevel = normalizeLevel(level);
  const normalizedScore = toNearestHalfBand(clamp(toSafeNumber(score)));

  return normalizedScore >= IELTS_SCORE_LIMITS.min && normalizedScore <= IELTS_SCORE_LIMITS.max;
}

/**
 * Returns warnings when criterion scores differ too much.
 */
export function checkScoreConsistency(scores = {}) {
  const values = CRITERIA_KEYS.map((key) => toSafeNumber(scores[key], NaN))
    .filter(Number.isFinite);

  if (values.length < 2) {
    return [];
  }

  const minScore = Math.min(...values);
  const maxScore = Math.max(...values);
  const spread = Number((maxScore - minScore).toFixed(1));

  if (spread <= 2) {
    return [];
  }

  return [
    `Large score spread detected: ${spread}. Consider manual review.`
  ];
}

/**
 * Validates and normalizes all criterion scores and returns adjusted values.
 */
export function validateAndAdjustScores(criterionScores = {}, collectedData = {}, level = 'IELTS') {
  const normalizedLevel = normalizeLevel(level);
  const limits = IELTS_SCORE_LIMITS;
  const adjustments = [];
  const scores = {};

  CRITERIA_KEYS.forEach((key) => {
    const rawValue = toSafeNumber(criterionScores[key], 0);
    const banded = toNearestHalfBand(clamp(rawValue, limits.min, limits.max));

    if (banded !== rawValue) {
      adjustments.push({
        criterion: key,
        from: rawValue,
        to: banded,
        reason: `Adjusted to ${normalizedLevel} range`
      });
    }

    scores[key] = banded;
  });

  const criteriaValues = Object.values(scores);
  const overallRaw = criteriaValues.reduce((sum, value) => sum + value, 0) / criteriaValues.length;
  const overall = toNearestHalfBand(clamp(overallRaw, limits.min, limits.max));

  if (overall !== overallRaw) {
    adjustments.push({
      criterion: 'overall',
      from: Number(overallRaw.toFixed(2)),
      to: overall,
      reason: `Overall adjusted to ${normalizedLevel} range`
    });
  }

  const consistencyWarnings = checkScoreConsistency(scores);
  if (consistencyWarnings.length) {
    consistencyWarnings.forEach((warning) => {
      adjustments.push({
        criterion: 'consistency',
        reason: warning
      });
    });
  }

  return {
    scores: {
      ...scores,
      overall
    },
    adjustments,
    metadata: {
      level: normalizedLevel,
      words: toSafeNumber(collectedData.wordCount, 0),
      sentences: toSafeNumber(collectedData.sentenceCount, 0)
    }
  };
}
