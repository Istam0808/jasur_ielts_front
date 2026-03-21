/**
 * Answer checking utilities for Reading: normalize text, check correctness, get correct answers for scoring.
 */

export function normalizeText(text) {
  if (text == null) return '';
  const s = String(text).trim().toLowerCase();
  return s.replace(/\s+/g, ' ');
}

function splitOptionLabelAndText(value) {
  const source = String(value || '').trim();
  if (!source) return { label: '', text: '' };
  const match = source.match(/^([A-Za-z])[\)\].:\-]?\s+(.+)$/);
  if (!match) return { label: '', text: source };
  return {
    label: String(match[1]).toUpperCase(),
    text: String(match[2] || '').trim(),
  };
}

function getOptionValue(option, index = 0) {
  if (option && typeof option === 'object') {
    return String(option.value ?? option.label ?? option.answer ?? String.fromCharCode(65 + index)).trim();
  }
  if (typeof option === 'string') {
    const parsed = splitOptionLabelAndText(option);
    return parsed.label || String.fromCharCode(65 + index);
  }
  return String.fromCharCode(65 + index);
}

function getOptionText(option) {
  if (option && typeof option === 'object') {
    return String(option.text ?? option.answer ?? option.label ?? option.value ?? '').trim();
  }
  if (typeof option === 'string') {
    const parsed = splitOptionLabelAndText(option);
    return parsed.text || option;
  }
  return '';
}

/**
 * Fuzzy match: exact match, or similarity above threshold. Thresholds: strict (1), medium (0.85), loose (0.7).
 */
export function checkAnswerVariants(userVal, correctVal, strict = 1, medium = 0.85, loose = 0.7) {
  const u = normalizeText(userVal);
  const c = normalizeText(correctVal);
  if (u === c) return true;
  if (!u || !c) return false;
  if (u.includes(c) || c.includes(u)) return true;
  const ratio = simpleSimilarity(u, c);
  return ratio >= loose;
}

function simpleSimilarity(a, b) {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  let match = 0;
  setA.forEach((ch) => {
    if (setB.has(ch)) match++;
  });
  const union = new Set([...setA, ...setB]);
  return union.size ? match / union.size : 0;
}

/**
 * Get correct answer text for display (single option).
 */
export function getCorrectAnswer(question, _readingId) {
  if (!question || !question.options) return '';
  const opt = question.options.find((o) => o && (o.correct === true || o.correct === 'true'));
  return opt ? getOptionText(opt) : '';
}

/**
 * Get correct answer(s) for scoring: format depends on question type (string, array, or object).
 */
export function getCorrectAnswerTextForScoring(question, _readingId) {
  if (!question) return null;

  const { type, options, answers, labels } = question;

  switch (type) {
    case 'multiple_choice':
    case 'true_false':
    case 'true_false_not_given':
    case 'yes_no_not_given': {
      const correct = options?.find((o) => o && (o.correct === true || o.correct === 'true'));
      if (!correct) return null;
      const index = Array.isArray(options) ? options.indexOf(correct) : 0;
      return getOptionValue(correct, index);
    }

    case 'multiple_choice_multiple': {
      const correctList = options?.filter((o) => o && (o.correct === true || o.correct === 'true'));
      return correctList?.map((o) => {
        const index = Array.isArray(options) ? options.indexOf(o) : 0;
        return getOptionValue(o, index);
      }) ?? [];
    }

    case 'matching_headings':
    case 'matching_information':
    case 'matching_features':
    case 'sentence_completion': {
      const map = {};
      if (answers && Array.isArray(answers)) {
        answers.forEach((a) => {
          const key = a.section ?? a.info ?? a.feature ?? a.sentence ?? a.blank ?? a.id;
          if (key != null) map[key] = a.answer ?? a.correct ?? a.value;
        });
      }
      return Object.keys(map).length ? map : null;
    }

    case 'summary_completion':
    case 'table_completion':
    case 'flow_chart_completion':
    case 'note_completion': {
      const map = {};
      if (answers && Array.isArray(answers)) {
        answers.forEach((a) => {
          const key = String(a.blank ?? a.id ?? a.index ?? '');
          if (key) map[key] = a.answer ?? a.value;
        });
      }
      return Object.keys(map).length ? map : null;
    }

    case 'diagram_labelling': {
      const map = {};
      if (labels && Array.isArray(labels)) {
        labels.forEach((l, i) => {
          const key = l.position ?? String(i);
          map[key] = l.answer ?? l.value;
        });
      }
      return Object.keys(map).length ? map : null;
    }

    case 'short_answer': {
      const correct = options?.find((o) => o && (o.correct === true || o.correct === 'true'));
      return correct ? (correct.answer ?? correct.text ?? String(correct)) : null;
    }

    case 'advanced_short_answer': {
      const map = {};
      if (question.questions && Array.isArray(question.questions)) {
        question.questions.forEach((q, i) => {
          map[q] = null;
        });
      }
      return Object.keys(map).length ? map : null;
    }

    default:
      return getCorrectAnswer(question, _readingId) || null;
  }
}

