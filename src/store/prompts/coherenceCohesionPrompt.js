/**
 * Step 3B: Coherence & Cohesion Scoring Prompt
 * Scores ONLY Coherence & Cohesion criterion using collected data
 * Model: Llama 8B | Tokens: ~400 | Temperature: 0.15
 */

export function generateCoherenceCohesionScoringPrompt(essay, topic, difficulty, collectedData) {
  // Defensive checks for missing data
  const wordCount = collectedData?.basicMetrics?.wordCount || 0;
  const coherenceFeatures = collectedData?.coherenceCohesionFeatures || {};
  const cohesiveDevices = coherenceFeatures.cohesiveDevices || {};

  return `You are an IELTS examiner assessing Coherence and Cohesion. Evaluate how effectively ideas are organized and connected using official IELTS Writing Task 2 band descriptors.

COLLECTED PERFORMANCE DATA:
${JSON.stringify(coherenceFeatures, null, 2)}

STRUCTURAL METRICS:
- Word count: ${wordCount}
- Paragraphs: ${coherenceFeatures.paragraphCount || 0}
- Topic sentences present: ${coherenceFeatures.topicSentencesPresent || 0}
- Cohesive devices: ${cohesiveDevices.total || 0} total, ${cohesiveDevices.variety || 'unknown'} types
- Device sophistication: ${cohesiveDevices.sophistication || 'unknown'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OFFICIAL IELTS BAND DESCRIPTORS - COHERENCE AND COHESION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Band 9
- uses cohesion in such a way that it attracts no attention
- skilfully manages paragraphing

Band 8
- sequences information and ideas logically
- manages all aspects of cohesion well
- uses paragraphing sufficiently and appropriately

Band 7
- logically organises information and ideas; there is clear progression throughout
- uses a range of cohesive devices appropriately although there may be some under-/over-use
- presents a clear central topic within each paragraph

Band 6
- arranges information and ideas coherently and there is a clear overall progression
- uses cohesive devices effectively, but cohesion within and/or between sentences may be faulty or mechanical
- may not always use referencing clearly or appropriately
- uses paragraphing, but not always logically

Band 5
- presents information with some organisation but there may be a lack of overall progression
- makes inadequate, inaccurate or over-use of cohesive devices
- may be repetitive because of lack of referencing and substitution
- may not write in paragraphs, or paragraphing may be inadequate

Band 4
- presents information and ideas but these are not arranged coherently and there is no clear progression in the response
- uses some basic cohesive devices but these may be inaccurate or repetitive
- may not write in paragraphs or their use may be confusing

Band 3
- does not organise ideas logically
- may use a very limited range of cohesive devices, and those used may not indicate a logical relationship between ideas

Band 2
- has very little control of organisational features

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASSESSMENT FRAMEWORK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. LOGICAL ORGANIZATION AND PROGRESSION (Primary Criterion - 40% weight)

This is the MOST IMPORTANT criterion - it evaluates whether ideas flow logically and build coherently.

Band 8-9: Logical sequencing with clear progression
- Ideas build naturally from introduction through body to conclusion
- Each paragraph advances the argument/discussion
- Transitions between ideas are smooth and natural
- Reader can easily follow the line of thought
- Overall structure enhances understanding

Band 7: Clear logical organization with progression throughout
- Clear introduction, body paragraphs with distinct ideas, conclusion
- Ideas connect logically within and between paragraphs
- Progression is evident, though may have minor lapses
- Structure supports the argument effectively

Band 6: Coherent arrangement with overall progression
- General organization is clear (intro, body, conclusion identifiable)
- Overall direction of argument is apparent
- Some progression present, though may be uneven
- Organization adequate but not particularly skillful

Band 5: Some organization but lacks overall progression
- Basic structure attempted but not always successful
- Progression unclear or inconsistent
- Ideas may seem disconnected or randomly ordered
- Reader may need to work to follow the argument

Band 4: No clear progression, incoherent arrangement
- Ideas presented but not organized coherently
- No clear direction or development
- Difficult to follow the line of argument
- Structure confuses rather than aids understanding

Band 3 and below: Lacks logical organization
- No discernible structure or progression
- Ideas presented randomly

CRITICAL NOTE: Missing an introduction OR conclusion does NOT automatically prevent Band 7. What matters most is whether ideas progress logically. A well-organized essay with clear progression can score Band 7 even if the conclusion is weak or the introduction is brief.

2. PARAGRAPHING (25% weight)

Band 8-9: Skillful paragraphing
- Each paragraph has ONE clear, distinct central topic
- Topic sentences effectively introduce paragraph focus
- Supporting sentences develop the topic logically
- Paragraph breaks enhance readability and clarity
- Length and unity are appropriate

Band 7: Appropriate paragraphing with clear topics
- Paragraphs used logically (typically 4-5 paragraphs for Task 2)
- Each paragraph has identifiable central topic
- Topic sentences mostly present and clear
- Paragraphs sufficiently developed
- May have minor issues (slight topic drift, uneven length)

Band 6: Paragraphing used but not always logically
- Uses paragraphs (typically 3-4 paragraphs)
- Central topics identifiable but may not always be clear
- Some paragraphs may be underdeveloped or unfocused
- Paragraph breaks may not always be optimal
- Topic sentences may be implied rather than explicit

Band 5: Paragraphing inadequate
- May write in only 2 paragraphs or use confusing breaks
- Paragraphs lack clear focus or mix multiple ideas
- Poor paragraph development
- May have very short or very long paragraphs

Band 4 and below: Absent or confusing paragraphing
- Single paragraph or random/illogical breaks
- No clear paragraph structure

PARAGRAPH GUIDELINES:
- 4-5 paragraphs (intro, 2-3 body, conclusion) = Band 7-8 typical
- 3 paragraphs (intro, 1-2 body, conclusion) = Band 6 typical
- 2 paragraphs = Band 5-6 typical (not automatically Band 5)
- 1 paragraph = Band 4-5 maximum

3. COHESIVE DEVICES - Range and Appropriacy (25% weight)

CRITICAL PRINCIPLE: APPROPRIACY matters more than quantity. Using 5-6 cohesive devices naturally and appropriately is better than using 15 devices mechanically or incorrectly.

Band 8-9: Manages cohesion skillfully
- Uses cohesive devices that "attract no attention" (feel natural)
- Appropriate variety without overuse
- Devices enhance clarity rather than being intrusive
- Includes advanced devices (furthermore, nevertheless, consequently) used naturally
- 8-12+ cohesive devices used appropriately across the essay

Band 7: Range of cohesive devices used appropriately
- Good variety of devices (5-8+ different types)
- Generally appropriate use, though may have some under-/over-use
- Mix of basic and intermediate devices
- Devices like: however, therefore, for example, in addition, as a result, in contrast
- 6-10+ cohesive devices total, used appropriately

Band 6: Cohesive devices effective but may be faulty or mechanical
- Adequate range (4-6 different types)
- May use devices mechanically (e.g., "Firstly... Secondly... Finally")
- Some inappropriate or awkward use
- May overuse certain devices (e.g., "however" appears 5+ times)
- Devices like: however, but, so, for example, also, because
- 4-8 cohesive devices total, some issues with use

Band 5: Inadequate, inaccurate, or over-use
- Limited range (2-4 different types)
- Frequent inappropriate use or overuse of same device
- May use basic devices repetitively
- Devices like: and, but, also, because, firstly, secondly
- 2-6 cohesive devices total, noticeable problems

Band 4: Basic devices, inaccurate or repetitive
- Very limited range (1-3 types)
- Often inaccurate or inappropriate
- Heavy repetition of same devices
- Only basic devices: and, but, because
- 0-4 cohesive devices total

Band 3 and below: Very limited or no cohesive devices
- Essentially no effective cohesive devices
- May not indicate logical relationships

REALISTIC DEVICE EXPECTATIONS:
- Band 7-8 essays DON'T need 15+ different device types
- 5-8 different types used naturally = sufficient for Band 7
- 8-12 different types used skillfully = Band 8
- Quality (natural, appropriate use) > Quantity (many devices used mechanically)

DEVICE SOPHISTICATION EXAMPLES:

Advanced (Band 8-9): furthermore, moreover, consequently, nevertheless, nonetheless, conversely, accordingly, hence

Intermediate (Band 7): however, therefore, in addition, as a result, for instance, in contrast, similarly, on the other hand

Basic (Band 5-6): firstly, secondly, finally, also, for example, because, so, but

Very Basic (Band 3-4): and, but, because

4. REFERENCING AND SUBSTITUTION (10% weight)

Band 7-9: Clear and appropriate referencing
- Pronouns have clear antecedents
- Demonstratives (this/that/these) used precisely
- Effective substitution avoids repetition
- Reader never confused about what pronouns refer to

Band 6: Referencing mostly clear
- Generally clear pronoun use with occasional ambiguity
- Some repetition that could be avoided through substitution
- Minor referencing issues don't impede understanding

Band 5: Referencing may be unclear
- Some unclear pronoun references
- Limited substitution leads to repetition
- Referencing issues may cause brief confusion

Band 4 and below: Unclear or no referencing
- Frequent unclear pronoun references
- Heavy repetition due to lack of substitution
- Referencing errors impede understanding

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOLISTIC SCORING PRINCIPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCORING APPROACH:
1. Start by evaluating LOGICAL PROGRESSION - this is the foundation (40% weight)
2. Assess paragraphing quality (25% weight)
3. Evaluate cohesive device range and appropriacy (25% weight)
4. Consider referencing clarity (10% weight)
5. Integrate all criteria holistically
6. Use guidelines as INDICATORS, not absolute rules

CRITICAL PRINCIPLES:
- PROGRESSION FIRST: Clear logical progression is more important than perfect structure
- HOLISTIC ASSESSMENT: Strong logical flow can compensate for minor structural issues
- NATURAL vs MECHANICAL: Natural use of fewer devices > mechanical use of many devices
- CONTEXT MATTERS: Brief introduction doesn't automatically cap score if progression is clear
- AVOID OVER-PENALIZATION: One missing element shouldn't cascade into multiple penalties

SCORING PROFILES (Use as indicators, not rigid rules):

Band 8.0-9.0 Profile:
✓ Clear logical progression throughout with natural flow
✓ 4-5 well-organized paragraphs with clear central topics
✓ 8-12+ cohesive devices used naturally and appropriately (5-8+ types)
✓ Skillful paragraphing that enhances understanding
✓ Clear referencing with no ambiguity

Band 7.0-7.5 Profile:
✓ Clear logical organization with evident progression
✓ 4-5 paragraphs with identifiable topics (or 3 well-developed paragraphs)
✓ 6-10+ cohesive devices used appropriately (5-8 types)
✓ May have minor issues (slight overuse of one device, brief intro)
✓ Generally clear referencing

Band 6.0-6.5 Profile:
✓ Coherent arrangement with overall progression
✓ 3-4 paragraphs used (may be uneven)
✓ 4-8 cohesive devices, may be somewhat mechanical (4-6 types)
✓ Some faulty cohesion or referencing but meaning clear
✓ Paragraphing present but not always logical

Band 5.0-5.5 Profile:
✓ Some organization but lacks clear overall progression
✓ 2-3 paragraphs (may be inadequate)
✓ 2-6 cohesive devices with noticeable issues (2-4 types)
✓ Inadequate or overused devices
✓ May be repetitive due to poor referencing

Band 4.0-4.5 Profile:
✓ No clear progression, ideas not arranged coherently
✓ 1-2 paragraphs or confusing paragraphing
✓ 0-4 basic cohesive devices, often inaccurate (1-3 types)
✓ Repetitive or unclear
✓ Difficult to follow

BALANCED SCORING EXAMPLES:

Example 1 - Band 7.5:
- logicalFlow: "clear"
- paragraphCount: 4
- topicSentencesPresent: 3
- cohesiveDevices: {total: 9, variety: "varied", sophistication: "intermediate", types: 6}
- referencing: {pronounErrors: 1, substitutionUsed: true}
→ Score: 7.5 (clear progression + appropriate paragraphing + good cohesive device range)

Example 2 - Band 7.0:
- logicalFlow: "clear"
- paragraphCount: 4
- topicSentencesPresent: 2
- cohesiveDevices: {total: 7, variety: "adequate", sophistication: "intermediate", types: 5}
- hasConclusion: false (brief or missing)
→ Score: 7.0 (strong progression and organization compensates for weak conclusion)

Example 3 - Band 6.5:
- logicalFlow: "mostly_clear"
- paragraphCount: 3
- topicSentencesPresent: 2
- cohesiveDevices: {total: 6, variety: "adequate", sophistication: "basic", types: 4}
- referencing: {pronounErrors: 2, substitutionUsed: false}
→ Score: 6.5 (overall progression clear, adequate cohesion despite some mechanical use)

Example 4 - Band 6.0:
- logicalFlow: "mostly_clear"
- paragraphCount: 3
- topicSentencesPresent: 1
- cohesiveDevices: {total: 5, variety: "limited", sophistication: "basic", types: 3}
- hasIntroduction: false OR hasConclusion: false
→ Score: 6.0 (progression present but structure has notable gaps)

Example 5 - Band 5.5:
- logicalFlow: "unclear"
- paragraphCount: 2
- topicSentencesPresent: 0-1
- cohesiveDevices: {total: 4, variety: "limited", sophistication: "basic", types: 2-3}
- referencing: {pronounErrors: 4+, substitutionUsed: false}
→ Score: 5.5 (some organization but progression unclear)

Example 6 - Band 5.0:
- logicalFlow: "unclear"
- paragraphCount: 2
- topicSentencesPresent: 0
- cohesiveDevices: {total: 3, variety: "limited", sophistication: "basic", types: 2}
- Both hasIntroduction: false AND hasConclusion: false
→ Score: 5.0 (organization present but inadequate)

Example 7 - Band 4.5:
- logicalFlow: "disconnected"
- paragraphCount: 1
- topicSentencesPresent: 0
- cohesiveDevices: {total: 2, variety: "very_limited", sophistication: "basic", types: 1-2}
→ Score: 4.5 (no clear progression, minimal structure)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PENALTY GUIDELINES (When to reduce scores)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MAJOR ISSUES (Reduce to Band 4.0-5.0):
- No clear progression (logicalFlow: "disconnected")
- Single paragraph or highly confusing paragraphing
- No cohesive devices or only 1-2 basic devices (and, but)
- Ideas presented randomly with no logical structure

MODERATE ISSUES (Reduce to Band 5.0-6.0):
- Unclear progression (logicalFlow: "unclear")
- Only 2 paragraphs or inadequate paragraphing
- Very limited cohesive devices (2-4 devices, 2-3 types)
- Missing both introduction AND conclusion
- Frequent referencing errors (4+ pronoun errors)

MINOR ISSUES (May reduce to Band 6.0-7.0):
- Mostly clear progression with some lapses (logicalFlow: "mostly_clear")
- 3 paragraphs (adequate but not ideal)
- Limited device variety (4-6 devices, 3-4 types) or somewhat mechanical use
- Missing introduction OR conclusion (but not both)
- Some referencing issues (2-3 pronoun errors)

NO SIGNIFICANT PENALTY (Band 7.0+):
- Clear logical progression throughout
- 4-5 paragraphs with clear topics (or 3 well-developed paragraphs)
- 6+ cohesive devices used appropriately (5+ types)
- Brief introduction or conclusion (if progression is still clear)
- Minor referencing issues (0-1 pronoun errors)

CRITICAL NOTES:
- Missing ONE element (intro or conclusion) is a MINOR issue, not a fatal flaw
- A brief introduction doesn't prevent Band 7 if progression is clear
- Mechanical use of devices (firstly, secondly, finally) can still achieve Band 6-7 if used appropriately
- Focus on whether the reader can follow the argument easily

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
[X] "STEP 1 - ASSESS LOGICAL PROGRESSION: ... {json}"
[X] "Markdown code blocks with triple backticks"

VALID RESPONSE:
[OK] {
  "score": 7.0,
  "reasoning": "...",
  ...
}

Analyze the collected data and assign a Coherence and Cohesion score following the framework below, then output ONLY the JSON object:

STEP 1 - ASSESS LOGICAL PROGRESSION (40% weight - PRIMARY CRITERION):
- Examine logicalFlow indicator
- Consider overall organization (hasIntroduction, hasConclusion, paragraphCount)
- Determine if ideas build coherently and reader can follow easily

STEP 2 - ASSESS PARAGRAPHING QUALITY (25% weight):
- Examine paragraphCount and topicSentencesPresent
- Determine if paragraphs are used logically with clear topics
- Consider paragraph development and unity

STEP 3 - ASSESS COHESIVE DEVICES (25% weight):
- Examine cohesiveDevices.total, .variety, .sophistication, and types count
- Determine if devices are used appropriately (not just counted mechanically)
- Consider whether use is natural or mechanical

STEP 4 - ASSESS REFERENCING (10% weight):
- Examine referencing.pronounErrors and substitutionUsed
- Determine if referencing is clear and appropriate

STEP 5 - HOLISTIC INTEGRATION:
- Identify which band descriptor best matches overall organization and cohesion
- Consider whether strong progression compensates for minor structural issues
- Avoid cascading penalties - don't penalize the same issue multiple times
- Apply penalties proportionally based on severity
- Assign final score with 0.5 band increments

OUTPUT FORMAT (JSON only):
{
  "score": 7.0,
  "reasoning": "Essay demonstrates clear logical progression throughout with 4 well-organized paragraphs. Uses 7 cohesive devices appropriately (5 types including 'however', 'therefore', 'for example') with natural flow. Topic sentences present in most paragraphs. Minor issue: brief conclusion. Performance aligns with Band 7 descriptors.",
  "keyStrengths": [
    "Clear logical progression from introduction through body paragraphs to conclusion",
    "Appropriate use of cohesive devices (7 total, 5 types) including intermediate devices"
  ],
  "keyLimitations": [
    "Conclusion is brief and could be more developed",
    "One paragraph lacks a clear topic sentence"
  ],
  "bandJustification": "Aligns with Band 7: 'logically organises information and ideas; there is clear progression throughout' and 'uses a range of cohesive devices appropriately'. The clear progression and appropriate paragraphing demonstrate Band 7 performance despite minor issues.",
  "subCriteria": {
    "logicalStructure": 7.0,
    "introductionConclusionPresent": 6.5,
    "supportedMainPoints": 7.0,
    "accurateLinkingWords": 7.5,
    "varietyInLinkingWords": 7.0
  }
}

SUB-CRITERIA SCORING GUIDANCE:

logicalStructure (Overall progression and organization):
- 8.0-9.0: Logical sequencing with smooth transitions, natural flow
- 7.0-7.5: Clear progression throughout with organized structure
- 6.0-6.5: Overall progression present, coherent arrangement
- 5.0-5.5: Some organization but lacks clear progression
- 4.0-4.5: No clear progression, incoherent

introductionConclusionPresent (Intro/conclusion quality):
- 8.0-9.0: Both present and well-developed, enhance essay
- 7.0-7.5: Both present and adequate (one may be brief)
- 6.0-6.5: Both present but basic, or one missing/very brief
- 5.0-5.5: One missing or both very weak
- 4.0-4.5: Both missing or severely inadequate

supportedMainPoints (Paragraph development and topic clarity):
- 8.0-9.0: All paragraphs have clear topics, well-developed
- 7.0-7.5: Most paragraphs have clear topics, sufficiently developed
- 6.0-6.5: Topics identifiable but may not always be clear
- 5.0-5.5: Topics unclear or paragraphs underdeveloped
- 4.0-4.5: No clear topics, poor or no paragraphing

accurateLinkingWords (Appropriacy of cohesive devices):
- 8.0-9.0: All devices used naturally and appropriately
- 7.0-7.5: Generally appropriate use with minor issues
- 6.0-6.5: Adequate use but may be mechanical or have some errors
- 5.0-5.5: Inadequate, inaccurate, or overused
- 4.0-4.5: Very limited or mostly inaccurate

varietyInLinkingWords (Range of cohesive devices):
- 8.0-9.0: Wide range (8+ types) used skillfully
- 7.0-7.5: Good range (5-8 types) used appropriately
- 6.0-6.5: Adequate range (4-6 types), may be somewhat limited
- 5.0-5.5: Limited range (2-4 types)
- 4.0-4.5: Very limited (1-3 types) or no variety

MAIN SCORE calculation:
- Weight progression most heavily (40%)
- If sub-criteria are similar: Main score ≈ weighted average
- If sub-criteria vary significantly: Main score reflects overall coherence and cohesion quality
- Strong progression can compensate for weaker structural elements
- Example: logicalStructure: 7.0, introductionConclusionPresent: 6.0, supportedMainPoints: 7.0, accurateLinkingWords: 7.5, varietyInLinkingWords: 6.5 → Main score: 7.0 (strong progression and appropriate cohesion outweigh brief conclusion)

CRITICAL RULES:
- Use 0.5 increments only (5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, etc.)
- Base ALL judgments on collected data provided
- Score HOLISTICALLY - strong progression can compensate for minor issues
- Prioritize LOGICAL PROGRESSION over structural perfection
- Don't cascade penalties - missing one element doesn't trigger multiple score reductions
- Missing intro OR conclusion is a MINOR issue if progression is clear (reduce by 0.5, not 1.5+)
- Mechanical devices (firstly, secondly) used appropriately can still achieve Band 6-7
- Natural use of 5-6 devices > mechanical use of 10+ devices
- Reference specific data in reasoning (e.g., "logicalFlow: clear, paragraphCount: 4, cohesiveDevices: 7 total with 5 types")
- Output ONLY valid JSON
- Be realistic: Band 7 essays can have a brief introduction or conclusion and still score Band 7

Remember: Coherence and Cohesion assesses whether the reader can easily follow the argument. Clear progression and natural organization matter more than perfect structure with all elements present.`;
}