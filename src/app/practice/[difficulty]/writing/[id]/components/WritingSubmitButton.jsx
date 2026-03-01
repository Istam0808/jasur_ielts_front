'use client';

import { MdRefresh } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import AIButton from '@/components/common/AIButton';

/**
 * Unified submit button component that eliminates code duplication
 * Handles desktop, mobile, and placement test variants
 */
export default function WritingSubmitButton({
  onSubmit,
  isSubmitting,
  hasSubmitted,
  wordCount,
  maxWords = 400,
  minWords = 0,
  variant = 'desktop', // 'desktop', 'mobile', or 'placement'
  submitError,
  retryCount = 0,
  onRetry,
  onRewrite,
  isPlacementTest = false
}) {
  const { t } = useTranslation(['writing', 'common']);

  const isDisabled = 
    isSubmitting || 
    hasSubmitted || 
    wordCount === 0 ||
    (minWords > 0 && wordCount < minWords) ||
    wordCount > maxWords ||
    (submitError && submitError.isValidationError === true);

  const getButtonText = () => {
    if (wordCount > maxWords) {
      return t('exceedsMaxWords', { ns: 'writing', defaultValue: 'Exceeds 400 word limit' });
    }
    if (isSubmitting) {
      return t('submitting', { ns: 'writing', defaultValue: 'Submitting...' });
    }
    if (isPlacementTest || variant === 'placement') {
      return t('submit', { ns: 'common', defaultValue: 'Submit' });
    }
    return t('checkMyEssay', { ns: 'writing', defaultValue: 'Check my essay' });
  };

  return (
    <div className={variant === 'placement' ? 'placement-submit-section' : 'submit-section'}>
      <AIButton
        onClick={onSubmit}
        disabled={isDisabled}
        type="button"
        aria-label={getButtonText()}
        aria-busy={isSubmitting}
      >
        {getButtonText()}
      </AIButton>

      {/* Show retry button if there's a retryable error */}
      {submitError && submitError.canRetry && !isSubmitting && !hasSubmitted && onRetry && (
        <button
          className="btn btn-secondary btn-retry"
          onClick={onRetry}
          type="button"
          aria-label={t('retry', { ns: 'writing', defaultValue: 'Retry' })}
        >
          {t('retry', { ns: 'writing', defaultValue: 'Retry' })} {retryCount > 0 && `(${retryCount + 1})`}
        </button>
      )}

      {/* Show re-write button if there's a validation error */}
      {submitError && submitError.isValidationError === true && !isSubmitting && !hasSubmitted && onRewrite && (
        <button
          className="btn btn-rewrite"
          onClick={onRewrite}
          type="button"
          aria-label={t('rewriteResponse', { ns: 'writing', defaultValue: 'Clear & Re-write' })}
        >
          <MdRefresh />
          {t('rewriteResponse', { ns: 'writing', defaultValue: 'Clear & Re-write' })}
        </button>
      )}

      {/* Error message display */}
      {submitError && (
        <div className="submit-error" role="alert" aria-live="polite">
          <p>
            <strong>{t('errorOccurred', { ns: 'writing', defaultValue: 'Error occurred:' })}</strong>{' '}
            {submitError.message}
          </p>
          {submitError.code === 'TIMEOUT' && (
            <p className="error-tip">
              {t('timeoutTip', {
                ns: 'writing',
                defaultValue: 'Tip: Try shortening your response or check your internet connection.'
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}