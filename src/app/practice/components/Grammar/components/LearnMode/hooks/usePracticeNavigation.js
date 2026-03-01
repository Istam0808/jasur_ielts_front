import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Hook for managing practice navigation and current item state
 */
export const usePracticeNavigation = ({
    practiceProgress,
    updatePracticeProgress,
    availableTypes,
    itemsByType,
    shuffledMcIds
}) => {
    const [idx, setIdx] = useState(0);
    const [selectedBlank, setSelectedBlank] = useState(null);

    // visible items depending on currentType
    const currentType = practiceProgress?.currentType ?? "multiple_choice";
    const visibleItems = useMemo(() => {
        if (currentType === "multiple_choice") {
            const byId = new Map((itemsByType.multiple_choice || []).map((it) => [it.id, it]));
            return shuffledMcIds.map((id) => byId.get(id)).filter(Boolean);
        }
        return itemsByType[currentType] ?? [];
    }, [currentType, itemsByType, shuffledMcIds]);

    // Ensure current item is always valid (iOS-safe)
    const current = visibleItems[idx] || (visibleItems.length > 0 ? visibleItems[0] : null);

    // Ensure a valid currentType (only when availableTypes changes meaningfully)
    const availableTypesString = useMemo(() => availableTypes.join("|"), [availableTypes]);
    useEffect(() => {
        if (!practiceProgress) return;
        const first = availableTypes[0] ?? "multiple_choice";
        if (!availableTypes.includes(practiceProgress.currentType)) {
            updatePracticeProgress({ currentType: first }, { sync: false });
        }
    }, [availableTypesString, availableTypes, practiceProgress, updatePracticeProgress]);

    // iOS-safe effect to handle currentType changes and reset index
    useEffect(() => {
        if (currentType && visibleItems.length > 0) {
            if (idx >= visibleItems.length) {
                setIdx(0);
            }
        }
    }, [currentType, visibleItems.length, idx]);

    // Additional iOS safety: force re-render when visibleItems change
    useEffect(() => {
        if (visibleItems.length > 0 && !current) {
            setIdx(prevIdx => prevIdx >= visibleItems.length ? 0 : prevIdx);
        }
    }, [visibleItems, current]);
    
    // Reset index when visibleItems change (iOS-safe)
    useEffect(() => {
        if (visibleItems.length > 0 && idx >= visibleItems.length) {
            setIdx(0);
        }
    }, [visibleItems.length, idx]);

    // Navigation functions
    const onPrev = useCallback(() => setIdx((i) => Math.max(i - 1, 0)), []);
    const onNext = useCallback(() => setIdx((i) => Math.min(i + 1, visibleItems.length - 1)), [visibleItems.length]);

    const changeType = useCallback((typeKey) => {
        setIdx(0);
        setSelectedBlank(null);
        setTimeout(() => {
            updatePracticeProgress({ currentType: typeKey }, { sync: false });
        }, 0);
    }, [updatePracticeProgress]);

    return {
        // State
        idx,
        setIdx,
        selectedBlank,
        setSelectedBlank,
        currentType,
        visibleItems,
        current,
        
        // Navigation
        onPrev,
        onNext,
        changeType,
    };
};
