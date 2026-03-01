import { useTranslation } from 'react-i18next';
import { isSpecificSlotCorrect } from '../reading/[id]/helpers/questionUtils';
import './ProgressBar.scss';

// Utility function to count individual answers required for a question
const getQuestionAnswerCount = (question) => {
    if (!question) return 1;
    
    switch (question.type) {
        case 'multiple_choice':
        case 'true_false':
        case 'true_false_not_given':
        case 'yes_no_not_given':
            return 1;
            
        case 'multiple_choice_multiple':
            // Count the number of correct answers expected
            // First try to get from correct properties in options
            const correctFromOptions = question.options?.filter(opt => opt.correct)?.length;
            if (correctFromOptions > 0) {
                return correctFromOptions;
            }
            // If no correct properties, try to parse from instruction
            if (question.instruction) {
                const match = question.instruction.match(/(?:Choose\s+)?(\w+)\s+(?:letters?|answers?|options?)/i);
                if (match) {
                    const numberWord = match[1].toLowerCase();
                    const numberMap = {
                        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 
                        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
                    };
                    const parsedNumber = numberMap[numberWord] || parseInt(numberWord);
                    if (parsedNumber && !isNaN(parsedNumber)) {
                        return parsedNumber;
                    }
                }
            }
            return 3; // Default fallback
            
        case 'matching_headings':
            return question.sections?.length || 1;
            
        case 'matching_information':
            return question.information?.length || 1;
            
        case 'matching_features':
            return question.features?.length || 1;
            
        case 'sentence_completion':
            return question.sentences?.length || 1;
            
        case 'summary_completion':
        case 'table_completion':
        case 'flow_chart_completion':
        case 'note_completion':
            if (question.type === 'summary_completion' && question.summary) {
                // For summary completion, count blanks in the summary text
                const blankMatches = question.summary.match(/___(\d+)___/g) || [];
                return blankMatches.length;
            } else if (question.type === 'table_completion' && question.table) {
                // For table completion, count blanks in the table
                return question.table.rows.reduce((count, row) => {
                    return count + Object.values(row).filter(cell => cell.includes('___')).length;
                }, 0);
            } else if (question.type === 'flow_chart_completion' && question.flow_chart) {
                // For flow chart completion, count blanks in the flow chart
                if (question.flow_chart.type === 'vertical' && question.flow_chart.steps) {
                    // New vertical format: count blanks from steps
                    let blankCount = 0;
                    question.flow_chart.steps.forEach(step => {
                        if (step.blank) blankCount++;
                        if (step.blank2) blankCount++;
                    });
                    return blankCount;
                } else if (typeof question.flow_chart === 'string') {
                    // Legacy string format: count blanks using regex
                    const blankMatches = question.flow_chart.match(/___(\d+)___/g) || [];
                    return blankMatches.length;
                }
                return 1;
            } else if (question.type === 'note_completion' && question.notes) {
                // For note completion, count blanks in all notes
                let totalBlanks = 0;
                question.notes.forEach((note) => {
                    // Handle both formats: ___NUMBER___ and NUMBER..........
                    const blankMatches = note.match(/(?:___(\d+)___|(\d+)\.{2,})/g) || [];
                    totalBlanks += blankMatches.length;
                });
                return totalBlanks;
            }
            return question.answers?.length || 1;
            
        case 'diagram_labelling':
            return question.labels?.length || 1;
            
        case 'short_answer':
            // Check if this is a multi-question short answer
            if (question.instruction && question.questions && Array.isArray(question.questions)) {
                return question.questions.length;
            }
            return 1;
            
        default:
            return 1;
    }
};

