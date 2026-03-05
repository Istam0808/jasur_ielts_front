'use client';

import React, { useMemo } from 'react';
import { generateHighlightedText } from '@/utils/writing';
import WritingWordTooltip from '@/components/common/WritingWordTooltip';
import '../writingProcess.scss';

/**
 * HighlightedWritingText Component
 * Renders user's essay with highlighted words and tooltips
 */
export default function HighlightedWritingText({
  text,
  className = '',
  enableTooltips = false
}) {
  const highlightedSegments = useMemo(() => {
    if (!text) return [];
    return generateHighlightedText(text);
  }, [text]);

  if (!text) {
    return (
      <div className={`highlighted-writing-text ${className}`}>
        <p className="empty-text">No text to display</p>
      </div>
    );
  }

  return (
    <div className={`highlighted-writing-text ${className}`}>
      <div className="highlighted-text-content">
        {highlightedSegments.map((segment, index) => {
          if (segment.type === 'text') {
            return (
              <span key={`text-${index}`} className="text-segment">
                {segment.content}
              </span>
            );
          }

          if (segment.type === 'highlight') {
            const highlightedWord = (
              <span
                className="highlighted-word"
                style={{
                  '--category-color': segment.category.color,
                  textDecoration: 'underline',
                  textDecorationColor: segment.category.color,
                  textDecorationThickness: '3px',
                  textUnderlineOffset: '4px',
                  cursor: enableTooltips ? 'help' : 'default'
                }}
              >
                {segment.content}
              </span>
            );

            // Only wrap with tooltip if enabled
            if (enableTooltips) {
              return (
                <WritingWordTooltip
                  key={segment.key || `highlight-${index}`}
                  category={segment.category}
                  word={segment.word}
                  position="top"
                >
                  {highlightedWord}
                </WritingWordTooltip>
              );
            }

            // Return highlighted word without tooltip
            return (
              <span key={segment.key || `highlight-${index}`}>
                {highlightedWord}
              </span>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
