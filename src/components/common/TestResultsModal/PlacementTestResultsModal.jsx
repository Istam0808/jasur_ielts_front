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
import styles from './IdentifyLevelResultModal.module.scss';

const PlacementTestResultsModal = memo(({
  isOpen = true,
  onClose,
  finalResults,
  onStartTest,
  onStartPractice,
  onReturnToSubject,
  i18n
}) => {
  const { t } = useTranslation(['test', 'subjects', 'practice', 'common', 'profile']);
  const isTabletOrBelow = false;
  const isMobile = false;
  
  // Lock scroll when modal is open
  useScrollLock(isOpen);
  const { user, getToken, refreshUserData, userData, setLevelIdentificationState } = useUser();
  
  // State for skill update
  const [isUpdatingSkills, setIsUpdatingSkills] = useState(false);
  const [skillUpdateStatus, setSkillUpdateStatus] = useState(null);
  const [skillUpdateMessage, setSkillUpdateMessage] = useState('');
  const hasUpdatedSkills = useRef(false);
  
  // State for view mode (summary or detailed)
  const [viewMode, setViewMode] = useState('summary');
  
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

    const now = Date.now();
    if (updateUserSkills.lastCallTime && (now - updateUserSkills.lastCallTime) < 5000) {
      console.warn('Level identification: Skill update rate limited');
      setSkillUpdateStatus('error');
      setSkillUpdateMessage('Please wait before updating skills again');
      return;
    }
    updateUserSkills.lastCallTime = now;

    setIsUpdatingSkills(true);
    setSkillUpdateStatus(null);
    setSkillUpdateMessage('');

    showLevelUpdateProgressToast(t);

    try {
      // Use grammar results for skill update (most reliable)
      const skillUpdateData = prepareSkillUpdateData(finalResults.grammar || finalResults);
      
      const hasSkillData = Object.values(skillUpdateData.skillLevels || {}).some(level => 
        level && level !== 'Unknown' && level !== null
      );
      
      if (!hasSkillData) {
        setSkillUpdateStatus('error');
        setSkillUpdateMessage('No skill data available to update');
        return;
      }

      const currentEnglishData = userData?.profile?.skills?.languages?.english || {};
      const isDataDifferent = 
        currentEnglishData.currentLevel !== finalResults.overallLevel ||
        Object.entries(skillUpdateData.skillLevels || {}).some(([skill, level]) => 
          level && level !== 'Unknown' && currentEnglishData[skill] !== level
        );

      if (!isDataDifferent) {
        setSkillUpdateStatus('success');
        setSkillUpdateMessage('Skills are already up to date');
        return;
      }
      
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch('/api/user-skills/english', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...skillUpdateData,
          currentLevel: finalResults.overallLevel
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update skills');
      }

      const result = await response.json();
      const previousLevel = currentEnglishData.currentLevel || 'A1';
      const summary = createSkillUpdateSummary(skillUpdateData.skillLevels, finalResults.overallLevel);
      
      setSkillUpdateStatus('success');
      setSkillUpdateMessage(
        `Your English level is now ${summary.overallLevel}. \n` +
        `${summary.totalSkillsUpdated} skill${summary.totalSkillsUpdated !== 1 ? 's' : ''} updated.`
      );

      showLevelUpdateSuccessToast(
        t, 
        finalResults.overallLevel, 
        previousLevel, 
        result.updatedSkills || {}
      );

      if (result.updatedSkills) {
        showSkillAdvancementToast(t, result.updatedSkills);
      }

      showLevelIdentificationCompleteToast(
        t, 
        finalResults.overallLevel, 
        finalResults.breakdown?.grammar?.accuracy || 0
      );

      setTimeout(async () => {
        try {
          await refreshUserData(true, true);
        } catch (error) {
          console.warn('Failed to refresh user data after level update:', error);
        }
      }, 1000);

    } catch (error) {
      console.error('Error updating skills:', error);
      setSkillUpdateStatus('error');
      setSkillUpdateMessage(error.message || 'Failed to update skills. Please try again.');
      showLevelUpdateErrorToast(t, error.message || 'Failed to update skills. Please try again.');
    } finally {
      setIsUpdatingSkills(false);
      setLevelIdentificationState(false);
    }
  }, [user, finalResults, getToken, setLevelIdentificationState, t, userData, refreshUserData]);

  // Auto-update skills when modal opens
  useEffect(() => {
    if (isOpen && finalResults && user && !isUpdatingSkills && skillUpdateStatus === null && !hasUpdatedSkills.current) {
      hasUpdatedSkills.current = true;
      setLevelIdentificationState(true);
      const timeoutId = setTimeout(() => {
        updateUserSkills();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, finalResults, user, isUpdatingSkills, skillUpdateStatus, updateUserSkills, setLevelIdentificationState]);

  // Helper functions
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

  const getConfidenceClass = useCallback((confidence) => {
    if (!confidence) return '';
    const confidenceMap = {
      'Very High': 'veryhigh',
      'High': 'high', 
      'Moderate': 'moderate',
      'Medium': 'moderate',
      'Low': 'low'
    };
    return confidenceMap[confidence] || confidence.toLowerCase().replace(' ', '');
  }, []);

  const today = useMemo(() => new Date().toLocaleDateString(i18n?.language || 'en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }), [i18n]);

  if (!isOpen || !finalResults) return null;

  const modalContent = (
    <div className={styles.modalOverlay} onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="placement-results-modal-title">
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
                <h1 id="placement-results-modal-title" className={styles.title}>
                  {t('placementTest.complete', 'Placement Test Complete!', { ns: 'test' })}
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
            {/* Overall Level Score Section */}
            <div className={styles.scoreSection}>
              <h3 className={styles.overallScoreLabel}>
                {t('placementTest.overallLevel', 'Overall Level', { ns: 'test' })}
              </h3>
              <div className={styles.progressContainer}>
                <HexagonProgress
                  progress={getLevelProgress(finalResults.overallLevel)}
                  size={170}
                  strokeWidth={3}
                  primaryColor="#564FFD"
                  secondaryColor="#FF6636"
                  showPercentage={false}
                  animated={true}
                  animationDuration={1.5}
                  title={finalResults.overallLevel}
                  subtitle={getLevelDescription(finalResults.overallLevel)}
                  glowEffect={true}
                  rotateAnimation={false}
                  pulseAnimation={true}
                />
              </div>
              <div className={styles.scoreFraction}>
                {t(`difficulty.${finalResults.overallLevel.toLowerCase()}`, finalResults.overallLevel, { ns: 'practice' })}
              </div>
              <div className={styles.scoreDescription}>
                {t('placementTest.completeDescription', 'Comprehensive assessment completed', { ns: 'test' })}
              </div>
              
              {/* Confidence Badge */}
              <div className={styles.confidenceBadge}>
                <div className={styles.confidenceBadgeContent}>
                  <div className={styles.confidenceIcon}>
                    <MdGpsFixed size={14} />
                  </div>
                  <span className={styles.confidenceLabel}>
                    {t('placementTest.confidence', 'Confidence', { ns: 'test' })}:
                  </span>
                  <span className={`${styles.confidenceValue} ${styles[`confidence-${getConfidenceClass(finalResults.confidence)}`]}`}>
                    {finalResults.confidence || 'High'}
                  </span>
                </div>
              </div>

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
              
              {isUpdatingSkills && (
                <div className={styles.skillUpdateLoading}>
                  <div className={styles.loadingSpinner}></div>
                  <span>{t('adaptive.updatingSkills', 'Updating your skills...', { ns: 'test' })}</span>
                </div>
              )}
            </div>

            {/* Section Scores */}
            <div className={styles.statsSection}>
              <h4 className={styles.statsTitle}>
                <MdBarChart color="#2196F3" />
                {t('placementTest.sectionScores', 'Section Scores', { ns: 'test' })}
              </h4>
              <div className={styles.statsList}>
                {finalResults.breakdown?.grammar && (
                  <div className={styles.statItem}>
                    <div className={styles.statIcon}>
                      <FiBookOpen color="#4CAF50" />
                    </div>
                    <div className={styles.statInfo}>
                      <div className={styles.statLabel}>
                        {t('section.grammar', 'Grammar', { ns: 'test' })}
                      </div>
                      <div className={styles.statValue}>
                        {finalResults.breakdown.grammar.level} ({Math.round(finalResults.breakdown.grammar.accuracy)}%)
                      </div>
                    </div>
                  </div>
                )}
                {finalResults.breakdown?.reading && (
                  <div className={styles.statItem}>
                    <div className={styles.statIcon}>
                      <FiBookOpen color="#2196F3" />
                    </div>
                    <div className={styles.statInfo}>
                      <div className={styles.statLabel}>
                        {t('section.reading', 'Reading', { ns: 'test' })}
                      </div>
                      <div className={styles.statValue}>
                        {Math.round(finalResults.breakdown.reading.accuracy || 0)}%
                      </div>
                    </div>
                  </div>
                )}
                {finalResults.breakdown?.writing && (
                  <div className={styles.statItem}>
                    <div className={styles.statIcon}>
                      <FiBookOpen color="#FF9800" />
                    </div>
                    <div className={styles.statInfo}>
                      <div className={styles.statLabel}>
                        {t('section.writing', 'Writing', { ns: 'test' })}
                      </div>
                      <div className={styles.statValue}>
                        {finalResults.breakdown.writing.level} ({finalResults.breakdown.writing.overallBand?.toFixed(1) || 'N/A'}/9.0)
                      </div>
                    </div>
                  </div>
                )}
                {finalResults.totalTime && (
                  <div className={styles.statItem}>
                    <div className={styles.statIcon}>
                      <FiClock color="#9c27b0" />
                    </div>
                    <div className={styles.statInfo}>
                      <div className={styles.statLabel}>
                        {t('placementTest.totalTime', 'Total Time', { ns: 'test' })}
                      </div>
                      <div className={styles.statValue}>
                        {Math.floor(finalResults.totalTime / 60)}m {Math.floor(finalResults.totalTime % 60)}s
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Right Column */}
          <section className={styles.rightColumn}>
            {/* Recommendations */}
            <div className={styles.recommendationsSection}>
              <h3 className={styles.sectionTitle}>
                <MdLightbulb color="#FFC107" />
                {t('placementTest.recommendations', 'Recommendations', { ns: 'test' })}
              </h3>
              <div className={styles.questionsList}>
                {(finalResults.recommendations || []).map((rec, index) => (
                  <div key={index} className={`${styles.questionResult} ${styles[`recommendation${rec.priority?.charAt(0).toUpperCase()}${rec.priority?.slice(1)}`]}`}>
                    <div className={styles.questionHeader}>
                      <div className={styles.questionStatusIndicator}>
                        <span className={styles.statusIcon}>
                          <MdLightbulb />
                        </span>
                      </div>
                      <div className={styles.questionContent}>
                        <p className={styles.questionText}>
                          {rec.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
        ) : (
        <main className={styles.modalContent}>
          {/* Detailed view would go here */}
          <div className={styles.detailedView}>
            <p>{t('placementTest.detailedView', 'Detailed view coming soon', { ns: 'test' })}</p>
          </div>
        </main>
        )}

        {/* Footer */}
        <footer className={styles.modalFooter}>
          <div className={styles.footerActions} ref={footerNavRef}>
            <div className={styles.footerPrimary}>
              {!isMobile && (
                <button
                  className={styles.downloadButton}
                  onClick={() => onStartTest?.(finalResults.overallLevel)}
                  aria-label={t('takeTest', 'Take {{level}} Test', { level: finalResults.overallLevel, ns: 'subjects' })}
                >
                  <MdPlayArrow aria-hidden="true" />
                  {t('takeTest', 'Take {{level}} Test', { level: finalResults.overallLevel, ns: 'subjects' })}
                </button>
              )}
            </div>

            <div className={styles.footerSecondary}>
              {!isMobile && (
                <>
                  <button 
                    className={styles.restartButton}
                    onClick={() => onStartPractice?.(finalResults.overallLevel)}
                    aria-label={t('practice', 'Practice {{level}}', { level: finalResults.overallLevel, ns: 'subjects' })}
                  >
                    <MdSchool aria-hidden="true" />
                    {t('practice', 'Practice {{level}}', { level: finalResults.overallLevel, ns: 'subjects' })}
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

PlacementTestResultsModal.displayName = 'PlacementTestResultsModal';

export default PlacementTestResultsModal;
