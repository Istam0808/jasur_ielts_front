import { useCallback, useRef, useEffect, useMemo } from 'react';
import { DIFFICULTY_MULTIPLIERS, ACHIEVEMENT_DEFINITIONS } from '../constants';

// Stable debounce utility
function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

export const useGameLogic = (difficulty, getWordKey, t) => {
    const timersRef = useRef(new Map());     // stores timeouts
    const rafRef = useRef(new Map());        // stores raf IDs
    const deviceInfoRef = useRef({
        isMobile: false,
        isLowEndDevice: false,
        supportsWebGL: true,
        pixelRatio: 1,
    });
    const computationCacheRef = useRef(new Map());

    //  Device detection with resize handling
    useEffect(() => {
        const detectDevice = () => {
            const { innerWidth: w, innerHeight: h, devicePixelRatio } = window;
            const ua = navigator.userAgent.toLowerCase();
            deviceInfoRef.current = {
                isMobile: w <= 768 || /mobile|iphone|ipod|android/.test(ua),
                isLowEndDevice: w <= 480 || /android.+mobile|iphone|ipod/.test(ua),
                supportsWebGL: !!window.WebGLRenderingContext,
                pixelRatio: devicePixelRatio || 1,
            };
        };
        const onResize = debounce(detectDevice, 200);
        detectDevice();
        window.addEventListener('resize', onResize, { passive: true });
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        const timers = timersRef.current;
        const rafs = rafRef.current;
        const cache = computationCacheRef.current; // snapshot now

        return () => {
            timers.forEach((timer) => clearTimeout(timer));
            timers.clear();

            rafs.forEach((raf) => cancelAnimationFrame(raf));
            rafs.clear();

            cache.clear();
        };
    }, []);

    const difficultyMultiplier = useMemo(() => {
        const key = `difficulty_${difficulty}`;
        if (computationCacheRef.current.has(key)) {
            return computationCacheRef.current.get(key);
        }
        const multiplier = DIFFICULTY_MULTIPLIERS[difficulty?.toLowerCase() || 'a1'] || 1;
        computationCacheRef.current.set(key, multiplier);
        return multiplier;
    }, [difficulty]);

    //  Level progression
    const calculateLevelUp = useCallback((currentExp, currentLevel) => {
        const cacheKey = `level_${currentExp}_${currentLevel}`;
        if (computationCacheRef.current.has(cacheKey)) {
            return computationCacheRef.current.get(cacheKey);
        }
        const baseExp = 100;
        const expMultiplier = 1.5;
        let expToNext = baseExp;
        let level = currentLevel;
        let exp = currentExp;

        while (exp >= expToNext) {
            exp -= expToNext;
            level++;
            expToNext = Math.round(baseExp * Math.pow(expMultiplier, level - 1));
        }

        const result = {
            newLevel: level,
            remainingExp: exp,
            expToNext,
            leveledUp: level > currentLevel,
        };
        computationCacheRef.current.set(cacheKey, result);
        return result;
    }, []);

    //  Achievement checking
    const checkAchievements = useCallback((stats, achievements) => {
        const cacheKey = `achievements_${stats.totalScore}_${stats.streak}_${achievements.size}`;
        if (computationCacheRef.current.has(cacheKey)) {
            return computationCacheRef.current.get(cacheKey);
        }

        const unlocked = [];
        for (const def of ACHIEVEMENT_DEFINITIONS) {
            if (!achievements.has(def.id) && stats[def.key] >= def.threshold) {
                unlocked.push({
                    id: def.id,
                    title: t(def.title),
                    description: t(def.description),
                    icon: def.icon,
                });
            }
        }

        computationCacheRef.current.set(cacheKey, unlocked);
        return unlocked;
    }, [t]);

    //  Word completion
    const handleWordComplete = useCallback((
        word,
        completedWords,
        setCompletedWords,
        setPlayerStats,
        setChapterScores,
        currentChapter,
        setAchievements,
        setShowAchievement,
        achievements,
        currentChapterData
    ) => {
        if (!word) return;
        const wordKey = getWordKey(word);
        if (completedWords.has(wordKey)) return;

        const device = deviceInfoRef.current;

        const perform = () => {
            // Mark word as completed
            setCompletedWords(prev => new Set(prev).add(wordKey));

            const baseScore = 10;
            setPlayerStats(prev => {
                const newStreak = prev.streak + 1;
                const streakBonus = Math.floor(newStreak / 3) * 5;
                const wordScore = Math.round((baseScore + streakBonus) * difficultyMultiplier);
                const expGain = Math.round(wordScore * 0.5);
                const newExp = prev.experience + expGain;
                const newTotalScore = prev.totalScore + wordScore;

                const levelUp = calculateLevelUp(newExp, prev.level);
                const gems = prev.gems + 1 + Math.floor(newStreak / 5) * 2;

                const updated = {
                    ...prev,
                    streak: newStreak,
                    maxStreak: Math.max(prev.maxStreak, newStreak),
                    experience: levelUp.leveledUp ? levelUp.remainingExp : newExp,
                    level: levelUp.leveledUp ? levelUp.newLevel : prev.level,
                    experienceToNext: levelUp.leveledUp ? levelUp.expToNext : prev.experienceToNext,
                    totalScore: newTotalScore,
                    gems,
                };

                setChapterScores(s => ({
                    ...s,
                    [currentChapter]: (s[currentChapter] || 0) + wordScore,
                }));

                return updated;
            });

            // Achievement check
            const doAchievements = () => {
                setPlayerStats(stats => {
                    const freq = device.isLowEndDevice ? 100 : device.isMobile ? 75 : 50;
                    if (stats.totalScore > 0 && stats.totalScore % freq === 0) {
                        const newOnes = checkAchievements(stats, achievements);
                        if (newOnes.length) {
                            setAchievements(prev => new Set([...prev, ...newOnes.map(a => a.id)]));
                            setShowAchievement(newOnes[0]);
                            const duration = device.isLowEndDevice ? 1500 : device.isMobile ? 2000 : 2500;
                            const timer = setTimeout(() => {
                                setShowAchievement(null);
                                timersRef.current.delete('achievement');
                            }, duration);
                            timersRef.current.set('achievement', timer);
                        }
                    }
                    return stats;
                });
            };

            // Chapter completion
            const doChapterCompletion = () => {
                if (!currentChapterData?.words?.length) return;
                const allCompleted = currentChapterData.words.every(w =>
                    completedWords.has(getWordKey(w)) || w === word
                );
                if (allCompleted) {
                    setPlayerStats(p => ({
                        ...p,
                        perfectChapters: p.perfectChapters + 1,
                        gems: p.gems + 5,
                    }));
                }
            };

            // Scheduling
            if (device.isLowEndDevice) {
                setTimeout(doAchievements, 100);
                setTimeout(doChapterCompletion, 200);
            } else {
                const raf1 = requestAnimationFrame(doAchievements);
                const raf2 = requestAnimationFrame(doChapterCompletion);
                rafRef.current.set(raf1, raf1);
                rafRef.current.set(raf2, raf2);
            }
        };

        if (device.isLowEndDevice) {
            setTimeout(perform, 0);
        } else {
            const rafId = requestAnimationFrame(perform);
            rafRef.current.set(rafId, rafId);
        }
    }, [getWordKey, difficultyMultiplier, calculateLevelUp, checkAchievements]);

    //  Word attempt
    const handleWordAttempt = useCallback((word, setAttemptedWords, setPlayerStatsOptional) => {
        if (!word) return;
        const wordKey = getWordKey(word);
        queueMicrotask(() => {
            setAttemptedWords(prev => prev.has(wordKey) ? prev : new Set(prev).add(wordKey));
            if (typeof setPlayerStatsOptional === 'function') {
                setPlayerStatsOptional(p => ({ ...p, streak: 0 }));
            }
        });
    }, [getWordKey]);

    //  Cache management
    const clearCache = useCallback(() => {
        const cache = computationCacheRef.current;
        if (cache.size > 100) {
            const entries = Array.from(cache.entries()).slice(-50);
            cache.clear();
            entries.forEach(([k, v]) => cache.set(k, v));
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(clearCache, 30000);
        return () => clearInterval(interval);
    }, [clearCache]);

    return {
        handleWordComplete,
        handleWordAttempt,
        timersRef,
        clearCache,
    };
};
