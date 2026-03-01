import { useState, useEffect, useRef, useCallback } from 'react';

const INITIAL_LEVELS = Array(10).fill(0.15);
const FRAME_INTERVAL = 1000 / 30; // 30fps for smooth visuals with less CPU
const FFT_SIZE = 256;
const SMOOTHING_TIME_CONSTANT = 0.7;
const FREQUENCY_BANDS = 10;
const MIN_LEVEL = 0.15;
const AMPLIFICATION_FACTOR = 2.5;

/**
 * Custom hook for live audio visualization
 * Uses Web Audio API to analyze microphone input and provide audio levels
 * Throttled to 30fps to reduce re-renders
 * 
 * @param {boolean} isRecording - Whether recording is active
 * @param {boolean} isPaused - Whether recording is paused
 * @param {MediaStream|null} mediaStream - The media stream from getUserMedia
 * @returns {Array<number>} Array of 10 audio levels (0-1)
 */
export const useAudioVisualizer = (isRecording, isPaused, mediaStream) => {
  const [audioLevels, setAudioLevels] = useState(INITIAL_LEVELS);

  // Persistent refs for audio processing
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const dataArrayRef = useRef(null);
  const levelsArrayRef = useRef(new Array(FREQUENCY_BANDS));

  // Animation and timing refs
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const isActiveRef = useRef(false);

  /**
   * Initialize or resume AudioContext
   * @returns {AudioContext|null} The audio context or null if unavailable
   */
  const initializeAudioContext = useCallback(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      console.warn('Web Audio API not supported in this browser');
      return null;
    }

    // Reuse existing context if available and not closed
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContextClass();
    }

    // Resume context if suspended (happens on some browsers after page interactions)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch((err) => {
        console.warn('Failed to resume audio context:', err);
      });
    }

    return audioContextRef.current;
  }, []);

  /**
   * Initialize or retrieve the AnalyserNode
   * @param {AudioContext} audioContext - The audio context
   * @returns {AnalyserNode} The analyser node
   */
  const initializeAnalyser = useCallback((audioContext) => {
    if (!analyserRef.current) {
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = FFT_SIZE;
      analyserRef.current.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;

      // Initialize data array once
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
    }

    return analyserRef.current;
  }, []);

  /**
   * Disconnect and clean up the previous audio source
   */
  const disconnectSource = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (err) {
        // Source may already be disconnected, ignore error
      }
      sourceRef.current = null;
    }
  }, []);

  /**
   * Connect media stream to analyser
   * @param {AudioContext} audioContext - The audio context
   * @param {AnalyserNode} analyser - The analyser node
   * @param {MediaStream} stream - The media stream to analyze
   */
  const connectMediaStream = useCallback((audioContext, analyser, stream) => {
    disconnectSource();

    try {
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;
    } catch (err) {
      console.error('Failed to connect media stream:', err);
      throw err;
    }
  }, [disconnectSource]);

  /**
   * Calculate audio levels from frequency data
   * @param {Uint8Array} dataArray - The frequency data
   * @param {Array<number>} levelsArray - The output levels array (mutated)
   */
  const calculateLevels = useCallback((dataArray, levelsArray) => {
    const dataLength = dataArray.length;
    const step = dataLength / FREQUENCY_BANDS;

    for (let i = 0; i < FREQUENCY_BANDS; i++) {
      const index = Math.floor(i * step);
      const normalizedValue = dataArray[index] / 255;
      // Apply amplification and ensure minimum/maximum bounds
      const amplifiedValue = normalizedValue * AMPLIFICATION_FACTOR;
      levelsArray[i] = Math.max(MIN_LEVEL, Math.min(1, amplifiedValue));
    }
  }, []);

  /**
   * Main animation loop for updating audio levels
   */
  const updateLevels = useCallback(() => {
    if (!isActiveRef.current || !analyserRef.current || !dataArrayRef.current) {
      return;
    }

    const now = performance.now();

    // Throttle to target frame rate
    if (now - lastUpdateTimeRef.current < FRAME_INTERVAL) {
      animationFrameRef.current = requestAnimationFrame(updateLevels);
      return;
    }

    lastUpdateTimeRef.current = now;

    // Get current frequency data
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // Calculate levels (reuse array for performance)
    const levelsArray = levelsArrayRef.current;
    calculateLevels(dataArrayRef.current, levelsArray);

    // Create new array for React state update (immutability)
    setAudioLevels([...levelsArray]);

    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(updateLevels);
  }, [calculateLevels]);

  /**
   * Stop the animation loop
   */
  const stopAnimation = useCallback(() => {
    isActiveRef.current = false;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  /**
   * Start the animation loop
   */
  const startAnimation = useCallback(() => {
    if (isActiveRef.current) {
      return; // Already running
    }

    isActiveRef.current = true;
    lastUpdateTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(updateLevels);
  }, [updateLevels]);

  // Main effect: Handle recording state changes
  useEffect(() => {
    // Reset to initial state if not recording
    if (!isRecording) {
      stopAnimation();
      disconnectSource();
      setAudioLevels(INITIAL_LEVELS);
      return;
    }

    // Pause animation if paused
    if (isPaused) {
      stopAnimation();
      return;
    }

    // Need media stream to proceed
    if (!mediaStream) {
      return;
    }

    // Setup audio visualization
    try {
      const audioContext = initializeAudioContext();
      if (!audioContext) {
        return;
      }

      const analyser = initializeAnalyser(audioContext);
      connectMediaStream(audioContext, analyser, mediaStream);
      startAnimation();

      // Cleanup function
      return () => {
        stopAnimation();
        disconnectSource();
      };
    } catch (err) {
      console.error('Failed to setup audio visualization:', err);
      // Continue without visualization if setup fails
    }
  }, [
    isRecording,
    isPaused,
    mediaStream,
    initializeAudioContext,
    initializeAnalyser,
    connectMediaStream,
    startAnimation,
    stopAnimation,
    disconnectSource
  ]);

  // Cleanup effect: Handle component unmount
  useEffect(() => {
    return () => {
      stopAnimation();
      disconnectSource();

      // Close audio context on unmount
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch((err) => {
          console.warn('Failed to close audio context:', err);
        });
      }

      // Clear all refs
      analyserRef.current = null;
      audioContextRef.current = null;
      dataArrayRef.current = null;
    };
  }, [stopAnimation, disconnectSource]);

  return audioLevels;
};