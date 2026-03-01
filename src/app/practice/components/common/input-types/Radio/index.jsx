"use client";

import React, { useId } from "react";
import styles from "./style.module.scss";

export default function Radio({
  label,
  hint,
  error,
  name,
  options = [],
  value = null,
  onChange,
  disabled = false,
  inline = false,
  required = false,
  allowDeselect = false,
  statusByValue = {}, // { value: { status: 'correct'|'incorrect'|'neutral'|'correct-not-selected', show: boolean } }
}) {
  const groupId = useId();

  const describedBy = error
    ? `${groupId}-error`
    : hint
    ? `${groupId}-hint`
    : undefined;

  return (
    <div className={styles.wrapper} data-inline={inline || undefined}>
      {label && (
        <label className={styles.label} htmlFor={`${groupId}-0`}>
          {label}
          {required ? <span className={styles.required}>*</span> : null}
        </label>
      )}

      <div
        className={styles.group}
        role="radiogroup"
        aria-describedby={describedBy}
      >
        {options.map((opt, idx) => {
          const optionLabel = typeof opt === "string" ? opt : opt.label;
          const optionValue = typeof opt === "string" ? opt : opt.value;
          const id = `${groupId}-${idx}`;
          const isChecked = value === optionValue;
          const statusMeta = statusByValue[optionValue] || {};
          const showFeedback = !!statusMeta.show;
          const status = statusMeta.status;
          return (
            <label
              key={id}
              className={styles.option}
              htmlFor={id}
              data-feedback={showFeedback || undefined}
              data-status={status}
            >
              <input
                id={id}
                name={name}
                type="radio"
                checked={isChecked}
                onChange={() => {
                  if (!onChange) return;
                  if (allowDeselect && isChecked) {
                    onChange(null);
                  } else {
                    onChange(optionValue);
                  }
                }}
                disabled={disabled}
                aria-invalid={!!error || undefined}
                aria-describedby={describedBy}
              />
              <span className={styles.dot} aria-hidden="true">
                <span className={styles.inner} />
              </span>
              <span className={styles.text}>{optionLabel}</span>
              {showFeedback && status && status !== 'neutral' ? (
                <span className={styles.statusGlyph} aria-hidden="true">
                  {status === 'incorrect' ? '✕' : (status === 'correct' || status === 'correct-not-selected') ? '✓' : ''}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>

      {hint && !error && (
        <div id={`${groupId}-hint`} className={styles.hint}>
          {hint}
        </div>
      )}
      {error && (
        <div id={`${groupId}-error`} className={styles.error} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}


