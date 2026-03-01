"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaClock, FaEdit, FaEye, FaEyeSlash } from 'react-icons/fa';
import '../styles/CueCard.scss';

const CueCard = ({ 
  cueCard, 
  isPreparing, 
  timeRemaining, 
  formatTime, 
  notes, 
  showNotes, 
  onNotesChange, 
  onToggleNotes 
}) => {
  const { t } = useTranslation('speaking');

  if (!cueCard) return null;

  const getPhaseTitle = () => {
    return isPreparing 
      ? t('cueCard.preparationPhase', 'Preparation Phase')
      : t('cueCard.speakingPhase', 'Speaking Phase');
  };

  const getPhaseDescription = () => {
    return isPreparing
      ? t('cueCard.preparationDescription', 'Take 1 minute to prepare your answer. You can make notes.')
      : t('cueCard.speakingDescription', 'Now speak for 1-2 minutes about the topic. Use your notes if needed.');
  };

  const getTimeColor = () => {
    if (isPreparing) {
      return timeRemaining <= 10 ? '#EF4444' : '#F59E0B';
    } else {
      return timeRemaining <= 30 ? '#EF4444' : '#10B981';
    }
  };

  return (
    <div className="cue-card-container">
      {/* Phase Header */}
      <div className="cue-card-phase-header">
        <div className="cue-card-phase-info">
          <h3 className="cue-card-phase-title">{getPhaseTitle()}</h3>
          <p className="cue-card-phase-description">{getPhaseDescription()}</p>
        </div>
        
        <div className="cue-card-timer-section">
          <div 
            className="cue-card-timer"
            style={{ color: getTimeColor() }}
          >
            <FaClock />
            <span>{formatTime(timeRemaining)}</span>
          </div>
        </div>
      </div>

      {/* Cue Card */}
      <div className="cue-card">
        <div className="cue-card-header">
          <h2 className="cue-card-title">{cueCard.title}</h2>
        </div>

        <div className="cue-card-content">
          {cueCard.description && (
            <p className="cue-card-description">{cueCard.description}</p>
          )}

          <div className="cue-card-points-section">
            <ul className="cue-card-points-list">
              {cueCard.points?.map((point, index) => (
                <li key={index} className="cue-card-point">
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {cueCard.notes && isPreparing && (
            <div className="cue-card-notes-info">
              <p className="cue-card-notes-text">{cueCard.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes Section */}
      {isPreparing && (
        <div className="cue-card-notes-section">
          <div className="cue-card-notes-header">
            <h4 className="cue-card-notes-title">
              <FaEdit />
              {t('cueCard.notesTitle', 'Preparation Notes')}
            </h4>
            <button
              onClick={onToggleNotes}
              className="cue-card-toggle-notes-button"
            >
              {showNotes ? <FaEyeSlash /> : <FaEye />}
              {showNotes ? t('cueCard.hideNotes', 'Hide Notes') : t('cueCard.showNotes', 'Show Notes')}
            </button>
          </div>

          {showNotes && (
            <div className="cue-card-notes-area">
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder={t('cueCard.notesPlaceholder', 'Write your preparation notes here...')}
                className="cue-card-notes-textarea"
                rows={6}
              />
              <div className="cue-card-notes-hint">
                <p>{t('cueCard.notesHint', 'Tip: Write key words and phrases to help you remember what to say.')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Speaking Tips - Only show during preparation phase */}
      {isPreparing && (
        <div className="cue-card-speaking-tips">
          <h4 className="cue-card-tips-title">
            {t('cueCard.speakingTips', 'Speaking Tips')}
          </h4>
          <ul className="cue-card-tips-list">
            <li>{t('cueCard.tip1', 'Speak clearly and at a natural pace')}</li>
            <li>{t('cueCard.tip2', 'Use examples and details to support your points')}</li>
            <li>{t('cueCard.tip3', 'Don\'t worry about perfect grammar - focus on communication')}</li>
            <li>{t('cueCard.tip4', 'If you finish early, you can add more details')}</li>
          </ul>
        </div>
      )}

      {/* Notes Display During Speaking */}
      {!isPreparing && notes && (
        <div className="cue-card-notes-display">
          <div className="cue-card-notes-display-header">
            <h4 className="cue-card-notes-display-title">
              <FaEdit />
              {t('cueCard.yourNotes', 'Your Preparation Notes')}
            </h4>
            <button
              onClick={onToggleNotes}
              className="cue-card-toggle-notes-display-button"
            >
              {showNotes ? <FaEyeSlash /> : <FaEye />}
              {showNotes ? t('cueCard.hideNotes', 'Hide Notes') : t('cueCard.showNotes', 'Show Notes')}
            </button>
          </div>

          {showNotes && (
            <div className="cue-card-notes-display-content">
              <div className="cue-card-notes-display-text">
                {notes}
              </div>
              <div className="cue-card-notes-display-hint">
                <p>{t('cueCard.notesUsageHint', 'Use these notes to help structure your response during speaking.')}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CueCard;
