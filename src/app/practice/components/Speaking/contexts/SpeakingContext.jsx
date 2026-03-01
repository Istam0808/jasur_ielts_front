"use client";

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useUserDataMirror } from '@/hooks/useUserDataMirror';

// Action types
const SPEAKING_ACTIONS = {
  // Exam state management
  INITIALIZE_EXAM: 'INITIALIZE_EXAM',
  START_EXAM: 'START_EXAM',
  NEXT_QUESTION: 'NEXT_QUESTION',
  COMPLETE_EXAM: 'COMPLETE_EXAM',
  RESET_EXAM: 'RESET_EXAM',
  
  // Recording management
  START_RECORDING: 'START_RECORDING',
  STOP_RECORDING: 'STOP_RECORDING',
  SET_AUDIO_BLOB: 'SET_AUDIO_BLOB',
  
  // Timer management
  START_TIMER: 'START_TIMER',
  STOP_TIMER: 'STOP_TIMER',
  UPDATE_TIME_REMAINING: 'UPDATE_TIME_REMAINING',
  
  // Navigation
  SET_CURRENT_VIEW: 'SET_CURRENT_VIEW',
  SET_SELECTED_TOPIC: 'SET_SELECTED_TOPIC',
  
  // Notes management
  SET_CUE_CARD_NOTES: 'SET_CUE_CARD_NOTES',
  TOGGLE_NOTES_VISIBILITY: 'TOGGLE_NOTES_VISIBILITY',
  
  // Analytics tracking
  TRACK_QUESTION_TIME: 'TRACK_QUESTION_TIME',
  TRACK_PART_COMPLETION: 'TRACK_PART_COMPLETION',
  TRACK_EXAM_ANALYTICS: 'TRACK_EXAM_ANALYTICS',
  
  // Error handling
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Initial state
const initialState = {
  // Current view state
  currentView: 'topic-selection', // 'topic-selection', 'exam', 'results'
  selectedTopic: null,
  
  // Exam state
  examState: {
    currentPart: 1,
    currentQuestion: 0,
    timeRemaining: 0,
    isRecording: false,
    isPreparing: false,
    canProgress: false,
    questionsCompleted: [],
    totalQuestions: 0,
    examStarted: false,
    examCompleted: false,
    examStartTime: null,
    totalTimeSpent: 0,
    partsCompleted: [],
    recordingAvailable: false
  },
  
  // Recording state
  recordingState: {
    isRecording: false,
    audioBlob: null,
    recordingDuration: 0,
    audioLevel: 0,
    error: null
  },
  
  // Timer state
  timerState: {
    isTimerActive: false,
    isPaused: false,
    timeRemaining: 0
  },
  
  // Notes state
  notesState: {
    cueCardNotes: '',
    showCueCardNotes: false
  },
  
  // Analytics state
  analyticsState: {
    questionTimes: {},
    partTimes: {},
    examMetrics: {
      totalQuestions: 0,
      questionsAnswered: 0,
      timeSpentPerPart: {},
      averageResponseTime: 0,
      completionRate: 0
    }
  },
  
  // Error state
  error: null
};

// Reducer function
const speakingReducer = (state, action) => {
  switch (action.type) {
    case SPEAKING_ACTIONS.INITIALIZE_EXAM:
      return {
        ...state,
        examState: {
          ...state.examState,
          ...action.payload,
          examStarted: false,
          examCompleted: false,
          currentPart: 1,
          currentQuestion: 0,
          questionsCompleted: [],
          canProgress: false
        }
      };
      
    case SPEAKING_ACTIONS.START_EXAM:
      return {
        ...state,
        examState: {
          ...state.examState,
          examStarted: true,
          examStartTime: action.payload.examStartTime,
          canProgress: true
        }
      };
      
    case SPEAKING_ACTIONS.NEXT_QUESTION:
      return {
        ...state,
        examState: {
          ...state.examState,
          ...action.payload
        }
      };
      
    case SPEAKING_ACTIONS.COMPLETE_EXAM:
      return {
        ...state,
        examState: {
          ...state.examState,
          examCompleted: true,
          canProgress: false,
          totalTimeSpent: action.payload.totalTimeSpent,
          partsCompleted: action.payload.partsCompleted,
          recordingAvailable: action.payload.recordingAvailable
        },
        currentView: 'results'
      };
      
    case SPEAKING_ACTIONS.RESET_EXAM:
      return {
        ...state,
        ...initialState,
        currentView: 'topic-selection'
      };
      
    case SPEAKING_ACTIONS.START_RECORDING:
      return {
        ...state,
        recordingState: {
          ...state.recordingState,
          isRecording: true,
          error: null
        },
        examState: {
          ...state.examState,
          isRecording: true
        }
      };
      
    case SPEAKING_ACTIONS.STOP_RECORDING:
      return {
        ...state,
        recordingState: {
          ...state.recordingState,
          isRecording: false
        },
        examState: {
          ...state.examState,
          isRecording: false
        }
      };
      
    case SPEAKING_ACTIONS.SET_AUDIO_BLOB:
      return {
        ...state,
        recordingState: {
          ...state.recordingState,
          audioBlob: action.payload.audioBlob,
          recordingDuration: action.payload.recordingDuration || 0
        },
        examState: {
          ...state.examState,
          recordingAvailable: !!action.payload.audioBlob
        }
      };
      
    case SPEAKING_ACTIONS.START_TIMER:
      return {
        ...state,
        timerState: {
          ...state.timerState,
          isTimerActive: true,
          isPaused: false,
          timeRemaining: action.payload.duration
        },
        examState: {
          ...state.examState,
          timeRemaining: action.payload.duration
        }
      };
      
    case SPEAKING_ACTIONS.STOP_TIMER:
      return {
        ...state,
        timerState: {
          ...state.timerState,
          isTimerActive: false,
          isPaused: false,
          timeRemaining: 0
        },
        examState: {
          ...state.examState,
          timeRemaining: 0
        }
      };
      
    case SPEAKING_ACTIONS.UPDATE_TIME_REMAINING:
      return {
        ...state,
        timerState: {
          ...state.timerState,
          timeRemaining: action.payload.timeRemaining
        },
        examState: {
          ...state.examState,
          timeRemaining: action.payload.timeRemaining
        }
      };
      
    case SPEAKING_ACTIONS.SET_CURRENT_VIEW:
      return {
        ...state,
        currentView: action.payload
      };
      
    case SPEAKING_ACTIONS.SET_SELECTED_TOPIC:
      return {
        ...state,
        selectedTopic: action.payload
      };
      
    case SPEAKING_ACTIONS.SET_CUE_CARD_NOTES:
      return {
        ...state,
        notesState: {
          ...state.notesState,
          cueCardNotes: action.payload
        }
      };
      
    case SPEAKING_ACTIONS.TOGGLE_NOTES_VISIBILITY:
      return {
        ...state,
        notesState: {
          ...state.notesState,
          showCueCardNotes: !state.notesState.showCueCardNotes
        }
      };
      
    case SPEAKING_ACTIONS.TRACK_QUESTION_TIME:
      return {
        ...state,
        analyticsState: {
          ...state.analyticsState,
          questionTimes: {
            ...state.analyticsState.questionTimes,
            [action.payload.questionId]: action.payload.timeSpent
          }
        }
      };
      
    case SPEAKING_ACTIONS.TRACK_PART_COMPLETION:
      return {
        ...state,
        analyticsState: {
          ...state.analyticsState,
          partTimes: {
            ...state.analyticsState.partTimes,
            [action.payload.part]: action.payload.timeSpent
          }
        }
      };
      
    case SPEAKING_ACTIONS.TRACK_EXAM_ANALYTICS:
      return {
        ...state,
        analyticsState: {
          ...state.analyticsState,
          examMetrics: {
            ...state.analyticsState.examMetrics,
            ...action.payload
          }
        }
      };
      
    case SPEAKING_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload
      };
      
    case SPEAKING_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
      
    default:
      return state;
  }
};

