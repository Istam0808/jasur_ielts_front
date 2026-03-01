"use client";

import PropTypes from "prop-types";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { scrollToTop } from "@/utils/common";
import TopicSelection from "./components/TopicSelection";
import ExamModal from "./components/ExamModal";
import ExamResults from "./components/ExamResults";
import { useHybridTTS } from "./hooks/useHybridTTS";
import { useSessionRecording } from "./hooks/useSessionRecording";
import { useIELTSTimer } from "./hooks/useIELTSTimer";
import { useSpeaking } from "./contexts/SpeakingContext";

// ============================================================================
// CONSTANTS
// ============================================================================

const VOICE_STORAGE_KEY = "speaking-exam-voice";
const DEFAULT_VOICE = "en-US-Standard-F";

const EXAM_VIEWS = {
  TOPIC_SELECTION: "topic-selection",
  EXAM: "exam",
  RESULTS: "results",
};

const EXAM_PARTS = {
  PART_1: 1,
  PART_2: 2,
  PART_3: 3,
};

const TIMER_DURATIONS = {
  PART_1_QUESTION: 45,
  PART_2_PREPARATION: 60,
  PART_2_SPEAKING: 120,
  PART_3_QUESTION: 90,
};

const TTS_DELAYS = {
  VOICE_CHECK_RETRY: 100,
  BEFORE_SPEAK: 150,
  QUESTION_RENDER: 450,
};

const TTS_MAX_WAIT_TIME = 5000; // Maximum wait time for TTS to be ready (5 seconds)

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely executes a function with error logging
 * @param {Function} fn - Function to execute
 * @param {string} context - Context for error logging
 * @returns {*} Function result or undefined on error
 */
const safeExecute = (fn, context = "operation") => {
  try {
    return fn();
  } catch (error) {
    console.warn(`Error during ${context}:`, error);
    return undefined;
  }
};

/**
 * Formats seconds to mm:ss format
 * @param {number} seconds - Seconds to format
 * @returns {string} Formatted time string
 */
