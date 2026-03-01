import React, { useEffect, useState, useMemo } from "react";
import { useId } from "react";
import "./style.scss";

const HexagonProgress = ({
    progress = 0,
    size = 200,
    strokeWidth = 6,
    primaryColor = "#564FFD",
    secondaryColor = "#FF6636",
    showPercentage = true,
    animated = true,
    animationDuration = 2,
    title = "",
    subtitle = "",
    glowEffect = true,
    rotateAnimation = true,
    pulseAnimation = false
}) => {
    const [currentProgress, setCurrentProgress] = useState(progress);

    // Unique IDs for gradient/filter
    const gradientId = useId();
    const glowId = useId();

    // Hexagon math
    const center = size / 2;
    const radius = (size - strokeWidth) / 2;

    // Generate hexagon path
    const pathString = useMemo(() => {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            points.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
        }
        points.push("Z");
        return points.join(" ");
    }, [center, radius]);

    // Correct perimeter
    const sideLength = radius; // radius = distance from center to corner
    const edge = sideLength * Math.sin(Math.PI / 6) * 2 || radius; // edge length
    const perimeter = 6 * edge;

    // Progress offset
    const dashOffset = perimeter - (perimeter * currentProgress) / 100;

    // Animate value
    useEffect(() => {
        if (!animated) {
            setCurrentProgress(progress);
            return;
        }
        let frame;
        const start = currentProgress;
        const diff = progress - start;
        const startTime = performance.now();

        const animate = (time) => {
            const elapsed = (time - startTime) / (animationDuration * 1000);
            if (elapsed < 1) {
                setCurrentProgress(start + diff * elapsed);
                frame = requestAnimationFrame(animate);
            } else {
                setCurrentProgress(progress);
            }
        };

        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [progress, animated, animationDuration]);

    return (
        <div
            role="progressbar"
            aria-valuenow={Math.round(currentProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            className={`hexagon-progress-container ${rotateAnimation ? "rotate" : ""} ${pulseAnimation ? "pulse" : ""
                }`}
            style={{ width: size, height: size }}
        >
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="hexagon-svg"
            >
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={primaryColor} />
                        <stop offset="100%" stopColor={secondaryColor} />
                    </linearGradient>

                    {glowEffect && (
                        <filter id={glowId}>
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    )}
                </defs>

                {/* Shadow layers */}
                <g className="shadow-group">
                    <path
                        d={pathString}
                        fill="none"
                        stroke="rgba(0,0,0,0.15)"
                        strokeWidth={strokeWidth + 6}
                        transform="translate(3,3)"
                    />
                    <path
                        d={pathString}
                        fill="none"
                        stroke="rgba(0,0,0,0.05)"
                        strokeWidth={strokeWidth + 12}
                        transform="translate(6,6)"
                    />
                </g>

                {/* Background hexagon */}
                <path
                    d={pathString}
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={strokeWidth}
                    className="hexagon-bg"
                />

                {/* Progress hexagon */}
                <path
                    d={pathString}
                    fill="none"
                    stroke={`url(#${gradientId})`}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={perimeter}
                    strokeDashoffset={dashOffset}
                    className="hexagon-progress"
                    style={{
                        transition: animated
                            ? `stroke-dashoffset ${animationDuration}s cubic-bezier(0.4,0,0.2,1)`
                            : "none",
                        filter: glowEffect ? `url(#${glowId})` : "none"
                    }}
                />
            </svg>

            {/* Content */}
            <div className="hexagon-content">
                {title && <div className="hexagon-title">{title}</div>}
                {subtitle && <div className="hexagon-subtitle">{subtitle}</div>}
            </div>

            {/* Particles */}
            <div className="particles">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="particle"
                        style={{
                            "--delay": `${i * 0.4}s`,
                            "--color": i % 2 === 0 ? primaryColor : secondaryColor
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default HexagonProgress;
