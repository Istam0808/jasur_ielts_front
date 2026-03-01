# Writing Assessment System - Refactored Structure

## Overview

This directory contains a **modular, DRY-compliant** writing assessment system with support for both the new **Hybrid Multi-Pass System** and the legacy single-prompt system for backward compatibility.

## Directory Structure

```
src/store/prompts/
├── README.md                      # This file
├── index.js                       # Main export file (use this for imports)
├── config.js                      # Shared configuration and constants
│
├── validationPrompt.js            # Step 1B: Pre-validation
├── dataCollectionPrompt.js        # Step 2: Enhanced data collection
├── taskResponsePrompt.js          # Step 3A: Task Response scoring
├── coherenceCohesionPrompt.js     # Step 3B: Coherence & Cohesion scoring
├── lexicalResourcePrompt.js       # Step 3C: Lexical Resource scoring
├── grammaticalRangePrompt.js      # Step 3D: Grammatical Range scoring
├── synthesisPrompt.js             # Step 5: Synthesis & Feedback
│
└── legacyPrompts.js               # Legacy A1, A2, B1, IELTS prompts

src/utils/
├── scoreValidator.js              # Step 4: Programmatic score validation
└── fallbackHelpers.js             # Fallback utilities and error handlers
```

## Quick Start

### Import Everything From One Place

```javascript
// Import from main index file
import {
  // Configuration
  BAND_LIMITS,
  LANGUAGE_NAMES,
  LEVEL_CONFIGS,
  normalizeLevel,
  
  // Hybrid System Functions
  getValidationPrompt,
  getDataCollectionPrompt,
  getCriterionScoringPrompts,
  getSynthesisPrompt,
  
  // Utilities
  validateAndAdjustScores,
  generateMinimalData,
  generateFallbackFeedback,
  
  // Legacy System (Backward Compatibility)
  getWritingAssessmentPrompt
} from '@/store/prompts';
```

## Usage Examples

### Legacy System (Current Default)

```javascript
import { getWritingAssessmentPrompt } from '@/store/prompts';

// Single-prompt assessment (A1, A2, B1, or IELTS for B2-C2)
const prompt = getWritingAssessmentPrompt(
  'B2',           // difficulty
  'en',           // locale
  'topic text',   // topic
  'essay text',   // answer
  'legacy'        // system type
);

// Send to AI model and get complete assessment
```

### Hybrid System (New Multi-Pass)

#### Step 1B: Validation

```javascript
import { getValidationPrompt } from '@/store/prompts';

const validationPrompt = getValidationPrompt('B2', 'en', topic, answer);
const validationResult = await callAI(validationPrompt, 'gemma-3n-4b', 200);

if (!validationResult.isValid) {
  return { error: validationResult.failureReason };
}
```

#### Step 2: Data Collection

```javascript
import { getDataCollectionPrompt, generateMinimalData } from '@/store/prompts';

let collectedData;
try {
  const dataPrompt = getDataCollectionPrompt('B2', topic, answer);
  collectedData = await callAI(dataPrompt, 'llama-8b', 1500);
} catch (error) {
  // Graceful degradation
  collectedData = generateMinimalData(answer, topic);
}
```

#### Step 3: Parallel Criterion Scoring

```javascript
import { getCriterionScoringPrompts } from '@/store/prompts';

const prompts = getCriterionScoringPrompts(answer, topic, 'B2', collectedData);

// Score all 4 criteria in parallel
const [trScore, ccScore, lrScore, graScore] = await Promise.all([
  callAI(prompts.taskResponse, 'llama-8b', 400),
  callAI(prompts.coherenceCohesion, 'llama-8b', 400),
  callAI(prompts.lexicalResource, 'llama-8b', 400),
  callAI(prompts.grammaticalRange, 'llama-8b', 400)
]);

const criterionScores = {
  taskResponse: trScore,
  coherenceCohesion: ccScore,
  lexicalResource: lrScore,
  grammaticalRange: graScore
};
```

#### Step 4: Score Validation

```javascript
import { validateAndAdjustScores } from '@/store/prompts';

const validatedResult = validateAndAdjustScores(
  criterionScores,
  collectedData,
  'B2'
);

// validatedResult.scores contains adjusted scores
// validatedResult.adjustments contains list of adjustments made
```

#### Step 5: Synthesis & Feedback

```javascript
import { getSynthesisPrompt } from '@/store/prompts';

const synthesisPrompt = getSynthesisPrompt(
  answer,
  topic,
  'B2',
  collectedData,
  criterionScores,
  validatedResult.scores
);

const feedback = await callAI(synthesisPrompt, 'llama-70b', 1200);

// Construct final result
const finalResult = {
  ...validatedResult.scores,
  motivationalText: feedback.motivationalText,
  detailedFeedback: feedback.detailedFeedback,
  evidence: { /* ... */ }
};
```

## Configuration

### Level Configurations

```javascript
import { LEVEL_CONFIGS } from '@/store/prompts';

// Access level-specific settings
const b2Config = LEVEL_CONFIGS['b2'];
console.log(b2Config.minWords);      // 250
console.log(b2Config.range);         // '5.0-7.5'
console.log(b2Config.focus);         // 'Well-developed response'
```

### Band Limits

```javascript
import { BAND_LIMITS } from '@/store/prompts';

const a1Limits = BAND_LIMITS['A1'];
console.log(a1Limits.min);      // 0.0
console.log(a1Limits.max);      // 9.0
console.log(a1Limits.expected); // "2.0-4.5"
```

## Utilities

### Score Validation

