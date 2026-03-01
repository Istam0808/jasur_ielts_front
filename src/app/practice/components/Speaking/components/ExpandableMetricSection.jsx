"use client";

import React, { useRef, useLayoutEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronDown } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import styles from "../styles/shadowing/player-expandable.module.scss";

/**
 * ExpandableMetricSection - Reusable expandable section component
 * 
 * @param {boolean} isExpanded - Whether the section is expanded
 * @param {function} onToggle - Callback function when toggle button is clicked
 * @param {React.ReactNode} children - Content to display when expanded
 * @param {string} ariaLabel - ARIA label for accessibility
 * @param {string} className - Additional CSS classes
 */
const ExpandableMetricSection = React.memo(function ExpandableMetricSection({
  isExpanded,
  onToggle,
  children,
  ariaLabel,
  className = ""
}) {
  const { t } = useTranslation("speaking");
  const contentRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const [height, setHeight] = useState(0);

  // Memoized keyboard handler
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  }, [onToggle]);

  // Memoized ARIA label
  const computedAriaLabel = useMemo(() => {
    if (ariaLabel) return ariaLabel;

    return isExpanded
      ? t("menu.shadowing.player.analysis.expandableSection.collapseDetails")
      : t("menu.shadowing.player.analysis.expandableSection.expandDetails");
  }, [ariaLabel, isExpanded, t]);

  // Optimized height measurement with ResizeObserver
  useLayoutEffect(() => {
    if (!contentRef.current) return;

    const measureHeight = () => {
      if (isExpanded && contentRef.current) {
        const contentHeight = contentRef.current.scrollHeight;
        setHeight(contentHeight);
      } else {
        setHeight(0);
      }
    };

    // Initial measurement
    measureHeight();

    // Set up ResizeObserver for dynamic content changes
    if (isExpanded && typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver(measureHeight);
      resizeObserverRef.current.observe(contentRef.current);
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [isExpanded, children]);

  // Memoized animation variants for better performance
  const animationVariants = useMemo(() => ({
    initial: { height: 0, opacity: 0 },
    animate: { height, opacity: 1 },
    exit: { height: 0, opacity: 0 }
  }), [height]);

  // Memoized transition configuration
  const transition = useMemo(() => ({
    duration: 0.3,
    ease: [0.4, 0.0, 0.2, 1] // Custom easing for smoother animation
  }), []);

  // Memoized inline styles for better performance
  const motionStyles = useMemo(() => ({
    overflow: "hidden",
    transform: 'translateZ(0)', // Force GPU acceleration
    backfaceVisibility: 'hidden', // Improve rendering performance
    willChange: isExpanded ? 'height, opacity' : 'auto'
  }), [isExpanded]);

  // Optimized children rendering
  const renderedChildren = useMemo(() => {
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;

      // Check if it's a React component (not a DOM element)
      const isReactComponent = typeof child.type === 'function' ||
        (typeof child.type === 'object' && child.type !== null);

      if (isReactComponent) {
        return React.cloneElement(child, { isVisible: isExpanded });
      }

      return child;
    });
  }, [children, isExpanded]);

  return (
    <div className={`${styles['expandable-section-wrapper']} ${className}`}>
      <button
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        className={styles['expand-toggle']}
        aria-expanded={isExpanded}
        aria-label={computedAriaLabel}
        aria-controls="expandable-content"
        type="button"
      >
        <span>{t("menu.shadowing.player.analysis.expandableSection.viewDetails")}</span>
        <FaChevronDown
          aria-hidden="true"
          style={{
            transition: 'transform 0.3s ease',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </button>

      <AnimatePresence initial={false} mode="wait">
        {isExpanded && (
          <motion.div
            id="expandable-content"
            key="expandable-content"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={animationVariants}
            transition={transition}
            className={`${styles['expandable-metric-section']} ${styles.expanded}`}
            role="region"
            aria-label={t("menu.shadowing.player.analysis.expandableSection.detailedMetrics")}
            style={motionStyles}
          >
            <div ref={contentRef}>
              {renderedChildren}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ExpandableMetricSection.displayName = "ExpandableMetricSection";

export default ExpandableMetricSection;