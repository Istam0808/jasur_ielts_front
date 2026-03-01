import { FaStar, FaTrophy, FaGem, FaFire, FaBolt } from 'react-icons/fa';
import { GiTreasureMap, GiCrown, GiShield, GiMagicPortal } from 'react-icons/gi';

// Difficulty multipliers for scoring
export const DIFFICULTY_MULTIPLIERS = {
    a1: 1,
    a2: 1.2,
    b1: 1.5,
    b2: 2,
    c1: 2.5,
    c2: 3
};

// Achievement definitions
export const ACHIEVEMENT_DEFINITIONS = [
    { id: 'streak_5', threshold: 5, key: 'streak', title: 'adventure.hotStreak', description: 'adventure.hotStreakDesc', icon: FaFire },
    { id: 'streak_10', threshold: 10, key: 'streak', title: 'adventure.unstoppable', description: 'adventure.unstoppableDesc', icon: FaBolt },
    { id: 'perfect_1', threshold: 1, key: 'perfectChapters', title: 'adventure.perfectionist', description: 'adventure.perfectionistDesc', icon: FaStar },
    { id: 'level_5', threshold: 5, key: 'level', title: 'adventure.risingStar', description: 'adventure.risingStarDesc', icon: FaGem }
];

// Story themes for different difficulty levels
export const STORY_THEMES = {
    a1: {
        color: "#10B981",
        colorRgb: "16, 185, 129",
        icon: GiTreasureMap
    },
    a2: {
        color: "#6B2DD2",
        colorRgb: "107, 45, 210",
        icon: GiMagicPortal
    },
    b1: {
        color: "#FF6636",
        colorRgb: "255, 102, 54",
        icon: FaBolt
    },
    b2: {
        color: "#9C27B0",
        colorRgb: "156, 39, 176",
        icon: GiShield
    },
    c1: {
        color: "#ef4444",
        colorRgb: "239, 68, 68",
        icon: GiCrown
    },
    c2: {
        color: "#795548",
        colorRgb: "121, 85, 72",
        icon: GiCrown
    }
};

// Default player stats
export const DEFAULT_PLAYER_STATS = {
    level: 1,
    experience: 0,
    experienceToNext: 100,
    streak: 0,
    maxStreak: 0,
    totalScore: 0,
    perfectChapters: 0,
    gems: 0
}; 