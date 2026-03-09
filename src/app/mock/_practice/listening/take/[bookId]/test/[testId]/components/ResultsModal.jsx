import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useParams } from 'next/navigation';
import Modal from '@/components/common/Modal';
import { FiCheckCircle, FiXCircle, FiChevronsRight, FiRotateCcw } from 'react-icons/fi';
import './ResultsModal.scss';

// A new component for the score circle
const ScoreCircle = ({ score, total }) => {
    const { t } = useTranslation('listening');
    const percentage = total > 0 ? (score / total) * 100 : 0;
    const circumference = 2 * Math.PI * 45; // r = 45
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    let circleClass = 'progress-ring-circle-low';
    if (percentage >= 70) {
        circleClass = 'progress-ring-circle-high';
    } else if (percentage >= 40) {
        circleClass = 'progress-ring-circle-medium';
    }

    return (
        <div className="score-circle-container">
            <svg className="progress-ring" width="120" height="120">
                <circle
                    className="progress-ring-bg"
                    strokeWidth="10"
                    fill="transparent"
                    r="45"
                    cx="60"
                    cy="60"
                />
                <circle
                    className={`progress-ring-circle ${circleClass}`}
                    strokeWidth="10"
                    fill="transparent"
                    r="45"
                    cx="60"
                    cy="60"
                    style={{ strokeDasharray: circumference, strokeDashoffset }}
                />
            </svg>
            <div className="score-text">
                <span className="current-score">{score}</span>
                <span className="total-score">{total}</span>
            </div>
            <div className="score-label">{t('results.yourScore')}</div>
        </div>
    );
};

const ResultsModal = ({ isOpen, onClose, results, bookId, ieltsScoreGuidance, nextHref, difficultyOverride }) => {
    const { t, i18n } = useTranslation(['listening', 'common', 'test']);
    const router = useRouter();
    const params = useParams();
    const difficulty = difficultyOverride || params?.difficulty;

    if (!isOpen || !results) {
        return null;
    }

    const { score, totalQuestions, userAnswers, correctAnswersData, isTimeUp, scoredByBackend } = results;
    const hasDetailedAnswers = correctAnswersData && Object.keys(correctAnswersData).length > 0;

    const getGuidance = (currentScore) => {
        if (!ieltsScoreGuidance || !ieltsScoreGuidance.score_ranges) return '';
        const currentLang = i18n.language;
        const range = ieltsScoreGuidance.score_ranges.find(r => {
            const [min, max] = r.range.split('-').map(Number);
            return currentScore >= min && currentScore <= max;
        });
        return range ? range.guidance[currentLang] || range.guidance.en : '';
    };

    const guidance = getGuidance(score);

    const handleFinish = () => {
        if (nextHref) {
            router.push(nextHref);
            return;
        }
        router.push('/mock/listening');
    };

    const normalizeAnswer = (answer) => (answer || '').toString().toLowerCase().trim();

    const isCorrect = (userAnswer, correctAnswer) => {
        const normalizedUserAnswer = normalizeAnswer(userAnswer);
        if (correctAnswer == null) return false;

        const answerString = correctAnswer.toString();
        return answerString.split('/').some(part => normalizeAnswer(part) === normalizedUserAnswer);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} padding={false} className="results-modal-container">
            <div className="results-modal-content">
                <div className="results-summary-pane">
                    <h2 className="modal-title">{t('results.title')}</h2>
                    {isTimeUp && (
                        <div className="time-up-notice">
                            <p className="time-up-message">{t('timeUp', { ns: 'test' })}</p>
                            <p className="time-up-description">{t('timeUpMessage', { ns: 'test' })}</p>
                        </div>
                    )}
                    <ScoreCircle score={score} total={totalQuestions} />
                    {guidance && (
                        <div className="guidance-section">
                            <p>{guidance}</p>
                        </div>
                    )}
                    <div className="modal-actions">
                         <button onClick={onClose} className="btn btn-secondary">
                            <FiRotateCcw />
                            <span>{t('common:review')}</span>
                        </button>
                        <button onClick={handleFinish} className="btn btn-primary">
                            <span>{nextHref ? t('common:continue', 'Continue') : t('common:finishTest')}</span>
                            <FiChevronsRight />
                        </button>
                    </div>
                </div>

                <div className="results-details-pane">
                     <div className="results-grid">
                        {!hasDetailedAnswers && (
                            <div className="result-item">
                                <div className="question-identifier">
                                    {scoredByBackend
                                        ? t('results.checkedByServer', { defaultValue: 'Результат проверен на сервере' })
                                        : t('results.noDetailedAnswers', { defaultValue: 'Детальная проверка ответов недоступна' })}
                                </div>
                            </div>
                        )}
                        {hasDetailedAnswers && Object.keys(correctAnswersData).sort((a, b) => parseInt(a) - parseInt(b)).map(questionNumber => {
                            const userAnswer = userAnswers[questionNumber];
                            const correctAnswer = correctAnswersData[questionNumber];
                            const wasCorrect = isCorrect(userAnswer, correctAnswer);

                            return (
                                <div key={questionNumber} className="result-item">
                                    <div className="question-identifier">
                                        {t('results.question', { number: questionNumber })}
                                    </div>
                                    <div className="result-answers">
                                        {wasCorrect ? (
                                            <div className="answer-line correct">
                                                <FiCheckCircle />
                                                <span>{userAnswer}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="answer-line incorrect">
                                                    <FiXCircle />
                                                    <span>{userAnswer || t('results.noAnswer')}</span>
                                                </div>
                                                <div className="answer-line correct-solution">
                                                    <FiCheckCircle />
                                                    <span>{correctAnswer}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ResultsModal; 