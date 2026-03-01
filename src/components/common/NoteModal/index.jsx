'use client';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IoClose } from 'react-icons/io5';
import { FiBookmark, FiPlus } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import useScrollLock from '@/hooks/useScrollLock';
import './style.scss';

export default function NoteModal({
    isOpen,
    currentSelection,
    pendingNote,
    onCancel,
    onAdd,
    onNoteChange,
    namespace = 'noteModal'
}) {
    const { t } = useTranslation(namespace);

    // Lock scroll when modal is open
    useScrollLock(isOpen);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isOpen) {
                if (e.key === 'Escape') {
                    onCancel();
                } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    onAdd();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel, onAdd]);

    // Don't render if not open or no selection
    if (!isOpen || !currentSelection) {
        return null;
    }

    // Render modal content
    const modalContent = (
        <div className="note-modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
            <div className="note-modal" role="dialog" aria-labelledby="note-modal-title" aria-modal="true">
                <div className="note-modal-header">
                    <div className="header-content">
                        <FiBookmark className="header-icon" />
                        <h3 id="note-modal-title">{t('addNote', 'Add Note')}</h3>
                    </div>
                    <button 
                        className="close-button"
                        onClick={onCancel}
                        aria-label={t('closeModal', 'Close modal')}
                        type="button"
                    >
                        <IoClose />
                    </button>
                </div>
                
                <div className="note-modal-body">
                    <div className="selected-text-section">
                        <label className="section-label">
                            {t('selectedText', 'Selected Text')}
                        </label>
                        <div className="selected-text-content">
                            <span className="quote-mark">"</span>
                            <span className="selected-text">{currentSelection.text}</span>
                            <span className="quote-mark">"</span>
                        </div>
                    </div>
                    
                    <div className="note-input-section">
                        <label htmlFor="note-input" className="section-label">
                            {t('noteLabel', 'Add your note')} 
                            <span className="optional-text">({t('optional', 'optional')})</span>
                        </label>
                        <textarea
                            id="note-input"
                            className="note-textarea"
                            value={pendingNote}
                            onChange={(e) => onNoteChange(e.target.value)}
                            placeholder={t('notePlaceholder', 'Enter your note here...')}
                            rows={4}
                            autoFocus
                        />
                        <div className="keyboard-shortcuts">
                            <small>{t('keyboardHint', 'Press Ctrl+Enter to save, Esc to cancel')}</small>
                        </div>
                    </div>
                </div>
                
                <div className="note-modal-footer">
                    <button 
                        className="btn btn-outline"
                        onClick={onCancel}
                        type="button"
                    >
                        {t('cancel', 'Cancel')}
                    </button>
                    <button 
                        className="btn btn-primary"
                        onClick={onAdd}
                        type="button"
                    >
                        <FiPlus />
                        <span>{t('addSelection', 'Add Selection')}</span>
                    </button>
                </div>
            </div>
        </div>
    );

    // Use portal to render at document body level to avoid stacking context issues
    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
} 