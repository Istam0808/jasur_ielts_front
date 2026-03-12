"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiChevronLeft, FiChevronRight, FiInfo, FiList, FiHelpCircle, FiClock, FiFileText, FiHeadphones, FiXCircle, FiArrowRight, FiCheckCircle, FiVolume2 } from 'react-icons/fi';
import MockExamQuestionNav from '@/components/mock/MockExamQuestionNav';

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
                    key={`part-tab-${index}`}
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

    const getActivePartLabel = (partNum) => `${t('part')} ${partNum}`;

    const getInactivePartButtonLabel = (partNum, answered, total) =>
        `${t('part')} ${partNum} ${answered}/${total}`;

    const getQuestionAriaLabel = (questionNumber) =>
        `${t('part', { ns: 'listening' })} question ${questionNumber}`;

    const previousAriaLabel = t('previous', { ns: 'common' });
    const nextAriaLabel = t('next', { ns: 'common' });

    return (
        <div className="mock-exam-bottom-nav mock-exam-bottom-nav--ielts">
            <div className="mock-exam-nav-top-line" aria-hidden />
            <MockExamQuestionNav
                parts={parts}
                currentPartIndex={currentPartIndex}
                onSelectPart={onSelectPart}
                activePartQuestionNumbers={activePartQuestionNumbers}
                currentQuestionNumber={currentQuestionNumber}
                onSelectQuestion={onSelectQuestion}
                onPrevNextQuestion={onPrevNextQuestion}
                partTotals={partTotals}
                partAnsweredCounts={partAnsweredCounts}
                getActivePartLabel={getActivePartLabel}
                getInactivePartButtonLabel={getInactivePartButtonLabel}
                getQuestionAriaLabel={getQuestionAriaLabel}
                previousAriaLabel={previousAriaLabel}
                nextAriaLabel={nextAriaLabel}
            />
        </div>
    );
};