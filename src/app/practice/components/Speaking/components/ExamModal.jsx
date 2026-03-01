"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaPlay, FaPause, FaStop, FaVolumeUp, FaVolumeMute, FaMobile, FaQuestionCircle } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import useScrollLock from '@/hooks/useScrollLock';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useGoogleTTS } from '../hooks/useGoogleTTS';
import CueCard from './CueCard';
import '../styles/ExamModal.scss';

// Constants
const VOICE_STORAGE_KEY = 'speaking-exam-voice';
const DEFAULT_VOICE = 'en-US-Standard-F';
const TOOLTIP_OFFSET = { top: -10, left: -280 };
const PREVIEW_DELAY = 100;

const VOICE_CONFIG = [
  { value: 'en-US-Standard-B', name: 'John', gender: 'male' },
  { value: 'en-US-Standard-C', name: 'Sophia', gender: 'female' },
  { value: 'en-US-Standard-D', name: 'Daniel', gender: 'male' },
  { value: 'en-US-Standard-E', name: 'Ariana', gender: 'female' },
  { value: 'en-US-Standard-F', name: 'Ava', gender: 'female' },
  { value: 'en-US-Standard-G', name: 'Isabella', gender: 'female' },
  { value: 'en-US-Standard-I', name: 'Michael', gender: 'male' }
];

const PREVIEW_TEXTS = [
  'Hello, this is a sample voice preview.',
  'Welcome to your speaking exam preparation.',
  'This voice will read your questions aloud.',
  'Listen carefully to ensure this voice suits you.'
];

const PART_COLORS = {
  1: '#3B82F6',
  2: '#F59E0B',
  3: '#10B981',
  default: '#6B7280'
};

// Utility functions
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;

  return isMobileUA || (isTouchDevice && isSmallScreen);
};

const getStoredVoice = () => {
  if (typeof window === 'undefined') return DEFAULT_VOICE;
  return localStorage.getItem(VOICE_STORAGE_KEY) || DEFAULT_VOICE;
};

const setStoredVoice = (voice) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(VOICE_STORAGE_KEY, voice);
  }
};

const getRandomPreviewText = () => {
  return PREVIEW_TEXTS[Math.floor(Math.random() * PREVIEW_TEXTS.length)];
};

const extractQuestionText = (question) => {
  if (!question) return '';
  if (typeof question === 'string') return question;
  return question.title || question.description || '';
};

// Custom hooks
const useVoiceSelection = () => {
  const [selectedVoice, setSelectedVoice] = useState(getStoredVoice);
  const previewTTS = useGoogleTTS();
  const cleanupRef = useRef(null);

  useEffect(() => {
    cleanupRef.current = previewTTS.cleanup;
  }, [previewTTS.cleanup]);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const handleVoiceChange = useCallback((event) => {
    const newVoice = event.target.value;
    setSelectedVoice(newVoice);
    setStoredVoice(newVoice);
  }, []);

  const handleVoicePreview = useCallback(async () => {
    if (!selectedVoice) {
      console.warn('No voice selected for preview');
      return;
    }

    previewTTS.stop();
    await new Promise(resolve => setTimeout(resolve, PREVIEW_DELAY));

    try {
      await previewTTS.speak(getRandomPreviewText(), {
        voice: selectedVoice,
        lang: 'en-US'
      });
    } catch (error) {
      console.error('[Voice Preview] Error:', error);
    }
  }, [selectedVoice, previewTTS]);

  return {
    selectedVoice,
    handleVoiceChange,
    handleVoicePreview,
    isLoading: previewTTS.isLoading,
    isSpeaking: previewTTS.isSpeaking
  };
};

const useTooltip = (isMobile) => {
  const [tooltipActive, setTooltipActive] = useState(false);
  const [tooltipHovered, setTooltipHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);

  const updateTooltipPosition = useCallback(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top + TOOLTIP_OFFSET.top,
        left: rect.right + TOOLTIP_OFFSET.left
      });
    }
  }, []);

  useEffect(() => {
    if (tooltipHovered || tooltipActive) {
      updateTooltipPosition();
    }
  }, [tooltipHovered, tooltipActive, updateTooltipPosition]);

  useEffect(() => {
    if (!tooltipActive || !isMobile) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest('.exam-modal-info-tooltip')) {
        setTooltipActive(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [tooltipActive, isMobile]);

  const toggleTooltip = useCallback(() => {
    if (isMobile) {
      setTooltipActive(prev => !prev);
    }
  }, [isMobile]);

  return {
    tooltipRef,
    tooltipActive,
    tooltipHovered,
    tooltipPosition,
    setTooltipHovered,
    toggleTooltip
  };
};

// Component
const ExamModal = ({
  topic,
  examState,
  currentQuestion,
  partTitle,
  timeRemaining,
  isRecording,
  isSpeaking,
  speechError,
  canProgress,
  onStartExam,
  onNextQuestion,
  onSpeak,
  onStopTTS,
  onClearSpeechError,
  onStartRecording,
  onStopRecording,
  recordingError,
  recordingDuration,
  systemAudioEnabled,
  recordingGuidance,
  onBack,
  formatTime,
  cueCardNotes,
  showCueCardNotes,
  onNotesChange,
  onToggleNotes,
  isVoiceInitializing
}) => {
  const { t } = useTranslation('speaking');
  const [isMobile, setIsMobile] = useState(false);
  const { selectedVoice, handleVoiceChange, handleVoicePreview, isLoading: voiceLoading, isSpeaking: voiceSpeaking } = useVoiceSelection();
  const {
    tooltipRef,
    tooltipActive,
    tooltipHovered,
    tooltipPosition,
    setTooltipHovered,
    toggleTooltip
  } = useTooltip(isMobile);

  useScrollLock(true);

  const { currentPart, currentQuestion: questionIndex, isPreparing, examStarted } = examState;

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  const getPartColor = useCallback((part) => {
    return PART_COLORS[part] || PART_COLORS.default;
  }, []);

  const progressPercentage = useMemo(() => {
    const { questionsCompleted, totalQuestions } = examState;
    return (questionsCompleted.length / totalQuestions) * 100;
  }, [examState.questionsCompleted.length, examState.totalQuestions]);

  const formattedRecordingDuration = useMemo(() => {
    return formatTime(recordingDuration || 0);
  }, [recordingDuration, formatTime]);

  const handleQuestionSpeak = useCallback(() => {
    const text = extractQuestionText(currentQuestion);
    if (text) {
      onSpeak(text);
    }
  }, [currentQuestion, onSpeak]);

  const handleNextClick = useCallback(() => {
    if (canProgress) {
      onNextQuestion();
    }
  }, [canProgress, onNextQuestion]);

  const nextButtonText = useMemo(() => {
    if (isSpeaking) {
      return t('exam.listening', 'Listening...');
    }

    if (currentPart === 1) {
      return questionIndex === topic.part1.questions.length - 1
        ? t('exam.nextPart', 'Next Part')
        : t('exam.nextQuestion', 'Next Question');
    }

    if (currentPart === 2) {
      return isPreparing
        ? t('exam.startSpeaking', 'Start Speaking')
        : t('exam.nextPart', 'Next Part');
    }

    if (currentPart === 3 && questionIndex === topic.part3.questions.length - 1) {
      return t('exam.finishExam', 'Finish Exam');
    }

    return t('exam.nextQuestion', 'Next Question');
  }, [isSpeaking, currentPart, isPreparing, questionIndex, topic, t]);

  const instructionsText = useMemo(() => {
    if (currentPart === 1) {
      return t('exam.instructions.part1', 'Answer each question clearly and completely. You have 45 seconds per question, but you can advance manually when ready.');
    }
    if (currentPart === 2) {
      return isPreparing
        ? t('exam.instructions.part2Prep', 'You have 1 minute to prepare. Take notes if needed. You can advance manually when ready.')
        : t('exam.instructions.part2Speak', 'Speak for 1-2 minutes about the topic. Use your notes. You can advance manually when ready.');
    }
    return t('exam.instructions.part3', 'Discuss the topic in detail. You have 90 seconds per question, but you can advance manually when ready.');
  }, [currentPart, isPreparing, t]);

  const availableVoices = useMemo(() => {
    const maleLabel = t('exam.preExam.voiceSelector.male', 'Male');
    const femaleLabel = t('exam.preExam.voiceSelector.female', 'Female');
    
    return VOICE_CONFIG.map(voice => ({
      value: voice.value,
      label: `${voice.name} (${voice.gender === 'male' ? maleLabel : femaleLabel})`
    }));
  }, [t]);

  const translatedGuidance = useMemo(() => {
    if (systemAudioEnabled) {
      return {
        status: 'complete',
        message: t('exam.completeAudioRecording', 'Complete audio recording enabled - both your voice and question audio will be captured'),
        icon: '✅'
      };
    }

    return {
      status: 'partial',
      message: t('exam.microphoneOnlyRecording', 'Microphone-only recording - question audio will not be captured when using headphones'),
      icon: '⚠️',
      suggestions: [
        t('exam.useSpeakersSuggestion', 'Use speakers instead of headphones for complete recording'),
        t('exam.useChromeEdgeSuggestion', 'Use Chrome/Edge with HTTPS for system audio capture'),
        t('exam.allowScreenSharingSuggestion', 'Allow screen sharing permissions when prompted')
      ]
    };
  }, [systemAudioEnabled, t]);

  const renderQuestionDisplay = useCallback(() => {
    if (!currentQuestion) return null;

    if (currentPart === 2) {
      return (
        <CueCard
          cueCard={currentQuestion}
          isPreparing={isPreparing}
          timeRemaining={timeRemaining}
          formatTime={formatTime}
          notes={cueCardNotes}
          showNotes={showCueCardNotes}
          onNotesChange={onNotesChange}
          onToggleNotes={onToggleNotes}
        />
      );
    }

    const questionText = extractQuestionText(currentQuestion);

    return (
      <div className="exam-modal-question-display">
        <div className="exam-modal-question-text">
          {questionText}
        </div>
        <div className="exam-modal-question-actions">
          <button
            onClick={handleQuestionSpeak}
            className="exam-modal-speak-button"
            disabled={isSpeaking}
            aria-label={isSpeaking ? t('exam.stopAudio', 'Stop Audio') : t('exam.playAudio', 'Play Audio')}
          >
            {isSpeaking ? <FaVolumeMute /> : <FaVolumeUp />}
            {isSpeaking ? t('exam.stopAudio', 'Stop Audio') : t('exam.playAudio', 'Play Audio')}
          </button>
        </div>
      </div>
    );
  }, [currentQuestion, currentPart, isPreparing, timeRemaining, formatTime, cueCardNotes, showCueCardNotes, onNotesChange, onToggleNotes, handleQuestionSpeak, isSpeaking, t]);

  const renderPreExamScreen = useCallback(() => (
    <div className="exam-modal-pre-exam">
      <div className="exam-modal-pre-exam-content">
        <h2 className="exam-modal-pre-exam-title">
          {t('exam.preExam.title', 'Ready to Start Your Speaking Exam?')}
        </h2>
        <div className="exam-modal-pre-exam-info">
          <div className="exam-modal-exam-overview">
            <h3>{t('exam.preExam.overview', 'Exam Overview')}</h3>
            <ul>
              <li>
                <strong>{t('exam.preExam.part1', 'Part 1')}:</strong> {t('exam.preExam.part1Desc', 'Personal questions (4-5 questions, 45 seconds each)')}
              </li>
              <li>
                <strong>{t('exam.preExam.part2', 'Part 2')}:</strong> {t('exam.preExam.part2Desc', 'Cue card topic (1 minute prep + 2 minutes speaking)')}
              </li>
              <li>
                <strong>{t('exam.preExam.part3', 'Part 3')}:</strong> {t('exam.preExam.part3Desc', 'Discussion questions (3-4 questions, 90 seconds each)')}
              </li>
            </ul>
          </div>
          <div className="exam-modal-exam-tips">
            <h3>{t('exam.preExam.tips', 'Tips for Success')}</h3>
            <ul>
              <li>{t('exam.preExam.tip1', 'Speak clearly and at a natural pace')}</li>
              <li>{t('exam.preExam.tip2', 'Use the full time available for each question')}</li>
              <li>{t('exam.preExam.tip3', 'Questions will be read aloud automatically')}</li>
              <li>{t('exam.preExam.tip4', 'You can replay questions if needed')}</li>
              <li>{t('exam.preExam.tip5', 'Advance manually when you\'re ready for the next question')}</li>
            </ul>
          </div>
        </div>
        <div className="exam-modal-voice-selector">
          <label htmlFor="voice-select" className="exam-modal-voice-selector-label">
            {t('exam.preExam.voiceSelector.label', 'Choose Voice')}
          </label>
          <div className="exam-modal-voice-selector-controls">
            <select
              id="voice-select"
              value={selectedVoice}
              onChange={handleVoiceChange}
              className="exam-modal-voice-select"
              aria-label={t('exam.preExam.voiceSelector.label', 'Choose Voice')}
            >
              {availableVoices.map((voice) => (
                <option key={voice.value} value={voice.value}>
                  {voice.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleVoicePreview}
              disabled={voiceLoading || voiceSpeaking}
              className="exam-modal-voice-preview-button"
              aria-label={t('exam.preExam.voiceSelector.preview', 'Preview Voice')}
            >
              {voiceLoading ? (
                <>
                  <LoadingSpinner variant="inline-sm" />
                  {t('exam.preExam.voiceSelector.loading', 'Loading...')}
                </>
              ) : (
                <>
                  <FaVolumeUp />
                  {t('exam.preExam.voiceSelector.preview', 'Preview')}
                </>
              )}
            </button>
          </div>
        </div>
        <div className="exam-modal-pre-exam-actions">
          <button
            onClick={onStartExam}
            className="exam-modal-start-exam-button"
          >
            <FaPlay />
            {t('exam.startExam', 'Start Speaking Exam')}
          </button>
        </div>
      </div>
    </div>
  ), [t, selectedVoice, handleVoiceChange, handleVoicePreview, voiceLoading, voiceSpeaking, onStartExam]);

  if (!topic) return null;

  const tooltipTitle = t('exam.recordingStatus', 'Recording Status');
  const tooltipFallbackMessage = t('exam.recordingInformation', 'Recording information');

  const renderLoadingOverlay = useCallback(() => {
    if (!examStarted || !isVoiceInitializing) return null;

    return (
      <div className="exam-modal-voice-loading-overlay">
        <LoadingSpinner variant="inline" message={t('exam.voiceLoading', 'Loading voice...')} />
      </div>
    );
  }, [examStarted, isVoiceInitializing, t]);

  const modalContent = (
    <div className="exam-modal-overlay">
      <div className="exam-modal">
        <div className="exam-modal-content">
          {renderLoadingOverlay()}
          {/* Header */}
          <header className="exam-modal-header">
            <button onClick={onBack} className="exam-modal-back-button" aria-label={t('exam.back', 'Back')}>
              <FaArrowLeft />
              {t('exam.back', 'Back')}
            </button>

            <div className="exam-modal-header-info">
              <h1 className="exam-modal-title">{topic.title}</h1>
              <div className="exam-modal-part-info">
                <span
                  className="exam-modal-part-badge"
                  style={{ backgroundColor: getPartColor(currentPart) }}
                >
                  {partTitle}
                </span>
                <span className="exam-modal-question-number">
                  {currentPart === 2 ? 'Cue Card' : `Question ${questionIndex + 1}`}
                </span>
              </div>
            </div>
          </header>

          {/* Instructions */}
          {examStarted && (
            <div className="exam-modal-instructions-section">
              <div className="exam-modal-instructions">
                <div className="exam-modal-instructions-content">
                  <div className="exam-modal-instructions-icon">
                    <span className="instructions-icon">💡</span>
                  </div>
                  <div className="exam-modal-instructions-text">
                    <span className="exam-modal-instructions-label">
                      {t('exam.instructions.title', 'Instructions')}:
                    </span>
                    <span className="exam-modal-instructions-message">
                      {instructionsText}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status Dashboard */}
          {examStarted && (
            <div className="exam-modal-status-dashboard">
              <div
                ref={tooltipRef}
                className={`exam-modal-info-tooltip ${tooltipActive ? 'active' : ''}`}
                onMouseEnter={() => !isMobile && setTooltipHovered(true)}
                onMouseLeave={() => !isMobile && setTooltipHovered(false)}
              >
                <FaQuestionCircle
                  className="info-icon"
                  onClick={toggleTooltip}
                  aria-label={tooltipTitle}
                />
              </div>

              <div className="exam-modal-status-card exam-modal-recording-card">
                <div className="exam-modal-status-icon">
                  <div className={`exam-modal-recording-pulse ${isRecording ? 'active' : 'inactive'}`}>
                    <div className="pulse-ring"></div>
                    <div className="pulse-dot"></div>
                  </div>
                </div>
                <div className="exam-modal-status-content">
                  <div className="exam-modal-status-label">
                    {isRecording ? t('exam.recording', 'RECORDING') : t('exam.notRecording', 'STANDBY')}
                  </div>
                  <div className="exam-modal-status-detail">
                    {formattedRecordingDuration}
                  </div>
                </div>
                {isMobile && (
                  <div className="exam-modal-mobile-badge">
                    <FaMobile className="mobile-icon" />
                    <span>Mobile</span>
                  </div>
                )}
              </div>

              {!isPreparing && (
                <div className="exam-modal-status-card exam-modal-speaking-card">
                  <div className="exam-modal-status-icon">
                    <div className="exam-modal-speaking-icon">🎤</div>
                  </div>
                  <div className="exam-modal-status-content">
                    <div className="exam-modal-status-label">
                      {t('exam.speakNow', 'SPEAK NOW')}
                    </div>
                    <div className="exam-modal-status-detail">
                      {t('exam.speakNowDesc', 'Your response is being recorded')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Errors */}
          {examStarted && recordingError && (
            <div className="exam-modal-error">
              <div className="exam-modal-error-content">
                <span className="exam-modal-error-icon">🎙️</span>
                <span className="exam-modal-error-message">{recordingError}</span>
              </div>
            </div>
          )}

          {examStarted && speechError && (
            <div className="exam-modal-error">
              <div className="exam-modal-error-content">
                <span className="exam-modal-error-icon">⚠️</span>
                <span className="exam-modal-error-message">{speechError}</span>
                <div className="exam-modal-error-actions">
                  <button
                    onClick={onClearSpeechError}
                    className="exam-modal-error-dismiss"
                  >
                    {t('exam.dismiss', 'Dismiss')}
                  </button>
                  <button
                    onClick={() => onSpeak(extractQuestionText(currentQuestion))}
                    className="exam-modal-error-retry"
                    disabled={isSpeaking}
                  >
                    {t('exam.retry', 'Retry Speech')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Question Content */}
          <div className="exam-modal-question-section">
            {!examStarted ? renderPreExamScreen() : renderQuestionDisplay()}
          </div>

          {/* Navigation */}
          <div className="exam-modal-navigation">
            <div className="exam-modal-navigation-center">
              {examStarted && (
                <button
                  onClick={handleNextClick}
                  className="exam-modal-next-button"
                  disabled={!canProgress}
                  aria-label={nextButtonText}
                >
                  {nextButtonText}
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {examStarted && (
            <div className="exam-modal-progress-section exam-modal-progress-bottom">
              <div className="exam-modal-progress-bar">
                <div
                  className="exam-modal-progress-fill"
                  style={{
                    width: `${progressPercentage}%`,
                    backgroundColor: getPartColor(currentPart)
                  }}
                  role="progressbar"
                  aria-valuenow={progressPercentage}
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>
              <div className="exam-modal-progress-info">
                <span className="exam-modal-progress-text">
                  {t('exam.progress', 'Progress')}: {examState.questionsCompleted.length}/{examState.totalQuestions}
                </span>
                <span className="exam-modal-time-remaining">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const tooltipContent = (
    <div
      className="exam-modal-tooltip-portal"
      style={{
        top: isMobile ? '50%' : `${tooltipPosition.top}px`,
        left: isMobile ? '50%' : `${tooltipPosition.left}px`,
        transform: isMobile ? 'translate(-50%, -50%)' : 'none'
      }}
      role="tooltip"
    >
      <div className="tooltip-content">
        <div className="tooltip-title">{tooltipTitle}</div>
        <div className="tooltip-message">
          {translatedGuidance?.message || tooltipFallbackMessage}
        </div>
        {translatedGuidance?.suggestions && (
          <ul className="tooltip-suggestions">
            {translatedGuidance.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? (
    <>
      {createPortal(modalContent, document.body)}
      {(tooltipActive || tooltipHovered) && createPortal(tooltipContent, document.body)}
    </>
  ) : null;
};

export default ExamModal;