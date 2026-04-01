'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import sanitizeHtml from '@/utils/sanitizeHtml';
import CorrectAnswerInfo from '@/components/common/CorrectAnswerInfo';
import styles from '../../styles/MatchingPeopleQuestion.module.scss';

const hasHtmlTags = (value) => /<\/?[a-z][\s\S]*>/i.test(String(value || ''));

const parseStatement = (value, fallbackIndex = 0) => {
    const source = String(value || '').trim();
    const match = source.match(/^(\d+)\.\s*(.+)$/);
    if (match) {
        return {
            number: String(match[1]).trim(),
            text: String(match[2] || '').trim()
        };
    }

    return {
        number: String(fallbackIndex + 1),
        text: source
    };
};

const getOptionValue = (option, index = 0) => {
    if (option && typeof option === 'object') {
        return String(option.value ?? option.label ?? option.answer ?? String.fromCharCode(65 + index)).trim().toUpperCase();
    }
    if (typeof option === 'string') {
        const match = option.trim().match(/^([A-Za-z])[\)\].:\-]?\s*(.*)$/);
        if (match) return String(match[1]).toUpperCase();
    }
    return String.fromCharCode(65 + index);
};

const getOptionText = (option) => {
    if (option && typeof option === 'object') {
        return String(option.text ?? option.answer ?? option.label ?? option.value ?? '').trim();
    }
    if (typeof option === 'string') {
        const match = option.trim().match(/^[A-Za-z][\)\].:\-]?\s*(.*)$/);
        return match?.[1]?.trim() || option.trim();
    }
    return '';
};

const MatchingPeopleQuestion = ({ question, answer, onAnswerChange, isReviewMode, reviewMap }) => {
    const { t } = useTranslation('reading');
    const userAnswers = useMemo(() => answer || {}, [answer]);

    const peopleOptions = useMemo(() => {
        const base = Array.isArray(question?.people) && question.people.length
            ? question.people
            : (question?.options || []);
        return base
            .map((opt, idx) => ({
                value: getOptionValue(opt, idx),
                text: getOptionText(opt) || getOptionValue(opt, idx)
            }))
            .filter((opt) => opt.value);
    }, [question?.people, question?.options]);

    const statements = useMemo(() => {
        return Array.isArray(question?.statements) ? question.statements : [];
    }, [question?.statements]);

    const embeddedCorrectMap = useMemo(() => {
        const map = {};
        (question?.answers || []).forEach((item) => {
            const key = item?.statement ?? item?.info ?? item?.section;
            const val = item?.answer ?? item?.correct ?? item?.value;
            if (!key || !val) return;
            map[String(key)] = String(val).trim().toUpperCase();
        });
        return map;
    }, [question?.answers]);

    const correctMap = useMemo(() => {
        if (!isReviewMode) return {};
        const map = {};

        statements.forEach((statement) => {
            const { number } = parseStatement(statement);
            const external = reviewMap?.[String(number)];
            if (external) {
                map[statement] = String(external).trim().toUpperCase();
                return;
            }
            if (embeddedCorrectMap[statement]) {
                map[statement] = embeddedCorrectMap[statement];
            }
        });

        return map;
    }, [isReviewMode, statements, reviewMap, embeddedCorrectMap]);

    const getOptionDisplay = (letter) => {
        const normalized = String(letter || '').trim().toUpperCase();
        const person = peopleOptions.find((opt) => opt.value === normalized);
        if (!person) return normalized;
        return `${person.value} ${person.text}`.trim();
    };

    const getRowStatus = (statement) => {
        const selected = String(userAnswers?.[statement] || '').trim().toUpperCase();
        const correct = String(correctMap?.[statement] || '').trim().toUpperCase();
        const isAnswered = Boolean(selected);

        if (!isReviewMode || !correct) {
            return { isAnswered, showFeedback: false, isCorrect: false, correctAnswer: '' };
        }

        const isCorrect = selected && selected === correct;
        return {
            isAnswered,
            showFeedback: true,
            isCorrect: Boolean(isCorrect),
            correctAnswer: getOptionDisplay(correct)
        };
    };

    const handleSelect = (statement, letter) => {
        if (isReviewMode) return;
        const selected = String(userAnswers?.[statement] || '').trim().toUpperCase();
        const nextValue = selected === letter ? '' : letter;
        onAnswerChange(question.id, {
            ...userAnswers,
            [statement]: nextValue
        });
    };

    const renderInstruction = () => {
        const instruction = typeof question?.instruction === 'string' ? question.instruction.trim() : '';
        if (!instruction || instruction === '.') return null;

        if (hasHtmlTags(instruction)) {
            return (
                <div
                    className={styles.questionInstruction}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(instruction) }}
                />
            );
        }

        return <div className={styles.questionInstruction}>{instruction}</div>;
    };

    if (!statements.length || !peopleOptions.length) {
        return <div className={styles.errorMessage}>{t('matching.noItemsAvailable')}</div>;
    }

    return (
        <div className={styles.matchingPeopleContainer}>
            {renderInstruction()}

            <div className={styles.tableWrap}>
                <table className={styles.peopleTable}>
                    <thead>
                        <tr>
                            <th className={styles.itemHeader}>{t('items', { defaultValue: 'Items' })}</th>
                            {peopleOptions.map((person) => (
                                <th key={person.value} className={styles.personHeader}>{person.value}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {statements.map((statement, rowIndex) => {
                            const parsed = parseStatement(statement, rowIndex);
                            const selected = String(userAnswers?.[statement] || '').trim().toUpperCase();
                            const status = getRowStatus(statement);

                            return (
                                <tr
                                    key={`${parsed.number}-${rowIndex}`}
                                    className={`${styles.statementRow} ${status.isAnswered ? styles.answered : ''} ${status.showFeedback ? (status.isCorrect ? styles.correct : styles.incorrect) : ''}`}
                                >
                                    <td className={styles.statementCell}>
                                        <span className={styles.statementNumber}>{parsed.number}</span>
                                        <span className={styles.statementText}>{parsed.text}</span>
                                        {status.showFeedback && (
                                            <span className={`${styles.feedbackIcon} ${status.isCorrect ? styles.correct : styles.incorrect}`}>
                                                {status.isCorrect ? '✓' : '✗'}
                                            </span>
                                        )}
                                        {status.showFeedback && !status.isCorrect && status.correctAnswer && (
                                            <CorrectAnswerInfo
                                                label={t('correctAnswer') + ':'}
                                                value={status.correctAnswer}
                                            />
                                        )}
                                    </td>

                                    {peopleOptions.map((person) => {
                                        const checked = selected === person.value;
                                        return (
                                            <td key={`${statement}-${person.value}`} className={styles.optionCell}>
                                                <button
                                                    type="button"
                                                    className={`${styles.optionButton} ${checked ? styles.selected : ''}`}
                                                    onClick={() => handleSelect(statement, person.value)}
                                                    disabled={isReviewMode}
                                                    aria-pressed={checked}
                                                    aria-label={`${parsed.number}: ${person.value}`}
                                                >
                                                    {checked ? '●' : ''}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className={styles.peopleListBlock}>
                <h4>{t('listOfPeople', { defaultValue: 'List of people' })}</h4>
                <ul>
                    {peopleOptions.map((person) => (
                        <li key={`person-${person.value}`}>
                            <span className={styles.personLabel}>{person.value}</span>
                            <span className={styles.personText}>{person.text}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default MatchingPeopleQuestion;
