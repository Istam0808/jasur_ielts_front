"use client";

import React, { useState, useMemo, useCallback, useTransition, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { scrollToTop } from '@/utils/common';
import Pagination from '@/components/common/Pagination';
import { getYouTubeThumbnailFromUrl } from "@/utils/youtubeHelpers"
import {
  FaPlay,
  FaClock,
  FaAward,
  FaUserCheck,
  FaChevronRight,
  FaLightbulb,
  FaMicrophone,
  FaChartLine,
  FaRedo
} from 'react-icons/fa';
import { IoMdArrowBack } from 'react-icons/io';

import CategoryFilter from './CategoryFilter';
import SearchBar from './SearchBar';
import SortControls from './SortControls';
import rootStyles from "../styles/shadowing/library-root.module.scss";
import layoutStyles from "../styles/shadowing/library-layout.module.scss";
import gridStyles from "../styles/shadowing/library-grid.module.scss";
import howToStyles from "../styles/shadowing/library-howToCard.module.scss";
import headerBannerStyles from "../../headerBanner.module.scss";

// ============================================
// CONSTANTS
// ============================================
const ITEMS_PER_PAGE = 16;
const LOCAL_STORAGE_KEY = 'shadowing-library-state';
const STATE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const SHUFFLE_SEED_KEY = 'shadowing-library-shuffle-seed';

// Animation constants
const ANIMATION_CONFIG = {
  howToCard: {
    delay: 0.35,
    type: "spring",
    stiffness: 100,
    duration: 0.4
  },
  howToItem: {
    baseDelay: 0.45,
    staggerDelay: 0.06,
    type: "spring",
    stiffness: 120,
    duration: 0.3
  }
};

// How-to section configuration
const HOW_TO_ITEMS = [
  {
    icon: FaLightbulb,
    titleKey: "menu.shadowing.library.howTo.steps.listen.title",
    descKey: "menu.shadowing.library.howTo.steps.listen.description",
    color: "#FF6636"
  },
  {
    icon: FaMicrophone,
    titleKey: "menu.shadowing.library.howTo.steps.record.title",
    descKey: "menu.shadowing.library.howTo.steps.record.description",
    color: "#564FFD"
  },
  {
    icon: FaChartLine,
    titleKey: "menu.shadowing.library.howTo.steps.review.title",
    descKey: "menu.shadowing.library.howTo.steps.review.description",
    color: "#23BD33"
  },
  {
    icon: FaRedo,
    titleKey: "menu.shadowing.library.howTo.steps.practice.title",
    descKey: "menu.shadowing.library.howTo.steps.practice.description",
    color: "#9C27B0"
  }
];

// ============================================
// UTILITY FUNCTIONS
// ============================================
/**
 * Seeded random number generator (Linear Congruential Generator)
 * @param {number} seed - Seed value
 * @returns {Function} Function that returns next random number between 0 and 1
 */
const createSeededRandom = (seed) => {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
};

/**
 * Shuffles an array using Fisher-Yates algorithm with a seed
 * @param {Array} array - Array to shuffle
 * @param {number} seed - Seed for deterministic shuffling
 * @returns {Array} New shuffled array (original array is not modified)
 */
const seededShuffle = (array, seed) => {
  if (!array || array.length <= 1) return [...array];

  const shuffled = [...array];
  const random = createSeededRandom(seed);

  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

/**
 * Gets or creates a shuffle seed for the current session
 * Uses date-based seed that changes daily but remains consistent within session
 * @returns {number} Shuffle seed
 */
const getOrCreateShuffleSeed = () => {
  try {
    const stored = sessionStorage.getItem(SHUFFLE_SEED_KEY);
    if (stored) {
      const { seed, date } = JSON.parse(stored);
      const today = new Date().toISOString().split('T')[0];

      // If seed is from today, reuse it; otherwise generate new one
      if (date === today) {
        return seed;
      }
    }

    // Generate new seed based on current date + random component
    const today = new Date().toISOString().split('T')[0];
    const dateHash = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const randomComponent = Math.floor(Math.random() * 1000000);
    const seed = dateHash * 1000000 + randomComponent;

    sessionStorage.setItem(SHUFFLE_SEED_KEY, JSON.stringify({
      seed,
      date: today
    }));

    return seed;
  } catch (error) {
    // Fallback: use date-based seed if sessionStorage fails
    const today = new Date().toISOString().split('T')[0];
    const dateHash = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return dateHash * 1000000;
  }
};

/**
 * Loads saved state from localStorage
 * @returns {Object|null} Saved state or null if not found/invalid
 */
const loadSavedState = () => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return null;

    const state = JSON.parse(saved);
    const now = Date.now();

    // Check if state is expired (older than 24 hours)
    if (state.timestamp && (now - state.timestamp) > STATE_EXPIRY_TIME) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return null;
    }

    return state;
  } catch (error) {
    // Silently fail - localStorage might be disabled or corrupted
    return null;
  }
};