// Utility function to count how many individual answers have been provided for a question
const getProvidedAnswerCount = (answer, question) => {
    if (!answer || !question) return 0;
    
    switch (question.type) {
        case 'multiple_choice':
        case 'true_false':
        case 'true_false_not_given':
        case 'yes_no_not_given':
            return answer ? 1 : 0;
            
        case 'multiple_choice_multiple':
            return Array.isArray(answer) ? answer.length : 0;
            
        case 'matching_headings':
            if (typeof answer === 'object' && answer !== null) {
                return Object.values(answer).filter(val => val && val !== '').length;
            }
            return 0;
            
        case 'matching_information':
            if (typeof answer === 'object' && answer !== null) {
                return Object.values(answer).filter(val => val && val !== '').length;
            }
            return 0;
            
        case 'matching_features':
            if (typeof answer === 'object' && answer !== null) {
                return Object.values(answer).filter(val => val && val !== '').length;
            }
            return 0;
            
        case 'sentence_completion':
            if (typeof answer === 'object' && answer !== null) {
                return Object.values(answer).filter(val => val && val !== '').length;
            }
            return 0;
            
        case 'summary_completion':
        case 'table_completion':
        case 'flow_chart_completion':
        case 'note_completion':
            if (typeof answer === 'object' && answer !== null) {
                if (question.type === 'summary_completion' && question.summary) {
                    // For summary completion, extract blank numbers from the summary text
                    const blankMatches = question.summary.match(/___(\d+)___/g) || [];
                    const requiredBlanks = blankMatches.length;
                    const answeredBlanks = Object.values(answer).filter(val => val && val.trim() !== '').length;
                    return answeredBlanks;
                } else if (question.type === 'table_completion' && question.table) {
                    // For table completion, count the total number of blanks in the table
                    const totalBlanks = question.table.rows.reduce((count, row) => {
                        return count + Object.values(row).filter(cell => cell.includes('___')).length;
                    }, 0);
                    const answeredBlanks = Object.values(answer).filter(val => val && val.trim() !== '').length;
                    return answeredBlanks;
                } else if (question.type === 'flow_chart_completion' && question.flow_chart) {
                    // For flow chart completion, extract blank numbers from the flow chart
                    let requiredBlanks = 0;
                    if (question.flow_chart.type === 'vertical' && question.flow_chart.steps) {
                        // New vertical format: count blanks from steps
                        question.flow_chart.steps.forEach(step => {
                            if (step.blank) requiredBlanks++;
                            if (step.blank2) requiredBlanks++;
                        });
                    } else if (typeof question.flow_chart === 'string') {
                        // Legacy string format: count blanks using regex
                        const blankMatches = question.flow_chart.match(/___(\d+)___/g) || [];
                        requiredBlanks = blankMatches.length;
                    }
                    const answeredBlanks = Object.values(answer).filter(val => val && val.trim() !== '').length;
                    return answeredBlanks;
                } else if (question.type === 'note_completion' && question.notes) {
                    // For note completion, count answered blanks across all notes
                    const answeredBlanks = Object.values(answer).filter(val => val && val.trim() !== '').length;
                    return answeredBlanks;
                }
            }
            return 0;
            
        case 'diagram_labelling':
            if (typeof answer === 'object' && answer !== null) {
                return Object.values(answer).filter(val => val && val !== '').length;
            }
            return 0;
            
        case 'short_answer':
            // Check if this is a multi-question short answer
            if (question.instruction && question.questions && Array.isArray(question.questions)) {
                if (typeof answer === 'object' && answer !== null) {
                    return Object.values(answer).filter(val => val && val.trim() !== '').length;
                }
                return 0;
            }
            return answer ? 1 : 0;
            
        default:
            if (typeof answer === 'object' && answer !== null) {
                return Object.values(answer).filter(val => val !== undefined && val !== null && val !== '').length;
            } else if (Array.isArray(answer)) {
                return answer.length;
            }
            return answer ? 1 : 0;
    }
};

