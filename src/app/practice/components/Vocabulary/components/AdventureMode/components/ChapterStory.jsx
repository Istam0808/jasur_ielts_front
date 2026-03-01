import { motion } from 'framer-motion';
import { FaPlay, FaMousePointer, FaCheckCircle, FaLightbulb } from 'react-icons/fa';
import { GiScrollUnfurled } from 'react-icons/gi';
import { MdOutlineTipsAndUpdates, MdOutlineEmojiEvents } from 'react-icons/md';
import { scrollToAdventureStart } from '@/utils/common';

const ChapterStory = ({
    currentChapter,
    currentChapterData,
    t,
    handleStartChapter
}) => {
    // Instructions data mapped for cleaner JSX
    const instructions = [
        {
            icon: <FaPlay className="instruction-icon" />,
            title: t('instructions.startJourney'),
            desc: t('instructions.startJourneyDesc'),
        },
        {
            icon: <FaMousePointer className="instruction-icon" />,
            title: t('instructions.chooseWisely'),
            desc: t('instructions.chooseWiselyDesc'),
        },
        {
            icon: <FaCheckCircle className="instruction-icon" />,
            title: t('instructions.completeAdvance'),
            desc: t('instructions.completeAdvanceDesc'),
        },
        {
            icon: <MdOutlineEmojiEvents className="instruction-icon" />,
            title: t('instructions.earnRewards'),
            desc: t('instructions.earnRewardsDesc'),
        },
    ];

    return (
        <motion.div
            className="chapter-story"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
        >
            <div className="story-content">
                {/* Story Intro */}
                <GiScrollUnfurled className="story-icon" />
                <p>
                    {t('adventure.storyText', {
                        wordCount: currentChapterData?.words?.length ?? 0,
                    })}
                </p>

                {/* Instructions */}
                <div className="game-instructions">
                    <div className="instructions-header">
                        <MdOutlineTipsAndUpdates className="instructions-icon" />
                        <h5>{t('instructions.howToPlay')}</h5>
                    </div>
                    <div className="instructions-grid">
                        {instructions.map((item, idx) => (
                            <div className="instruction-item" key={idx}>
                                <div className="instruction-icon-wrapper">
                                    {item.icon}
                                </div>
                                <div className="instruction-content">
                                    <h6>{item.title}</h6>
                                    <p>{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="instructions-tip">
                        <FaLightbulb className="tip-icon" />
                        <span>{t('instructions.tip')}</span>
                    </div>
                </div>
                <button
                    className="start-chapter-btn"
                    onClick={() => {
                        handleStartChapter();
                        // Scroll to starting point after starting chapter
                        setTimeout(() => {
                            scrollToAdventureStart({ delay: 100 });
                        }, 50);
                    }}
                >
                    <FaPlay />
                    {t('adventure.startChapter')}
                </button>
            </div>
        </motion.div>
    );
};

export default ChapterStory;
