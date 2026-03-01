import React from "react";
import { useTranslation } from "react-i18next";

/**
 * PracticeSteps component for displaying step navigation
 */
export const PracticeSteps = ({ 
    availableTypes, 
    currentType, 
    perTypeStats, 
    bestByType, 
    databaseBestMap, 
    displayBestMap, 
    onTypeChange 
}) => {
    const { t } = useTranslation("grammar");

    return (
        <div className="lm-steps lm-practice-steps" aria-label={t("practiceSubsteps", { defaultValue: "Practice steps" })}>
            {availableTypes.map((typeKey) => {
                const s = perTypeStats[typeKey] ?? { total: 0, completionPercent: 0, correctPercent: 0, completed: false };
                const isActive = currentType === typeKey;
                const label =
                    typeKey === "multiple_choice"
                        ? t("multipleChoice", { defaultValue: "Multiple choice" })
                        : typeKey === "short_answer"
                            ? t("shortAnswer", { defaultValue: "Short answer" })
                            : t("gapFilling", { defaultValue: "Gap filling" });
                const status = s.completed
                    ? t("doneWithCorrect", { percent: s.correctPercent, defaultValue: "Done • {{percent}}% correct" })
                    : s.completionPercent > 0
                        ? t("inProgress", { percent: s.completionPercent, defaultValue: "In progress • {{percent}}% done" })
                        : t("notStarted", { defaultValue: "Not started" });

                const sessionBest = Number(bestByType?.[typeKey]?.correctPercent || 0);
                const databaseBest = Number(databaseBestMap?.[typeKey]?.correctPercent || 0);
                const aggBest = Number(displayBestMap?.[typeKey]?.correctPercent || 0);
                const best = Math.max(0, Math.min(100,
                    sessionBest > 0 ? sessionBest :
                        databaseBest > 0 ? databaseBest :
                            aggBest
                ));

                return (
                    <button
                        key={typeKey}
                        className={`lm-step ${isActive ? "active" : ""}`}
                        onClick={() => onTypeChange(typeKey)}
                        aria-current={isActive}
                    >
                        <span className="lm-step-index">{typeKey === "multiple_choice" ? "1" : typeKey === "short_answer" ? "2" : "3"}</span>
                        <span className="lm-step-title">{label}</span>
                        <span className={`lm-step-badge ${s.completed ? "ok" : s.completionPercent > 0 ? "info" : "muted"}`}>
                            {status}
                        </span>
                        {best > 0 && <span className="lm-step-badge ok">{t("best", { defaultValue: "Best" })} {best}%</span>}
                    </button>
                );
            })}
        </div>
    );
};
