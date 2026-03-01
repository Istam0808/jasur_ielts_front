'use client';
import React, { memo, useCallback, useMemo } from 'react';
import { FiFileText, FiClock } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import CircularProgressBar from '@/components/common/CircularProgressBar';
import '../WritingResultsPanel.scss';

// Constants
const DEFAULT_MAX_BAND = 9;
const BEGINNER_LEVELS = ['a1', 'a2', 'b1'];
const CIRCULAR_PROGRESS_SIZE = 120;

// Criteria configuration
const CRITERIA_CONFIG = [
    {
        key: 'taskResponse',
        translationKey: 'writing:taskResponse',
        feedbackKey: 'taskResponseFeedback',
        defaultLabel: 'Task Response'
    },
    {
        key: 'coherenceCohesion',
        translationKey: 'writing:coherenceCohesion',
        feedbackKey: 'coherenceCohesionFeedback',
        defaultLabel: 'Coherence & Cohesion'
    },
    {
        key: 'lexicalResource',
        translationKey: 'writing:lexicalResource',
        feedbackKey: 'lexicalResourceFeedback',
        defaultLabel: 'Lexical Resource'
    },
    {
        key: 'grammaticalRange',
        translationKey: 'writing:grammaticalRange',
        feedbackKey: 'grammaticalRangeFeedback',
        defaultLabel: 'Grammar & Accuracy'
    }
];

// Helper function to safely calculate percentage
const calculatePercentage = (value, max) => {
    if (!max || max <= 0 || !value || value < 0) return 0;
    return Math.round((value / max) * 100);
};

