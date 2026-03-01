import { memo, useMemo, useCallback } from 'react';
import { FaQuestionCircle, FaCheck, FaTimes } from 'react-icons/fa';
import { GiCrown } from 'react-icons/gi';
import AudioButton from './AudioButton';
import { useMobileDetection } from '@/hooks/useMobileDetection';

const QuizCard = memo(({
    word,
    langKey,
    difficulty,
    isAudioPlaying,
    speakWord,
    quizState,
    handleQuizAnswer,
    t,
    isCompleted = false
}) => {
    const isMobile = useMobileDetection();

    // Memoize the speak word handler to prevent unnecessary re-renders
    const handleSpeakWord = useCallback((e) => {
        e.stopPropagation();
        speakWord();
    }, [speakWord]);

    // Optimize quiz options calculation with better memoization
    const quizOptions = useMemo(() => {
        if (!word?.translation) return [];

        try {
            const shouldUseTranslations = ['a1', 'a2', 'b1'].includes(difficulty?.toLowerCase());
            
            let correctAnswer, distractorsArray = [];
            
            if (word.quiz?.correct_answer) {
                correctAnswer = shouldUseTranslations
                    ? (word.translation[langKey] || word.translation.en || word.quiz.correct_answer)
                    : (word.translation.en || word.quiz.correct_answer);
                
                const distractors = word.quiz.distractors || [];
                if (Array.isArray(distractors)) {
                    distractorsArray = distractors;
                } else if (typeof distractors === 'object' && distractors !== null) {
                    distractorsArray = shouldUseTranslations
                        ? (distractors[langKey] || distractors.en || [])
                        : (distractors.en || []);
                }
            } else {
                // Fallback: use translation as correct answer, no distractors available
                correctAnswer = shouldUseTranslations
                    ? (word.translation[langKey] || word.translation.en)
                    : (word.translation.en);
                
                distractorsArray = [];
            }

            if (!correctAnswer) {
                console.warn(t('error.noCorrectAnswer', { ns: 'vocabulary' }));
                return [];
            }

            if (!Array.isArray(distractorsArray)) {
                distractorsArray = [];
            }

            // Use a more efficient shuffling algorithm and stable IDs
            const allOptions = [correctAnswer, ...distractorsArray]
                .filter(Boolean)
                .map((option, index) => ({
                    text: option,
                    isCorrect: index === 0,
                    id: `opt-${index}` // Simplified ID generation
                }));

            // Fisher-Yates shuffle for better performance
            const shuffledOptions = [...allOptions];
            for (let i = shuffledOptions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
            }
            
            return shuffledOptions;
        } catch (error) {
            console.error(t('error.quizOptionsError', { ns: 'vocabulary' }), error);
            return [];
        }
    }, [word.quiz, word.translation, langKey, difficulty, t]);

    // Create option handler with memoization
    const createOptionHandler = useCallback((option) => {
        return () => handleQuizAnswer(option);
    }, [handleQuizAnswer]);

    if (quizOptions.length === 0) {
        return (
            <div className="quiz-card-container no-quiz-data">
                <div className="quiz-header">
                    <FaQuestionCircle className="quiz-icon" />
                    <span className="quiz-label">{t('quizMode', { ns: 'vocabulary' })}</span>
                </div>
                <div className="quiz-content">
                    <p className="no-quiz-message">{t('quiz.noDataAvailable', { ns: 'vocabulary' })}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="quiz-card-container">
            <div className="quiz-header">
                <div className="quiz-icon-container">
                    {!isCompleted && <FaQuestionCircle className="quiz-icon" />}
                    <AudioButton
                        onClick={handleSpeakWord}
                        title={t('pronounce', { ns: 'vocabulary' })}
                        isPlaying={isAudioPlaying}
                        disabled={!word?.word}
                    />
                </div>
                <span className="quiz-label">{t('quizMode', { ns: 'vocabulary' })}</span>
            </div>

            <div className="quiz-content">
                <div className="question-section">
                    <div className="word-display">
                        <h3 className="quiz-word">{word.word}</h3>
                        <div className="topic-tag">
                            <span>{word.topicName || t('noTopic', { ns: 'vocabulary' })}</span>
                        </div>
                    </div>
                    <p className="quiz-question">
                        {t('quizQuestion', { ns: 'vocabulary', word: word.word })}
                    </p>
                </div>

                <div className="quiz-options">
                    {quizOptions.map((option, index) => {
                        const isSelected = quizState.selectedAnswer === option.id;
                        const isCorrect = option.isCorrect;

                        let optionClass = 'quiz-option';
                        if (quizState.showResult) {
                            if (isCorrect) {
                                optionClass += ' correct-answer';
                            } else if (isSelected && !isCorrect) {
                                optionClass += ' incorrect-selected';
                            }
                        } else if (isSelected) {
                            optionClass += ' selected';
                        }

                        return (
                            <button
                                key={option.id}
                                className={optionClass}
                                onClick={createOptionHandler(option)}
                                disabled={quizState.showResult}
                                type="button"
                                aria-label={`Option ${index + 1}: ${option.text}`}
                            >
                                <span className="option-text">{option.text}</span>
                                {quizState.showResult && isCorrect && (
                                    <FaCheck className="result-icon" style={{ color: '#10b981' }} />
                                )}
                                {quizState.showResult && isSelected && !isCorrect && (
                                    <FaTimes className="result-icon" style={{ color: '#ef4444' }} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {quizState.showResult && (
                    <div className={`quiz-result ${quizState.isCorrect ? 'correct' : 'incorrect'}`}>
                        <div className="result-icon-large">
                            {quizState.isCorrect ? <FaCheck /> : <FaTimes />}
                        </div>
                        <div className="result-text">
                            <h4>
                                {quizState.isCorrect
                                    ? t('quiz.correct', { ns: 'vocabulary' })
                                    : t('quiz.incorrect', { ns: 'vocabulary' })
                                }
                            </h4>
                            <p>
                                {quizState.isCorrect
                                    ? t('quiz.correctFeedback', { ns: 'vocabulary' })
                                    : t('quiz.incorrectFeedback', { ns: 'vocabulary' })
                                }
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

QuizCard.displayName = 'QuizCard';

export default QuizCard;