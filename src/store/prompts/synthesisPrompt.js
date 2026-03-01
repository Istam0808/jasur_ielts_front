/**
 * Step 5: Synthesis & Feedback Generation Prompt
 * Generates high-quality feedback combining all criterion scores
 * Model: Llama 70B | Tokens: ~1200 | Temperature: 0.2
 */

export function generateSynthesisPrompt(
  essay,
  topic,
  difficulty,
  collectedData,
  criterionScores,
  validatedScores
){
  // Normalize difficulty level
  const difficultyLower = difficulty.toLowerCase();
  const isLowerLevel = ['a1', 'a2', 'b1'].includes(difficultyLower);
  
  // Calculate word count from essay
  const essayWordCount = collectedData?.basicMetrics?.wordCount || 
    (essay ? essay.trim().split(/\s+/).filter(word => word.length > 0).length : 200);
  
  // For lower levels, calculate max feedback words (80% of essay length to ensure it's shorter)
  const maxFeedbackWords = isLowerLevel 
    ? Math.max(50, Math.floor(essayWordCount * 0.8)) // Minimum 50 words, max 80% of essay
    : null; // B2, C1, C2 use default 190-220 words

  // Build vocabulary restriction instructions for lower levels
  let vocabularyInstructions = '';
  let feedbackLengthInstructions = '';
  
  if (isLowerLevel) {
    // Vocabulary level restrictions
    if (difficultyLower === 'a1') {
      vocabularyInstructions = `
**CRITICAL VOCABULARY REQUIREMENTS (A1 Level):**
- Use ONLY the most basic English words (A1 vocabulary level)
- Avoid all advanced or sophisticated vocabulary
- Use simple, everyday words: "good" instead of "excellent", "help" instead of "facilitate", "say" instead of "articulate"
- Use short, common words that beginner students understand
- DO NOT use words more complex than what the student wrote in their essay
- Examples of appropriate words: "good", "bad", "big", "small", "like", "think", "want", "need", "help", "work", "make", "do"
- Avoid words like: "demonstrate", "elaborate", "sophisticated", "comprehensive", "articulate", "facilitate", "substantial", "exceptional"
`;
    } else if (difficultyLower === 'a2') {
      vocabularyInstructions = `
**CRITICAL VOCABULARY REQUIREMENTS (A2 Level):**
- Use A1-A2 vocabulary only (NO B1+ words)
- Keep vocabulary simple and accessible to elementary learners
- Use common, everyday words that match the student's level
- DO NOT use words more difficult than what the student wrote
- Prefer simpler alternatives: "show" instead of "demonstrate", "talk about" instead of "discuss in detail", "easy" instead of "straightforward"
- Avoid intermediate/advanced vocabulary: "comprehensive", "sophisticated", "elaborate", "substantial", "exceptional", "facilitate"
`;
    } else if (difficultyLower === 'b1') {
      vocabularyInstructions = `
**CRITICAL VOCABULARY REQUIREMENTS (B1 Level):**
- Use A2-B1 vocabulary only (NO B2+ words)
- Keep vocabulary appropriate for intermediate learners
- Use words that match the complexity level of the student's essay
- DO NOT use advanced vocabulary that exceeds the student's level
- Avoid sophisticated/advanced words: "sophisticated", "elaborate", "comprehensive", "facilitate", "substantiate", "exceptional"
- Use intermediate-level alternatives appropriate for B1 students
`;
    }
    
    // Feedback length restrictions
    feedbackLengthInstructions = `
**CRITICAL LENGTH REQUIREMENTS:**
- The essay has ${essayWordCount} words
- Your detailed feedback MUST NOT exceed ${maxFeedbackWords} words (80% of essay length)
- The feedback MUST be SHORTER than the essay itself
- Be concise and direct - focus on the most important points only
- Keep sentences short and simple
- Maximum ${maxFeedbackWords} words for detailed feedback - count your words carefully!
`;
  }

  // Build the prompt
  const difficultyLevelText = difficulty.toUpperCase();
  const detailedFeedbackLengthText = isLowerLevel 
    ? `Maximum ${maxFeedbackWords} words (MUST be shorter than the ${essayWordCount}-word essay)` 
    : '190-220 words';

  return `You are generating final feedback for a ${difficultyLevelText} level student essay.

ESSAY TOPIC: "${topic}"

VALIDATED SCORES:
- Task Response: ${validatedScores.taskResponse}
- Coherence & Cohesion: ${validatedScores.coherenceCohesion}
- Lexical Resource: ${validatedScores.lexicalResource}
- Grammatical Range & Accuracy: ${validatedScores.grammaticalRange}
- Overall Band: ${validatedScores.overall}

CRITERION ANALYSIS:

**Task Response (${validatedScores.taskResponse}):**
${criterionScores.taskResponse.reasoning}
Strengths: ${criterionScores.taskResponse.keyStrengths.join('; ')}
Limitations: ${criterionScores.taskResponse.keyLimitations.join('; ')}

**Coherence & Cohesion (${validatedScores.coherenceCohesion}):**
${criterionScores.coherenceCohesion.reasoning}
Strengths: ${criterionScores.coherenceCohesion.keyStrengths.join('; ')}
Limitations: ${criterionScores.coherenceCohesion.keyLimitations.join('; ')}

**Lexical Resource (${validatedScores.lexicalResource}):**
${criterionScores.lexicalResource.reasoning}
Strengths: ${criterionScores.lexicalResource.keyStrengths.join('; ')}
Limitations: ${criterionScores.lexicalResource.keyLimitations.join('; ')}

**Grammatical Range & Accuracy (${validatedScores.grammaticalRange}):**
${criterionScores.grammaticalRange.reasoning}
Strengths: ${criterionScores.grammaticalRange.keyStrengths.join('; ')}
Limitations: ${criterionScores.grammaticalRange.keyLimitations.join('; ')}

COLLECTED DATA SUMMARY:
- Word count: ${collectedData.basicMetrics.wordCount}
- Sentence count: ${collectedData.basicMetrics.sentenceCount}
- Paragraph count: ${collectedData.basicMetrics.paragraphCount}
- Error-free sentences: ${collectedData.grammaticalFeatures.errorFreeSentences}/${collectedData.basicMetrics.sentenceCount}
- Cohesive devices: ${collectedData.coherenceCohesionFeatures.cohesiveDevices.total} (${collectedData.coherenceCohesionFeatures.cohesiveDevices.variety})
- Vocabulary repetition: ${collectedData.lexicalFeatures.keywordRepetition.repetitionLevel}

YOUR TASK:

Generate TWO pieces of feedback:

1. **Motivational Opening (15-20 words)**
   - Warm, encouraging tone
   - Acknowledge what the student did well
   - Make them feel proud of their effort
   - Use their actual band score positively
   ${isLowerLevel ? '- Use simple, basic vocabulary appropriate for ' + difficultyLevelText + ' level' : ''}

2. **Detailed Feedback (${detailedFeedbackLengthText})**
   ${feedbackLengthInstructions}
   - Start with 1-2 sentences praising specific strengths (be concrete)
   - Organize by the 4 criteria (in order: Task, Coherence, Lexical, Grammar)
   - For each criterion:
     * Mention 1 strength
     * Mention 1-2 specific limitations with examples
     * Give 1 actionable tip for improvement
   - End with 1 encouraging sentence about their next steps
   
   **Tone Guidelines:**
   - Supportive and constructive (never harsh)
   - Specific (use actual features from the data)
   - Actionable (tell them WHAT to do differently)
   - Balanced (acknowledge both strengths and areas to improve)
   - Appropriate for level (don't expect Band 9 features from ${difficultyLevelText} students)
   ${isLowerLevel ? '- Use simple, short sentences' : ''}
   ${isLowerLevel ? '- Be direct and clear - avoid complex explanations' : ''}

   ${vocabularyInstructions}

   **Format:**
   - Use natural paragraphs (no bullet points)
   - No headers or section labels
   - Flow naturally from one criterion to the next
   - Use transition phrases ${isLowerLevel ? '("Also", "Next", "Now")' : '("Additionally", "In terms of grammar", "To improve further")'}

OUTPUT FORMAT (JSON only):
{
  "motivationalText": "<15-20 word encouraging opening>",
  "detailedFeedback": "<${isLowerLevel ? 'maximum ' + maxFeedbackWords : '190-220'} word comprehensive feedback>",
  "evidenceHighlights": {
    "topStrength": "<single best feature of this essay>",
    "priorityImprovement": "<single most important thing to improve>",
    "nextLevelFeature": "<one specific feature needed to reach next band level>"
  }
}

EXAMPLES OF GOOD MOTIVATIONAL TEXT:
${isLowerLevel ? 
  `- "Good work! You wrote ${essayWordCount} words. Your ideas are clear. Keep writing!"` +
  `\n- "Well done! Your essay has good sentences. You understand the topic. Good job!"` +
  `\n- "Nice work! You used simple words well. Your essay is easy to read. Keep practicing!"`
  :
  `- "Great effort! You've achieved Band 6.5 with clear ideas and good organization. Keep developing those examples!"` +
  `\n- "Well done on reaching Band 5.5! Your essay shows good understanding and clear structure. Focus on vocabulary variety next."` +
  `\n- "Excellent work! Band 7.0 demonstrates strong writing skills with sophisticated language. You're progressing beautifully!"`
}

EXAMPLES OF GOOD DETAILED FEEDBACK OPENING:
${isLowerLevel ?
  `- "Your essay has good ideas. You talked about the topic well. Your sentences are clear."` +
  `\n- "You wrote about the topic. Your words are simple and easy to understand. Good work!"` +
  `\n- "Your essay is easy to read. You used simple words. Your ideas are clear."`
  :
  `- "Your essay demonstrates strong task response by addressing both advantages and disadvantages with relevant examples, such as..."` +
  `\n- "You've structured your ideas clearly with an introduction, body paragraphs, and conclusion, which helps the reader follow your argument..."` +
  `\n- "The essay shows good control of grammar with mostly error-free sentences, particularly in your use of complex structures like..."`
}

${isLowerLevel ? `\nREMEMBER: Your feedback MUST be shorter than the essay (${essayWordCount} words). Maximum ${maxFeedbackWords} words. Use simple vocabulary only.` : ''}

Output ONLY the JSON object. Be specific, supportive, and helpful.`;
}

