"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaTimes, FaWifi } from 'react-icons/fa';
import { MdTranslate, MdVolumeUp } from 'react-icons/md';
import { showToast } from '@/lib/toastNotify';
import InfoTooltip from '@/components/common/InfoTooltip';
import { useEnhancedStorage } from '@/hooks/useEnhancedStorage';
import { useUserDataMirror } from '@/hooks/useUserDataMirror';
import { clearGrammarDataCache } from '@/utils/grammarDataRefresh';
import { MigrationUtils } from '@/utils/migrationUtils';
import { formatExplanationRecursivelyWithPronunciation } from '@/utils/common';
import { 
  showSyncSuccessToast, 
  showSyncErrorToast, 
  showSyncInfoToast, 
  showSyncWarningToast, 
  showSyncProgressToast 
} from '@/utils/syncToastHelper';
import { EnhancedStorage } from '@/utils/enhancedStorage';
import './styles/index.scss';
import { LearnModeHeader } from './components/Header';
import { LearnModeContent } from './components/Content';
import { LearnModeFooter } from './components/Footer';
import { PracticePanel } from './components/PracticePanel';
import { useLoading } from '@/components/common/LoadingContext';
import { useLearningTimer } from '@/hooks/useLearningTimer';
import { useDistractionDetector } from '@/hooks/useDistractionDetector';

// Constants
const SPEED_LEVELS = {
  NORMAL: 1.0,
  SLOW: 0.7,
  VERY_SLOW: 0.5
};

const SPEED_RESET_TIMEOUT = 5000;

const DEFAULT_PROGRESS = {
  totalItems: 0,
  revealedCount: 0,
  correctCount: 0,
  completionPercent: 0,
  correctPercent: 0,
  attemptsTotal: 0,
  bestCorrectPercent: 0,
  bestAchievedAtAttempt: 0,
  completed: false,
  completedAt: null,
  types: {},
  totals: { totalItems: 0, revealedCount: 0, correctCount: 0 },
  updatedAt: new Date().toISOString()
};

/**
 * Fullscreen grammar learning mode with a lightweight carousel.
 * @param {Object} props
 * @param {Object} props.topic - GrammarTopic object
 * @param {Function} props.onClose - Callback when closing the modal
 */
