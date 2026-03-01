"use client";

import { useTranslation } from 'react-i18next';
import './testProgress.scss';

const TestProgress = ({ answeredCount, totalQuestions }) => {
    const { t } = useTranslation('listening');
    const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

    return (
        <div className="test-progress-container">
            <div className="progress-info">
                <span className="progress-label">{t('progressTitle')}</span>
                <span className="progress-count">
                    {t('progressCount', { answered: answeredCount, total: totalQuestions })}
                </span>
            </div>
            <div className="progress-bar-background">
                <div 
                    className="progress-bar-foreground" 
                    style={{ width: `${progressPercentage}%` }}
                    role="progressbar"
                    aria-valuenow={progressPercentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                ></div>
            </div>
        </div>
    );
};

export default TestProgress; 