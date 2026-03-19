'use client';
import "../writingProcess.scss"

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BsExclamationCircle } from 'react-icons/bs';
import { FiAlertTriangle } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useLoading } from '@/components/common/LoadingContext';
import Modal from '@/components/common/Modal';
import Spinner from '@/components/common/spinner';
import { TestNavbar } from '@/components/common';
import MockExamFooter from '@/components/mock/MockExamFooter';
import MockUnifiedHeader from '@/components/common/MockUnifiedHeader';
import { useMockUi } from '@/components/common/MockUiContext';

// Custom hooks
import { useWordCount } from '@/hooks/useWordCount';
import { useWritingTimer } from '@/hooks/useWritingTimer';
import { useWritingSubmission } from '@/hooks/useWritingSubmission';

// Extracted components
import WritingSubmitButton from './WritingSubmitButton';
import WritingTextarea from './WritingTextarea';
import WritingFeedbackSection from './WritingFeedbackSection';
import WritingStartCard from './WritingStartCard';
import IELTSAcademicInstructionsCard from './IELTSAcademicInstructionsCard';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Constants: IELTS Writing Task 1 only (150–250 words, 20 min)
const VALID_DIFFICULTIES = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const DIFFICULTY_ALIASES = {
    ielts: 'c2'
};
// Используем IELTS-стандарты по умолчанию.
// Ограничения (min/max/time) при наличии подхватываются из `writingExercise.tasks`.
const TASK_1_MIN_WORDS = 150;
const TASK_1_MAX_WORDS = 250;
const TASK_1_TIME_MINUTES = 20;

const MAX_WORD_LIMIT = TASK_1_MAX_WORDS;
const MIN_WORD_REQUIREMENT = TASK_1_MIN_WORDS;
const WRITING_TASK_2_MIN_WORDS = 250;
const WRITING_TASK_2_RECOMMENDED_MINUTES = 40;

const extractPromptText = (fullText) => {
    if (!fullText) return '';

    const markers = [
        'the chart below',
        'the table below',
        'the graph below'
    ];

    const lowerText = String(fullText).toLowerCase();

    let startIndex = -1;
    markers.forEach((marker) => {
        const index = lowerText.indexOf(marker);
        if (index !== -1 && (startIndex === -1 || index < startIndex)) {
            startIndex = index;
        }
    });

    if (startIndex === -1) {
        return String(fullText).trim();
    }

    return String(fullText).slice(startIndex).trim();
};

