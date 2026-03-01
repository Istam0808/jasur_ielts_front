import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import VocabularyCard from '@/app/subjects/languages/english/practice/components/Vocabulary/components/VocabularyCard';
import AdventureMode from '@/app/subjects/languages/english/practice/components/Vocabulary/components/AdventureMode/index';
import MemoryGame from '@/app/subjects/languages/english/practice/components/Vocabulary/components/MemoryGame';
import SpeedMode from '@/app/subjects/languages/english/practice/components/Vocabulary/components/SpeedMode';
import MatchingGame from '@/app/subjects/languages/english/practice/components/Vocabulary/components/MatchingGame';
import './styles/VocabularyGrid.scss';

const VocabularyGrid = memo(({
    words,
    studyMode,
    showTranslations,
    isSaved,
    onToggleSave,
    langKey,
    getWordKey,
    difficulty,
    onBack
}) => {
    const { t } = useTranslation(['vocabulary']);
    // Memoize the className to avoid recalculation on every render
    const gridClassName = useMemo(() =>
        `vocabulary-grid ${studyMode}-mode`,
        [studyMode]
    );

    // Render different components based on study mode
    const renderContent = useMemo(() => {
        switch (studyMode) {
            case 'adventure':
                return (
                    <AdventureMode
                        words={words}
                        onToggleSave={onToggleSave}
                        isSaved={isSaved}
                        langKey={langKey}
                        getWordKey={getWordKey}
                        difficulty={difficulty}
                    />
                );
            
            case 'memory':
                return (
                    <MemoryGame
                        words={words}
                        langKey={langKey}
                        difficulty={difficulty}
                        onBack={onBack}
                    />
                );
            
            case 'speed':
                return (
                    <SpeedMode
                        words={words}
                        langKey={langKey}
                        difficulty={difficulty}
                    />
                );
            
            case 'matching':
                return (
                    <MatchingGame
                        words={words}
                        langKey={langKey}
                        difficulty={difficulty}
                        onBack={onBack}
                    />
                );
            
            default:
                // Original card-based modes (cards, flashcards)
                return words.map((word) => {
                    const wordKey = getWordKey(word);
                    const isWordSaved = isSaved(word);

                    return (
                        <VocabularyCard
                            key={wordKey}
                            word={word}
                            studyMode={studyMode}
                            showTranslations={showTranslations}
                            isSaved={isWordSaved}
                            onToggleSave={() => onToggleSave(word)}
                            langKey={langKey}
                            difficulty={difficulty}
                        />
                    );
                });
        }
    }, [words, studyMode, showTranslations, isSaved, onToggleSave, langKey, getWordKey, difficulty]);

    // For game modes, render the component directly
    if (['adventure', 'memory', 'speed', 'matching'].includes(studyMode)) {
        return (
            <div className={gridClassName}>
                {renderContent}
            </div>
        );
    }

    // For traditional modes, render the grid layout
    return (
        <div className={gridClassName}>
            {renderContent}
        </div>
    );
});

VocabularyGrid.displayName = 'VocabularyGrid';

VocabularyGrid.propTypes = {
    words: PropTypes.array.isRequired,
    studyMode: PropTypes.string.isRequired,
    showTranslations: PropTypes.bool.isRequired,
    isSaved: PropTypes.func.isRequired,
    onToggleSave: PropTypes.func.isRequired,
    langKey: PropTypes.string.isRequired,
    getWordKey: PropTypes.func.isRequired,
    difficulty: PropTypes.string.isRequired,
    onBack: PropTypes.func,
};

export default VocabularyGrid;