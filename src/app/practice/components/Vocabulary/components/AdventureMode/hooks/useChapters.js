import { useMemo, useCallback, useRef, useState, useEffect } from 'react';

// Optimized Fisher-Yates shuffle with seeded randomness
const shuffleArray = (array, seed) => {
    if (!array?.length) return [];
    const shuffled = [...array];

    // Seeded RNG (LCG)
    let state = seed;
    const random = () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

// Generate session-based seed
const generateSessionSeed = () => {
    if (typeof window === 'undefined') return 'default_session';

    try {
        let sessionId = sessionStorage.getItem('adventure_session_id');
        if (!sessionId) {
            if (window.crypto?.getRandomValues) {
                const arr = new Uint32Array(2);
                window.crypto.getRandomValues(arr);
                sessionId = arr[0].toString(36) + arr[1].toString(36);
            } else {
                sessionId =
                    Math.random().toString(36).slice(2) +
                    Math.random().toString(36).slice(2) +
                    Date.now().toString(36);
            }
            sessionStorage.setItem('adventure_session_id', sessionId);
        }
        return sessionId;
    } catch {
        return `fallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
};

// Hash string → numeric seed
const hashString = (str) => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash);
};

const generateChapterSeed = (chapterId, difficulty, wordsLength, sessionId) =>
    hashString(`${sessionId}_${chapterId}_${difficulty}_${wordsLength}`);

const generateReshuffleSeed = (chapterId, difficulty, wordsLength, reshuffleCount, sessionId) =>
    hashString(`${sessionId}_${chapterId}_${difficulty}_${wordsLength}_reshuffle_${reshuffleCount}`);

export const useChapters = (words, currentChapter, completedWords, getWordKey, difficulty = 'a1') => {
    // ✅ Validation
    const validWords = useMemo(() => (Array.isArray(words) ? words.filter(Boolean) : []), [words]);
    const validCurrentChapter = useMemo(() => (Number.isInteger(+currentChapter) && +currentChapter >= 0 ? +currentChapter : 0), [currentChapter]);
    const validCompletedWords = useMemo(() => (completedWords instanceof Set ? completedWords : new Set()), [completedWords]);
    const validGetWordKey = useMemo(() => (typeof getWordKey === 'function' ? getWordKey : (w) => w?.id || w?.word || ''), [getWordKey]);

    // ✅ Stable session id
    const sessionIdRef = useRef(generateSessionSeed());
    const [reshuffleCount, setReshuffleCount] = useState(0);
    const [sessionVersion, setSessionVersion] = useState(0);

    // ✅ Track changes in words
    const prevWordsRef = useRef(validWords);
    useEffect(() => {
        if (validWords !== prevWordsRef.current) {
            prevWordsRef.current = validWords;
            setReshuffleCount(0);
        }
    }, [validWords]);

    // ✅ Build chapters
    const chapters = useMemo(() => {
        if (!validWords.length) return [];

        const chapterMap = new Map();
        validWords.forEach((word, i) => {
            const topicId = word.topicId || word.topic || `general_${Math.floor(i / 10)}`;
            const topicName = word.topicName || word.topic || `Chapter ${Math.floor(i / 10) + 1}`;
            if (!chapterMap.has(topicId)) {
                chapterMap.set(topicId, {
                    id: topicId,
                    title: topicName,
                    words: [],
                    completed: false,
                    score: 0,
                    perfect: false,
                    unlocked: true,
                });
            }
            chapterMap.get(topicId).words.push(word);
        });

        return Array.from(chapterMap.values())
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((chapter, idx) => {
                const isCurrent = idx === validCurrentChapter;
                const seed = isCurrent && reshuffleCount > 0
                    ? generateReshuffleSeed(chapter.id, difficulty, chapter.words.length, reshuffleCount, `${sessionIdRef.current}_${sessionVersion}`)
                    : generateChapterSeed(chapter.id, difficulty, chapter.words.length, `${sessionIdRef.current}_${sessionVersion}`);
                return {
                    ...chapter,
                    words: shuffleArray(chapter.words, seed),
                    originalWords: [...chapter.words],
                };
            });
    }, [validWords, difficulty, reshuffleCount, validCurrentChapter, sessionVersion]);

    const currentChapterData = useMemo(() => chapters[validCurrentChapter] || null, [chapters, validCurrentChapter]);

    const currentChapterWordKeys = useMemo(() => {
        if (!currentChapterData?.words?.length) return new Set();
        const keys = new Set();
        for (const w of currentChapterData.words) {
            try {
                const k = validGetWordKey(w);
                if (k) keys.add(k);
            } catch { }
        }
        return keys;
    }, [currentChapterData?.words, validGetWordKey]);

    const chapterProgressPercentage = useMemo(() => {
        if (!currentChapterData?.words?.length) return 0;
        let done = 0;
        for (const k of currentChapterWordKeys) if (validCompletedWords.has(k)) done++;
        return Math.round((done / currentChapterData.words.length) * 100);
    }, [currentChapterData?.words, validCompletedWords, currentChapterWordKeys]);

    const overallProgress = useMemo(() => {
        if (!validWords.length) return 0;
        return Math.round((validCompletedWords.size / validWords.length) * 100);
    }, [validWords.length, validCompletedWords.size]);

    // ✅ Actions
    const reshuffleCurrentChapter = useCallback(() => setReshuffleCount((c) => c + 1), []);
    const generateNewSession = useCallback(() => {
        try {
            if (typeof window !== 'undefined') sessionStorage.removeItem('adventure_session_id');
        } catch { }
        sessionIdRef.current = generateSessionSeed();
        setReshuffleCount(0);
        setSessionVersion((v) => v + 1);
    }, []);

    // ✅ Navigation handlers
    const createNavigationHandler = useCallback(
        (dir) => (setCurrentChapter, setShowStory, setIsPlaying, setModalDismissed) => {
            let newChapter = validCurrentChapter;
            if (dir === 'next' && validCurrentChapter < chapters.length - 1) newChapter++;
            if (dir === 'previous' && validCurrentChapter > 0) newChapter--;
            if (newChapter === validCurrentChapter) return;
            setCurrentChapter(newChapter);
            setShowStory?.(true);
            setIsPlaying?.(false);
            setModalDismissed?.(false);
        },
        [validCurrentChapter, chapters.length]
    );

    const handleNextChapter = useMemo(() => createNavigationHandler('next'), [createNavigationHandler]);
    const handlePreviousChapter = useMemo(() => createNavigationHandler('previous'), [createNavigationHandler]);
    const handleChapterComplete = handleNextChapter;

    const handleStartChapter = useCallback((setShowStory, setIsPlaying) => {
        setShowStory?.(false);
        setIsPlaying?.(true);
    }, []);

    return {
        chapters,
        currentChapterData,
        chapterProgressPercentage,
        overallProgress,
        handleChapterComplete,
        handleNextChapter,
        handlePreviousChapter,
        handleStartChapter,
        reshuffleCurrentChapter,
        generateNewSession,
    };
};
