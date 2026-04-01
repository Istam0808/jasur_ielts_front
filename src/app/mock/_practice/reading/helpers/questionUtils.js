// Helper function to get the path of a node relative to a root element
export const getNodePath = (node, root) => {
    const path = [];
    let current = node;

    while (current && current !== root) {
        const parent = current.parentNode;
        if (parent) {
            const index = Array.from(parent.childNodes).indexOf(current);
            path.unshift(index);
        }
        current = parent;
    }

    return path;
};

// Helper function to restore a node from a path
export const getNodeFromPath = (path, root) => {
    let current = root;

    for (const index of path) {
        if (current?.childNodes?.[index]) {
            current = current.childNodes[index];
        } else {
            return null;
        }
    }

    return current;
};

// Constants for better maintainability
const NUMBER_WORDS = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
};

const BLANK_PATTERNS = {
    NUMBERED: /___(\d+)___/g,
    DOTTED: /(\d+)\.{2,}/g,
    COMBINED: /(?:___(\d+)___|(\d+)\.{2,})/g
};

// Helper function to parse expected answer count from instruction text
const parseExpectedCountFromInstruction = (instruction) => {
    if (!instruction) return 3; // Default fallback
    
    const match = instruction.match(/(?:Choose\s+)?(\w+)\s+(?:letters?|answers?|options?)/i);
    if (match) {
        const numberWord = match[1].toLowerCase();
        const parsedNumber = NUMBER_WORDS[numberWord] || parseInt(numberWord);
        if (parsedNumber && !isNaN(parsedNumber)) {
            return parsedNumber;
        }
    }
    return 3;
};

// Helper function to count blanks in text using pattern
const countBlanksInText = (text, pattern = BLANK_PATTERNS.NUMBERED) => {
    if (!text) return 0;
    
    // Handle new vertical flow chart format
    if (typeof text === 'object' && text.type === 'vertical' && text.steps) {
        let blankCount = 0;
        text.steps.forEach(step => {
            if (step.blank) blankCount++;
            if (step.blank2) blankCount++;
        });
        return blankCount;
    }
    
    // Handle legacy string format
    if (typeof text === 'string') {
        const matches = text.match(pattern);
        return matches ? matches.length : 0;
    }
    
    return 0;
};

// Helper function to count blanks in table
const countTableBlanks = (table) => {
    if (!table?.rows || !table.headers) return 1;
    
    return table.rows.reduce((count, row) => {
        return count + table.headers.reduce((rowCount, header) => {
            const cellValue = row[header];
            return rowCount + (cellValue?.includes('___') ? 1 : 0);
        }, 0);
    }, 0);
};

// Helper function to count blanks in notes array
const countNoteBlanks = (notes) => {
    if (!Array.isArray(notes)) return 1;
    
    let blankCount = 0;
    notes.forEach(note => {
        const matches = note.match(BLANK_PATTERNS.COMBINED);
        if (matches) {
            blankCount += matches.length;
        }
    });
    
    return blankCount > 0 ? blankCount : notes.length || 1;
};

