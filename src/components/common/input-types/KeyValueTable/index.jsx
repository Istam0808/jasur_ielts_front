"use client";

import React from "react";
import styles from "./style.module.scss";

// KeyValueTable for table completion: two-column editable rows
export default function KeyValueTable({
  label,
  hint,
  error,
  headers = ["Key", "Value"],
  rows = [], // [{ keyId, keyLabel, valueId }]
  values = {}, // { [valueId]: string }
  onChange,
  disabled = false,
}) {
  return (
    <div className={styles.wrapper}>
      {label && <div className={styles.label}>{label}</div>}
      <div className={styles.table} role="table">
        <div className={styles.head} role="row">
          <div className={styles.headCell} role="columnheader">{headers[0]}</div>
          <div className={styles.headCell} role="columnheader">{headers[1]}</div>
        </div>
        {rows.map((row) => (
          <div key={row.valueId} className={styles.row} role="row">
            <div className={styles.cell} role="cell">{row.keyLabel}</div>
            <div className={styles.cell} role="cell">
              <input
                className={styles.input}
                value={values[row.valueId] || ""}
                onChange={(e) => onChange && onChange(row.valueId, e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>
        ))}
      </div>
      {hint && !error && <div className={styles.hint}>{hint}</div>}
      {error && <div className={styles.error} role="alert">{error}</div>}
    </div>
  );
}