function WritingPageContent({
    writingExercise,
    difficulty,
    id,
    isPlacementTest = false,
    onSubmitComplete = null,
    timerStartTime: externalTimerStartTime = null,
    timerDuration: externalTimerDuration = null,
    isTimerPaused: externalTimerPaused = false,
    startScreenVariant = 'default',
    useUnifiedMockHeader = false
}) {
    const router = useRouter();
    const { t, i18n } = useTranslation(['writing', 'practice', 'common', 'test']);
    const { setIsLoading } = useLoading();
    const { textSize } = useMockUi();
    const isTabletOrBelow = false; // Site is PC-only
    const normalizedDifficulty = useMemo(() => {
        const raw = String(difficulty || '').toLowerCase();
        return DIFFICULTY_ALIASES[raw] || raw;
    }, [difficulty]);

    // Consolidated state
    const [writingData, setWritingData] = useState(null);
    const [userResponse, setUserResponse] = useState('');
    const [responsesByPart, setResponsesByPart] = useState({});
    const [activePartIndex, setActivePartIndex] = useState(0);
    const [minWordRequirement, setMinWordRequirement] = useState(MIN_WORD_REQUIREMENT);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showSkipModal, setShowSkipModal] = useState(false);
    const [isTitleTruncated, setIsTitleTruncated] = useState(false);

    const titleRef = useRef(null);

    const writingTasks = useMemo(() => {
        const sourceTasks = Array.isArray(writingExercise?.tasks) ? writingExercise.tasks : [];

        if (sourceTasks.length) {
            return sourceTasks
                .map((task, index) => ({
                    id: task?.id || index + 1,
                    part: Number(task?.part) || index + 1,
                    taskNumber: Number(task?.taskNumber) || Number(task?.task_number) || index + 1,
                    questionText: String(task?.questionText || task?.question_text || '').trim(),
                    images: Array.isArray(task?.images) ? task.images : [],
                    minWords: Number(task?.minWords) || (index === 0 ? TASK_1_MIN_WORDS : WRITING_TASK_2_MIN_WORDS),
                    recommendedMinutes: Number(task?.recommendedMinutes) || (index === 0 ? TASK_1_TIME_MINUTES : WRITING_TASK_2_RECOMMENDED_MINUTES)
                }))
                .filter((task) => task.questionText);
        }

        const fallbackTopic = String(writingExercise?.topic || '').trim();
        if (!fallbackTopic) return [];

        return [{
            id: parseInt(id),
            part: 1,
            taskNumber: 1,
            questionText: fallbackTopic,
            images: [],
            minWords: TASK_1_MIN_WORDS,
            recommendedMinutes: TASK_1_TIME_MINUTES
        }];
    }, [id, writingExercise]);

    const activeTask = useMemo(() => {
        if (!writingTasks.length) return null;
        return writingTasks[activePartIndex] || writingTasks[0];
    }, [writingTasks, activePartIndex]);

    const combinedUserResponse = useMemo(() => {
        if (!writingTasks.length) return userResponse;

        const partsPayload = writingTasks
            .map((task, index) => {
                const text = responsesByPart[index];
                if (!text || !String(text).trim()) return '';
                return `Part ${task.part}\n${String(text).trim()}`;
            })
            .filter(Boolean);

        if (!partsPayload.length) return userResponse;
        return partsPayload.join('\n\n');
    }, [writingTasks, responsesByPart, userResponse]);

    // Custom hooks
    const { wordCount } = useWordCount(userResponse, { maxWords: MAX_WORD_LIMIT, minWords: minWordRequirement });

    const {
        isTimerRunning,
        hasTimerStarted,
        timeLimit,
        startTimeRef,
        handleStartTimer,
        pauseTimer,
        resetTimer
    } = useWritingTimer({
        difficulty: normalizedDifficulty,
        isPlacementTest,
        externalTimerStartTime,
        externalTimerDuration,
        externalTimerPaused
    });

    const {
        isSubmitting,
        hasSubmitted,
        submitError,
        retryCount,
        showRetryModal,
        setShowRetryModal,
        queueStatus,
        isPollingQueue,
        aiFeedback,
        loading: submissionLoading,
        handleSubmit: handleSubmitBase,
        handleRetry,
        handleRewrite,
        isSubmittingRef
    } = useWritingSubmission({
        userResponse: combinedUserResponse,
        difficulty: normalizedDifficulty,
        language: i18n.language,
        topic: activeTask?.questionText || writingExercise?.topic,
        minWordRequirement,
        isPlacementTest,
        startTimeRef,
        onSubmitComplete,
        t
    });

    // Wrap handleSubmit to pause timer when submitting
    const handleSubmit = useCallback(() => {
        pauseTimer();
        handleSubmitBase();
    }, [handleSubmitBase, pauseTimer]);

    // Memoize writing data transformation
    const processedWritingData = useMemo(() => {
        if (!writingExercise) return null;

        const difficultyLower = normalizedDifficulty;

        if (!VALID_DIFFICULTIES.includes(difficultyLower)) {
            return {
                error: t('error.invalidLevel', { ns: 'writing', defaultValue: 'Invalid Difficulty Level' }) +
                    `: "${difficulty}". ` +
                    t('error.availableLevels', { ns: 'writing', defaultValue: 'Available levels:' }) +
                    ` ${VALID_DIFFICULTIES.join(', ').toUpperCase()}`
            };
        }

        return {
            id: parseInt(id),
            level: difficultyLower,
            topic: writingExercise.topic,
            tasks: writingTasks,
            relatedVocabulary: writingExercise.relatedVocabulary
        };
    }, [id, normalizedDifficulty, writingExercise, writingTasks, t, difficulty]);

    // Stable key so effect runs only when exercise identity changes (avoids loop when server passes new object ref)
    const processDataKey = `${id}-${normalizedDifficulty}-${writingExercise?.topic ?? ''}-${writingExercise?.id ?? ''}-${writingTasks.length}`;
    const processedWritingDataRef = useRef(processedWritingData);
    processedWritingDataRef.current = processedWritingData;

    const loadWritingData = useCallback(() => {
        const data = processedWritingDataRef.current;
        if (!data) return;

        try {
            setError(null);
            setLoading(true);

            if (data.error) {
                setError(data.error);
                setLoading(false);
                return;
            }

            setWritingData(data);
            const firstTask = Array.isArray(data?.tasks) ? data.tasks[0] : null;
            setMinWordRequirement(Number(firstTask?.minWords) || MIN_WORD_REQUIREMENT);
            setActivePartIndex(0);
            setResponsesByPart({});
            setUserResponse('');

            if (!hasTimerStarted) {
                startTimeRef.current = Date.now();
            }
        } catch (err) {
            setError(t('loadError', { ns: 'writing', defaultValue: 'Failed to load writing exercise. Please try again.' }));
        } finally {
            if (!isSubmittingRef.current) {
                setLoading(false);
            }
        }
    }, [hasTimerStarted, t]);

    useEffect(() => {
        if (!writingTasks.length) return;
        if (activePartIndex > writingTasks.length - 1) {
            setActivePartIndex(0);
        }
    }, [writingTasks, activePartIndex]);

    useEffect(() => {
        const currentAnswer = responsesByPart[activePartIndex] || '';
        setUserResponse(currentAnswer);
    }, [activePartIndex, responsesByPart]);

    useEffect(() => {
        const currentMinWords = Number(activeTask?.minWords) || MIN_WORD_REQUIREMENT;
        setMinWordRequirement(currentMinWords);
    }, [activeTask]);

    // Load data on mount and when exercise identity changes (not when object reference changes)
    useEffect(() => {
        if (processedWritingDataRef.current) {
            loadWritingData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- processDataKey is the only intended trigger; loadWritingData reads from ref
    }, [processDataKey]);

    // Check if title is truncated
    useEffect(() => {
        if (!hasTimerStarted || !titleRef.current) {
            setIsTitleTruncated(false);
            return;
        }

        const checkTruncation = () => {
            if (!titleRef.current) return;
            const element = titleRef.current;
            requestAnimationFrame(() => {
                if (element) {
                    const scrollWidth = element.scrollWidth;
                    const clientWidth = element.clientWidth;
                    setIsTitleTruncated(scrollWidth > clientWidth);
                }
            });
        };

        const timeoutId1 = setTimeout(checkTruncation, 100);
        const timeoutId2 = setTimeout(checkTruncation, 300);
        window.addEventListener('resize', checkTruncation);

        return () => {
            clearTimeout(timeoutId1);
            clearTimeout(timeoutId2);
            window.removeEventListener('resize', checkTruncation);
        };
    }, [writingData?.topic, hasTimerStarted]);

    // Timer management
    const submitOnTimeUp = useCallback(() => {
        if (!isSubmitting && handleSubmit) {
            handleSubmit();
        }
    }, [isSubmitting, handleSubmit]);

    // Handle rewrite - also clears textarea and restarts timer
    const handleRewriteComplete = useCallback(() => {
        handleRewrite();
        setUserResponse('');
        setResponsesByPart({});
        setActivePartIndex(0);
        resetTimer();
    }, [handleRewrite, resetTimer]);

    // Helper function to format criterion-based feedback object into a readable string
    const formatCriterionFeedback = useCallback((feedbackObj) => {
        if (!feedbackObj || typeof feedbackObj !== 'object') {
            return '';
        }

        const criterionLabels = {
            taskResponse: t('writing:taskResponse', 'Task Response'),
            coherenceCohesion: t('writing:coherenceCohesion', 'Coherence & Cohesion'),
            lexicalResource: t('writing:lexicalResource', 'Lexical Resource'),
            grammaticalRange: t('writing:grammaticalRange', 'Grammar & Accuracy')
        };

        const sections = [];
        Object.keys(criterionLabels).forEach((key) => {
            if (feedbackObj[key] && Array.isArray(feedbackObj[key]) && feedbackObj[key].length > 0) {
                const label = criterionLabels[key];
                sections.push(`\n${label}:`);
                feedbackObj[key].forEach((item) => {
                    if (typeof item === 'string' && item.trim()) {
                        sections.push(`\n${item.trim()}`);
                    }
                });
            }
        });

        return sections.join('\n').trim();
    }, [t]);

    // Extract feedback text
    const feedbackText = useMemo(() => {
        if (!aiFeedback) return '';

        let feedbackText = aiFeedback.detailedFeedback || aiFeedback.feedback;

        if (!feedbackText && aiFeedback.feedback && typeof aiFeedback.feedback === 'object') {
            feedbackText = aiFeedback.feedback.detailedFeedback || aiFeedback.feedback.text;
        }

        let feedbackString = '';

        if (typeof feedbackText === 'string') {
            feedbackString = feedbackText.trim();
        } else if (feedbackText !== null && feedbackText !== undefined && typeof feedbackText === 'object') {
            const criterionKeys = ['taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange'];
            const hasCriterionStructure = criterionKeys.some(key =>
                feedbackText.hasOwnProperty(key) && Array.isArray(feedbackText[key])
            );

            if (hasCriterionStructure) {
                feedbackString = formatCriterionFeedback(feedbackText);
            } else {
                feedbackString = feedbackText.text || feedbackText.content || feedbackText.message || '';

                if (!feedbackString && aiFeedback?.evidence && typeof aiFeedback.evidence === 'object') {
                    feedbackString = formatCriterionFeedback(aiFeedback.evidence);
                }

                if (!feedbackString) {
                    feedbackString = JSON.stringify(feedbackText, null, 2);
                }
            }
        } else if (feedbackText !== null && feedbackText !== undefined) {
            feedbackString = String(feedbackText);
        }

        if (!feedbackString && aiFeedback?.evidence) {
            if (typeof aiFeedback.evidence === 'string') {
                feedbackString = aiFeedback.evidence.trim();
            } else if (typeof aiFeedback.evidence === 'object') {
                feedbackString = formatCriterionFeedback(aiFeedback.evidence);
            }
        }

        if (!feedbackString) {
            feedbackString = t('writing:noFeedbackAvailable', 'No detailed feedback available.');
        }

        return feedbackString;
    }, [aiFeedback, formatCriterionFeedback, t]);

    // Skip writing handler for placement test
    const handleSkipWriting = useCallback(() => {
        if (!isPlacementTest || !onSubmitComplete) return;

        const skippedFeedback = {
            feedback: 'Writing section skipped by user',
            score: null,
            wordCount: 0,
            timeTaken: Date.now() - (startTimeRef?.current || Date.now()),
            userResponse: '',
            skipped: true
        };

        onSubmitComplete(skippedFeedback);
    }, [isPlacementTest, onSubmitComplete, startTimeRef]);

    // Back handler
    const handleBack = useCallback(() => {
        if (isPlacementTest) {
            return;
        }
        setIsLoading(true);
        router.back();
    }, [router, setIsLoading, isPlacementTest]);

    // Precompute tasks and navigation helpers (must come before any early returns to keep hooks order stable)
    const writingTasksFromData = Array.isArray(writingData?.tasks) ? writingData.tasks : [];

    const activePartQuestionNumbers = useMemo(() => {
        if (!writingTasksFromData.length) return [];
        const task = writingTasksFromData[activePartIndex] || writingTasksFromData[0];
        const partNum = Number(task?.part) || activePartIndex + 1;
        return [partNum];
    }, [writingTasksFromData, activePartIndex]);

    const writingPartTotals = useMemo(
        () => writingTasksFromData.map(() => 1),
        [writingTasksFromData]
    );

    const writingPartAnsweredCounts = useMemo(
        () =>
            writingTasksFromData.map((task, index) => {
                const text = responsesByPart[index];
                return text && String(text).trim() ? 1 : 0;
            }),
        [writingTasksFromData, responsesByPart]
    );

    const activeAttemptedQuestionNumbers = useMemo(() => {
        if (!activePartQuestionNumbers.length) return [];
        const text = responsesByPart[activePartIndex];
        return text && String(text).trim() ? [activePartQuestionNumbers[0]] : [];
    }, [activePartQuestionNumbers, responsesByPart, activePartIndex]);

    const getActivePartLabel = useCallback(
        (partNum) => `Part ${partNum}`,
        []
    );

    const getInactivePartButtonLabel = useCallback(
        (partNum, answered, total) => `Part ${partNum} ${answered} of ${total}`,
        []
    );

    const getQuestionAriaLabel = useCallback(
        (questionNumber) =>
            t('writingQuestionAria', {
                ns: 'writing',
                defaultValue: 'Writing question {{number}}',
                number: questionNumber
            }),
        [t]
    );

    const previousAriaLabel = t('previous', { ns: 'common', defaultValue: 'Previous' });
    const nextAriaLabel = t('next', { ns: 'common', defaultValue: 'Next' });

    // Combined loading state
    const isLoading = loading || submissionLoading;

    // Loading state
    if (isLoading) {
        return (
            <div className="loading-container" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                gap: '1rem'
            }}>
                <Spinner />
                {queueStatus && (
                    <div style={{ textAlign: 'center' }}>
                        <p>{t('errors.queued', {
                            ns: 'writing',
                            defaultValue: 'Your request is in queue. Position: {{position}}. Estimated wait: {{wait}} seconds.',
                            position: queueStatus.position,
                            wait: Math.ceil(queueStatus.estimatedWaitTime / 1000)
                        })}</p>
                    </div>
                )}
            </div>
        );
    }

    // Error state
    if (error) {
        const isInvalidDifficulty = error.includes('Invalid difficulty level');

        return (
            <div className="error-container">
                <BsExclamationCircle size={48} className="error-icon" aria-hidden="true" />
                <h2>
                    {isInvalidDifficulty
                        ? t('error.invalidLevel', { ns: 'writing', defaultValue: 'Invalid Difficulty Level' })
                        : t('error.title', { ns: 'writing', defaultValue: 'An error occurred.' })}
                </h2>
                <p>{error}</p>
                {isInvalidDifficulty && (
                    <div className="valid-levels">
                        <h3>{t('error.availableLevels', { ns: 'writing', defaultValue: 'Available levels:' })}</h3>
                        <div className="level-buttons" role="group" aria-label="Available difficulty levels">
                            {VALID_DIFFICULTIES.map(level => (
                                <button
                                    key={level}
                                    className="btn btn-outline btn-sm"
                                    onClick={() => {
                                        const currentPath = window.location.pathname;
                                        const segments = currentPath.split('/');
                                        segments[segments.length - 3] = level;
                                        router.push(segments.join('/'));
                                    }}
                                    aria-label={`Switch to ${level.toUpperCase()} level`}
                                >
                                    {level.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {!isInvalidDifficulty && (
                    <button className="btn btn-primary" onClick={loadWritingData}>
                        {t('tryAgain', { ns: 'writing', defaultValue: 'Try Again' })}
                    </button>
                )}
            </div>
        );
    }

    if (!writingData) return null;

    const currentTask = writingTasksFromData[activePartIndex] || writingTasksFromData[0] || null;
    const rawWritingTopicTitle = currentTask?.questionText || writingData?.topic || t('defaultTitle', { ns: 'writing', defaultValue: 'Writing Task' });
    const writingTopicTitle = extractPromptText(rawWritingTopicTitle);
    const topicDescription = '';
    const currentTaskMinWords = Number(currentTask?.minWords) || MIN_WORD_REQUIREMENT;
    const currentTaskMinutes = Number(currentTask?.recommendedMinutes) || TASK_1_TIME_MINUTES;
    const currentTaskImages = Array.isArray(currentTask?.images) ? currentTask.images : [];
    const currentTaskLabel = Number(currentTask?.taskNumber) === 2
        ? t('writingTask2', { ns: 'writing', defaultValue: 'WRITING TASK 2' })
        : t('writingTask1', { ns: 'writing', defaultValue: 'WRITING TASK 1' });
    const currentTaskInstruction = `You should spend about ${currentTaskMinutes} minutes on this task. Write at least ${currentTaskMinWords} words.`;

    const isHeaderSubmitDisabled =
        isSubmitting ||
        hasSubmitted ||
        (submitError && submitError.isValidationError === true);

    return (
        <div
            className={`writing-container ${isPlacementTest ? 'writing-container--placement' : ''} ${useUnifiedMockHeader ? 'mock-unified-header-active' : ''} ${useUnifiedMockHeader && hasTimerStarted && !hasSubmitted ? 'writing-container--mock-footer' : ''}`}
            data-mock-text-size={useUnifiedMockHeader ? textSize : undefined}
        >
            {useUnifiedMockHeader && <MockUnifiedHeader />}
            {/* Test Navbar */}
            <TestNavbar
                progressType="none"
                timerDuration={timeLimit / 60}
                onTimeUp={submitOnTimeUp}
                isTimerActive={isTimerRunning && hasTimerStarted && !hasSubmitted && !externalTimerPaused}
                startTime={hasTimerStarted ? (externalTimerStartTime || startTimeRef.current) : undefined}
                title={isPlacementTest && hasTimerStarted ? writingTopicTitle : null}
                showHeaderAction={hasTimerStarted && !hasSubmitted && !isPlacementTest && !useUnifiedMockHeader}
                headerActionLabel={t('submit', { ns: 'common', defaultValue: 'Submit' })}
                onHeaderAction={handleSubmit}
                headerActionDisabled={isHeaderSubmitDisabled}
                topOffset={useUnifiedMockHeader ? 56 : 0}
            />

            {/* Writing Title Section - Only for Placement Test */}
            {isPlacementTest && hasTimerStarted && !hasSubmitted && (
                <div className="placement-test-title-section">
                    <h1 className="placement-test-title">{writingTopicTitle}</h1>
                </div>
            )}

            {/* Main Content */}
            <div className={`writing-content-grid writing-content-grid--single ${isPlacementTest ? 'writing-content-grid--placement' : ''}`}>
                {/* Left Column - Writing Area */}
                <div className="writing-left-column">
                    {/* Start Writing Card or IELTS Academic instructions */}
                    {!hasTimerStarted && !hasSubmitted && (
                        startScreenVariant === 'ieltsAcademic' ? (
                            <IELTSAcademicInstructionsCard onStart={handleStartTimer} />
                        ) : (
                            <WritingStartCard
                                title={writingTopicTitle}
                                description={topicDescription}
                                onStart={handleStartTimer}
                                minWords={Number((writingTasksFromData[0] && writingTasksFromData[0].minWords) || TASK_1_MIN_WORDS)}
                                timeMinutes={Number((writingTasksFromData[0] && writingTasksFromData[0].recommendedMinutes) || TASK_1_TIME_MINUTES)}
                            />
                        )
                    )}

                    {/* Writing Area */}
                    {hasTimerStarted && (
                        <div className={`writing-area-section ${hasSubmitted ? 'writing-area-section--submitted' : ''}`}>
                            <div className="ielts-writing-exam-layout">
                                <div className="ielts-writing-left-pane">
                                    {/* IELTS-style instruction box: WRITING TASK */}
                                    <div className="ielts-task-instruction" role="region" aria-label="Task instructions">
                                        <h3 className="ielts-task-instruction__heading">
                                            {currentTaskLabel}
                                        </h3>
                                        <p className="ielts-task-instruction__time">
                                            {currentTaskInstruction}
                                        </p>
                                        <div className="ielts-task-instruction__prompt">
                                            <p className="ielts-task-instruction__prompt-text">
                                                <span ref={titleRef} className="writing-title">
                                                    {writingTopicTitle}
                                                </span>
                                            </p>
                                            {topicDescription && (
                                                <p className="ielts-task-instruction__description">{topicDescription}</p>
                                            )}
                                        </div>
                                    </div>

                                    {currentTaskImages.length > 0 && (
                                        <div className="writing-task-image-panel">
                                            {currentTaskImages.map((image, idx) => (
                                                <img
                                                    key={`writing-image-${image.id || idx}`}
                                                    src={image.url}
                                                    alt={`Writing task visual ${idx + 1}`}
                                                    className="writing-task-image"
                                                    loading="lazy"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="ielts-writing-right-pane">
                                    <div className="section-header">
                                        <h2>{t('yourResponse', { ns: 'writing', defaultValue: 'Your Response' })}</h2>
                                    </div>

                                    <WritingTextarea
                                        value={userResponse}
                                        onChange={(e) => {
                                            const nextValue = e.target.value;
                                            setUserResponse(nextValue);
                                            setResponsesByPart((prev) => ({
                                                ...prev,
                                                [activePartIndex]: nextValue
                                            }));
                                        }}
                                        disabled={isSubmitting || hasSubmitted || !hasTimerStarted}
                                        placeholder={t('placeholder', { ns: 'writing', defaultValue: 'Start writing here...' })}
                                        minWords={isPlacementTest ? 200 : currentTaskMinWords}
                                        maxWords={MAX_WORD_LIMIT}
                                        hasSubmitted={hasSubmitted}
                                    />
                                </div>
                            </div>

                            {/* Submit Button Section - Placement Test Only */}
                            {isPlacementTest && !hasSubmitted && (
                                <WritingSubmitButton
                                    onSubmit={handleSubmit}
                                    isSubmitting={isSubmitting}
                                    hasSubmitted={hasSubmitted}
                                    wordCount={wordCount}
                                    maxWords={MAX_WORD_LIMIT}
                                    minWords={200}
                                    variant="placement"
                                    submitError={submitError}
                                    retryCount={retryCount}
                                    onRetry={handleRetry}
                                    onRewrite={handleRewriteComplete}
                                    isPlacementTest={true}
                                />
                            )}
                        </div>
                    )}

                    {/* Detailed Feedback Section */}
                    {hasSubmitted && feedbackText && (
                        <WritingFeedbackSection feedbackText={feedbackText} />
                    )}

                </div>

            </div>

            {/* Retry Modal */}
            {showRetryModal && submitError && (
                <Modal
                    handleShowModal={setShowRetryModal}
                    title={t('retryModalTitle', { ns: 'writing', defaultValue: 'Submission Failed' })}
                    buttons={[
                        {
                            text: t('retryNow', { ns: 'writing', defaultValue: 'Retry Now' }),
                            className: 'btn btn-primary',
                            onClick: handleRetry
                        },
                        {
                            text: t('cancel', { ns: 'writing', defaultValue: 'Cancel' }),
                            className: 'btn btn-secondary',
                            onClick: () => {
                                setShowRetryModal(false);
                            }
                        }
                    ]}
                >
                    <div className="retry-modal-content">
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                                <FiAlertTriangle color="#f59e0b" aria-hidden="true" />
                            </div>
                            <h3>{t('submissionFailed', { ns: 'writing', defaultValue: 'Submission Failed' })}</h3>
                        </div>

                        <p>{submitError.message}</p>

                        {submitError.code === 'TIMEOUT' && (
                            <div style={{
                                backgroundColor: '#f3f4f6',
                                padding: '1rem',
                                borderRadius: '0.5rem',
                                marginTop: '1rem'
                            }}>
                                <h4>{t('timeoutTips', { ns: 'writing', defaultValue: 'Tips to avoid timeouts:' })}</h4>
                                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                                    <li>{t('timeoutTip1', { ns: 'writing', defaultValue: 'Try shortening your response' })}</li>
                                    <li>{t('timeoutTip2', { ns: 'writing', defaultValue: 'Check your internet connection' })}</li>
                                    <li>{t('timeoutTip3', { ns: 'writing', defaultValue: 'Wait a few minutes before retrying' })}</li>
                                </ul>
                            </div>
                        )}

                        {retryCount > 0 && (
                            <p style={{
                                fontSize: '0.9em',
                                color: '#6b7280',
                                marginTop: '1rem',
                                textAlign: 'center'
                            }}>
                                {t('retryAttempt', {
                                    ns: 'writing',
                                    defaultValue: 'Retry attempt: {{count}}',
                                    count: retryCount + 1
                                })}
                            </p>
                        )}
                    </div>
                </Modal>
            )}

            {/* Emergency Skip Link - Placement Test Only */}
            {isPlacementTest && !hasSubmitted && hasTimerStarted && (
                <div className="placement-skip-section">
                    <button
                        type="button"
                        className="skip-writing-link"
                        onClick={() => setShowSkipModal(true)}
                        aria-label={t('skipWritingSection', {
                            ns: 'test',
                            defaultValue: 'Skip writing section due to technical issues'
                        })}
                    >
                        {t('technicalIssues', {
                            ns: 'test',
                            defaultValue: 'Having technical issues? Skip writing section'
                        })}
                    </button>
                </div>
            )}

            {/* Skip Confirmation Modal */}
            {showSkipModal && (
                <Modal
                    handleShowModal={setShowSkipModal}
                    showCloseButton={true}
                    title={t('skipWritingTitle', {
                        ns: 'test',
                        defaultValue: 'Skip Writing Section?'
                    })}
                    buttons={[
                        {
                            text: t('skipAndContinue', {
                                ns: 'test',
                                defaultValue: 'Skip & See Results'
                            }),
                            className: 'btn btn-warning',
                            onClick: () => {
                                setShowSkipModal(false);
                                handleSkipWriting();
                            }
                        },
                        {
                            text: t('cancelSkip', {
                                ns: 'test',
                                defaultValue: 'Cancel'
                            }),
                            className: 'btn btn-secondary',
                            onClick: () => setShowSkipModal(false)
                        }
                    ]}
                >
                    <div className="skip-modal-content">
                        <p>
                            {t('skipWarning', {
                                ns: 'test',
                                defaultValue: 'Are you sure you want to skip the writing section?'
                            })}
                        </p>
                        <ul className="skip-modal-consequences">
                            <li>✓ {t('skipPoint1', {
                                ns: 'test',
                                defaultValue: 'You will see your grammar and reading results'
                            })}</li>
                            <li>⚠️ {t('skipPoint2', {
                                ns: 'test',
                                defaultValue: 'Your overall level will be based on 2 out of 3 sections'
                            })}</li>
                            <li>ℹ️ {t('skipPoint3', {
                                ns: 'test',
                                defaultValue: 'You can retake the full test anytime'
                            })}</li>
                        </ul>
                    </div>
                </Modal>
            )}

            {/* Bottom Navigation and Submit (IELTS-style footer) */}
            {useUnifiedMockHeader && !hasSubmitted && hasTimerStarted && (
                <MockExamFooter
                    parts={writingTasksFromData}
                    currentPartIndex={activePartIndex}
                    onSelectPart={setActivePartIndex}
                    activePartQuestionNumbers={activePartQuestionNumbers}
                    attemptedQuestionNumbers={activeAttemptedQuestionNumbers}
                    currentQuestionNumber={activePartQuestionNumbers[0]}
                    onSelectQuestion={() => {}}
                    onPrevNextQuestion={(delta) => {
                        setActivePartIndex((prev) => {
                            const next = prev + delta;
                            if (next < 0) return 0;
                            if (next > writingTasksFromData.length - 1) {
                                return writingTasksFromData.length - 1;
                            }
                            return next;
                        });
                    }}
                    partTotals={writingPartTotals}
                    partAnsweredCounts={writingPartAnsweredCounts}
                    getActivePartLabel={getActivePartLabel}
                    getInactivePartButtonLabel={getInactivePartButtonLabel}
                    getQuestionAriaLabel={getQuestionAriaLabel}
                    previousAriaLabel={previousAriaLabel}
                    nextAriaLabel={nextAriaLabel}
                    navigationAriaLabel={t('writingPartsNavigation', {
                        ns: 'writing',
                        defaultValue: 'Writing parts navigation'
                    })}
                    showSubmitButton={true}
                    submitDisabled={isHeaderSubmitDisabled || !hasTimerStarted}
                    submitAriaLabel={t('submit', { ns: 'common', defaultValue: 'Submit' })}
                    onSubmit={handleSubmit}
                    confirmTitle={t('confirmSubmitTitle', {
                        ns: 'test',
                        defaultValue: 'Submit your writing?'
                    })}
                    confirmDescription={t('confirmSubmitDescription', {
                        ns: 'test',
                        defaultValue: 'Are you sure you want to submit? You will not be able to edit your writing after submission.'
                    })}
                    confirmCancelLabel={t('cancel', { ns: 'common', defaultValue: 'Cancel' })}
                    confirmSubmitLabel={t('submit', { ns: 'common', defaultValue: 'Submit' })}
                />
            )}

        </div>
    );
}

// Main component with Error Boundary
export default function WritingPage(props) {
    return (
        <ErrorBoundary
            title="Writing Exercise Error"
            message="An error occurred while loading the writing exercise. Please try refreshing the page."
            showReset={true}
        >
            <WritingPageContent {...props} />
        </ErrorBoundary>
    );
}