const formatTime = (seconds = 0) => {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const secs = (s % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

/**
 * Gets voice selection from localStorage with fallback
 * @returns {string} Selected voice or default
 */
const getStoredVoice = () => {
  if (typeof window === "undefined") return DEFAULT_VOICE;
  try {
    return localStorage.getItem(VOICE_STORAGE_KEY) || DEFAULT_VOICE;
  } catch {
    return DEFAULT_VOICE;
  }
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Hook for managing voice selection and TTS operations
 */
const useVoiceManager = (speak, stopTTS, clearSpeechError) => {
  const speakWithSelectedVoice = useCallback(
    (text) => {
      const selectedVoice = getStoredVoice();
      return speak(text, {
        voice: selectedVoice,
        lang: "en-US",
      });
    },
    [speak]
  );

  const speechRef = useRef({ speak: speakWithSelectedVoice, stopTTS, clearSpeechError });

  // Keep refs updated - use speakWithSelectedVoice in the ref
  useEffect(() => {
    speechRef.current = { speak: speakWithSelectedVoice, stopTTS, clearSpeechError };
  }, [speakWithSelectedVoice, stopTTS, clearSpeechError]);

  return { speakWithSelectedVoice, speechRef };
};

/**
 * Hook for question and part data access
 */
const useExamData = (selectedTopic, examState) => {
  const getCurrentQuestion = useCallback(() => {
    if (!selectedTopic || !examState) return null;

    const { currentPart = EXAM_PARTS.PART_1, currentQuestion = 0 } = examState;

    switch (currentPart) {
      case EXAM_PARTS.PART_1:
        return selectedTopic?.part1?.questions?.[currentQuestion] ?? null;
      case EXAM_PARTS.PART_2:
        return selectedTopic?.part2?.cueCard ?? null;
      case EXAM_PARTS.PART_3:
        return selectedTopic?.part3?.questions?.[currentQuestion] ?? null;
      default:
        return null;
    }
  }, [selectedTopic, examState]);

  const getPartTitle = useCallback(() => {
    if (!selectedTopic || !examState) return "";

    const { currentPart = EXAM_PARTS.PART_1 } = examState;

    switch (currentPart) {
      case EXAM_PARTS.PART_1:
        return selectedTopic?.part1?.title ?? "";
      case EXAM_PARTS.PART_2:
        return selectedTopic?.part2?.title ?? "";
      case EXAM_PARTS.PART_3:
        return selectedTopic?.part3?.title ?? "";
      default:
        return "";
    }
  }, [selectedTopic, examState]);

  return { getCurrentQuestion, getPartTitle };
};

/**
 * Hook for comprehensive cleanup operations
 */
const useExamCleanup = ({
  isSpeaking,
  stopTTS,
  isRecording,
  stopRecording,
  isTimerActive,
  stopTimer,
  clearSpeechError,
  resetExam,
  setSelectedTopic,
  clearError,
  setCueCardNotes,
  toggleNotesVisibility,
}) => {
  const cleanup = useCallback(() => {
    const operations = [
      { fn: () => isSpeaking && stopTTS?.(), label: "TTS" },
      { fn: () => isRecording && stopRecording?.(), label: "recording" },
      { fn: () => isTimerActive && stopTimer?.(), label: "timer" },
      { fn: () => clearSpeechError?.(), label: "speech errors" },
      { fn: () => resetExam?.(), label: "exam state" },
      { fn: () => setSelectedTopic?.(null), label: "selected topic" },
      { fn: () => clearError?.(), label: "errors" },
      { fn: () => setCueCardNotes?.(""), label: "cue card notes" },
      { fn: () => toggleNotesVisibility?.(false), label: "notes visibility" },
    ];

    operations.forEach(({ fn, label }) => {
      safeExecute(fn, `stopping ${label}`);
    });

    console.log("🧹 All speaking exam context cleared successfully");
  }, [
    isSpeaking,
    stopTTS,
    isRecording,
    stopRecording,
    isTimerActive,
    stopTimer,
    clearSpeechError,
    resetExam,
    setSelectedTopic,
    clearError,
    setCueCardNotes,
    toggleNotesVisibility,
  ]);

  return cleanup;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const IELTSMockExam = ({ difficulty = "B1", onBack }) => {
  const { t } = useTranslation("speaking");
  const { state, actions } = useSpeaking();

  // ============================================================================
  // STATE DESTRUCTURING
  // ============================================================================

  const {
    currentView = EXAM_VIEWS.TOPIC_SELECTION,
    selectedTopic = null,
    examState = {},
    notesState = {},
  } = state || {};

  const {
    setCurrentView,
    setSelectedTopic,
    initializeExam,
    startExam,
    nextQuestion,
    completeExam,
    resetExam,
    setCueCardNotes,
    toggleNotesVisibility,
    trackQuestionTime,
    trackPartCompletion,
    clearError,
  } = actions || {};

  // ============================================================================
  // HOOKS
  // ============================================================================

  const {
    speak,
    stop: stopTTS,
    isSpeaking,
    isLoading: isTTSLoading,
    error: speechError,
    clearError: clearSpeechError,
    isSupported: speechSupported,
  } = useHybridTTS();

  const {
    startRecording,
    stopRecording,
    isRecording,
    audioBlob,
    recordingDuration,
    error: recordingError,
    systemAudioEnabled,
    recordingGuidance,
  } = useSessionRecording();

  const {
    startTimer,
    stopTimer,
    timeRemaining = 0,
    isTimerActive,
    isTimeUp,
  } = useIELTSTimer();

  // Custom hooks
  const { speakWithSelectedVoice, speechRef } = useVoiceManager(
    speak,
    stopTTS,
    clearSpeechError
  );

  const { getCurrentQuestion, getPartTitle } = useExamData(
    selectedTopic,
    examState
  );

  const clearAllSpeakingContext = useExamCleanup({
    isSpeaking,
    stopTTS,
    isRecording,
    stopRecording,
    isTimerActive,
    stopTimer,
    clearSpeechError,
    resetExam,
    setSelectedTopic,
    clearError,
    setCueCardNotes,
    toggleNotesVisibility,
  });

  // Voice initialization state
  const [isVoiceInitializing, setIsVoiceInitializing] = useState(false);
  const isTTSLoadingRef = useRef(isTTSLoading);
  const isSpeakingRef = useRef(isSpeaking);
  const currentSpeakingQuestionRef = useRef(null);
  const lastSpokenQuestionRef = useRef(null);

  // Keep refs updated with current state (for use in effects without causing re-renders)
  useEffect(() => {
    isTTSLoadingRef.current = isTTSLoading;
  }, [isTTSLoading]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
    
    // Clear current speaking question when speech ends
    if (!isSpeaking && currentSpeakingQuestionRef.current) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[Auto TTS] Speech ended, clearing current speaking question");
      }
      currentSpeakingQuestionRef.current = null;
    }
  }, [isSpeaking]);

  // Stable refs for cleanup
  const recordingRef = useRef({ stopRecording });
  const timerRef = useRef({ stopTimer });

  useEffect(() => {
    recordingRef.current = { stopRecording };
    timerRef.current = { stopTimer };
  }, [stopRecording, stopTimer]);

  // ============================================================================
  // EXAM PROGRESSION LOGIC
  // ============================================================================

  /**
   * Handles exam completion - stops all resources and saves state
   */
  const handleExamComplete = useCallback(() => {
    safeExecute(() => stopRecording(), "stopping recording on exam complete");
    safeExecute(() => stopTimer(), "stopping timer on exam complete");

    const examEndTime = Date.now();

    if (typeof completeExam === "function") {
      completeExam(examEndTime, audioBlob, recordingDuration);
    } else {
      console.warn("completeExam action is missing");
    }
  }, [stopRecording, stopTimer, completeExam, audioBlob, recordingDuration]);

  /**
   * Advances to next question or part with proper state tracking
   */
  const handleNextQuestion = useCallback(() => {
    // Stop TTS if active
    if (isSpeaking) {
      safeExecute(() => stopTTS(), "stopping TTS for next question");
    }

    if (!examState || !selectedTopic) {
      console.warn("Cannot proceed: missing examState or selectedTopic");
      return;
    }

    if (typeof nextQuestion !== "function") {
      console.warn("nextQuestion action is missing");
      return;
    }

    const {
      currentPart = EXAM_PARTS.PART_1,
      currentQuestion = 0,
      questionsCompleted = [],
      examStartTime = Date.now(),
    } = examState;

    // Track current question time
    const questionId = `${currentPart}-${currentQuestion}`;
    trackQuestionTime?.(questionId, TIMER_DURATIONS.PART_1_QUESTION);

    const newCompleted = [...questionsCompleted, currentQuestion];

    // ========================================================================
    // PART 1: Introduction and Interview
    // ========================================================================
    if (currentPart === EXAM_PARTS.PART_1) {
      const part1Length = selectedTopic?.part1?.questions?.length ?? 0;

      if (currentQuestion < part1Length - 1) {
        // More questions in Part 1
        nextQuestion({
          currentQuestion: currentQuestion + 1,
          questionsCompleted: newCompleted,
          timeRemaining: TIMER_DURATIONS.PART_1_QUESTION,
          canProgress: true,
        });
        startTimer?.(TIMER_DURATIONS.PART_1_QUESTION);
      } else {
        // Transition to Part 2 preparation
        trackPartCompletion?.(
          "Part 1",
          Date.now() - examStartTime
        );
        nextQuestion({
          currentPart: EXAM_PARTS.PART_2,
          currentQuestion: 0,
          questionsCompleted: newCompleted,
          isPreparing: true,
          timeRemaining: TIMER_DURATIONS.PART_2_PREPARATION,
          canProgress: true,
        });
        startTimer?.(TIMER_DURATIONS.PART_2_PREPARATION);
      }
      return;
    }

    // ========================================================================
    // PART 2: Individual Long Turn
    // ========================================================================
    if (currentPart === EXAM_PARTS.PART_2) {
      if (examState.isPreparing) {
        // Transition from preparation to speaking
        nextQuestion({
          isPreparing: false,
          timeRemaining: TIMER_DURATIONS.PART_2_SPEAKING,
          canProgress: true,
        });
        startTimer?.(TIMER_DURATIONS.PART_2_SPEAKING);
      } else {
        // Transition to Part 3
        trackPartCompletion?.(
          "Part 2",
          Date.now() - examStartTime
        );
        nextQuestion({
          currentPart: EXAM_PARTS.PART_3,
          currentQuestion: 0,
          questionsCompleted: [...questionsCompleted, 0],
          timeRemaining: TIMER_DURATIONS.PART_3_QUESTION,
          canProgress: true,
        });
        startTimer?.(TIMER_DURATIONS.PART_3_QUESTION);
      }
      return;
    }

    // ========================================================================
    // PART 3: Two-way Discussion
    // ========================================================================
    if (currentPart === EXAM_PARTS.PART_3) {
      const part3Length = selectedTopic?.part3?.questions?.length ?? 0;

      if (currentQuestion < part3Length - 1) {
        // More questions in Part 3
        nextQuestion({
          currentQuestion: currentQuestion + 1,
          questionsCompleted: newCompleted,
          timeRemaining: TIMER_DURATIONS.PART_3_QUESTION,
          canProgress: true,
        });
        startTimer?.(TIMER_DURATIONS.PART_3_QUESTION);
      } else {
        // Complete exam
        trackPartCompletion?.(
          "Part 3",
          Date.now() - examStartTime
        );
        handleExamComplete();
      }
    }
  }, [
    examState,
    selectedTopic,
    isSpeaking,
    stopTTS,
    nextQuestion,
    startTimer,
    trackQuestionTime,
    trackPartCompletion,
    handleExamComplete,
  ]);

  // ============================================================================
  // AUTO-PROGRESSION EFFECT
  // ============================================================================

  useEffect(() => {
    if (typeof isTimeUp !== "function") return;
    if (!examState?.examStarted || examState?.examCompleted) return;

    if (isTimeUp()) {
      // Use microtask queue to ensure clean state transitions
      queueMicrotask(() => {
        handleNextQuestion();
      });
    }
  }, [
    timeRemaining,
    examState?.examStarted,
    examState?.examCompleted,
    isTimeUp,
    handleNextQuestion,
  ]);

  // ============================================================================
  // AUTO TTS FOR QUESTIONS
  // ============================================================================

  // Ref to track all timeout IDs for proper cleanup
  const autoTTSTimeoutIdsRef = useRef([]);

  useEffect(() => {
    // Guard conditions
    if (!examState?.examStarted || !selectedTopic) return;
    if (isVoiceInitializing) return; // Prevent auto-TTS during voice initialization
    if (typeof speechSupported !== "function" || !speechSupported()) return;

    const questionData = getCurrentQuestion();
    if (!questionData) return;

    // Extract question text
    let questionText = "";
    if (typeof questionData === "string") {
      questionText = questionData;
    } else if (typeof questionData === "object" && questionData.title) {
      questionText = String(questionData.title);
    }

    if (!questionText) return;

    // Check if question text has changed from last spoken question
    if (lastSpokenQuestionRef.current === questionText) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[Auto TTS] Question text unchanged, skipping speech");
      }
      return;
    }

    // Check if this question is already being spoken
    if (currentSpeakingQuestionRef.current === questionText) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[Auto TTS] Question already being spoken, skipping duplicate request");
      }
      return;
    }

    // Mark this question as currently speaking
    currentSpeakingQuestionRef.current = questionText;
    lastSpokenQuestionRef.current = questionText;

    // Prepare speech - stop any current TTS
    speechRef.current.clearSpeechError?.();
    speechRef.current.stopTTS?.();

    // Track start time for timeout calculation
    const startTime = Date.now();
    let isCancelled = false;

    /**
     * Wait for TTS to be ready (not loading, not speaking) before starting new audio
     * This ensures audio is fully loaded before starting playback
     * Uses bounded polling with timeout limits to prevent infinite loops
     */
    const waitForTTSReady = () => {
      // Check if cancelled (component unmounted or effect re-ran)
      if (isCancelled) {
        if (process.env.NODE_ENV === "development") {
          console.debug("[Auto TTS] Wait cancelled - effect re-ran or component unmounted");
        }
        return;
      }

      const elapsed = Date.now() - startTime;

      // Check timeout limit
      if (elapsed >= TTS_MAX_WAIT_TIME) {
        console.warn(
          `[Auto TTS] TTS ready check timeout after ${TTS_MAX_WAIT_TIME}ms - proceeding with speech anyway`
        );
        // Fallback: try to speak even if TTS seems busy
        if (!isCancelled && currentSpeakingQuestionRef.current === questionText) {
          speechRef.current.speak?.(questionText);
        }
        return;
      }

      // If TTS is currently loading or speaking, wait a bit and check again
      // Use refs to avoid dependency on reactive state
      if (isTTSLoadingRef.current || isSpeakingRef.current) {
        const timeoutId = setTimeout(waitForTTSReady, TTS_DELAYS.VOICE_CHECK_RETRY);
        autoTTSTimeoutIdsRef.current.push(timeoutId);
        return;
      }

      // TTS is ready, now check for browser voices (for native TTS fallback)
      const speakWhenVoicesReady = () => {
        // Check if cancelled
        if (isCancelled) {
          if (process.env.NODE_ENV === "development") {
            console.debug("[Auto TTS] Voice check cancelled");
          }
          return;
        }

        const voiceCheckElapsed = Date.now() - startTime;

        // Check timeout limit for voice loading
        if (voiceCheckElapsed >= TTS_MAX_WAIT_TIME) {
          console.warn(
            `[Auto TTS] Voice loading timeout after ${TTS_MAX_WAIT_TIME}ms - proceeding with speech anyway`
          );
          if (!isCancelled && currentSpeakingQuestionRef.current === questionText) {
            speechRef.current.speak?.(questionText);
          }
          return;
        }

        if (typeof window === "undefined") {
          if (!isCancelled && currentSpeakingQuestionRef.current === questionText) {
          speechRef.current.speak?.(questionText);
          }
          return;
        }

        const synth = window.speechSynthesis;
        if (!synth) {
          if (!isCancelled && currentSpeakingQuestionRef.current === questionText) {
          speechRef.current.speak?.(questionText);
          }
          return;
        }

        const voices = synth.getVoices();
        if (voices?.length > 0) {
          // Small delay to ensure everything is ready
          const timeoutId = setTimeout(() => {
            if (!isCancelled && currentSpeakingQuestionRef.current === questionText) {
            speechRef.current.speak?.(questionText);
            }
          }, TTS_DELAYS.BEFORE_SPEAK);
          autoTTSTimeoutIdsRef.current.push(timeoutId);
        } else {
          // Voices not loaded yet, retry
          const timeoutId = setTimeout(speakWhenVoicesReady, TTS_DELAYS.VOICE_CHECK_RETRY);
          autoTTSTimeoutIdsRef.current.push(timeoutId);
        }
      };

      speakWhenVoicesReady();
    };

    // Delay to allow UI to render first, then wait for TTS to be ready
    const initialTimeoutId = setTimeout(() => {
      waitForTTSReady();
    }, TTS_DELAYS.QUESTION_RENDER);
    autoTTSTimeoutIdsRef.current.push(initialTimeoutId);

    // Cleanup function - clear all timeouts
    return () => {
      isCancelled = true;
      // Clear current speaking question if this effect is cleaning up
      if (currentSpeakingQuestionRef.current === questionText) {
        currentSpeakingQuestionRef.current = null;
      }
      autoTTSTimeoutIdsRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      autoTTSTimeoutIdsRef.current = [];
      if (process.env.NODE_ENV === "development") {
        console.debug("[Auto TTS] Cleaned up all timeouts");
      }
    };
  }, [
    examState?.currentPart,
    examState?.currentQuestion,
    examState?.examStarted,
    examState?.isPreparing,
    selectedTopic?.id,
    speechSupported,
    getCurrentQuestion,
    isVoiceInitializing,
    // Removed isTTSLoading and isSpeaking from dependencies - using refs instead
  ]);

  // ============================================================================
  // START RECORDING AFTER FIRST QUESTION SPEECH COMPLETES
  // ============================================================================

  // Ref to track if polling is already active
  const recordingStartPollingRef = useRef(null);

  useEffect(() => {
    // Only handle first question recording start
    if (!examState?.examStarted || firstQuestionRecordingStartedRef.current) {
      // Clean up polling if exam hasn't started or recording already started
      if (recordingStartPollingRef.current) {
        clearTimeout(recordingStartPollingRef.current);
        recordingStartPollingRef.current = null;
      }
      return;
    }
    
    if (isVoiceInitializing) return; // Wait for voice initialization to complete
    
    // Check if we have a question
    const questionData = getCurrentQuestion();
    if (!questionData) return;

    // Only proceed if this is the first question (Part 1, Question 0)
    const isFirstQuestion = examState?.currentPart === EXAM_PARTS.PART_1 && 
                           examState?.currentQuestion === 0;
    
    if (!isFirstQuestion) return;

    // Prevent multiple polling functions
    if (recordingStartPollingRef.current) return;

    // Track if speech has started for the first question
    const wasSpeakingRef = { current: false };
    const startTime = Date.now();
    const maxWaitTime = 15000; // 15 seconds max wait
    const checkInterval = 100; // Check every 100ms

    const checkSpeechComplete = () => {
      // Clear the ref when polling stops
      recordingStartPollingRef.current = null;

      // Check if recording already started (might have been started elsewhere)
      if (firstQuestionRecordingStartedRef.current) return;

      const elapsed = Date.now() - startTime;
      const currentlySpeaking = isSpeakingRef.current;
      
      // Track if speech has started
      if (currentlySpeaking) {
        wasSpeakingRef.current = true;
      }
      
      // If speech was playing and now it's not, speech has completed
      if (wasSpeakingRef.current && !currentlySpeaking && !isTTSLoadingRef.current) {
        // Speech completed, start recording and timer
        firstQuestionRecordingStartedRef.current = true;
        try {
          startRecording?.();
        } catch (error) {
          console.error("Failed to start recording:", error);
        }
        startTimer?.(TIMER_DURATIONS.PART_1_QUESTION);
        return;
      }

      // If TTS never started speaking (e.g., autoplay blocked), wait a bit then proceed
      if (!wasSpeakingRef.current && elapsed >= 3000) {
        // 3 seconds passed and speech never started, proceed anyway
        console.warn("First question speech did not start within 3 seconds - proceeding with recording");
        firstQuestionRecordingStartedRef.current = true;
        try {
          startRecording?.();
        } catch (error) {
          console.error("Failed to start recording:", error);
        }
        startTimer?.(TIMER_DURATIONS.PART_1_QUESTION);
        return;
      }

      // Check if we've exceeded max wait time
      if (elapsed >= maxWaitTime) {
        // Timeout - proceed anyway
        console.warn("First question speech completion timeout - proceeding with recording");
        firstQuestionRecordingStartedRef.current = true;
        try {
          startRecording?.();
        } catch (error) {
          console.error("Failed to start recording:", error);
        }
        startTimer?.(TIMER_DURATIONS.PART_1_QUESTION);
        return;
      }

      // Continue polling
      recordingStartPollingRef.current = setTimeout(checkSpeechComplete, checkInterval);
    };

    // Start checking after a small delay to allow speech to start
    recordingStartPollingRef.current = setTimeout(checkSpeechComplete, checkInterval);

    return () => {
      if (recordingStartPollingRef.current) {
        clearTimeout(recordingStartPollingRef.current);
        recordingStartPollingRef.current = null;
      }
    };
  }, [
    examState?.examStarted,
    examState?.currentPart,
    examState?.currentQuestion,
    isVoiceInitializing,
    getCurrentQuestion,
    startRecording,
    startTimer,
    // Note: Using refs for isSpeaking and isTTSLoading inside the polling function
  ]);

  // ============================================================================
  // CLEANUP ON UNMOUNT
  // ============================================================================

  useEffect(() => {
    return () => {
      safeExecute(
        () => speechRef.current?.stopTTS?.(),
        "stopping TTS on unmount"
      );
      safeExecute(
        () => recordingRef.current?.stopRecording?.(),
        "stopping recording on unmount"
      );
      safeExecute(
        () => timerRef.current?.stopTimer?.(),
        "stopping timer on unmount"
      );
    };
  }, []); // Intentionally empty - only run on unmount

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleTopicSelect = useCallback(
    (topic) => {
      scrollToTop();
      setSelectedTopic?.(topic);
      setCurrentView?.(EXAM_VIEWS.EXAM);
      initializeExam?.(topic);
    },
    [setSelectedTopic, setCurrentView, initializeExam]
  );

  // Ref to track if recording has been started for the first question
  const firstQuestionRecordingStartedRef = useRef(false);

  const handleStartExam = useCallback(async () => {
    // Reset recording flag
    firstQuestionRecordingStartedRef.current = false;
    
    // Set loading state and start exam state to show loading overlay
    setIsVoiceInitializing(true);
    startExam?.();

    // Clear any previous question tracking to allow first question to be spoken
    lastSpokenQuestionRef.current = null;
    currentSpeakingQuestionRef.current = null;

    // Enable AUTO TTS effect by setting isVoiceInitializing to false after a brief delay
    // This allows the AUTO TTS effect to handle speaking the first question
    setTimeout(() => {
        setIsVoiceInitializing(false);
    }, 100);
  }, [startExam]);

  const handleBackToTopics = useCallback(() => {
    clearAllSpeakingContext();
    scrollToTop();
    setCurrentView?.(EXAM_VIEWS.TOPIC_SELECTION);
  }, [clearAllSpeakingContext, setCurrentView]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Topic Selection View
  if (currentView === EXAM_VIEWS.TOPIC_SELECTION) {
    return (
      <TopicSelection
        difficulty={difficulty}
        onTopicSelect={handleTopicSelect}
        onBack={onBack}
      />
    );
  }

  // Exam View
  if (currentView === EXAM_VIEWS.EXAM) {
    return (
      <ExamModal
        topic={selectedTopic}
        examState={examState}
        currentQuestion={getCurrentQuestion()}
        partTitle={getPartTitle()}
        timeRemaining={timeRemaining}
        isRecording={isRecording}
        isSpeaking={isSpeaking}
        speechError={speechError}
        canProgress={!!(examState?.canProgress && !isSpeaking)}
        onStartExam={handleStartExam}
        onNextQuestion={handleNextQuestion}
        onSpeak={speakWithSelectedVoice}
        onStopTTS={stopTTS}
        onClearSpeechError={clearSpeechError}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        recordingError={recordingError}
        recordingDuration={recordingDuration}
        systemAudioEnabled={systemAudioEnabled}
        recordingGuidance={recordingGuidance}
        onBack={handleBackToTopics}
        formatTime={formatTime}
        cueCardNotes={notesState?.cueCardNotes}
        showCueCardNotes={!!notesState?.showCueCardNotes}
        onNotesChange={setCueCardNotes}
        onToggleNotes={toggleNotesVisibility}
        isVoiceInitializing={isVoiceInitializing}
      />
    );
  }

  // Results View
  if (currentView === EXAM_VIEWS.RESULTS) {
    return (
      <ExamResults
        topic={selectedTopic}
        examState={examState}
        audioBlob={audioBlob}
        recordingDuration={recordingDuration}
        onBackToTopics={handleBackToTopics}
        onBackToMain={onBack}
        onClearAllContext={clearAllSpeakingContext}
      />
    );
  }

  // Fallback (should not occur in normal operation)
  console.warn(`Unknown view: ${currentView}`);
  return null;
};

IELTSMockExam.propTypes = {
  difficulty: PropTypes.string,
  onBack: PropTypes.func,
};

export default IELTSMockExam;