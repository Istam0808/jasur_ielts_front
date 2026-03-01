"use client";

import React, { useId } from "react";
import styles from "./style.module.scss";

export default function Textarea({
  label,
  hint,
  error,
  name,
  value = "",
  onChange,
  placeholder,
  rows = 4,
  disabled = false,
  required = false,
  readOnly = false,
  maxLength,
}) {
  const id = useId();
  const describedBy = error
    ? `${id}-error`
    : hint
    ? `${id}-hint`
    : undefined;

  return (
    <div className={styles.wrapper}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
          {required ? <span className={styles.required}>*</span> : null}
        </label>
      )}
      <textarea
        id={id}
        className={styles.textarea}
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy}
        maxLength={maxLength}
      />
      {hint && !error && (
        <div id={`${id}-hint`} className={styles.hint}>
          {hint}
        </div>
      )}
      {error && (
        <div id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}


