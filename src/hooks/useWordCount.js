'use client';

import { useMemo } from 'react';

/**
 * Counts words in text (whitespace-split, non-empty).
 * @param {string} text - Input text.
 * @param {{ maxWords?: number, minWords?: number }} [options] - Optional limits (for compatibility; not enforced here).
 * @returns {{ wordCount: number }}
 */
export function useWordCount(text, options = {}) {
  const wordCount = useMemo(() => {
    if (!text || typeof text !== 'string') return 0;
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [text]);

  return { wordCount };
}
