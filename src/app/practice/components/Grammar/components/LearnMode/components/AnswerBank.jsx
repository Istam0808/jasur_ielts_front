import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { seededShuffle } from "../utils/practiceUtils";

/**
 * AnswerBank component for gap filling questions
 */
export const AnswerBank = ({ 
    current, 
    answers, 
    practiceProgress, 
    setPracticeProgress: updatePracticeProgress, 
    revealed, 
    langKey, 
    selectedBlank, 
    setSelectedBlank 
}) => {
    const { t } = useTranslation("grammar");
    const rawAnswers = Array.isArray(current.answers) ? current.answers : [];

    // Build display tokens — deterministic shuffle by current.id
    const tokens = useMemo(() => {
        const built = rawAnswers.map((a, idx) => {
            const base = (a?.answer || "").toString();
            const firstVariant = base.split("/").map((s) => s.trim()).filter(Boolean)[0] || "";
            const display = firstVariant.length ? (firstVariant[0].toUpperCase() + firstVariant.slice(1)) : firstVariant;
            return { key: `${current.id}-${idx}`, raw: firstVariant, display };
        });
        return seededShuffle(built, current.id || "");
    }, [current.id, rawAnswers.length]);

    // compute available tokens (excluding duplicates mapped to blanks already)
    const availableTokens = useMemo(() => {
        const usedValues = Object.values((answers[current?.id] || {})).filter((v) => typeof v === "string");
        const usedCounts = usedValues.reduce((acc, raw) => { acc[raw] = (acc[raw] || 0) + 1; return acc; }, {});
        const temp = { ...usedCounts };
        const avail = [];
        for (const tok of tokens) {
            if (temp[tok.raw] > 0) {
                temp[tok.raw] -= 1;
                continue;
            }
            avail.push(tok);
        }
        return avail;
    }, [answers, tokens, current?.id]);

    if (!availableTokens.length) return null;

    return (
        <div className="lm-answer-bank" aria-label={t("answerBank", { defaultValue: "Answer bank" })}>
            {availableTokens.map((token) => (
                <span
                    key={token.key}
                    className="lm-chip"
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={(e) => {
                        try {
                            e.dataTransfer.setData("text/plain", token.raw);
                            e.dataTransfer.effectAllowed = "copyMove";
                        } catch { }
                    }}
                    onClick={() => {
                        if (revealed[current?.id]) return;
                        try {
                            const rawText = current.text?.[langKey] || current.text || "";
                            const blanks = Array.from((rawText || "").matchAll(/___(\d+)___/g)).map((m) => m[1]);
                            const currentMap = (answers[current?.id] || {});
                            let target = selectedBlank && !currentMap[selectedBlank] ? selectedBlank : null;
                            if (!target) {
                                target = blanks.find((b) => !currentMap[b] || (typeof currentMap[b] === "string" && currentMap[b].trim().length === 0));
                            }
                            if (!target) return;
                            const newAnswers = { ...answers, [current.id]: { ...(answers[current.id] || {}), [target]: token.raw } };
                            updatePracticeProgress({ answersById: newAnswers }, { sync: false });
                            setSelectedBlank(null);
                        } catch { }
                    }}
                    aria-label={token.display}
                >
                    {token.display}
                </span>
            ))}
        </div>
    );
};
