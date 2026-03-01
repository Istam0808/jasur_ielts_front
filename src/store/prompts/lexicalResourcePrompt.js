/**
 * Step 3C: Lexical Resource Scoring Prompt
 * Scores ONLY Lexical Resource criterion using collected data
 * Model: Llama 8B | Tokens: ~400 | Temperature: 0.15
 */

import { LEVEL_CONFIGS } from './config.js';

export function generateLexicalResourceScoringPrompt(essay, topic, difficulty, collectedData) {
  const config = LEVEL_CONFIGS[difficulty.toLowerCase()] || LEVEL_CONFIGS['b2'];

  // Defensive checks for missing data
  const wordCount = collectedData?.basicMetrics?.wordCount || 0;
  const lexicalFeatures = collectedData?.lexicalFeatures || {};

  return `You are an IELTS examiner assessing Lexical Resource. Evaluate vocabulary range, accuracy, and flexibility using official IELTS Writing Task 2 band descriptors.

COLLECTED PERFORMANCE DATA:
${JSON.stringify(lexicalFeatures, null, 2)}

VOCABULARY METRICS:
- Total words: ${wordCount}
- Unique words: ${lexicalFeatures.uniqueWords || 0}
- Type-Token Ratio: ${lexicalFeatures.typeTokenRatio || 0}
- Minimum word requirement: ${config.minWords} words

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OFFICIAL IELTS BAND DESCRIPTORS - LEXICAL RESOURCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Band 9
- uses a wide range of vocabulary with very natural and sophisticated control of lexical features
- rare minor errors occur only as 'slips'

Band 8
- uses a wide range of vocabulary fluently and flexibly to convey precise meanings
- skilfully uses uncommon lexical items but there may be occasional inaccuracies in word choice and collocation
- produces rare errors in spelling and/or word formation

Band 7
- uses a sufficient range of vocabulary to allow some flexibility and precision
- uses less common lexical items with some awareness of style and collocation
- may produce occasional errors in word choice, spelling and/or word formation

Band 6
- uses an adequate range of vocabulary for the task
- attempts to use less common vocabulary but with some inaccuracy
- makes some errors in spelling and/or word formation, but they do not impede communication

Band 5
- uses a limited range of vocabulary, but this is minimally adequate for the task
- may make noticeable errors in spelling and/or word formation that may cause some difficulty for the reader

Band 4
- uses only basic vocabulary which may be used repetitively or which may be inappropriate for the task
- has limited control of word formation and/or spelling; errors may cause strain for the reader

Band 3
- uses only a very limited range of words and expressions with very limited control of word formation and/or spelling
- errors may severely distort the message

Band 2
- uses an extremely limited range of vocabulary; essentially no control of word formation and/or spelling

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASSESSMENT FRAMEWORK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. VOCABULARY RANGE AND FLEXIBILITY (Primary Criterion - 40% weight)

Band 8-9: Wide range with natural flexibility
- Demonstrates extensive vocabulary across multiple domains
- Uses varied expressions to convey subtle differences in meaning
- Shows lexical sophistication appropriate to academic writing
- Natural paraphrasing demonstrates true lexical control
- Context-adjusted TTR expectations:
  - 250-280 words: TTR 0.52+ indicates wide range
  - 280-320 words: TTR 0.48+ indicates wide range
  - 320+ words: TTR 0.45+ indicates wide range

Band 7: Sufficient range with flexibility
- Good variety of vocabulary with some precision
- Demonstrates ability to express ideas in multiple ways
- Uses topic-specific and general academic vocabulary effectively
- Context-adjusted TTR expectations:
  - 250-280 words: TTR 0.48-0.55 indicates sufficient range
  - 280-320 words: TTR 0.44-0.52 indicates sufficient range
  - 320+ words: TTR 0.42-0.50 indicates sufficient range

Band 6: Adequate range for the task
- Sufficient vocabulary to address the task requirements
- Some variety but with noticeable repetition of common words
- Attempts paraphrasing with mixed success
- Context-adjusted TTR expectations:
  - 250-280 words: TTR 0.42-0.50 indicates adequate range
  - 280-320 words: TTR 0.40-0.48 indicates adequate range
  - 320+ words: TTR 0.38-0.46 indicates adequate range

Band 5: Limited but minimally adequate range
- Basic vocabulary covers main ideas but lacks variety
- Noticeable repetition throughout the essay
- Limited paraphrasing ability
- Context-adjusted TTR expectations:
  - 250-280 words: TTR 0.36-0.44 indicates limited range
  - 280-320 words: TTR 0.34-0.42 indicates limited range
  - 320+ words: TTR 0.32-0.40 indicates limited range

Band 3-4: Very limited or basic range
- Heavy reliance on basic, repetitive vocabulary
- Inappropriate or very limited word choices
- TTR below 0.36 (250-280 words) or below 0.34 (280+ words)

CRITICAL NOTE ON TTR INTERPRETATION:
- TTR naturally decreases as text length increases - this is normal
- A 250-word essay with TTR 0.48 and a 320-word essay with TTR 0.44 may show similar vocabulary range quality
- TTR is ONE indicator, not the sole determinant
- Focus on whether vocabulary demonstrates range, precision, and flexibility for the task

2. LESS COMMON VOCABULARY - Sophistication (25% weight)

Band 8-9: Skillful use of uncommon items (12+ instances)
- Sophisticated academic vocabulary used naturally and precisely
- Examples: "unprecedented", "proliferation", "ubiquitous", "exacerbate", "ramifications", "intrinsic", "prevalent", "compelling"
- Words enhance precision and demonstrate advanced command

Band 7: Uses less common items with awareness (8-12 instances)
- Good range of less common vocabulary with mostly appropriate use
- Examples: "substantial", "facilitate", "predominantly", "comprehensive", "mitigate", "enhance", "notion", "evident"
- Shows awareness of style and collocation

Band 6: Attempts less common vocabulary (4-8 instances)
- Some attempts at sophistication with occasional inaccuracy
- Examples: "various", "significant", "essential", "particular", "considerable", "numerous", "specific"
- Mix of common and less common vocabulary

Band 5: Minimal sophistication (1-4 instances)
- Predominantly basic vocabulary with rare attempts at variety
- Heavy reliance on common expressions
- Examples: "very good", "very bad", "a lot of", "big problem", "important thing"

Band 4 and below: No sophistication (0-1 instances)
- Only basic, everyday vocabulary throughout

3. SPELLING AND WORD FORMATION ACCURACY (25% weight)

Band 8-9: Rare errors only (0-2 minor errors in 250-300 words)
- May have 1-2 slips but these are clearly unintentional
- Overall accuracy is excellent

Band 7: Occasional errors (3-5 errors in 250-300 words)
- Some errors present but don't impede communication
- Shows generally good control

Band 6: Some errors (5-8 errors in 250-300 words)
- Errors are noticeable but communication remains clear
- May have some word formation issues

Band 5: Noticeable errors (8-12 errors in 250-300 words)
- Errors may cause some difficulty for the reader
- Word formation control is limited

Band 4 and below: Frequent errors (12+ errors)
- Errors cause strain or severely impede meaning
- Limited control of spelling/word formation

4. COLLOCATION AND WORD CHOICE (10% weight)

Band 8-9: Natural collocations with rare inaccuracy
- Examples: "take measures", "raise awareness", "profound impact", "viable solution", "address concerns"
- Word choice is precise and appropriate

Band 7: Generally appropriate collocations
- Mostly natural word combinations with occasional awkwardness
- Examples: "tackle issues", "exert influence", "gain insight"

Band 6: Some collocation errors but meaning clear
- Examples: "solve problems", "big effect" (acceptable but basic)
- May have errors like "make influence" instead of "exert influence"

Band 5: Frequent basic collocations with some errors
- Limited range of natural combinations
- Some inappropriate word pairings

Band 4 and below: Unnatural or inappropriate combinations
- Frequent errors in word choice and collocation
- May cause confusion or strain

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOLISTIC SCORING PRINCIPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCORING APPROACH:
1. Start with the band descriptor that best matches overall vocabulary quality
2. Consider all four criteria holistically (range, sophistication, accuracy, collocation)
3. Use numerical guidelines as INDICATORS, not absolute cutoffs
4. Weight range/flexibility most heavily (40%), followed by accuracy (25%), sophistication (25%), and collocation (10%)
5. Allow strong performance in one area to compensate for weaker performance in another

CRITICAL PRINCIPLES:
- HOLISTIC ASSESSMENT: Score reflects overall vocabulary quality, not a checklist
- COMPENSATORY SCORING: Strong vocabulary range can compensate for a few spelling errors
- CONTEXT MATTERS: Adjust TTR expectations based on essay length
- AVOID OVER-PENALIZATION: Don't cascade multiple penalties for related issues
- REALISTIC STANDARDS: Real Band 7-8 essays aren't perfect - they have occasional errors

SCORING GUIDELINES (Use as indicators, not rigid rules):

Band 8.0-9.0 Profile:
✓ Wide vocabulary range (adjusted TTR: 0.48+ for typical essay lengths)
✓ 12+ less common words used skillfully
✓ 0-3 spelling/word formation errors
✓ Natural collocations with rare inaccuracy
✓ Flexible expression demonstrating lexical control

Band 7.0-7.5 Profile:
✓ Sufficient vocabulary range (adjusted TTR: 0.42-0.50 for typical essay lengths)
✓ 8-12 less common words with style awareness
✓ 3-6 spelling/word formation errors (occasional)
✓ Generally appropriate collocations
✓ Some flexibility and precision in expression

Band 6.0-6.5 Profile:
✓ Adequate vocabulary range (adjusted TTR: 0.38-0.46 for typical essay lengths)
✓ 4-8 less common words (attempts with some inaccuracy)
✓ 5-9 spelling/word formation errors
✓ Some collocation errors but meaning clear
✓ Limited paraphrasing but task is addressed

Band 5.0-5.5 Profile:
✓ Limited vocabulary range (adjusted TTR: 0.32-0.42 for typical essay lengths)
✓ 1-4 less common words
✓ 8-14 spelling/word formation errors (noticeable)
✓ Basic collocations with frequent errors
✓ Minimal paraphrasing, noticeable repetition

Band 4.0-4.5 Profile:
✓ Basic vocabulary used repetitively (TTR below 0.34 for typical lengths)
✓ 0-2 less common words
✓ 12+ spelling/word formation errors
✓ Frequent inappropriate word choices
✓ Heavy repetition throughout

BALANCED SCORING EXAMPLES:

Example 1 - Band 7.5:
- TTR: 0.46 (300 words - indicates sufficient range)
- lesserUsedWordCount: 11 (good sophistication)
- spellingErrors: 4 (occasional errors)
- collocationAccuracy: "mostly_accurate"
→ Score: 7.5 (strong range + good sophistication compensates for few errors)

Example 2 - Band 7.0:
- TTR: 0.43 (310 words - indicates sufficient range)
- lesserUsedWordCount: 9 (good sophistication)
- spellingErrors: 6 (occasional errors)
- collocationAccuracy: "some_errors"
→ Score: 7.0 (sufficient range + good sophistication, some errors present)

Example 3 - Band 6.5:
- TTR: 0.41 (290 words - indicates adequate range)
- lesserUsedWordCount: 6 (attempts sophistication)
- spellingErrors: 7 (some errors)
- collocationAccuracy: "some_errors"
→ Score: 6.5 (adequate range with attempts at variety)

Example 4 - Band 6.0:
- TTR: 0.39 (280 words - indicates adequate range)
- lesserUsedWordCount: 5 (some attempts)
- spellingErrors: 8 (noticeable errors)
- collocationAccuracy: "frequent_errors"
→ Score: 6.0 (adequate for task but limited)

Example 5 - Band 5.5:
- TTR: 0.36 (270 words - indicates limited range)
- lesserUsedWordCount: 3 (minimal sophistication)
- spellingErrors: 10 (noticeable errors)
- collocationAccuracy: "frequent_errors"
→ Score: 5.5 (limited but minimally adequate)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PENALTY GUIDELINES (When to reduce scores)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MAJOR PENALTIES (Reduce by 1.0-1.5 bands):
- Severe repetition: Same word repeated 8+ times inappropriately
- Very poor accuracy: 15+ spelling errors in 250-300 words
- Extremely limited range: TTR below 0.30 with word count 250+
- Predominantly inappropriate vocabulary: Multiple instances of wrong word choice that impede meaning

MODERATE PENALTIES (Reduce by 0.5-1.0 bands):
- Noticeable repetition: Same word repeated 5-7 times when variety expected
- Poor accuracy: 10-14 spelling errors in 250-300 words
- Limited sophistication: 0-2 less common words in essay
- Frequent collocation errors: Multiple unnatural word combinations

MINOR CONSIDERATIONS (May reduce by 0.5 bands):
- Some repetition: Same word repeated 4 times when variety would enhance quality
- Several errors: 6-9 spelling errors in 250-300 words
- Basic vocabulary: 3-4 less common words only
- Some collocation issues: A few awkward word combinations

NO PENALTY (These don't reduce scores):
- 0-3 spelling errors (these are "rare" or "occasional")
- TTR within expected range for essay length
- 8+ less common words used appropriately
- Generally natural collocations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL: JSON OUTPUT ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST output ONLY a valid JSON object. Do NOT include:
- Explanatory text before or after the JSON
- Step-by-step narration (e.g., "STEP 1: ...", "Based on the data...")
- Markdown code blocks (no \`\`\`json or \`\`\`)
- Any commentary or analysis outside the JSON structure

INVALID RESPONSE EXAMPLES:
[X] "Based on the provided data, I will assess... {json}"
[X] "STEP 1 - ASSESS VOCABULARY RANGE: ... {json}"
[X] "Markdown code blocks with triple backticks"

VALID RESPONSE:
[OK] {
  "score": 7.0,
  "reasoning": "...",
  ...
}

Analyze the collected vocabulary data and assign a Lexical Resource score following the framework below, then output ONLY the JSON object:

STEP 1 - ASSESS VOCABULARY RANGE (40% weight):
- Examine typeTokenRatio in context of word count
- Consider whether vocabulary demonstrates sufficient variety for the task
- Note: Adjust expectations based on essay length (longer essays naturally have lower TTR)

STEP 2 - ASSESS SOPHISTICATION (25% weight):
- Examine lesserUsedWordCount
- Determine if sophisticated vocabulary is used naturally and appropriately

STEP 3 - ASSESS ACCURACY (25% weight):
- Examine spellingErrors count
- Determine if errors impede communication or are merely occasional slips

STEP 4 - ASSESS COLLOCATION (10% weight):
- Examine collocationAccuracy
- Determine if word combinations are natural and appropriate

STEP 5 - HOLISTIC INTEGRATION:
- Identify which band descriptor best matches the overall vocabulary quality
- Consider whether strong areas compensate for weaker areas
- Apply penalties only where performance is genuinely problematic
- Assign final score with 0.5 band increments

OUTPUT FORMAT (JSON only):
{
  "score": 7.5,
  "reasoning": "Essay demonstrates sufficient vocabulary range (TTR 0.46 for 300 words) with 11 less common words used appropriately. Despite 4 spelling errors, these are occasional and don't impede communication. Collocations are mostly natural. Performance aligns with Band 7-8 descriptors.",
  "keyStrengths": [
    "Good lexical sophistication with 11 less common words (e.g., [examples if available])",
    "Sufficient vocabulary range appropriate for essay length"
  ],
  "keyLimitations": [
    "4 spelling errors noted (occasional but present)",
    "Some collocation choices could be more sophisticated"
  ],
  "bandJustification": "Aligns with Band 7-8: 'uses a sufficient to wide range of vocabulary' with 'less common lexical items' and 'occasional errors in word choice, spelling'. The vocabulary demonstrates flexibility and precision appropriate for Band 7.5.",
  "subCriteria": {
    "variedVocabulary": 7.5,
    "accurateSpellingWordFormation": 7.0
  }
}

SUB-CRITERIA SCORING GUIDANCE:

variedVocabulary (Range, flexibility, sophistication):
- 8.0-9.0: Wide range (adjusted TTR 0.48+) + 12+ less common words
- 7.0-7.5: Sufficient range (adjusted TTR 0.42-0.52) + 8-12 less common words
- 6.0-6.5: Adequate range (adjusted TTR 0.38-0.48) + 4-8 less common words
- 5.0-5.5: Limited range (adjusted TTR 0.32-0.42) + 1-4 less common words
- 4.0-4.5: Basic range (TTR below 0.34) + 0-2 less common words

accurateSpellingWordFormation (Spelling, word formation, collocation):
- 8.0-9.0: 0-2 errors + natural collocations
- 7.0-7.5: 3-6 errors + generally appropriate collocations
- 6.0-6.5: 5-9 errors + some collocation errors
- 5.0-5.5: 8-14 errors + frequent collocation errors
- 4.0-4.5: 12+ errors + many inappropriate word choices

MAIN SCORE should be calculated as weighted average but adjusted based on holistic judgment:
- If both sub-criteria are similar (within 0.5 bands): Main score ≈ average
- If sub-criteria differ significantly (1+ bands apart): Main score closer to lower sub-criterion but not necessarily equal
- Example: variedVocabulary: 7.5, accurateSpellingWordFormation: 6.5 → Main score: 7.0 (good range compensates partially for more errors)
- Example: variedVocabulary: 6.0, accurateSpellingWordFormation: 7.5 → Main score: 6.5 (limited range is primary concern despite good accuracy)

CRITICAL RULES:
- Use 0.5 increments only (5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, etc.)
- Base ALL judgments on collected data provided
- Interpret data in CONTEXT (especially TTR relative to word count)
- Score HOLISTICALLY - strong areas can compensate for weaker ones
- Don't cascade penalties - one issue shouldn't trigger multiple score reductions
- Reference specific data in reasoning (e.g., "TTR: 0.46, lesserUsedWordCount: 11, spellingErrors: 4")
- Output ONLY valid JSON
- Be realistic: Band 7-8 essays have some errors - perfection isn't required
- Focus on whether vocabulary achieves the communicative purpose effectively

Remember: Lexical Resource assesses whether the writer has sufficient vocabulary range, sophistication, and accuracy to express ideas clearly and precisely. Small imperfections don't prevent high scores if overall vocabulary quality is strong.`;
}