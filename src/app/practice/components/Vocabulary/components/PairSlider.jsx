import React, { memo, useState, useEffect, useRef } from 'react';
import './styles/PairSlider.scss';

// Memoized PairSlider component
const PairSlider = memo(function PairSlider({ value, min, max, onFinalChange, minLabel, maxLabel, tooltip }) {
    const [internalValue, setInternalValue] = useState(value);
    const sliderRef = useRef(null);

    // Sync with parent when modal opens or value changes
    useEffect(() => {
        setInternalValue(value);
    }, [value]);

    // Update progress fill effect
    useEffect(() => {
        if (sliderRef.current) {
            const progress = ((internalValue - min) / (max - min)) * 100;
            sliderRef.current.style.setProperty('--slider-progress', `${progress}%`);
        }
    }, [internalValue, min, max]);

    // Call onFinalChange only when user releases the slider
    const handleChange = (e) => {
        const newValue = Number(e.target.value);
        setInternalValue(newValue);
    };
    
    const handleCommit = () => onFinalChange(internalValue);

    return (
        <div className="pair-slider">
            <div className="slider-container">
                <div className="slider-value-display">
                    <span className="current-value">{internalValue}</span>
                </div>
                <input
                    ref={sliderRef}
                    type="range"
                    min={min}
                    max={max}
                    value={internalValue}
                    onChange={handleChange}
                    onMouseUp={handleCommit}
                    onTouchEnd={handleCommit}
                    className="pairs-slider"
                    title={tooltip}
                    style={{
                        '--slider-progress': `${((internalValue - min) / (max - min)) * 100}%`
                    }}
                />
                <div className="slider-labels">
                    <span className="slider-min">{minLabel}</span>
                    <span className="slider-max">{maxLabel}</span>
                </div>
            </div>
        </div>
    );
});

export default PairSlider; 