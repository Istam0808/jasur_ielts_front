'use client';

import { useTranslation } from 'react-i18next';
import { BsInfoCircle } from 'react-icons/bs';

/**
 * IELTS Academic Writing instructions screen — shown before test start (e.g. mock/writing).
 * Displays official-style instructions and information for candidates, no topic.
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

        <h2 className="ielts-academic-instructions__heading">
          {t('instructionsToCandidates', { defaultValue: 'INSTRUCTIONS TO CANDIDATES' })}
        </h2>
        <ul className="ielts-academic-instructions__list">
          <li>{t('instructionAnswerBoth', { defaultValue: 'Answer both parts.' })}</li>
          <li>{t('instructionChangeAnswers', { defaultValue: 'You can change your answers at any time during the test.' })}</li>
        </ul>

        <h2 className="ielts-academic-instructions__heading">
          {t('informationForCandidates', { defaultValue: 'INFORMATION FOR CANDIDATES' })}
        </h2>
        <ul className="ielts-academic-instructions__list">
          <li>{t('infoTwoParts', { defaultValue: 'There are two parts in this test.' })}</li>
          <li>{t('infoPart2Weight', { defaultValue: 'Part 2 contributes twice as much as Part 1 to the writing score.' })}</li>
          <li>{t('infoClockReminder', { defaultValue: 'The test clock will show you when there are 10 minutes and 5 minutes remaining.' })}</li>
        </ul>

        <p className="ielts-academic-instructions__note" role="note">
          <BsInfoCircle className="ielts-academic-instructions__note-icon" aria-hidden="true" />
          {t('invigilatorNote', { defaultValue: 'If your details are not correct, please inform the invigilator.' })}
        </p>

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
