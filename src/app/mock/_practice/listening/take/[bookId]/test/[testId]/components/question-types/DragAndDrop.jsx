"use client";

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const toOptionValue = (option, index) => {
    if (option && typeof option === "object") {
        return String(option.value || option.label || String.fromCharCode(65 + index)).trim();
    }
    return String(option || "").trim();
};

const toOptionText = (option) => {
    if (option && typeof option === "object") {
        return String(option.text || option.option_text || option.answer || option.value || "").trim();
    }
    return String(option || "").trim();
};

const DragAndDrop = ({ question, userAnswer, onAnswerChange, optionsBox }) => {
    const { t } = useTranslation("practice");
    const [pickedValue, setPickedValue] = useState(null);

    const items = useMemo(() => {
        if (Array.isArray(question?.individualQuestions) && question.individualQuestions.length) {
            return question.individualQuestions
                .filter((item) => Number.isFinite(Number(item?.number)))
                .map((item) => ({
                    number: Number(item.number),
                    text: String(item?.text || "").trim(),
                }));
        }

        if (typeof question?.number === "string" && question.number.includes("-")) {
            const [start, end] = question.number.split("-").map(Number);
            if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
                return Array.from({ length: end - start + 1 }, (_, index) => ({
                    number: start + index,
                    text: "",
                }));
            }
        }

        const singleNum = Number(question?.number);
        if (Number.isFinite(singleNum)) {
            return [{
                number: singleNum,
                text: String(question?.text || "").trim(),
            }];
        }

        return [];
    }, [question]);

    const optionList = useMemo(() => {
        const source = Array.isArray(question?.options) && question.options.length
            ? question.options
            : (Array.isArray(optionsBox) ? optionsBox : []);

        return source
            .map((option, index) => {
                const value = toOptionValue(option, index);
                const text = toOptionText(option);
                return {
                    id: option?.id ?? value,
                    value,
                    text: text || value,
                };
            })
            .filter((option) => Boolean(option.value));
    }, [question?.options, optionsBox]);

    const safeAnswers = useMemo(() => {
        if (userAnswer && typeof userAnswer === "object" && !Array.isArray(userAnswer)) {
            return userAnswer;
        }
        return {};
    }, [userAnswer]);

    const usedValues = useMemo(() => {
        return new Set(
            items
                .map((item) => safeAnswers[item.number])
                .filter((value) => value != null && String(value).trim() !== "")
        );
    }, [items, safeAnswers]);

    const availableOptions = useMemo(() => {
        return optionList.filter((option) => !usedValues.has(option.value));
    }, [optionList, usedValues]);

    const assignValue = (questionNumber, value) => {
        if (!value || typeof onAnswerChange !== "function") return;
        const currentValue = safeAnswers[questionNumber];
        if (usedValues.has(value) && currentValue !== value) return;
        onAnswerChange(questionNumber, value);
        setPickedValue(null);
    };

    const clearValue = (questionNumber) => {
        if (typeof onAnswerChange !== "function") return;
        onAnswerChange(questionNumber, "");
    };

    const handleDragStart = (e, value) => {
        e.dataTransfer.setData("text/plain", value);
        e.dataTransfer.effectAllowed = "move";
        setPickedValue(value);
    };

    const handleDrop = (e, questionNumber) => {
        e.preventDefault();
        const value = e.dataTransfer.getData("text/plain");
        assignValue(questionNumber, value);
    };

    const handleDropZoneClick = (questionNumber) => {
        if (!pickedValue) return;
        assignValue(questionNumber, pickedValue);
    };

    if (!items.length) {
        return <p>{t("error.unsupportedQuestionType", { ns: "practice", type: "drag_and_drop" })}</p>;
    }

    return (
        <div className="question-drag-and-drop">
            <div className="drag-drop-grid">
                <div className="drag-drop-left">
                    {items.map((item) => {
                        const selectedValue = safeAnswers[item.number] || "";
                        const selectedOption = optionList.find((option) => option.value === selectedValue);
                        const isFilled = Boolean(selectedValue);
                        return (
                            <div key={item.number} className="drag-drop-row">
                                <p className="drag-drop-question-text selectable-content">
                                    {item.text || `${t("question", { defaultValue: "Question" })} ${item.number}`}
                                </p>
                                <button
                                    id={`q-${item.number}`}
                                    type="button"
                                    className={`drag-drop-target ${isFilled ? "filled" : "empty"}`}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDrop(e, item.number)}
                                    onClick={() => handleDropZoneClick(item.number)}
                                >
                                    {isFilled ? (
                                        <span className="drag-drop-target-content">
                                            <span className="drag-drop-target-label">
                                                {selectedOption ? `${selectedOption.value}. ${selectedOption.text}` : selectedValue}
                                            </span>
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                className="drag-drop-clear"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    clearValue(item.number);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        clearValue(item.number);
                                                    }
                                                }}
                                            >
                                                x
                                            </span>
                                        </span>
                                    ) : (
                                        <span className="drag-drop-target-placeholder">
                                            {pickedValue ? t("matching.clickToPlace", { ns: "reading", defaultValue: "Click to place" }) : item.number}
                                        </span>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="drag-drop-right">
                    <div className="drag-drop-options">
                        {availableOptions.map((option) => {
                            const isPicked = pickedValue === option.value;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    className={`drag-drop-option ${isPicked ? "picked" : ""}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, option.value)}
                                    onClick={() => setPickedValue((prev) => (prev === option.value ? null : option.value))}
                                >
                                    <span className="drag-drop-option-label">{option.value}</span>
                                    <span className="drag-drop-option-text">{option.text}</span>
                                </button>
                            );
                        })}
                        {availableOptions.length === 0 && (
                            <p className="drag-drop-empty">{t("matching.noOptions", { ns: "reading", defaultValue: "No options left." })}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DragAndDrop;
