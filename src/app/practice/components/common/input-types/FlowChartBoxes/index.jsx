"use client";

import React from "react";
import styles from "./style.module.scss";
import CorrectAnswerInfo from '@/components/common/CorrectAnswerInfo';

// FlowChartBoxes renders vertical flow charts with arrows between steps
export default function FlowChartBoxes({
  label,
  hint,
  error,
  flowChart = null, // New flow chart object structure
  parts = [], // Legacy support for old format
  values = {},
  onChange,
  vertical = false,
  isReviewMode = false,
  reviewMap = null,
  correctAnswers = null,
}) {
  // Helper function to render review mode input
  const renderReviewInput = (blankId, userValue, correctAnswer) => {
    // Handle slash-separated alternative answers
    const isCorrect = (() => {
      if (!correctAnswer || !userValue) return false;
      
      const userAnswer = userValue.toLowerCase().trim();
      const correctAnswers = correctAnswer.toLowerCase().split('/').map(ans => ans.trim());
      
      // Check if user's answer matches any of the correct alternatives exactly
      const exactMatch = correctAnswers.some(correct => correct === userAnswer);
      
      // If no exact match, check for partial matches (for cases like "Yeast" vs "Yeast/bacteria")
      if (!exactMatch) {
        const partialMatch = correctAnswers.some(correct => 
          correct.includes(userAnswer) || userAnswer.includes(correct)
        );
        return partialMatch;
      }
      
      return exactMatch;
    })();
    
    const isAnswered = userValue && userValue.trim() !== '';
    
    return (
      <div className={`${styles.reviewInput} ${
        isAnswered ? (isCorrect ? styles.correct : styles.incorrect) : styles.unanswered
      }`}>
        <div className={styles.reviewInputContent}>
          <div className={styles.userAnswerSection}>
            <span className={styles.answerLabel}>YOUR ANSWER:</span>
            <span className={styles.answerText}>{userValue || 'No answer'}</span>
          </div>
          {!isCorrect && correctAnswer && (
            <CorrectAnswerInfo label="CORRECT ANSWER:" value={correctAnswer} />
          )}
        </div>
        <div className={styles.statusIndicator}>
          <span className={`${styles.statusIcon} ${
            isAnswered ? (isCorrect ? styles.correct : styles.incorrect) : styles.unanswered
          }`}>
            {!isAnswered ? '—' : (isCorrect ? '✓' : '✗')}
          </span>
        </div>
      </div>
    );
  };

  // Helper function to safely get correct answer
  const getCorrectAnswer = (blankId) => {
    if (correctAnswers && correctAnswers[blankId]) {
      return correctAnswers[blankId];
    }
    if (reviewMap && reviewMap[String(blankId)]) {
      return reviewMap[String(blankId)];
    }
    return null;
  };

  // Safety check for required props
  if (!flowChart && parts.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.error}>No flow chart data provided</div>
      </div>
    );
  }

  // Check if review mode is enabled but no review data is available
  if (isReviewMode && !reviewMap && !correctAnswers) {
    console.warn('FlowChartBoxes: Review mode enabled but no review data provided');
    return (
      <div className={styles.wrapper}>
        <div className={styles.error}>Review mode enabled but no answer data available</div>
      </div>
    );
  }

  // Check if review mode is enabled but review data is empty/not ready
  if (isReviewMode && reviewMap && Object.keys(reviewMap).length === 0 && (!correctAnswers || Object.keys(correctAnswers).length === 0)) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.hint}>Loading review data...</div>
      </div>
    );
  }

  // New flow chart rendering
  if (flowChart && flowChart.type === "vertical") {
    return (
      <div className={styles.wrapper}>
        {label && <div className={styles.label}>{label}</div>}
        <div className={styles.verticalFlow}>
          {flowChart.steps.map((step, idx) => (
            <React.Fragment key={idx}>
              <div className={`${styles.flowStep} ${isReviewMode ? styles['review-mode'] : ''}`}>
                {step.text && <span className={styles.stepText}>{step.text}</span>}
                {step.blank && (
                  isReviewMode ? (
                    renderReviewInput(
                      step.blank, 
                      values[step.blank] || '', 
                      getCorrectAnswer(step.blank)
                    )
                  ) : (
                    <input
                      className={styles.blankInput}
                      placeholder={step.blank.toString()}
                      value={values[step.blank] || ''}
                      onChange={(e) => onChange && onChange(step.blank, e.target.value)}
                    />
                  )
                )}
                {step.text2 && <span className={styles.stepText}>{step.text2}</span>}
                {step.blank2 && (
                  isReviewMode ? (
                    renderReviewInput(
                      step.blank2, 
                      values[step.blank2] || '', 
                      getCorrectAnswer(step.blank2)
                    )
                  ) : (
                    <input
                      className={styles.blankInput}
                      placeholder={step.blank2.toString()}
                      value={values[step.blank2] || ''}
                      onChange={(e) => onChange && onChange(step.blank2, e.target.value)}
                    />
                  )
                )}
              </div>
              {idx < flowChart.steps.length - 1 && (
                <div className={styles.arrowContainer}>
                  <div className={styles.arrow}></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        {hint && !error && <div className={styles.hint}>{hint}</div>}
        {error && <div className={styles.error} role="alert">{error}</div>}
      </div>
    );
  }

  // Legacy horizontal flow rendering
  return (
    <div className={styles.wrapper} data-vertical={vertical || undefined}>
      {label && <div className={styles.label}>{label}</div>}
      <div className={styles.flow}>
        {parts.map((p, idx) =>
          p.type === 'text' ? (
            <div key={`t-${idx}`} className={styles.textBox}>{p.content}</div>
          ) : (
            isReviewMode ? (
              <div key={`b-${p.id}`} className={styles.reviewInputWrapper}>
                {renderReviewInput(
                  p.id, 
                  values[p.id] || '', 
                  getCorrectAnswer(p.id)
                )}
              </div>
            ) : (
              <input
                key={`b-${p.id}`}
                className={styles.inputBox}
                placeholder={p.placeholder || ''}
                value={values[p.id] || ''}
                onChange={(e) => onChange && onChange(p.id, e.target.value)}
              />
            )
          )
        )}
      </div>
      {hint && !error && <div className={styles.hint}>{hint}</div>}
      {error && <div className={styles.error} role="alert">{error}</div>}
    </div>
  );
}


