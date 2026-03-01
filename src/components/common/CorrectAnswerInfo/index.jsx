'use client';

import { memo } from 'react';
import styles from './CorrectAnswerInfo.module.scss';

function CorrectAnswerInfo({ label, value, className = '' }) {
  if (!value) return null;
  return (
    <div className={`${styles.correctAnswerInfo} ${className}`} role="note" aria-live="polite">
      <span className={styles.icon} aria-hidden>💡</span>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}

export default memo(CorrectAnswerInfo);


