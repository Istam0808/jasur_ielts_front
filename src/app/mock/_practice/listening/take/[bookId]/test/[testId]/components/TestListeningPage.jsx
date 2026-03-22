"use client";

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiVolume2, FiVolumeX } from 'react-icons/fi';
import Spinner from '@/components/common/spinner';
import Timer from '@/components/common/Timer';
import { useTestData } from '@/hooks/useTestData';
import QuestionRenderer from './QuestionRenderer';
import { TestHeader, TestOverview, PartNavigation, PartHeader, TestNavigation } from './TestUIComponents';
import TestProgress from './TestProgress';
import MockUnifiedHeader from '@/components/common/MockUnifiedHeader';
import { useMockUi } from '@/components/common/MockUiContext';
import {
    isMockSessionMismatchError,
    MOCK_SESSION_STATUS,
    postMockSessionStatus,
    saveMockSectionAnswers
} from '@/lib/mockApi';
import { getMockSession } from '@/lib/mockSession';
import MockExamFooter from '@/components/mock/MockExamFooter';
import HighlightText from '@/components/common/HighlightText';
import IELTSListeningInstructionsCard from './IELTSListeningInstructionsCard';
import './testListeningPage.scss';

// Заглушка: функциональность заметок удалена; имя оставлено, чтобы не ловить ReferenceError
// при устаревшем кэше Turbopack/HMR, если в бандле ещё остался JSX `<InlineNoteModal />`.
// eslint-disable-next-line no-unused-vars -- намеренно не используется в актуальной разметке
const InlineNoteModal = () => null;

const resolvePartAudioUrl = (part) => {
    const rawUrl = part?.audioUrl ?? part?.audio_file ?? part?.audio_link ?? '';
    if (typeof rawUrl !== 'string') return '';
    return rawUrl.trim();
};

const AUTOSAVE_DELAY_MS = 700;

const normalizeListeningAnswerValue = (value) => {
    if (value === null || value === undefined) return null;

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
    }

    if (Array.isArray(value)) {
        const firstFilled = value.find((item) => item !== null && item !== undefined && String(item).trim() !== '');
        if (firstFilled === undefined) return null;
        return String(firstFilled).trim();
    }

    if (typeof value === 'object') {
        const firstFilled = Object.values(value).find(
            (item) => item !== null && item !== undefined && String(item).trim() !== ''
        );
        if (firstFilled === undefined) return null;
        return String(firstFilled).trim();
    }

    const normalized = String(value).trim();
    return normalized === '' ? null : normalized;
};

