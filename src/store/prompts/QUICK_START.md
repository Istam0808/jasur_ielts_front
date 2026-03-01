# Quick Start Guide - Writing Assessment System

## 🚀 5-Minute Setup

### Step 1: Update Your Imports (1 minute)

**Old code:**
```javascript
import { getWritingAssessmentPrompt } from '@/store/writingPrompt';
```

**New code:**
```javascript
import { getWritingAssessmentPrompt } from '@/store/prompts';
```

That's it! Everything works the same. ✅

---

## 💡 Using the New Structure

### Get Everything You Need in One Import

```javascript
import {
  // Main functions
  getValidationPrompt,
  getDataCollectionPrompt,
  getCriterionScoringPrompts,
  validateAndAdjustScores,
  getSynthesisPrompt,
  
  // Configuration
  LEVEL_CONFIGS,
  BAND_LIMITS,
  
  // Utilities
  generateMinimalData,
  generateFallbackFeedback
} from '@/store/prompts';
```

---

## 📋 Two Ways to Use the System

### Option A: Legacy System (Current Default)

Use this if you want minimal changes:

```javascript
import { getWritingAssessmentPrompt } from '@/store/prompts';

// Single prompt, one AI call
const prompt = getWritingAssessmentPrompt('B2', 'en', topic, answer);
const result = await callAI(prompt, 'llama-70b', 1600);

return result;
```

✅ **Pros:** Simple, works as before, minimal changes  
⚠️ **Cons:** Single AI call does everything (can be inconsistent)

---

### Option B: Hybrid System (Recommended for Production)

Use this for better accuracy and consistency:

```javascript
import {
  getDataCollectionPrompt,
  getCriterionScoringPrompts,
  validateAndAdjustScores,
  getSynthesisPrompt,
  generateMinimalData,
  generateFallbackFeedback
} from '@/store/prompts';

// Step 2: Collect data (Llama 8B - cheap)
let data;
try {
  const prompt = getDataCollectionPrompt('B2', topic, answer);
  data = await callAI(prompt, 'llama-8b', 1500);
} catch (e) {
  data = generateMinimalData(answer, topic); // Fallback
}

// Step 3: Score criteria in parallel (Llama 8B - cheap)
const prompts = getCriterionScoringPrompts(answer, topic, 'B2', data);

const scores = await Promise.all([
  callAI(prompts.taskResponse, 'llama-8b', 400),
  callAI(prompts.coherenceCohesion, 'llama-8b', 400),
  callAI(prompts.lexicalResource, 'llama-8b', 400),
  callAI(prompts.grammaticalRange, 'llama-8b', 400)
]);

// Step 4: Validate scores (programmatic - free!)
const validated = validateAndAdjustScores(
  {
    taskResponse: scores[0],
    coherenceCohesion: scores[1],
    lexicalResource: scores[2],
    grammaticalRange: scores[3]
  },
  data,
  'B2'
);

// Step 5: Generate feedback (Llama 70B - expensive but worth it)
let feedback;
try {
  const prompt = getSynthesisPrompt(
    answer, topic, 'B2', data, scores, validated.scores
  );
  feedback = await callAI(prompt, 'llama-70b', 1200);
} catch (e) {
  feedback = generateFallbackFeedback(validated.scores); // Fallback
}

// Final result
return {
  ...validated.scores,
  ...feedback,
  adjustments: validated.adjustments // Show what was changed
};
```

✅ **Pros:** More accurate, consistent, cheaper per criterion, parallel scoring  
⚠️ **Cons:** More code, 5 steps instead of 1

---

## 🎯 Which System Should I Use?

| Scenario | Use | Why |
|----------|-----|-----|
| Quick testing | Legacy | Simple, fast to implement |
| A1-B1 levels | Legacy | Works well for simpler essays |
| B2-C2 levels | Hybrid | Better discrimination at high levels |
| Production | Hybrid | More consistent and reliable |
| High volume | Hybrid | Cheaper per assessment |

---

## 🔧 Common Tasks

### Check if a score is valid for a level

```javascript
import { isScoreValidForLevel } from '@/store/prompts';

const valid = isScoreValidForLevel(7.5, 'A1'); // false (too high)
const valid = isScoreValidForLevel(6.5, 'B2'); // true
```

### Get configuration for a level

```javascript
import { LEVEL_CONFIGS } from '@/store/prompts';

const config = LEVEL_CONFIGS['b2'];
console.log(config.minWords);  // 250
console.log(config.range);     // '5.0-7.5'
```

### Generate minimal data when Step 2 fails

```javascript
import { generateMinimalData } from '@/store/prompts';

const fallbackData = generateMinimalData(essay, topic);
// Returns basic metrics like word count, sentence count
```

### Check score consistency

```javascript
import { checkScoreConsistency } from '@/store/prompts';

const warnings = checkScoreConsistency(scores);
// Returns warnings like "Grammar much lower than others"
```

---

## 🐛 Troubleshooting

### "Cannot find module '@/store/prompts'"

Make sure you're importing from the index file:
```javascript
import { ... } from '@/store/prompts';        // ✅ Correct
import { ... } from '@/store/prompts/index';  // ✅ Also works
```

### "Function is not exported"

Check the index.js file - all functions are exported there:
```javascript
import { getValidationPrompt } from '@/store/prompts';  // ✅
```

### Scores seem wrong

Use the validation function:
```javascript
const validated = validateAndAdjustScores(scores, data, level);
console.log(validated.adjustments); // See what was changed
```

### AI call fails

Always use fallbacks:
```javascript
try {
  data = await callAI(prompt);
} catch (error) {
  data = generateMinimalData(essay, topic); // Fallback
}
```

---

## 📚 More Help

- **Full documentation:** See `README.md`
- **Implementation guide:** See `WRITING_ASSESSMENT_SYSTEM.md`
- **Refactoring details:** See `REFACTORING_SUMMARY.md`
- **Code examples:** Look at inline comments in each file

---

## 🎉 You're Ready!

The refactored system is ready to use. Start with the legacy system for backward compatibility, then gradually migrate to the hybrid system when ready.

**Need help?** All files have detailed comments and examples.

**Want to contribute?** Follow the patterns established in existing files.

---

*Last updated: December 2025*

