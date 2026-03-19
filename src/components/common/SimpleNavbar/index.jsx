"use client"

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import Timer from '@/components/common/Timer';
import styles from './style.module.scss';

/**
 * SimpleNavbar
 * Minimal navbar for non-unified headers; keeps API compatible with TestNavbar.
 */
export default function SimpleNavbar({
  currentQuestion = 0,
  estimatedTotal = 0,
  timerDuration = 30,
  onTimeUp,
  isTimerActive = false,
  progressType = 'questions', // 'questions' | 'wordCount' | 'none'
  wordCount = 0,
  wordCountMin = 0,
  wordCountMax = 400,
  title = null,
  startTime = undefined,
  showHeaderAction = false,
  headerActionLabel = '',
  onHeaderAction,
  headerActionDisabled = false,
  topOffset = 0,
}) {
  const { t } = useTranslation(['test', 'common', 'writing']);

  const renderProgressIndicator = () => {
    if (progressType === 'none') {
      if (!title) return null;
      return (
        <div className={styles.progress} role="status" aria-live="polite">
          <span className={styles.progressText} title={title}>
            {title}
          </span>
        </div>
      );
    }

    if (progressType === 'wordCount') {
      return (
        <div className={styles.progress} role="status" aria-live="polite">
          <span className={styles.progressText}>
            {t('writing:wordCount', { defaultValue: 'Word count' })}: {wordCount} / {wordCountMin} - {wordCountMax}
          </span>
        </div>
      );
    }

    return (
      <div className={styles.progress} role="status" aria-live="polite">
        <span className={styles.progressText}>
          {t('test:adaptive.question', 'Question')} {currentQuestion} / ~{estimatedTotal}
        </span>
      </div>
    );
  };

  const timerStartTime = startTime;
  const shouldRenderTimer = Boolean(onTimeUp) || Number(timerDuration) > 0;

  return (
    <nav
      className={styles.simpleNavbar}
      role="navigation"
      aria-label={t('test:navigation.testNavigation', 'Test navigation')}
      style={{ top: `${topOffset}px` }}
    >
      <div className={styles.container}>
        <div className={styles.logo}>
          <Link href="/" aria-label={t('common:nav.home', 'Home')}>
            <span className={`${styles.logoText} ${styles.desktopLogo}`}>IELTS Practice</span>
            <span className={`${styles.logoText} ${styles.mobileLogo}`}>IELTS</span>
          </Link>
        </div>

        {renderProgressIndicator()}

        <div className={styles.rightControls}>
          {showHeaderAction && (
            <button
              type="button"
              className={styles.headerActionButton}
              onClick={onHeaderAction}
              disabled={headerActionDisabled}
            >
              {headerActionLabel || t('submit', { ns: 'common', defaultValue: 'Submit' })}
            </button>
          )}

          {shouldRenderTimer && (
            <div className={styles.timerWrapper}>
              <Timer
                durationInMinutes={timerDuration}
                onTimeUp={onTimeUp}
                isActive={isTimerActive}
                startTime={timerStartTime}
              />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

