"use client";

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FiFileText, FiTrash2, FiX } from 'react-icons/fi';
import Spinner from '@/components/common/spinner';
import Timer from '@/components/common/Timer';
import { useTestData } from '@/hooks/useTestData';
import QuestionRenderer from './QuestionRenderer';
import { TestHeader, TestOverview, PartNavigation, PartHeader, TestNavigation, MockExamTopBar, MockExamBottomNav } from './TestUIComponents';
import TestProgress from './TestProgress';
import ResultsModal from './ResultsModal';
import NoteModal from '@/components/common/NoteModal';
import { validateListeningMockAnswers, logoutAgent } from '@/lib/mockApi';
import { getMockSession, clearMockSession } from '@/lib/mockSession';
import './testListeningPage.scss';

// Add new component for Notes Viewer Modal
const NotesViewerModal = ({ isOpen, onClose, partNotes, onDeleteNote, onNavigateToPart, currentPartIndex, testParts, t }) => {
    if (!isOpen) return null;

    const allNotes = Object.entries(partNotes).flatMap(([partIndex, notes]) =>
        notes.map(note => ({ ...note, partIndex: parseInt(partIndex) }))
    ).sort((a, b) => b.timestamp - a.timestamp);

    const totalNotesCount = allNotes.length;

    return (
        <div
            className="modal-overlay"
            onClick={(e) => {
                // Only close if clicking directly on the overlay, not on any child elements
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notes-viewer-title"
        >
            <div
                className="notes-viewer-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h3 id="notes-viewer-title">{t('notesViewer.title', 'All Notes')} ({totalNotesCount})</h3>
                    <button
                        className="modal-close"
                        onClick={onClose}
                        aria-label={t('notesViewer.close', 'Close notes viewer')}
                    >
                        <FiX />
                    </button>
                </div>
                <div className="modal-body">
                    {totalNotesCount === 0 ? (
                        <div className="no-notes">
                            <p>{t('notesViewer.noNotes', 'No notes added yet.')}</p>
                            <p className="notes-hint">{t('notesViewer.hint', 'Select text in any part to add notes.')}</p>
                        </div>
                    ) : (
                        <div className="notes-list">
                            {Object.entries(partNotes).map(([partIndex, notes]) => {
                                if (notes.length === 0) return null;
                                const partNumber = parseInt(partIndex) + 1;
                                const partName = testParts[partIndex]?.part || `Part ${partNumber}`;

                                return (
                                    <div key={partIndex} className="part-notes-section">
                                        <div className="part-header">
                                            <h4 className="part-title">
                                                {partName} ({notes.length} {notes.length === 1 ? 'note' : 'notes'})
                                            </h4>
                                            <button
                                                className="go-to-part-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onNavigateToPart(parseInt(partIndex));
                                                    onClose();
                                                }}
                                                disabled={currentPartIndex === parseInt(partIndex)}
                                            >
                                                {currentPartIndex === parseInt(partIndex) ?
                                                    t('notesViewer.currentPart', 'Current Part') :
                                                    t('notesViewer.goToPart', 'Go to Part')
                                                }
                                            </button>
                                        </div>
                                        <div className="notes-in-part">
                                            {notes.map(note => (
                                                <div key={note.id} className="note-item">
                                                    <div className="note-content">
                                                        <div className="highlighted-text-preview">
                                                            <strong>{t('notesViewer.selectedText', 'Selected Text')}:</strong>
                                                            <span className="selected-text">"{note.text}"</span>
                                                        </div>
                                                        {note.note && (
                                                            <div className="note-text">
                                                                <strong>{t('notesViewer.yourNote', 'Your Note')}:</strong>
                                                                <span>{note.note}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="note-actions">
                                                        <button
                                                            className="delete-note-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteNote(note.id, parseInt(partIndex));
                                                            }}
                                                            title={t('notesViewer.deleteNote', 'Delete note')}
                                                        >
                                                            <FiTrash2 />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div
                    className="modal-footer"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="btn btn-secondary btn-sm btn-inline"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                    >
                        {t('notesViewer.close', 'Close')}
                    </button>
                    {totalNotesCount > 0 && (
                        <div className="notes-summary">
                            {t('notesViewer.summary', 'Total: {{count}} notes across {{parts}} parts', {
                                count: totalNotesCount,
                                parts: Object.keys(partNotes).filter(partIndex => partNotes[partIndex].length > 0).length
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TestListeningPage = ({ bookData, answersData, bookId, testId, testTitle, difficultyOverride, nextHref, isMockExam = false, mockId = null }) => {
    const { t, i18n } = useTranslation(['listening', 'common', 'test']);
    const router = useRouter();
    const params = useParams();
    const difficulty = difficultyOverride || params?.difficulty;

    const { test, isLoading } = useTestData(bookData, bookId, testId);
    const [currentPartIndex, setCurrentPartIndex] = useState(0);
    const [currentQuestionNumber, setCurrentQuestionNumber] = useState(null);
    const [userAnswers, setUserAnswers] = useState({});
    const [isSubmittable, setIsSubmittable] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [testResults, setTestResults] = useState(null);
    const [testStarted, setTestStarted] = useState(false);
    const [isTestSubmitted, setIsTestSubmitted] = useState(false);
    const testContainerRef = useRef(null);
    const isInitialRender = useRef(true);

    // Notes functionality state
    const [partNotes, setPartNotes] = useState({}); // { partIndex: [{ id, text, note, partIndex }] }
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [currentSelection, setCurrentSelection] = useState(null);
    const [pendingNote, setPendingNote] = useState('');
    // Add new state for notes viewer
    const [isNotesViewerOpen, setIsNotesViewerOpen] = useState(false);

    // Make sure translations are loaded
    useEffect(() => {
        const loadNamespaces = async () => {
            if (!i18n.hasResourceBundle(i18n.language, 'listening') ||
                !i18n.hasResourceBundle(i18n.language, 'common') ||
                !i18n.hasResourceBundle(i18n.language, 'test')) {
                await i18n.loadNamespaces(['listening', 'common', 'test']);
            }
        };

        loadNamespaces();
    }, [i18n]);

    // Start the test timer when component mounts (after user accepts modal)
    useEffect(() => {
        if (!isLoading && test) {
            setTestStarted(true);
        }
    }, [isLoading, test]);

    // Scroll to top when part changes, but not on initial load
    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }
        testContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentPartIndex]);

    const countQuestions = useCallback((item) => {
        if (!item) return 0;
        let total = 0;

        if (item.sections && Array.isArray(item.sections)) {
            total += item.sections.reduce((sum, sec) => sum + countQuestions(sec), 0);
        } else if (item.questions && Array.isArray(item.questions)) {
            total += item.questions.length;
        } else {
            const rangeStr = item.questionRange || (typeof item.questions === 'string' && item.questions.includes('-') ? item.questions : null);
            if (rangeStr) {
                const [start, end] = rangeStr.split('-').map(Number);
                total += (end - start + 1);
            }
        }
        return total;
    }, []);

    const extractQuestionNumbers = useCallback((item) => {
        if (!item) return [];

        const numbers = new Set();
        const addNumber = (value) => {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                numbers.add(parsed);
            }
        };

        const walk = (node) => {
            if (!node) return;

            if (Array.isArray(node.sections)) {
                node.sections.forEach((section) => walk(section));
            }

            if (Array.isArray(node.questions)) {
                node.questions.forEach((question) => {
                    if (question && typeof question === 'object' && 'number' in question) {
                        addNumber(question.number);
                    }
                });
            }

            const rangeStr = node.questionRange || (typeof node.questions === 'string' && node.questions.includes('-') ? node.questions : null);
            if (rangeStr) {
                const [start, end] = rangeStr.split('-').map(Number);
                if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
                    for (let current = start; current <= end; current += 1) {
                        numbers.add(current);
                    }
                }
            }

            if ('number' in node) {
                addNumber(node.number);
            }
        };

        walk(item);
        return Array.from(numbers).sort((a, b) => a - b);
    }, []);

    const testParts = useMemo(() => {
        return Array.isArray(test?.parts) ? test.parts : [];
    }, [test]);

    const totalQuestions = useMemo(() => {
        if (!testParts.length) return 0;
        return testParts.reduce((sum, part) => sum + countQuestions(part), 0);
    }, [testParts, countQuestions]);

    const allQuestionNumbers = useMemo(() => {
        return testParts.flatMap((part) => extractQuestionNumbers(part));
    }, [testParts, extractQuestionNumbers]);

    const activePartQuestionNumbers = useMemo(() => {
        const activePart = testParts[currentPartIndex];
        return extractQuestionNumbers(activePart);
    }, [testParts, currentPartIndex, extractQuestionNumbers]);

    const partTotals = useMemo(() => {
        return testParts.map((part) => extractQuestionNumbers(part).length);
    }, [testParts, extractQuestionNumbers]);

    const partAnsweredCounts = useMemo(() => {
        return testParts.map((part) => {
            const numbers = extractQuestionNumbers(part);
            return numbers.filter((num) => userAnswers[num] != null && userAnswers[num] !== '').length;
        });
    }, [testParts, extractQuestionNumbers, userAnswers]);

    useEffect(() => {
        if (currentPartIndex >= testParts.length) {
            setCurrentPartIndex(0);
        }
    }, [currentPartIndex, testParts.length]);

    useEffect(() => {
        const first = activePartQuestionNumbers[0];
        if (first != null && currentQuestionNumber === null) {
            setCurrentQuestionNumber(first);
        }
    }, [activePartQuestionNumbers, currentPartIndex]);

    useEffect(() => {
        if (activePartQuestionNumbers.length && !activePartQuestionNumbers.includes(currentQuestionNumber)) {
            setCurrentQuestionNumber(activePartQuestionNumbers[0]);
        }
    }, [currentPartIndex, activePartQuestionNumbers, currentQuestionNumber]);

    const scrollToQuestion = useCallback((questionNumber) => {
        setCurrentQuestionNumber(questionNumber);
        requestAnimationFrame(() => {
            const container = testContainerRef.current;
            if (!container) return;
            const blocks = container.querySelectorAll('[data-question-number]');
            let target = null;
            let maxNum = -1;
            blocks.forEach((el) => {
                const num = parseInt(el.getAttribute('data-question-number'), 10);
                if (Number.isFinite(num) && num <= questionNumber && num > maxNum) {
                    maxNum = num;
                    target = el;
                }
            });
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }, []);

    const goToPrevNextQuestion = useCallback((delta) => {
        const idx = activePartQuestionNumbers.indexOf(currentQuestionNumber);
        if (idx === -1) {
            const first = activePartQuestionNumbers[0];
            if (first != null) scrollToQuestion(first);
            return;
        }
        const nextIdx = idx + delta;
        if (nextIdx < 0) {
            if (currentPartIndex > 0) {
                const prevPartNums = extractQuestionNumbers(testParts[currentPartIndex - 1]);
                const lastPrev = prevPartNums[prevPartNums.length - 1];
                if (lastPrev != null) {
                    setCurrentPartIndex(currentPartIndex - 1);
                    scrollToQuestion(lastPrev);
                }
            }
            return;
        }
        if (nextIdx >= activePartQuestionNumbers.length) {
            if (currentPartIndex < testParts.length - 1) {
                setCurrentPartIndex(currentPartIndex + 1);
                const nextPartNums = extractQuestionNumbers(testParts[currentPartIndex + 1]);
                const firstNext = nextPartNums[0];
                if (firstNext != null) scrollToQuestion(firstNext);
            }
            return;
        }
        scrollToQuestion(activePartQuestionNumbers[nextIdx]);
    }, [activePartQuestionNumbers, currentQuestionNumber, currentPartIndex, testParts, extractQuestionNumbers, scrollToQuestion]);

    useEffect(() => {
        const answeredCount = Object.keys(userAnswers).length;
        if (totalQuestions > 0) {
            setIsSubmittable(answeredCount === totalQuestions);
        } else {
            setIsSubmittable(false);
        }
    }, [userAnswers, totalQuestions]);

    const handleAnswerChange = useCallback((questionNumber, answer) => {
        setUserAnswers(prevAnswers => {
            const newAnswers = { ...prevAnswers };

            const processAnswer = (qn, ans) => {
                const isEmptyArray = Array.isArray(ans) && ans.every(item => item === null || item === undefined || item === '');

                if (ans === null || ans === undefined || ans === '' || isEmptyArray) {
                    delete newAnswers[qn];
                } else {
                    newAnswers[qn] = ans;
                }
            };

            if (questionNumber) {
                processAnswer(questionNumber, answer);
            } else if (typeof answer === 'object' && answer !== null) {
                for (const qn in answer) {
                    if (Object.prototype.hasOwnProperty.call(answer, qn)) {
                        processAnswer(qn, answer[qn]);
                    }
                }
            }

            return newAnswers;
        });
    }, []);

    const handlePartNavigation = (index) => {
        if (index >= 0 && index < testParts.length) {
            setCurrentPartIndex(index);
        }
    };

    const handleSubmit = useCallback(async (isTimeUp = false) => {
        // Prevent multiple submissions
        if (isTestSubmitted) return;

        setIsTestSubmitted(true);

        if (mockId) {
            try {
                const payload = await validateListeningMockAnswers(mockId, userAnswers);

                const backendScore = Number(payload?.correct ?? payload?.score ?? payload?.correctCount ?? 0);
                const backendTotal = Number(
                    payload?.total ?? payload?.totalQuestions ?? payload?.count ?? totalQuestions
                ) || totalQuestions;

                setTestResults({
                    score: backendScore,
                    totalQuestions: backendTotal,
                    userAnswers,
                    correctAnswersData: payload?.correctAnswers || {},
                    isTimeUp,
                    scoredByBackend: true
                });
                setIsModalOpen(true);
                return;
            } catch (error) {
                console.error('Backend listening validation failed:', error);
                // Continue to local fallback if available.
            }
        }

        if (!answersData) {
            const answeredCount = Object.keys(userAnswers).length;
            setTestResults({
                score: 0,
                totalQuestions: totalQuestions || answeredCount,
                userAnswers,
                correctAnswersData: {},
                isTimeUp,
                scoredByBackend: false
            });
            setIsModalOpen(true);
            return;
        }

        const correctAnswersForTest = answersData[`test_${testId}`];
        if (!correctAnswersForTest) {
            console.error(`Answers for test ${testId} not found.`);
            setIsTestSubmitted(false);
            return;
        }

        let score = 0;
        const normalize = (val) => (val || '').toString().toLowerCase().trim();

        Object.keys(correctAnswersForTest).forEach(qNum => {
            const userAnswer = userAnswers[qNum];
            let correctAnswer = correctAnswersForTest[qNum];

            if (userAnswer != null && userAnswer !== '' && correctAnswer != null) {
                const normalizedUserAnswer = normalize(userAnswer);

                // Ensure correctAnswer is a string before splitting
                if (typeof correctAnswer !== 'string') {
                    correctAnswer = correctAnswer.toString();
                }

                const possibleCorrectAnswers = correctAnswer.split('/').map(normalize);

                const isMCQ = possibleCorrectAnswers.every(ans => ans.length === 1);

                let isCorrect = false;
                if (isMCQ) {
                    if (normalizedUserAnswer.length > 0) {
                        const userChoice = normalizedUserAnswer.charAt(0);
                        if (possibleCorrectAnswers.includes(userChoice)) {
                            isCorrect = true;
                        }
                    }
                } else {
                    if (possibleCorrectAnswers.includes(normalizedUserAnswer)) {
                        isCorrect = true;
                    }
                }

                if (isCorrect) {
                    score++;
                }
            }
        });

        setTestResults({
            score,
            totalQuestions: Object.keys(correctAnswersForTest).length,
            userAnswers,
            correctAnswersData: correctAnswersForTest,
            isTimeUp
        });

        setIsModalOpen(true);
    }, [answersData, mockId, testId, totalQuestions, userAnswers, isTestSubmitted]);

    // Handle timer expiration
    const handleTimeUp = useCallback(() => {
        handleSubmit(true);
    }, [handleSubmit]);

    // Notes functionality
    const generateNoteId = () => `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection();
        if (selection.rangeCount === 0 || selection.isCollapsed) return;

        const selectedText = selection.toString().trim();
        if (!selectedText || selectedText.length < 2) {
            return;
        }

        // Check if the selection is within a selectable content area
        const range = selection.getRangeAt(0);

        // Validate the range
        if (!range.startContainer || !range.endContainer ||
            !range.startContainer.parentNode || !range.endContainer.parentNode) {
            console.warn('Invalid selection range');
            return;
        }

        const container = range.commonAncestorContainer;
        const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;

        // Find the closest selectable-content element
        const selectableElement = element.closest('.selectable-content');
        if (!selectableElement) {
            return;
        }

        // Don't trigger on form elements, existing highlights, or interactive elements
        const target = range.startContainer.nodeType === Node.TEXT_NODE
            ? range.startContainer.parentElement
            : range.startContainer;

        if (target.closest('input, textarea, select, button, .highlighted-text, .modal-overlay')) {
            return;
        }

        // Check if selection overlaps with existing highlights
        const existingHighlights = selectableElement.querySelectorAll('.highlighted-text');
        let hasOverlap = false;

        for (const highlight of existingHighlights) {
            const highlightRange = document.createRange();
            try {
                highlightRange.selectNodeContents(highlight);
                if (range.intersectsNode(highlight)) {
                    hasOverlap = true;
                    break;
                }
            } catch (e) {
                // Ignore errors in range intersection check
            }
        }

        if (hasOverlap) {
            console.warn('Selection overlaps with existing highlight');
            return;
        }

        // Create a deep clone of the range to avoid reference issues
        const clonedRange = range.cloneRange();

        // Store selection info
        setCurrentSelection({
            text: selectedText,
            range: clonedRange,
            partIndex: currentPartIndex,
            timestamp: Date.now() // Add timestamp for debugging
        });
        setIsNoteModalOpen(true);
        setPendingNote('');
    }, [currentPartIndex]);

    const handleAddNote = useCallback(() => {
        if (!currentSelection) return;

        const newNote = {
            id: generateNoteId(),
            text: currentSelection.text,
            note: pendingNote,
            partIndex: currentSelection.partIndex,
            timestamp: Date.now(),
            // Store more precise location info for persistence
            startOffset: currentSelection.range.startOffset,
            endOffset: currentSelection.range.endOffset,
            startContainerPath: getNodePath(currentSelection.range.startContainer),
            endContainerPath: getNodePath(currentSelection.range.endContainer)
        };

        setPartNotes(prev => ({
            ...prev,
            [currentSelection.partIndex]: [
                ...(prev[currentSelection.partIndex] || []),
                newNote
            ]
        }));

        // Highlight the selected text with improved DOM handling
        const range = currentSelection.range;

        // Check if range is still valid and not collapsed
        if (range.collapsed || !range.startContainer.parentNode) {
            console.warn('Invalid range for highlighting');
            setIsNoteModalOpen(false);
            setCurrentSelection(null);
            setPendingNote('');
            return;
        }

        const span = document.createElement('span');
        span.className = 'highlighted-text';
        span.setAttribute('data-note-id', newNote.id);
        span.setAttribute('title', pendingNote ? `Note: ${pendingNote}` : 'Highlighted text');

        // Add click handler for deletion
        span.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDeleteHighlight(newNote.id);
        });

        // Improved highlighting approach
        try {
            // Check if the range can be surrounded directly
            const canSurround = range.startContainer === range.endContainer ||
                (range.startContainer.parentNode === range.endContainer.parentNode &&
                    range.startContainer.nodeType === Node.TEXT_NODE &&
                    range.endContainer.nodeType === Node.TEXT_NODE);

            if (canSurround) {
                range.surroundContents(span);
            } else {
                // Use a more robust approach for complex ranges
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);

                // Normalize the parent to clean up any text node fragments
                if (span.parentNode) {
                    span.parentNode.normalize();
                }
            }
        } catch (e) {
            console.error('Error creating highlight:', e);
            // Fallback: create a simpler highlight by splitting text nodes
            try {
                const startContainer = range.startContainer;
                const endContainer = range.endContainer;

                if (startContainer.nodeType === Node.TEXT_NODE &&
                    endContainer.nodeType === Node.TEXT_NODE) {

                    // Simple case: same text node
                    if (startContainer === endContainer) {
                        const textNode = startContainer;
                        const text = textNode.textContent;
                        const beforeText = text.substring(0, range.startOffset);
                        const selectedText = text.substring(range.startOffset, range.endOffset);
                        const afterText = text.substring(range.endOffset);

                        // Create new nodes
                        const beforeNode = beforeText ? document.createTextNode(beforeText) : null;
                        const afterNode = afterText ? document.createTextNode(afterText) : null;

                        span.textContent = selectedText;

                        // Replace the original text node
                        const parent = textNode.parentNode;
                        if (beforeNode) parent.insertBefore(beforeNode, textNode);
                        parent.insertBefore(span, textNode);
                        if (afterNode) parent.insertBefore(afterNode, textNode);
                        parent.removeChild(textNode);
                    }
                }
            } catch (fallbackError) {
                console.error('Fallback highlighting also failed:', fallbackError);
            }
        }

        // Clear modal state
        setIsNoteModalOpen(false);
        setCurrentSelection(null);
        setPendingNote('');

        // Clear browser selection with a small delay to ensure DOM is updated
        setTimeout(() => {
            window.getSelection().removeAllRanges();
        }, 10);
    }, [currentSelection, pendingNote]);

    // Helper function to get node path for persistence
    const getNodePath = (node) => {
        const path = [];
        let current = node;
        while (current && current !== document.body) {
            if (current.nodeType === Node.TEXT_NODE) {
                current = current.parentNode;
            }
            if (current.parentNode) {
                const siblings = Array.from(current.parentNode.children);
                const index = siblings.indexOf(current);
                if (index !== -1) {
                    path.unshift(index);
                }
            }
            current = current.parentNode;
        }
        return path;
    };

    // Delete highlight function
    const handleDeleteHighlight = useCallback((noteId) => {
        // Remove from state
        setPartNotes(prev => ({
            ...prev,
            [currentPartIndex]: (prev[currentPartIndex] || []).filter(note => note.id !== noteId)
        }));

        // Remove from DOM
        const highlightElement = document.querySelector(`[data-note-id="${noteId}"]`);
        if (highlightElement) {
            const parent = highlightElement.parentNode;
            if (parent) {
                parent.insertBefore(document.createTextNode(highlightElement.textContent), highlightElement);
                parent.removeChild(highlightElement);
                parent.normalize();
            }
        }
    }, [currentPartIndex]);

    // Enhanced delete function that works from any part
    const handleDeleteNoteFromViewer = useCallback((noteId, partIndex) => {
        // Remove from state
        setPartNotes(prev => ({
            ...prev,
            [partIndex]: (prev[partIndex] || []).filter(note => note.id !== noteId)
        }));

        // Remove from DOM only if we're currently viewing that part
        if (partIndex === currentPartIndex) {
            const highlightElement = document.querySelector(`[data-note-id="${noteId}"]`);
            if (highlightElement) {
                const parent = highlightElement.parentNode;
                if (parent) {
                    parent.insertBefore(document.createTextNode(highlightElement.textContent), highlightElement);
                    parent.removeChild(highlightElement);
                    parent.normalize();
                }
            }
        }
    }, [currentPartIndex]);

    const handleCancelNote = useCallback(() => {
        setIsNoteModalOpen(false);
        setCurrentSelection(null);
        setPendingNote('');
        window.getSelection().removeAllRanges();
    }, []);

    // Clear highlights when changing parts and restore current part highlights
    useEffect(() => {
        // Debounce highlight restoration to prevent conflicts with ongoing selections
        const timeoutId = setTimeout(() => {
            // Remove all existing highlights
            const allHighlights = document.querySelectorAll('.highlighted-text');
            allHighlights.forEach(highlight => {
                const parent = highlight.parentNode;
                if (parent) {
                    parent.insertBefore(document.createTextNode(highlight.textContent), highlight);
                    parent.removeChild(highlight);
                    // Use setTimeout to normalize after DOM has settled
                    setTimeout(() => parent.normalize(), 0);
                }
            });

            // Restore highlights for current part with a small delay
            setTimeout(() => {
                const currentPartNotes = partNotes[currentPartIndex] || [];
                currentPartNotes.forEach(note => {
                    try {
                        restoreHighlight(note);
                    } catch (e) {
                        console.warn('Could not restore highlight for note:', note.id, e);
                    }
                });
            }, 50);
        }, 100); // Add delay to prevent conflicts with ongoing selections

        return () => clearTimeout(timeoutId);
    }, [currentPartIndex, partNotes]);

    // Attempt to restore highlight (improved version)
    const restoreHighlight = (note) => {
        // Find all selectable content areas
        const selectableAreas = document.querySelectorAll('.selectable-content');

        for (let area of selectableAreas) {
            // Skip if note text is too short or area doesn't contain the text
            if (!note.text || note.text.length < 2) continue;

            const text = area.textContent;
            const noteText = note.text;
            const index = text.indexOf(noteText);

            // Try to find exact match first
            if (index !== -1) {
                // Check if this text is already highlighted
                const existingHighlight = area.querySelector(`[data-note-id="${note.id}"]`);
                if (existingHighlight) {
                    continue; // Already highlighted
                }

                // Found the text, try to highlight it
                const walker = document.createTreeWalker(
                    area,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );

                let charCount = 0;
                let startNode = null;
                let startOffset = 0;
                let endNode = null;
                let endOffset = 0;

                while (walker.nextNode()) {
                    const node = walker.currentNode;
                    const nodeLength = node.textContent.length;

                    if (charCount + nodeLength > index && !startNode) {
                        startNode = node;
                        startOffset = Math.max(0, index - charCount);
                    }

                    if (charCount + nodeLength >= index + noteText.length && !endNode) {
                        endNode = node;
                        endOffset = Math.min(nodeLength, (index + noteText.length) - charCount);
                        break;
                    }

                    charCount += nodeLength;
                }

                if (startNode && endNode && startOffset >= 0 && endOffset >= 0) {
                    try {
                        const range = document.createRange();
                        range.setStart(startNode, startOffset);
                        range.setEnd(endNode, endOffset);

                        // Validate range before proceeding
                        if (range.collapsed || range.toString().trim() !== noteText.trim()) {
                            continue;
                        }

                        const span = document.createElement('span');
                        span.className = 'highlighted-text';
                        span.setAttribute('data-note-id', note.id);
                        span.setAttribute('title', note.note ? `Note: ${note.note}` : 'Highlighted text');

                        // Add click handler for deletion
                        span.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteHighlight(note.id);
                        });

                        // Use the improved highlighting approach
                        const canSurround = range.startContainer === range.endContainer ||
                            (range.startContainer.parentNode === range.endContainer.parentNode &&
                                range.startContainer.nodeType === Node.TEXT_NODE &&
                                range.endContainer.nodeType === Node.TEXT_NODE);

                        if (canSurround) {
                            range.surroundContents(span);
                        } else {
                            const contents = range.extractContents();
                            span.appendChild(contents);
                            range.insertNode(span);

                            // Normalize parent after insertion
                            if (span.parentNode) {
                                span.parentNode.normalize();
                            }
                        }

                        break; // Successfully restored, exit loop
                    } catch (e) {
                        console.debug('Failed to restore highlight for note:', note.id, e);
                        // Continue to next area if this one fails
                    }
                }
            }
        }
    };

    // Add text selection event listener
    useEffect(() => {
        let debounceTimeout;
        let lastSelectionTime = 0;

        const handleGlobalMouseUp = (event) => {
            const now = Date.now();

            // Only prevent rapid-fire events if they're from the same element
            // Reduce the prevention time to allow faster consecutive selections
            if (now - lastSelectionTime < 150) {
                return;
            }

            // Clear any existing timeout
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
            }

            // Reduced debounce time for more responsive selection
            debounceTimeout = setTimeout(() => {
                const selection = window.getSelection();

                // Check if we have a valid selection
                if (selection.rangeCount > 0 && !selection.isCollapsed) {
                    const selectedText = selection.toString().trim();

                    // Make sure the selection is not within form elements or buttons
                    const range = selection.getRangeAt(0);
                    const container = range.commonAncestorContainer;
                    const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;

                    // Skip if selection is within form elements or other interactive elements
                    if (element.closest('input, textarea, select, button, .modal-overlay, .highlighted-text')) {
                        return;
                    }

                    // Check if selection is within a valid selectable area
                    const selectableElement = element.closest('.selectable-content');
                    if (!selectableElement) {
                        return;
                    }

                    if (selectedText.length >= 2) {
                        lastSelectionTime = now;
                        handleTextSelection();
                    }
                }
            }, 100); // Reduced from 200ms to 100ms for faster response
        };

        // Also listen to touchend for mobile devices
        const handleTouchEnd = (event) => {
            // Small delay to allow selection to complete on touch devices
            setTimeout(() => handleGlobalMouseUp(event), 50);
        };

        document.addEventListener('mouseup', handleGlobalMouseUp);
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
            }
            document.removeEventListener('mouseup', handleGlobalMouseUp);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTextSelection]);

    // Add keyboard shortcut for testing
    useEffect(() => {
        const handleKeyDown = (event) => {
            // Ctrl/Cmd + Shift + H for testing selection
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'H') {
                event.preventDefault();
                handleTextSelection();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleTextSelection]);

    const testDuration = test?.durationInMinutes || 40;
    const [mockTimeLeftSeconds, setMockTimeLeftSeconds] = useState(testDuration * 60);

    useEffect(() => {
        setMockTimeLeftSeconds(testDuration * 60);
    }, [testDuration, test?.id]);

    const handleLogout = useCallback(async () => {
        const storedSession = getMockSession();
        const token = storedSession?.accessToken;

        // Если токена нет, просто чистим локальную сессию и уходим на главную без запроса
        if (!token) {
            clearMockSession();
            router.replace('/');
            return;
        }

        try {
            await logoutAgent(token);
        } catch (error) {
            console.error('Mock agent logout failed:', error);
        } finally {
            clearMockSession();
            router.replace('/');
        }
    }, [router]);

    useEffect(() => {
        if (!isMockExam || !testStarted || isTestSubmitted) return;

        const intervalId = setInterval(() => {
            setMockTimeLeftSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalId);
                    handleSubmit(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(intervalId);
    }, [isMockExam, testStarted, isTestSubmitted, handleSubmit]);

    const mockTimeLeftText = useMemo(() => {
        if (mockTimeLeftSeconds <= 0) {
            return '0 minutes left';
        }

        const minutesLeft = Math.ceil(mockTimeLeftSeconds / 60);
        return `${minutesLeft} minutes left`;
    }, [mockTimeLeftSeconds]);

    if (isLoading) {
        return (
            <div className="ielts-section loading" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
                gap: '1rem'
            }}>
                <Spinner />
            </div>
        );
    }

    if (!test) {
        return (
            <div className="ielts-section">
                <div className="book-header" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <h1 className="section-title">{t('testNotFound')}</h1>
                </div>
            </div>
        );
    }

    if (!testParts.length) {
        return (
            <div className="ielts-section">
                <div className="book-header" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <h1 className="section-title">{t('testNotFound', 'Test parts are missing')}</h1>
                </div>
            </div>
        );
    }

    const activePart = testParts[currentPartIndex];
    const currentPartNotesCount = (partNotes[currentPartIndex] || []).length;
    // Calculate total notes across all parts
    const totalNotesCount = Object.values(partNotes).reduce((total, notes) => total + notes.length, 0);

    return (
        <div className={`test-listening-page ${isMockExam ? 'mock-exam-mode' : ''}`}>
            {isMockExam ? (
                <MockExamTopBar
                    candidateId="candidate@ieltsx.com"
                    timeText={mockTimeLeftText}
                    onSubmit={() => handleSubmit(false)}
                    isSubmitDisabled={!isSubmittable || isTestSubmitted}
                    onLogout={handleLogout}
                />
            ) : (
                <TestHeader testTitle={testTitle} testName={test.name} backTo="/mock/listening" />
            )}

            {/* Timer Component */}
            {!isMockExam && testStarted && !isTestSubmitted && (
                <div className="timer-container">
                    <Timer
                        durationInMinutes={testDuration}
                        onTimeUp={handleTimeUp}
                        isActive={true}
                    />
                </div>
            )}

            {isMockExam ? (
                <div className="mock-listening-intro">
                    <h2>Listening Part {activePart.part}</h2>
                    <p>
                        Listen to the audio and answer questions{' '}
                        {allQuestionNumbers.length ? `${allQuestionNumbers[0]} - ${allQuestionNumbers[allQuestionNumbers.length - 1]}` : '1 - 40'}.
                    </p>
                </div>
            ) : (
                <TestOverview partCount={testParts.length} totalQuestions={totalQuestions} />
            )}

            {!isMockExam && (
                <TestProgress
                    totalQuestions={totalQuestions}
                    answeredCount={Object.keys(userAnswers).length}
                />
            )}

            {/* Enhanced Notes indicator for current part with view all button */}
            {!isMockExam && <div className="notes-section">
                {currentPartNotesCount > 0 && (
                    <div className="part-notes-indicator">
                        <span className="notes-count">
                            {currentPartNotesCount === 1
                                ? t('partNotes', { count: currentPartNotesCount })
                                : t('partNotes_plural', { count: currentPartNotesCount })
                            }
                        </span>
                        <div className="notes-preview">
                            {(partNotes[currentPartIndex] || []).slice(0, 2).map((note, index) => (
                                <div key={note.id} className="note-preview-item">
                                    <span className="note-text">"{note.text.substring(0, 30)}{note.text.length > 30 ? '...' : ''}"</span>
                                    {note.note && <span className="note-content">: {note.note.substring(0, 50)}{note.note.length > 50 ? '...' : ''}</span>}
                                </div>
                            ))}
                            {currentPartNotesCount > 2 && (
                                <div className="notes-more">+{currentPartNotesCount - 2} more notes</div>
                            )}
                        </div>
                    </div>
                )}

                {/* View All Notes Button */}
                <div className="notes-actions">
                    <button
                        className={`view-all-notes-btn ${totalNotesCount > 0 ? 'has-notes' : ''}`}
                        onClick={() => setIsNotesViewerOpen(true)}
                        title={t('notesViewer.viewAllNotes', 'View all notes')}
                    >
                        <FiFileText /> {totalNotesCount > 0
                            ? t('notesViewer.viewNotes', 'View Notes ({{count}})', { count: totalNotesCount })
                            : t('notesViewer.noNotesYet', 'No Notes Yet')
                        }
                    </button>
                </div>
            </div>}

            <div className="test-container" ref={testContainerRef}>
                <PartNavigation
                    parts={testParts}
                    currentPartIndex={currentPartIndex}
                    onSelectPart={handlePartNavigation}
                />

                <div className="part-content-card">
                    <PartHeader partNumber={activePart.part} audioUrl={activePart.audioUrl} />

                    {activePart.audioUrl && (
                        <div className="audio-player-container">
                            <audio
                                controls
                                src={activePart.audioUrl}
                                className="audio-player"
                                preload="metadata"
                                onError={(e) => {
                                    console.error('Audio loading error:', e);
                                }}
                                onLoadStart={() => {
                                    console.log('Audio loading started');
                                }}
                                onCanPlay={() => {
                                    console.log('Audio can start playing');
                                }}
                            >
                                {t('audioNotSupported')}
                            </audio>
                        </div>
                    )}

                    {
                        activePart.instruction && (
                            <div className="part-instructions selectable-content">
                                <p className="instruction-text">{activePart.instruction}</p>
                            </div>
                        )
                    }

                    <div className="questions-area selectable-content">
                        <QuestionRenderer
                            item={activePart}
                            userAnswers={userAnswers}
                            onAnswerChange={handleAnswerChange}
                            optionsBox={null}
                        />
                    </div>

                    <TestNavigation
                        currentPartIndex={currentPartIndex}
                        totalParts={testParts.length}
                        onNavigate={handlePartNavigation}
                        onSubmit={() => handleSubmit(false)}
                        isSubmittable={isSubmittable && !isTestSubmitted}
                    />
                </div>
            </div>

            {/* Results Modal */}
            <ResultsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                results={testResults}
                bookId={bookId}
                testId={testId}
                ieltsScoreGuidance={answersData?.ielts_score_guidance}
                nextHref={nextHref}
                difficultyOverride={difficulty}
            />

            {/* Notes Modal */}
            <NoteModal
                isOpen={isNoteModalOpen}
                currentSelection={currentSelection}
                pendingNote={pendingNote}
                onCancel={handleCancelNote}
                onAdd={handleAddNote}
                onNoteChange={setPendingNote}
            />

            {/* Notes Viewer Modal */}
            <NotesViewerModal
                isOpen={isNotesViewerOpen}
                onClose={() => setIsNotesViewerOpen(false)}
                partNotes={partNotes}
                onDeleteNote={handleDeleteNoteFromViewer}
                onNavigateToPart={handlePartNavigation}
                currentPartIndex={currentPartIndex}
                testParts={testParts}
                t={t}
            />

            {isMockExam && (
                <MockExamBottomNav
                    parts={testParts}
                    currentPartIndex={currentPartIndex}
                    onSelectPart={handlePartNavigation}
                    activePartQuestionNumbers={activePartQuestionNumbers}
                    currentQuestionNumber={currentQuestionNumber}
                    onSelectQuestion={scrollToQuestion}
                    onPrevNextQuestion={goToPrevNextQuestion}
                    partTotals={partTotals}
                    partAnsweredCounts={partAnsweredCounts}
                />
            )}
        </div>
    );
};

export default TestListeningPage;