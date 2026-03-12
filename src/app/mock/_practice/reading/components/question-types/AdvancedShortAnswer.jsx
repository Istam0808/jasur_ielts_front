'use client';
import "../../styles/readingProcess.scss";

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import InputsList from '@/components/common/input-types/InputsList';
import { checkAnswer } from '@/utils/answerChecker';

const AdvancedShortAnswer = ({ question, answer, onAnswerChange, isReviewMode, readingId, difficulty, reviewMap }) => {
    const { t, i18n } = useTranslation('reading');
    
    const userAnswers = useMemo(() => {
        return answer || {};
    }, [answer]);

    const correctAnswers = useMemo(() => {
        const isAdvancedReading = ['b2', 'c1', 'c2'].includes(difficulty?.toLowerCase());
        if (isAdvancedReading && readingId && reviewMap && isReviewMode) {
            const map = {};
            question.questions.forEach((questionText, index) => {
                const questionId = String(question.id + index);
                const correctAnswer = reviewMap[questionId];
                if (correctAnswer) map[questionText] = correctAnswer;
            });
            return map;
        }
        return {};
    }, [question.questions, question.id, difficulty, readingId, reviewMap, isReviewMode]);

    const isCorrect = useMemo(() => {
        const isAdvancedReading = ['b2', 'c1', 'c2'].includes(difficulty?.toLowerCase());
        if (isReviewMode && isAdvancedReading && reviewMap) {
            const entries = Object.entries(correctAnswers || {});
            if (entries.length === 0) return false;
            return entries.every(([qText, correct]) => {
                const userResponse = userAnswers[qText];
                return checkAnswer({ type: 'short_answer', options: [{ answer: correct, correct: true }] }, userResponse, null);
            });
        }
        return checkAnswer({ type: 'advanced_short_answer' }, userAnswers, readingId);
    }, [question.questions, userAnswers, correctAnswers, isReviewMode, reviewMap, difficulty, readingId]);

    const handleAnswerChange = (questionText, value) => {
        if (isReviewMode) return;
        
        const newAnswers = { ...userAnswers, [questionText]: value };
        onAnswerChange(question.id, newAnswers);
    };

    const getQuestionStatus = (questionText) => {
        const userResponse = userAnswers[questionText];
        const correctResponse = correctAnswers[questionText];
        
        if (!isReviewMode) {
            return { 
                isAnswered: !!userResponse,
                showFeedback: false 
            };
        }
        
        return {
            isAnswered: !!userResponse,
            isCorrect: userResponse && checkAnswer({ 
                type: 'short_answer', 
                options: [{ answer: correctResponse, correct: true }] 
            }, userResponse),
            showFeedback: Boolean(correctResponse),
            correctResponse
        };
    };

    // Convert English number words to locale-appropriate numbers
    const convertNumberToLocale = (englishNumber) => {
        const numberMap = {
            'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5,
            'SIX': 6, 'SEVEN': 7, 'EIGHT': 8, 'NINE': 9, 'TEN': 10
        };
        
        const number = numberMap[englishNumber] || 3; // Default to 3 if not found
        
        // Return the number as a string in the current locale
        return number.toString();
    };

    const getWordLimitFromInstruction = () => {
        const instruction = question.instruction || '';
        const match = instruction.match(/NO MORE THAN (\w+) WORDS?/i);
        const englishNumber = match ? match[1].toUpperCase() : 'THREE';
        return convertNumberToLocale(englishNumber);
    };

    return (
        <div className="advanced-short-answer-container">
            <div className="question-instruction">
                <div className="word-limit-reminder">
                    <span className="reminder-icon">⚠️</span>
                    <span className="reminder-text">
                        {t('shortAnswer.wordLimit', { limit: getWordLimitFromInstruction() })}
                    </span>
                </div>
            </div>

            <InputsList
              items={question.questions.map((qt, idx) => ({ id: qt, label: qt }))}
              values={userAnswers}
              onChange={handleAnswerChange}
              hint={!isReviewMode ? t('shortAnswer.placeholder') : undefined}
            />
        </div>
    );
};

export default AdvancedShortAnswer; 