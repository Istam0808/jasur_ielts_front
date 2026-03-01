// Example usage in a Next.js page or component
import React, { useState } from 'react';
import HexagonProgress from '@/components/HexagonProgress';
import '@/components/HexagonProgress.scss';

export default function ExamplePage() {
    const [progress1, setProgress1] = useState(75);
    const [progress2, setProgress2] = useState(60);
    const [progress3, setProgress3] = useState(90);

    return (
        <div style={{
            padding: '50px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '50px'
        }}>
            <h1 style={{ color: 'white', fontSize: '2rem', marginBottom: '30px' }}>
                3D Hexagon Progress Components
            </h1>

            {/* Basic usage with default colors */}
            <HexagonProgress
                progress={progress1}
                size={250}
                title="Loading"
                subtitle="Please wait..."
                animated={true}
                glowEffect={true}
                rotateAnimation={true}
            />

            {/* Custom configuration examples */}
            <div style={{ display: 'flex', gap: '50px', flexWrap: 'wrap', justifyContent: 'center' }}>

                {/* Smaller size with custom animation */}
                <HexagonProgress
                    progress={progress2}
                    size={180}
                    strokeWidth={6}
                    primaryColor="#564FFD"
                    secondaryColor="#FF6636"
                    title="Upload"
                    subtitle="60% Complete"
                    animated={true}
                    animationDuration={3}
                    pulseAnimation={true}
                    rotateAnimation={false}
                />

                {/* Different color scheme */}
                <HexagonProgress
                    progress={progress3}
                    size={180}
                    strokeWidth={8}
                    primaryColor="#00D4FF"
                    secondaryColor="#FF006E"
                    title="Success"
                    subtitle="Task Complete"
                    animated={true}
                    glowEffect={true}
                />

                {/* Minimal version without text */}
                <HexagonProgress
                    progress={45}
                    size={150}
                    strokeWidth={5}
                    primaryColor="#564FFD"
                    secondaryColor="#FF6636"
                    showPercentage={true}
                    animated={true}
                    glowEffect={false}
                    rotateAnimation={false}
                />
            </div>

            {/* Interactive controls */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '30px',
                borderRadius: '15px',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                alignItems: 'center'
            }}>
                <h3 style={{ color: 'white', marginBottom: '10px' }}>Interactive Demo</h3>

                <HexagonProgress
                    progress={progress1}
                    size={200}
                    title="Dynamic"
                    subtitle="Adjust below"
                    animated={true}
                    animationDuration={1}
                />

                <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress1}
                    onChange={(e) => setProgress1(Number(e.target.value))}
                    style={{
                        width: '200px',
                        height: '6px',
                        background: 'linear-gradient(to right, #564FFD, #FF6636)',
                        outline: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                    }}
                />

                <span style={{ color: 'white', fontSize: '14px' }}>
                    Progress: {progress1}%
                </span>
            </div>

            {/* Configuration props reference */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '30px',
                borderRadius: '15px',
                maxWidth: '800px',
                width: '100%'
            }}>
                <h3 style={{ marginBottom: '20px', color: '#333' }}>Available Props</h3>
                <ul style={{ lineHeight: '1.8', color: '#555' }}>
                    <li><strong>progress</strong>: Number (0-100) - Current progress value</li>
                    <li><strong>size</strong>: Number - Size of the hexagon in pixels (default: 200)</li>
                    <li><strong>strokeWidth</strong>: Number - Border thickness (default: 4)</li>
                    <li><strong>primaryColor</strong>: String - Start color of gradient (default: #564FFD)</li>
                    <li><strong>secondaryColor</strong>: String - End color of gradient (default: #FF6636)</li>
                    <li><strong>showPercentage</strong>: Boolean - Show percentage text (default: true)</li>
                    <li><strong>animated</strong>: Boolean - Enable progress animation (default: true)</li>
                    <li><strong>animationDuration</strong>: Number - Animation duration in seconds (default: 2)</li>
                    <li><strong>title</strong>: String - Title text above percentage</li>
                    <li><strong>subtitle</strong>: String - Subtitle text below percentage</li>
                    <li><strong>glowEffect</strong>: Boolean - Enable glow effect (default: true)</li>
                    <li><strong>rotateAnimation</strong>: Boolean - Enable 3D rotation (default: true)</li>
                    <li><strong>pulseAnimation</strong>: Boolean - Enable pulse effect (default: false)</li>
                </ul>
            </div>
        </div>
    );
}