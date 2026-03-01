"use client";
import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { FiX, FiRefreshCw, FiArrowLeft, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { MdCheckCircle, MdCancel } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { formatExplanationRecursively } from '@/utils/common';
import Logo from '@/assets/logos/logoY.png';
import CircularProgressBar from '@/components/common/CircularProgressBar';
import useScrollLock from '@/hooks/useScrollLock';
import styles from './TestResultsModal.module.scss';

const TestResultsModal = memo(({
    isOpen = true,
    onClose,
    // Common props
    score,
    totalQuestions,
    difficulty,
    i18n,
    // For regular tests
    testQuestions = null,
    answers = null,
    onRestart = null,
    onReturn = null
}) => {
    const { t } = useTranslation(['test', 'practice', 'common']);

    // Lock scroll when modal is open
    useScrollLock(isOpen);

    const [expandedExplanations, setExpandedExplanations] = useState(new Set());
    const [correctAnswersData, setCorrectAnswersData] = useState(null);

    // Helper function to get text in current language (define early so others can use it)
    const getTextInCurrentLanguage = useCallback((text) => {
        if (typeof text === 'string') return text;
        if (typeof text === 'object' && text !== null) {
            return text[i18n.language] || text.en || Object.values(text)[0] || '';
        }
        return '';
    }, [i18n.language]);

    // Fetch correct answers from answer files for language tests
    useEffect(() => {
        if (difficulty && testQuestions && answers) {
            const fetchCorrectAnswers = async () => {
                try {
                    // IELTS-only mode
                    const normalizedDifficulty = (difficulty || '').toLowerCase();
                    const isLanguageTest = ['ielts', 'c2'].includes(normalizedDifficulty);
                    if (!isLanguageTest) return;

                    const response = await fetch(`/api/tests/answers?difficulty=c2`);
                    if (response.ok) {
                        const data = await response.json();
                        setCorrectAnswersData(data);
                    }
                } catch (error) {
                    console.error('Failed to fetch correct answers:', error);
                }
            };

            fetchCorrectAnswers();
        }
    }, [difficulty, testQuestions, answers]);

    // Helper function to get correct answer from answer files
    const getCorrectAnswerFromAnswerFile = useCallback((questionId, question) => {
        if (!correctAnswersData || !correctAnswersData.tests) return null;
        const qa = correctAnswersData.tests.find(q => q.id === questionId);
        const ca = qa?.correctAnswers;
        if (!ca) return null;
        
        // Handle multiple-choice questions
        if (ca.type === 'single_option' && typeof ca.correct === 'string' && ca.correct.trim() !== '') {
            return ca.correct;
        }

        // Handle numeric index answers for multiple-choice: type 'single' with 1-based index
        if ((ca.type === 'single' || ca.type === 'single_option_index') && Number.isFinite(ca.correct)) {
            // Prefer provided question; otherwise, find it from testQuestions
            const q = question || (Array.isArray(testQuestions) ? testQuestions.find(tq => tq.id === questionId) : null);
            const idx = Number(ca.correct) - 1;
            const opt = q && Array.isArray(q.options) ? q.options[idx] : null;
            const text = opt ? (opt.text ?? opt.answer ?? opt.value ?? '') : '';
            return text || null;
        }
        
        // Handle short-answer questions with text type
        if (ca.type === 'text' && typeof ca.correct === 'string' && ca.correct.trim() !== '') {
            return ca.correct;
        }
        
        return null;
    }, [correctAnswersData]);

    const handleClose = useCallback(() => {
        onClose?.();
    }, [onClose]);

    // Calculate score percentage and status
    const scorePercentage = useMemo(() => {
        return Math.round((score / totalQuestions) * 100);
    }, [score, totalQuestions]);

    const isPassing = scorePercentage >= 70;

    // Toggle explanation visibility
    const toggleExplanation = useCallback((questionId) => {
        setExpandedExplanations(prev => {
            const newSet = new Set(prev);
            if (newSet.has(questionId)) {
                newSet.delete(questionId);
            } else {
                newSet.add(questionId);
            }
            return newSet;
        });
    }, []);

    const today = useMemo(() => new Date().toLocaleDateString(i18n.language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }), [i18n.language]);

    const getModalTitle = useCallback(() => {
        return t('test:testCompleted', 'Test Results');
    }, [t]);

    const getScoreDescription = useCallback(() => {
        return isPassing ? t('test:passMessage') : t('test:failMessage');
    }, [isPassing, t]);

    if (!isOpen) return null;

    const modalContent = (
        <div className={styles.modalOverlay} onClick={handleClose}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <header className={styles.modalHeader}>
                    <div className={styles.logoContainer}>
                        <Image src={Logo} alt="Unit School Logo" width={150} height={150} />
                        <div className={styles.titleContainer}>
                            <h1 className={styles.title}>{getModalTitle()}</h1>
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        <span className={styles.date}>{today}</span>
                        <button className={styles.closeButton} onClick={handleClose}>
                            <FiX size={24} />
                        </button>
                    </div>
                </header>

                {/* Content */}
                <main className={styles.modalContent}>
                    {/* Left Column */}
                    <aside className={styles.leftColumn}>
                        <div className={styles.scoreSection}>
                            <h3 className={styles.overallScoreLabel}>
                                {t('test:yourScore', 'Your Score')}
                            </h3>
                            <div className={styles.progressContainer}>
                                <CircularProgressBar
                                    score={scorePercentage}
                                    maxScore={100}
                                    size={140}
                                    isPercentage={true}
                                />
                            </div>
                            <div className={styles.scoreFraction}>
                                {score} / {totalQuestions}
                            </div>
                            <div className={styles.scoreDescription}>
                                {getScoreDescription()}
                            </div>
                            <div className={styles.difficultyLevel}>
                                <span className={styles.difficultyLabel}>{t('test:level')} </span>
                                <span className={styles.difficultyValue}>{difficulty?.toUpperCase()}</span>
                            </div>
                        </div>

                        {/* Test Stats */}
                        <div className={styles.statsSection}>
                            <h4 className={styles.statsTitle}>
                                {t('test:testStatistics', 'Test Statistics')}
                            </h4>
                            <div className={styles.statsList}>
                                <div className={styles.statItem}>
                                    <div className={styles.statIcon}>
                                        <MdCheckCircle color="#4CAF50" />
                                    </div>
                                    <div className={styles.statInfo}>
                                        <div className={styles.statLabel}>
                                            {t('test:correctAnswers', 'Correct Answers')}
                                        </div>
                                        <div className={styles.statValue}>
                                            {score} / {totalQuestions}
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statIcon}>
                                        <MdCancel color="#f44336" />
                                    </div>
                                    <div className={styles.statInfo}>
                                        <div className={styles.statLabel}>
                                            {t('test:incorrectAnswers', 'Incorrect Answers')}
                                        </div>
                                        <div className={styles.statValue}>
                                            {totalQuestions - score} / {totalQuestions}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Right Column */}
                    <section className={styles.rightColumn}>
                        <div className={styles.questionsSection}>
                            <h3 className={styles.sectionTitle}>
                                {t('test:questionReview', 'Question Review')}
                            </h3>
                            <div className={styles.questionsList}>
                                {answers?.map((answer, index) => {
                                    const question = testQuestions?.find(q => q.id === answer.questionId);
                                    const isShortAnswer = question?.type === 'short-answer';
                                    const userAnswer = isShortAnswer
                                        ? answer.textAnswer
                                        : (question?.options || []).find(opt => opt.id === answer.selectedAnswerId)?.text;

                                    // Get correct answer: first try answer files, then fall back to embedded properties
                                    let correctAnswer = null;
                                    
                                    // For language tests, try to get from answer files first
                                    if (['ielts', 'c2'].includes(difficulty?.toLowerCase())) {
                                        correctAnswer = getCorrectAnswerFromAnswerFile(question?.id);
                                    }
                                    
                                    // Fallback: Check for both 'isCorrect' and 'correct' properties in question options
                                    if (!correctAnswer) {
                                        correctAnswer = isShortAnswer
                                            ? (question?.options || [])
                                                .filter(opt => opt.isCorrect || opt.correct)
                                                .map(opt => getTextInCurrentLanguage(opt.text))
                                                .join(' / ')
                                            : getTextInCurrentLanguage((question?.options || []).find(opt => opt.isCorrect || opt.correct)?.text);
                                    }

                                    return (
                                        <div key={index} className={`${styles.questionResult} ${answer.isCorrect ? styles.correct : styles.incorrect}`}>
                                            <div className={styles.questionHeader}>
                                                <div className={styles.questionStatusIndicator}>
                                                    <span className={`${styles.statusIcon} ${answer.isCorrect ? styles.correct : styles.incorrect}`}>
                                                        {answer.isCorrect ?
                                                            <MdCheckCircle size={16} /> :
                                                            <MdCancel size={16} />
                                                        }
                                                    </span>
                                                </div>
                                                <div className={styles.questionContent}>
                                                    <p className={styles.questionText}>
                                                        <span className={styles.questionNumber}>{index + 1}.</span>
                                                        {getTextInCurrentLanguage(question?.question)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={styles.answerDetails}>
                                                <p className={styles.userAnswer}>
                                                    <strong>{t('test:yourAnswer')}</strong> {getTextInCurrentLanguage(userAnswer) || t('test:noAnswer')}
                                                </p>
                                                {!answer.isCorrect && (
                                                    <p className={styles.correctAnswer}>
                                                        <strong>{t('test:correctAnswer')}</strong> {correctAnswer || t('test:noCorrectAnswerAvailable', 'Correct answer not available')}
                                                    </p>
                                                )}
                                                {!answer.isCorrect && question?.explanation && (
                                                    <div className={styles.explanationContainer}>
                                                        <button
                                                            className={styles.explanationToggle}
                                                            onClick={() => toggleExplanation(question.id)}
                                                            type="button"
                                                        >
                                                            <span className={styles.explanationToggleText}>
                                                                {t('test:explanation', 'Explanation')}
                                                            </span>
                                                            <span className={styles.explanationToggleIcon}>
                                                                {expandedExplanations.has(question.id) ?
                                                                    <FiChevronUp size={16} /> :
                                                                    <FiChevronDown size={16} />
                                                                }
                                                            </span>
                                                        </button>
                                                        {expandedExplanations.has(question.id) && (
                                                            <div className={styles.explanationContent}>
                                                                {formatExplanationRecursively(
                                                                    getTextInCurrentLanguage(question.explanation),
                                                                    ['`']
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                </main>

                {/* Footer */}
                <footer className={styles.modalFooter}>
                    <div className={styles.footerActions}>
                        {onRestart && (
                            <button className={styles.restartButton} onClick={onRestart}>
                                <FiRefreshCw />
                                {t('test:renewTest', 'Retake Test')}
                            </button>
                        )}

                        {onReturn && (
                            <button className={styles.returnButton} onClick={onReturn}>
                                <FiArrowLeft />
                                {t('test:returnToSubject', 'Return to Subject')}
                            </button>
                        )}

                        <button className={styles.closeFooterButton} onClick={handleClose}>
                            {t('common:close', 'Close')}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
});

TestResultsModal.displayName = 'TestResultsModal';

export default TestResultsModal; 