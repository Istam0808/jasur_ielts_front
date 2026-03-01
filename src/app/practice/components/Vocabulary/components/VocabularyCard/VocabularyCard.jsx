'use client';

import { useState, memo, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { useVocabularyImages } from '@/hooks/useVocabularyImages';
import SaveButton from './components/SaveButton';
import FlashcardCard from './components/FlashcardCard';
import QuizCard from './components/QuizCard';
import RegularCard from './components/RegularCard';
import ExamplesModal from './components/ExamplesModal';
import '../styles/vocabulary-card/index.scss';

const VocabularyCard = memo(({
    word,
    studyMode = 'regular',
    showTranslations = true,
    isSaved = false,
    onToggleSave,
    langKey = 'en',
    difficulty = 'b1',
    onComplete,
    onAttempt,
    isCompleted = false
}) => {
    const { t } = useTranslation(['practice', 'vocabulary']);
    const [isFlipped, setIsFlipped] = useState(false);
    const [showExamplesModal, setShowExamplesModal] = useState(false);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [quizState, setQuizState] = useState({
        selectedAnswer: null,
        showResult: false,
        isCorrect: false
    });
    
    // Refs for cleanup and management
    const timeoutRef = useRef(null);
    const utteranceRef = useRef(null);
    const modalTimeoutRef = useRef(null);
    const onCompleteTimeoutRef = useRef(null);
    const rafRef = useRef(null);
    
    const isMobile = useMobileDetection();

    // Memoize word validation to prevent repeated checks
    const isValidWord = useMemo(() => {
        return word && typeof word === 'object' && word.word;
    }, [word]);

    // Memoize image parameters to prevent unnecessary hook re-runs
    const imageParams = useMemo(() => ({
        wordText: word?.word,
        translation: word?.translation?.[langKey] || word?.translation?.en,
        shouldFetch: showExamplesModal,
        imageCount: isMobile ? 2 : 4
    }), [word?.word, word?.translation, langKey, showExamplesModal, isMobile]);

    // Get vocabulary images with memoized parameters
    const { images, loading: imagesLoading, error: imagesError } = useVocabularyImages(
        imageParams.wordText,
        imageParams.translation,
        imageParams.shouldFetch,
        imageParams.imageCount
    );

    // Early return for invalid word
    if (!isValidWord) {
        console.warn(t('error.invalidWordProp', { ns: 'vocabulary' }));
        return null;
    }

    // Optimized speech synthesis with debouncing
    const speakWord = useCallback(async () => {
        if (!('speechSynthesis' in window) || isAudioPlaying || !word?.word) return;

        // Cancel any existing speech
        if (utteranceRef.current) {
            speechSynthesis.cancel();
        }

        // Clear existing timeouts
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        setIsAudioPlaying(true);

        try {
            const utterance = new SpeechSynthesisUtterance(word.word);
            utterance.lang = 'en-US';
            // Set slower speech rate for better pronunciation clarity
            utterance.rate = 0.8; // 0.8 = 80% of normal speed (slower)
            utteranceRef.current = utterance;

            const cleanup = () => {
                setIsAudioPlaying(false);
                utteranceRef.current = null;
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
            };

            utterance.onend = cleanup;
            utterance.onerror = (error) => {
                console.warn(t('error.speechSynthesisError', { ns: 'vocabulary' }), error);
                cleanup();
            };

            speechSynthesis.speak(utterance);

            // Safety timeout
            timeoutRef.current = setTimeout(() => {
                speechSynthesis.cancel();
                cleanup();
            }, isMobile ? 2000 : 3000);
        } catch (error) {
            console.error(t('error.speakingError', { ns: 'vocabulary' }), error);
            setIsAudioPlaying(false);
        }
    }, [word?.word, isAudioPlaying, isMobile]);

    // Optimized modal handlers with cleanup
    const handleCloseModal = useCallback(() => {
        if (modalTimeoutRef.current) {
            clearTimeout(modalTimeoutRef.current);
            modalTimeoutRef.current = null;
        }
        setShowExamplesModal(false);
    }, []);

    const handleOpenExamplesModal = useCallback((e) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (modalTimeoutRef.current) {
            clearTimeout(modalTimeoutRef.current);
            modalTimeoutRef.current = null;
        }
        
        setShowExamplesModal(true);
    }, []);

    // Memoize clickable selectors to prevent recreation
    const clickableSelectors = useMemo(() => [
        '.example-container',
        '.audio-btn',
        'button',
        '.examples-trigger',
        '.save-btn'
    ], []);

    const handleCardClick = useCallback((e) => {
        if (clickableSelectors.some(selector => e.target.closest(selector))) {
            return;
        }

        if (studyMode === 'flashcards') {
            setIsFlipped(prev => !prev);
        }
    }, [studyMode, clickableSelectors]);

    // Optimized quiz answer handler with RAF batching
    const handleQuizAnswer = useCallback((selectedOption) => {
        if (quizState.showResult || !selectedOption) {
            return;
        }

        const isCorrect = selectedOption.isCorrect;
        
        // Batch state update
        setQuizState({
            selectedAnswer: selectedOption.id,
            showResult: true,
            isCorrect: isCorrect
        });

        // Use RAF to defer callback execution and prevent blocking
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }

        rafRef.current = requestAnimationFrame(() => {
            // Wrong answers should count as attempts; correct answers as completion
            if ((studyMode === 'adventure' || studyMode === 'quiz') && typeof onAttempt === 'function' && !isCorrect) {
                onAttempt();
            }

            // Call onComplete for correct answers only
            if ((studyMode === 'adventure' || studyMode === 'quiz') && typeof onComplete === 'function' && isCorrect) {
                if (onCompleteTimeoutRef.current) {
                    clearTimeout(onCompleteTimeoutRef.current);
                }
                
                const delay = isMobile ? 600 : 800; // Reduced delays for better UX
                
                onCompleteTimeoutRef.current = setTimeout(() => {
                    onComplete();
                    onCompleteTimeoutRef.current = null;
                }, delay);
            }
            rafRef.current = null;
        });
    }, [quizState.showResult, studyMode, onComplete, onAttempt, isMobile]);

    const handleSaveToggle = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof onToggleSave === 'function') {
            onToggleSave();
        }
    }, [onToggleSave]);

    // Optimized escape key handler with passive event listener
    useEffect(() => {
        if (!showExamplesModal) return;

        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                handleCloseModal();
            }
        };

        document.addEventListener('keydown', handleEscapeKey, { passive: false });
        return () => document.removeEventListener('keydown', handleEscapeKey);
    }, [showExamplesModal, handleCloseModal]);

    // Body scroll management with proper cleanup
    useEffect(() => {
        if (showExamplesModal) {
            const originalOverflow = document.body.style.overflow;
            const originalPosition = document.body.style.position;
            
            document.body.style.overflow = 'hidden';
            // Prevent iOS scroll bounce on mobile
            if (isMobile) {
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
            }
            
            return () => {
                document.body.style.overflow = originalOverflow;
                document.body.style.position = originalPosition;
                if (isMobile) {
                    document.body.style.width = '';
                }
            };
        }
    }, [showExamplesModal, isMobile]);

    // Reset states when word or study mode changes
    useEffect(() => {
        setQuizState(prevState => {
            // Only update if actually changed to prevent unnecessary re-renders
            if (prevState.selectedAnswer === null && !prevState.showResult && !prevState.isCorrect) {
                return prevState;
            }
            return {
                selectedAnswer: null,
                showResult: false,
                isCorrect: false
            };
        });
        setIsFlipped(false);
    }, [studyMode, word?.id]);

    // Comprehensive cleanup on unmount
    useEffect(() => {
        return () => {
            // Clear all timeouts
            [timeoutRef, modalTimeoutRef, onCompleteTimeoutRef].forEach(ref => {
                if (ref.current) {
                    clearTimeout(ref.current);
                    ref.current = null;
                }
            });
            
            // Clear RAF
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            
            // Cancel speech synthesis
            if (utteranceRef.current) {
                speechSynthesis.cancel();
                utteranceRef.current = null;
            }
        };
    }, []);

    // Memoize common props to prevent recreation
    const commonProps = useMemo(() => ({
        word,
        langKey,
        isAudioPlaying,
        speakWord,
        handleOpenExamplesModal,
        t,
        isMobile
    }), [word, langKey, isAudioPlaying, speakWord, handleOpenExamplesModal, t, isMobile]);

    // Memoize card content to prevent unnecessary re-renders
    const cardContent = useMemo(() => {
        switch (studyMode) {
            case 'flashcards':
                return (
                    <FlashcardCard
                        {...commonProps}
                        isFlipped={isFlipped}
                        handleCardClick={handleCardClick}
                    />
                );
            case 'quiz':
                return (
                    <QuizCard
                        {...commonProps}
                        difficulty={difficulty}
                        quizState={quizState}
                        handleQuizAnswer={handleQuizAnswer}
                        isCompleted={isCompleted}
                    />
                );
            default:
                return (
                    <RegularCard
                        {...commonProps}
                        showTranslations={showTranslations}
                    />
                );
        }
    }, [studyMode, commonProps, isFlipped, handleCardClick, difficulty, quizState, handleQuizAnswer, isCompleted, showTranslations]);

    // Memoize style object to prevent recreation - optimized for performance
    const cardStyle = useMemo(() => ({
        // Simplified performance optimizations
        contain: 'layout style',
        willChange: 'auto',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        // Additional mobile optimizations
        ...(isMobile && {
            WebkitTransform: 'translateZ(0)',
            WebkitBackfaceVisibility: 'hidden'
        })
    }), [isMobile]);

    return (
        <>
            <div 
                className={`vocabulary-card modern-card ${studyMode}-mode`}
                style={cardStyle}
            >
                <SaveButton
                    isSaved={isSaved}
                    onToggleSave={handleSaveToggle}
                    t={t}
                />

                {cardContent}
            </div>

            <AnimatePresence mode="wait">
                {showExamplesModal && (
                    <ExamplesModal
                        word={word}
                        langKey={langKey}
                        images={images}
                        imagesLoading={imagesLoading}
                        imagesError={imagesError}
                        onClose={handleCloseModal}
                        t={t}
                        isMobile={isMobile}
                    />
                )}
            </AnimatePresence>
        </>
    );
});

VocabularyCard.displayName = 'VocabularyCard';

export default VocabularyCard;