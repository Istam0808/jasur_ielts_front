"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

// Hooks
import { usePracticeData } from "../hooks/usePracticeData";
import { usePracticeNavigation } from "../hooks/usePracticeNavigation";
import { usePracticeStats } from "../hooks/usePracticeStats";
import { usePracticeKeyboard } from "../hooks/usePracticeKeyboard";
import { usePracticeEvents } from "../hooks/usePracticeEvents";

// Components
import { PracticeSteps } from "./PracticeSteps";
import { AnswerBank } from "./AnswerBank";
import { PracticeItem } from "./PracticeItem";
import { PracticeActions } from "./PracticeActions";

/**
 * Main PracticePanel component - refactored and optimized
 */
export const PracticePanel = ({ topic, langKey, onAllRevealedChange, onProgressChange, onSpeak }) => {
    const { t } = useTranslation("grammar");
    const shouldEnablePronunciation = useMemo(() => langKey !== "uz", [langKey]);

    // Use custom hooks for data management
    const {
        items,
        itemsByType,
        availableTypes,
        shuffledMcIds,
        setData,
        loading,
        error,
        practiceProgress,
        updatePracticeProgress,
        displayBestMap,
        databaseBestMap,
        loadDatabaseBestScores,
    } = usePracticeData(topic);

    // Use custom hook for navigation
    const {
        idx,
        setIdx,
        selectedBlank,
        setSelectedBlank,
        currentType,
        visibleItems,
        current,
        onPrev,
        onNext,
        changeType,
    } = usePracticeNavigation({
        practiceProgress,
        updatePracticeProgress,
        availableTypes,
        itemsByType,
        shuffledMcIds
    });

    // Use custom hook for statistics
    const {
        perTypeStats,
        allSubstepsCompleted,
        anySubstepCompleted,
        answers,
        revealed,
        correctById,
        bestByType,
    } = usePracticeStats({
        items,
        itemsByType,
        practiceProgress,
        updatePracticeProgress,
        availableTypes,
        onAllRevealedChange,
        onProgressChange,
        t
    });

    // Use custom hook for keyboard interactions
    const { handleCheck } = usePracticeKeyboard({
        current,
        answers,
        revealed,
        correctById,
        updatePracticeProgress,
        langKey,
    });

    // Use custom hook for events
    usePracticeEvents({
        isAuthenticated: true, // This should come from usePracticeData
        aggregatedProgressKey: topic?.id ? `grammar_progress_${topic.id}` : null,
        displayBestMap,
        setDisplayBestMap: () => {}, // This should be handled in usePracticeData
        loadDatabaseBestScores,
    });

    // Focus management when moving to a new item (safe access)
    const panelRef = useRef(null);
    useEffect(() => {
        try {
            if (!current || revealed[current.id]) return;
            const root = panelRef.current;
            if (!root) return;
            let target = null;
            if (current.type === "multiple_choice") {
                target = root.querySelector(`input[type="radio"][name="${current.id}"]:not([disabled])`);
            } else if (current.type === "multiple_gap_filling") {
                const nodes = root.querySelectorAll("input.lm-input-inline:not([disabled])");
                if (nodes?.length) {
                    target = Array.from(nodes).find((n) => !n.value || n.value.trim().length === 0) || nodes[0];
                }
            } else {
                target = root.querySelector('input.lm-input[type="text"]:not([disabled])');
            }
            if (target && typeof target.focus === "function") {
                target.focus({ preventScroll: true });
                try { target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" }); } catch { }
            }
        } catch { }
    }, [current, revealed]);
    
    // iOS debugging: log state when current is undefined
    if (!current && visibleItems.length > 0) {
        console.warn('[iOS Debug] Current item is undefined:', {
            currentType,
            visibleItemsLength: visibleItems.length,
            idx,
            visibleItems: visibleItems.map(item => item?.id)
        });
    }
    
    // Fallback for iOS when current is undefined but items exist
    if (!current && visibleItems.length > 0) {
        return (
            <div className="lm-section" ref={panelRef}>
                <div className="lm-practice-head">
                    <PracticeSteps
                        availableTypes={availableTypes}
                        currentType={currentType}
                        perTypeStats={perTypeStats}
                        bestByType={bestByType}
                        databaseBestMap={databaseBestMap}
                        displayBestMap={displayBestMap}
                        onTypeChange={changeType}
                    />
                </div>
                <div className="lm-muted">
                    {t("loading", { defaultValue: "Loading questions..." })}
                </div>
            </div>
        );
    }

    return (
        <div className="lm-section" ref={panelRef}>
            <div className="lm-practice-head">
                <PracticeSteps
                    availableTypes={availableTypes}
                    currentType={currentType}
                    perTypeStats={perTypeStats}
                    bestByType={bestByType}
                    databaseBestMap={databaseBestMap}
                    displayBestMap={displayBestMap}
                    onTypeChange={changeType}
                />
            </div>

            {/* Answer bank: only for gap filling */}
            {current && current.type === "multiple_gap_filling" && (
                <AnswerBank
                    current={current}
                    answers={answers}
                    practiceProgress={practiceProgress}
                    setPracticeProgress={updatePracticeProgress}
                    revealed={revealed}
                    langKey={langKey}
                    selectedBlank={selectedBlank}
                    setSelectedBlank={setSelectedBlank}
                />
            )}

            <PracticeItem
                item={current}
                langKey={langKey}
                value={answers[current?.id]}
                onChange={(val) => {
                    const newAnswers = { ...answers, [current.id]: val };
                    updatePracticeProgress({ answersById: newAnswers }, { sync: false });
                }}
                revealed={revealed[current?.id]}
                bankTokens={current && current.type === "multiple_gap_filling" ? (Array.isArray(current.answers) ? current.answers : []) : []}
                selectedBlank={selectedBlank}
                onSelectBlank={setSelectedBlank}
                shouldEnablePronunciation={shouldEnablePronunciation}
                onSpeak={onSpeak}
            />

            {/* Actions block */}
            <PracticeActions
                current={current}
                answers={answers}
                revealed={revealed}
                currentType={currentType}
                perTypeStats={perTypeStats}
                availableTypes={availableTypes}
                idx={idx}
                visibleItemsLength={visibleItems.length}
                onPrev={onPrev}
                onNext={onNext}
                onCheck={handleCheck}
                onTypeChange={changeType}
            />
        </div>
    );
};
