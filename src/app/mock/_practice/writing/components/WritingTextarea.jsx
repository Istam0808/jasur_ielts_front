'use client';

import { BsExclamationCircle } from 'react-icons/bs';
import { useTranslation } from 'react-i18next';
import { showToast } from '@/lib/toastNotify';
import { useWordCount } from '@/hooks/useWordCount';
import HighlightedWritingText from './HighlightedWritingText';

/** IELTS Writing Task 1: 250 words max */
const MAX_WORD_LIMIT = 250;

/**
 * Textarea component with word count warnings and validation
 * After submission, displays highlighted text with tooltips
 */
export default function WritingTextarea({
  value,
  onChange,
  disabled = false,
  placeholder,
  minWords = 0,
  maxWords = MAX_WORD_LIMIT,
  hasSubmitted = false
}) {
  const { t } = useTranslation('writing');
  const { wordCount, isOverMax, wordsRemaining } = useWordCount(value, {
    maxWords,
    minWords
  });

  const showWarning = !hasSubmitted && wordCount > maxWords - 50 && wordCount <= maxWords;
  const showError = !hasSubmitted && wordCount > maxWords;

  // Prevent copy/paste operations
  const handleCopy = (e) => {
    if (!disabled && !hasSubmitted) {
      showToast.warning(t('copyNotAllowed', { defaultValue: 'Copying is not allowed in writing practice' }), {
        position: 'bottom-center',
        duration: 3000,
        progress: true,
        closeOnClick: true,
        pauseOnHover: true
      });
    }
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  const handlePaste = (e) => {
    if (!disabled && !hasSubmitted) {
      showToast.warning(t('pasteNotAllowed', { defaultValue: 'Pasting is not allowed in writing practice' }), {
        position: 'bottom-center',
        duration: 3000,
        progress: true,
        closeOnClick: true,
        pauseOnHover: true
      });
    }
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  const handleCut = (e) => {
    if (!disabled && !hasSubmitted) {
      showToast.warning(t('cutNotAllowed', { defaultValue: 'Cutting is not allowed in writing practice' }), {
        position: 'bottom-center',
        duration: 3000,
        progress: true,
        closeOnClick: true,
        pauseOnHover: true
      });
    }
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  const handleKeyDown = (e) => {
    // Prevent Ctrl+C, Ctrl+V, Ctrl+X (Windows/Linux)
    // Prevent Cmd+C, Cmd+V, Cmd+X (Mac)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
      if (!disabled && !hasSubmitted) {
        if (e.key === 'c') {
          showToast.warning(t('copyNotAllowed', { defaultValue: 'Copying is not allowed in writing practice' }), {
            position: 'bottom-center',
            duration: 3000,
            progress: true,
            closeOnClick: true,
            pauseOnHover: true
          });
        } else if (e.key === 'v') {
          showToast.warning(t('pasteNotAllowed', { defaultValue: 'Pasting is not allowed in writing practice' }), {
            position: 'bottom-center',
            duration: 3000,
            progress: true,
            closeOnClick: true,
            pauseOnHover: true
          });
        } else if (e.key === 'x') {
          showToast.warning(t('cutNotAllowed', { defaultValue: 'Cutting is not allowed in writing practice' }), {
            position: 'bottom-center',
            duration: 3000,
            progress: true,
            closeOnClick: true,
            pauseOnHover: true
          });
        }
      }
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  // After submission, show highlighted text instead of textarea
  if (hasSubmitted) {
    return (
      <div className="writing-textarea-wrapper writing-textarea-wrapper--submitted">
        <HighlightedWritingText
          text={value}
          className="submitted-writing-text"
          enableTooltips={true}
        />
      </div>
    );
  }

  return (
    <div className="writing-textarea-wrapper">
      <textarea
        className="writing-textarea"
        value={value}
        onChange={onChange}
        placeholder={placeholder || t('placeholder', { defaultValue: 'Start writing here...' })}
        disabled={disabled}
        aria-label={t('yourResponse', { defaultValue: 'Your response' })}
        aria-describedby={showError || showWarning ? 'word-limit-message' : undefined}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onCut={handleCut}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
      />

      {/* Word limit warnings */}
      {showError && (
        <div
          id="word-limit-message"
          className="word-limit-warning error"
          role="alert"
          aria-live="polite"
        >
          <BsExclamationCircle size={16} aria-hidden="true" />
          <span>
            {t('maxWordLimitWarning', {
              defaultValue: 'Your response exceeds the word limit. Please shorten your text to submit.'
            })}
          </span>
        </div>
      )}

      {showWarning && (
        <div
          id="word-limit-message"
          className="word-limit-warning warning"
          role="status"
          aria-live="polite"
        >
          <BsExclamationCircle size={16} aria-hidden="true" />
          <span>
            {t('approachingMaxLimit', {
              defaultValue: 'Approaching word limit: {{remaining}} words remaining',
              remaining: wordsRemaining
            })}
          </span>
        </div>
      )}
    </div>
  );
}