'use client';
import "../styles/readingProcess.scss"

import { useEffect, useRef, useCallback, useState } from 'react';
import { BsExclamationCircle } from 'react-icons/bs';
import { useTranslation } from 'react-i18next';
import Spinner from '@/components/common/spinner';

// Import extracted components and hooks
import { MOCK_SESSION_STATUS, postMockSessionStatus } from '@/lib/mockApi';
import { getMockSession } from '@/lib/mockSession';
import { useReadingState } from '../hooks/useReadingState';
import NormalReadingMode from './NormalReadingMode';
import IELTSReadingInstructionsCard from './IELTSReadingInstructionsCard';

export default function ReadingPage({
    readingExercise,
    difficulty,
    id,
    nextHref = null,
    uiVariant = 'default',
    useUnifiedMockHeader = false
}) {
    const { t } = useTranslation('reading');

    // PC only: fullscreen and keyboard shortcuts enabled
    const isMobile = false;

    // Show instructions screen before the test starts (mock exam only)
    const [hasInstructionAcknowledged, setHasInstructionAcknowledged] = useState(false);

    // Use custom hooks for state management
    const {
        // State
        readingData,
        userAnswers,
        isSubmitting,
        showResults,
        isReviewMode,
        reviewMap,
        results,
        loading,
        error,
        columnWidth,
        isFullScreen,
        timerStartTime,
        finalTimerState,
        selectedQuestionTypes,
        adjustedTimeLimit,
        isTimerPaused,
        inlinePassagePick,
        activePassageId,
        showLeftArrow,
        setShowLeftArrow,
        showRightArrow,
        setShowRightArrow,

        // Computed values
        isMultiPassage,
        processedReadingData,
        currentPassage,
        allQuestions,
        allAnswersData,
        questionRanges,
        currentPassageQuestions,
        filteredQuestions,
        filteredQuestionsGlobal,
        groupedQuestions,
        totalAnsweredCount,
        answeredCount,
        totalQuestions,
        totalAllQuestions,
        allQuestionsAnswered,
        canSubmit,
        submitAnsweredCount,
        submitTotalCount,
        currentPassageCompleted,
        questionSequenceMap,
        passageParagraphs,
        passageIsHtml,
        passageTitle,
        visiblePassages,

        // Actions
        loadReadingData,
        setReadingData,
        setUserAnswers,
        setIsSubmitting,
        setShowResults,
        setIsReviewMode,
        setResults,
        setLoading,
        setError,
        setColumnWidth,
        setIsFullScreen,
        setTimerStartTime,
        setFinalTimerState,
        setSelectedQuestionTypes,
        setAdjustedTimeLimit,
        setTimerPaused,
        setActivePassageId,
        calculateResults,
        handleSubmit,
        handleTimeUp,
        handleReview,
        handleRetry,
        handleAnswerChange,
        handleBack,
        scrollToQuestion,
        handleQuestionClick,
        handleQuestionTypeFilter,
        handleTimeAdjustment,
        handlePassageChange,
        handleScrollDots,
        handleInlinePassagePickChange
    } = useReadingState(readingExercise, difficulty, id, null, nextHref);

    // Ref for the scrollable question dots container
    const dotsContainerRef = useRef(null);
    const readingTutorialStatusSentRef = useRef(false);
    const readingExamStatusSentRef = useRef(false);

    // Memoized arrow visibility update function to prevent unnecessary re-creation
    const updateArrowVisibility = useCallback(() => {
        const container = dotsContainerRef.current;
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        const scrollEndThreshold = 2; // Buffer for floating point inaccuracies

        setShowLeftArrow(scrollLeft > scrollEndThreshold);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - scrollEndThreshold);
    }, [setShowLeftArrow, setShowRightArrow]);

    // Full-screen mode handlers - disabled for mobile devices
    const toggleFullScreen = useCallback(() => {
        setIsFullScreen(prev => !prev);
    }, [setIsFullScreen]);

    const exitFullScreen = useCallback(() => {
        setIsFullScreen(false);
    }, [setIsFullScreen]);

    // Initialize timer start time if not set — only after instructions acknowledged
    useEffect(() => {
        if (readingData && !timerStartTime && (!useUnifiedMockHeader || hasInstructionAcknowledged)) {
            setTimerStartTime(Date.now());
        }
    }, [readingData, timerStartTime, setTimerStartTime, useUnifiedMockHeader, hasInstructionAcknowledged]);

    // Load data on mount and when dependencies change — delayed in mock until instructions acknowledged
    useEffect(() => {
        if (processedReadingData && (!useUnifiedMockHeader || hasInstructionAcknowledged)) {
            loadReadingData();
        }
    }, [loadReadingData, processedReadingData, useUnifiedMockHeader, hasInstructionAcknowledged]);

    // Handle body and html scrollbar when in full-screen mode
    useEffect(() => {
        if (isFullScreen) {
            // Save current scroll position
            const scrollY = window.scrollY;
            
            // Use requestAnimationFrame to ensure fullscreen transition has started
            const rafId = requestAnimationFrame(() => {
                const htmlElement = document.documentElement;
                const bodyElement = document.body;
                
                // Lock body position to prevent scrolling
                bodyElement.style.setProperty('position', 'fixed', 'important');
                bodyElement.style.setProperty('top', `-${scrollY}px`, 'important');
                bodyElement.style.setProperty('left', '0', 'important');
                bodyElement.style.setProperty('right', '0', 'important');
                bodyElement.style.setProperty('width', '100%', 'important');
                
                // Hide overflow on both html and body
                htmlElement.style.setProperty('overflow', 'hidden', 'important');
                bodyElement.style.setProperty('overflow', 'hidden', 'important');
                
                // Hide scrollbars completely for Firefox and IE/Edge
                htmlElement.style.setProperty('scrollbar-width', 'none', 'important');
                htmlElement.style.setProperty('-ms-overflow-style', 'none', 'important');
                bodyElement.style.setProperty('scrollbar-width', 'none', 'important');
                bodyElement.style.setProperty('-ms-overflow-style', 'none', 'important');
                
                // For webkit browsers (Chrome, Safari, Opera), add a class to hide scrollbars
                htmlElement.classList.add('fullscreen-scrollbar-hidden');
                bodyElement.classList.add('fullscreen-scrollbar-hidden');
            });
            
            // Cleanup function to restore original values
            return () => {
                cancelAnimationFrame(rafId);
                
                const htmlElement = document.documentElement;
                const bodyElement = document.body;
                
                // Get the scroll position from body top
                const savedScrollY = bodyElement.style.top;
                
                // Remove fixed positioning
                bodyElement.style.removeProperty('position');
                bodyElement.style.removeProperty('top');
                bodyElement.style.removeProperty('left');
                bodyElement.style.removeProperty('right');
                bodyElement.style.removeProperty('width');
                
                // Remove overflow properties
                htmlElement.style.removeProperty('overflow');
                bodyElement.style.removeProperty('overflow');
                
                // Restore scrollbar properties
                htmlElement.style.removeProperty('scrollbar-width');
                htmlElement.style.removeProperty('-ms-overflow-style');
                bodyElement.style.removeProperty('scrollbar-width');
                bodyElement.style.removeProperty('-ms-overflow-style');
                
                // Remove webkit scrollbar hiding class
                htmlElement.classList.remove('fullscreen-scrollbar-hidden');
                bodyElement.classList.remove('fullscreen-scrollbar-hidden');
                
                // Restore scroll position
                if (savedScrollY) {
                    window.scrollTo(0, parseInt(savedScrollY || '0') * -1);
                }
            };
        } else {
            // When not in fullscreen, ensure we clean up any lingering styles
            const htmlElement = document.documentElement;
            const bodyElement = document.body;
            
            bodyElement.style.removeProperty('position');
            bodyElement.style.removeProperty('top');
            bodyElement.style.removeProperty('left');
            bodyElement.style.removeProperty('right');
            bodyElement.style.removeProperty('width');
            htmlElement.style.removeProperty('overflow');
            bodyElement.style.removeProperty('overflow');
            htmlElement.style.removeProperty('scrollbar-width');
            htmlElement.style.removeProperty('-ms-overflow-style');
            bodyElement.style.removeProperty('scrollbar-width');
            bodyElement.style.removeProperty('-ms-overflow-style');
            
            // Remove webkit scrollbar hiding class
            htmlElement.classList.remove('fullscreen-scrollbar-hidden');
            bodyElement.classList.remove('fullscreen-scrollbar-hidden');
        }
    }, [isFullScreen]);

    // Keyboard shortcut: Escape to exit full-screen mode
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isFullScreen) {
                e.preventDefault();
                exitFullScreen();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [toggleFullScreen, exitFullScreen, isFullScreen]);

    // Manages visibility of scroll arrows for the question dots container
    useEffect(() => {
        const container = dotsContainerRef.current;
        if (!container) return;

        // Create ResizeObserver instance
        const observer = new ResizeObserver(updateArrowVisibility);

        // Initial visibility check
        updateArrowVisibility();

        // Add event listeners
        container.addEventListener('scroll', updateArrowVisibility);
        observer.observe(container);

        // Cleanup function
        return () => {
            container.removeEventListener('scroll', updateArrowVisibility);
            observer.unobserve(container);
        };
    }, [isFullScreen, readingData, totalAllQuestions, updateArrowVisibility]);

    useEffect(() => {
        if (!useUnifiedMockHeader || hasInstructionAcknowledged) return;
        if (readingTutorialStatusSentRef.current) return;
        readingTutorialStatusSentRef.current = true;
        const session = getMockSession();
        postMockSessionStatus(MOCK_SESSION_STATUS.READING_TUTORIAL, {
            token: session?.accessToken,
            sessionId: session?.sessionId
        });
    }, [useUnifiedMockHeader, hasInstructionAcknowledged]);

    useEffect(() => {
        if (!useUnifiedMockHeader || !hasInstructionAcknowledged || !readingData || loading) return;
        if (readingExamStatusSentRef.current) return;
        readingExamStatusSentRef.current = true;
        const session = getMockSession();
        postMockSessionStatus(MOCK_SESSION_STATUS.READING_EXAM, {
            token: session?.accessToken,
            sessionId: session?.sessionId
        });
    }, [useUnifiedMockHeader, hasInstructionAcknowledged, readingData, loading]);

    // Show IELTS-style instructions screen before the test starts (mock exam only)
    if (useUnifiedMockHeader && !hasInstructionAcknowledged) {
        return (
            <IELTSReadingInstructionsCard
                onStart={() => setHasInstructionAcknowledged(true)}
            />
        );
    }

    // Early returns for loading and error states
    if (loading) {
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
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <BsExclamationCircle size={48} className="error-icon" />
                <h2>{t('error.title')}</h2>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={loadReadingData}>
                    {t('tryAgain')}
                </button>
            </div>
        );
    }

    if (!readingData) return null;

    // Common props for both modes to reduce duplication
    const isMockFullscreenLike = uiVariant === 'mock-fullscreen-like';

    // Common props for both modes to reduce duplication
    const commonProps = {
        readingData,
        userAnswers,
        onAnswerChange: handleAnswerChange,
        isReviewMode,
        reviewMap,
        readingId: ['b2', 'c1', 'c2'].includes(difficulty?.toLowerCase()) ? readingData?.id : null,
        isSubmitting,
        allQuestionsAnswered,
        totalAnsweredCount,
        allAnswersData,
        handleSubmit,
        handleBack,
        handleRetry,
        handleReview,
        showResults,
        results,
        filteredQuestions,
        filteredQuestionsGlobal,
        canSubmit,
        submitAnsweredCount,
        submitTotalCount,
        groupedQuestions,
        questionRanges,
        currentPassageQuestions,
        difficulty,
        activePassageId,
        onPassageChange: handlePassageChange,
        currentPassage,
        passageParagraphs,
        passageIsHtml,
        passageTitle,
        totalQuestions,
        columnWidth,
        onColumnResize: setColumnWidth,
        handleQuestionClick,
        adjustedTimeLimit,
        timerStartTime,
        finalTimerState,
        handleTimeUp,
        allQuestions,
        visiblePassages,
        isTimerPaused,
        setTimerPaused,
        inlinePassagePick,
        onInlinePassagePickChange: handleInlinePassagePickChange,
        isMockFullscreenLike,
        useUnifiedMockHeader
    };

    // Normal mode render
    return (
        <NormalReadingMode
            {...commonProps}
            nextHref={nextHref}
        />
    );
}