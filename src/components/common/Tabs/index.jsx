"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
  Suspense,
} from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { LocalStorageUtils } from "@/utils/localStorage";
import Spinner from "@/components/common/spinner";
import "./style.scss";

// Memoized Tab Button Component to prevent unnecessary re-renders
const TabButton = memo(
  ({ tab, isActive, isLoading, onTabChange, t, loadingVariants }) => {
    return (
      <button
        role="tab"
        aria-selected={isActive}
        aria-controls={`panel-${tab.id}`}
        id={`tab-${tab.id}`}
        data-tab-id={tab.id}
        className={`tab-button ${isActive ? "active" : ""} ${isLoading ? "loading" : ""} ${tab.disabled ? "disabled" : ""}`}
        onClick={() => onTabChange(tab.id)}
        disabled={tab.disabled || isLoading}
        type="button"
      >
        <div className="tab-content-wrapper">
          {tab.icon && (
            <span className="tab-icon" aria-hidden="true">
              {tab.icon}
            </span>
          )}
          <span className="tab-label">{t(`tabs.${tab.id}`, tab.label)}</span>
          <AnimatePresence>
            {isLoading && (
              <motion.div
                className="loading-indicator-container"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 45, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                aria-hidden="true"
              >
                <motion.span className="loading-indicator" {...loadingVariants}>
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {isActive && (
          <motion.div
            className="active-indicator"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
        )}
      </button>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    return (
      prevProps.tab.id === nextProps.tab.id &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.tab.disabled === nextProps.tab.disabled &&
      prevProps.tab.icon === nextProps.tab.icon &&
      prevProps.tab.label === nextProps.tab.label
    );
  }
);

TabButton.displayName = "TabButton";

const Tabs = ({
  tabs,
  activeTab: initialActiveTab,
  onTabChange,
  keepAlive = false,
  extraAction,
}) => {
  const { t } = useTranslation("ielts");
  const [loadingTab, setLoadingTab] = useState(null);
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [transitionDirection, setTransitionDirection] = useState(1);
  const [hoveredTabId, setHoveredTabId] = useState(null);
  const [isHovering, setIsHovering] = useState(false);
  const tabsWrapperRef = useRef(null);
  const activeTabElementRef = useRef(null);
  const loadingTimeoutRef = useRef(null);
  const resizeRafRef = useRef(null);
  const mountedTabsRef = useRef(new Set());
  const hoverBackgroundRef = useRef(null);
  const mouseMoveRafRef = useRef(null);

  // Initialize mounted tabs with initial active tab
  if (keepAlive && !mountedTabsRef.current.has(initialActiveTab)) {
    mountedTabsRef.current.add(initialActiveTab);
  }

  // Track mounted tabs for keep-alive pattern
  useEffect(() => {
    if (keepAlive) {
      mountedTabsRef.current.add(activeTab);
    }
  }, [activeTab, keepAlive]);


  // Stabilize tabs reference to prevent unnecessary re-renders
  const tabsRef = useRef(tabs);
  const tabsStable = useMemo(() => {
    // Only recreate if tab IDs or structure actually changed
    const currentIds = tabs.map((t) => t.id).join(",");
    const prevIds = tabsRef.current.map((t) => t.id).join(",");

    if (currentIds !== prevIds || tabs.length !== tabsRef.current.length) {
      tabsRef.current = tabs;
      return tabs;
    }

    // Check if labels changed (but keep same reference if possible)
    const labelsChanged = tabs.some(
      (tab, idx) => tab.label !== tabsRef.current[idx]?.label
    );

    if (labelsChanged) {
      tabsRef.current = tabs;
      return tabs;
    }

    return tabsRef.current; // Return stable reference
  }, [tabs]);

  // Memoize tab lookup map for better performance
  const tabsMap = useMemo(
    () => new Map(tabsStable.map((tab) => [tab.id, tab])),
    [tabsStable]
  );

  // Check for reduced motion preference and performance
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // Scroll to center the active tab horizontally (optimized - check visibility first, single RAF)
  const scrollToActiveTab = useCallback(() => {
    if (!tabsWrapperRef.current) return;

    // Defer scroll to next frame after UI update
    requestAnimationFrame(() => {
      try {
        // Try to use cached element reference first, fallback to querySelector
        let activeTabElement = activeTabElementRef.current;
        if (!activeTabElement || activeTabElement.dataset.tabId !== activeTab) {
          activeTabElement = tabsWrapperRef.current.querySelector(
            `[data-tab-id="${activeTab}"]`
          );
          activeTabElementRef.current = activeTabElement;
        }

        if (!activeTabElement) return;

        const wrapper = tabsWrapperRef.current;

        // Check if tab is already visible before scrolling
        const tabRect = activeTabElement.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        const isVisible =
          tabRect.left >= wrapperRect.left &&
          tabRect.right <= wrapperRect.right;

        // Only scroll if tab is not fully visible
        if (isVisible) return;

        // Calculate the target scroll position to center the tab
        // Formula: tab's left position + half tab width - half wrapper width
        const tabCenter =
          activeTabElement.offsetLeft + activeTabElement.offsetWidth / 2;
        const wrapperCenter = wrapper.offsetWidth / 2;
        const targetScroll = tabCenter - wrapperCenter;

        // Get scroll bounds to handle edge cases
        const maxScroll = wrapper.scrollWidth - wrapper.offsetWidth;

        // Clamp the scroll position to valid bounds
        // If target is negative (tab at start), scroll to 0
        // If target exceeds max (tab at end), scroll to max
        // Otherwise, center the tab
        const clampedScroll = Math.max(0, Math.min(maxScroll, targetScroll));

        // Use 'auto' for reduced motion or better performance, 'smooth' otherwise
        const scrollBehavior = prefersReducedMotion ? "auto" : "smooth";

        wrapper.scrollTo({
          left: clampedScroll,
          behavior: scrollBehavior,
        });
      } catch (error) {
        console.error("Error scrolling to active tab:", error);
      }
    });
  }, [activeTab, prefersReducedMotion]);

  // Sync activeTab with initialActiveTab prop changes
  useEffect(() => {
    if (initialActiveTab !== activeTab && tabsMap.has(initialActiveTab)) {
      setActiveTab(initialActiveTab);
    }
  }, [initialActiveTab, tabsMap]);

  // Load saved tab from localStorage on mount (only if not explicitly set)
  useEffect(() => {
    const savedTab = LocalStorageUtils.get("lastActiveTab");
    if (savedTab && tabsMap.has(savedTab) && !initialActiveTab) {
      setActiveTab(savedTab);
      onTabChange(savedTab);
    }
  }, [tabsMap, onTabChange, initialActiveTab]);

  // Scroll to active tab when it changes (optimized - single RAF after UI update)
  useEffect(() => {
    // Single RAF to defer scroll after UI update completes
    const rafId = requestAnimationFrame(() => {
      scrollToActiveTab();
    });

    return () => cancelAnimationFrame(rafId);
  }, [activeTab, scrollToActiveTab]);


  // Scroll to active tab on window resize (debounced with requestAnimationFrame)
  useEffect(() => {
    const handleResize = () => {
      // Cancel previous RAF if exists
      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current);
      }

      // Debounce resize with requestAnimationFrame
      resizeRafRef.current = requestAnimationFrame(() => {
        scrollToActiveTab();
        resizeRafRef.current = null;
      });
    };

    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current);
      }
    };
  }, [scrollToActiveTab]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  // Optimized tab change handler - instant update for keep-alive, minimal delay for normal mode
  const handleTabChange = useCallback(
    (tabId) => {
      if (loadingTab === tabId) return; // Prevent multiple clicks while loading

      // Check if the specific tab is disabled
      const targetTab = tabsMap.get(tabId);
      if (targetTab?.disabled) return;

      // Determine transition direction based on tab indices
      const currentIndex = tabsStable.findIndex((tab) => tab.id === activeTab);
      const newIndex = tabsStable.findIndex((tab) => tab.id === tabId);
      // Calculate direction: positive for right, negative for left
      // If indices are invalid or equal, default to right (1)
      // Direction determines slide animation: 
      // - direction = 1: new tab enters from right (100%), old tab exits left (-100%)
      // - direction = -1: new tab enters from left (-100%), old tab exits right (100%)
      const direction =
        currentIndex === -1 || newIndex === -1 || currentIndex === newIndex
          ? 1
          : newIndex > currentIndex
            ? 1  // Moving right: new tab from right, old tab exits left
            : -1; // Moving left: new tab from left, old tab exits right
      setTransitionDirection(direction);

      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      // OPTIMISTIC UPDATE: Update UI immediately for instant feedback
      setActiveTab(tabId);

      if (!keepAlive) {
        // Normal mode: show loading briefly for animation
        setLoadingTab(tabId);
        loadingTimeoutRef.current = setTimeout(() => {
          setLoadingTab(null);
          loadingTimeoutRef.current = null;
        }, 150);
      }

      // Defer localStorage save to not block UI update
      requestAnimationFrame(() => {
        LocalStorageUtils.set("lastActiveTab", tabId);
      });

      // Call onTabChange callback (non-blocking)
      try {
        const result = onTabChange(tabId);
        // Handle promise if returned, but don't block
        if (result && typeof result.then === "function") {
          result.catch((error) => {
            console.error("Tab change error:", error);
          });
        }
      } catch (error) {
        console.error("Tab change error:", error);
      }
    },
    [loadingTab, tabsMap, onTabChange, keepAlive, activeTab, tabsStable]
  );

  // Calculate hover background position and size
  const calculateHoverPosition = useCallback((tabId) => {
    if (!tabsWrapperRef.current || !tabId) return null;

    const tabElement = tabsWrapperRef.current.querySelector(
      `[data-tab-id="${tabId}"]`
    );
    if (!tabElement) return null;

    const wrapper = tabsWrapperRef.current;
    const tabRect = tabElement.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    // Calculate position relative to wrapper (accounting for scroll)
    const left = tabElement.offsetLeft;
    const width = tabElement.offsetWidth;
    const height = tabElement.offsetHeight;

    return {
      left,
      width,
      height,
      top: 0,
    };
  }, []);

  // Handle mouse enter on tabs wrapper
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  // Handle mouse move to track which tab is hovered (throttled for performance)
  const handleMouseMove = useCallback(
    (e) => {
      if (!tabsWrapperRef.current) return;

      // Cancel previous RAF if exists
      if (mouseMoveRafRef.current) {
        cancelAnimationFrame(mouseMoveRafRef.current);
      }

      // Throttle with RAF - only process one update per frame
      mouseMoveRafRef.current = requestAnimationFrame(() => {
        try {
          const wrapper = tabsWrapperRef.current;
          if (!wrapper) return;

          const wrapperRect = wrapper.getBoundingClientRect();
          const mouseX = e.clientX - wrapperRect.left + wrapper.scrollLeft;

          // Find which tab the mouse is over
          const tabs = wrapper.querySelectorAll(
            ".tab-button:not(.disabled):not(.loading)"
          );
          let hoveredTab = null;

          for (const tab of tabs) {
            const tabLeft = tab.offsetLeft;
            const tabWidth = tab.offsetWidth;

            if (mouseX >= tabLeft && mouseX <= tabLeft + tabWidth) {
              const tabId = tab.dataset.tabId;
              const tabData = tabsMap.get(tabId);

              // Skip disabled and loading tabs
              if (tabData && !tabData.disabled && loadingTab !== tabId) {
                hoveredTab = tabId;
                break;
              }
            }
          }

          // Only update state if hovered tab actually changed (prevents unnecessary re-renders)
          if (hoveredTab && hoveredTab !== hoveredTabId) {
            setHoveredTabId(hoveredTab);
          } else if (!hoveredTab && hoveredTabId) {
            setHoveredTabId(null);
          }
        } catch (error) {
          console.error("Error in mouse move handler:", error);
        }

        mouseMoveRafRef.current = null;
      });
    },
    [isHovering, hoveredTabId, tabsMap, loadingTab]
  );

  // Handle mouse leave on tabs wrapper
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setHoveredTabId(null);
    if (mouseMoveRafRef.current) {
      cancelAnimationFrame(mouseMoveRafRef.current);
      mouseMoveRafRef.current = null;
    }
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (mouseMoveRafRef.current) {
        cancelAnimationFrame(mouseMoveRafRef.current);
        mouseMoveRafRef.current = null;
      }
    };
  }, []);

  // Memoized motion variants for better performance (optimized durations)
  const loadingVariants = useMemo(
    () => ({
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.8 },
      transition: { duration: 0.3, ease: "easeOut" },
    }),
    []
  );

  const slideVariants = useMemo(
    () => ({
      initial: (direction) => ({
        // New tab enters from the side opposite to the direction of movement
        // When moving right (direction=1), new tab comes from right (100%)
        // When moving left (direction=-1), new tab comes from left (-100%)
        // Using translateX for better GPU acceleration
        x: `${direction * 100}%`,
        opacity: 0,
      }),
      animate: {
        x: "0%",
        opacity: 1,
        transition: {
          duration: 0.33,
          ease: [0.4, 0, 0.2, 1], // Optimized cubic-bezier for smoother animation
        },
      },
      exit: (direction) => ({
        // Old tab exits to the side opposite to where new tab is coming from
        // When moving right (direction=1), old tab exits left (-100%)
        // When moving left (direction=-1), old tab exits right (100%)
        x: `${direction * -100}%`,
        opacity: 0,
        transition: {
          duration: 0.33,
          ease: [0.4, 0, 0.2, 1], // Optimized cubic-bezier for smoother animation
        },
      }),
    }),
    []
  );

  // Memoized active tab content - handle both content-based and component-based tabs
  const activeTabContent = useMemo(() => {
    const activeTabData = tabsMap.get(activeTab);
    if (!activeTabData) return null;

    // If keep-alive mode and tab has component, render it
    if (keepAlive && activeTabData.component) {
      const TabComponent = activeTabData.component;
      return (
        <Suspense
          fallback={
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "200px",
              }}
            >
              <Spinner />
            </div>
          }
        >
          <TabComponent {...(activeTabData.props || {})} />
        </Suspense>
      );
    }

    // Otherwise use provided content
    return activeTabData.content;
  }, [activeTab, tabsMap, keepAlive]);

  // Render all mounted tabs for keep-alive pattern with slide animation
  const keepAliveContents = useMemo(() => {
    if (!keepAlive) return null;

    return Array.from(mountedTabsRef.current)
      .map((tabId) => {
        const tabData = tabsMap.get(tabId);
        if (!tabData?.component) return null;

        const isActive = activeTab === tabId;
        const TabComponent = tabData.component;


        if (!isActive) return null;

        return (
          <motion.div
            key={`keep-alive-${tabId}`}
            role="tabpanel"
            id={`panel-${tabId}`}
            aria-labelledby={`tab-${tabId}`}
            aria-hidden={!isActive}
            className="tab-panel"
            custom={transitionDirection}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Suspense
              fallback={
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "200px",
                  }}
                >
                  <Spinner />
                </div>
              }
            >
              <TabComponent {...(tabData.props || {})} />
            </Suspense>
          </motion.div>
        );
      })
      .filter(Boolean);
  }, [activeTab, tabsMap, keepAlive, transitionDirection, slideVariants]);

  // Calculate hover background style
  const hoverPosition = useMemo(() => {
    if (!hoveredTabId || !isHovering) return null;
    return calculateHoverPosition(hoveredTabId);
  }, [hoveredTabId, isHovering, calculateHoverPosition]);

  return (
    <div className="tabs-container">
      <div className="tabs-list" role="tablist">
        <div
          className="tabs-wrapper"
          ref={tabsWrapperRef}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <AnimatePresence>
            {hoverPosition && hoveredTabId && (
              <motion.div
                ref={hoverBackgroundRef}
                className="hover-background"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  left: `${hoverPosition.left}px`,
                  width: `${hoverPosition.width}px`,
                  height: `${hoverPosition.height}px`,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.15,
                  ease: "easeOut",
                  opacity: { duration: 0.1 },
                }}
              />
            )}
          </AnimatePresence>
          {tabsStable.map((tab) => {
            const isActive = activeTab === tab.id;
            const isLoading = loadingTab === tab.id;


            return (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={isActive}
                isLoading={isLoading}
                onTabChange={handleTabChange}
                t={t}
                loadingVariants={loadingVariants}
              />
            );
          })}
          {extraAction && extraAction.element && extraAction.element}
        </div>
      </div>
      <div className="tab-content">
        {keepAlive ? (
          // Keep-alive mode: render all mounted tabs with slide animation
          <div className="tab-panels-keep-alive">
            <AnimatePresence mode="wait" initial={false}>
              {keepAliveContents}
            </AnimatePresence>
          </div>
        ) : (
          // Normal mode: use AnimatePresence for mount/unmount animations
          <AnimatePresence mode="wait" initial={false}>
            {activeTabContent && (
              <motion.div
                key={`panel-${activeTab}`}
                role="tabpanel"
                id={`panel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
                className="tab-panel active"
                custom={transitionDirection}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout={false} // Disable layout animations for better performance
              >
                {activeTabContent}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Tabs;
