'use client';
import "../styles/readingProcess.scss";
import { useEffect, useMemo } from 'react';
import { IoChevronBack } from 'react-icons/io5';
import { FiEye } from 'react-icons/fi';
import { MdFullscreen } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import ResizableColumns from '@/components/common/ResizableColumns';
import Timer from '@/components/common/Timer';
import ProgressBar from '../../../common/ProgressBar';
import QuestionGroup from './QuestionGroup';
import PassageNavigation from './PassageNavigation';
import PassageArrowNavigation from './PassageArrowNavigation';
import QuestionTypeFilter from './QuestionTypeFilter';
import ResultsModal from '../../../common/ModalResults';
import { useLearningTimer } from '@/hooks/useLearningTimer';
import { useDistractionDetector } from '@/hooks/useDistractionDetector';

export default function NormalReadingMode({
    readingData,
    userAnswers,
    onAnswerChange,
    isReviewMode,
    reviewMap,
    readingId,
    error,
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
    visiblePassages,
    passageParagraphs,
    passageTitle,
    wordCount,
    totalQuestions,
    columnWidth,
    onColumnResize,
    handleQuestionClick,
    handleHighlightClick,
    isMobile,
    toggleFullScreen,
    selectedQuestionTypes,
    onQuestionTypeFilter,
    onTimeAdjustment,
    adjustedTimeLimit,
    timerStartTime,
    finalTimerState,
    handleTimeUp,
    isTimerPaused,
    setTimerPaused,
    isMockFullscreenLike = false,
    nextHref = null
}) {
    const { t } = useTranslation('reading');
    const submitButtonText = isSubmitting
        ? t('submitting')
        : isReviewMode
            ? t('reviewing')
            : canSubmit
                ? t('submitTest')
                : t('submitProgress', { answered: submitAnsweredCount, total: submitTotalCount });

    // Learning timer: start when reading mode opens, stop on finish/close/unmount
    const { manualStart, manualStop } = useLearningTimer({ 
        activityTag: 'reading_practice', 
        renderless: true
    });

    // Start/stop learning timer when component mounts/unmounts
    useEffect(() => {
        try { manualStart(); } catch (_) {}
        return () => { try { manualStop(); } catch (_) {} };
    }, [manualStart, manualStop]);

    // Distraction detection with silent pause/resume for reading sessions
    useDistractionDetector({
        enabled: true,
        showModal: false,
        reason: 'Reading practice session',
        blurGraceMs: 0, // Stop immediately on blur
        inactivityMs: 5 * 60 * 1000, // 5 minutes inactivity
        onDistraction: () => {
            // Pause timer silently when user switches tabs/apps
            try { manualStop(); } catch (_) {}
            setTimerPaused(true);
        },
        onReturn: () => {
            // Resume timer silently when user returns
            try { manualStart(); } catch (_) {}
            setTimerPaused(false);
        }
    });

    useEffect(() => {
        return () => {
            setTimerPaused(false);
        };
    }, [setTimerPaused]);

    return (
        <div
            className={`reading-container ${isMockFullscreenLike ? 'mock-fullscreen-like' : ''}`}
            data-level={readingData?.level}
        >
            {/* Header */}
            <header className={`reading-header ${isMockFullscreenLike ? 'mock-fullscreen-like' : ''}`}>
                <div className="header-left">
                    {!isMockFullscreenLike && (
                        <button className="back-btn" onClick={handleBack}>
                            <IoChevronBack size={20} />
                            <span className="back-btn-text">{t('back')}</span>
                        </button>
                    )}

                    {/* Full-screen toggle button - hidden for mobile devices */}
                    {!isMobile && !isMockFullscreenLike && (
                        <button
                            className="fullscreen-toggle-btn"
                            onClick={toggleFullScreen}
                            title={`${t('enterFullScreen')} (F11)`}
                        >
                            <MdFullscreen size={20} />
                            <span className="fullscreen-text">{t('fullScreen')}</span>
                        </button>
                    )}
                </div>

                <div className="title-section">
                    {readingData.metadata?.timeLimit > 0 && (
                <Timer
                            durationInMinutes={adjustedTimeLimit || readingData.metadata.timeLimit}
                            onTimeUp={handleTimeUp}
                    isActive={!isSubmitting && !isReviewMode && !isTimerPaused}
                            startTime={timerStartTime}
                            isReviewMode={isReviewMode}
                            finalTimeLeft={finalTimerState !== null ? finalTimerState : undefined}
                        />
                    )}
                </div>

                <div className="header-right">
                    {/* Review Mode Badge */}
                    {isReviewMode && (
                        <span className="review-mode-badge">
                            <FiEye className="review-icon" />
                            {t('reviewMode')}
                        </span>
                    )}

                    {isMockFullscreenLike && !isReviewMode && (
                        <button
                            className={`btn btn-submit mock-submit-btn ${canSubmit ? 'ready' : 'incomplete'}`}
                            onClick={handleSubmit}
                            disabled={isSubmitting || isReviewMode || !canSubmit}
                        >
                            {submitButtonText}
                        </button>
                    )}

                    {!isMockFullscreenLike && (
                        <QuestionTypeFilter
                            questions={readingData.isMultiPassage ? readingData.questions : readingData.questions}
                            selectedTypes={selectedQuestionTypes}
                            onFilterChange={onQuestionTypeFilter}
                            onTimeAdjustment={onTimeAdjustment}
                            originalTimeLimit={readingData.metadata?.timeLimit}
                            isMultiPassage={readingData.isMultiPassage}
                            currentPassage={currentPassage}
                        />
                    )}
                </div>
            </header>

            {/* Progress Bar */}
            <ProgressBar
                answered={totalAnsweredCount}
                total={allAnswersData.individualAnswerSlots.length}
                userAnswers={userAnswers}
                questions={readingData.questions}
                isMockFullscreenLike={isMockFullscreenLike}
                onQuestionClick={handleQuestionClick}
                currentPassageId={readingData?.isMultiPassage ? activePassageId : null}
                passageData={readingData?.isMultiPassage ? (visiblePassages?.length ? visiblePassages : readingData.passages) : null}
                isReviewMode={isReviewMode}
                readingId={['b2','c1','c2'].includes(difficulty?.toLowerCase()) ? readingData?.id : null}
                difficulty={difficulty}
                reviewMap={['b2','c1','c2'].includes(difficulty?.toLowerCase()) ? reviewMap : null}
                passageNavigation={readingData?.isMultiPassage ? (
                    <PassageNavigation
                        passages={visiblePassages?.length ? visiblePassages : readingData.passages}
                        activePassageId={activePassageId}
                        onPassageChange={onPassageChange}
                        userAnswers={userAnswers}
                        isReviewMode={isReviewMode}
                    />
                ) : null}
            />

            {/* Main Content */}
            <ResizableColumns
                defaultLeftWidth={50}
                minLeftWidth={35}
                maxLeftWidth={65}
                onResize={onColumnResize}
                className="reading-content"
            >
                {/* Passage Section */}
                <div className="passage-section">
                    <div className="section-header">
                        <div className="header-left">
                            <h2>
                                {readingData.isMultiPassage
                                    ? `${t('passage')} ${activePassageId}`
                                    : t('readingPassage')
                                }
                            </h2>
                            <span className="word-count">{wordCount} {t('words')}</span>
                        </div>
                    </div>

                    {/* Passage navigation moved below resizable content */}

                    <div
                        className="passage-content"
                        onClick={handleHighlightClick}
                        style={{ userSelect: 'text', cursor: 'text' }}
                        data-passage-id={readingData?.isMultiPassage ? activePassageId : 1}
                    >
                        <h3 className="passage-title">{passageTitle}</h3>
                        {passageParagraphs.map((paragraph, index) => (
                            <p key={`paragraph-${index}`} className="passage-paragraph">
                                {paragraph}
                            </p>
                        ))}
                    </div>
                </div>

                {/* Questions Section */}
                <div className="questions-section">
                    <div className="section-header">
                        <h2>
                            {readingData.isMultiPassage
                                ? `${t('questions')} ${currentPassage?.question_range || ''}`
                                : t('questions')
                            }
                        </h2>
                        <span className="questions-count">{totalQuestions} {t('questionCount')}</span>
                    </div>
                    <div className="questions-content">
                        {(() => {
                            // For basic readings (A1, A2, B1), use null readingId to use embedded answers
                            // For advanced readings (B2, C1, C2), use readingData.id
                            const isAdvancedReading = ['b2', 'c1', 'c2'].includes(difficulty?.toLowerCase());
                            return groupedQuestions.length === 0 ? (
                                <div className="no-questions-message" style={{ padding: '1rem', color: '#6b7280' }}>
                                    {t('filter.noQuestions', 'No questions match the selected types.')}
                                </div>
                            ) : (
                                groupedQuestions.map((questionGroup, groupIndex) => (
                                    <QuestionGroup
                                        key={`group-${groupIndex}-${questionGroup[0].id}`}
                                        questions={questionGroup}
                                        userAnswers={userAnswers}
                                        onAnswerChange={onAnswerChange}
                                        isReviewMode={isReviewMode}
                                        questionRanges={questionRanges}
                                        readingId={readingId}
                                        difficulty={difficulty}
                                        reviewMap={isAdvancedReading ? reviewMap : null}
                                    />
                                ))
                            );
                        })()}
                    </div>
                </div>
            </ResizableColumns>

            {/* Bottom Passage Navigation (below content, right-aligned) */}
            {readingData.isMultiPassage && (
                <PassageArrowNavigation
                    passages={readingData.passages}
                    activePassageId={activePassageId}
                    onPassageChange={onPassageChange}
                    userAnswers={userAnswers}
                    isReviewMode={isReviewMode}
                />
            )}

            {/* Submit Button */}
            <div className={`submit-section ${isMockFullscreenLike ? 'mock-fullscreen-like' : ''}`}>
                {!isMockFullscreenLike && (
                    <button
                        className={`btn btn-submit ${canSubmit ? 'ready' : 'incomplete'}`}
                        onClick={handleSubmit}
                        disabled={isSubmitting || isReviewMode || !canSubmit}
                    >
                        {submitButtonText}
                    </button>
                )}
                {isReviewMode && (
                    <button
                        className="btn btn-secondary"
                        onClick={handleBack}
                    >
                        {t('chooseAnotherTopic', 'Choose another topic')}
                    </button>
                )}
            </div>

            {/* Mobile Passage Navigation moved above with unified placement */}

            {/* Inline error for review fetch/token issues */}
            {error && (
                <div className="error-container" role="alert" style={{marginTop: 12}}>
                    <p className="error-text">{error}</p>
                </div>
            )}

            {/* Results Modal */}
            {showResults && results && (
                <ResultsModal
                    results={results}
                    onClose={handleBack}
                    onReview={handleReview}
                    onRetry={handleRetry}
                    testType="reading"
                    readingData={readingData}
                    userAnswers={userAnswers}
                    difficulty={difficulty}
                    isFullScreen={false}
                    filteredQuestions={filteredQuestionsGlobal}
                    nextHref={nextHref}
                />
            )}
        </div>
    );
}
