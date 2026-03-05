'use client';

import { useTranslation } from 'react-i18next';
import { WRITING_TASK_1 } from '@/store';

/**
 * Start writing card - IELTS Task 1: shown before timer starts.
 * Standard instruction: 20 minutes, at least 150 words.
 */
export default function WritingStartCard({
  title,
  description,
  onStart
}) {
  const { t } = useTranslation('writing');

  return (
    <div className="start-writing-card">
      <div className="decorative-shape decorative-shape--blob-1" aria-hidden="true"></div>
      <div className="decorative-shape decorative-shape--blob-2" aria-hidden="true"></div>
      <div className="decorative-shape decorative-shape--blob-3" aria-hidden="true"></div>
      <div className="decorative-shape decorative-shape--wave-1" aria-hidden="true"></div>
      <div className="decorative-shape decorative-shape--wave-2" aria-hidden="true"></div>

      <div className="start-writing-content">
        <p className="start-writing-task-label">
          {t('writingTask1', { defaultValue: 'WRITING TASK 1' })}
        </p>
        <p className="start-writing-instruction">
          {WRITING_TASK_1.instructionPrefix}
        </p>
        {title && <h2 className="start-writing-title">{title}</h2>}
        {description && <p className="start-writing-description">{description}</p>}
        <p className="start-writing-requirement">
          {t('minimumWords', { defaultValue: 'At least {{count}} words', count: WRITING_TASK_1.minWords })}
          {' • '}
          {t('timeLimitMinutes', { defaultValue: '{{count}} minutes', count: WRITING_TASK_1.timeMinutes })}
        </p>
        <button
          className="btn btn-primary btn-start-writing-large"
          onClick={onStart}
          type="button"
          aria-label={t('startWriting', { defaultValue: 'Start Writing' })}
        >
          {t('startWriting', { defaultValue: 'Start Writing' })}
        </button>
      </div>
    </div>
  );
}