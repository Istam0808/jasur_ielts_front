'use client';

import { useTranslation } from 'react-i18next';

/**
 * Vocabulary section component - displays related vocabulary
 */
export default function WritingVocabularySection({
  vocabulary,
  language = 'en'
}) {
  const { t } = useTranslation('writing');

  if (!vocabulary || !vocabulary[language]) {
    return null;
  }

  return (
    <div className="vocabulary-section">
      <h2>{t('vocabulary', { defaultValue: 'Useful vocabulary' })}</h2>
      <div className="vocabulary-list">
        {Object.entries(vocabulary[language]).map(([word, definition], index) => (
          <div key={`${word}-${index}-vocabulary-item`} className="vocabulary-item">
            <span className="vocabulary-item-wrapper">
              <span className="word">{word}</span>
              <span className="definition">{definition}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}