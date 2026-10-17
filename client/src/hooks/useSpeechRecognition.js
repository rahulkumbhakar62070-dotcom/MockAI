import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Custom Hook: useSpeechRecognition
 * Encapsulates the browser Web Speech API (window.SpeechRecognition / window.webkitSpeechRecognition).
 * Converts live candidate speech into text without uploading audio or requiring third-party SDKs.
 *
 * Robust Error & Lifecycle Features:
 * - Browser support check & graceful degradation (fallback to manual typing)
 * - Safe concurrency guard: prevents multiple simultaneous starts
 * - Controlled restart with backoff: strictly prevents infinite restart loops on network errors
 * - Non-fatal pause handling: suppresses noisy toasts on candidate silence (no-speech)
 * - Safe lifecycle management: detaches listeners before aborting to prevent ghost callbacks
 * - AI Voice coordination: cancels speech synthesis before speech recognition starts
 */
export function useSpeechRecognition({ onFinalTranscript, onError } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Check Web Speech API capability in browser environment
  const isSupported = typeof window !== 'undefined' && Boolean(
    window.SpeechRecognition || window.webkitSpeechRecognition
  );

  const recognitionRef = useRef(null);
  const isExplicitlyStoppedRef = useRef(true);
  const isStartingRef = useRef(false);
  const isListeningRef = useRef(false);
  const unmountedRef = useRef(false);
  const restartTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const consecutiveSilenceCountRef = useRef(0);

  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const onErrorRef = useRef(onError);
  const initiateRecognitionRef = useRef(null);

  // Keep callback refs updated to avoid re-initializing recognition on callback identity changes
  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  /**
   * Helper: Maps Web Speech API error codes to user-friendly messages
   * Clearly informs the user that manual typing is always available as fallback.
   */
  const categorizeSpeechError = useCallback((errCode) => {
    switch (errCode) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Microphone permission was denied. Please allow microphone access in your browser address bar to use voice answering, or continue typing manually.';
      case 'audio-capture':
        return 'No microphone was detected on your device. Please ensure a microphone is connected, or continue typing manually.';
      case 'network': {
        const isOffline = typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine;
        if (isOffline) {
          return 'Network connection issue during speech recognition: Your device appears to be offline. The browser speech service requires an active internet connection. You can continue typing manually.';
        }
        return 'Network connection issue during speech recognition: The browser speech service could not be reached. This can happen due to network restrictions, proxy/firewall settings, or browser speech service limits. You can continue typing your answer manually.';
      }
      case 'no-speech':
        return 'No speech detected. Voice listening has paused. You can click Start Speaking to resume or type manually.';
      case 'language-not-supported':
        return 'The selected language is not supported by your browser speech recognition. You can continue typing manually.';
      case 'aborted':
        return ''; // Aborted usually happens when the user intentionally clicks stop or navigates
      default:
        return 'Speech recognition encountered a problem. Voice transcription is paused, but you can continue typing manually.';
    }
  }, []);

  /**
   * Helper: Safely tear down a recognition instance without leaking event callbacks
   */
  const cleanupRecognitionInstance = useCallback((rec) => {
    if (!rec) return;
    rec.onstart = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try {
      rec.abort();
    } catch {
      // ignore if already aborted/inactive
    }
  }, []);

  /**
   * Helper: Safely clean up current recognition ref and restart timers
   */
  const cleanupCurrentRecognition = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      cleanupRecognitionInstance(rec);
    }
  }, [cleanupRecognitionInstance]);

  /**
   * Internal worker: Instantiates and launches SpeechRecognition
   */
  const initiateRecognition = useCallback(() => {
    if (unmountedRef.current || isExplicitlyStoppedRef.current) {
      isStartingRef.current = false;
      return;
    }

    const SpeechRecognitionClass = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (!SpeechRecognitionClass) {
      isStartingRef.current = false;
      setIsInitializing(false);
      return;
    }

    // Clean up any existing instance before instantiating a new one
    cleanupCurrentRecognition();

    isStartingRef.current = true;
    setIsInitializing(true);

    try {
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Safe locale resolution
      const userLang = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
      recognition.lang = userLang;

      // Event: Audio / Recognition started successfully
      recognition.onstart = () => {
        if (unmountedRef.current) return;
        isStartingRef.current = false;
        isListeningRef.current = true;
        setIsListening(true);
        setIsInitializing(false);
        // Reset retry counter on successful connection to speech service
        retryCountRef.current = 0;
      };

      // Event: Real-time speech transcript results
      recognition.onresult = (event) => {
        if (unmountedRef.current) return;
        let currentInterim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';

          if (result.isFinal) {
            finalChunk += transcript;
          } else {
            currentInterim += transcript;
          }
        }

        // Deliver final chunk to consumer
        if (finalChunk.trim() && onFinalTranscriptRef.current) {
          onFinalTranscriptRef.current(finalChunk.trim());
          // Candidate spoke successfully: reset silence & retry tracking
          consecutiveSilenceCountRef.current = 0;
          retryCountRef.current = 0;
        }

        setInterimTranscript(currentInterim.trim());
      };

      // Event: Recognition error
      recognition.onerror = (event) => {
        if (unmountedRef.current) return;
        const errType = event.error;

        // Intentional abort or stop: suppress error
        if (errType === 'aborted' || isExplicitlyStoppedRef.current) {
          isStartingRef.current = false;
          isListeningRef.current = false;
          setIsListening(false);
          setIsInitializing(false);
          return;
        }

        // Handle silence timeout (no-speech) without noisy alerts or immediate failure
        if (errType === 'no-speech') {
          consecutiveSilenceCountRef.current += 1;
          // If candidate has been silent through multiple cycles (~20-25s), stop cleanly
          if (consecutiveSilenceCountRef.current >= 3) {
            isExplicitlyStoppedRef.current = true;
            isStartingRef.current = false;
            isListeningRef.current = false;
            setIsListening(false);
            setIsInitializing(false);
            const userMsg = categorizeSpeechError('no-speech');
            setErrorMessage(userMsg);
            if (onErrorRef.current) onErrorRef.current(userMsg);
          }
          // For initial pauses while thinking, let onend perform debounced restart
          return;
        }

        // Fatal errors: Stop immediately and NEVER restart in an infinite loop
        // (network, not-allowed, service-not-allowed, audio-capture, language-not-supported)
        isExplicitlyStoppedRef.current = true;
        isStartingRef.current = false;
        isListeningRef.current = false;
        setIsListening(false);
        setIsInitializing(false);
        retryCountRef.current = 0;

        const userMsg = categorizeSpeechError(errType);
        if (userMsg) {
          setErrorMessage(userMsg);
          if (onErrorRef.current) onErrorRef.current(userMsg);
        }
      };

      // Event: Recognition ended
      recognition.onend = () => {
        if (unmountedRef.current) return;
        setIsInitializing(false);
        setInterimTranscript('');

        // If user explicitly stopped, or fatal error occurred, halt completely
        if (isExplicitlyStoppedRef.current) {
          isStartingRef.current = false;
          isListeningRef.current = false;
          setIsListening(false);
          return;
        }

        // If continuous recognition was active and not explicitly stopped:
        // (e.g. Chrome's normal continuous cycle completion or single pause in speech)
        // Guard against infinite restarts with a strict retry limit and cooldown delay
        if (retryCountRef.current < 2 && consecutiveSilenceCountRef.current < 3) {
          retryCountRef.current += 1;
          // Debounce restart by 600ms to allow audio hardware & WebSockets to cleanly cycle
          restartTimeoutRef.current = setTimeout(() => {
            if (!isExplicitlyStoppedRef.current && !unmountedRef.current && initiateRecognitionRef.current) {
              initiateRecognitionRef.current();
            }
          }, 600);
        } else {
          // Reached retry limit - stop cleanly to prevent hammering
          isExplicitlyStoppedRef.current = true;
          isStartingRef.current = false;
          isListeningRef.current = false;
          setIsListening(false);
        }
      };

      recognition.start();
    } catch (err) {
      isStartingRef.current = false;
      isListeningRef.current = false;
      setIsInitializing(false);
      setIsListening(false);
      isExplicitlyStoppedRef.current = true;

      // Handle InvalidStateError cleanly without reporting network error
      const msg = err.name === 'InvalidStateError'
        ? 'Speech recognition is already initializing. Please wait a moment.'
        : (err.message || 'Failed to start speech recognition. You can continue typing manually.');
      setErrorMessage(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
    }
  }, [cleanupCurrentRecognition, categorizeSpeechError]);

  useEffect(() => {
    initiateRecognitionRef.current = initiateRecognition;
  }, [initiateRecognition]);

  /**
   * Start speech recognition safely
   */
  const startListening = useCallback(() => {
    if (!isSupported) {
      const msg = 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari, or type manually.';
      setErrorMessage(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
      return;
    }

    // Concurrency guard: Do not trigger if already listening or starting
    if (isStartingRef.current || isListeningRef.current) {
      return;
    }

    // Cancel active AI voice playback before starting speech recognition to avoid audio cross-talk
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    // Clear any pending restart timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    isExplicitlyStoppedRef.current = false;
    retryCountRef.current = 0;
    consecutiveSilenceCountRef.current = 0;
    setErrorMessage('');
    setInterimTranscript('');

    initiateRecognition();
  }, [isSupported, initiateRecognition]);

  /**
   * Stop speech recognition intentionally
   */
  const stopListening = useCallback(() => {
    isExplicitlyStoppedRef.current = true;
    isStartingRef.current = false;
    isListeningRef.current = false;
    retryCountRef.current = 0;
    consecutiveSilenceCountRef.current = 0;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      try {
        rec.stop();
      } catch {
        try {
          rec.abort();
        } catch {
          // ignore
        }
      }
    }

    setIsListening(false);
    setIsInitializing(false);
    setInterimTranscript('');
  }, []);

  /**
   * Reset / clear current error message
   */
  const clearError = useCallback(() => {
    setErrorMessage('');
  }, []);

  // Clean up recognition instance and pending timers on hook unmount
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      isExplicitlyStoppedRef.current = true;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      if (recognitionRef.current) {
        const rec = recognitionRef.current;
        recognitionRef.current = null;
        cleanupRecognitionInstance(rec);
      }
    };
  }, [cleanupRecognitionInstance]);

  return {
    isListening,
    isInitializing,
    isSupported,
    interimTranscript,
    errorMessage,
    startListening,
    stopListening,
    clearError,
  };
}

export default useSpeechRecognition;
