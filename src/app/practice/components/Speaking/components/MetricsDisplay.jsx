"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FaSpinner,
  FaMicrophone,
  FaLightbulb,
  FaCheckCircle,
  FaExclamationCircle,
  FaTextWidth,
  FaCheckDouble,
  FaStar,
  FaChartBar,
  FaArrowDown,
  FaArrowUp,
  FaBolt,
  FaClock,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import ExpandableMetricSection from "./ExpandableMetricSection";
import MetricDetailRow from "./MetricDetailRow";
import RadialProgress from "./RadialProgress";
import { formatPercentage } from "../utils/shadowingHelpers";
import { SCORE_THRESHOLDS, ANIMATION_DURATION } from "../utils/shadowingConstants";
import cardStyles from "../styles/shadowing/player-cards.module.scss";
import metricsStyles from "../styles/shadowing/player-metrics.module.scss";
import stateStyles from "../styles/shadowing/player-states.module.scss";
import detailStyles from "../styles/shadowing/player-metricDetails.module.scss";

// ==================== CONSTANTS ====================
const METRIC_TYPES = {
  TEXT_MATCH: "textMatch",
  SPEECH_RATE: "speechRate",
  COMPLETENESS: "completeness",
};

const ICON_SIZES = {
  LARGE: 64,
  MEDIUM: 48,
  SMALL: 32,
};

const ICON_STYLE_PRIMARY = {
  color: "rgba(255, 255, 255, 0.9)",
  filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
};

// ==================== UTILITY FUNCTIONS ====================
/**
 * Determines the CSS class based on score thresholds
 * @param {number} score - Score value between 0 and 1
 * @param {string} prefix - CSS class prefix (e.g., 'metric', 'score', 'progress')
 * @returns {string} CSS class name
 */
const getScoreClass = (score, prefix = "metric") => {
  const suffix = (() => {
    if (score >= SCORE_THRESHOLDS.EXCELLENT) return "excellent";
    if (score >= SCORE_THRESHOLDS.GOOD) return "good";
    if (score >= SCORE_THRESHOLDS.FAIR) return "fair";
    return "poor";
  })();

  const classMap = {
    metric: {
      excellent: metricsStyles["metric-success"],
      good: metricsStyles["metric-primary"],
      fair: metricsStyles["metric-warning"],
      poor: metricsStyles["metric-danger"],
    },
    score: {
      excellent: metricsStyles["score-excellent"],
      good: metricsStyles["score-good"],
      fair: metricsStyles["score-fair"],
      poor: metricsStyles["score-poor"],
    },
    progress: {
      excellent: "progress-excellent",
      good: "progress-good",
      fair: "progress-fair",
      poor: "progress-poor",
    },
  };

  return classMap[prefix]?.[suffix] || "";
};

/**
 * Gets animation variants based on performance settings
 * @param {boolean} shouldReduceAnimations - Whether to reduce animations
 * @returns {Object} Animation variants
 */
const getCardVariants = (shouldReduceAnimations) => {
  if (shouldReduceAnimations) {
    return { opacity: 1 };
  }

  return {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { type: "spring", stiffness: 200, damping: 20 },
  };
};

// ==================== SUB-COMPONENTS ====================
/**
 * Loading State Component
 */