// Utility function to check if an answer exists (consistent with Question component logic)
const hasValidAnswer = (answer, question) => {
    // Handle undefined, null, or empty string
    if (answer === undefined || answer === null || answer === '') {
        return false;
    }
    
    // If no question provided, fall back to basic check
    if (!question) {
        if (Array.isArray(answer)) {
            return answer.length > 0;
        }
        if (typeof answer === 'object' && answer !== null) {
            return Object.values(answer).some(val => val !== undefined && val !== null && val !== '');
        }
        return true;
    }
    
    // Use the same logic as Question component's hasAnswer calculation
    if (question.type === 'short_answer') {
        // Check if this is a multi-question short answer
        if (question.instruction && question.questions && Array.isArray(question.questions)) {
            // For multi-question short answers, check if ALL sub-questions have been answered
            if (typeof answer === 'object' && answer !== null) {
                const requiredQuestions = question.questions.length;
                const answeredQuestions = Object.values(answer).filter(val => val && val.trim() !== '').length;
                return answeredQuestions === requiredQuestions;
            }
            return false;
        } else {
            // Single question short answer
            return !!answer;
        }
    }
    
    const basicTypes = ['multiple_choice', 'true_false'];
    
    if (basicTypes.includes(question.type)) {
        return !!answer;
    } else if (question.type === 'multiple_choice_multiple') {
        // For multiple choice multiple, check if user selected the required number of answers
        if (Array.isArray(answer)) {
            const requiredCount = question.options?.filter(opt => opt.correct)?.length || 0;
            return answer.length === requiredCount;
        }
        return false;
    } else if (question.type === 'matching_headings') {
        // For matching headings, check if ALL sections have been answered
        if (typeof answer === 'object' && answer !== null && question.sections) {
            const requiredSections = question.sections.length;
            const answeredSections = Object.values(answer).filter(val => val && val !== '').length;
            return answeredSections === requiredSections;
        }
        return false;
    } else if (question.type === 'matching_information') {
        // For matching information, check if ALL information items have been answered
        if (typeof answer === 'object' && answer !== null && question.information) {
            const requiredItems = question.information.length;
            const answeredItems = Object.values(answer).filter(val => val && val !== '').length;
            return answeredItems === requiredItems;
        }
        return false;
    } else if (question.type === 'matching_features') {
        // For matching features, check if ALL features have been answered
        if (typeof answer === 'object' && answer !== null && question.features) {
            const requiredFeatures = question.features.length;
            const answeredFeatures = Object.values(answer).filter(val => val && val !== '').length;
            return answeredFeatures === requiredFeatures;
        }
        return false;
    } else if (question.type === 'sentence_completion') {
        // For sentence completion, check if ALL sentences have been completed
        if (typeof answer === 'object' && answer !== null && question.sentences) {
            const requiredSentences = question.sentences.length;
            const answeredSentences = Object.values(answer).filter(val => val && val !== '').length;
            return answeredSentences === requiredSentences;
        }
        return false;
    } else if (question.type === 'diagram_labelling') {
        // For diagram labelling, check if ALL labels have been filled
        if (typeof answer === 'object' && answer !== null && question.labels) {
            const requiredLabels = question.labels.length;
            const providedAnswers = Object.values(answer).filter(val => val && val !== '').length;
            return providedAnswers === requiredLabels;
        }
        return false;
    } else if (question.type === 'summary_completion') {
        // For summary completion, check if ALL blanks have been filled
        if (typeof answer === 'object' && answer !== null && question.summary) {
            const blankMatches = question.summary.match(/___(\d+)___/g) || [];
            const requiredBlanks = blankMatches.length;
            const providedAnswers = Object.values(answer).filter(val => val && val.trim() !== '').length;
            return providedAnswers === requiredBlanks;
        }
        return false;
    } else if (question.type === 'note_completion') {
        // For note completion, check if ALL blanks have been filled
        if (typeof answer === 'object' && answer !== null && question.notes) {
            let requiredBlanks = 0;
            question.notes.forEach((note) => {
                // Handle both formats: ___NUMBER___ and NUMBER..........
                const blankMatches = note.match(/(?:___(\d+)___|(\d+)\.{2,})/g) || [];
                requiredBlanks += blankMatches.length;
            });
            const providedAnswers = Object.values(answer).filter(val => val && val.trim() !== '').length;
            return providedAnswers === requiredBlanks;
        }
        return false;
    } else if (['table_completion', 'flow_chart_completion'].includes(question.type)) {
        // For other completion types, check if ALL blanks have been filled
        if (typeof answer === 'object' && answer !== null && question.answers) {
            const requiredAnswers = question.answers.length;
            const providedAnswers = Object.values(answer).filter(val => val && val !== '').length;
            return providedAnswers === requiredAnswers;
        }
        return false;
    } else if (question.type === 'true_false_not_given' || question.type === 'yes_no_not_given') {
        return !!answer;
    } else {
        // For other complex types, check if any answers exist (fallback)
        if (typeof answer === 'object' && answer !== null) {
            return Object.values(answer).some(val => val !== undefined && val !== null && val !== '');
        } else if (Array.isArray(answer)) {
            return answer.length > 0;
        }
        return !!answer;
    }
};

