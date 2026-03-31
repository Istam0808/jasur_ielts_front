'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../../styles/MatchingQuestion.module.scss';
import SelectOption from '@/components/common/input-types/SelectOption';
import CorrectAnswerInfo from '@/components/common/CorrectAnswerInfo';
import sanitizeHtml from '@/utils/sanitizeHtml';

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

const getOptionValue = (option, index = 0) => {
    if (option && typeof option === 'object') {
        return String(option.value ?? option.label ?? option.answer ?? String.fromCharCode(65 + index)).trim();
    }
    const parsed = splitOptionLabelAndText(option);
    return String(parsed.label || '').trim();
};

const getOptionText = (option) => {
    if (option && typeof option === 'object') {
        return String(option.text ?? option.answer ?? option.label ?? option.value ?? '').trim();
    }
    const parsed = splitOptionLabelAndText(option);
    return parsed.text || String(option || '').trim();
};

const parseIndexedPrompt = (value, fallbackIndex = 0) => {
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

const hasHtmlTags = (value) => /<\/?[a-z][\s\S]*>/i.test(String(value || ''));

const MatchingQuestion = ({ question, answer, onAnswerChange, isReviewMode, readingId, reviewMap, difficulty }) => {
    const { t } = useTranslation('reading');

    const userAnswers = useMemo(() => {
        return answer || {};
    }, [answer]);

    // Get correct answers for review mode (supports both advanced via reviewMap and basic via embedded fields)
    const correctAnswers = useMemo(() => {
        if (!isReviewMode) return {};

        const type = question.type;

        // Helper to map when we have external answers map (advanced)
        const mapFromReview = () => {
            if (!readingId || !reviewMap) return null;
            switch (type) {
                case 'matching_information': {
                    const information = question.information || [];
                    const infoAnswers = {};
                    for (let i = 0; i < information.length; i++) {
                        const infoValue = typeof information[i] === 'object' ? information[i].info : information[i];
                        const questionNumber = infoValue.split('.')[0].trim();
                        const ans = reviewMap ? reviewMap[String(questionNumber)] : null;
                        if (ans) infoAnswers[infoValue] = ans;
                    }
                    return infoAnswers;
                }
                case 'matching_features': {
                    const features = question.features || [];
                    const featureAnswers = {};
                    for (let i = 0; i < features.length; i++) {
                        const feature = features[i];
                        const questionNumber = feature.split('.')[0].trim();
                        const ans = reviewMap ? reviewMap[String(questionNumber)] : null;
                        if (ans) featureAnswers[feature.slice(0, feature.indexOf('.'))] = ans;
                    }
                    return featureAnswers;
                }
                case 'sentence_completion': {
                    const sentences = question.sentences || [];
                    const sentenceAnswers = {};
                    for (let i = 0; i < sentences.length; i++) {
                        const sentence = sentences[i];
                        const questionNumber = (typeof sentence === 'object' ? sentence.beginning : sentence).split('.')[0].trim();
                        const ans = reviewMap ? reviewMap[String(questionNumber)] : null;
                        if (ans) sentenceAnswers[typeof sentence === 'object' ? sentence.beginning : sentence] = ans;
                    }
                    return sentenceAnswers;
                }
            }
            return null;
        };

        // Helper to map from embedded correct fields (basic)
        const mapFromEmbedded = () => {
            switch (type) {
                case 'matching_information': {
                    const information = question.information || [];
                    const map = {};
                    information.forEach((item) => {
                        const infoValue = typeof item === 'object' ? item.info : item;
                        const correct = typeof item === 'object' ? item.correct : undefined;
                        if (correct) map[infoValue] = correct;
                    });
                    return map;
                }
                case 'matching_features': {
                    const features = question.features || [];
                    const map = {};
                    features.forEach((feature) => {
                        // Feature may be string like "A. text" or object { id: 'A', text: '...', correct: 'B' }
                        if (typeof feature === 'object') {
                            const id = feature.id || (feature.text ? feature.text.split('.')[0] : '');
                            if (feature.correct && id) map[id] = feature.correct;
                        } else if (typeof feature === 'string') {
                            // No embedded correct in plain string form
                        }
                    });
                    return map;
                }
                case 'sentence_completion': {
                    const sentences = question.sentences || [];
                    const map = {};
                    sentences.forEach((sentence) => {
                        if (typeof sentence === 'object') {
                            const key = sentence.beginning;
                            if (sentence.correct && key) map[key] = sentence.correct;
                        }
                    });
                    return map;
                }
            }
            return {};
        };

        // Prefer external map for advanced tests; fallback to embedded
        const result = mapFromReview() || mapFromEmbedded();
        return result;
    }, [isReviewMode, readingId, question, reviewMap]);

    // Removed overall isCorrect summary calculation since per-question feedback is shown inline

    const handleAnswerChange = (itemKey, selectedValue) => {
        if (isReviewMode) return;

        const newAnswers = { ...userAnswers, [itemKey]: selectedValue };
        onAnswerChange(question.id, newAnswers);
    };

    const getItemStatus = (itemKey) => {
        const userResponse = userAnswers[itemKey];

        if (!isReviewMode) {
            return {
                isAnswered: !!userResponse,
                showFeedback: false,
                isCorrect: false
            };
        }

        // In review mode, check if the user's answer is correct using normalized comparison
        const correctAnswer = correctAnswers[itemKey];

        // For matching_information questions, the correct answer is a letter (A, B, C, etc.)
        // but the user answer is the full text (e.g., "Paragraph A")
        // We need to extract the letter from the user's answer and compare it with the correct answer
        let isCorrect = false;
        if (correctAnswer && userResponse) {
            if (question.type === 'matching_information') {
                // User answer is expected to be a letter ("A"), but keep tolerant extraction for legacy values.
                const userLetter = String(userResponse).trim().match(/[A-Za-z]$/)?.[0]?.toUpperCase();
                isCorrect = userLetter === String(correctAnswer).trim().toUpperCase();
            } else if (question.type === 'matching_headings') {
                // The correct answer may be a short token (e.g., "iv" or "A") while the userResponse
                // contains the full heading text possibly including the token. Try to extract a comparable token.
                const token = typeof correctAnswer === 'string' ? String(correctAnswer).replace(/\./g, '').trim() : String(correctAnswer);
                const isRoman = /^[ivxlcdm]+$/i.test(token);
                const isSingleLetter = /^[A-Za-z]$/.test(token);

                if ((isRoman || isSingleLetter) && typeof userResponse === 'string') {
                    const trailing = userResponse.trim().match(/([A-Za-z]|[ivxlcdm]{1,4})\.?$/i)?.[1];
                    const leading = userResponse.trim().match(/^([A-Za-z]|[ivxlcdm]{1,4})\.?/i)?.[1];
                    const extracted = (trailing || leading || '').toString().trim();
                    if (extracted) {
                        isCorrect = normalizeText(extracted) === normalizeText(token);
                    } else {
                        isCorrect = normalizeText(userResponse) === normalizeText(correctAnswer);
                    }
                } else {
                    isCorrect = normalizeText(userResponse) === normalizeText(correctAnswer);
                }
            } else {
                // For other question types, use normalized comparison
                isCorrect = normalizeText(userResponse) === normalizeText(correctAnswer);
            }
        }
        
        const showFeedback = Boolean(correctAnswer);

        return {
            isAnswered: !!userResponse,
            showFeedback,
            isCorrect: isCorrect,
            correctAnswer: getFullTextForLetter(correctAnswer, question.type)
        };
    };

    const getFeatureStatus = (featureId) => {
        const userResponse = userAnswers[featureId];

        if (!isReviewMode) {
            return {
                isAnswered: !!userResponse,
                showFeedback: false,
                isCorrect: false
            };
        }

        // In review mode, check if the user's answer is correct using normalized comparison
        const correctAnswer = correctAnswers[featureId];

        // For matching_features questions, the correct answer is a letter (A, B, C, etc.)
        // but the user answer is the full text (e.g., "A. the Ancient Greeks")
        // We need to extract the letter from the user's answer and compare it with the correct answer
        let isCorrect = false;
        if (correctAnswer && userResponse) {
            if (question.type === 'matching_features') {
                // Extract letter from user response (e.g., "A. the Ancient Greeks" -> "A")
                const userLetter = userResponse.match(/^[A-Z]/)?.[0];
                isCorrect = userLetter === correctAnswer;
            } else {
                // For other question types, use normalized comparison
                isCorrect = normalizeText(userResponse) === normalizeText(correctAnswer);
            }
        }
        
        const showFeedback = Boolean(correctAnswer);

        return {
            isAnswered: !!userResponse,
            showFeedback,
            isCorrect: isCorrect,
            correctAnswer: getFullTextForLetter(correctAnswer, question.type)
        };
    };

    // Helper function to normalize text (same as in answerChecker.js)
    const normalizeText = (text) => {
        if (!text) return '';

        return text.toString()
            .toLowerCase()
            .trim()
            // Remove extra whitespace (multiple spaces, tabs, newlines)
            .replace(/\s+/g, ' ')
            // Remove common punctuation that might interfere with matching
            .replace(/[.,;:!?]/g, '')
            // Normalize quotes and apostrophes
            .replace(/[''""]/g, "'")
            // Remove extra spaces around hyphens and slashes
            .replace(/\s*[-\/]\s*/g, '/')
            // Final trim to remove any remaining whitespace
            .trim();
    };

    // Helper function to get the full text for a letter answer
    const getFullTextForLetter = (letter, questionType) => {
        if (!letter) return letter;
        
        if (questionType === 'matching_information') {
            // For matching_information, options are often like "Paragraph A"
            // but in some datasets they may be just letters ("A") or "A. ..."
            const options = question.options || [];
            const upperLetter = String(letter).toUpperCase();
            const option = options.find((opt) => {
                const value = getOptionValue(opt);
                return value.toUpperCase() === upperLetter;
            });
            // Sensible fallback if nothing matched
            return option ? getOptionText(option) : `Paragraph ${letter}`;
        } else if (questionType === 'matching_features') {
            // For matching_features, find the item that starts with the letter
            const items = question.items || question.options || [];
            const item = items.find(item => {
                const itemValue = getOptionValue(item);
                return itemValue.toUpperCase() === String(letter).toUpperCase();
            });
            return item ? getOptionText(item) : letter;
        } else if (questionType === 'sentence_completion') {
            // For sentence_completion, find the ending that starts with the letter
            const endings = question.endings || [];
            const ending = endings.find((ending) => {
                const value = getOptionValue(ending);
                return value.toUpperCase() === String(letter).toUpperCase();
            });
            return ending ? getOptionText(ending) : letter;
        }
        
        return letter;
    };

    const renderMatchingInformation = () => {
        const options = question.options || [];
        const information = question.information || [];
        const letterColumns = options
            .map((opt, idx) => String(getOptionValue(opt, idx) || '').trim().toUpperCase())
            .filter((val, idx, arr) => val && arr.indexOf(val) === idx);

        if (!information || information.length === 0) {
            return <div className={styles.errorMessage}>{t('matching.noInformationItems')}</div>;
        }

        if (!letterColumns.length) {
            return <div className={styles.errorMessage}>{t('matching.noItemsAvailable')}</div>;
        }

        return (
            <div className={styles.matchingInformation}>
                <div className={styles.matchingInfoTableWrap}>
                    <table className={styles.matchingInfoTable}>
                        <thead>
                            <tr>
                                <th className={styles.colNumber}>#</th>
                                <th className={styles.colQuestion}>Question</th>
                                {letterColumns.map((letter) => (
                                    <th key={letter} className={styles.colOption}>{letter}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {information.map((info, idx) => {
                                const infoValue = typeof info === 'object' ? info.info : info;
                                const itemStatus = getItemStatus(infoValue);
                                const selectedOption = String(userAnswers[infoValue] || '').trim().toUpperCase();
                                const { number, text } = parseIndexedPrompt(infoValue, idx);

                                return (
                                    <tr
                                        key={idx}
                                        className={`${styles.infoRow} ${itemStatus.isAnswered ? styles.answered : styles.unanswered} ${itemStatus.showFeedback ? (itemStatus.isCorrect ? styles.correct : styles.incorrect) : ''}`}
                                    >
                                        <td className={styles.numberCell}>{number}</td>
                                        <td className={styles.questionCell}>
                                            <span>{text}</span>
                                            {itemStatus.showFeedback && (
                                                <span className={`${styles.feedbackIcon} ${itemStatus.isCorrect ? styles.correct : styles.incorrect}`}>
                                                    {itemStatus.isCorrect ? '✓' : '✗'}
                                                </span>
                                            )}
                                            {itemStatus.showFeedback && !itemStatus.isCorrect && itemStatus.correctAnswer && (
                                                <CorrectAnswerInfo
                                                    label={t('correctAnswer') + ':'}
                                                    value={itemStatus.correctAnswer}
                                                />
                                            )}
                                        </td>
                                        {letterColumns.map((letter) => {
                                            const checked = selectedOption === letter;
                                            return (
                                                <td key={`${idx}-${letter}`} className={styles.optionCell}>
                                                    <button
                                                        type="button"
                                                        className={`${styles.optionButton} ${checked ? styles.selected : ''}`}
                                                        onClick={() => handleAnswerChange(infoValue, letter)}
                                                        disabled={isReviewMode}
                                                        aria-pressed={checked}
                                                        aria-label={`${number}: ${letter}`}
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
            </div>
        );
    };

    const renderMatchingFeatures = () => {
        // Handle both 'items' and 'options' properties for matching_features
        const items = question.items || question.options || [];
        const features = question.features || [];

        if (!features || features.length === 0) {
            return <div className={styles.errorMessage}>{t('matching.noItemsAvailable')}</div>;
        }

        return (
            <div className={styles.matchingFeatures}>
                <div className={styles.availableFeatures}>
                    <h4>{t('features')}:</h4>
                    <div className={styles.featuresList}>
                        {features.map((feature, idx) => {
                            const featureId = feature.slice(0, feature.indexOf("."));
                            const featureText = feature.substring(3);
                            const selectedItem = userAnswers[featureId];
                            const featureStatus = getFeatureStatus(featureId);

                            // Create options for the dropdown
                            const options = items.map((item, itemIdx) => {
                                const itemLetter = getOptionValue(item, itemIdx);
                                const itemText = getOptionText(item);
                                return {
                                    value: itemLetter,
                                    label: itemText || itemLetter,
                                    disabled: itemText.startsWith('EXAMPLE')
                                };
                            });

                            return (
                                <div
                                    key={idx}
                                    className={`${styles.featureItem} ${featureStatus.isAnswered ? styles.answered : styles.unanswered} ${featureStatus.showFeedback ? (featureStatus.isCorrect ? styles.correct : styles.incorrect) : ''
                                        } ${isReviewMode ? styles.reviewMode : ''}`}
                                >
                                    <div className={styles.featureContent}>
                                        <span className={styles.featureId}>{featureId}.</span>
                                        <span className={styles.featureText}>{featureText}</span>
                                        {featureStatus.showFeedback && (
                                            <span className={`${styles.feedbackIcon} ${featureStatus.isCorrect ? styles.correct : styles.incorrect}`}>
                                                {featureStatus.isCorrect ? '✓' : '✗'}
                                            </span>
                                        )}
                                    </div>
                                    <div className={styles.answerSelector}>
                                        <SelectOption
                                          options={options}
                                          value={selectedItem || null}
                                          onChange={(val) => handleAnswerChange(featureId, val || '')}
                                          placeholder={t('selectFeature')}
                                          disabled={isReviewMode}
                                        />
                                        {featureStatus.showFeedback && !featureStatus.isCorrect && featureStatus.correctAnswer && (
                                            <CorrectAnswerInfo
                                              label={t('correctAnswer') + ':'}
                                              value={featureStatus.correctAnswer}
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderSentenceCompletion = () => {
        // Use endings for sentence_completion
        const endings = question.endings || [];
        const sentences = question.sentences || [];

        if (!sentences || sentences.length === 0) {
            return <div className={styles.errorMessage}>{t('matching.noSentencesAvailable')}</div>;
        }

        return (
            <div className={styles.sentenceCompletion}>
                <div className={styles.availableEndings}>
                    <h4>{t('endings')}:</h4>
                    <div className={styles.endingsList}>
                        {endings.map((ending, idx) => (
                            <div key={idx} className={styles.endingItem}>
                                <span className={styles.endingText}>{getOptionText(ending)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.sentencesContainer}>
                    {sentences.map((sentence, idx) => {
                        // Handle both old structure (object with beginning property) and new structure (simple string)
                        const sentenceValue = typeof sentence === 'object' ? sentence.beginning : sentence;
                        const itemStatus = getItemStatus(sentenceValue);
                        const selectedEnding = userAnswers[sentenceValue];

                        return (
                            <div
                                key={idx}
                                className={`${styles.sentenceItem} ${itemStatus.isAnswered ? styles.answered : styles.unanswered} ${itemStatus.showFeedback ? (itemStatus.isCorrect ? styles.correct : styles.incorrect) : ''
                                    } ${isReviewMode ? styles.reviewMode : ''}`}
                            >
                                <div className={styles.sentenceBeginning}>
                                    {sentences.length > 1 && (
                                        <span className={styles.sentenceNumber}>{sentenceValue.slice(0, sentenceValue.indexOf("."))}.</span>
                                    )}
                                    <span className={styles.sentenceText}>{sentenceValue.slice(sentenceValue.indexOf(".")+1)}</span>
                                    {itemStatus.showFeedback && (
                                        <span className={`${styles.feedbackIcon} ${itemStatus.isCorrect ? styles.correct : styles.incorrect}`}>
                                            {itemStatus.isCorrect ? '✓' : '✗'}
                                        </span>
                                    )}
                                </div>

                                <div className={styles.answerSelector}>
                                    <SelectOption
                                      options={endings.map((ending) => ({ 
                                        value: getOptionValue(ending), 
                                        label: getOptionText(ending),
                                        disabled: getOptionText(ending).startsWith('EXAMPLE')
                                      }))}
                                      value={selectedEnding || null}
                                      onChange={(val) => handleAnswerChange(sentenceValue, val || '')}
                                      placeholder={t('selectEnding')}
                                      disabled={isReviewMode}
                                    />
                                    {itemStatus.showFeedback && !itemStatus.isCorrect && itemStatus.correctAnswer && (
                                        <CorrectAnswerInfo
                                          label={t('correctAnswer') + ':'}
                                          value={itemStatus.correctAnswer}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderContent = () => {
        switch (question.type) {
            case 'matching_information':
                return renderMatchingInformation();
            case 'matching_features':
                return renderMatchingFeatures();
            case 'sentence_completion':
                return renderSentenceCompletion();
            default:
                return <div className={styles.errorMessage}>{t('matching.unsupportedType')}</div>;
        }
    };

    const renderInstruction = () => {
        const inst = typeof question?.instruction === 'string' ? question.instruction.trim() : '';
        if (!inst || inst === '.') return null;

        if (hasHtmlTags(inst)) {
            return (
                <div
                    className={`${styles.questionInstruction} question-instruction`}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(inst) }}
                />
            );
        }

        return <div className={`${styles.questionInstruction} question-instruction`}>{inst}</div>;
    };

    return (
        <div className={styles.matchingQuestionContainer}>
            {renderInstruction()}
            {renderContent()}
        </div>
    );
};

export default MatchingQuestion; 