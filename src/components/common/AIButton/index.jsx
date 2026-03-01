'use client';

import { useState, useEffect } from 'react';
import { HiSparkles } from 'react-icons/hi2'; // Clean, modern sparkle
import styles from './AIButton.module.scss';

/**
 * AIButton - React Icons Version
 * Uses hardware-accelerated transforms for the "shuffle" animation.
 */
export default function AIButton({
  children,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  ...rest
}) {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    // Smoother 3-second orbital rotation
    const interval = setInterval(() => {
      setCycle((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      type={type}
      className={`${styles.aiButton} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {/* Premium background shimmer */}
      <div className={styles.shimmer} />

      <div className={styles.contentWrapper}>
        <div className={styles.sparklesContainer} data-cycle={cycle}>
          <HiSparkles className={`${styles.sparkle} ${styles.sparkle1}`} />
          <HiSparkles className={`${styles.sparkle} ${styles.sparkle2}`} />
          <HiSparkles className={`${styles.sparkle} ${styles.sparkle3}`} />
        </div>
        <span className={styles.buttonText}>{children}</span>
      </div>

      {/* Subtle glow effect behind icons */}
      <div className={styles.glow} />
    </button>
  );
}