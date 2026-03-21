import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useUserDataMirror } from '@/hooks/useUserDataMirror';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/components/common/LoadingContext';
import { checkAnswer, getCorrectAnswerTextForScoring, checkAnswerVariants, normalizeText } from '@/utils/answerChecker';
import { getQuestionAnswerCount, getProvidedAnswerCount } from '../helpers/questionUtils';
import { groupQuestionsByType } from '../helpers/QuestionGrouping';
import { isMockSessionMismatchError, saveMockSectionAnswers } from '@/lib/mockApi';
import { getMockSession } from '@/lib/mockSession';

// Constants
const HIGHLIGHT_DURATION = 2000;
const LOADING_DELAY = 300;
const SCROLL_DELAY = 200;
const AUTOSAVE_DELAY_MS = 700;

const EMPTY_VALUE = null;

const normalizeSlotValue = (value) => {
    if (value === null || value === undefined) return EMPTY_VALUE;
    const normalized = String(value).trim();
    return normalized === '' ? EMPTY_VALUE : normalized;
};

const getBlankByIndexFromSummary = (summaryText, answerIndex) => {
    if (typeof summaryText !== 'string') return null;
    const matches = summaryText.match(/___(\d+)___/g) || [];
    const target = matches[answerIndex];
    if (!target) return null;
    const id = target.match(/(\d+)/)?.[1];
    return id || null;
};

const getBlankByIndexFromFlowChart = (flowChart, answerIndex) => {
    if (!flowChart) return null;

    if (typeof flowChart === 'object' && flowChart.type === 'vertical' && Array.isArray(flowChart.steps)) {
        const blanks = [];
        flowChart.steps.forEach((step) => {
            if (step?.blank != null) blanks.push(String(step.blank));
            if (step?.blank2 != null) blanks.push(String(step.blank2));
        });
        return blanks[answerIndex] || null;
    }

    if (typeof flowChart === 'string') {
        const matches = flowChart.match(/___(\d+)___/g) || [];
        const target = matches[answerIndex];
        if (!target) return null;
        return target.match(/(\d+)/)?.[1] || null;
    }

    return null;
};

const getBlankByIndexFromTable = (table, answerIndex) => {
    if (!table?.rows || !table?.headers) return null;
    let currentIndex = 0;
    for (const row of table.rows) {
        for (const header of table.headers) {
            const cellValue = row?.[header];
            const match = typeof cellValue === 'string' ? cellValue.match(/___(\d+)___/) : null;
            if (!match) continue;
            if (currentIndex === answerIndex) return match[1];
            currentIndex += 1;
        }
    }
    return null;
};

const getBlankByIndexFromNotes = (notes, answerIndex) => {
    if (!Array.isArray(notes)) return null;
    let currentIndex = 0;
    for (const note of notes) {
        const matches = (typeof note === 'string' ? note.match(/(?:___(\d+)___|(\d+)\.{2,})/g) : null) || [];
        for (const match of matches) {
            if (currentIndex === answerIndex) {
                return match.match(/(\d+)/)?.[1] || null;
            }
            currentIndex += 1;
        }
    }
    return null;
};

const getReadingSlotValue = (question, userAnswer, answerIndex) => {
    if (!question) return EMPTY_VALUE;

    switch (question.type) {
        case 'multiple_choice':
        case 'true_false':
        case 'true_false_not_given':
        case 'yes_no_not_given':
            return normalizeSlotValue(userAnswer);

        case 'multiple_choice_multiple':
            if (!Array.isArray(userAnswer)) return EMPTY_VALUE;
            return normalizeSlotValue(userAnswer[answerIndex]);

        case 'matching_headings': {
            if (!userAnswer || typeof userAnswer !== 'object') return EMPTY_VALUE;
            const section = question.sections?.[answerIndex];
            const key = typeof section === 'object' ? section?.section : section;
            if (!key) return EMPTY_VALUE;
            return normalizeSlotValue(userAnswer[key]);
        }

        case 'matching_information': {
            if (!userAnswer || typeof userAnswer !== 'object') return EMPTY_VALUE;
            const item = question.information?.[answerIndex];
            const key = typeof item === 'object' ? item?.info : item;
            if (!key) return EMPTY_VALUE;
            return normalizeSlotValue(userAnswer[key]);
        }

        case 'matching_features': {
            if (!userAnswer || typeof userAnswer !== 'object') return EMPTY_VALUE;
            const feature = question.features?.[answerIndex];
            if (!feature) return EMPTY_VALUE;
            const raw = typeof feature === 'string' ? feature : String(feature);
            const key = raw.includes('.') ? raw.slice(0, raw.indexOf('.')) : raw;
            return normalizeSlotValue(userAnswer[key]);
        }

        case 'matching_sentences': {
            if (!userAnswer || typeof userAnswer !== 'object') return EMPTY_VALUE;
            const item = question.items?.[answerIndex];
            const key = item?.id != null ? String(item.id) : null;
            if (!key) return EMPTY_VALUE;
            return normalizeSlotValue(userAnswer[key]);
        }

        case 'short_answer': {
            if (question.instruction && Array.isArray(question.questions)) {
                if (!userAnswer || typeof userAnswer !== 'object') return EMPTY_VALUE;
                const key = question.questions[answerIndex];
                return key ? normalizeSlotValue(userAnswer[key]) : EMPTY_VALUE;
            }
            return normalizeSlotValue(userAnswer);
        }

        case 'sentence_completion': {
            if (!userAnswer || typeof userAnswer !== 'object') return EMPTY_VALUE;
            const sentence = question.sentences?.[answerIndex];
            const key = typeof sentence === 'object' ? sentence?.beginning : sentence;
            if (!key) return EMPTY_VALUE;
            return normalizeSlotValue(userAnswer[key]);
        }

        case 'summary_completion': {
            if (!userAnswer || typeof userAnswer !== 'object') return EMPTY_VALUE;
            const blankId = getBlankByIndexFromSummary(question.summary, answerIndex);
            return blankId ? normalizeSlotValue(userAnswer[blankId]) : EMPTY_VALUE;
        }

        case 'flow_chart_completion': {
            if (!userAnswer || typeof userAnswer !== 'object') return EMPTY_VALUE;
            const blankId = getBlankByIndexFromFlowChart(question.flow_chart, answerIndex);
            return blankId ? normalizeSlotValue(userAnswer[blankId]) : EMPTY_VALUE;
        }

        case 'table_completion': {
            if (!userAnswer || typeof userAnswer !== 'object') return EMPTY_VALUE;
            const blankId = getBlankByIndexFromTable(question.table, answerIndex);
            return blankId ? normalizeSlotValue(userAnswer[blankId]) : EMPTY_VALUE;
        }

        case 'diagram_labelling': {
            if (!userAnswer || typeof userAnswer !== 'object') return EMPTY_VALUE;
            const label = question.labels?.[answerIndex];
            const key = label?.position;
            return key ? normalizeSlotValue(userAnswer[key]) : EMPTY_VALUE;
        }

        case 'note_completion': {
            if (!userAnswer || typeof userAnswer !== 'object') return EMPTY_VALUE;
            const blankId = getBlankByIndexFromNotes(question.notes, answerIndex);
            return blankId ? normalizeSlotValue(userAnswer[blankId]) : EMPTY_VALUE;
        }

        default:
            return normalizeSlotValue(userAnswer);
    }
};

