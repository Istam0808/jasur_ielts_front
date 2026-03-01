import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEnhancedStorage } from "@/hooks/useEnhancedStorage";
import { useUserDataMirror } from "@/hooks/useUserDataMirror";
import { EnhancedStorage } from "@/utils/enhancedStorage";
import { LocalStorageUtils } from "@/utils/localStorage";
import { 
    validatePracticeProgress, 
    getDefaultPracticeProgress, 
    checkAuthentication,
    normalizeType,
    orderedTypes,
    seededShuffle
} from "../utils/practiceUtils";

/**
 * Hook for managing practice data loading and state
 */
export const usePracticeData = (topic) => {
    const isAuthenticated = useMemo(() => checkAuthentication(), []);
    const { loadMirror } = useUserDataMirror();
    
    const level = useMemo(() => ((topic?.id?.split("_")[0] || "A1").toLowerCase()), [topic?.id]);
    const storageKey = topic?.id ? `grammar_session_${topic.id}` : null;
    const aggregatedProgressKey = topic?.id ? `grammar_progress_${topic.id}` : null;

    // UI-only fallback best map and database best map
    const [displayBestMap, setDisplayBestMap] = useState({});
    const [databaseBestMap, setDatabaseBestMap] = useState({});

    // Refs for guarding writes/updates and mounted state
    const mountedRef = useRef(true);
    const hydratedBestRef = useRef(false);
    const hydrationAttemptedRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const {
        data: practiceProgress,
        updateData: updatePracticeProgress,
        syncStatus,
        isLoading: progressLoading,
    } = useEnhancedStorage(
        storageKey,
        getDefaultPracticeProgress(),
        { debounceMs: 1000, autoSave: true, validateData: validatePracticeProgress }
    );

    // Load dataset dynamically
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [setData, setSetData] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const mod = await import(
                    /* webpackChunkName: "practice-data-[request]" */
                    `@/store/data/practice/language/english/grammar/exercises/${level}/${topic.id}.json`
                );
                if (cancelled) return;
                setSetData(mod?.default ?? mod);
            } catch (err) {
                if (cancelled) return;
                // friendly fallback dataset
                setSetData({
                    id: `${topic?.id ?? "UNKNOWN"}_EMPTY`,
                    title: topic?.topic ?? "Practice",
                    items: [],
                });
                setError(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [topic?.id, topic?.topic, level]);

    // Items and grouping
    const items = useMemo(() => (setData?.items ?? []).map((it) => ({ ...it, type: normalizeType(it.type) })), [setData]);
    const itemsByType = useMemo(() => {
        const map = { multiple_choice: [], short_answer: [], multiple_gap_filling: [] };
        for (const it of items) {
            if (map[it.type]) map[it.type].push(it);
        }
        return map;
    }, [items]);

    const availableTypes = useMemo(() => orderedTypes.filter((t) => (itemsByType[t] || []).length > 0), [itemsByType]);

    // stable (deterministic) shuffle for MC, avoids random reorders causing updates
    const shuffledMcIds = useMemo(() => {
        const ids = (itemsByType.multiple_choice || []).map((it) => it.id);
        return seededShuffle(ids, setData?.id ?? "");
    }, [setData?.id, itemsByType.multiple_choice]);

    // Load aggregated best (displayBestMap) once on mount and when aggregated progress updates
    useEffect(() => {
        if (!aggregatedProgressKey) return;
        let cancelled = false;
        (async () => {
            try {
                const agg = isAuthenticated
                    ? await EnhancedStorage.get(aggregatedProgressKey)
                    : LocalStorageUtils.get(aggregatedProgressKey);
                if (cancelled) return;
                let nextBest = agg?.bestByType;
                if (!nextBest || Object.keys(nextBest).length === 0) {
                    const source = agg?.types || {};
                    const derived = {};
                    const TYPE_KEYS = ["multiple_choice", "short_answer", "multiple_gap_filling"];
                    for (const tk of TYPE_KEYS) {
                        const cp = Number(source?.[tk]?.correctPercent || 0);
                        if (Number.isFinite(cp) && cp > 0) {
                            derived[tk] = { correctPercent: Math.min(100, Math.max(0, Math.round(cp))) };
                        }
                    }
                    nextBest = derived;
                }
                if (nextBest && typeof nextBest === "object" && mountedRef.current) {
                    setDisplayBestMap(nextBest);
                }
            } catch (e) {
                console.warn("Failed to load display best map:", e);
            } finally {
                hydrationAttemptedRef.current = true;
            }
        })();
        return () => { cancelled = true; };
    }, [aggregatedProgressKey, isAuthenticated]);

    // Hydrate session bestByType from aggregated progress if session is empty
    useEffect(() => {
        if (hydratedBestRef.current) return;
        if (!aggregatedProgressKey || !practiceProgress) return;
        const hasLocalBest = practiceProgress?.bestByType && Object.keys(practiceProgress.bestByType).length > 0;
        if (hasLocalBest) {
            hydratedBestRef.current = true;
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const agg = isAuthenticated
                    ? await EnhancedStorage.get(aggregatedProgressKey)
                    : LocalStorageUtils.get(aggregatedProgressKey);
                if (cancelled) return;
                const aggBest = agg?.bestByType;
                let nextBest = null;
                if (aggBest && typeof aggBest === "object" && Object.keys(aggBest).length > 0) {
                    nextBest = aggBest;
                } else if (agg?.types && typeof agg.types === "object") {
                    const derived = {};
                    const source = agg.types || {};
                    const TYPE_KEYS = ["multiple_choice", "short_answer", "multiple_gap_filling"];
                    for (const tk of TYPE_KEYS) {
                        const cp = Number(source?.[tk]?.correctPercent || 0);
                        if (Number.isFinite(cp) && cp > 0) {
                            derived[tk] = { correctPercent: Math.min(100, Math.max(0, Math.round(cp))) };
                        }
                    }
                    if (Object.keys(derived).length > 0) nextBest = derived;
                }
                if (nextBest && Object.keys(nextBest).length > 0 && mountedRef.current) {
                    hydratedBestRef.current = true;
                    await updatePracticeProgress({ bestByType: nextBest }, { sync: false });
                }
            } catch (e) {
                console.warn("Hydration attempt failed:", e);
            } finally {
                hydrationAttemptedRef.current = true;
            }
        })();
        return () => { cancelled = true; };
    }, [aggregatedProgressKey, practiceProgress, updatePracticeProgress, isAuthenticated]);

    // Load database best scores from mirror
    const loadDatabaseBestScores = useCallback(async (signal = {}) => {
        if (!isAuthenticated || !topic?.id) return;
        try {
            const mirror = await loadMirror();
            if (!mountedRef.current) return;
            const grammarProgress = mirror?.grammar?.progress?.[topic.id];
            if (grammarProgress?.stats?.bestCorrectPercent) {
                const bestScore = Math.max(0, Math.min(100, Math.round(grammarProgress.stats.bestCorrectPercent)));
                const allTypesBest = {};
                const TYPE_KEYS = ["multiple_choice", "short_answer", "multiple_gap_filling"];
                TYPE_KEYS.forEach(typeKey => {
                    allTypesBest[typeKey] = { correctPercent: bestScore };
                });
                setDatabaseBestMap(allTypesBest);
            }
        } catch (e) {
            console.warn("PracticePanel: Failed to load database best scores:", e);
        }
    }, [isAuthenticated, topic?.id, loadMirror]);

    useEffect(() => {
        loadDatabaseBestScores();
    }, [loadDatabaseBestScores]);

    return {
        // Data
        items,
        itemsByType,
        availableTypes,
        shuffledMcIds,
        setData,
        loading,
        error,
        
        // Progress
        practiceProgress,
        updatePracticeProgress,
        syncStatus,
        progressLoading,
        
        // Best scores
        displayBestMap,
        databaseBestMap,
        
        // Refs
        mountedRef,
        hydratedBestRef,
        hydrationAttemptedRef,
        
        // Functions
        loadDatabaseBestScores,
    };
};
