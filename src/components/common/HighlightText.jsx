'use client';

import './HighlightText.scss';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { serializeRange, deserializeToRange } from '@/utils/highlight/serializeRange';
import { wrapTextRangeInMarks } from '@/utils/highlight/wrapTextRangeInMarks';

const INTERACTIVE_SELECTOR = [
    'button',
    'input',
    'textarea',
    'select',
    'option',
    '[role="button"]',
    '[contenteditable="true"]',
    '[data-highlight-ignore="true"]',
    '.inline-drop-placeholder',
    '[data-blank-id]'
].join(', ');

const createHighlightId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `hl-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

const getNodeElement = (node) => {
    if (!node) return null;
    if (node.nodeType === Node.ELEMENT_NODE) return node;
    if (node.nodeType === Node.TEXT_NODE) return node.parentElement;
    return null;
};

const escapeHighlightIdForSelector = (id) => {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(id);
    }
    return String(id).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
};

/**
 * @param {Element} el
 */
function isExcludedHighlightRoot(el) {
    if (!(el instanceof Element)) return true;
    if (el.closest('[data-highlight-ignore="true"]')) return true;
    if (el.closest(INTERACTIVE_SELECTOR)) return true;
    if (el.closest('input, textarea, select, button')) return true;
    return false;
}

/** Toolbar above selection midpoint (viewport). */
function getToolbarPosition(range) {
    const r = range.getBoundingClientRect();
    if (!r || (r.width === 0 && r.height === 0)) return null;
    return {
        left: r.left + r.width / 2,
        top: r.top - 40
    };
}

/**
 * @param {string | undefined} storageKey
 * @returns {{ id: string, text: string, serialized: import('@/utils/highlight/serializeRange').SerializedRange }[]}
 */
function loadStoredHighlights(storageKey) {
    if (!storageKey || typeof sessionStorage === 'undefined') return [];
    try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveStoredHighlights(storageKey, list) {
    if (!storageKey || typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.setItem(storageKey, JSON.stringify(list));
    } catch {
        /* ignore quota */
    }
}

/**
 * Re-applies marks from sessionStorage when DOM was reset (e.g. parent re-render
 * after window blur / timer state) but storageKey unchanged.
 */
function restoreMissingMarksFromStorage(root, storageKey, markClassName) {
    if (!storageKey || !root) return;

    const list = loadStoredHighlights(storageKey);
    if (list.length === 0) return;

    const excluded = (el) => isExcludedHighlightRoot(el);

    const allPresent = list.every(({ id }) => {
        if (!id) return true;
        return root.querySelector(`mark[data-highlight-id="${escapeHighlightIdForSelector(id)}"]`);
    });
    if (allPresent) return;

    list.forEach(({ id, serialized }) => {
        if (!serialized || !id) return;
        if (root.querySelector(`mark[data-highlight-id="${escapeHighlightIdForSelector(id)}"]`)) {
            return;
        }
        const range = deserializeToRange(serialized, root);
        if (!range || range.collapsed) return;
        wrapTextRangeInMarks(range, root, id, markClassName, excluded);
    });
    root.normalize();
}

export default function HighlightText({
    children,
    className = '',
    /** Session persistence key (e.g. readingId + passageId). */
    storageKey = null,
    /** Re-run restore when passage HTML / section changes. */
    restoreVersion = 0,
    markClassName = 'ielts-text-highlight'
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

    const showToolbarAt = useCallback((left, top, mode) => {
        setToolbarState({
            visible: true,
            mode,
            left,
            top: Math.max(8, top)
        });
    }, []);

    const isRangeValidForNewHighlight = useCallback((range) => {
        const root = rootRef.current;
        if (!root || !range || range.collapsed) return false;

        if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
            return false;
        }

        const startElement = getNodeElement(range.startContainer);
        const endElement = getNodeElement(range.endContainer);
        if (!startElement || !endElement) return false;

        if (isExcludedHighlightRoot(startElement) || isExcludedHighlightRoot(endElement)) {
            return false;
        }

        if (startElement.closest('mark[data-highlight-id]') || endElement.closest('mark[data-highlight-id]')) {
            return false;
        }

        try {
            const fragment = range.cloneContents();
            if (fragment.querySelector && fragment.querySelector('mark[data-highlight-id]')) {
                return false;
            }
        } catch {
            return false;
        }

        return true;
    }, []);

    const handleTextSelection = useCallback(
        (event) => {
            const root = rootRef.current;
            if (!root) return;
            if (toolbarRef.current?.contains(event?.target)) return;

            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                hideToolbar();
                return;
            }

            const range = selection.getRangeAt(0);
            const selectedText = selection.toString();
            if (!selectedText || selectedText.length === 0) {
                hideToolbar();
                return;
            }

            if (!isRangeValidForNewHighlight(range)) {
                hideToolbar();
                return;
            }

            const pos = getToolbarPosition(range);
            if (!pos) {
                hideToolbar();
                return;
            }

            pendingRangeRef.current = range.cloneRange();
            selectedHighlightRef.current = null;
            showToolbarAt(pos.left, pos.top, 'highlight');
        },
        [hideToolbar, isRangeValidForNewHighlight, showToolbarAt]
    );

    const handleRootClick = useCallback(
        (event) => {
            const root = rootRef.current;
            if (!root) return;

            const mark = event.target?.closest?.('mark[data-highlight-id]');
            if (!mark || !root.contains(mark)) return;

            event.preventDefault();
            event.stopPropagation();

            const selection = window.getSelection();
            if (selection) selection.removeAllRanges();

            pendingRangeRef.current = null;
            selectedHighlightRef.current = mark;

            const r = mark.getBoundingClientRect();
            showToolbarAt(r.left + r.width / 2, r.top - 40, 'remove');
        },
        [showToolbarAt]
    );

    const handleApplyHighlight = useCallback(() => {
        const range = pendingRangeRef.current;
        const root = rootRef.current;

        if (!root || !range || range.collapsed || !isRangeValidForNewHighlight(range)) {
            hideToolbar();
            return;
        }

        const id = createHighlightId();
        const text = range.toString();
        const serialized = serializeRange(range, root);

        const excluded = (el) => isExcludedHighlightRoot(el);

        const ok = wrapTextRangeInMarks(range, root, id, markClassName, excluded);
        if (!ok) {
            hideToolbar();
            return;
        }

        root.normalize();

        if (serialized && storageKey) {
            const list = loadStoredHighlights(storageKey);
            list.push({ id, text, serialized });
            saveStoredHighlights(storageKey, list);
        }

        const selection = window.getSelection();
        if (selection) selection.removeAllRanges();
        hideToolbar();
    }, [hideToolbar, isRangeValidForNewHighlight, markClassName, storageKey]);

    const handleRemoveHighlight = useCallback(() => {
        const markEl = selectedHighlightRef.current;
        const root = rootRef.current;

        if (!markEl || !root) {
            hideToolbar();
            return;
        }

        const highlightId = markEl.getAttribute('data-highlight-id');
        if (!highlightId) {
            hideToolbar();
            return;
        }

        const selector = `mark[data-highlight-id="${escapeHighlightIdForSelector(highlightId)}"]`;
        const marks = root.querySelectorAll(selector);

        marks.forEach((mark) => {
            if (!mark.parentNode) return;
            const fragment = document.createDocumentFragment();
            while (mark.firstChild) {
                fragment.appendChild(mark.firstChild);
            }
            mark.parentNode.replaceChild(fragment, mark);
        });

        root.normalize();

        if (storageKey) {
            const list = loadStoredHighlights(storageKey).filter((h) => h.id !== highlightId);
            saveStoredHighlights(storageKey, list);
        }

        hideToolbar();
    }, [hideToolbar, storageKey]);

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

    // After any render: passage DOM may have been recreated (e.g. blur → timer pause →
    // re-render resets dangerouslySetInnerHTML) while sessionStorage still holds highlights.
    useLayoutEffect(() => {
        if (!storageKey) return;
        const root = rootRef.current;
        if (!root) return;
        restoreMissingMarksFromStorage(root, storageKey, markClassName);
        // Intentionally after every commit; deps would miss re-renders that wipe marks.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- sync DOM with storage after any parent update
    });

    useEffect(() => {
        if (!storageKey) return;
        const onVisibility = () => {
            if (document.visibilityState !== 'visible') return;
            const root = rootRef.current;
            if (!root) return;
            restoreMissingMarksFromStorage(root, storageKey, markClassName);
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [storageKey, markClassName]);

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
                    className="ielts-highlight-toolbar"
                    onMouseDown={(event) => event.stopPropagation()}
                    onMouseUp={(event) => event.stopPropagation()}
                    onTouchStart={(event) => event.stopPropagation()}
                    onTouchEnd={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                    style={{
                        position: 'fixed',
                        left: `${toolbarState.left}px`,
                        top: `${toolbarState.top}px`,
                        transform: 'translateX(-50%)',
                        zIndex: 10000
                    }}
                >
                    {toolbarState.mode === 'highlight' ? (
                        <button
                            type="button"
                            className="ielts-highlight-toolbar__btn ielts-highlight-toolbar__btn--highlight"
                            onClick={handleApplyHighlight}
                        >
                            Highlight
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="ielts-highlight-toolbar__btn ielts-highlight-toolbar__btn--remove"
                            onClick={handleRemoveHighlight}
                        >
                            Remove
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
