import React from "react";
import { useTranslation } from "react-i18next";

/**
 * PracticeActions component for navigation and action buttons
 */
export const PracticeActions = ({
    current,
    answers,
    revealed,
    currentType,
    perTypeStats,
    availableTypes,
    idx,
    visibleItemsLength,
    onPrev,
    onNext,
    onCheck,
    onTypeChange
}) => {
    const { t } = useTranslation("grammar");

    const stats = perTypeStats[currentType] ?? { completed: false };
    if (stats.completed) {
        const idxInTypes = availableTypes.indexOf(currentType);
        const hasNext = idxInTypes >= 0 && idxInTypes + 1 < availableTypes.length;
        const nextTypeKey = hasNext ? availableTypes[idxInTypes + 1] : null;
        if (hasNext) {
            return (
                <div className="lm-actions" ref={(el) => { /* reserved for potential future use */ }}>
                    <button
                        className="lm-primary"
                        onClick={() => onTypeChange(nextTypeKey)}
                    >
                        {t("nextStep", { defaultValue: "Next step" })}
                    </button>
                </div>
            );
        }
        return null;
    }

    const nextBlockedForCheck = !revealed[current?.id];
    const isLast = idx === visibleItemsLength - 1;
    const currentValue = current ? answers[current.id] : undefined;

    // compute hasAnswer
    const hasAnswer = (function () {
        if (!current) return false;
        const type = current.type;
        if (type === "multiple_choice") return typeof currentValue === "string" && currentValue.length > 0;
        if (type === "multiple_gap_filling") {
            const rawText = current.text?.en || current.text || "";
            const blanks = Array.from((rawText || "").matchAll(/___(\d+)___/g)).map((m) => m[1]);
            if (!blanks.length) return false;
            if (!currentValue || typeof currentValue !== "object") return false;
            return blanks.every((b) => typeof currentValue[b] === "string" && currentValue[b].trim().length > 0);
        }
        return typeof currentValue === "string" && currentValue.trim().length > 0;
    })();

    const checkDisabled = !hasAnswer || revealed[current?.id];
    const checkReady = hasAnswer && !revealed[current?.id];

    return (
        <div className="lm-actions" ref={(el) => { /* reserved */ }}>
            <div className="left">
                <button className="lm-secondary" onClick={onPrev} disabled={idx === 0}>
                    {t("prev", { ns: "grammar" })}
                </button>

                <button className={`lm-secondary ${checkReady ? "is-ready" : ""}`} onClick={onCheck} disabled={checkDisabled}>
                    {revealed[current?.id] ? t("completed", { defaultValue: "Completed" }) : t("check", { defaultValue: "Check" })}
                </button>

                <button className="lm-primary" onClick={onNext} disabled={isLast || nextBlockedForCheck}>
                    {t("next", { ns: "grammar" })}
                </button>

                {!hasAnswer && <span className="lm-hint">{t("answerToCheck", { defaultValue: "Answer to check" })}</span>}
                {hasAnswer && nextBlockedForCheck && <span className="lm-hint">{t("checkToContinue", { defaultValue: "Check to continue" })}</span>}
            </div>

            <div className="right">
                <span className="lm-items-length">{idx + 1} / {visibleItemsLength}</span>
            </div>
        </div>
    );
};
