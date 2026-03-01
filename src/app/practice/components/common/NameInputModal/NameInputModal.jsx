'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import useScrollLock from '@/hooks/useScrollLock';
import { useFocusTrap } from '@/hooks/useKeyboardNavigation';
import './name-input-modal.scss';

export default function NameInputModal({ isOpen, onClose, onConfirm }) {
  const { t } = useTranslation(['common', 'test']);
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Lock scroll when modal is open
  useScrollLock(isOpen && mounted && !isClosing);

  // Focus trap for accessibility
  const { containerRef } = useFocusTrap({
    isOpen: mounted && !isClosing,
    onClose: handleClose,
    autoFocus: true
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen && mounted && inputRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, mounted]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setError('');
      setIsClosing(false);
    }
  }, [isOpen]);

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      if (onClose) {
        onClose();
      }
      setIsClosing(false);
    }, 300);
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      handleClose();
    } else if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
      event.preventDefault();
      handleConfirm();
    }
  }

  function handleWrapperClick(event) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleConfirm() {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError(t('nameRequired', { ns: 'common' }));
      inputRef.current?.focus();
      return;
    }

    setError('');
    if (onConfirm) {
      onConfirm(trimmedName);
    }
    handleClose();
  }

  function handleNameChange(e) {
    const value = e.target.value;
    setName(value);
    if (error && value.trim()) {
      setError('');
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <section
      className={`name-input-modal-wrapper ${isClosing ? 'closing' : ''}`}
      onClick={handleWrapperClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-input-modal-title"
      aria-describedby="name-input-modal-description"
    >
      <span
        id="close-name-input-modal"
        onClick={handleClose}
        ref={closeButtonRef}
        role="button"
        tabIndex={0}
        aria-label={t('close')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClose();
          }
        }}
      >
        <FiX aria-hidden="true" />
      </span>
      <div className="name-input-modal-content" ref={containerRef}>
        <h1 id="name-input-modal-title" className="name-input-modal-title">
          {t('enterFullName', { ns: 'common' })}
        </h1>
        <p id="name-input-modal-description" className="name-input-modal-description">
          {t('enterFullNameDescription', { ns: 'common' })}
        </p>
        <div className="name-input-form">
          <div className="input-group">
            <label htmlFor="full-name-input" className="input-label">
              {t('fullName', { ns: 'common' })}
            </label>
            <input
              id="full-name-input"
              ref={inputRef}
              type="text"
              className={`name-input ${error ? 'error' : ''}`}
              value={name}
              onChange={handleNameChange}
              placeholder={t('fullNamePlaceholder', { ns: 'common' })}
              aria-invalid={!!error}
              aria-describedby={error ? 'name-error' : undefined}
              maxLength={100}
            />
            {error && (
              <div id="name-error" className="error-message" role="alert">
                {error}
              </div>
            )}
          </div>
          <div className="modal-buttons">
            <button
              type="button"
              className="cancel-button"
              onClick={handleClose}
              aria-label={t('cancel')}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              className="confirm-button"
              onClick={handleConfirm}
              aria-label={t('confirm', { ns: 'common' })}
            >
              {t('confirm', { ns: 'common' })}
            </button>
          </div>
        </div>
      </div>
    </section>
  );

  return createPortal(modalContent, document.body);
}
