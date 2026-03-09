"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import LearningTimer from "./index.jsx";
import "./style.scss";

/**
 * Упрощённая демо-версия LearningTimer без useLearningTimer.
 */
const LearningTimerDemo = () => {
  const { t } = useTranslation("common");

  const [showTimer, setShowTimer] = useState(true);
  const [showSessionTime, setShowSessionTime] = useState(true);
  const [showTotalTime, setShowTotalTime] = useState(true);

  return (
    <div className="learning-timer-demo">
      {/* Header */}
      <header className="demo-header">
        <h2>{t("learningTimer.demoTitle", "Learning Timer Demo")}</h2>
        <p>
          {t(
            "learningTimer.demoSubtitle",
            "This demonstrates the automatic learning time tracking system"
          )}
        </p>
      </header>

      {/* Demo Controls */}
      <section className="demo-controls">
        {[
          {
            label: "Show Timer",
            checked: showTimer,
            onChange: setShowTimer,
          },
          {
            label: "Show Session Time",
            checked: showSessionTime,
            onChange: setShowSessionTime,
          },
          {
            label: "Show Daily Total",
            checked: showTotalTime,
            onChange: setShowTotalTime,
          },
        ].map(({ label, checked, onChange }) => (
          <div key={label} className="control-group">
            <label>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
              />
              {label}
            </label>
          </div>
        ))}
      </section>

      {/* Timer Display */}
      <section className="demo-timer">
        <LearningTimer
          isVisible={showTimer}
          showSessionTime={showSessionTime}
          showTotalTime={showTotalTime}
        />
      </section>

      {/* Info Section */}
      <section className="demo-info">
        <div className="info-card">
          <h3>Timer Status</h3>
          <p>
            <strong>Active:</strong> {isActive ? "Yes" : "No"}
          </p>
          <p>
            <strong>Session Duration:</strong> {formattedSessionTime}
          </p>
          <p>
            <strong>Daily Total:</strong> {formattedDailyTotal}
          </p>
        </div>

        <div className="info-card">
          <h3>Manual Controls</h3>
          <div className="button-group">
            <button
              onClick={manualStart}
              disabled={isActive}
              className="btn btn-primary"
            >
              Start Session
            </button>
            <button
              onClick={manualStop}
              disabled={!isActive}
              className="btn btn-secondary"
            >
              Stop Session
            </button>
          </div>
        </div>

        <div className="info-card">
          <h3>How It Works</h3>
          <ul>
            <li>Timer auto-starts when you’re active on practice pages</li>
            <li>Tracks user activity (mouse, keyboard, scroll, touch)</li>
            <li>Stops after 5 minutes of inactivity</li>
            <li>Auto-pauses when page/tab is inactive</li>
            <li>Authenticated users sync via UDM</li>
            <li>Guests persist via localStorage</li>
          </ul>
        </div>
      </section>

      {/* Activity Simulator */}
      <section className="demo-activity">
        <h3>Activity Simulator</h3>
        <p>Move your mouse, scroll, or type to keep the timer active</p>
        <div className="activity-area">
          <textarea
            placeholder="Type here to simulate learning activity..."
            rows="4"
            className="activity-textarea"
          />
          <div className="activity-buttons">
            {["Click me", "Or me", "Or this one"].map((text) => (
              <button key={text} className="btn btn-outline">
                {text}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LearningTimerDemo;
