import { forwardRef } from 'react';
import { MdInfo } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import './TestInput.scss';

/**
 * Secure input component for test-taking
 * Disables all keyboard helpers and browser assistance for test integrity
 * 
 * @param {Object} props
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {Function} props.onKeyDown - Keydown handler
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.ariaLabel - ARIA label for accessibility
 * @param {string} props.ariaDescribedby - ARIA describedby for accessibility
 * @param {boolean} props.disableHelpers - Whether to disable keyboard helpers (default: true)
 * @param {boolean} props.disableContextMenu - Whether to disable right-click (default: true)
 * @param {boolean} props.disablePaste - Whether to disable paste (default: true)
 * @param {boolean} props.showIntegrityNotice - Whether to show integrity notice (default: true)
 * @param {string} props.inputMode - HTML inputMode attribute (default: 'text')
 */
const TestInput = forwardRef(({
  value,
  onChange,
  onKeyDown,
  placeholder,
  ariaLabel,
  ariaDescribedby,
  disableHelpers = true,
  disableContextMenu = true,
  disablePaste = true,
  showIntegrityNotice = true,
  inputMode = 'text',
  className = '',
  ...props
}, ref) => {
  const { t } = useTranslation('test');

  // Test integrity attributes
  const testIntegrityProps = disableHelpers ? {
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
    'data-form-type': 'other',
    'data-lpignore': 'true',
    'data-gramm': 'false',
    'data-gramm_editor': 'false',
    'data-enable-grammarly': 'false',
    inputMode: inputMode
  } : {};

  // Disable paste handler
  const handlePaste = (e) => {
    if (disablePaste) {
      e.preventDefault();
      console.log('Paste disabled for test integrity');
    }
  };

  // Disable copy handler
  const handleCopy = (e) => {
    if (disablePaste) {
      e.preventDefault();
      console.log('Copy disabled for test integrity');
    }
  };

  // Disable context menu (right-click)
  const handleContextMenu = (e) => {
    if (disableContextMenu) {
      e.preventDefault();
    }
  };

  return (
    <div className="test-input-container">
      <input
        ref={ref}
        type="text"
        className={`test-input ${className}`}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onPaste={handlePaste}
        onCopy={handleCopy}
        onCut={handlePaste}
        onContextMenu={handleContextMenu}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        {...testIntegrityProps}
        {...props}
      />
      
      {showIntegrityNotice && (
        <small className="test-integrity-notice">
          <MdInfo className="notice-icon" aria-hidden="true" />
          {t('keyboardHelpersDisabled', 'Autocorrect and spell check are disabled for test accuracy')}
        </small>
      )}
    </div>
  );
});

TestInput.displayName = 'TestInput';

export default TestInput;

