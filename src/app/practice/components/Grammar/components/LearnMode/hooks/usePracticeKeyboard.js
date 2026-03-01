import { useCallback, useEffect, useRef } from "react";
import { getAnswerChecker } from "../utils/practiceUtils";

/**
 * Hook for managing keyboard interactions in practice
 */
export const usePracticeKeyboard = ({
    current,
    answers,
    revealed,
    correctById,
    updatePracticeProgress,
    langKey,
    onCheck
}) => {
    const handleCheckRef = useRef();

    // Check handler implementation uses ref for stability
    const handleCheck = useCallback(() => {
        if (!current) return;
        const { checkAnswer } = getAnswerChecker();
        const newRevealed = { ...revealed, [current.id]: true };
        const newCorrectById = { ...correctById };
        try {
            newCorrectById[current.id] = !!checkAnswer(current, answers[current.id]);
        } catch {
            newCorrectById[current.id] = false;
        }
        updatePracticeProgress({
            revealedById: newRevealed,
            correctById: newCorrectById,
        }, { sync: false });
        
        // Call external check handler if provided
        onCheck?.();
        
        // focus next action after a small delay
        setTimeout(() => {
            try {
                const nextBtn = document.querySelector(".lm-actions button.lm-primary:not([disabled])");
                if (nextBtn && typeof nextBtn.focus === "function") nextBtn.focus();
            } catch { }
        }, 60);
    }, [current, answers, revealed, correctById, updatePracticeProgress, onCheck]);
    
    handleCheckRef.current = handleCheck;

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
            if (!current || revealed[current.id]) return;
            const val = answers[current.id];
            let ready = false;
            if (current.type === "multiple_choice") {
                ready = typeof val === "string" && val.length > 0;
            } else if (current.type === "multiple_gap_filling") {
                const rawText = (current.text?.[langKey] ?? current.text ?? "").toString();
                const blanks = Array.from(rawText.matchAll(/___(\d+)___/g)).map((m) => m[1]);
                if (blanks.length && val && typeof val === "object") {
                    ready = blanks.every((b) => typeof val[b] === "string" && val[b].trim().length > 0);
                }
            } else {
                ready = typeof val === "string" && val.trim().length > 0;
            }
            if (ready) {
                e.preventDefault();
                handleCheckRef.current?.();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [current, answers, revealed, langKey]);

    return {
        handleCheck,
        handleCheckRef,
    };
};