/**
 * Saves state to localStorage
 * @param {string} category - Selected category
 * @param {string} sort - Sort by value
 * @param {number} scrollPos - Scroll position
 */
const saveState = (category, sort, scrollPos) => {
  try {
    const state = {
      selectedCategory: category,
      sortBy: sort,
      scrollPosition: scrollPos,
      timestamp: Date.now()
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Silently fail - localStorage might be disabled or quota exceeded
  }
};

// ============================================
// LIBRARY CARD COMPONENT
// ============================================
const LibraryCard = React.memo(function LibraryCard({
  item,
  index,
  onOpen,
  getDurationText,
  shouldReduceAnimations,
  t
}) {
  const handleClick = useCallback(() => {
    scrollToTop();
    onOpen(item);
  }, [item, onOpen]);

  const handleButtonClick = useCallback((e) => {
    e.stopPropagation();
    scrollToTop();
    onOpen(item);
  }, [item, onOpen]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  const handleImageError = useCallback((e) => {
    e.target.style.display = "none";
  }, []);

  const difficulty = item.difficulty?.toLowerCase() || 'beginner';
  const durationMinutes = Math.ceil((item.duration || 0) / 60);
  const segmentsCount = item.subtitles?.length || 0;

  return (
    <motion.div
      className={gridStyles['library-card']}
      onClick={handleClick}
      role="listitem"
      tabIndex={0}
      aria-label={`${item.title}, ${item.difficulty} level, ${durationMinutes} minutes`}
      onKeyDown={handleKeyDown}
    >
      <div className={gridStyles['card-glow']} />

      <div className={gridStyles['card-media']}>
        <motion.img
          src={item.thumbnail || getYouTubeThumbnailFromUrl(item.videoUrl, "maxres")}
          alt={item.title}
          loading="lazy"
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.08 }}
          transition={{ duration: 0.2 }}
          onError={handleImageError}
        />

        <div className={gridStyles["media-overlay"]}>
          <div className={gridStyles["play-circle"]}>
            <FaPlay />
          </div>
          <div className={gridStyles['ripple-effect']} />
        </div>

        <motion.div
          className={`${gridStyles['difficulty-pill']} ${gridStyles[`difficulty-${difficulty}`]}`}
          initial={{ x: -80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{
            delay: index * 0.03 + 0.1,
            type: "spring",
            stiffness: 220,
            duration: 0.3
          }}
          whileHover={{
            scale: 1.08,
            rotate: [0, -4, 4, 0],
            transition: { duration: 0.2 }
          }}
        >
          {t(`menu.shadowing.library.card.difficulty.${difficulty}`)}
        </motion.div>
      </div>

      <div className={gridStyles["card-body"]}>
        <div className={gridStyles["card-top"]}>
          <h3 className={gridStyles["card-title"]}>
            {item.title}
          </h3>
          <p className={gridStyles["card-desc"]}>{item.description}</p>
        </div>

        <div className={gridStyles["card-bottom"]}>
          <div className={gridStyles["meta-row"]}>
            <div className={gridStyles["meta-item"]}>
              <FaClock className={gridStyles['meta-icon']} />
              <span>{getDurationText(item.duration)}</span>
            </div>

            <div className={gridStyles['meta-item']}>
              <FaAward className={gridStyles['meta-icon']} />
              <span>{segmentsCount} {t('menu.shadowing.library.card.segments')}</span>
            </div>
          </div>

          <div className={gridStyles["chip-row"]}>
            <div className={`${gridStyles["chip-mini"]} ${gridStyles["chip-fluency"]}`}>
              <FaAward className={gridStyles["chip-icon-mini"]} />
              {t('menu.shadowing.library.card.fluency')}
            </div>

            <div className={`${gridStyles["chip-mini"]} ${gridStyles["chip-interaction"]}`}>
              <FaUserCheck className={gridStyles["chip-icon-mini"]} />
              {t('menu.shadowing.library.card.interaction')}
            </div>
          </div>

          <div className={gridStyles["card-actions"]}>
            <button
              className={`${gridStyles.btn} ${gridStyles.secondary}`}
              onClick={handleButtonClick}
            >
              <span>{t('menu.shadowing.library.card.startButton')}</span>
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

LibraryCard.displayName = 'LibraryCard';

// ============================================
// MAIN SHADOWING LIBRARY COMPONENT
// ============================================
/**
 * ShadowingLibrary Component
 * 
 * Displays a library of shadowing exercises with filtering, searching, and pagination.
 * 
 * @param {Object} props - Component props
 * @param {Array} props.data - Array of grouped video/audio items (unused but kept for API compatibility)
 * @param {Array} props.flatData - Flattened array of all items
 * @param {Function} props.onOpen - Callback when item is opened
 * @param {Function} props.onBack - Callback when back button is clicked
 */
const ShadowingLibrary = React.memo(function ShadowingLibrary({
  data = [],
  flatData = [],
  onOpen = () => { },
  onBack = () => { },
}) {
  const { t } = useTranslation("speaking");
  const { shouldReduceAnimations } = usePerformanceMonitor();
  const [isPending, startTransition] = useTransition();
  const gridRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize state from saved preferences or defaults
  const savedState = loadSavedState();
  const [selectedCategory, setSelectedCategory] = useState(savedState?.selectedCategory || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(savedState?.sortBy || 'All');
  const [currentPage, setCurrentPage] = useState(1);

  // Control scrollbar visibility to prevent flash on initial render
  // Wait for animations to complete before enabling scroll
  useEffect(() => {
    // Calculate max animation delay: howToCard delay (0.35) + howToItem baseDelay (0.45) + 
    // (last item stagger: 3 * 0.06) + duration (0.3) ≈ 1.28s, add buffer for safety
    const maxAnimationTime =
      ANIMATION_CONFIG.howToCard.delay +
      ANIMATION_CONFIG.howToItem.baseDelay +
      (HOW_TO_ITEMS.length - 1) * ANIMATION_CONFIG.howToItem.staggerDelay +
      ANIMATION_CONFIG.howToItem.duration +
      0.2; // Buffer time

    let timeoutId;

    // Use requestAnimationFrame to ensure DOM is ready
    const rafId = requestAnimationFrame(() => {
      // Wait for animations to complete
      timeoutId = setTimeout(() => {
        setIsMounted(true);
      }, maxAnimationTime * 1000);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Shuffle data once per session using date-based seed
  // This ensures different order each day while maintaining consistency during the session
  const shuffledData = useMemo(() => {
    if (!flatData || flatData.length === 0) return [];

    const seed = getOrCreateShuffleSeed();
    return seededShuffle(flatData, seed);
  }, [flatData]);

  // Filter data based on current filters
  const filteredData = useMemo(() => {
    let result = shuffledData;

    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category === selectedCategory);
    }

    if (sortBy !== 'All') {
      result = result.filter(item => item.difficulty === sortBy);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(item =>
        item.title?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [shuffledData, selectedCategory, sortBy, searchQuery]);


  // Pagination computed values
  const pagination = useMemo(() => {
    const totalItems = filteredData.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);

    return {
      totalItems,
      totalPages,
      currentItems: filteredData.slice(startIndex, endIndex),
      startItem: totalItems > 0 ? startIndex + 1 : 0,
      endItem: endIndex,
    };
  }, [filteredData, currentPage]);



  // Event handlers
  const handleCategoryChange = useCallback((category) => {
    startTransition(() => {
      setSelectedCategory(category);
      setCurrentPage(1);
      saveState(category, sortBy, 0);
    });
  }, [sortBy]);

  const handleSearch = useCallback((query) => {
    startTransition(() => {
      setSearchQuery(query);
      setCurrentPage(1);
    });
  }, []);

  const handleSortChange = useCallback((value) => {
    startTransition(() => {
      setSortBy(value);
      setCurrentPage(1);
      saveState(selectedCategory, value, 0);
    });
  }, [selectedCategory]);

  const handlePageChange = useCallback((page) => {
    startTransition(() => {
      setCurrentPage(page);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const getDurationText = useCallback((seconds) => {
    return `${Math.ceil((seconds || 0) / 60)} ${t('menu.shadowing.library.card.minutes')}`;
  }, [t]);


  return (
    <div className={`${rootStyles['shadowing-library-root']} ${!isMounted ? rootStyles['overflow-hidden'] : ''}`}>
      <div className="container">

        {/* Header Banner */}
        <div className={headerBannerStyles.headerBanner}>
          {/* TOP ROW: Title and Back Button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              marginBottom: "1.5rem",
              gap: "20px",
            }}
          >
            {/* LEFT: Title */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
              <FaMicrophone
                style={{
                  fontSize: "1.8rem",
                  color: "#ff8c42",
                  filter: "drop-shadow(0 2px 4px rgba(255, 140, 66, 0.3))",
                }}
              />
              <h1
                style={{
                  margin: 0,
                  color: "white",
                  fontSize: "2.2rem",
                  fontWeight: 700,
                  textShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                }}
              >
                {t('menu.shadowing.library.title')}
              </h1>
            </div>

            {/* RIGHT: Back Button */}
            <div
              style={{
                flexShrink: 0,
                position: "relative",
                zIndex: 2,
              }}
            >
              <button
                onClick={onBack}
                type="button"
                aria-label={t('menu.shadowing.library.backToMenu')}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  padding: "0.5rem 1rem",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "8px",
                  background: "linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)",
                  backdropFilter: "blur(16px) saturate(180%)",
                  WebkitBackdropFilter: "blur(16px) saturate(180%)",
                  boxShadow: "0 4px 0 rgba(0, 0, 0, 0.15), 0 8px 15px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.3), inset 0 -2px 1px rgba(0, 0, 0, 0.1)",
                  transform: "translateY(-2px)",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "white",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                  e.currentTarget.style.boxShadow = "0 5px 0 rgba(255, 102, 54, 0.3), 0 12px 20px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.boxShadow = "0 4px 0 rgba(0, 0, 0, 0.15), 0 8px 15px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.3), inset 0 -2px 1px rgba(0, 0, 0, 0.1)";
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "translateY(1px)";
                  e.currentTarget.style.boxShadow = "0 1px 0 rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 2px 4px rgba(0, 0, 0, 0.2)";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 0 rgba(0, 0, 0, 0.15), 0 8px 15px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.3), inset 0 -2px 1px rgba(0, 0, 0, 0.1)";
                }}
              >
                <IoMdArrowBack
                  style={{
                    fontSize: "1.1rem",
                    filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))",
                  }}
                />
                <span style={{ whiteSpace: "nowrap" }}>
                  {t('menu.shadowing.library.backToMenu')}
                </span>
              </button>
            </div>
          </div>

          {/* DESCRIPTION */}
          <p
            style={{
              fontSize: "1rem",
              color: "#ccc",
              marginBottom: "1.5rem",
              lineHeight: 1.6,
              opacity: 0.9,
              position: "relative",
              zIndex: 2,
            }}
          >
            {t('menu.shadowing.library.subtitle')}
          </p>

          {/* BOTTOM ROW: Count | SearchBar | SortControls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              gap: "1rem",
              flexWrap: "wrap",
              marginTop: "1.5rem",
            }}
          >
            {/* LEFT: Stats */}
            {pagination.totalItems > 0 && (
              <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                <div className={headerBannerStyles.statItem}>
                  <FaPlay className={headerBannerStyles.statIcon} />
                  <span className={headerBannerStyles.statValue}>
                    {pagination.totalItems}
                  </span>
                  <span className={headerBannerStyles.statLabel}>
                    {t('menu.shadowing.library.stats.videos')}
                  </span>
                </div>
              </div>
            )}

            {/* CENTER: SearchBar */}
            <div style={{ flex: "1 1 525px", maxWidth: "525px", minWidth: "200px" }}>
              <SearchBar onSearch={handleSearch} />
            </div>

            {/* RIGHT: SortControls */}
            <div style={{ flexShrink: 0 }}>
              <SortControls
                onSortChange={handleSortChange}
                sortBy={sortBy}
              />
            </div>
          </div>
        </div>

        {/* Main Layout with Sidebar */}
        <div className={layoutStyles['shadowing-library__layout']}>
          <aside
            className={layoutStyles['shadowing-library__sidebar']}
            aria-label={t('menu.shadowing.library.search.placeholder')}
          >
            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </aside>

          <div className={layoutStyles['shadowing-library__main']}>
            <section
              className={layoutStyles['shadowing-library__content']}
              aria-label={t('menu.shadowing.library.title')}
            >
              <motion.div
                ref={gridRef}
                className={gridStyles['library-grid']}
                role="list"
                style={{
                  opacity: isPending ? 0.6 : 1,
                  transition: 'opacity 0.2s ease'
                }}
              >
                {pagination.currentItems.map((item, index) => (
                  <LibraryCard
                    key={item.id}
                    item={item}
                    index={index}
                    onOpen={onOpen}
                    getDurationText={getDurationText}
                    shouldReduceAnimations={shouldReduceAnimations()}
                    t={t}
                  />
                ))}
              </motion.div>

              {pagination.totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  totalItems={pagination.totalItems}
                  itemsPerPage={ITEMS_PER_PAGE}
                  startItem={pagination.startItem}
                  endItem={pagination.endItem}
                  accentColor="#FF6636"
                  namespace="common"
                  showInfo={true}
                />
              )}
            </section>
          </div>
        </div>

        {/* How to Shadow Effectively Section */}
        <motion.div
          className={`${howToStyles['howto-card']} ${howToStyles.elevated}`}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={ANIMATION_CONFIG.howToCard}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <h2>{t('menu.shadowing.library.howTo.title')}</h2>
          </motion.div>

          <div className={howToStyles['howto-grid']}>
            {HOW_TO_ITEMS.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <motion.div
                  key={item.titleKey}
                  className={howToStyles['howto-item']}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: ANIMATION_CONFIG.howToItem.baseDelay + index * ANIMATION_CONFIG.howToItem.staggerDelay,
                    type: ANIMATION_CONFIG.howToItem.type,
                    stiffness: ANIMATION_CONFIG.howToItem.stiffness,
                    duration: ANIMATION_CONFIG.howToItem.duration
                  }}
                  whileHover={{
                    y: -6,
                    scale: 1.02,
                    boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
                    transition: {
                      type: "spring",
                      stiffness: 450,
                      damping: 20,
                      duration: 0.15
                    }
                  }}
                >
                  <motion.div
                    className={howToStyles['num']}
                    style={{ background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}dd 100%)` }}
                    whileHover={{
                      rotate: 360,
                      scale: 1.08,
                      transition: { duration: 0.5 }
                    }}
                  >
                    <IconComponent />
                  </motion.div>

                  <h4>{t(item.titleKey)}</h4>
                  <p>{t(item.descKey)}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
});

ShadowingLibrary.displayName = 'ShadowingLibrary';

export default ShadowingLibrary;
