"use client";
import Image from "next/image";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  motion,
  useTransform,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";
import styles from "./style.module.scss";

const Tooltip = ({ items }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltipPositions, setTooltipPositions] = useState({});
  const [translateXBounds, setTranslateXBounds] = useState({});
  const triggerRefs = useRef({});
  const tooltipRefs = useRef({});
  const springConfig = { stiffness: 100, damping: 5 };
  const x = useMotionValue(0);

  const rotate = useSpring(
    useTransform(x, [-100, 100], [-45, 45]),
    springConfig
  );

  // Default translateX transform (in pixels)
  const defaultTranslateXPixels = useSpring(
    useTransform(x, [-100, 100], [-50, 50]),
    springConfig
  );

  // Transform that combines -50% (for centering) with pixel translation
  const defaultTranslateX = useTransform(
    defaultTranslateXPixels,
    (val) => `calc(-50% + ${val}px)`
  );

  // Dynamic translateX that updates based on current hovered item's bounds
  const [currentBounds, setCurrentBounds] = useState({ min: -50, max: 50 });
  const constrainedTranslateXPixels = useSpring(
    useTransform(x, [-100, 100], [currentBounds.min, currentBounds.max]),
    springConfig
  );
  const constrainedTranslateX = useTransform(
    constrainedTranslateXPixels,
    (val) => `calc(-50% + ${val}px)`
  );

  const calculateTooltipPosition = useCallback((itemId, retryCount = 0) => {
    const triggerRef = triggerRefs.current[itemId];
    const tooltipRef = tooltipRefs.current[itemId];

    if (!triggerRef || !tooltipRef) return;

    const triggerRect = triggerRef.getBoundingClientRect();
    const tooltipRect = tooltipRef.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportPadding = 16; // Padding from viewport edges

    // Calculate centered position (center point of tooltip)
    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const tooltipWidth = tooltipRect.width || 0;
    
    // If tooltip width is not available yet, retry after a short delay
    if (tooltipWidth === 0 && retryCount < 3) {
      setTimeout(() => {
        calculateTooltipPosition(itemId, retryCount + 1);
      }, 50);
      return;
    }
    
    let tooltipCenterX = triggerCenterX;

    // Check for left/right overflow
    const leftBound = viewportPadding;
    const rightBound = viewportWidth - viewportPadding;
    const tooltipLeft = tooltipCenterX - tooltipWidth / 2;
    const tooltipRight = tooltipCenterX + tooltipWidth / 2;

    // Adjust center position if tooltip would overflow
    if (tooltipLeft < leftBound) {
      tooltipCenterX = leftBound + tooltipWidth / 2;
    } else if (tooltipRight > rightBound) {
      tooltipCenterX = rightBound - tooltipWidth / 2;
    }

    // Calculate available space for translateX animation
    const finalTooltipLeft = tooltipCenterX - tooltipWidth / 2;
    const finalTooltipRight = tooltipCenterX + tooltipWidth / 2;
    const availableLeft = finalTooltipLeft - leftBound;
    const availableRight = rightBound - finalTooltipRight;
    const maxTranslateLeft = Math.min(Math.max(availableLeft, 0), 50);
    const maxTranslateRight = Math.min(Math.max(availableRight, 0), 50);

    const bounds = {
      min: -maxTranslateLeft,
      max: maxTranslateRight,
    };

    // Store center position - we'll use translateX(-50%) to center it
    setTooltipPositions((prev) => ({
      ...prev,
      [itemId]: tooltipCenterX,
    }));

    setTranslateXBounds((prev) => ({
      ...prev,
      [itemId]: bounds,
    }));

    // Update current bounds for the constrained translateX
    setCurrentBounds(bounds);
  }, []);

  useEffect(() => {
    if (hoveredIndex !== null) {
      // Use double requestAnimationFrame to ensure tooltip is fully rendered with dimensions
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          calculateTooltipPosition(hoveredIndex);
        });
      });
    } else {
      // Reset bounds when hover ends
      setCurrentBounds({ min: -50, max: 50 });
    }
  }, [hoveredIndex, calculateTooltipPosition]);

  useEffect(() => {
    if (hoveredIndex !== null) {
      const handleScroll = () => {
        calculateTooltipPosition(hoveredIndex);
      };
      const handleResize = () => {
        calculateTooltipPosition(hoveredIndex);
      };

      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [hoveredIndex, calculateTooltipPosition]);

  const handleMouseMove = (event) => {
    const halfWidth = event.target.offsetWidth / 2;
    x.set(event.nativeEvent.offsetX - halfWidth);
  };

  return (
    <div className={styles.tooltipContainer}>
      {items.map((item, idx) => (
        <div
          ref={(el) => (triggerRefs.current[item.id] = el)}
          className={styles.tooltipItemWrapper}
          key={item.name}
          onMouseEnter={() => setHoveredIndex(item.id)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === item.id && (
              <motion.div
                ref={(el) => (tooltipRefs.current[item.id] = el)}
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 10,
                  },
                }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                style={{
                  left: tooltipPositions[item.id]
                    ? `${tooltipPositions[item.id]}px`
                    : "50%",
                  translateX: tooltipPositions[item.id]
                    ? constrainedTranslateX
                    : defaultTranslateX,
                  rotate: rotate,
                }}
                className={styles.tooltip}
              >
                <div className={styles.tooltipArrow} />
                <div className={styles.tooltipContent}>
                  <div className={styles.name}>{item.name}</div>
                  <div className={styles.designation}>{item.designation}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <Image
            onMouseMove={handleMouseMove}
            height={100}
            width={100}
            src={item.image}
            alt={item.name}
            className={styles.image}
          />
        </div>
      ))}
    </div>
  );
};

export default Tooltip; 