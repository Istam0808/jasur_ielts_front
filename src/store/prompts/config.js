/**
 * Shared Configuration for Writing Assessment System
 * All constants and level configurations used across multiple prompts
 */

/**
 * Band limits and expected score ranges by CEFR level
 */
export const BAND_LIMITS = {
   "A1": { min: 0.0, max: 9.0, expected: "2.0-4.5" },
   "A2": { min: 0.0, max: 9.0, expected: "3.0-5.0" },
   "B1": { min: 0.0, max: 9.0, expected: "4.0-6.0" },
   "B2": { min: 0.0, max: 9.0, expected: "5.0-7.0" },
   "C1": { min: 0.0, max: 9.0, expected: "6.0-8.0" },
   "C2": { min: 0.0, max: 9.0, expected: "7.0-9.0" }
};

/**
 * Language names for localized feedback
 */
export const LANGUAGE_NAMES = {
   "en": "English",
   "ru": "Russian",
   "uz": "Uzbek"
};

/**
 * Word count requirements by level
 */
export const WORD_COUNT_REQUIREMENTS = {
   "A1": { min: 35, recommended: "35-50" },
   "A2": { min: 50, recommended: "50-80" },
   "B1": { min: 150, recommended: "150-200" },
   "B2": { min: 250, recommended: "250-300" },
   "C1": { min: 250, recommended: "250-300" },
   "C2": { min: 250, recommended: "250-350" }
};

/**
 * Validation failure codes
 */
export const VALIDATION_CODES = {
   OFF_TOPIC: 'OFF_TOPIC',
   GIBBERISH: 'GIBBERISH',
   NOT_ENGLISH: 'NOT_ENGLISH',
   NO_ATTEMPT: 'NO_ATTEMPT'
};

/**
 * Level-specific configurations for blind assessment system
 * 
 * Philosophy: AI scores objectively without knowing expected ranges
 * - minWords: Word count requirement (contextual information)
 * - maxBand: Structural cap for beginner levels only (A1/A2/B1)
 *   These reflect physical impossibilities (A1 can't produce Band 8 writing)
 * - B2/C1/C2: No caps (self-selected levels, full 0-9 range available)
 */
export const LEVEL_CONFIGS = {
   'a1': { 
      minWords: 35,
      maxBand: 5.0  // Structural cap: absolute beginners can't produce sophisticated writing
   },
   'a2': { 
      minWords: 50,
      maxBand: 5.5  // Structural cap: elementary level has limited vocabulary/grammar
   },
   'b1': { 
      minWords: 150,
      maxBand: 6.5  // Structural cap: intermediate level developing sophistication
   },
   'b2': { 
      minWords: 250
      // No cap: self-selected level, can score 0.0-9.0 based on actual quality
   },
   'c1': { 
      minWords: 250
      // No cap: self-selected level, can score 0.0-9.0 based on actual quality
   },
   'c2': { 
      minWords: 250
      // No cap: self-selected level, can score 0.0-9.0 based on actual quality
   }
};

/**
 * Normalize level string to uppercase CEFR format
 */
export function normalizeLevel(level) {
   return String(level || '').toUpperCase();
}

/**
 * Get configuration for a specific level
 */
export function getLevelConfig(level) {
   const normalizedLevel = normalizeLevel(level);
   return {
      level: normalizedLevel,
      bandLimit: BAND_LIMITS[normalizedLevel] || BAND_LIMITS["B2"],
      wordCount: WORD_COUNT_REQUIREMENTS[normalizedLevel] || WORD_COUNT_REQUIREMENTS["B2"],
      hybridConfig: LEVEL_CONFIGS[level.toLowerCase()] || LEVEL_CONFIGS['b2']
   };
}