const LearnMode = ({ topic, onClose }) => {
  const { t, i18n } = useTranslation(['grammar']);
  const langKey = useMemo(() => i18n.language?.split('-')[0] || 'en', [i18n.language]);
  const containerRef = useRef(null);
  const speedTimersRef = useRef(new Map());
  const prevOnlineRef = useRef(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const hasLocalChangesRef = useRef(false);
  const latestProgressRef = useRef(DEFAULT_PROGRESS);
  
  const [index, setIndex] = useState(0);
  const [practiceAllRevealed, setPracticeAllRevealed] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const { setIsLoading } = useLoading?.() || { setIsLoading: () => {} };

  // Learning timer: start when LearnMode opens, stop on finish/close/unmount
  const { manualStart, manualStop } = useLearningTimer({ 
    activityTag: 'grammar_practice', 
    renderless: true
  });
  useEffect(() => {
    try { manualStart(); } catch (_) {}
    return () => { try { manualStop(); } catch (_) {} };
  }, [manualStart, manualStop]);

  // Distraction detection with silent pause/resume for practice sessions
  useDistractionDetector({
    enabled: true,
    showModal: false,
    reason: 'Grammar practice session',
    blurGraceMs: 0, // Stop immediately on blur
    inactivityMs: 5 * 60 * 1000, // 5 minutes inactivity
    onDistraction: () => {
      // Pause timer silently when user switches tabs/apps
      try { manualStop(); } catch (_) {}
    },
    onReturn: () => {
      // Resume timer silently when user returns
      try { manualStart(); } catch (_) {}
    }
  });

  // Disable pronunciation for Uzbek locale
  const shouldEnablePronunciation = useMemo(() => langKey !== 'uz', [langKey]);

  // Storage key for progress
  const storageKey = useMemo(() => 
    topic?.id ? `grammar_progress_${topic.id}` : null, 
    [topic?.id]
  );
  // Session key used by PracticePanel
  const sessionKey = useMemo(() => 
    topic?.id ? `grammar_session_${topic.id}` : null,
    [topic?.id]
  );

  // Prevent body scroll when modal is open
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    
    // Store original styles
    const originalStyles = {
      bodyOverflow: body.style.overflow,
      htmlOverflowY: html.style.overflowY,
      bodyPaddingRight: body.style.paddingRight
    };

    // Apply modal styles
    body.style.overflow = 'hidden';
    html.style.overflowY = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Cleanup
    return () => {
      body.style.overflow = originalStyles.bodyOverflow;
      html.style.overflowY = originalStyles.htmlOverflowY;
      body.style.paddingRight = originalStyles.bodyPaddingRight;
    };
  }, []);

  // Validation function for grammar progress
  const validateGrammarProgress = useCallback((data) => {
    if (!data || typeof data !== 'object') {
      console.warn('[Validation] Data is null, undefined, or not an object');
      return false;
    }

    try {
      // Check for essential percentage fields (must be numbers and in valid range)
      if (typeof data.completionPercent !== 'number' || 
          data.completionPercent < 0 || 
          data.completionPercent > 100 ||
          !Number.isFinite(data.completionPercent)) {
        console.warn('[Validation] Invalid completionPercent:', data.completionPercent);
        return false;
      }

      if (typeof data.correctPercent !== 'number' || 
          data.correctPercent < 0 || 
          data.correctPercent > 100 ||
          !Number.isFinite(data.correctPercent)) {
        console.warn('[Validation] Invalid correctPercent:', data.correctPercent);
        return false;
      }

      // Validate updatedAt field if present
      if (data.updatedAt && typeof data.updatedAt !== 'string') {
        console.warn('[Validation] Invalid updatedAt field:', data.updatedAt);
        return false;
      }

      // Check for either old or new format
      const hasOldFormat = ['totalItems', 'revealedCount', 'correctCount'].every(
        field => typeof data[field] === 'number' && Number.isFinite(data[field]) && data[field] >= 0
      );

      const hasNewFormat = 
        data.totals && 
        typeof data.totals === 'object' &&
        ['totalItems', 'revealedCount', 'correctCount'].every(
          field => typeof data.totals[field] === 'number' && 
                   Number.isFinite(data.totals[field]) && 
                   data.totals[field] >= 0
        );

      // Validate types field if present
      if (data.types && typeof data.types !== 'object') {
        console.warn('[Validation] Invalid types field:', data.types);
        return false;
      }

      const isValid = hasOldFormat || hasNewFormat;
      if (!isValid) {
        console.warn('[Validation] Missing valid format - neither old nor new format detected');
        console.warn('[Validation] Data structure:', {
          hasOldFormat,
          hasNewFormat,
          dataKeys: Object.keys(data),
          totalsType: typeof data.totals,
          totalsKeys: data.totals ? Object.keys(data.totals) : 'none'
        });
      }

      return isValid;
    } catch (error) {
      console.error('[Validation] Unexpected error during validation:', error);
      return false;
    }
  }, []);

  // Enhanced storage hook for progress
  const {
    data: progress,
    saveData: setProgress,
    syncStatus,
    isLoading: progressLoading,
    error: progressError,
    forceSync,
    getSyncStatus
  } = useEnhancedStorage(
    storageKey,
    DEFAULT_PROGRESS,
    {
      debounceMs: 1000,
      autoSave: true,
      validateData: validateGrammarProgress,
      onError: (error) => {
        console.error(`Storage error for ${storageKey}:`, error);
        if (error.message === 'Data validation failed' && typeof window !== 'undefined') {
          // Multi-layered fallback recovery mechanism
          try {
            // First attempt: Clear from localStorage directly
            window.localStorage.removeItem(storageKey);
            console.log('Corrupted data cleared from localStorage');
            
            // Second attempt: Clear variations of the key that might exist
            const keyVariations = [
              storageKey,
              `${storageKey}_backup`,
              `${storageKey}_temp`,
              storageKey.replace('grammar_progress_', 'progress_'),
              storageKey.replace('grammar_progress_', '')
            ];
            
            keyVariations.forEach(key => {
              try {
                window.localStorage.removeItem(key);
              } catch (varError) {
                // Silent fail for variations
              }
            });
            
            // Third attempt: Force reinitialize with clean default data
            setProgress(DEFAULT_PROGRESS);
            console.log('Force reinitialized with default progress data');
            
          } catch (clearError) {
            console.error('All fallback recovery attempts failed:', clearError);
            // Last resort: Reset to minimal working state
            setProgress({
              totalItems: 0,
              revealedCount: 0,
              correctCount: 0,
              completionPercent: 0,
              correctPercent: 0,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
    }
  );

  // User data mirror hook for syncing complete grammar data
  const { queueGrammarProgressUpdate } = useUserDataMirror();

  // Helper: detect authentication once per render
  const isAuthenticated = useMemo(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const user = raw ? JSON.parse(raw) : null;
      return !!(user && (user.token || user.accessToken || user.idToken));
    } catch (_) {
      return false;
    }
  }, []);

  // Run migration if needed
  useEffect(() => {
    const runMigration = async () => {
      if (MigrationUtils.needsMigration()) {
        console.log('Starting migration...');
        await MigrationUtils.migrateGrammarProgress();
        console.log('Migration completed');
      }
    };
    runMigration();
  }, []);

  // Handle progress updates
  const handleProgressChange = useCallback((newProgressData) => {
    try {
      // Validate incoming progress data before processing
      if (!newProgressData || typeof newProgressData !== 'object') {
        console.warn('[Progress] Invalid progress data received, skipping update');
        return;
      }

      // Sanitize numeric values to prevent validation errors
      const sanitizeNumber = (value, defaultValue = 0) => {
        const num = Number(value);
        return Number.isFinite(num) && num >= 0 ? num : defaultValue;
      };

      const sanitizePercent = (value, defaultValue = 0) => {
        const num = Number(value);
        return Number.isFinite(num) && num >= 0 && num <= 100 ? num : defaultValue;
      };

      hasLocalChangesRef.current = true;

      // Build safe data deterministically so Finish can use the freshest values
      const prev = latestProgressRef.current || progress || DEFAULT_PROGRESS;
      const safeData = {
        ...prev,
        totalItems: sanitizeNumber(newProgressData.totalItems),
        revealedCount: sanitizeNumber(newProgressData.revealedCount),
        correctCount: sanitizeNumber(newProgressData.correctCount),
        completionPercent: Math.max(
          sanitizePercent(prev?.completionPercent),
          sanitizePercent(newProgressData.completionPercent)
        ),
        correctPercent: Math.max(
          sanitizePercent(prev?.correctPercent),
          sanitizePercent(newProgressData.correctPercent)
        ),
        attemptsTotal: Math.max(prev?.attemptsTotal || 0, newProgressData.attemptsTotal || prev?.attemptsTotal || 0),
        bestCorrectPercent: Math.max(prev?.bestCorrectPercent || 0, newProgressData.bestCorrectPercent || 0),
        bestAchievedAtAttempt: Math.max(prev?.bestAchievedAtAttempt || 0, newProgressData.bestAchievedAtAttempt || 0),
        completed: prev?.completed || newProgressData.completed || false,
        completedAt: prev?.completedAt || newProgressData.completedAt || null,
        totals: {
          totalItems: sanitizeNumber(newProgressData.totalItems),
          revealedCount: sanitizeNumber(newProgressData.revealedCount),
          correctCount: sanitizeNumber(newProgressData.correctCount)
        },
        updatedAt: new Date().toISOString()
      };

      if (validateGrammarProgress(safeData)) {
        latestProgressRef.current = safeData;
        setProgress(safeData, { sync: false });
      } else {
        // Preserve existing progress data in fallback to avoid losing attemptsTotal
        const fallback = { 
          ...DEFAULT_PROGRESS, 
          ...prev,
          attemptsTotal: prev?.attemptsTotal || 0,
          bestCorrectPercent: prev?.bestCorrectPercent || 0,
          bestAchievedAtAttempt: prev?.bestAchievedAtAttempt || 0,
          completed: prev?.completed || false,
          completedAt: prev?.completedAt || null,
          updatedAt: new Date().toISOString() 
        };
        latestProgressRef.current = fallback;
        setProgress(fallback, { sync: false });
      }
    } catch (error) {
      console.error('[Progress] Error in handleProgressChange:', error);
      // Fallback to safe default progress while preserving existing data
      const fallback = { 
        ...DEFAULT_PROGRESS, 
        ...prev,
        attemptsTotal: prev?.attemptsTotal || 0,
        bestCorrectPercent: prev?.bestCorrectPercent || 0,
        bestAchievedAtAttempt: prev?.bestAchievedAtAttempt || 0,
        completed: prev?.completed || false,
        completedAt: prev?.completedAt || null,
        updatedAt: new Date().toISOString() 
      };
      latestProgressRef.current = fallback;
      setProgress(fallback);
    }
  }, [setProgress, validateGrammarProgress]);

  // Filter translated words in parentheses
  const filterTranslatedWords = useCallback((text) => {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/\s*\([^)]+\)\s*[.!?;:]?\s*$/, '');
  }, []);

  // Update speed visual feedback
  const updateSpeedVisualFeedback = useCallback((button, speed) => {
    button.classList.remove('speed-07', 'speed-05');
    
    if (speed === SPEED_LEVELS.SLOW) {
      button.classList.add('speed-07');
    } else if (speed === SPEED_LEVELS.VERY_SLOW) {
      button.classList.add('speed-05');
    }
    
    const speedText = 
      speed === SPEED_LEVELS.NORMAL ? t('speedNormal', { ns: 'grammar' }) :
      speed === SPEED_LEVELS.SLOW ? t('speedSlow', { ns: 'grammar' }) : t('speedVerySlow', { ns: 'grammar' });
    
    button.title = `${t('listen', { ns: 'grammar' })}: ${speedText} ${t('speed', { ns: 'grammar' })}`;
  }, [t]);

  // Handle text-to-speech
  const handleSpeak = useCallback((text, lang = 'en', speed = SPEED_LEVELS.NORMAL) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      
      synth.cancel();
      
      const cleanText = filterTranslatedWords(text);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      const voices = synth.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang?.toLowerCase().startsWith(lang.toLowerCase())
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      } else {
        utterance.lang = lang;
      }
      
      utterance.rate = speed;
      synth.speak(utterance);
    } catch (error) {
      console.error('Speech synthesis error:', error);
    }
  }, [filterTranslatedWords]);

  // Handle speed button click
  const handleSpeedClick = useCallback((e, text, lang = 'en') => {
    const button = e.currentTarget;
    const buttonId = button.dataset.buttonId || Math.random().toString(36);
    button.dataset.buttonId = buttonId;
    
    // Clear existing timer for this button
    if (speedTimersRef.current.has(buttonId)) {
      clearTimeout(speedTimersRef.current.get(buttonId));
    }
    
    // Get and cycle speed
    let currentSpeed = parseFloat(button.dataset.speed) || SPEED_LEVELS.NORMAL;
    currentSpeed = 
      currentSpeed === SPEED_LEVELS.NORMAL ? SPEED_LEVELS.SLOW :
      currentSpeed === SPEED_LEVELS.SLOW ? SPEED_LEVELS.VERY_SLOW :
      SPEED_LEVELS.NORMAL;
    
    button.dataset.speed = currentSpeed;
    updateSpeedVisualFeedback(button, currentSpeed);
    handleSpeak(text, lang, currentSpeed);
    
    // Reset speed after timeout
    const timerId = setTimeout(() => {
      if (button.dataset.speed === currentSpeed.toString()) {
        button.dataset.speed = SPEED_LEVELS.NORMAL.toString();
        updateSpeedVisualFeedback(button, SPEED_LEVELS.NORMAL);
      }
      speedTimersRef.current.delete(buttonId);
    }, SPEED_RESET_TIMEOUT);
    
    speedTimersRef.current.set(buttonId, timerId);
  }, [updateSpeedVisualFeedback, handleSpeak]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      speedTimersRef.current.forEach(timerId => clearTimeout(timerId));
      speedTimersRef.current.clear();
    };
  }, []);

  // Keep latestProgressRef.current in sync with progress from storage
  useEffect(() => {
    if (progress && typeof progress === 'object') {
      latestProgressRef.current = progress;
    }
  }, [progress]);

  // Monitor network toggles only and show a toast on change (offline/online)
  useEffect(() => {
    if (!syncStatus || !storageKey) return;
    const { isOnline } = syncStatus;
    const wasOnline = prevOnlineRef.current;
    if (isOnline !== wasOnline) {
      prevOnlineRef.current = isOnline;
      if (isOnline === false) {
        showSyncWarningToast(showToast, t, 'syncOffline', { namespace: 'grammar' });
      } else {
        // Only announce coming online if there are local changes to sync
        if (hasLocalChangesRef.current) {
          showSyncInfoToast(showToast, t, 'syncOnline', { namespace: 'grammar' });
          // reset after notifying; queue will sync silently
          hasLocalChangesRef.current = false;
        }
      }
    }
  }, [syncStatus, storageKey, t]);

  // Split mistake text helper
  const splitMistake = useCallback((text) => {
    if (!text || typeof text !== 'string') return { wrong: text || '', right: '' };
    
    const separators = [' → ', '→', ' -> ', '->', ' —> ', '—>', ' => ', '=>'];
    for (const sep of separators) {
      const idx = text.indexOf(sep);
      if (idx !== -1) {
        return {
          wrong: text.slice(0, idx).trim(),
          right: text.slice(idx + sep.length).trim()
        };
      }
    }
    return { wrong: text, right: '' };
  }, []);

  // Generate slides
  const slides = useMemo(() => {
    if (!topic) return [];

    const formatWithPronunciation = (text) => 
      formatExplanationRecursivelyWithPronunciation(
        text, 
        ["'", "`"], 
        { 
          enablePronunciation: shouldEnablePronunciation, 
          onSpeak: handleSpeak, 
          language: 'en' 
        }
      );

    const createTranslateUrl = (text) => {
      const rawText = typeof text === 'string' ? text : 
                      Array.isArray(text) ? text.join(' ') : 
                      String(text ?? '');
      return `https://translate.google.com/?sl=auto&tl=${langKey}&text=${encodeURIComponent(rawText)}&op=translate`;
    };

    return [
      {
        key: 'overview',
        title: topic.topic,
        render: () => (
          <div className="lm-section">
            <h3>{t('learningObjectives', { ns: 'grammar' })}</h3>
            <ul className="lm-list">
              {topic.learning_objectives?.[langKey]?.map((obj, idx) => (
                <li key={idx}>{formatWithPronunciation(obj)}</li>
              ))}
            </ul>
          </div>
        )
      },
      {
        key: 'points',
        title: t('grammarPoints', { ns: 'grammar' }),
        render: () => (
          <div className="lm-section">
            {topic.sub_topics?.map((sub, idx) => (
              <div className="lm-subtopic" key={idx}>
                <h4>{sub.name?.[langKey] || sub.name?.en}</h4>
                {sub.explanation?.[langKey] && (
                  <p className="lm-explanation">
                    {formatWithPronunciation(sub.explanation[langKey])}
                  </p>
                )}
                {sub.content?.head?.[langKey]?.length > 0 && (
                  <div className="lm-table">
                    <div className="lm-table-head">
                      {sub.content.head[langKey].map((h, i) => (
                        <div key={i}>{formatWithPronunciation(h)}</div>
                      ))}
                    </div>
                    <div className="lm-table-body">
                      {sub.content.body?.map((row, rIdx) => (
                        <div className="lm-table-row" key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <div
                              key={cIdx}
                              data-label={
                                sub.content.head?.[langKey]?.[cIdx] || 
                                sub.content.head?.en?.[cIdx] || ''
                              }
                            >
                              {formatWithPronunciation(cell)}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      },
      {
        key: 'examples',
        title: t('exampleSentences', { ns: 'grammar' }),
        render: () => (
          <div className="lm-section">
            <ol className="lm-examples">
              {topic.example_sentences?.map((ex, idx) => {
                const rawText = typeof ex === 'string' ? ex : 
                               Array.isArray(ex) ? ex.join(' ') : 
                               String(ex ?? '');
                return (
                  <li key={idx}>
                    <span className="lm-example-text">
                      {formatWithPronunciation(ex)}
                    </span>
                    <div className="lm-example-actions">
                      <InfoTooltip content={t('listen', { ns: 'grammar' })}>
                        <button
                          type="button"
                          className="lm-icon-btn"
                          onClick={(e) => handleSpeedClick(e, rawText, 'en')}
                          aria-label={t('listen', { ns: 'grammar' })}
                          data-speed={SPEED_LEVELS.NORMAL.toString()}
                        >
                          <MdVolumeUp />
                        </button>
                      </InfoTooltip>
                      <InfoTooltip content={t('translateSentence', { ns: 'grammar' })}>
                        <a
                          className="lm-icon-btn lm-example-translate"
                          href={createTranslateUrl(rawText)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t('translateSentence', { ns: 'grammar' })}
                        >
                          <MdTranslate />
                        </a>
                      </InfoTooltip>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )
      },
      {
        key: 'mistakes',
        title: t('commonMistakes', { ns: 'grammar' }),
        render: () => (
          <div className="lm-section">
            <ul className="lm-mistakes">
              {topic.common_mistakes?.[langKey]?.map((m, idx) => {
                const { wrong, right } = splitMistake(m);
                const rawText = typeof m === 'string' ? m : String(m ?? '');
                const speakText = right?.trim() || wrong;
                
                return (
                  <li key={idx}>
                    <div className="lm-mistake-content">
                      <span className="lm-mistake-bad">
                        {formatWithPronunciation(wrong)}
                      </span>
                      {right && (
                        <>
                          <span className="lm-mistake-sep" aria-hidden>→</span>
                          <span className="lm-mistake-good">
                            {formatWithPronunciation(right)}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="lm-mistake-actions">
                      <InfoTooltip content={t('listen', { ns: 'grammar' })}>
                        <button
                          type="button"
                          className="lm-icon-btn"
                          onClick={(e) => handleSpeedClick(e, speakText, 'en')}
                          aria-label={t('listen', { ns: 'grammar' })}
                          data-speed={SPEED_LEVELS.NORMAL.toString()}
                        >
                          <MdVolumeUp />
                        </button>
                      </InfoTooltip>
                      <InfoTooltip content={t('translateSentence', { ns: 'grammar' })}>
                        <a
                          className="lm-icon-btn lm-mistake-translate"
                          href={createTranslateUrl(rawText)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t('translateSentence', { ns: 'grammar' })}
                        >
                          <MdTranslate />
                        </a>
                      </InfoTooltip>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )
      },
      {
        key: 'practice',
        title: t('practiceActivities', { ns: 'grammar' }),
        render: () => (
          <PracticePanel
            topic={topic}
            langKey={langKey}
            onAllRevealedChange={setPracticeAllRevealed}
            onProgressChange={handleProgressChange}
            onSpeak={handleSpeak}
          />
        )
      }
    ];
  }, [topic, langKey, t, shouldEnablePronunciation, handleSpeak, splitMistake, handleSpeedClick]);

  // Navigation handlers
  const navigate = useCallback((direction) => {
    setIndex(prevIndex => {
      const newIndex = prevIndex + direction;
      return Math.max(0, Math.min(newIndex, slides.length - 1));
    });
  }, [slides.length]);

  const goTo = useCallback((targetIndex) => {
    setIndex(Math.max(0, Math.min(targetIndex, slides.length - 1)));
  }, [slides.length]);

  // Handle finish action
  const handleFinish = useCallback(async () => {
    try { setIsLoading(true); } catch (_) {}
    setIsFinishing(true);
    
    // Show loading state to user
    const loadingToast = showSyncProgressToast(showToast, t, 'saving', { 
      namespace: 'grammar', 
      defaultValue: 'Saving results...' 
    });
    
    const base = latestProgressRef.current || progress || DEFAULT_PROGRESS;
    const attemptNumber = (base?.attemptsTotal || 0) + 1;
    const currentCorrect = Math.max(0, Math.min(100, Number(base?.correctPercent || 0)));
    const prevBest = Math.max(0, Math.min(100, Number(base?.bestCorrectPercent || 0)));

    const isNewBest = currentCorrect > prevBest;
    let updatedProgress = {
      ...base,
      completed: true,
      completedAt: new Date().toISOString(),
      attemptsTotal: attemptNumber,
      bestCorrectPercent: isNewBest ? currentCorrect : prevBest,
      bestAchievedAtAttempt: isNewBest ? attemptNumber : (progress?.bestAchievedAtAttempt || (prevBest > 0 ? 1 : 0)),
    };

    // Merge in per-type aggregates and bestByType from the aggregated key so authed sync has full data
    try {
      if (storageKey) {
        const existing = await EnhancedStorage.get(storageKey);
        if (existing && typeof existing === 'object') {
          if (existing.types && typeof existing.types === 'object') {
            updatedProgress = { ...updatedProgress, types: { ...(updatedProgress.types || {}), ...existing.types } };
          }
          if (existing.bestByType && typeof existing.bestByType === 'object') {
            updatedProgress = { ...updatedProgress, bestByType: { ...(updatedProgress.bestByType || {}), ...existing.bestByType } };
          }
        }
      }
    } catch (e) { 
      console.warn('LearnMode: Failed to merge from aggregated key:', e);
    }

    // Also merge from the current session state as a last-mile source of latest per-type progress
    try {
      if (sessionKey) {
        const session = await EnhancedStorage.get(sessionKey);
        if (session && typeof session === 'object') {
          if (session.types && typeof session.types === 'object') {
            updatedProgress = { ...updatedProgress, types: { ...(updatedProgress.types || {}), ...session.types } };
          }
          if (session.bestByType && typeof session.bestByType === 'object') {
            updatedProgress = { ...updatedProgress, bestByType: { ...(updatedProgress.bestByType || {}), ...session.bestByType } };
          }
        }
      }
    } catch (e) { 
      console.warn('LearnMode: Failed to merge from session key:', e);
    }

    const saved = await setProgress(updatedProgress, { sync: true, metadata: { trigger: 'finish' } });
    if (saved) {
      // Update complete user data mirror with grammar progress
      try {
        const progressEntry = {
          progress: {
            totalItems: updatedProgress.totalItems,
            revealedCount: updatedProgress.revealedCount,
            correctCount: updatedProgress.correctCount,
            completionPercent: updatedProgress.completionPercent,
            correctPercent: updatedProgress.correctPercent,
          },
          stats: {
            completed: updatedProgress.completed,
            attemptsTotal: updatedProgress.attemptsTotal,
            bestCorrectPercent: updatedProgress.bestCorrectPercent,
            bestAchievedAtAttempt: updatedProgress.bestAchievedAtAttempt,
          }
        };
        
        await queueGrammarProgressUpdate(topic.id, progressEntry, { 
          priority: 'high', 
          metadata: { trigger: 'practice_finish', topicId: topic.id } 
        });
        
        // Clear grammar data cache to force fresh data fetch
        try {
          await clearGrammarDataCache();
        } catch (e) {
          console.warn('LearnMode: Failed to clear grammar data cache:', e);
        }
      } catch (e) {
        console.warn('LearnMode: Failed to update UDM with grammar progress:', e);
      }

      // Immediately notify UI about updated progress (attempts/percent)
      try {
        window.dispatchEvent(new CustomEvent('grammar-progress-updated', {
          detail: {
            topicId: topic.id,
            progress: updatedProgress
          }
        }));
      } catch (_) { }

      // ALWAYS dispatch immediate refresh event regardless of sync status
      try {
        window.dispatchEvent(new CustomEvent('grammar-immediate-refresh', {
          detail: { topicId: topic.id, progress: updatedProgress }
        }));
      } catch (_) { }

      // Try immediate sync and wait for it to complete
      try {
        const ok = await forceSync?.();
        if (ok) {
          showSyncSuccessToast(showToast, t, 'synced', { 
            namespace: 'grammar', 
            defaultValue: 'Synced to cloud' 
          });

          // Dispatch event to refresh user data mirror for authenticated users
          // Add detail to prevent infinite loops in event listeners
          try {
            window.dispatchEvent(new CustomEvent('user-data-refreshed', {
              detail: { 
                source: 'grammar_sync',
                isProfileTriggered: false,
                preventCascade: true 
              }
            }));
          } catch (_) { }

          // Guests only: update localStorage-based UI
          if (!isAuthenticated && typeof window !== 'undefined' && window.localStorage) {
            try {
              const storageKey = `grammar_progress_${topic.id}`;
              const oldValue = window.localStorage.getItem(storageKey);
              window.localStorage.setItem(storageKey, JSON.stringify(updatedProgress));
              // Trigger storage event for other components to pick up
              window.dispatchEvent(new StorageEvent('storage', {
                key: storageKey,
                oldValue,
                newValue: JSON.stringify(updatedProgress),
                storageArea: window.localStorage
              }));
            } catch (_) {}
          }
          
        } else {
          showSyncErrorToast(showToast, t, 'saveFailed', { 
            namespace: 'grammar', 
            defaultValue: 'Save failed' 
          });
        }
      } catch (e) {
        showSyncErrorToast(showToast, t, 'saveFailed', { 
          namespace: 'grammar', 
          defaultValue: 'Save failed' 
        });
      }
      
      try { await getSyncStatus?.(); } catch { }
    } else {
      showSyncErrorToast(showToast, t, 'saveFailed', { 
        namespace: 'grammar', 
        defaultValue: 'Save failed' 
      });
    }

    try { manualStop(); } catch (_) {}
    
    // Small delay to ensure user sees the success message
    setTimeout(() => {
      handleClose();
      try { setIsLoading(false); } catch (_) {}
      setIsFinishing(false);
    }, 1000);
    
  }, [progress, setProgress, forceSync, getSyncStatus, manualStop, topic?.id, t, showToast, isAuthenticated]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          handleClose();
          break;
        case 'ArrowRight':
          navigate(1);
          break;
        case 'ArrowLeft':
          navigate(-1);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Don't render if no topic
  if (!topic) return null;

  const currentSlide = slides[index];
  const isPracticeSlide = currentSlide?.key === 'practice';

  const handleClose = useCallback(() => {
    try { manualStop(); } catch (_) {}
    onClose?.();
  }, [manualStop, onClose]);

  return createPortal(
    <div 
      className="learnmode-overlay" 
      role="dialog" 
      aria-modal="true" 
      aria-label={t('title', { ns: 'grammar' })}
    >
      <button 
        className="lm-close" 
        onClick={handleClose} 
        aria-label={t('close', { ns: 'grammar' })}
      >
        <FaTimes />
      </button>

      <LearnModeHeader 
        topic={topic} 
        slides={slides} 
        index={index} 
        goTo={goTo} 
        isPracticeSlide={isPracticeSlide} 
      />
      
      {storageKey && syncStatus && (() => {
        // Detect auth for gating the sync status UI for guests
        let isAuthenticated = false;
        try {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
          const user = raw ? JSON.parse(raw) : null;
          isAuthenticated = !!(user && (user.token || user.accessToken || user.idToken));
        } catch (_) { isAuthenticated = false; }

        // Only show for authenticated users (offline or with queue activity)
        if (!isAuthenticated) return null;

        // Show banner only when offline; hide at all other times
        const show = (syncStatus.isOnline === false);
        if (!show) return null;

        return (
        <div className="learnmode-sync-status">
          {/* Simple status indicator */}
          <div className="status-indicator">
            <div className="status-icon offline">
              <FaWifi className="icon" />
            </div>
          </div>
          
          <span className="sync-text">
            {t('offline', { ns: 'grammar' })}
          </span>
          
          {/* Retry button for failed operations */}
          {/* Hidden in offline-only mode to reduce UI noise */}
        </div>
        );
      })()}

      <LearnModeContent 
        containerRef={containerRef} 
        title={currentSlide?.title} 
        render={currentSlide?.render} 
      />

      <LearnModeFooter
        topicId={topic.id}
        total={slides.length}
        index={index}
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        isPracticeSlide={isPracticeSlide}
        progress={progress}
        showFinish={practiceAllRevealed}
        onFinish={handleFinish}
        isFinishing={isFinishing}
      />
      
      {/* Loading overlay during finish action */}
      {isFinishing && (
        <div className="lm-loading-overlay" aria-live="polite">
          <div className="lm-loading-content">
            <div className="lm-loading-spinner"></div>
                         <p className="lm-loading-text">
               {t('saving', { ns: 'grammar', defaultValue: 'Saving results...' })}
             </p>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default LearnMode;