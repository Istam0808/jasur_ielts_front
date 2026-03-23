'use client';

import { useTranslation } from 'react-i18next';

/**
 * IELTS Listening instructions screen — shown before test start in mock exam.
 * Displays instructional video before starting.
 */
export default function IELTSListeningInstructionsCard({ onStart }) {
  const { t } = useTranslation('listening');

  return (
    <div className="ielts-academic-instructions">
      <div className="ielts-academic-instructions__card">
        <h1 className="ielts-academic-instructions__title">
          {t('ieltsListeningTitle', { defaultValue: 'IELTS Academic Listening' })}
        </h1>
        <p className="ielts-academic-instructions__time">
          {t('ieltsListeningTime', { defaultValue: 'Time: Approximately 30 minutes' })}
        </p>

        <div className="ielts-academic-instructions__video-wrap">
          <video
            className="ielts-academic-instructions__video"
            controls
            preload="metadata"
            playsInline
            aria-label={t('listeningInstructionsVideo', { defaultValue: 'Listening instructions video' })}
          >
            <source src="/videos/listening_instructions.webm" type="video/webm" />
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
