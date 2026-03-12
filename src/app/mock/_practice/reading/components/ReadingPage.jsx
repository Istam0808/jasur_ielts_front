'use client';
import "../styles/readingProcess.scss"

import { useEffect, useRef, useCallback } from 'react';
import { BsExclamationCircle } from 'react-icons/bs';
import { useTranslation } from 'react-i18next';
import Spinner from '@/components/common/spinner';

// Import extracted components and hooks
import { useReadingState } from '../hooks/useReadingState';
import { useTextHighlighting } from '../hooks/useTextHighlighting';
import FullscreenReadingMode from './FullscreenReadingMode';
import NormalReadingMode from './NormalReadingMode';

export default function ReadingPage({ readingExercise, difficulty, id, nextHref = null, uiVariant = 'default' }) {
    const { t } = useTranslation('reading');

    // PC only: fullscreen and keyboard shortcuts enabled
    const isMobile = false;

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
    } = useReadingState(readingExercise, difficulty, id);

    // Use text highlighting hook
    const {
        passageHighlights,
        setPassageHighlights,
        highlightTextSelection,
        clearPassageHighlights,
        clearAllHighlights,
        restorePassageHighlights,
        handleTextSelection,
        handleHighlightClick
    } = useTextHighlighting(readingData, isFullScreen, activePassageId);

    // Ref for the scrollable question dots container
    const dotsContainerRef = useRef(null);

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

    // Initialize timer start time if not set (runs only once when readingData is available)
    useEffect(() => {
        if (readingData && !timerStartTime) {
            setTimerStartTime(Date.now());
        }
    }, [readingData, timerStartTime, setTimerStartTime]);

    // Load data on mount and when dependencies change
    useEffect(() => {
        if (processedReadingData) {
            loadReadingData();
        }
    }, [loadReadingData, processedReadingData]);

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

    // Clear highlights when reading data changes (new test loaded)
    useEffect(() => {
        if (readingData?.id) {
            clearAllHighlights();
        }
    }, [readingData?.id, clearAllHighlights]);

    // Cleanup highlights when component unmounts
    useEffect(() => {
        return () => {
            clearAllHighlights();
        };
    }, [clearAllHighlights]);

    // Restore highlights when component mounts, passage changes, or mode changes
    useEffect(() => {
        if (!readingData) return;

        // Use a timeout to ensure the DOM is fully updated
        const timeoutId = setTimeout(() => {
            if (readingData.isMultiPassage) {
                // For multi-passage readings, restore highlights for the current passage
                restorePassageHighlights(activePassageId);
            } else {
                // For single-passage readings, restore highlights for passage 1
                restorePassageHighlights(1);
            }
        }, 200); // Increased delay for better reliability

        return () => clearTimeout(timeoutId);
    }, [readingData, activePassageId, restorePassageHighlights, isFullScreen, isReviewMode]);

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
        handleHighlightClick,
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
        isMockFullscreenLike
    };

    // Render appropriate mode based on fullscreen state
    if (isFullScreen) {
        return (
            <FullscreenReadingMode
                {...commonProps}
                handleScrollDots={handleScrollDots}
                showLeftArrow={showLeftArrow}
                showRightArrow={showRightArrow}
                dotsContainerRef={dotsContainerRef}
                isFullScreen={isFullScreen}
                toggleFullScreen={toggleFullScreen}
                nextHref={nextHref}
            />
        );
    }

    // Normal mode render
    return (
        <NormalReadingMode
            {...commonProps}
            isMobile={isMobile}
            toggleFullScreen={toggleFullScreen}
            selectedQuestionTypes={selectedQuestionTypes}
            onQuestionTypeFilter={handleQuestionTypeFilter}
            onTimeAdjustment={handleTimeAdjustment}
            nextHref={nextHref}
        />
    );
}