const TestListeningPage = ({
    bookData,
    answersData,
    bookId,
    testId,
    testTitle,
    difficultyOverride,
    nextHref,
    isMockExam = false,
    mockId = null,
    useUnifiedMockHeader = false
}) => {
    const { t, i18n } = useTranslation(['listening', 'common', 'test']);
    const params = useParams();
    const router = useRouter();
    const { textSize } = useMockUi();
    const difficulty = difficultyOverride || params?.difficulty;

    const { test, isLoading } = useTestData(bookData, bookId, testId);
    const [currentPartIndex, setCurrentPartIndex] = useState(0);
    const [currentQuestionNumber, setCurrentQuestionNumber] = useState(null);
    const [userAnswers, setUserAnswers] = useState({});
    const [testStarted, setTestStarted] = useState(false);
    const [isTestSubmitted, setIsTestSubmitted] = useState(false);
    const testContainerRef = useRef(null);
    const isInitialRender = useRef(true);
    const audioRef = useRef(null);
    const pendingScrollRef = useRef(null);

    const [hasInstructionAcknowledged, setHasInstructionAcknowledged] = useState(false);
    const [audioError, setAudioError] = useState(null);
    const autoSaveTimeoutRef = useRef(null);
    const lastSavedPayloadRef = useRef('');
    const sessionMismatchNotifiedRef = useRef(false);
    const listeningTutorialStatusSentRef = useRef(false);

    // Listening audio volume control (syncs with <audio ref={audioRef} />)
    const [audioVolume, setAudioVolume] = useState(1); // 0..1, keeps last non-zero volume
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const audioSliderValue = isAudioMuted ? 0 : audioVolume;
    const audioVolumePercent = Math.round(audioSliderValue * 100);

    const notifyMockSessionMismatch = useCallback(() => {
        if (sessionMismatchNotifiedRef.current) return;
        sessionMismatchNotifiedRef.current = true;

        if (typeof window !== 'undefined') {
            window.alert('Сессия больше не связана с этим mock тестом. Перезайдите и начните mock заново, чтобы ответы снова сохранялись.');
        }
    }, []);

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

    useEffect(() => {
        if (!isMockExam || !test || isLoading || hasInstructionAcknowledged) return;
        if (listeningTutorialStatusSentRef.current) return;
        listeningTutorialStatusSentRef.current = true;
        const session = getMockSession();
        postMockSessionStatus(MOCK_SESSION_STATUS.LISTENING_TUTORIAL, {
            token: session?.accessToken,
            sessionId: session?.sessionId
        });
    }, [isMockExam, test, isLoading, hasInstructionAcknowledged]);

    const handleListeningInstructionStart = useCallback(() => {
        const session = getMockSession();
        postMockSessionStatus(MOCK_SESSION_STATUS.LISTENING_EXAM, {
            token: session?.accessToken,
            sessionId: session?.sessionId
        });
        setHasInstructionAcknowledged(true);
    }, []);

    // Start the test only after instructions are acknowledged (mock) or immediately (non-mock)
    useEffect(() => {
        if (!isLoading && test) {
            if (!isMockExam || hasInstructionAcknowledged) {
                setTestStarted(true);
            }
        }
    }, [isLoading, test, isMockExam, hasInstructionAcknowledged]);

    // Scroll to top when part changes, but not on initial load
    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }
        testContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentPartIndex]);

    // Выполняем отложенный скролл к вопросу после того, как новый парт отрисован
    useEffect(() => {
        if (pendingScrollRef.current == null) return;
        const target = pendingScrollRef.current;
        pendingScrollRef.current = null;
        requestAnimationFrame(() => {
            const container = testContainerRef.current;
            if (!container) return;

            // Некоторые инпуты рендерятся не через <Question/> и не имеют data-question-number.
            // Тогда фокус/скролл нужно делать напрямую по id.
            const directInput =
                container.querySelector(`#q-${target}`) ||
                container.querySelector(`#raw-q-${target}`);
            if (directInput) {
                directInput.scrollIntoView({ behavior: 'smooth', block: 'start' });
                directInput.focus({ preventScroll: true });
                return;
            }

            const blocks = container.querySelectorAll('[data-question-number]');
            let targetEl = null;
            let maxNum = -1;
            blocks.forEach((el) => {
                const num = parseInt(el.getAttribute('data-question-number'), 10);
                if (Number.isFinite(num) && num <= target && num > maxNum) {
                    maxNum = num;
                    targetEl = el;
                }
            });
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                const exactInput = container.querySelector(`#q-${target}`);
                if (exactInput) {
                    exactInput.focus({ preventScroll: true });
                } else {
                    const firstInput = targetEl.querySelector('input, textarea');
                    if (firstInput) {
                        firstInput.focus({ preventScroll: true });
                    }
                }
            }
        });
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

    const listeningSavedAnswersPayload = useMemo(() => {
        const answers = {};

        testParts.forEach((part, partIndex) => {
            const partKey = `p${partIndex + 1}`;
            const questionNumbers = extractQuestionNumbers(part);
            const partAnswers = {};

            questionNumbers.forEach((questionNumber) => {
                partAnswers[String(questionNumber)] = normalizeListeningAnswerValue(userAnswers[questionNumber]);
            });

            answers[partKey] = partAnswers;
        });

        return { answers };
    }, [testParts, extractQuestionNumbers, userAnswers]);

    const activeAttemptedQuestionNumbers = useMemo(() => {
        const isAnsweredValue = (value) => {
            if (value === null || value === undefined || value === '') return false;
            if (Array.isArray(value)) {
                return value.some((item) => item !== null && item !== undefined && item !== '');
            }
            if (typeof value === 'object') {
                return Object.values(value).some((item) => item !== null && item !== undefined && String(item).trim() !== '');
            }
            return true;
        };

        return activePartQuestionNumbers.filter((num) => isAnsweredValue(userAnswers[num]));
    }, [activePartQuestionNumbers, userAnswers]);

    const uniqueAudioUrls = useMemo(() => {
        const urls = testParts
            .map((part) => resolvePartAudioUrl(part))
            .filter(Boolean);
        return Array.from(new Set(urls));
    }, [testParts]);

    const activePartAudioUrl = useMemo(() => {
        const partAudioUrl = resolvePartAudioUrl(testParts[currentPartIndex]);
        if (partAudioUrl) return partAudioUrl;

        // Если во всем тесте только один валидный аудио URL, используем его для всех parts.
        // Это позволяет не останавливать playback при переходе между частями без собственного аудио.
        return uniqueAudioUrls.length === 1 ? uniqueAudioUrls[0] : '';
    }, [testParts, currentPartIndex, uniqueAudioUrls]);

    const hasNoAudioInAnyPart = useMemo(() => {
        if (!testParts.length) return false;
        return uniqueAudioUrls.length === 0;
    }, [testParts.length, uniqueAudioUrls]);

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

    useEffect(() => {
        if (!isMockExam || !mockId || !testParts.length) return;
        if (!Object.keys(userAnswers).length) return;

        // Persist answers to localStorage as a local backup
        try {
            localStorage.setItem(
                `mock-answers-${mockId}-listening`,
                JSON.stringify(listeningSavedAnswersPayload)
            );
        } catch {
            // localStorage unavailable — silently skip
        }

        const session = getMockSession();
        const token = session?.accessToken;
        const sessionId = session?.sessionId;

        if (!token || !sessionId) return;

        const payloadKey = JSON.stringify(listeningSavedAnswersPayload);
        if (payloadKey === lastSavedPayloadRef.current) return;

        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        autoSaveTimeoutRef.current = setTimeout(async () => {
            try {
                await saveMockSectionAnswers(
                    mockId,
                    'listening',
                    listeningSavedAnswersPayload,
                    { token, sessionId }
                );
                lastSavedPayloadRef.current = payloadKey;
            } catch (error) {
                if (isMockSessionMismatchError(error)) {
                    notifyMockSessionMismatch();
                    return;
                }
                console.warn('Listening autosave failed:', error);
            }
        }, AUTOSAVE_DELAY_MS);

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
                autoSaveTimeoutRef.current = null;
            }
        };
    }, [isMockExam, listeningSavedAnswersPayload, mockId, notifyMockSessionMismatch, testParts.length, userAnswers]);

    const scrollToQuestion = useCallback((questionNumber) => {
        setCurrentQuestionNumber(questionNumber);
        requestAnimationFrame(() => {
            const container = testContainerRef.current;
            if (!container) return;

            // Сначала пытаемся сфокусировать инпут напрямую по id.
            // В RawHtmlWithInputs используются id вида raw-q-N.
            const directInput =
                container.querySelector(`#q-${questionNumber}`) ||
                container.querySelector(`#raw-q-${questionNumber}`);
            if (directInput) {
                directInput.scrollIntoView({ behavior: 'smooth', block: 'start' });
                directInput.focus({ preventScroll: true });
                return;
            }

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
                // Фокусируем инпут конкретного вопроса (fill_in_blank: id="q-N")
                const exactInput = container.querySelector(`#q-${questionNumber}`);
                if (exactInput) {
                    exactInput.focus({ preventScroll: true });
                } else {
                    // Для других типов вопросов — первый инпут/textarea в блоке
                    const firstInput = target.querySelector('input, textarea');
                    if (firstInput) {
                        firstInput.focus({ preventScroll: true });
                    }
                }
            }
        });
    }, []);

    // Чтобы `Tab` не уводил фокус в футер, а переводил на следующий вопрос,
    // перехватываем Tab только когда фокус находится внутри инпутов вопросов.
    useEffect(() => {
        if (!isMockExam || !testStarted || isTestSubmitted) return;

        const handleTabKeyDown = (e) => {
            if (e.key !== 'Tab') return;

            const activeEl = document.activeElement;
            if (!activeEl || typeof activeEl !== 'object') return;

            const id = activeEl.id;
            if (typeof id !== 'string') return;

            // В этой странице инпуты вопросов имеют id:
            // - `q-${N}` для большинства типов
            // - `raw-q-${N}` для RawHtmlWithInputs
            let focusedQuestionNum = null;
            const mExact = id.match(/^q-(\d+)$/);
            if (mExact) {
                focusedQuestionNum = Number(mExact[1]);
            } else {
                const mRaw = id.match(/^raw-q-(\d+)$/);
                if (mRaw) focusedQuestionNum = Number(mRaw[1]);
            }

            if (!Number.isFinite(focusedQuestionNum)) return;

            const idx = activePartQuestionNumbers.indexOf(focusedQuestionNum);
            if (idx === -1) return;

            const nextIdx = e.shiftKey ? idx - 1 : idx + 1;
            if (nextIdx < 0 || nextIdx >= activePartQuestionNumbers.length) {
                // Дошли до границы part — переводим на соседний part.
                if (!e.shiftKey) {
                    // Tab: к следующему part (Part N -> Part N+1)
                    if (currentPartIndex >= testParts.length - 1) return;
                    const nextPartNums = extractQuestionNumbers(testParts[currentPartIndex + 1]);
                    const firstNext = nextPartNums[0];
                    if (firstNext == null) return;

                    e.preventDefault();
                    pendingScrollRef.current = firstNext;
                    setCurrentPartIndex(currentPartIndex + 1);
                    setCurrentQuestionNumber(firstNext);
                } else {
                    // Shift+Tab: к предыдущему part (Part N -> Part N-1)
                    if (currentPartIndex <= 0) return;
                    const prevPartNums = extractQuestionNumbers(testParts[currentPartIndex - 1]);
                    const lastPrev = prevPartNums[prevPartNums.length - 1];
                    if (lastPrev == null) return;

                    e.preventDefault();
                    pendingScrollRef.current = lastPrev;
                    setCurrentPartIndex(currentPartIndex - 1);
                    setCurrentQuestionNumber(lastPrev);
                }

                return;
            }

            // Есть следующий/предыдущий вопрос внутри текущего part — фокусируем его.
            e.preventDefault();
            scrollToQuestion(activePartQuestionNumbers[nextIdx]);
        };

        document.addEventListener('keydown', handleTabKeyDown, true);
        return () => document.removeEventListener('keydown', handleTabKeyDown, true);
    }, [
        isMockExam,
        testStarted,
        isTestSubmitted,
        activePartQuestionNumbers,
        scrollToQuestion,
        currentPartIndex,
        testParts,
        extractQuestionNumbers
    ]);

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
                    pendingScrollRef.current = lastPrev;
                    setCurrentPartIndex(currentPartIndex - 1);
                    setCurrentQuestionNumber(lastPrev);
                }
            }
            return;
        }
        if (nextIdx >= activePartQuestionNumbers.length) {
            if (currentPartIndex < testParts.length - 1) {
                const nextPartNums = extractQuestionNumbers(testParts[currentPartIndex + 1]);
                const firstNext = nextPartNums[0];
                if (firstNext != null) {
                    pendingScrollRef.current = firstNext;
                    setCurrentPartIndex(currentPartIndex + 1);
                    setCurrentQuestionNumber(firstNext);
                }
            }
            return;
        }
        scrollToQuestion(activePartQuestionNumbers[nextIdx]);
    }, [activePartQuestionNumbers, currentQuestionNumber, currentPartIndex, testParts, extractQuestionNumbers, scrollToQuestion]);

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
        if (isTestSubmitted) return;
        setIsTestSubmitted(true);

        // Final guaranteed send of all answers on submit
        if (isMockExam && mockId) {
            const session = getMockSession();
            const token = session?.accessToken;
            const sessionId = session?.sessionId;

            if (token && sessionId) {
                try {
                    await saveMockSectionAnswers(
                        mockId,
                        'listening',
                        listeningSavedAnswersPayload,
                        { token, sessionId }
                    );
                } catch (error) {
                    if (isMockSessionMismatchError(error)) {
                        notifyMockSessionMismatch();
                    } else {
                        console.warn('Listening final submit failed:', { isTimeUp, error });
                    }
                }
            }

            // Clear localStorage backup after final submit
            try {
                localStorage.removeItem(`mock-answers-${mockId}-listening`);
            } catch {
                // ignore
            }
        }

        const target = nextHref || '/mock/listening';
        router.push(target);
    }, [isTestSubmitted, isMockExam, mockId, listeningSavedAnswersPayload, notifyMockSessionMismatch, nextHref, router]);

    // Handle timer expiration
    const handleTimeUp = useCallback(() => {
        handleSubmit(true);
    }, [handleSubmit]);

    const testDuration = test?.durationInMinutes || 40;

    /** Старт таймера mock listening: новый timestamp при смене теста (тот же Timer, что в reading/writing). */
    const [listeningMockStartAt, setListeningMockStartAt] = useState(null);

    const listeningMockTimerKey = useMemo(() => {
        if (!isMockExam || !testStarted || !test) return '';
        const tid = test?.id ?? testId;
        return `${bookId}-${testId}-${tid}`;
    }, [isMockExam, testStarted, test, bookId, testId]);

    useLayoutEffect(() => {
        if (!listeningMockTimerKey) return;
        setListeningMockStartAt(Date.now());
    }, [listeningMockTimerKey]);

    // Clear audio error when part or URL changes
    useEffect(() => {
        setAudioError(null);
    }, [activePartAudioUrl, currentPartIndex]);

    // Autoplay listening audio when part has audio URL and test is active
    useEffect(() => {
        if (!activePartAudioUrl || !testStarted || isTestSubmitted) return;
        const el = audioRef.current;
        if (!el) return;
        // Дополнительный лог для диагностики проблем с аудио
        try {
            console.debug('Listening autoplay attempt', {
                src: el.currentSrc || el.src,
                activePartAudioUrl,
                readyState: el.readyState,
                networkState: el.networkState,
                bookId,
                testId,
                currentPartIndex,
            });
        } catch (logError) {
            console.debug('Failed to log autoplay debug info', logError);
        }
        const playPromise = el.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch((err) => {
                const msg = err?.message ?? String(err);
                console.warn('Audio autoplay prevented or failed:', {
                    message: msg,
                    name: err?.name,
                    code: err?.code,
                });
                setAudioError(t('audioLoadError', 'Аудио не удалось воспроизвести автоматически. Нажмите на кнопку воспроизведения или проверьте подключение к сети.'));
            });
        }
    }, [activePartAudioUrl, testStarted, isTestSubmitted, currentPartIndex, t, bookId, testId]);

    const handleToggleAudioMute = useCallback(() => {
        setIsAudioMuted((prev) => !prev);
    }, []);

    const handleAudioVolumeChange = useCallback((event) => {
        const raw = event?.target?.value;
        const next = Number(raw);
        if (!Number.isFinite(next)) return;

        // Keep `audioVolume` as "last non-zero". Slider shows 0 while muted.
        if (next <= 0.001) {
            setIsAudioMuted(true);
        } else {
            setAudioVolume(next);
            setIsAudioMuted(false);
        }
    }, []);

    // Sync volume/mute state with the real <audio> element
    useEffect(() => {
        const el = audioRef.current;
        if (!el) return;

        // Keep last non-zero volume in sync; mute flag controls the audible output.
        el.volume = audioVolume;
        el.muted = isAudioMuted;
    }, [audioVolume, isAudioMuted, activePartAudioUrl]);

    const listeningHighlightStorageKey = useMemo(
        () => `ielts-listening-hl-${bookId}-${testId}-${currentPartIndex}`,
        [bookId, testId, currentPartIndex]
    );

    const listeningHighlightRestoreVersion = useMemo(() => {
        const part = testParts?.[currentPartIndex];
        return `${currentPartIndex}-${String(part?.instruction || '').length}`;
    }, [testParts, currentPartIndex]);

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

    const shouldShowUnifiedHeader = isMockExam && useUnifiedMockHeader;
    const sessionUsername = getMockSession()?.username;
    const testTakerUsername = typeof sessionUsername === 'string' && sessionUsername.trim()
        ? sessionUsername.trim()
        : 'unknown';

    // Show IELTS-style instructions screen before the test starts (mock exam only)
    if (isMockExam && !hasInstructionAcknowledged) {
        return (
            <div
                className={`test-listening-page mock-exam-mode ${shouldShowUnifiedHeader ? 'mock-unified-header-active' : ''}`}
                data-mock-text-size={shouldShowUnifiedHeader ? textSize : undefined}
            >
                {shouldShowUnifiedHeader && (
                    <MockUnifiedHeader
                        testTakerId={testTakerUsername}
                        timerContent={null}
                    />
                )}
                <IELTSListeningInstructionsCard
                    onStart={handleListeningInstructionStart}
                />
            </div>
        );
    }

    return (
        <div
            className={`test-listening-page ${isMockExam ? 'mock-exam-mode' : ''} ${shouldShowUnifiedHeader ? 'mock-unified-header-active' : ''}`}
            data-mock-text-size={shouldShowUnifiedHeader ? textSize : undefined}
        >
            {shouldShowUnifiedHeader && (
                <MockUnifiedHeader
                    testTakerId={testTakerUsername}
                    timerContent={
                        testStarted &&
                        !isTestSubmitted &&
                        listeningMockTimerKey &&
                        listeningMockStartAt !== null ? (
                            <Timer
                                durationInMinutes={testDuration}
                                onTimeUp={handleTimeUp}
                                isActive={true}
                                startTime={listeningMockStartAt}
                            />
                        ) : null
                    }
                    listeningVolume={{
                        sliderValue: audioSliderValue,
                        muted: isAudioMuted,
                        audioAvailable: Boolean(activePartAudioUrl),
                        onVolumeChange: handleAudioVolumeChange,
                        onToggleMute: handleToggleAudioMute,
                        ariaVolume: t('audioVolume', 'Громкость'),
                        ariaMute: t('mute', 'Отключить звук'),
                        ariaUnmute: t('unmute', 'Включить звук'),
                    }}
                />
            )}
            {!isMockExam && (
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

            <div className="test-container" ref={testContainerRef}>
                <PartNavigation
                    parts={testParts}
                    currentPartIndex={currentPartIndex}
                    onSelectPart={handlePartNavigation}
                />

                <div className="part-content-card">
                    <PartHeader partNumber={activePart.part} audioUrl={activePartAudioUrl} />
                    {!shouldShowUnifiedHeader && (
                        <div
                            className="audio-volume-controls"
                            data-audio-available={activePartAudioUrl ? 'true' : 'false'}
                        >
                            <button
                                type="button"
                                className={`audio-mute-button ${isAudioMuted ? 'is-muted' : ''}`}
                                onClick={handleToggleAudioMute}
                                aria-label={isAudioMuted ? t('unmute', 'Включить звук') : t('mute', 'Отключить звук')}
                                title={isAudioMuted ? t('unmute', 'Включить звук') : t('mute', 'Отключить звук')}
                            >
                                {isAudioMuted ? <FiVolumeX /> : <FiVolume2 />}
                            </button>

                            <div className="audio-volume-range">
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={audioSliderValue}
                                    onChange={handleAudioVolumeChange}
                                    aria-label={t('audioVolume', 'Громкость')}
                                />
                                <span className="audio-volume-percent">{audioVolumePercent}%</span>
                            </div>
                        </div>
                    )}
                    {hasNoAudioInAnyPart && (
                        <div className="no-audio-for-mock-message" role="status">
                            {t('noAudioForMock', 'Для этого мока аудио не загружено.')}
                        </div>
                    )}
                    {audioError && (
                        <div className="audio-error-message" role="alert">
                            {audioError}
                        </div>
                    )}
                    {activePartAudioUrl ? (
                        <audio
                            ref={audioRef}
                            src={activePartAudioUrl}
                            preload="auto"
                            className="audio-player audio-player-hidden"
                            onError={(e) => {
                                try {
                                    const audioEl = e.currentTarget;
                                    const error = audioEl?.error;
                                    const errorInfo = {
                                        code: error?.code ?? 'UNKNOWN',
                                        message: error?.message ?? 'Unknown audio error',
                                        src: audioEl?.currentSrc || audioEl?.src,
                                        networkState: audioEl?.networkState,
                                        readyState: audioEl?.readyState,
                                        eventType: e.type,
                                        bookId,
                                        testId,
                                        currentPartIndex,
                                    };
                                    console.error('Audio loading error:', errorInfo);
                                    if (error) {
                                        console.error('Audio element raw error object:', error);
                                    }
                                    setAudioError(t('audioLoadError', 'Аудио не удалось загрузить. Проверьте интернет-соединение или попробуйте ещё раз чуть позже.'));
                                } catch (logError) {
                                    console.error('Audio onError handler failed', logError);
                                }
                            }}
                        />
                    ) : null}

                    <HighlightText
                        className="selectable-content highlight-text-root"
                        storageKey={listeningHighlightStorageKey}
                        restoreVersion={listeningHighlightRestoreVersion}
                    >
                        {
                            activePart.instruction && (
                                <div className="part-instructions">
                                    <p className="instruction-text">{activePart.instruction}</p>
                                </div>
                            )
                        }

                        <div className="questions-area">
                            <QuestionRenderer
                                item={activePart}
                                userAnswers={userAnswers}
                                onAnswerChange={handleAnswerChange}
                                optionsBox={null}
                            />
                        </div>
                    </HighlightText>

                    <TestNavigation
                        currentPartIndex={currentPartIndex}
                        totalParts={testParts.length}
                        onNavigate={handlePartNavigation}
                        onSubmit={() => handleSubmit(false)}
                        isSubmittable={!isTestSubmitted}
                    />
                </div>
            </div>

            {isMockExam && (
                <MockExamFooter
                    parts={testParts}
                    currentPartIndex={currentPartIndex}
                    onSelectPart={handlePartNavigation}
                    activePartQuestionNumbers={activePartQuestionNumbers}
                    attemptedQuestionNumbers={activeAttemptedQuestionNumbers}
                    currentQuestionNumber={currentQuestionNumber}
                    onSelectQuestion={scrollToQuestion}
                    onPrevNextQuestion={goToPrevNextQuestion}
                    partTotals={partTotals}
                    partAnsweredCounts={partAnsweredCounts}
                    getActivePartLabel={(partNum) => `${t('part')} ${partNum}`}
                    getInactivePartButtonLabel={(partNum, answered, total) => `${t('part')} ${partNum} ${answered} of ${total}`}
                    getQuestionAriaLabel={(questionNumber) => `${t('question', { defaultValue: 'Question' })} ${questionNumber}`}
                    previousAriaLabel={t('previous', { ns: 'common', defaultValue: 'Previous' })}
                    nextAriaLabel={t('next', { ns: 'common', defaultValue: 'Next' })}
                    showSubmitButton={true}
                    submitDisabled={!testStarted || isTestSubmitted}
                    submitAriaLabel={t('submitTest', { ns: 'common', defaultValue: 'Submit test' })}
                    onSubmit={() => handleSubmit(false)}
                    confirmTitle={t('confirmSubmitTitle', { ns: 'test', defaultValue: 'Submit your answers?' })}
                    confirmDescription={t('confirmSubmitDescription', {
                        ns: 'test',
                        defaultValue: 'Are you sure you want to submit? You will not be able to change your answers after submission.'
                    })}
                    confirmCancelLabel={t('cancel', { ns: 'common', defaultValue: 'Cancel' })}
                    confirmSubmitLabel={t('submit', { ns: 'common', defaultValue: 'Submit' })}
                />
            )}
        </div>
    );
};

export default TestListeningPage;