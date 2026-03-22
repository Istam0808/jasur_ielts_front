'use client';

import { useTranslation } from 'react-i18next';
import { BsInfoCircle } from 'react-icons/bs';

/**
 * IELTS Reading instructions screen — shown before test start in mock exam.
 * Displays official-style instructions and information for candidates.
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

        <h2 className="ielts-academic-instructions__heading">
          {t('instructionsToCandidates', { defaultValue: 'INSTRUCTIONS TO CANDIDATES' })}
        </h2>
        <ul className="ielts-academic-instructions__list">
          <li>{t('readingInstructionDoNotOpen', { defaultValue: 'Do not open this question paper until you are told to do so.' })}</li>
          <li>{t('readingInstructionWriteName', { defaultValue: 'Write your name and candidate number in the spaces at the top of this page.' })}</li>
          <li>{t('readingInstructionAnswerAll', { defaultValue: 'Answer all the questions.' })}</li>
          <li>{t('readingInstructionChangeAnswers', { defaultValue: 'You can change your answers at any time during the test.' })}</li>
        </ul>

        <h2 className="ielts-academic-instructions__heading">
          {t('informationForCandidates', { defaultValue: 'INFORMATION FOR CANDIDATES' })}
        </h2>
        <ul className="ielts-academic-instructions__list">
          <li>{t('readingInfoThreeSections', { defaultValue: 'The test is divided into three sections.' })}</li>
          <li>{t('readingInfoFortyQuestions', { defaultValue: 'There are 40 questions in total.' })}</li>
          <li>{t('readingInfoAllAnswers', { defaultValue: 'All answers must be written on the answer sheet.' })}</li>
          <li>{t('readingInfoSpelling', { defaultValue: 'Spelling and grammar count.' })}</li>
        </ul>

        <p className="ielts-academic-instructions__note" role="note">
          <BsInfoCircle className="ielts-academic-instructions__note-icon" aria-hidden="true" />
          {t('readingInvigilatorNote', { defaultValue: 'The timer will begin as soon as you press Start Test.' })}
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