// Utility function to check if a specific answer slot is answered
const isSpecificSlotAnswered = (userAnswer, question, answerSlot) => {
    if (!userAnswer || !question) return false;
    
    if (question.type === 'short_answer' && question.questions && Array.isArray(question.questions)) {
        // For multi-question short answers, check if the specific sub-question is answered
        const subQuestion = question.questions[answerSlot.answerIndex];
        if (subQuestion && typeof userAnswer === 'object') {
            return !!(userAnswer[subQuestion] && userAnswer[subQuestion].trim() !== '');
        }
    } else if (question.type === 'multiple_choice_multiple') {
        // For multiple choice multiple, check if the specific option is selected
        if (Array.isArray(userAnswer)) {
            // For multiple choice multiple, check if the specific answer slot is answered
            // Each slot represents one of the required answers
            let expectedCount = 3; // Default
            if (question.instruction) {
                const match = question.instruction.match(/(?:Choose\s+)?(\w+)\s+(?:letters?|answers?|options?)/i);
                if (match) {
                    const numberWord = match[1].toLowerCase();
                    const numberMap = {
                        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 
                        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
                    };
                    expectedCount = numberMap[numberWord] || parseInt(numberWord) || 3;
                }
            }
            
            // Check if user has selected enough answers to cover this specific slot
            if (userAnswer.length > answerSlot.answerIndex) {
                // User has selected enough answers to cover this slot
                return true;
            }
            
            // Fallback: check if user has selected the expected number of answers
            return userAnswer.length === expectedCount;
        }
        return false;
    } else if (question.type === 'matching_headings' && question.sections) {
        // For matching headings, check if the specific section is answered
        const section = question.sections[answerSlot.answerIndex];
        if (section && typeof userAnswer === 'object') {
            // Handle both old structure (object with section property) and new structure (simple string)
            const sectionKey = typeof section === 'object' ? section.section : section;
            return !!(userAnswer[sectionKey] && userAnswer[sectionKey] !== '');
        }
    } else if (question.type === 'matching_information' && question.information) {
        // For matching information, check if the specific item is answered
        const item = question.information[answerSlot.answerIndex];
        if (item && typeof userAnswer === 'object') {
            // Handle both old structure (object with info property) and new structure (simple string)
            const itemKey = typeof item === 'object' ? item.info : item;
            return !!(userAnswer[itemKey] && userAnswer[itemKey] !== '');
        }
    } else if (question.type === 'matching_features' && question.features) {
        // For matching features, check if the specific feature is answered
        const feature = question.features[answerSlot.answerIndex];
        if (feature && typeof userAnswer === 'object') {
            // Extract feature ID from the feature string (e.g., "27. disagreed with..." -> "27")
            const featureId = feature.slice(0, feature.indexOf("."));
            return !!(userAnswer[featureId] && userAnswer[featureId] !== '');
        }
    } else if (question.type === 'sentence_completion' && question.sentences) {
        // For sentence completion, check if the specific sentence is answered
        const sentence = question.sentences[answerSlot.answerIndex];
        if (sentence && typeof userAnswer === 'object') {
            // Handle both old structure (object with beginning property) and new structure (simple string)
            const sentenceKey = typeof sentence === 'object' ? sentence.beginning : sentence;
            return !!(userAnswer[sentenceKey] && userAnswer[sentenceKey] !== '');
        }
    } else if (question.type === 'summary_completion' && question.summary) {
        // For summary completion, check if the specific blank is answered
        const blankMatches = question.summary.match(/___(\d+)___/g) || [];
        if (blankMatches[answerSlot.answerIndex]) {
            const blankNumber = blankMatches[answerSlot.answerIndex].match(/\d+/)[0];
            if (typeof userAnswer === 'object') {
                return !!(userAnswer[blankNumber] && userAnswer[blankNumber].trim() !== '');
            }
        }
    } else if (question.type === 'note_completion' && question.notes) {
        // For note completion, check if the specific blank is answered
        let blankIndex = 0;
        for (let noteIndex = 0; noteIndex < question.notes.length; noteIndex++) {
            const note = question.notes[noteIndex];
            // Handle both formats: ___NUMBER___ and NUMBER..........
            const blankMatches = note.match(/(?:___(\d+)___|(\d+)\.{2,})/g) || [];
            for (const match of blankMatches) {
                if (blankIndex === answerSlot.answerIndex) {
                    // Extract the number from either format
                    const numberMatch = match.match(/(\d+)/);
                    if (numberMatch) {
                        const blankId = numberMatch[1];
                        if (typeof userAnswer === 'object') {
                            return !!(userAnswer[blankId] && userAnswer[blankId].trim() !== '');
                        }
                    }
                }
                blankIndex++;
            }
        }
    } else if (question.type === 'table_completion' && question.table) {
        // For table completion, check if the specific blank is answered
        // Extract blank numbers from table rows in order
        let blankIndex = 0;
        for (let rowIndex = 0; rowIndex < question.table.rows.length; rowIndex++) {
            const row = question.table.rows[rowIndex];
            for (const header of question.table.headers) {
                const cellValue = row[header];
                const blankMatch = cellValue?.match(/___(\d+)___/);
                if (blankMatch) {
                    if (blankIndex === answerSlot.answerIndex) {
                        const blankId = blankMatch[1];
                        if (typeof userAnswer === 'object') {
                            return !!(userAnswer[blankId] && userAnswer[blankId].trim() !== '');
                        }
                    }
                    blankIndex++;
                }
            }
        }
    } else if (question.type === 'flow_chart_completion' && question.flow_chart) {
        // For flow chart completion, check if the specific blank is answered
        if (question.flow_chart.type === 'vertical' && question.flow_chart.steps) {
            // New vertical format: find blank by index
            let blankIndex = 0;
            for (const step of question.flow_chart.steps) {
                if (step.blank) {
                    if (blankIndex === answerSlot.answerIndex) {
                        return !!(userAnswer[step.blank] && userAnswer[step.blank] !== '');
                    }
                    blankIndex++;
                }
                if (step.blank2) {
                    if (blankIndex === answerSlot.answerIndex) {
                        return !!(userAnswer[step.blank2] && userAnswer[step.blank2] !== '');
                    }
                    blankIndex++;
                }
            }
        } else if (typeof question.flow_chart === 'string') {
            // Legacy string format: use regex matching
            const blankMatch = question.flow_chart.match(/___(\d+)___/g);
            if (blankMatch && blankMatch[answerSlot.answerIndex]) {
                const blankNumber = blankMatch[answerSlot.answerIndex].match(/\d+/)[0];
                if (typeof userAnswer === 'object') {
                    return !!(userAnswer[blankNumber] && userAnswer[blankNumber] !== '');
                }
            }
        }
    } else if (question.type === 'diagram_labelling' && question.labels) {
        // For diagram labelling, check if the specific label is answered
        const label = question.labels[answerSlot.answerIndex];
        if (label && typeof userAnswer === 'object') {
            return !!(userAnswer[label.position] && userAnswer[label.position] !== '');
        }
    } else {
        // For single-answer questions, check if any answer is provided
        return getProvidedAnswerCount(userAnswer, question) > 0;
    }
    
    return false;
};

