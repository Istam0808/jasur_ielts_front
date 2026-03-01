import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpeaking } from '../contexts/SpeakingContext';
import logger from '../../../../../../../../utils/logger';

/**
 * Mobile device detection utility with memoization
 */
const detectMobileDevice = (() => {
  let cachedResult = null;

  return () => {
    if (cachedResult !== null) return cachedResult;
    if (typeof window === 'undefined') return false;

    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;

    cachedResult = isMobileUA || (isTouchDevice && isSmallScreen);
    return cachedResult;
  };
})();

/**
 * Get optimized MediaRecorder configuration based on device capabilities
 */
const getOptimizedAudioConfig = () => {
  const isMobile = detectMobileDevice();

  const baseConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  return {
    isMobile,
    audioConstraints: {
      ...baseConstraints,
      sampleRate: isMobile ? 16000 : 44100,
      channelCount: 1,
    },
    // Order by browser/device support probability
    mimeTypes: isMobile
      ? ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/wav']
      : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/wav'],
    audioBitsPerSecond: isMobile ? 64000 : 128000,
    timeslice: isMobile ? 1000 : 100,
  };
};

/**
 * Find the first supported MIME type from a list
 */
const getSupportedMimeType = (mimeTypes) => {
  for (const type of mimeTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return null;
};

/**
 * Custom hook for recording speaking exam sessions with enhanced audio capture.
 * 
 * Features:
 * - Captures microphone input (user's voice)
 * - Attempts to capture system audio (desktop audio) for TTS questions
 * - Mixes both audio streams using Web Audio API
 * - Falls back to microphone-only if system audio capture fails
 * - Mobile-optimized settings for compatibility and performance
 * - Real-time audio level monitoring
 * - Robust error handling with user-friendly messages
 * 
 * The systemAudioEnabled state indicates whether TTS audio will be recorded.
 */
const useSessionRecording = () => {
  const { actions } = useSpeaking();

  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(false);

  // Refs for stable references and cleanup
  const actionsRef = useRef({ startRecording: null, stopRecording: null, setAudioBlob: null });
  const mediaRecorderRef = useRef(null);
  const micStreamRef = useRef(null);
  const systemStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const recordingDurationRef = useRef(0);
  const isCleaningUpRef = useRef(false);

  // Sync actions from context
  useEffect(() => {
    if (actions) {
      actionsRef.current = {
        startRecording: actions.startRecording,
        stopRecording: actions.stopRecording,
        setAudioBlob: actions.setAudioBlob,
      };
    }
  }, [actions]);

  /**
   * Set up real-time audio level monitoring
   */
  const setupAudioLevelMonitoring = useCallback((stream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        if (!analyserRef.current || isCleaningUpRef.current) return;

        analyser.getByteFrequencyData(dataArray);

        // Calculate RMS (root mean square) for more accurate level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        setAudioLevel(rms / 255); // Normalize to 0-1

        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
      logger.info('Audio level monitoring initialized');
    } catch (err) {
      logger.warn('Audio level monitoring setup failed:', err);
    }
  }, []);

  /**
   * Clean up all resources (streams, contexts, intervals)
   */
  const cleanupResources = useCallback(() => {
    isCleaningUpRef.current = true;

    // Stop MediaRecorder
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (err) {
        logger.warn('Error stopping MediaRecorder:', err);
      }
      mediaRecorderRef.current = null;
    }

    // Stop microphone stream
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => {
        track.stop();
        logger.debug('Stopped microphone track');
      });
      micStreamRef.current = null;
    }

    // Stop system audio stream
    if (systemStreamRef.current) {
      systemStreamRef.current.getTracks().forEach(track => {
        track.stop();
        logger.debug('Stopped system audio track');
      });
      systemStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
        logger.debug('Closed audio context');
      } catch (err) {
        logger.warn('Error closing audio context:', err);
      }
      audioContextRef.current = null;
      analyserRef.current = null;
    }

    // Clear intervals and animation frames
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setAudioLevel(0);
    isCleaningUpRef.current = false;
  }, []);

  /**
   * Attempt to capture system audio (for TTS questions)
   */
  const captureSystemAudio = async (config) => {
    try {
      const systemStream = await navigator.mediaDevices.getDisplayMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: config.audioConstraints.sampleRate,
          channelCount: config.audioConstraints.channelCount,
        },
        video: false,
      });

      // Verify we actually got an audio track
      const audioTracks = systemStream.getAudioTracks();
      if (audioTracks.length === 0) {
        systemStream.getTracks().forEach(track => track.stop());
        throw new Error('No audio track in system stream');
      }

      logger.info('System audio capture enabled - TTS audio will be recorded');
      setSystemAudioEnabled(true);
      return systemStream;
    } catch (err) {
      if (err.name === 'NotSupportedError') {
        logger.info('System audio capture not supported in this browser');
      } else if (err.name === 'NotAllowedError') {
        logger.info('System audio capture denied by user');
      } else {
        logger.warn('System audio capture failed:', err);
      }
      setSystemAudioEnabled(false);
      return null;
    }
  };

  /**
   * Mix microphone and system audio streams
   */
  const mixAudioStreams = (micStream, systemStream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const destination = audioContext.createMediaStreamDestination();

      const micSource = audioContext.createMediaStreamSource(micStream);
      const systemSource = audioContext.createMediaStreamSource(systemStream);

      // Create gain nodes for volume control
      const micGain = audioContext.createGain();
      const systemGain = audioContext.createGain();

      micGain.gain.value = 1.0;
      systemGain.gain.value = 0.8; // Slightly lower system audio to prioritize voice

      micSource.connect(micGain).connect(destination);
      systemSource.connect(systemGain).connect(destination);

      logger.info('Successfully mixed microphone and system audio streams');
      return { mixedStream: destination.stream, audioContext };
    } catch (err) {
      logger.error('Failed to mix audio streams:', err);
      throw err;
    }
  };

  /**
   * Get user-friendly error message based on error type
   */
  const getErrorMessage = (err) => {
    const errorMessages = {
      NotAllowedError: 'Microphone access denied. Please allow microphone access in your browser settings.',
      NotFoundError: 'No microphone found. Please connect a microphone and try again.',
      NotReadableError: 'Microphone is already in use. Please close other apps using the microphone.',
      OverconstrainedError: 'Microphone constraints not supported. Trying with basic settings...',
      AbortError: 'Recording was aborted. Please try again.',
      NotSupportedError: 'Audio recording is not supported in this browser.',
    };

    return errorMessages[err.name] || `Recording error: ${err.message}`;
  };

  /**
   * Start recording with comprehensive error handling
   */
  const startRecording = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      audioChunksRef.current = [];

      const config = getOptimizedAudioConfig();

      // 1. Get microphone stream
      let micStream;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: config.audioConstraints
        });
      } catch (err) {
        logger.warn('Advanced constraints failed, trying basic constraints:', err);
        // Fallback to minimal constraints
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          }
        });
      }

      micStreamRef.current = micStream;

      // 2. Attempt to capture system audio
      const systemStream = await captureSystemAudio(config);
      systemStreamRef.current = systemStream;

      // 3. Create final stream (mixed or mic-only)
      let finalStream = micStream;
      let mixAudioContext = null;

      if (systemStream) {
        try {
          const { mixedStream, audioContext } = mixAudioStreams(micStream, systemStream);
          finalStream = mixedStream;
          mixAudioContext = audioContext;
          audioContextRef.current = audioContext;
        } catch (mixErr) {
          logger.warn('Stream mixing failed, using microphone only:', mixErr);
          if (mixAudioContext && mixAudioContext.state !== 'closed') {
            try {
              mixAudioContext.close();
            } catch (closeErr) {
              logger.warn('Error closing mix audio context:', closeErr);
            }
          }
          finalStream = micStream;
        }
      }

      // Validate final stream
      if (!finalStream || finalStream.getTracks().length === 0) {
        throw new Error('No valid audio stream available');
      }

      // 4. Set up MediaRecorder
      const mimeType = getSupportedMimeType(config.mimeTypes);
      if (!mimeType) {
        throw new Error('No supported audio format found for this device');
      }

      logger.info(`Using MIME type: ${mimeType}`);

      const mediaRecorder = new MediaRecorder(finalStream, {
        mimeType,
        audioBitsPerSecond: config.audioBitsPerSecond,
      });

      mediaRecorderRef.current = mediaRecorder;

      // 5. Set up MediaRecorder event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          logger.debug(`Audio chunk received: ${event.data.size} bytes`);
        } else {
          logger.warn('Received empty audio chunk');
        }
      };

      mediaRecorder.onstop = () => {
        try {
          if (audioChunksRef.current.length === 0) {
            throw new Error('No audio data recorded');
          }

          const blob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType || mimeType
          });

          if (!blob || blob.size === 0) {
            throw new Error('Failed to create audio blob - empty or invalid');
          }

          logger.info(`Recording completed: ${blob.size} bytes, ${recordingDurationRef.current}s`);
          setAudioBlob(blob);

          // Update context
          if (actionsRef.current.setAudioBlob) {
            actionsRef.current.setAudioBlob(blob, recordingDurationRef.current);
          }
        } catch (blobError) {
          logger.error('Blob creation failed:', blobError);
          setError(`Failed to create audio recording: ${blobError.message}`);
        } finally {
          setIsRecording(false);
          setIsLoading(false);
        }
      };

      mediaRecorder.onerror = (event) => {
        logger.error('MediaRecorder error:', event);
        setError(`Recording error: ${event.error?.message || 'Unknown error'}`);
        setIsRecording(false);
        setIsLoading(false);
      };

      // 6. Set up audio level monitoring (use mic stream for monitoring)
      setupAudioLevelMonitoring(micStream);

      // 7. Start recording
      mediaRecorder.start(config.timeslice);
      setIsRecording(true);
      setIsLoading(false);
      startTimeRef.current = Date.now();
      recordingDurationRef.current = 0;

      // Update context
      if (actionsRef.current.startRecording) {
        actionsRef.current.startRecording();
      }

      // 8. Start duration timer
      durationIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setRecordingDuration(duration);
          recordingDurationRef.current = duration;
        }
      }, 1000);

      logger.info('Recording started successfully');

    } catch (err) {
      logger.error('Error starting recording:', err);

      // Clean up on error
      cleanupResources();

      setIsLoading(false);
      setIsRecording(false);
      setError(getErrorMessage(err));
    }
  }, [setupAudioLevelMonitoring, cleanupResources]);

  /**
   * Stop recording and clean up resources
   */
  const stopRecording = useCallback(() => {
    try {
      logger.info('Stopping recording...');

      // Stop MediaRecorder first to trigger onstop event
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // Clean up resources (will be called after onstop)
      setTimeout(() => cleanupResources(), 100);

      // Update context
      if (actionsRef.current.stopRecording) {
        actionsRef.current.stopRecording();
      }

    } catch (err) {
      logger.error('Error stopping recording:', err);
      setError(`Failed to stop recording: ${err.message}`);
      cleanupResources();
    }
  }, [cleanupResources]);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      logger.info('Recording paused');
    }
  }, []);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      logger.info('Recording resumed');
    }
  }, []);

  /**
   * Format duration as MM:SS
   */
  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Download the recorded audio
   * iOS Safari doesn't support the download attribute, so we open in new window
   */
  const downloadRecording = useCallback((filename = 'speaking-practice') => {
    if (!audioBlob) {
      logger.warn('No audio blob available for download');
      return;
    }

    try {
      const url = URL.createObjectURL(audioBlob);
      const extension = audioBlob.type.includes('webm') ? 'webm' :
        audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

      // Detect iOS devices
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;

      if (isIOS) {
        // iOS Safari doesn't support the download attribute
        // Open in new window/tab so user can use share menu to save
        const newWindow = window.open(url, '_blank');
        
        // Cleanup after a delay (longer for iOS since user needs time to interact)
        setTimeout(() => {
          // Only revoke if window was closed or after longer delay
          if (!newWindow || newWindow.closed) {
            URL.revokeObjectURL(url);
          } else {
            // Give user more time to interact with the share menu
            setTimeout(() => URL.revokeObjectURL(url), 5000);
          }
        }, 1000);

        logger.info('Recording opened in new window for iOS device');
      } else {
        // Standard download approach for non-iOS devices
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}-${timestamp}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the URL after a short delay
        setTimeout(() => URL.revokeObjectURL(url), 100);

        logger.info('Recording downloaded successfully');
      }
    } catch (err) {
      logger.error('Error downloading recording:', err);
      setError('Failed to download recording');
    }
  }, [audioBlob]);

  /**
   * Check if recording is supported
   */
  const isSupported = useCallback(() => {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    );
  }, []);

  /**
   * Get recording guidance and status
   */
  const getRecordingGuidance = useCallback(() => {
    if (systemAudioEnabled) {
      return {
        status: 'complete',
        message: 'Complete audio recording enabled - both your voice and question audio will be captured',
        icon: '✅',
      };
    }

    return {
      status: 'partial',
      message: 'Microphone-only recording - question audio may not be captured when using headphones',
      icon: '⚠️',
      suggestions: [
        'Use speakers instead of headphones for complete recording',
        'Use Chrome or Edge browser with HTTPS for system audio capture',
        'Allow screen sharing permissions when prompted',
      ],
    };
  }, [systemAudioEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      logger.debug('Component unmounting, cleaning up resources');
      cleanupResources();
    };
  }, [cleanupResources]);

  return {
    // Core recording functions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,

    // State
    isRecording,
    isLoading,
    error,
    audioBlob,
    recordingDuration,
    audioLevel,
    systemAudioEnabled,

    // Helper functions
    recordingGuidance: getRecordingGuidance(),
    formatDuration,
    downloadRecording,
    isSupported,
  };
};

export { useSessionRecording };