// Utility function to count individual answers required for a question
export const getQuestionAnswerCount = (question) => {
    if (!question) return 1;

    switch (question.type) {
        case 'multiple_choice':
        case 'true_false':
        case 'true_false_not_given':
        case 'yes_no_not_given':
            return 1;

        case 'multiple_choice_multiple':
            if (Number.isFinite(question.maxSelections) && question.maxSelections > 0) {
                return question.maxSelections;
            }
            // First try to get from correct properties in options
            const correctFromOptions = question.options?.filter(opt => opt.correct)?.length;
            if (correctFromOptions > 0) {
                return correctFromOptions;
            }
            // If no correct properties, parse from instruction
            return parseExpectedCountFromInstruction(question.instruction);

        case 'matching_headings':
            return question.sections?.length || 1;

        case 'matching_information':
            return question.information?.length || 1;

        case 'matching_people':
            return question.statements?.length || 1;

        case 'matching_features':
            return question.features?.length || 1;

        case 'matching_sentences':
            return question.items?.length || 1;

        case 'matching':
            return question.options?.length || 1;

        case 'fill_in_the_blanks':
            return question.blanks?.length || 1;

        case 'short_answer':
            // Check if this is a multi-question short answer
            if (question.instruction && question.questions && Array.isArray(question.questions)) {
                return question.questions.length;
            }
            return 1;

        case 'sentence_completion':
            return question.sentences?.length || 1;

        case 'summary_completion':
            return countBlanksInText(question.summary, BLANK_PATTERNS.NUMBERED);

        case 'table_completion':
            return countTableBlanks(question.table);

        case 'flow_chart_completion':
            if (question.flow_chart) {
                // Handle new vertical flow chart format
                if (question.flow_chart.type === 'vertical' && question.flow_chart.steps) {
                    let blankCount = 0;
                    question.flow_chart.steps.forEach(step => {
                        if (step.blank) blankCount++;
                        if (step.blank2) blankCount++;
                    });
                    return blankCount > 0 ? blankCount : 1;
                }
                
                // Handle legacy string format
                if (typeof question.flow_chart === 'string') {
                    const blankCount = countBlanksInText(question.flow_chart, BLANK_PATTERNS.NUMBERED);
                    return blankCount > 0 ? blankCount : (question.flow_chart_items?.length || 1);
                }
            }
            return question.flow_chart_items?.length || 1;

        case 'diagram_completion':
            return question.diagram_labels?.length || 1;

        case 'note_completion':
            return countNoteBlanks(question.notes);

        case 'form_completion':
            return question.form_fields?.length || 1;

        default:
            return 1;
    }
};

// Helper function to check if value is non-empty
const isNonEmpty = (value) => value !== null && value !== undefined && value !== '';

// Helper function to check if string value is non-empty after trimming
const isNonEmptyString = (value) => value && value.toString().trim() !== '';

// Helper function to count non-empty values in array
const countNonEmptyArray = (arr) => {
    if (!Array.isArray(arr)) return 0;
    return arr.filter(isNonEmpty).length;
};

// Helper function to count non-empty values in object
const countNonEmptyObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return 0;
    return Object.values(obj).filter(isNonEmptyString).length;
};

// Utility function to count how many answers the user has provided for a question
export const getProvidedAnswerCount = (answer, question) => {
    if (!answer) return 0;

    switch (question.type) {
        case 'multiple_choice':
        case 'true_false':
        case 'true_false_not_given':
        case 'yes_no_not_given':
            return answer ? 1 : 0;

        case 'multiple_choice_multiple':
            return countNonEmptyArray(answer);

        case 'matching_headings':
        case 'matching_information':
        case 'matching_people':
        case 'matching_features':
        case 'matching_sentences':
        case 'sentence_completion':
        case 'summary_completion':
        case 'table_completion':
        case 'flow_chart_completion':
        case 'diagram_completion':
        case 'note_completion':
        case 'form_completion':
            return countNonEmptyObject(answer);

        case 'matching':
        case 'fill_in_the_blanks':
            return countNonEmptyArray(answer);

        case 'short_answer':
            // Check if this is a multi-question short answer
            if (question.instruction && question.questions && Array.isArray(question.questions)) {
                return countNonEmptyObject(answer);
            }
            return answer ? 1 : 0;

        default:
            return answer ? 1 : 0;
    }
};

