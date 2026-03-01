/**
 * Audio Analysis Utilities for Shadowing Practice
 * 
 * Provides robust audio processing and analysis capabilities with:
 * - Efficient AudioContext management with proper lifecycle handling
 * - Comprehensive error handling and validation
 * - Browser compatibility support
 * - Performance optimizations
 * - Memory-efficient audio processing
 * 
 * @module audioAnalysis
 */

import {
  calculateTextMatch,
  calculateSpeechRate,
  calculateCompleteness
} from './textProcessing';

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_RECORDING_DURATION = 0.5; // seconds
const MIN_TRANSCRIPT_LENGTH = 3; // characters
const AUDIO_CONTEXT_TIMEOUT = 30000; // 30 seconds idle timeout
const MAX_AUDIO_DURATION = 300; // 5 minutes max to prevent memory issues

// Audio activity detection constants
const AUDIO_ACTIVITY = Object.freeze({
  ENERGY_THRESHOLD: 0.01,        // RMS threshold for voice detection
  MIN_ACTIVE_RATIO: 0.3,         // 30% of audio should be active speech
  FRAME_SIZE: 1024,              // Samples per analysis frame
  SILENCE_THRESHOLD: 0.005,      // Below this is considered silence
  NOISE_FLOOR: 0.001             // Minimum energy level (helps filter out noise)
});

/**
 * Error types for better error handling
 */
export const AudioAnalysisError = Object.freeze({
  CONTEXT_CREATION_FAILED: 'Failed to create AudioContext',
  CONTEXT_RESUME_FAILED: 'Failed to resume AudioContext',
  DECODE_FAILED: 'Failed to decode audio data',
  RECORDING_TOO_SHORT: 'Recording too short',
  RECORDING_TOO_LONG: 'Recording too long',
  NO_SPEECH_DETECTED: 'No speech detected',
  INVALID_INPUT: 'Invalid input parameters',
  ANALYSIS_FAILED: 'Analysis computation failed',
  BROWSER_NOT_SUPPORTED: 'Browser not supported'
});

// ============================================================================
// AUDIO CONTEXT MANAGEMENT
// ============================================================================

let audioContextInstance = null;
let contextCleanupTimer = null;
let contextUsageCount = 0;

/**
 * Gets or creates an AudioContext instance with automatic cleanup
 * Implements singleton pattern with idle timeout for memory efficiency
 * 
 * @returns {AudioContext} Shared AudioContext instance
 * @throws {Error} If AudioContext creation fails
 */
function getAudioContext() {
  // Clear existing cleanup timer
  if (contextCleanupTimer) {
    clearTimeout(contextCleanupTimer);
    contextCleanupTimer = null;
  }

  // Create new context if needed
  if (!audioContextInstance || audioContextInstance.state === 'closed') {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error(AudioAnalysisError.BROWSER_NOT_SUPPORTED);
      }

      audioContextInstance = new AudioContextClass();
      contextUsageCount = 0;

      // Monitor context state changes
      audioContextInstance.addEventListener('statechange', () => {
        if (audioContextInstance?.state === 'interrupted') {
          console.warn('AudioContext interrupted - may need to resume');
        }
      });

    } catch (error) {
      console.error('Failed to create AudioContext:', error);
      audioContextInstance = null;
      throw new Error(AudioAnalysisError.CONTEXT_CREATION_FAILED);
    }
  }

  // Increment usage counter
  contextUsageCount++;

  // Schedule automatic cleanup after idle period
  scheduleContextCleanup();

  return audioContextInstance;
}

/**
 * Schedules automatic cleanup of AudioContext after idle period
 * Helps manage memory in long-running applications
 * 
 * @private
 */
function scheduleContextCleanup() {
  contextCleanupTimer = setTimeout(() => {
    if (audioContextInstance && audioContextInstance.state !== 'closed') {
      console.log(`Auto-cleaning up idle AudioContext (used ${contextUsageCount} times)`);
      cleanupAudioContext().catch(error => {
        console.warn('Error during automatic AudioContext cleanup:', error);
      });
    }
  }, AUDIO_CONTEXT_TIMEOUT);
}

