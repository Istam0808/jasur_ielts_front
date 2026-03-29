"use client";

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Checkbox from '@/components/common/input-types/Checkbox';

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
                if (option && typeof option === 'object') {
                    const value = String(
                        option.value ||
                        option.label ||
                        String.fromCharCode(65 + index)
                    ).trim().toUpperCase();
                    const text = String(
                        option.text ||
                        option.option_text ||
                        option.answer ||
                        ''
                    ).trim();
                    return { value, label: text || value };
                }

                const parsed = splitOptionLabelAndText(option);
                const value = parsed.label || String.fromCharCode(65 + index);
                return { value, label: parsed.text || String(option || '').trim() || value };
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

    const sortByOptionOrder = (letters) => {
        const optionOrder = optionItems.map((item) => item.value);
        const sorted = [...letters];
        sorted.sort((a, b) => optionOrder.indexOf(a) - optionOrder.indexOf(b));
        return sorted;
    };

    const handleCheckboxChange = (nextValues) => {
        const normalized = Array.from(
            new Set(
                (nextValues || [])
                    .map((value) => String(value).trim().toUpperCase())
                    .filter((value) => optionItems.some((item) => item.value === value))
            )
        );
        const nextSelected = sortByOptionOrder(normalized).slice(0, totalQuestions);
        applyRangeSelection(nextSelected);
    };

    const promptText = typeof question?.text === 'string' ? question.text.trim() : '';
    const shouldShowPrompt = promptText && promptText !== '.';
    const promptLooksLikeHtml = shouldShowPrompt && /<\/?[a-z][\s\S]*>/i.test(promptText);

    return (
        <div className="question-multiple-choice-two">
            {shouldShowPrompt &&
                (promptLooksLikeHtml ? (
                    <p
                        className="question-text selectable-content"
                        dangerouslySetInnerHTML={{ __html: promptText }}
                    />
                ) : (
                    <p className="question-text selectable-content">{promptText}</p>
                ))}
            {isRangeQuestion ? (
                <div className="multiple-choice-checkbox-group">
                    <p className="selection-progress selectable-content">
                        {selectedLetters.length} / {totalQuestions} {t('selected', { defaultValue: 'selected' })}
                    </p>
                    <div className="options">
                        <Checkbox
                            name={`q-${startNum}-${endNum}`}
                            options={optionItems}
                            value={selectedLetters}
                            onChange={handleCheckboxChange}
                        />
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