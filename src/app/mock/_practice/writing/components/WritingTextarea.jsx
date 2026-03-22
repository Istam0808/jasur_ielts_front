'use client';

import { useTranslation } from 'react-i18next';
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