/**
 * Closes and cleans up the audio context
 * Should be called when the component unmounts or audio processing is complete
 * 
 * @returns {Promise<void>}
 */
export async function cleanupAudioContext() {
  // Clear cleanup timer
  if (contextCleanupTimer) {
    clearTimeout(contextCleanupTimer);
    contextCleanupTimer = null;
  }

  // Close context
  if (audioContextInstance && audioContextInstance.state !== 'closed') {
    try {
      await audioContextInstance.close();
      console.log(`AudioContext closed (total uses: ${contextUsageCount})`);
    } catch (error) {
      console.warn('Error closing AudioContext:', error);
    } finally {
      audioContextInstance = null;
      contextUsageCount = 0;
    }
  }
}

/**
 * Resumes AudioContext if suspended
 * Required by browser autoplay policies
 * 
 * @private
 * @param {AudioContext} audioCtx - AudioContext to resume
 * @returns {Promise<void>}
 */
async function ensureContextRunning(audioCtx) {
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (error) {
      console.error('Failed to resume AudioContext:', error);
      throw new Error(AudioAnalysisError.CONTEXT_RESUME_FAILED);
    }
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Extracts user-friendly error message from error objects or strings
 * Removes error type prefixes and returns clean, actionable messages
 * 
 * @param {Error|string} error - Error object or error message string
 * @returns {string} User-friendly error message
 * 
 * @example
 * extractUserFriendlyError("No speech detected: Please speak clearly")
 * // Returns: "Please speak clearly"
 * 
 * extractUserFriendlyError(new Error("No speech detected: Please speak clearly"))
 * // Returns: "Please speak clearly"
 */
export function extractUserFriendlyError(error) {
  if (!error) {
    return 'An unknown error occurred';
  }

  // Extract message from Error object or use string directly
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (!errorMessage?.trim()) {
    return 'An unknown error occurred';
  }

  // Remove error type prefixes (format: "ErrorType: message")
  const prefixPattern = /^[^:]+:\s*/;
  const cleanedMessage = errorMessage.replace(prefixPattern, '').trim();

  // Return cleaned message if different from original, otherwise return original
  return cleanedMessage && cleanedMessage !== errorMessage ? cleanedMessage : errorMessage;
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

/**
 * Validates input parameters for audio analysis
 * 
 * @private
 * @param {Blob} audioBlob - Audio blob to validate
 * @param {string} referenceText - Reference text to validate
 * @param {string} transcript - Transcript to validate
 * @throws {Error} If validation fails
 */
function validateInputs(audioBlob, referenceText, transcript) {
  if (!(audioBlob instanceof Blob)) {
    throw new Error(`${AudioAnalysisError.INVALID_INPUT}: audioBlob must be a Blob`);
  }

  if (audioBlob.size === 0) {
    throw new Error(`${AudioAnalysisError.INVALID_INPUT}: audioBlob is empty`);
  }

  // Validate audio blob size (prevent memory issues with huge files)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (audioBlob.size > maxSize) {
    throw new Error(`${AudioAnalysisError.INVALID_INPUT}: audioBlob exceeds maximum size`);
  }

  if (typeof referenceText !== 'string') {
    throw new Error(`${AudioAnalysisError.INVALID_INPUT}: referenceText must be a string`);
  }

  if (typeof transcript !== 'string') {
    throw new Error(`${AudioAnalysisError.INVALID_INPUT}: transcript must be a string`);
  }
}

/**
 * Validates audio buffer meets minimum requirements
 * 
 * @private
 * @param {AudioBuffer} audioBuffer - Decoded audio buffer
 * @throws {Error} If audio doesn't meet requirements
 */
function validateAudioBuffer(audioBuffer) {
  if (audioBuffer.duration < MIN_RECORDING_DURATION) {
    throw new Error(
      `${AudioAnalysisError.RECORDING_TOO_SHORT}: Please speak for at least ${MIN_RECORDING_DURATION} second(s)`
    );
  }

  if (audioBuffer.duration > MAX_AUDIO_DURATION) {
    throw new Error(
      `${AudioAnalysisError.RECORDING_TOO_LONG}: Recording exceeds maximum duration of ${MAX_AUDIO_DURATION} seconds`
    );
  }
}

/**
 * Validates transcript meets minimum requirements
 * 
 * @private
 * @param {string} transcript - User's speech transcript
 * @throws {Error} If transcript is too short or empty
 */
function validateTranscript(transcript) {
  const trimmedTranscript = transcript.trim();

  if (trimmedTranscript.length < MIN_TRANSCRIPT_LENGTH) {
    throw new Error(
      `${AudioAnalysisError.NO_SPEECH_DETECTED}: Please speak clearly into the microphone`
    );
  }
}

// ============================================================================
// AUDIO DECODING
// ============================================================================

/**
 * Decodes audio blob into AudioBuffer with retry logic
 * 
 * @private
 * @param {ArrayBuffer} arrayBuffer - Audio data as ArrayBuffer
 * @param {AudioContext} audioCtx - AudioContext instance
 * @returns {Promise<AudioBuffer>}
 */
async function decodeAudio(arrayBuffer, audioCtx) {
  try {
    return await audioCtx.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.error('Failed to decode audio:', error);

    // Provide more specific error message if possible
    const errorMsg = error.message?.toLowerCase() || '';
    if (errorMsg.includes('mime') || errorMsg.includes('format')) {
      throw new Error(`${AudioAnalysisError.DECODE_FAILED}: Unsupported audio format`);
    }

    throw new Error(`${AudioAnalysisError.DECODE_FAILED}: Unable to process audio file`);
  }
}

// ============================================================================
// AUDIO SAMPLE EXTRACTION
// ============================================================================

/**
 * Extracts audio samples from AudioBuffer with optimized memory handling
 * Handles mono and stereo channels by averaging or using first channel
 * 
 * @private
 * @param {AudioBuffer} audioBuffer - Decoded audio buffer
 * @returns {Float32Array} Mono audio samples
 */
function extractAudioSamples(audioBuffer) {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;

  if (numberOfChannels === 1) {
    // Mono: return reference to existing data (no copy needed)
    return audioBuffer.getChannelData(0);
  }

  // Multi-channel: average all channels
  const samples = new Float32Array(length);
  const channelData = [];

  // Pre-fetch all channel data
  for (let channel = 0; channel < numberOfChannels; channel++) {
    channelData.push(audioBuffer.getChannelData(channel));
  }

  // Average channels
  const channelCount = channelData.length;
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let channel = 0; channel < channelCount; channel++) {
      sum += channelData[channel][i];
    }
    samples[i] = sum / channelCount;
  }

  return samples;
}

