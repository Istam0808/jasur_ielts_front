"use client";

import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useTransition,
  useDebounce,
} from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  FaGraduationCap,
  FaLightbulb,
  FaBook,
  FaBriefcase,
  FaCoffee,
  FaGlobe,
  FaFilm,
  FaPalette,
  FaMicrophone,
  FaMusic,
  FaNewspaper,
} from "react-icons/fa";
import styles from "../styles/CategoryFilter.module.scss";

// ============================================
// CONSTANTS
// ============================================
const CATEGORY_ICONS = {
  Motivational: FaLightbulb,
  Business: FaBriefcase,
  "Daily Life": FaCoffee,
  "Travel and Culture": FaGlobe,
  "Movies and TV Shows": FaFilm,
  "Anime/Cartoons": FaPalette,
  "Music Lyrics": FaMusic,
  Interviews: FaMicrophone,
  Academic: FaGraduationCap,
  News: FaNewspaper,
};

const CATEGORY_COLORS = {
  all: "#6366f1",
  Motivational: "#f59e0b",
  Business: "#3b82f6",
  "Daily Life": "#10b981",
  "Travel and Culture": "#ec4899",
  "Movies and TV Shows": "#8b5cf6",
  "Anime/Cartoons": "#f97316",
  "Music Lyrics": "#ef4444",
  Interviews: "#14b8a6",
  Academic: "#6366f1",
  News: "#64748b",
};

const CATEGORIES = [
  "Motivational",
  "Business",
  "Daily Life",
  "Travel and Culture",
  "Movies and TV Shows",
  "Anime/Cartoons",
  "Music Lyrics",
  "Interviews",
  "Academic",
  "News",
];

// ============================================
// OPTIMIZED CATEGORY BUTTON (No animations)
// ============================================
const CategoryButton = memo(
  ({ category, isActive, onClick, label, icon: Icon, color }) => (
    <li>
      <button
        className={`${styles["category-filter__item"]}${isActive ? ` ${styles.active}` : ""}`}
        onClick={onClick}
        aria-pressed={isActive}
        type="button"
        data-category-id={category}
      >
        {Icon && (
          <Icon
            className={styles["category-filter__icon"]}
            aria-hidden="true"
            style={{ color: isActive ? "inherit" : color }}
          />
        )}
        <span className={styles["category-filter__label"]}>{label}</span>
      </button>
    </li>
  )
);

CategoryButton.displayName = "CategoryButton";

// ============================================
// MAIN CATEGORY FILTER (With useTransition)
// ============================================
const CategoryFilter = memo(({ selectedCategory, onCategoryChange }) => {
  const { t } = useTranslation("speaking");
  const listRef = useRef(null);
  const activeCategoryElementRef = useRef(null);

  // 🚀 KEY FIX: Use useTransition for non-blocking updates
  const [isPending, startTransition] = useTransition();

  // Scroll to active (optimized with RAF)
  const scrollToActiveCategory = useCallback(() => {
    if (!listRef.current) return;

    requestAnimationFrame(() => {
      if (!listRef.current) return;
      
      try {
        let activeCategoryElement = activeCategoryElementRef.current;

        if (
          !activeCategoryElement ||
          activeCategoryElement.dataset.categoryId !== selectedCategory
        ) {
          activeCategoryElement = listRef.current.querySelector(
            `[data-category-id="${selectedCategory}"]`
          );
          activeCategoryElementRef.current = activeCategoryElement;
        }

        if (!activeCategoryElement) return;

        const list = listRef.current;
        const categoryRect = activeCategoryElement.getBoundingClientRect();
        const listRect = list.getBoundingClientRect();

        const isVisible =
          categoryRect.left >= listRect.left &&
          categoryRect.right <= listRect.right;

        if (isVisible) return;

        // ✨ IMPROVED: Center the active category in view
        const categoryCenter =
          activeCategoryElement.offsetLeft +
          activeCategoryElement.offsetWidth / 2;
        const listCenter = list.offsetWidth / 2;
        const targetScroll = Math.max(0, categoryCenter - listCenter);
        const maxScroll = list.scrollWidth - list.offsetWidth;
        const clampedScroll = Math.max(0, Math.min(maxScroll, targetScroll));

        list.scrollTo({
          left: clampedScroll,
          behavior: "smooth",
        });
      } catch (error) {
        console.error("Error scrolling:", error);
      }
    });
  }, [selectedCategory]);

  const handleCategoryClick = useCallback(
    (category) => {
      startTransition(() => {
        onCategoryChange(category);
      });
    },
    [onCategoryChange]
  );

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      scrollToActiveCategory();
    });
    return () => cancelAnimationFrame(rafId);
  }, [selectedCategory, scrollToActiveCategory]);

  // Cache translated items
  const categoryItems = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        Icon: CATEGORY_ICONS[category],
        label: t(`menu.shadowing.library.categories.${category}`),
        color: CATEGORY_COLORS[category],
      })),
    [t]
  );

  return (
    <nav
      className={styles["category-filter"]}
      aria-label={t("menu.shadowing.library.categories.all")}
      style={{ opacity: isPending ? 0.7 : 1 }} // Visual feedback
    >
      <div className={styles["category-filter__wrapper"]}>
        <ul
          ref={listRef}
          className={styles["category-filter__list"]}
          role="list"
        >
          <CategoryButton
            category="all"
            isActive={selectedCategory === "all"}
            onClick={() => handleCategoryClick("all")}
            label={t("menu.shadowing.library.categories.all")}
            icon={FaBook}
            color={CATEGORY_COLORS["all"]}
          />

          {categoryItems.map(({ category, Icon, label, color }) => (
            <CategoryButton
              key={category}
              category={category}
              isActive={selectedCategory === category}
              onClick={() => handleCategoryClick(category)}
              label={label}
              icon={Icon}
              color={color}
            />
          ))}
        </ul>
      </div>
    </nav>
  );
});

CategoryFilter.displayName = "CategoryFilter";

export default CategoryFilter;
