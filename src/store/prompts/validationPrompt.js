/**
 * Step 1B: Pre-Validation Prompt
 * Lightweight validation before full assessment
 * Model: Gemma 3n (4B) | Tokens: ~200 | Temperature: 0.0
 */

import { LANGUAGE_NAMES, VALIDATION_CODES } from './config.js';

export function generateWritingValidationPrompt(level, locale, topic, answer) {
  const languageName = LANGUAGE_NAMES[locale] || LANGUAGE_NAMES["en"];

  return `You are a fair writing submission validator. Your job is to ACCEPT genuine essay attempts and only reject obviously invalid submissions.

TASK: Determine if this submission is a genuine essay attempt that should be assessed. When in doubt, ACCEPT the submission.

══════════════════════════════════════════════════════════════
✅ WHAT TO ACCEPT (Default: Accept if unsure)
══════════════════════════════════════════════════════════════
ACCEPT essays that have:
✓ Complete sentences with subjects and verbs (even simple ones)
✓ An attempt to answer or discuss the topic question
✓ Connected ideas forming coherent text (basic structure is fine)
✓ Grammar/spelling errors are OK - accept them
✓ Simple or short essays are OK if they have real sentences
✓ Imperfect but genuine attempts to discuss the topic
✓ Basic essays from beginners with proper sentence structure

VALID ESSAY EXAMPLES (These should ALL be ACCEPTED):

Example 1 - Beginner with grammar errors:
"My family is not so big, in my family 7 people, there are my mother father sister brother me and my grandparents, we live in big house together, i love they so much"
→ ACCEPT: Has complete sentences, addresses topic, genuine attempt

Example 2 - Simple but valid:
"Technology is good for people. It helps us communicate. I use my phone every day."
→ ACCEPT: Complete sentences, addresses topic, coherent thoughts

══════════════════════════════════════════════════════════════
❌ REJECTION CRITERIA (Only reject if OBVIOUSLY invalid)
══════════════════════════════════════════════════════════════

1. ❌ OBVIOUS VOCABULARY LIST → Code: GIBBERISH
   REJECT ONLY if: Clearly just a list of words/terms with NO sentences
   REJECT ONLY if: Obviously a glossary with translations

2. ❌ OBVIOUS REPETITION → Code: GIBBERISH
   REJECT ONLY if: Same block of text appears multiple times (obvious copy-paste)
   REJECT ONLY if: Same sentence/phrase repeated 4+ times to fill space

3. ❌ NO SENTENCE STRUCTURE → Code: NO_ATTEMPT
   REJECT ONLY if: Clearly NO complete sentences (only fragments/words)
   ACCEPT if there are ANY complete sentences, even simple ones

4. ❌ NOT IN ENGLISH → Code: NOT_ENGLISH
   REJECT ONLY if: More than 30% non-English text
   ACCEPT if mostly English, even with some non-English words

5. ❌ NO GENUINE ATTEMPT → Code: NO_ATTEMPT
   REJECT ONLY if: Clearly "I don't know", "idk", "nothing", "no answer"
   REJECT ONLY if: Just the topic question copied back verbatim
   ACCEPT if there's ANY attempt to answer, even if brief

6. ❌ COMPLETELY OFF-TOPIC → Code: OFF_TOPIC
   REJECT ONLY if: Content is COMPLETELY unrelated to the topic
   ACCEPT if there's ANY connection to the topic, even if tangential

══════════════════════════════════════════════════════════════
IMPORTANT PRINCIPLES
══════════════════════════════════════════════════════════════
• When in doubt, ACCEPT the submission
• Grammar errors, spelling mistakes, and simple language are OK
• Short essays are valid if they have sentences
• Beginner-level writing should be accepted if it's a genuine attempt
• Only reject if the submission is OBVIOUSLY invalid

══════════════════════════════════════════════════════════════
TOPIC
══════════════════════════════════════════════════════════════
${topic}

══════════════════════════════════════════════════════════════
SUBMISSION TO VALIDATE
══════════════════════════════════════════════════════════════
${answer}

══════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON ONLY - NO OTHER TEXT)
══════════════════════════════════════════════════════════════
{
  "isValid": <true or false>,
  "failureCode": <"OFF_TOPIC" | "GIBBERISH" | "NOT_ENGLISH" | "NO_ATTEMPT" | null>,
  "failureReason": "<brief explanation in ${languageName} or null if valid>"
}

RESPOND WITH ONLY THE JSON OBJECT, NO ADDITIONAL TEXT.`;
}

// Export validation codes for use in other files
export { VALIDATION_CODES };

