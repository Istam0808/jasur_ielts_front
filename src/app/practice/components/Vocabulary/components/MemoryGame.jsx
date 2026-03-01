"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBrain, FaRedo, FaClock, FaStar, FaTrophy, FaArrowLeft, FaEye, FaLightbulb } from 'react-icons/fa';
import { GiCardAceHearts } from 'react-icons/gi';
import styles from './styles/MemoryGame.module.scss';
import PairSlider from './PairSlider';
import Modal from '@/components/common/Modal';

// Config: number of reveal-all chances per game
const MAX_REVEAL_ALL_COUNT = 1;

const MemoryGame = ({
    words,
    langKey,
    difficulty,
    onBack
}) => {
    const { t, i18n, ready } = useTranslation(['vocabulary', 'common']);
    const gameContainerRef = useRef(null);
    const interactionLockedRef = useRef(false);
    const matchTimeoutRef = useRef(null);
    const revealTimeoutRef = useRef(null);
    const revealIntervalRef = useRef(null);
    const [gameState, setGameState] = useState('waiting'); // waiting, playing, complete
    const [cards, setCards] = useState([]);
    const [flippedCards, setFlippedCards] = useState([]);
    const [matchedPairs, setMatchedPairs] = useState([]);
    const [score, setScore] = useState(0);
    const [moves, setMoves] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const [gameTime, setGameTime] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [bestTime, setBestTime] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentGamePairs, setCurrentGamePairs] = useState(0);
    const [selectedPairs, setSelectedPairs] = useState(10); // Default to 10 pairs
    const [showPairSelectorModal, setShowPairSelectorModal] = useState(false);
    const [tempPairs, setTempPairs] = useState(selectedPairs); // Temporary state for slider
    const [usedWords, setUsedWords] = useState([]); // Track words used in current game
    const [currentGameWords, setCurrentGameWords] = useState([]); // Store the words for current game
    const [gameKey, setGameKey] = useState(0); // Force re-render for fresh randomization
    const [revealUsed, setRevealUsed] = useState(false); // true after reveal consumed
    const [isRevealing, setIsRevealing] = useState(false); // true during active reveal
    const [revealRemaining, setRevealRemaining] = useState(0);
    const [isPreviewing, setIsPreviewing] = useState(false); // true at game start before user presses Ready
  const [announce, setAnnounce] = useState('');
    const [hintCount, setHintCount] = useState(3);
    const [revealAllCount, setRevealAllCount] = useState(MAX_REVEAL_ALL_COUNT);
    const hintTimeoutRef = useRef(null);
    const [pairImages, setPairImages] = useState({}); // pairId -> image object
    const [pairImageLoading, setPairImageLoading] = useState({});
    const [pairImageError, setPairImageError] = useState({});
    const [pairImageLoaded, setPairImageLoaded] = useState({});

    // Handle locale changes - update translations of visible cards during game/preview
    useEffect(() => {
        const handleLanguageChanged = () => {
            if (gameState !== 'waiting' && cards.length > 0 && currentGameWords.length > 0) {
                const currentLanguage = i18n.language?.split('-')[0] || 'en';
                setCards(prev => prev.map(card => {
                    if (card.type === 'translation') {
                        const source = currentGameWords[card.pairId];
                        if (source) {
                            return {
                                ...card,
                                content: source.translation[currentLanguage] || source.translation.en || source.word
                            };
                        }
                    }
                    return card;
                }));
            }
        };

        i18n.on('languageChanged', handleLanguageChanged);
        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, [i18n, gameState, cards.length, currentGameWords]);

    // Force re-render when i18n language changes (for UI translations)
    useEffect(() => {
        // This effect ensures the component re-renders when the language changes
        // even if no game is in progress
    }, [i18n.language]);

    // Game configuration
    const MIN_PAIRS_PER_GAME = 5; // Minimum pairs for variety
    const MAX_PAIRS_PER_GAME = 50; // Maximum pairs for extended gameplay
    const REVEAL_DURATION_MS = 5000; // duration to show all cards (5s)
    const HINT_DURATION_MS = 2500; // duration to show a single pair (2.5s)

    // Create memory cards from words
    const createCards = useCallback((customPairsCount = null, forceNewWords = false) => {
        const cardPairs = [];
        
        // Get current language from i18n
        const currentLanguage = i18n.language?.split('-')[0] || 'en';
        
        // Use the custom pairs count or the selected number of pairs, but ensure it's within bounds
        const targetPairs = customPairsCount !== null ? customPairsCount : selectedPairs;
        const pairsCount = Math.min(Math.max(targetPairs, MIN_PAIRS_PER_GAME), MAX_PAIRS_PER_GAME);
        
        // Get available words (exclude already used words unless forcing new words)
        let availableWords = [...words];
        if (!forceNewWords && usedWords.length > 0) {
            availableWords = words.filter(word => 
                !usedWords.some(used => used.word === word.word)
            );
        }
        
        // If we don't have enough unused words, reset the used words list
        if (availableWords.length < pairsCount) {
            availableWords = [...words];
            if (!forceNewWords) {
                setUsedWords([]);
                // Show a subtle notification that words are being reused
            }
        }
        
        // Ensure we have enough words (if words array is smaller than requested pairs)
        const actualPairsCount = Math.min(pairsCount, availableWords.length);
        if (actualPairsCount < pairsCount) {
            console.log(`Requested ${pairsCount} pairs but only ${actualPairsCount} words available.`);
        }
        
        // Randomly select words from available words with improved shuffling
        const shuffledWords = [...availableWords].sort(() => Math.random() - 0.5);
        const selectedWords = shuffledWords.slice(0, actualPairsCount);
        
        // Store the selected words for this game
        if (forceNewWords) {
            setCurrentGameWords(selectedWords);
            setUsedWords(prev => [...prev, ...selectedWords]);
        }
        
        // Create pairs of cards (word + translation)
        selectedWords.forEach((word, index) => {
            const wordCard = {
                id: `word-${index}`,
                type: 'word',
                content: word.word,
                pairId: index,
                isFlipped: false,
                isMatched: false
            };
            
            const translationCard = {
                id: `translation-${index}`,
                type: 'translation',
                content: word.translation[currentLanguage] || word.translation.en || word.word,
                pairId: index,
                isFlipped: false,
                isMatched: false
            };
            
            cardPairs.push(wordCard, translationCard);
        });

        // Shuffle cards with improved randomization
        const shuffledCards = [...cardPairs].sort(() => Math.random() - 0.5);
        return { cards: shuffledCards, pairsCount: actualPairsCount };
    }, [words, i18n.language, selectedPairs, usedWords, gameKey]);

    // Fetch one Unsplash image for a matched pair with proper attribution
    const fetchImageForPair = useCallback(async (pairId) => {
        if (pairImages[pairId] || pairImageLoading[pairId]) return;
        const source = currentGameWords[pairId];
        if (!source?.word) return;

        setPairImageLoading(prev => ({ ...prev, [pairId]: true }));
        setPairImageError(prev => ({ ...prev, [pairId]: null }));
        try {
            const res = await fetch('/api/vocabulary-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: source.word, definition: source.definition || '', count: 1 }),
            });
            const data = await res.json();
            if (data?.success && Array.isArray(data.images) && data.images[0]) {
                const imgData = data.images[0];
                setPairImages(prev => ({ ...prev, [pairId]: imgData }));
                try {
                    const preload = new Image();
                    preload.onload = () => {
                        setPairImageLoaded(prev => ({ ...prev, [pairId]: true }));
                    };
                    preload.onerror = () => {
                        setPairImageLoaded(prev => ({ ...prev, [pairId]: false }));
                    };
                    preload.src = imgData.url || imgData.smallUrl;
                } catch (_) {
                    setPairImageLoaded(prev => ({ ...prev, [pairId]: false }));
                }
            } else {
                setPairImageError(prev => ({ ...prev, [pairId]: data?.error || 'No image found' }));
            }
        } catch (e) {
            setPairImageError(prev => ({ ...prev, [pairId]: 'Failed to load image' }));
        } finally {
            setPairImageLoading(prev => ({ ...prev, [pairId]: false }));
        }
    }, [currentGameWords, pairImages, pairImageLoading]);

    const openFullscreenForPair = useCallback((pairId) => {
        const image = pairImages[pairId];
        if (!image || !pairImageLoaded[pairId]) return;
        if (typeof document === 'undefined' || !document.fullscreenEnabled) return;

        const img = new Image();
        img.src = image.url || image.smallUrl;
        img.style.width = '100vw';
        img.style.height = '100vh';
        img.style.objectFit = 'contain';
        img.style.backgroundColor = '#000';
        img.style.cursor = 'pointer';
        img.alt = image.altDescription || '';
        img.onclick = () => document.exitFullscreen();

        document.body.appendChild(img);
        img.requestFullscreen().catch(() => {
            if (document.body.contains(img)) document.body.removeChild(img);
        });

        const onFsChange = () => {
            if (!document.fullscreenElement) {
                if (document.body.contains(img)) document.body.removeChild(img);
                document.removeEventListener('fullscreenchange', onFsChange);
            }
        };
        document.addEventListener('fullscreenchange', onFsChange);
    }, [pairImages, pairImageLoaded]);

    // Initialize game
    const initializeGame = useCallback(() => {
        if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
        if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
        if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
        setGameKey(prev => prev + 1); // Force fresh randomization
        const { cards: newCards, pairsCount } = createCards(null, true); // Force new words
        setCards(newCards);
        setCurrentGamePairs(pairsCount);
        setFlippedCards([]);
        setMatchedPairs([]);
        setScore(0);
        setMoves(0);
        setGameTime(0);
        setStartTime(Date.now());
        setGameState('playing');
        setRevealUsed(false);
        setIsRevealing(false);
        setRevealRemaining(0);
        setIsPreviewing(true);
        // Show all cards for preview
        setCards(prev => prev.map(c => ({ ...c, isFlipped: true })));
        setHintCount(3);
        setPairImages({});
        setPairImageLoading({});
        setPairImageError({});
        setRevealAllCount(MAX_REVEAL_ALL_COUNT);
    }, [createCards, selectedPairs]);

    // Reset used words when returning to waiting state
    const resetGameState = useCallback(() => {
        if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
        if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
        if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
        setGameState('waiting');
        setCards([]);
        setFlippedCards([]);
        setMatchedPairs([]);
        setScore(0);
        setMoves(0);
        setGameTime(0);
        setStartTime(null);
        setCurrentGamePairs(0);
        setCurrentGameWords([]);
        // Don't reset usedWords here - let it persist across games for variety
        setRevealUsed(false);
        setIsRevealing(false);
        setRevealRemaining(0);
        interactionLockedRef.current = false;
        setIsPreviewing(false);
        setHintCount(3);
        setPairImages({});
        setPairImageLoading({});
        setPairImageError({});
        setRevealAllCount(MAX_REVEAL_ALL_COUNT);
    }, []);

    // Reset all used words (for when user wants to start completely fresh)
    const resetUsedWords = useCallback(() => {
        setUsedWords([]);
        setCurrentGameWords([]);
    }, []);

    // Handle card flip
    const handleCardFlip = useCallback((cardId) => {
        if (gameState !== 'playing' || isProcessing || isRevealing || isPreviewing || interactionLockedRef.current) return;
        
        const card = cards.find(c => c.id === cardId);
        if (!card || card.isFlipped || card.isMatched) return;
        
        // Don't allow flipping more than 2 cards at once
        if (flippedCards.length >= 2) return;

        const newFlippedCards = [...flippedCards, cardId];
        setFlippedCards(newFlippedCards);

        // Update card state
        setCards(prev => prev.map(c => 
            c.id === cardId ? { ...c, isFlipped: true } : c
        ));

        // Check for match when 2 cards are flipped
        if (newFlippedCards.length === 2) {
            interactionLockedRef.current = true;
            setIsProcessing(true);
            setMoves(prev => prev + 1);
            
            const [card1Id, card2Id] = newFlippedCards;
            const card1 = cards.find(c => c.id === card1Id);
            const card2 = cards.find(c => c.id === card2Id);

            if (card1.pairId === card2.pairId) {
                // Match found
                matchTimeoutRef.current = setTimeout(() => {
                    setMatchedPairs(prev => [...prev, card1.pairId]);
                    setScore(prev => prev + 10);
                    
                    setCards(prev => prev.map(c => 
                        c.pairId === card1.pairId ? { ...c, isMatched: true } : c
                    ));
                    
                    setFlippedCards([]);
                    setIsProcessing(false);
                    interactionLockedRef.current = false;
                    // Fetch Unsplash image for this matched pair
                    fetchImageForPair(card1.pairId);
                }, 600);
            } else {
                // No match
                matchTimeoutRef.current = setTimeout(() => {
                    setCards(prev => prev.map(c => 
                        newFlippedCards.includes(c.id) ? { ...c, isFlipped: false } : c
                    ));
                    setFlippedCards([]);
                    setIsProcessing(false);
                    interactionLockedRef.current = false;
                }, 800);
            }
        }
    }, [cards, flippedCards, gameState, isProcessing, isRevealing, isPreviewing]);

    // Reveal all cards once per game
    const startCountdown = useCallback((durationMs) => {
        setRevealRemaining(Math.ceil(durationMs / 1000));
        if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
        revealIntervalRef.current = setInterval(() => {
            setRevealRemaining(prev => Math.max(prev - 1, 0));
        }, 1000);
    }, []);

    const endCountdown = useCallback(() => {
        if (revealIntervalRef.current) {
            clearInterval(revealIntervalRef.current);
            revealIntervalRef.current = null;
        }
        setRevealRemaining(0);
    }, []);

    const handleRevealAll = useCallback(() => {
        if (gameState !== 'playing' || isProcessing || isRevealing || isPreviewing || cards.length === 0) return;
        if (revealAllCount <= 0) return;
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
        setRevealAllCount(prev => Math.max(prev - 1, 0));
        setIsRevealing(true);
        interactionLockedRef.current = true;
        setIsProcessing(true);
        setCards(prev => prev.map(c => (c.isMatched ? c : { ...c, isFlipped: true })));
        setFlippedCards([]);
        startCountdown(REVEAL_DURATION_MS);
        if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
        revealTimeoutRef.current = setTimeout(() => {
            setCards(prev => prev.map(c => (c.isMatched ? c : { ...c, isFlipped: false })));
            setIsRevealing(false);
            setIsProcessing(false);
            interactionLockedRef.current = false;
            endCountdown();
            if (revealAllCount - 1 <= 0) {
                setRevealUsed(true);
            }
        }, REVEAL_DURATION_MS);
    }, [gameState, isProcessing, isRevealing, isPreviewing, cards.length, startCountdown, endCountdown, revealAllCount]);

    const handleReady = useCallback(() => {
        if (gameState !== 'playing' || !isPreviewing) return;
        interactionLockedRef.current = true;
        // Immediately hide all non-matched cards
        setCards(prev => prev.map(c => (c.isMatched ? c : { ...c, isFlipped: false })));
        setIsPreviewing(false);
        // tiny delay to avoid click-throughs
        setTimeout(() => {
            interactionLockedRef.current = false;
        }, 150);
    }, [gameState, isPreviewing]);

    // Check for game completion
    useEffect(() => {
        if (matchedPairs.length === currentGamePairs && gameState === 'playing' && currentGamePairs > 0) {
            const finalTime = Math.floor((Date.now() - startTime) / 1000);
            setGameTime(finalTime);
            
            // Update best scores
            if (score > bestScore) {
                setBestScore(score);
                localStorage.setItem(`memory-best-score-${difficulty}`, score.toString());
            }
            
            if (!bestTime || finalTime < bestTime) {
                setBestTime(finalTime);
                localStorage.setItem(`memory-best-time-${difficulty}`, finalTime.toString());
            }
            
            setGameState('complete');
        }
    }, [matchedPairs.length, currentGamePairs, gameState, startTime, score, bestScore, bestTime, difficulty]);

    // Timer effect
    useEffect(() => {
        let timer;
        if (gameState === 'playing' && startTime) {
            timer = setInterval(() => {
                setGameTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [gameState, startTime]);

    // Load best scores from localStorage
    useEffect(() => {
        const savedBestScore = localStorage.getItem(`memory-best-score-${difficulty}`);
        const savedBestTime = localStorage.getItem(`memory-best-time-${difficulty}`);
        
        if (savedBestScore) {
            setBestScore(parseInt(savedBestScore));
        }
        if (savedBestTime) {
            setBestTime(parseInt(savedBestTime));
        }
    }, [difficulty]);

    // Format time display
    const formatTime = useCallback((seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // Calculate accuracy
    const accuracy = useMemo(() => {
        if (moves === 0) return 100;
        const perfectMoves = currentGamePairs; // Each pair requires 1 move
        return Math.round((perfectMoves / moves) * 100);
    }, [moves, currentGamePairs]);

    // When opening the modal, reset tempPairs to selectedPairs
    useEffect(() => {
        if (showPairSelectorModal) {
            setTempPairs(selectedPairs);
        }
    }, [showPairSelectorModal, selectedPairs]);

    // Start game with selected pairs
    const startGameWithPairs = useCallback((pairs = selectedPairs) => {
        if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
        if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
        if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
        setGameKey(prev => prev + 1); // Force fresh randomization
        const { cards: newCards, pairsCount } = createCards(pairs, true); // Force new words for new game
        setCards(newCards);
        setCurrentGamePairs(pairsCount);
        setFlippedCards([]);
        setMatchedPairs([]);
        setScore(0);
        setMoves(0);
        setGameTime(0);
        setStartTime(Date.now());
        setGameState('playing');
        setShowPairSelectorModal(false);
        setRevealUsed(false);
        setIsRevealing(false);
        setRevealRemaining(0);
        setIsPreviewing(true);
        // Show all cards for preview
        setCards(prev => prev.map(c => ({ ...c, isFlipped: true })));
        setHintCount(3);
        setPairImages({});
        setPairImageLoading({});
        setPairImageError({});
        
        // Scroll to top after a short delay to ensure state updates
        setTimeout(() => {
            if (gameContainerRef.current) {
                gameContainerRef.current.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }, 100);
    }, [createCards, selectedPairs]);

    // Scroll to top when game starts
    useEffect(() => {
        if (gameState === 'playing' && gameContainerRef.current) {
            gameContainerRef.current.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }, [gameState]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
            if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
            if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
            if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
        };
    }, []);

  // Announce preview hint for screen readers
  useEffect(() => {
    if (isPreviewing) {
      setAnnounce(t('memory.pressReadyToStart'));
    } else {
      setAnnounce('');
    }
  }, [isPreviewing, t]);

    // Use a hint to briefly reveal one random unmatched pair
    const handleHint = useCallback(() => {
        if (
            gameState !== 'playing' ||
            isPreviewing ||
            isRevealing ||
            isProcessing ||
            hintCount <= 0 ||
            cards.length === 0
        ) {
            return;
        }

        // Collect unmatched pairIds
        const unmatchedPairIds = Array.from(
            new Set(
                cards
                    .filter(c => !c.isMatched)
                    .map(c => c.pairId)
            )
        );
        if (unmatchedPairIds.length === 0) return;

        const targetPairId = unmatchedPairIds[Math.floor(Math.random() * unmatchedPairIds.length)];

        // Determine which cards we will flip due to the hint (so we can revert only those)
        const toFlipIds = cards
            .filter(c => c.pairId === targetPairId && !c.isMatched && !c.isFlipped)
            .map(c => c.id);

        // If both already flipped (rare), do nothing but still don't consume a hint
        if (toFlipIds.length === 0) {
            return;
        }

        setHintCount(prev => Math.max(prev - 1, 0));
        interactionLockedRef.current = true;
        setIsProcessing(true);

        // Flip the target pair (only those that are currently face-down)
        setCards(prev => prev.map(c => (
            c.pairId === targetPairId ? { ...c, isFlipped: true } : c
        )));

        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = setTimeout(() => {
            // Revert only the cards that were flipped by the hint and remain unmatched
            setCards(prev => prev.map(c => (
                c.pairId === targetPairId && !c.isMatched && toFlipIds.includes(c.id)
                    ? { ...c, isFlipped: false }
                    : c
            )));
            setIsProcessing(false);
            interactionLockedRef.current = false;
        }, HINT_DURATION_MS);
    }, [gameState, isPreviewing, isRevealing, isProcessing, hintCount, cards]);

    if (gameState === 'waiting') {
        return (
            <div className={styles.memoryGame} key={gameKey}>
                <div className={styles.gameIntro}>
                    <div className={styles.introContent}>
                        <FaBrain className={styles.introIcon} />
                        <h2>{t('memory.title')}</h2>
                        
                        <div className={styles.gameInstructions}>
                            <h3>{t('memory.howToPlay')}</h3>
                            <ol>
                                <li><strong>{t('memory.findPairs')}:</strong> {t('memory.findPairsDesc')}</li>
                                <li><strong>{t('memory.matchWords')}:</strong> {t('memory.matchWordsDesc')}</li>
                                <li><strong>{t('memory.completePairs')}:</strong> {t('memory.completePairsDesc')}</li>
                                <li><strong>{t('memory.useStrategy')}:</strong> {t('memory.useStrategyDesc')}</li>
                            </ol>
                            
                            <div className={styles.gameTips}>
                                <h4>{t('memory.tips')}:</h4>
                                <ul>
                                    <li>• {t('memory.tipMatchedPairs')}</li>
                                    <li>• {t('memory.tipScore')}</li>
                                    <li>• {t('memory.tipSave')}</li>
                                </ul>
                            </div>
                            
                            <div className={styles.cardExample}>
                                <h4>{t('memory.cardTypes')}:</h4>
                                <div className={styles.exampleCards}>
                                    <div className={`${styles.exampleCard} ${styles.wordCard}`}>
                                        <span>{t('memory.englishWord')}</span>
                                        <small>{t('word')}</small>
                                    </div>
                                    <div className={`${styles.exampleCard} ${styles.translationCard}`}>
                                        <span>{t('translation')}</span>
                                        <small>{t('translation')}</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.gameStats}>
                            <div className={styles.stat}>
                                <FaStar />
                                <span>{t('memory.bestScore', { score: bestScore })}</span>
                            </div>
                            {bestTime && (
                                <div className={styles.stat}>
                                    <FaClock />
                                    <span>{t('memory.bestTime', { time: formatTime(bestTime) })}</span>
                                </div>
                            )}
                        </div>
                        
                        <button className={styles.startGameBtn} onClick={initializeGame}>
                            <GiCardAceHearts />
                            {t('memory.newGame')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.memoryGame} ref={gameContainerRef} key={gameKey}>
            {/* Game Header */}
            <div className={styles.gameHeader}>
                <div className={styles.headerLeft}>
                    <h2>{t('memory.title')}</h2>
                    {isPreviewing && (
                        <span className={`${styles.statusChip} ${styles.statusPreview}`} aria-live="polite">
                            <FaEye /> {t('memory.preview')}
                        </span>
                    )}
                    {isRevealing && (
                        <span className={`${styles.statusChip} ${styles.statusWarning}`}>
                            <FaEye /> {t('memory.revealInSeconds', { seconds: revealRemaining })}
                        </span>
                    )}
                </div>
                <div className={styles.statsRow}>
                    <div className={styles.stat}>
                        <FaStar />
                        <span>{t('memory.score', { score })}</span>
                    </div>
                    <div className={styles.stat}>
                        <FaTrophy />
                        <span>{t('memory.moves', { moves })}</span>
                    </div>
                    <div className={styles.stat}>
                        <FaClock />
                        <span>{t('memory.time', { time: formatTime(gameTime) })}</span>
                    </div>
                    <div className={styles.stat}>
                        <FaBrain />
                        <span>{t('memory.pairsFound', { pairs: matchedPairs.length, total: currentGamePairs })}</span>
                    </div>
                </div>
                <div className={styles.actionsRow}>
                    {isPreviewing ? (
                        <button
                            className={`${styles.revealBtn} ${styles.previewMode}`}
                            onClick={handleReady}
                            disabled={isProcessing}
                            title={t('memory.ready')}
                        >
                            <FaEye />
                            {t('memory.ready')}
                        </button>
                    ) : (
                        <>
                            <button
                                className={`${styles.hintBtn}${hintCount <= 0 ? ` ${styles.disabled}` : ''}`}
                                onClick={handleHint}
                                disabled={gameState !== 'playing' || hintCount <= 0 || isProcessing || isRevealing}
                                title={`${t('matching.hint')} (${hintCount} ${t('common:left')})`}
                                aria-label={`${t('matching.hint')} (${hintCount} ${t('common:left')})`}
                            >
                                <FaLightbulb />
                                <span>{t('matching.hint')}</span>
                                <span className={styles.hintCount} aria-hidden="true">{hintCount}</span>
                            </button>
                            <button
                                className={`${styles.revealBtn}${revealAllCount <= 0 ? ` ${styles.disabled}` : ''}`}
                                onClick={handleRevealAll}
                                disabled={gameState !== 'playing' || revealAllCount <= 0 || isProcessing || isRevealing}
                                title={`${revealAllCount <= 0 ? t('memory.revealUsed') : t('memory.revealAll')} (${Math.max(revealAllCount, 0)} ${t('common:left')})`}
                                aria-label={`${t('memory.revealAll')} (${Math.max(revealAllCount, 0)} ${t('common:left')})`}
                            >
                                <FaEye />
                                <span>{isRevealing ? t('memory.revealInSeconds', { seconds: revealRemaining }) : t('memory.revealAll')}</span>
                                <span className={styles.hintCount} aria-hidden="true">{Math.max(revealAllCount, 0)}</span>
                            </button>
                        </>
                    )}
                    <button className={styles.restartBtn} onClick={() => setShowPairSelectorModal(true)}>
                        <FaRedo />
                        {t('memory.newGame')}
                    </button>
                </div>
            </div>

            {/* Game Board */}
            <div className={`${styles.gameBoard}${isPreviewing || isRevealing ? ` ${styles.previewing}` : ''}`}>
                
                <div className={styles.cardsGrid}>
                    {cards.map((card) => (
                        <div
                            key={card.id}
                            className={`${styles.memoryCard} ${card.isFlipped ? styles.flipped : ''} ${card.isMatched ? styles.matched : ''}`}
                            onClick={() => handleCardFlip(card.id)}
                        >
                            <div className={styles.cardInner}>
                                <div className={styles.cardFront}>
                                    <GiCardAceHearts />
                                </div>
                                <div
                                    className={`${styles.cardBack}${card.isMatched && pairImages[card.pairId] ? ` ${styles.withImage}` : ''}`}
                                    style={card.isMatched && pairImages[card.pairId]
                                        ? {
                                            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.35) 100%), url(${pairImages[card.pairId].smallUrl || pairImages[card.pairId].url})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            backgroundRepeat: 'no-repeat',
                                        }
                                        : undefined}
                                >
                                    <div
                                        className={`${styles.contentOverlay}${card.isMatched && pairImages[card.pairId] && pairImageLoaded[card.pairId] ? ` ${styles.clickable}` : ''}`}
                                        title={card.isMatched && pairImages[card.pairId] ? t('clickToFullscreen', { ns: 'vocabulary' }) : undefined}
                                        role={card.isMatched && pairImages[card.pairId] ? 'button' : undefined}
                                        tabIndex={card.isMatched && pairImages[card.pairId] ? 0 : -1}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (card.isMatched && pairImages[card.pairId] && pairImageLoaded[card.pairId]) {
                                                openFullscreenForPair(card.pairId);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (card.isMatched && pairImages[card.pairId] && pairImageLoaded[card.pairId]) {
                                                    openFullscreenForPair(card.pairId);
                                                }
                                            }
                                        }}
                                    >
                                        <span className={styles.cardContent}>{card.content}</span>
                                        <span className={styles.cardType}>
                                            {card.type === 'word' ? t('word') : t('translation')}
                                        </span>
                                    </div>
                                    {card.isMatched && pairImages[card.pairId] && (
                                        <div className={styles.unsplashAttribution}>
                                            <span className={styles.attributionText}>
                                                {t('photoBy', { ns: 'vocabulary' })}{' '}
                                                <a
                                                    href={`${pairImages[card.pairId].photographerUrl}?utm_source=vocabulary_learning&utm_medium=referral`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.photographerLink}
                                                >
                                                    {pairImages[card.pairId].photographer}
                                                </a>{' '}
                                                {t('onUnsplash', { ns: 'vocabulary' })}{' '}
                                                <a
                                                    href="https://unsplash.com?utm_source=vocabulary_learning&utm_medium=referral"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.unsplashLink}
                                                >
                                                    Unsplash
                                                </a>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Game Complete Modal */}
            {gameState === 'complete' && (
                <Modal
                    onClose={resetGameState}
                    buttons={[
                        {
                            text: t('back', { ns: 'common' }),
                            className: styles.backBtn,
                            onClick: resetGameState
                        },
                        {
                            text: t('memory.playAgain'),
                            className: styles.playAgainBtn,
                            onClick: () => setShowPairSelectorModal(true)
                        }
                    ]}
                >
                    <div className={styles.completionIcon}>
                        <img 
                            src="/android-chrome-192x192.webp" 
                            alt="Game Complete" 
                            className={styles.appIcon}
                        />
                    </div>
                    
                    <h3 className={styles.completionTitle}>{t('memory.gameComplete')}</h3>
                    
                    <div className={styles.finalStats}>
                        <div className={styles.stat}>
                            <FaStar />
                            <span>{t('memory.finalScore', { score })}</span>
                        </div>
                        <div className={styles.stat}>
                            <FaTrophy />
                            <span>{t('memory.moves', { moves })}</span>
                        </div>
                        <div className={styles.stat}>
                            <FaClock />
                            <span>{t('memory.time', { time: formatTime(gameTime) })}</span>
                        </div>
                        <div className={styles.stat}>
                            <FaBrain />
                            <span>{t('memory.accuracy', { accuracy })}</span>
                        </div>
                    </div>

                    {score > bestScore && (
                        <div className={styles.newRecord}>
                            <FaStar />
                            <span>{t('memory.newBestScore')}!</span>
                        </div>
                    )}

                    {bestTime && gameTime < bestTime && (
                        <div className={styles.newRecord}>
                            <FaClock />
                            <span>{t('memory.newBestTime')}!</span>
                        </div>
                    )}
                </Modal>
            )}

            {/* Pair Selector Modal */}
            {showPairSelectorModal && (
                <Modal
                    onClose={() => setShowPairSelectorModal(false)}
                    title={t('memory.title')}
                    description={t('memory.pairsSelectorTooltip')}
                    buttons={[
                        {
                            text: t('close'),
                            className: styles.cancelBtn,
                            onClick: () => setShowPairSelectorModal(false)
                        },
                        {
                            text: t('memory.newGame'),
                            className: styles.startGameBtn,
                            onClick: () => {
                                setSelectedPairs(tempPairs);
                                startGameWithPairs(tempPairs);
                            }
                        }
                    ]}
                >
                    <FaBrain className={styles.modalIcon} />
                    
                    <div className={styles.pairsSelectorModal}>
                        <PairSlider
                            value={tempPairs}
                            min={MIN_PAIRS_PER_GAME}
                            max={MAX_PAIRS_PER_GAME}
                            onFinalChange={setTempPairs}
                            minLabel={t('memory.pairsSelectorMin')}
                            maxLabel={t('memory.pairsSelectorMax')}
                            tooltip={t('memory.pairsSelectorTooltip')}
                        />
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default MemoryGame; 