// Utility function to check if a question has a valid answer
export const hasValidAnswer = (answer, question) => {
    if (!answer) return false;

    switch (question.type) {
        case 'multiple_choice':
        case 'true_false':
        case 'true_false_not_given':
        case 'yes_no_not_given':
        case 'short_answer':
            return !!answer;

        case 'multiple_choice_multiple':
        case 'matching':
        case 'fill_in_the_blanks':
            return Array.isArray(answer) && answer.some(isNonEmpty);

        case 'matching_headings':
        case 'matching_information':
        case 'matching_people':
        case 'sentence_completion':
        case 'matching_sentences':
        case 'summary_completion':
        case 'table_completion':
        case 'flow_chart_completion':
        case 'diagram_completion':
        case 'form_completion':
            return typeof answer === 'object' && answer !== null && Object.values(answer).some(isNonEmptyString);

        case 'matching_features':
            // Check if ALL features have been answered
            if (typeof answer === 'object' && answer !== null && question.features) {
                const requiredFeatures = question.features.length;
                const answeredFeatures = countNonEmptyObject(answer);
                return answeredFeatures === requiredFeatures;
            }
            return false;

        case 'note_completion':
            // Check if ALL blanks have been filled
            if (typeof answer === 'object' && answer !== null && question.notes) {
                const requiredBlanks = countNoteBlanks(question.notes);
                const providedAnswers = countNonEmptyObject(answer);
                return providedAnswers === requiredBlanks;
            }
            return false;

        default:
            return !!answer;
    }
};

// Helper function to get key from item (handles both object and string formats)
const getItemKey = (item, keyProperty) => {
    return typeof item === 'object' ? item[keyProperty] : item;
};

// Helper function to extract feature ID from feature string
const getFeatureId = (feature) => {
    const dotIndex = feature.indexOf(".");
    return dotIndex !== -1 ? feature.slice(0, dotIndex) : feature;
};

// Helper function to find blank number by index in text
const findBlankNumberByIndex = (text, targetIndex, pattern = BLANK_PATTERNS.NUMBERED) => {
    // Handle new vertical flow chart format
    if (text && typeof text === 'object' && text.type === 'vertical' && text.steps) {
        let blankIndex = 0;
        for (const step of text.steps) {
            if (step.blank) {
                if (blankIndex === targetIndex) {
                    return String(step.blank);
                }
                blankIndex++;
            }
            if (step.blank2) {
                if (blankIndex === targetIndex) {
                    return String(step.blank2);
                }
                blankIndex++;
            }
        }
        return null;
    }
    
    // Handle legacy string format
    if (typeof text === 'string') {
        const matches = text.match(pattern);
        if (matches && matches[targetIndex]) {
            const numberMatch = matches[targetIndex].match(/(\d+)/);
            return numberMatch ? numberMatch[1] : null;
        }
    }
    
    return null;
};

// Helper function to find table blank by index
const findTableBlankByIndex = (table, targetIndex) => {
    if (!table?.rows || !table.headers) return null;
    
    let blankIndex = 0;
    for (const row of table.rows) {
        for (const header of table.headers) {
            const cellValue = row[header];
            const blankMatch = cellValue?.match(/___(\d+)___/);
            if (blankMatch) {
                if (blankIndex === targetIndex) {
                    return blankMatch[1];
                }
                blankIndex++;
            }
        }
    }
    return null;
};

// Helper function to find note blank by index
const findNoteBlankByIndex = (notes, targetIndex) => {
    if (!Array.isArray(notes)) return null;
    
    let blankIndex = 0;
    for (const note of notes) {
        const blankMatches = note.match(BLANK_PATTERNS.COMBINED) || [];
        for (const match of blankMatches) {
            if (blankIndex === targetIndex) {
                const numberMatch = match.match(/(\d+)/);
                return numberMatch ? numberMatch[1] : null;
            }
            blankIndex++;
        }
    }
    return null;
};

