"use client";
import React, { useState, useRef, useEffect, useId, useCallback } from "react";
import { createPortal } from "react-dom";
import { FiInfo } from "react-icons/fi";
import styles from "./InfoTooltip.module.scss";

const InfoTooltip = ({ content, position = "top", children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [canRenderPortal, setCanRenderPortal] = useState(false);
  const triggerRef = useRef(null);
  const tooltipId = useId();

  useEffect(() => {
    setCanRenderPortal(typeof window !== "undefined" && !!document?.body);
  }, []);

  const updateTooltipPosition = useCallback((retryCount = 0) => {
    if (!triggerRef.current || !isVisible) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipOffset = 8;
    const viewportPadding = 16;
    
    // Get tooltip element from DOM (it's portaled to body)
    const tooltipElement = document.getElementById(tooltipId);
    if (!tooltipElement) {
      // If tooltip isn't rendered yet, retry after a short delay
      if (retryCount < 3) {
        setTimeout(() => updateTooltipPosition(retryCount + 1), 50);
      }
      return;
    }

    const tooltipRect = tooltipElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Viewport boundaries with padding
    const leftBound = viewportPadding;
    const rightBound = viewportWidth - viewportPadding;
    const topBound = viewportPadding;
    const bottomBound = viewportHeight - viewportPadding;

    const tooltipWidth = tooltipRect.width || 0;
    const tooltipHeight = tooltipRect.height || 0;
    
    // If tooltip dimensions aren't available yet, retry
    if ((tooltipWidth === 0 || tooltipHeight === 0) && retryCount < 3) {
      setTimeout(() => updateTooltipPosition(retryCount + 1), 50);
      return;
    }
    
    // Fallback: if still no dimensions, use estimated values
    const effectiveWidth = tooltipWidth > 0 ? tooltipWidth : 200;
    const effectiveHeight = tooltipHeight > 0 ? tooltipHeight : 50;

    let style = {};

    switch (position) {
      case "top": {
        // Calculate centered position
        let left = triggerRect.left + triggerRect.width / 2;
        let top = triggerRect.top - tooltipOffset;
        
        // Check horizontal overflow
        const tooltipLeft = left - effectiveWidth / 2;
        const tooltipRight = left + effectiveWidth / 2;
        
        if (tooltipLeft < leftBound) {
          // Overflow left - shift right
          left = leftBound + effectiveWidth / 2;
        } else if (tooltipRight > rightBound) {
          // Overflow right - shift left
          left = rightBound - effectiveWidth / 2;
        }
        
        // Check vertical overflow
        const tooltipTop = top - effectiveHeight;
        if (tooltipTop < topBound) {
          // Overflow top - flip to bottom
          top = triggerRect.bottom + tooltipOffset;
          style = {
            left: left,
            top: top,
            transform: "translate(-50%, 0)",
          };
        } else {
          style = {
            left: left,
            top: top,
            transform: "translate(-50%, -100%)",
          };
        }
        break;
      }
      case "bottom": {
        // Calculate centered position
        let left = triggerRect.left + triggerRect.width / 2;
        let top = triggerRect.bottom + tooltipOffset;
        
        // Check horizontal overflow
        const tooltipLeft = left - effectiveWidth / 2;
        const tooltipRight = left + effectiveWidth / 2;
        
        if (tooltipLeft < leftBound) {
          // Overflow left - shift right
          left = leftBound + effectiveWidth / 2;
        } else if (tooltipRight > rightBound) {
          // Overflow right - shift left
          left = rightBound - effectiveWidth / 2;
        }
        
        // Check vertical overflow
        const tooltipBottom = top + effectiveHeight;
        if (tooltipBottom > bottomBound) {
          // Overflow bottom - flip to top
          top = triggerRect.top - tooltipOffset;
          style = {
            left: left,
            top: top,
            transform: "translate(-50%, -100%)",
          };
        } else {
          style = {
            left: left,
            top: top,
            transform: "translate(-50%, 0)",
          };
        }
        break;
      }
      case "left": {
        // Calculate position
        let left = triggerRect.left - tooltipOffset;
        let top = triggerRect.top + triggerRect.height / 2;
        
        // Check horizontal overflow
        const tooltipLeft = left - effectiveWidth;
        if (tooltipLeft < leftBound) {
          // Overflow left - flip to right
          left = triggerRect.right + tooltipOffset;
          style = {
            left: left,
            top: top,
            transform: "translate(0, -50%)",
          };
        } else {
          // Check vertical overflow
          const tooltipTop = top - effectiveHeight / 2;
          const tooltipBottom = top + effectiveHeight / 2;
          
          if (tooltipTop < topBound) {
            top = topBound + effectiveHeight / 2;
          } else if (tooltipBottom > bottomBound) {
            top = bottomBound - effectiveHeight / 2;
          }
          
          style = {
            left: left,
            top: top,
            transform: "translate(-100%, -50%)",
          };
        }
        break;
      }
      case "right": {
        // Calculate position
        let left = triggerRect.right + tooltipOffset;
        let top = triggerRect.top + triggerRect.height / 2;
        
        // Check horizontal overflow
        const tooltipRight = left + effectiveWidth;
        if (tooltipRight > rightBound) {
          // Overflow right - flip to left
          left = triggerRect.left - tooltipOffset;
          style = {
            left: left,
            top: top,
            transform: "translate(-100%, -50%)",
          };
        } else {
          // Check vertical overflow
          const tooltipTop = top - effectiveHeight / 2;
          const tooltipBottom = top + effectiveHeight / 2;
          
          if (tooltipTop < topBound) {
            top = topBound + effectiveHeight / 2;
          } else if (tooltipBottom > bottomBound) {
            top = bottomBound - effectiveHeight / 2;
          }
          
          style = {
            left: left,
            top: top,
            transform: "translate(0, -50%)",
          };
        }
        break;
      }
      default: {
        // Default to top positioning with overflow checks
        let left = triggerRect.left + triggerRect.width / 2;
        let top = triggerRect.top - tooltipOffset;
        
        const tooltipLeft = left - effectiveWidth / 2;
        const tooltipRight = left + effectiveWidth / 2;
        
        if (tooltipLeft < leftBound) {
          left = leftBound + effectiveWidth / 2;
        } else if (tooltipRight > rightBound) {
          left = rightBound - effectiveWidth / 2;
        }
        
        const tooltipTop = top - effectiveHeight;
        if (tooltipTop < topBound) {
          top = triggerRect.bottom + tooltipOffset;
          style = {
            left: left,
            top: top,
            transform: "translate(-50%, 0)",
          };
        } else {
          style = {
            left: left,
            top: top,
            transform: "translate(-50%, -100%)",
          };
        }
        break;
      }
    }

    setTooltipStyle(style);
  }, [isVisible, position, tooltipId]);

  useEffect(() => {
    if (isVisible) {
      // Use double requestAnimationFrame to ensure tooltip is fully rendered with dimensions
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateTooltipPosition();
        });
      });
      
      const handleScroll = () => updateTooltipPosition();
      const handleResize = () => updateTooltipPosition();
      
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);
      
      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [isVisible, position, updateTooltipPosition]);

  const showTooltip = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideTooltip = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      hideTooltip();
    }
  };

  const isCustomTrigger = Boolean(children);

  const triggerProps = {
    ref: triggerRef,
    onMouseEnter: showTooltip,
    onMouseLeave: hideTooltip,
    onFocus: showTooltip,
    onBlur: hideTooltip,
    onKeyDown: handleKeyDown,
    tabIndex: isCustomTrigger ? undefined : 0,
    "aria-describedby": !isCustomTrigger && isVisible ? tooltipId : undefined,
    "aria-haspopup": isCustomTrigger ? undefined : "true",
    "aria-expanded": isCustomTrigger ? undefined : isVisible,
    role: isCustomTrigger ? undefined : "button",
  };

  const tooltipElement = isVisible ? (
    <div 
      className={`${styles.tooltipContent} ${styles[position]}`} 
      style={tooltipStyle}
      role="tooltip"
      id={tooltipId}
      aria-hidden={!isVisible}
    >
      <div className={styles.tooltipText}>
        {content}
      </div>
      <div className={styles.tooltipArrow} />
    </div>
  ) : null;

  return (
    <span className={isCustomTrigger ? `${styles.tooltipContainer} ${styles.customTrigger}` : styles.tooltipContainer} {...triggerProps}>
      {React.isValidElement(children)
        ? React.cloneElement(children, {
            ...children.props,
            "aria-describedby": isVisible ? tooltipId : undefined,
            "aria-haspopup": "true",
            "aria-expanded": isVisible,
          })
        : children}
      {!children && (
        <FiInfo className={styles.infoIcon} aria-hidden="true" focusable="false" />
      )}
      {isVisible && canRenderPortal && createPortal(tooltipElement, document.body)}
    </span>
  );
};

export default InfoTooltip; 