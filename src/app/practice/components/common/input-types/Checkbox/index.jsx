"use client";

import React, { useId } from "react";
import styles from "./style.module.scss";

export default function Checkbox({
  label,
  hint,
  error,
  name,
  options = [],
  value = [],
  onChange,
  disabled = false,
  inline = false,
  required = false,
  statusByValue = {}, // { value: { status: 'correct'|'incorrect'|'neutral'|'correct-not-selected', show: boolean } }
}) {
  const groupId = useId();

  const handleToggle = (optionValue) => {
    if (!onChange) return;
    const isSelected = value.includes(optionValue);
    const next = isSelected
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(next);
  };

  const describedBy = error
    ? `${groupId}-error`
    : hint
    ? `${groupId}-hint`
    : undefined;

  const renderCheckIcon = (status, isChecked) => {
    if (status === 'correct' && isChecked) {
      return (
        <svg
          className={styles.check}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" 
            fill="currentColor"
          />
        </svg>
      );
    }
    
    if (status === 'incorrect' && isChecked) {
      return (
        <svg
          className={styles.check}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" 
            fill="currentColor"
          />
        </svg>
      );
    }
    
    if (isChecked) {
      return (
        <svg
          className={styles.check}
          width="12"
          height="10"
          viewBox="0 0 12 10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M1 5l3.2 3L11 1" fill="none" strokeWidth="2" />
        </svg>
      );
    }
    
    return null;
  };

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
        role="group"
        aria-labelledby={label ? `${groupId}-label` : undefined}
        aria-describedby={describedBy}
      >
        {options.map((opt, idx) => {
          const optionLabel = typeof opt === "string" ? opt : opt.label;
          const optionValue = typeof opt === "string" ? opt : opt.value;
          const id = `${groupId}-${idx}`;
          const isChecked = value.includes(optionValue);
          const status = statusByValue[optionValue]?.status;
          return (
            <label
              key={id}
              className={styles.option}
              htmlFor={id}
              data-feedback={statusByValue[optionValue]?.show || undefined}
              data-status={status}
            >
              <input
                id={id}
                name={name}
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(optionValue)}
                disabled={disabled}
                aria-invalid={!!error || undefined}
                aria-describedby={describedBy}
              />
              <span className={styles.box} aria-hidden="true">
                {renderCheckIcon(status, isChecked)}
              </span>
              <span className={styles.text}>{optionLabel}</span>
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


