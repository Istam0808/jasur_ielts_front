"use client";

import SpeakingMain from './SpeakingMain';

const Speaking = ({ difficulty, onBack, onChangeLevelClick }) => {
    return <SpeakingMain difficulty={difficulty} onBack={onBack} onChangeLevelClick={onChangeLevelClick} />;
};

export default Speaking;