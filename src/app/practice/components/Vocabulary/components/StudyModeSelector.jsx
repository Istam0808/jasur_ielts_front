"use client";

import { useMemo, memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MdViewModule, MdFlipToFront } from 'react-icons/md';
import { BiBookOpen } from 'react-icons/bi';
import { FaGamepad, FaBrain, FaRocket } from 'react-icons/fa';
import { GiTreasureMap, GiCardRandom } from 'react-icons/gi';

// Memoized icon components to prevent recreation
const ICONS = {
    cards: <MdViewModule />,
    flashcards: <MdFlipToFront />,
    adventure: <GiTreasureMap />,
    memory: <FaBrain />,
    speed: <FaRocket />,
    matching: <GiCardRandom />
};

const StudyModeSelector = memo(({ studyMode, onModeChange, showOnlyBasic = false, showOnlyGame = false }) => {
    const { t } = useTranslation(['vocabulary']);

    // Memoize study modes configuration with new game modes
    const studyModes = useMemo(() => [
        {
            id: 'cards',
            label: t('modes.cards'),
            icon: ICONS.cards,
            description: t('modes.cardsDescription'),
            category: 'basic'
        },
        {
            id: 'flashcards',
            label: t('modes.flashcards'),
            icon: ICONS.flashcards,
            description: t('modes.flashcardsDescription'),
            category: 'basic'
        },
        {
            id: 'adventure',
            label: t('modes.adventure'),
            icon: ICONS.adventure,
            description: t('modes.adventureDescription'),
            category: 'game'
        },
        {
            id: 'memory',
            label: t('modes.memory'),
            icon: ICONS.memory,
            description: t('modes.memoryDescription'),
            category: 'game'
        },
        {
            id: 'speed',
            label: t('modes.speed'),
            icon: ICONS.speed,
            description: t('modes.speedDescription'),
            category: 'game'
        },
        {
            id: 'matching',
            label: t('modes.matching'),
            icon: ICONS.matching,
            description: t('modes.matchingDescription'),
            category: 'game'
        }
    ], [t]);

    // Memoized click handler to prevent recreation
    const handleModeClick = useCallback((modeId) => {
        onModeChange(modeId);
    }, [onModeChange]);

    // Memoized button renderer for better performance
    const renderModeButton = useCallback((mode) => (
        <button
            key={mode.id}
            className={`mode-btn ${studyMode === mode.id ? 'active' : ''} ${mode.category}-mode`}
            onClick={() => handleModeClick(mode.id)}
            title={mode.description}
        >
            {mode.icon}
            <span>{mode.label}</span>
        </button>
    ), [studyMode, handleModeClick]);

    // Filter modes based on props
    const basicModes = studyModes.filter(mode => mode.category === 'basic');
    const gameModes = studyModes.filter(mode => mode.category === 'game');

    // Determine which modes to show
    const modesToShow = showOnlyBasic ? basicModes : showOnlyGame ? gameModes : [...basicModes, ...gameModes];
    const sectionTitle = showOnlyBasic ? t('basicLearningModes') : showOnlyGame ? t('interactiveGameModes') : t('studyMode');
    const sectionIcon = showOnlyBasic ? <BiBookOpen /> : showOnlyGame ? <FaGamepad /> : <BiBookOpen />;

    return (
        <div className="study-mode-selector">
            <div className="mode-section">
                <div className="mode-selector-label">
                    {sectionIcon}
                    <span>{sectionTitle}</span>
                </div>
                <div className={`mode-buttons ${showOnlyGame ? 'game-modes' : 'basic-modes'}`}>
                    {modesToShow.map(renderModeButton)}
                </div>
            </div>
        </div>
    );
});

StudyModeSelector.displayName = 'StudyModeSelector';

export default StudyModeSelector;