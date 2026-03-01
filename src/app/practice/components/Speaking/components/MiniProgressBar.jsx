"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import styles from "../styles/shadowing/player-metricDetails.module.scss";

/**
 * MiniProgressBar - Small progress indicator component
 */
const MiniProgressBar = React.memo(function MiniProgressBar({
  value = 0,
  animated = true,
  delay = 0,
  className = "",
  isVisible = true
}) {
  const { shouldReduceAnimations } = usePerformanceMonitor();
  const [displayValue, setDisplayValue] = useState(0);
  const rafRef = useRef(null);
  const startValueRef = useRef(0);
  const wasVisibleRef = useRef(isVisible);

  const clampedValue = Math.max(0, Math.min(100, value));

  const getColorClass = (val) => {
    if (val >= 80) return "mini-progress-excellent";
    if (val >= 60) return "mini-progress-good";
    if (val >= 40) return "mini-progress-fair";
    return "mini-progress-poor";
  };

  useEffect(() => {
    // Cancel any existing animation
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!animated || shouldReduceAnimations() || !isVisible) {
      // If becoming invisible, keep current value but don't animate
      if (!isVisible) {
        wasVisibleRef.current = false;
        return;
      }
      // If animations are disabled, set directly
      setDisplayValue(clampedValue);
      startValueRef.current = clampedValue;
      wasVisibleRef.current = isVisible;
      return;
    }

    // If just became visible, restart animation from 0
    const shouldRestart = !wasVisibleRef.current && isVisible;
    wasVisibleRef.current = isVisible;

    const duration = 800;
    startValueRef.current = shouldRestart ? 0 : displayValue;
    const endValue = clampedValue;
    const startTime = performance.now();
    
    // Reset display value if restarting
    if (shouldRestart) {
      setDisplayValue(0);
    }

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValueRef.current + (endValue - startValueRef.current) * easeOut;
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
        startValueRef.current = endValue;
      }
    };

    // Apply delay if specified
    if (delay > 0) {
      const timeoutId = setTimeout(() => {
        rafRef.current = requestAnimationFrame(animate);
      }, delay * 1000);
      return () => {
        clearTimeout(timeoutId);
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    } else {
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [clampedValue, animated, shouldReduceAnimations, delay, isVisible]);

  const finalValue = animated && !shouldReduceAnimations() && isVisible ? displayValue : clampedValue;

  return (
    <div 
      className={`${styles['mini-progress-bar']} ${styles[getColorClass(clampedValue)]} ${className}`}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${clampedValue}% complete`}
      style={{
        transform: 'translateZ(0)',
        willChange: animated && !shouldReduceAnimations() ? 'contents' : 'auto'
      }}
    >
      <motion.div
        className={styles['mini-progress-fill']}
        initial={animated && !shouldReduceAnimations() && isVisible ? { width: 0 } : false}
        animate={{ width: `${finalValue}%` }}
        transition={{
          duration: animated && !shouldReduceAnimations() && isVisible ? 0.8 : 0,
          delay: isVisible ? delay : 0,
          ease: "easeOut"
        }}
        style={{
          transform: 'translateZ(0)',
          willChange: animated && !shouldReduceAnimations() && isVisible ? 'width' : 'auto'
        }}
      />
    </div>
  );
});

MiniProgressBar.displayName = "MiniProgressBar";

export default MiniProgressBar;