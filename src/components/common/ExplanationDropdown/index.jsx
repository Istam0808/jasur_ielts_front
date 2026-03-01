"use client";

import React, { useState, useCallback, useMemo, useId } from 'react';
import { FaLightbulb, FaChevronDown } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useTaskTranslation } from '@/utils/taskTranslations';
import styles from './style.module.scss';

/**
 * ExplanationDropdown Component
 * A reusable dropdown component for displaying educational explanations
 * with smooth animations, multilingual support, and theme compatibility.
 * 
 * @param {Object} props
 * @param {string|Object} props.explanation - Explanation text or i18n object {en, ru, uz}
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - Component variant: 'default' | 'compact'
 * @param {string} props.theme - Theme: 'light' | 'dark'
 * @param {boolean} props.defaultExpanded - Whether dropdown is expanded by default
 * @param {string} props.label - Custom label (defaults to "Explanation")
 * @param {React.ReactNode} props.icon - Custom icon override
 * @param {boolean} props.isIncorrect - Whether this is for an incorrect answer (more prominent styling)
 * @param {boolean} props.isCorrect - Whether this is for a correct answer (muted styling)
 */
const ExplanationDropdown = ({
  explanation,
  className = '',
  variant = 'default',
  theme = 'dark',
  defaultExpanded = false,
  label = null,
  icon = null,
  isIncorrect = false,
  isCorrect = false
}) => {
  const { t } = useTranslation('coding');
  const { getTranslated } = useTaskTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Generate unique ID for accessibility
  const contentId = useId();

  // Memoize explanation text extraction to avoid recalculation
  const explanationText = useMemo(() => {
    if (!explanation) return null;

    try {
      return typeof explanation === 'string'
        ? explanation
        : getTranslated(explanation);
    } catch (error) {
      console.error('Error translating explanation:', error);
      return typeof explanation === 'string' ? explanation : '';
    }
  }, [explanation, getTranslated]);

  // Memoize display label
  const displayLabel = useMemo(() => {
    return label || t('explanation') || 'Explanation';
  }, [label, t]);

  // Memoize className concatenation
  const containerClassName = useMemo(() => {
    const classes = [styles.explanationDropdown];

    if (variant !== 'default' && styles[variant]) {
      classes.push(styles[variant]);
    }

    if (styles[theme]) {
      classes.push(styles[theme]);
    }

    if (isExpanded) {
      classes.push(styles.expanded);
    }

    if (isIncorrect) {
      classes.push(styles.incorrect);
    }

    if (isCorrect) {
      classes.push(styles.correct);
    }

    if (className) {
      classes.push(className);
    }

    return classes.join(' ');
  }, [variant, theme, isExpanded, isIncorrect, isCorrect, className]);

  // Memoize toggle handler to prevent recreation
  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Memoize keyboard handler
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);

  // Memoize ARIA label for button
  const buttonAriaLabel = useMemo(() => {
    const action = isExpanded ? (t('hide') || 'Hide') : (t('show') || 'Show');
    return `${action} ${displayLabel}`;
  }, [isExpanded, t, displayLabel]);

  // Early return if no valid explanation
  if (!explanation || !explanationText) {
    return null;
  }

  return (
    <div
      className={containerClassName}
      role="region"
      aria-label={displayLabel}
    >
      <button
        type="button"
        className={styles.trigger}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        aria-label={buttonAriaLabel}
      >
        <div className={styles.triggerContent}>
          <div className={styles.iconWrapper}>
            {icon || <FaLightbulb className={styles.lightbulbIcon} aria-hidden="true" />}
          </div>
          <span className={styles.label}>{displayLabel}</span>
        </div>
        <div
          className={styles.chevron}
          aria-hidden="true"
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <FaChevronDown />
        </div>
      </button>

      <div
        className={styles.content}
        id={contentId}
        aria-hidden={!isExpanded}
        hidden={!isExpanded}
      >
        <div className={styles.contentInner}>
          <p className={styles.text}>{explanationText}</p>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ExplanationDropdown);