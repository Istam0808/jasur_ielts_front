'use client';

import { MdVolumeUp, MdStopCircle } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { formatExplanationRecursively } from '@/utils/common';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import '../WritingResultsPanel.scss';

/**
 * Feedback section component - displays detailed feedback with speech
 */
export default function WritingFeedbackSection({ feedbackText }) {
  const { t } = useTranslation(['writing', 'test']);
  const { isSpeaking, toggle, stop } = useSpeechSynthesis();

  const handleTogglePronunciation = () => {
    if (isSpeaking) {
      stop();
    } else if (feedbackText) {
      toggle(feedbackText, 'en', 1.0);
    }
  };

  if (!feedbackText) {
    return null;
  }

  return (
    <div className="results-feedback-section">
      <div className="detailed-feedback-content">
        <div className="feedback-header-inline">
          <h4 className="feedback-title">
            {t('writing:detailedFeedback', { defaultValue: 'Detailed Examiner Feedback' })}
          </h4>
          <div className="feedback-header-actions">
            <button
              type="button"
              className={`feedback-pronunciation-btn ${isSpeaking ? 'speaking' : ''}`}
              onClick={handleTogglePronunciation}
              aria-label={
                isSpeaking
                  ? t('writing:stopPronouncingFeedback', { defaultValue: 'Stop pronouncing feedback' })
                  : t('writing:pronounceFeedback', { defaultValue: 'Pronounce feedback' })
              }
              title={
                isSpeaking
                  ? t('writing:stopPronouncingFeedback', { defaultValue: 'Stop pronouncing feedback' })
                  : t('writing:pronounceFeedback', { defaultValue: 'Pronounce feedback' })
              }
              aria-pressed={isSpeaking}
            >
              {isSpeaking ? <MdStopCircle /> : <MdVolumeUp />}
            </button>
          </div>
        </div>
        {formatExplanationRecursively(feedbackText, ['^', '~'])}
      </div>
    </div>
  );
}