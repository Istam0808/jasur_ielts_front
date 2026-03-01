import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FaCheckCircle, FaTimes } from "react-icons/fa";
import { formatExplanationRecursivelyWithPronunciation } from "@/utils/common";
import { getAnswerChecker, seededShuffle } from "../utils/practiceUtils";

/**
 * PracticeItem component for rendering individual practice questions
 */
export const PracticeItem = ({ 
    item, 
    value, 
    onChange, 
    revealed, 
    langKey, 
    onSelectBlank, 
    selectedBlank, 
    shouldEnablePronunciation, 
    onSpeak 
}) => {
    const { t } = useTranslation("grammar");
    const { checkAnswer, getCorrectAnswerText, checkAnswerVariants } = getAnswerChecker();

    // deterministic option order per item id
    const shuffledOptions = useMemo(() => {
        const opts = Array.isArray(item?.options) ? [...item.options] : [];
        return seededShuffle(opts, item?.id || "");
    }, [item?.id, item?.options?.length]);

    if (!item) return null;

    const renderResult = () => {
        if (!revealed) return null;
        const correctText = getCorrectAnswerText(item);
        const isCorrect = checkAnswer(item, value);
        return (
            <div className="lm-result" role="status">
                <div className={`lm-badge ${isCorrect ? "ok" : "bad"}`}>
                    {isCorrect ? <FaCheckCircle aria-hidden="true" /> : <FaTimes aria-hidden="true" />}
                    {isCorrect ? t("correct", { defaultValue: "Correct" }) : t("incorrect", { defaultValue: "Incorrect" })}
                </div>

                {!isCorrect && item?.type !== "multiple_gap_filling" && item?.type !== "multiple-gap-filling" && (
                    <div className="lm-correct">
                        <strong>{t("correctAnswer", { defaultValue: "Correct answer" })}:</strong>{" "}
                        {Array.isArray(correctText)
                            ? correctText.map((ct, i) => (
                                <span key={i}>
                                    {formatExplanationRecursivelyWithPronunciation(ct, ["'", "`"], { enablePronunciation: shouldEnablePronunciation, onSpeak, language: "en" })}
                                    {i < correctText.length - 1 ? ", " : ""}
                                </span>
                            ))
                            : (correctText && typeof correctText === "object")
                                ? Object.entries(correctText).map(([blank, ans], i, arr) => (
                                    <span key={blank}>
                                        (_{blank}_) {formatExplanationRecursivelyWithPronunciation(ans, ["'", "`"], { enablePronunciation: shouldEnablePronunciation, onSpeak, language: "en" })}
                                        {i < arr.length - 1 ? ", " : ""}
                                    </span>
                                ))
                                : formatExplanationRecursivelyWithPronunciation(correctText, ["'", "`"], { enablePronunciation: shouldEnablePronunciation, onSpeak, language: "en" })}
                    </div>
                )}

                {/* Display explanation if available */}
                {item?.explanation && (
                    <div className="lm-explanation">
                        <strong>{t("explanation", { defaultValue: "Explanation" })}:</strong>{" "}
                        {formatExplanationRecursivelyWithPronunciation(
                            item.explanation[langKey] || item.explanation.en || item.explanation, 
                            ["'", "`"], 
                            { enablePronunciation: shouldEnablePronunciation, onSpeak, language: "en" }
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Multiple choice
    if (item.type === "multiple_choice") {
        return (
            <div className="lm-practice-item">
                <p className="lm-prompt">
                    {formatExplanationRecursivelyWithPronunciation((item.question?.[langKey] || item.question || item.prompt?.[langKey] || item.prompt), ["'", "`"], { enablePronunciation: shouldEnablePronunciation, onSpeak, language: "en" })}
                </p>

                <div className="lm-options">
                    {shuffledOptions.map((opt, i) => {
                        const optValue = opt.answer ?? opt.text;
                        const isSelected = value === optValue;
                        const isCorrectOption = !!opt.correct;
                        const optionClass = ["lm-option", isSelected ? "selected" : "", revealed && isCorrectOption ? "correct" : "", revealed && isSelected && !isCorrectOption ? "wrong" : ""].filter(Boolean).join(" ");
                        return (
                            <label key={i} className={optionClass}>
                                <input
                                    type="radio"
                                    name={item.id}
                                    value={optValue}
                                    checked={isSelected}
                                    onChange={(e) => { if (!revealed) onChange(e.target.value); }}
                                    disabled={!!revealed}
                                    aria-checked={isSelected}
                                    aria-disabled={!!revealed}
                                />
                                <span className="lm-radio" aria-hidden="true" />
                                <span className="lm-option-text">{formatExplanationRecursivelyWithPronunciation(optValue, ["'", "`"], { enablePronunciation: shouldEnablePronunciation, onSpeak, language: "en" })}</span>
                            </label>
                        );
                    })}
                </div>

                {renderResult()}
            </div>
        );
    }

    // Gap filling
    if (item.type === "multiple_gap_filling") {
        const rawText = (item.text?.[langKey] || item.text || "").toString();
        const answersMap = (value && typeof value === "object") ? value : {};
        const correctMapObj = getCorrectAnswerText(item) || {};

        // parse blanks
        const parts = [];
        const regex = /___(\d+)___/g;
        let lastIndex = 0;
        let match;
        while ((match = regex.exec(rawText)) !== null) {
            const [placeholder, blankId] = match;
            const start = match.index;
            if (start > lastIndex) {
                parts.push({ type: "text", text: rawText.slice(lastIndex, start) });
            }
            parts.push({ type: "blank", id: blankId });
            lastIndex = regex.lastIndex;
        }
        if (lastIndex < rawText.length) parts.push({ type: "text", text: rawText.slice(lastIndex) });

        return (
            <div className="lm-practice-item">
                <p className="lm-prompt">{formatExplanationRecursivelyWithPronunciation((item.prompt?.[langKey] || item.prompt || t("fillTheGaps", { defaultValue: "Fill in the gaps" })), ["'", "`"], { enablePronunciation: shouldEnablePronunciation, onSpeak, language: "en" })}</p>

                <div className="lm-longtext" aria-label={t("gapText", { defaultValue: "Gap-fill text" })}>
                    {parts.map((p, i) => {
                        if (p.type === "text") {
                            return <span key={i}>{formatExplanationRecursivelyWithPronunciation(p.text, ["'", "`"], { enablePronunciation: shouldEnablePronunciation, onSpeak, language: "en" })}</span>;
                        }
                        const blankId = p.id;
                        const v = answersMap[blankId] || "";
                        const correctForBlank = correctMapObj?.[blankId] ?? "";
                        const isBlankCorrect = revealed ? checkAnswerVariants(String(v ?? ""), String(correctForBlank)) : false;
                        return (
                            <span key={i} className="lm-inline-blank" onClick={() => { if (!revealed) onSelectBlank?.(blankId); }}>
                                <input
                                    className={`lm-input lm-input-inline ${revealed ? (isBlankCorrect ? "is-correct" : "is-wrong") : ""}`}
                                    type="text"
                                    placeholder={`(${blankId})`}
                                    value={v}
                                    size={Math.max((v || "").length, 2) + 1}
                                    readOnly
                                    disabled={!!revealed}
                                    aria-disabled={!!revealed}
                                    aria-invalid={revealed ? (!isBlankCorrect) : undefined}
                                    onFocus={() => onSelectBlank?.(blankId)}
                                    onDragOver={(e) => { if (!revealed) e.preventDefault(); }}
                                    onDrop={(e) => {
                                        if (revealed) return;
                                        try {
                                            e.preventDefault();
                                            const dropped = e.dataTransfer.getData("text/plain");
                                            if (typeof dropped === "string" && dropped.trim().length > 0) {
                                                onChange({ ...answersMap, [blankId]: dropped.trim() });
                                            }
                                        } catch { }
                                    }}
                                />

                                {!revealed && v && (
                                    <button
                                        type="button"
                                        className="lm-clear-btn"
                                        aria-label={t("removeAnswer", { defaultValue: "Remove answer" })}
                                        onClick={() => onChange({ ...answersMap, [blankId]: "" })}
                                    >
                                        <FaTimes aria-hidden="true" />
                                    </button>
                                )}

                                {revealed && !isBlankCorrect && (
                                    <span className="lm-correct-inline">
                                        {formatExplanationRecursivelyWithPronunciation(correctForBlank, ["'", "`"], { enablePronunciation: shouldEnablePronunciation, onSpeak, language: "en" })}
                                    </span>
                                )}
                            </span>
                        );
                    })}
                </div>

                {renderResult()}
            </div>
        );
    }

    // Default short answer
    return (
        <div className="lm-practice-item">
            <p className="lm-prompt">{formatExplanationRecursivelyWithPronunciation((item.prompt?.[langKey] || item.prompt || item.question?.[langKey] || item.question), ["'", "`"], { enablePronunciation: shouldEnablePronunciation, onSpeak, language: "en" })}</p>
            <input
                className="lm-input"
                type="text"
                placeholder={t("yourAnswer", { defaultValue: "Your answer" })}
                value={value || ""}
                onChange={(e) => { if (!revealed) onChange(e.target.value); }}
                disabled={!!revealed}
                aria-disabled={!!revealed}
            />
            {renderResult()}
        </div>
    );
};
