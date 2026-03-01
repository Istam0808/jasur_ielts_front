"use client";

import React from 'react';

const MultipleChoice = ({ question, userAnswer, onAnswerChange }) => {
    const handleOptionChange = (optionValue) => {
        onAnswerChange(question.number, optionValue);
    };

    return (
        <div className="question-multiple-choice">
            <p className="question-text selectable-content"><strong className="question-number">{question.number}</strong> {question.text}</p>
            <div className="options">
                {question.options.map((option, index) => {
                    const optionLetter = option.match(/^[A-Z]/)?.[0] || option;
                    return (
                        <label key={index} className={`option-label ${userAnswer === optionLetter ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name={`q-${question.number}`}
                                value={optionLetter}
                                checked={userAnswer === optionLetter}
                                onChange={() => handleOptionChange(optionLetter)}
                                className="radio-input"
                            />
                            <span className="option-text selectable-content">{option}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
};

export default MultipleChoice; 