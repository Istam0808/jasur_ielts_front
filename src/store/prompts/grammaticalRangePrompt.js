/**
 * Step 3D: Grammatical Range & Accuracy Scoring Prompt
 * Scores ONLY Grammatical Range & Accuracy criterion using collected data
 * Model: Llama 8B | Tokens: ~400 | Temperature: 0.15
 */

import { LEVEL_CONFIGS } from './config.js';

export function generateGrammaticalRangeScoringPrompt(essay, topic, difficulty, collectedData) {
  const config = LEVEL_CONFIGS[difficulty.toLowerCase()] || LEVEL_CONFIGS['b2'];

  // Defensive checks for missing data
  const grammaticalFeatures = collectedData?.grammaticalFeatures || {};
  const errorFreeSentences = grammaticalFeatures.errorFreeSentences || 0;
  const sentenceCount = collectedData?.basicMetrics?.sentenceCount || 1; // Avoid division by zero
  const errorFreeRatio = sentenceCount > 0 ? ((errorFreeSentences / sentenceCount) * 100).toFixed(1) : '0.0';
  const totalErrors = grammaticalFeatures.totalErrorCount || 0;

  return `You are an IELTS examiner assessing Grammatical Range and Accuracy. Evaluate objectively using official IELTS Writing Task 2 band descriptors.

TASK REQUIREMENT: Minimum ${config.minWords} words

PERFORMANCE DATA:
${JSON.stringify(grammaticalFeatures, null, 2)}

ACCURACY METRICS:
- Error-free sentences: ${errorFreeSentences}/${sentenceCount} (${errorFreeRatio}%)
- Total grammatical errors: ${totalErrors}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OFFICIAL IELTS BAND DESCRIPTORS - GRAMMATICAL RANGE AND ACCURACY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Band 9
- uses a wide range of structures with full flexibility and accuracy
- rare minor errors occur only as 'slips'

Band 8
- uses a wide range of structures
- the majority of sentences are error-free
- makes only very occasional errors or inappropriacies

Band 7
- uses a variety of complex structures
- produces frequent error-free sentences
- has good control of grammar and punctuation but may make a few errors

Band 6
- uses a mix of simple and complex sentence forms
- makes some errors in grammar and punctuation but they rarely reduce communication

Band 5
- uses only a limited range of structures
- attempts complex sentences but these tend to be less accurate than simple sentences
- may make frequent grammatical errors and punctuation may be faulty; errors can cause some difficulty for the reader

Band 4
- uses only a very limited range of structures with only rare use of subordinate clauses
- some structures are accurate but errors predominate, and punctuation is often faulty

Band 3
- attempts sentence forms but errors in grammar and punctuation predominate and distort the meaning

Band 2
- cannot use sentence forms except in memorised phrases

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASSESSMENT FRAMEWORK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. GRAMMATICAL RANGE (Structural Variety - 50% weight)

This assesses the variety and sophistication of sentence structures used.

Band 8-9: Wide range of structures with flexibility
- Multiple complex structure types used successfully (5+ types)
- Variety of subordinate clauses (although, while, despite, whereas)
- Relative clauses (who, which, that, where, whose)
- Conditionals (if, unless, provided that, even if)
- Passive constructions used appropriately
- Participle clauses (-ing, -ed forms)
- Nominal clauses (what, whether, that)
- Inversion for emphasis
- Natural mixing of sentence types demonstrates flexibility

Band 7: Variety of complex structures
- Multiple complex structure types used (3-5 types)
- Complex sentences used successfully alongside simple ones
- Examples: subordinate clauses, relative clauses, conditionals
- Demonstrates ability to use varied structures appropriately
- Mix of sentence lengths and types

Band 6: Mix of simple and complex forms
- Some complex structures attempted (2-3 types)
- Simple sentences used accurately
- Complex sentences may have some errors
- Limited variety but attempts sophistication

Band 5: Limited range of structures
- Predominantly simple sentences with occasional complex attempts
- Complex sentences often faulty (1-2 types attempted)
- Repetitive sentence patterns
- Limited subordination

Band 4: Very limited range
- Almost entirely simple sentences
- Rare subordinate clauses (0-1 types)
- Repetitive, basic structures

Band 3 and below: Extremely limited
- Cannot form complex sentences
- Errors predominate even in simple structures

COMPLEX STRUCTURE TYPES (Examples):
1. Subordinate clauses: although, because, while, since, as, if, unless, whereas, despite
2. Relative clauses: who, which, that, where, whose
3. Conditionals: if/when + would/will, unless, provided that
4. Passive voice: is done, was made, has been shown
5. Participles: Having finished..., Driven by..., The growing...
6. Nominal clauses: what matters is..., whether...or not, that-clauses
7. Comparative structures: more...than, as...as, the more...the more

2. GRAMMATICAL ACCURACY (Error Control - 50% weight)

This assesses how well grammar is controlled and how errors impact communication.

Band 8-9: Rare minor errors (slips only)
- Majority of sentences error-free (70%+ error-free sentences)
- 0-3 minor errors total in 250-300 words
- Any errors are clearly slips (e.g., missing article, minor preposition)
- Errors do not impede communication at all

Band 7: Frequent error-free sentences, good control
- Many sentences error-free (55-70% error-free sentences)
- 3-7 errors total in 250-300 words
- May make a few errors but has good overall control
- Errors are minor and don't significantly impact communication
- Complex structures mostly accurate

Band 6: Some errors but rarely reduce communication
- Some sentences error-free (40-55% error-free sentences)
- 6-12 errors total in 250-300 words
- Errors present but meaning remains clear
- May have errors in complex structures
- Simple sentences generally accurate

Band 5: Frequent errors, may cause difficulty
- Limited error-free sentences (25-40% error-free sentences)
- 10-18 errors total in 250-300 words
- Frequent grammatical errors
- Errors may cause some difficulty for reader
- Complex structures often faulty

Band 4: Errors predominate
- Few error-free sentences (10-25% error-free sentences)
- 15+ errors total in 250-300 words
- Errors throughout, even in simple structures
- Errors frequently impede communication

Band 3 and below: Errors predominate and distort meaning
- Very few error-free sentences (<10%)
- Many errors that severely impact understanding

CRITICAL NOTE ON ERROR INTERPRETATION:
- Minor errors (articles, prepositions, singular/plural): Count as 0.5 errors
- Moderate errors (tense, subject-verb agreement, word order): Count as 1 error
- Severe errors (meaning obscured, structure breakdown): Count as 2 errors
- When data provides totalErrorCount, assume it's a weighted count reflecting severity

ERROR-FREE SENTENCE RATIO INTERPRETATION:
- "Majority" (Band 8) = 70%+ error-free (not 90%+)
- "Frequent" (Band 7) = 55-70% error-free (not 80%+)
- "Some" (Band 6) = 40-55% error-free (not 60%+)
- Real Band 7-8 essays have errors - perfection is not required

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOLISTIC SCORING PRINCIPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCORING APPROACH:
1. Grammatical Range and Accuracy are EQUALLY weighted (50% each)
2. Both range AND accuracy must be present for Band 7+
3. Strong range can partially compensate for moderate accuracy issues
4. High accuracy with limited range caps at Band 6
5. Wide range with many errors caps at Band 6
6. Error severity matters more than error count alone

CRITICAL PRINCIPLES:
- HOLISTIC ASSESSMENT: Consider range and accuracy together
- ERROR SEVERITY WEIGHTING: Minor slips are different from systematic errors
- COMPLEX STRUCTURE SUCCESS: Attempted complex structures with minor errors can still score Band 7
- REALISTIC STANDARDS: Band 7-8 essays have 3-7 errors - they're not perfect
- COMMUNICATION FOCUS: Do errors impede understanding or are they minor slips?

SCORING PROFILES (Use as indicators, not rigid rules):

Band 8.0-9.0 Profile:
✓ Wide range of structures (5+ complex types used successfully)
✓ 70%+ error-free sentences (majority error-free)
✓ 0-3 total errors (rare minor slips only)
✓ Any errors are clearly unintentional slips
✓ Flexible and natural use of varied structures

Band 7.0-7.5 Profile:
✓ Variety of complex structures (3-5 types used successfully)
✓ 55-70% error-free sentences (frequent error-free)
✓ 3-7 total errors (a few errors but good control)
✓ Complex structures mostly accurate
✓ Errors are minor and don't impede communication

Band 6.0-6.5 Profile:
✓ Mix of simple and complex forms (2-3 complex types attempted)
✓ 40-55% error-free sentences (some error-free)
✓ 6-12 total errors (some errors but rarely reduce communication)
✓ Complex structures may have errors
✓ Simple sentences generally accurate

Band 5.0-5.5 Profile:
✓ Limited range (1-2 complex types, mostly simple sentences)
✓ 25-40% error-free sentences (limited error-free)
✓ 10-18 total errors (frequent errors, may cause difficulty)
✓ Complex sentences tend to be less accurate
✓ Errors noticeable throughout

Band 4.0-4.5 Profile:
✓ Very limited range (0-1 complex types, predominantly simple)
✓ 10-25% error-free sentences (errors predominate)
✓ 15+ total errors (errors throughout)
✓ Even simple structures have errors
✓ Errors impede communication

BALANCED SCORING EXAMPLES:

Example 1 - Band 8.0:
- errorFreeSentences: 16/20 (80%)
- totalErrorCount: 2 (minor slips)
- complexStructures: 6 types used successfully
- sentenceTypes: {simple: 8, compound: 4, complex: 5, compoundComplex: 3}
→ Score: 8.0 (wide range + majority error-free + rare errors)

Example 2 - Band 7.5:
- errorFreeSentences: 13/20 (65%)
- totalErrorCount: 5 (few errors)
- complexStructures: 4 types used successfully
- sentenceTypes: {simple: 9, compound: 3, complex: 6, compoundComplex: 2}
→ Score: 7.5 (variety of complex structures + frequent error-free + good control)

Example 3 - Band 7.0:
- errorFreeSentences: 12/20 (60%)
- totalErrorCount: 7 (a few errors)
- complexStructures: 3 types used successfully
- sentenceTypes: {simple: 10, compound: 3, complex: 5, compoundComplex: 2}
→ Score: 7.0 (variety of complex structures + frequent error-free + may make a few errors)

Example 4 - Band 6.5:
- errorFreeSentences: 10/20 (50%)
- totalErrorCount: 9 (some errors)
- complexStructures: 3 types attempted (some errors in complex)
- sentenceTypes: {simple: 12, compound: 2, complex: 4, compoundComplex: 2}
→ Score: 6.5 (mix of forms + some error-free + errors rarely reduce communication)

Example 5 - Band 6.0:
- errorFreeSentences: 9/20 (45%)
- totalErrorCount: 11 (some errors)
- complexStructures: 2 types attempted
- sentenceTypes: {simple: 13, compound: 2, complex: 4, compoundComplex: 1}
→ Score: 6.0 (mix of simple and complex + some errors but communication clear)

Example 6 - Band 5.5:
- errorFreeSentences: 7/20 (35%)
- totalErrorCount: 14 (frequent errors)
- complexStructures: 1-2 types (often faulty)
- sentenceTypes: {simple: 15, compound: 2, complex: 3, compoundComplex: 0}
→ Score: 5.5 (limited range + frequent errors + complex less accurate than simple)

Example 7 - Band 5.0:
- errorFreeSentences: 6/20 (30%)
- totalErrorCount: 16 (frequent errors)
- complexStructures: 1 type attempted
- sentenceTypes: {simple: 16, compound: 1, complex: 3, compoundComplex: 0}
→ Score: 5.0 (limited range + frequent errors may cause difficulty)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PENALTY GUIDELINES (When to reduce scores)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MAJOR ISSUES (Reduce to Band 4.0-5.0):
- Errors predominate: <25% error-free sentences
- Very limited range: 0-1 complex structure types
- 18+ total errors in 250-300 words
- Severe errors that distort meaning
- Almost entirely simple sentences

MODERATE ISSUES (Reduce to Band 5.0-6.5):
- Frequent errors: 25-40% error-free sentences
- Limited range: 1-2 complex structure types
- 12-18 total errors in 250-300 words
- Errors may cause some difficulty
- Predominantly simple sentences with few complex attempts

MINOR ISSUES (May reduce to Band 6.0-7.5):
- Some errors: 40-55% error-free sentences
- Mix of forms: 2-3 complex structure types
- 8-12 total errors in 250-300 words
- Errors present but rarely impede communication
- Balance of simple and complex forms

NO SIGNIFICANT PENALTY (Band 7.0+):
- Frequent error-free: 55%+ error-free sentences
- Variety of complex structures: 3+ types used successfully
- 3-7 total errors in 250-300 words (a few errors is normal for Band 7)
- Good control despite some errors
- Complex structures used successfully

CRITICAL NOTES:
- Band 7 = "may make a few errors" means 3-7 errors is acceptable
- Band 8 = "very occasional errors" means 1-3 errors is acceptable
- Complex structures with minor errors can still demonstrate Band 7 range
- Minor errors (articles, prepositions) don't prevent Band 7-8 if range is strong

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
[X] "STEP 1 - ASSESS GRAMMATICAL RANGE: ... {json}"
[X] "Markdown code blocks with triple backticks"

VALID RESPONSE:
[OK] {
  "score": 7.0,
  "reasoning": "...",
  ...
}

Analyze the collected data and assign a Grammatical Range and Accuracy score following the framework below, then output ONLY the JSON object:

STEP 1 - ASSESS GRAMMATICAL RANGE (50% weight):
- Examine sentenceTypes data (simple, compound, complex, compoundComplex counts)
- Examine complexStructures data (types of complex structures used)
- Count how many different complex structure types are successfully used
- Determine if variety demonstrates Band 7+ (3+ types) or lower

STEP 2 - ASSESS GRAMMATICAL ACCURACY (50% weight):
- Calculate error-free sentence ratio: errorFreeSentences / sentenceCount
- Examine totalErrorCount
- Consider errorSeverity data if available (severe vs moderate vs minor)
- Determine if accuracy demonstrates Band 7+ (55%+ error-free, 3-7 errors) or lower

STEP 3 - INTEGRATE RANGE AND ACCURACY:
- Both must be adequate for Band 7+ (variety of complex structures + frequent error-free)
- High accuracy with limited range = Band 6 maximum
- Wide range with many errors = Band 6 maximum
- Identify which band descriptor best matches overall performance

STEP 4 - APPLY PROPORTIONAL ADJUSTMENTS:
- If one criterion is stronger, allow partial compensation
- Example: Band 8 range + Band 7 accuracy = Band 7.5 overall
- Example: Band 7 range + Band 6 accuracy = Band 6.5 overall
- Do not cascade penalties - adjust proportionally

STEP 5 - ASSIGN FINAL SCORE:
- Match to band descriptor that best represents overall performance
- Use 0.5 increments
- Justify with specific data references

OUTPUT FORMAT (JSON only):
{
  "score": 7.5,
  "reasoning": "Essay demonstrates variety of complex structures (4 types: subordinate clauses, relative clauses, conditionals, passives) with 13/20 sentences error-free (65%). Total of 5 errors present, but these are minor and don't impede communication. Performance aligns with Band 7-8 descriptors for range and accuracy.",
  "keyStrengths": [
    "Variety of complex structures used successfully (4 types identified)",
    "Frequent error-free sentences (65%) demonstrating good control"
  ],
  "keyLimitations": [
    "5 grammatical errors present (minor but noticeable)",
    "Could use more compoundComplex sentences for Band 8"
  ],
  "bandJustification": "Aligns with Band 7-8: 'uses a variety of complex structures' and 'produces frequent error-free sentences' with 'good control of grammar' but 'may make a few errors'. The variety of complex structures and high error-free ratio demonstrate Band 7.5 performance.",
  "subCriteria": {
    "mixComplexSimpleSentences": 7.5,
    "clearCorrectGrammar": 7.5
  }
}

SUB-CRITERIA SCORING GUIDANCE:

mixComplexSimpleSentences (Range and variety):
- 8.0-9.0: Wide range (5+ complex types), flexible use
- 7.0-7.5: Variety of complex structures (3-5 types), successful use
- 6.0-6.5: Mix of simple and complex (2-3 types), some complexity
- 5.0-5.5: Limited range (1-2 types), mostly simple
- 4.0-4.5: Very limited (0-1 types), predominantly simple

clearCorrectGrammar (Accuracy and control):
- 8.0-9.0: 70%+ error-free, 0-3 total errors (rare slips)
- 7.0-7.5: 55-70% error-free, 3-7 total errors (good control)
- 6.0-6.5: 40-55% error-free, 6-12 total errors (some errors)
- 5.0-5.5: 25-40% error-free, 10-18 total errors (frequent errors)
- 4.0-4.5: 10-25% error-free, 15+ total errors (errors predominate)

MAIN SCORE calculation:
- Weighted average of range (50%) and accuracy (50%)
- Both criteria must be adequate for Band 7+
- If sub-criteria are similar: Main score ≈ average
- If one is weaker: Main score closer to lower but can be partially compensated
- Example: mixComplexSimpleSentences: 7.5, clearCorrectGrammar: 7.0 → Main score: 7.0-7.5
- Example: mixComplexSimpleSentences: 6.5, clearCorrectGrammar: 7.5 → Main score: 6.5-7.0 (limited range caps score)
- Example: mixComplexSimpleSentences: 8.0, clearCorrectGrammar: 6.0 → Main score: 6.5-7.0 (many errors cap score)

CRITICAL RULES:
- Use 0.5 increments only (5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, etc.)
- Base ALL judgments on collected data provided
- Score HOLISTICALLY - consider range and accuracy together
- Interpret error-free ratios realistically:
  - 55-70% = "frequent error-free" (Band 7), NOT "poor accuracy"
  - 70%+ = "majority error-free" (Band 8), NOT "barely acceptable"
- Interpret error counts contextually:
  - 3-7 errors = "a few errors" (Band 7), acceptable
  - 1-3 errors = "very occasional" (Band 8), acceptable
  - Consider error severity, not just count
- Complex structures with minor errors still demonstrate range
- Both range AND accuracy needed for Band 7+, but one can partially compensate
- Reference specific data in reasoning (e.g., "errorFreeSentences: 13/20 (65%), totalErrorCount: 5, complexStructures: 4 types")
- Output ONLY valid JSON
- Be realistic: Band 7-8 essays have 3-7 errors - this is normal and acceptable

Remember: Grammatical Range and Accuracy assesses whether the writer can use varied structures with good control. "Good control" doesn't mean perfect - Band 7 explicitly states "may make a few errors", and Band 8 allows "very occasional errors".`;
}