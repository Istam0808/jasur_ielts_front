"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaShare, FaArrowLeft, FaCheckCircle, FaClock, FaMicrophone, FaTrophy, FaChartLine, FaFileAudio, FaBookOpen, FaStar } from 'react-icons/fa';
import { scrollToTop } from '@/utils/common';
import '../styles/ExamResults.scss';

const ExamResults = ({ topic, examState, audioBlob, recordingDuration, onBackToTopics, onBackToMain, onClearAllContext }) => {
  const { t } = useTranslation('speaking');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPartsCompleted = () => {
    // Use the partsCompleted array from examState if available, otherwise fallback to the old logic
    if (examState.partsCompleted && examState.partsCompleted.length > 0) {
      return examState.partsCompleted;
    }
    
    // Fallback logic
    const parts = [];
    if (examState.questionsCompleted.length > 0) parts.push('Part 1');
    if (examState.currentPart >= 2) parts.push('Part 2');
    if (examState.currentPart >= 3) parts.push('Part 3');
    return parts;
  };

  const handleDownload = async () => {
    if (!audioBlob) return;

    setIsDownloading(true);
    try {
      const url = URL.createObjectURL(audioBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ielts-speaking-${topic.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!audioBlob) return;

    setIsSharing(true);
    try {
      const fileName = `IELTS-Speaking-${topic.title.replace(/[^a-zA-Z0-9]/g, '-')}.webm`;
      const file = new File([audioBlob], fileName, { type: 'audio/webm' });
      
      // Check if Web Share API is supported
      if (navigator.share && navigator.canShare) {
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `IELTS Speaking Practice - ${topic.title}`,
            text: `Check out my IELTS speaking practice recording! Duration: ${formatDuration(examState.totalTimeSpent || recordingDuration)}`,
            files: [file]
          });
        } else {
          // Fallback to URL sharing if file sharing not supported
          await navigator.share({
            title: `IELTS Speaking Practice - ${topic.title}`,
            text: `Check out my IELTS speaking practice recording! Duration: ${formatDuration(examState.totalTimeSpent || recordingDuration)}`,
            url: window.location.href
          });
        }
      } else {
        // Fallback: auto-download the file
        const url = URL.createObjectURL(audioBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        // Fallback: auto-download the file
        const fileName = `IELTS-Speaking-${topic.title.replace(/[^a-zA-Z0-9]/g, '-')}.webm`;
        const url = URL.createObjectURL(audioBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsSharing(false);
    }
  };



  const getPerformanceNotes = () => {
    const notes = [];
    
    // Check if all questions were completed
    if (examState.questionsCompleted.length === examState.totalQuestions) {
      notes.push(t('results.completedAll', 'Completed all questions successfully'));
    }
    
    // Check if recording is available
    if (examState.recordingAvailable || audioBlob) {
      notes.push(t('results.recordingAvailable', 'Full session recording available'));
    }
    
    // Check which parts were completed
    const partsCompleted = getPartsCompleted();
    if (partsCompleted.includes('Part 2')) {
      notes.push(t('results.cueCardCompleted', 'Cue card presentation completed'));
    }
    
    if (partsCompleted.includes('Part 3')) {
      notes.push(t('results.discussionCompleted', 'Discussion section completed'));
    }

    // Add exam completion note
    if (examState.examCompleted) {
      notes.push(t('results.examCompleted', 'Exam session completed successfully'));
    }

    return notes;
  };

  const handleBackToTopics = () => {
    scrollToTop();
    // Clear all speaking exam context before navigating
    if (onClearAllContext) {
      onClearAllContext();
    }
    onBackToTopics();
  };

  const handleBackToMain = () => {
    scrollToTop();
    // Clear all speaking exam context before navigating
    if (onClearAllContext) {
      onClearAllContext();
    }
    onBackToMain();
  };

  return (
    <div className="exam-results">
      <div className="exam-results-container">
        {/* Hero Section */}
        <section className="exam-results-hero">
          {/* Back Button positioned at top-left */}
          <button onClick={handleBackToMain} className="exam-results-back-btn">
            <FaArrowLeft />
            <span>{t('results.back', 'Back')}</span>
          </button>
          
          <div className="exam-results-badge">
            <FaTrophy />
            <span>{t('results.completed', 'Exam Completed')}</span>
          </div>
          <h1 className="exam-results-title">
            {t('results.congratulations', 'Congratulations!')}
          </h1>
          <p className="exam-results-subtitle">
            {t('results.subtitle', 'You have successfully completed your IELTS Speaking practice session')}
          </p>
        </section>

        {/* Score Overview */}
        <section className="exam-results-overview">
          <div className="exam-results-score-card">
            <div className="exam-results-score-header">
              <FaChartLine />
              <h2>{t('results.scoreOverview', 'Session Overview')}</h2>
            </div>
            <div className="exam-results-score-grid">
              <div className="exam-results-score-item">
                <div className="exam-results-score-icon">
                  <FaBookOpen />
                </div>
                <div className="exam-results-score-content">
                  <span className="exam-results-score-label">{t('results.topic', 'Topic')}</span>
                  <span className="exam-results-score-value">{topic.title}</span>
                </div>
              </div>
              
              <div className="exam-results-score-item">
                <div className="exam-results-score-icon">
                  <FaClock />
                </div>
                <div className="exam-results-score-content">
                  <span className="exam-results-score-label">{t('results.duration', 'Duration')}</span>
                  <span className="exam-results-score-value">{formatDuration(examState.totalTimeSpent || recordingDuration)}</span>
                </div>
              </div>
              
              <div className="exam-results-score-item">
                <div className="exam-results-score-icon">
                  <FaMicrophone />
                </div>
                <div className="exam-results-score-content">
                  <span className="exam-results-score-label">{t('results.partsCompleted', 'Parts')}</span>
                  <span className="exam-results-score-value">{getPartsCompleted().length}/3</span>
                </div>
              </div>
              
              <div className="exam-results-score-item">
                <div className="exam-results-score-icon">
                  <FaStar />
                </div>
                <div className="exam-results-score-content">
                  <span className="exam-results-score-label">{t('results.questions', 'Questions')}</span>
                  <span className="exam-results-score-value">{examState.questionsCompleted.length}/{examState.totalQuestions}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Performance Summary */}
        <section className="exam-results-performance">
          <div className="exam-results-performance-card">
            <div className="exam-results-performance-header">
              <FaCheckCircle />
              <h2>{t('results.performanceSummary', 'Performance Summary')}</h2>
            </div>
            <div className="exam-results-achievements">
              {getPerformanceNotes().map((note, index) => (
                <div key={index} className="exam-results-achievement">
                  <FaCheckCircle />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recording Actions */}
        {audioBlob && (
          <section className="exam-results-recording">
            <div className="exam-results-recording-card">
              <div className="exam-results-recording-header">
                <FaFileAudio />
                <h2>{t('results.recordingActions', 'Your Recording')}</h2>
              </div>
              <div className="exam-results-recording-actions">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="exam-results-recording-btn exam-results-download-btn"
                >
                  <FaDownload />
                  <span>{isDownloading ? t('results.downloading', 'Downloading...') : t('results.download', 'Download')}</span>
                </button>

                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="exam-results-recording-btn exam-results-share-btn"
                >
                  <FaShare />
                  <span>{isSharing ? t('results.sharing', 'Sharing...') : t('results.share', 'Share')}</span>
                </button>

              </div>
            </div>
          </section>
        )}

        {/* Next Steps */}
        <section className="exam-results-next-steps">
          <div className="exam-results-next-steps-card">
            <h2>{t('results.nextSteps', 'Continue Your Journey')}</h2>
            <div className="exam-results-steps">
              <div className="exam-results-step">
                <div className="exam-results-step-number">1</div>
                <div className="exam-results-step-content">
                  <h3>{t('results.step1Title', 'Review & Reflect')}</h3>
                  <p>{t('results.step1', 'Listen to your recording and identify areas for improvement')}</p>
                </div>
              </div>
              <div className="exam-results-step">
                <div className="exam-results-step-number">2</div>
                <div className="exam-results-step-content">
                  <h3>{t('results.step2Title', 'Practice More')}</h3>
                  <p>{t('results.step2', 'Try different topics to build confidence and fluency')}</p>
                </div>
              </div>
              <div className="exam-results-step">
                <div className="exam-results-step-number">3</div>
                <div className="exam-results-step-content">
                  <h3>{t('results.step3Title', 'Improve Skills')}</h3>
                  <p>{t('results.step3', 'Focus on pronunciation, vocabulary, and speaking techniques')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="exam-results-actions">
          <button
            onClick={handleBackToTopics}
            className="exam-results-action-btn exam-results-primary-btn"
          >
            {t('results.tryAnotherTopic', 'Try Another Topic')}
          </button>
          
          <button
            onClick={handleBackToMain}
            className="exam-results-action-btn exam-results-secondary-btn"
          >
            {t('results.backToSpeaking', 'Back to Practice')}
          </button>
        </section>
      </div>

    </div>
  );
};

export default ExamResults;
