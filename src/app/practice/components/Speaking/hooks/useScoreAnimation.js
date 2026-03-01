import { useState, useEffect, useMemo, useRef } from "react";
import { ANIMATION_DURATION } from "../utils/shadowingConstants";

/**
 * Custom hook for animating score transitions with smooth easing
 * 
 * Provides smooth visual transitions for score values using requestAnimationFrame
 * and cubic easing. Automatically handles cleanup and prevents memory leaks.
 * 
 * @param {Object|null} analysis - Analysis results containing score data
 * @param {Object} [analysis.textMatch] - Text match analysis results
 * @param {number} [analysis.textMatch.score] - Text match score (0-1)
 * @param {Object} [analysis.speechRate] - Speech rate analysis results
 * @param {number} [analysis.speechRate.score] - Speech rate score (0-1)
 * @param {Object} [analysis.completeness] - Completeness analysis results
 * @param {number} [analysis.completeness.score] - Completeness score (0-1)
 * 
 * @returns {Object} animatedScores - Object containing animated score values
 * @returns {number} animatedScores.textMatch - Animated text match score (0-1)
 * @returns {number} animatedScores.speechRate - Animated speech rate score (0-1)
 * @returns {number} animatedScores.completeness - Animated completeness score (0-1)
 * 
 * @example
 * const animatedScores = useScoreAnimation(analysisResults);
 * console.log(animatedScores.textMatch); // Smoothly animated value
 */
export function useScoreAnimation(analysis) {
  const [animatedScores, setAnimatedScores] = useState({
    textMatch: 0,
    speechRate: 0,
    completeness: 0,
  });

  // Use ref to track animation frame ID for reliable cleanup
  const rafRef = useRef(null);

  // Extract and memoize individual score values for stable dependencies
  const scoreValues = useMemo(
    () => ({
      textMatch: analysis?.textMatch?.score ?? null,
      speechRate: analysis?.speechRate?.score ?? null,
      completeness: analysis?.completeness?.score ?? null,
    }),
    [
      analysis?.textMatch?.score,
      analysis?.speechRate?.score,
      analysis?.completeness?.score,
    ]
  );

  // Compute target scores only when score values change
  const targetScores = useMemo(() => {
    if (!analysis) return null;

    return {
      textMatch: scoreValues.textMatch ?? 0,
      speechRate: scoreValues.speechRate ?? 0,
      completeness: scoreValues.completeness ?? 0,
    };
  }, [analysis, scoreValues]);

  useEffect(() => {
    // Cancel any existing animation before starting new one
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Reset to zero if no valid target scores
    if (!targetScores) {
      setAnimatedScores({ textMatch: 0, speechRate: 0, completeness: 0 });
      return;
    }

    const startTime = performance.now();

    /**
     * Animation frame callback
     * Applies cubic easeOut easing for smooth deceleration
     * @param {DOMHighResTimeStamp} currentTime - Current animation timestamp
     */
    const animate = (currentTime) => {
      // Calculate normalized progress (0 to 1)
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / ANIMATION_DURATION.SCORE_ANIMATION);

      // Apply cubic easeOut: f(t) = 1 - (1 - t)³
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      // Interpolate scores based on eased progress
      setAnimatedScores({
        textMatch: targetScores.textMatch * easedProgress,
        speechRate: targetScores.speechRate * easedProgress,
        completeness: targetScores.completeness * easedProgress,
      });

      // Continue animation until complete
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
      }
    };

    // Initiate animation loop
    rafRef.current = requestAnimationFrame(animate);

    // Cleanup function: cancel animation on unmount or dependency change
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [targetScores]);

  return animatedScores;
}