const ProgressBar = ({ 
    answered, 
    total, 
    userAnswers = {}, 
    onQuestionClick, 
    questions = [], 
    currentPassageId = null, 
    passageData = null,
    passageNavigation = null,
    // review mode context
    isReviewMode = false,
    readingId = null,
    difficulty = null,
    reviewMap = null,
    isMockFullscreenLike = false
}) => {
    const { t } = useTranslation('reading');

    // Create individual answer slots for navigation
    const individualAnswerSlots = [];
    let sequentialIndex = 1;
    
    if (questions.length > 0) {
        const calculatedTotal = questions.reduce((sum, question) => sum + getQuestionAnswerCount(question), 0);
        
        questions.forEach(question => {
            const answerCount = getQuestionAnswerCount(question);
            for (let i = 0; i < answerCount; i++) {
                individualAnswerSlots.push({
                    sequentialNumber: sequentialIndex++,
                    questionId: question.id,
                    questionType: question.type,
                    answerIndex: i,
                    question: question
                });
            }
        });
        
        // Add placeholder slots if total indicates more answers should exist
        while (individualAnswerSlots.length < total) {
            individualAnswerSlots.push({
                sequentialNumber: individualAnswerSlots.length + 1,
                questionId: -1, // Placeholder for missing question
                questionType: 'placeholder',
                answerIndex: 0,
                question: null
            });
        }
    } else {
        // Fallback for when questions array is empty
        for (let i = 0; i < total; i++) {
            individualAnswerSlots.push({
                sequentialNumber: i + 1,
                questionId: i + 1,
                questionType: 'unknown',
                answerIndex: 0,
                question: null
            });
        }
    }

    // Handle question number click (using actual question ID and answer slot info)
    const handleQuestionClick = (answerSlot) => {
        if (onQuestionClick) {
            // For completion questions, we need to pass the specific blank information
            if (answerSlot.questionType === 'note_completion' && answerSlot.question) {
                // Find the specific blank ID for this answer slot
                let blankIndex = 0;
                for (let noteIndex = 0; noteIndex < answerSlot.question.notes.length; noteIndex++) {
                    const note = answerSlot.question.notes[noteIndex];
                    // Handle both formats: ___NUMBER___ and NUMBER..........
                    const blankMatches = note.match(/(?:___(\d+)___|(\d+)\.{2,})/g) || [];
                    for (const match of blankMatches) {
                        if (blankIndex === answerSlot.answerIndex) {
                            // Extract the number from either format
                            const numberMatch = match.match(/(\d+)/);
                            if (numberMatch) {
                                const blankId = numberMatch[1];
                                onQuestionClick(answerSlot.questionId, blankId);
                                return;
                            }
                        }
                        blankIndex++;
                    }
                }
            }
            
            // For other question types, just pass the question ID
            onQuestionClick(answerSlot.questionId);
        }
    };

    // Handle keyboard navigation
    const handleKeyDown = (event, answerSlot) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleQuestionClick(answerSlot);
        }
    };

    // Create a map of answered question IDs
    const answeredQuestionIds = new Set();
    
    // Use actual question IDs to check if they're answered
    if (questions && questions.length > 0) {
        questions.forEach((question) => {
            if (hasValidAnswer(userAnswers[question.id], question)) {
                answeredQuestionIds.add(question.id);
            }
        });
    } else {
        // Fallback: assume userAnswers keys are question IDs (without question type info)
        Object.keys(userAnswers).forEach(key => {
            const questionId = parseInt(key);
            if (!isNaN(questionId) && hasValidAnswer(userAnswers[key])) {
                answeredQuestionIds.add(questionId);
            }
        });
    }

    // Check if a question is answered (using actual question ID)
    const isQuestionAnswered = (actualQuestionId) => {
        return answeredQuestionIds.has(actualQuestionId);
    };

    // Determine which passage a question belongs to (for multi-passage tests)
    const getQuestionPassageInfo = (actualQuestionId) => {
        if (!passageData || !currentPassageId) return { passageId: null, isCurrentPassage: true };
        
        for (const passage of passageData) {
            if (passage.questions?.some(q => q.id === actualQuestionId)) {
                return {
                    passageId: passage.passage_id,
                    isCurrentPassage: passage.passage_id === currentPassageId,
                    passageTitle: passage.title
                };
            }
        }
        return { passageId: null, isCurrentPassage: true };
    };

    // Calculate actual total excluding placeholders
    const actualTotal = individualAnswerSlots.filter(slot => slot.questionId !== -1).length;
    
    return (
        <div className={`progress-container ${isMockFullscreenLike ? 'mock-fullscreen-like' : ''}`}>
            {passageNavigation ? (
                <div className="progress-header">
                    {passageNavigation}
                </div>
            ) : (
                <div className="progress-header">
                    <span className="progress-text">{answered} / {actualTotal} {t('answers', 'answers')}</span>
                    {passageData && currentPassageId && (
                        <span className="current-passage-indicator">
                            {t('currentPassage', 'Current Passage')}: {currentPassageId}
                        </span>
                    )}
                </div>
            )}
            
            {/* Answer Numbers Only */}
            <div className="question-numbers-container">
                <div className={`question-numbers ${isMockFullscreenLike ? 'mock-fullscreen-like' : ''}`}>
                    {individualAnswerSlots.map((answerSlot) => {
                        const { sequentialNumber, questionId, question } = answerSlot;
                        
                        // Handle placeholder slots for missing questions
                        if (questionId === -1) {
                            return (
                                <button
                                    key={`placeholder-${sequentialNumber}`}
                                    className="question-number unanswered placeholder"
                                    disabled={true}
                                    title={`Answer ${sequentialNumber} - ${t('notAvailable', 'Not available')}`}
                                    type="button"
                                >
                                    {sequentialNumber}
                                </button>
                            );
                        }
                        
                        const userAnswer = userAnswers[questionId];
                        
                        // Check if this specific individual answer is provided
                        let isAnswered = false;
                        
                        if (question && userAnswer) {
                            isAnswered = isSpecificSlotAnswered(userAnswer, question, answerSlot);
                        }
                        
                        const passageInfo = getQuestionPassageInfo(questionId);

                        // Review-mode correctness
                        let reviewClass = '';
                        if (isReviewMode && question) {
                            const rid = ['b2','c1','c2'].includes((difficulty || '').toLowerCase()) ? readingId : null;
                            const isCorrect = isSpecificSlotCorrect(userAnswer, question, answerSlot, rid, reviewMap);
                            reviewClass = isAnswered ? (isCorrect ? 'correct' : 'incorrect') : '';
                        }
                        
                        return (
                            <button
                                key={`answer-${sequentialNumber}`}
                                className={`question-number ${isAnswered ? 'answered' : 'unanswered'} ${passageInfo.isCurrentPassage ? 'current-passage' : 'other-passage'} ${passageInfo.passageId ? `passage-${passageInfo.passageId}` : ''} ${reviewClass}`}
                                title={`Answer ${sequentialNumber} (Question ${questionId}) - ${isAnswered ? t('completed') : t('unanswered')}${passageInfo.passageId ? ` (Passage ${passageInfo.passageId})` : ''}`}
                                onClick={() => handleQuestionClick(answerSlot)}
                                onKeyDown={(e) => handleKeyDown(e, answerSlot)}
                                aria-label={t('answerNavigation', { 
                                    status: isAnswered ? t('completed') : t('unanswered'), 
                                    number: sequentialNumber,
                                    questionNumber: questionId
                                })}
                                type="button"
                            >
                                {sequentialNumber}
                                {isAnswered && (
                                    <span className="checkmark" aria-hidden="true">✓</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ProgressBar;