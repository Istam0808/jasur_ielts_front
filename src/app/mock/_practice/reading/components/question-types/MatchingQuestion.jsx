'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../../styles/MatchingQuestion.module.scss';
import SelectOption from '@/components/common/input-types/SelectOption';
import CorrectAnswerInfo from '@/components/common/CorrectAnswerInfo';

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
                // Extract letter from user response (e.g., "Paragraph A" -> "A")
                const userLetter = userResponse.match(/[A-Z]$/)?.[0];
                isCorrect = userLetter === correctAnswer;
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
                const text = String(opt).trim();
                const upper = text.toUpperCase();
                // Pattern 1: "Paragraph A"
                if (/^PARAGRAPH\s+[A-Z]$/.test(upper)) {
                    return upper.endsWith(` ${upperLetter}`);
                }
                // Pattern 2: "A. Something"
                if (/^[A-Z]\./.test(text)) {
                    return text.startsWith(`${upperLetter}.`);
                }
                // Pattern 3: just the letter
                if (/^[A-Z]$/.test(upper)) {
                    return upper === upperLetter;
                }
                // Fallback: ends with space + letter
                return upper.endsWith(` ${upperLetter}`);
            });
            // Sensible fallback if nothing matched
            return option || `Paragraph ${letter}`;
        } else if (questionType === 'matching_features') {
            // For matching_features, find the item that starts with the letter
            const items = question.items || question.options || [];
            const item = items.find(item => {
                const itemValue = typeof item === 'object' ? item.item : item;
                return itemValue.startsWith(`${letter}.`);
            });
            return item ? (typeof item === 'object' ? item.item : item) : letter;
        } else if (questionType === 'sentence_completion') {
            // For sentence_completion, find the ending that starts with the letter
            const endings = question.endings || [];
            const ending = endings.find(ending => ending.startsWith(`${letter}.`));
            return ending || letter;
        }
        
        return letter;
    };

    const renderMatchingInformation = () => {
        // In the new structure, options are directly provided as an array
        const options = question.options || [];
        const information = question.information || [];

        if (!information || information.length === 0) {
            return <div className={styles.errorMessage}>{t('matching.noInformationItems')}</div>;
        }

        return (
            <div className={styles.matchingInformation}>
                <div className={styles.informationItems}>
                    {information.map((info, idx) => {
                        // Handle both old structure (object with info property) and new structure (simple string)
                        const infoValue = typeof info === 'object' ? info.info : info;
                        const itemStatus = getItemStatus(infoValue);
                        const selectedOption = userAnswers[infoValue];

                        return (
                            <div
                                key={idx}
                                className={`${styles.matchingItem} ${itemStatus.isAnswered ? styles.answered : styles.unanswered} ${itemStatus.showFeedback ? (itemStatus.isCorrect ? styles.correct : styles.incorrect) : ''
                                    } ${isReviewMode ? styles.reviewMode : ''}`}
                            >
                                <div className={styles.itemContent}>
                                    <span className={styles.itemNumber}>{infoValue.slice(0, infoValue.indexOf("."))}.</span>
                                    <span className={styles.itemText}>{infoValue.slice(infoValue.indexOf(".")+1)}</span>
                                    {itemStatus.showFeedback && (
                                        <span className={`${styles.feedbackIcon} ${itemStatus.isCorrect ? styles.correct : styles.incorrect}`}>
                                            {itemStatus.isCorrect ? '✓' : '✗'}
                                        </span>
                                    )}
                                </div>

                                <div className={styles.answerSelector}>
                                    <SelectOption
                                      options={options.map((o) => ({ 
                                        value: o, 
                                        label: o,
                                        disabled: o.startsWith('EXAMPLE')
                                      }))}
                                      value={selectedOption || null}
                                      onChange={(val) => handleAnswerChange(infoValue, val || '')}
                                      placeholder={t('selectOption')}
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
                                const itemValue = typeof item === 'object' ? item.item : item;
                                // Extract the letter from the item (e.g., "A. the Ancient Greeks" -> "A")
                                const itemLetter = itemValue.charAt(0);
                                return {
                                    value: itemLetter,
                                    label: itemValue,
                                    disabled: itemValue.startsWith('EXAMPLE')
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
                                <span className={styles.endingId}>{ending.slice(0, ending.indexOf(".")+1)}</span>
                                <span className={styles.endingText}>{ending.slice(ending.indexOf(".")+1)}</span>
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
                                        value: ending.charAt(0), 
                                        label: ending,
                                        disabled: ending.startsWith('EXAMPLE')
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

    return (
        <div className={styles.matchingQuestionContainer}>
            <div className={styles.questionInstruction}>
                <p className={styles.instructionText}>{question.instruction}</p>
            </div>

            {renderContent()}
        </div>
    );
};

export default MatchingQuestion; 