// Utility function to check if a specific answer slot is answered
export const isSpecificSlotAnswered = (userAnswer, question, answerSlot) => {
    if (!userAnswer || !question || !answerSlot) return false;

    const { answerIndex } = answerSlot;

    switch (question.type) {
        case 'short_answer':
            if (question.questions && Array.isArray(question.questions)) {
                const subQuestion = question.questions[answerIndex];
                if (subQuestion && typeof userAnswer === 'object') {
                    return isNonEmptyString(userAnswer[subQuestion]);
                }
            }
            return getProvidedAnswerCount(userAnswer, question) > 0;

        case 'multiple_choice_multiple':
            if (!Array.isArray(userAnswer)) return false;
            
            // For multiple choice multiple, check if the specific answer slot is answered
            // Each slot represents one of the required answers
            const expectedCount = parseExpectedCountFromInstruction(question.instruction);
            
            // Check if user has selected enough answers to cover this specific slot
            if (userAnswer.length > answerIndex) {
                // User has selected enough answers to cover this slot
                return true;
            }
            
            // Fallback: check if user has selected the expected number of answers
            return userAnswer.length === expectedCount;

        case 'matching_headings':
            if (question.sections && typeof userAnswer === 'object') {
                const section = question.sections[answerIndex];
                if (section) {
                    const sectionKey = getItemKey(section, 'section');
                    return isNonEmptyString(userAnswer[sectionKey]);
                }
            }
            return false;

        case 'matching_information':
            if (question.information && typeof userAnswer === 'object') {
                const item = question.information[answerIndex];
                if (item) {
                    const itemKey = getItemKey(item, 'info');
                    return isNonEmptyString(userAnswer[itemKey]);
                }
            }
            return false;

        case 'matching_people':
            if (question.statements && typeof userAnswer === 'object') {
                const statement = question.statements[answerIndex];
                if (statement) {
                    return isNonEmptyString(userAnswer[statement]);
                }
            }
            return false;

        case 'matching_features':
            if (question.features && typeof userAnswer === 'object') {
                const feature = question.features[answerIndex];
                if (feature) {
                    const featureId = getFeatureId(feature);
                    return isNonEmptyString(userAnswer[featureId]);
                }
            }
            return false;

        case 'sentence_completion':
            if (question.sentences && typeof userAnswer === 'object') {
                const sentence = question.sentences[answerIndex];
                if (sentence) {
                    const sentenceKey = getItemKey(sentence, 'beginning');
                    return isNonEmptyString(userAnswer[sentenceKey]);
                }
            }
            return false;

        case 'summary_completion':
            if (question.summary && typeof userAnswer === 'object') {
                const blankNumber = findBlankNumberByIndex(question.summary, answerIndex);
                return blankNumber ? isNonEmptyString(userAnswer[blankNumber]) : false;
            }
            return false;

        case 'flow_chart_completion':
            if (question.flow_chart && typeof userAnswer === 'object') {
                const blankNumber = findBlankNumberByIndex(question.flow_chart, answerIndex);
                return blankNumber ? isNonEmptyString(userAnswer[blankNumber]) : false;
            }
            return false;

        case 'table_completion':
            if (question.table && typeof userAnswer === 'object') {
                const blankId = findTableBlankByIndex(question.table, answerIndex);
                return blankId ? isNonEmptyString(userAnswer[blankId]) : false;
            }
            return false;

        case 'diagram_labelling':
            if (question.labels && typeof userAnswer === 'object') {
                const label = question.labels[answerIndex];
                return label ? isNonEmptyString(userAnswer[label.position]) : false;
            }
            return false;

        case 'note_completion':
            if (question.notes && typeof userAnswer === 'object') {
                const blankId = findNoteBlankByIndex(question.notes, answerIndex);
                return blankId ? isNonEmptyString(userAnswer[blankId]) : false;
            }
            return false;

        default:
            return getProvidedAnswerCount(userAnswer, question) > 0;
    }
};

// ---------------- Review-mode correctness helpers ----------------
import { getCorrectAnswerTextForScoring, checkAnswer, checkAnswerVariants, normalizeText } from '@/utils/answerChecker';