// Storage utility functions
const storageUtils = {
    getGuestReadingData: () => {
        try {
            const raw = localStorage.getItem('guest_reading') || '{}';
            return JSON.parse(raw);
        } catch {
            return {};
        }
    },

    updateGuestCompletion: (readingId, score, totalQuestions) => {
        try {
            const data = storageUtils.getGuestReadingData();
            const completedReadings = data?.completed_readings || {};
            const current = completedReadings[readingId];

            const isNewOrBetter = !current || current.bestScore < score;

            completedReadings[readingId] = {
                completed: true,
                bestScore: isNewOrBetter ? score : current.bestScore,
                totalQuestions: isNewOrBetter ? totalQuestions : current.totalQuestions,
                totalAttempts: (current?.totalAttempts || 0) + 1,
            };

            localStorage.setItem('guest_reading', JSON.stringify({
                ...data,
                completed_readings: completedReadings
            }));

            window.dispatchEvent(new Event('reading-completion-changed'));
        } catch (error) {
            console.error('Failed to update guest completion:', error);
        }
    }
};

// Score calculation helper
const calculateQuestionScore = (question, userAnswer, readingId) => {
    if (!userAnswer) return 0;

    const { type } = question;

    switch (type) {
        case 'multiple_choice':
        case 'true_false':
        case 'true_false_not_given':
        case 'yes_no_not_given':
            return checkAnswer(question, userAnswer, readingId) ? 1 : 0;

        case 'multiple_choice_multiple':
            if (!Array.isArray(userAnswer)) return 0;
            const correctAnswers = getCorrectAnswerTextForScoring(question, readingId);
            if (!Array.isArray(correctAnswers)) return 0;
            return userAnswer.filter(ans =>
                correctAnswers.some(correct =>
                    normalizeText(ans) === normalizeText(correct)
                )
            ).length;

        case 'matching_headings':
        case 'matching_information':
        case 'matching_features':
            if (typeof userAnswer !== 'object' || userAnswer === null) return 0;
            return countMatchingAnswers(userAnswer, getCorrectAnswerTextForScoring(question, readingId));

        case 'short_answer':
            if (question.instruction && Array.isArray(question.questions)) {
                return countCompletionAnswers(userAnswer, getCorrectAnswerTextForScoring(question, readingId));
            }
            return checkAnswer(question, userAnswer, readingId) ? 1 : 0;

        case 'sentence_completion':
        case 'summary_completion':
        case 'table_completion':
        case 'flow_chart_completion':
        case 'note_completion':
        case 'diagram_labelling':
            if (typeof userAnswer !== 'object' || userAnswer === null) return 0;
            return countCompletionAnswers(userAnswer, getCorrectAnswerTextForScoring(question, readingId));

        default:
            return checkAnswer(question, userAnswer, readingId) ? getQuestionAnswerCount(question) : 0;
    }
};

// Helper for matching questions
const countMatchingAnswers = (userAnswers, correctAnswers) => {
    return Object.entries(userAnswers).filter(([key, value]) => {
        const correctValue = correctAnswers[key];
        if (!correctValue) return false;

        const userVal = typeof value === 'string' ? value.trim() : String(value || '');
        const token = typeof correctValue === 'string'
            ? String(correctValue).replace(/\./g, '').trim()
            : String(correctValue);

        const isRoman = /^[ivxlcdm]+$/i.test(token);
        const isSingleLetter = /^[A-Za-z]$/.test(token);

        if ((isRoman || isSingleLetter) && userVal) {
            const trailing = userVal.match(/([A-Za-z]|[ivxlcdm]{1,4})\.?$/i)?.[1];
            const leading = userVal.match(/^([A-Za-z]|[ivxlcdm]{1,4})\.?/i)?.[1];
            const extracted = (trailing || leading || '').toString().trim();

            if (extracted) {
                return normalizeText(extracted) === normalizeText(token);
            }
        }

        return normalizeText(userVal) === normalizeText(String(correctValue));
    }).length;
};

// Helper for completion questions
const countCompletionAnswers = (userAnswers, correctAnswers) => {
    return Object.entries(userAnswers || {}).filter(([key, value]) => {
        const correctValue = correctAnswers[key];
        return correctValue && checkAnswerVariants(value, correctValue);
    }).length;
};

