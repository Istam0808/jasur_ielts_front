"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FaRedo, 
    FaClock, 
    FaStar, 
    FaTrophy, 
    FaPlay, 
    FaTimes, 
    FaCheck, 
    FaLightbulb,
    FaVolumeUp,
    FaVolumeMute,
    FaSyncAlt,
    FaMobile,
    FaTablet,
} from 'react-icons/fa';
import { GiTargetArrows } from 'react-icons/gi';
import { BiTargetLock } from 'react-icons/bi';

import './styles/matching-game/main.scss';
import PairSlider from './PairSlider';
import InfoTooltip from '@/components/common/InfoTooltip';
import Modal from '@/components/common/Modal';

// Game constants
const GAME_STATES = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    COMPLETE: 'complete'
};

const DRAG_STATES = {
    IDLE: 'idle',
    DRAGGING: 'dragging',
    DROPPED: 'dropped'
};

const MATCH_STATES = {
    UNMATCHED: 'unmatched',
    MATCHED: 'matched',
    INCORRECT: 'incorrect'
};

// Game configuration
const MIN_PAIRS_PER_GAME = 5;
const MAX_PAIRS_PER_GAME = 20;
const HINT_DISPLAY_DURATION = 3000;
const INCORRECT_MATCH_DISPLAY_DURATION = 1000;
const TOUCH_MOVEMENT_THRESHOLD = 10;
const HINT_ANIMATION_DURATION = 600;

// Audio context singleton to avoid memory leaks
let audioContext = null;
let audioContextResumed = false;
let audioBuffers = null;

const getAudioContext = () => {
    if (!audioContext && (window.AudioContext || window.webkitAudioContext)) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // Resume audio context on first user interaction
        if (audioContext.state === 'suspended') {
            audioContext.resume();
            audioContextResumed = true;
        }
    }
    return audioContext;
};

// Pre-create audio buffers for better performance
const createAudioBuffers = (context) => {
    if (audioBuffers) return audioBuffers;
    
    const sampleRate = context.sampleRate;
    const duration = 0.15; // Reduced to 150ms for faster response
    const length = sampleRate * duration;
    
    audioBuffers = {
        correct: context.createBuffer(1, length, sampleRate),
        incorrect: context.createBuffer(1, length, sampleRate),
        hint: context.createBuffer(1, length, sampleRate)
    };
    
    // Fill correct sound buffer (800Hz sine wave) - optimized for speed
    const correctData = audioBuffers.correct.getChannelData(0);
    for (let i = 0; i < length; i++) {
        correctData[i] = Math.sin(2 * Math.PI * 800 * i / sampleRate) * 0.25;
    }
    
    // Fill incorrect sound buffer (200Hz sawtooth) - optimized for speed
    const incorrectData = audioBuffers.incorrect.getChannelData(0);
    for (let i = 0; i < length; i++) {
        incorrectData[i] = (i % (sampleRate / 200)) / (sampleRate / 200) * 0.2;
    }
    
    // Fill hint sound buffer (800Hz sine wave, lower volume) - optimized for speed
    const hintData = audioBuffers.hint.getChannelData(0);
    for (let i = 0; i < length; i++) {
        hintData[i] = Math.sin(2 * Math.PI * 800 * i / sampleRate) * 0.15;
    }
    
    return audioBuffers;
};

// Sound debouncing to prevent double sounds - with priority system
let lastSoundTime = 0;
const SOUND_DEBOUNCE_MS = 100;
const CORRECT_SOUND_DEBOUNCE_MS = 50; // Faster response for correct answers

