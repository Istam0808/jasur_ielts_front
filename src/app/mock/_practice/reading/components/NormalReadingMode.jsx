'use client';
import "../styles/readingProcess.scss";
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ResizableColumns from '@/components/common/ResizableColumns';
import Timer from '@/components/common/Timer';
import ProgressBar from '../../common/ProgressBar';
import QuestionGroup from './QuestionGroup';
import PassageNavigation from './PassageNavigation';
import PassageArrowNavigation from './PassageArrowNavigation';
import QuestionTypeFilter from './QuestionTypeFilter';
import ResultsModal from '../../common/ModalResults';
import { useDistractionDetector } from '@/hooks/useDistractionDetector';
import sanitizeHtml from '@/utils/sanitizeHtml';
import PassageWithDropzones from './PassageWithDropzones';
import MockUnifiedHeader from '@/components/common/MockUnifiedHeader';
import { useMockUi } from '@/components/common/MockUiContext';
import { getMockSession } from '@/lib/mockSession';

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
    currentPassageQuestions,
    difficulty,
    activePassageId,
    onPassageChange,
    currentPassage,
    visiblePassages,
    passageParagraphs,
    passageIsHtml = false,
    passageTitle,
    totalQuestions,
    columnWidth,
    onColumnResize,
    handleQuestionClick,
    handleHighlightClick,
    adjustedTimeLimit,
    timerStartTime,
    finalTimerState,
    handleTimeUp,
    isTimerPaused,
    setTimerPaused,
    inlinePassagePick,
    onInlinePassagePickChange,
    isMockFullscreenLike = false,
    useUnifiedMockHeader = false,
    nextHref = null
}) {
    const { t } = useTranslation('reading');
    const { textSize } = useMockUi();
    const showMockHeaderState = isMockFullscreenLike && useUnifiedMockHeader;
    const submitButtonText = isSubmitting
        ? t('submitting')
        : isReviewMode
            ? t('reviewing')
            : canSubmit
                ? t('submitTest')
                : t('submitProgress', { answered: submitAnsweredCount, total: submitTotalCount });
    const testTakerId = useMemo(() => {
        if (!showMockHeaderState) return '';
        const username = getMockSession()?.username;
        const normalized = typeof username === 'string' ? username.trim() : '';
        return normalized || 'unknown';
    }, [showMockHeaderState]);
    const timerInHeader = readingData.metadata?.timeLimit > 0 ? (
        <Timer
            durationInMinutes={adjustedTimeLimit || readingData.metadata.timeLimit}
            onTimeUp={handleTimeUp}
            isActive={!isSubmitting && !isReviewMode && !isTimerPaused}
            startTime={timerStartTime}
            isReviewMode={isReviewMode}
            finalTimeLeft={finalTimerState !== null ? finalTimerState : undefined}
        />
    ) : null;

    const inlineMatchingQuestion = useMemo(() => {
        const sourceQuestions = Array.isArray(currentPassageQuestions) ? currentPassageQuestions : [];
        return sourceQuestions.find((q) => q?.type === 'matching_headings' && q?.renderInPassage) || null;
    }, [currentPassageQuestions]);

    const inlineMatchingAnswer = inlineMatchingQuestion ? userAnswers?.[inlineMatchingQuestion.id] : null;
    const inlinePickedValue = inlineMatchingQuestion && inlinePassagePick?.questionId === inlineMatchingQuestion.id
        ? inlinePassagePick?.value
        : null;

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

    return (
        <div
            className={`reading-container ${isMockFullscreenLike ? 'mock-fullscreen-like' : ''} ${showMockHeaderState ? 'mock-unified-header-active' : ''} with-unified-header`}
            data-level={readingData?.level}
            data-mock-text-size={showMockHeaderState ? textSize : undefined}
        >
            <MockUnifiedHeader
                testTakerId={testTakerId}
                centerContent={timerInHeader}
            />

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
                        {passageIsHtml && passageParagraphs?.length > 0 ? (
                            inlineMatchingQuestion ? (
                                <PassageWithDropzones
                                    htmlText={passageParagraphs[0]}
                                    question={inlineMatchingQuestion}
                                    questionRange={questionRanges?.[inlineMatchingQuestion.id]}
                                    answer={inlineMatchingAnswer}
                                    isReviewMode={isReviewMode}
                                    onAnswerChange={onAnswerChange}
                                    inlinePickedOption={inlinePickedValue}
                                    onInlinePickOptionChange={onInlinePassagePickChange}
                                />
                            ) : (
                                <div
                                    className="passage-html"
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(passageParagraphs[0]) }}
                                />
                            )
                        ) : (
                            passageParagraphs.map((paragraph, index) => (
                                <p key={`paragraph-${index}`} className="passage-paragraph">
                                    {paragraph}
                                </p>
                            ))
                        )}
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
                                        inlinePickedOption={inlinePickedValue}
                                        onInlinePickOptionChange={onInlinePassagePickChange}
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
