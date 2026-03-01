"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { IoMdArrowBack } from "react-icons/io";
import styles from "../styles/shadowing/player-header.module.scss";

/**
 * PlayerHeader Component
 * Header section with back button and title
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Page title
 * @param {string} [props.description] - Video description to display below title
 * @param {Function} props.onBack - Callback when back button is clicked
 * @param {number} props.animationDuration - Animation duration in seconds
 * @param {boolean} props.shouldReduceAnimations - Whether to reduce animations
 * @param {string} [props.className] - Additional CSS classes
 */
const PlayerHeader = React.memo(function PlayerHeader({
  title,
  description = "",
  onBack,
  animationDuration,
  shouldReduceAnimations,
  className = "",
}) {
  const { t } = useTranslation("speaking");

  return (
    <motion.header
      className={`${styles["player-header"]} ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: animationDuration }}
    >
      {/* Back button and title row */}
      <div className={styles["player-header-row"]}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            delay: shouldReduceAnimations() ? 0 : 0.1,
            duration: animationDuration,
          }}
        >
          <button
            type="button"
            onClick={onBack}
            className={styles['btn-back']}
            aria-label={t('menu.shadowing.player.backButton')}
          >
            <IoMdArrowBack />
          </button>
        </motion.div>

        {/* Page title */}
        <motion.h1
          className={styles["player-title"]}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            delay: shouldReduceAnimations() ? 0 : 0.1,
            duration: animationDuration,
          }}
        >
          {title}
        </motion.h1>
      </div>

      {/* Video description */}
      {description && (
        <motion.p
          className={styles["player-description"]}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: shouldReduceAnimations() ? 0 : 0.2,
            duration: animationDuration,
          }}
        >
          {description}
        </motion.p>
      )}
    </motion.header>
  );
});

PlayerHeader.displayName = "PlayerHeader";

export default PlayerHeader;
