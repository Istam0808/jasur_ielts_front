"use client";

import { useState, useCallback, useMemo, useRef } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import './style.scss';

const Accordion = ({ 
    items = [], 
    className = '',
    allowMultiple = false,
    defaultExpanded = null,
    onToggle = null,
    renderHeader = null,
    renderContent = null,
    headerClassName = '',
    contentClassName = '',
    itemClassName = '',
    theme = 'default',
    variant = 'default',
    size = 'medium'
}) => {
    // Initialize expanded items properly
    const [expandedItems, setExpandedItems] = useState(() => {
        if (defaultExpanded === null) return [];
        return Array.isArray(defaultExpanded) ? defaultExpanded : [defaultExpanded];
    });

    // Create refs object using useRef to avoid dependency issues
    const contentRefs = useRef({});
    const itemRefs = useRef({});
    const headerRefs = useRef({});
    const animatingRefs = useRef({});

    // Handle smooth height transitions
    const handleContentTransition = useCallback((itemId, element, isExpanded) => {
        if (!element) return;

        // mark this item as animating to prevent re-entrant toggles
        animatingRefs.current[itemId] = true;

        const onTransitionEnd = (event) => {
            // Only react to height transition on the element itself
            if (event.target !== element || event.propertyName !== 'height') return;

            if (isExpanded) {
                element.style.height = 'auto';
                element.style.overflow = 'visible';
            }

            element.removeEventListener('transitionend', onTransitionEnd);
            animatingRefs.current[itemId] = false;
        };

        if (isExpanded) {
            // Opening: 0 -> content height
            element.style.overflow = 'hidden';
            element.style.height = '0px';
            // Force reflow
            // eslint-disable-next-line no-unused-expressions
            element.offsetHeight;
            element.addEventListener('transitionend', onTransitionEnd);
            element.style.height = `${element.scrollHeight}px`;
        } else {
            // Closing: current height -> 0
            element.style.overflow = 'hidden';
            element.style.height = `${element.scrollHeight}px`;
            // Force reflow
            // eslint-disable-next-line no-unused-expressions
            element.offsetHeight;
            element.addEventListener('transitionend', onTransitionEnd);
            element.style.height = '0px';
        }
    }, []);

    // Scroll to top of accordion header
    const scrollToHeaderTop = useCallback((itemId) => {
        const headerElement = headerRefs.current[itemId];
        if (headerElement) {
            const rect = headerElement.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const targetScrollTop = scrollTop + rect.top - 20; // 20px offset from top
            
            window.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
            });
        }
    }, []);

    const handleToggle = useCallback((itemId) => {
        // Prevent toggling while animation is in progress
        if (animatingRefs.current[itemId]) return;
        setExpandedItems(prev => {
            const wasExpanded = prev.includes(itemId);
            const newExpanded = allowMultiple 
                ? wasExpanded
                    ? prev.filter(id => id !== itemId)
                    : [...prev, itemId]
                : wasExpanded
                    ? [] 
                    : [itemId];
            
            // Handle content transition
            const contentEl = contentRefs.current[itemId];
            if (contentEl) {
                const isExpanding = newExpanded.includes(itemId);
                handleContentTransition(itemId, contentEl, isExpanding);
                
                // If opening the item, scroll to its top
                if (!wasExpanded && newExpanded.includes(itemId)) {
                    // Small delay to ensure the transition starts first
                    setTimeout(() => {
                        scrollToHeaderTop(itemId);
                    }, 50);
                }
            }
            
            // Call the optional onToggle callback
            onToggle?.(itemId, newExpanded.includes(itemId));
            
            return newExpanded;
        });
    }, [allowMultiple, onToggle, handleContentTransition, scrollToHeaderTop]);

    const isExpanded = useCallback((itemId) => {
        return expandedItems.includes(itemId);
    }, [expandedItems]);

    // Memoize processed items to avoid unnecessary re-renders
    const processedItems = useMemo(() => {
        return items.map((item, index) => ({
            ...item,
            id: item.id || `accordion-item-${index}`,
            title: item.title || item.name || `Item ${index + 1}`,
            content: item.content || item.description || 'No content available'
        }));
    }, [items]);

    // Ref callback to handle transitions
    const setContentRef = useCallback((itemId, isExpanded) => (el) => {
        if (el) {
            contentRefs.current[itemId] = el;
            // Apply transition on mount if expanded
            if (isExpanded) {
                setTimeout(() => handleContentTransition(itemId, el, true), 0);
            }
        }
    }, [handleContentTransition]);

    // Ref callback for item elements
    const setItemRef = useCallback((itemId) => (el) => {
        if (el) {
            itemRefs.current[itemId] = el;
        }
    }, []);

    // Ref callback for header elements
    const setHeaderRef = useCallback((itemId) => (el) => {
        if (el) {
            headerRefs.current[itemId] = el;
        }
    }, []);

    // Early return for empty items
    if (!items || items.length === 0) {
        return null;
    }

    return (
        <div className={`accordion accordion-${theme} accordion-${variant} accordion-${size} ${className}`} role="region" aria-label="Accordion">
            {processedItems.map((item, index) => {
                const expanded = isExpanded(item.id);
                
                return (
                    <div 
                        key={item.id} 
                        className={`accordion-item ${itemClassName}${expanded ? ' expanded' : ''}`}
                        ref={setItemRef(item.id)}
                    >
                        <button
                            type="button"
                            className={`accordion-header ${headerClassName}`}
                            onClick={() => handleToggle(item.id)}
                            aria-expanded={expanded}
                            aria-controls={`accordion-content-${item.id}`}
                            aria-label={`Toggle ${item.title}`}
                            id={`accordion-header-${item.id}`}
                            ref={setHeaderRef(item.id)}
                        >
                            {renderHeader ? (
                                renderHeader(item, expanded, index)
                            ) : (
                                <div className="accordion-header-content">
                                    <div className="accordion-title">
                                        {item.title}
                                    </div>
                                    {item.subtitle && (
                                        <div className="accordion-subtitle">
                                            {item.subtitle}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="accordion-toggle" aria-hidden="true">
                                <FaChevronDown />
                            </div>
                        </button>
                        
                        <div 
                            ref={setContentRef(item.id, expanded)}
                            className={`accordion-content ${contentClassName}${expanded ? ' expanded' : ''}`}
                            id={`accordion-content-${item.id}`}
                            inert={!expanded}
                            role="region"
                            aria-labelledby={`accordion-header-${item.id}`}
                        >
                            {expanded && (
                                <div className="accordion-body">
                                    {renderContent ? (
                                        renderContent(item, expanded, index)
                                    ) : (
                                        <div className="accordion-default-content">
                                            {item.content}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Accordion;