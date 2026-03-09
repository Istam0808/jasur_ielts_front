"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "@/contexts/UserContext";
import "./style.scss";

/**
 * LearningTimer component
 * Упрощённый вариант без useLearningTimer для практики.
 */
const LearningTimer = ({
  isVisible = false,
  className = "",
  showSessionTime = true,
  showTotalTime = true,
}) => {
  const { t } = useTranslation("common");
  const { user } = useUser();

  if (typeof window === "undefined" || !isVisible) return null;

  return (
    <div className={`learning-timer ${className}`} data-user={user ? "auth" : "guest"}>
      {showSessionTime && (
        <div className="learning-timer__session" role="status" aria-live="polite">
          <span className="learning-timer__label">{t("learning.sessionTime")}</span>
        </div>
      )}

      {showTotalTime && (
        <div className="learning-timer__daily" aria-hidden={!showTotalTime}>
          <span className="learning-timer__label">{t("learning.dailyTotal")}</span>
        </div>
      )}
    </div>
  );
};

export default LearningTimer;
