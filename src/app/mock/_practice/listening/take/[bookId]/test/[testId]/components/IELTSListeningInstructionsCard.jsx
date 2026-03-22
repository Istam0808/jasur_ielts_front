'use client';

import { useTranslation } from 'react-i18next';
import { BsInfoCircle } from 'react-icons/bs';

/**
 * IELTS Listening instructions screen — shown before test start in mock exam.
 * Displays official-style instructions and information for candidates.
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

        <h2 className="ielts-academic-instructions__heading">
          {t('instructionsToCandidates', { defaultValue: 'INSTRUCTIONS TO CANDIDATES' })}
        </h2>
        <ul className="ielts-academic-instructions__list">
          <li>{t('listeningInstructionDoNotOpen', { defaultValue: 'Do not open this question paper until you are told to do so.' })}</li>
          <li>{t('listeningInstructionWriteName', { defaultValue: 'Write your name and candidate number in the spaces at the top of this page.' })}</li>
          <li>{t('listeningInstructionAnswerAll', { defaultValue: 'Answer all the questions.' })}</li>
          <li>{t('listeningInstructionSpelling', { defaultValue: 'While you are listening, write your answers on the question paper.' })}</li>
        </ul>

        <h2 className="ielts-academic-instructions__heading">
          {t('informationForCandidates', { defaultValue: 'INFORMATION FOR CANDIDATES' })}
        </h2>
        <ul className="ielts-academic-instructions__list">
          <li>{t('listeningInfoFourParts', { defaultValue: 'There are four parts to the test.' })}</li>
          <li>{t('listeningInfoFortyQuestions', { defaultValue: 'Each part is heard once only.' })}</li>
          <li>{t('listeningInfoTransferTime', { defaultValue: 'The audio will begin automatically when you start the test.' })}</li>
          <li>{t('listeningInfoSpelling', { defaultValue: 'Use a pencil. Spelling and grammar count.' })}</li>
        </ul>

        <p className="ielts-academic-instructions__note" role="note">
          <BsInfoCircle className="ielts-academic-instructions__note-icon" aria-hidden="true" />
          {t('listeningInvigilatorNote', { defaultValue: 'The recording will start as soon as you press Start Test. Make sure you are ready.' })}
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
