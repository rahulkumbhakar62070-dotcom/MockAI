import { useState, useRef, useEffect, useCallback, useContext } from 'react';
import MediaContext from '../context/MediaContext';

/**
 * Categorizes browser MediaDevices errors into user-friendly codes
 */
export const categorizeMediaError = (err) => {
  if (!err) return { code: 'unknown', message: 'An unknown hardware error occurred.' };

  const name = err.name || '';
  const msg = err.message || '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || msg.includes('Permission denied')) {
    return {
      code: 'denied',
      message: 'Permission denied. The browser blocked camera or microphone access. Please allow permissions in your address bar and click Retry.',
    };
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || msg.includes('Requested device not found')) {
    return {
      code: 'not_found',
      message: 'Hardware device not found. No camera or microphone was detected. Please connect an external webcam or headset.',
    };
  }

  if (name === 'NotReadableError' || name === 'TrackStartError' || msg.includes('Could not start video source')) {
    return {
      code: 'in_use',
      message: 'Device in use. Another application (such as Zoom, Teams, or another browser tab) is currently using your camera or microphone.',
    };
  }

  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return {
      code: 'overconstrained',
      message: 'The requested video resolution or audio settings are not supported by your hardware.',
    };
  }

  if (name === 'SecurityError') {
    return {
      code: 'security',
      message: 'Media access blocked due to an insecure context. Camera access requires HTTPS or localhost.',
    };
  }

  return {
    code: 'error',
    message: msg || 'Failed to acquire media stream from your device.',
  };
};

/**
 * Custom Hook: useMediaDevices
 * Manages local camera and microphone stream testing, user controls, volume analysis, and clean resource release.
 * NOTE: Strictly local; does NOT record, upload, or transmit any audio/video.
 */
export function useMediaDevices() {
  const context = useContext(MediaContext);
  const [stream, setStream] = useState(null);

  // Device status states: 'idle' | 'requesting' | 'active' | 'disabled' | 'muted' | 'denied' | 'not_found' | 'in_use' | 'error'
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [micStatus, setMicStatus] = useState('idle');

  // Track state flags
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);

  // Labels and feedback
  const [deviceLabels, setDeviceLabels] = useState({ video: '', audio: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 for live meter

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

        // Calculate average amplitude
        let sum = 0;
        for (let i = 0; i < pcmData.length; i++) {
          sum += pcmData[i];
        }
        const avg = sum / pcmData.length;
        // Normalize 0 - 255 to percentage 0 - 100
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch {
      // Audio analysis failure is non-fatal to video/audio stream
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

    // Stop any existing stream before creating a new one (prevents duplicate streams)
    stopAllTracks();

    setErrorMessage('');
    setCameraStatus('requesting');
    setMicStatus('requesting');

    let newStream = null;

    try {
      // Primary attempt: Request both Video & Audio
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

      // Graceful Fallback 1: Try video-only if audio device is missing
      try {
        newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setMicStatus('not_found');
      } catch {
        // Graceful Fallback 2: Try audio-only if webcam hardware is missing
        try {
          newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setCameraStatus('not_found');
        } catch {
          // Both failed: report mapped error
          const categorized = categorizeMediaError(primaryErr);
          setErrorMessage(categorized.message);
          setCameraStatus(categorized.code);
          setMicStatus(categorized.code);
          return;
        }
      }
    }

    if (!newStream) return;

    streamRef.current = newStream;
    setStream(newStream);

    const videoTrack = newStream.getVideoTracks()[0];
    const audioTrack = newStream.getAudioTracks()[0];

    // Evaluate camera status
    if (videoTrack) {
      setCameraStatus(videoTrack.enabled ? 'active' : 'disabled');
      setIsCameraEnabled(videoTrack.enabled);
    } else if (cameraStatus !== 'not_found') {
      setCameraStatus('not_found');
    }

    // Evaluate mic status
    if (audioTrack) {
      setMicStatus(audioTrack.enabled ? 'active' : 'muted');
      setIsMicMuted(!audioTrack.enabled);
      setupAudioMeter(audioTrack);
    } else if (micStatus !== 'not_found') {
      setMicStatus('not_found');
    }

    // Read device hardware labels
    setDeviceLabels({
      video: videoTrack?.label || (videoTrack ? 'Integrated Web Camera' : 'No camera detected'),
      audio: audioTrack?.label || (audioTrack ? 'Default Microphone' : 'No microphone detected'),
    });
  }, [isSupported, stopAllTracks, setupAudioMeter, cameraStatus, micStatus]);

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

    const nextMuted = audioTrack.enabled; // If enabled, it becomes muted
    audioTrack.enabled = !nextMuted;
    setIsMicMuted(nextMuted);
    setMicStatus(nextMuted ? 'muted' : 'active');

    if (nextMuted) {
      setAudioLevel(0);
    }
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopAllTracks();
    };
  }, [stopAllTracks]);

  if (context) {
    return context;
  }

  return {
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
}

export default useMediaDevices;