const MatchingGame = ({
    words = [],
    langKey = 'en',
    difficulty = 'default',
}) => {
    const { t, i18n, ready } = useTranslation(['vocabulary', 'common']);
    
    // Game state
    const [gameState, setGameState] = useState(GAME_STATES.WAITING);
    const [score, setScore] = useState(0);
    const [matches, setMatches] = useState(0);
    const [totalPairs, setTotalPairs] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [bestTime, setBestTime] = useState(null);
    const [selectedPairs, setSelectedPairs] = useState(10);
    const [tempPairs, setTempPairs] = useState(10);
    const [totalAttempts, setTotalAttempts] = useState(0);
    const [mistakesCount, setMistakesCount] = useState(0);
    
    // UI state
    const [showPairSelectorModal, setShowPairSelectorModal] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [hintCount, setHintCount] = useState(3);
    const [hintedPair, setHintedPair] = useState(null);
    
    // Mobile-specific states
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);
    const [mobileMatchMode, setMobileMatchMode] = useState(false);
    
    // Language change tracking
    const [languageChangeKey, setLanguageChangeKey] = useState(0);
    
    // Drag and drop state
    const [dragState, setDragState] = useState(DRAG_STATES.IDLE);
    const [draggedItem, setDraggedItem] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
    const [matchedPairs, setMatchedPairs] = useState([]);
    const [incorrectMatches, setIncorrectMatches] = useState([]);
    
    // Game data
    const [wordCards, setWordCards] = useState([]);
    const [translationCards, setTranslationCards] = useState([]);
    
    // Refs
    const timerRef = useRef(null);
    const containerRef = useRef(null);
    const touchStartRef = useRef(null);
    const touchEndRef = useRef(null);
    const hintTimeoutRef = useRef(null);
    const incorrectTimeoutsRef = useRef(new Map());
    
    // Memoized values
    const storageKey = useMemo(() => 
        `matching_game_${langKey}_${difficulty}`,
        [langKey, difficulty]
    );

    const accuracy = useMemo(() => {
        if (totalPairs === 0) return 100;
        // Calculate accuracy based on correct matches vs total attempts
        // Each incorrect match counts as a mistake, so accuracy = correct / (correct + mistakes)
        if (totalAttempts === 0) return 100;
        return Math.round((matches / totalAttempts) * 100);
    }, [matches, totalPairs, totalAttempts]);

    const performanceRating = useMemo(() => {
        if (accuracy >= 95) return { text: t('vocabulary:matching.performanceRatings.excellent'), color: '#10B981' }; // Green
        if (accuracy >= 85) return { text: t('vocabulary:matching.performanceRatings.veryGood'), color: '#3B82F6' }; // Blue
        if (accuracy >= 75) return { text: t('vocabulary:matching.performanceRatings.good'), color: '#F59E0B' }; // Yellow
        if (accuracy >= 65) return { text: t('vocabulary:matching.performanceRatings.fair'), color: '#F97316' }; // Orange
        return { text: t('vocabulary:matching.performanceRatings.needsImprovement'), color: '#EF4444' }; // Red
    }, [accuracy, t]);

    const currentLanguage = useMemo(() => 
        i18n.language?.split('-')[0] || 'en',
        [i18n.language]
    );

    // Device detection effect
    useEffect(() => {
        const checkDeviceType = () => {
            const width = window.innerWidth;
            const userAgent = navigator.userAgent.toLowerCase();
            
            // More accurate mobile detection
            const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            
            // Mobile phones: width < 576px OR mobile device with touch
            const isMobilePhone = width < 576 || (isMobileDevice && isTouchDevice && width < 768);
            
            // Tablets: width >= 576px AND < 992px OR touch device that's not mobile phone
            const isTabletDevice = (width >= 576 && width < 992) || (isTouchDevice && !isMobilePhone && width < 992);
            
            setIsMobile(isMobilePhone);
            setIsTablet(isTabletDevice);
        };

        checkDeviceType();
        window.addEventListener('resize', checkDeviceType);
        
        return () => window.removeEventListener('resize', checkDeviceType);
    }, []);

    // Audio context initialization effect
    useEffect(() => {
        const initializeAudioContext = () => {
            if (audioEnabled) {
                const context = getAudioContext();
                if (context && context.state === 'suspended') {
                    context.resume().then(() => {
                        console.log('Audio context resumed successfully');
                        // Pre-warm audio buffers for faster response
                        if (context.state === 'running') {
                            createAudioBuffers(context);
                        }
                    }).catch(err => {
                        console.warn('Failed to resume audio context:', err);
                    });
                }
            }
        };

        // Initialize audio context on first user interaction
        const handleUserInteraction = () => {
            initializeAudioContext();
            document.removeEventListener('touchstart', handleUserInteraction);
            document.removeEventListener('mousedown', handleUserInteraction);
            document.removeEventListener('keydown', handleUserInteraction);
        };

        document.addEventListener('touchstart', handleUserInteraction, { once: true });
        document.addEventListener('mousedown', handleUserInteraction, { once: true });
        document.addEventListener('keydown', handleUserInteraction, { once: true });

        return () => {
            document.removeEventListener('touchstart', handleUserInteraction);
            document.removeEventListener('mousedown', handleUserInteraction);
            document.removeEventListener('keydown', handleUserInteraction);
        };
    }, [audioEnabled]);

    // Load best scores from localStorage
    useEffect(() => {
        try {
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const data = JSON.parse(savedData);
                setBestScore(data.bestScore || 0);
                setBestTime(data.bestTime || null);
            }
        } catch (error) {
            console.warn(t('error.loadMatchingDataError', { ns: 'vocabulary' }), error);
        }
    }, [storageKey]);

    // Sync tempPairs with selectedPairs when modal opens
    useEffect(() => {
        if (showPairSelectorModal) {
            const currentPairs = gameState === GAME_STATES.PLAYING ? totalPairs : selectedPairs;
            setTempPairs(currentPairs);
        }
    }, [showPairSelectorModal, selectedPairs, gameState, totalPairs]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                if (gameState === GAME_STATES.COMPLETE) {
                    setGameState(GAME_STATES.WAITING);
                } else if (showPairSelectorModal) {
                    setShowPairSelectorModal(false);
                }
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [gameState, showPairSelectorModal]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (hintTimeoutRef.current) {
                clearTimeout(hintTimeoutRef.current);
            }
            // Clear all incorrect match timeouts
            incorrectTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
            incorrectTimeoutsRef.current.clear();
            
            // Clean up audio buffers to prevent memory leaks
            if (audioBuffers) {
                audioBuffers = null;
            }
        };
    }, []);

    // Handle language changes
    useEffect(() => {
        const handleLanguageChanged = () => {
            if (gameState === GAME_STATES.PLAYING && wordCards.length > 0) {
                // Get the current language directly from i18n to avoid stale closure
                const currentLang = i18n.language?.split('-')[0] || 'en';
                
                // Update translations for existing cards without changing the word selection
                const newWordCards = wordCards.map(card => {
                    // Find the original word data for this card
                    const originalWord = words.find(word => word.word === card.content);
                    if (originalWord) {
                        const translation = originalWord.translation?.[currentLang] || originalWord.translation?.en || originalWord.word || '';
                        return {
                            ...card,
                            translation: translation
                        };
                    }
                    return card;
                });
                
                const newTranslationCards = translationCards.map(card => {
                    // Find the original word data for this card
                    const originalWord = words.find(word => word.word === card.word);
                    if (originalWord) {
                        const translation = originalWord.translation?.[currentLang] || originalWord.translation?.en || originalWord.word || '';
                        return {
                            ...card,
                            content: translation
                        };
                    }
                    return card;
                });
                
                setWordCards(newWordCards);
                setTranslationCards(newTranslationCards);
                // Force re-render by incrementing the language change key
                setLanguageChangeKey(prev => prev + 1);
            }
            // Force re-render by updating a state that doesn't affect game logic
            setSelectedPairs(prev => prev);
        };

        i18n.on('languageChanged', handleLanguageChanged);
        return () => i18n.off('languageChanged', handleLanguageChanged);
    }, [i18n, gameState, wordCards, translationCards, words, languageChangeKey]);

    // Force re-render when i18n language changes (for UI translations)
    useEffect(() => {
        // This effect ensures the component re-renders when the language changes
        // even if no game is in progress
    }, [i18n.language]);

    // Utility functions
    const formatTime = useCallback((seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const saveBestScores = useCallback((newScore, newTime) => {
        try {
            const data = {
                bestScore: Math.max(bestScore, newScore),
                bestTime: bestTime ? Math.min(bestTime, newTime) : newTime
            };
            localStorage.setItem(storageKey, JSON.stringify(data));
            setBestScore(data.bestScore);
            setBestTime(data.bestTime);
        } catch (error) {
            console.warn(t('error.saveMatchingDataError', { ns: 'vocabulary' }), error);
        }
    }, [bestScore, bestTime, storageKey]);

    // Audio functions - Improved with debouncing and better context management
    const playSound = useCallback((type) => {
        if (!audioEnabled) return;
        
        // Debounce sounds to prevent duplicates - with priority for correct answers
        const now = Date.now();
        const debounceTime = type === 'correct' ? CORRECT_SOUND_DEBOUNCE_MS : SOUND_DEBOUNCE_MS;
        if (now - lastSoundTime < debounceTime) {
            console.log(`Sound ${type} debounced (${now - lastSoundTime}ms since last sound)`);
            return;
        }
        lastSoundTime = now;
        
        console.log(`Playing sound: ${type} (priority: ${type === 'correct' ? 'high' : 'normal'})`);
        
        try {
            const context = getAudioContext();
            if (!context) return;

            // Resume context if suspended - with priority for correct sound
            if (context.state === 'suspended') {
                if (type === 'correct') {
                    // Force immediate resumption for correct sound
                    context.resume();
                } else {
                    context.resume();
                }
            }

            if (type === 'complete') {
                // Play victory sound (ascending notes) - keep original for variety
                const notes = [523, 659, 784, 1047]; // C, E, G, C
                notes.forEach((freq, index) => {
                    const noteOsc = context.createOscillator();
                    const noteGain = context.createGain();
                    noteOsc.connect(noteGain);
                    noteGain.connect(context.destination);
                    
                    noteOsc.frequency.setValueAtTime(freq, context.currentTime);
                    noteOsc.type = 'sine';
                    noteGain.gain.setValueAtTime(0.2, context.currentTime);
                    noteGain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
                    
                    noteOsc.start(context.currentTime + index * 0.1);
                    noteOsc.stop(context.currentTime + index * 0.1 + 0.2);
                });
                return;
            }

            // Use pre-created audio buffers for better performance
            const buffers = createAudioBuffers(context);
            const buffer = buffers[type];
            
            if (buffer) {
                const source = context.createBufferSource();
                const gainNode = context.createGain();
                
                source.buffer = buffer;
                source.connect(gainNode);
                gainNode.connect(context.destination);
                
                // Apply fade out to prevent clicks - optimized for speed
                const duration = 0.15; // Match the optimized buffer duration
                
                // Special optimization for correct sound - faster response
                if (type === 'correct') {
                    // Use immediate gain for instant feedback
                    gainNode.gain.setValueAtTime(1, context.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.01, context.currentTime + duration);
                } else {
                    // Standard fade for other sounds
                    gainNode.gain.setValueAtTime(1, context.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);
                }
                
                source.start(context.currentTime);
                source.stop(context.currentTime + duration);
            } else {
                // Fallback to oscillator for unknown sound types
                const oscillator = context.createOscillator();
                const gainNode = context.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(context.destination);
                
                const soundConfigs = {
                    correct: { frequency: 800, type: 'sine', gain: 0.25, duration: 0.15 },
                    incorrect: { frequency: 200, type: 'sawtooth', gain: 0.2, duration: 0.15 },
                    hint: { frequency: 800, type: 'sine', gain: 0.15, duration: 0.15 }
                };

                const config = soundConfigs[type] || soundConfigs.hint;
                oscillator.frequency.setValueAtTime(config.frequency, context.currentTime);
                oscillator.type = config.type;
                gainNode.gain.setValueAtTime(config.gain, context.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + config.duration);
                oscillator.start(context.currentTime);
                oscillator.stop(context.currentTime + config.duration);
            }
        } catch (error) {
            console.warn(t('error.audioPlaybackError', { ns: 'vocabulary' }), error);
        }
    }, [audioEnabled]);

    // Game logic functions
    const generateGameWords = useCallback((count) => {
        if (!words || words.length === 0) return { wordCards: [], translationCards: [] };
        
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        const pairsCount = Math.min(
            Math.max(count, MIN_PAIRS_PER_GAME), 
            Math.min(MAX_PAIRS_PER_GAME, words.length)
        );
        const selectedWords = shuffled.slice(0, pairsCount);
        
        const wordCards = selectedWords.map((word, index) => {
            const translation = word.translation?.[currentLanguage] || word.translation?.en || word.word || '';
            return {
                id: `word-${index}`,
                type: 'word',
                content: word.word || '',
                translation: translation,
                matchId: index,
                state: MATCH_STATES.UNMATCHED
            };
        });
        
        const translationCards = selectedWords.map((word, index) => {
            const translation = word.translation?.[currentLanguage] || word.translation?.en || word.word || '';
            return {
                id: `translation-${index}`,
                type: 'translation',
                content: translation,
                word: word.word || '',
                matchId: index,
                state: MATCH_STATES.UNMATCHED
            };
        });
        
        // Shuffle only translation cards to maintain word order
        const shuffledTranslations = [...translationCards].sort(() => Math.random() - 0.5);
        
        return { wordCards, translationCards: shuffledTranslations };
    }, [words, currentLanguage]);

    const resetGameState = useCallback(() => {
        setMatches(0);
        setScore(0);
        setTimeElapsed(0);
        setTotalAttempts(0);
        setMistakesCount(0);
        setMatchedPairs([]);
        setIncorrectMatches([]);
        setDragState(DRAG_STATES.IDLE);
        setDraggedItem(null);
        setDropTarget(null);
        setHintedPair(null);
        setHintCount(3);
        setSelectedCard(null);
        setMobileMatchMode(false);
        
        // Clear all timeouts
        if (hintTimeoutRef.current) {
            clearTimeout(hintTimeoutRef.current);
            hintTimeoutRef.current = null;
        }
        incorrectTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
        incorrectTimeoutsRef.current.clear();
        
        // Clear touch handling flags from cards
        if (wordCards.length > 0) {
            wordCards.forEach(card => {
                if (card._touchHandled) delete card._touchHandled;
            });
        }
        if (translationCards.length > 0) {
            translationCards.forEach(card => {
                if (card._touchHandled) delete card._touchHandled;
            });
        }
    }, [wordCards, translationCards]);

    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeElapsed(prev => prev + 1);
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const initializeGame = useCallback(() => {
        const { wordCards: newWordCards, translationCards: newTranslationCards } = 
            generateGameWords(selectedPairs);
        
        setWordCards(newWordCards);
        setTranslationCards(newTranslationCards);
        setTotalPairs(newWordCards.length);
        resetGameState();
        setGameState(GAME_STATES.PLAYING);
        startTimer();
    }, [generateGameWords, selectedPairs, resetGameState, startTimer]);

    const startGameWithPairs = useCallback((pairs = selectedPairs) => {
        const { wordCards: newWordCards, translationCards: newTranslationCards } = 
            generateGameWords(pairs);
        
        setWordCards(newWordCards);
        setTranslationCards(newTranslationCards);
        setTotalPairs(newWordCards.length);
        setSelectedPairs(pairs);
        resetGameState();
        setGameState(GAME_STATES.PLAYING);
        setShowPairSelectorModal(false);
        startTimer();
    }, [generateGameWords, selectedPairs, resetGameState, startTimer]);

    const completeGame = useCallback((finalScore) => {
        stopTimer();
        setGameState(GAME_STATES.COMPLETE);
        
        const finalTime = timeElapsed;
        const isNewBestScore = finalScore > bestScore;
        const isNewBestTime = !bestTime || finalTime < bestTime;
        
        if (isNewBestScore || isNewBestTime) {
            saveBestScores(finalScore, finalTime);
        }
        
        playSound('complete');
    }, [timeElapsed, bestScore, bestTime, saveBestScores, playSound, stopTimer]);

    const refreshGame = useCallback(() => {
        if (gameState === GAME_STATES.PLAYING) {
            stopTimer();
        }
        // On mobile phones, skip the modal and start directly with current settings
        if (isMobile && !isTablet) {
            startGameWithPairs(selectedPairs);
        } else {
            setShowPairSelectorModal(true);
        }
    }, [gameState, stopTimer, isMobile, isTablet, startGameWithPairs, selectedPairs]);

    // Match handling
    const handleMatch = useCallback((card1, card2) => {
        if (card1.matchId !== card2.matchId || card1.type === card2.type) {
            return false; // Invalid match
        }

        // Play sound IMMEDIATELY for instant feedback
        playSound('correct');
        
        // Increment total attempts for accuracy calculation
        setTotalAttempts(prev => prev + 1);
        
        // Improved scoring: base points + time bonus + accuracy bonus
        const timeBonus = Math.max(0, Math.floor(50 / Math.max(1, timeElapsed)));
        const accuracyBonus = Math.max(0, Math.floor((matches / Math.max(1, totalPairs)) * 20));
        const newScore = score + 15 + timeBonus + accuracyBonus;
        const newMatches = matches + 1;
        
        // Batch state updates for better performance
        setScore(newScore);
        setMatches(newMatches);
        
        // Update card states
        const updateCardState = (cards) => 
            cards.map(card => 
                card.matchId === card1.matchId 
                    ? { ...card, state: MATCH_STATES.MATCHED }
                    : card
            );
        
        setWordCards(updateCardState);
        setTranslationCards(updateCardState);
        setMatchedPairs(prev => [...prev, card1.matchId]);
        
        // Clear hint if the matched pair was hinted
        if (hintedPair?.matchId === card1.matchId) {
            setHintedPair(null);
            if (hintTimeoutRef.current) {
                clearTimeout(hintTimeoutRef.current);
                hintTimeoutRef.current = null;
            }
        }
        
        // Check if game is complete
        if (newMatches >= totalPairs) {
            completeGame(newScore);
        }
        
        return true; // Valid match
    }, [score, timeElapsed, matches, totalPairs, hintedPair, playSound, completeGame]);

    const handleInvalidMatch = useCallback((card1, card2) => {
        playSound('incorrect');
        const matchKey = `${card1.id}-${card2.id}`;
        
        // Increment total attempts for accuracy calculation
        setTotalAttempts(prev => prev + 1);
        setMistakesCount(prev => prev + 1);
        
        setIncorrectMatches(prev => [...prev, { from: card1.id, to: card2.id }]);
        
        // Penalize incorrect matches by reducing score
        setScore(prev => Math.max(0, prev - 5));
        
        // Clear incorrect match after timeout
        const timeout = setTimeout(() => {
            setIncorrectMatches(prev => 
                prev.filter(match => match.from !== card1.id || match.to !== card2.id)
            );
            incorrectTimeoutsRef.current.delete(matchKey);
        }, INCORRECT_MATCH_DISPLAY_DURATION);
        
        incorrectTimeoutsRef.current.set(matchKey, timeout);
    }, [playSound]);

    // Touch handlers - Improved for better mobile compatibility
    const handleTouchStart = useCallback((e, card) => {
        if (gameState !== GAME_STATES.PLAYING || card.state === MATCH_STATES.MATCHED) {
            e.preventDefault();
            return;
        }
        
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            card: card,
            timestamp: Date.now()
        };
    }, [gameState]);

    const handleTouchMove = useCallback((e) => {
        if (!touchStartRef.current) return;
        
        // Only prevent default if we're tracking a significant movement
        const start = touchStartRef.current;
        const current = e.touches[0];
        const distance = Math.sqrt(
            Math.pow(current.clientX - start.x, 2) + Math.pow(current.clientY - start.y, 2)
        );
        
        if (distance > TOUCH_MOVEMENT_THRESHOLD) {
            e.preventDefault();
        }
    }, []);

    const handleTouchEnd = useCallback((e, card) => {
        if (!touchStartRef.current || gameState !== GAME_STATES.PLAYING) {
            touchStartRef.current = null;
            return;
        }
        
        const start = touchStartRef.current;
        const end = {
            x: e.changedTouches[0].clientX,
            y: e.changedTouches[0].clientY
        };
        
        const distance = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
        
        const timeDiff = Date.now() - start.timestamp;
        
        // Handle as tap if minimal movement and reasonable time
        if (distance < TOUCH_MOVEMENT_THRESHOLD && timeDiff < 500) {
            e.preventDefault();
            // Mark that we've handled this as a touch event to prevent click
            card._touchHandled = true;
            
            if (card.state !== MATCH_STATES.MATCHED) {
                if (!selectedCard) {
                    setSelectedCard(card);
                    setMobileMatchMode(true);
                    playSound('hint');
                } else if (selectedCard.id === card.id) {
                    setSelectedCard(null);
                    setMobileMatchMode(false);
                } else {
                    const isValidMatch = handleMatch(selectedCard, card);
                    if (!isValidMatch) {
                        handleInvalidMatch(selectedCard, card);
                    }
                    setSelectedCard(null);
                    setMobileMatchMode(false);
                }
            }
        }
        
        touchStartRef.current = null;
    }, [gameState, selectedCard, playSound, handleMatch, handleInvalidMatch]);

    // Mobile card selection - Improved with better state management
    const handleMobileCardSelection = useCallback((card) => {
        if (card.state === MATCH_STATES.MATCHED) {
            return;
        }
        
        if (!selectedCard) {
            setSelectedCard(card);
            setMobileMatchMode(true);
            playSound('hint');
        } else if (selectedCard.id === card.id) {
            // Same card - deselect
            setSelectedCard(null);
            setMobileMatchMode(false);
        } else {
            // Attempt match
            const isValidMatch = handleMatch(selectedCard, card);
            if (!isValidMatch) {
                handleInvalidMatch(selectedCard, card);
            }
            setSelectedCard(null);
            setMobileMatchMode(false);
        }
    }, [selectedCard, playSound, handleMatch, handleInvalidMatch, gameState, mobileMatchMode]);

    // Drag and drop handlers
    const handleDragStart = useCallback((e, item) => {
        if (gameState !== GAME_STATES.PLAYING || item.state === MATCH_STATES.MATCHED) return;
        
        setDragState(DRAG_STATES.DRAGGING);
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', item.id);
    }, [gameState]);

    const handleDragOver = useCallback((e, target) => {
        e.preventDefault();
        if (dragState === DRAG_STATES.DRAGGING && draggedItem) {
            setDropTarget(target);
        }
    }, [dragState, draggedItem]);

    const handleDragLeave = useCallback(() => {
        setDropTarget(null);
    }, []);

    const handleDrop = useCallback((e, target) => {
        e.preventDefault();
        if (!draggedItem || !target || gameState !== GAME_STATES.PLAYING) return;
        
        const isValidMatch = handleMatch(draggedItem, target);
        if (!isValidMatch) {
            handleInvalidMatch(draggedItem, target);
        }
        
        setDragState(DRAG_STATES.IDLE);
        setDraggedItem(null);
        setDropTarget(null);
    }, [draggedItem, gameState, handleMatch, handleInvalidMatch]);

    // Hint functionality
    const useHint = useCallback(() => {
        if (hintCount <= 0 || gameState !== GAME_STATES.PLAYING) return;
        
        if (hintTimeoutRef.current) {
            clearTimeout(hintTimeoutRef.current);
        }
        
        setHintCount(prev => prev - 1);
        
        const unmatchedWords = wordCards.filter(card => card.state === MATCH_STATES.UNMATCHED);
        const unmatchedTranslations = translationCards.filter(card => card.state === MATCH_STATES.UNMATCHED);
        
        if (unmatchedWords.length > 0 && unmatchedTranslations.length > 0) {
            const randomWord = unmatchedWords[Math.floor(Math.random() * unmatchedWords.length)];
            const matchingTranslation = unmatchedTranslations.find(t => t.matchId === randomWord.matchId);
            
            if (matchingTranslation) {
                setHintedPair({
                    wordId: randomWord.id,
                    translationId: matchingTranslation.id,
                    matchId: randomWord.matchId
                });
                
                hintTimeoutRef.current = setTimeout(() => {
                    setHintedPair(null);
                    hintTimeoutRef.current = null;
                }, HINT_DISPLAY_DURATION);
                
                playSound('hint');
            }
        }
    }, [hintCount, gameState, wordCards, translationCards, playSound]);

    // Card rendering - Improved mobile touch handling
    const renderCard = useCallback((card) => {
        const isMatched = card.state === MATCH_STATES.MATCHED;
        const isIncorrect = incorrectMatches.some(match => 
            match.from === card.id || match.to === card.id
        );
        const isHinted = hintedPair && (
            card.id === hintedPair.wordId || 
            card.id === hintedPair.translationId
        );
        const isSelected = selectedCard?.id === card.id;
        const isDragging = draggedItem?.id === card.id;
        const isDropTarget = dropTarget?.id === card.id;

        return (
            <motion.div
                key={card.id}
                className={`matching-card ${card.type} ${isMatched ? 'matched' : ''} ${isIncorrect ? 'incorrect' : ''} ${isHinted ? 'hinted' : ''} ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''} ${isSelected ? 'mobile-selected' : ''}`}
                draggable={!isMatched && gameState === GAME_STATES.PLAYING && !isMobile}
                onDragStart={(e) => handleDragStart(e, card)}
                onDragOver={(e) => handleDragOver(e, card)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, card)}
                onTouchStart={(e) => handleTouchStart(e, card)}
                onTouchMove={handleTouchMove}
                onTouchEnd={(e) => handleTouchEnd(e, card)}
                onClick={isMobile ? (e) => {
                    // Fallback click handler for mobile if touch events fail
                    // Only handle if touch events haven't already handled this interaction
                    if (gameState === GAME_STATES.PLAYING && !isMatched && !card._touchHandled) {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMobileCardSelection(card);
                    }
                    // Clear the touch handled flag
                    if (card._touchHandled) {
                        delete card._touchHandled;
                    }
                } : undefined}
                whileHover={!isMatched && !isMobile ? { scale: 1.05 } : {}}
                whileTap={!isMatched ? { scale: 0.95 } : {}}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: isHinted ? [1, 1.1, 1] : isSelected ? 1.05 : 1,
                    boxShadow: isHinted ? '0 0 20px rgba(255, 215, 0, 0.8)' : 
                               isSelected ? '0 0 15px rgba(102, 102, 255, 0.6)' : 
                               '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
                transition={{ 
                    duration: 0.3,
                    scale: isHinted ? { 
                        duration: HINT_ANIMATION_DURATION / 1000, 
                        repeat: Infinity, 
                        repeatType: "reverse" 
                    } : { duration: 0.3 }
                }}
                role="button"
                tabIndex={!isMatched ? 0 : -1}
                aria-label={`${card.type} card: ${card.content}`}
                onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && isMobile) {
                        e.preventDefault();
                        handleMobileCardSelection(card);
                    }
                }}
                style={{
                    // Ensure proper touch handling on mobile
                    touchAction: isMobile ? 'manipulation' : 'auto',
                    WebkitTapHighlightColor: 'transparent',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    // Prevent text selection on mobile
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    userSelect: 'none'
                }}
            >
                <div className="card-content">
                    <div className="card-text">{card.content}</div>
                    {isHinted && (
                        <div className="hint-indicator">
                            <FaLightbulb />
                        </div>
                    )}
                    {isSelected && (
                        <div className="mobile-selection-indicator">
                            <FaCheck />
                        </div>
                    )}
                </div>
                {isMatched && (
                    <div className="match-indicator">
                        <FaCheck />
                    </div>
                )}
            </motion.div>
        );
    }, [
        gameState, incorrectMatches, hintedPair, selectedCard, draggedItem, dropTarget, isMobile,
        handleDragStart, handleDragOver, handleDragLeave, handleDrop, 
        handleTouchStart, handleTouchMove, handleTouchEnd, handleMobileCardSelection
    ]);

    // Modal components
    const renderInstructionsContent = useCallback(() => (
        <div className="instructions-content">
            <div className="instructions-body">
                <div className="instruction-step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                        <h3>{t('matching.dragInstructions')}</h3>
                        <p>{t('matching.dragDescription')}</p>
                    </div>
                </div>
                
                <div className="instruction-step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                        <h3>{t('matching.matchInstructions')}</h3>
                        <p>{t('matching.matchDescription')}</p>
                    </div>
                </div>
                
                <div className="instruction-step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                        <h3>{t('matching.completeInstructions')}</h3>
                        <p>{t('matching.completeDescription')}</p>
                    </div>
                </div>
            </div>
        </div>
    ), [t]);

    const renderGameCompleteModal = useCallback(() => (
        <Modal
            onClose={() => setGameState(GAME_STATES.WAITING)}
            closeOnClickOutside={true}
            closeOnEscape={true}
            padding={false}
        >
            <div className="game-complete-content">
                <div className="game-complete-header">
                    <h2><FaTrophy className="game-complete-icon" />{t('matching.gameComplete')}</h2>
                    
                    <div className="performance-rating">
                        <span className="rating-label">{t('matching.performance')}</span>
                        <span className="rating-value" style={{ color: performanceRating.color }}>{performanceRating.text}</span>
                    </div>
                </div>
                
                <div className="game-complete-stats">
                    <InfoTooltip content={t('matching.tooltips.finalScore')}>
                        <div className="matching-stat-item">
                            <div className="stat-label">{t('matching.finalScore')}</div>
                            <div className="stat-value">{score}</div>
                        </div>
                    </InfoTooltip>
                    <InfoTooltip content={t('matching.tooltips.time')}>
                        <div className="matching-stat-item">
                            <div className="stat-label">{t('matching.timeLabel')}</div>
                            <div className="stat-value">{formatTime(timeElapsed)}</div>
                        </div>
                    </InfoTooltip>
                    <InfoTooltip content={t('matching.tooltips.accuracy')}>
                        <div className="matching-stat-item">
                            <div className="stat-label">{t('matching.accuracy')}</div>
                            <div className="stat-value">{accuracy}%</div>
                        </div>
                    </InfoTooltip>
                    <InfoTooltip content={t('matching.tooltips.mistakes')}>
                        <div className="matching-stat-item">
                            <div className="stat-label">{t('matching.mistakes')}</div>
                            <div className="stat-value">{mistakesCount}</div>
                        </div>
                    </InfoTooltip>
                    <InfoTooltip content={t('matching.tooltips.totalAttempts')}>
                        <div className="matching-stat-item">
                            <div className="stat-label">{t('matching.totalAttempts')}</div>
                            <div className="stat-value">{totalAttempts}</div>
                        </div>
                    </InfoTooltip>
                </div>
                
                <div className="game-complete-footer">
                    <button 
                        className="btn btn-secondary"
                        onClick={() => setGameState(GAME_STATES.WAITING)}
                    >
                        {t('common:back')}
                    </button>
                    <button 
                        className="btn btn-primary"
                        onClick={() => {
                            setGameState(GAME_STATES.WAITING);
                            // On mobile phones, start directly without showing pair selector modal
                            if (isMobile && !isTablet) {
                                startGameWithPairs(selectedPairs);
                            } else {
                                setShowPairSelectorModal(true);
                            }
                        }}
                    >
                        <FaRedo />
                        {t('matching.newGame')}
                    </button>
                </div>
            </div>
        </Modal>
    ), [gameState, t, score, timeElapsed, formatTime, accuracy, mistakesCount, totalAttempts, performanceRating]);

    const renderPairSelectorModal = useCallback(() => (
        <Modal
            onClose={() => setShowPairSelectorModal(false)}
            closeOnClickOutside={true}
            closeOnEscape={true}
            padding={false}
        >
            <div className="pair-selector-modal-content">
                <div className="modal-header">
                    <GiTargetArrows className="modal-icon" />
                    <h3>{gameState === GAME_STATES.PLAYING ? t('matching.refreshGame') : t('matching.title')}</h3>
                </div>
                
                <div className="modal-body">
                    <p className="modal-description">
                        {gameState === GAME_STATES.PLAYING 
                            ? t('matching.refreshPairsSelectorTooltip') 
                            : t('matching.pairsSelectorTooltip')
                        }
                    </p>
                    
                    <div className="pairs-selector-section">
                        <PairSlider
                            value={tempPairs}
                            min={MIN_PAIRS_PER_GAME}
                            max={Math.min(MAX_PAIRS_PER_GAME, words.length)}
                            onFinalChange={setTempPairs}
                            minLabel={t('matching.pairsSelectorMin')}
                            maxLabel={t('matching.pairsSelectorMax')}
                            tooltip={t('matching.pairsSelectorTooltip')}
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => setShowPairSelectorModal(false)}
                    >
                        {t('common:close')}
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => startGameWithPairs(tempPairs)}
                        disabled={tempPairs > words.length}
                    >
                        <FaPlay />
                        {gameState === GAME_STATES.PLAYING ? t('matching.refresh') : t('common:start')}
                    </button>
                </div>
            </div>
        </Modal>
    ), [showPairSelectorModal, gameState, t, tempPairs, words.length, startGameWithPairs]);

    // Early return if translations aren't ready
    if (!ready) {
        return <div className="matching-game loading">{t('common:loading')}</div>;
    }

    // Early return if no words provided
    if (!words || words.length === 0) {
        return (
            <div className="matching-game error">
                <div className="error-content">
                    <GiTargetArrows className="error-icon" />
                    <h2>{t('matching.noWordsTitle')}</h2>
                    <p>{t('matching.noWordsMessage')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="matching-game" ref={containerRef}>
            {/* Game Header */}
            <div className="matching-game-header">
                <div className="header-left">
                    <div className="game-title">
                        <GiTargetArrows className="game-icon" />
                        <h1>{t('matching.title')}</h1>
                        {isMobile && <FaMobile className="mobile-indicator" />}
                        {isTablet && <FaTablet className="tablet-indicator" />}
                    </div>
                </div>
                
                <div className="header-right">
                    {gameState === GAME_STATES.PLAYING && (
                        <>
                            <button 
                                className={`audio-button ${audioEnabled ? 'enabled' : 'disabled'}`}
                                onClick={() => setAudioEnabled(!audioEnabled)}
                                title={audioEnabled ? t('common:mute') : t('common:unmute')}
                                aria-label={audioEnabled ? t('common:mute') : t('common:unmute')}
                            >
                                {audioEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
                            </button>
                            
                            <button 
                                className={`hint-button ${hintCount > 0 ? 'available' : 'disabled'}`}
                                onClick={useHint}
                                disabled={hintCount <= 0}
                                title={`${t('matching.hint')} (${hintCount} ${t('common:left')})`}
                                aria-label={`${t('matching.hint')} (${hintCount} ${t('common:left')})`}
                            >
                                <FaLightbulb className={hintCount > 0 ? 'hint-icon' : 'hint-icon disabled'} />
                                <span className="hint-count">{hintCount}</span>
                            </button>
                            
                            <button 
                                className="refresh-button"
                                onClick={refreshGame}
                                title={t('matching.refresh')}
                                aria-label={t('matching.refresh')}
                            >
                                <FaSyncAlt />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Game Stats */}
            {gameState === GAME_STATES.PLAYING && (
                <div className="matching-game-stats">
                    <InfoTooltip content={t('matching.tooltips.inGameScore')}>
                        <div className="matching-stat-item">
                            <FaStar className="stat-icon" />
                            <span className="stat-label">{t('matching.score', { score })}</span>
                        </div>
                    </InfoTooltip>
                    <InfoTooltip content={t('matching.tooltips.inGameMatches')}>
                        <div className="matching-stat-item">
                            <BiTargetLock className="stat-icon" />
                            <span className="stat-label">{t('matching.matches', { matches, total: totalPairs })}</span>
                        </div>
                    </InfoTooltip>
                    <InfoTooltip content={t('matching.tooltips.inGameTime')}>
                        <div className="matching-stat-item">
                            <FaClock className="stat-icon" />
                            <span className="stat-label">{t('matching.time', { time: formatTime(timeElapsed) })}</span>
                        </div>
                    </InfoTooltip>
                </div>
            )}

            {/* Mobile Match Mode Indicator - Only for mobile phones */}
            {isMobile && !isTablet && mobileMatchMode && selectedCard && (
                <div className="mobile-match-indicator">
                    <div className="match-indicator-content">
                        <div className="match-indicator-left">
                            <div className="match-indicator-header">
                                <BiTargetLock className="match-indicator-icon" />
                                <span className="match-indicator-text">
                                    {t('matching.selectSecondCard')}
                                </span>
                            </div>
                            <div className="selected-card-preview">
                                <span className="selected-card-type">{selectedCard.type === 'word' ? t('vocabulary:word') : t('vocabulary:translation')}</span>
                                <span className="selected-card-text">{selectedCard.content}</span>
                            </div>
                        </div>
                        <button 
                            className="cancel-match-btn"
                            onClick={() => {
                                setSelectedCard(null);
                                setMobileMatchMode(false);
                            }}
                            aria-label={t('matching.cancelSelection')}
                            title={t('matching.cancelSelection')}
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>
            )}

            {/* Game Area */}
            <div className="matching-game-area">
                {gameState === GAME_STATES.WAITING ? (
                    <div className="game-waiting">
                        <div className="waiting-content instructions-view">
                            {renderInstructionsContent()}
                            <div className="instructions-footer">
                                <button 
                                    className="btn btn-primary"
                                    onClick={() => {
                                        // On mobile phones, start directly without showing pair selector modal
                                        if (isMobile && !isTablet) {
                                            startGameWithPairs(selectedPairs);
                                        } else {
                                            setShowPairSelectorModal(true);
                                        }
                                    }}
                                >
                                    <FaPlay />
                                    {t('common:start')}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="game-board">
                        <div className="words-section">
                            <h3 className="section-title">{t('matching.words')}</h3>
                            <div className="cards-container" key={`words-${currentLanguage}-${languageChangeKey}`} style={{ width: '100%', minWidth: 0 }}>
                                {wordCards.map(card => renderCard(card))}
                            </div>
                        </div>
                        
                        <div className="translations-section">
                            <h3 className="section-title">{t('matching.translations')}</h3>
                            <div className="cards-container" key={`translations-${currentLanguage}-${languageChangeKey}`} style={{ width: '100%', minWidth: 0 }}>
                                {translationCards.map(card => renderCard(card))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {gameState === GAME_STATES.COMPLETE && renderGameCompleteModal()}
            {/* Only show pair selector modal on tablets and desktop, not on mobile phones */}
            {showPairSelectorModal && !isMobile && renderPairSelectorModal()}
        </div>
    );
};

export default MatchingGame;