import React from 'react';
import styles from './CircularProgressBar.module.scss';

const getScoreColor = (value, isPercentage, maxScore) => {
    const normalizedScore = isPercentage ? (value / 100) * 9 : ((value / (maxScore || 9)) * 9);
    if (normalizedScore >= 7) return '#28a745'; // Green for high scores
    if (normalizedScore >= 5) return '#fd7e14'; // Orange for medium scores
    return '#dc3545'; // Red for low scores
};

const CircularProgressBar = ({ score, maxScore = 9, size: sizeProp = 120, isPercentage = false, showText = true }) => {
    const size = sizeProp;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    const progress = isPercentage 
        ? (score / 100) * circumference 
        : (score / maxScore) * circumference;

    const scoreColor = getScoreColor(score, isPercentage, maxScore);

    return (
        <div className={styles.progressBarContainer} style={{ width: size, height: size }}>
            <svg className={styles.progressBar} width={size} height={size}>
                <circle
                    className={styles.progressBar__background}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                />
                <circle
                    className={styles.progressBar__progress}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    style={{ stroke: scoreColor }}
                />
            </svg>
            {showText && (
              <div className={styles.progressBar__text}>
                  {isPercentage ? (
                      <span className={styles.score}>{score}%</span>
                  ) : (
                      <>
                          <span className={styles.score}>{score?.toFixed(1)}</span>
                          <span className={styles.maxScore}>/ {maxScore}</span>
                      </>
                  )}
              </div>
            )}
        </div>
    );
};

export default CircularProgressBar; 