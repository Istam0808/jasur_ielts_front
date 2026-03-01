/**
 * Writing Assessment System - Main Export File
 * Provides unified access to all prompt generators and utilities
 */

// ==================== CONFIGURATION ====================
export {
  BAND_LIMITS,
  LANGUAGE_NAMES,
  WORD_COUNT_REQUIREMENTS,
  VALIDATION_CODES,
  LEVEL_CONFIGS,
  normalizeLevel,
  getLevelConfig
} from './config.js';

// ==================== NEW HYBRID SYSTEM ====================

// Step 1B: Validation
export { 
  generateWritingValidationPrompt,
  VALIDATION_CODES as ValidationCodes 
} from './validationPrompt.js';

// Step 2: Enhanced Data Collection
export { 
  generateEnhancedDataCollectionPrompt 
} from './dataCollectionPrompt.js';

// Step 3: Parallel Criterion Scoring
export { 
  generateTaskResponseScoringPrompt 
} from './taskResponsePrompt.js';

export { 
  generateCoherenceCohesionScoringPrompt 
} from './coherenceCohesionPrompt.js';

export { 
  generateLexicalResourceScoringPrompt 
} from './lexicalResourcePrompt.js';

export { 
  generateGrammaticalRangeScoringPrompt 
} from './grammaticalRangePrompt.js';

// Step 5: Synthesis & Feedback
export { 
  generateSynthesisPrompt 
} from './synthesisPrompt.js';

// ==================== LEGACY SYSTEM (BACKWARD COMPATIBILITY) ====================
export {
  generateA1Prompt,
  generateA2Prompt,
  generateB1Prompt,
  generateIELTSPrompt
} from './legacyPrompts.js';

// ==================== UTILITIES ====================
export {
  validateAndAdjustScores,
  isScoreValidForLevel,
  checkScoreConsistency
} from '../../utils/scoreValidator.js';

export {
  generateMinimalData,
  generateFallbackFeedback,
  generateFallbackCriterionScore,
  validateCriterionScores,
  mergeCriterionScores,
  calculateWordCount,
  calculateSentenceCount,
  isEnglish,
  generateErrorResponse
} from '../../utils/fallbackHelpers.js';

// ==================== MAIN PROMPT ROUTING FUNCTION ====================

/**
 * Main prompt generator that routes to appropriate system
 * 
 * @param {string} difficulty - CEFR level (A1, A2, B1, B2, C1, C2)
 * @param {string} locale - Language code for feedback (en, ru, uz)
 * @param {string} topic - Writing prompt/topic
 * @param {string} answer - Learner's written response
 * @param {string} system - 'hybrid' or 'legacy' (default: 'legacy' for now)
 * @returns {string} Complete assessment prompt for AI model
 */
export function getWritingAssessmentPrompt(difficulty, locale, topic, answer, system = 'legacy') {
  const level = normalizeLevel(difficulty);

  // Route to hybrid system (not yet fully implemented in API)
  if (system === 'hybrid') {
    // For hybrid system, use the individual prompts in sequence
    // This is handled by the API route, not a single prompt
    throw new Error('Hybrid system requires calling individual step functions');
  }

  // Route to legacy system (current default)
  if (level === "A1") {
    return generateA1Prompt(level, locale, topic, answer);
  } else if (level === "A2") {
    return generateA2Prompt(level, locale, topic, answer);
  } else if (level === "B1") {
    return generateB1Prompt(level, locale, topic, answer);
  } else if (["B2", "C1", "C2"].includes(level)) {
    return generateIELTSPrompt(level, locale, topic, answer);
  }

  // Fallback to unified IELTS prompt for unknown levels
  console.warn(`Unknown proficiency level: ${difficulty}. Defaulting to IELTS assessment.`);
  return generateIELTSPrompt("B2", locale, topic, answer);
}

// ==================== CONVENIENCE FUNCTIONS ====================

/**
 * Get validation prompt (Step 1B)
 */
export function getValidationPrompt(difficulty, locale, topic, answer) {
  return generateWritingValidationPrompt(difficulty, locale, topic, answer);
}

/**
 * Get data collection prompt (Step 2)
 */
export function getDataCollectionPrompt(difficulty, topic, answer) {
  return generateEnhancedDataCollectionPrompt(answer, topic, difficulty);
}

/**
 * Get all criterion scoring prompts at once (Step 3A-D)
 * Returns an object with all 4 prompts
 */
export function getCriterionScoringPrompts(essay, topic, difficulty, collectedData) {
  return {
    taskResponse: generateTaskResponseScoringPrompt(essay, topic, difficulty, collectedData),
    coherenceCohesion: generateCoherenceCohesionScoringPrompt(essay, topic, difficulty, collectedData),
    lexicalResource: generateLexicalResourceScoringPrompt(essay, topic, difficulty, collectedData),
    grammaticalRange: generateGrammaticalRangeScoringPrompt(essay, topic, difficulty, collectedData)
  };
}

/**
 * Get synthesis prompt (Step 5)
 */
export function getSynthesisPrompt(essay, topic, difficulty, collectedData, criterionScores, validatedScores) {
  return generateSynthesisPrompt(essay, topic, difficulty, collectedData, criterionScores, validatedScores);
}

/**
 * Complete hybrid assessment workflow helper
 * Provides the sequence of functions to call for hybrid system
 * 
 * @returns {object} Step-by-step function references and descriptions
 */
export function getHybridWorkflow() {
  return {
    step1B: {
      name: 'Validation',
      function: generateWritingValidationPrompt,
      model: 'gemma-3n-4b',
      tokens: 200,
      description: 'Validate submission is genuine essay attempt'
    },
    step2: {
      name: 'Data Collection',
      function: generateEnhancedDataCollectionPrompt,
      model: 'llama-8b',
      tokens: 1500,
      description: 'Extract objective linguistic features'
    },
    step3: {
      name: 'Criterion Scoring (Parallel)',
      functions: {
        taskResponse: generateTaskResponseScoringPrompt,
        coherenceCohesion: generateCoherenceCohesionScoringPrompt,
        lexicalResource: generateLexicalResourceScoringPrompt,
        grammaticalRange: generateGrammaticalRangeScoringPrompt
      },
      model: 'llama-8b',
      tokens: 400,
      description: 'Score each criterion independently in parallel'
    },
    step4: {
      name: 'Score Validation',
      function: validateAndAdjustScores,
      model: 'programmatic',
      description: 'Apply consistency rules to scores'
    },
    step5: {
      name: 'Synthesis & Feedback',
      function: generateSynthesisPrompt,
      model: 'llama-70b',
      tokens: 1200,
      description: 'Generate comprehensive feedback'
    }
  };
}

// ==================== VERSION INFORMATION ====================

export const ASSESSMENT_SYSTEM_VERSION = '3.0.0-hybrid';
export const LEGACY_SYSTEM_VERSION = '2.0.0';

/**
 * Get system information
 */
export function getSystemInfo() {
  return {
    version: ASSESSMENT_SYSTEM_VERSION,
    legacyVersion: LEGACY_SYSTEM_VERSION,
    systems: {
      hybrid: {
        available: true,
        steps: 5,
        models: ['gemma-3n-4b', 'llama-8b', 'llama-70b'],
        features: ['parallel-scoring', 'programmatic-validation', 'enhanced-data']
      },
      legacy: {
        available: true,
        steps: 3,
        models: ['gemma-3n-4b', 'llama-70b'],
        features: ['single-prompt-assessment']
      }
    },
    supportedLevels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    supportedLocales: ['en', 'ru', 'uz']
  };
}

