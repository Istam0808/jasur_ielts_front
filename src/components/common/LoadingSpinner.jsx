import Spinner from './spinner';
import './LoadingSpinner.scss';

export default function LoadingSpinner({ variant = 'overlay', message, children, size }) {
  // Support both variant and size props for backward compatibility
  const finalVariant = size === 'sm' ? 'inline-sm' : variant;
  const containerClass = `loading-spinner-container loading-spinner-${finalVariant}`;
  
  // Determine spinner size based on variant
  const spinnerSize = (variant === 'inline' || variant === 'inline-sm') ? 'compact' : 'normal';
  
  return (
    <div className={containerClass}>
      <Spinner size={spinnerSize} />
      {message && <p className="loading-spinner-message">{message}</p>}
      {children}
    </div>
  );
} 