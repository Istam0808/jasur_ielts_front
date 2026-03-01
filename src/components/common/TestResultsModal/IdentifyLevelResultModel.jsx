import React, { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { 
  FiX, 
  FiDownload, 
  FiArrowLeft, 
  FiBookOpen, 
  FiTarget,
  FiTrendingUp,
  FiAward,
  FiClock,
  FiCheck,
  FiAlertCircle,
  FiList
} from 'react-icons/fi';
import { 
  MdGpsFixed, 
  MdBarChart, 
  MdLightbulb, 
  MdPlayArrow, 
  MdSchool, 
  MdStar,
  MdBookmarks,
  MdSearch
} from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import LogoDesktop from '@/assets/logos/logoY.png';
import LogoCompact from '@/assets/logos/logo.png';
import HexagonProgress from '@/components/HexagonProgress';
import InfoTooltip from '@/components/common/InfoTooltip';
import ExplanationDropdown from '@/components/common/ExplanationDropdown';
import { useUser } from '@/contexts/UserContext';
import { prepareSkillUpdateData, createSkillUpdateSummary } from '@/utils/skillMapping';
import { 
  showLevelUpdateSuccessToast, 
  showLevelUpdateErrorToast, 
  showLevelUpdateProgressToast,
  showSkillAdvancementToast,
  showLevelIdentificationCompleteToast
} from '@/utils/levelIdentificationToastHelper';
import useScrollLock from '@/hooks/useScrollLock';
import { useFocusTrap, useArrowNavigation } from '@/hooks/useKeyboardNavigation';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import styles from './IdentifyLevelResultModal.module.scss';

const IdentifyLevelResultModal = memo(({
  isOpen = true,
  onClose,
  finalResults,
  onStartTest,
  onStartPractice,
  onReturnToSubject,
  i18n
}) => {
  const { t } = useTranslation(['test', 'subjects', 'practice', 'common']);
  const isTabletOrBelow = useMobileDetection(992);
  const isMobile = useMobileDetection(768);
  const detailedResultsLabel = isTabletOrBelow
    ? t('resultsShort', 'Results', { ns: 'test' })
    : t('viewDetailedResults', 'View Detailed Results', { ns: 'test' });

  // Lock scroll when modal is open
  useScrollLock(isOpen);
  const { user, getToken, refreshUserData, userData, setLevelIdentificationState } = useUser();
  
  // State for skill update
  const [isUpdatingSkills, setIsUpdatingSkills] = useState(false);
  const [skillUpdateStatus, setSkillUpdateStatus] = useState(null); // 'success', 'error', null
  const [skillUpdateMessage, setSkillUpdateMessage] = useState('');
  const hasUpdatedSkills = useRef(false);
  
  // State for view mode (summary or detailed)
  const [viewMode, setViewMode] = useState('summary'); // 'summary' | 'detailed'

  // Define handleClose before hooks that use it
  const handleClose = useCallback(() => {
    hasUpdatedSkills.current = false;
    onClose?.();
  }, [onClose]);

  // Focus trap for accessibility
  const { containerRef: focusTrapRef } = useFocusTrap({
    isOpen,
    onClose: handleClose,
    autoFocus: true
  });

  // Arrow navigation for footer buttons
  const { containerRef: footerNavRef } = useArrowNavigation({
    enabled: isOpen,
    orientation: 'horizontal'
  });

  // Function to update user skills based on test results
  const updateUserSkills = useCallback(async () => {
    if (!user || !finalResults) return;

    // Circuit breaker: prevent multiple skill updates within 5 seconds
    const now = Date.now();
    if (updateUserSkills.lastCallTime && (now - updateUserSkills.lastCallTime) < 5000) {
      console.warn('Level identification: Skill update rate limited - too frequent calls');
      setSkillUpdateStatus('error');
      setSkillUpdateMessage('Please wait before updating skills again');
      return;
    }
    updateUserSkills.lastCallTime = now;

    setIsUpdatingSkills(true);
    setSkillUpdateStatus(null);
    setSkillUpdateMessage('');

    // Show progress toast
    showLevelUpdateProgressToast(t);

    try {
      // Prepare skill update data
      const skillUpdateData = prepareSkillUpdateData(finalResults);
      
      // Check if we actually have skill data to update
      const hasSkillData = Object.values(skillUpdateData.skillLevels || {}).some(level => 
        level && level !== 'Unknown' && level !== null
      );
      
      if (!hasSkillData) {
        setSkillUpdateStatus('error');
        setSkillUpdateMessage('No skill data available to update');
        return;
      }

      // Check if the data is different from what's already stored
      const currentEnglishData = userData?.profile?.skills?.languages?.english || {};
      const isDataDifferent = 
        currentEnglishData.currentLevel !== skillUpdateData.currentLevel ||
        currentEnglishData.confidenceLevel !== skillUpdateData.testResults?.confidenceLevel ||
        Object.entries(skillUpdateData.skillLevels || {}).some(([skill, level]) => 
          level && level !== 'Unknown' && currentEnglishData[skill] !== level
        );

      if (!isDataDifferent) {
        setSkillUpdateStatus('success');
        setSkillUpdateMessage('Skills are already up to date');
        return;
      }
      
      // Get auth token
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Call the API to update skills
      const response = await fetch('/api/user-skills/english', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(skillUpdateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update skills');
      }

      const result = await response.json();
      
      // Get previous level for comparison (currentEnglishData already declared above)
      const previousLevel = currentEnglishData.currentLevel || 'A1';
      
      // Create summary for user feedback
      const summary = createSkillUpdateSummary(skillUpdateData.skillLevels, skillUpdateData.currentLevel);
      
      setSkillUpdateStatus('success');
      setSkillUpdateMessage(
        `Your English level is now ${summary.overallLevel}. \n` +
        `${summary.totalSkillsUpdated} skill${summary.totalSkillsUpdated !== 1 ? 's' : ''} updated.`
      );

      // Show success toast with level progression info
      showLevelUpdateSuccessToast(
        t, 
        skillUpdateData.currentLevel, 
        previousLevel, 
        result.updatedSkills || {}
      );

      // Show skill advancement details if any skills advanced
      if (result.updatedSkills) {
        showSkillAdvancementToast(t, result.updatedSkills);
      }

      // Show level identification completion toast
      showLevelIdentificationCompleteToast(
        t, 
        skillUpdateData.currentLevel, 
        finalResults.accuracy || 0
      );

      // Refresh user data to update profile statistics immediately
      // Use a small delay to ensure the backend has processed the update
      setTimeout(async () => {
        try {
          await refreshUserData(true, true); // Force refresh, prevent cascade
        } catch (error) {
          console.warn('Failed to refresh user data after level update:', error);
        }
      }, 1000);

    } catch (error) {
      console.error('Error updating skills:', error);
      setSkillUpdateStatus('error');
      setSkillUpdateMessage(error.message || 'Failed to update skills. Please try again.');
      
      // Show error toast
      showLevelUpdateErrorToast(t, error.message || 'Failed to update skills. Please try again.');
    } finally {
      setIsUpdatingSkills(false);
      // Clear level identification state after completion (success or error)
      setLevelIdentificationState(false);
    }
  }, [user, finalResults, getToken, setLevelIdentificationState]); // Remove refreshUserData from deps to prevent infinite loops

  // Auto-update skills when modal opens with results
  useEffect(() => {
    if (isOpen && finalResults && user && !isUpdatingSkills && skillUpdateStatus === null && !hasUpdatedSkills.current) {
      hasUpdatedSkills.current = true;
      
      // Set level identification state to prevent profile updates during this process
      setLevelIdentificationState(true);
      
      // Add a small delay to prevent immediate execution during rapid state changes
      const timeoutId = setTimeout(() => {
        updateUserSkills();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, finalResults, user, isUpdatingSkills, skillUpdateStatus, updateUserSkills, setLevelIdentificationState]);

  // Helper function to get confidence class
  const getConfidenceClass = useCallback((confidenceLevel) => {
    if (!confidenceLevel) return '';
    const confidenceMap = {
      'Very High': 'veryhigh',
      'High': 'high', 
      'Moderate': 'moderate',
      'Medium': 'moderate',
      'Low': 'low'
    };
    return confidenceMap[confidenceLevel] || confidenceLevel.toLowerCase().replace(' ', '');
  }, []);

  // Helper function to get confidence translation key
  const getConfidenceTranslationKey = useCallback((confidenceLevel) => {
    const keyMap = {
      'Very High': 'veryHighConfidence',
      'High': 'highConfidence',
      'Moderate': 'moderateConfidence', 
      'Medium': 'moderateConfidence',
      'Low': 'lowConfidence'
    };
    return keyMap[confidenceLevel] || 'moderateConfidence';
  }, []);

  // Calculate progress percentage for hexagon (A1=16.67%, A2=33.33%, B1=50%, B2=66.67%, C1=83.33%, C2=100%)
  const getLevelProgress = useCallback((cefrLevel) => {
    const levelToNumber = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
    const currentLevelNumber = levelToNumber[cefrLevel] || 1;
    const maxLevel = 6;
    return (currentLevelNumber / maxLevel) * 100;
  }, []);

  // Get level description for hexagon subtitle
  const getLevelDescription = useCallback((cefrLevel) => {
    return (
      cefrLevel === 'A1' && t('levelDescriptions.beginner', 'Beginner', { ns: 'profile' }) ||
      cefrLevel === 'A2' && t('levelDescriptions.elementary', 'Elementary', { ns: 'profile' }) ||
      cefrLevel === 'B1' && t('levelDescriptions.intermediate', 'Intermediate', { ns: 'profile' }) ||
      cefrLevel === 'B2' && t('levelDescriptions.upperIntermediate', 'Upper Intermediate', { ns: 'profile' }) ||
      cefrLevel === 'C1' && t('levelDescriptions.advanced', 'Advanced', { ns: 'profile' }) ||
      cefrLevel === 'C2' && t('levelDescriptions.proficient', 'Proficient', { ns: 'profile' }) ||
      ''
    );
  }, [t]);

  // Get confidence score for display
  const getConfidenceScore = useCallback((confidenceLevel) => {
    const scoreMap = {
      'Very High': 95,
      'High': 85,
      'Moderate': 70,
      'Medium': 70,
      'Low': 50
    };
    return scoreMap[confidenceLevel] || 70;
  }, []);

  const today = useMemo(() => new Date().toLocaleDateString(i18n?.language || 'en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }), [i18n]);

  const getRecommendationIcon = useCallback((recType) => {
    switch (recType) {
      case 'level': return <MdGpsFixed color="#f44336" />;
      case 'skill_weakness': return <MdBookmarks color="#FF9800" />;
      case 'skill_strength': return <MdStar color="#FFC107" />;
      case 'confidence': return <MdSearch color="#03A9F4" />;
      default: return <MdLightbulb color="#8BC34A" />;
    }
  }, []);

  // Helper function to get user's answer text
  const getUserAnswerText = useCallback((question, userAnswer) => {
    if (!userAnswer) return t('noAnswer', 'No answer provided', { ns: 'test' });
    
    // For multiple choice questions, find the option text
    if (question.type === 'multiple-choice' && question.options) {
      const selectedOption = question.options.find(opt => opt.id === userAnswer);
      return selectedOption?.text || userAnswer;
    }
    
    // For text-based questions, return the text directly
    return userAnswer;
  }, [t]);

  // Helper function to get correct answer text
  const getCorrectAnswerText = useCallback((question) => {
    // Check if answer data is explicitly marked as unavailable
    if (question.correctAnswerMeta?.reason === 'missing-from-answer-file') {
      return t('answerPendingValidation', 'Pending validation', { ns: 'test' });
    }
    
    // For short-answer questions, correct answer comes from API response
    // (not from question object, which has no answer data for security)
    if (question.type === 'short-answer') {
      const metaDisplay = question.correctAnswerMeta?.display;
      const metaValue = question.correctAnswerMeta?.value;
      const fallback = question.correctAnswer || metaDisplay || metaValue;
      if (fallback) return fallback;
      
      // Better fallback message
      return t('answerPendingValidation', 'Pending validation', { ns: 'test' });
    }
    
    // For multiple-choice questions, find option text from question.options
    if (question.type === 'multiple-choice' && question.options) {
      const correctOption = question.options.find(opt => opt.isCorrect);
      if (correctOption?.text) return correctOption.text;
      
      const metaDisplay = question.correctAnswerMeta?.display;
      const metaValue = question.correctAnswerMeta?.value;
      if (metaDisplay || metaValue) return metaDisplay || metaValue;
      
      // Better fallback
      return t('answerPendingValidation', 'Pending validation', { ns: 'test' });
    }
    
    return t('notAvailable', 'Not available', { ns: 'test' });
  }, [t]);

  // Handle view mode toggle
  const handleViewDetailedResults = useCallback(() => {
    setViewMode('detailed');
  }, []);

  const handleBackToSummary = useCallback(() => {
    setViewMode('summary');
  }, []);

  if (!isOpen || !finalResults) return null;

  const modalContent = (
    <div className={styles.modalOverlay} onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="results-modal-title">
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()} ref={focusTrapRef}>
        {/* Header */}
        <header className={styles.modalHeader}>
          <div className={styles.headerMain}>
            <div className={styles.logoContainer}>
              <Image
                src={isTabletOrBelow ? LogoCompact : LogoDesktop}
                alt="Unit School Logo"
                width={isTabletOrBelow ? 112 : 150}
                height={isTabletOrBelow ? 112 : 150}
                priority={false}
              />
              <div className={styles.titleContainer}>
                <h1 id="results-modal-title" className={styles.title}>
                  {t('levelIdentified', 'Your Level Has Been Identified!', { ns: 'subjects' })}
                </h1>
              </div>
            </div>
            <div className={styles.headerMeta}>
              <span className={styles.date} aria-label={`Test date: ${today}`}>{today}</span>
            </div>
          </div>
          <button 
            className={styles.closeButton} 
            onClick={handleClose}
            aria-label={t('common.close', 'Close')}
          >
            <FiX size={isMobile ? 20 : 24} aria-hidden="true" />
          </button>
        </header>

        {/* Content */}
        {viewMode === 'summary' ? (
        <main className={styles.modalContent}>
          {/* Left Column */}
          <aside className={styles.leftColumn}>
            {/* Level Score Section */}
            <div className={styles.scoreSection}>
              <h3 className={styles.overallScoreLabel}>
                {t('identifiedLevel', 'Identified Level', { ns: 'subjects' })}
              </h3>
              <div className={styles.progressContainer}>
                <HexagonProgress
                  progress={getLevelProgress(finalResults.cefrLevel)}
                  size={170}
                  strokeWidth={3}
                  primaryColor="#564FFD"
                  secondaryColor="#FF6636"
                  showPercentage={false}
                  animated={true}
                  animationDuration={1.5}
                  title={finalResults.cefrLevel}
                  subtitle={getLevelDescription(finalResults.cefrLevel)}
                  glowEffect={true}
                  rotateAnimation={false}
                  pulseAnimation={true}
                />
              </div>
              <div className={styles.scoreFraction}>
                {t(`difficulty.${finalResults.cefrLevel.toLowerCase()}`, finalResults.cefrLevel, { ns: 'practice' })}
              </div>
              <div className={styles.scoreDescription}>
                {t('adaptive.levelIdentificationComplete', 'Level assessment completed successfully', { ns: 'test' })}
              </div>
              
              {/* Competency Status Badge */}
              {finalResults.competencyStatus && finalResults.competencyStatus !== 'none' && (
                <div className={`${styles.competencyBadge} ${styles[finalResults.competencyStatus]}`}>
                  <span>
                    {t(`adaptive.competencyStatus.${finalResults.competencyStatus}`, finalResults.competencyStatus, { ns: 'test' })}
                  </span>
                </div>
              )}
              
              {/* Skill Update Status */}
              {skillUpdateStatus && (
                <div className={`${styles.skillUpdateStatus} ${styles[skillUpdateStatus]}`}>
                  <div className={styles.statusIcon}>
                    {skillUpdateStatus === 'success' ? (
                      <FiCheck color="#4CAF50" />
                    ) : (
                      <FiAlertCircle color="#f44336" />
                    )}
                  </div>
                  <div className={styles.statusMessage}>
                    {skillUpdateMessage}
                  </div>
                  {skillUpdateStatus === 'error' && (
                    <button 
                      className={styles.retryButton}
                      onClick={updateUserSkills}
                      disabled={isUpdatingSkills}
                      aria-label={t('common.retry', 'Retry')}
                    >
                      {t('common.retry', 'Retry')}
                    </button>
                  )}
                </div>
              )}
              
              {/* Loading State */}
              {isUpdatingSkills && (
                <div className={styles.skillUpdateLoading}>
                  <div className={styles.loadingSpinner}></div>
                  <span>{t('adaptive.updatingSkills', 'Updating your skills...', { ns: 'test' })}</span>
                </div>
              )}
              <div className={styles.confidenceBadge}>
                <div className={styles.confidenceBadgeContent}>
                  <div className={styles.confidenceIcon}>
                    <MdGpsFixed size={14} />
                  </div>
                  <span className={styles.confidenceLabel}>
                    {t('adaptive.confidenceLevel', 'Confidence', { ns: 'test' })}:
                  </span>
                  <span className={`${styles.confidenceValue} ${styles[`confidence-${getConfidenceClass(finalResults.confidenceLevel)}`]}`}>
                    {t(`adaptive.confidenceLevels.${getConfidenceTranslationKey(finalResults.confidenceLevel)}`, finalResults.confidenceLevel, { ns: 'test' })}
                  </span>
                  <InfoTooltip
                    content={t('adaptive.tooltips.confidenceLevel', { ns: 'test' })}
                    position="top"
                  />
                </div>
              </div>
            </div>

            {/* Performance Statistics */}
            <div className={styles.statsSection}>
              <h4 className={styles.statsTitle}>
                <MdBarChart color="#2196F3" />
                {t('adaptive.performanceSummary', 'Performance Summary', { ns: 'test' })}
                <InfoTooltip 
                  content={t('adaptive.tooltips.performanceSummary', { ns: 'test' })}
                  position="top"
                />
              </h4>
              <div className={styles.statsList}>
                <InfoTooltip 
                  content={t('adaptive.stats.questionsAnswered.explanation', { ns: 'test' })}
                  position="top"
                >
                  <div className={styles.statItem}>
                    <div className={styles.statIcon}>
                      <FiTarget color="#4CAF50" />
                    </div>
                    <div className={styles.statInfo}>
                      <div className={styles.statLabel}>
                        {t('adaptive.stats.questionsAnswered.title', 'Questions Answered', { ns: 'test' })}
                      </div>
                      <div className={styles.statValue}>
                        {finalResults.questionsAnswered}
                      </div>
                    </div>
                  </div>
                </InfoTooltip>
                <InfoTooltip
                  content={t('adaptive.stats.accuracy.explanation', { ns: 'test' })}
                  position="top"
                >
                  <div className={styles.statItem}>
                    <div className={styles.statIcon}>
                      <FiTrendingUp color="#2196F3" />
                    </div>
                    <div className={styles.statInfo}>
                      <div className={styles.statLabel}>
                        {t('adaptive.stats.accuracy.title', 'Accuracy Rate', { ns: 'test' })}
                      </div>
                      <div className={styles.statValue}>
                        {Math.round(finalResults.accuracy)}%
                      </div>
                    </div>
                  </div>
                </InfoTooltip>
                <InfoTooltip
                  content={t('adaptive.stats.reliability.explanation', { ns: 'test' })}
                  position="top"
                >
                  <div className={styles.statItem}>
                    <div className={styles.statIcon}>
                      <FiAward color="#FF9800" />
                    </div>
                    <div className={styles.statInfo}>
                      <div className={styles.statLabel}>
                        {t('adaptive.stats.reliability.title', 'Reliability Score', { ns: 'test' })}
                      </div>
                      <div className={styles.statValue}>
                        {finalResults.validation?.reliability?.score || 0}%
                      </div>
                    </div>
                  </div>
                </InfoTooltip>
              </div>
            </div>

            {/* Confidence Breakdown */}
            <div className={styles.criteriaSection}>
              <h4 className={styles.criteriaTitle}>
                <MdGpsFixed color="#9c27b0" />
                {t('adaptive.confidenceBreakdown', 'Assessment Details', { ns: 'test' })}
                <InfoTooltip 
                  content={t('adaptive.tooltips.assessmentDetails', { ns: 'test' })}
                  position="top"
                />
              </h4>
              <div className={styles.criteriaList}>
                <div className={styles.criteriaItem}>
                  <div className={styles.criteriaHeader}>
                    <span className={styles.criteriaName}>
                      {t('adaptive.overallConfidence', 'Overall Confidence', { ns: 'test' })}
                    </span>
                    <span className={styles.criteriaScore}>
                      {getConfidenceScore(finalResults.confidenceLevel)}%
                    </span>
                  </div>
                  <div className={styles.criteriaBar}>
                    <div
                      className={styles.criteriaFill}
                      style={{ width: `${getConfidenceScore(finalResults.confidenceLevel)}%` }}
                    />
                  </div>
                </div>
                <div className={styles.criteriaItem}>
                  <div className={styles.criteriaHeader}>
                    <span className={styles.criteriaName}>
                      {t('adaptive.assessmentAccuracy', 'Assessment Accuracy', { ns: 'test' })}
                    </span>
                    <span className={styles.criteriaScore}>
                      {Math.round(finalResults.accuracy)}%
                    </span>
                  </div>
                  <div className={styles.criteriaBar}>
                    <div
                      className={styles.criteriaFill}
                      style={{ width: `${Math.round(finalResults.accuracy)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column */}
          <section className={styles.rightColumn}>
            <div className={styles.questionsSection}>
              {/* Skill Analysis */}
              <div className={styles.skillAnalysisSection}>
                <h3 className={styles.sectionTitle}>
                  <MdGpsFixed color="#9c27b0" />
                  {t('adaptive.skillAnalysis', 'Skill Analysis', { ns: 'test' })}
                  <InfoTooltip 
                    content={t('adaptive.tooltips.skillAnalysis', { ns: 'test' })}
                    position="top"
                  />
                </h3>
                <div className={styles.skillsGrid}>
                  {Object.keys(finalResults.skillLevels || {}).map(skill => (
                    <div key={skill} className={styles.skillItem}>
                      <span className={styles.skillName}>
                        {t(`categories.${skill}`, skill.charAt(0).toUpperCase() + skill.slice(1), { ns: 'test' })}
                      </span>
                      <span className={styles.skillLevel}>
                        {finalResults.skillLevels[skill]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className={styles.recommendationsSection}>
                <h3 className={styles.sectionTitle}>
                  <MdLightbulb color="#FFC107" />
                  {t('adaptive.personalizedRecommendations', 'Personalized Recommendations', { ns: 'test' })}
                  <InfoTooltip 
                    content={t('adaptive.tooltips.personalizedRecommendations', { ns: 'test' })}
                    position="top"
                  />
                </h3>
                <div className={styles.questionsList}>
                  {(finalResults.recommendations || []).map((rec, index) => {
                    const priorityClass = `recommendation${rec.priority.charAt(0).toUpperCase()}${rec.priority.slice(1)}`;
                    const typeClass = `recommendation${rec.type.charAt(0).toUpperCase()}${rec.type.slice(1)}`;
                    
                    // Translate the recommendation message
                    let translatedMessage = rec.message;
                    if (rec.message && rec.message.includes('adaptive.')) {
                      // Handle different recommendation types
                      if (rec.message.includes('adaptive.levelRecommendation')) {
                        translatedMessage = t('adaptive.levelRecommendation', { level: finalResults.cefrLevel });
                      } else if (rec.message.includes('adaptive.skillImprovement')) {
                        const skill = rec.skill || 'grammar';
                        const accuracy = rec.accuracy || 0;
                        translatedMessage = t('adaptive.skillImprovement', { skill: t(`categories.${skill}`), accuracy });
                      } else if (rec.message.includes('adaptive.skillWeakness')) {
                        const skill = rec.skill || 'grammar';
                        const skillLevel = rec.skillLevel || 'B1';
                        const cefrLevel = rec.cefrLevel || finalResults.cefrLevel;
                        translatedMessage = t('adaptive.skillWeakness', { 
                          skill: t(`categories.${skill}`), 
                          skillLevel, 
                          cefrLevel 
                        });
                      } else if (rec.message.includes('adaptive.skillStrength')) {
                        const skill = rec.skill || 'grammar';
                        const skillLevel = rec.skillLevel || finalResults.cefrLevel;
                        translatedMessage = t('adaptive.skillStrength', { 
                          skill: t(`categories.${skill}`), 
                          skillLevel 
                        });
                      } else if (rec.message.includes('adaptive.confidenceRecommendation')) {
                        translatedMessage = t('adaptive.confidenceRecommendation');
                      } else if (rec.message.includes('adaptive.advancementRecommendation')) {
                        translatedMessage = t('adaptive.advancementRecommendation');
                      } else {
                        // Fallback: try to translate the key directly
                        translatedMessage = t(rec.message.replace('test:', ''));
                      }
                    }
                    
                    return (
                      <div key={index} className={`${styles.questionResult} ${styles[priorityClass]} ${styles[typeClass]}`}>
                        <div className={styles.questionHeader}>
                          <div className={styles.questionStatusIndicator}>
                            <span className={styles.statusIcon}>
                              {getRecommendationIcon(rec.type)}
                            </span>
                          </div>
                          <div className={styles.questionContent}>
                            <p className={styles.questionText}>
                              {translatedMessage}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </main>
        ) : (
        <main className={styles.modalContent}>
          {/* Detailed Results View */}
          <div className={styles.detailedView}>
            {/* Detailed View Header */}
            <div className={styles.detailedHeader}>
              <button 
                className={`${styles.backButton} ${styles.backButtonDesktop}`} 
                onClick={handleBackToSummary}
                aria-label={t('backToSummary', 'Back to Summary', { ns: 'test' })}
              >
                <FiArrowLeft size={20} aria-hidden="true" />
                <span>{t('backToSummary', 'Back to Summary', { ns: 'test' })}</span>
              </button>
              <div className={styles.detailedStats}>
                <span className={styles.correctCount}>
                  <FiCheck color="#4CAF50" />
                  {finalResults.answers?.filter(a => a.isCorrect).length || 0} {t('correct', 'Correct', { ns: 'test' })}
                </span>
                <span className={styles.incorrectCount}>
                  <FiAlertCircle color="#f44336" />
                  {finalResults.answers?.filter(a => !a.isCorrect).length || 0} {t('incorrect', 'Incorrect', { ns: 'test' })}
                </span>
              </div>
            </div>

            {/* Questions List */}
            <div className={styles.questionsContainer}>
              {finalResults.answers && finalResults.answers.length > 0 ? (
                finalResults.answers.map((answerData, index) => {
                  const { question, userAnswer, isCorrect } = answerData;
                  const userAnswerText = getUserAnswerText(question, userAnswer);
                  const correctAnswerText = getCorrectAnswerText(question);

                  return (
                    <div 
                      key={`question-${index}`} 
                      className={`${styles.questionCard} ${isCorrect ? styles.correctCard : styles.incorrectCard}`}
                    >
                      {/* Question Header */}
                      <div className={styles.questionCardHeader}>
                        <div className={styles.questionMeta}>
                          <span className={styles.questionNumber}>
                            {t('questionNumber', 'Question {{number}}', { number: index + 1, ns: 'test' })}
                          </span>
                          {question.category && (
                            <span className={`${styles.categoryBadge} ${styles[question.category]}`}>
                              {t(`categories.${question.category}`, question.category, { ns: 'test' })}
                            </span>
                          )}
                          {question.level && (
                            <span className={styles.levelBadge}>
                              {question.level}
                            </span>
                          )}
                        </div>
                        <div className={styles.questionStatus}>
                          {isCorrect ? (
                            <div className={styles.correctBadge}>
                              <FiCheck size={18} />
                              <span>{t('correct', 'Correct', { ns: 'test' })}</span>
                            </div>
                          ) : (
                            <div className={styles.incorrectBadge}>
                              <FiAlertCircle size={18} />
                              <span>{t('incorrect', 'Incorrect', { ns: 'test' })}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <div className={styles.questionTextContainer}>
                        <p className={styles.questionText}>{question.question || question.text}</p>
                      </div>

                      {/* Answer Section */}
                      <div className={styles.answerSection}>
                        {/* User's Answer */}
                        <div className={`${styles.answerBox} ${styles.userAnswerBox} ${isCorrect ? styles.correct : styles.incorrect}`}>
                          <div className={styles.answerLabel}>
                            {t('yourAnswer', 'Your Answer', { ns: 'test' })}
                          </div>
                          <div className={styles.answerText}>
                            {userAnswerText}
                          </div>
                        </div>

                        {/* Correct Answer (only show if user was incorrect) */}
                        {!isCorrect && (
                          <div className={`${styles.answerBox} ${styles.correctAnswerBox}`}>
                            <div className={styles.answerLabel}>
                              {t('correctAnswer', 'Correct Answer', { ns: 'test' })}
                            </div>
                            <div className={styles.answerText}>
                              {correctAnswerText}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Explanation Dropdown */}
                      {question.explanation && (
                        <div className={styles.explanationContainer}>
                          <ExplanationDropdown
                            explanation={question.explanation}
                            isCorrect={isCorrect}
                            isIncorrect={!isCorrect}
                            theme="light"
                            variant="default"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className={styles.noQuestionsMessage}>
                  <p>{t('noQuestionsAvailable', 'No questions available to display.', { ns: 'test' })}</p>
                </div>
              )}
            </div>
          </div>
        </main>
        )}

        {/* Footer */}
        <footer className={styles.modalFooter}>
          <div className={styles.footerActions} ref={footerNavRef}>
            <div className={styles.footerPrimary}>
              {viewMode === 'summary' && (
                <button
                  className={styles.viewDetailedButton}
                  onClick={handleViewDetailedResults}
                  aria-label={detailedResultsLabel}
                >
                  <FiList aria-hidden="true" />
                  <span>{detailedResultsLabel}</span>
                </button>
              )}
              {isMobile && (
                <button 
                  className={styles.returnButton}
                  onClick={onReturnToSubject}
                  aria-label={t('backToSubject', 'Back to English', { ns: 'subjects' })}
                >
                  <FiArrowLeft aria-hidden="true" />
                  {t('backToSubject', 'Back to English', { ns: 'subjects' })}
                </button>
              )}
              {!isMobile && (
                <button
                  className={styles.downloadButton}
                  onClick={() => onStartTest?.(finalResults.cefrLevel)}
                  aria-label={t('takeTest', 'Take {{level}} Test', { level: finalResults.cefrLevel, ns: 'subjects' })}
                >
                  <MdPlayArrow aria-hidden="true" />
                  {t('takeTest', 'Take {{level}} Test', { level: finalResults.cefrLevel, ns: 'subjects' })}
                </button>
              )}
            </div>

            <div className={styles.footerSecondary}>
              {viewMode === 'detailed' && !isMobile && (
                <button
                  className={`${styles.backButton} ${styles.backButtonMobile}`}
                  onClick={handleBackToSummary}
                  aria-label={t('backToSummary', 'Back to Summary', { ns: 'test' })}
                >
                  <FiArrowLeft size={18} aria-hidden="true" />
                  {t('backToSummary', 'Back to Summary', { ns: 'test' })}
                </button>
              )}
              {!isMobile && (
                <>
                  <button 
                    className={styles.restartButton}
                    onClick={() => onStartPractice?.(finalResults.cefrLevel)}
                    aria-label={t('practice', 'Practice {{level}}', { level: finalResults.cefrLevel, ns: 'subjects' })}
                  >
                    <MdSchool aria-hidden="true" />
                    {t('practice', 'Practice {{level}}', { level: finalResults.cefrLevel, ns: 'subjects' })}
                  </button>

                  <button 
                    className={styles.returnButton}
                    onClick={onReturnToSubject}
                    aria-label={t('backToSubject', 'Back to English', { ns: 'subjects' })}
                  >
                    <FiArrowLeft aria-hidden="true" />
                    {t('backToSubject', 'Back to English', { ns: 'subjects' })}
                  </button>
                </>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
});

IdentifyLevelResultModal.displayName = 'IdentifyLevelResultModal';

export default IdentifyLevelResultModal;