/**
 * Check if user answer is correct for the question. readingId can be used for external answer keys (stub).
 */
export function checkAnswer(question, userAnswer, _readingId) {
  if (!question) return false;

  const { type, options } = question;

  if (type === 'short_answer') {
    const correct = options?.find((o) => o && (o.correct === true || o.correct === 'true'));
    if (!correct) return false;
    const expected = correct.answer ?? correct.text ?? String(correct);
    return normalizeText(userAnswer) === normalizeText(expected);
  }

  if (type === 'advanced_short_answer') {
    if (typeof userAnswer !== 'object' || userAnswer === null) return false;
    const correctMap = getCorrectAnswerTextForScoring(question, _readingId);
    if (!correctMap || typeof correctMap !== 'object') return false;
    return Object.entries(correctMap).every(([key, correctVal]) => {
      const userVal = userAnswer[key];
      if (correctVal == null) return true;
      return normalizeText(userVal) === normalizeText(correctVal);
    });
  }

  if (
    type === 'multiple_choice' ||
    type === 'true_false' ||
    type === 'true_false_not_given' ||
    type === 'yes_no_not_given'
  ) {
    const correct = options?.find((o) => o && (o.correct === true || o.correct === 'true'));
    if (!correct) return false;
    const correctIndex = Array.isArray(options) ? options.indexOf(correct) : 0;
    const expected = getOptionValue(correct, correctIndex);
    const expectedText = getOptionText(correct);
    const u = typeof userAnswer === 'string' ? userAnswer.trim() : String(userAnswer ?? '');
    if (u === expected) return true;
    if (expectedText && normalizeText(u) === normalizeText(expectedText)) return true;
    const leading = u.match(/^[A-Z]\.?\s*/i)?.[0]?.trim() || u;
    return normalizeText(leading) === normalizeText(expected) || normalizeText(u) === normalizeText(expected);
  }

  const correctForScoring = getCorrectAnswerTextForScoring(question, _readingId);
  if (correctForScoring == null) return false;

  if (Array.isArray(correctForScoring)) {
    if (!Array.isArray(userAnswer)) return false;
    const normalizedCorrect = new Set(correctForScoring.map(normalizeText));
    return userAnswer.every((a) => normalizedCorrect.has(normalizeText(a)));
  }

  if (typeof correctForScoring === 'object') {
    if (typeof userAnswer !== 'object' || userAnswer === null) return false;
    return Object.entries(correctForScoring).every(([key, correctVal]) => {
      const userVal = userAnswer[key];
      if (correctVal == null) return true;
      return checkAnswerVariants(userVal, correctVal);
    });
  }

  return normalizeText(userAnswer) === normalizeText(correctForScoring);
}
