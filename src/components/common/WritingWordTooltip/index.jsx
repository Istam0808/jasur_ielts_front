'use client';

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { getLocalizedTooltipContent } from '@/utils/writing/ieltsTooltipContent';
import styles from './WritingWordTooltip.module.scss';

/**
 * WritingWordTooltip Component
 * Displays IELTS rules, examples, and tips when hovering over highlighted words
 */
export default function WritingWordTooltip({
  category,
  word,
  children,
  position = 'top'
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [canRenderPortal, setCanRenderPortal] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const tooltipId = useId();
  const hideTimeoutRef = useRef(null);

  const { t } = useTranslation('writing');

  useEffect(() => {
    setCanRenderPortal(typeof window !== 'undefined' && !!document?.body);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, []);

  const tooltipContent = category ? getLocalizedTooltipContent(category.id, t) : null;

  // Helper to convert hex color to rgba
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const updateTooltipPosition = useCallback((retryCount = 0) => {
    if (!triggerRef.current || !isVisible) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipOffset = 8;
    const viewportPadding = 16;

    const tooltipElement = tooltipRef.current || document.getElementById(tooltipId);
    if (!tooltipElement) {
      if (retryCount < 3) {
        setTimeout(() => updateTooltipPosition(retryCount + 1), 50);
      }
      return;
    }

    const tooltipRect = tooltipElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const leftBound = viewportPadding;
    const rightBound = viewportWidth - viewportPadding;
    const topBound = viewportPadding;
    const bottomBound = viewportHeight - viewportPadding;

    const tooltipWidth = tooltipRect.width || 0;
    const tooltipHeight = tooltipRect.height || 0;

    let left = 0;
    let top = 0;

    // Calculate horizontal position (center on trigger)
    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    left = triggerCenterX - tooltipWidth / 2;

    // Adjust if tooltip goes off screen
    if (left < leftBound) {
      left = leftBound;
    } else if (left + tooltipWidth > rightBound) {
      left = rightBound - tooltipWidth;
    }

    // Calculate vertical position based on position prop
    let calculatedPosition = position;
    if (position === 'top') {
      top = triggerRect.top - tooltipHeight - tooltipOffset;
      if (top < topBound) {
        // Switch to bottom if not enough space on top
        top = triggerRect.bottom + tooltipOffset;
        calculatedPosition = 'bottom';
      }
    } else {
      top = triggerRect.bottom + tooltipOffset;
      if (top + tooltipHeight > bottomBound) {
        // Switch to top if not enough space on bottom
        top = triggerRect.top - tooltipHeight - tooltipOffset;
        calculatedPosition = 'top';
      }
    }

    // Update actual position state to match calculated position
    setActualPosition(calculatedPosition);

    setTooltipStyle({
      left: `${left}px`,
      top: `${top}px`,
      visibility: 'visible'
    });
  }, [isVisible, position, tooltipId]);

  useEffect(() => {
    if (isVisible) {
      updateTooltipPosition();
      const handleResize = () => updateTooltipPosition();
      const handleScroll = () => updateTooltipPosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isVisible, updateTooltipPosition]);

  const showTooltip = useCallback(() => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsVisible(true);
  }, []);

  const hideTooltip = useCallback(() => {
    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    // Set a delay before hiding to allow mouse to move to tooltip
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      hideTimeoutRef.current = null;
    }, 150);
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      // Clear any pending timeout and hide immediately
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setIsVisible(false);
    }
  };

  if (!tooltipContent || !category) {
    return children;
  }

  const triggerProps = {
    ref: triggerRef,
    onMouseEnter: showTooltip,
    onMouseLeave: hideTooltip,
    onFocus: showTooltip,
    onBlur: hideTooltip,
    onKeyDown: handleKeyDown,
    'aria-describedby': isVisible ? tooltipId : undefined,
    'aria-haspopup': 'true',
    'aria-expanded': isVisible,
    style: {
      '--category-color': category.color
    }
  };

  const tooltipElement = isVisible ? (
    <div
      ref={tooltipRef}
      className={`${styles.tooltipContent} ${styles[actualPosition]}`}
      style={tooltipStyle}
      role="tooltip"
      id={tooltipId}
      aria-hidden={!isVisible}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <div className={styles.tooltipHeader}>
        <span className={styles.categoryName} style={{ color: category.color }}>
          {tooltipContent.categoryName}
        </span>
        <span className={styles.wordExample}>"{word}"</span>
      </div>
      
      <div className={styles.tooltipBody}>
        <div className={styles.ruleSection}>
          <h4 className={styles.sectionTitle}>{t('tooltips.sectionTitles.ieltsRule', { defaultValue: 'IELTS Rule' })}</h4>
          <p className={styles.ruleText}>{tooltipContent.rule}</p>
        </div>

        <div className={styles.examplesSection}>
          <h4 className={styles.sectionTitle}>{t('tooltips.sectionTitles.examples', { defaultValue: 'Examples' })}</h4>
          <div className={styles.examplesList}>
            {tooltipContent.examples.map((example, idx) => (
              <span
                key={idx}
                className={styles.exampleTag}
                style={{
                  backgroundColor: hexToRgba(category.color, 0.1),
                  borderColor: hexToRgba(category.color, 0.3),
                  color: category.color
                }}
              >
                {example}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.tipsSection}>
          <h4 className={styles.sectionTitle}>{t('tooltips.sectionTitles.tips', { defaultValue: 'Tips' })}</h4>
          <ul className={styles.tipsList}>
            {tooltipContent.tips.map((tip, idx) => (
              <li key={idx} className={styles.tipItem}>{tip}</li>
            ))}
          </ul>
        </div>

        <div className={styles.coherenceNote}>
          <strong>{t('tooltips.sectionTitles.coherenceCohesion', { defaultValue: '💡 Coherence & Cohesion:' })}</strong> {tooltipContent.coherenceNote}
        </div>
      </div>

      <div className={styles.tooltipArrow} style={{ '--category-color': category.color }} />
    </div>
  ) : null;

  return (
    <span className={styles.tooltipContainer} {...triggerProps}>
      {React.isValidElement(children)
        ? React.cloneElement(children, {
            ...children.props,
            'aria-describedby': isVisible ? tooltipId : undefined,
            'aria-haspopup': 'true',
            'aria-expanded': isVisible
          })
        : children}
      {isVisible && canRenderPortal && createPortal(tooltipElement, document.body)}
    </span>
  );
}
