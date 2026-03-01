/**
 * Step 3A: Task Response Scoring Prompt
 * Scores ONLY Task Response criterion using collected data
 * Model: Llama 8B | Tokens: ~400 | Temperature: 0.15
 */

import { LEVEL_CONFIGS } from './config.js';

export function generateTaskResponseScoringPrompt(essay, topic, difficulty, collectedData) {
  const config = LEVEL_CONFIGS[difficulty.toLowerCase()] || LEVEL_CONFIGS['b2'];
  
  // Defensive checks for missing data
  const wordCount = collectedData?.basicMetrics?.wordCount || 0;
  const taskResponseFeatures = collectedData?.taskResponseFeatures || {};
  const isUnderMinimum = wordCount < config.minWords;
  const shortfall = isUnderMinimum ? config.minWords - wordCount : 0;

  return `You are an IELTS examiner assessing Task Response. Evaluate how fully and appropriately the essay addresses the task requirements using official IELTS Writing Task 2 band descriptors.

TASK INFORMATION:
Essay Topic: "${topic}"
Minimum Required: ${config.minWords} words
Actual Word Count: ${wordCount}
${isUnderMinimum
      ? `⚠ UNDER MINIMUM by ${shortfall} words - penalty applies`
      : '✓ Word count requirement met'}

COLLECTED PERFORMANCE DATA:
${JSON.stringify(taskResponseFeatures, null, 2)}

KEY METRICS SUMMARY:
- Prompt addressed: ${taskResponseFeatures.promptAddressed || 'unknown'}
- Position stated: ${taskResponseFeatures.positionStated || false}
- Position consistent: ${taskResponseFeatures.positionConsistent || 'unknown'}
- Main ideas: ${taskResponseFeatures.mainIdeasCount || 0}
- Development level: ${taskResponseFeatures.developmentLevel || 'unknown'}
- Examples provided: ${taskResponseFeatures.examplesProvided || false}
- Example types: ${JSON.stringify(taskResponseFeatures.exampleTypes || [])}
- Relevance: ${taskResponseFeatures.relevanceToTopic || 'unknown'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OFFICIAL IELTS BAND DESCRIPTORS - TASK RESPONSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Band 9
- fully addresses all parts of the task
- presents a fully developed position in answer to the question with relevant, fully extended and well supported ideas

Band 8
- sufficiently addresses all parts of the task
- presents a well-developed response to the question with relevant, extended and supported ideas

Band 7
- addresses all parts of the task
- presents a clear position throughout the response
- presents, extends and supports main ideas, but there may be a tendency to over-generalise and/or supporting ideas may lack focus

Band 6
- addresses all parts of the task although some parts may be more fully covered than others
- presents a relevant position although the conclusions may become unclear or repetitive
- presents relevant main ideas but some may be inadequately developed/unclear

Band 5
- addresses the task only partially; the format may be inappropriate in places
- expresses a position but the development is not always clear and there may be no conclusions drawn
- presents some main ideas but these are limited and not sufficiently developed; there may be irrelevant detail

Band 4
- responds to the task only in a minimal way or the answer is tangential; the format may be inappropriate
- presents a position but this is unclear
- presents some main ideas but these are difficult to identify and may be repetitive, irrelevant or not well supported

Band 3
- does not adequately address any part of the task
- does not express a clear position
- presents few ideas, which are largely undeveloped or irrelevant

Band 2
- barely responds to the task
- does not express a position
- may attempt to present one or two ideas but there is no development

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASSESSMENT FRAMEWORK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. TASK FULFILLMENT - Addressing All Parts (Primary Criterion - 35% weight)

Understanding the Task Type:
- Opinion essays: Must address the question and present clear position
- Discussion essays: Must discuss BOTH views AND give own opinion
- Problem-Solution essays: Must identify problems AND propose solutions
- Advantage-Disadvantage essays: Must discuss BOTH sides AND reach conclusion

Band 8-9: Fully addresses all parts
- Every aspect of the task covered thoroughly
- No part neglected or underdeveloped
- Fully developed response to the question

Band 7: Addresses all parts
- All parts of the task addressed
- May have slight imbalance (one part slightly stronger than another)
- Clear response to all aspects

Band 6: Addresses all parts although some parts may be more fully covered
- All parts attempted but coverage uneven
- One part may be significantly stronger/weaker
- Overall task addressed but not equally

Band 5: Addresses the task only partially
- Major parts missing or barely addressed
- Focus may be off-balance
- Some requirements not met

Band 4 and below: Minimal response or tangential
- Barely responds to the task
- May be off-topic
- Major parts missing

Interpreting "promptAddressed" Data:
- "fully" → All parts covered thoroughly → Band 8-9 range
- "sufficiently" → All parts covered adequately → Band 7-8 range
- "adequately" → All parts present but uneven → Band 6-7 range
- "partially" → Some parts missing/weak → Band 5-6 range
- "minimally" → Major parts barely addressed → Band 4-5 range
- "not_addressed" → Off-topic or irrelevant → Band 3-4 range

2. POSITION CLARITY AND CONSISTENCY (20% weight)

Band 7-9: Clear position throughout
- Position clearly stated (usually in introduction)
- Position maintained consistently
- Conclusion reinforces position
- All arguments support the stated position

Band 6: Relevant position although conclusions may become unclear
- Position stated but may be somewhat indirect
- Generally consistent but may have minor shifts
- Conclusion may be slightly unclear or repetitive
- Arguments mostly support position

Band 5: Position expressed but development not always clear
- Position present but may be unclear
- May waver or lack consistency
- May have no clear conclusion
- Arguments may not always support position

Band 4 and below: Position unclear
- No clear position or very unclear
- Contradictory statements
- No stance maintained

Interpreting Position Data:
- positionStated: true + positionConsistent: true → Band 7+ range
- positionStated: true + positionConsistent: "mostly" → Band 6-7 range
- positionStated: true + positionConsistent: false → Band 5-6 range
- positionStated: false → Band 5 range

CRITICAL NOTE: Minor position inconsistencies don't automatically cap scores. Band 6 explicitly allows for conclusions that "may become unclear or repetitive" while still maintaining a relevant position.

3. IDEA DEVELOPMENT - Extension and Support (30% weight)

This is the heart of Task Response - how well ideas are developed and explained.

Band 8-9: Fully extended and well supported
- Ideas developed in depth with multiple layers of explanation
- Clear reasoning with elaboration
- Well-supported with evidence/examples
- Reader fully understands all points
- 4-6 sentences per main idea typical

Band 7: Extends and supports main ideas
- Ideas clearly explained and developed
- Good level of detail and explanation
- Supported with reasoning and examples
- May have tendency to over-generalize or lack focus
- 3-5 sentences per main idea typical

Band 6: Relevant ideas but some inadequately developed
- Ideas present and relevant
- Basic explanation provided
- Some ideas underdeveloped or unclear
- Support present but may be limited
- 2-3 sentences per main idea typical

Band 5: Some main ideas but limited and not sufficiently developed
- Ideas stated but minimally explained
- Limited development
- May have irrelevant detail
- Support weak or missing
- 1-2 sentences per main idea typical

Band 4: Ideas difficult to identify, repetitive, or not well supported
- Ideas barely developed
- Repetitive or unclear
- Little to no support

Interpreting Development Data:
- "fully_extended" → Band 8-9 range
- "extended" → Band 7-8 range
- "adequate" → Band 6-7 range
- "basic" → Band 5-6 range
- "limited" → Band 4-5 range
- "minimal" → Band 3-4 range

Main Ideas Count Context:
- 2-3 deeply developed ideas = excellent (Band 7-9)
- 3-4 adequately developed ideas = good (Band 6-7)
- 4-5 basically developed ideas = adequate (Band 5-6)
- Quality of development matters MORE than quantity

4. EXAMPLES AND SUPPORT (15% weight)

Examples support ideas but aren't the only form of support. Reasoning, explanation, and elaboration also count as "support."

Band 7-9: Well supported ideas
- Ideas supported with reasoning, explanation, and/or examples
- Support is relevant and enhances understanding
- May include: specific examples, detailed scenarios, reasoning chains, elaboration

ACCEPTABLE Band 7 Support Types:
- Detailed reasoning and explanation (no example needed)
- General but relevant examples ("many companies", "students often")
- Personal observations with detail
- Hypothetical scenarios that are well-developed
- Specific examples (studies, statistics, named cases) - these enhance but aren't required

Band 6: Relevant ideas with some support
- Ideas supported but may be limited
- Examples may be general or somewhat vague
- Support adequate but not extensive
- "For example, people who..." type support

Band 5: Limited support
- Minimal examples or support
- May be very general or vague
- Support doesn't significantly enhance ideas

Band 4 and below: Little or no support
- No real examples or support
- Extremely vague or irrelevant

CRITICAL PRINCIPLE: Band 7 does NOT require "specific studies" or "statistics." The descriptor says "extends and supports" - this can be through detailed reasoning, general examples, or specific examples. What matters is that ideas are well-explained and supported, not the format of support.

Interpreting Example Data:
- "specific" OR "statistical" examples → Enhance score but not required for Band 7
- "general" OR "hypothetical" examples + good explanation → Can achieve Band 7
- "personal" examples with detail → Can support Band 6-7
- No examples BUT strong reasoning/explanation → Can still achieve Band 7
- No examples AND weak explanation → Band 6 maximum

5. WORD COUNT REQUIREMENTS (Automatic Penalty - applies before other criteria)

Official IELTS Word Count Penalties:

For essays requiring ${config.minWords}+ words:

✓ AT OR ABOVE ${config.minWords} words: No penalty

⚠ SLIGHTLY UNDER (${Math.max(config.minWords - 20, 0)}-${config.minWords - 1} words):
Reduce by 0.5 bands (e.g., Band 7.0 → 6.5)

⚠ MODERATELY UNDER (${Math.max(config.minWords - 50, 0)}-${Math.max(config.minWords - 21, 0)} words):
Maximum Band 6.0 (cannot exceed 6.0)

⚠ SIGNIFICANTLY UNDER (${Math.max(config.minWords - 100, 0)}-${Math.max(config.minWords - 51, 0)} words):
Maximum Band 5.0

⚠ SEVERELY UNDER (below ${Math.max(config.minWords - 100, 0)} words):
Maximum Band 4.0

Word count penalties are ABSOLUTE - apply first, then assess content within the allowed range.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOLISTIC SCORING PRINCIPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCORING APPROACH:
1. Apply word count penalty FIRST (if applicable) - this sets the ceiling
2. Assess task fulfillment (35% weight) - are all parts addressed?
3. Assess idea development (30% weight) - are ideas extended and supported?
4. Assess position clarity (20% weight) - is position clear and consistent?
5. Assess support quality (15% weight) - are ideas well-supported?
6. Integrate holistically - strong areas can partially compensate for weaker ones

CRITICAL PRINCIPLES:
- TASK FULFILLMENT is primary - if task not addressed, score is low regardless of quality
- DEVELOPMENT matters most - well-developed ideas with general examples > underdeveloped ideas with specific examples
- SUPPORT is flexible - reasoning, explanation, and elaboration count as support, not just examples
- POSITION consistency is important but minor shifts don't prevent Band 7
- Strong performance in one area can partially compensate for weaker performance in another

SCORING PROFILES (Use as indicators, not rigid rules):

Band 8.0-9.0 Profile:
✓ Fully addresses all parts of the task
✓ Clear, consistent position throughout
✓ Fully extended, well-developed ideas (4-6 sentences per idea)
✓ Well-supported with reasoning/examples/explanation
✓ Relevant and focused throughout

Band 7.0-7.5 Profile:
✓ Addresses all parts of the task
✓ Clear position throughout (minor lapses acceptable)
✓ Extended and supported ideas (3-5 sentences per idea)
✓ May have tendency to over-generalize (Band 7 descriptor allows this)
✓ Supporting ideas may lack some focus (Band 7 descriptor allows this)
✓ General examples with good explanation acceptable

Band 6.0-6.5 Profile:
✓ Addresses all parts although some more fully than others
✓ Relevant position although may become unclear or repetitive
✓ Relevant main ideas but some inadequately developed (2-3 sentences per idea)
✓ Ideas supported but support may be limited
✓ Generally relevant with some unevenness

Band 5.0-5.5 Profile:
✓ Addresses task only partially
✓ Position expressed but development not always clear
✓ Some main ideas but limited and not sufficiently developed
✓ May include irrelevant detail
✓ Minimal support

Band 4.0-4.5 Profile:
✓ Responds minimally or tangentially
✓ Position unclear
✓ Ideas difficult to identify, repetitive, or not well supported
✓ May be largely irrelevant

BALANCED SCORING EXAMPLES:

Example 1 - Band 7.5:
- promptAddressed: "fully"
- positionStated: true, positionConsistent: true
- mainIdeasCount: 3, developmentLevel: "extended"
- examplesProvided: true, exampleTypes: ["general", "hypothetical"]
- relevanceToTopic: "highly_relevant"
→ Score: 7.5 (addresses all parts + clear position + extended ideas + adequate support)

Example 2 - Band 7.0:
- promptAddressed: "adequately" (all parts but slightly uneven)
- positionStated: true, positionConsistent: true
- mainIdeasCount: 2, developmentLevel: "extended"
- examplesProvided: true, exampleTypes: ["general"]
- Note: Some over-generalization present
→ Score: 7.0 (addresses task + clear position + extended ideas despite general examples)

Example 3 - Band 6.5:
- promptAddressed: "adequately" (some parts less fully covered)
- positionStated: true, positionConsistent: "mostly"
- mainIdeasCount: 3, developmentLevel: "adequate"
- examplesProvided: true, exampleTypes: ["general"]
- relevanceToTopic: "relevant"
→ Score: 6.5 (addresses parts unevenly + relevant position + adequate development)

Example 4 - Band 6.0:
- promptAddressed: "adequately" (uneven coverage)
- positionStated: true, positionConsistent: "mostly"
- mainIdeasCount: 2, developmentLevel: "basic"
- examplesProvided: false
- relevanceToTopic: "relevant"
→ Score: 6.0 (addresses task + relevant position + basic development + no examples)

Example 5 - Band 5.5:
- promptAddressed: "partially" (some parts missing)
- positionStated: true, positionConsistent: false
- mainIdeasCount: 2, developmentLevel: "basic"
- examplesProvided: true, exampleTypes: ["general"]
→ Score: 5.5 (partial task address + inconsistent position + limited development)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PENALTY GUIDELINES (When to reduce scores)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MAJOR ISSUES (Reduce to Band 4.0-5.5):
- Task only partially addressed (major parts missing)
- Position absent or very unclear
- Ideas minimally developed or difficult to identify
- Largely irrelevant or off-topic
- Severely under word count (100+ words short)

MODERATE ISSUES (Reduce to Band 5.5-6.5):
- Task addressed but coverage uneven (one part significantly weaker)
- Position present but inconsistent
- Ideas limited and not sufficiently developed
- Some irrelevant detail present
- Moderately under word count (50-100 words short)

MINOR ISSUES (May reduce to Band 6.5-7.5):
- All parts addressed but some more fully than others
- Position may become slightly unclear in conclusion
- Some ideas inadequately developed
- Tendency to over-generalize (Band 7 explicitly allows this)
- Slightly under word count (1-20 words short) → reduce by 0.5

NO SIGNIFICANT PENALTY (Band 7.0+):
- Addresses all parts of the task
- Clear position throughout (minor lapses acceptable per Band 7 descriptor)
- Ideas extended and supported
- May over-generalize or lack some focus (Band 7 allows this)
- Word count met

CRITICAL NOTES:
- Band 7 explicitly states ideas "may" have tendency to over-generalize - this doesn't prevent Band 7
- Band 7 states supporting ideas "may lack focus" - this doesn't prevent Band 7
- Band 6 explicitly allows position to "become unclear or repetitive" - minor position shifts are Band 6, not Band 5
- General examples with good explanation can support Band 7 - specific examples enhance but aren't required

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
[X] "STEP 1 - CHECK WORD COUNT FIRST: The essay... {json}"
[X] "Markdown code blocks with triple backticks"

VALID RESPONSE:
[OK] {
  "score": 7.0,
  "reasoning": "...",
  ...
}

Analyze the collected data and assign a Task Response score following the framework below, then output ONLY the JSON object:

STEP 1 - CHECK WORD COUNT FIRST:
- If under minimum, apply automatic penalty cap
- This sets the absolute ceiling before content assessment

STEP 2 - ASSESS TASK FULFILLMENT (35% weight):
- Examine promptAddressed indicator
- Determine if all parts of the task are addressed
- This is the foundation - weak fulfillment caps the score

STEP 3 - ASSESS IDEA DEVELOPMENT (30% weight):
- Examine developmentLevel and mainIdeasCount
- Determine if ideas are extended and well-explained
- This is the core of Task Response

STEP 4 - ASSESS POSITION CLARITY (20% weight):
- Examine positionStated and positionConsistent
- Determine if position is clear and maintained
- Minor inconsistencies acceptable for Band 6-7

STEP 5 - ASSESS SUPPORT QUALITY (15% weight):
- Examine examplesProvided and exampleTypes
- Consider: reasoning, explanation, and elaboration also count as support
- General examples with good explanation can support Band 7

STEP 6 - INTEGRATE HOLISTICALLY:
- Identify which band descriptor best matches overall performance
- Strong areas can partially compensate for weaker ones
- Assign final score with 0.5 increments

OUTPUT FORMAT (JSON only):
{
  "score": 7.0,
  "reasoning": "Essay addresses all parts of the task with a clear position maintained throughout. Ideas are extended with 3-4 sentences per main point and supported with general examples and reasoning. Development shows some tendency to over-generalize (which Band 7 explicitly allows). Word count requirement met.",
  "keyStrengths": [
    "Addresses all parts of the task comprehensively",
    "Clear position maintained throughout the response",
    "Ideas extended and explained with adequate detail"
  ],
  "keyLimitations": [
    "Some tendency to over-generalize (Band 7 allows this)",
    "Examples are general rather than specific (but adequate for Band 7)",
    "One idea could be developed slightly more"
  ],
  "bandJustification": "Aligns with Band 7: 'addresses all parts of the task', 'presents a clear position throughout', 'presents, extends and supports main ideas, but there may be a tendency to over-generalise'. The task fulfillment, position clarity, and idea development demonstrate solid Band 7 performance.",
  "subCriteria": {
    "completeResponse": 7.0,
    "clearComprehensiveIdeas": 7.0,
    "relevantSpecificExamples": 6.5,
    "appropriateWordCount": 9.0
  }
}

SUB-CRITERIA SCORING GUIDANCE:

completeResponse (Task fulfillment and position):
- 8.0-9.0: Fully addresses all parts + clear consistent position
- 7.0-7.5: Addresses all parts + clear position (minor lapses ok)
- 6.0-6.5: Addresses all parts unevenly + relevant position
- 5.0-5.5: Partially addresses task + position unclear
- 4.0-4.5: Minimal response + position unclear

clearComprehensiveIdeas (Idea development):
- 8.0-9.0: Fully extended ideas (4-6 sentences per idea)
- 7.0-7.5: Extended ideas (3-5 sentences per idea)
- 6.0-6.5: Adequate development (2-3 sentences per idea)
- 5.0-5.5: Basic/limited development (1-2 sentences)
- 4.0-4.5: Minimal development

relevantSpecificExamples (Support quality):
- 8.0-9.0: Specific examples + detailed reasoning
- 7.0-7.5: Good support (general examples + explanation OR specific examples)
- 6.0-6.5: Adequate support (general examples OR reasoning)
- 5.0-5.5: Limited support (vague or minimal)
- 4.0-4.5: Little or no support

appropriateWordCount (Word count):
- 9.0: Significantly above minimum (300+ words)
- 8.0: Comfortably above minimum (280+ words)
- 7.0: Meets or slightly exceeds minimum (250-280 words)
- 6.0: Slightly under minimum (230-249 words) → penalty applied
- 5.0: Moderately under (200-229 words) → penalty applied
- 4.0: Significantly under (<200 words) → penalty applied

MAIN SCORE calculation:
- Apply word count penalty FIRST (if applicable)
- Weight: Task Fulfillment 35%, Development 30%, Position 20%, Support 15%
- If sub-criteria are similar: Main score ≈ weighted average
- If one criterion is weak: Main score impacted but strong areas can partially compensate
- Example: completeResponse: 7.0, clearComprehensiveIdeas: 7.5, relevantSpecificExamples: 6.5, appropriateWordCount: 9.0 → Main score: 7.0-7.5

CRITICAL RULES:
- Use 0.5 increments only (5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, etc.)
- Base ALL judgments on collected data provided
- Apply word count penalty FIRST if applicable
- Score HOLISTICALLY - task fulfillment and development are primary
- Don't over-penalize for general examples - Band 7 doesn't require specific examples
- Band 7 explicitly allows "tendency to over-generalize" - this doesn't prevent Band 7
- Band 6 allows position to "become unclear or repetitive" - minor inconsistency is Band 6, not Band 5
- Strong reasoning/explanation counts as support even without examples
- Reference specific data in reasoning (e.g., "promptAddressed: adequately, developmentLevel: extended, examplesProvided: true")
- Output ONLY valid JSON
- Be realistic: Band 7 essays can use general examples with good explanation

Remember: Task Response assesses how fully and appropriately the writer addresses the task. Development quality and task fulfillment matter most - support format (specific vs general examples) is less important than whether ideas are well-explained.`;
}