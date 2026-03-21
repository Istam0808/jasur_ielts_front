"use client";

import React, { useMemo } from 'react';
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

    const safeUserAnswer = userAnswer || {};
    const isRangeQuestion = totalQuestions > 1;
    const questionNumbers = useMemo(
        () => Array.from({ length: totalQuestions }, (_, index) => startNum + index),
        [startNum, totalQuestions]
    );
    const optionItems = useMemo(
        () =>
            (question.options || []).map((option, index) => {
                const optionText = String(option || '').trim();
                const letterMatch = optionText.match(/^[A-Z]/);
                const value = letterMatch?.[0] || String.fromCharCode(65 + index);
                return { value, label: optionText || value };
            }),
        [question.options]
    );
    const selectedLetters = useMemo(() => {
        if (!isRangeQuestion) return [];
        const letters = questionNumbers
            .map((num) => safeUserAnswer?.[num])
            .filter((value) => typeof value === 'string' && value.trim() !== '')
            .map((value) => value.trim().toUpperCase());
        return Array.from(new Set(letters));
    }, [isRangeQuestion, questionNumbers, safeUserAnswer]);
    const singleValue = useMemo(() => {
        if (typeof safeUserAnswer === 'string') return safeUserAnswer;
        if (safeUserAnswer && typeof safeUserAnswer === 'object') {
            const candidate = safeUserAnswer[startNum];
            return typeof candidate === 'string' ? candidate : '';
        }
        return '';
    }, [safeUserAnswer, startNum]);

    const applyRangeSelection = (letters) => {
        questionNumbers.forEach((questionNum, index) => {
            onAnswerChange(questionNum, letters[index] || '');
        });
    };

    const handleCheckboxToggle = (optionValue) => {
        const upperValue = String(optionValue).trim().toUpperCase();
        const isSelected = selectedLetters.includes(upperValue);
        let nextSelected;

        if (isSelected) {
            nextSelected = selectedLetters.filter((value) => value !== upperValue);
        } else {
            if (selectedLetters.length >= totalQuestions) return;
            nextSelected = [...selectedLetters, upperValue];
        }

        const optionOrder = optionItems.map((item) => item.value);
        nextSelected.sort((a, b) => optionOrder.indexOf(a) - optionOrder.indexOf(b));
        applyRangeSelection(nextSelected);
    };

    const promptText = typeof question?.text === 'string' ? question.text.trim() : '';
    const shouldShowPrompt = promptText && promptText !== '.';

    return (
        <div className="question-multiple-choice-two">
            {shouldShowPrompt && (
                <p className="question-text selectable-content">
                    {promptText}
                </p>
            )}
            {isRangeQuestion ? (
                <div className="multiple-choice-checkbox-group">
                    <p className="selection-progress selectable-content">
                        {selectedLetters.length} / {totalQuestions} {t('selected', { defaultValue: 'selected' })}
                    </p>
                    <div className="options">
                        {optionItems.map((item) => {
                            const isChecked = selectedLetters.includes(item.value);
                            const isDisabled = !isChecked && selectedLetters.length >= totalQuestions;

                            return (
                                <label
                                    key={item.value}
                                    className={`option-label ${isChecked ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleCheckboxToggle(item.value)}
                                        className="checkbox-input"
                                        disabled={isDisabled}
                                    />
                                    <span className="option-text selectable-content">{item.label}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="question-inputs">
                    <div className="question-input-group">
                        <label htmlFor={`q-${startNum}`} className="question-label selectable-content">
                            <strong className="question-number">{startNum}</strong>
                        </label>
                        <select
                            id={`q-${startNum}`}
                            value={singleValue}
                            onChange={(e) => handleOptionChange(startNum, e.target.value)}
                            className="question-select"
                        >
                            <option value="">{t('selectOption')}</option>
                            {optionItems.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultipleChoiceTwo; 