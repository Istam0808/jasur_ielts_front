"use client";

import { useTranslation } from 'react-i18next';
import { FaChevronLeft, FaChevronRight, FaCheckCircle } from 'react-icons/fa';

export const LearnModeFooter = ({ topicId, total, index, onPrev, onNext, isPracticeSlide, progress, showFinish, onFinish }) => {
    const { t } = useTranslation(['grammar']);

    return (
        <footer className="lm-footer">
            {isPracticeSlide && (
                <div className="lm-progress" aria-live="polite">
                    <div className="lm-progress-text">
                        <span className="lm-progress-label">{t('completed', { ns: 'grammar', defaultValue: 'Completed' })}</span>
                        <strong>{Math.max(0, Math.min(100, progress?.completionPercent || 0))}%</strong>
                        <span className="lm-progress-sep">•</span>
                        <span className="lm-progress-label">{t('correct', { ns: 'grammar', defaultValue: 'Correct' })}</span>
                        <strong>{Math.max(0, Math.min(100, progress?.correctPercent || 0))}%</strong>
                    </div>
                    <div className="lm-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, progress?.completionPercent || 0))}>
                        <div className="lm-progress-fill" style={{ width: `${Math.max(0, Math.min(100, progress?.completionPercent || 0))}%` }} />
                    </div>
                </div>
            )}
            <div className="lm-footer-actions">
                {isPracticeSlide
                    ? (
                        // On the last step (practice), hide Prev/Next to avoid duplication with in-task controls.
                        // Only show Finish when it's available.
                        showFinish ? (
                            <button className="lm-primary" onClick={onFinish}>
                                <FaCheckCircle /> {t('finishPractice', { ns: 'grammar', defaultValue: 'Finish practice' })}
                            </button>
                        ) : null
                    )
                    : (
                        <>
                            <button className="lm-nav prev" onClick={onPrev} disabled={index === 0}>
                                <FaChevronLeft /> {t('prev', { ns: 'grammar', defaultValue: 'Previous' })}
                            </button>
                            <button className="lm-nav next" onClick={onNext} disabled={index === total - 1}>
                                {t('next', { ns: 'grammar', defaultValue: 'Next' })} <FaChevronRight />
                            </button>
                        </>
                    )}
            </div>
        </footer>
    );
};


