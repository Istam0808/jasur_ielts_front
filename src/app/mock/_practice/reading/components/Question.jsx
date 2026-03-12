'use client';
import "../styles/readingProcess.scss";

import { BsCheckCircle, BsCircle } from 'react-icons/bs';
import Radio from '@/components/common/input-types/Radio';
import InputFullWidth from '@/components/common/input-types/InputFullWidth';
import { useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { checkAnswer, getCorrectAnswer } from '@/utils/answerChecker';

// Import specialized question type components
import MultipleChoiceMultiple from './question-types/MultipleChoiceMultiple';
import TrueFalseNotGiven from './question-types/TrueFalseNotGiven';
import MatchingHeadings from './question-types/MatchingHeadings';
import MatchingHeadingsDragBank from './question-types/MatchingHeadingsDragBank';
import MatchingQuestion from './question-types/MatchingQuestion';
import MatchingSentences from './question-types/MatchingSentences';
import CompletionQuestion from './question-types/CompletionQuestion';
import AdvancedShortAnswer from './question-types/AdvancedShortAnswer';

// Basic Question component for simple question types (A1, A2, B1)
const BasicQuestionComponent = memo(({ question, answer, onAnswerChange, isReviewMode, readingId, difficulty, reviewMap, globalNumber = null }) => {
    const { t } = useTranslation('reading');
    
    const getCorrectOption = useMemo(() => {
        if (!question.options || !Array.isArray(question.options)) {
            return '';
        }
        
        // For advanced readings (B2, C1, C2) in review mode, use server-provided reviewMap
        const isAdvancedReading = ['b2', 'c1', 'c2'].includes(difficulty?.toLowerCase());
        if (isAdvancedReading && isReviewMode && reviewMap) {
            const key = globalNumber != null ? String(globalNumber) : String(question.id);
            const correctLetter = reviewMap[key];
            if (!correctLetter) return '';
            const correctOption = question.options.find(option => {
                const optionValue = typeof option === 'object' ? option.answer : option;
                return typeof optionValue === 'string' && optionValue.startsWith(correctLetter + '.');
            });
            return correctOption ? (typeof correctOption === 'object' ? correctOption.answer : correctOption) : '';
        }
        
        // For basic readings (A1, A2, B1), try to find embedded correct answer
        const correctOption = question.options.find(opt => opt.correct);
        return correctOption ? (correctOption.answer || correctOption.text || '') : '';
    }, [question.options, difficulty, isReviewMode, question.id, reviewMap, globalNumber]);

    const isCorrect = useMemo(() => (optionAnswer) => {
        return checkAnswer(question, optionAnswer, null);
    }, [question]);

    const isShortAnswer = useMemo(() => {
        return question.type === 'short_answer';
    }, [question.type]);

    const renderOptions = useMemo(() => {
        if (isShortAnswer) {
            return null;
        }

        if (!question.options || !Array.isArray(question.options)) {
            return null;
        }

        // Build per-option feedback for review mode
        const statusByValue = (() => {
            if (!isReviewMode) return {};
            const map = new Map();
            const correctValue = getCorrectOption;
            question.options.forEach((opt) => {
                const optionValue = typeof opt === 'object' ? opt.answer : opt;
                const isSelected = answer === optionValue;
                const isCorrectOption = !!correctValue && optionValue === correctValue;
                const status = isSelected && isCorrectOption
                    ? 'correct'
                    : isSelected && !isCorrectOption
                    ? 'incorrect'
                    : !isSelected && isCorrectOption
                    ? 'correct-not-selected'
                    : 'neutral';
                map.set(optionValue, { status, show: true });
            });
            return Object.fromEntries(map);
        })();

        return (
          <Radio
            name={`question-${question.id}`}
            inline={false}
            options={question.options.map((opt) => ({
              value: typeof opt === 'object' ? opt.answer : opt,
              label: typeof opt === 'object' ? opt.answer : opt,
            }))}
            value={answer || null}
            onChange={(val) => {
              if (!isReviewMode) {
                const newAnswer = val == null ? '' : val;
                onAnswerChange(question.id, newAnswer);
              }
            }}
            disabled={isReviewMode}
            allowDeselect
            statusByValue={statusByValue}
          />
        );
    }, [question.options, answer, isReviewMode, onAnswerChange, question.id, isShortAnswer, getCorrectOption]);

    const renderShortAnswerInput = useMemo(() => {
        if (!isShortAnswer) {
            return null;
        }

        const isCorrectAnswer = answer && isCorrect(answer);
        const showCorrectness = isReviewMode && answer;

        return (
          <div className={`short-answer-container ${showCorrectness ? (isCorrectAnswer ? 'correct' : 'incorrect') : ''} ${isReviewMode ? 'review-mode' : ''}`}>
            <div className="input-wrapper">
              <InputFullWidth
                value={answer || ''}
                onChange={(v) => !isReviewMode && onAnswerChange(question.id, v)}
                placeholder={t('shortAnswer.placeholder')}
                disabled={isReviewMode}
              />
              {showCorrectness && (
                <div className="answer-feedback">
                  {isCorrectAnswer ? (
                    <div className="correct-feedback">
                      <span className="feedback-icon">✓</span>
                      <span className="feedback-text">{t('shortAnswer.correct')}</span>
                    </div>
                  ) : (
                    <div className="incorrect-feedback">
                      <span className="feedback-icon">✗</span>
                      <span className="feedback-text">{t('shortAnswer.incorrect', { answer: getCorrectOption })}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
    }, [isShortAnswer, answer, isReviewMode, isCorrect, onAnswerChange, question.id, getCorrectOption, t]);

    return (
        <>
            {isShortAnswer ? (
                renderShortAnswerInput
            ) : (
                <div className="options-container">
                    {renderOptions}
                </div>
            )}
        </>
    );
});

BasicQuestionComponent.displayName = 'BasicQuestionComponent';

// Main Question Router Component
const QuestionComponent = memo(({ question, answer, onAnswerChange, isReviewMode, questionRange, readingId, difficulty, reviewMap, isGrouped = false, showInstruction = true, globalNumber = null, inlinePickedOption = null, onInlinePickOptionChange = () => {} }) => {
    const { t } = useTranslation('practice');

    // Determine if answer exists based on question type
    const hasAnswer = useMemo(() => {
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
                if (Number.isFinite(question.maxSelections) && question.maxSelections > 0) {
                    return answer.length === question.maxSelections;
                }
                // First try to get from correct properties in options
                const requiredCount = question.options?.filter(opt => opt.correct)?.length || 0;
                if (requiredCount > 0) {
                    return answer.length === requiredCount;
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
                            return answer.length === parsedNumber;
                        }
                    }
                }
                // Default fallback
                return answer.length >= 1;
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
                const answeredSentences = Object.values(answer).filter(val => val && val.trim() !== '').length;
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
        } else if (question.type === 'table_completion') {
            // For table completion, count blanks from table rows
            if (typeof answer === 'object' && answer !== null && question.table && question.table.rows) {
                let totalBlanks = 0;
                question.table.rows.forEach(row => {
                    Object.values(row).forEach(cell => {
                        if (cell && cell.includes('___')) {
                            totalBlanks++;
                        }
                    });
                });
                const providedAnswers = Object.values(answer).filter(val => val && val.trim() !== '').length;
                return providedAnswers === totalBlanks;
            }
            return false;
        } else if (question.type === 'flow_chart_completion') {
            // For flow chart completion, count blanks from flow_chart content
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
        } else {
            // For other complex types, check if any answers exist (fallback)
            if (typeof answer === 'object' && answer !== null) {
                return Object.values(answer).some(val => val !== undefined && val !== null && val !== '');
            } else if (Array.isArray(answer)) {
                return answer.length > 0;
            }
            return !!answer;
        }
    }, [question.type, question.options, question.sections, question.information, question.items, question.sentences, question.answers, question.notes, answer]);

    // Check if question type displays its own content that would duplicate the main question text
    const shouldSuppressQuestionText = useMemo(() => {
        const typesWithOwnContent = [
            'true_false_not_given',     // Shows question.statement
            'yes_no_not_given',         // Shows question.statement  
            'matching_headings',        // Shows question.instruction
            'matching_information',     // Shows question.instruction
            'matching_features',        // Shows question.instruction
            'sentence_completion',      // Shows question.instruction
            'summary_completion',       // Shows question.instruction
            'table_completion',         // Shows question.instruction
            'flow_chart_completion',    // Shows question.instruction
            'diagram_labelling',        // Shows question.instruction
            'note_completion',          // Shows question.instruction
            'advanced_short_answer'     // Shows question.instruction
        ];
        
        // Also suppress for multi-question short_answer types since they show their own instruction
        if (question.type === 'short_answer' && question.instruction && question.questions && Array.isArray(question.questions)) {
            return true;
        }
        
        return typesWithOwnContent.includes(question.type);
    }, [question.type, question.instruction, question.questions]);

    const getQuestionText = useMemo(() => {
        return question.question || question.statement || question.sentence || question.instruction;
    }, [question]);

    // Route to appropriate question component based on type
    const renderQuestionContent = () => {
        switch (question.type) {
            // Basic types (A1, A2, B1)
            case 'short_answer':
                // Check if this is a multi-question short answer (has instruction and questions array)
                if (question.instruction && question.questions && Array.isArray(question.questions)) {
                    return (
                        <AdvancedShortAnswer
                            question={question}
                            answer={answer}
                            onAnswerChange={onAnswerChange}
                            isReviewMode={isReviewMode}
                            readingId={readingId}
                            difficulty={difficulty}
                            reviewMap={reviewMap}
                        />
                    );
                } else {
                    // Single question short answer
                    return (
                    <BasicQuestionComponent
                        question={question}
                        answer={answer}
                        onAnswerChange={onAnswerChange}
                        isReviewMode={isReviewMode}
                        readingId={null}
                        difficulty={difficulty}
                        reviewMap={reviewMap}
                    />
                    );
                }
            case 'multiple_choice':
            case 'true_false':
                return (
                    <BasicQuestionComponent
                        question={question}
                        answer={answer}
                        onAnswerChange={onAnswerChange}
                        isReviewMode={isReviewMode}
                        readingId={readingId}
                        difficulty={difficulty}
                        reviewMap={reviewMap}
                        globalNumber={globalNumber}
                    />
                );

            // Advanced types (B2, C1, C2)
            case 'multiple_choice_multiple':
                return (
                    <MultipleChoiceMultiple
                        question={question}
                        answer={answer}
                        onAnswerChange={onAnswerChange}
                        isReviewMode={isReviewMode}
                        readingId={readingId}
                        difficulty={difficulty}
                        reviewMap={reviewMap}
                        globalNumber={globalNumber}
                    />
                );

            case 'true_false_not_given':
            case 'yes_no_not_given':
                return (
                    <TrueFalseNotGiven
                        question={question}
                        answer={answer}
                        onAnswerChange={onAnswerChange}
                        isReviewMode={isReviewMode}
                        readingId={readingId}
                        difficulty={difficulty}
                        reviewMap={reviewMap}
                        showInstruction={showInstruction}
                        globalNumber={globalNumber}
                    />
                );

            case 'matching_headings':
                if (question.renderInPassage) {
                    return (
                        <MatchingHeadingsDragBank
                            question={question}
                            answer={answer}
                            onAnswerChange={onAnswerChange}
                            isReviewMode={isReviewMode}
                            inlinePickedOption={inlinePickedOption}
                            onInlinePickOptionChange={onInlinePickOptionChange}
                        />
                    );
                }

                return (
                    <MatchingHeadings
                        question={question}
                        answer={answer}
                        onAnswerChange={onAnswerChange}
                        isReviewMode={isReviewMode}
                        readingId={readingId}
                        reviewMap={reviewMap}
                    />
                );

            case 'matching_information':
            case 'matching_features':
            case 'sentence_completion':
                return (
                    <MatchingQuestion
                        question={question}
                        answer={answer}
                        onAnswerChange={onAnswerChange}
                        isReviewMode={isReviewMode}
                        readingId={readingId}
                        reviewMap={reviewMap}
                    />
                );

            case 'matching_sentences':
                return (
                    <MatchingSentences
                        question={question}
                        answer={answer}
                        onAnswerChange={onAnswerChange}
                        isReviewMode={isReviewMode}
                        readingId={readingId}
                        reviewMap={reviewMap}
                    />
                );

            case 'summary_completion':
            case 'table_completion':
            case 'flow_chart_completion':
            case 'diagram_labelling':
            case 'note_completion':
                return (
                    <CompletionQuestion
                        question={question}
                        answer={answer}
                        onAnswerChange={onAnswerChange}
                        isReviewMode={isReviewMode}
                        readingId={readingId}
                        difficulty={difficulty}
                        reviewMap={reviewMap}
                    />
                );

            case 'advanced_short_answer':
                return (
                    <AdvancedShortAnswer
                        question={question}
                        answer={answer}
                        onAnswerChange={onAnswerChange}
                        isReviewMode={isReviewMode}
                        readingId={readingId}
                        difficulty={difficulty}
                        reviewMap={reviewMap}
                    />
                );

            default:
                return (
                    <div className="unsupported-question-type">
                        <p>{t('error.unsupportedQuestionType', { type: question.type })}</p>
                    </div>
                );
        }
    };

    const displayNumber = useMemo(() => {
        if (questionRange?.start != null) {
            if (questionRange?.end != null && questionRange.end !== questionRange.start) {
                return `${questionRange.start}-${questionRange.end}`;
            }
            return String(questionRange.start);
        }

        if (question?.id != null) {
            return String(question.id);
        }

        return '';
    }, [questionRange, question?.id]);

    const numberVariant = useMemo(() => {
        if (!displayNumber) {
            return '';
        }

        return /^\d$/.test(displayNumber) ? 'single-digit' : 'range-number';
    }, [displayNumber]);

    // If this question is part of a group, render only the content without the card wrapper
    if (isGrouped) {
        return (
            <div 
                className="grouped-question-content"
                data-question-id={question.id}
            >
                {!shouldSuppressQuestionText && getQuestionText && (
                    <div className="question-content">
                        <h3 className="question-text">{getQuestionText}</h3>
                    </div>
                )}
                <div className="question-body">
                    {renderQuestionContent()}
                </div>
            </div>
        );
    }

    return (
        <div 
            className={`reading-question-card ${hasAnswer ? 'answered' : 'unanswered'} ${isReviewMode ? 'review-mode' : ''} question-type-${question.type.replace('_', '-')}`}
            data-question-id={question.id}
        >
            <div className="question-header">
                <div className={`question-number${numberVariant ? ` ${numberVariant}` : ''}`}>
                    <span>{displayNumber}</span>
                </div>
                {!isReviewMode && (
                    <div className="question-status">
                        {hasAnswer ? (
                            <BsCheckCircle className="status-icon answered" size={18} />
                        ) : (
                            <BsCircle className="status-icon unanswered" size={18} />
                        )}
                    </div>
                )}
            </div>

            <div className="question-content">
                {!shouldSuppressQuestionText && getQuestionText && (
                    <h3 className="question-text">{getQuestionText}</h3>
                )}
            </div>

            <div className="question-body">
                {renderQuestionContent()}
            </div>
        </div>
    );
});

QuestionComponent.displayName = 'QuestionComponent';

export default QuestionComponent;