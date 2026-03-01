'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MdTimer } from 'react-icons/md';
import '@/assets/styles/components/placement-test/_unified.scss';

export default function ContinuousTestTimer({
  totalMinutes,
  timeRemaining, // in seconds
  onTimeUp,
  isActive,
  currentSection,
  showWarnings = true
}) {
  const { t } = useTranslation(['test', 'common']);
  const [warningsShown, setWarningsShown] = useState({
    tenMinutes: false,
    fiveMinutes: false,
    oneMinute: false
  });
  const liveRegionRef = useRef(null);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Get section name for display
  const getSectionName = (section) => {
    const sectionMap = {
      grammar: t('section.grammar', 'Grammar', { ns: 'test' }),
      reading: t('section.reading', 'Reading', { ns: 'test' }),
      writing: t('section.writing', 'Writing', { ns: 'test' })
    };
    return sectionMap[section] || section;
  };

  // Check for warnings
  useEffect(() => {
    if (!isActive || !showWarnings || !timeRemaining) return;

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    // 10 minutes warning
    if (timeRemaining <= 600 && timeRemaining > 599 && !warningsShown.tenMinutes) {
      const message = t('timer.warning.tenMinutes', '10 minutes remaining', { ns: 'test' });
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = message;
      }
      // Show browser notification if permitted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(t('timer.warning', 'Time Warning', { ns: 'test' }), { body: message });
      }
      setWarningsShown(prev => ({ ...prev, tenMinutes: true }));
    }

    // 5 minutes warning
    if (timeRemaining <= 300 && timeRemaining > 299 && !warningsShown.fiveMinutes) {
      const message = t('timer.warning.fiveMinutes', '5 minutes remaining', { ns: 'test' });
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = message;
      }
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(t('timer.warning', 'Time Warning', { ns: 'test' }), { body: message });
      }
      setWarningsShown(prev => ({ ...prev, fiveMinutes: true }));
    }

    // 1 minute warning
    if (timeRemaining <= 60 && timeRemaining > 59 && !warningsShown.oneMinute) {
      const message = t('timer.warning.oneMinute', '1 minute remaining', { ns: 'test' });
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = message;
      }
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(t('timer.warning', 'Time Warning', { ns: 'test' }), { body: message });
      }
      setWarningsShown(prev => ({ ...prev, oneMinute: true }));
    }

    // Time up
    if (timeRemaining <= 0 && isActive) {
      onTimeUp?.();
    }
  }, [timeRemaining, isActive, showWarnings, warningsShown, onTimeUp, t]);

  // Get urgency class based on remaining time
  const getUrgencyClass = () => {
    if (!timeRemaining) return 'urgent';
    const minutes = Math.floor(timeRemaining / 60);
    if (minutes <= 1) return 'urgent';
    if (minutes <= 5) return 'warning';
    if (minutes <= 10) return 'caution';
    return 'normal';
  };

  if (!isActive) return null;

  return (
    <>
      {/* Screen reader live region */}
      <div
        ref={liveRegionRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
      
      <div className={`continuous-test-timer ${getUrgencyClass()}`}>
        <MdTimer className="timer-icon" aria-hidden="true" />
        <span className="timer-time" aria-label={t('timer.remaining', 'Time remaining: {{time}}', { time: formatTime(timeRemaining), ns: 'test' })}>
          {formatTime(timeRemaining)}
        </span>
        {currentSection && (
          <span className="timer-section" aria-label={t('timer.currentSection', 'Current section: {{section}}', { section: getSectionName(currentSection), ns: 'test' })}>
            {getSectionName(currentSection)}
          </span>
        )}
      </div>
    </>
  );
}
