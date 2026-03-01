import { BsTrophy, BsBook, BsArrowCounterclockwise, BsClock, BsCheckCircle, BsX, BsEye, BsSpeedometer2 } from 'react-icons/bs';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useScrollLock from '@/hooks/useScrollLock';
import styles from './modalResults.module.scss';

const ResultsModal = ({ results, onClose, onReview, onRetry, testType = 'reading', readingData, userAnswers, difficulty, isFullScreen = false, filteredQuestions = null, nextHref = null }) => {
    const { t, i18n } = useTranslation('test');
    const router = useRouter();
    // Helper to safely extract band score (handles both flat and nested structure)
    const getBandValue = (value) => {
        if (typeof value === 'number') return value; // Flat structure
        if (value && typeof value === 'object' && value.Band) return value.Band; // Nested structure
        return 0; // Fallback
    };

    // Helper to get overall band score with fallbacks for different field names
    const getOverallBand = (results) => {
        // Try overallBand first
        const overallBand = getBandValue(results.overallBand);
        if (overallBand > 0) return overallBand;

        // Fallback to 'overall' field
        const overall = getBandValue(results.overall);
        if (overall > 0) return overall;

        // Fallback to 'overall_rounded' field
        const overallRounded = getBandValue(results.overall_rounded);
        if (overallRounded > 0) return overallRounded;

        return 0; // Default fallback
    };

    // Lock scroll when modal is open
    useScrollLock(true);

    // Temporary debug: log results seen by the modal
    useEffect(() => {
        // Debug logs removed
    }, [difficulty, results]);

    // IELTS Band Score conversion for advanced reading tests (40 questions)
    const getIELTSBandScore = (correctAnswers) => {
        const bandScoreMap = {
            40: 9, 39: 9,
            38: 8.5, 37: 8.5,
            36: 8, 35: 8,
            34: 7.5, 33: 7.5,
            32: 7, 31: 7, 30: 7,
            29: 6.5, 28: 6.5, 27: 6.5,
            26: 6, 25: 6, 24: 6, 23: 6,
            22: 5.5, 21: 5.5, 20: 5.5, 19: 5.5,
            18: 5, 17: 5, 16: 5, 15: 5,
            14: 4.5, 13: 4.5,
            12: 4, 11: 4, 10: 4,
            9: 3.5, 8: 3.5,
            7: 3, 6: 3,
            5: 2.5, 4: 2.5
        };
        return bandScoreMap[correctAnswers] || 2.5;
    };

    // Check if this is an advanced reading test that should show band score
    const isAdvancedReading = testType === 'reading' &&
        ['b2', 'c1', 'c2'].includes(difficulty?.toLowerCase()) &&
        results.totalQuestions === 40;

    // Check if this is a writing test with band scores (handles both flat and nested structure)
    const isWritingTest = testType === 'writing' &&
        (results.overallBand !== undefined || (results.overallBand && typeof results.overallBand === 'object' && results.overallBand.Band !== undefined));


    const getScoreColor = (percentage) => {
        if (percentage >= 80) return 'excellent';
        if (percentage >= 60) return 'good';
        if (percentage >= 40) return 'fair';
        return 'poor';
    };

    // Get score color for IELTS band scores (for writing tests)
    const getBandScoreColor = (band) => {
        if (band >= 7.5) return 'excellent';
        if (band >= 6.5) return 'good';
        if (band >= 5.5) return 'fair';
        return 'poor';
    };

    const getScoreMessage = (percentage) => {
        if (percentage >= 80) return t('excellentScore') || 'Excellent!';
        if (percentage >= 60) return t('goodScore') || 'Good job!';
        if (percentage >= 40) return t('fairScore') || 'Fair attempt';
        return t('needsImprovement') || 'Needs improvement';
    };

    const getLevelBadgeText = (scoreColor) => {
        switch (scoreColor) {
            case 'excellent':
                return t('levelBadge.excellent') || 'Excellent';
            case 'good':
                return t('levelBadge.good') || 'Good';
            case 'fair':
                return t('levelBadge.fair') || 'Fair';
            case 'poor':
                return t('levelBadge.poor') || 'Poor';
            default:
                return t('levelBadge.good') || 'Good';
        }
    };

    const getTestTypeTitle = () => {
        switch (testType) {
            case 'reading':
                return t('readingTestCompleted') || 'Reading Test Completed';
            case 'listening':
                return t('listeningTestCompleted') || 'Listening Test Completed';
            case 'writing':
                return t('writingTestCompleted') || 'Writing Test Completed';
            default:
                return t('testCompleted');
        }
    };

    const overallBand = getBandValue(results.overallBand);
    const scoreColor = isWritingTest
        ? getBandScoreColor(overallBand)
        : getScoreColor(results.percentageCorrect);
    const scoreMessage = isWritingTest
        ? (overallBand >= 7.5 ? t('excellentScore') || 'Excellent!' :
            overallBand >= 6.5 ? t('goodScore') || 'Good job!' :
                overallBand >= 5.5 ? t('fairScore') || 'Fair attempt' :
                    t('needsImprovement') || 'Needs improvement')
        : getScoreMessage(results.percentageCorrect);

    const handleNext = () => {
        if (!nextHref) return;
        router.push(nextHref);
    };

    return (
        <div className={`${styles.modalOverlay} ${isFullScreen ? styles.fullscreenModal : ''}`}>
            <div className={styles.modalContainer}>
                {/* Header */}
                <div className={styles.modalHeader}>
                    <div className={styles.logoContainer}>
                        <Image
                            src="/android-chrome-192x192.webp"
                            alt="Company Logo"
                            width={48}
                            height={48}
                            className={styles.companyLogo}
                        />
                        <div className={styles.titleContainer}>
                            <h1 className={styles.title}>{getTestTypeTitle()}</h1>
                            <p className={styles.subtitle}>{t('practiceSessionComplete') || 'Practice session completed successfully'}</p>
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        <button className={styles.closeButton} onClick={onClose} aria-label={t('closeModal') || 'Close modal'}>
                            <BsX size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className={styles.modalContent}>
                    {/* Left Column - Score and Stats */}
                    <div className={styles.leftColumn}>
                        {/* Score Section */}
                        <div className={styles.scoreSection}>
                            <h2 className={styles.overallScoreLabel}>
                                {(isAdvancedReading || isWritingTest) ? (t('ieltsBandScore') || 'IELTS Band Score') : (t('overallScore') || 'Overall Score')}
                            </h2>
                            <div className={styles.progressContainer}>
                                <div className={`${styles.scoreCircle} ${styles[scoreColor]}`}>
                                    <span className={styles.scoreText}>
                                        {isWritingTest ? overallBand :
                                            isAdvancedReading ? getIELTSBandScore(results.correctAnswers) :
                                                `${Math.round(results.percentageCorrect)}%`}
                                        {(isAdvancedReading || isWritingTest) && <sub>/9</sub>}
                                    </span>
                                </div>
                            </div>
                            {!isWritingTest && (
                                <div className={styles.scoreFraction}>
                                    {results.correctAnswers}/{results.totalQuestions}
                                </div>
                            )}
                            <p className={styles.scoreDescription}>{scoreMessage}</p>

                            {/* Performance Level */}
                            {
                                testType !== 'reading' && (
                                    <div className={styles.performanceLevel}>
                                        <span className={styles.levelLabel}>{t('performanceLevel') || 'Performance Level'}:</span>
                                        <span className={`${styles.levelBadge} ${styles[scoreColor]}`}>
                                            {getLevelBadgeText(scoreColor)}
                                        </span>
                                    </div>
                                )
                            }
                        </div>

                        {/* Stats Section */}
                        <div className={styles.statsSection}>
                            <h3 className={styles.statsTitle}>
                                {isWritingTest ? (t('ielts_criteria') || 'IELTS Criteria Scores') : t('testStatistics')}
                            </h3>
                            <div className={styles.statsList}>
                                {/* Writing test: Show IELTS criteria scores */}
                                {isWritingTest ? (
                                    <>
                                        <div className={styles.statItem}>
                                            <div className={styles.statIcon}>
                                                <BsBook size={16} />
                                            </div>
                                            <div className={styles.statInfo}>
                                                <div className={styles.statLabel}>{t('taskResponse') || 'Task Response'}</div>
                                                <div className={styles.statValue}>{getBandValue(results.taskResponse)}/9</div>
                                            </div>
                                        </div>
                                        <div className={styles.statItem}>
                                            <div className={styles.statIcon}>
                                                <BsSpeedometer2 size={16} />
                                            </div>
                                            <div className={styles.statInfo}>
                                                <div className={styles.statLabel}>{t('coherenceCohesion') || 'Coherence & Cohesion'}</div>
                                                <div className={styles.statValue}>{getBandValue(results.coherenceCohesion)}/9</div>
                                            </div>
                                        </div>
                                        <div className={styles.statItem}>
                                            <div className={styles.statIcon}>
                                                <BsBook size={16} />
                                            </div>
                                            <div className={styles.statInfo}>
                                                <div className={styles.statLabel}>{t('lexicalResource') || 'Lexical Resource'}</div>
                                                <div className={styles.statValue}>{getBandValue(results.lexicalResource)}/9</div>
                                            </div>
                                        </div>
                                        <div className={styles.statItem}>
                                            <div className={styles.statIcon}>
                                                <BsCheckCircle size={16} />
                                            </div>
                                            <div className={styles.statInfo}>
                                                <div className={styles.statLabel}>{t('grammaticalRange') || 'Grammatical Range'}</div>
                                                <div className={styles.statValue}>{getBandValue(results.grammaticalRange)}/9</div>
                                            </div>
                                        </div>
                                        <div className={styles.statItem}>
                                            <div className={styles.statIcon}>
                                                <BsClock size={16} />
                                            </div>
                                            <div className={styles.statInfo}>
                                                <div className={styles.statLabel}>{t('wordCount') || 'Word Count'}</div>
                                                <div className={styles.statValue}>{results.wordCount}</div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Only show correct answers for non-reading tests since it's already shown in the score section */}
                                        {testType !== 'reading' && (
                                            <div className={styles.statItem}>
                                                <div className={styles.statIcon}>
                                                    <BsCheckCircle size={16} />
                                                </div>
                                                <div className={styles.statInfo}>
                                                    <div className={styles.statLabel}>{t('correctAnswers')}</div>
                                                    <div className={styles.statValue}>
                                                        {results.correctAnswers}/{results.totalQuestions}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className={styles.statItem}>
                                            <div className={styles.statIcon}>
                                                <BsClock size={16} />
                                            </div>
                                            <div className={styles.statInfo}>
                                                <div className={styles.statLabel}>{t('timeTaken')}</div>
                                                <div className={styles.statValue}>{results.timeTaken}</div>
                                            </div>
                                        </div>
                                        {testType !== 'reading' && (
                                            <div className={styles.statItem}>
                                                <div className={styles.statIcon}>
                                                    <BsTrophy size={16} />
                                                </div>
                                                <div className={styles.statInfo}>
                                                    <div className={styles.statLabel}>
                                                        {isAdvancedReading ? (t('ieltsBandScore') || 'IELTS Band Score') : t('accuracy')}
                                                    </div>
                                                    <div className={styles.statValue}>
                                                        {isAdvancedReading ? getIELTSBandScore(results.correctAnswers) : `${Math.round(results.percentageCorrect)}%`}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Actions */}
                    <div className={styles.rightColumn}>
                        <div className={styles.actionsSection}>
                            <h3 className={styles.sectionTitle}>{t('whatWouldYouLikeToDo') || 'What would you like to do?'}</h3>
                            <div className={styles.actionsList}>
                                <button className={styles.actionButton} onClick={onReview}>
                                    <div className={styles.actionIcon}>
                                        <BsBook size={20} />
                                    </div>
                                    <div className={styles.actionContent}>
                                        <h4 className={styles.actionTitle}>{t('questionReview')}</h4>
                                        <p className={styles.actionDescription}>
                                            {t('reviewDescription') || 'Go through your answers and see what you got right or wrong'}
                                        </p>
                                    </div>
                                </button>
                                <button className={styles.actionButton} onClick={onRetry}>
                                    <div className={styles.actionIcon}>
                                        <BsArrowCounterclockwise size={20} />
                                    </div>
                                    <div className={styles.actionContent}>
                                        <h4 className={styles.actionTitle}>{t('tryAgain')}</h4>
                                        <p className={styles.actionDescription}>
                                            {t('retryDescription') || 'Take the test again to improve your score'}
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.modalFooter}>
                    <div className={styles.footerActions}>
                        {nextHref && (
                            <button className={styles.continueButton} onClick={handleNext}>
                                {t('continue', 'Continue')}
                            </button>
                        )}
                        <button className={styles.returnButton} onClick={onClose}>
                            {t('backToPractice')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultsModal;