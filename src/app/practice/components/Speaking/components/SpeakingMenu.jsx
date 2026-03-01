"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaMicrophone, FaVolumeUp, FaPlay, FaCheck, FaArrowLeft } from 'react-icons/fa';
import { scrollToTop } from '@/utils/common';
import LevelSelectorButton from '../../common/LevelSelectorButton';
import styles from '../styles/SpeakingMenu.module.scss';
import '../../shared.scss';

const SpeakingMenu = ({ onSelect, onBack, difficulty, onChangeLevelClick }) => {
  const { t } = useTranslation('speaking');

  const menuOptions = [
    {
      id: 'mock-exam',
      title: t('menu.mockExam.title', 'IELTS Mock Exam'),
      description: t('menu.mockExam.description', 'Complete IELTS Speaking simulation with all 3 parts'),
      icon: <FaMicrophone />,
      color: '#2196F3',
      features: [
        t('menu.mockExam.features.timing', 'Official IELTS timing structure'),
        t('menu.mockExam.features.recording', 'Continuous audio recording'),
        t('menu.mockExam.features.tts', 'Text-to-speech questions'),
        t('menu.mockExam.features.cuecards', 'Cue card preparation'),
        t('menu.mockExam.features.export', 'Export recordings')
      ]
    },
    {
      id: 'pronunciation',
      title: t('menu.pronunciation.title', 'Pronunciation Test'),
      description: t('menu.pronunciation.description', 'Test and improve your word pronunciation'),
      icon: <FaVolumeUp />,
      color: '#FF9800',
      features: [
        t('menu.pronunciation.features.stt', 'Speech-to-text analysis'),
        t('menu.pronunciation.features.phonetic', 'Phonetic comparison'),
        t('menu.pronunciation.features.scoring', 'Accuracy scoring'),
        t('menu.pronunciation.features.tracking', 'Progress tracking'),
        t('menu.pronunciation.features.badges', 'Achievement badges')
      ]
    },
    {
      id: 'shadowing',
      title: t('menu.shadowing.title', 'Shadowing Practice'),
      description: t('menu.shadowing.description', 'Practice speaking by shadowing audio content'),
      icon: <FaPlay />,
      color: '#4CAF50',
      features: [
        t('menu.shadowing.features.library', 'Audio content library'),
        t('menu.shadowing.features.rhythm', 'Rhythm matching'),
        t('menu.shadowing.features.intonation', 'Intonation analysis'),
        t('menu.shadowing.features.fluency', 'Fluency scoring'),
        t('menu.shadowing.features.upload', 'Custom audio upload')
      ]
    }
  ];

  return (
    <div className={styles['speaking-menu']}>
      <div className={styles['speaking-menu-container']}>
        {/* Header with Level Selector */}
        <div className="section-header-with-level">
          <h1 className="section-title">
            {t('menu.title', 'Speaking Practice')}
          </h1>
          {onChangeLevelClick && (
            <LevelSelectorButton
              difficulty={difficulty}
              onClick={onChangeLevelClick}
            />
          )}
        </div>

        {/* Subtitle */}
        <header className={styles['speaking-menu-header']}>
          <div className={styles['speaking-menu-header-content']}>
            <p className={styles['speaking-menu-subtitle']}>
              {t('menu.subtitle', 'Choose your speaking practice mode')}
            </p>
          </div>
        </header>

        {/* Menu Options - Horizontal Cards */}
        <div className={styles['speaking-menu-cards']}>
          {menuOptions.map((option) => (
            <div
              key={option.id}
              className={styles['speaking-menu-card']}
              style={{ '--card-color': option.color }}
            >
              <div className={styles['speaking-menu-card-header']}>
                <div className={styles['speaking-menu-card-icon']}>
                  {option.icon}
                </div>
                <h3 className={styles['speaking-menu-card-title']}>
                  {option.title}
                </h3>
                <p className={styles['speaking-menu-card-description']}>
                  {option.description}
                </p>
              </div>

              <div className={styles['speaking-menu-card-features']}>
                {option.features.map((feature, index) => (
                  <div key={index} className={styles['speaking-menu-card-feature']}>
                    <FaCheck className={styles['speaking-menu-card-check']} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                className={styles['speaking-menu-card-button']}
                onClick={() => {
                  scrollToTop();
                  onSelect(option.id);
                }}
              >
                {t('menu.startPractice', 'Start Practice')}
              </button>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className={styles['speaking-menu-info']}>
          <h3>{t('menu.info.title', 'About Speaking Practice')}</h3>
          <p>{t('menu.info.description', 'Improve your English speaking skills with our comprehensive practice tools. From IELTS exam simulation to pronunciation testing and shadowing practice, we provide everything you need to become a confident English speaker.')}</p>
        </div>
      </div>
    </div>
  );
};

export default SpeakingMenu;
