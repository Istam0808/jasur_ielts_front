import { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowRight, FaRedo, FaEye, FaRandom, FaSync } from 'react-icons/fa';
import { GiCrown } from 'react-icons/gi';
import VocabularyCard from '../../VocabularyCard';
import { useMobileOptimization } from '../hooks/useMobileOptimization';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { scrollToAdventureStart } from '@/utils/common';

// Centralized animation variants
const ANIMATION_VARIANTS = {
  section: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    transition: { duration: 0.2, ease: 'easeOut' }
  }
};

const ChapterWords = memo(({
  currentChapterData,
  completedWords,
  attemptedWords,
  getWordKey,
  retryKey,
  chapterProgressPercentage,
  isPlaying,
  t,
  onToggleSave,
  isSaved,
  langKey,
  difficulty,
  handleWordComplete,
  handleWordAttempt,
  setShowChapterCompleteModal,
  setAttemptedWords,
  setCompletedWords,
  setRetryKey,
  reshuffleCurrentChapter,
  generateNewSession
}) => {
  const { isLowPerformance } = useMobileOptimization();
  const { shouldReduceAnimations } = usePerformanceMonitor();
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  const words = useMemo(() => currentChapterData?.words || [], [currentChapterData?.words]);

  // Optimized scroll with debounce using global function
  const scrollToChapterContent = useCallback(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    scrollTimeoutRef.current = setTimeout(() => {
      scrollToAdventureStart({ 
        behavior: isLowPerformance ? 'auto' : 'smooth',
        delay: 16
      });
    }, 16);
  }, [isLowPerformance]);

  // Cleanup timeout
  useEffect(() => () => clearTimeout(scrollTimeoutRef.current), []);

  // Batch updates helper
  const batchStateUpdates = useCallback((updates) => {
    requestAnimationFrame(() => updates.forEach(fn => fn()));
  }, []);

  // Generalized chapter reset handler
  const resetChapter = useCallback((opts = {}) => {
    if (!words.length) return;
    const keys = words.map(getWordKey).filter(Boolean);

    batchStateUpdates([
      ...(opts.newSession ? [() => generateNewSession()] : []),
      () => setAttemptedWords(prev => {
        const s = new Set(prev);
        keys.forEach(k => s.delete(k));
        return s;
      }),
      () => setCompletedWords(prev => {
        const s = new Set(prev);
        keys.forEach(k => s.delete(k));
        return s;
      }),
      () => reshuffleCurrentChapter(),
      () => setRetryKey(prev => prev + 1)
    ]);

    scrollToChapterContent();
  }, [words, getWordKey, setAttemptedWords, setCompletedWords, reshuffleCurrentChapter, setRetryKey, generateNewSession, scrollToChapterContent, batchStateUpdates]);

  const handleRetryChapter = useCallback(() => resetChapter(), [resetChapter]);
  const handleReshuffleChapter = useCallback(() => resetChapter(), [resetChapter]);
  const handleNewSession = useCallback(() => resetChapter({ newSession: true }), [resetChapter]);

  // Section visibility
  const { shouldShowCompleteSection, shouldShowPracticeSection } = useMemo(() => {
    if (!currentChapterData || !words.length) return { shouldShowCompleteSection: false, shouldShowPracticeSection: false };

    const complete = chapterProgressPercentage >= 100;
    let practice = false;

    if (attemptedWords?.size > 0 && chapterProgressPercentage < 100) {
      const attemptedInChapter = words.some(w => attemptedWords.has(getWordKey(w)));
      practice = attemptedInChapter || chapterProgressPercentage >= 80;
    }

    return { shouldShowCompleteSection: complete, shouldShowPracticeSection: practice };
  }, [chapterProgressPercentage, currentChapterData, words, attemptedWords, getWordKey]);

  // Render word cards
  const wordCards = useMemo(() => (
    words.map((word, i) => {
      const key = getWordKey(word);
      if (!key) return null;
      const isCompleted = completedWords?.has(key);
      return (
        <div key={`${key}-${retryKey}`} className={`word-container ${isCompleted ? 'completed' : ''}`} data-word-key={key}>
          <VocabularyCard
            word={word}
            studyMode="quiz"
            showTranslations
            isSaved={isSaved?.(word) || false}
            onToggleSave={() => onToggleSave?.(word)}
            langKey={langKey}
            difficulty={difficulty}
            onComplete={() => handleWordComplete?.(word)}
            onAttempt={() => handleWordAttempt?.(word)}
            isCompleted={isCompleted}
          />
        </div>
      );
    }).filter(Boolean)
  ), [words, getWordKey, retryKey, completedWords, isSaved, onToggleSave, langKey, difficulty, handleWordComplete, handleWordAttempt]);

  if (!currentChapterData || !words.length) {
    return <div className="chapter-words empty-state"><p>{t?.('adventure.noWordsInChapter') || 'No words available for this chapter.'}</p></div>;
  }

  return (
    <div ref={containerRef} className="chapter-words">
      {isPlaying && words.length > 0 && (
        <div className="chapter-controls">
          <button className="reshuffle-button-standalone" onClick={handleReshuffleChapter} type="button">
            <FaRandom />
            {t?.('chapterComplete.reshuffleChapter') || 'Reshuffle Words'}
          </button>
        </div>
      )}

      <div className="words-grid">{wordCards}</div>

      {/* Complete Section */}
      <AnimatePresence mode="wait">
        {shouldShowCompleteSection && (
          <motion.div className="chapter-complete-section" {...ANIMATION_VARIANTS.section}>
            <div className="complete-message">
              <GiCrown className="complete-icon" />
              <h4>{t?.('adventure.completeChapter') || 'Chapter Complete!'}</h4>
              <p>{t?.('chapterComplete.accuracyAchieved', { percentage: Math.round(chapterProgressPercentage) }) || `Excellent work! You achieved ${Math.round(chapterProgressPercentage)}% accuracy!`}</p>
            </div>
            <div className="complete-actions">
              <button className="complete-chapter-btn" onClick={() => setShowChapterCompleteModal?.(true)} type="button">
                <FaArrowRight /> {t?.('chapterComplete.viewResults') || 'View Chapter Results'}
              </button>
              <button className="review-chapter-btn" onClick={scrollToChapterContent} type="button">
                <FaRedo /> {t?.('chapterComplete.reviewChapter') || 'Review Chapter'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Practice Section */}
      <AnimatePresence mode="wait">
        {shouldShowPracticeSection && (
          <motion.div className="practice-more-section" {...ANIMATION_VARIANTS.section} transition={{ duration: 0.3, delay: 0.1 }}>
            <div className="practice-message">
              <FaRedo className="practice-icon" />
              <h4>{t?.('chapterComplete.keepPracticing') || 'Keep Practicing!'}</h4>
              <p>
                {chapterProgressPercentage >= 100
                  ? t?.('chapterComplete.accuracyAchieved', { percentage: Math.round(chapterProgressPercentage) })
                  : chapterProgressPercentage >= 80
                  ? t?.('chapterComplete.accuracyAchieved', { percentage: Math.round(chapterProgressPercentage) }) || `Great job! You achieved ${Math.round(chapterProgressPercentage)}%! You can unlock the next chapter!`
                  : t?.('chapterComplete.accuracyMessage', { percentage: Math.round(chapterProgressPercentage) }) || `You achieved ${Math.round(chapterProgressPercentage)}%. Try to reach 80%!`}
              </p>
            </div>
            <div className="practice-actions">
              <button className="retry-chapter-btn" onClick={handleRetryChapter} type="button"><FaRedo /> {t?.('chapterComplete.retryChapter') || 'Retry Chapter'}</button>
              <button className="reshuffle-chapter-btn" onClick={handleReshuffleChapter} type="button"><FaRandom /> {t?.('chapterComplete.reshuffleChapter') || 'Reshuffle Words'}</button>
              <button className="new-session-btn" onClick={handleNewSession} type="button"><FaSync /> {t?.('chapterComplete.newSession') || 'New Session'}</button>
              <button className="review-answers-btn" onClick={scrollToChapterContent} type="button"><FaEye /> {t?.('chapterComplete.reviewAnswers') || 'Review Answers'}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ChapterWords.displayName = 'ChapterWords';
export default ChapterWords;
