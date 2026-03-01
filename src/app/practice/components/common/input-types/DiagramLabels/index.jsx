"use client";

import React from "react";
import styles from "./style.module.scss";

// DiagramLabels: simple labels list with inputs for each label position
export default function DiagramLabels({
  label,
  hint,
  error,
  labels = [], // [{ position, text }]
  values = {}, // { [position]: string }
  onChange,
}) {
  return (
    <div className={styles.wrapper}>
      {label && <div className={styles.label}>{label}</div>}
      <div className={styles.list}>
        {labels.map((l) => (
          <div key={l.position} className={styles.row}>
            <div className={styles.pos}>{l.position}</div>
            <div className={styles.text}>{l.text}</div>
            <input
              className={styles.input}
              value={values[l.position] || ''}
              onChange={(e) => onChange && onChange(l.position, e.target.value)}
            />
          </div>
        ))}
      </div>
      {hint && !error && <div className={styles.hint}>{hint}</div>}
      {error && <div className={styles.error} role="alert">{error}</div>}
    </div>
  );
}


