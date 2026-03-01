/**
 * Step 2: Enhanced Data Collection Prompt
 * Extracts objective, measurable features from student essays
 * Model: Llama 8B | Tokens: ~1500 | Temperature: 0.1
 */

export function generateEnhancedDataCollectionPrompt(essay, topic, difficulty) {
  const wordCount = essay.trim().split(/\s+/).length;
  const sentenceCount = (essay.match(/[.!?]+/g) || []).length;

  return `You are an objective writing analysis system. Your job is to extract measurable features from a student essay WITHOUT scoring it.

STUDENT LEVEL: ${difficulty.toUpperCase()}
ESSAY TOPIC: "${topic}"
WORD COUNT: ${wordCount}
SENTENCE COUNT: ${sentenceCount}

ESSAY TEXT:
"""
${essay}
"""

══════════════════════════════════════════════════════════════
ANALYSIS INSTRUCTIONS
══════════════════════════════════════════════════════════════

Extract ONLY observable, measurable features. Do NOT make value judgments or assign scores.

CRITICAL: Accuracy is essential. Each feature you extract will directly determine scoring. Be precise, thorough, and realistic.

IMPORTANT PRINCIPLES:
- Count accurately - verify all numerical values
- Be objective - describe what you observe, not what you think it means
- Be realistic - don't over-categorize negatively (e.g., don't call adequate vocabulary "limited")
- When in doubt, be fair - use the more generous category if borderline

══════════════════════════════════════════════════════════════
SPECIFIC EXTRACTION GUIDELINES
══════════════════════════════════════════════════════════════

1. TASK RESPONSE FEATURES:

promptAddressed:
- "fully" = All parts of the task thoroughly addressed
- "sufficiently" = All parts addressed, some slightly more developed than others
- "adequately" = All parts present but coverage uneven
- "partially" = Some major parts missing or barely addressed
- "minimally" = Major parts mostly missing
- "not_addressed" = Off-topic or irrelevant

IMPORTANT: If the essay attempts all parts but one is weaker, use "adequately" or "sufficiently", NOT "partially"

positionStated:
- true = Writer's opinion/position is clearly stated (usually in introduction)
- false = No clear position stated

positionConsistent:
- true = Position maintained throughout with no contradictions
- "mostly" = Generally consistent with minor shifts
- false = Position changes or contradicts itself
- "no_position" = No position was stated

developmentLevel:
Count sentences devoted to explaining each main idea:
- "fully_extended" = 5-6+ sentences per idea with depth and elaboration
- "extended" = 3-5 sentences per idea with clear explanation
- "adequate" = 2-3 sentences per idea with basic explanation
- "basic" = 1-2 sentences per idea with minimal explanation
- "limited" = Ideas merely stated without explanation
- "minimal" = Ideas barely identifiable

IMPORTANT: Count ALL sentences that relate to an idea, including examples and elaboration

examplesProvided:
- true = Essay contains concrete examples, scenarios, or support
- false = No examples provided (only abstract reasoning)

NOTE: Examples include personal experiences, general scenarios, hypothetical situations, specific cases, and statistical data. Don't only count "specific studies" as examples.

exampleTypes (select ALL that apply):
- "personal" = Writer's own experience
- "general" = General scenarios (e.g., "many people", "students often")
- "specific" = Named entities, studies, or specific cases
- "statistical" = Numbers, percentages, data
- "hypothetical" = Imagined scenarios that illustrate a point

IMPORTANT: General examples are valid and common in Band 7 essays. Don't undervalue them.

2. COHERENCE & COHESION FEATURES:

hasIntroduction / hasConclusion:
- true = Present and identifiable (even if brief)
- false = Missing or unclear

topicSentencesPresent:
Count sentences that clearly introduce the main point of a paragraph. A topic sentence:
- States the paragraph's main idea
- Usually appears at the beginning of the paragraph
- Helps reader understand what the paragraph will discuss

cohesiveDevices:
Count ALL linking words and phrases that connect ideas:
- Basic: and, but, so, because, also, for example
- Intermediate: however, therefore, furthermore, in addition, as a result, for instance, in contrast, on the other hand
- Advanced: moreover, consequently, nevertheless, nonetheless, conversely, accordingly, hence

total: Count ALL instances
types: List unique devices used (up to 10 most common)

variety:
- "varied" = 5+ different device types used appropriately
- "adequate" = 4-5 different types
- "repetitive" = 2-3 types with heavy repetition of one device
- "limited" = 1-2 types only
- "none" = No cohesive devices or only "and"/"but"

sophistication:
- "advanced" = Uses advanced devices (moreover, nevertheless, consequently)
- "intermediate" = Uses intermediate devices (however, therefore, furthermore)
- "basic" = Uses only basic devices (and, but, because, so)

IMPORTANT: Don't require 10+ device types. Band 7 essays typically use 5-8 different types.

logicalFlow:
- "clear" = Ideas progress smoothly and logically throughout
- "mostly_clear" = Generally logical with minor lapses
- "unclear" = Progression is confusing or jumps around
- "disconnected" = No clear connection between ideas

3. LEXICAL RESOURCE FEATURES:

uniqueWords: Count distinct words (case-insensitive)
typeTokenRatio: Calculate accurately as uniqueWords / totalWords

CRITICAL: TTR decreases naturally with essay length. A 300-word essay with TTR 0.45 may show similar vocabulary range to a 250-word essay with TTR 0.50.

lesserUsedWords:
Include words that are:
- Academic vocabulary: facilitate, substantial, mitigate, comprehensive, enhance, evident
- Sophisticated terms: unprecedented, proliferation, ubiquitous, intrinsic, prevalent
- Topic-specific advanced terms (depends on topic)

DO NOT include as "lesser used":
- Common words: important, good, bad, very, many, people, think, believe
- Basic academic words: example, reason, because, problem, solution

lesserUsedWordCount: Count accurately. Band 7 essays typically have 8-12 such words, Band 8 has 12+.

keywordRepetition:
- "excessive" = Same word repeated 8+ times when variety expected
- "noticeable" = Same word 5-7 times when variety would improve quality
- "acceptable" = Same word 3-4 times (normal repetition)
- "varied" = Good variety, minimal repetition of content words

IMPORTANT: Don't count function words (the, a, is, etc.) in repetition. Focus on content words (nouns, verbs, adjectives).

paraphrasing:
keyTermsParaphrased: true if the essay uses synonyms or different expressions for key terms from the topic

paraphraseCount: Count how many times key concepts are expressed differently
- Example: "children" → "young people", "youngsters", "youth"
- Example: "technology" → "digital devices", "modern tools", "innovations"

spellingErrors:
Count ALL spelling mistakes, including:
- Typos (teh → the)
- Misspellings (recieve → receive)
- Word formation errors (beautifull → beautiful)

DO NOT count:
- British vs American spelling differences (colour/color)
- Proper nouns spelled consistently
- Acceptable alternative spellings

4. GRAMMATICAL FEATURES:

sentenceTypes:
Classify each sentence:
- "simple" = One independent clause (e.g., "I like cats.")
- "compound" = Two+ independent clauses joined by and/but/or/so (e.g., "I like cats, but my brother likes dogs.")
- "complex" = One independent + one+ subordinate clause (e.g., "Although I like cats, my brother likes dogs.")
- "compoundComplex" = Multiple independent + subordinate clauses (e.g., "I like cats because they are quiet, but my brother likes dogs.")

complexStructures:
Count accurately:
- subordinateClauses: Count clauses with subordinating conjunctions (although, because, while, since, as, if, unless, whereas, despite, when)
- relativeClausesUsed: true if uses who/which/that/where/whose to modify nouns
- participialPhrasesUsed: true if uses -ing or -ed phrases (e.g., "Walking home, I saw...", "Driven by curiosity...")
- conditionalsUsed: true if uses if/when/unless + will/would constructions
- passiveVoiceUsed: true if uses is/was/has been + past participle

errorFreeSentences:
Count sentences with NO grammatical, punctuation, or spelling errors. Be accurate but fair:
- Minor typos count as errors
- Missing comma may or may not count depending on whether it affects clarity
- If sentence is clearly understandable despite minor issues, consider carefully

IMPORTANT: Be realistic. Count accurately but don't be overly harsh. A sentence with one minor article error is still largely correct but counts as having an error.

totalErrorCount:
Count ALL grammatical errors:
- Subject-verb agreement (he go → he goes)
- Tense errors (I go yesterday → I went yesterday)
- Article errors (missing a/an/the or incorrect usage)
- Preposition errors (depend of → depend on)
- Word order errors
- Plural errors (two cat → two cats)
- Other errors

errorSeverity:
- "minor" = Doesn't affect meaning (missing article, small typo)
- "moderate" = Slightly affects clarity (wrong tense, subject-verb agreement)
- "severe" = Meaning obscured or confused (major structural problem)

IMPORTANT: Most errors in Band 6-7 essays are "minor" or "moderate", not "severe"

grammarSophistication:
- "advanced" = 5+ complex structure types used successfully
- "intermediate" = 3-4 complex structure types
- "basic" = 1-2 complex structure types
- "limited" = 0-1 or only simple structures

══════════════════════════════════════════════════════════════
OUTPUT FORMAT
══════════════════════════════════════════════════════════════

Return a JSON object with this EXACT structure:

{
  "basicMetrics": {
    "wordCount": ${wordCount},
    "sentenceCount": ${sentenceCount},
    "paragraphCount": <count>,
    "avgSentenceLength": <number>,
    "longestSentence": <word count>,
    "shortestSentence": <word count>
  },
  
  "taskResponseFeatures": {
    "promptAddressed": "fully" | "sufficiently" | "adequately" | "partially" | "minimally" | "not_addressed",
    "positionStated": true | false,
    "positionConsistent": true | "mostly" | false | "no_position",
    "mainIdeasCount": <number of distinct main ideas>,
    "mainIdeas": ["idea 1", "idea 2", "idea 3"],
    "examplesProvided": true | false,
    "exampleTypes": ["personal" | "general" | "specific" | "statistical" | "hypothetical"],
    "exampleDetails": ["brief summary of example 1", "brief summary of example 2"],
    "developmentLevel": "fully_extended" | "extended" | "adequate" | "basic" | "limited" | "minimal",
    "relevanceToTopic": "highly_relevant" | "relevant" | "partially_relevant" | "off_topic"
  },
  
  "coherenceCohesionFeatures": {
    "hasIntroduction": true | false,
    "hasBodyParagraphs": true | false,
    "hasConclusion": true | false,
    "paragraphCount": <number>,
    "topicSentencesPresent": <count>,
    "cohesiveDevices": {
      "total": <count of all instances>,
      "types": ["however", "therefore", "for example", "furthermore", ...],
      "variety": "varied" | "adequate" | "repetitive" | "limited" | "none",
      "sophistication": "advanced" | "intermediate" | "basic"
    },
    "referencing": {
      "pronounsUsed": true | false,
      "pronounErrors": <count>,
      "substitutionUsed": true | false
    },
    "logicalFlow": "clear" | "mostly_clear" | "unclear" | "disconnected"
  },
  
  "lexicalFeatures": {
    "uniqueWords": <count>,
    "typeTokenRatio": <ratio between 0 and 1>,
    "lesserUsedWords": ["sophisticated word 1", "sophisticated word 2", ...],
    "lesserUsedWordCount": <count>,
    "topicSpecificVocab": ["relevant term 1", "relevant term 2", ...],
    "topicVocabCount": <count>,
    "keywordRepetition": {
      "mostRepeated": ["word1: X times", "word2: Y times", "word3: Z times"],
      "repetitionLevel": "excessive" | "noticeable" | "acceptable" | "varied"
    },
    "paraphrasing": {
      "keyTermsParaphrased": true | false,
      "synonymsUsed": ["original → synonym", "original2 → synonym2"],
      "paraphraseCount": <number>
    },
    "collocationAccuracy": "mostly_accurate" | "some_errors" | "frequent_errors",
    "spellingErrors": <count>,
    "spellingErrorExamples": ["error1", "error2", "error3"]
  },
  
  "grammaticalFeatures": {
    "sentenceTypes": {
      "simple": <count>,
      "compound": <count>,
      "complex": <count>,
      "compoundComplex": <count>
    },
    "complexStructures": {
      "subordinateClauses": <count>,
      "relativeClausesUsed": true | false,
      "participialPhrasesUsed": true | false,
      "conditionalsUsed": true | false,
      "passiveVoiceUsed": true | false
    },
    "tensesUsed": ["present_simple", "past_simple", "present_perfect", "future", ...],
    "tenseConsistency": true | false,
    "errorFreeSentences": <count - be accurate but fair>,
    "totalErrorCount": <count all errors accurately>,
    "errorsByType": {
      "subject_verb": <count>,
      "tense": <count>,
      "article": <count>,
      "preposition": <count>,
      "word_order": <count>,
      "plural": <count>,
      "other": <count>
    },
    "errorSeverity": {
      "minor": <count>,
      "moderate": <count>,
      "severe": <count>
    },
    "grammarSophistication": "advanced" | "intermediate" | "basic" | "limited"
  },
  
  "levelIndicators": {
    "meetsMinimumLength": true | false,
    "minimumLengthForLevel": <expected minimum for ${difficulty}>,
    "lengthDeviation": <percentage above/below minimum>,
    "contentRepetition": "none" | "minimal" | "noticeable" | "excessive",
    "fillerContent": true | false,
    "cefrFeatures": ["observable feature 1", "observable feature 2"]
  }
}

══════════════════════════════════════════════════════════════
CRITICAL RULES
══════════════════════════════════════════════════════════════

1. Be completely objective - describe what you observe, not what you judge
2. Count accurately - verify all numerical values before finalizing
3. Use exact categories provided - do not invent new ones
4. When borderline between categories, use the MORE GENEROUS category
5. List actual examples (words, phrases) where requested
6. For arrays, provide UP TO 5 examples maximum (most representative)
7. Remember: Your data will directly determine scores, so be fair and accurate
8. Don't conflate quantity with quality (e.g., 5 general examples may be better than 2 specific examples)
9. Context matters: A 300-word essay with TTR 0.45 shows similar range to 250-word essay with TTR 0.50
10. Band 7 essays typically have:
    - 55-70% error-free sentences (not 80%+)
    - 3-7 grammatical errors (not 0-2)
    - 8-12 less common words (not 15+)
    - 5-8 cohesive device types (not 10+)

══════════════════════════════════════════════════════════════

Output ONLY the JSON object. No other text.`;
}