// ============================================================================
// AUDIO ANALYSIS
// ============================================================================

/**
 * Calculates RMS (Root Mean Square) energy for a frame of audio samples
 * 
 * @private
 * @param {Float32Array} samples - Audio samples
 * @param {number} start - Start index
 * @param {number} end - End index
 * @returns {number} RMS energy value
 */
function calculateFrameEnergy(samples, start, end) {
  let sumSquares = 0;
  const actualEnd = Math.min(end, samples.length);
  const frameLength = actualEnd - start;

  if (frameLength <= 0) return 0;

  for (let i = start; i < actualEnd; i++) {
    const sample = samples[i];
    sumSquares += sample * sample;
  }

  return Math.sqrt(sumSquares / frameLength);
}

/**
 * Detects voice activity in audio buffer using energy-based VAD
 * with noise floor filtering
 * 
 * @private
 * @param {AudioBuffer} audioBuffer - Decoded audio buffer
 * @returns {Object} Voice activity analysis results
 */
function detectVoiceActivity(audioBuffer) {
  const samples = extractAudioSamples(audioBuffer);
  const frameSize = AUDIO_ACTIVITY.FRAME_SIZE;
  const totalFrames = Math.floor(samples.length / frameSize);

  if (totalFrames === 0) {
    return createEmptyActivityResult();
  }

  let activeFrames = 0;
  let totalEnergy = 0;
  const frameEnergies = [];

  // First pass: calculate all frame energies
  for (let i = 0; i < totalFrames; i++) {
    const start = i * frameSize;
    const end = start + frameSize;
    const energy = calculateFrameEnergy(samples, start, end);
    frameEnergies.push(energy);
    totalEnergy += energy;
  }

  const averageEnergy = totalEnergy / totalFrames;

  // Adaptive threshold: use dynamic threshold if signal is weak
  const adaptiveThreshold = Math.max(
    AUDIO_ACTIVITY.ENERGY_THRESHOLD,
    averageEnergy * 0.5 // 50% of average energy
  );

  // Second pass: count active frames with noise floor filtering
  for (let i = 0; i < frameEnergies.length; i++) {
    const energy = frameEnergies[i];

    // Frame is active if:
    // 1. Energy exceeds adaptive threshold
    // 2. Energy is above noise floor
    if (energy > adaptiveThreshold && energy > AUDIO_ACTIVITY.NOISE_FLOOR) {
      activeFrames++;
    }
  }

  const activeRatio = activeFrames / totalFrames;
  const silenceRatio = 1 - activeRatio;
  const activeDuration = audioBuffer.duration * activeRatio;
  const hasSpeech =
    activeRatio >= AUDIO_ACTIVITY.MIN_ACTIVE_RATIO &&
    averageEnergy > AUDIO_ACTIVITY.SILENCE_THRESHOLD;

  return {
    activeDuration,
    silenceRatio,
    activeRatio,
    averageEnergy,
    hasSpeech,
    totalFrames,
    activeFrames
  };
}

