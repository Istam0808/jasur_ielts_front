"use client"

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import Timer from '@/components/common/Timer';
import styles from './style.module.scss';

/**
 * TestNavbar - Minimal navbar for testing environments with professional Timer
 * @param {Object} props
 * @param {number} props.currentQuestion - Current question number
 * @param {number} props.estimatedTotal - Estimated total questions
 * @param {number} props.timerDuration - Timer duration in minutes
 * @param {Function} props.onTimeUp - Callback when timer reaches zero
 * @param {boolean} props.isTimerActive - Whether timer is counting down
 * @param {string} props.progressType - Type of progress indicator: 'questions' | 'wordCount' | 'none' (default: 'questions')
 * @param {number} props.wordCount - Current word count (for wordCount progress type)
 * @param {number} props.wordCountMin - Minimum required word count (for wordCount progress type)
 * @param {number} props.wordCountMax - Maximum word limit (for wordCount progress type, default: 400)
 * @param {string} props.title - Optional title to display (for none progress type)
 * @param {number} props.startTime - Start time for timer (timestamp in ms) - used as single source of truth
 * @param {boolean} props.showHeaderAction - Show action button in header
 * @param {string} props.headerActionLabel - Header action button label
 * @param {Function} props.onHeaderAction - Header action handler
 * @param {boolean} props.headerActionDisabled - Header action disabled state
 * @param {number} props.topOffset - Sticky top offset in pixels
 */
export default function TestNavbar({
  currentQuestion = 0,
  estimatedTotal = 0,
  timerDuration = 30,
  onTimeUp,
  isTimerActive = false,
  progressType = 'questions',
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
      if (title) {
        return (
          <div className={styles.progress} role="status" aria-live="polite">
            <span className={styles.progressText} title={title}>
              {title}
            </span>
          </div>
        );
      }
      return null;
    }

    if (progressType === 'wordCount') {
      return null;
    }

    return (
      <div className={styles.progress} role="status" aria-live="polite">
        <span className={styles.progressText}>
          {t('test:adaptive.question', 'Question')} {currentQuestion} / ~{estimatedTotal}
        </span>
      </div>
    );
  };

  // Use startTime directly as the single source of truth
  const timerStartTime = startTime;

  return (
    <nav
      className={styles.testNavbar}
      role="navigation"
      aria-label={t('test:navigation.testNavigation', 'Test navigation')}
      style={{ top: `${topOffset}px` }}
    >
      <div className={styles.container}>
        {/* Logo (text-based, no image assets) */}
        <div className={styles.logo}>
          <Link href="/" aria-label={t('common:nav.home', 'Home')}>
            <span className={`${styles.logoImage} ${styles.desktopLogo} ${styles.logoText}`}>IELTS Practice</span>
            <span className={`${styles.logoImage} ${styles.mobileLogo} ${styles.logoText}`}>IELTS</span>
          </Link>
        </div>

        {/* Progress Indicator - Flexible based on progressType */}
        {renderProgressIndicator()}

        {/* Right Controls: Timer */}
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

          {/* Professional Timer */}
          <div className={styles.timerWrapper}>
            <Timer
              durationInMinutes={timerDuration}
              onTimeUp={onTimeUp}
              isActive={isTimerActive}
              startTime={timerStartTime}
            />
          </div>

        </div>
      </div>
    </nav>
  );
}

