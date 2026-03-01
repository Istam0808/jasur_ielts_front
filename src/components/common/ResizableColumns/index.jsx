'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { RiExpandHorizontalSFill } from "react-icons/ri";
import './style.scss';

const ResizableColumns = ({ 
    children, 
    defaultLeftWidth = 50, 
    minLeftWidth = 30, 
    maxLeftWidth = 70,
    className = '',
    onResize = null,
    forceEnable = false // New prop to force enable resizing
}) => {
    const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
    const [isDragging, setIsDragging] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isMobile, setIsMobile] = useState(() => {
        // Initialize with current window width check
        if (typeof window !== 'undefined') {
            return window.innerWidth <= 768;
        }
        return false;
    });
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);
    const containerRef = useRef(null);
    const dividerRef = useRef(null);
    const leftColumnRef = useRef(null);
    const rightColumnRef = useRef(null);

    // Check if we're on mobile
    useEffect(() => {
        const checkMobile = () => {
            const isMobileView = window.innerWidth <= 768; // More conservative breakpoint
            const finalMobileState = forceEnable ? false : isMobileView;
            setIsMobile(finalMobileState);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [forceEnable]);

    // Reset to default width on double click
    const handleDoubleClick = useCallback(() => {
        if (isMobile) return;
        setIsResetting(true);
        setLeftWidth(defaultLeftWidth);
        if (onResize) onResize(defaultLeftWidth);
        
        // Remove reset class after animation
        setTimeout(() => {
            setIsResetting(false);
        }, 300);
    }, [defaultLeftWidth, onResize, isMobile]);

    const handleMouseDown = useCallback((e) => {
        if (isMobile) {
            return;
        }
        
        e.preventDefault();
        setIsDragging(true);
        setStartX(e.clientX);
        setStartWidth(leftWidth);
        
        // Add cursor styles
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [leftWidth, isMobile]);

    const handleTouchStart = useCallback((e) => {
        if (isMobile) return;
        
        e.preventDefault();
        setIsDragging(true);
        setStartX(e.touches[0].clientX);
        setStartWidth(leftWidth);
        
        // Add cursor styles
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [leftWidth, isMobile]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging || isMobile) return;
        
        e.preventDefault();
        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const deltaX = e.clientX - startX;
        const containerWidth = containerRect.width;
        const deltaPercent = (deltaX / containerWidth) * 100;
        
        let newWidth = startWidth + deltaPercent;
        newWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, newWidth));
        
        setLeftWidth(newWidth);
        
        if (onResize) {
            onResize(newWidth);
        }
    }, [isDragging, startX, startWidth, minLeftWidth, maxLeftWidth, onResize, isMobile]);

    const handleTouchMove = useCallback((e) => {
        if (!isDragging || isMobile) return;
        
        e.preventDefault();
        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const deltaX = e.touches[0].clientX - startX;
        const containerWidth = containerRect.width;
        const deltaPercent = (deltaX / containerWidth) * 100;
        
        let newWidth = startWidth + deltaPercent;
        newWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, newWidth));
        
        setLeftWidth(newWidth);
        
        if (onResize) {
            onResize(newWidth);
        }
    }, [isDragging, startX, startWidth, minLeftWidth, maxLeftWidth, onResize, isMobile]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        
        // Reset cursor styles
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    // Handle event listeners when dragging starts/stops
    useEffect(() => {
        if (isDragging) {
            // Add global event listeners
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleMouseUp);
        } else {
            // Remove global event listeners
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleMouseUp);
        }

        // Cleanup on unmount
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

    // Adjust divider height based on content height
    useEffect(() => {
        const adjustDividerHeight = () => {
            if (!dividerRef.current || !leftColumnRef.current || !rightColumnRef.current) return;
            
            const leftHeight = leftColumnRef.current.scrollHeight;
            const rightHeight = rightColumnRef.current.scrollHeight;
            const maxContentHeight = Math.max(leftHeight, rightHeight);
            
            // Get the container's computed height to respect max-height constraints
            const container = containerRef.current;
            if (container) {
                const containerStyle = window.getComputedStyle(container);
                const containerHeight = container.offsetHeight;
                
                // Use the smaller of: content height or container height
                const effectiveHeight = Math.min(maxContentHeight, containerHeight);
                
                // Set a reasonable maximum height (85vh) to prevent excessive stretching
                const maxAllowedHeight = Math.min(effectiveHeight, window.innerHeight * 0.85);
                
                dividerRef.current.style.height = `${maxAllowedHeight}px`;
            }
        };

        // Adjust on mount and when children change
        adjustDividerHeight();
        
        // Use ResizeObserver to detect content height changes
        const resizeObserver = new ResizeObserver(adjustDividerHeight);
        
        if (leftColumnRef.current) {
            resizeObserver.observe(leftColumnRef.current);
        }
        if (rightColumnRef.current) {
            resizeObserver.observe(rightColumnRef.current);
        }
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [children]);

    // If mobile, render children normally without resizable functionality
    if (isMobile) {
        return (
            <div className={`resizable-columns-mobile ${className}`}>
                {children}
            </div>
        );
    }

    // Ensure we have exactly 2 children
    const childrenArray = Array.isArray(children) ? children : [children];
    if (childrenArray.length !== 2) {
        console.warn('ResizableColumns expects exactly 2 children');
        return <div className={className}>{children}</div>;
    }

    return (
        <div 
            ref={containerRef}
            className={`resizable-columns ${className} ${isDragging ? 'dragging' : ''} ${isResetting ? 'resetting' : ''}`}
        >
            <div 
                ref={leftColumnRef}
                className="resizable-column left-column"
                style={{ width: `${leftWidth}%` }}
            >
                {childrenArray[0]}
            </div>
            
            <div 
                ref={dividerRef}
                className="resizable-divider"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onDoubleClick={handleDoubleClick}
                role="separator"
                aria-label="Resize columns (double-click to reset)"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        const delta = e.key === 'ArrowLeft' ? -2 : 2;
                        const newWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, leftWidth + delta));
                        setLeftWidth(newWidth);
                        if (onResize) onResize(newWidth);
                    } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleDoubleClick();
                    }
                }}
            >
                <div className="divider-handle" title="Drag to resize columns">
                    <RiExpandHorizontalSFill className="resize-icon" />
                </div>
                <div className="divider-line" />
            </div>
            
            <div 
                ref={rightColumnRef}
                className="resizable-column right-column"
                style={{ width: `${100 - leftWidth}%` }}
            >
                {childrenArray[1]}
            </div>
        </div>
    );
};

export default ResizableColumns; 