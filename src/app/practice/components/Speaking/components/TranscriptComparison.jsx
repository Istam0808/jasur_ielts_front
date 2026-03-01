"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FaCheck, FaTimes, FaMinus, FaPlus } from "react-icons/fa";
import { computeTextDiff } from "../utils/textDiffing";
import styles from "../styles/shadowing/player-transcript.module.scss"; 

/**
 * TranscriptComparison Component with i18n support
 */
const TranscriptComparison = React.memo(function TranscriptComparison({
  referenceText = "",
  userTranscript = "",
  isAnalyzed = false,
  textMatchScore = null
}) {
  // FIXED: Use correct hook name and namespace
  const { t } = useTranslation("speaking");

  // Compute word-level diff
  const diffResult = useMemo(() => {
    if (!isAnalyzed || !referenceText || !userTranscript) {
      return null;
    }
    return computeTextDiff(referenceText, userTranscript);
  }, [referenceText, userTranscript, isAnalyzed]);

  // If not analyzed or no diff result, show plain transcript
  if (!isAnalyzed || !diffResult) {
    return (
      <div className={styles['transcript-comparison']}>
        <div className={styles['transcript-plain']}>
          {userTranscript || (
            <span className={styles['placeholder-text']}>
              {t('menu.shadowing.player.transcript.placeholder')}
            </span>
          )}
        </div>
      </div>
    );
  }

  const { words, stats } = diffResult;

  // Render word with appropriate styling
  const renderWord = (wordObj, index) => {
    const { status, text, referenceText: refText } = wordObj;
    const wordClass = `word-${status}`;

    // Tooltip text based on status using translations
    let tooltipText = text;
    if (status === 'incorrect' && refText) {
      tooltipText = t('menu.shadowing.player.transcript.comparison.tooltips.incorrect', {
        user: text,
        reference: refText
      });
    } else if (status === 'missing') {
      tooltipText = t('menu.shadowing.player.transcript.comparison.tooltips.missing', {
        word: text
      });
    } else if (status === 'extra') {
      tooltipText = t('menu.shadowing.player.transcript.comparison.tooltips.extra', {
        word: text
      });
    }

    return (
      <motion.span
        key={index}
        className={`${styles['word-item']} ${styles[wordClass]}`}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.3,
          delay: index * 0.02,
          ease: "easeOut"
        }}
        title={tooltipText}
        aria-label={tooltipText}
        role="text"
      >
        {text}
      </motion.span>
    );
  };

  return (
    <div className={styles['transcript-comparison']}>
      {/* Legend */}
      <div className={styles['comparison-legend']} role="region" aria-label={t('menu.shadowing.player.transcript.comparison.legend.title')}>
        <div className={styles['legend-items-wrapper']}>
          <div className={styles['legend-item']}>
            <span className={`${styles['legend-icon']} ${styles['legend-icon-correct']}`} aria-hidden="true">
              <FaCheck />
            </span>
            <span className={styles['legend-label']}>{t('menu.shadowing.player.transcript.comparison.legend.correct')}</span>
          </div>
          <div className={styles['legend-item']}>
            <span className={`${styles['legend-icon']} ${styles['legend-icon-incorrect']}`} aria-hidden="true">
              <FaTimes />
            </span>
            <span className={styles['legend-label']}>{t('menu.shadowing.player.transcript.comparison.legend.incorrect')}</span>
          </div>
          <div className={styles['legend-item']}>
            <span className={`${styles['legend-icon']} ${styles['legend-icon-missing']}`} aria-hidden="true">
              <FaMinus />
            </span>
            <span className={styles['legend-label']}>{t('menu.shadowing.player.transcript.comparison.legend.missing')}</span>
          </div>
          <div className={styles['legend-item']}>
            <span className={`${styles['legend-icon']} ${styles['legend-icon-extra']}`} aria-hidden="true">
              <FaPlus />
            </span>
            <span className={styles['legend-label']}>{t('menu.shadowing.player.transcript.comparison.legend.extra')}</span>
          </div>
        </div>

        {stats.total > 0 && textMatchScore !== null && (
          <div className={styles['legend-stats']}>
            <span className={styles['legend-stats-label']}>
              {t('menu.shadowing.player.transcript.comparison.stats.matchPercentage', {
                percentage: Math.round(textMatchScore * 100)
              })}
            </span>
          </div>
        )}
      </div>

      {/* Word-by-word comparison */}
      <div
        className={styles['comparison-text']}
        role="region"
        aria-label={t('menu.shadowing.player.transcript.comparison.stats.ariaComparison', {
          correct: stats.correct,
          incorrect: stats.incorrect,
          missing: stats.missing,
          extra: stats.extra
        })}
        aria-live="polite"
      >
        {words.length > 0 ? (
          words.map((wordObj, index) => (
            <React.Fragment key={index}>
              {renderWord(wordObj, index)}
              {index < words.length - 1 && <span className={styles['word-separator']}> </span>}
            </React.Fragment>
          ))
        ) : (
          <span className={styles['placeholder-text']}>{t('menu.shadowing.player.transcript.comparison.empty')}</span>
        )}
      </div>

      {/* Screen reader summary */}
      <div className={styles['sr-only']} aria-live="polite">
        {stats.total > 0 && t('menu.shadowing.player.transcript.comparison.stats.summary', {
          correct: stats.correct,
          total: stats.total,
          incorrect: stats.incorrect,
          missing: stats.missing,
          extra: stats.extra
        })}
      </div>
    </div>
  );
});

TranscriptComparison.displayName = 'TranscriptComparison';
export default TranscriptComparison;