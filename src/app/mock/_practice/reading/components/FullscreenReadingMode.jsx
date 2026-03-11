'use client';
import "../styles/readingProcess.scss";
import { useEffect, useMemo } from 'react';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { FiEye } from 'react-icons/fi';
import { MdFullscreen } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import ResizableColumns from '@/components/common/ResizableColumns';
import Timer from '@/components/common/Timer';
import QuestionGroup from './QuestionGroup';
import PassageNavigation from './PassageNavigation';
import PassageArrowNavigation from './PassageArrowNavigation';
import ResultsModal from '../../common/ModalResults';
import AIButton from '@/components/common/AIButton';
import { isSpecificSlotAnswered, isSpecificSlotCorrect } from '../helpers/questionUtils';
import { useDistractionDetector } from '@/hooks/useDistractionDetector';
import sanitizeHtml from '@/utils/sanitizeHtml';

export default function FullscreenReadingMode({
    readingData,
    userAnswers,
    onAnswerChange,
    isReviewMode,
    reviewMap,
    readingId,
    isSubmitting,
    allQuestionsAnswered,
    canSubmit,
    totalAnsweredCount,
    submitAnsweredCount,
    submitTotalCount,
    allAnswersData,
    handleSubmit,
    handleBack,
    handleRetry,
    handleReview,
    showResults,
    results,
    filteredQuestions,
    filteredQuestionsGlobal,
    groupedQuestions,
    questionRanges,
    difficulty,
    activePassageId,
    onPassageChange,
    currentPassage,
    passageParagraphs,
    passageIsHtml = false,
    passageTitle,
    totalQuestions,
    columnWidth,
    onColumnResize,
    handleQuestionClick,
    handleScrollDots,
    showLeftArrow,
    showRightArrow,
    dotsContainerRef,
    handleHighlightClick,
    isFullScreen,
    adjustedTimeLimit,
    timerStartTime,
    finalTimerState,
    handleTimeUp,
    allQuestions,
    visiblePassages,
    toggleFullScreen,
    isTimerPaused,
    setTimerPaused,
    isPlacementTest = false, // New prop for placement test mode
    nextHref = null
}) {
    const { t } = useTranslation('reading');

    // Distraction detection with silent pause/resume for reading sessions
    useDistractionDetector({
        enabled: true,
        showModal: false,
        reason: 'Reading practice session',
        blurGraceMs: 0, // Stop immediately on blur
        inactivityMs: 5 * 60 * 1000, // 5 minutes inactivity
        onDistraction: () => {
            setTimerPaused(true);
        },
        onReturn: () => {
            setTimerPaused(false);
        }
    });

    useEffect(() => {
        return () => {
            setTimerPaused(false);
        };
    }, [setTimerPaused]);

    // Memoize expensive calculations
    const isMultiPassage = useMemo(() => readingData?.isMultiPassage, [readingData]);
    const hasTimeLimit = useMemo(() => readingData?.metadata?.timeLimit > 0, [readingData]);
    const isAdvancedReading = useMemo(() =>
        ['b2', 'c1', 'c2'].includes(difficulty?.toLowerCase()),
        [difficulty]
    );

    // Memoize submit button text
    const submitButtonText = useMemo(() => {
        if (isSubmitting) return t('submitting');
        if (isReviewMode) return t('reviewing');
        if (canSubmit) return t('submitTest');
        return t('submitProgress', {
            answered: submitAnsweredCount,
            total: submitTotalCount || 0
        });
    }, [isSubmitting, isReviewMode, canSubmit, submitAnsweredCount, submitTotalCount, t]);

    // Memoize timer component to prevent unnecessary re-renders
    const TimerComponent = useMemo(() => {
        if (!hasTimeLimit) return null;

        return (
            <Timer
                durationInMinutes={adjustedTimeLimit || readingData.metadata.timeLimit}
                onTimeUp={handleTimeUp}
                isActive={!isSubmitting && !isReviewMode && !isTimerPaused}
                startTime={timerStartTime}
                isReviewMode={isReviewMode}
                finalTimeLeft={finalTimerState !== null ? finalTimerState : undefined}
            />
        );
    }, [
        hasTimeLimit,
        adjustedTimeLimit,
        readingData?.metadata?.timeLimit,
        handleTimeUp,
        isSubmitting,
        isReviewMode,
        isTimerPaused,
        timerStartTime,
        finalTimerState
    ]);

    // Memoize review badge to prevent re-renders
    // Don't show review badge in placement test mode
    const ReviewBadge = useMemo(() => {
        if (!isReviewMode || isPlacementTest) return null;

        return (
            <span className="review-mode-badge">
                <FiEye className="review-icon" />
                {t('reviewMode')}
            </span>
        );
    }, [isReviewMode, isPlacementTest, t]);

    // Memoize question dots to prevent unnecessary re-renders
    const QuestionDots = useMemo(() => {
        if (!allAnswersData?.individualAnswerSlots) return null;

        return allAnswersData.individualAnswerSlots.map((answerSlot) => {
            const { sequentialNumber, questionId } = answerSlot;

            // Handle placeholder slots for missing questions
            if (questionId === -1) {
                return (
                    <button
                        key={`placeholder-${sequentialNumber}`}
                        className="question-dot unanswered placeholder"
                        disabled={true}
                        title={`${t('answer')} ${sequentialNumber} - ${t('notAvailable', 'Not available')}`}
                        aria-label={`Answer ${sequentialNumber} - Not available`}
                    >
                        <span className="dot-question-number">{sequentialNumber}</span>
                    </button>
                );
            }

            const question = allQuestions?.find(q => q.id === questionId);
            const userAnswer = userAnswers?.[questionId];

            // Check if this specific individual answer is provided
            const isAnswered = question && userAnswer ?
                isSpecificSlotAnswered(userAnswer, question, answerSlot) : false;

            const isInCurrentPassage = isMultiPassage ?
                currentPassage?.questions?.some(q => q.id === questionId) : true;

            const dotClasses = [
                'question-dot',
                isAnswered ? 'answered' : 'unanswered',
                isInCurrentPassage ? 'current-passage' : 'other-passage'
            ].join(' ');

            let reviewClass = '';
            if (isReviewMode && question) {
                const readingIdForLevel = ['b2', 'c1', 'c2'].includes(difficulty?.toLowerCase()) ? readingId : null;
                const isCorrect = isSpecificSlotCorrect(userAnswer, question, answerSlot, readingIdForLevel, reviewMap);
                reviewClass = isAnswered ? (isCorrect ? 'correct' : 'incorrect') : '';
            }

            const title = [
                `${t('answer')} ${sequentialNumber} (${t('question')} ${questionId})`,
                isAnswered ? t('completed') : t('unanswered'),
                !isInCurrentPassage ? `(${t('otherPassage')})` : ''
            ].filter(Boolean).join(' - ');

            return (
                <button
                    key={`dot-${sequentialNumber}`}
                    className={[dotClasses, reviewClass].filter(Boolean).join(' ')}
                    data-question-id={questionId}
                    onClick={() => handleQuestionClick(answerSlot)}
                    title={title}
                    aria-label={t('answerNavigation', {
                        status: isAnswered ? t('completed') : t('unanswered'),
                        number: sequentialNumber,
                        questionNumber: questionId
                    })}
                >
                    <span className="dot-question-number">{sequentialNumber}</span>
                    {isAnswered && <span className="checkmark">✓</span>}
                </button>
            );
        });
    }, [
        allAnswersData,
        allQuestions,
        userAnswers,
        isMultiPassage,
        currentPassage,
        handleQuestionClick,
        t,
        // Ensure immediate recompute when entering review and when answers map arrives
        isReviewMode,
        reviewMap,
        difficulty,
        readingId
    ]);

    // Memoize grouped questions rendering
    const QuestionGroups = useMemo(() => {
        return groupedQuestions?.map((questionGroup, groupIndex) => (
            <QuestionGroup
                key={`group-${groupIndex}-${questionGroup[0]?.id}`}
                questions={questionGroup}
                userAnswers={userAnswers}
                onAnswerChange={onAnswerChange}
                isReviewMode={isReviewMode}
                questionRanges={questionRanges}
                readingId={readingId}
                difficulty={difficulty}
                reviewMap={isAdvancedReading ? reviewMap : null}
            />
        ));
    }, [
        groupedQuestions,
        userAnswers,
        onAnswerChange,
        isReviewMode,
        questionRanges,
        isAdvancedReading,
        readingId,
        difficulty,
        // Include review map so grouped questions re-render when it becomes available
        reviewMap
    ]);

    // Memoize passage paragraphs to prevent unnecessary re-renders
    const PassageParagraphs = useMemo(() => {
        if (passageIsHtml && passageParagraphs?.length > 0) {
            return (
                <div
                    className="passage-html"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(passageParagraphs[0]) }}
                />
            );
        }
        return passageParagraphs?.map((paragraph, index) => (
            <p key={`paragraph-${index}`} className="passage-paragraph">
                {paragraph}
            </p>
        ));
    }, [passageParagraphs, passageIsHtml]);

    // Render helpers for cleaner JSX
    const renderLeftSection = () => {
        // Advanced multi-passage variant: show Part + Instruction banner on the left
        if (isMultiPassage && isAdvancedReading) {
            const partLabel = `${t('part', 'Part')} ${activePassageId}`;
            const instructionText = `${t('readingInstruction', 'Read the text and answer questions')} ${currentPassage?.question_range || ''}.`;

            return (
                <div className="fullscreen-advanced-banner" role="region" aria-label={t('instructions', 'Instructions')}>
                    <div className="advanced-part-title" aria-live="polite">{partLabel}</div>
                    <div className="advanced-instruction-text">{instructionText}</div>
                </div>
            );
        }

        // Default multi-passage (basic levels): keep passage tabs
        if (isMultiPassage) {
            return (
                <div className="fullscreen-passages-nav">
                    <PassageNavigation
                        passages={visiblePassages?.length ? visiblePassages : readingData.passages}
                        activePassageId={activePassageId}
                        onPassageChange={onPassageChange}
                        userAnswers={userAnswers}
                        isReviewMode={isReviewMode}
                    />
                </div>
            );
        }

        // Non-multi-passage: keep minimal left title + timer cluster
        return (
            <>
                <div className="fullscreen-title">
                    {ReviewBadge}
                </div>
                <div className="fullscreen-timer">
                    {TimerComponent}
                </div>
            </>
        );
    };

    const renderRightSection = () => {
        if (isMultiPassage) {
            // Advanced multi-passage: show Review badge + Timer together on the right in review mode
            if (isAdvancedReading) {
                return (
                    <div className="fullscreen-advanced-right">
                        {isReviewMode && toggleFullScreen && (
                            <button
                                className="fullscreen-toggle-btn"
                                onClick={toggleFullScreen}
                                title={`${t('exitFullScreen')} (Esc)`}
                            >
                                <MdFullscreen size={20} />
                                <span className="fullscreen-text">{t('exitFullScreen')}</span>
                            </button>
                        )}
                        {isReviewMode && (
                            <div className="fullscreen-title">
                                {ReviewBadge}
                            </div>
                        )}
                        <div className="fullscreen-timer">
                            {TimerComponent}
                        </div>
                    </div>
                );
            }

            // Default multi-passage controls with review badge + timer
            return (
                <div className="fullscreen-controls-group">
                    <div className="fullscreen-title">
                        {ReviewBadge}
                    </div>
                    <div className="fullscreen-timer">
                        {TimerComponent}
                    </div>
                </div>
            );
        }

        return (
            <div className="fullscreen-submit-section">
                {!isReviewMode && (
                    <AIButton
                        onClick={handleSubmit}
                        disabled={isSubmitting || !canSubmit}
                        aria-label={submitButtonText}
                    >
                        {submitButtonText}
                    </AIButton>
                )}
                {isReviewMode && !isPlacementTest && (
                    <button
                        className="btn btn-secondary"
                        onClick={handleBack}
                        aria-label={t('chooseAnotherTopic')}
                    >
                        {t('chooseAnotherTopic')}
                    </button>
                )}
            </div>
        );
    };

    const renderScrollArrow = (direction, show, handler) => {
        if (!show) return null;

        const isLeft = direction === 'left';
        const Icon = isLeft ? IoChevronBack : IoChevronForward;
        const scrollDirection = isLeft ? 'scrollLeft' : 'scrollRight';

        return (
            <button
                className={`scroll-arrow ${direction}`}
                onClick={() => handler(direction)}
                aria-label={t(scrollDirection)}
                title={t(scrollDirection)}
                disabled={!show}
            >
                <Icon />
            </button>
        );
    };

    const renderProgressBar = () => (
        <div className={`fullscreen-progress-section ${isReviewMode ? 'review-mode' : ''}`}>
            <div className="fullscreen-progress-bar">
                {renderScrollArrow('left', showLeftArrow, handleScrollDots)}
                <div className="question-dots" ref={dotsContainerRef}>
                    {QuestionDots}
                </div>
                {renderScrollArrow('right', showRightArrow, handleScrollDots)}
            </div>
            {isMultiPassage && (
                <div className="fullscreen-passage-arrows">
                    <PassageArrowNavigation
                        passages={readingData.passages}
                        activePassageId={activePassageId}
                        onPassageChange={onPassageChange}
                        userAnswers={userAnswers}
                        isReviewMode={isReviewMode}
                    />
                </div>
            )}
        </div>
    );

    const renderMultiPassageSubmit = () => {
        if (!isMultiPassage) return null;

        // In review mode, hide the submit button and only offer to choose another topic
        // But skip this in placement test mode
        if (isReviewMode && !isPlacementTest) {
            return (
                <div className="fullscreen-submit">
                    <button
                        className="btn btn-secondary"
                        onClick={handleBack}
                        aria-label={t('chooseAnotherTopic')}
                    >
                        {t('chooseAnotherTopic')}
                    </button>
                </div>
            );
        }

        if (!canSubmit) return null;

        return (
            <div className="fullscreen-submit">
                <AIButton
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    aria-label={submitButtonText}
                >
                    {submitButtonText}
                </AIButton>
            </div>
        );
    };

    const renderResultsModal = () => {
        // Don't show results modal in placement test mode
        if (isPlacementTest) return null;
        if (!showResults || !results) return null;

        return (
            <ResultsModal
                results={results}
                onClose={handleBack}
                onReview={handleReview}
                onRetry={handleRetry}
                testType="reading"
                readingData={readingData}
                userAnswers={userAnswers}
                difficulty={difficulty}
                isFullScreen={true}
                filteredQuestions={filteredQuestionsGlobal}
                nextHref={nextHref}
            />
        );
    };

    const headerClassName = [
        'fullscreen-header',
        isMultiPassage && isAdvancedReading ? 'advanced-multi' : ''
    ].filter(Boolean).join(' ');

    return (
        <div
            className="reading-container fullscreen-mode"
            data-level={readingData?.level}
        >
            {/* Minimal full-screen header */}
            <div className={headerClassName}>
                <div className="fullscreen-header-row">
                    <div className="fullscreen-left-section">
                        {renderLeftSection()}
                    </div>
                    <div className="fullscreen-right-section">
                        {renderRightSection()}
                    </div>
                </div>
            </div>

            {/* Full-screen content with passage and questions */}
            <div className="fullscreen-content">
                <ResizableColumns
                    defaultLeftWidth={50}
                    minLeftWidth={35}
                    maxLeftWidth={65}
                    onResize={onColumnResize}
                    className="fullscreen-resizable-content"
                    forceEnable={true}
                >
                    {/* Passage Section */}
                    <div className="fullscreen-passage">
                        <div
                            className="passage-content"
                            onClick={handleHighlightClick}
                            style={{ userSelect: 'text', cursor: 'text' }}
                            role="article"
                            aria-label={`${t('readingPassage')}: ${passageTitle}`}
                            data-passage-id={isMultiPassage ? activePassageId : 1}
                        >
                            <div className="section-header">
                                <h2>
                                    {isMultiPassage
                                        ? `${t('passage')} ${activePassageId}`
                                        : t('readingPassage')
                                    }
                                </h2>
                            </div>
                            <h3 className="passage-title">{passageTitle}</h3>
                            {PassageParagraphs}
                        </div>
                    </div>

                    {/* Questions Section */}
                    <div className="fullscreen-questions">
                        <div className="questions-content">
                            <div className="section-header">
                                <h2>
                                    {isMultiPassage
                                        ? `${t('questions')} ${currentPassage?.question_range || ''}`
                                        : t('questions')
                                    }
                                </h2>
                                <span className="questions-count">
                                    {totalQuestions} {t('questionCount')}
                                </span>
                            </div>
                            {groupedQuestions?.length === 0 ? (
                                <div className="no-questions-message" style={{ padding: '1rem', color: '#6b7280' }}>
                                    {t('filter.noQuestions', 'No questions match the selected types.')}
                                </div>
                            ) : (
                                QuestionGroups
                            )}
                        </div>
                    </div>
                </ResizableColumns>
            </div>

            {renderProgressBar()}
            {renderMultiPassageSubmit()}
            {renderResultsModal()}
        </div>
    );
}