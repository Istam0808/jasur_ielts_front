"use client";

import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { GiTreasureMap } from 'react-icons/gi';

// Import constants and utilities
import { STORY_THEMES, DEFAULT_PLAYER_STATS } from './constants';
import { useProgressStorage } from './hooks/useProgressStorage';
import { useGameLogic } from './hooks/useGameLogic';
import { useChapters } from './hooks/useChapters';
import { useMobileOptimization } from './hooks/useMobileOptimization';
import { usePerformanceMonitor } from './utils/performanceMonitor';

// Import components
import AdventureHeader from './components/AdventureHeader';
import ChapterNavigation from './components/ChapterNavigation';
import ChapterStory from './components/ChapterStory';
import ChapterWords from './components/ChapterWords';
import ChapterCompleteModal from './components/ChapterCompleteModal';


import "../styles/adventure-mode/index.scss"

const AdventureMode = memo(({
    words,
    onToggleSave,
    isSaved,
    langKey,
    getWordKey,
    difficulty
}) => {
    const { t, i18n } = useTranslation(['vocabulary']);
    
    // Use mobile optimization hook
    const {
        isMobile,
        isLowPerformance,
        getOptimizedDuration,
        getOptimizedEasing,
        shouldReduceEffects,
        getTouchSettings,
        optimizeScroll
    } = useMobileOptimization();
    
    // Performance monitoring
    const { startRender, endRender } = usePerformanceMonitor('AdventureMode');
    
    // Get current language from i18n - memoized to prevent unnecessary re-renders
    const currentLanguage = useMemo(() => i18n.language?.split('-')[0] || 'en', [i18n.language]);
    
    // Generate unique storage key for this user/difficulty combination
    const storageKey = useMemo(() =>
        `adventure_progress_${currentLanguage}_${difficulty || 'default'}`,
        [currentLanguage, difficulty]
    );

    // Use custom hooks first
    const { loadProgressFromStorage, saveProgressToStorage, clearProgressFromStorage, validatePlayerStats } = useProgressStorage(storageKey);

    // Initialize state with saved progress or defaults - memoized to prevent unnecessary re-initialization
    const initialProgress = useMemo(() => loadProgressFromStorage(), [loadProgressFromStorage]);

    // Game State - using functional updates to prevent stale closures
    const [currentChapter, setCurrentChapter] = useState(initialProgress?.currentChapter ?? 0);
    const [showStory, setShowStory] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [completedWords, setCompletedWords] = useState(initialProgress?.completedWords ?? new Set());
    const [attemptedWords, setAttemptedWords] = useState(initialProgress?.attemptedWords ?? new Set());
    const [chapterScores, setChapterScores] = useState(initialProgress?.chapterScores ?? {});
    const [playerStats, setPlayerStats] = useState(initialProgress?.playerStats ?? { ...DEFAULT_PLAYER_STATS });
    const [achievements, setAchievements] = useState(initialProgress?.achievements ?? new Set());
    const [showAchievement, setShowAchievement] = useState(null);

    const [showChapterCompleteModal, setShowChapterCompleteModal] = useState(false);
    const [modalDismissed, setModalDismissed] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

    // Performance optimization: use refs for values that don't need to trigger re-renders
    const lastSaveTimeRef = useRef(0);
    const saveTimeoutRef = useRef(null);

    // Now call useGameLogic without playSound parameter
    const { handleWordComplete, handleWordAttempt, timersRef } = useGameLogic(difficulty, getWordKey, t);

    // Memoized animation variants with performance optimization - only recalculate when mobile state changes
    const animationVariants = useMemo(() => {
        const baseDuration = getOptimizedDuration(300);
        const easing = getOptimizedEasing();
        
        if (isMobile) {
            return {
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: -20 },
                transition: { duration: baseDuration / 1000, ease: easing }
            };
        }
        
        return {
            initial: { opacity: 0, scale: 0.95 },
            animate: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 0.95 },
            transition: { duration: baseDuration / 1000, ease: easing }
        };
    }, [isMobile, getOptimizedDuration, getOptimizedEasing]);

    // Handle locale changes - optimized to prevent unnecessary re-renders
    useEffect(() => {
        const handleLanguageChanged = () => {
            // Only force re-render if the component is mounted and active
            setRetryKey(prev => prev + 1);
        };

        // Listen for language changes
        i18n.on('languageChanged', handleLanguageChanged);

        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, [i18n]);

    // Memoized story theme - only recalculate when difficulty changes
    const storyTheme = useMemo(() => {
        const difficultyKey = difficulty?.toLowerCase() || 'a1';
        return STORY_THEMES[difficultyKey] || STORY_THEMES.a1;
    }, [difficulty]);

    // Use chapters hook
    const {
        chapters,
        currentChapterData,
        chapterProgressPercentage,
        overallProgress,
        handleChapterComplete: handleChapterCompleteLogic,
        handleNextChapter: handleNextChapterLogic,
        handlePreviousChapter: handlePreviousChapterLogic,
        handleStartChapter: handleStartChapterLogic,
        reshuffleCurrentChapter,
        generateNewSession
    } = useChapters(words, currentChapter, completedWords, getWordKey, difficulty);

    // Navigation handlers - memoized for performance with stable dependencies
    const handleChapterComplete = useCallback(() => {
        handleChapterCompleteLogic(setCurrentChapter, setShowStory, setIsPlaying, setModalDismissed);
    }, [handleChapterCompleteLogic]);

    const handleNextChapter = useCallback(() => {
        handleNextChapterLogic(setCurrentChapter, setShowStory, setIsPlaying, setModalDismissed);
    }, [handleNextChapterLogic]);

    const handlePreviousChapter = useCallback(() => {
        handlePreviousChapterLogic(setCurrentChapter, setShowStory, setIsPlaying, setModalDismissed);
    }, [handlePreviousChapterLogic]);

    const handleStartChapter = useCallback(() => {
        handleStartChapterLogic(setShowStory, setIsPlaying);
    }, [handleStartChapterLogic]);

    // Determine if navigation buttons should be visible - memoized to prevent recalculation
    const shouldShowNavigation = useMemo(() => {
        // Always show if game is active (not showing story)
        if (!showStory) return true;
        
        // Show if current chapter is completed (progress >= 80%)
        if (chapterProgressPercentage >= 80) return true;
        
        // Show if there are previous chapters available
        if (currentChapter > 0) return true;
        
        // Show if there are next chapters available and current chapter has some progress
        if (currentChapter < chapters.length - 1 && chapterProgressPercentage > 0) return true;
        
        return false;
    }, [showStory, chapterProgressPercentage, currentChapter, chapters.length]);

    const handleChapterCompleteConfirm = useCallback(() => {
        setShowChapterCompleteModal(false);
        setModalDismissed(false);
        handleChapterComplete();
    }, [handleChapterComplete]);

    // Optimized word completion handler - memoized with stable dependencies
    const handleWordCompleteOptimized = useCallback((word) => {
        handleWordComplete(
            word,
            completedWords,
            setCompletedWords,
            setPlayerStats,
            setChapterScores,
            currentChapter,
            setAchievements,
            setShowAchievement,
            achievements,
            currentChapterData
        );
    }, [
        handleWordComplete,
        completedWords,
        currentChapter,
        achievements,
        currentChapterData
    ]);

    // Optimized word attempt handler - memoized with stable dependencies
    const handleWordAttemptOptimized = useCallback((word) => {
        handleWordAttempt(word, setAttemptedWords, setPlayerStats);
    }, [handleWordAttempt, setPlayerStats]);

    // Optimized auto-save progress with smart change detection and minimal frequency
    useEffect(() => {
        const now = Date.now();
        const minSaveInterval = isMobile ? 30000 : 15000; // Even longer intervals - 15-30 seconds
        
        // Clear existing timeout and remove from timers
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            timersRef.current.delete('saveProgress');
            saveTimeoutRef.current = null;
        }
        
        // Only save if enough time has passed since last save
        if (now - lastSaveTimeRef.current >= minSaveInterval) {
            const progress = {
                currentChapter,
                completedWords,
                attemptedWords,
                chapterScores,
                playerStats,
                achievements
            };

            const timeoutId = setTimeout(() => {
                saveProgressToStorage(progress);
                lastSaveTimeRef.current = Date.now();
            }, 10000); // Even longer debounce time - 10 seconds

            saveTimeoutRef.current = timeoutId;
            timersRef.current.set('saveProgress', timeoutId);
        } else {
            // Schedule save for later
            const timeoutId = setTimeout(() => {
                const progress = {
                    currentChapter,
                    completedWords,
                    attemptedWords,
                    chapterScores,
                    playerStats,
                    achievements
                };
                saveProgressToStorage(progress);
                lastSaveTimeRef.current = Date.now();
            }, minSaveInterval - (now - lastSaveTimeRef.current));

            saveTimeoutRef.current = timeoutId;
            timersRef.current.set('saveProgress', timeoutId);
        }

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                timersRef.current.delete('saveProgress');
                saveTimeoutRef.current = null;
            }
        };
    }, [currentChapter, completedWords, attemptedWords, chapterScores, playerStats, achievements, saveProgressToStorage, timersRef, isMobile]);

    // Chapter completion modal logic - optimized with better conditions
    useEffect(() => {
        const shouldShowModal = chapterProgressPercentage >= 100 && 
                               currentChapterData && 
                               isPlaying && 
                               !showChapterCompleteModal && 
                               !modalDismissed;

        if (shouldShowModal) {
            setShowChapterCompleteModal(true);
        }
    }, [chapterProgressPercentage, currentChapterData, isPlaying, showChapterCompleteModal, modalDismissed]);

    // Validate player stats on mount and fix if needed - only run once
    useEffect(() => {
        const validatedStats = validatePlayerStats(playerStats);
        if (JSON.stringify(validatedStats) !== JSON.stringify(playerStats)) {
            setPlayerStats(validatedStats);
        }
    }, []); // Only run on mount

    // Optimize scroll performance for mobile - only run once after mount
    useEffect(() => {
        const adventureModeElement = document.querySelector('.adventure-mode');
        if (adventureModeElement) {
            optimizeScroll(adventureModeElement);
        }
    }, [optimizeScroll]);

    // Performance monitoring - start render
    const renderStartTime = startRender();

    // On storage key change (language/difficulty), reload saved progress or reset
    useEffect(() => {
        const progress = loadProgressFromStorage();
        if (progress) {
            setCurrentChapter(progress.currentChapter ?? 0);
            setCompletedWords(progress.completedWords ?? new Set());
            setAttemptedWords(progress.attemptedWords ?? new Set());
            setChapterScores(progress.chapterScores ?? {});
            setPlayerStats(progress.playerStats ?? { ...DEFAULT_PLAYER_STATS });
            setAchievements(progress.achievements ?? new Set());
        } else {
            setCurrentChapter(0);
            setCompletedWords(new Set());
            setAttemptedWords(new Set());
            setChapterScores({});
            setPlayerStats({ ...DEFAULT_PLAYER_STATS });
            setAchievements(new Set());
        }
        // reset UI state related to chapter display
        setShowStory(true);
        setIsPlaying(false);
        setShowChapterCompleteModal(false);
        setModalDismissed(false);
        setRetryKey(prev => prev + 1);
    }, [storageKey, loadProgressFromStorage]);

    // End performance render after commit for main render path
    useEffect(() => {
        endRender(renderStartTime);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [renderStartTime]);

    // Early return for invalid state
    if (!Array.isArray(words) || words.length === 0 || !Array.isArray(chapters) || chapters.length === 0 || !currentChapterData) {
        return (
            <div className="adventure-mode" style={getTouchSettings?.() || {}}>
                <div className="adventure-error">
                    <GiTreasureMap />
                    <h3>{t('adventure.noChapters')}</h3>
                    <p>{t('adventure.noChaptersDescription')}</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="adventure-mode" style={getTouchSettings?.() || {}}>
                {/* Simplified Header with Key Stats */}
                <AdventureHeader
                    storyTheme={storyTheme}
                    difficulty={difficulty}
                    t={t}
                    playerStats={playerStats}
                    overallProgress={overallProgress}
                    completedWords={completedWords}
                    words={words}
                />

                {/* Chapter Navigation */}
                <ChapterNavigation
                    currentChapter={currentChapter}
                    chapters={chapters}
                    chapterProgressPercentage={chapterProgressPercentage}
                    currentChapterData={currentChapterData}
                    t={t}
                    handlePreviousChapter={handlePreviousChapter}
                    handleNextChapter={handleNextChapter}
                    isGameStarted={shouldShowNavigation}
                    completedWords={completedWords}
                    getWordKey={getWordKey}
                />

                {/* Chapter Content - Optimized animations with reduced complexity */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentChapter}
                        className="chapter-content"
                        {...animationVariants}
                    >
                        {showStory && (
                            <ChapterStory
                                currentChapter={currentChapter}
                                currentChapterData={currentChapterData}
                                t={t}
                                handleStartChapter={handleStartChapter}
                            />
                        )}

                        {!showStory && (
                            <ChapterWords
                                currentChapterData={currentChapterData}
                                completedWords={completedWords}
                                attemptedWords={attemptedWords}
                                getWordKey={getWordKey}
                                retryKey={retryKey}
                                chapterProgressPercentage={chapterProgressPercentage}
                                isPlaying={isPlaying}
                                t={t}
                                onToggleSave={onToggleSave}
                                isSaved={isSaved}
                                langKey={langKey}
                                difficulty={difficulty}
                                handleWordComplete={handleWordCompleteOptimized}
                                handleWordAttempt={handleWordAttemptOptimized}
                                setShowChapterCompleteModal={setShowChapterCompleteModal}
                                setAttemptedWords={setAttemptedWords}
                                setCompletedWords={setCompletedWords}
                                setRetryKey={setRetryKey}
                                reshuffleCurrentChapter={reshuffleCurrentChapter}
                                generateNewSession={generateNewSession}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>


            </div>

            {/* Chapter Complete Modal - Moved outside adventure-mode for fullscreen overlay */}
            <ChapterCompleteModal
                showChapterCompleteModal={showChapterCompleteModal}
                currentChapterData={currentChapterData}
                currentChapter={currentChapter}
                chapters={chapters}
                chapterScores={chapterScores}
                playerStats={playerStats}
                t={t}
                handleChapterCompleteConfirm={handleChapterCompleteConfirm}
                setShowChapterCompleteModal={setShowChapterCompleteModal}
                setModalDismissed={setModalDismissed}
            />
        </>
    );
    
    // Note: endRender is called just before each return above with the start time
});

AdventureMode.displayName = 'AdventureMode';

export default AdventureMode; 