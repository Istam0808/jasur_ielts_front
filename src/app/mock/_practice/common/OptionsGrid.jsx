// ============================================================================
// OptionsGrid Component - FINAL BOSS VERSION
// Shows beautiful gradient difficulty cards
// Includes "Identify My Level" for 'take' mode
// Uses Modal component for scroll locking and animations
// ============================================================================

import React from "react";
import { useTranslation } from "react-i18next";
import { IoArrowForward } from "react-icons/io5";
import {
  FaSeedling,
  FaLeaf,
  FaTree,
  FaFire,
  FaBolt,
  FaCrown,
  FaMagic,
} from "react-icons/fa";

import styles from "./OptionsGrid.module.scss";
import { Modal } from '@/components/common';

// ============================================================================
// DIFFICULTY CARD COMPONENT
// ============================================================================
const DifficultyCard = ({
  difficulty,
  levelCode,
  levelName,
  text,
  className,
  icon,
  onSelect,
  levelIndex,
  totalLevels,
}) => {
  const renderLevelProgress = () => {
    if (difficulty === "identify" || !levelIndex) return null;

    return (
      <div className={styles.levelProgress}>
        {Array.from({ length: totalLevels }, (_, index) => (
          <div
            key={index}
            className={`${styles.progressDot} ${index + 1 <= levelIndex ? styles.active : ""}`}
          />
        ))}
      </div>
    );
  };

  const formatLevelName = () => {
    if (difficulty === "identify") return text;

    const start = levelName.indexOf("(");
    const end = levelName.lastIndexOf(")");
    if (start === -1 || end === -1) return levelName;

    const extracted = levelName.slice(start + 1, end);
    const firstSpace = extracted.indexOf(" ");
    return firstSpace === -1 ? extracted : extracted.slice(firstSpace + 1);
  };

  return (
    <div
      className={`${styles.optionCardDifficulty} ${styles[className] || ""}`}
      onClick={() => onSelect(difficulty)}
      role="button"
      tabIndex="0"
      onKeyDown={(e) => e.key === "Enter" && onSelect(difficulty)}
    >
      <div className={styles.cardBackgroundPattern}></div>

      <div className={styles.cardHeader}>
        <div className={styles.iconWrapper}>{icon}</div>
        {renderLevelProgress()}
      </div>

      <div className={styles.cardContent}>
        <div className={styles.cardTextWrapper}>
          {difficulty === "identify" ? (
            <span className={styles.difficultyText}>{formatLevelName()}</span>
          ) : (
            <>
              <span className={styles.difficultyLevelCode}>{levelCode}</span>
              <span className={styles.difficultyLevelName}>
                {formatLevelName()}
              </span>
            </>
          )}
        </div>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.actionIndicator}>
          <IoArrowForward />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN OPTIONS GRID COMPONENT
// ============================================================================
export default function OptionsGrid({
  testOptions,
  subjectId,
  onLevelSelect,
  onClose,
  mode = "practice",
}) {
  const { t } = useTranslation(["subjects", "practice"]);

  // Base Levels - using camelCase for CSS Module class names
 const levels = [
    {
      key: "a1",
      name: "Beginner",
      icon: <FaSeedling />,
      className: "difficultyA",
    },
    {
      key: "a2",
      name: "Elementary",
      icon: <FaLeaf />,
      className: "difficultyB",
    },
    {
      key: "b1",
      name: "Pre-Intermediate",
      icon: <FaTree />,
      className: "difficultyC",
    },
    {
      key: "b2",
      name: "Intermediate",
      icon: <FaFire />,
      className: "difficultyD",
    },
    {
      key: "c1",
      name: "Advanced",
      icon: <FaBolt />,
      className: "difficultyE",
    },
    {
      key: "c2",
      name: "Proficient",
      icon: <FaCrown />,
      className: "difficultyF",
    },
  ];

  const difficultyLevels = levels.map((level, index) => {
    const levelName = t(`difficulty.${level.key}`, level.name, {
      ns: "practice",
    });
    return {
      difficulty: level.key,
      levelCode: level.key.toUpperCase(),
      levelName: `(${levelName})`,
      className: level.className,
      icon: level.icon,
      levelIndex: index + 1,
    };
  });

  // Identify Level Logic (Only for 'take' / test mode)
  const identifyCard = {
    difficulty: "identify",
    text: t("identifyLevel", "Identify My Level", { ns: "subjects" }),
    className: "walletIdentify",
    icon: <FaMagic />,
  };

  // If mode is 'take', add the magic button at the start
  const finalCards =
    mode === "take" ? [identifyCard, ...difficultyLevels] : difficultyLevels;

  return (
    <Modal
      onClose={onClose}
      closeOnClickOutside={true}
      closeOnEscape={true}
      padding={false}
      showCloseButton={true}
    >
      <div className={styles.optionsGridModalWrapper}>
        <h2 className={styles.optionsGridModalTitle}>
          {t("selectDifficulty", "Select Difficulty Level", { ns: "subjects" })}
        </h2>
        <p className={styles.optionsGridModalSubtitle}>
          {t("chooseProficiency", "Choose your proficiency level", {
            ns: "subjects",
          })}
        </p>

        <div className={styles.difficultySelectionGrid}>
          {finalCards.map((card) => (
            <DifficultyCard
              key={card.difficulty}
              {...card}
              onSelect={onLevelSelect}
              totalLevels={difficultyLevels.length}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}