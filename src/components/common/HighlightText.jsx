'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const INTERACTIVE_SELECTOR = [
    'button',
    'input',
    'textarea',
    'select',
    'option',
    'a',
    '[role="button"]',
    '[contenteditable="true"]',
    '[data-highlight-ignore="true"]'
].join(', ');

const createHighlightId = () =>
    `highlight-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getNodeElement = (node) => {
    if (!node) return null;
    if (node.nodeType === Node.ELEMENT_NODE) return node;
    if (node.nodeType === Node.TEXT_NODE) return node.parentElement;
    return null;
};

export default function HighlightText({
    children,
    className = '',
    highlightClassName = 'text-highlight'
}) {
    const rootRef = useRef(null);
    const toolbarRef = useRef(null);
    const pendingRangeRef = useRef(null);
    const selectedHighlightRef = useRef(null);

    const [toolbarState, setToolbarState] = useState({
        visible: false,
        mode: 'highlight',
        left: 0,
        top: 0
    });

    const hideToolbar = useCallback(() => {
        pendingRangeRef.current = null;
        selectedHighlightRef.current = null;
        setToolbarState((prev) => ({ ...prev, visible: false }));
    }, []);

    const showToolbar = useCallback((rect, mode) => {
        if (!rect) return;
        const left = rect.left + rect.width / 2;
        const top = Math.max(8, rect.top - 12);

        setToolbarState({
            visible: true,
            mode,
            left,
            top
        });
    }, []);

    const isRangeValid = useCallback((range) => {
        const root = rootRef.current;
        if (!root || !range) return false;

        if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
            return false;
        }

        const startElement = getNodeElement(range.startContainer);
        const endElement = getNodeElement(range.endContainer);
        if (!startElement || !endElement) return false;

        if (startElement.closest(INTERACTIVE_SELECTOR) || endElement.closest(INTERACTIVE_SELECTOR)) {
            return false;
        }

        // Prevent nested/overlapping highlights.
        if (startElement.closest('[data-highlight-id]') || endElement.closest('[data-highlight-id]')) {
            return false;
        }

        try {
            const fragment = range.cloneContents();
            if (fragment.querySelector('[data-highlight-id]')) return false;
        } catch (_) {
            return false;
        }

        return true;
    }, []);

    const handleTextSelection = useCallback(() => {
        const root = rootRef.current;
        if (!root) return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            hideToolbar();
            return;
        }

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        if (!selectedText || !isRangeValid(range)) {
            hideToolbar();
            return;
        }

        const rect = range.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) {
            hideToolbar();
            return;
        }

        pendingRangeRef.current = range.cloneRange();
        selectedHighlightRef.current = null;
        showToolbar(rect, 'highlight');
    }, [hideToolbar, isRangeValid, showToolbar]);

    const handleRootClick = useCallback(
        (event) => {
            const root = rootRef.current;
            if (!root) return;

            const highlight = event.target?.closest?.('[data-highlight-id]');
            if (!highlight || !root.contains(highlight)) return;

            event.preventDefault();
            event.stopPropagation();

            const selection = window.getSelection();
            if (selection) selection.removeAllRanges();

            pendingRangeRef.current = null;
            selectedHighlightRef.current = highlight;
            showToolbar(highlight.getBoundingClientRect(), 'remove');
        },
        [showToolbar]
    );

    const handleApplyHighlight = useCallback(() => {
        const range = pendingRangeRef.current;
        const root = rootRef.current;

        if (!root || !range || range.collapsed || !isRangeValid(range)) {
            hideToolbar();
            return;
        }

        const mark = document.createElement('mark');
        mark.className = highlightClassName;
        mark.setAttribute('data-highlight-id', createHighlightId());

        try {
            const fragment = range.extractContents();
            if (!fragment.textContent?.trim()) {
                hideToolbar();
                return;
            }

            mark.appendChild(fragment);
            range.insertNode(mark);
            mark.parentNode?.normalize();
        } catch (_) {
            hideToolbar();
            return;
        }

        const selection = window.getSelection();
        if (selection) selection.removeAllRanges();
        hideToolbar();
    }, [highlightClassName, hideToolbar, isRangeValid]);

    const handleRemoveHighlight = useCallback(() => {
        const highlight = selectedHighlightRef.current;
        if (!highlight || !highlight.parentNode) {
            hideToolbar();
            return;
        }

        const fragment = document.createDocumentFragment();
        while (highlight.firstChild) {
            fragment.appendChild(highlight.firstChild);
        }

        const parent = highlight.parentNode;
        parent.replaceChild(fragment, highlight);
        parent.normalize();
        hideToolbar();
    }, [hideToolbar]);

    useEffect(() => {
        const handleDocumentMouseDown = (event) => {
            const root = rootRef.current;
            const toolbar = toolbarRef.current;

            const clickInsideRoot = root?.contains(event.target);
            const clickInsideToolbar = toolbar?.contains(event.target);
            if (clickInsideRoot || clickInsideToolbar) return;

            hideToolbar();
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') hideToolbar();
        };

        document.addEventListener('mousedown', handleDocumentMouseDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleDocumentMouseDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [hideToolbar]);

    return (
        <div
            ref={rootRef}
            className={className}
            onMouseUp={handleTextSelection}
            onTouchEnd={handleTextSelection}
            onClick={handleRootClick}
        >
            {children}

            {toolbarState.visible && (
                <div
                    ref={toolbarRef}
                    data-tooltip="true"
                    className="highlight-toolbar"
                    style={{
                        position: 'fixed',
                        left: `${toolbarState.left}px`,
                        top: `${toolbarState.top}px`,
                        transform: 'translateX(-50%)',
                        background: '#1f2937',
                        color: '#fff',
                        padding: '4px',
                        borderRadius: '8px',
                        display: 'flex',
                        gap: '2px',
                        zIndex: 10000,
                        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.35)'
                    }}
                >
                    {toolbarState.mode === 'highlight' ? (
                        <button
                            type="button"
                            className="highlight-toolbar-btn highlight-toolbar-btn--highlight"
                            title="Highlight"
                            onClick={handleApplyHighlight}
                            style={{
                                padding: '4px 8px',
                                background: 'transparent',
                                border: 'none',
                                color: '#fcd34d',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 700,
                                borderRadius: '6px'
                            }}
                        >
                            Highlight
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="highlight-toolbar-btn highlight-toolbar-btn--remove"
                            title="Remove"
                            onClick={handleRemoveHighlight}
                            style={{
                                padding: '4px 8px',
                                background: 'transparent',
                                border: 'none',
                                color: '#fca5a5',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 700,
                                borderRadius: '6px'
                            }}
                        >
                            Remove
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
