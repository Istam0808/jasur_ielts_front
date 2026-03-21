'use client';

import { useMemo } from 'react';
import sanitizeHtml from '@/utils/sanitizeHtml';

const PLACEHOLDER_PATTERN = /\{\{question:(\d+)\}\}/g;

const PassageWithDropzones = ({
    htmlText,
    question,
    questionRange,
    answer,
    isReviewMode,
    onAnswerChange,
    inlinePickedOption,
    onInlinePickOptionChange
}) => {
    const userAnswers = useMemo(() => {
        if (answer && typeof answer === 'object' && !Array.isArray(answer)) return answer;
        return {};
    }, [answer]);

    const dragOptions = useMemo(() => {
        return Array.isArray(question?.dragOptions) ? question.dragOptions : [];
    }, [question?.dragOptions]);

    const optionsByValue = useMemo(() => {
        const map = new Map();
        dragOptions.forEach((opt) => {
            if (opt?.value) map.set(opt.value, opt);
        });
        return map;
    }, [dragOptions]);

    const usedValues = useMemo(() => {
        return new Set(Object.values(userAnswers).filter(Boolean));
    }, [userAnswers]);

    const parsedParts = useMemo(() => {
        if (typeof htmlText !== 'string' || !htmlText.trim()) return [];
        const parts = [];
        let lastIndex = 0;
        let match;
        const localRegex = new RegExp(PLACEHOLDER_PATTERN);

        while ((match = localRegex.exec(htmlText)) !== null) {
            const [token, placeholderId] = match;
            const start = match.index;

            if (start > lastIndex) {
                parts.push({ type: 'html', value: htmlText.slice(lastIndex, start) });
            }

            parts.push({ type: 'placeholder', value: String(placeholderId), token });
            lastIndex = start + token.length;
        }

        if (lastIndex < htmlText.length) {
            parts.push({ type: 'html', value: htmlText.slice(lastIndex) });
        }

        return parts;
    }, [htmlText]);

    const placeholderLabelById = useMemo(() => {
        const labels = new Map();
        const startNumber = Number(questionRange?.start);

        if (!Number.isFinite(startNumber)) {
            return labels;
        }

        const placeholderIds = parsedParts
            .filter((part) => part.type === 'placeholder')
            .map((part) => Number(part.value))
            .filter((value) => Number.isFinite(value));

        if (!placeholderIds.length) {
            return labels;
        }

        const minPlaceholderId = Math.min(...placeholderIds);
        placeholderIds.forEach((rawId) => {
            const displayNumber = startNumber + (rawId - minPlaceholderId);
            labels.set(String(rawId), String(displayNumber));
        });

        return labels;
    }, [parsedParts, questionRange?.start]);

    const assignValueToPlaceholder = (placeholderId, value) => {
        if (isReviewMode || !value) return;
        const key = String(placeholderId);
        const prevValue = userAnswers[key];

        if (usedValues.has(value) && prevValue !== value) return;

        const nextAnswers = { ...userAnswers, [key]: value };
        onAnswerChange(question.id, nextAnswers);
        onInlinePickOptionChange(question.id, null);
    };

    const clearPlaceholder = (placeholderId) => {
        if (isReviewMode) return;
        const key = String(placeholderId);
        if (!userAnswers[key]) return;

        const nextAnswers = { ...userAnswers };
        delete nextAnswers[key];
        onAnswerChange(question.id, nextAnswers);
    };

    const handleDrop = (e, placeholderId) => {
        if (isReviewMode) return;
        e.preventDefault();
        const value = e.dataTransfer.getData('text/plain');
        if (!value) return;
        assignValueToPlaceholder(placeholderId, value);
    };

    const handleDragOver = (e) => {
        if (isReviewMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handlePlaceholderClick = (placeholderId) => {
        if (isReviewMode || !inlinePickedOption) return;
        assignValueToPlaceholder(placeholderId, inlinePickedOption);
    };

    return (
        <div className="passage-html inline-drop-passage">
            {parsedParts.map((part, index) => {
                if (part.type === 'html') {
                    const safeHtml = sanitizeHtml(part.value);
                    if (!safeHtml.trim()) return null;
                    return (
                        <div
                            key={`html-${index}`}
                            className="passage-html-chunk"
                            dangerouslySetInnerHTML={{ __html: safeHtml }}
                        />
                    );
                }

                const placeholderId = String(part.value);
                const selectedValue = userAnswers[placeholderId];
                const selectedOption = selectedValue ? optionsByValue.get(selectedValue) : null;
                const hasValue = Boolean(selectedValue);

                return (
                    <span
                        key={`placeholder-${placeholderId}-${index}`}
                        className={`inline-drop-placeholder ${hasValue ? 'filled' : 'empty'} ${isReviewMode ? 'review' : ''}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, placeholderId)}
                        onClick={() => handlePlaceholderClick(placeholderId)}
                        role="button"
                        tabIndex={isReviewMode ? -1 : 0}
                        aria-disabled={isReviewMode}
                        data-question-id={question.id}
                        data-blank-id={placeholderId}
                    >
                        {hasValue ? (
                            <span className="inline-drop-filled">
                                <span className="inline-drop-filled-text">
                                    {selectedOption?.text || 'Selected option'}
                                </span>
                                {!isReviewMode && (
                                    <button
                                        type="button"
                                        className="inline-drop-clear"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            clearPlaceholder(placeholderId);
                                        }}
                                    >
                                        x
                                    </button>
                                )}
                            </span>
                        ) : (
                            <span className="inline-drop-empty-label">
                                {inlinePickedOption
                                    ? 'Click to place'
                                    : (placeholderLabelById.get(placeholderId) || placeholderId)}
                            </span>
                        )}
                    </span>
                );
            })}
        </div>
    );
};

export default PassageWithDropzones;
