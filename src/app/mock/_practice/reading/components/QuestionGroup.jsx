'use client';

import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BsCheckCircle, BsCircle } from 'react-icons/bs';
import QuestionComponent from './Question';

// Check if question type displays its own content that would duplicate the main question text
const shouldSuppressQuestionText = (question) => {
    const typesWithOwnContent = [
        'true_false_not_given',     // Shows question.statement
        'yes_no_not_given',         // Shows question.statement  
        'matching_headings',        // Shows question.instruction
        'matching_information',     // Shows question.instruction
        'matching_features',        // Shows question.instruction
        'matching_sentences',       // Shows question.instruction + bank/options
        'sentence_completion',      // Shows question.instruction
        'summary_completion',       // Shows question.instruction
        'table_completion',         // Shows question.instruction
        'flow_chart_completion',    // Shows question.instruction
        'diagram_labelling',        // Shows question.instruction
        'advanced_short_answer'     // Shows question.instruction
    ];
    
    // Also suppress for multi-question short_answer types since they show their own instruction
    if (question.type === 'short_answer' && question.instruction && question.questions && Array.isArray(question.questions)) {
        return true;
    }
    
    return typesWithOwnContent.includes(question.type);
};

const QuestionGroup = memo(({ 
    questions, 
    userAnswers, 
    onAnswerChange, 
    isReviewMode, 
    questionRanges, 
    readingId, 
    difficulty,
    reviewMap,
    inlinePickedOption = null,
    onInlinePickOptionChange = () => {}
}) => {
    const { t } = useTranslation('reading');
    
    if (!questions || questions.length === 0) {
        return null;
    }

    const questionType = questions[0].type;
    const firstQuestion = questions[0];
    
    // Get the question range for the entire group
    const groupRange = {
        start: questionRanges[questions[0].id]?.start || questions[0].id,
        end: questionRanges[questions[questions.length - 1].id]?.end || questions[questions.length - 1].id
    };

    const groupDisplayNumber = useMemo(() => {
        const startValue = groupRange?.start;
        const endValue = groupRange?.end;

        if (startValue != null && endValue != null && endValue !== startValue) {
            return `${startValue}-${endValue}`;
        }

        if (startValue != null) {
            return String(startValue);
        }

        const fallbackId = questions[0]?.id;
        return fallbackId != null ? String(fallbackId) : '';
    }, [groupRange?.end, groupRange?.start, questions]);

    const groupNumberVariant = useMemo(() => {
        if (!groupDisplayNumber) {
            return '';
        }

        return /^\d$/.test(groupDisplayNumber) ? 'single-digit' : 'range-number';
    }, [groupDisplayNumber]);

    // Check if all questions have the same instruction text
    const hasRepeatedInstructions = useMemo(() => {
        // Only check for true_false_not_given and yes_no_not_given types
        if (questionType !== 'true_false_not_given' && questionType !== 'yes_no_not_given') {
            return false;
        }

        if (questions.length <= 1) {
            return false;
        }

        const firstInstruction = questionType === 'true_false_not_given' 
            ? t('trueFalseNotGiven.instruction')
            : t('yesNoNotGiven.instruction');

        // Check if all questions would have the same instruction
        return questions.every(question => {
            const questionInstruction = question.type === 'true_false_not_given' 
                ? t('trueFalseNotGiven.instruction')
                : t('yesNoNotGiven.instruction');
            return questionInstruction === firstInstruction;
        });
    }, [questions, questionType, t]);

    // Check if all questions in the group have been answered
    const hasAllAnswers = questions.every(question => {
        const answer = userAnswers[question.id];
        if (!answer) return false;
        
        // Basic check for different question types
        if (question.type === 'short_answer') {
            if (question.instruction && question.questions && Array.isArray(question.questions)) {
                // Multi-question short answer
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
        
        // Handle completion questions that require ALL blanks to be filled
        if (question.type === 'flow_chart_completion') {
            if (typeof answer === 'object' && answer !== null && question.flow_chart) {
                let totalBlanks = 0;
                if (question.flow_chart.type === 'vertical' && question.flow_chart.steps) {
                    // New vertical format: count blanks from steps
                    question.flow_chart.steps.forEach(step => {
                        if (step.blank) totalBlanks++;
                        if (step.blank2) totalBlanks++;
                    });
                } else if (typeof question.flow_chart === 'string') {
                    // Legacy string format: use regex matching
                    const blankMatches = question.flow_chart.match(/___(\d+)___/g) || [];
                    totalBlanks = blankMatches.length;
                }
                const providedAnswers = Object.values(answer).filter(val => val && val.trim() !== '').length;
                return providedAnswers === totalBlanks;
            }
            return false;
        } else if (question.type === 'summary_completion') {
            if (typeof answer === 'object' && answer !== null && question.summary) {
                const blankMatches = question.summary.match(/___(\d+)___/g) || [];
                const requiredBlanks = blankMatches.length;
                const providedAnswers = Object.values(answer).filter(val => val && val.trim() !== '').length;
                return providedAnswers === requiredBlanks;
            }
            return false;
        } else if (question.type === 'table_completion') {
            if (typeof answer === 'object' && answer !== null && question.table) {
                let totalBlanks = 0;
                question.table.rows.forEach(row => {
                    Object.keys(row).forEach(header => {
                        const cellValue = row[header];
                        if (cellValue && cellValue.match(/___\d+___/)) {
                            totalBlanks++;
                        }
                    });
                });
                const providedAnswers = Object.values(answer).filter(val => val && val.trim() !== '').length;
                return providedAnswers === totalBlanks;
            }
            return false;
        } else if (question.type === 'diagram_labelling') {
            if (typeof answer === 'object' && answer !== null && question.labels) {
                const totalLabels = question.labels.length;
                const providedAnswers = Object.values(answer).filter(val => val && val.trim() !== '').length;
                return providedAnswers === totalLabels;
            }
            return false;
        }
        
        const basicTypes = ['multiple_choice', 'true_false'];
        if (basicTypes.includes(question.type)) {
            return !!answer;
        } else if (question.type === 'multiple_choice_multiple') {
            // For multiple choice multiple, check if the required number of selections is made
            if (question.instruction) {
                // Parse instruction to get required number of selections
                const match = question.instruction.match(/(?:Choose\s+)?(\w+)\s+(?:letters?|answers?|options?)/i);
                if (match) {
                    const numberWord = match[1].toLowerCase();
                    const numberMap = {
                        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 
                        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
                    };
                    const requiredSelections = numberMap[numberWord] || parseInt(numberWord) || 3;
                    const selectedAnswers = Array.isArray(answer) ? answer : [answer];
                    return selectedAnswers.length === requiredSelections && selectedAnswers.every(val => val !== undefined && val !== null && val !== '');
                }
            }
            // Fallback: check if any selections are made
            return Array.isArray(answer) && answer.length > 0;
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
                const answeredSentences = Object.values(answer).filter(val => val && val.trim() !== '').length;
                return answeredSentences === requiredSentences;
            }
            return false;
        } else if (question.type === 'note_completion') {
            // For note completion, check if ALL blanks have been filled
            if (typeof answer === 'object' && answer !== null && question.notes && Array.isArray(question.notes)) {
                let totalBlanks = 0;
                question.notes.forEach(note => {
                    // Handle both formats: ___NUMBER___ and NUMBER..........
                    const blankMatches = note.match(/(?:___(\d+)___|(\d+)\.{2,})/g) || [];
                    totalBlanks += blankMatches.length;
                });
                const providedAnswers = Object.values(answer).filter(val => val && val.trim() !== '').length;
                return providedAnswers === totalBlanks;
            }
            return false;
        } else if (question.type === 'true_false_not_given' || question.type === 'yes_no_not_given') {
            return !!answer;
        } else {
            // For complex types, check if all required answers exist
            if (typeof answer === 'object' && answer !== null) {
                // For multiple choice multiple, check if the required number of selections is made
                if (question.type === 'multiple_choice_multiple' && question.instruction) {
                    const match = question.instruction.match(/(?:Choose\s+)?(\w+)\s+(?:letters?|answers?|options?)/i);
                    if (match) {
                        const numberWord = match[1].toLowerCase();
                        const numberMap = {
                            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 
                            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
                        };
                        const requiredSelections = numberMap[numberWord] || parseInt(numberWord) || 3;
                        const selectedAnswers = Array.isArray(answer) ? answer : [answer];
                        return selectedAnswers.length === requiredSelections && selectedAnswers.every(val => val !== undefined && val !== null && val !== '');
                    }
                }
                // For other complex types, check if all values are filled
                return Object.values(answer).every(val => val !== undefined && val !== null && val !== '');
            } else if (Array.isArray(answer)) {
                return answer.length > 0;
            }
            return !!answer;
        }
    });

    // Get the instruction text for the group (from first question)
    const getGroupInstruction = () => {
        if (questionType === 'true_false_not_given' || questionType === 'yes_no_not_given') {
            return null; // These types show individual statements
        }
        
        // For types that have their own instruction display, return null
        if (shouldSuppressQuestionText(firstQuestion)) {
            return null;
        }
        
        // For short answer with multiple questions, show the instruction
        if (questionType === 'short_answer' && firstQuestion.instruction && firstQuestion.questions && Array.isArray(firstQuestion.questions)) {
            return firstQuestion.instruction;
        }
        
        // For other types, return null as they handle their own display
        return null;
    };

    const groupInstruction = getGroupInstruction();

    return (
        <div 
            className={`reading-question-card ${hasAllAnswers ? 'answered' : 'unanswered'} ${isReviewMode ? 'review-mode' : ''} question-type-${questionType.replace('_', '-')}`}
            data-question-group-type={questionType}
        >
            <div className="question-header">
                <div className={`question-number${groupNumberVariant ? ` ${groupNumberVariant}` : ''}`}>
                    <span>{groupDisplayNumber}</span>
                </div>
               {!isReviewMode && (
                    <div className="question-status">
                        {hasAllAnswers ? (
                            <BsCheckCircle className="status-icon answered" size={18} />
                        ) : (
                            <BsCircle className="status-icon unanswered" size={18} />
                        )}
                    </div>
                )}
            </div>

            {groupInstruction && (
                <div className="question-content">
                    <h3 className="question-text">{groupInstruction}</h3>
                </div>
            )}

            <div className="question-body">
                {questions.map((question, index) => {
                    // Provide global number for single-slot items within grouped blocks
                    const isSingleSlot = ['multiple_choice', 'true_false', 'true_false_not_given', 'yes_no_not_given', 'multiple_choice_multiple'].includes(question.type);
                    
                    let globalNumber = null;
                    if (isSingleSlot && groupRange?.start) {
                        if (question.type === 'multiple_choice_multiple') {
                            // For multiple_choice_multiple, we need to find the correct sequential number
                            // from the individualAnswerSlots since each question has multiple answer slots
                            // The globalNumber should be the first sequential number for this question
                            const questionRange = questionRanges[question.id];
                            if (questionRange?.start) {
                                globalNumber = questionRange.start;
                            }
                        } else if (question.type === 'true_false_not_given' || question.type === 'yes_no_not_given') {
                            // For true_false_not_given and yes_no_not_given, extract the question number
                            // from the statement text (e.g., "8. The last of the wild horses..." -> 8)
                            if (question.statement) {
                                const match = question.statement.match(/^(\d+)\./);
                                if (match) {
                                    globalNumber = parseInt(match[1], 10);
                                }
                            }
                            
                            // Fallback to the original logic if no number found in statement
                            if (!globalNumber) {
                                globalNumber = groupRange.start + index;
                            }
                        } else {
                            // For other single-slot questions, use the simple formula
                            globalNumber = groupRange.start + index;
                        }
                    }
                    
                    return (
                        <div key={`${question.id}-${index}`} className="grouped-question">
                            <QuestionComponent
                                question={question}
                                answer={userAnswers[question.id]}
                                onAnswerChange={onAnswerChange}
                                isReviewMode={isReviewMode}
                                questionRange={questionRanges[question.id]}
                                readingId={readingId}
                                difficulty={difficulty}
                                reviewMap={reviewMap}
                                isGrouped={true}
                                showInstruction={!hasRepeatedInstructions || index === 0}
                                globalNumber={globalNumber}
                                inlinePickedOption={inlinePickedOption}
                                onInlinePickOptionChange={onInlinePickOptionChange}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

QuestionGroup.displayName = 'QuestionGroup';

export default QuestionGroup; 