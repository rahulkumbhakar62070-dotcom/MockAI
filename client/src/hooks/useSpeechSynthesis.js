import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Custom Hook: useSpeechSynthesis
 * Encapsulates the browser Web SpeechSynthesis API (window.speechSynthesis / SpeechSynthesisUtterance).
 * Reads mock interview questions aloud using browser native voice synthesis.
 *
 * Features:
 * - Browser capability detection & graceful degradation
 * - Dynamic voice selection with asynchronous voiceschanged listener
 * - Controllable speaking rate (speed) and pitch
 * - Optional auto-play setting
 * - Clean interruption and cancel on question navigation or component unmount
 * - Never plays multiple utterances simultaneously
 */
export function useSpeechSynthesis({ onStart, onEnd, onError } = {}) {
  // Browser capability check
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [rate, setRate] = useState(1.0); // 0.8 to 1.4 sensible rate range
  const [pitch, setPitch] = useState(1.0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    isSupported ? '' : 'Speech synthesis is not supported by your browser.'
  );

  const utteranceRef = useRef(null);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onStartRef.current = onStart;
  }, [onStart]);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Load and populate available system voices (handles asynchronous voice list loading in Chrome/Edge)
  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const loadVoices = () => {
      try {
        const availableVoices = window.speechSynthesis.getVoices() || [];
        setVoices(availableVoices);

        // Find a sensible default English voice if not selected yet
        setSelectedVoice((prev) => {
          if (prev) return prev;
          if (availableVoices.length === 0) return null;

          // Priority: Natural English voice > Google US English > Microsoft voice > Default English > First available
          const preferred =
            availableVoices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Online'))) ||
            availableVoices.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
            availableVoices.find((v) => v.lang.startsWith('en') && v.name.includes('Microsoft')) ||
            availableVoices.find((v) => v.lang === 'en-US' || v.lang === 'en-GB') ||
            availableVoices.find((v) => v.lang.startsWith('en')) ||
            availableVoices[0];

          return preferred || null;
        });
      } catch (err) {
        console.warn('Failed to load system voices:', err);
      }
    };

    loadVoices();

    // In Chrome & Edge, voices are populated asynchronously via onvoiceschanged
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isSupported]);

  /**
   * Stop any ongoing speech playback safely
   */
  const stop = useCallback(() => {
    if (!isSupported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
  }, [isSupported]);

  /**
   * Speak a text string aloud using browser SpeechSynthesis
   */
  const speak = useCallback(
    (text) => {
      if (!isSupported) {
        const msg = 'Speech synthesis is not supported in this browser.';
        setErrorMessage(msg);
        if (onErrorRef.current) onErrorRef.current(msg);
        return;
      }

      if (!text || !text.trim()) return;

      // Cancel any ongoing voice to ensure multiple questions never play simultaneously
      stop();

      try {
        const utterance = new SpeechSynthesisUtterance(text.trim());
        utteranceRef.current = utterance;

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.rate = Math.max(0.7, Math.min(1.5, rate));
        utterance.pitch = Math.max(0.8, Math.min(1.3, pitch));
        utterance.lang = selectedVoice?.lang || 'en-US';

        utterance.onstart = () => {
          setIsSpeaking(true);
          setIsPaused(false);
          setErrorMessage('');
          if (onStartRef.current) onStartRef.current();
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          setIsPaused(false);
          utteranceRef.current = null;
          if (onEndRef.current) onEndRef.current();
        };

        utterance.onerror = (event) => {
          // If canceled intentionally, event.error is 'canceled' or 'interrupted'
          if (event.error === 'canceled' || event.error === 'interrupted') {
            setIsSpeaking(false);
            setIsPaused(false);
            return;
          }

          console.warn('SpeechSynthesis error:', event.error);
          setIsSpeaking(false);
          setIsPaused(false);
          utteranceRef.current = null;
          const msg = `Speech playback encountered an issue: ${event.error || 'unknown'}.`;
          setErrorMessage(msg);
          if (onErrorRef.current) onErrorRef.current(msg);
        };

        utterance.onpause = () => {
          setIsPaused(true);
        };

        utterance.onresume = () => {
          setIsPaused(false);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        setIsSpeaking(false);
        setIsPaused(false);
        const msg = err.message || 'Failed to initiate voice playback.';
        setErrorMessage(msg);
        if (onErrorRef.current) onErrorRef.current(msg);
      }
    },
    [isSupported, selectedVoice, rate, pitch, stop]
  );

  /**
   * Pause playback
   */
  const pause = useCallback(() => {
    if (!isSupported) return;
    try {
      window.speechSynthesis.pause();
      setIsPaused(true);
    } catch {
      // ignore
    }
  }, [isSupported]);

  /**
   * Resume paused playback
   */
  const resume = useCallback(() => {
    if (!isSupported) return;
    try {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } catch {
      // ignore
    }
  }, [isSupported]);

  // Clean up all speech playback on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [isSupported]);

  return {
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    selectedVoice,
    rate,
    pitch,
    autoPlay,
    errorMessage,
    speak,
    stop,
    pause,
    resume,
    setSelectedVoice,
    setRate,
    setPitch,
    setAutoPlay,
  };
}

export default useSpeechSynthesis;
