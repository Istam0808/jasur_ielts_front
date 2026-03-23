'use client';

import { useTranslation } from 'react-i18next';

/**
 * IELTS Academic Writing instructions screen — shown before test start (e.g. mock/writing).
 * Displays instructional video before starting.
 */
export default function IELTSAcademicInstructionsCard({ onStart }) {
  const { t } = useTranslation('writing');

  return (
    <div className="ielts-academic-instructions">
      <div className="ielts-academic-instructions__card">
        <h1 className="ielts-academic-instructions__title">
          {t('ieltsAcademicWritingTitle', { defaultValue: 'IELTS Academic Writing' })}
        </h1>
        <p className="ielts-academic-instructions__time">
          {t('ieltsAcademicTime', { defaultValue: 'Time: 1 hour' })}
        </p>

        <div className="ielts-academic-instructions__video-wrap">
          <video
            className="ielts-academic-instructions__video"
            controls
            preload="metadata"
            playsInline
            aria-label={t('writingInstructionsVideo', { defaultValue: 'Writing instructions video' })}
          >
            <source src="/videos/writing_instructions.webm" type="video/webm" />
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
