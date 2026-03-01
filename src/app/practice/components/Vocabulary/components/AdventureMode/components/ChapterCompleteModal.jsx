import { motion, AnimatePresence } from 'framer-motion';
import {
    FaArrowRight,
    FaEye,
    FaMedal,
    FaAward,
    FaGem,
    FaFire,
    FaTrophy,
    FaStar,
    FaGraduationCap,
    FaTimes
} from 'react-icons/fa';
import Image from 'next/image';
import { useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { scrollToAdventureStart } from '@/utils/common';
import useScrollLock from '@/hooks/useScrollLock';

const ChapterCompleteModal = ({
    showChapterCompleteModal,
    currentChapterData,
    currentChapter,
    chapters,
    chapterScores,
    playerStats,
    t,
    handleChapterCompleteConfirm,
    setShowChapterCompleteModal,
    setModalDismissed
}) => {
    // Lock scroll when modal is open
    useScrollLock(showChapterCompleteModal);

    // === Derived stats ===
    const computedStats = useMemo(
        () => ({
            chapterScore: chapterScores[currentChapter] || 0,
            isLastChapter: currentChapter >= chapters.length - 1,
            currentStreak: playerStats.streak,
            totalScore: playerStats.totalScore
        }),
        [chapterScores, currentChapter, chapters.length, playerStats]
    );

    // === Animation variants (constants) ===
    const modalVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { type: 'tween', duration: 0.2, ease: 'easeOut' }
        },
        exit: {
            opacity: 0,
            scale: 0.95,
            y: 20,
            transition: { type: 'tween', duration: 0.15, ease: 'easeIn' }
        }
    };

    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } },
        exit: { opacity: 0, transition: { duration: 0.15 } }
    };

    // === Handlers ===
    const handleCloseModal = useCallback(() => {
        setShowChapterCompleteModal(false);
        setModalDismissed(true);
    }, [setShowChapterCompleteModal, setModalDismissed]);

    const handleModalBackdropClick = useCallback(
        (e) => {
            if (e.target === e.currentTarget) handleCloseModal();
        },
        [handleCloseModal]
    );

    const scrollToChapterContent = useCallback(() => {
        setShowChapterCompleteModal(false);
        setModalDismissed(true);

        // Use global scroll function with small delay to ensure modal is closed
        setTimeout(() => {
            scrollToAdventureStart({ delay: 100 });
        }, 50);
    }, [setShowChapterCompleteModal, setModalDismissed]);

    const handleContinueWithScroll = useCallback(() => {
        setShowChapterCompleteModal(false);
        setModalDismissed(false);
        handleChapterCompleteConfirm();

        // Use global scroll function with delay to ensure state updates complete
        setTimeout(() => {
            scrollToAdventureStart({ delay: 100 });
        }, 100);
    }, [setShowChapterCompleteModal, setModalDismissed, handleChapterCompleteConfirm]);

    // === Side effects ===
    useEffect(() => {
        if (!showChapterCompleteModal) return;

        const originalOverflow = document.body.style.overflow;
        const originalPosition = document.body.style.position;

        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.classList.add('modal-open');

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.position = originalPosition;
            document.body.style.width = '';
            document.body.classList.remove('modal-open');
        };
    }, [showChapterCompleteModal]);

    useEffect(() => {
        if (!showChapterCompleteModal) return;

        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') handleCloseModal();
        };

        document.addEventListener('keydown', handleEscapeKey);
        return () => document.removeEventListener('keydown', handleEscapeKey);
    }, [showChapterCompleteModal, handleCloseModal]);

    // === Render parts ===
    const headerContent = (
        <div className="modal-header">
            <button
                className="modal-close-btn"
                onClick={handleCloseModal}
                aria-label={t('close', { ns: 'common' })}
                type="button"
            >
                <FaTimes />
            </button>
            <div className="header-icon-container">
                <Image
                    src="/android-chrome-192x192.webp"
                    alt="Site Logo"
                    width={48}
                    height={48}
                    className="site-logo"
                    priority
                />
                <FaMedal className="medal-icon" />
            </div>
            <h3>{t('chapterComplete.chapterCompletion')}</h3>
            <p className="header-subtitle">{t('chapterComplete.outstandingPerformance')}</p>
        </div>
    );

    const statsContent = (
        <div className="chapter-stats">
            <div className="stat-row">
                <div className="stat-item">
                    <FaAward className="stat-icon" />
                    <span className="stat-label">{t('chapterComplete.chapterScore')}</span>
                    <span className="stat-value">{computedStats.chapterScore}</span>
                </div>
                <div className="stat-item">
                    <FaGem className="stat-icon" />
                    <span className="stat-label">{t('chapterComplete.gemsEarned')}</span>
                    <span className="stat-value">+5</span>
                </div>
            </div>
            <div className="stat-row">
                <div className="stat-item">
                    <FaFire className="stat-icon" />
                    <span className="stat-label">{t('chapterComplete.currentStreak')}</span>
                    <span className="stat-value">{computedStats.currentStreak}</span>
                </div>
                <div className="stat-item">
                    <FaTrophy className="stat-icon" />
                    <span className="stat-label">{t('chapterComplete.totalScore')}</span>
                    <span className="stat-value">{computedStats.totalScore}</span>
                </div>
            </div>
        </div>
    );

    // === Guard render ===
    if (!showChapterCompleteModal || !currentChapterData) return null;

    // === Modal Content ===
    const modalContent = (
        <AnimatePresence mode="wait">
            <motion.div
                className="chapter-complete-modal"
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={handleModalBackdropClick}
                style={{ willChange: 'opacity' }}
            >
                <motion.div
                    className="modal-content"
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={(e) => e.stopPropagation()}
                    style={{ willChange: 'transform, opacity' }}
                >
                    {headerContent}

                    <div className="modal-body">
                        <div className="achievement-badge">
                            <FaGraduationCap className="graduation-icon" />
                            <div className="badge-content">
                                <h4>{t('chapterComplete.chapterMastered', { number: currentChapter + 1 })}</h4>
                                <p className="chapter-title">"{currentChapterData.title}"</p>
                            </div>
                        </div>

                        {statsContent}

                        <div className="completion-message">
                            <div className="message-content">
                                <FaStar className="message-icon" />
                                <div className="message-text">
                                    <h4>{t('chapterComplete.excellentWork')}</h4>
                                    <p>{t('chapterComplete.completionMessage')}</p>
                                </div>
                            </div>
                        </div>

                        {!computedStats.isLastChapter ? (
                            <div className="modal-actions">
                                <button className="continue-btn" onClick={handleContinueWithScroll} type="button">
                                    <FaArrowRight />
                                    {t('chapterComplete.continueToNext')}
                                </button>
                                <button className="review-btn" onClick={scrollToChapterContent} type="button">
                                    <FaEye />
                                    {t('chapterComplete.reviewChapter')}
                                </button>
                            </div>
                        ) : (
                            <div className="adventure-complete">
                                <div className="complete-badge">
                                    <FaTrophy className="trophy-icon" />
                                    <h4>{t('chapterComplete.adventureComplete')}</h4>
                                    <p>{t('chapterComplete.congratulationsMessage')}</p>
                                </div>
                                <button className="finish-btn" onClick={handleContinueWithScroll} type="button">
                                    <FaGraduationCap />
                                    {t('chapterComplete.finishAdventure')}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );

    // === Portal Render ===
    return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default ChapterCompleteModal;
