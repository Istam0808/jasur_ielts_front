"use client";

import React from 'react';

const FillInBlank = ({ question, userAnswer, onAnswerChange }) => {
    const handleInputChange = (e) => {
        onAnswerChange(question.number, e.target.value);
    };

    const parts = question.text.split(/(\d+.*?_________)/);

    return (
        <div className="question-fill-in-blank">
            <label htmlFor={`q-${question.number}`} className="selectable-content">
                {parts.map((part, index) => {
                    if (part.match(/\d+.*?_________/)) {
                        const subParts = part.split(/(_________)/);
                        const textBeforeBlank = subParts[0];

                        // Attempt to find and style the question number
                        const qNumberStr = String(question.number);
                        const numberIndex = textBeforeBlank.indexOf(qNumberStr);
                        
                        let textWithStyledNumber = null;

                        if (numberIndex !== -1) {
                            const before = textBeforeBlank[numberIndex - 1];
                            const after = textBeforeBlank[numberIndex + qNumberStr.length];
                            // Ensure it's not part of a larger number
                            const isWholeWord = (!before || !/\d/.test(before)) && (!after || !/\d/.test(after));

                            if (isWholeWord) {
                                textWithStyledNumber = (
                                    <>
                                        {textBeforeBlank.substring(0, numberIndex)}
                                        <strong className="question-number">{qNumberStr}</strong>
                                        {textBeforeBlank.substring(numberIndex + qNumberStr.length)}
                                    </>
                                );
                            }
                        }
                        
                        return (
                            <span key={index}>
                                {textWithStyledNumber || textBeforeBlank}
                                <input
                                    type="text"
                                    id={`q-${question.number}`}
                                    value={userAnswer || ''}
                                    onChange={handleInputChange}
                                    className="blank-input"
                                />
                                {subParts.length > 2 && subParts[2]}
                            </span>
                        );
                    }
                    return <span key={index}>{part}</span>;
                })}
            </label>
        </div>
    );
};

export default FillInBlank; 