export const useReadingState = (readingExercise, difficulty, id, externalStartTime = null) => {
    const { isAuthenticated } = useUser();
    const { queueReadingCompletionUpdate, upsertReadingBestResult } = useUserDataMirror();
    const router = useRouter();
    const { setIsLoading } = useLoading();

    // Refs
    const startTimeRef = useRef(externalStartTime || Date.now());
    const timeoutRefs = useRef(new Set());
    const sessionMismatchNotifiedRef = useRef(false);

    // Core state
    const [readingData, setReadingData] = useState(null);
    const [userAnswers, setUserAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [results, setResults] = useState(null);
    const [reviewMap, setReviewMap] = useState(null);
    const [columnWidth, setColumnWidth] = useState(50);
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Timer state
    const [timerStartTime, setTimerStartTime] = useState(null);
    const [finalTimerState, setFinalTimerState] = useState(null);
    const [adjustedTimeLimit, setAdjustedTimeLimit] = useState(null);
    const [isTimerPaused, setIsTimerPaused] = useState(false);

    // Filter and navigation state
    const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([]);
    const [activePassageId, setActivePassageId] = useState(1);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);
    const [inlinePassagePick, setInlinePassagePick] = useState(null);
    const autosaveTimeoutRef = useRef(null);
    const lastSavedPayloadRef = useRef('');

    // Cleanup timeouts on unmount
    useEffect(() => {
        const timeouts = timeoutRefs.current;
        return () => {
            timeouts.forEach(clearTimeout);
            timeouts.clear();
        };
    }, []);

    // Timeout manager
    const createTimeout = useCallback((callback, delay) => {
        const timeoutId = setTimeout(() => {
            timeoutRefs.current.delete(timeoutId);
            callback();
        }, delay);
        timeoutRefs.current.add(timeoutId);
        return timeoutId;
    }, []);

    const notifyMockSessionMismatch = useCallback(() => {
        if (sessionMismatchNotifiedRef.current) return;
        sessionMismatchNotifiedRef.current = true;

        if (typeof window !== 'undefined') {
            window.alert('Сессия больше не связана с этим mock тестом. Перезайдите и запустите тест заново, чтобы продолжить сохранение ответов.');
        }
    }, []);

    // Detect multi-passage format
    const isMultiPassage = useMemo(() =>
        readingExercise?.passages?.length > 1,
        [readingExercise]
    );

    // Process reading data
    const processedReadingData = useMemo(() => {
        if (!readingExercise) return null;

        const buildMatchingSentencesQuestion = (section) => {
            const sectionQuestions = Array.isArray(section?.questions) ? section.questions : [];
            const items = sectionQuestions
                .slice()
                .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
                .map((q) => ({
                    id: q.id,
                    order: q.order,
                    text: q.question_text || q.text || ''
                }));

            const options = (Array.isArray(section?.list_selections) ? section.list_selections : [])
                .map((s, index) => {
                    const fallbackLabel = String.fromCharCode(65 + index);
                    const label = (s?.label || fallbackLabel).toString().trim().toUpperCase();
                    const text = (s?.text || '').toString().trim();
                    if (!label && !text) return null;
                    return {
                        value: label,
                        label,
                        text: text || label
                    };
                })
                .filter(Boolean);

            const syntheticOrder = items.length
                ? Math.min(...items.map((it) => (typeof it.order === 'number' ? it.order : Number.POSITIVE_INFINITY)))
                : section?.order;

            return {
                id: section.id,
                type: 'matching_sentences',
                instruction: section.instructions || '',
                items,
                options,
                // keep raw selections for future needs (e.g., showing label separately)
                list_selections: section.list_selections || [],
                order: syntheticOrder
            };
        };

        const normalizePassageQuestions = (passage) => {
            const baseQuestions = Array.isArray(passage?.questions) ? passage.questions : [];
            const sections = Array.isArray(passage?.sections) ? passage.sections : [];

            const matchingSections = sections
                .filter((s) => s?.section_type === 'matching_sentences')
                .map(buildMatchingSentencesQuestion)
                .filter((q) => q?.items?.length);

            if (matchingSections.length === 0) {
                return baseQuestions;
            }

            // Avoid duplicates if backend already provides matching_sentences in passage.questions
            const hasMatchingAlready = baseQuestions.some((q) => q?.type === 'matching_sentences');
            const merged = hasMatchingAlready ? baseQuestions : [...baseQuestions, ...matchingSections];

            // Ensure stable ordering: prefer numeric `order` when available, otherwise keep original order.
            return merged
                .map((q, idx) => ({ q, __idx: idx }))
                .sort((a, b) => {
                    const ao = a.q?.order;
                    const bo = b.q?.order;
                    const aHas = typeof ao === 'number' && !Number.isNaN(ao);
                    const bHas = typeof bo === 'number' && !Number.isNaN(bo);
                    if (aHas && bHas) return ao - bo;
                    if (aHas && !bHas) return -1;
                    if (!aHas && bHas) return 1;
                    return a.__idx - b.__idx;
                })
                .map((x) => x.q);
        };

        const baseData = {
            id: parseInt(id),
            level: difficulty,
            title: readingExercise.title,
            metadata: {
                timeLimit: readingExercise.metadata?.timeLimit,
                skills: readingExercise.metadata?.skills
            },
            source: readingExercise.source,
            mockId: readingExercise.mockId
        };

        if (isMultiPassage) {
            const normalizedPassages = (readingExercise.passages || []).map((p) => ({
                ...p,
                questions: normalizePassageQuestions(p)
            }));

            return {
                ...baseData,
                topic: readingExercise.topic,
                total_questions: readingExercise.total_questions,
                total_passages: readingExercise.total_passages,
                passages: normalizedPassages,
                questions: normalizedPassages.flatMap(p => p.questions || []),
                isMultiPassage: true
            };
        }

        return {
            ...baseData,
            passage: readingExercise.passage,
            questions: readingExercise.questions,
            isMultiPassage: false
        };
    }, [id, difficulty, readingExercise, isMultiPassage]);

    // All questions
    const allQuestions = useMemo(() => {
        if (!readingData) return [];
        return readingData.isMultiPassage
            ? readingData.passages?.flatMap(p => p.questions || []) || []
            : readingData.questions || [];
    }, [readingData]);

    // Individual answer slots
    const allAnswersData = useMemo(() => {
        if (!allQuestions.length) {
            return { questionsWithAnswerCounts: [], totalAnswers: 0, individualAnswerSlots: [] };
        }

        const questionsWithAnswerCounts = allQuestions.map(q => ({
            ...q,
            answerCount: getQuestionAnswerCount(q)
        }));

        const totalAnswers = questionsWithAnswerCounts.reduce((sum, q) => sum + q.answerCount, 0);
        const individualAnswerSlots = [];
        let sequentialIndex = 1;

        questionsWithAnswerCounts.forEach(question => {
            for (let i = 0; i < question.answerCount; i++) {
                individualAnswerSlots.push({
                    sequentialNumber: sequentialIndex++,
                    questionId: question.id,
                    questionType: question.type,
                    answerIndex: i,
                    isAnswered: false
                });
            }
        });

        return { questionsWithAnswerCounts, totalAnswers, individualAnswerSlots };
    }, [allQuestions]);

    // Question ranges for navigation
    const questionRanges = useMemo(() => {
        const ranges = {};
        allAnswersData.individualAnswerSlots.forEach(slot => {
            if (slot.questionId !== -1) {
                if (!ranges[slot.questionId]) {
                    ranges[slot.questionId] = {
                        start: slot.sequentialNumber,
                        end: slot.sequentialNumber
                    };
                } else {
                    ranges[slot.questionId].end = slot.sequentialNumber;
                }
            }
        });
        return ranges;
    }, [allAnswersData.individualAnswerSlots]);

    // Visible passages
    const visiblePassages = useMemo(() => {
        if (!readingData?.isMultiPassage || !readingData.passages) return [];
        if (!selectedQuestionTypes?.length) return readingData.passages;
        return readingData.passages.filter(passage =>
            passage?.questions?.some(q => selectedQuestionTypes.includes(q.type))
        );
    }, [readingData, selectedQuestionTypes]);

    // Current passage
    const currentPassage = useMemo(() => {
        if (!readingData?.isMultiPassage || !readingData.passages) return null;
        const sourcePassages = selectedQuestionTypes?.length ? visiblePassages : readingData.passages;
        if (!sourcePassages?.length) return null;
        return sourcePassages.find(p => p.passage_id === activePassageId) || sourcePassages[0];
    }, [readingData, activePassageId, selectedQuestionTypes, visiblePassages]);

    // Current passage questions
    const currentPassageQuestions = useMemo(() => {
        if (!readingData) return [];
        return readingData.isMultiPassage
            ? (currentPassage?.questions || [])
            : (readingData.questions || []);
    }, [readingData, currentPassage]);

    // Filtered questions (current passage)
    const filteredQuestions = useMemo(() => {
        if (!currentPassageQuestions.length) return [];
        return selectedQuestionTypes.length === 0
            ? currentPassageQuestions
            : currentPassageQuestions.filter(q => selectedQuestionTypes.includes(q.type));
    }, [currentPassageQuestions, selectedQuestionTypes]);

    // Filtered questions (all passages)
    const filteredQuestionsGlobal = useMemo(() => {
        if (!allQuestions.length) return [];
        return selectedQuestionTypes.length === 0
            ? allQuestions
            : allQuestions.filter(q => selectedQuestionTypes.includes(q.type));
    }, [allQuestions, selectedQuestionTypes]);

    // Grouped questions
    const groupedQuestions = useMemo(() =>
        groupQuestionsByType(filteredQuestions),
        [filteredQuestions]
    );

    // Answer counts
    const answerCounts = useMemo(() => {
        const counts = {
            totalAnsweredCount: 0,
            currentPassageAnsweredCount: 0,
            filteredGlobalAnsweredCount: 0
        };

        allQuestions.forEach(question => {
            const answer = userAnswers[question.id];
            counts.totalAnsweredCount += getProvidedAnswerCount(answer, question);
        });

        filteredQuestions.forEach(question => {
            const answer = userAnswers[question.id];
            counts.currentPassageAnsweredCount += getProvidedAnswerCount(answer, question);
        });

        filteredQuestionsGlobal.forEach(question => {
            const answer = userAnswers[question.id];
            counts.filteredGlobalAnsweredCount += getProvidedAnswerCount(answer, question);
        });

        const totalQuestions = filteredQuestions.reduce(
            (sum, q) => sum + getQuestionAnswerCount(q), 0
        );

        const filteredGlobalTotalQuestions = filteredQuestionsGlobal.reduce(
            (sum, q) => sum + getQuestionAnswerCount(q), 0
        );

        return {
            ...counts,
            answeredCount: counts.currentPassageAnsweredCount,
            totalQuestions,
            totalAllQuestions: allAnswersData.individualAnswerSlots.length,
            allQuestionsAnswered: counts.totalAnsweredCount === allAnswersData.totalAnswers && allAnswersData.totalAnswers > 0,
            currentPassageCompleted: counts.currentPassageAnsweredCount === totalQuestions && totalQuestions > 0,
            filteredGlobalTotalQuestions
        };
    }, [userAnswers, allQuestions, filteredQuestions, filteredQuestionsGlobal, allAnswersData]);

    // Question sequence mapping
    const questionSequenceMap = useMemo(() => {
        const toSequential = new Map();
        const toActual = new Map();

        allQuestions.forEach((question, index) => {
            const sequentialNumber = index + 1;
            toSequential.set(question.id, sequentialNumber);
            toActual.set(sequentialNumber, question.id);
        });

        return { toSequential, toActual };
    }, [allQuestions]);

    // Passage content
    const passageContent = useMemo(() => {
        const text = readingData?.isMultiPassage ? currentPassage?.text : readingData?.passage;
        const title = readingData?.isMultiPassage
            ? (currentPassage?.title || readingData.title)
            : readingData?.title;

        const isHtml = typeof text === 'string' && /<\s*\/?\s*(p|b|i|strong|em|br|span)\s*\/?>/i.test(text);

        return {
            text,
            title,
            isHtml: !!isHtml,
            paragraphs: isHtml ? (text ? [text] : []) : (text?.split('\n\n') || [])
        };
    }, [readingData, currentPassage]);

    // Load reading data
    const loadReadingData = useCallback(() => {
        try {
            if (!processedReadingData) {
                console.warn('⚠️ loadReadingData: processedReadingData is null/undefined');
                return;
            }

            const questionsCount = processedReadingData.questions?.length || 0;
            if (questionsCount === 0) {
                console.warn('⚠️ loadReadingData: processedReadingData has no questions', {
                    passageId: processedReadingData.id,
                    title: processedReadingData.title
                });
            }

            setLoading(true);
            setReadingData(processedReadingData);

            const currentTime = externalStartTime || Date.now();
            startTimeRef.current = currentTime;
            setTimerStartTime(currentTime);
            setLoading(false);
        } catch (error) {
            setError(error.message);
            setLoading(false);
        }
    }, [processedReadingData, externalStartTime]);

    // Calculate results
    const calculateResults = useCallback(() => {
        const questionsToScore = selectedQuestionTypes.length === 0
            ? allQuestions
            : filteredQuestionsGlobal;

        if (!questionsToScore.length) return null;

        try {
            const endTime = Date.now();
            const timeTakenMs = endTime - startTimeRef.current;
            const timeTakenMinutes = Math.floor(timeTakenMs / 60000);
            const timeTakenSeconds = Math.floor((timeTakenMs % 60000) / 1000);

            const totalIndividualAnswers = questionsToScore.reduce(
                (sum, q) => sum + getQuestionAnswerCount(q), 0
            );

            let correctIndividualAnswers = 0;
            let providedIndividualAnswers = 0;

            const isAdvancedReading = ['b2', 'c1', 'c2'].includes(difficulty?.toLowerCase());
            const readingId = isAdvancedReading ? readingData?.id : null;

            for (const question of questionsToScore) {
                const userAnswer = userAnswers[question.id];
                const providedCount = getProvidedAnswerCount(userAnswer, question);

                providedIndividualAnswers += providedCount;

                if (userAnswer && providedCount > 0) {
                    correctIndividualAnswers += calculateQuestionScore(question, userAnswer, readingId);
                }
            }

            const skipped = totalIndividualAnswers - providedIndividualAnswers;

            return {
                totalQuestions: totalIndividualAnswers,
                correctAnswers: correctIndividualAnswers,
                answered: providedIndividualAnswers,
                skipped,
                percentageCorrect: totalIndividualAnswers > 0
                    ? (correctIndividualAnswers / totalIndividualAnswers) * 100
                    : 0,
                timeTaken: `${timeTakenMinutes}m ${timeTakenSeconds}s`,
            };
        } catch (error) {
            console.error('Error calculating results:', error);
            return null;
        }
    }, [allQuestions, filteredQuestionsGlobal, selectedQuestionTypes, userAnswers, readingData?.id, difficulty]);

    // Mark completion helper
    const markCompletion = useCallback(async (readingIdStr, score, totalQuestions) => {
        try {
            if (isAuthenticated) {
                await queueReadingCompletionUpdate(readingIdStr, { priority: 'high' });
                await upsertReadingBestResult(readingIdStr, score, totalQuestions);
            } else {
                storageUtils.updateGuestCompletion(readingIdStr, score, totalQuestions);
            }
        } catch (error) {
            console.error('Failed to mark completion:', error);
        }
    }, [isAuthenticated, queueReadingCompletionUpdate, upsertReadingBestResult]);

    // Submit handler
    const handleSubmit = useCallback(async () => {
        if (isSubmitting) return;

        setIsSubmitting(true);

        // Preserve timer state
        const currentTimeLimit = adjustedTimeLimit || readingData?.metadata?.timeLimit;
        if (currentTimeLimit && timerStartTime) {
            const elapsedSeconds = Math.floor((Date.now() - timerStartTime) / 1000);
            const totalSeconds = currentTimeLimit * 60;
            const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
            setFinalTimerState(remainingSeconds);
        }

        try {
            const isAdvancedReading = ['b2', 'c1', 'c2'].includes(difficulty?.toLowerCase());
            const isBackendMockReading = readingData?.source === 'backend-mock';
            const readingIdStr = String(id);

            if (isBackendMockReading) {
                const calculatedResults = calculateResults();
                setResults(calculatedResults);
                setShowResults(true);

                if (calculatedResults) {
                    await markCompletion(
                        readingIdStr,
                        calculatedResults.percentageCorrect,
                        calculatedResults.totalQuestions
                    );
                }
            } else if (isAdvancedReading && readingData?.id) {
                let payload = null;
                try {
                    // Legacy validation route for non-mock advanced readings.
                    const res = await fetch(`/api/practice/reading/validate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        cache: 'no-store',
                        body: JSON.stringify({ readingId: readingData.id, answers: userAnswers }),
                    });

                    if (!res.ok) throw new Error('Failed to validate answers');
                    payload = await res.json();
                } catch (validationError) {
                    throw validationError;
                }

                // Compute local stats
                const questionsToScore = selectedQuestionTypes.length === 0
                    ? allQuestions
                    : filteredQuestionsGlobal;

                const totalIndividualAnswers = questionsToScore.reduce(
                    (sum, q) => sum + getQuestionAnswerCount(q), 0
                );

                let providedIndividualAnswers = 0;
                for (const q of questionsToScore) {
                    providedIndividualAnswers += getProvidedAnswerCount(userAnswers[q.id], q);
                }

                const endTime = Date.now();
                const timeTakenMs = endTime - (timerStartTime || endTime);
                const timeTakenMinutes = Math.floor(timeTakenMs / 60000);
                const timeTakenSeconds = Math.floor((timeTakenMs % 60000) / 1000);

                setResults({
                    totalQuestions: payload?.total || payload?.totalQuestions || totalIndividualAnswers,
                    correctAnswers: payload?.correctCount || payload?.correct || 0,
                    answered: providedIndividualAnswers,
                    skipped: Math.max(0, totalIndividualAnswers - providedIndividualAnswers),
                    percentageCorrect: payload?.score || 0,
                    timeTaken: `${timeTakenMinutes}m ${timeTakenSeconds}s`,
                    reviewToken: payload?.reviewToken || null,
                });
                setShowResults(true);

                await markCompletion(
                    readingIdStr,
                    payload?.score || 0,
                    payload?.total || payload?.totalQuestions || totalIndividualAnswers
                );
            } else {
                // Basic levels: local calculation
                const calculatedResults = calculateResults();
                setResults(calculatedResults);
                setShowResults(true);

                if (calculatedResults) {
                    await markCompletion(
                        readingIdStr,
                        calculatedResults.percentageCorrect,
                        calculatedResults.totalQuestions
                    );
                }
            }
        } catch (error) {
            setError(error.message || 'Failed to submit answers');
            setIsSubmitting(false);
        }
    }, [
        isSubmitting, adjustedTimeLimit, readingData, timerStartTime, difficulty,
        userAnswers, selectedQuestionTypes, allQuestions, filteredQuestionsGlobal,
        calculateResults, markCompletion, id
    ]);

    // Timer callback
    const handleTimeUp = useCallback(() => {
        setFinalTimerState(0);
        handleSubmit();
    }, [handleSubmit]);

    // Review mode handler
    const handleReview = useCallback(async () => {
        setIsReviewMode(true);
        setIsSubmitting(false);
        setShowResults(false);

        try {
            const isAdvancedReading = ['b2', 'c1', 'c2'].includes(difficulty?.toLowerCase());
            const isBackendMockReading = readingData?.source === 'backend-mock';

            if (isAdvancedReading && !isBackendMockReading) {
                setActivePassageId(1);

                if (readingData?.id) {
                    const headers = results?.reviewToken
                        ? { 'x-review-token': results.reviewToken }
                        : {};

                    const res = await fetch(
                        `/api/practice/reading/review/${readingData.id}`,
                        { headers, cache: 'no-store' }
                    );

                    if (res.ok) {
                        const review = await res.json();
                        setReviewMap(review?.answers || null);
                    } else {
                        setError(`Review fetch failed (${res.status}). Please resubmit to review answers.`);
                    }
                }
            } else if (isBackendMockReading) {
                setError('Review mode is unavailable for backend mock without review endpoint.');
            }
        } catch (error) {
            setError('Unable to load review data. Please try again.');
        }
    }, [difficulty, readingData?.id, readingData?.source, results?.reviewToken]);

    // Retry handler
    const handleRetry = useCallback(() => {
        // Clear timeouts
        timeoutRefs.current.forEach(clearTimeout);
        timeoutRefs.current.clear();

        // Reset all state
        setUserAnswers({});
        setResults(null);
        setShowResults(false);
        setIsSubmitting(false);
        setIsReviewMode(false);
        setReviewMap(null);
        setError(null);
        setFinalTimerState(null);
        setIsTimerPaused(false);
        setSelectedQuestionTypes([]);
        setAdjustedTimeLimit(null);
        setInlinePassagePick(null);

        // Reset timer
        const currentTime = Date.now();
        startTimeRef.current = currentTime;
        setTimerStartTime(currentTime);

        // Force re-render
        setLoading(true);
        createTimeout(() => {
            setLoading(false);
            if (processedReadingData) {
                setReadingData(processedReadingData);
            }
        }, LOADING_DELAY);
    }, [processedReadingData, createTimeout]);

    // Answer change handler
    const handleAnswerChange = useCallback((questionId, answer) => {
        setUserAnswers(prev => {
            if (prev[questionId] === answer) return prev;
            return { ...prev, [questionId]: answer };
        });
    }, []);

    // Back handler
    const handleBack = useCallback(() => {
        setIsLoading(true);
        router.back();
    }, [router, setIsLoading]);

    // Scroll to question
    const scrollToQuestion = useCallback((questionId, blankId = null) => {
        const questionsContent = document.querySelector('.questions-content');
        if (!questionsContent) return;

        let targetElement = null;

        if (blankId) {
            targetElement = questionsContent.querySelector(
                `[data-question-id="${questionId}"][data-blank-id="${blankId}"]`
            );
        }

        if (!targetElement) {
            targetElement = questionsContent.querySelector(`[data-question-id="${questionId}"]`);
        }

        if (!targetElement) return;

        const isFullScreenMode = document.querySelector('.fullscreen-questions') !== null;

        if (isFullScreenMode) {
            const containerRect = questionsContent.getBoundingClientRect();
            const elementRect = targetElement.getBoundingClientRect();
            const scrollTop = questionsContent.scrollTop +
                (elementRect.top - containerRect.top) -
                (containerRect.height / 2) +
                (elementRect.height / 2);

            questionsContent.scrollTo({ top: scrollTop, behavior: 'smooth' });
        } else {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Highlight effect
        targetElement.classList.add('highlight-question');
        createTimeout(() => {
            targetElement.classList.remove('highlight-question');
        }, HIGHLIGHT_DURATION);

        // Move keyboard focus to the specific answer field when possible.
        // Fallback to the first interactive element in the question card.
        const focusTarget = () => {
            const isFocusable = (el) => {
                if (!el) return false;
                return (
                    el.matches?.('input, textarea, select, button, [contenteditable="true"]') ||
                    (el.tabIndex != null && el.tabIndex >= 0)
                );
            };

            let preferredElement = null;
            if (blankId) {
                preferredElement = questionsContent.querySelector(
                    `[data-question-id="${questionId}"][data-blank-id="${blankId}"]`
                );
            }

            if (!preferredElement) {
                preferredElement = targetElement.querySelector(
                    'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [contenteditable="true"]'
                );
            }

            if (preferredElement && isFocusable(preferredElement)) {
                preferredElement.focus({ preventScroll: true });
                if (preferredElement.select && typeof preferredElement.select === 'function') {
                    preferredElement.select();
                }
                return;
            }

            if (!targetElement.hasAttribute('tabindex')) {
                targetElement.setAttribute('tabindex', '-1');
            }
            targetElement.focus({ preventScroll: true });
        };

        createTimeout(focusTarget, 120);
    }, [createTimeout]);

    // Extract blank ID helper
    const extractBlankId = useCallback((answerSlot) => {
        if (!answerSlot?.question) {
            return null;
        }

        const { question, questionType, answerIndex } = answerSlot;

        if (questionType === 'summary_completion' && typeof question.summary === 'string') {
            const blankMatches = question.summary.match(/___(\d+)___/g) || [];
            const match = blankMatches[answerIndex];
            if (!match) return null;
            const numberMatch = match.match(/(\d+)/);
            return numberMatch ? numberMatch[1] : null;
        }

        if (questionType === 'table_completion' && question.table?.rows && question.table?.headers) {
            let blankIndex = 0;
            for (const row of question.table.rows) {
                for (const header of question.table.headers) {
                    const cell = row?.[header];
                    const match = typeof cell === 'string' ? cell.match(/___(\d+)___/) : null;
                    if (!match) continue;
                    if (blankIndex === answerIndex) {
                        return match[1];
                    }
                    blankIndex++;
                }
            }
            return null;
        }

        if (questionType === 'flow_chart_completion' && question.flow_chart) {
            if (question.flow_chart.type === 'vertical' && Array.isArray(question.flow_chart.steps)) {
                let blankIndex = 0;
                for (const step of question.flow_chart.steps) {
                    if (step.blank) {
                        if (blankIndex === answerIndex) return String(step.blank);
                        blankIndex++;
                    }
                    if (step.blank2) {
                        if (blankIndex === answerIndex) return String(step.blank2);
                        blankIndex++;
                    }
                }
            } else if (typeof question.flow_chart === 'string') {
                const blankMatches = question.flow_chart.match(/___(\d+)___/g) || [];
                const match = blankMatches[answerIndex];
                if (!match) return null;
                const numberMatch = match.match(/(\d+)/);
                return numberMatch ? numberMatch[1] : null;
            }
            return null;
        }

        if (questionType === 'diagram_labelling' && Array.isArray(question.labels)) {
            const label = question.labels[answerIndex];
            return label?.position ? String(label.position) : null;
        }

        if (questionType === 'note_completion' && Array.isArray(question.notes)) {
            let blankIndex = 0;
            for (const note of question.notes) {
                const blankMatches = note.match(/(?:___(\d+)___|(\d+)\.{2,})/g) || [];
                for (const match of blankMatches) {
                    if (blankIndex === answerIndex) {
                        const numberMatch = match.match(/(\d+)/);
                        return numberMatch ? numberMatch[1] : null;
                    }
                    blankIndex++;
                }
            }
        }

        return null;
    }, []);

    // Question click handler
    const handleQuestionClick = useCallback((questionIdOrAnswerSlot, blankId = null) => {
        let questionId = questionIdOrAnswerSlot;
        let actualBlankId = blankId;

        // Handle answerSlot object format
        if (typeof questionIdOrAnswerSlot === 'object' && questionIdOrAnswerSlot.questionId) {
            const answerSlot = questionIdOrAnswerSlot;
            questionId = answerSlot.questionId;
            actualBlankId = extractBlankId(answerSlot);
        }

        const targetQuestion = allQuestions.find(q => q.id === questionId);
        if (!targetQuestion) return;

        // Handle multi-passage navigation
        if (readingData?.isMultiPassage) {
            const questionPassage = readingData.passages?.find(passage =>
                passage.questions?.some(q => q.id === questionId)
            );

            if (questionPassage && questionPassage.passage_id !== activePassageId) {
                setActivePassageId(questionPassage.passage_id);
                createTimeout(() => scrollToQuestion(questionId, actualBlankId), SCROLL_DELAY);
                return;
            }
        }

        // Check question visibility
        const questionsToCheck = isFullScreen ? allQuestions : filteredQuestions;
        const isQuestionVisible = questionsToCheck.some(q => q.id === questionId);

        if (!isQuestionVisible && selectedQuestionTypes.length > 0 &&
            !selectedQuestionTypes.includes(targetQuestion.type)) {
            setSelectedQuestionTypes([]);
            createTimeout(() => scrollToQuestion(questionId, actualBlankId), SCROLL_DELAY);
            return;
        }

        scrollToQuestion(questionId, actualBlankId);
    }, [
        allQuestions, readingData, activePassageId, selectedQuestionTypes,
        filteredQuestions, scrollToQuestion, isFullScreen, createTimeout, extractBlankId
    ]);

    // Question type filter handler
    const handleQuestionTypeFilter = useCallback((selectedTypes) => {
        setSelectedQuestionTypes(selectedTypes);

        if (selectedTypes.length > 0) {
            const filteredQuestionIds = new Set(
                readingData?.questions
                    ?.filter(q => selectedTypes.includes(q.type))
                    ?.map(q => q.id) || []
            );

            setUserAnswers(prev => {
                const newAnswers = {};
                Object.entries(prev).forEach(([questionId, answer]) => {
                    if (filteredQuestionIds.has(parseInt(questionId))) {
                        newAnswers[questionId] = answer;
                    }
                });
                return newAnswers;
            });

            // Multi-passage navigation
            if (readingData?.isMultiPassage && Array.isArray(readingData.passages)) {
                const activeHasMatch = readingData.passages
                    .find(p => p.passage_id === activePassageId)
                    ?.questions?.some(q => selectedTypes.includes(q.type));

                if (!activeHasMatch) {
                    const firstMatchingPassage = readingData.passages.find(p =>
                        p.questions?.some(q => selectedTypes.includes(q.type))
                    );
                    if (firstMatchingPassage) {
                        setActivePassageId(firstMatchingPassage.passage_id);
                    }
                }
            }
        }
    }, [readingData, activePassageId]);

    // Time adjustment handler
    const handleTimeAdjustment = useCallback((newTimeLimit) => {
        setAdjustedTimeLimit(newTimeLimit);
    }, []);

    // Timer pause handler
    const setTimerPaused = useCallback((paused) => {
        setIsTimerPaused(paused);
    }, []);

    // Passage change handler
    const handlePassageChange = useCallback((passageId) => {
        setActivePassageId(passageId);
        setInlinePassagePick(null);

        const passageSection = document.querySelector('.passage-content');
        if (passageSection) {
            passageSection.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    const handleInlinePassagePickChange = useCallback((questionId, value) => {
        if (!questionId) {
            setInlinePassagePick(null);
            return;
        }

        setInlinePassagePick({
            questionId,
            value: value || null
        });
    }, []);

    const readingSavedAnswersPayload = useMemo(() => {
        const answersBySection = {};

        const passages = Array.isArray(readingData?.passages) ? readingData.passages : [];
        const questionToSectionMap = new Map();

        passages.forEach((passage, index) => {
            const sectionKey = `p${index + 1}`;
            answersBySection[sectionKey] = {};
            (passage?.questions || []).forEach((question) => {
                if (question?.id != null) {
                    questionToSectionMap.set(question.id, sectionKey);
                }
            });
        });

        const slots = Array.isArray(allAnswersData?.individualAnswerSlots)
            ? allAnswersData.individualAnswerSlots
            : [];

        slots.forEach((slot) => {
            const question = allQuestions.find((item) => item.id === slot.questionId);
            if (!question) return;
            const sectionKey = questionToSectionMap.get(question.id);
            if (!sectionKey) return;

            const userAnswer = userAnswers[question.id];
            const value = getReadingSlotValue(question, userAnswer, slot.answerIndex);
            answersBySection[sectionKey][String(slot.sequentialNumber)] = value;
        });

        return { answers: answersBySection };
    }, [allAnswersData, allQuestions, readingData?.passages, userAnswers]);

    useEffect(() => {
        const isBackendMockReading = readingData?.source === 'backend-mock';
        if (!isBackendMockReading || !readingData?.mockId) return;
        if (!Object.keys(userAnswers).length) return;

        const session = getMockSession();
        const token = session?.accessToken;
        const sessionId = session?.sessionId;
        if (!token || !sessionId) return;

        const payloadKey = JSON.stringify(readingSavedAnswersPayload);
        if (payloadKey === lastSavedPayloadRef.current) return;

        if (autosaveTimeoutRef.current) {
            clearTimeout(autosaveTimeoutRef.current);
        }

        autosaveTimeoutRef.current = setTimeout(async () => {
            try {
                await saveMockSectionAnswers(
                    readingData.mockId,
                    'reading',
                    readingSavedAnswersPayload,
                    { token, sessionId }
                );
                lastSavedPayloadRef.current = payloadKey;
            } catch (error) {
                if (isMockSessionMismatchError(error)) {
                    notifyMockSessionMismatch();
                    return;
                }
                console.warn('Reading autosave failed:', error);
            }
        }, AUTOSAVE_DELAY_MS);

        return () => {
            if (autosaveTimeoutRef.current) {
                clearTimeout(autosaveTimeoutRef.current);
                autosaveTimeoutRef.current = null;
            }
        };
    }, [notifyMockSessionMismatch, readingData?.mockId, readingData?.source, readingSavedAnswersPayload, userAnswers]);

    // Horizontal scroll handler
    const handleScrollDots = useCallback((direction) => {
        const container = document.querySelector('.question-dots');
        if (container) {
            const scrollAmount = container.clientWidth * 0.8;
            container.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    }, []);

    return {
        // State
        readingData,
        userAnswers,
        isSubmitting,
        showResults,
        isReviewMode,
        results,
        loading,
        error,
        columnWidth,
        isFullScreen,
        timerStartTime,
        finalTimerState,
        selectedQuestionTypes,
        adjustedTimeLimit,
        isTimerPaused,
        activePassageId,
        showLeftArrow,
        showRightArrow,
        reviewMap,
        inlinePassagePick,

        // Computed values
        isMultiPassage,
        processedReadingData,
        currentPassage,
        allQuestions,
        allAnswersData,
        questionRanges,
        currentPassageQuestions,
        filteredQuestions,
        filteredQuestionsGlobal,
        groupedQuestions,
        questionSequenceMap,
        visiblePassages,

        // Answer counts
        totalAnsweredCount: answerCounts.totalAnsweredCount,
        answeredCount: answerCounts.answeredCount,
        totalQuestions: answerCounts.totalQuestions,
        totalAllQuestions: answerCounts.totalAllQuestions,
        allQuestionsAnswered: answerCounts.allQuestionsAnswered,
        currentPassageCompleted: answerCounts.currentPassageCompleted,
        filteredGlobalAnsweredCount: answerCounts.filteredGlobalAnsweredCount,
        filteredGlobalTotalQuestions: answerCounts.filteredGlobalTotalQuestions,

        // Submit state
        canSubmit: selectedQuestionTypes.length === 0
            ? allAnswersData.totalAnswers > 0
            : answerCounts.filteredGlobalTotalQuestions > 0,
        submitAnsweredCount: selectedQuestionTypes.length === 0
            ? answerCounts.totalAnsweredCount
            : answerCounts.filteredGlobalAnsweredCount,
        submitTotalCount: selectedQuestionTypes.length === 0
            ? allAnswersData.totalAnswers
            : answerCounts.filteredGlobalTotalQuestions,

        // Passage content
        passageParagraphs: passageContent.paragraphs,
        passageIsHtml: passageContent.isHtml,
        passageTitle: passageContent.title,

        // Actions
        loadReadingData,
        calculateResults,
        handleSubmit,
        handleTimeUp,
        handleReview,
        handleRetry,
        handleAnswerChange,
        handleBack,
        scrollToQuestion,
        handleQuestionClick,
        handleQuestionTypeFilter,
        handleTimeAdjustment,
        handlePassageChange,
        handleScrollDots,
        handleInlinePassagePickChange,
        setTimerPaused,

        // Setters
        setReadingData,
        setUserAnswers,
        setIsSubmitting,
        setShowResults,
        setIsReviewMode,
        setResults,
        setLoading,
        setError,
        setColumnWidth,
        setIsFullScreen,
        setTimerStartTime,
        setFinalTimerState,
        setSelectedQuestionTypes,
        setAdjustedTimeLimit,
        setActivePassageId,
        setShowLeftArrow,
        setShowRightArrow,
        setInlinePassagePick,
    };
};