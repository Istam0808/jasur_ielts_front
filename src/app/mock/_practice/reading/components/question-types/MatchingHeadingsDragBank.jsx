'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const MatchingHeadingsDragBank = ({
    question,
    answer,
    isReviewMode,
    inlinePickedOption,
    onInlinePickOptionChange
}) => {
    const { t } = useTranslation('reading');

    const userAnswers = useMemo(() => {
        if (answer && typeof answer === 'object' && !Array.isArray(answer)) return answer;
        return {};
    }, [answer]);

    const dragOptions = useMemo(() => {
        return Array.isArray(question?.dragOptions) ? question.dragOptions : [];
    }, [question?.dragOptions]);

    const usedValues = useMemo(() => {
        return new Set(Object.values(userAnswers).filter(Boolean));
    }, [userAnswers]);

    const availableOptions = useMemo(() => {
        return dragOptions.filter((opt) => opt?.value && !usedValues.has(opt.value));
    }, [dragOptions, usedValues]);

    const handleCardClick = (value) => {
        if (isReviewMode) return;
        const nextValue = inlinePickedOption === value ? null : value;
        onInlinePickOptionChange(question.id, nextValue);
    };

    const handleDragStart = (e, value) => {
        if (isReviewMode || !value) return;
        e.dataTransfer.setData('text/plain', value);
        e.dataTransfer.effectAllowed = 'move';
        onInlinePickOptionChange(question.id, value);
    };

    return (
        <div className="inline-matching-bank" data-question-type="matching-headings-inline">
            <div className="inline-matching-bank-header">
                <p className="inline-matching-bank-instruction">
                    {t('matchingHeadings.note', 'Drag an option to the matching blank in the text.')}
                </p>
            </div>

            <div className="inline-matching-bank-list">
                {availableOptions.length === 0 ? (
                    <div className="inline-matching-empty">
                        {t('matching.noOptions', 'No options left.')}
                    </div>
                ) : (
                    availableOptions.map((opt) => {
                        const isPicked = inlinePickedOption === opt.value;
                        return (
                            <button
                                key={opt.id || opt.value}
                                type="button"
                                className={`inline-matching-option ${isPicked ? 'picked' : ''}`}
                                draggable={!isReviewMode}
                                onDragStart={(e) => handleDragStart(e, opt.value)}
                                onClick={() => handleCardClick(opt.value)}
                                disabled={isReviewMode}
                                aria-pressed={isPicked}
                            >
                                <span className="inline-matching-option-text">{opt.text || opt.label || opt.value}</span>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default MatchingHeadingsDragBank;
