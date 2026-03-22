'use client';
import "../styles/readingProcess.scss";
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
import MockExamFooter from '@/components/mock/MockExamFooter';
import HighlightText from '@/components/common/HighlightText';
import { isSpecificSlotAnswered } from '../helpers/questionUtils';

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
    columnWidth,
    onColumnResize,
    handleQuestionClick,
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
    const containerRef = useRef(null);
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

    const mockFooterPassages = useMemo(() => {
        if (!readingData?.isMultiPassage) return [];
        return visiblePassages?.length ? visiblePassages : (readingData.passages || []);
    }, [readingData, visiblePassages]);

    const currentMockPartIndex = useMemo(() => {
        if (!mockFooterPassages.length) return 0;
        const foundIndex = mockFooterPassages.findIndex((passage) => passage.passage_id === activePassageId);
        return foundIndex >= 0 ? foundIndex : 0;
    }, [mockFooterPassages, activePassageId]);

    const readingHighlightStorageKey = useMemo(() => {
        const rid = readingData?.id ?? readingId ?? 'na';
        return `ielts-reading-hl-${rid}-${activePassageId}`;
    }, [readingData?.id, readingId, activePassageId]);

    const readingHighlightRestoreVersion = useMemo(
        () =>
            `${activePassageId}-${passageIsHtml ? String(passageParagraphs?.[0] || '').length : (passageParagraphs?.length ?? 0)}`,
        [activePassageId, passageIsHtml, passageParagraphs]
    );

    const getPassageQuestionNumbers = useCallback((passage) => {
        const numbers = [];
        if (!passage?.questions?.length) return numbers;

        passage.questions.forEach((question) => {
            const range = questionRanges?.[question.id];
            if (!range) return;
            for (let number = range.start; number <= range.end; number += 1) {
                numbers.push(number);
            }
        });

        return numbers;
    }, [questionRanges]);

    const activePartQuestionNumbers = useMemo(() => {
        const activePassage = mockFooterPassages[currentMockPartIndex];
        return getPassageQuestionNumbers(activePassage);
    }, [mockFooterPassages, currentMockPartIndex, getPassageQuestionNumbers]);

    const allQuestionsForMockFooter = useMemo(() => {
        if (readingData?.isMultiPassage) {
            return (readingData.passages || []).flatMap((passage) => passage.questions || []);
        }
        return readingData?.questions || [];
    }, [readingData]);

    const questionByIdForMockFooter = useMemo(() => {
        return new Map(allQuestionsForMockFooter.map((question) => [question.id, question]));
    }, [allQuestionsForMockFooter]);

    const allQuestionNumbers = useMemo(() => {
        const slots = Array.isArray(allAnswersData?.individualAnswerSlots)
            ? allAnswersData.individualAnswerSlots
            : [];
        return slots
            .map((slot) => slot.sequentialNumber)
            .filter((number) => Number.isFinite(number))
            .sort((a, b) => a - b);
    }, [allAnswersData]);

    const partTotals = useMemo(() => {
        return mockFooterPassages.map((passage) => getPassageQuestionNumbers(passage).length);
    }, [mockFooterPassages, getPassageQuestionNumbers]);

    const partAnsweredCounts = useMemo(() => {
        const slots = Array.isArray(allAnswersData?.individualAnswerSlots)
            ? allAnswersData.individualAnswerSlots
            : [];

        return mockFooterPassages.map((passage) => {
            const questionMap = new Map((passage?.questions || []).map((question) => [question.id, question]));
            if (!questionMap.size) return 0;

            return slots.reduce((count, slot) => {
                if (!questionMap.has(slot.questionId)) return count;
                const question = questionMap.get(slot.questionId);
                const answer = userAnswers?.[slot.questionId];
                return isSpecificSlotAnswered(answer, question, slot) ? count + 1 : count;
            }, 0);
        });
    }, [allAnswersData, mockFooterPassages, userAnswers]);

    const activeAttemptedQuestionNumbers = useMemo(() => {
        const slots = Array.isArray(allAnswersData?.individualAnswerSlots)
            ? allAnswersData.individualAnswerSlots
            : [];
        const activeSet = new Set(activePartQuestionNumbers);
        if (!activeSet.size) return [];

        return slots
            .filter((slot) => activeSet.has(slot.sequentialNumber))
            .filter((slot) => {
                const question = questionByIdForMockFooter.get(slot.questionId);
                if (!question) return false;
                const answer = userAnswers?.[slot.questionId];
                return isSpecificSlotAnswered(answer, question, slot);
            })
            .map((slot) => slot.sequentialNumber);
    }, [allAnswersData, activePartQuestionNumbers, questionByIdForMockFooter, userAnswers]);

    const [currentQuestionNumber, setCurrentQuestionNumber] = useState(null);

    useEffect(() => {
        if (!activePartQuestionNumbers.length) {
            setCurrentQuestionNumber(null);
            return;
        }

        if (currentQuestionNumber === null || !activePartQuestionNumbers.includes(currentQuestionNumber)) {
            setCurrentQuestionNumber(activePartQuestionNumbers[0]);
        }
    }, [activePartQuestionNumbers, currentQuestionNumber]);

    const selectQuestionByNumber = useCallback((questionNumber) => {
        if (!Number.isFinite(questionNumber)) return;

        const slot = allAnswersData?.individualAnswerSlots?.find(
            (item) => item.sequentialNumber === questionNumber
        );
        if (!slot) return;

        setCurrentQuestionNumber(questionNumber);
        handleQuestionClick(slot);
    }, [allAnswersData, handleQuestionClick]);

    // Клавиатурная навигация: `Tab`/`Shift+Tab` между вопросами (включая переход Part1 -> Part2).
    // Перехватываем Tab только если фокус находится в пределах карточки вопроса
    // и пользователь “проматывает” все фокусируемые элементы внутри неё.
    useEffect(() => {
        if (!isMockFullscreenLike || !readingData?.isMultiPassage || isReviewMode) return;
        if (!allQuestionNumbers.length || currentQuestionNumber == null) return;

        const FOCUSABLE_SELECTOR = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[contenteditable="true"]',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');

        const getFocusables = (container) => {
            if (!container || typeof container.querySelectorAll !== 'function') return [];
            return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
                // offsetParent null => элемент не отображается (не фокусируется)
                return el.offsetParent != null && !el.hasAttribute('disabled');
            });
        };

        const handleTabKeyDown = (e) => {
            if (e.key !== 'Tab') return;

            const questionsContent = document.querySelector('.questions-content');
            if (!questionsContent) return;

            const activeEl = document.activeElement;
            if (!activeEl || !questionsContent.contains(activeEl)) return;

            const questionCardEl = activeEl.closest('.reading-question-card[data-question-id], .grouped-question-content[data-question-id]');
            if (!questionCardEl) return;

            const questionId = questionCardEl.getAttribute('data-question-id');
            if (!questionId) return;

            const focusables = getFocusables(questionCardEl);
            if (!focusables.length) return;

            const activeIndex = focusables.indexOf(activeEl);
            if (activeIndex === -1) return;

            const isLeavingCard = e.shiftKey
                ? activeIndex === 0
                : activeIndex === focusables.length - 1;

            if (!isLeavingCard) return;

            // Определяем текущий последовательный номер вопроса
            const slots = Array.isArray(allAnswersData?.individualAnswerSlots)
                ? allAnswersData.individualAnswerSlots
                : [];

            const focusedSlot = slots.find((s) => String(s?.questionId) === String(questionId));
            const focusedSequential = Number(focusedSlot?.sequentialNumber);
            const currentSequential = Number.isFinite(focusedSequential) ? focusedSequential : Number(currentQuestionNumber);

            const currentIndex = allQuestionNumbers.indexOf(currentSequential);
            if (currentIndex === -1) return;

            const targetIndex = currentIndex + (e.shiftKey ? -1 : 1);
            if (targetIndex < 0 || targetIndex >= allQuestionNumbers.length) return;

            const targetSequentialNumber = allQuestionNumbers[targetIndex];

            e.preventDefault();
            selectQuestionByNumber(targetSequentialNumber);

            // После того как useReadingState переключит и проскроллит фокус,
            // форсируем фокус на “цифры” вопроса (например, 12).
            window.setTimeout(() => {
                const targetSlot = slots.find((s) => Number(s?.sequentialNumber) === targetSequentialNumber);
                if (!targetSlot?.questionId) return;

                const card = document.querySelector(`[data-question-id="${targetSlot.questionId}"]`);
                if (!card) return;

                const numberEl = card.querySelector('.question-header .question-number') || card.querySelector('.question-number');
                if (!numberEl) return;

                numberEl.setAttribute('tabindex', '-1');
                numberEl.focus({ preventScroll: true });
            }, 180);
        };

        document.addEventListener('keydown', handleTabKeyDown, true);
        return () => document.removeEventListener('keydown', handleTabKeyDown, true);
    }, [
        isMockFullscreenLike,
        readingData?.isMultiPassage,
        isReviewMode,
        allQuestionNumbers,
        currentQuestionNumber,
        allAnswersData,
        selectQuestionByNumber
    ]);

    const handleMockPartSelect = useCallback((partIndex) => {
        const targetPassage = mockFooterPassages[partIndex];
        if (!targetPassage) return;

        onPassageChange(targetPassage.passage_id);
        const targetQuestionNumbers = getPassageQuestionNumbers(targetPassage);
        const firstQuestionNumber = targetQuestionNumbers[0];
        if (!Number.isFinite(firstQuestionNumber)) {
            setCurrentQuestionNumber(null);
            return;
        }

        setTimeout(() => {
            selectQuestionByNumber(firstQuestionNumber);
        }, 120);
    }, [mockFooterPassages, onPassageChange, getPassageQuestionNumbers, selectQuestionByNumber]);

    const handleMockPrevNext = useCallback((delta) => {
        if (!allQuestionNumbers.length) return;

        const fallbackQuestion = activePartQuestionNumbers[0] || allQuestionNumbers[0];
        const current = currentQuestionNumber ?? fallbackQuestion;
        const currentIndex = allQuestionNumbers.indexOf(current);

        if (currentIndex === -1) {
            selectQuestionByNumber(allQuestionNumbers[0]);
            return;
        }

        const targetIndex = currentIndex + delta;
        if (targetIndex < 0 || targetIndex >= allQuestionNumbers.length) return;

        const targetQuestion = allQuestionNumbers[targetIndex];

        const targetPartIndex = mockFooterPassages.findIndex(
            (p) => getPassageQuestionNumbers(p).includes(targetQuestion)
        );

        if (targetPartIndex !== -1 && targetPartIndex !== currentMockPartIndex) {
            const targetPassage = mockFooterPassages[targetPartIndex];
            onPassageChange(targetPassage.passage_id);
            setTimeout(() => selectQuestionByNumber(targetQuestion), 120);
        } else {
            selectQuestionByNumber(targetQuestion);
        }
    }, [allQuestionNumbers, currentQuestionNumber, activePartQuestionNumbers, mockFooterPassages, currentMockPartIndex, getPassageQuestionNumbers, onPassageChange, selectQuestionByNumber]);

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

    // Подгоняем max-height основного контентного блока под фактическую высоту футера.
    // Это убирает "пустоту" между `reading-content` и видимой верхней границей MockExamFooter
    // даже если размеры футера меняются (за счёт контента/брейкпоинтов/правок стилей).
    useEffect(() => {
        if (!isMockFullscreenLike) return;

        const containerEl = containerRef.current;
        if (!containerEl) return;

        const readingContentEl = containerEl.querySelector('.reading-content');
        const passageSectionEl = containerEl.querySelector('.passage-section');
        const questionsSectionEl = containerEl.querySelector('.questions-section');
        const footerEl = containerEl.querySelector('.mock-exam-bottom-nav--ielts');
        const footerLayoutEl = containerEl.querySelector('.mock-exam-footer-layout');

        // Футер есть только в multi-passage mock; без него ранний выход (CSS задаёт высоту)
        if (!readingContentEl || !footerEl) return;

        const footerAnchorEl = footerLayoutEl || footerEl;

        const applyHeights = () => {
            const footerRect = footerAnchorEl.getBoundingClientRect();
            const footerTop = footerRect.top;

            const setMaxHeightToTop = (el) => {
                if (!el) return;
                const rect = el.getBoundingClientRect();
                const maxH = Math.max(0, footerTop - rect.top);
                el.style.maxHeight = `${maxH}px`;
            };

            setMaxHeightToTop(readingContentEl);
            setMaxHeightToTop(passageSectionEl);
            setMaxHeightToTop(questionsSectionEl);
        };

        // Сначала применяем после текущего layout'а.
        const rafId = window.requestAnimationFrame(applyHeights);
        window.addEventListener('resize', applyHeights);

        return () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener('resize', applyHeights);

            // Убираем inline-переопределения, чтобы вернуть CSS поведение.
            if (readingContentEl) readingContentEl.style.maxHeight = '';
            if (passageSectionEl) passageSectionEl.style.maxHeight = '';
            if (questionsSectionEl) questionsSectionEl.style.maxHeight = '';
        };
    }, [containerRef, isMockFullscreenLike]);

    return (
        <div
            ref={containerRef}
            className={`reading-container ${isMockFullscreenLike ? 'mock-fullscreen-like' : ''} ${isMockFullscreenLike && readingData?.isMultiPassage ? 'mock-footer-active' : ''} ${showMockHeaderState ? 'mock-unified-header-active' : ''} with-unified-header`}
            data-level={readingData?.level}
            data-mock-text-size={showMockHeaderState ? textSize : undefined}
        >
            <MockUnifiedHeader
                testTakerId={testTakerId}
                centerContent={timerInHeader}
            />

            {/* Progress Bar */}
            {!isMockFullscreenLike && (
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
            )}

            {/* Main Content */}
            <HighlightText
                className="reading-highlight-root"
                storageKey={readingHighlightStorageKey}
                restoreVersion={readingHighlightRestoreVersion}
            >
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

                        <div className="passage-content highlight-text-root">
                            <h3 className="passage-title" data-highlight-ignore="true">{passageTitle}</h3>
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
                        <h2>{t('questions')}</h2>
                        {readingData.isMultiPassage && currentPassage?.question_range && (
                            <span className="question-number range-number questions-range-badge">
                                <span>{currentPassage.question_range}</span>
                            </span>
                        )}
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
            </HighlightText>

            {/* Bottom Passage Navigation (below content, right-aligned) */}
            {!isMockFullscreenLike && readingData.isMultiPassage && (
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

            {isMockFullscreenLike && readingData.isMultiPassage && (
                <MockExamFooter
                    parts={mockFooterPassages}
                    currentPartIndex={currentMockPartIndex}
                    onSelectPart={handleMockPartSelect}
                    activePartQuestionNumbers={activePartQuestionNumbers}
                    attemptedQuestionNumbers={activeAttemptedQuestionNumbers}
                    currentQuestionNumber={currentQuestionNumber}
                    onSelectQuestion={selectQuestionByNumber}
                    onPrevNextQuestion={handleMockPrevNext}
                    partTotals={partTotals}
                    partAnsweredCounts={partAnsweredCounts}
                    getActivePartLabel={(partNum) => `${t('part', { defaultValue: 'Part' })} ${partNum}`}
                    getInactivePartButtonLabel={(partNum, answered, total) => `${t('part', { defaultValue: 'Part' })} ${partNum} ${answered} of ${total}`}
                    getQuestionAriaLabel={(questionNumber) => `${t('question', { defaultValue: 'Question' })} ${questionNumber}`}
                    previousAriaLabel={t('previous', { ns: 'common', defaultValue: 'Previous' })}
                    nextAriaLabel={t('next', { ns: 'common', defaultValue: 'Next' })}
                    navigationAriaLabel={t('questions', { defaultValue: 'Questions' })}
                    showSubmitButton={!isReviewMode}
                    submitDisabled={isSubmitting || isReviewMode || !canSubmit}
                    submitAriaLabel={t('submitTest', { defaultValue: 'Submit test' })}
                    onSubmit={handleSubmit}
                    confirmTitle={t('confirmSubmitTitle', { ns: 'test', defaultValue: 'Submit your answers?' })}
                    confirmDescription={t('confirmSubmitDescription', {
                        ns: 'test',
                        defaultValue: 'Are you sure you want to submit? You will not be able to change your answers after submission.'
                    })}
                    confirmCancelLabel={t('cancel', { ns: 'common', defaultValue: 'Cancel' })}
                    confirmSubmitLabel={t('submit', { ns: 'common', defaultValue: 'Submit' })}
                />
            )}

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
