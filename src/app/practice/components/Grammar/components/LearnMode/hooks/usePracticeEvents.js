import { useCallback, useEffect } from "react";
import { EnhancedStorage } from "@/utils/enhancedStorage";
import { LocalStorageUtils } from "@/utils/localStorage";

/**
 * Hook for managing practice-related events and data synchronization
 */
export const usePracticeEvents = ({
    isAuthenticated,
    aggregatedProgressKey,
    displayBestMap,
    setDisplayBestMap,
    loadDatabaseBestScores
}) => {
    // Listen for aggregated progress refresh events but guard to avoid loops
    useEffect(() => {
        const handler = async (e) => {
            try {
                await loadDatabaseBestScores();
                if (!aggregatedProgressKey) return;
                const agg = isAuthenticated
                    ? await EnhancedStorage.get(aggregatedProgressKey)
                    : LocalStorageUtils.get(aggregatedProgressKey);
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
                if (nextBest && typeof nextBest === "object") setDisplayBestMap(nextBest);
            } catch (err) {
                console.warn("Failed to refresh display best map:", err);
            }
        };

        // Add rate limiting to prevent excessive handler calls
        let lastHandlerCall = 0;
        const HANDLER_COOLDOWN = 2000; // 2 second cooldown
        
        const rateLimitedHandler = async (ev) => {
            const now = Date.now();
            if (now - lastHandlerCall < HANDLER_COOLDOWN) return;
            lastHandlerCall = now;
            
            try {
                await handler(ev);
            } catch (err) {
                console.warn('Handler failed:', err);
            }
        };
        
        window.addEventListener("grammar-progress-updated", rateLimitedHandler);
        window.addEventListener("grammar-immediate-refresh", rateLimitedHandler);

        // only non-profile triggered refreshes
        const safeUserDataHandler = (ev) => {
            // Respect preventCascade flag to avoid infinite loops
            if (ev?.detail?.preventCascade) {
                console.log('PracticePanel: Ignoring cascading user-data-refreshed event');
                return;
            }
            if (!ev.detail?.isProfileTriggered) rateLimitedHandler(ev);
        };
        window.addEventListener("user-data-refreshed", safeUserDataHandler);

        return () => {
            window.removeEventListener("grammar-progress-updated", rateLimitedHandler);
            window.removeEventListener("grammar-immediate-refresh", rateLimitedHandler);
            window.removeEventListener("user-data-refreshed", safeUserDataHandler);
        };
    }, [aggregatedProgressKey, isAuthenticated, loadDatabaseBestScores, setDisplayBestMap]);
};
