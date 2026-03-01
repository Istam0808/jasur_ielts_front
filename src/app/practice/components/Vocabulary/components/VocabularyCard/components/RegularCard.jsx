import { memo } from 'react';
import { motion } from 'framer-motion';
import { FaEye } from 'react-icons/fa';
import { MdLightbulb } from 'react-icons/md';
import AudioButton from './AudioButton';
import { ANIMATION_VARIANTS } from '../constants/animations';

const MotionDiv = motion.div;
const MotionButton = motion.button;

const RegularCard = memo(({
    word,
    langKey,
    showTranslations,
    isAudioPlaying,
    speakWord,
    handleOpenExamplesModal,
    t
}) => (
    <MotionDiv
        className="vocab-card-container"
        whileHover={ANIMATION_VARIANTS.cardHover}
        transition={ANIMATION_VARIANTS.cardTransition}
    >
        <div className="card-header">
            <div className="word-section">
                <AudioButton
                    onClick={speakWord}
                    title={t('pronounce', { ns: 'vocabulary' })}
                    className="hover-scale"
                    isPlaying={isAudioPlaying}
                    disabled={!word?.word}
                />
                <div className="word-info">
                    <h3 className="word-text">{word.word}</h3>
                    <div className="topic-tag">
                        <span>{word.topicName || t('noTopic', { ns: 'vocabulary' })}</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="card-body">
            {showTranslations && (
                <MotionDiv
                    className="translation-section"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="translation-label">
                        <MdLightbulb className="label-icon" />
                        <span>{t('translation', { ns: 'vocabulary' })}</span>
                    </div>
                    <p className="translation">
                        {word.translation?.[langKey] || word.translation?.en || t('noTranslation', { ns: 'vocabulary' })}
                    </p>
                </MotionDiv>
            )}

            {word.example?.length > 0 && (
                <div className="examples-section">
                    <MotionButton
                        className="examples-trigger"
                        onClick={handleOpenExamplesModal}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        aria-label={t('viewExamples', { ns: 'vocabulary' })}
                    >
                        <FaEye className="trigger-icon" />
                        <span>{t('examples', { ns: 'vocabulary', count: word.example.length })}</span>
                        <div className="trigger-badge">{word.example.length}</div>
                    </MotionButton>
                </div>
            )}
        </div>
    </MotionDiv>
));

RegularCard.displayName = 'RegularCard';

export default RegularCard; 