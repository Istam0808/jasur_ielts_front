import { useCallback, useEffect, useMemo, useRef } from "react";
import { showPracticeStepCompletionToast } from "@/utils/practiceHelper";
import { showToast } from "@/lib/toastNotify";
import { orderedTypes } from "../utils/practiceUtils";

/**
 * Hook for managing practice statistics and progress tracking
 */
export const usePracticeStats = ({
    items,
    itemsByType,
    practiceProgress,
    updatePracticeProgress,
    availableTypes,
    onAllRevealedChange,
    onProgressChange,
    t
}) => {
    const isFirstRenderRef = useRef(true);
    const prevCompletedRef = useRef(false);
    const prevPerTypeStatsRef = useRef({});
    const prevBestByTypeRef = useRef({});

    // Derived references to current answers/maps for easier access
    const answers = useMemo(() => practiceProgress?.answersById ?? {}, [practiceProgress?.answersById]);
    const revealed = useMemo(() => practiceProgress?.revealedById ?? {}, [practiceProgress?.revealedById]);
    const correctById = useMemo(() => practiceProgress?.correctById ?? {}, [practiceProgress?.correctById]);
    const bestByType = useMemo(() => practiceProgress?.bestByType ?? {}, [practiceProgress?.bestByType]);

    // Per-type stats
    const perTypeStats = useMemo(() => {
        const stats = {};
        for (const type of orderedTypes) {
            const list = itemsByType[type] ?? [];
            const total = list.length;
            const revealedCount = list.reduce((acc, it) => acc + (revealed[it.id] ? 1 : 0), 0);
            const correctCount = list.reduce((acc, it) => acc + (correctById[it.id] ? 1 : 0), 0);
            const completionPercent = total ? Math.round((revealedCount / total) * 100) : 0;
            const correctPercent = total ? Math.round((correctCount / total) * 100) : 0;
            stats[type] = {
                total,
                revealedCount,
                correctCount,
                completionPercent,
                correctPercent,
                completed: total > 0 && revealedCount === total,
            };
        }
        return stats;
    }, [itemsByType, revealed, correctById]);

    const allSubstepsCompleted = useMemo(() => {
        const entries = Object.values(perTypeStats);
        if (!entries.length) return false;
        return entries.every((s) => s.completed);
    }, [perTypeStats]);

    const anySubstepCompleted = useMemo(() => {
        const entries = Object.values(perTypeStats);
        if (!entries.length) return false;
        return entries.some((s) => s.completed);
    }, [perTypeStats]);

    // Toasts on completion — avoid firing on initial hydration
    useEffect(() => {
        const stats = perTypeStats[practiceProgress?.currentType] ?? { completed: false, correctPercent: 0 };
        if (isFirstRenderRef.current) {
            isFirstRenderRef.current = false;
            prevCompletedRef.current = !!stats.completed;
            return;
        }
        const justCompleted = !prevCompletedRef.current && !!stats.completed;
        prevCompletedRef.current = !!stats.completed;
        if (justCompleted) {
            showPracticeStepCompletionToast(showToast, t, "stepCompleted", {
                namespace: "grammar",
                interpolation: { percent: stats.correctPercent },
                defaultValue: "Step completed • {{percent}}% correct",
            });
        }
    }, [perTypeStats, practiceProgress?.currentType, t]);

    // Update bestByType and aggregate to aggregatedProgressKey
    useEffect(() => {
        onAllRevealedChange?.(anySubstepCompleted);
        if (!practiceProgress) return;

        // Check if perTypeStats actually changed to prevent unnecessary updates
        const perTypeStatsString = JSON.stringify(perTypeStats);
        const prevPerTypeStatsString = JSON.stringify(prevPerTypeStatsRef.current);
        if (perTypeStatsString === prevPerTypeStatsString) {
            return;
        }
        prevPerTypeStatsRef.current = perTypeStats;

        // Build updated best map while preserving previous positive bests
        const best = { ...(practiceProgress.bestByType ?? {}) };
        let hasChanges = false;
        
        for (const [type, s] of Object.entries(perTypeStats)) {
            const prev = Number.isFinite(best[type]?.correctPercent) ? best[type].correctPercent : 0;
            const nextVal = Math.max(prev, Number.isFinite(s?.correctPercent) ? s.correctPercent : 0);
            if (nextVal > 0) {
                if (!best[type] || best[type].correctPercent !== nextVal) {
                    best[type] = { correctPercent: nextVal };
                    hasChanges = true;
                }
            } else if (prev > 0 && best[type]) {
                // Keep existing positive value
                if (!best[type] || best[type].correctPercent !== prev) {
                    best[type] = { correctPercent: prev };
                    hasChanges = true;
                }
            } else if (best[type]) {
                delete best[type];
                hasChanges = true;
            }
        }

        // Check if bestByType actually changed
        const bestString = JSON.stringify(best);
        const prevBestString = JSON.stringify(prevBestByTypeRef.current);
        if (bestString === prevBestString && !hasChanges) {
            return;
        }
        prevBestByTypeRef.current = best;

        // Only update if there are actual changes to prevent infinite loops
        if (hasChanges) {
            updatePracticeProgress({
                types: { ...(practiceProgress.types ?? {}), ...perTypeStats },
                bestByType: best,
            }, { sync: false });
        }
    }, [anySubstepCompleted, perTypeStats, practiceProgress, updatePracticeProgress, onAllRevealedChange]);

    // Aggregate overall progress and emit to parent
    useEffect(() => {
        const totalItems = items.length;
        if (totalItems === 0) {
            onProgressChange?.({ totalItems: 0, revealedCount: 0, correctCount: 0, completionPercent: 0, correctPercent: 0 });
            return;
        }
        const totalTypes = availableTypes.length;
        const completedTypes = Object.values(perTypeStats).filter((s) => s.completed).length;
        const completionPercent = totalTypes ? Math.round((completedTypes / totalTypes) * 100) : 0;
        const revealedCount = items.reduce((acc, it) => acc + (revealed[it.id] ? 1 : 0), 0);
        const correctCount = items.reduce((acc, it) => acc + (correctById[it.id] ? 1 : 0), 0);
        const correctPercent = Math.round((correctCount / totalItems) * 100);
        onProgressChange?.({ totalItems, revealedCount, correctCount, completionPercent, correctPercent });
    }, [items, revealed, correctById, perTypeStats, availableTypes, onProgressChange]);

    return {
        // Stats
        perTypeStats,
        allSubstepsCompleted,
        anySubstepCompleted,
        
        // Data access
        answers,
        revealed,
        correctById,
        bestByType,
    };
};

