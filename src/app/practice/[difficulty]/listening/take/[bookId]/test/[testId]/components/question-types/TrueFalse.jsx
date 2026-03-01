"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';

const TrueFalse = ({ question, userAnswer, onAnswerChange }) => {
    const { t } = useTranslation('practice');

    const handleOptionChange = (questionNum, value) => {
        onAnswerChange(questionNum, value);
    };

    // Handle both single question and array of questions
    const questions = question.questions || [question];

    return (
        <div className="question-true-false">
            {questions.map((tfQuestion, index) => {
                const questionNum = tfQuestion.number;
                const currentAnswer = userAnswer?.[questionNum] || userAnswer || '';
                
                return (
                    <div key={questionNum} className="true-false-item">
                        <div className="statement-container">
                            <p className="question-text selectable-content">
                                <strong className="question-number">{questionNum}</strong>
                                {tfQuestion.statement || tfQuestion.text}
                            </p>
                        </div>
                        <div className="true-false-options">
                            <label className={`option-label ${currentAnswer === 'true' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name={`tf-${questionNum}`}
                                    value="true"
                                    checked={currentAnswer === 'true'}
                                    onChange={() => handleOptionChange(questionNum, 'true')}
                                    className="radio-input"
                                />
                                <span className="option-text">
                                    {t('trueOption', { defaultValue: 'True' })}
                                </span>
                            </label>
                            <label className={`option-label ${currentAnswer === 'false' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name={`tf-${questionNum}`}
                                    value="false"
                                    checked={currentAnswer === 'false'}
                                    onChange={() => handleOptionChange(questionNum, 'false')}
                                    className="radio-input"
                                />
                                <span className="option-text">
                                    {t('falseOption', { defaultValue: 'False' })}
                                </span>
                            </label>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TrueFalse; 