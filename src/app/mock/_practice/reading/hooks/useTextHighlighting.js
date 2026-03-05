import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export const useTextHighlighting = (readingData, isFullScreen, activePassageId) => {
    const { t } = useTranslation('reading');
    const [passageHighlights, setPassageHighlights] = useState({});
    
    // Refs for cleanup and state management
    const highlightElements = useRef(new Map()); // Track all highlight elements
    
    // Ref to track previous values to avoid unnecessary clearing
    const prevValues = useRef({ isFullScreen, activePassageId });
    
    // Ref to track current highlights to avoid dependency issues
    const currentHighlightsRef = useRef(new Map());
    
    // Ref to store the current handleTextSelection function
    const handleTextSelectionRef = useRef();
    
    // Memoize translation strings
    const translations = useMemo(() => ({
        selectedText: t('selectedText'),
        highlightedText: (text) => t('highlightedText', { text })
    }), [t]);
    
    // Get passage content with better error handling
    const getPassageContent = useCallback(() => {
        let passageContent = null;
        
        try {
            if (isFullScreen) {
                passageContent = document.querySelector('.fullscreen-passage .passage-content');
            } else {
                passageContent = document.querySelector('.passage-section .passage-content');
            }
            
            // Fallback
            if (!passageContent) {
                passageContent = document.querySelector('.passage-content');
            }
        } catch (error) {
            console.warn('Error finding passage content:', error);
        }
        
        return passageContent;
    }, [isFullScreen]);
    
    // Clean up event listeners for a specific highlight
    const cleanupHighlightListeners = useCallback((highlightId) => {
        // No longer needed since we're not adding individual event listeners
        // The component handles all highlight clicks through handleHighlightClick
        highlightElements.current.delete(highlightId);
    }, []);
    
    // Safe highlight removal that preserves text content
    const safeRemoveHighlight = useCallback((highlightElement) => {
        if (!highlightElement || !highlightElement.parentNode) return;
        
        const parent = highlightElement.parentNode;
        const highlightId = highlightElement.getAttribute('data-highlight-id');
        
        // Clean up event listeners first
        if (highlightId) {
            cleanupHighlightListeners(highlightId);
            highlightElements.current.delete(highlightId);
        }
        
        // Create a document fragment to hold the text content
        const fragment = document.createDocumentFragment();
        
        // Extract all text content from the highlight
        const textContent = highlightElement.textContent || '';
        if (textContent) {
            const textNode = document.createTextNode(textContent);
            fragment.appendChild(textNode);
        }
        
        // Replace the highlight with the text content
        try {
            parent.replaceChild(fragment, highlightElement);
            
            // Normalize the parent to merge adjacent text nodes
            parent.normalize();
        } catch (error) {
            console.warn('Error removing highlight:', error);
        }
    }, [cleanupHighlightListeners]);
    
    // Check if ranges overlap with better error handling
    const rangesOverlap = useCallback((range1, range2) => {
        try {
            // Check if range1 starts before range2 ends AND range1 ends after range2 starts
            const range1StartsBeforeRange2Ends = range1.compareBoundaryPoints(Range.START_TO_END, range2) <= 0;
            const range1EndsAfterRange2Starts = range1.compareBoundaryPoints(Range.END_TO_START, range2) >= 0;
            
            return range1StartsBeforeRange2Ends && range1EndsAfterRange2Starts;
        } catch (error) {
            return false;
        }
    }, []);
    
    // Check for overlapping highlights
    const hasOverlappingHighlight = useCallback((selectionRange, passageContent) => {
        if (!passageContent || !selectionRange) return false;
        
        const existingHighlights = passageContent.querySelectorAll('.text-highlight');
        
        for (const existingHighlight of existingHighlights) {
            try {
                const highlightRange = document.createRange();
                highlightRange.selectNodeContents(existingHighlight);
                
                // Check for actual overlap, not just proximity
                if (rangesOverlap(selectionRange, highlightRange)) {
                    return true;
                }
                
                // Also check if the selection is completely within an existing highlight
                const selectionStart = selectionRange.compareBoundaryPoints(Range.START_TO_START, highlightRange);
                const selectionEnd = selectionRange.compareBoundaryPoints(Range.END_TO_END, highlightRange);
                if (selectionStart >= 0 && selectionEnd <= 0) {
                    return true;
                }
                
                // Check if the selection completely contains an existing highlight
                const highlightStart = highlightRange.compareBoundaryPoints(Range.START_TO_START, selectionRange);
                const highlightEnd = highlightRange.compareBoundaryPoints(Range.END_TO_END, selectionRange);
                if (highlightStart >= 0 && highlightEnd <= 0) {
                    return true;
                }
            } catch (error) {
                // Skip invalid ranges
                continue;
            }
        }
        return false;
    }, [rangesOverlap]);
    
    // Create highlight element with proper event handling
    const createHighlightElement = useCallback((selection, passageId = 1) => {
        const span = document.createElement('span');
        span.className = 'text-highlight';
        span.title = translations.selectedText;
        span.setAttribute('role', 'mark');
        span.setAttribute('aria-label', translations.highlightedText(selection.text));
        span.setAttribute('data-highlight-id', selection.id);
        span.setAttribute('data-passage-id', passageId.toString());
        
        // Don't add individual event listeners - let the component handle all highlight clicks
        // This prevents conflicts between hook and component event handlers
        
        // Track the element for cleanup
        highlightElements.current.set(selection.id, span);
        
        return span;
    }, [translations]);
    
    // Validate text selection
    const isValidSelection = useCallback((selectedText, range, passageContent) => {
        if (!selectedText || !selectedText.trim() || !range || !passageContent) {
            return false;
        }

        // Reject selections that contain line breaks to avoid spanning blocks
        if (/[\r\n]/.test(selectedText)) {
            return false;
        }

        // Check word count (max 10 words)
        const wordCount = selectedText.trim().split(/\s+/).filter(word => word.length > 0).length;
        if (wordCount > 10) return false;

        // Check if range is valid and within passage content
        try {
            if (!passageContent.contains(range.startContainer) ||
                !passageContent.contains(range.endContainer)) {
                return false;
            }
        } catch (error) {
            return false;
        }

        // Check if selection includes forbidden elements
        const getElement = (container) =>
            container.nodeType === Node.TEXT_NODE ? container.parentElement : container;

        const startElement = getElement(range.startContainer);
        const endElement = getElement(range.endContainer);

        const forbiddenTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
        const forbiddenClasses = ['passage-title'];

        const isElementForbidden = (element) => {
            if (!element) return false;
            return forbiddenTags.includes(element.tagName) ||
                   forbiddenClasses.some(cls => element.classList?.contains(cls)) ||
                   element.closest('.text-highlight'); // Don't allow highlighting within highlights
        };

        if (isElementForbidden(startElement) || isElementForbidden(endElement)) {
            return false;
        }

        // Ensure selection stays within a single paragraph/block in the passage
        const closestBlock = (el) => {
            if (!el) return null;
            return el.closest('.passage-paragraph') || el.closest('p') || el.closest('[role="paragraph"]');
        };

        const startBlock = closestBlock(startElement);
        const endBlock = closestBlock(endElement);
        if (!startBlock || !endBlock || startBlock !== endBlock) {
            return false;
        }

        // Extra guard: prevent wrapping block elements by checking cloned contents
        try {
            const fragment = range.cloneContents();
            if (fragment.querySelector && fragment.querySelector('p, div, h1, h2, h3, h4, h5, h6, ul, ol, li, table, br')) {
                // If the cloned contents include block-level tags or br, disallow
                return false;
            }
        } catch (_) {
            // If cloning fails for any reason, be conservative and disallow
            return false;
        }

        return true;
    }, []);
    
    // Highlight text selection with improved DOM manipulation
    const highlightTextSelection = useCallback((selection) => {
        try {
            // Validate that range nodes still exist in DOM
            if (!selection.range || 
                !document.contains(selection.range.startContainer) ||
                !document.contains(selection.range.endContainer)) {
                return;
            }
            
            const passageContent = getPassageContent();
            if (!passageContent) return;
            
            // Create a new range to avoid mutations
            const selectionRange = document.createRange();
            selectionRange.setStart(selection.range.startContainer, selection.range.startOffset);
            selectionRange.setEnd(selection.range.endContainer, selection.range.endOffset);
            
            // Validate selection
            const selectedText = selectionRange.toString().trim();
            if (!isValidSelection(selectedText, selectionRange, passageContent)) {
                return;
            }
            
            // Check for overlapping highlights
            if (hasOverlappingHighlight(selectionRange, passageContent)) {
                return;
            }
            
            // Get current passage ID for multi-passage readings
            const currentPassageId = readingData?.isMultiPassage ? activePassageId : 1;
            
            // Check if this highlight already exists using ref instead of state
            const existingHighlights = currentHighlightsRef.current.get(currentPassageId) || [];
            const highlightExists = existingHighlights.some(h => h.text === selectedText);
            
            if (highlightExists) {
                return; // Don't create duplicate highlights
            }
            
            // Create highlight element
            const span = createHighlightElement(selection, currentPassageId);
            
            try {
                // Use a more robust approach to avoid affecting existing highlights
                const fragment = selectionRange.extractContents();
                
                // If fragment is empty, create text node
                if (!fragment.textContent.trim()) {
                    span.textContent = selectedText;
                } else {
                    // Move all child nodes from fragment to span
                    while (fragment.firstChild) {
                        span.appendChild(fragment.firstChild);
                    }
                }
                
                // Insert the highlight
                selectionRange.insertNode(span);
                
                // Store highlight data with node paths for restoration
                const highlightData = {
                    id: selection.id,
                    text: selectedText,
                    passageId: currentPassageId,
                    originalText: selectedText,
                    timestamp: Date.now()
                };
                
                // Update ref to track current highlights
                const currentHighlights = currentHighlightsRef.current.get(currentPassageId) || [];
                currentHighlightsRef.current.set(currentPassageId, [...currentHighlights, highlightData]);
                
                // Update state
                setPassageHighlights(prev => ({
                    ...prev,
                    [currentPassageId]: [...(prev[currentPassageId] || []), highlightData]
                }));
                
            } catch (error) {
                console.warn('Error creating highlight:', error);
                
                // Cleanup on failure
                if (span.parentNode) {
                    span.parentNode.removeChild(span);
                }
                cleanupHighlightListeners(selection.id);
                highlightElements.current.delete(selection.id);
            }
            
        } catch (error) {
            console.warn('Error in highlightTextSelection:', error);
        }
    }, [readingData?.isMultiPassage, activePassageId, getPassageContent, isValidSelection, hasOverlappingHighlight, createHighlightElement, cleanupHighlightListeners]);
    
    // Clear all highlights with proper cleanup
    const clearPassageHighlights = useCallback((passageId = null) => {
        try {
            const passageContent = getPassageContent();
            if (!passageContent) return;
            
            const highlights = passageContent.querySelectorAll('.text-highlight');
            
            // Remove all highlights
            highlights.forEach(highlight => {
                safeRemoveHighlight(highlight);
            });
            
            // Clear all stored references
            highlightElements.current.clear();
            
            // Clear ref
            if (passageId === null) {
                currentHighlightsRef.current.clear();
            } else {
                currentHighlightsRef.current.delete(passageId);
            }
            
            // Update state
            if (passageId === null) {
                setPassageHighlights({});
            } else {
                setPassageHighlights(prev => ({
                    ...prev,
                    [passageId]: []
                }));
            }
            
        } catch (error) {
            console.warn('Error clearing highlights:', error);
        }
    }, [getPassageContent, safeRemoveHighlight]);
    
    // Legacy function name for compatibility
    const clearAllHighlights = useCallback(() => {
        clearPassageHighlights();
    }, [clearPassageHighlights]);
    
    // Restore highlights (simplified approach)
    const restorePassageHighlights = useCallback((passageId) => {
        const highlights = passageHighlights[passageId];
        if (!highlights || highlights.length === 0) return;
        
        const passageContent = getPassageContent();
        if (!passageContent) return;
        
        // Don't clear existing highlights - just restore the missing ones
        // Update ref with restored highlights
        currentHighlightsRef.current.set(passageId, highlights);
        
        // Restore each highlight by finding the text in the content
        highlights.forEach(highlightData => {
            try {
                if (!highlightData.originalText || !highlightData.originalText.trim()) {
                    return;
                }
                // Skip restoring any legacy highlights that contain line breaks
                if (/[\r\n]/.test(highlightData.originalText)) {
                    return;
                }
                
                // Check if this highlight already exists in DOM
                const existingHighlight = passageContent.querySelector(`[data-highlight-id="${highlightData.id}"]`);
                if (existingHighlight) {
                    return; // Already exists, skip
                }
                
                // Use TreeWalker to find text nodes
                const walker = document.createTreeWalker(
                    passageContent,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode: (node) => {
                            // Skip nodes that are already highlighted
                            return node.parentElement?.classList?.contains('text-highlight') 
                                ? NodeFilter.FILTER_REJECT 
                                : NodeFilter.FILTER_ACCEPT;
                        }
                    },
                    false
                );
                
                let textNode;
                while (textNode = walker.nextNode()) {
                    const text = textNode.textContent;
                    const index = text.indexOf(highlightData.originalText);
                    
                    if (index !== -1) {
                        try {
                            const range = document.createRange();
                            range.setStart(textNode, index);
                            range.setEnd(textNode, index + highlightData.originalText.length);
                            
                            const span = createHighlightElement({ 
                                id: highlightData.id, 
                                text: highlightData.originalText 
                            }, passageId);
                            
                            const contents = range.extractContents();
                            span.appendChild(contents);
                            range.insertNode(span);
                            
                            break; // Found and restored this highlight
                        } catch (rangeError) {
                            console.warn('Error restoring highlight range:', rangeError);
                        }
                    }
                }
            } catch (error) {
                console.warn('Error restoring highlight:', error);
            }
        });
    }, [passageHighlights, getPassageContent, createHighlightElement]);
    
    // Handle text selection with better validation
    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection();
        
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            return;
        }
        
        try {
            const selectedText = selection.toString().trim();
            const range = selection.getRangeAt(0);
            const passageContent = getPassageContent();
            
            if (!passageContent || !isValidSelection(selectedText, range, passageContent)) {
                selection.removeAllRanges();
                return;
            }
            
            const selectionId = `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const newSelection = {
                id: selectionId,
                text: selectedText,
                range: {
                    startContainer: range.startContainer,
                    startOffset: range.startOffset,
                    endContainer: range.endContainer,
                    endOffset: range.endOffset
                }
            };
            
            // Clear selection immediately to prevent interference
            selection.removeAllRanges();
            
            // Highlight the text
            highlightTextSelection(newSelection);
            
        } catch (error) {
            console.warn('Error handling text selection:', error);
        }
    }, [getPassageContent, isValidSelection, highlightTextSelection]);
    
    // Store the function in ref for event listeners
    // Only need to set the ref on mount and when handleTextSelection changes.
    useEffect(() => {
        handleTextSelectionRef.current = handleTextSelection;
    }, [handleTextSelection]);
    
    // Handle highlight clicks
    const handleHighlightClick = useCallback((event) => {
        let highlightElement = null;
        
        // Find the highlight element
        if (event.target?.classList?.contains('text-highlight')) {
            highlightElement = event.target;
        } else {
            highlightElement = event.target?.closest('.text-highlight');
        }
        
        if (!highlightElement) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        const highlightId = highlightElement.getAttribute('data-highlight-id');
        const currentPassageId = readingData?.isMultiPassage ? activePassageId : 1;
        
        if (!highlightId) return;
        
        // Remove highlight from DOM
        safeRemoveHighlight(highlightElement);
        
        // Update ref to remove highlight
        const currentHighlights = currentHighlightsRef.current.get(currentPassageId) || [];
        currentHighlightsRef.current.set(currentPassageId, currentHighlights.filter(h => h.id !== highlightId));
        
        // Update state
        setPassageHighlights(prev => ({
            ...prev,
            [currentPassageId]: (prev[currentPassageId] || []).filter(h => h.id !== highlightId)
        }));
    }, [readingData?.isMultiPassage, activePassageId, safeRemoveHighlight]);
    
    // Cleanup effect
    useEffect(() => {
        // Capture current references for cleanup
        const currentHighlightElements = highlightElements.current;
        
        return () => {
            // Cleanup highlight elements when component unmounts
            currentHighlightElements.clear();
        };
    }, []); // Empty dependency array since this is only for unmount cleanup
    
    // prevValues is initialized from initial props via useRef; no effect needed
    
    // Sync ref with state when state changes
    useEffect(() => {
        Object.entries(passageHighlights).forEach(([passageId, highlights]) => {
            currentHighlightsRef.current.set(parseInt(passageId), highlights);
        });
    }, [passageHighlights]);
    
    // Add text selection event listeners
    useEffect(() => {
        let isProcessingSelection = false;
        let selectionTimeout = null;

        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && !selection.isCollapsed) {
                // Clear any existing timeout
                if (selectionTimeout) {
                    clearTimeout(selectionTimeout);
                }

                // Set a timeout to process selection after user stops selecting
                selectionTimeout = setTimeout(() => {
                    if (!isProcessingSelection && handleTextSelectionRef.current) {
                        isProcessingSelection = true;
                        handleTextSelectionRef.current();
                        // Reset flag after processing
                        setTimeout(() => {
                            isProcessingSelection = false;
                        }, 200);
                    }
                }, 300); // Wait 300ms after last selection change
            }
        };

        const handleSelectionComplete = () => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && !selection.isCollapsed && !isProcessingSelection && handleTextSelectionRef.current) {
                // Clear the timeout since we're processing now
                if (selectionTimeout) {
                    clearTimeout(selectionTimeout);
                }

                isProcessingSelection = true;
                handleTextSelectionRef.current();
                // Reset flag after processing
                setTimeout(() => {
                    isProcessingSelection = false;
                }, 200);
            }
        };

        // Add event listeners for different selection methods
        document.addEventListener('selectionchange', handleSelectionChange);
        document.addEventListener('touchend', handleSelectionComplete);
        document.addEventListener('mouseup', handleSelectionComplete);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            document.removeEventListener('touchend', handleSelectionComplete);
            document.removeEventListener('mouseup', handleSelectionComplete);
            if (selectionTimeout) {
                clearTimeout(selectionTimeout);
            }
        };
    }, []); // Intentionally no deps: listeners call stable ref
    
    // Track changes without clearing highlights so they persist across passages
    useEffect(() => {
        prevValues.current = { isFullScreen, activePassageId };
    }, [isFullScreen, activePassageId]);
    
    return {
        passageHighlights,
        setPassageHighlights,
        highlightTextSelection,
        clearPassageHighlights,
        clearAllHighlights,
        restorePassageHighlights,
        handleTextSelection,
        handleHighlightClick
    };
};