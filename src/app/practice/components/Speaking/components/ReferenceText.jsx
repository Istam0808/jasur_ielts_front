"use client";

import React from "react";
import { motion } from "framer-motion";
import { FaQuoteLeft } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import cardStyles from "../styles/shadowing/player-cards.module.scss";
import referenceStyles from "../styles/shadowing/player-referenceCard.module.scss";

/**
 * ReferenceText Component
 * Displays reference text/subtitles for shadowing practice
 * 
 * @param {Object} props - Component props
 * @param {Object} props.item - Item object with subtitles or text
 * @param {Array<Object>} [props.item.subtitles] - Array of subtitle objects
 * @param {string} [props.item.subtitles[].text] - Subtitle text
 * @param {number} [props.item.subtitles[].start] - Subtitle start time
 * @param {string} props.referenceText - Reference text (fallback)
 * @param {React.RefObject<HTMLDivElement>} props.transcriptScrollRef - Ref to scrollable container
 * @param {string} [props.className] - Additional CSS classes
 */
const ReferenceText = React.memo(function ReferenceText({
  item,
  referenceText,
  transcriptScrollRef,
  className = "",
}) {
  const { t } = useTranslation("speaking");

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.25, duration: 0.6, type: "spring" }}
      className={`${cardStyles.card} ${referenceStyles["reference-card-new"]} ${className}`}
    >
      {/* Card header */}
      <div
        className={cardStyles["card-header"]}
        style={{ display: "flex", alignItems: "center", gap: "8px" }}
      >
        <FaQuoteLeft aria-hidden="true" />
        <h3>{t("menu.shadowing.player.transcript.reference")}</h3>
      </div>

      {/* Transcript content - either subtitles list or plain text */}
      {Array.isArray(item.subtitles) && item.subtitles.length > 0 ? (
        // Render scrollable subtitles list
        <div
          className={referenceStyles["subtitles-list-scroll"]}
          ref={transcriptScrollRef}
          role="region"
          aria-label={t("menu.shadowing.player.transcript.reference")}
          tabIndex={0}
        >
          {item.subtitles.map((sub, i) => (
            <motion.div
              key={i}
              data-subtitle-index={i}
              className={`${referenceStyles["subtitle-item"]} subtitle-item`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5) }}
              role="article"
              aria-label={`${t("menu.shadowing.player.transcript.reference")} ${(sub.start || 0).toFixed(1)}s`}
            >
              {/* Timestamp */}
              <div className={referenceStyles["subtitle-time"]} aria-hidden="true">
                {(sub.start || 0).toFixed(1)}s
              </div>
              {/* Subtitle text */}
              <div className={referenceStyles["subtitle-text"]}>{sub.text}</div>
            </motion.div>
          ))}
        </div>
      ) : referenceText ? (
        // If no subtitles but has referenceText, show plain text
        <div
          className={referenceStyles["reference-text"]}
          role="region"
          aria-label={t("menu.shadowing.player.transcript.reference")}
        >
          {referenceText}
        </div>
      ) : (
        // No data at all
        <div
          className={referenceStyles["reference-text"]}
          role="region"
          aria-label={t("menu.shadowing.player.transcript.reference")}
          style={{ color: "#999", fontStyle: "italic" }}
        >
          {t("menu.shadowing.player.transcript.noTranscript")}
        </div>
      )}
    </motion.div>
  );
});

ReferenceText.displayName = "ReferenceText";

export default ReferenceText;
