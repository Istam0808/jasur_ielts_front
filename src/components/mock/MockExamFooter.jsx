"use client";

import { useState } from "react";
import { FiCheck } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import Modal from "@/components/common/Modal";
import MockExamQuestionNav from "./MockExamQuestionNav";

const noop = () => {};

export default function MockExamFooter({
    parts = [],
    currentPartIndex = 0,
    onSelectPart = noop,
    activePartQuestionNumbers = [],
    attemptedQuestionNumbers = [],
    currentQuestionNumber = null,
    onSelectQuestion = noop,
    onPrevNextQuestion = noop,
    partTotals = [],
    partAnsweredCounts = [],
    getActivePartLabel,
    getInactivePartButtonLabel,
    getQuestionAriaLabel,
    previousAriaLabel,
    nextAriaLabel,
    navigationAriaLabel,
    containerClassName = "",
    showSubmitButton = false,
    submitDisabled = false,
    submitAriaLabel,
    submitButtonTitle,
    onSubmit = noop,
    confirmTitle,
    confirmDescription,
    confirmCancelLabel,
    confirmSubmitLabel
}) {
    const { t } = useTranslation(["common", "test"]);
    const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);

    const resolvedSubmitAriaLabel =
        submitAriaLabel || t("submitTest", { ns: "common", defaultValue: "Submit test" });
    const resolvedNavigationAriaLabel =
        navigationAriaLabel || t("questions", { ns: "common", defaultValue: "Questions" });

    const resolvedConfirmTitle =
        confirmTitle || t("confirmSubmitTitle", { ns: "test", defaultValue: "Submit your answers?" });
    const resolvedConfirmDescription =
        confirmDescription || t("confirmSubmitDescription", {
            ns: "test",
            defaultValue: "Are you sure you want to submit? You will not be able to change your answers after submission."
        });
    const resolvedConfirmCancelLabel =
        confirmCancelLabel || t("cancel", { ns: "common", defaultValue: "Cancel" });
    const resolvedConfirmSubmitLabel =
        confirmSubmitLabel || t("submit", { ns: "common", defaultValue: "Submit" });

    const allPartsComplete = Array.isArray(partTotals) &&
        partTotals.length > 0 &&
        partTotals.every((total, index) => {
            const answered = partAnsweredCounts[index] ?? 0;
            return Number(total) > 0 && answered >= total;
        });

    const handleSubmitRequest = () => {
        if (submitDisabled) return;
        setIsSubmitConfirmOpen(true);
    };

    const handleConfirmSubmit = () => {
        setIsSubmitConfirmOpen(false);
        onSubmit();
    };

    return (
        <>
            <div className={`mock-exam-bottom-nav mock-exam-bottom-nav--ielts ${containerClassName}`.trim()}>
                <div className="mock-exam-nav-top-line" aria-hidden />
                <div className="mock-exam-footer-layout" role="navigation" aria-label={resolvedNavigationAriaLabel}>
                    <div className="mock-exam-footer-main">
                        <MockExamQuestionNav
                            parts={parts}
                            currentPartIndex={currentPartIndex}
                            onSelectPart={onSelectPart}
                            activePartQuestionNumbers={activePartQuestionNumbers}
                            attemptedQuestionNumbers={attemptedQuestionNumbers}
                            currentQuestionNumber={currentQuestionNumber}
                            onSelectQuestion={onSelectQuestion}
                            onPrevNextQuestion={onPrevNextQuestion}
                            partTotals={partTotals}
                            partAnsweredCounts={partAnsweredCounts}
                            getActivePartLabel={getActivePartLabel}
                            getInactivePartButtonLabel={getInactivePartButtonLabel}
                            getQuestionAriaLabel={getQuestionAriaLabel}
                            previousAriaLabel={previousAriaLabel}
                            nextAriaLabel={nextAriaLabel}
                        />
                    </div>

                    {showSubmitButton && (
                        <button
                            type="button"
                            className={`mock-exam-deliver-btn ${allPartsComplete ? 'mock-exam-deliver-btn--all-complete' : ''}`.trim()}
                            onClick={handleSubmitRequest}
                            disabled={submitDisabled}
                            aria-label={resolvedSubmitAriaLabel}
                            title={submitButtonTitle || resolvedSubmitAriaLabel}
                        >
                            <FiCheck aria-hidden />
                        </button>
                    )}
                </div>
            </div>

            {isSubmitConfirmOpen && (
                <Modal
                    onClose={() => setIsSubmitConfirmOpen(false)}
                    title={resolvedConfirmTitle}
                    description={resolvedConfirmDescription}
                    buttons={[
                        {
                            text: resolvedConfirmCancelLabel,
                            className: "btn btn-secondary",
                            onClick: () => setIsSubmitConfirmOpen(false)
                        },
                        {
                            text: resolvedConfirmSubmitLabel,
                            className: "btn btn-primary",
                            onClick: handleConfirmSubmit
                        }
                    ]}
                />
            )}
        </>
    );
}
