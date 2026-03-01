import { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FaStar, FaBolt, FaGem, FaTrophy } from 'react-icons/fa';
import ProgressBar from '../../ProgressBar';

// Extract StatItem to a separate memoized component to prevent unnecessary re-renders
const StatItem = memo(({ icon: IconComponent, value, label }) => (
    <div className="stat-item">
        <IconComponent className="stat-icon" />
        <div className="stat-content">
            <span className="stat-value">{value}</span>
            <span className="stat-label">{label}</span>
        </div>
    </div>
));

StatItem.displayName = 'StatItem';

// Extract ThemeSection to prevent unnecessary re-renders when only stats change
const ThemeSection = memo(({ ThemeIcon, difficulty, t }) => (
    <div className="theme-section">
        <ThemeIcon className="theme-icon" />
        <div className="theme-info">
            <h2>{t(`storyThemes.${difficulty.toLowerCase()}.title`)}</h2>
            <p>{t(`storyThemes.${difficulty.toLowerCase()}.description`)}</p>
        </div>
    </div>
));

ThemeSection.displayName = 'ThemeSection';

const AdventureHeader = memo(({
    storyTheme,
    difficulty,
    t,
    playerStats,
    overallProgress,
    completedWords,
    words
}) => {
    // Cache the theme icon to prevent prop drilling and re-renders
    const ThemeIcon = useMemo(() => storyTheme.icon, [storyTheme.icon]);

    // Memoized progress label with dependency optimization
    const progressLabel = useMemo(() => {
        const current = completedWords?.size || 0;
        const total = words?.length || 0;
        return t('adventure.progress', { current, total });
    }, [t, completedWords?.size, words?.length]);

    // Static animation variants (moved outside component in production)
    const animationVariants = useMemo(() => ({
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 },
        transition: { 
            duration: 0.2, // Further reduced for mobile performance
            ease: "easeOut" // More performant easing
        }
    }), []);

    // Memoized difficulty string to prevent repeated toLowerCase calls
    const difficultyLower = useMemo(() => difficulty?.toLowerCase() || '', [difficulty]);

    // Optimized stats items with better memoization
    const statsItems = useMemo(() => {
        // Early return if playerStats is not available
        if (!playerStats) return [];
        
        return [
            {
                id: 'level', // Add unique IDs for better React key performance
                icon: FaStar,
                value: playerStats.level || 0,
                label: t('adventure.level')
            },
            {
                id: 'streak',
                icon: FaBolt,
                value: playerStats.streak || 0,
                label: t('adventure.streak')
            },
            {
                id: 'gems',
                icon: FaGem,
                value: playerStats.gems || 0,
                label: t('adventure.gems')
            },
            {
                id: 'score',
                icon: FaTrophy,
                value: playerStats.totalScore || 0,
                label: t('adventure.score')
            }
        ];
    }, [
        playerStats?.level, 
        playerStats?.streak, 
        playerStats?.gems, 
        playerStats?.totalScore, 
        t
    ]);

    // Memoized render function for stats to prevent recreation
    const renderStatsItems = useCallback(() => {
        return statsItems.map((item) => (
            <StatItem
                key={item.id} // Use stable ID instead of index
                icon={item.icon}
                value={item.value}
                label={item.label}
            />
        ));
    }, [statsItems]);

    return (
        <motion.div
            className="adventure-header"
            {...animationVariants}
            // Optimize motion component performance
            layout={false} // Disable layout animations if not needed
            initial="initial"
            animate="animate"
        >
            {/* Main Header with Theme and Progress */}
            <div className="header-main">
                <ThemeSection 
                    ThemeIcon={ThemeIcon}
                    difficulty={difficultyLower}
                    t={t}
                />
                
                <div className="progress-section">
                    <ProgressBar
                        progress={overallProgress || 0}
                        label={progressLabel}
                    />
                </div>
            </div>

            {/* Key Stats Row */}
            <div className="stats-row">
                {renderStatsItems()}
            </div>
        </motion.div>
    );
});

AdventureHeader.displayName = 'AdventureHeader';

export default AdventureHeader;