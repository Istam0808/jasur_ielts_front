'use client';

import { useTranslation } from 'react-i18next';

/**
 * IELTS Reading instructions screen — shown before test start in mock exam.
 * Displays instructional video before starting.
 */
export default function IELTSReadingInstructionsCard({ onStart }) {
  const { t } = useTranslation('reading');

  return (
    <div className="ielts-academic-instructions">
      <div className="ielts-academic-instructions__card">
        <h1 className="ielts-academic-instructions__title">
          {t('ieltsReadingTitle', { defaultValue: 'IELTS Academic Reading' })}
        </h1>
        <p className="ielts-academic-instructions__time">
          {t('ieltsReadingTime', { defaultValue: 'Time: 1 hour' })}
        </p>

        <div className="ielts-academic-instructions__video-wrap">
          <video
            className="ielts-academic-instructions__video"
            controls
            preload="metadata"
            playsInline
            aria-label={t('readingInstructionsVideo', { defaultValue: 'Reading instructions video' })}
          >
            <source src="/videos/reading_instructions.webm" type="video/webm" />
            {t('videoNotSupported', { defaultValue: 'Your browser does not support the video tag.' })}
          </video>
        </div>

        <button
          type="button"
          className="ielts-academic-instructions__btn"
          onClick={onStart}
          aria-label={t('startTest', { defaultValue: 'Start Test' })}
        >
          {t('startTest', { defaultValue: 'Start Test' })}
        </button>
      </div>
    </div>
  );
}
