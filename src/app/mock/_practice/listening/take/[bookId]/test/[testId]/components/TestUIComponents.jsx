"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiChevronLeft, FiChevronRight, FiInfo, FiList, FiHelpCircle, FiClock, FiFileText, FiHeadphones, FiXCircle, FiArrowRight, FiCheckCircle, FiVolume2 } from 'react-icons/fi';

export const TestHeader = ({ testTitle, testName, backTo }) => {
    return (
        <div className="page-header">
            <h1 className="page-title">{testTitle || testName}</h1>
        </div>
    );
};

export const TestOverview = ({ partCount, totalQuestions }) => {
    const { t } = useTranslation('listening');
    return (
        <div className="test-overview-card">
            <div className="overview-header">
                <FiInfo className="overview-icon" />
                <h2>{t('testOverview')}</h2>
            </div>
            <p>{t('testPageDescription', { partCount })}</p>
            <div className="overview-stats">
                <div className="stat-item">
                    <FiList />
                    <span>{partCount} {t('parts')}</span>
                </div>
                <div className="stat-item">
                    <FiHelpCircle />
                    <span>{totalQuestions} {t('questions')}</span>
                </div>
                <div className="stat-item">
                    <FiClock />
                    <span>~40 {t('minutes')}</span>
                </div>
            </div>
        </div>
    );
};

export const PartNavigation = ({ parts, currentPartIndex, onSelectPart }) => {
    const { t } = useTranslation('listening');
    return (
        <div className="part-navigation-tabs">
            {parts.map((part, index) => (
                <button
                    key={part.part}
                    className={`part-tab ${index === currentPartIndex ? 'active' : ''}`}
                    onClick={() => onSelectPart(index)}
                >
                    <FiFileText className="part-tab-icon" />
                    <span className="part-tab-text">{t('part')} {part.part}</span>
                </button>
            ))}
        </div>
    );
};

export const PartHeader = ({ partNumber, audioUrl }) => {
    const { t } = useTranslation('listening');
    return (
        <div className="part-header">
            <h2>{t('part')} {partNumber}</h2>
            {audioUrl ? (
                <span className="badge badge-audio-ready">
                    <FiHeadphones /> {t('audioReady')}
                </span>
            ) : (
                <span className="badge badge-audio-missing">
                    <FiXCircle /> {t('audioMissing')}
                </span>
            )}
        </div>
    );
};

export const TestNavigation = ({ currentPartIndex, totalParts, onNavigate, onSubmit, isSubmittable }) => {
    const { t } = useTranslation('common');
    return (
        <div className="test-navigation-controls">
            <button
                onClick={() => onNavigate(currentPartIndex - 1)}
                disabled={currentPartIndex === 0}
                className="nav-button prev-button"
            >
                <FiChevronLeft /> {t('previous')}
            </button>
            {currentPartIndex < totalParts - 1 ? (
                <button
                    onClick={() => onNavigate(currentPartIndex + 1)}
                    className="nav-button btn btn-primary btn-sm btn-inline"
                >
                    {t('next')} <FiArrowRight />
                </button>
            ) : (
                <button 
                    className="nav-button btn btn-success btn-sm btn-inline submit-button" 
                    onClick={onSubmit}
                    disabled={!isSubmittable}
                >
                    <FiCheckCircle /> {t('submitTest')}
                </button>
            )}
        </div>
    );
}; 

export const MockExamTopBar = ({
    candidateId,
    timeText,
    onSubmit,
    isSubmitDisabled,
    onLogout,
}) => {
    return (
        <div className="mock-exam-top-bar">
            <div className="mock-exam-brand">JASUR IELTS 9.0</div>
            <div className="mock-exam-taker">Test taker ID: {candidateId}</div>
            <div className="mock-exam-time">{timeText}</div>
            <div className="mock-exam-actions">
                <button type="button" className="mock-icon-btn" aria-label="Audio settings">
                    <FiVolume2 />
                </button>
                {onLogout && (
                    <button
                        type="button"
                        className="mock-logout-btn"
                        onClick={onLogout}
                    >
                        Logout
                    </button>
                )}
                <button
                    type="button"
                    className="mock-submit-btn"
                    onClick={onSubmit}
                    disabled={isSubmitDisabled}
                >
                    Submit
                </button>
            </div>
        </div>
    );
};

export const MockExamBottomNav = ({
    parts,
    currentPartIndex,
    onSelectPart,
    activePartQuestionNumbers,
    currentQuestionNumber,
    onSelectQuestion,
    onPrevNextQuestion,
    partTotals,
    partAnsweredCounts
}) => {
    const { t } = useTranslation('listening');

    return (
        <div className="mock-exam-bottom-nav mock-exam-bottom-nav--ielts">
            <div className="mock-exam-nav-top-line" aria-hidden />
            <div className="mock-exam-nav-inner">
                {/* Fixed slots: Part 1, Part 2, Part 3, Part 4 — always in order; active shows questions */}
                <div className="mock-exam-part-slots">
                    {parts.map((part, index) => {
                        const isActive = index === currentPartIndex;
                        const total = partTotals[index] ?? 0;
                        const answered = partAnsweredCounts[index] ?? 0;
                        const partNum = part.part ?? index + 1;

                        return (
                            <div
                                key={part.part ?? index}
                                className={`mock-exam-part-slot ${isActive ? 'mock-exam-part-slot--active' : ''}`}
                            >
                                {isActive ? (
                                    <div className="mock-exam-part-questions-row">
                                        <span className="mock-exam-part-label mock-exam-part-label--active">
                                            {t('part')} {partNum}
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
                                                        aria-label={`${t('part', { ns: 'listening' })} question ${questionNumber}`}
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
                                        {t('part')} {partNum} {answered}/{total}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Arrows: vertical stack, Previous on top, Next below */}
                <div className="mock-exam-nav-arrows">
                    <button
                        type="button"
                        className="mock-exam-arrow-btn"
                        onClick={() => onPrevNextQuestion(-1)}
                        aria-label={t('previous', { ns: 'common' })}
                    >
                        <FiChevronLeft aria-hidden />
                    </button>
                    <button
                        type="button"
                        className="mock-exam-arrow-btn"
                        onClick={() => onPrevNextQuestion(1)}
                        aria-label={t('next', { ns: 'common' })}
                    >
                        <FiChevronRight aria-hidden />
                    </button>
                </div>
            </div>
        </div>
    );
};