// Utility to determine if a specific individual answer slot is correct (for review mode)
// readingId may be null for basic levels; reviewMap is handled inside getCorrectAnswerTextForScoring
export const isSpecificSlotCorrect = (userAnswer, question, answerSlot, readingId = null, reviewMap = null) => {
    if (!question || userAnswer === undefined || userAnswer === null) return false;

    const { answerIndex } = answerSlot || { answerIndex: 0 };

    // Helper: build correct answers using reviewMap for advanced readings on client
    const getCorrectFromReview = () => {
        if (!reviewMap) return null;
        switch (question.type) {
            case 'multiple_choice':
            case 'true_false':
            case 'true_false_not_given':
            case 'yes_no_not_given':
                // Advanced datasets key single-slot answers by global sequential number (1..40)
                // Fallback to question.id if sequentialNumber is unavailable
                {
                    const key = (answerSlot && answerSlot.sequentialNumber != null)
                        ? String(answerSlot.sequentialNumber)
                        : String(question.id);
                    return reviewMap[key] || null;
                }

            case 'multiple_choice_multiple': {
                // For multiple_choice_multiple, we need to use the sequentialNumber to find the correct answer
                // The reviewMap uses sequential numbers (1, 2, 3, etc.) that correspond to the question order
                
                // Use the sequentialNumber from the answerSlot if available
                const key = (answerSlot && answerSlot.sequentialNumber != null)
                    ? String(answerSlot.sequentialNumber)
                    : String(question.id);
                
                const correctAnswer = reviewMap[key];
                if (!correctAnswer || typeof correctAnswer !== 'string') return null;
                
                // Parse the slash-separated answer (e.g., "B/E" -> ["B", "E"])
                if (correctAnswer.includes('/')) {
                    const answerLetters = correctAnswer.split('/').map(letter => letter.trim());
                    return answerLetters;
                }
                
                // If no slash, treat as single answer
                return [correctAnswer];
            }

            case 'matching_headings': {
                const map = {};
                (question.sections || []).forEach((section) => {
                    const sectionKey = getItemKey(section, 'section');
                    // sectionKey is typically like "27. Section A" - extract the numeric prefix for reviewMap lookup
                    const qNum = (String(sectionKey).split?.('.')?.[0] || '').trim();
                    const ans = (qNum && reviewMap[String(qNum)]) || reviewMap[sectionKey] || null;
                    if (ans) map[sectionKey] = ans;
                });
                return map;
            }

            case 'matching_information': {
                const map = {};
                (question.information || []).forEach((item) => {
                    const infoVal = getItemKey(item, 'info');
                    const qNum = (infoVal.split?.('.')?.[0] || '').trim();
                    const ans = reviewMap[String(qNum)];
                    if (ans) map[infoVal] = ans;
                });
                return map;
            }

            case 'matching_people': {
                const map = {};
                (question.statements || []).forEach((statement) => {
                    const text = String(statement || '');
                    const qNum = (text.split?.('.')?.[0] || '').trim();
                    const ans = reviewMap[String(qNum)];
                    if (ans) map[text] = ans;
                });
                return map;
            }

            case 'matching_features': {
                const map = {};
                (question.features || []).forEach((feature) => {
                    const text = typeof feature === 'string' ? feature : String(feature);
                    const qNum = (text.split?.('.')?.[0] || '').trim();
                    const ans = reviewMap[String(qNum)];
                    if (ans) map[getFeatureId(text)] = ans;
                });
                return map;
            }

            case 'sentence_completion': {
                const map = {};
                (question.sentences || []).forEach((sentence) => {
                    const sentVal = getItemKey(sentence, 'beginning');
                    const qNum = (sentVal.split?.('.')?.[0] || '').trim();
                    const ans = reviewMap[String(qNum)];
                    if (ans) map[sentVal] = ans;
                });
                return map;
            }

            case 'summary_completion': {
                const map = {};
                if (question.summary) {
                    const blanks = question.summary.match(/___(\d+)___/g) || [];
                    blanks.forEach((m) => {
                        const id = m.match(/\d+/)[0];
                        const ans = reviewMap[String(id)];
                        if (ans) map[id] = ans;
                    });
                }
                return map;
            }

            case 'table_completion': {
                const map = {};
                const id = findTableBlankByIndex(question.table, answerIndex);
                if (id) {
                    const ans = reviewMap[String(id)];
                    if (ans) map[id] = ans;
                }
                return map;
            }

            case 'flow_chart_completion': {
                const map = {};
                const id = findBlankNumberByIndex(question.flow_chart, answerIndex);
                if (id) {
                    const ans = reviewMap[String(id)];
                    if (ans) map[id] = ans;
                }
                return map;
            }

            case 'note_completion': {
                const map = {};
                const id = findNoteBlankByIndex(question.notes, answerIndex);
                if (id) {
                    const ans = reviewMap[String(id)];
                    if (ans) map[id] = ans;
                }
                return map;
            }

            case 'diagram_labelling': {
                // Attempt position key mapping
                const map = {};
                (question.labels || []).forEach((label, idx) => {
                    const pos = label.position;
                    const ans = reviewMap[String(question.id + idx)] || reviewMap[String(pos)] || null;
                    if (ans) map[pos] = ans;
                });
                return map;
            }

            default:
                return null;
        }
    };

    switch (question.type) {
        case 'multiple_choice':
        case 'true_false':
        case 'true_false_not_given':
        case 'yes_no_not_given':
            if (reviewMap) {
                const correct = getCorrectFromReview();
                if (question.type === 'multiple_choice') {
                    // Accept either the letter (e.g., "A") or full text starting with the letter (e.g., "A. Text ...")
                    if (typeof userAnswer === 'string') {
                        const leading = userAnswer.trim().match(/^[A-Z]/i)?.[0] || userAnswer;
                        return normalizeText(leading) === normalizeText(correct);
                    }
                }
                return normalizeText(userAnswer) === normalizeText(correct);
            }
            return checkAnswer(question, userAnswer, readingId);

        case 'multiple_choice_multiple': {
            // For multiple_choice_multiple, we need to check individual answer slots
            // Each slot represents one of the required answers (e.g., slot 0 = first answer, slot 1 = second answer)
            
            if (!Array.isArray(userAnswer) || userAnswer.length === 0) return false;
            
            // Get the correct answers for this question
            const correctAnswers = reviewMap ? getCorrectFromReview() : getCorrectAnswerTextForScoring(question, readingId);
            
            if (!Array.isArray(correctAnswers) || correctAnswers.length === 0) return false;
            
            // Check if the specific answer slot (answerIndex) is correct
            // answerIndex 0 = first required answer, answerIndex 1 = second required answer, etc.
            if (answerIndex >= 0 && answerIndex < correctAnswers.length) {
                const expectedCorrectAnswer = correctAnswers[answerIndex];
                const userSelectedAnswers = userAnswer.map(ans => normalizeText(ans));
                
                // Check if the user selected the expected answer for this specific slot
                return userSelectedAnswers.includes(normalizeText(expectedCorrectAnswer));
            }
            
            return false;
        }

        case 'matching_headings': {
            if (typeof userAnswer !== 'object' || !question.sections) return false;
            const section = question.sections[answerIndex];
            if (!section) return false;
            const sectionKey = typeof section === 'object' ? section.section : section;
            const correctMap = reviewMap ? (getCorrectFromReview() || {}) : (getCorrectAnswerTextForScoring(question, readingId) || {});
            const correctValue = correctMap[sectionKey];
            const userValue = userAnswer[sectionKey];
            if (correctValue === undefined) return false;
            // If the canonical correct value is a short token (single letter like 'A' or roman numeral like 'iv'),
            // the userValue may be the full heading text (or include the token). Try extracting a comparable token first.
            const token = typeof correctValue === 'string' ? String(correctValue).replace(/\./g, '').trim() : String(correctValue);
            const isRoman = /^[ivxlcdm]+$/i.test(token);
            const isSingleLetter = /^[A-Za-z]$/.test(token);

            if ((isRoman || isSingleLetter) && userValue && typeof userValue === 'string') {
                // Try to extract a trailing token (e.g., "Heading iv" or "... iv.") or a leading token ("iv. Heading")
                const trailing = userValue.trim().match(/([A-Za-z]|[ivxlcdm]{1,4})\.?$/i)?.[1];
                const leading = userValue.trim().match(/^([A-Za-z]|[ivxlcdm]{1,4})\.?/i)?.[1];
                const extracted = (trailing || leading || '').toString().trim();
                if (extracted) {
                    return normalizeText(extracted) === normalizeText(token);
                }
            }

            // Fallback: compare normalized texts
            return normalizeText(userValue) === normalizeText(correctValue);
        }

        case 'matching_information': {
            if (typeof userAnswer !== 'object' || !question.information) return false;
            const item = question.information[answerIndex];
            if (!item) return false;
            const itemKey = typeof item === 'object' ? item.info : item;
            const correctMap = reviewMap ? (getCorrectFromReview() || {}) : (getCorrectAnswerTextForScoring(question, readingId) || {});
            const correctValue = correctMap[itemKey];
            const userValue = userAnswer[itemKey];
            
            // For matching_information questions, the correct answer is a letter (A, B, C, etc.)
            // but the user answer is the full text (e.g., "Paragraph A")
            // We need to extract the letter from the user's answer and compare it with the correct answer
            let isCorrect = false;
            if (correctValue && userValue) {
                // Extract letter from user response (e.g., "Paragraph A" -> "A")
                const userLetter = userValue.match(/[A-Z]$/)?.[0];
                isCorrect = userLetter === correctValue;
            }
            
            return isCorrect;
        }

        case 'matching_people': {
            if (typeof userAnswer !== 'object' || !question.statements) return false;
            const statement = question.statements[answerIndex];
            if (!statement) return false;
            const correctMap = reviewMap ? (getCorrectFromReview() || {}) : (getCorrectAnswerTextForScoring(question, readingId) || {});
            const correctValue = correctMap[statement];
            const userValue = userAnswer[statement];
            if (correctValue === undefined) return false;

            if (!correctValue || !userValue) return false;
            const userLetter = String(userValue).trim().match(/[A-Za-z]$/)?.[0];
            const correctLetter = String(correctValue).trim().match(/[A-Za-z]$/)?.[0];
            return normalizeText(userLetter) === normalizeText(correctLetter);
        }

        case 'matching_features': {
            if (typeof userAnswer !== 'object' || !question.features) return false;
            const feature = question.features[answerIndex];
            if (!feature) return false;
            const featureId = getFeatureId(typeof feature === 'string' ? feature : feature?.id || feature);
            const correctMap = reviewMap ? (getCorrectFromReview() || {}) : (getCorrectAnswerTextForScoring(question, readingId) || {});
            const correctValue = correctMap[featureId];
            const userValue = userAnswer[featureId];
            if (correctValue === undefined) return false;
            
            // For matching_features questions, the correct answer is a letter (A, B, C, etc.)
            // but the user answer is the full text (e.g., "A. the Ancient Greeks")
            // We need to extract the letter from the user's answer and compare it with the correct answer
            let isCorrect = false;
            if (correctValue && userValue) {
                // Extract letter from user response (e.g., "A. the Ancient Greeks" -> "A")
                const userLetter = userValue.match(/^[A-Z]/)?.[0];
                isCorrect = userLetter === correctValue;
            }
            
            return isCorrect;
        }

        case 'short_answer': {
            // Multi-question short answers map by sub-question prompt; single uses options
            if (question.instruction && Array.isArray(question.questions)) {
                if (typeof userAnswer !== 'object' || userAnswer === null) return false;
                const subQuestion = question.questions[answerIndex];
                if (!subQuestion) return false;
                const correctMap = reviewMap ? (getCorrectFromReview() || {}) : (getCorrectAnswerTextForScoring(question, readingId) || {});
                const correctValue = correctMap[subQuestion];
                const userValue = userAnswer[subQuestion];
                if (correctValue === undefined) return false;
                return checkAnswerVariants(userValue, correctValue);
            }
            return checkAnswer(question, userAnswer, readingId);
        }

        case 'sentence_completion': {
            if (typeof userAnswer !== 'object' || !question.sentences) return false;
            const sentence = question.sentences[answerIndex];
            if (!sentence) return false;
            const sentenceKey = getItemKey(sentence, 'beginning');
            const correctMap = reviewMap ? (getCorrectFromReview() || {}) : (getCorrectAnswerTextForScoring(question, readingId) || {});
            const correctValue = correctMap[sentenceKey];
            const userValue = userAnswer[sentenceKey];
            if (correctValue === undefined) return false;
            
            // For sentence_completion questions, the correct answer is a letter (A, B, C, etc.)
            // but the user answer is the full text (e.g., "A. text...")
            // We need to extract the letter from the user's answer and compare it with the correct answer
            let isCorrect = false;
            if (correctValue && userValue) {
                // Extract letter from user response (e.g., "A. text..." -> "A")
                const userLetter = userValue.match(/^[A-Z]/)?.[0];
                isCorrect = userLetter === correctValue;
            }
            
            return isCorrect;
        }

        case 'summary_completion': {
            if (typeof userAnswer !== 'object' || !question.summary) return false;
            const blankNumber = findBlankNumberByIndex(question.summary, answerIndex);
            if (!blankNumber) return false;
            const correctMap = reviewMap ? (getCorrectFromReview() || {}) : (getCorrectAnswerTextForScoring(question, readingId) || {});
            const correctValue = correctMap[blankNumber];
            const userValue = userAnswer[blankNumber];
            if (correctValue === undefined) return false;
            return checkAnswerVariants(userValue, correctValue);
        }

        case 'flow_chart_completion': {
            if (typeof userAnswer !== 'object' || !question.flow_chart) return false;
            const blankNumber = findBlankNumberByIndex(question.flow_chart, answerIndex);
            if (!blankNumber) return false;
            const correctMap = reviewMap ? (getCorrectFromReview() || {}) : (getCorrectAnswerTextForScoring(question, readingId) || {});
            const correctValue = correctMap[blankNumber];
            const userValue = userAnswer[blankNumber];
            if (correctValue === undefined) return false;
            return checkAnswerVariants(userValue, correctValue);
        }

        case 'table_completion': {
            if (typeof userAnswer !== 'object' || !question.table) return false;
            const blankId = findTableBlankByIndex(question.table, answerIndex);
            if (!blankId) return false;
            const correctMap = reviewMap ? (getCorrectFromReview() || {}) : (getCorrectAnswerTextForScoring(question, readingId) || {});
            const correctValue = correctMap[blankId];
            const userValue = userAnswer[blankId];
            if (correctValue === undefined) return false;
            return checkAnswerVariants(userValue, correctValue);
        }

        case 'note_completion': {
            if (typeof userAnswer !== 'object' || !question.notes) return false;
            const blankId = findNoteBlankByIndex(question.notes, answerIndex);
            if (!blankId) return false;
            const correctMap = reviewMap ? (getCorrectFromReview() || {}) : (getCorrectAnswerTextForScoring(question, readingId) || {});
            const correctValue = correctMap[blankId];
            const userValue = userAnswer[blankId];
            if (correctValue === undefined) return false;
            return checkAnswerVariants(userValue, correctValue);
        }

        case 'diagram_labelling': {
            if (typeof userAnswer !== 'object' || !question.labels) return false;
            const label = question.labels[answerIndex];
            if (!label) return false;
            const positionKey = label.position;
            const correctMap = reviewMap ? (getCorrectFromReview() || {}) : (getCorrectAnswerTextForScoring(question, readingId) || {});
            const correctValue = correctMap[positionKey];
            const userValue = userAnswer[positionKey];
            if (correctValue === undefined) return false;
            return checkAnswerVariants(userValue, correctValue);
        }

        default:
            // Fallback: single-slot correctness
            return checkAnswer(question, userAnswer, readingId);
    }
};