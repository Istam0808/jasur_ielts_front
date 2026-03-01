import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FaBookOpen } from 'react-icons/fa';
import { MdFlipToFront, MdLightbulb } from 'react-icons/md';
import { BiSolidQuoteLeft } from 'react-icons/bi';
import AudioButton from './AudioButton';
import { ANIMATION_VARIANTS, GRADIENTS } from '../constants/animations';

const MotionDiv = motion.div;

const FlashcardCard = memo(({
    word,
    langKey,
    isFlipped,
    isAudioPlaying,
    speakWord,
    handleOpenExamplesModal,
    handleCardClick,
    t
}) => (
    <MotionDiv
        className={`flashcard-container ${isFlipped ? 'flipped' : ''}`}
        onClick={handleCardClick}
        whileHover={ANIMATION_VARIANTS.cardHover}
        transition={ANIMATION_VARIANTS.cardTransition}
        style={{
            transform: 'translate3d(0,0,0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            // iOS Safari specific fixes
            WebkitTransformStyle: 'preserve-3d',
            transformStyle: 'preserve-3d',
            WebkitPerspective: '1000px',
            perspective: '1000px',
            // Force hardware acceleration on iOS
            willChange: 'transform',
            WebkitWillChange: 'transform'
        }}
    >
        <div className="flashcard-inner">
            <div className="flashcard-front">
                <div className="card-gradient" style={{ background: GRADIENTS.base }} />
                <div className="card-content">
                    <div className="topic-badge">
                        <FaBookOpen className="topic-icon" />
                        <span>{word.topicName || t('noTopic', { ns: 'vocabulary' })}</span>
                    </div>

                    <div className="word-section">
                        <AudioButton
                            onClick={(e) => {
                                e.stopPropagation();
                                speakWord();
                            }}
                            title={t('pronounce', { ns: 'vocabulary' })}
                            isPlaying={isAudioPlaying}
                            disabled={!word?.word}
                        />
                        <h3 className="word-text">{word.word}</h3>
                    </div>

                    <div className="flip-hint">
                        <MdFlipToFront />
                        <span>{t('clickToFlip', { ns: 'vocabulary' })}</span>
                    </div>
                </div>
            </div>

            <div className="flashcard-back">
                <div className="card-gradient" style={{ background: GRADIENTS.back }} />
                <div className="card-content">
                    <div className="back-header">
                        <MdLightbulb className="header-icon" />
                    </div>

                    <div className="back-body">
                        <p className="definition-text">
                            {word.translation?.[langKey] || word.translation?.en || t('noTranslation', { ns: 'vocabulary' })}
                        </p>

                        {word.example?.length > 0 && (
                            <MotionDiv
                                className="example-container"
                                onClick={handleOpenExamplesModal}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleOpenExamplesModal(e);
                                    }
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                aria-label={t('viewExamples', { ns: 'vocabulary' })}
                            >
                                <div className="example-content">
                                    <BiSolidQuoteLeft className="quote-icon" />
                                    <p className="example-text">
                                        &ldquo;{word.example[0]}&rdquo;
                                    </p>
                                </div>
                                {word.example.length > 1 && (
                                    <div className="more-examples-badge">
                                        +{word.example.length - 1}{' '}
                                        {t('more', { ns: 'vocabulary' })}
                                    </div>
                                )}
                            </MotionDiv>
                        )}
                    </div>

                    <div className="back-footer">
                        <div className="flip-hint">
                            <MdFlipToFront />
                            <span>{t('clickToFlip', { ns: 'vocabulary' })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </MotionDiv>
));

FlashcardCard.displayName = 'FlashcardCard';

export default FlashcardCard; 