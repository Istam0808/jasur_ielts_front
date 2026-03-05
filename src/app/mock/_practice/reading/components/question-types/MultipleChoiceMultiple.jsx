'use client';
import "../../styles/readingProcess.scss";

import { useMemo } from 'react';
import Checkbox from '@/components/common/input-types/Checkbox';
import { useTranslation } from 'react-i18next';

const MultipleChoiceMultiple = ({ question, answer, onAnswerChange, isReviewMode, readingId, difficulty, reviewMap, globalNumber = null }) => {
    const { t } = useTranslation('reading');

    // Helper function to get correct answer letters for advanced readings
    const getCorrectAnswerLetters = useMemo(() => {
        const isAdvancedReading = ['b2', 'c1', 'c2'].includes(difficulty?.toLowerCase());
        if (!isAdvancedReading || !readingId || !reviewMap || !isReviewMode) return [];

        // Determine how many answers to collect based on the instruction
        let expectedAnswerCount = 2; // Default fallback for "Choose TWO letters"
        if (question.instruction) {
            const match = question.instruction.match(/(?:Choose\s+)?(\w+)\s+(?:letters?|answers?|options?)/i);
            if (match) {
                const numberWord = match[1].toLowerCase();
                const numberMap = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10 };
                expectedAnswerCount = numberMap[numberWord] || parseInt(numberWord) || 2;
            }
        }

        // For multiple choice multiple questions, we need to find the correct answer
        // based on the question's position in the reading passage
        // The reviewMap uses sequential numbers (1, 2, 3, etc.) that correspond to
        // the question order in the passage, not the component's internal question.id
        
        // Strategy: Look for the answer using the question's sequential position
        // This is the most reliable method for advanced readings
        let correctAnswer = null;
        
        // First, try to find the answer using the globalNumber (most reliable)
        if (globalNumber != null) {
            correctAnswer = reviewMap[String(globalNumber)];
        }
        
        // If not found, try using the question's sequential position
        if (!correctAnswer && question.sequentialNumber) {
            correctAnswer = reviewMap[String(question.sequentialNumber)];
        }
        
        // If still not found, try using the question.id as a fallback
        if (!correctAnswer) {
            correctAnswer = reviewMap[String(question.id)];
        }
        
        // If still not found, try to find answers that match the expected format
        // by looking for questions with the same expected answer count
        if (!correctAnswer) {
            const answerEntries = Object.entries(reviewMap);
            const slashAnswers = answerEntries.filter(([key, value]) => 
                typeof value === 'string' && value.includes('/')
            );
            
            // Group answers by their format and count
            const answersByFormat = {};
            slashAnswers.forEach(([key, value]) => {
                const answerLetters = value.split('/').map(letter => letter.trim());
                const count = answerLetters.length;
                if (!answersByFormat[count]) {
                    answersByFormat[count] = [];
                }
                answersByFormat[count].push({ key, value, letters: answerLetters });
            });
            
            // Look for answers that match our expected count
            if (answersByFormat[expectedAnswerCount] && answersByFormat[expectedAnswerCount].length > 0) {
                // For now, use the first matching answer as a fallback
                // In a more sophisticated implementation, we could try to match
                // based on question content or other heuristics
                const selectedAnswer = answersByFormat[expectedAnswerCount][0];
                correctAnswer = selectedAnswer.value;
            }
        }
        
        // If we found a correct answer, parse it and return the letters
        if (correctAnswer && typeof correctAnswer === 'string' && correctAnswer.includes('/')) {
            const letters = correctAnswer.split('/').map(letter => letter.trim());
            // Ensure we don't return more letters than expected
            return letters.slice(0, expectedAnswerCount);
        }
        
        return [];
    }, [difficulty, readingId, question.id, question.sequentialNumber, question.instruction, reviewMap, isReviewMode, globalNumber]);

    const selectedAnswers = useMemo(() => {
        if (!answer) return [];
        // Handle both array and string formats, and ensure we're working with letters
        const answers = Array.isArray(answer) ? answer : answer.split(',').map(a => a.trim());
        // Extract just the letter part if the answer contains full text
        return answers.map(ans => {
            // If the answer is already just a letter (A, B, C, etc.), return it as is
            if (/^[A-Z]$/.test(ans)) {
                return ans;
            }
            // If it's full text like "A. Optogenetics...", extract the letter
            const match = ans.match(/^([A-Z])\./);
            return match ? match[1] : ans;
        });
    }, [answer]);

    const maxSelections = useMemo(() => {
        // For new structure, we need to parse the instruction to get the number of selections
        // e.g., "Choose THREE letters A-F" or look for number words
        if (question.instruction) {
            const match = question.instruction.match(/(?:Choose\s+)?(\w+)\s+(?:letters?|answers?|options?)/i);
            if (match) {
                const numberWord = match[1].toLowerCase();
                const numberMap = {
                    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 
                    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
                };
                return numberMap[numberWord] || parseInt(numberWord) || 2; // default to 2
            }
        }
        // Fallback - try to determine from question context or default to 2
        return 2;
    }, [question.instruction]);

    // Removed overall isCorrect summary calculation since per-option feedback is shown inline

    const handleOptionChange = (optionLetter, isChecked) => {
        if (isReviewMode) return;

        let newSelectedAnswers;
        if (isChecked) {
            // Check if we've reached the maximum number of selections
            if (selectedAnswers.length >= maxSelections) {
                return; // Don't allow more selections
            }
            newSelectedAnswers = [...selectedAnswers, optionLetter];
        } else {
            newSelectedAnswers = selectedAnswers.filter(ans => ans !== optionLetter);
        }
        
        onAnswerChange(question.id, newSelectedAnswers);
    };

    const getOptionStatus = (optionLetter) => {
        const isSelected = selectedAnswers.includes(optionLetter);
        const canSelect = isSelected || selectedAnswers.length < maxSelections;
        
        if (!isReviewMode) {
            return { isSelected, showFeedback: false, canSelect };
        }
        
        // In review mode, show correct answers if available
        // For advanced readings, we need to check if this option letter is in the correct answers
        const isAdvancedReading = ['b2', 'c1', 'c2'].includes(difficulty?.toLowerCase());
        let isCorrectOption = false;
        
        if (isAdvancedReading && readingId) {
            // Get the correct answer letters from the external file
            const correctAnswerLetters = getCorrectAnswerLetters;
            
            isCorrectOption = correctAnswerLetters.includes(optionLetter);
        } else {
            // For basic readings, check if this option is marked as correct
            const optionIndex = optionLetter.charCodeAt(0) - 65;
            if (optionIndex >= 0 && optionIndex < question.options.length) {
                const option = question.options[optionIndex];
                isCorrectOption = typeof option === 'object' ? option.correct : false;
            }
        }
        
        // Determine the status based on selection and correctness
        let status = 'neutral';
        if (isSelected && isCorrectOption) {
            status = 'correct';
        } else if (isSelected && !isCorrectOption) {
            status = 'incorrect';
        } else if (!isSelected && isCorrectOption) {
            status = 'correct-not-selected';
        }
        
        const result = {
            isSelected,
            isCorrectOption,
            showFeedback: isAdvancedReading ? (getCorrectAnswerLetters.length > 0) : true,
            canSelect: false,
            status
        };
        
        return result;
    };

    const remainingSelections = maxSelections - selectedAnswers.length;

    return (
        <div className="multiple-choice-multiple-container">
            <div className="question-instruction">
                {question.instruction && (
                    <p className="instruction-text">{question.instruction}</p>
                )}
                <div className="selection-info">
                    <p className="selection-hint">
                        {t('multipleChoice.selectMultiple', { count: maxSelections })}
                    </p>
                    {!isReviewMode && (
                        <p className="selection-progress">
                            {selectedAnswers.length} / {maxSelections} {t('multipleChoice.selected')}
                            {remainingSelections > 0 && (
                                <span className="remaining-count">
                                    {' '}({remainingSelections} {t('multipleChoice.remaining')})
                                </span>
                            )}
                        </p>
                    )}
                </div>
            </div>

            <div className="options-grid">
                <Checkbox
                  name={`mcm-${question.id}`}
                  options={question.options.map((opt, idx) => {
                    const optionValue = typeof opt === 'object' ? opt.answer : opt;
                    const optionLetter = String.fromCharCode(65 + idx);
                    return { value: optionLetter, label: `${optionValue}` };
                  })}
                  value={selectedAnswers}
                  onChange={(vals) => {
                    if (isReviewMode) return;
                    // enforce maxSelections
                    const next = vals.slice(0, maxSelections);
                    onAnswerChange(question.id, next);
                  }}
                  disabled={isReviewMode}
                  statusByValue={Object.fromEntries(
                    question.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const s = getOptionStatus(letter);
                      return [letter, { status: s.status, show: s.showFeedback }];
                    })
                  )}
                />
            </div>

        </div>
    );
};

export default MultipleChoiceMultiple; 