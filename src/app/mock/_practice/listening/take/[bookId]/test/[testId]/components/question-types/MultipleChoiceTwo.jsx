"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';

const MultipleChoiceTwo = ({ question, userAnswer, onAnswerChange }) => {
    const { t } = useTranslation('practice');

    let startNum, endNum, totalQuestions;
    
    if (typeof question.number === 'string' && question.number.includes('-')) {
        // Handle range format like "17-18"
        const questionNumbers = question.number.split('-').map(Number);
        startNum = questionNumbers[0];
        endNum = questionNumbers[1];
        totalQuestions = endNum - startNum + 1;
    } else {
        // Handle single number format
        startNum = Number(question.number);
        endNum = startNum;
        totalQuestions = 1;
    }

    const handleOptionChange = (questionNum, optionValue) => {
        onAnswerChange(questionNum, optionValue);
    };

    // Safety check for userAnswer
    const safeUserAnswer = userAnswer || {};

    return (
        <div className="question-multiple-choice-two">
            <div className="question-inputs">
                {Array.from({ length: totalQuestions }, (_, index) => {
                    const questionNum = startNum + index;
                    return (
                        <div key={questionNum} className="question-input-group">
                            <label htmlFor={`q-${questionNum}`} className="question-label selectable-content">
                                <strong className="question-number">{questionNum}</strong>
                            </label>
                            <select
                                id={`q-${questionNum}`}
                                value={safeUserAnswer[questionNum] || ''}
                                onChange={(e) => handleOptionChange(questionNum, e.target.value)}
                                className="question-select"
                            >
                                <option value="">{t('selectOption')}</option>
                                {question.options.map((option, optIndex) => {
                                    const optionLetter = option.match(/^[A-Z]/)?.[0] || option;
                                    return (
                                        <option key={optIndex} value={optionLetter}>
                                            {optionLetter}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MultipleChoiceTwo; 