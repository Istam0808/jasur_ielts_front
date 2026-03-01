import { motion } from 'framer-motion';
import { FaStar, FaTrophy, FaFire } from 'react-icons/fa';
import { BiSolidBookOpen } from 'react-icons/bi';

const ChapterProgress = ({
    currentChapterData,
    currentChapter,
    chapterScores,
    chapterProgressPercentage,
    playerStats,
    t
}) => {
    const stats = [
        {
            icon: <BiSolidBookOpen />,
            value: currentChapterData?.words?.length ?? 0,
            label: t('adventure.words'),
        },
        {
            icon: <FaStar />,
            value: chapterScores?.[currentChapter] ?? 0,
            label: t('adventure.points'),
        },
        {
            icon: <FaTrophy />,
            value: `${chapterProgressPercentage}%`,
            label: t('adventure.complete'),
        },
        {
            icon: <FaFire />,
            value: playerStats?.streak ?? 0,
            label: t('adventure.streak'),
        },
    ];

    return (
        <motion.div
            className="chapter-progress-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
        >
            <div className="chapter-progress">
                <div className="progress-stats">
                    {stats.map((stat, idx) => (
                        <div className="stat" key={idx}>
                            {stat.icon}
                            <span>{stat.value} {stat.label}</span>
                        </div>
                    ))}
                </div>

                <div className="chapter-progress-bar">
                    <motion.div
                        className="chapter-progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${chapterProgressPercentage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default ChapterProgress;
