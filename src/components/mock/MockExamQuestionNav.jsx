"use client";

import React, { useRef, useEffect } from 'react';

const MockExamQuestionNav = ({
    parts,
    currentPartIndex,
    onSelectPart,
    activePartQuestionNumbers,
    attemptedQuestionNumbers = [],
    currentQuestionNumber,
    onSelectQuestion,
    partTotals,
    partAnsweredCounts,
    getActivePartLabel,
    getInactivePartButtonLabel,
    getQuestionAriaLabel,
}) => {
    const attemptedSet = new Set(attemptedQuestionNumbers);
    const navRef = useRef(null);

    useEffect(() => {
        if (!navRef.current || currentQuestionNumber == null) return;
        const activeBtn = navRef.current.querySelector('.mock-exam-question-btn--active');
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }, [currentQuestionNumber]);

    return (
        <div className="mock-exam-nav-inner" ref={navRef}>
            <div className="mock-exam-part-slots">
                {parts.map((part, index) => {
                    const isActive = index === currentPartIndex;
                    const total = partTotals[index] ?? 0;
                    const answered = partAnsweredCounts[index] ?? 0;
                    const isPartComplete = Number(total) > 0 && answered >= total;
                    const partNum = part.part ?? index + 1;
                    const attemptedText = `${answered} of ${total}`;
                    const activePartAriaLabel = getActivePartLabel
                        ? getActivePartLabel(partNum, part, index)
                        : `Part ${partNum}`;
                    const inactivePartAriaLabel = getInactivePartButtonLabel
                        ? getInactivePartButtonLabel(partNum, answered, total, part, index)
                        : `Part ${partNum} ${attemptedText}`;

                    return (
                        <div
                            key={`mock-part-${index}`}
                            role="tablist"
                            className={`mock-exam-part-slot questionWrapper multiple ${isActive ? 'mock-exam-part-slot--active selected' : 'mock-exam-part-slot--inactive'} ${isPartComplete ? 'mock-exam-part-slot--complete attempted' : ''}`.trim()}
                        >
                            {isActive ? (
                                <div className="mock-exam-part-questions-row">
                                    <button
                                        type="button"
                                        role="tab"
                                        tabIndex={-1}
                                        aria-selected="true"
                                        aria-label={activePartAriaLabel}
                                        className="mock-exam-part-button mock-exam-part-button--active questionNo"
                                    >
                                        <span>
                                            {isPartComplete && (
                                                <i className="fa fa-check" aria-hidden="true" />
                                            )}
                                            <span aria-hidden="true" className="section-prefix">Part </span>
                                            <span className="sectionNr" aria-hidden="true">{partNum}</span>
                                        </span>
                                        {isPartComplete && (
                                            <>
                                                <span className="mock-exam-part-complete-check" aria-hidden="true">✓</span>
                                                <span className="mock-exam-sr-only">Part completed</span>
                                            </>
                                        )}
                                    </button>
                                    <div className="mock-exam-question-numbers mock-exam-subquestion-wrapper" aria-label="Question navigation">
                                        {activePartQuestionNumbers.map((questionNumber) => {
                                            const isQuestionActive = currentQuestionNumber === questionNumber;
                                            const isQuestionAttempted = attemptedSet.has(questionNumber);
                                            const questionStateClass = [
                                                'mock-exam-question-btn--default',
                                                isQuestionAttempted ? 'mock-exam-question-btn--attempted' : '',
                                                isQuestionActive ? 'mock-exam-question-btn--active' : ''
                                            ].filter(Boolean).join(' ');
                                            const questionLegacyStateClass = [
                                                isQuestionAttempted ? 'attempted' : '',
                                                isQuestionActive ? 'active' : ''
                                            ].filter(Boolean).join(' ');
                                            const questionStatusText = isQuestionAttempted
                                                ? (isQuestionActive ? 'Attempted Active' : 'Attempted')
                                                : (isQuestionActive ? 'Not attempted Active' : 'Not attempted');
                                            return (
                                                <button
                                                    key={questionNumber}
                                                    type="button"
                                                    className={`mock-exam-question-btn subQuestion scorable-item ${questionStateClass} ${questionLegacyStateClass}`.trim()}
                                                    onClick={() => onSelectQuestion(questionNumber)}
                                                    aria-current={isQuestionActive ? 'true' : undefined}
                                                    aria-label={
                                                        getQuestionAriaLabel
                                                            ? getQuestionAriaLabel(questionNumber)
                                                            : `Question ${questionNumber}`
                                                    }
                                                >
                                                    <span className="mock-exam-sr-only">Question {questionNumber}</span>
                                                    <span aria-hidden="true">{questionNumber}</span>
                                                    <span className="mock-exam-sr-only">{questionStatusText}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    role="tab"
                                    tabIndex={0}
                                    aria-selected="false"
                                    className="mock-exam-part-slot-btn mock-exam-part-button questionNo"
                                    aria-label={inactivePartAriaLabel}
                                    onClick={() => onSelectPart(index)}
                                >
                                    <span>
                                        {isPartComplete && (
                                            <i className="fa fa-check" aria-hidden="true" />
                                        )}
                                        <span aria-hidden="true" className="section-prefix">Part </span>
                                        <span className="sectionNr" aria-hidden="true">{partNum}</span>
                                        <span className="attemptedCount" aria-hidden="true">{attemptedText}</span>
                                        <span className="mock-exam-sr-only">Part {partNum}. {attemptedText} questions attempted.</span>
                                    </span>
                                    {isPartComplete && <span className="mock-exam-part-complete-check" aria-hidden="true">✓</span>}
                                    {isPartComplete && (
                                        <span className="mock-exam-sr-only">Part completed</span>
                                    )}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MockExamQuestionNav;