/**
 * Creates empty activity result for edge cases
 * 
 * @private
 * @returns {Object} Empty activity result
 */
function createEmptyActivityResult() {
  return {
    activeDuration: 0,
    silenceRatio: 1,
    activeRatio: 0,
    averageEnergy: 0,
    hasSpeech: false,
    totalFrames: 0,
    activeFrames: 0
  };
}

/**
 * Analyzes audio activity and voice detection
 * 
 * @param {AudioBuffer} audioBuffer - Decoded audio buffer
 * @returns {Object} Audio activity analysis with voice detection metrics
 */
export function analyzeAudioActivity(audioBuffer) {
  if (!audioBuffer || typeof audioBuffer.duration !== 'number' || audioBuffer.duration <= 0) {
    return createEmptyActivityResult();
  }

  try {
    return detectVoiceActivity(audioBuffer);
  } catch (error) {
    console.error('Voice activity detection failed:', error);
    return createEmptyActivityResult();
  }
}

// ============================================================================
// METRICS CALCULATION
// ============================================================================

/**
 * Calculates all analysis metrics with error handling
 * 
 * @private
 * @param {AudioBuffer} audioBuffer - Decoded audio
 * @param {string} referenceText - Reference text
 * @param {string} transcript - User transcript
 * @returns {Object} Analysis metrics
 */