// Create context
const SpeakingContext = createContext(null);

// Provider component
export const SpeakingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(speakingReducer, initialState);
  const { isAuthenticated, user } = useUser();
  const { applyPatchAndEnqueue } = useUserDataMirror();

  // Action creators - individual useCallback hooks
  const initializeExam = useCallback((topic) => {
    const totalQuestions = 
      topic.part1.questions.length + 
      1 + // Part 2 cue card
      topic.part3.questions.length;
    
    dispatch({
      type: SPEAKING_ACTIONS.INITIALIZE_EXAM,
      payload: {
        totalQuestions,
        examStartTime: null,
        totalTimeSpent: 0,
        partsCompleted: [],
        recordingAvailable: false
      }
    });
  }, [dispatch]);
  
  const startExam = useCallback(() => {
    const examStartTime = Date.now();
    dispatch({
      type: SPEAKING_ACTIONS.START_EXAM,
      payload: { examStartTime }
    });
  }, [dispatch]);
  
  const nextQuestion = useCallback((newState) => {
    dispatch({
      type: SPEAKING_ACTIONS.NEXT_QUESTION,
      payload: newState
    });
  }, [dispatch]);
  
  const resetExam = useCallback(() => {
    dispatch({ type: SPEAKING_ACTIONS.RESET_EXAM });
  }, [dispatch]);

  // Track exam completion for analytics
  const trackExamCompletion = useCallback(async (totalTimeSpent, partsCompleted, audioBlob, topicData, analyticsData) => {
    try {
      const examData = {
        topicId: topicData?.id,
        topicTitle: topicData?.title,
        difficulty: topicData?.level,
        totalTimeSpent,
        partsCompleted,
        completionDate: new Date().toISOString(),
        recordingAvailable: !!audioBlob,
        examMetrics: analyticsData?.examMetrics,
        questionTimes: analyticsData?.questionTimes,
        partTimes: analyticsData?.partTimes
      };
      
      // Log the completion for now (can be enhanced later with proper storage)
      console.log('Speaking exam completed:', examData);
      
      // Save to local storage for now (can be enhanced with proper data persistence later)
      if (typeof window !== 'undefined') {
        const existingData = JSON.parse(localStorage.getItem('speakingCompletions') || '[]');
        existingData.push(examData);
        localStorage.setItem('speakingCompletions', JSON.stringify(existingData));
      }
      
      // TODO: Implement proper speaking completion tracking similar to reading
      // This would involve adding queueSpeakingCompletionUpdate and upsertSpeakingBestResult to useUserDataMirror
      
    } catch (error) {
      console.error('Error tracking exam completion:', error);
    }
  }, []);

  const completeExam = useCallback((examEndTime, audioBlob, recordingDuration) => {
    const totalTimeSpent = state.examState.examStartTime ? 
      Math.floor((examEndTime - state.examState.examStartTime) / 1000) : 0;
    
    // Determine which parts were completed
    const partsCompleted = [];
    if (state.examState.questionsCompleted.length > 0) partsCompleted.push('Part 1');
    if (state.examState.currentPart >= 2) partsCompleted.push('Part 2');
    if (state.examState.currentPart >= 3) partsCompleted.push('Part 3');
    
    dispatch({
      type: SPEAKING_ACTIONS.COMPLETE_EXAM,
      payload: {
        totalTimeSpent,
        partsCompleted,
        recordingAvailable: !!audioBlob
      }
    });
    
    // Track analytics and save to user data
    if (isAuthenticated && user) {
      trackExamCompletion(
        totalTimeSpent, 
        partsCompleted, 
        audioBlob, 
        state.selectedTopic, 
        state.analyticsState
      );
    }
  }, [state.examState.examStartTime, state.examState.questionsCompleted, state.examState.currentPart, state.selectedTopic, state.analyticsState, isAuthenticated, user, trackExamCompletion]);
  
  // Recording management
  const startRecording = useCallback(() => {
    dispatch({ type: SPEAKING_ACTIONS.START_RECORDING });
  }, [dispatch]);
  
  const stopRecording = useCallback(() => {
    console.log('🛑 Context stopRecording called');
    console.trace('🛑 Context stopRecording called from:');
    dispatch({ type: SPEAKING_ACTIONS.STOP_RECORDING });
  }, [dispatch]);
  
  const setAudioBlob = useCallback((audioBlob, recordingDuration) => {
    dispatch({
      type: SPEAKING_ACTIONS.SET_AUDIO_BLOB,
      payload: { audioBlob, recordingDuration }
    });
  }, [dispatch]);
  
  // Timer management
  const startTimer = useCallback((duration) => {
    dispatch({
      type: SPEAKING_ACTIONS.START_TIMER,
      payload: { duration }
    });
  }, [dispatch]);
  
  const stopTimer = useCallback(() => {
    dispatch({ type: SPEAKING_ACTIONS.STOP_TIMER });
  }, [dispatch]);
  
  const updateTimeRemaining = useCallback((timeRemaining) => {
    dispatch({
      type: SPEAKING_ACTIONS.UPDATE_TIME_REMAINING,
      payload: { timeRemaining }
    });
  }, [dispatch]);
  
  // Navigation
  const setCurrentView = useCallback((view) => {
    dispatch({
      type: SPEAKING_ACTIONS.SET_CURRENT_VIEW,
      payload: view
    });
  }, [dispatch]);
  
  const setSelectedTopic = useCallback((topic) => {
    dispatch({
      type: SPEAKING_ACTIONS.SET_SELECTED_TOPIC,
      payload: topic
    });
  }, [dispatch]);
  
  // Notes management
  const setCueCardNotes = useCallback((notes) => {
    dispatch({
      type: SPEAKING_ACTIONS.SET_CUE_CARD_NOTES,
      payload: notes
    });
  }, [dispatch]);
  
  const toggleNotesVisibility = useCallback(() => {
    dispatch({ type: SPEAKING_ACTIONS.TOGGLE_NOTES_VISIBILITY });
  }, [dispatch]);
  
  // Analytics tracking
  const trackQuestionTime = useCallback((questionId, timeSpent) => {
    dispatch({
      type: SPEAKING_ACTIONS.TRACK_QUESTION_TIME,
      payload: { questionId, timeSpent }
    });
  }, [dispatch]);
  
  const trackPartCompletion = useCallback((part, timeSpent) => {
    dispatch({
      type: SPEAKING_ACTIONS.TRACK_PART_COMPLETION,
      payload: { part, timeSpent }
    });
  }, [dispatch]);
  
  // Error handling
  const setError = useCallback((error) => {
    dispatch({
      type: SPEAKING_ACTIONS.SET_ERROR,
      payload: error
    });
  }, [dispatch]);
  
  const clearError = useCallback(() => {
    dispatch({ type: SPEAKING_ACTIONS.CLEAR_ERROR });
  }, [dispatch]);

  // Memoized actions object
  const actions = useMemo(() => ({
    // Exam management
    initializeExam,
    startExam,
    nextQuestion,
    completeExam,
    resetExam,
    
    // Recording management
    startRecording,
    stopRecording,
    setAudioBlob,
    
    // Timer management
    startTimer,
    stopTimer,
    updateTimeRemaining,
    
    // Navigation
    setCurrentView,
    setSelectedTopic,
    
    // Notes management
    setCueCardNotes,
    toggleNotesVisibility,
    
    // Analytics tracking
    trackQuestionTime,
    trackPartCompletion,
    
    // Error handling
    setError,
    clearError
  }), [
    initializeExam,
    startExam,
    nextQuestion,
    completeExam,
    resetExam,
    startRecording,
    stopRecording,
    setAudioBlob,
    startTimer,
    stopTimer,
    updateTimeRemaining,
    setCurrentView,
    setSelectedTopic,
    setCueCardNotes,
    toggleNotesVisibility,
    trackQuestionTime,
    trackPartCompletion,
    setError,
    clearError
  ]);

  const value = {
    state,
    actions,
    isAuthenticated,
    user
  };

  return (
    <SpeakingContext.Provider value={value}>
      {children}
    </SpeakingContext.Provider>
  );
};

// Hook to use the context
export const useSpeaking = () => {
  const context = useContext(SpeakingContext);
  if (!context) {
    throw new Error('useSpeaking must be used within a SpeakingProvider');
  }
  return context;
};

export { SPEAKING_ACTIONS };
