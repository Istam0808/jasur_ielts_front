"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import styles from "../styles/shadowing/player-metrics.module.scss";

/**
 * RadialProgress - Circular progress indicator component
 * 
 * @param {number} value - Progress value (0-100)
 * @param {number} size - Size of the circle in pixels
 * @param {number} strokeWidth - Width of the stroke
 * @param {string} className - Additional CSS classes
 * @param {string} colorClass - Color class for the progress ring
 * @param {boolean} animated - Whether to animate the progress
 * @param {number} delay - Animation delay in seconds
 */
const RadialProgress = React.memo(function RadialProgress({
  value = 0,
  size = 100,
  strokeWidth = 8,
  className = "",
  colorClass = "progress-primary",
  animated = true,
  delay = 0,
}) {
  const { shouldReduceAnimations, isMobile } = usePerformanceMonitor();
  const [displayValue, setDisplayValue] = useState(0);
  
  // Responsive sizing for mobile
  const responsiveSize = isMobile && size > 100 ? Math.max(80, size * 0.85) : size;
  const responsiveStrokeWidth = isMobile && strokeWidth > 8 ? Math.max(6, strokeWidth * 0.85) : strokeWidth;

  const clampedValue = Math.max(0, Math.min(100, value));
  const radius = (responsiveSize - responsiveStrokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;

  const rafRef = useRef(null);
  const startValueRef = useRef(0);

  useEffect(() => {
    // Cancel any existing animation
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!animated || shouldReduceAnimations()) {
      setDisplayValue(clampedValue);
      startValueRef.current = clampedValue;
      return;
    }

    const duration = 1500;
    startValueRef.current = displayValue;
    const endValue = clampedValue;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
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
  }, [clampedValue, animated, shouldReduceAnimations, delay]);

  const finalValue = animated && !shouldReduceAnimations() ? displayValue : clampedValue;
  const finalOffset = circumference - (finalValue / 100) * circumference;

  return (
    <div 
      className={`${styles['radial-progress-container']} ${className}`}
      style={{ 
        width: responsiveSize, 
        height: responsiveSize,
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${clampedValue}% complete`}
    >
      <svg
        width={responsiveSize}
        height={responsiveSize}
        className={styles['radial-progress-svg']}
        style={{ 
          transform: 'rotate(-90deg) translateZ(0)',
          willChange: 'transform'
        }}
      >
        {/* Background circle */}
        <circle
          cx={responsiveSize / 2}
          cy={responsiveSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={responsiveStrokeWidth}
          className={styles['radial-progress-bg']}
        />
        {/* Progress circle */}
        <motion.circle
          cx={responsiveSize / 2}
          cy={responsiveSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={responsiveStrokeWidth}
          strokeLinecap="round"
          className={`${styles['radial-progress-fill']} ${styles[colorClass]}`}
          initial={animated && !shouldReduceAnimations() ? { strokeDashoffset: circumference } : false}
          animate={{ strokeDashoffset: finalOffset }}
          transition={{
            duration: animated && !shouldReduceAnimations() ? 1.5 : 0,
            delay: delay,
            ease: "easeOut"
          }}
          style={{
            strokeDasharray: circumference,
            transform: 'translateZ(0)',
            willChange: animated && !shouldReduceAnimations() ? 'stroke-dashoffset' : 'auto'
          }}
        />
      </svg>
      {/* Center content */}
      <div className={styles['radial-progress-content']}>
        <motion.span
          className={`${styles['radial-progress-value']} ${styles[colorClass]}`}
          initial={animated && !shouldReduceAnimations() ? { opacity: 0, scale: 0.5 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.5,
            delay: delay + 0.3,
            type: "spring",
            stiffness: 200
          }}
        >
          {Math.round(clampedValue)}%
        </motion.span>
      </div>
    </div>
  );
});

RadialProgress.displayName = "RadialProgress";

export default RadialProgress;