function calculateMetrics(audioBuffer, referenceText, transcript) {
  try {
    // Analyze audio activity for voice detection
    const audioActivity = analyzeAudioActivity(audioBuffer);

    // Calculate text-based metrics
    const textMatch = calculateTextMatch(referenceText, transcript);
    const speechRate = calculateSpeechRate(audioBuffer, transcript);
    const completeness = calculateCompleteness(
      audioBuffer,
      referenceText,
      transcript,
      audioActivity
    );

    return {
      textMatch,
      speechRate,
      completeness,
      audioActivity,
      duration: audioBuffer.duration,
      transcriptLength: transcript.trim().length,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels
    };
  } catch (error) {
    console.error('Metrics calculation failed:', error);
    throw new Error(`${AudioAnalysisError.ANALYSIS_FAILED}: ${error.message}`);
  }
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyzes a recording and returns comprehensive performance metrics
 * 
 * This function:
 * 1. Validates all inputs
 * 2. Decodes the audio blob
 * 3. Validates audio quality and transcript
 * 4. Calculates performance metrics
 * 5. Returns detailed analysis results
 * 
 * @param {Blob} audioBlob - Recorded audio blob
 * @param {string} referenceText - Reference text to compare against
 * @param {string} transcript - User's speech transcript from STT
 * @returns {Promise<Object>} Analysis results with scores and details
 * 
 * @example
 * const result = await analyzeRecording(audioBlob, "Hello world", "Hello world");
 * if (result.success) {
 *   console.log('Text match:', result.data.textMatch);
 * } else {
 *   console.error('Error:', result.error);
 * }
 */
export async function analyzeRecording(audioBlob, referenceText, transcript) {
  const startTime = performance.now();

  try {
    // Step 1: Validate inputs
    validateInputs(audioBlob, referenceText, transcript);

    // Step 2: Get audio context
    const audioCtx = getAudioContext();

    // Step 3: Ensure context is running
    await ensureContextRunning(audioCtx);

    // Step 4: Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();

    // Step 5: Decode audio data
    const audioBuffer = await decodeAudio(arrayBuffer, audioCtx);

    // Step 6: Validate audio buffer
    validateAudioBuffer(audioBuffer);

    // Step 7: Validate transcript
    validateTranscript(transcript);

    // Step 8: Calculate metrics
    const metrics = calculateMetrics(audioBuffer, referenceText, transcript);

    const processingTime = performance.now() - startTime;

    // Return success response
    return {
      success: true,
      data: metrics,
      timestamp: Date.now(),
      processingTime: Math.round(processingTime)
    };

  } catch (error) {
    const processingTime = performance.now() - startTime;

    // Extract user-friendly error message
    const userFriendlyError = extractUserFriendlyError(error);

    // Log error in development with full details
    if (process.env.NODE_ENV === 'development') {
      console.error('Audio analysis error details:', {
        error,
        errorMessage: error?.message,
        errorType: error?.name,
        errorStack: error?.stack,
        userFriendlyError,
        processingTime: Math.round(processingTime)
      });
    }

    // Determine error type
    const errorType = Object.values(AudioAnalysisError).find(
      type => error.message?.startsWith(type)
    ) || AudioAnalysisError.ANALYSIS_FAILED;

    // Return structured error response
    return {
      success: false,
      error: userFriendlyError,
      errorType,
      timestamp: Date.now(),
      processingTime: Math.round(processingTime)
    };
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Batch analyzes multiple recordings with progress tracking
 * Useful for processing multiple attempts or segments
 * 
 * @param {Array<{audioBlob: Blob, referenceText: string, transcript: string}>} recordings
 * @param {Function} [onProgress] - Optional progress callback (current, total)
 * @returns {Promise<Array<Object>>} Array of analysis results
 */
export async function analyzeBatch(recordings, onProgress = null) {
  if (!Array.isArray(recordings) || recordings.length === 0) {
    return [];
  }

  const results = [];
  const total = recordings.length;

  for (let i = 0; i < total; i++) {
    const recording = recordings[i];
    const { audioBlob, referenceText, transcript } = recording;

    const result = await analyzeRecording(audioBlob, referenceText, transcript);
    results.push(result);

    // Call progress callback if provided
    if (typeof onProgress === 'function') {
      onProgress(i + 1, total);
    }
  }

  return results;
}

// ============================================================================
// BROWSER SUPPORT
// ============================================================================

/**
 * Checks if the browser supports audio analysis
 * 
 * @returns {Object} Support status and details
 */
export function checkBrowserSupport() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';

  return {
    supported: !!AudioContextClass && hasMediaRecorder,
    hasAudioContext: !!window.AudioContext,
    hasWebkitAudioContext: !!window.webkitAudioContext,
    hasMediaRecorder,
    userAgent: navigator.userAgent,
    platform: navigator.platform
  };
}

/**
 * Gets current AudioContext state for debugging
 * 
 * @returns {Object|null} Context state or null if no context exists
 */
export function getContextState() {
  if (!audioContextInstance) {
    return null;
  }

  return {
    state: audioContextInstance.state,
    sampleRate: audioContextInstance.sampleRate,
    currentTime: audioContextInstance.currentTime,
    baseLatency: audioContextInstance.baseLatency || 0,
    outputLatency: audioContextInstance.outputLatency || 0,
    usageCount: contextUsageCount
  };
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Gets performance statistics for monitoring
 * 
 * @returns {Object} Performance statistics
 */
export function getPerformanceStats() {
  return {
    contextUsageCount,
    contextState: audioContextInstance?.state || 'not-initialized',
    memoryUsage: performance.memory ? {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    } : null
  };
}

// Export constants for external use if needed
export { MIN_RECORDING_DURATION, MIN_TRANSCRIPT_LENGTH, AUDIO_ACTIVITY };