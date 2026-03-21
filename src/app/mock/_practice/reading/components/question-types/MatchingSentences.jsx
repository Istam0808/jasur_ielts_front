'use client';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../../styles/MatchingSentences.module.scss';

const getOptionValue = (option) => {
    if (option && typeof option === 'object') {
        return String(option.value || option.label || '').trim();
    }
    return String(option || '').trim();
};

const getOptionText = (option) => {
    if (option && typeof option === 'object') {
        return String(option.text || option.label || option.value || '').trim();
    }
    return String(option || '').trim();
};

const MatchingSentences = ({ question, answer, onAnswerChange, isReviewMode }) => {
    const { t } = useTranslation('reading');

    const items = useMemo(() => question.items || [], [question.items]);
    const options = useMemo(() => question.options || [], [question.options]);

    const userAnswers = useMemo(() => {
        if (answer && typeof answer === 'object' && !Array.isArray(answer)) return answer;
        return {};
    }, [answer]);

    const usedOptions = useMemo(() => new Set(Object.values(userAnswers).filter(Boolean)), [userAnswers]);
    const availableOptions = useMemo(
        () => options.filter((opt) => {
            const value = getOptionValue(opt);
            return value && !usedOptions.has(value);
        }),
        [options, usedOptions]
    );

    const [pickedOption, setPickedOption] = useState(null);

    const persistAnswers = (next) => {
        onAnswerChange(question.id, next);
    };

    const setAnswerForItem = (itemId, optionText) => {
        if (isReviewMode) return;

        const key = String(itemId);
        const prev = userAnswers[key];

        // Unique usage: if option is already used by another item, ignore
        if (optionText && usedOptions.has(optionText) && prev !== optionText) return;

        const next = { ...userAnswers, [key]: optionText || '' };
        persistAnswers(next);
    };

    const clearItem = (itemId) => {
        if (isReviewMode) return;
        const key = String(itemId);
        if (!userAnswers[key]) return;
        const next = { ...userAnswers };
        delete next[key];
        persistAnswers(next);
    };

    const handleDragStart = (e, optionText) => {
        if (isReviewMode) return;
        e.dataTransfer.setData('text/plain', optionText);
        e.dataTransfer.effectAllowed = 'move';
        setPickedOption(optionText);
    };

    const handleDrop = (e, itemId) => {
        if (isReviewMode) return;
        e.preventDefault();
        const optionText = e.dataTransfer.getData('text/plain');
        if (!optionText) return;
        setAnswerForItem(itemId, optionText);
        setPickedOption(null);
    };

    const handleDragOver = (e) => {
        if (isReviewMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const assignPickedToItem = (itemId) => {
        if (!pickedOption) return;
        setAnswerForItem(itemId, pickedOption);
        setPickedOption(null);
    };

    if (!items.length) {
        return (
            <div className={styles.empty}>
                {t('matching.noItemsAvailable', 'No items available.')}
            </div>
        );
    }

    return (
        <div className={styles.root} data-question-type="matching-sentences">
            <div className={styles.items}>
                {items.map((item) => {
                    const key = String(item.id);
                    const selected = userAnswers[key] || '';
                    const answered = Boolean(selected);

                    return (
                        <div
                            key={item.id}
                            className={`${styles.itemRow} ${answered ? styles.answered : styles.unanswered}`}
                        >
                            <div className={styles.itemText}>
                                <span className={styles.itemQuestion}>{item.text}</span>
                            </div>

                            <div
                                className={styles.dropZone}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, item.id)}
                                onClick={() => assignPickedToItem(item.id)}
                                role="button"
                                tabIndex={isReviewMode ? -1 : 0}
                                aria-disabled={isReviewMode}
                            >
                                {selected ? (
                                    <div className={styles.selected}>
                                        <span className={styles.selectedNumber}>{item.order ?? ''}</span>
                                        <span className={styles.selectedText}>
                                            {getOptionText(options.find((opt) => getOptionValue(opt) === selected) || selected)}
                                        </span>
                                        {!isReviewMode && (
                                            <button
                                                type="button"
                                                className={styles.clearBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    clearItem(item.id);
                                                }}
                                            >
                                                {t('clear', 'Clear')}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className={styles.placeholder}>
                                        <span className={styles.placeholderNumber}>{item.order ?? ''}</span>
                                        {pickedOption ? (
                                            <span className={styles.placeholderHint}>
                                                {t('matching.tapToAssign', 'Click to assign selected option')}
                                            </span>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className={styles.bankWrap}>
                <div className={styles.bankHeader}>
                    <div className={styles.bankTitle}>
                        {t('matching.options', 'Options')}
                    </div>
                    {pickedOption ? (
                        <button
                            type="button"
                            className={styles.cancelPick}
                            onClick={() => setPickedOption(null)}
                            disabled={isReviewMode}
                        >
                            {t('cancel', 'Cancel')}
                        </button>
                    ) : null}
                </div>

                <div className={styles.bank}>
                    {availableOptions.length === 0 ? (
                        <div className={styles.bankEmpty}>
                            {t('matching.noOptions', 'No options left.')}
                        </div>
                    ) : (
                        availableOptions.map((opt) => (
                            <div
                                key={getOptionValue(opt)}
                                className={`${styles.optionCard} ${pickedOption === getOptionValue(opt) ? styles.picked : ''}`}
                                draggable={!isReviewMode}
                                onDragStart={(e) => handleDragStart(e, getOptionValue(opt))}
                                onClick={() => !isReviewMode && setPickedOption(getOptionValue(opt))}
                                role="button"
                                tabIndex={isReviewMode ? -1 : 0}
                                aria-disabled={isReviewMode}
                            >
                                {getOptionText(opt)}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default MatchingSentences;