// Criteria Item Component
const CriteriaItem = memo(({
    criterion,
    score,
    feedback,
    maxBand,
    isBeginner,
    t
}) => {
    const percentage = useMemo(() =>
        calculatePercentage(score, maxBand),
        [score, maxBand]
    );

    const displayScore = useMemo(() => {
        if (isBeginner) {
            return `${percentage}%`;
        }
        return `${score}/${maxBand}`;
    }, [isBeginner, score, maxBand, percentage]);

    const label = useMemo(() =>
        t(criterion.translationKey, criterion.defaultLabel),
        [t, criterion.translationKey, criterion.defaultLabel]
    );

    if (score === undefined || score === null) {
        return null;
    }

    return (
        <div className="criteria-item" role="listitem">
            <div className="criteria-header">
                <span className="criteria-name" aria-label={label}>
                    {label}
                </span>
                <div className="criteria-score-wrapper">
                    <span className="criteria-score" aria-label={`${label} score: ${displayScore}`}>
                        {displayScore}
                    </span>
                </div>
            </div>
            <div
                className="criteria-bar"
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${label} progress: ${percentage}%`}
            >
                <div
                    className="criteria-fill"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {feedback && (
                <div className="criteria-feedback" aria-live="polite">
                    {Array.isArray(feedback)
                        ? feedback.map((item, idx) => (
                            <p key={idx}>{item}</p>
                        ))
                        : <p>{feedback}</p>
                    }
                </div>
            )}
        </div>
    );
});

CriteriaItem.displayName = 'CriteriaItem';

// Stop words to exclude from vocabulary repetition analysis
const STOP_WORDS = new Set([
    // Articles
    'a', 'an', 'the',
    // Prepositions
    'in', 'on', 'at', 'for', 'to', 'of', 'with', 'by', 'from', 'about', 'into', 'onto', 'upon', 'over', 'under', 'below', 'above', 'between', 'among', 'through', 'during', 'before', 'after', 'since', 'until', 'while', 'within', 'without', 'against', 'across', 'along', 'around', 'behind', 'beside', 'beyond', 'despite', 'except', 'inside', 'outside', 'throughout', 'toward', 'towards', 'underneath', 'unlike', 'via',
    // Pronouns
    'it', 'they', 'this', 'that', 'these', 'those', 'he', 'she', 'we', 'you', 'i', 'me', 'him', 'her', 'us', 'them', 'its', 'their', 'his', 'hers', 'ours', 'yours', 'theirs', 'myself', 'yourself', 'himself', 'herself', 'ourselves', 'yourselves', 'themselves',
    // Conjunctions
    'and', 'or', 'but', 'so', 'yet', 'nor', 'because', 'if', 'when', 'where', 'why', 'how', 'although', 'though', 'as', 'than', 'that', 'unless', 'while',
    // Auxiliary verbs
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must', 'ought',
    // Common adverbs/determiners
    'very', 'too', 'also', 'just', 'only', 'even', 'much', 'many', 'more', 'most', 'some', 'any', 'all', 'each', 'every', 'no', 'not', 'now', 'then', 'here', 'there', 'where', 'when', 'why', 'how', 'quite', 'rather', 'such', 'same', 'both', 'either', 'neither', 'none'
]);

// Helper function to calculate word repetitions
const calculateWordRepetitions = (text) => {
    if (!text || typeof text !== 'string') {
        return [];
    }

    // Convert to lowercase and split by whitespace and punctuation
    const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
        .split(/\s+/) // Split by whitespace
        .filter(word => word.length > 0) // Filter out empty strings
        .filter(word => !STOP_WORDS.has(word)); // Filter out stop words

    // Count word occurrences
    const wordCountMap = {};
    words.forEach(word => {
        wordCountMap[word] = (wordCountMap[word] || 0) + 1;
    });

    // Filter words that appear more than 2 times and convert to array
    const repetitions = Object.entries(wordCountMap)
        .filter(([word, count]) => count > 2)
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => {
            // Sort by count (descending), then alphabetically
            if (b.count !== a.count) {
                return b.count - a.count;
            }
            return a.word.localeCompare(b.word);
        });

    return repetitions;
};

// Main Component
const WritingResultsPanel = memo(({
    aiFeedback,
    difficulty,
    userResponse
}) => {
    const { t } = useTranslation(['writing', 'common']);

    // Early return if no feedback
    if (!aiFeedback || typeof aiFeedback !== 'object') {
        return null;
    }

    // Check if this is a beginner level (A1/A2/B1)
    const isBeginnerWriting = useMemo(() => {
        const difficultyStr = String(difficulty || '').toLowerCase();
        return BEGINNER_LEVELS.includes(difficultyStr);
    }, [difficulty]);

    // Consolidated score calculations
    const scores = useMemo(() => {
        const maxBand = aiFeedback?.maxBand || DEFAULT_MAX_BAND;

        return {
            overall: aiFeedback?.overallBand || aiFeedback?.score || 0,
            taskResponse: aiFeedback?.taskResponse ?? 0,
            coherenceCohesion: aiFeedback?.coherenceCohesion ?? 0,
            lexicalResource: aiFeedback?.lexicalResource ?? 0,
            grammaticalRange: aiFeedback?.grammaticalRange ?? 0,
            maxBand
        };
    }, [aiFeedback]);

    // Calculate beginner overall percentage
    const beginnerOverallPercent = useMemo(() => {
        if (!isBeginnerWriting) return null;
        return calculatePercentage(scores.overall, scores.maxBand);
    }, [isBeginnerWriting, scores.overall, scores.maxBand]);

    // Get score description
    const scoreDescription = useMemo(() => {
        if (isBeginnerWriting) {
            const ratio = scores.maxBand > 0 ? scores.overall / scores.maxBand : 0;
            if (ratio >= 0.9) return t('writing:cefrExcellent', 'Excellent progress at this level');
            if (ratio >= 0.75) return t('writing:cefrStrong', 'Strong progress — great job');
            if (ratio >= 0.5) return t('writing:cefrDeveloping', 'Developing — keep going');
            return t('writing:cefrFoundational', 'Good start — keep practicing');
        }

        if (scores.overall >= 7.0) {
            return t('writing:band7Plus', 'Good level - Generally good command of the language');
        }
        if (scores.overall >= 6.0) {
            return t('writing:band6Plus', 'Competent user - Generally effective command of the language');
        }
        if (scores.overall >= 5.0) {
            return t('writing:band5Plus', 'Modest user - Partial command of the language');
        }
        return t('writing:bandBelow5', 'Limited user - Basic competence limited to familiar situations');
    }, [isBeginnerWriting, scores.overall, scores.maxBand, t]);

    // Format time
    const formatTime = useCallback((milliseconds) => {
        if (!milliseconds || milliseconds <= 0) {
            return t('common:time_na', 'N/A');
        }
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const minLabel = t('common:minutes_short', 'm');
        const secLabel = t('common:seconds_short', 's');
        return `${minutes}${minLabel} ${seconds}${secLabel}`;
    }, [t]);

    // Get criteria items to render
    const criteriaItems = useMemo(() => {
        return CRITERIA_CONFIG.map((criterion) => {
            const score = scores[criterion.key];
            const feedback = aiFeedback?.[criterion.feedbackKey];

            // Only include if score is defined
            if (score === undefined || score === null) {
                return null;
            }

            return (
                <CriteriaItem
                    key={criterion.key}
                    criterion={criterion}
                    score={score}
                    feedback={feedback}
                    maxBand={scores.maxBand}
                    isBeginner={isBeginnerWriting}
                    t={t}
                />
            );
        }).filter(Boolean); // Remove null items
    }, [scores, aiFeedback, isBeginnerWriting, t]);

    // Get overall score display value
    const overallScoreDisplay = useMemo(() => {
        return isBeginnerWriting ? beginnerOverallPercent : scores.overall;
    }, [isBeginnerWriting, beginnerOverallPercent, scores.overall]);

    // Get overall score max value
    const overallScoreMax = useMemo(() => {
        return isBeginnerWriting ? 100 : scores.maxBand;
    }, [isBeginnerWriting, scores.maxBand]);

    // Calculate word repetitions
    const vocabularyRepetitions = useMemo(() => {
        return calculateWordRepetitions(userResponse);
    }, [userResponse]);

    return (
        <section className="writing-results-panel" aria-label={t('writing:resultsPanel', 'Writing Assessment Results')}>
            {/* Overall Band Score */}
            <section className="results-score-section" aria-labelledby="overall-score-heading">
                <h3 id="overall-score-heading" className="score-label">
                    {isBeginnerWriting
                        ? t('writing:overallProgress', 'Overall Progress')
                        : t('writing:overallBand', 'Overall Band Score')}
                </h3>
                <div className="score-display" role="img" aria-label={`Overall score: ${overallScoreDisplay}${isBeginnerWriting ? '%' : ` out of ${overallScoreMax}`}`}>
                    <CircularProgressBar
                        score={overallScoreDisplay}
                        maxScore={overallScoreMax}
                        size={CIRCULAR_PROGRESS_SIZE}
                        isPercentage={isBeginnerWriting}
                    />
                </div>
                <p className="score-description" aria-live="polite">
                    {scoreDescription}
                </p>
            </section>

            {/* Criteria Breakdown */}
            <section className="results-criteria-section" aria-labelledby="criteria-heading">
                <h4 id="criteria-heading" className="criteria-title">
                    {t('writing:criteriaBreakdown', 'Assessment Criteria')}
                </h4>
                <div className="criteria-list" role="list">
                    {criteriaItems}
                </div>
            </section>

            {/* Writing Statistics */}
            <section className="results-stats-section" aria-labelledby="stats-heading">
                <h4 id="stats-heading" className="stats-title">
                    {t('writing:writingStats', 'Writing Statistics')}
                </h4>
                <div className="stats-list">
                    <div className="stats-row">
                        <div className="stat-item" role="listitem">
                            <div className="stat-icon" aria-hidden="true">
                                <FiFileText />
                            </div>
                            <div className="stat-info">
                                <div className="stat-label">
                                    {t('writing:wordCount', 'Word Count')}
                                </div>
                                <div className="stat-value" aria-label={`Word count: ${aiFeedback?.wordCount || 0} words`}>
                                    {aiFeedback?.wordCount || 0} {t('common:words', 'words')}
                                </div>
                            </div>
                        </div>
                        <div className="stat-item" role="listitem">
                            <div className="stat-icon" aria-hidden="true">
                                <FiClock />
                            </div>
                            <div className="stat-info">
                                <div className="stat-label">
                                    {t('writing:timeTaken', 'Time Taken')}
                                </div>
                                <div className="stat-value" aria-label={`Time taken: ${formatTime(aiFeedback?.timeTaken)}`}>
                                    {formatTime(aiFeedback?.timeTaken)}
                                </div>
                            </div>
                        </div>
                    </div>
                    {vocabularyRepetitions.length > 0 && (
                        <div className="vocabulary-repetition" role="listitem">
                            <h5 className="vocabulary-repetition-title">
                                {t('writing:vocabularyRepetition', 'Vocabulary Repetition:')}
                            </h5>
                            <div className="vocabulary-repetition-list" role="list">
                                {vocabularyRepetitions.map(({ word, count }, index) => (
                                    <div 
                                        key={`${word}-${index}`} 
                                        className="vocabulary-repetition-item"
                                        role="listitem"
                                        aria-label={`${word}: ${count} occurrences`}
                                    >
                                        {word}: {count}
                                    </div>
                                ))}
                            </div>
                            <p className="vocabulary-repetition-suggestion" aria-live="polite">
                                {t('writing:vocabularyRepetitionSuggestion', 'Try using synonyms for the above words')}
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </section>
    );
});

WritingResultsPanel.displayName = 'WritingResultsPanel';

export default WritingResultsPanel;
