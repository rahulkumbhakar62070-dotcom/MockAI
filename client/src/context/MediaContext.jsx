import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { categorizeMediaError } from '../hooks/useMediaDevices';

const MediaContext = createContext(null);

export function MediaProvider({ children }) {
  const [stream, setStream] = useState(null);

  // Device status states: 'idle' | 'requesting' | 'active' | 'disabled' | 'muted' | 'denied' | 'not_found' | 'in_use' | 'error'
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [micStatus, setMicStatus] = useState('idle');

  // Track state flags
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);

  // Labels and diagnostics
  const [deviceLabels, setDeviceLabels] = useState({ video: '', audio: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 for live volume meter

  // Internal references
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Check browser capability
  const isSupported = typeof window !== 'undefined' && Boolean(
    navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'
  );

  const isSecureOrigin = typeof window !== 'undefined' && (
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  /**
   * Safe cleanup of all active tracks and Web Audio nodes
   */
  const stopAllTracks = useCallback(() => {
    // 1. Cancel audio level animation frame
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // 2. Close Web Audio Context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    // 3. Stop all media tracks (turns off camera hardware indicator LED)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore already stopped tracks
        }
      });
      streamRef.current = null;
    }

    setStream(null);
    setAudioLevel(0);
    setCameraStatus('idle');
    setMicStatus('idle');
  }, []);

  /**
   * Starts Web Audio Analyser to calculate live voice input volume
   */
  const setupAudioMeter = useCallback((audioTrack) => {
    if (!audioTrack || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;

      const mediaStream = new MediaStream([audioTrack]);
      const source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      const pcmData = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(pcmData);

        let sum = 0;
        for (let i = 0; i < pcmData.length; i++) {
          sum += pcmData[i];
        }
        const avg = sum / pcmData.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch {
      // Audio analysis failure is non-fatal
    }
  }, []);

  /**
   * Explicitly requests userMedia stream on candidate button click
   */
  const startSetup = useCallback(async () => {
    if (!isSupported) {
      setErrorMessage('Your browser does not support camera and microphone access. Please use Chrome, Firefox, or Edge.');
      setCameraStatus('error');
      setMicStatus('error');
      return;
    }

    // If an active stream with enabled tracks already exists, reuse it!
    if (streamRef.current && streamRef.current.active) {
      const vTrack = streamRef.current.getVideoTracks()[0];
      const aTrack = streamRef.current.getAudioTracks()[0];
      if (vTrack && vTrack.readyState === 'live') {
        setStream(streamRef.current);
        setCameraStatus(vTrack.enabled ? 'active' : 'disabled');
        setIsCameraEnabled(vTrack.enabled);
        if (aTrack && aTrack.readyState === 'live') {
          setMicStatus(aTrack.enabled ? 'active' : 'muted');
          setIsMicMuted(!aTrack.enabled);
          if (!audioContextRef.current) setupAudioMeter(aTrack);
        }
        return streamRef.current;
      }
    }

    // Stop any existing dead stream before creating a new one
    stopAllTracks();

    setErrorMessage('');
    setCameraStatus('requesting');
    setMicStatus('requesting');

    let newStream = null;

    try {
      newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (primaryErr) {
      console.warn('Initial combined getUserMedia failed, attempting fallback:', primaryErr.name);

      try {
        newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setMicStatus('not_found');
      } catch {
        try {
          newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setCameraStatus('not_found');
        } catch {
          const categorized = categorizeMediaError(primaryErr);
          setErrorMessage(categorized.message);
          setCameraStatus(categorized.code);
          setMicStatus(categorized.code);
          return null;
        }
      }
    }

    if (!newStream) return null;

    streamRef.current = newStream;
    setStream(newStream);

    const videoTrack = newStream.getVideoTracks()[0];
    const audioTrack = newStream.getAudioTracks()[0];

    if (videoTrack) {
      setCameraStatus(videoTrack.enabled ? 'active' : 'disabled');
      setIsCameraEnabled(videoTrack.enabled);
    } else {
      setCameraStatus('not_found');
    }

    if (audioTrack) {
      setMicStatus(audioTrack.enabled ? 'active' : 'muted');
      setIsMicMuted(!audioTrack.enabled);
      setupAudioMeter(audioTrack);
    } else {
      setMicStatus('not_found');
    }

    setDeviceLabels({
      video: videoTrack?.label || (videoTrack ? 'Integrated Web Camera' : 'No camera detected'),
      audio: audioTrack?.label || (audioTrack ? 'Default Microphone' : 'No microphone detected'),
    });

    return newStream;
  }, [isSupported, stopAllTracks, setupAudioMeter]);

  /**
   * Toggles camera track on or off
   */
  const toggleCamera = useCallback(() => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    const nextState = !videoTrack.enabled;
    videoTrack.enabled = nextState;
    setIsCameraEnabled(nextState);
    setCameraStatus(nextState ? 'active' : 'disabled');
  }, []);

  /**
   * Toggles microphone track mute or unmute
   */
  const toggleMic = useCallback(() => {
    if (!streamRef.current) return;
    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (!audioTrack) return;

    const nextMuted = audioTrack.enabled;
    audioTrack.enabled = !nextMuted;
    setIsMicMuted(nextMuted);
    setMicStatus(nextMuted ? 'muted' : 'active');

    if (nextMuted) {
      setAudioLevel(0);
    }
  }, []);

  // Clean up on window unload
  useEffect(() => {
    const handleUnload = () => {
      stopAllTracks();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      stopAllTracks();
    };
  }, [stopAllTracks]);

  const value = {
    stream,
    cameraStatus,
    micStatus,
    isCameraEnabled,
    isMicMuted,
    deviceLabels,
    errorMessage,
    audioLevel,
    isSupported,
    isSecureOrigin,
    startSetup,
    toggleCamera,
    toggleMic,
    stopAllTracks,
  };

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
}

export function useMediaContext() {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMediaContext must be used within a MediaProvider');
  }
  return context;
}

export default MediaContext;
