"use client";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDjangoAuth } from "@/services/djangoAuth";
import { useLearningTimer } from "@/hooks/useLearningTimer"; // uses the robust hook we built
import "./style.scss";

/**
 * LearningTimer component
 * - Uses useLearningTimer hook for all timing / persistence logic
 * - Does not change any classname or prop names
 */
const LearningTimer = ({
  isVisible = false,
  className = "",
  showSessionTime = true,
  showTotalTime = true,
}) => {
  const { t } = useTranslation("common");
  const { user } = useDjangoAuth();

  // The hook exposes: isActive, sessionDuration (seconds), dailyTotal (minutes),
  // startSession, stopSession, formatMinutes, formatSeconds, formattedSessionTime, formattedDailyTotal
  const {
    isActive,
    sessionDuration,
    dailyTotal,
    startSession,
    stopSession,
    formatMinutes,
    formatSeconds,
    formattedSessionTime,
    formattedDailyTotal,
  } = useLearningTimer();

  // Defensive: don't render on server or when explicitly hidden
  if (typeof window === "undefined" || !isVisible) return null;

  // Memoized formatted strings (hook already provides but keep memo for extra safety)
  const sessionTimeStr = useMemo(
    () => (showSessionTime ? formattedSessionTime || formatSeconds(sessionDuration) : ""),
    [showSessionTime, formattedSessionTime, formatSeconds, sessionDuration]
  );

  const dailyTotalStr = useMemo(
    () => (showTotalTime ? formattedDailyTotal || formatMinutes(dailyTotal) : ""),
    [showTotalTime, formattedDailyTotal, formatMinutes, dailyTotal]
  );

  // Optional: expose manual controls via data attributes for testing/debugging (non-intrusive).
  // They don't change classnames and won't affect layout.
  return (
    <div className={`learning-timer ${className}`} data-user={user ? "auth" : "guest"}>
      {showSessionTime && isActive && (
        <div className="learning-timer__session" role="status" aria-live="polite">
          <span className="learning-timer__label">{t("learning.sessionTime")}</span>
          <span className="learning-timer__value">{sessionTimeStr}</span>
        </div>
      )}

      {showTotalTime && (
        <div className="learning-timer__daily" aria-hidden={!showTotalTime}>
          <span className="learning-timer__label">{t("learning.dailyTotal")}</span>
          <span className="learning-timer__value">{dailyTotalStr}</span>
        </div>
      )}

      {isActive && (
        <div className="learning-timer__status" aria-hidden={!isActive}>
          <div className="learning-timer__indicator active" />
          <span className="learning-timer__status-text">{t("learning.active")}</span>
        </div>
      )}
    </div>
  );
};

export default LearningTimer;
