"use client";

import React from 'react';

const splitOptionLabelAndText = (value) => {
    const source = String(value || '').trim();
    if (!source) return { label: '', text: '' };
    const match = source.match(/^([A-Za-z])[\)\].:\-]?\s+(.+)$/);
    if (!match) return { label: '', text: source };
    return {
        label: String(match[1]).toUpperCase(),
        text: String(match[2] || '').trim()
    };
};

const MultipleChoice = ({ question, userAnswer, onAnswerChange }) => {
    const handleOptionChange = (optionValue) => {
        onAnswerChange(question.number, optionValue);
    };

    return (
        <div className="question-multiple-choice">
            <p className="question-text selectable-content"><strong className="question-number">{question.number}</strong> {question.text}</p>
            <div className="options">
                {question.options.map((option, index) => {
                    const parsedOption = typeof option === 'string' ? splitOptionLabelAndText(option) : null;
                    const optionValue = typeof option === 'object'
                        ? (option.value || option.label || String.fromCharCode(65 + index))
                        : (parsedOption?.label || String.fromCharCode(65 + index));
                    const optionText = typeof option === 'object'
                        ? (option.text || option.label || option.value || '')
                        : (parsedOption?.text || option);
                    return (
                        <label key={index} className={`option-label ${userAnswer === optionValue ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name={`q-${question.number}`}
                                value={optionValue}
                                checked={userAnswer === optionValue}
                                onChange={() => handleOptionChange(optionValue)}
                                className="radio-input"
                            />
                            <span className="option-text selectable-content">{optionText}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
};

export default MultipleChoice; 