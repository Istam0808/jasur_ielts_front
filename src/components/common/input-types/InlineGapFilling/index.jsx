"use client";

import React from "react";
import styles from "./style.module.scss";

// Renders a paragraph with inline blanks as inputs
// props:
// - contentParts: array of strings and blank descriptors: { id, placeholder }
// - values: map blankId -> value
// - onChange: (blankId, value) => void
// - disabled, readOnly, errorMap (optional map blankId -> error)
export default function InlineGapFilling({
  label,
  hint,
  error,
  contentParts = [],
  values = {},
  onChange,
  dataQuestionId = null,
  disabled = false,
  readOnly = false,
}) {
  return (
    <div className={styles.wrapper}>
      {label && <div className={styles.label}>{label}</div>}
      <p className={styles.paragraph}>
        {contentParts.map((part, idx) => {
          if (typeof part === "string") {
            return (
              <span key={`text-${idx}`} className={styles.text}>
                {part}
              </span>
            );
          }
          
          // Handle line break type
          if (part.type === 'lineBreak') {
            return <br key={`break-${idx}`} />;
          }
          
          // Handle blank input
          const blankId = part.id;
          const placeholder = part.placeholder || "";
          const value = values[blankId] || "";
          const hasError = !!(error && error[blankId]);
          return (
            <input
              key={`blank-${blankId}`}
              className={styles.blank}
              data-invalid={hasError || undefined}
              data-question-id={dataQuestionId ?? undefined}
              data-blank-id={blankId}
              value={value}
              placeholder={placeholder}
              onChange={(e) => onChange && onChange(blankId, e.target.value)}
              disabled={disabled}
              readOnly={readOnly}
              aria-invalid={hasError || undefined}
            />
          );
        })}
      </p>
      {hint && !error && <div className={styles.hint}>{hint}</div>}
      {error && typeof error === "string" && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}


