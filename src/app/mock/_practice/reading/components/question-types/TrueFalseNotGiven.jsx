'use client';
import "../../styles/readingProcess.scss";

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Radio from '@/components/common/input-types/Radio';

const TrueFalseNotGiven = ({ question, answer, onAnswerChange, isReviewMode, readingId, difficulty, reviewMap, globalNumber = null }) => {
    const { t } = useTranslation('reading');

    // Get correct answer for review mode (global numbers for advanced)
    const correctAnswer = useMemo(() => {
        if (!isReviewMode || !readingId || !reviewMap) return null;
        
        // For advanced readings, use globalNumber to find the correct answer
        // The globalNumber corresponds to the sequential question number (1, 2, 3, etc.)
        // which matches the keys in the answers JSON (8, 9, 10, 20, 21, 22, etc.)
        if (globalNumber != null) {
            const key = String(globalNumber);
            const answerFromMap = reviewMap[key];
            
            // Handle case sensitivity: normalize the answer from the map
            if (answerFromMap) {
                // For true_false_not_given questions
                if (question.type === 'true_false_not_given') {
                    if (answerFromMap.toLowerCase() === 'false') return 'FALSE';
                    if (answerFromMap.toLowerCase() === 'true') return 'TRUE';
                    if (answerFromMap.toLowerCase() === 'not given') return 'NOT GIVEN';
                }
                // For yes_no_not_given questions
                else if (question.type === 'yes_no_not_given') {
                    if (answerFromMap.toLowerCase() === 'no') return 'NO';
                    if (answerFromMap.toLowerCase() === 'yes') return 'YES';
                    if (answerFromMap.toLowerCase() === 'not given') return 'NOT GIVEN';
                }
                // Return as-is if it already matches the expected format
                return answerFromMap;
            }
        }
        
        // Fallback to question.id if globalNumber is not available
        const key = String(question.id);
        const answerFromMap = reviewMap[key];
        
        if (answerFromMap) {
            // Handle case sensitivity: normalize the answer from the map
            if (question.type === 'true_false_not_given') {
                if (answerFromMap.toLowerCase() === 'false') return 'FALSE';
                if (answerFromMap.toLowerCase() === 'true') return 'TRUE';
                if (answerFromMap.toLowerCase() === 'not given') return 'NOT GIVEN';
            }
            // For yes_no_not_given questions
            else if (question.type === 'yes_no_not_given') {
                if (answerFromMap.toLowerCase() === 'no') return 'NO';
                if (answerFromMap.toLowerCase() === 'yes') return 'YES';
                if (answerFromMap.toLowerCase() === 'not given') return 'NOT GIVEN';
            }
            // Return as-is if it already matches the expected format
            return answerFromMap;
        }
        
        return null;
    }, [isReviewMode, readingId, reviewMap, question.id, globalNumber, question.type]);

    // For YNNG always show Yes/No/Not Given checkboxes (same UI as TFNG); for TFNG use question.options
    const displayOptions = useMemo(() => {
        if (question.type === 'yes_no_not_given') {
            return ['YES', 'NO', 'NOT GIVEN'];
        }
        return question.options && question.options.length
            ? question.options.map((o) => (typeof o === 'object' ? o.answer : o))
            : ['TRUE', 'FALSE', 'NOT GIVEN'];
    }, [question.type, question.options]);

    const handleOptionChange = (optionValue) => {
        if (isReviewMode) return;
        // Allow deselecting if clicking the same option
        const newAnswer = answer === optionValue ? '' : optionValue;
        onAnswerChange(question.id, newAnswer);
    };

    const getOptionStatus = (optionValue) => {
        const isSelected = answer === optionValue;
        
        if (!isReviewMode) {
            return { isSelected, showFeedback: false };
        }
        
        // In review mode, show correct answer if available
        const isCorrectOption = correctAnswer ? optionValue === correctAnswer : false;
        const isThisOptionSelected = isSelected;
        const showFeedback = Boolean(correctAnswer);
        
        return {
            isSelected,
            isCorrectOption,
            showFeedback,
            status: isThisOptionSelected && isCorrectOption ? 'correct' : 
                   isThisOptionSelected && !isCorrectOption ? 'incorrect' : 
                   !isThisOptionSelected && isCorrectOption ? 'correct-not-selected' : 'neutral'
        };
    };

    return (
        <div className="true-false-not-given-container">
            <div className="statement-container">
                <div className="statement-text">
                    <span className="statement-label">{t('statement')}:</span>
                    <p className="statement-content">
                        <b>{question.statement.slice(0, question.statement.indexOf("."))}. </b>
                        {question.statement.slice(question.statement.indexOf(".")+1)}
                    </p>
                </div>
            </div>

            <div className="options-container">
                <Radio
                  name={`q-${question.id}`}
                  inline
                  options={displayOptions.map((opt) => ({ value: opt, label: opt }))}
                  value={answer || null}
                  onChange={(val) => handleOptionChange(val ?? '')}
                  disabled={isReviewMode}
                  allowDeselect
                  statusByValue={Object.fromEntries(
                    displayOptions.map((opt) => {
                      const s = getOptionStatus(opt);
                      return [opt, { status: s.status, show: s.showFeedback }];
                    })
                  )}
                />
            </div>

            {/* Removed per-question ReviewModeSummary to avoid duplicate summary */}
        </div>
    );
};

export default TrueFalseNotGiven; 