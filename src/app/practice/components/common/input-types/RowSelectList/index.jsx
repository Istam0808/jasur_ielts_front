"use client";

import React from "react";
import SelectOption from "../SelectOption";
import styles from "./style.module.scss";

// RowSelectList: left-side labels, right-side select per row
export default function RowSelectList({
  label,
  hint,
  error,
  rows = [], // [{ key, label }]
  options = [], // select options
  value = {}, // { [rowKey]: selectedValue }
  onChange,
  disabled = false,
}) {
  return (
    <div className={styles.wrapper}>
      {label && <div className={styles.label}>{label}</div>}
      <div className={styles.list}>
        {rows.map((row) => (
          <div key={String(row.key)} className={styles.row}>
            <div className={styles.rowLabel}>{row.label}</div>
            <div className={styles.selectCell}>
              <SelectOption
                options={options}
                value={value[row.key] ?? null}
                onChange={(v) => onChange && onChange({ ...value, [row.key]: v })}
                disabled={disabled}
                placeholder="Choose"
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


