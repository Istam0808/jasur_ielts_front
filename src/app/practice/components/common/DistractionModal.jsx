"use client"
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/common/Modal';

export default function DistractionModal({ 
  isOpen, 
  reason, 
  onContinue, 
  onClose 
}) {
  const { t } = useTranslation('common');

  const handleContinue = useCallback(() => {
    if (onContinue) onContinue();
    if (onClose) onClose();
  }, [onContinue, onClose]);

  if (!isOpen) return null;

  const title = t('learning.sessionPausedTitle');
  const description = reason === 'inactivity'
    ? t('learning.pausedDueToInactivity')
    : t('learning.pausedDueToBlur');

  return (
    <Modal
      onClose={handleContinue}
      title={title}
      description={description}
      closeOnClickOutside={false}
      closeOnEscape={false}
      buttons={[{
        text: t('learning.continuePractice'),
        className: 'primary-button',
        onClick: handleContinue
      }]}
    />
  );
}
