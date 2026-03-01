"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaKeyboard,
    FaClock,
    FaStar,
    FaTrophy,
    FaPlay,
    FaRedo,
    FaCheck,
    FaTimes,
    FaCog,
    FaPause,
    FaVolumeUp
} from 'react-icons/fa';
import { GiSpeedometer } from 'react-icons/gi';
import ProgressBar from './ProgressBar';
import InfoTooltip from '@/components/common/InfoTooltip';
import './styles/speed-mode/main.scss';

// Constants for better maintainability
const WORD_COUNT_OPTIONS = [25, 50, 100, 200];
const TIMER_INTERVAL = 100;
const WORD_COMPLETION_DELAY = 100;
const INPUT_FOCUS_DELAY = 50;
const ERROR_DISPLAY_DURATION = 200;

// Game states enum for better type safety
const GAME_STATES = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    PAUSED: 'paused',
    COMPLETE: 'complete'
};

// Score calculation constants
const BASE_WORD_SCORE = 10;
const STREAK_BONUS_MULTIPLIER = 2;
const WPM_BONUS_MULTIPLIER = 2;
const ACCURACY_BONUS_MULTIPLIER = 0.5;

const SpeedMode = ({
    words,
    langKey,
    difficulty
}) => {
    const { t, i18n } = useTranslation(['vocabulary']);

    // Game state management
    const [gameState, setGameState] = useState(GAME_STATES.WAITING);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [typedText, setTypedText] = useState('');

    // Score and statistics
    const [score, setScore] = useState(0);
    const [correctWords, setCorrectWords] = useState(0);
    const [incorrectWords, setIncorrectWords] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [wpm, setWpm] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [finalScore, setFinalScore] = useState(0);
    const [isNewRecord, setIsNewRecord] = useState(false);

    // Game configuration
    const [gameWords, setGameWords] = useState([]);
    const [wordCount, setWordCount] = useState(50);

    // Timing and performance tracking
    const [startTime, setStartTime] = useState(null);
    const [accumulatedTime, setAccumulatedTime] = useState(0); // seconds accumulated across pauses
    const [totalTypedCharacters, setTotalTypedCharacters] = useState(0);
    const [correctCharacters, setCorrectCharacters] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [showError, setShowError] = useState(false);

    // Refs
    const inputRef = useRef(null);
    const timerRef = useRef(null);
    const errorTimeoutRef = useRef(null);

    // Handle locale changes - force re-render when language changes
    useEffect(() => {
        const handleLanguageChanged = () => {
            // Force re-render by updating a state that doesn't affect game logic
            setCurrentWordIndex(prev => prev);
        };

        // Listen for language changes
        i18n.on('languageChanged', handleLanguageChanged);

        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, [i18n]);

    // Force re-render when i18n language changes (for UI translations)
    useEffect(() => {
        // This effect ensures the component re-renders when the language changes
        // even if no game is in progress
    }, [i18n.language]);

    // Memoized high score storage key
    const highScoreKey = useMemo(() => `speed-high-score-${difficulty}`, [difficulty]);
    const currentUiLanguage = useMemo(() => i18n.language?.split('-')[0] || 'en', [i18n.language]);

        // Generate game words with definitions - optimized with useMemo for expensive operations
    const generateGameWords = useCallback(() => {
        if (!words || words.length === 0) return [];

        const shuffledWords = [...words].sort(() => Math.random() - 0.5);
        return shuffledWords.slice(0, Math.min(wordCount, words.length)).map(word => {
            // Always use English definitions initially, we'll update them later if needed
            let definition = word.translation?.en || word.word;
            let secondaryTranslation = word.translation?.ru || word.translation?.uz;
            
            return {
                id: word.id,
                word: word.word,
                definition: definition,
                translation: secondaryTranslation,
                topic: word.topicName || word.topic || '',
                pronunciation: word.pronunciation
            };
        });
    }, [words, wordCount]);



    // Memoized current word to prevent unnecessary re-renders
    const currentWord = useMemo(() => {
        const word = gameWords[currentWordIndex];
        if (!word) return null;
        
        // Get current language from i18n
        const currentLanguage = i18n.language?.split('-')[0] || 'en';
        
        // Dynamically get the correct definition and word to type based on current language
        const originalWord = words.find(w => w.id === word.id);
        if (!originalWord) return word;
        
        let definition, wordToType, secondaryTranslation;
        
        if (currentLanguage === 'en') {
            // For English interface: show English definition, type English word
            definition = originalWord.translation?.en || originalWord.word;
            wordToType = originalWord.word; // Always type the English word
            secondaryTranslation = originalWord.translation?.ru || originalWord.translation?.uz;
        } else {
            // For non-English interface: show definition in current language, type English word
            definition = originalWord.translation?.[currentLanguage] || originalWord.translation?.en || originalWord.word;
            wordToType = originalWord.word; // Always type the English word
            secondaryTranslation = originalWord.translation?.en;
        }
        
        return {
            ...word,
            word: wordToType, // The word user should type
            definition: definition, // The definition/translation shown at top
            translation: secondaryTranslation,
            topic: originalWord.topicName || originalWord.topic || word.topic || ''
        };
    }, [gameWords, currentWordIndex, words, i18n.language]);

    // Memoized progress percentage
    const progressPercentage = useMemo(() => {
        if (gameWords.length === 0) return 0;
        return (currentWordIndex / gameWords.length) * 100;
    }, [currentWordIndex, gameWords.length]);

    // Focus input with error handling
    const focusInput = useCallback((delay = 0) => {
        setTimeout(() => {
            if (inputRef.current) {
                try {
                    inputRef.current.focus();
                } catch (error) {
                    console.warn(t('error.focusInputError', { ns: 'vocabulary' }), error);
                }
            }
        }, delay);
    }, []);

    // Show error feedback with cleanup
    const showErrorFeedback = useCallback(() => {
        setShowError(true);

        // Clear existing timeout
        if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
        }

        errorTimeoutRef.current = setTimeout(() => {
            setShowError(false);
        }, ERROR_DISPLAY_DURATION);
    }, []);

    // Calculate final statistics - optimized with useCallback
    const calculateFinalStats = useCallback((finalTime) => {
        const finalWpm = Math.round((correctWords / Math.max(finalTime, 0.1)) * 60);
        const finalAccuracy = Math.round((correctCharacters / Math.max(totalTypedCharacters, 1)) * 100);

        setWpm(finalWpm);

        // Compute final score including bonuses
        const computedFinalScore = Math.round(score + (finalWpm * WPM_BONUS_MULTIPLIER) + (finalAccuracy * ACCURACY_BONUS_MULTIPLIER));
        setFinalScore(computedFinalScore);
        const isRecord = computedFinalScore > highScore;
        setIsNewRecord(isRecord);
        if (isRecord) {
            setHighScore(computedFinalScore);
            try {
                localStorage.setItem(highScoreKey, computedFinalScore.toString());
            } catch (error) {
                console.warn(t('error.saveHighScoreError', { ns: 'vocabulary' }), error);
            }
        }
    }, [correctWords, correctCharacters, totalTypedCharacters, score, highScore, highScoreKey, t]);

    // Initialize game - optimized with better state management
    const initializeGame = useCallback(() => {
        const newGameWords = generateGameWords();

        if (newGameWords.length === 0) {
            console.warn(t('speed.noWordsAvailable'));
            return;
        }

        // Batch state updates to prevent multiple re-renders
        setGameWords(newGameWords);
        setCurrentWordIndex(0);
        setTypedText('');
        setScore(0);
        setCorrectWords(0);
        setIncorrectWords(0);
        setTimeElapsed(0);
        setWpm(0);
        setStartTime(null);
        setAccumulatedTime(0);
        setTotalTypedCharacters(0);
        setCorrectCharacters(0);
        setCurrentStreak(0);
        setMaxStreak(0);
        setGameState(GAME_STATES.PLAYING);

        // Focus input after state updates
        focusInput(INPUT_FOCUS_DELAY);
    }, [generateGameWords, focusInput]);

    // Handle typing - optimized with better validation and error handling
    const handleTyping = useCallback((e) => {
        if (gameState !== GAME_STATES.PLAYING || !currentWord) return;

        const value = e.target.value;

        // Prevent typing beyond word length
        if (value.length > currentWord.word.length) {
            e.target.value = typedText;
            return;
        }

        // Start timer on first keystroke
        if (!startTime) {
            setStartTime(Date.now());
        }

        // Character-by-character validation (case-insensitive)
        const expectedChar = currentWord.word[value.length - 1];
        const typedChar = value[value.length - 1];

        // Only allow typing if the character is correct (case-insensitive)
        if (expectedChar && typedChar && typedChar.toLowerCase() === expectedChar.toLowerCase()) {
            setTypedText(value);
            setCorrectCharacters(prev => prev + 1);

            // Check if word is complete (case-insensitive)
            if (value.toLowerCase() === currentWord.word.toLowerCase()) {
                // Correct word
                setCorrectWords(prev => prev + 1);
                setScore(prev => prev + BASE_WORD_SCORE + (currentStreak * STREAK_BONUS_MULTIPLIER));
                setCurrentStreak(prev => {
                    const newStreak = prev + 1;
                    setMaxStreak(prevMax => Math.max(prevMax, newStreak));
                    return newStreak;
                });

                // Move to next word
                setTimeout(() => {
                    setTypedText('');
                    if (currentWordIndex < gameWords.length - 1) {
                        setCurrentWordIndex(prev => prev + 1);
                        focusInput(INPUT_FOCUS_DELAY);
                    } else {
                        // Game complete
                        const finalTime = (startTime ? (Date.now() - startTime) / 1000 : 0) + (accumulatedTime || 0);
                        setTimeElapsed(finalTime);
                        calculateFinalStats(finalTime);
                        setGameState(GAME_STATES.COMPLETE);
                    }
                }, WORD_COMPLETION_DELAY);
            }
        } else {
            // Wrong character - don't update typed text, but count as error
            setIncorrectWords(prev => prev + 1);
            setCurrentStreak(0);
            showErrorFeedback();
            // Reset input value to prevent wrong character display
            e.target.value = typedText;
        }

        setTotalTypedCharacters(prev => prev + 1);
    }, [gameState, currentWord, startTime, currentStreak, typedText, currentWordIndex, gameWords.length, calculateFinalStats, showErrorFeedback, focusInput]);



    // Timer effect - optimized with proper cleanup
    useEffect(() => {
        if (gameState === GAME_STATES.PLAYING && startTime) {
            timerRef.current = setInterval(() => {
                const baseElapsed = (Date.now() - startTime) / 1000;
                const elapsed = (accumulatedTime || 0) + baseElapsed;
                setTimeElapsed(elapsed);

                // Calculate real-time WPM
                if (elapsed > 0) {
                    const currentWpm = Math.round((correctWords / elapsed) * 60);
                    setWpm(currentWpm);
                }
            }, TIMER_INTERVAL);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [gameState, startTime, correctWords, accumulatedTime]);

    // Load high score from localStorage - optimized with error handling
    useEffect(() => {
        try {
            const savedHighScore = localStorage.getItem(highScoreKey);
            if (savedHighScore) {
                const parsedScore = parseFloat(savedHighScore);
                if (!isNaN(parsedScore)) {
                    setHighScore(parsedScore);
                }
            }
        } catch (error) {
            console.warn(t('error.loadHighScoreError', { ns: 'vocabulary' }), error);
        }
    }, [highScoreKey]);

    // Handle keyboard shortcuts - optimized with better event handling
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Prevent shortcuts when typing in input
            if (e.target === inputRef.current) return;

            switch (e.key) {
                case 'Escape':
                    if (gameState === GAME_STATES.PLAYING) {
                        // Pause handler: accumulate elapsed and stop timer
                        setAccumulatedTime(prev => prev + ((Date.now() - (startTime || Date.now())) / 1000));
                        setStartTime(null);
                        setGameState(GAME_STATES.PAUSED);
                    } else if (gameState === GAME_STATES.COMPLETE) {
                        // Close complete modal
                        setGameState(GAME_STATES.WAITING);
                    }
                    break;
                case ' ':
                    if (gameState === GAME_STATES.PAUSED) {
                        e.preventDefault();
                        setStartTime(Date.now());
                        setGameState(GAME_STATES.PLAYING);
                        focusInput();
                    }
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, focusInput]);

    // Auto-pause when tab is hidden to prevent time drift
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && gameState === GAME_STATES.PLAYING) {
                setAccumulatedTime(prev => prev + ((Date.now() - (startTime || Date.now())) / 1000));
                setStartTime(null);
                setGameState(GAME_STATES.PAUSED);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [gameState, startTime]);

    // Cleanup effect for timeouts
    useEffect(() => {
        return () => {
            if (errorTimeoutRef.current) {
                clearTimeout(errorTimeoutRef.current);
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    // Word count selector component
    const WordCountSelector = useMemo(() => (
        <div className="setting-group">
            <label>{t('speed.wordCount')}</label>
            <div className="word-count-selector">
                {WORD_COUNT_OPTIONS.map(count => (
                    <button
                        key={count}
                        className={`count-btn ${wordCount === count ? 'active' : ''}`}
                        onClick={() => setWordCount(count)}
                    >
                        {count}
                    </button>
                ))}
            </div>
        </div>
    ), [wordCount, t]);



    // Waiting state render
    if (gameState === GAME_STATES.WAITING) {
        return (
            <div className="speed-mode">
                <div className="game-intro">
                    <div className="intro-content">
                        <FaKeyboard className="intro-icon" />
                        <h2>{t('speed.title')}</h2>
                        <p>{t('speed.typingInstructions')}</p>

                        <div className="game-settings">
                            {WordCountSelector}
                        </div>

                        <div className="intro-stats-section">
                            <div className="stat-item">
                                <FaStar className="stat-icon" />
                                <div className="stat-content">
                                    <span className="stat-value">{Math.round(highScore)}</span>
                                    <span className="stat-label">{t('speed.highScore')}</span>
                                </div>
                            </div>
                        </div>

                        <button className="start-game-btn" onClick={initializeGame}>
                            <FaPlay />
                            {t('speed.startGame')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Paused state render
    if (gameState === GAME_STATES.PAUSED) {
        return (
            <div className="speed-mode paused">
                <div className="pause-overlay">
                    <div className="pause-content">
                        <button
                            type="button"
                            aria-label={t('close', { ns: 'common' })}
                            className="close-modal-btn"
                            onClick={() => setGameState(GAME_STATES.WAITING)}
                        >
                            <FaTimes />
                        </button>
                        <FaPause className="pause-icon" />
                        <h3>{t('speed.paused')}</h3>
                        <p>{t('speed.pauseInstructions')}</p>
                        <button className="resume-btn" onClick={() => {
                            setStartTime(Date.now());
                            setGameState(GAME_STATES.PLAYING);
                            focusInput();
                        }}>
                            <FaPlay />
                            {t('speed.resume')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="speed-mode">
            {/* Game Header */}
            <div className="game-header">
                <div className="header-main">
                    <div className="header-left">
                        <div className="title-section">
                            <FaKeyboard className="title-icon" />
                            <div className="title-content">
                                <h2>{t('speed.title')}</h2>
                                <p className="subtitle">{t('speed.typingInstructions')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="header-right">
                        <button 
                            className="control-btn secondary" 
                            onClick={() => {
                                if (gameState === GAME_STATES.PLAYING) {
                                    setAccumulatedTime(prev => prev + ((Date.now() - (startTime || Date.now())) / 1000));
                                    setStartTime(null);
                                    setGameState(GAME_STATES.PAUSED);
                                }
                            }}
                        >
                            <FaPause className="btn-icon" />
                            <span className="btn-text">{t('speed.pause')}</span>
                        </button>
                        <button 
                            className="control-btn primary" 
                            onClick={() => {
                                if (timerRef.current) {
                                    clearInterval(timerRef.current);
                                    timerRef.current = null;
                                }
                                setStartTime(null);
                                setAccumulatedTime(0);
                                setGameState(GAME_STATES.WAITING);
                            }}
                        >
                            <FaRedo className="btn-icon" />
                            <span className="btn-text">{t('speed.newGame')}</span>
                        </button>
                    </div>
                </div>

                {/* Separated Stats Section - Full Width */}
                <div className="stats-section">
                    <InfoTooltip 
                        content={t('speed.tooltips.time')}
                        position="top"
                    >
                        <div className="stat-item">
                            <FaClock className="stat-icon" />
                            <div className="stat-content">
                                <span className="stat-value">{Math.round(timeElapsed)}s</span>
                                <span className="stat-label">{t('speed.timeLabel')}</span>
                            </div>
                        </div>
                    </InfoTooltip>
                    
                    <InfoTooltip 
                        content={t('speed.tooltips.wpm')}
                        position="top"
                    >
                        <div className="stat-item">
                            <GiSpeedometer className="stat-icon" />
                            <div className="stat-content">
                                <span className="stat-value">{wpm}</span>
                                <span className="stat-label">{t('speed.wpmLabel')}</span>
                            </div>
                        </div>
                    </InfoTooltip>
                    
                    <InfoTooltip 
                        content={t('speed.tooltips.score')}
                        position="top"
                    >
                        <div className="stat-item">
                            <FaStar className="stat-icon" />
                            <div className="stat-content">
                                <span className="stat-value">{score}</span>
                                <span className="stat-label">{t('speed.scoreLabel')}</span>
                            </div>
                        </div>
                    </InfoTooltip>
                    
                    <InfoTooltip 
                        content={t('speed.tooltips.correct')}
                        position="top"
                    >
                        <div className="stat-item">
                            <FaCheck className="stat-icon" />
                            <div className="stat-content">
                                <span className="stat-value">{correctWords}</span>
                                <span className="stat-label">{t('speed.correctLabel')}</span>
                            </div>
                        </div>
                    </InfoTooltip>
                    
                    <InfoTooltip 
                        content={t('speed.tooltips.errors')}
                        position="top"
                    >
                        <div className="stat-item">
                            <FaTimes className="stat-icon" />
                            <div className="stat-content">
                                <span className="stat-value">{incorrectWords}</span>
                                <span className="stat-label">{t('speed.errorsLabel')}</span>
                            </div>
                        </div>
                    </InfoTooltip>
                    
                    <InfoTooltip 
                        content={t('speed.tooltips.streak')}
                        position="top"
                    >
                        <div className="stat-item">
                            <FaTrophy className="stat-icon" />
                            <div className="stat-content">
                                <span className="stat-value">{currentStreak}</span>
                                <span className="stat-label">{t('speed.streakLabel')}</span>
                            </div>
                        </div>
                    </InfoTooltip>
                </div>

                <div className="progress-section">
                    <ProgressBar
                        progress={progressPercentage}
                        label={`${currentWordIndex + 1} / ${gameWords.length}`}
                    />
                </div>
            </div>

            {/* Game Content */}
            <div className="game-content">
                {currentWord && (
                    <div className="game-card">
                        {/* Definition Section */}
                        <div className="definition-section">
                            <div className="definition-content">
                                <h3 className="definition-text">
                                    {currentWord.definition}
                                </h3>

                                {currentWord.translation && currentUiLanguage !== 'en' && (
                                    <div className="translation-container">
                                        <span className="translation-badge">
                                            {currentWord.translation}
                                        </span>
                                    </div>
                                )}

                                {currentWord.pronunciation && (
                                    <div className="pronunciation">
                                        <FaVolumeUp />
                                        <span>{currentWord.pronunciation}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Typing Section */}
                        <div className="typing-section">
                            <div className={`typing-area ${showError ? 'error' : ''}`}>
                                <div className="word-display" aria-live="polite" aria-atomic="true">
                                    <span className="typed-text">{typedText}</span>
                                    <span className="remaining-text">
                                        {currentWord.word.slice(typedText.length)}
                                    </span>
                                    <span className="cursor">|</span>
                                </div>

                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={typedText}
                                    onChange={handleTyping}
                                    placeholder={t('speed.typeHere')}
                                    className="typing-input"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
                                />

                                {/* Subtle typing hint */}
                                {typedText.length === 0 && (
                                    <div className="typing-hint">
                                        <FaKeyboard />
                                        <span>{t('speed.startTyping')}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Topic Badge */}
                        <div className="topic-section">
                            <span className="topic-badge">{currentWord.topic}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Game Complete Modal */}
            <AnimatePresence>
                {gameState === GAME_STATES.COMPLETE && (
                    <motion.div
                        className="game-complete-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="speed-mode-complete-title"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="modal-content"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <button
                                type="button"
                                aria-label={t('close', { ns: 'common' }) || 'Close'}
                                className="close-modal-btn"
                                onClick={() => setGameState(GAME_STATES.WAITING)}
                            >
                                <FaTimes />
                            </button>
                            <FaKeyboard className="keyboard-icon" />
                            <h3 id="speed-mode-complete-title">{t('speed.gameComplete')}</h3>

                            <div className="final-stats">
                                <InfoTooltip
                                    content={t('speed.tooltips.wpm')}
                                    position="top"
                                >
                                    <div className="stat">
                                        <GiSpeedometer />
                                        <span>{t('speed.finalWpm')}: {wpm}</span>
                                    </div>
                                </InfoTooltip>
                                <InfoTooltip
                                    content={t('speed.tooltips.score')}
                                    position="top"
                                >
                                    <div className="stat">
                                        <FaStar />
                                        <span>{t('speed.finalScore')}: {finalScore}</span>
                                    </div>
                                </InfoTooltip>
                                <InfoTooltip
                                    content={t('speed.tooltips.errors')}
                                    position="top"
                                >
                                    <div className="stat">
                                        <FaTimes />
                                        <span>{t('speed.incorrect')}: {incorrectWords}</span>
                                    </div>
                                </InfoTooltip>
                                <InfoTooltip
                                    content={t('speed.tooltips.streak')}
                                    position="top"
                                >
                                    <div className="stat">
                                        <FaTrophy />
                                        <span>{t('speed.maxStreak')}: {maxStreak}</span>
                                    </div>
                                </InfoTooltip>
                            </div>

                            {isNewRecord && (
                                <div className="new-record">
                                    <FaTrophy />
                                    <span>{t('speed.newHighScore')}!</span>
                                </div>
                            )}

                            <div className="action-buttons">
                                <button className="play-again-btn" onClick={initializeGame}>
                                    <FaPlay />
                                    {t('speed.playAgain')}
                                </button>
                                <button className="back-btn" onClick={() => setGameState(GAME_STATES.WAITING)}>
                                    <FaCog />
                                    {t('speed.changeSettings')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SpeedMode;