const LoadingState = React.memo(({ t, shouldReduceAnimations }) => (
  <motion.div
    initial={shouldReduceAnimations ? false : { opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={shouldReduceAnimations ? {} : { duration: 0.5, type: "spring" }}
    className={stateStyles["loading-state"]}
    role="status"
    aria-live="polite"
    aria-label={t("menu.shadowing.player.analysis.analyzing")}
  >
    <motion.div
      animate={shouldReduceAnimations ? {} : { rotate: 360 }}
      transition={
        shouldReduceAnimations
          ? {}
          : { duration: 1, repeat: Infinity, ease: "linear" }
      }
      aria-hidden="true"
    >
      <FaSpinner size={ICON_SIZES.MEDIUM} />
    </motion.div>
    <p>{t("menu.shadowing.player.analysis.analyzing")}</p>
  </motion.div>
));

LoadingState.displayName = "LoadingState";

/**
 * Empty State Component
 */
const EmptyState = React.memo(({ t, shouldReduceAnimations }) => {
  const tips = t("menu.shadowing.player.analysis.empty.tips", {
    returnObjects: true,
  });

  return (
    <motion.div
      initial={shouldReduceAnimations ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceAnimations ? {} : { duration: 0.5, type: "spring" }}
      className={stateStyles["empty-state"]}
    >
      <div>
        <FaMicrophone size={ICON_SIZES.LARGE} />
      </div>
      <h3>{t("menu.shadowing.player.analysis.empty.title")}</h3>
      <p>{t("menu.shadowing.player.analysis.empty.description")}</p>

      <div className={stateStyles["pro-tips"]}>
        <div className={stateStyles["tips-header"]}>
          <div className={stateStyles["tips-icon"]}>
            <FaLightbulb />
          </div>
          <span>{t("menu.shadowing.player.analysis.empty.proTips")}</span>
        </div>
        <ul className={stateStyles["tips-list"]}>
          {tips.map((tip, i) => (
            <li key={i} className={stateStyles["tip-item"]}>
              <span className={stateStyles["tip-bullet"]}>
                <FaStar size={16} />
              </span>
              <span className={stateStyles["tip-text"]}>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
});

EmptyState.displayName = "EmptyState";

/**
 * Text Match Metric Card
 */
const TextMatchCard = React.memo(
  ({
    analysis,
    animatedScore,
    formatPct,
    isExpanded,
    onToggle,
    shouldReduceAnimations,
    cardVariants,
    t,
  }) => {
    const details = analysis.textMatch?.details;
    const scoreClass = getScoreClass(animatedScore, "metric");
    const progressClass = getScoreClass(animatedScore, "progress");

    return (
      <motion.div
        {...cardVariants}
        transition={
          shouldReduceAnimations
            ? {}
            : { delay: 0.1, type: "spring", stiffness: 200, damping: 20 }
        }
        className={`${metricsStyles["metric-card"]} ${scoreClass}`}
      >
        <div className={metricsStyles["metric-header"]}>
          <div style={{ marginBottom: "0.5rem" }}>
            <FaTextWidth size={ICON_SIZES.SMALL} style={ICON_STYLE_PRIMARY} />
          </div>
          <h3>{t("menu.shadowing.player.analysis.textMatch.title")}</h3>
          <RadialProgress
            value={animatedScore * 100}
            size={120}
            strokeWidth={10}
            colorClass={progressClass}
            animated={!shouldReduceAnimations}
            delay={0.3}
          />
        </div>

        <div className={metricsStyles["metric-info"]}>
          <FaLightbulb />
          <span>
            {t("menu.shadowing.player.analysis.textMatch.overallAccuracy")}:{" "}
            {formatPct(animatedScore)}
          </span>
        </div>

        {details && (
          <ExpandableMetricSection
            isExpanded={isExpanded}
            onToggle={onToggle}
            ariaLabel={
              isExpanded
                ? "Collapse text match details"
                : "Expand text match details"
            }
          >
            {details.similarity !== undefined && (
              <MetricDetailRow
                label={t(
                  "menu.shadowing.player.analysis.textMatch.details.characterMatch"
                )}
                value={`${details.similarity}%`}
                showProgressBar
                progressValue={details.similarity}
              />
            )}

            {details.wordAccuracy !== undefined && (
              <MetricDetailRow
                label={t(
                  "menu.shadowing.player.analysis.textMatch.details.wordAccuracy"
                )}
                value={`${details.wordAccuracy}%`}
                showProgressBar
                progressValue={details.wordAccuracy}
              />
            )}

            {details.sequenceAccuracy !== undefined && (
              <MetricDetailRow
                label={t(
                  "menu.shadowing.player.analysis.textMatch.details.wordOrder"
                )}
                value={`${details.sequenceAccuracy}%`}
                showProgressBar
                progressValue={details.sequenceAccuracy}
              />
            )}

            {details.lengthRatio !== undefined && (
              <MetricDetailRow
                label={t(
                  "menu.shadowing.player.analysis.textMatch.details.lengthMatch"
                )}
                value={`${Math.round(details.lengthRatio * 100)}%`}
                showProgressBar
                progressValue={details.lengthRatio * 100}
              />
            )}

            {(details.referenceLength !== undefined ||
              details.transcriptLength !== undefined) && (
                <div className={detailStyles["metric-stats-row"]}>
                  {details.referenceLength !== undefined && (
                    <span className={detailStyles["metric-stat"]}>
                      {t(
                        "menu.shadowing.player.analysis.textMatch.details.referenceLength"
                      )}
                      : {details.referenceLength}{" "}
                      {t("menu.shadowing.player.analysis.textMatch.details.chars")}
                    </span>
                  )}
                  {details.transcriptLength !== undefined && (
                    <span className={detailStyles["metric-stat"]}>
                      {t(
                        "menu.shadowing.player.analysis.textMatch.details.transcriptLength"
                      )}
                      : {details.transcriptLength}{" "}
                      {t("menu.shadowing.player.analysis.textMatch.details.chars")}
                    </span>
                  )}
                </div>
              )}
          </ExpandableMetricSection>
        )}
      </motion.div>
    );
  }
);

TextMatchCard.displayName = "TextMatchCard";

/**
 * Speech Rate Metric Card
 */
const SpeechRateCard = React.memo(
  ({
    analysis,
    animatedScore,
    formatPct,
    shouldReduceAnimations,
    cardVariants,
    t,
  }) => {
    const details = analysis.speechRate.details;
    const scorePercentage = Math.round(animatedScore * 100);

    // Helper to get status icon based on message content
    const getStatusIcon = useCallback((status) => {
      const iconStyle = {
        color: "rgba(255, 255, 255, 0.95)",
        flexShrink: 0,
      };
      
      if (!status) return <FaCheckCircle size={14} style={iconStyle} />;
      
      const statusLower = status.toLowerCase();
      if (statusLower.includes("too fast") || statusLower.includes("slow down")) {
        return <FaBolt size={14} style={iconStyle} />;
      }
      if (statusLower.includes("too slow") || statusLower.includes("speed up")) {
        return <FaBolt size={14} style={iconStyle} />;
      }
      if (statusLower.includes("perfect")) {
        return <FaCheckCircle size={14} style={iconStyle} />;
      }
      return <FaCheckCircle size={14} style={iconStyle} />;
    }, []);

    const zoneLabel = useMemo(() => {
      const iconStyle = {
        color: "rgba(255, 255, 255, 0.95)",
        flexShrink: 0,
        size: 14,
      };

      if (details.zone === "perfect") {
        return (
          <>
            <FaCheckCircle size={14} style={iconStyle} />
            <span>{t("menu.shadowing.player.analysis.speechRate.zones.perfect")}</span>
          </>
        );
      }

      // For good or acceptable zones, use softer text
      if (details.zone === "good" || details.zone === "acceptable") {
        if (details.direction === "faster") {
          return (
            <>
              <FaArrowUp size={14} style={iconStyle} />
              <span>{t("menu.shadowing.player.analysis.speechRate.zones.slightlyFaster")}</span>
            </>
          );
        }
        if (details.direction === "slower") {
          return (
            <>
              <FaArrowDown size={14} style={iconStyle} />
              <FaClock size={14} style={iconStyle} />
              <span>{t("menu.shadowing.player.analysis.speechRate.zones.slightlySlower")}</span>
            </>
          );
        }
      }

      // For poor zones, use harsh text
      if (details.zone === "poor") {
        if (details.direction === "faster") {
          return (
            <>
              <FaArrowUp size={14} style={iconStyle} />
              <span>{t("menu.shadowing.player.analysis.speechRate.zones.tooFast")}</span>
            </>
          );
        }
        if (details.direction === "slower") {
          return (
            <>
              <FaArrowDown size={14} style={iconStyle} />
              <FaClock size={14} style={iconStyle} />
              <span>{t("menu.shadowing.player.analysis.speechRate.zones.tooSlow")}</span>
            </>
          );
        }
      }

      // Fallback for any other zone/direction combination
      return (
        <>
          <FaChartBar size={14} style={iconStyle} />
          <span>
            {details.zone.charAt(0).toUpperCase() + details.zone.slice(1)}
          </span>
        </>
      );
    }, [details.zone, details.direction, t]);

    return (
      <motion.div
        {...cardVariants}
        transition={
          shouldReduceAnimations
            ? {}
            : { delay: 0.2, type: "spring", stiffness: 200, damping: 20 }
        }
        className={`${metricsStyles["metric-card"]} ${getScoreClass(
          animatedScore,
          "metric"
        )}`}
      >
        <div className={metricsStyles["metric-header"]}>
          <h3>{t("menu.shadowing.player.analysis.speechRate.title")}</h3>
          <div className={metricsStyles["score-display"]}>
            {formatPct(animatedScore)}
          </div>
        </div>

        <div
          className={`${metricsStyles["progress-bar"]} ${getScoreClass(
            animatedScore,
            "score"
          )}`}
          role="progressbar"
          aria-valuenow={scorePercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Speech rate: ${scorePercentage}%`}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${animatedScore * 100}%` }}
            transition={{
              duration: ANIMATION_DURATION.PROGRESS_BAR / 1000,
              delay:
                ANIMATION_DURATION.PROGRESS_BAR_DELAY_SPEECH_RATE / 1000,
              ease: "easeOut",
            }}
            className={`${metricsStyles["progress-fill"]} ${getScoreClass(
              animatedScore,
              "score"
            )}`}
            style={{
              transform: "translateZ(0)",
              willChange: "width",
            }}
          />
        </div>

        <div className={metricsStyles["metric-details"]}>
          <p>
            {t("menu.shadowing.player.analysis.speechRate.yourPace")}:{" "}
            {details.userRate}{" "}
            {t("menu.shadowing.player.analysis.speechRate.wordsPerSec")}
          </p>
          <p>
            {t("menu.shadowing.player.analysis.speechRate.target")}:{" "}
            {details.expectedRate}{" "}
            {t("menu.shadowing.player.analysis.speechRate.wordsPerSec")}
          </p>
        </div>

        {details.zone && (
          <div
            className={`${metricsStyles["zone-badge"]} ${metricsStyles[details.zone]
              }`}
          >
            {zoneLabel}
          </div>
        )}

        <div className={metricsStyles["metric-status-simple"]}>
          {getStatusIcon(details.status)}
          <span>{details.status}</span>
        </div>
      </motion.div>
    );
  }
);

SpeechRateCard.displayName = "SpeechRateCard";

/**
 * Completeness Metric Card
 */
const CompletenessCard = React.memo(
  ({
    analysis,
    animatedScore,
    isExpanded,
    onToggle,
    shouldReduceAnimations,
    cardVariants,
    t,
  }) => {
    const details = analysis.completeness.details;
    const scoreClass = getScoreClass(animatedScore, "metric");
    const progressClass = getScoreClass(animatedScore, "progress");

    return (
      <motion.div
        {...cardVariants}
        transition={
          shouldReduceAnimations
            ? {}
            : { delay: 0.3, type: "spring", stiffness: 200, damping: 20 }
        }
        className={`${metricsStyles["metric-card"]} ${scoreClass}`}
      >
        <div className={metricsStyles["metric-header"]}>
          <div style={{ marginBottom: "0.5rem" }}>
            <FaCheckDouble size={ICON_SIZES.SMALL} style={ICON_STYLE_PRIMARY} />
          </div>
          <h3>{t("menu.shadowing.player.analysis.completeness.title")}</h3>
          <RadialProgress
            value={animatedScore * 100}
            size={120}
            strokeWidth={10}
            colorClass={progressClass}
            animated={!shouldReduceAnimations}
            delay={0.5}
          />
        </div>

        <div className={metricsStyles["metric-details"]}>
          <p>
            {t("menu.shadowing.player.analysis.completeness.duration")}:{" "}
            {details.duration}s
          </p>
          <p>
            {t("menu.shadowing.player.analysis.completeness.expected")}:{" "}
            {details.expectedDuration}s
          </p>
          {details.percentage !== undefined && (
            <p>
              {t("menu.shadowing.player.analysis.completeness.completion")}:{" "}
              {details.percentage}%
            </p>
          )}
        </div>

        <div className={metricsStyles["metric-status-simple"]}>
          <FaCheckCircle size={14} style={{ color: "rgba(255, 255, 255, 0.95)", flexShrink: 0 }} />
          <span>{details.status}</span>
        </div>

        {details && (
          <ExpandableMetricSection
            isExpanded={isExpanded}
            onToggle={onToggle}
            ariaLabel={
              isExpanded
                ? "Collapse completeness details"
                : "Expand completeness details"
            }
          >
            <MetricDetailRow
              label={t("menu.shadowing.player.analysis.completeness.duration")}
              value={`${details.duration}s / ${details.expectedDuration}s`}
            />

            {details.wordCount !== undefined && (
              <MetricDetailRow
                label={t(
                  "menu.shadowing.player.analysis.completeness.details.wordsSpoken"
                )}
                value={`${details.wordCount} / ${details.expectedWordCount || "N/A"
                  }`}
              />
            )}

            {details.hasSpeech !== undefined && (
              <div className={detailStyles["metric-validation-row"]}>
                <span
                  className={`${detailStyles["validation-badge"]} ${details.hasSpeech
                      ? detailStyles["badge-success"]
                      : detailStyles["badge-error"]
                    }`}
                >
                  {details.hasSpeech ? (
                    <>
                      <FaCheckCircle aria-hidden="true" />
                      <span>
                        {t(
                          "menu.shadowing.player.analysis.completeness.details.speechDetected"
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      <FaExclamationCircle aria-hidden="true" />
                      <span>
                        {t(
                          "menu.shadowing.player.analysis.completeness.details.noSpeechDetected"
                        )}
                      </span>
                    </>
                  )}
                </span>
              </div>
            )}
          </ExpandableMetricSection>
        )}
      </motion.div>
    );
  }
);

CompletenessCard.displayName = "CompletenessCard";

// ==================== MAIN COMPONENT ====================
/**
 * MetricsDisplay Component
 * Displays performance analysis metrics with loading, empty, and results states
 *
 * @param {Object} props - Component props
 * @param {Object|null} props.analysis - Analysis results object
 * @param {boolean} props.isAnalyzing - Whether analysis is in progress
 * @param {Object} props.animatedScores - Animated score values
 * @param {number} props.animatedScores.textMatch - Text match score (0-1)
 * @param {number} props.animatedScores.speechRate - Speech rate score (0-1)
 * @param {number} props.animatedScores.completeness - Completeness score (0-1)
 * @param {Function} props.formatPercentage - Function to format percentage (optional)
 * @param {string} [props.className] - Additional CSS classes
 */
const MetricsDisplay = React.memo(function MetricsDisplay({
  analysis,
  isAnalyzing,
  animatedScores,
  formatPercentage: formatPct = formatPercentage,
  className = "",
}) {
  const { t } = useTranslation("speaking");
  const { shouldReduceAnimations } = usePerformanceMonitor();

  const [expandedMetrics, setExpandedMetrics] = useState({
    [METRIC_TYPES.TEXT_MATCH]: false,
    [METRIC_TYPES.SPEECH_RATE]: false,
    [METRIC_TYPES.COMPLETENESS]: false,
  });

  // Memoized toggle handler
  const handleToggleMetric = useCallback((metricName) => {
    setExpandedMetrics((prev) => ({
      ...prev,
      [metricName]: !prev[metricName],
    }));
  }, []);

  // Memoized card variants
  const cardVariants = useMemo(
    () => getCardVariants(shouldReduceAnimations()),
    [shouldReduceAnimations]
  );

  // Memoized container animation props
  const containerAnimation = useMemo(
    () => ({
      initial: { opacity: 0, y: 30 },
      animate: { opacity: 1, y: 0 },
      transition: { delay: 0.35, duration: 0.6, type: "spring" },
    }),
    []
  );

  return (
    <motion.div
      {...containerAnimation}
      className={`${cardStyles.card} ${metricsStyles["analysis-card-horizontal"]} ${className}`}
    >
      <h2
        className={`${cardStyles.card} ${metricsStyles["analysis-title"]}`}
      >
        {t("menu.shadowing.player.analysis.title")}
      </h2>

      {isAnalyzing ? (
        <LoadingState t={t} shouldReduceAnimations={shouldReduceAnimations()} />
      ) : analysis ? (
        <div className={metricsStyles["metrics-horizontal-grid"]}>
          <TextMatchCard
            analysis={analysis}
            animatedScore={animatedScores.textMatch}
            formatPct={formatPct}
            isExpanded={expandedMetrics[METRIC_TYPES.TEXT_MATCH]}
            onToggle={() => handleToggleMetric(METRIC_TYPES.TEXT_MATCH)}
            shouldReduceAnimations={shouldReduceAnimations()}
            cardVariants={cardVariants}
            t={t}
          />

          <SpeechRateCard
            analysis={analysis}
            animatedScore={animatedScores.speechRate}
            formatPct={formatPct}
            shouldReduceAnimations={shouldReduceAnimations()}
            cardVariants={cardVariants}
            t={t}
          />

          <CompletenessCard
            analysis={analysis}
            animatedScore={animatedScores.completeness}
            isExpanded={expandedMetrics[METRIC_TYPES.COMPLETENESS]}
            onToggle={() => handleToggleMetric(METRIC_TYPES.COMPLETENESS)}
            shouldReduceAnimations={shouldReduceAnimations()}
            cardVariants={cardVariants}
            t={t}
          />
        </div>
      ) : (
        <EmptyState t={t} shouldReduceAnimations={shouldReduceAnimations()} />
      )}
    </motion.div>
  );
});

MetricsDisplay.displayName = "MetricsDisplay";

export default MetricsDisplay;