"use client";

import React from 'react';

const MapLabeling = ({ question, userAnswer, onAnswerChange }) => {
    const handleInputChange = (e) => {
        onAnswerChange(question.number, e.target.value);
    };

    return (
        <div className="question-map-labeling">
            <div className="map-labeling-item">
                <strong className="question-number">{question.number}</strong>
                <div className="map-labeling-content">
                    <p className="question-text selectable-content">{question.text}</p>
                    <div className="map-labeling-input-wrapper">
                        <input
                            type="text"
                            id={`q-${question.number}`}
                            value={userAnswer || ''}
                            onChange={handleInputChange}
                            className="map-labeling-input"
                            placeholder="Type your answer..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapLabeling; 