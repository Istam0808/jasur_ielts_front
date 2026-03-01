"use client";

import React from "react";
import styles from "./style.module.scss";

// Renders a vertical list of labeled inputs (for advanced_short_answer etc.)
export default function InputsList({
  label,
  hint,
  error,
  items = [], // [{ id, label, placeholder }]
  values = {},
  onChange,
  disabled = false,
}) {
  return (
    <div className={styles.wrapper}>
      {label && <div className={styles.label}>{label}</div>}
      <div className={styles.list}>
        {items.map((it) => (
          <div key={it.id} className={styles.row}>
            <div className={styles.rowLabel}>{it.label}</div>
            <input
              className={styles.input}
              value={values[it.id] || ''}
              placeholder={it.placeholder || ''}
              onChange={(e) => onChange && onChange(it.id, e.target.value)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
      {hint && !error && <div className={styles.hint}>{hint}</div>}
      {error && <div className={styles.error} role="alert">{error}</div>}
    </div>
  );
}


