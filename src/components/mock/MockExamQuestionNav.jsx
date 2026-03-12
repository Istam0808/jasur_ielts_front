"use client";

import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const MockExamQuestionNav = ({
    parts,
    currentPartIndex,
    onSelectPart,
    activePartQuestionNumbers,
    currentQuestionNumber,
    onSelectQuestion,
    onPrevNextQuestion,
    partTotals,
    partAnsweredCounts,
    getActivePartLabel,
    getInactivePartButtonLabel,
    getQuestionAriaLabel,
    previousAriaLabel,
    nextAriaLabel,
}) => {
    return (
        <div className="mock-exam-nav-inner">
            <div className="mock-exam-part-slots">
                {parts.map((part, index) => {
                    const isActive = index === currentPartIndex;
                    const total = partTotals[index] ?? 0;
                    const answered = partAnsweredCounts[index] ?? 0;
                    const partNum = part.part ?? index + 1;

                    return (
                        <div
                            key={`mock-part-${index}`}
                            className={`mock-exam-part-slot ${isActive ? 'mock-exam-part-slot--active' : ''}`}
                        >
                            {isActive ? (
                                <div className="mock-exam-part-questions-row">
                                    <span className="mock-exam-part-label mock-exam-part-label--active">
                                        {getActivePartLabel
                                            ? getActivePartLabel(partNum, part, index)
                                            : `Part ${partNum}`}
                                    </span>
                                    <div className="mock-exam-question-numbers" aria-label="Question navigation">
                                        {activePartQuestionNumbers.map((questionNumber) => {
                                            const isQuestionActive = currentQuestionNumber === questionNumber;
                                            return (
                                                <button
                                                    key={questionNumber}
                                                    type="button"
                                                    className={`mock-exam-question-btn ${isQuestionActive ? 'active' : ''}`}
                                                    onClick={() => onSelectQuestion(questionNumber)}
                                                    aria-current={isQuestionActive ? 'true' : undefined}
                                                    aria-label={
                                                        getQuestionAriaLabel
                                                            ? getQuestionAriaLabel(questionNumber)
                                                            : `Question ${questionNumber}`
                                                    }
                                                >
                                                    {questionNumber}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="mock-exam-part-slot-btn"
                                    onClick={() => onSelectPart(index)}
                                >
                                    {getInactivePartButtonLabel
                                        ? getInactivePartButtonLabel(partNum, answered, total, part, index)
                                        : `Part ${partNum} ${answered}/${total}`}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mock-exam-nav-arrows">
                <button
                    type="button"
                    className="mock-exam-arrow-btn"
                    onClick={() => onPrevNextQuestion(-1)}
                    aria-label={previousAriaLabel || 'Previous question'}
                >
                    <FiChevronLeft aria-hidden />
                </button>
                <button
                    type="button"
                    className="mock-exam-arrow-btn"
                    onClick={() => onPrevNextQuestion(1)}
                    aria-label={nextAriaLabel || 'Next question'}
                >
                    <FiChevronRight aria-hidden />
                </button>
            </div>
        </div>
    );
};

export default MockExamQuestionNav;

