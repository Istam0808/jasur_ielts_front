'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * Hook for writing submission (mock: simulates submit and returns mock feedback).
 * Replace with real API when backend is available.
 */
export function useWritingSubmission({
  userResponse,
  difficulty,
  language,
  topic,
  minWordRequirement,
  isPlacementTest,
  startTimeRef,
  onSubmitComplete,
  t
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [queueStatus, setQueueStatus] = useState(null);
  const [isPollingQueue, setIsPollingQueue] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = useCallback(() => {
    if (isSubmitting || hasSubmitted) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    // Simulate submission delay then set mock feedback
    const wordCount = typeof userResponse === 'string'
      ? userResponse.trim().split(/\s+/).filter(Boolean).length
      : 0;

    setTimeout(() => {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setHasSubmitted(true);
      setAiFeedback(
        'This is mock feedback. Your response has been received. Replace useWritingSubmission with a real API integration for production.'
      );
      if (onSubmitComplete) {
        onSubmitComplete({
          feedback: 'Mock feedback.',
          score: 6.0,
          wordCount,
          criteria: {}
        });
      }
    }, 800);
  }, [isSubmitting, hasSubmitted, userResponse, onSubmitComplete]);

  const handleRetry = useCallback(() => {
    setShowRetryModal(false);
    setSubmitError(null);
    setRetryCount((c) => c + 1);
    handleSubmit();
  }, [handleSubmit]);

  const handleRewrite = useCallback(() => {
    setHasSubmitted(false);
    setAiFeedback(null);
  }, []);

  return {
    isSubmitting,
    hasSubmitted,
    submitError,
    retryCount,
    showRetryModal,
    setShowRetryModal,
    queueStatus,
    isPollingQueue,
    aiFeedback,
    loading,
    handleSubmit,
    handleRetry,
    handleRewrite,
    isSubmittingRef
  };
}
