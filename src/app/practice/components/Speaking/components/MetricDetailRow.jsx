"use client";

import React from "react";
import styles from "../styles/shadowing/player-metricDetails.module.scss";
import MiniProgressBar from "./MiniProgressBar"; // ✅ FIXED: Import MiniProgressBar

/**
 * MetricDetailRow - Standardized detail row component
 */
const MetricDetailRow = React.memo(function MetricDetailRow({
  label,
  value,
  showProgressBar = false,
  progressValue = 0,
  icon,
  className = "",
  isVisible = true
}) {
  return (
    <div className={`${styles['metric-detail-row']} ${className}`}>
      <div className={styles['metric-detail-content']}>
        <div className={styles['metric-detail-label']}>
          {icon && <span className={styles['metric-detail-icon']} aria-hidden="true">{icon}</span>}
          <span>{label}</span>
        </div>
        <div className={styles['metric-detail-value']}>{value}</div>
      </div>
      {showProgressBar && (
        <MiniProgressBar
          value={progressValue}
          animated={true}
          isVisible={isVisible}
          className={styles['metric-detail-progress']}
        />
      )}
    </div>
  );
});

MetricDetailRow.displayName = "MetricDetailRow";

export default MetricDetailRow;