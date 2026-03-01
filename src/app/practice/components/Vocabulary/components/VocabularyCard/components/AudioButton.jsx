import { memo } from 'react';
import { FaVolumeUp } from 'react-icons/fa';

// Memoized AudioButton component
const AudioButton = memo(({ onClick, className = '', title, isPlaying = false, disabled = false, ...props }) => (
    <button
        className={`audio-btn ${isPlaying ? 'playing' : ''} ${className}`}
        onClick={onClick}
        title={title}
        type="button"
        disabled={disabled}
        {...props}
    >
        <FaVolumeUp />
        {isPlaying && (
            <div className="audio-pulse">
                <span></span>
                <span></span>
                <span></span>
            </div>
        )}
    </button>
));

AudioButton.displayName = 'AudioButton';

export default AudioButton; 