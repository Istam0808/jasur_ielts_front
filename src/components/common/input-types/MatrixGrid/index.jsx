"use client";

import React, { useId } from "react";
import styles from "./style.module.scss";

// Matrix grid for matching questions: rows x columns, radio-like single selection per row
export default function MatrixGrid({
  label,
  hint,
  error,
  rows = [], // array of row labels
  columns = [], // array of column labels
  value = {}, // map rowKey -> selected columnKey
  onChange,
  disabled = false,
  required = false,
}) {
  const id = useId();
  const describedBy = error
    ? `${id}-error`
    : hint
    ? `${id}-hint`
    : undefined;

  const handleSelect = (rowKey, columnKey) => {
    if (!onChange) return;
    onChange({ ...value, [rowKey]: columnKey });
  };

  return (
    <div className={styles.wrapper}>
      {label && <div className={styles.label}>{label}{required ? <span className={styles.required}>*</span> : null}</div>}
      <div className={styles.table} role="grid" aria-describedby={describedBy} style={{ ['--cols']: columns.length }}>
        <div className={styles.head} role="row">
          <div className={styles.headCell} role="columnheader" />
          {columns.map((col) => (
            <div key={String(col.key ?? col)} className={styles.headCell} role="columnheader">
              {typeof col === 'string' ? col : col.label}
            </div>
          ))}
        </div>
        {rows.map((row) => {
          const rowKey = String(row.key ?? row);
          const rowLabel = typeof row === 'string' ? row : row.label;
          return (
            <div key={rowKey} className={styles.row} role="row">
              <div className={styles.rowHeader} role="rowheader">{rowLabel}</div>
              {columns.map((col) => {
                const colKey = String(col.key ?? col);
                const selected = value[rowKey] === colKey;
                return (
                  <button
                    key={`${rowKey}-${colKey}`}
                    type="button"
                    className={styles.cell}
                    role="gridcell"
                    aria-selected={selected}
                    disabled={disabled}
                    onClick={() => handleSelect(rowKey, colKey)}
                  >
                    <span className={styles.dot} data-selected={selected || undefined} />
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      {hint && !error && <div id={`${id}-hint`} className={styles.hint}>{hint}</div>}
      {error && <div id={`${id}-error`} className={styles.error} role="alert">{error}</div>}
    </div>
  );
}


