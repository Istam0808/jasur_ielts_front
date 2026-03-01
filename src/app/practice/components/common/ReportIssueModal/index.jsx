'use client';

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/common/Modal';
import * as Icons from 'react-icons/fi';
import styles from './reportIssueModal.module.scss';

const ReportIssueModal = ({ isOpen, onClose, context = {} }) => {
    const { t } = useTranslation('reportIssue');
    const [formData, setFormData] = useState({
        issueType: '',
        subject: '',
        description: '',
        priority: 'medium',
        email: '',
        includeScreenshot: false,
        reportId: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [errors, setErrors] = useState({});
    const textareaRef = useRef(null);

    const issueTypes = [
        { value: 'bug', label: t('issueTypes.bug'), icon: Icons.FiAlertOctagon, color: '#ef4444' },
        { value: 'content', label: t('issueTypes.content'), icon: Icons.FiFileText, color: '#f59e0b' },
        { value: 'typo', label: t('issueTypes.typo'), icon: Icons.FiEdit3, color: '#8b5cf6' },
        { value: 'ui', label: t('issueTypes.ui'), icon: Icons.FiLayout, color: '#3b82f6' },
        { value: 'performance', label: t('issueTypes.performance'), icon: Icons.FiZap, color: '#10b981' },
        { value: 'other', label: t('issueTypes.other'), icon: Icons.FiMoreHorizontal, color: '#6b7280' }
    ];

    const priorityLevels = [
        { value: 'low', label: t('priorityLevels.low'), icon: Icons.FiArrowDown, color: '#10b981' },
        { value: 'medium', label: t('priorityLevels.medium'), icon: Icons.FiMinus, color: '#f59e0b' },
        { value: 'high', label: t('priorityLevels.high'), icon: Icons.FiArrowUp, color: '#ef4444' }
    ];

    if (!isOpen) return null;

    const validateForm = () => {
        const newErrors = {};

        if (!formData.issueType) {
            newErrors.issueType = t('validation.selectIssueType');
        }

        if (!formData.subject.trim()) {
            newErrors.subject = t('validation.subjectRequired');
        } else if (formData.subject.trim().length < 5) {
            newErrors.subject = t('validation.subjectMinLength');
        }

        if (!formData.description.trim()) {
            newErrors.description = t('validation.descriptionRequired');
        } else if (formData.description.trim().length < 20) {
            newErrors.description = t('validation.descriptionMinLength');
        }

        if (formData.email && !isValidEmail(formData.email)) {
            newErrors.email = t('validation.invalidEmail');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Prepare issue report data
            const reportData = {
                ...formData,
                context: {
                    page: context.page || window.location.pathname,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                    ...context
                }
            };

            // Call API endpoint
            const response = await fetch('/api/report-issue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reportData)
            });

      const result = await response.json();

      if (!response.ok) {
        // Handle rate limiting (429 status)
        if (response.status === 429) {
          throw new Error(t('validation.dailyLimitReached', { limit: result.limit || 2 }));
        }
        throw new Error(result.error || t('validation.submitError'));
      }

      // Set success state with report ID from server
      setFormData(prev => ({ ...prev, reportId: result.reportId }));
      setSubmitSuccess(true);

    } catch (error) {
      console.error('Error submitting report:', error);
      setErrors({ 
        submit: error.message || t('validation.submitError')
      });
    } finally {
      setIsSubmitting(false);
    }
    };

    const handleClose = () => {
        setFormData({
            issueType: '',
            subject: '',
            description: '',
            priority: 'medium',
            email: '',
            includeScreenshot: false,
            reportId: ''
        });
        setErrors({});
        setSubmitSuccess(false);
        setIsSubmitting(false);
        onClose();
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    if (submitSuccess) {
        return (
            <Modal
                onClose={handleClose}
                title={t('success.title')}
                closeOnClickOutside={true}
                closeOnEscape={true}
                padding={true}
            >
                <div className={styles.successContent}>
                    <div className={styles.successIcon}>
                        <Icons.FiCheckCircle />
                    </div>
                    <h3 className={styles.successTitle}>{t('success.thankYou')}</h3>
                    <p className={styles.successMessage}>
                        {t('success.message')}
                    </p>
                    <div className={styles.successDetails}>
                        <Icons.FiInfo />
                        <span>{t('success.reportId')} {formData.reportId || 'N/A'}</span>
                    </div>
                    <button className={styles.successButton} onClick={handleClose}>
                        <Icons.FiCheck />
                        <span>{t('success.gotIt')}</span>
                    </button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            onClose={handleClose}
            closeOnClickOutside={true}
            closeOnEscape={true}
            padding={false}
        >
            <div className={styles.reportContent}>
                {/* Header */}
                <div className={styles.headerSection}>
                    <div className={styles.headerBadge}>
                        <Icons.FiFlag />
                        <span>{t('issueReporting')}</span>
                    </div>
                    <p className={styles.headerDescription}>
                        {t('headerDescription')}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className={styles.reportForm}>
                    {/* Issue Type Selection */}
                    <div className={styles.formSection}>
                        <label className={styles.formLabel}>
                            <Icons.FiAlertCircle />
                            {t('labels.issueType')}
                            <span className={styles.required}>{t('required')}</span>
                        </label>
                        <div className={styles.issueTypeGrid}>
                            {issueTypes.map((type) => {
                                const Icon = type.icon;
                                return (
                                    <button
                                        key={type.value}
                                        type="button"
                                        className={`${styles.issueTypeCard} ${formData.issueType === type.value ? styles.selected : ''}`}
                                        onClick={() => handleInputChange('issueType', type.value)}
                                        style={{
                                            ['--type-color']: type.color
                                        }}
                                    >
                                        <div className={styles.typeIcon}>{Icon && <Icon />}</div>
                                        <span className={styles.typeLabel}>{type.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {errors.issueType && (
                            <span className={styles.errorMessage}>
                                <Icons.FiAlertTriangle />
                                {errors.issueType}
                            </span>
                        )}
                    </div>

                    {/* Subject */}
                    <div className={styles.formSection}>
                        <label className={styles.formLabel} htmlFor="issue-subject">
                            <Icons.FiEdit2 />
                            {t('labels.subject')}
                            <span className={styles.required}>{t('required')}</span>
                        </label>
                        <input
                            id="issue-subject"
                            type="text"
                            className={`${styles.formInput} ${errors.subject ? styles.hasError : ''}`}
                            placeholder={t('placeholders.subject')}
                            value={formData.subject}
                            onChange={(e) => handleInputChange('subject', e.target.value)}
                            maxLength={100}
                        />
                        <div className={styles.inputFooter}>
                            {errors.subject && (
                                <span className={styles.errorMessage}>
                                    <Icons.FiAlertTriangle />
                                    {errors.subject}
                                </span>
                            )}
                            <span className={styles.charCount}>{formData.subject.length}/100</span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className={styles.formSection}>
                        <label className={styles.formLabel} htmlFor="issue-description">
                            <Icons.FiFileText />
                            {t('labels.description')}
                            <span className={styles.required}>{t('required')}</span>
                        </label>
                        <textarea
                            id="issue-description"
                            ref={textareaRef}
                            className={`${styles.formTextarea} ${errors.description ? styles.hasError : ''}`}
                            placeholder={t('placeholders.description')}
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            rows={6}
                            maxLength={1000}
                        />
                        <div className={styles.inputFooter}>
                            {errors.description && (
                                <span className={styles.errorMessage}>
                                    <Icons.FiAlertTriangle />
                                    {errors.description}
                                </span>
                            )}
                            <span className={styles.charCount}>{formData.description.length}/1000</span>
                        </div>
                    </div>

                    {/* Priority */}
                    <div className={styles.formSection}>
                        <label className={styles.formLabel}>
                            <Icons.FiBarChart2 />
                            {t('labels.priorityLevel')}
                        </label>
                        <div className={styles.priorityGroup}>
                            {priorityLevels.map((level) => {
                                const Icon = level.icon;
                                return (
                                    <button
                                        key={level.value}
                                        type="button"
                                        className={`${styles.priorityButton} ${formData.priority === level.value ? styles.selected : ''}`}
                                        onClick={() => handleInputChange('priority', level.value)}
                                        style={{
                                            ['--priority-color']: level.color
                                        }}
                                    >
                                        {Icon && <Icon />}
                                        <span>{level.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Email (Optional) */}
                    <div className={styles.formSection}>
                        <label className={styles.formLabel} htmlFor="issue-email">
                            <Icons.FiMail />
                            {t('labels.emailOptional')}
                        </label>
                        <input
                            id="issue-email"
                            type="email"
                            className={`${styles.formInput} ${errors.email ? styles.hasError : ''}`}
                            placeholder={t('placeholders.email')}
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                        />
                        {errors.email && (
                            <span className={styles.errorMessage}>
                                <Icons.FiAlertTriangle />
                                {errors.email}
                            </span>
                        )}
                        <p className={styles.helperText}>
                            {t('helperText.emailUpdate')}
                        </p>
                    </div>

                    {/* Submit Error */}
                    {errors.submit && (
                        <div className={styles.submitError}>
                            <Icons.FiXCircle />
                            <span>{errors.submit}</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className={styles.actionButtons}>
                        <button
                            type="button"
                            className={styles.cancelButton}
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            <Icons.FiX />
                            <span>{t('buttons.cancel')}</span>
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className={styles.spinner} />
                                    <span>{t('buttons.submitting')}</span>
                                </>
                            ) : (
                                <>
                                    <Icons.FiSend />
                                    <span>{t('buttons.submit')}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

          {/* Footer Note */}
          <div className={styles.footerNote}>
            <div className={styles.footerContent}>
              <h4 className={styles.footerTitle}>
                <div className={styles.footerIcon}>
                  <Icons.FiShield />
                </div>
                <span>{t('footer.privacyTitle')}</span>
              </h4>
              <p className={styles.footerText}>
                {t('footer.privacyText')}
              </p>
            </div>
          </div>
            </div>
        </Modal>
    );
};

export default ReportIssueModal;