```javascript
import { 
  validateAndAdjustScores,
  isScoreValidForLevel,
  checkScoreConsistency 
} from '@/store/prompts';

// Validate and adjust scores
const result = validateAndAdjustScores(criterionScores, collectedData, 'B2');

// Check if score is valid for level
const isValid = isScoreValidForLevel(7.5, 'A1'); // false (too high for A1)

// Check internal consistency
const warnings = checkScoreConsistency(scores);
```

### Fallback Helpers

```javascript
import {
  generateMinimalData,
  generateFallbackFeedback,
  generateFallbackCriterionScore,
  generateErrorResponse
} from '@/store/prompts';

// When Step 2 fails
const minimalData = generateMinimalData(essay, topic);

// When Step 5 fails
const fallbackFeedback = generateFallbackFeedback(scores);

// When a criterion scoring fails
const fallbackScore = generateFallbackCriterionScore('taskResponse', 'B2');

// When everything fails
const errorResponse = generateErrorResponse(error, { step: 'Step 3A' });
```

## System Information

```javascript
import { getSystemInfo, getHybridWorkflow } from '@/store/prompts';

// Get system capabilities
const info = getSystemInfo();
console.log(info.version);              // '3.0.0-hybrid'
console.log(info.supportedLevels);      // ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

// Get hybrid workflow steps
const workflow = getHybridWorkflow();
console.log(workflow.step2.model);      // 'llama-8b'
console.log(workflow.step2.tokens);     // 1500
```

## Migration Guide

### Updating Existing Code

**Before (Old monolithic file):**
```javascript
import { getWritingAssessmentPrompt } from '@/store/writingPrompt';

const prompt = getWritingAssessmentPrompt('B2', 'en', topic, answer);
```

**After (New modular structure):**
```javascript
import { getWritingAssessmentPrompt } from '@/store/prompts';

// Exact same API - backward compatible!
const prompt = getWritingAssessmentPrompt('B2', 'en', topic, answer);
```

### Using New Hybrid System

See the complete example in `WRITING_ASSESSMENT_SYSTEM.md` or the "Hybrid System" section above.

## API Route Integration

### Current API Route (`route.js`)

The API route should import from the new structure:

```javascript
import {
  getValidationPrompt,
  getDataCollectionPrompt,
  getCriterionScoringPrompts,
  validateAndAdjustScores,
  getSynthesisPrompt,
  generateMinimalData,
  generateFallbackFeedback
} from '@/store/prompts';

// Use functions as shown in examples above
```

## Benefits of New Structure

### ✅ DRY Compliance
- No code duplication
- Shared configuration in one place
- Reusable utility functions

### ✅ Maintainability
- Each file has a single responsibility
- Easy to find and update specific prompts
- Clear separation of concerns

### ✅ Testability
- Individual functions can be tested in isolation
- Mock data helpers included
- Validation utilities are separate

### ✅ Scalability
- Easy to add new levels or criteria
- Simple to extend with additional steps
- Clear patterns for new features

### ✅ Backward Compatibility
- Legacy system still available
- Same API for existing code
- Gradual migration possible

## Best Practices

### 1. Always Import from Index
```javascript
// ✅ Good
import { getValidationPrompt } from '@/store/prompts';

// ❌ Bad
import { generateWritingValidationPrompt } from '@/store/prompts/validationPrompt';
```

### 2. Use Fallback Helpers
```javascript
// Always have fallback for data collection
try {
  collectedData = await collectData();
} catch (error) {
  collectedData = generateMinimalData(essay, topic);
}
```

### 3. Validate Scores Programmatically
```javascript
// Always validate after AI scoring
const validated = validateAndAdjustScores(scores, data, level);
// Use validated.scores, not raw scores
```

### 4. Handle Errors Gracefully
```javascript
try {
  // Assessment steps
} catch (error) {
  return generateErrorResponse(error, { step: 'data-collection' });
}
```

## Performance Considerations

### Token Costs

| Step | Model | Tokens | Cost per Assessment |
|------|-------|--------|---------------------|
| 1B | Gemma 3n | 200 | $0.00011 |
| 2 | Llama 8B | 1500 | $0.00075 |
| 3A-D | Llama 8B | 1600 (total) | $0.00120 |
| 5 | Llama 70B | 1200 | $0.00202 |
| **Total** | | | **~$0.00408** |

### Optimization Tips

1. **Cache data collection results** for essay resubmissions
2. **Use parallel calls** for Step 3A-D (saves time)
3. **Implement rate limiting** to avoid API throttling
4. **Consider using Llama 3B** for Step 3 to reduce costs

## Troubleshooting

### Issue: Import errors
**Solution:** Make sure to import from `@/store/prompts` (index.js), not individual files

### Issue: Missing configuration
**Solution:** Import needed constants from config: `import { LEVEL_CONFIGS } from '@/store/prompts'`

### Issue: Validation fails unexpectedly
**Solution:** Check `generateMinimalData()` for fallback data structure

### Issue: Scores seem inconsistent
**Solution:** Use `checkScoreConsistency()` to identify issues

## Support

For questions or issues with the writing assessment system:
1. Check this README
2. See `WRITING_ASSESSMENT_SYSTEM.md` for detailed implementation guide
3. Review code examples in each prompt file
4. Check utility functions in `scoreValidator.js` and `fallbackHelpers.js`

## Version History

- **v3.0.0** - Hybrid Multi-Pass System with modular structure
- **v2.0.0** - Legacy single-prompt system (maintained for compatibility)
- **v1.0.0** - Original implementation

---

**Last Updated:** December 2025  
**Maintained by:** UnitSchool Development Team

