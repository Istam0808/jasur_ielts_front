'use client';

import { useTranslation } from 'react-i18next';
import { showToast } from '@/lib/toastNotify';
import { useWordCount } from '@/hooks/useWordCount';
import HighlightedWritingText from './HighlightedWritingText';

/**
 * Textarea component for IELTS writing practice:
 * - Во время ввода показывает только фактический счётчик слов без лимитов
 * - После отправки отображает подсвеченный текст с подсказками
 */
export default function WritingTextarea({
  value,
  onChange,
  disabled = false,
  placeholder,
  hasSubmitted = false
}) {
  const { t } = useTranslation(['writing', 'common']);
  const { wordCount } = useWordCount(value);

  const handleCopy = (e) => {
    if (!disabled && !hasSubmitted) {
      showToast.warning(
        t('writing:copyNotAllowed', {
          defaultValue: 'Copying is not allowed in writing practice'
        }),
        {
          position: 'bottom-center',
          duration: 3000,
          progress: true,
          closeOnClick: true,
          pauseOnHover: true
        }
      );
    }
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  const handlePaste = (e) => {
    if (!disabled && !hasSubmitted) {
      showToast.warning(
        t('writing:pasteNotAllowed', {
          defaultValue: 'Pasting is not allowed in writing practice'
        }),
        {
          position: 'bottom-center',
          duration: 3000,
          progress: true,
          closeOnClick: true,
          pauseOnHover: true
        }
      );
    }
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  const handleCut = (e) => {
    if (!disabled && !hasSubmitted) {
      showToast.warning(
        t('writing:cutNotAllowed', {
          defaultValue: 'Cutting is not allowed in writing practice'
        }),
        {
          position: 'bottom-center',
          duration: 3000,
          progress: true,
          closeOnClick: true,
          pauseOnHover: true
        }
      );
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
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
      if (!disabled && !hasSubmitted) {
        if (e.key === 'c') {
          showToast.warning(
            t('writing:copyNotAllowed', {
              defaultValue: 'Copying is not allowed in writing practice'
            }),
            {
              position: 'bottom-center',
              duration: 3000,
              progress: true,
              closeOnClick: true,
              pauseOnHover: true
            }
          );
        } else if (e.key === 'v') {
          showToast.warning(
            t('writing:pasteNotAllowed', {
              defaultValue: 'Pasting is not allowed in writing practice'
            }),
            {
              position: 'bottom-center',
              duration: 3000,
              progress: true,
              closeOnClick: true,
              pauseOnHover: true
            }
          );
        } else if (e.key === 'x') {
          showToast.warning(
            t('writing:cutNotAllowed', {
              defaultValue: 'Cutting is not allowed in writing practice'
            }),
            {
              position: 'bottom-center',
              duration: 3000,
              progress: true,
              closeOnClick: true,
              pauseOnHover: true
            }
          );
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
        placeholder={placeholder || t('writing:placeholder', { defaultValue: 'Start writing here...' })}
        disabled={disabled}
        aria-label={t('writing:yourResponse', { defaultValue: 'Your response' })}
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

      <div className="writing-word-count" aria-live="polite">
        {wordCount}{' '}
        {t('common:words', {
          defaultValue: 'words'
        })}
      </div>
    </div>
  );
}