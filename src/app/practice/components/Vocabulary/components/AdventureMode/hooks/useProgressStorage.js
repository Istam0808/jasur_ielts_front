import { useCallback, useMemo } from 'react';
import { progressStorage } from '../storage';
import { DEFAULT_PLAYER_STATS } from '../constants';

// Utility function to validate numeric values with bounds
const validateNumeric = (value, min = 0, defaultValue = min) => 
  Number.isFinite(value) ? Math.max(min, value) : defaultValue;

// Utility function to validate arrays and convert to Set
const validateArrayToSet = (value) => 
  new Set(Array.isArray(value) ? value : []);

// Utility function to validate objects
const validateObject = (value, fallback = {}) => 
  value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;

// Memoized utility function to validate player stats
const validatePlayerStats = (stats) => {
  if (!stats || typeof stats !== 'object') {
    return { ...DEFAULT_PLAYER_STATS };
  }
  
  return {
    level: validateNumeric(stats.level, 1, 1),
    experience: validateNumeric(stats.experience, 0, 0),
    experienceToNext: validateNumeric(stats.experienceToNext, 100, 100),
    streak: validateNumeric(stats.streak, 0, 0),
    maxStreak: validateNumeric(stats.maxStreak, 0, 0),
    totalScore: validateNumeric(stats.totalScore, 0, 0),
    perfectChapters: validateNumeric(stats.perfectChapters, 0, 0),
    gems: validateNumeric(stats.gems, 0, 0)
  };
};

// Default progress structure
const createDefaultProgress = () => ({
  currentChapter: 0,
  completedWords: new Set(),
  attemptedWords: new Set(),
  chapterScores: {},
  playerStats: { ...DEFAULT_PLAYER_STATS },
  achievements: new Set()
});

// Enhanced error handling with specific error types
const handleStorageError = (operation, error) => {
  const errorMessage = `Failed to ${operation} progress ${operation === 'load' ? 'from' : 'to'} storage`;
  console.warn(`${errorMessage}:`, error);
  
  // Optional: Report to error tracking service
  if (typeof window !== 'undefined' && window.reportError) {
    window.reportError(new Error(`${errorMessage}: ${error.message}`));
  }
};

export const useProgressStorage = (storageKey) => {
  // Validate storageKey
  if (!storageKey || typeof storageKey !== 'string') {
    throw new Error('useProgressStorage: storageKey must be a non-empty string');
  }

  // Memoize the storage operations to prevent unnecessary re-renders
  const storageOperations = useMemo(() => ({
    // Load initial state from storage
    loadProgressFromStorage: () => {
      try {
        const saved = progressStorage.getItem(storageKey);
        if (!saved) return null;
        
        const parsed = JSON.parse(saved);
        
        return {
          currentChapter: validateNumeric(parsed.currentChapter, 0, 0),
          completedWords: validateArrayToSet(parsed.completedWords),
          attemptedWords: validateArrayToSet(parsed.attemptedWords),
          chapterScores: validateObject(parsed.chapterScores),
          playerStats: validatePlayerStats(parsed.playerStats),
          achievements: validateArrayToSet(parsed.achievements)
        };
      } catch (error) {
        handleStorageError('load', error);
        return null;
      }
    },

    // Save progress to storage
    saveProgressToStorage: (progress) => {
      if (!progress || typeof progress !== 'object') {
        console.warn('Invalid progress object provided to saveProgressToStorage');
        return false;
      }

      try {
        const toSave = {
          currentChapter: progress.currentChapter,
          completedWords: Array.from(progress.completedWords || []),
          attemptedWords: Array.from(progress.attemptedWords || []),
          chapterScores: progress.chapterScores || {},
          playerStats: progress.playerStats || { ...DEFAULT_PLAYER_STATS },
          achievements: Array.from(progress.achievements || []),
          lastSaved: Date.now()
        };
        
        progressStorage.setItem(storageKey, JSON.stringify(toSave));
        return true;
      } catch (error) {
        handleStorageError('save', error);
        return false;
      }
    },

    // Clear progress from storage
    clearProgressFromStorage: () => {
      try {
        progressStorage.removeItem(storageKey);
        return true;
      } catch (error) {
        handleStorageError('clear', error);
        return false;
      }
    },

    // Check if storage has data for the given key
    hasProgressInStorage: () => {
      try {
        const saved = progressStorage.getItem(storageKey);
        return saved !== null && saved !== undefined;
      } catch (error) {
        handleStorageError('check', error);
        return false;
      }
    },

    // Get storage info (size, last saved, etc.)
    getStorageInfo: () => {
      try {
        const saved = progressStorage.getItem(storageKey);
        if (!saved) return null;
        
        const parsed = JSON.parse(saved);
        return {
          size: saved.length,
          lastSaved: parsed.lastSaved || null,
          hasData: true
        };
      } catch (error) {
        handleStorageError('get info', error);
        return null;
      }
    }
  }), [storageKey]);

  // Return memoized callbacks to prevent unnecessary re-renders in components
  return useMemo(() => ({
    loadProgressFromStorage: storageOperations.loadProgressFromStorage,
    saveProgressToStorage: storageOperations.saveProgressToStorage,
    clearProgressFromStorage: storageOperations.clearProgressFromStorage,
    hasProgressInStorage: storageOperations.hasProgressInStorage,
    getStorageInfo: storageOperations.getStorageInfo,
    validatePlayerStats,
    createDefaultProgress
  }), [storageOperations]);
};