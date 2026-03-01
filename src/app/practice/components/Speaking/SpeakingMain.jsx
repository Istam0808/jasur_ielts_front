"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SpeakingProvider } from './contexts/SpeakingContext';
import SpeakingMenu from './components/SpeakingMenu';
import IELTSMockExam from './IELTSMockExam';
import dynamic from 'next/dynamic';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PronunciationPractice from './PronunciationPractice';

// Loading component for shadowing practice
const ShadowingLoading = () => {
  const { t } = useTranslation('speaking');
  return <LoadingSpinner variant="overlay" message={t('loading.shadowing', 'Loading shadowing practice...')} />;
};

// Shadowing entry (disable SSR because it uses browser APIs)
const Shadowing = dynamic(() => import('./Shadowing'), { 
  ssr: false,
  loading: () => <ShadowingLoading />
});

const SpeakingMain = ({ difficulty = 'B1', onBack, onChangeLevelClick }) => {
  const { t } = useTranslation('speaking');
  const [currentView, setCurrentView] = useState('menu'); // 'menu', 'mock-exam', 'pronunciation', 'shadowing'

  const handleMenuSelect = (optionId) => {
    setCurrentView(optionId);
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'menu':
        return <SpeakingMenu onSelect={handleMenuSelect} onBack={onBack} difficulty={difficulty} onChangeLevelClick={onChangeLevelClick} />;
      
      case 'mock-exam':
        return (
          <IELTSMockExam 
            difficulty={difficulty} 
            onBack={handleBackToMenu}
            onChangeLevelClick={onChangeLevelClick}
          />
        );
      
      case 'pronunciation':
        return (
          <PronunciationPractice 
            difficulty={difficulty} 
            onBack={handleBackToMenu} 
          />
        );
      
      case 'shadowing':
        return <Shadowing onBack={handleBackToMenu} difficulty={difficulty} onChangeLevelClick={onChangeLevelClick} />;
      
      default:
        return <SpeakingMenu onSelect={handleMenuSelect} onBack={onBack} difficulty={difficulty} onChangeLevelClick={onChangeLevelClick} />;
    }
  };

  return (
    <SpeakingProvider>
      {renderCurrentView()}
    </SpeakingProvider>
  );
};

export default SpeakingMain;