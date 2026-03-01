import { useCallback, useRef, useMemo } from 'react';
import { useSpeaking } from '../contexts/SpeakingContext';
import { useUser } from '@/contexts/UserContext';

/**
 * Custom hook for tracking speaking exam analytics and performance metrics
 * 
 * Features:
 * - Real-time tracking of question, part, and exam durations
 * - Comprehensive analytics calculation
 * - Performance insights generation
 * - Analytics export functionality
 * - Automatic data persistence for authenticated users
 */
export const useSpeakingAnalytics = () => {
  const { state, actions } = useSpeaking();
  const { isAuthenticated, user } = useUser();

  // Refs for tracking timing - using refs to avoid re-renders
  const questionStartTimeRef = useRef(null);
  const partStartTimeRef = useRef(null);
  const examStartTimeRef = useRef(null);

  const {
    trackQuestionTime,
    trackPartCompletion,
    setError
  } = actions;

  /**
   * Helper function to calculate average time for a specific part
   * Memoized to avoid recalculation on every render
   */
  const calculatePartAverageTime = useCallback((part, questionTimes) => {
    if (!questionTimes || typeof questionTimes !== 'object') return 0;

    // Extract part number (e.g., "Part 1" -> "1", "Part 3" -> "3")
    const partNumber = part.replace(/[^\d]/g, '');
    if (!partNumber) return 0;

    const partQuestionIds = Object.keys(questionTimes).filter(id =>
      id.startsWith(partNumber) || id.toLowerCase().includes(`part${partNumber}`)
    );

    if (partQuestionIds.length === 0) return 0;

    const partTimes = partQuestionIds.map(id => questionTimes[id]).filter(time => typeof time === 'number' && !isNaN(time));

    if (partTimes.length === 0) return 0;

    return partTimes.reduce((sum, time) => sum + time, 0) / partTimes.length;
  }, []);

  /**
   * Start tracking a question
   * Records the start time for response time calculation
   */
  const startQuestionTracking = useCallback((questionId) => {
    if (!questionId) {
      console.warn('startQuestionTracking called without questionId');
      return;
    }
    questionStartTimeRef.current = Date.now();
  }, []);

  /**
   * End tracking a question and record the time
   * Calculates and stores the time spent on the question
   */
  const endQuestionTracking = useCallback((questionId) => {
    if (!questionId) {
      console.warn('endQuestionTracking called without questionId');
      return;
    }

    if (questionStartTimeRef.current) {
      const timeSpent = Date.now() - questionStartTimeRef.current;

      // Validate timeSpent is reasonable (not negative, not too large)
      if (timeSpent >= 0 && timeSpent < 3600000) { // Less than 1 hour
        trackQuestionTime(questionId, timeSpent);
      } else {
        console.warn(`Invalid timeSpent value: ${timeSpent}ms for question ${questionId}`);
      }

      questionStartTimeRef.current = null;
    }
  }, [trackQuestionTime]);

  /**
   * Start tracking a part
   * Records the start time for part duration calculation
   */
  const startPartTracking = useCallback((part) => {
    if (!part) {
      console.warn('startPartTracking called without part');
      return;
    }
    partStartTimeRef.current = Date.now();
  }, []);

  /**
   * End tracking a part and record the time
   * Calculates and stores the time spent on the part
   */
  const endPartTracking = useCallback((part) => {
    if (!part) {
      console.warn('endPartTracking called without part');
      return;
    }

    if (partStartTimeRef.current) {
      const timeSpent = Date.now() - partStartTimeRef.current;

      // Validate timeSpent is reasonable
      if (timeSpent >= 0 && timeSpent < 7200000) { // Less than 2 hours
        trackPartCompletion(part, timeSpent);
      } else {
        console.warn(`Invalid timeSpent value: ${timeSpent}ms for part ${part}`);
      }

      partStartTimeRef.current = null;
    }
  }, [trackPartCompletion]);

  /**
   * Start tracking the entire exam
   * Records the start time for total exam duration calculation
   */
  const startExamTracking = useCallback(() => {
    examStartTimeRef.current = Date.now();
  }, []);

  /**
   * Get the total exam duration
   * Returns the time elapsed since exam start in milliseconds
   */
  const getExamDuration = useCallback(() => {
    if (!examStartTimeRef.current) return 0;
    return Date.now() - examStartTimeRef.current;
  }, []);

  /**
   * Calculate comprehensive exam analytics
   * Generates detailed statistics about the exam session
   */
  const calculateExamAnalytics = useCallback(() => {
    const { analyticsState, examState, selectedTopic } = state;

    // Validation checks
    if (!selectedTopic) {
      console.warn('calculateExamAnalytics: No topic selected');
      return null;
    }

    if (!selectedTopic.part1 || !selectedTopic.part3) {
      console.error('calculateExamAnalytics: Invalid topic structure');
      return null;
    }

    // Calculate total questions safely
    const part1Questions = Array.isArray(selectedTopic.part1.questions)
      ? selectedTopic.part1.questions.length
      : 0;
    const part3Questions = Array.isArray(selectedTopic.part3.questions)
      ? selectedTopic.part3.questions.length
      : 0;
    const totalQuestions = part1Questions + 1 + part3Questions; // +1 for Part 2 cue card

    // Get questions answered safely
    const questionsAnswered = Array.isArray(examState?.questionsCompleted)
      ? examState.questionsCompleted.length
      : 0;

    // Calculate average response time
    const questionTimes = analyticsState?.questionTimes || {};
    const questionTimeValues = Object.values(questionTimes).filter(time =>
      typeof time === 'number' && !isNaN(time) && time >= 0
    );

    const averageResponseTime = questionTimeValues.length > 0
      ? questionTimeValues.reduce((sum, time) => sum + time, 0) / questionTimeValues.length
      : 0;

    // Calculate completion rate
    const completionRate = totalQuestions > 0
      ? Math.round((questionsAnswered / totalQuestions) * 100 * 10) / 10 // Round to 1 decimal
      : 0;

    // Get time spent per part
    const timeSpentPerPart = analyticsState?.partTimes || {};

    // Calculate exam duration (use stored value or calculate from ref)
    const examDuration = examState?.totalTimeSpent || getExamDuration();

    // Calculate part-specific analytics
    const currentPart = examState?.currentPart || 0;
    const completedQuestions = examState?.questionsCompleted || [];

    const part1AnsweredCount = currentPart >= 1
      ? completedQuestions.filter(q => typeof q === 'number' && q < part1Questions).length
      : 0;

    const part3AnsweredCount = currentPart >= 3
      ? Math.max(0, completedQuestions.length - part1Questions - 1)
      : 0;

    const analytics = {
      // Overall metrics
      totalQuestions,
      questionsAnswered,
      completionRate,
      averageResponseTime: Math.round(averageResponseTime),

      // Time tracking
      timeSpentPerPart,
      examDuration: Math.round(examDuration),

      // Progress tracking
      partsCompleted: Array.isArray(examState?.partsCompleted)
        ? examState.partsCompleted.length
        : 0,

      // Technical details
      recordingAvailable: examState?.recordingAvailable || false,

      // Topic information
      topicId: selectedTopic.id,
      topicTitle: selectedTopic.title,
      difficulty: selectedTopic.level,

      // Metadata
      completionDate: new Date().toISOString(),

      // Detailed breakdown by part
      questionBreakdown: {
        part1: {
          totalQuestions: part1Questions,
          answeredQuestions: part1AnsweredCount,
          completionRate: part1Questions > 0
            ? Math.round((part1AnsweredCount / part1Questions) * 100 * 10) / 10
            : 0,
          averageTime: Math.round(calculatePartAverageTime('Part 1', questionTimes))
        },
        part2: {
          completed: currentPart >= 2,
          timeSpent: Math.round(timeSpentPerPart['Part 2'] || 0),
          expectedTime: 120000 // 2 minutes in milliseconds
        },
        part3: {
          totalQuestions: part3Questions,
          answeredQuestions: part3AnsweredCount,
          completionRate: part3Questions > 0
            ? Math.round((part3AnsweredCount / part3Questions) * 100 * 10) / 10
            : 0,
          averageTime: Math.round(calculatePartAverageTime('Part 3', questionTimes))
        }
      }
    };

    return analytics;
  }, [state, calculatePartAverageTime, getExamDuration]);

  /**
   * Save analytics to user data
   * Persists analytics for authenticated users
   */
  const saveAnalytics = useCallback(async (analytics) => {
    if (!analytics) {
      console.warn('saveAnalytics: No analytics data provided');
      return false;
    }

    if (!isAuthenticated || !user) {
      console.info('saveAnalytics: User not authenticated, skipping save');
      return false;
    }

    try {
      // Log analytics for now - can be extended to actual API call
      console.log('Speaking Exam Analytics:', {
        userId: user.uid,
        timestamp: new Date().toISOString(),
        analytics
      });

      // TODO: Integrate with your user data persistence system
      // Example implementation:
      // await saveSpeakingAnalytics(user.uid, {
      //   ...analytics,
      //   userId: user.uid,
      //   savedAt: new Date().toISOString()
      // });

      return true;
    } catch (error) {
      console.error('Error saving analytics:', error);
      setError?.('Failed to save analytics data. Your progress is still tracked locally.');
      return false;
    }
  }, [isAuthenticated, user, setError]);

  /**
   * Get performance insights based on analytics
   * Analyzes performance and provides actionable feedback
   */
  const getPerformanceInsights = useCallback((analytics) => {
    if (!analytics) return [];

    const insights = [];

    // Completion rate insights
    if (analytics.completionRate < 50) {
      insights.push({
        type: 'warning',
        category: 'completion',
        priority: 'high',
        message: 'Consider taking your time to complete more questions for better practice.',
        suggestion: 'Try to answer at least half of the questions in each part to build fluency and confidence.',
        metric: `${analytics.completionRate.toFixed(1)}% completion rate`
      });
    } else if (analytics.completionRate >= 90) {
      insights.push({
        type: 'success',
        category: 'completion',
        priority: 'medium',
        message: 'Excellent completion rate! You\'re covering all parts of the exam thoroughly.',
        suggestion: 'Great job! Now focus on improving response quality and using advanced vocabulary.',
        metric: `${analytics.completionRate.toFixed(1)}% completion rate`
      });
    } else if (analytics.completionRate >= 75) {
      insights.push({
        type: 'success',
        category: 'completion',
        priority: 'low',
        message: 'Good completion rate! You\'re making solid progress.',
        suggestion: 'Try to complete the remaining questions for comprehensive practice.',
        metric: `${analytics.completionRate.toFixed(1)}% completion rate`
      });
    }

    // Response time insights
    const avgTimeSeconds = analytics.averageResponseTime / 1000;

    if (analytics.averageResponseTime < 10000) { // Less than 10 seconds
      insights.push({
        type: 'info',
        category: 'timing',
        priority: 'high',
        message: 'Your responses are quite brief. In the real exam, you should expand your answers.',
        suggestion: 'Aim for 30-45 seconds per question in Part 1, and use the STAR method (Situation, Task, Action, Result) to structure longer responses.',
        metric: `${avgTimeSeconds.toFixed(1)}s average response time`
      });
    } else if (analytics.averageResponseTime > 120000) { // More than 2 minutes
      insights.push({
        type: 'info',
        category: 'timing',
        priority: 'medium',
        message: 'Your responses are quite lengthy. Practice being more concise while maintaining substance.',
        suggestion: 'Focus on clear, structured answers. In Part 1, aim for 30-45 seconds. Use signposting language to organize your thoughts.',
        metric: `${avgTimeSeconds.toFixed(1)}s average response time`
      });
    } else if (analytics.averageResponseTime >= 30000 && analytics.averageResponseTime <= 60000) {
      insights.push({
        type: 'success',
        category: 'timing',
        priority: 'low',
        message: 'Your response timing is well-balanced!',
        suggestion: 'Maintain this pace and focus on content quality and vocabulary range.',
        metric: `${avgTimeSeconds.toFixed(1)}s average response time`
      });
    }

    // Part 2 specific insights
    const part2TimeSpent = analytics.questionBreakdown?.part2?.timeSpent || 0;
    const part2TimeSeconds = part2TimeSpent / 1000;

    if (analytics.questionBreakdown?.part2?.completed) {
      if (part2TimeSpent < 60000) { // Less than 1 minute
        insights.push({
          type: 'warning',
          category: 'part2',
          priority: 'high',
          message: 'Part 2 speaking time was quite short. The examiner expects you to speak for about 2 minutes.',
          suggestion: 'Use all the cue card points to structure your response. Practice expanding on each point with examples and details.',
          metric: `${part2TimeSeconds.toFixed(1)}s in Part 2 (target: 120s)`
        });
      } else if (part2TimeSpent >= 90000 && part2TimeSpent <= 150000) { // 1.5-2.5 minutes
        insights.push({
          type: 'success',
          category: 'part2',
          priority: 'low',
          message: 'Excellent Part 2 duration! You\'re meeting the time requirement.',
          suggestion: 'Now focus on using varied vocabulary, complex sentences, and natural fluency.',
          metric: `${part2TimeSeconds.toFixed(1)}s in Part 2`
        });
      } else if (part2TimeSpent > 180000) { // More than 3 minutes
        insights.push({
          type: 'info',
          category: 'part2',
          priority: 'medium',
          message: 'Part 2 was longer than typical. The examiner may interrupt after 2 minutes.',
          suggestion: 'Practice delivering complete thoughts within the 2-minute timeframe.',
          metric: `${part2TimeSeconds.toFixed(1)}s in Part 2 (target: 120s)`
        });
      }
    }

    // Part-specific completion insights
    const { part1, part3 } = analytics.questionBreakdown || {};

    if (part1 && part1.completionRate < 50) {
      insights.push({
        type: 'warning',
        category: 'part1',
        priority: 'medium',
        message: 'Part 1 completion is low. This section tests your ability to discuss familiar topics.',
        suggestion: 'Part 1 is your warm-up. Answer all questions naturally and conversationally.',
        metric: `${part1.completionRate.toFixed(1)}% Part 1 completion`
      });
    }

    if (part3 && part3.completionRate < 50 && analytics.partsCompleted >= 3) {
      insights.push({
        type: 'warning',
        category: 'part3',
        priority: 'medium',
        message: 'Part 3 completion is low. This section requires more detailed, analytical responses.',
        suggestion: 'Part 3 questions are more abstract. Use examples and develop your ideas fully.',
        metric: `${part3.completionRate.toFixed(1)}% Part 3 completion`
      });
    }

    // Overall performance summary
    if (insights.length === 0) {
      insights.push({
        type: 'success',
        category: 'overall',
        priority: 'low',
        message: 'You\'re performing well across all metrics!',
        suggestion: 'Continue practicing regularly and focus on using a wide range of vocabulary and grammatical structures.',
        metric: 'All metrics within target ranges'
      });
    }

    // Sort insights by priority (high > medium > low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return insights;
  }, []);

  /**
   * Export analytics data to JSON file
   * Creates a downloadable file with comprehensive analytics and insights
   */
  const exportAnalytics = useCallback((analytics) => {
    if (!analytics) {
      console.warn('exportAnalytics: No analytics data to export');
      return;
    }

    try {
      const insights = getPerformanceInsights(analytics);

      const exportData = {
        version: '1.0',
        analytics,
        insights,
        exportMetadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: user?.uid || 'anonymous',
          appVersion: process.env.REACT_APP_VERSION || 'unknown'
        }
      };

      // Create downloadable JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `speaking-analytics-${analytics.topicId}-${timestamp}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      console.log(`Analytics exported successfully: ${filename}`);
    } catch (error) {
      console.error('Error exporting analytics:', error);
      setError?.('Failed to export analytics data. Please try again.');
    }
  }, [getPerformanceInsights, user, setError]);

  /**
   * Reset all tracking timers
   * Useful when starting a new exam or resetting state
   */
  const resetTracking = useCallback(() => {
    questionStartTimeRef.current = null;
    partStartTimeRef.current = null;
    examStartTimeRef.current = null;
  }, []);

  // Memoize the analytics state to prevent unnecessary recalculations
  const analyticsState = useMemo(() => state?.analyticsState || {}, [state?.analyticsState]);

  return {
    // Tracking functions
    startQuestionTracking,
    endQuestionTracking,
    startPartTracking,
    endPartTracking,
    startExamTracking,
    resetTracking,

    // Analytics functions
    calculateExamAnalytics,
    getPerformanceInsights,
    saveAnalytics,
    exportAnalytics,

    // Utility functions
    getExamDuration,

    // Current state
    analyticsState
  };
};