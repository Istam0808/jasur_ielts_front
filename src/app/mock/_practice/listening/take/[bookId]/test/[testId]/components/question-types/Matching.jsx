"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';

const Matching = ({ question, userAnswer, onAnswerChange, optionsBox }) => {
    const { t } = useTranslation('practice');

    if (!optionsBox || !Array.isArray(optionsBox) || optionsBox.length === 0) {
        console.error('Matching component: optionsBox is missing or invalid', { 
            question: question?.number, 
            optionsBox 
        });
        return <p>{t('error.optionsBoxMissing', { ns: 'practice' })}</p>;
    }

    if (!onAnswerChange || typeof onAnswerChange !== 'function') {
        console.error('Matching component: onAnswerChange is not a function');
        return <p>Error: Answer change handler is missing</p>;
    }

    let startNum, endNum, totalQuestions;
    
    if (typeof question.number === 'string' && question.number.includes('-')) {
        // Handle range format like "25-30"
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

    const handleSelectChange = (questionNum, value) => {
        try {
            onAnswerChange(questionNum, value);
        } catch (error) {
            console.error('Error in Matching handleSelectChange:', error);
        }
    };

    // For individual questions, userAnswer is a string/value
    // For range questions, userAnswer is an object
    let safeUserAnswer;
    if (totalQuestions === 1) {
        // Individual question: userAnswer is the direct value
        safeUserAnswer = { [startNum]: userAnswer || '' };
    } else {
        // Range question: userAnswer should be an object
        safeUserAnswer = (userAnswer && typeof userAnswer === 'object') ? userAnswer : {};
    }

    // Helper function to get question text
    const getQuestionText = (questionNum) => {
        if (question.individualQuestions && Array.isArray(question.individualQuestions)) {
            const individualQ = question.individualQuestions.find(q => q.number === questionNum);
            return individualQ ? individualQ.text : '';
        }
        return question.text || '';
    };

    // Check if this looks like a flowchart question (multiple questions in sequence)
    const isFlowchartStyle = totalQuestions > 3;

    return (
        <div className={`question-matching ${isFlowchartStyle ? 'flowchart-style' : ''}`}>
            <div className="matching-items">
                {Array.from({ length: totalQuestions }, (_, index) => {
                    const questionNum = startNum + index;
                    const currentValue = safeUserAnswer[questionNum] || '';
                    const questionText = getQuestionText(questionNum);
                    const isLastQuestion = index === totalQuestions - 1;
                    
                    return (
                        <div key={questionNum} className="matching-item">
                            <div className="matching-content">
                                <div className="question-text-container">
                                    {questionText && <p className="question-text selectable-content">{questionText}</p>}
                                </div>
                                <div className="matching-select-wrapper">
                                    <select
                                        id={`q-${questionNum}`}
                                        value={currentValue}
                                        onChange={(e) => handleSelectChange(questionNum, e.target.value)}
                                        className="matching-select"
                                    >
                                        <option value="">{t('selectOption')}</option>
                                        {optionsBox.map((option, optIndex) => (
                                            <option key={optIndex} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {isFlowchartStyle && !isLastQuestion && (
                                <div className="flowchart-arrow">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 4L12 20M12 20L18 14M12 20L6 14" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Matching; 