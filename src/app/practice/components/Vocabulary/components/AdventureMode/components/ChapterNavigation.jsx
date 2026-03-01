import { motion } from 'framer-motion';
import { FaStar, FaChevronLeft, FaChevronRight, FaCheckCircle } from 'react-icons/fa';
import { useMobileOptimization } from '../hooks/useMobileOptimization';
import { scrollToAdventureStart } from '@/utils/common';

const ChapterNavigation = ({
    currentChapter,
    chapters,
    chapterProgressPercentage,
    currentChapterData,
    t,
    handlePreviousChapter,
    handleNextChapter,
    isGameStarted = false,
    completedWords,
    getWordKey
}) => {
    const { isMobile } = useMobileOptimization();

    const isChapterCompleted = chapterProgressPercentage >= 100;
    const progressWidth = isChapterCompleted ? 100 : Math.min(chapterProgressPercentage ?? 0, 100);

    const isFirstChapter = currentChapter === 0;
    const isLastChapter = currentChapter === chapters.length - 1;
    const canProceed = chapterProgressPercentage >= 80;

    // Shared button animation config
    const buttonMotionProps = {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
        transition: { duration: 0.3, delay: 0.2 },
    };

    return (
        <motion.div
            className={`chapter-navigation ${isChapterCompleted ? 'chapter-completed' : ''}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            role="navigation"
            aria-label={t('adventure.chapterNavigation')}
        >
            {/* Chapter Info */}
            <motion.div
                className="chapter-info"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
            >
                <h3>{t('adventure.chapter', { number: currentChapter + 1 })}</h3>
                <p>{currentChapterData?.title ?? ''}</p>

                {isChapterCompleted && (
                    <motion.div
                        className="perfect-badge"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        title={t('instructions.perfectScore')}
                    >
                        <FaStar />
                        <span>{t('instructions.perfect')}</span>
                    </motion.div>
                )}
            </motion.div>

            {/* Navigation Buttons */}
            {isGameStarted && (
                <div className="nav-buttons-wrapper">
                    <motion.button
                        className="nav-btn prev-btn"
                        onClick={() => {
                            handlePreviousChapter();
                            // Scroll to starting point after navigation
                            setTimeout(() => {
                                scrollToAdventureStart({ delay: 100 });
                            }, 50);
                        }}
                        disabled={isFirstChapter}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        aria-label={t('adventure.previousChapter')}
                        title={isFirstChapter ? t('adventure.firstChapter') : t('adventure.previousChapter')}
                        {...buttonMotionProps}
                    >
                        <FaChevronLeft />
                        <span>{isMobile ? t('adventure.previous') : t('adventure.previousChapter')}</span>
                    </motion.button>

                    <motion.button
                        className="nav-btn next-btn"
                        onClick={() => {
                            handleNextChapter();
                            // Scroll to starting point after navigation
                            setTimeout(() => {
                                scrollToAdventureStart({ delay: 100 });
                            }, 50);
                        }}
                        disabled={isLastChapter || !canProceed}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        aria-label={t('adventure.nextChapter')}
                        title={
                            isLastChapter
                                ? t('adventure.lastChapter')
                                : !canProceed
                                    ? t('adventure.needMoreProgress', { percentage: 80 })
                                    : t('adventure.nextChapter')
                        }
                        {...buttonMotionProps}
                    >
                        <span>{isMobile ? t('adventure.next') : t('adventure.nextChapter')}</span>
                        <FaChevronRight />
                    </motion.button>
                </div>
            )}

            {/* Progress Bar */}
            <div className="direct-progress-bar" style={{ width: `${progressWidth}%` }} />

            {/* Completion Status */}
            {(isChapterCompleted || chapterProgressPercentage >= 80) && (
                <motion.div
                    className="completion-status-bottom"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <div className="completion-badge-bottom">
                        <FaCheckCircle className="completion-icon" />
                        <span className="completion-text">
                            {isChapterCompleted
                                ? t('chapterComplete.complete')
                                : `${chapterProgressPercentage}%`}
                        </span>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default ChapterNavigation;