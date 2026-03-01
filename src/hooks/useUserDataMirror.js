'use client';

import { useCallback } from 'react';

/**
 * User data mirror: sync completion/best results with backend (or local). Stub implementation for build.
 * Used by useReadingState (queueReadingCompletionUpdate, upsertReadingBestResult), Reading/Grammar (loadMirror),
 * SpeakingContext (applyPatchAndEnqueue), Grammar LearnMode (queueGrammarProgressUpdate).
 */
export function useUserDataMirror() {
  const loadMirror = useCallback(async () => {
    return null;
  }, []);

  const queueReadingCompletionUpdate = useCallback(async (readingId, _options) => {
    void readingId;
  }, []);

  const upsertReadingBestResult = useCallback(async (readingId, _score, _totalQuestions) => {
    void readingId;
  }, []);

  const applyPatchAndEnqueue = useCallback(async (_patch) => {
    // no-op
  }, []);

  const queueGrammarProgressUpdate = useCallback(async (_topicId, _progressEntry, _options) => {
    // no-op
  }, []);

  return {
    loadMirror,
    queueReadingCompletionUpdate,
    upsertReadingBestResult,
    applyPatchAndEnqueue,
    queueGrammarProgressUpdate,
  };
}
