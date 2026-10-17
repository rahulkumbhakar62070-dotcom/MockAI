import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import interviewService from '../services/interviewService';
import { useMediaDevices } from '../hooks/useMediaDevices';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  Save, 
  LogOut, 
  RotateCcw, 
  LayoutDashboard, 
  Check, 
  Award, 
  AlertTriangle,
  Sparkles,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Trash2,
  Info,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function InterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Core session state
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Active question index (0-indexed)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Local draft answers mapped by questionNumber: { [qNum]: text }
  const [draftAnswers, setDraftAnswers] = useState({});

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState({}); // { [qNum]: boolean }

  // AI Follow-up generation state
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState(false);

  // Modal states
  const [showExitModal, setShowExitModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isConcluding, setIsConcluding] = useState(false);

  // Layout view toggle: 'video' | 'text' (defaults to video for audio_video mode)
  const [roomView, setRoomView] = useState('auto');

  // Elapsed timer state (in seconds)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const sessionStartTimeRef = useRef(null);

  // Textarea reference for auto-focus
  const answerInputRef = useRef(null);
  const videoElementRef = useRef(null);

  // Media devices hook for camera and microphone stream
  const {
    stream,
    micStatus,
    isCameraEnabled,
    isMicMuted,
    deviceLabels,
    errorMessage: mediaErrorMessage,
    audioLevel,
    startSetup,
    toggleCamera,
    toggleMic,
    stopAllTracks,
  } = useMediaDevices();

  const currentQuestion = interview?.questions ? interview.questions[currentIndex] : null;
  const currentAnswer = currentQuestion ? (draftAnswers[currentQuestion.questionNumber] || '') : '';
  const isCurrentSaved = currentQuestion ? savedStatus[currentQuestion.questionNumber] : false;

  // Unsaved check: Compare current text with server-confirmed answer
  const isCurrentDirty = currentQuestion
    ? (currentAnswer.trim() !== (currentQuestion.userAnswer || '').trim())
    : false;

  // AI Follow-up eligibility checks
  const currentFollowUpCount = interview?.questions?.filter((q) => q.isFollowUp).length || 0;
  const hasFollowUpForCurrent = interview?.questions?.some(
    (q) => q.isFollowUp && q.parentQuestionNumber === currentQuestion?.questionNumber
  );
  const canRequestFollowUp = Boolean(
    currentQuestion &&
    !currentQuestion.isFollowUp &&
    !hasFollowUpForCurrent &&
    currentFollowUpCount < 2 &&
    interview?.status !== 'completed' &&
    interview?.status !== 'abandoned' &&
    (currentAnswer.trim().length >= 5 || (currentQuestion.userAnswer && currentQuestion.userAnswer.trim().length >= 5))
  );

  // Determine if Video Room layout should be rendered
  const isVideoRoom = roomView === 'auto' 
    ? (interview?.mode === 'audio_video') 
    : (roomView === 'video');

  // Voice Settings Panel Toggle
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // AI Voice Interviewer Hook Integration (SpeechSynthesis)
  const {
    isSpeaking: isVoiceSpeaking,
    isSupported: isVoiceSupported,
    voices: voiceList,
    selectedVoice,
    rate: voiceRate,
    autoPlay: autoPlayQuestions,
    speak: speakQuestion,
    stop: stopQuestionVoice,
    setSelectedVoice,
    setRate: setVoiceRate,
    setAutoPlay: setAutoPlayQuestions,
  } = useSpeechSynthesis({
    onError: (err) => {
      toast.error(err, { id: 'voice-synthesis-error' });
    },
  });

  // Callback when speech recognition finalizes a chunk of spoken words
  const handleFinalTranscript = useCallback((finalChunk) => {
    if (!finalChunk || !finalChunk.trim() || !currentQuestion) return;

    setDraftAnswers((prev) => {
      const existing = prev[currentQuestion.questionNumber] || '';
      const trimmedExisting = existing.trimEnd();
      const trimmedChunk = finalChunk.trim();

      // Guard against duplicate transcript events
      if (trimmedExisting.endsWith(trimmedChunk)) {
        return prev;
      }

      const updated = trimmedExisting
        ? `${trimmedExisting} ${trimmedChunk}`
        : trimmedChunk;

      return {
        ...prev,
        [currentQuestion.questionNumber]: updated,
      };
    });
  }, [currentQuestion]);

  // Speech Recognition Hook Integration (Web Speech API STT)
  const {
    isListening: isSpeechListening,
    isInitializing: isSpeechInitializing,
    isSupported: isSpeechSupported,
    interimTranscript,
    errorMessage: speechError,
    startListening: startSpeechRecognition,
    stopListening: stopSpeechRecognition,
    clearError: clearSpeechError,
  } = useSpeechRecognition({
    onFinalTranscript: handleFinalTranscript,
    onError: (err) => {
      toast.error(err, { id: 'speech-rec-error' });
    },
  });

  // Attach active MediaStream to video element
  useEffect(() => {
    if (videoElementRef.current && stream) {
      videoElementRef.current.srcObject = stream;
    }
  }, [stream, currentIndex, roomView]);

  // Clean up tracks, speech recognition & question voice when leaving interview room workflow
  useEffect(() => {
    return () => {
      stopQuestionVoice();
      stopSpeechRecognition();
      const dest = window.location.pathname;
      if (!dest.includes('/interview/') || (!dest.includes('/device-check') && !dest.includes('/room/'))) {
        stopAllTracks();
      }
    };
  }, [stopAllTracks, stopSpeechRecognition, stopQuestionVoice]);

  // 1. Fetch Session from Backend on Mount or ID change (Refresh Resistance)
  useEffect(() => {
    let isMounted = true;

    const fetchSession = async () => {
      try {
        setLoading(true);
        setFetchError('');
        const res = await interviewService.getInterviewById(id);

        if (isMounted && res?.data?.interview) {
          const session = res.data.interview;
          setInterview(session);

          // Populate initial drafts and saved statuses from server
          const initialDrafts = {};
          const initialSaved = {};
          session.questions.forEach((q) => {
            if (q.userAnswer) {
              initialDrafts[q.questionNumber] = q.userAnswer;
              initialSaved[q.questionNumber] = true;
            } else {
              initialDrafts[q.questionNumber] = '';
              initialSaved[q.questionNumber] = false;
            }
          });

          setDraftAnswers(initialDrafts);
          setSavedStatus(initialSaved);

          // Restore last active question index or first unanswered question
          if (session.status !== 'completed' && session.status !== 'abandoned') {
            const firstUnansweredIndex = session.questions.findIndex(
              (q) => !q.userAnswer || q.userAnswer.trim().length === 0
            );
            if (firstUnansweredIndex !== -1) {
              setCurrentIndex(firstUnansweredIndex);
            } else if (session.currentQuestionIndex !== undefined) {
              setCurrentIndex(Math.min(session.currentQuestionIndex, session.questions.length - 1));
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(err.message || 'Failed to load interview session.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSession();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // 2. Accurate Elapsed Timer (runs while session is in progress, resilient to tab switching & reloads)
  useEffect(() => {
    if (loading || !interview || interview.status === 'completed' || interview.status === 'abandoned') {
      return;
    }

    const storageKey = `interview_timer_start_${interview._id}`;
    let startTime = null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        startTime = parseInt(saved, 10);
      }
    } catch {
      // ignore storage errors
    }

    if (!startTime || isNaN(startTime) || startTime > Date.now()) {
      startTime = Date.now();
      try {
        localStorage.setItem(storageKey, startTime.toString());
      } catch {
        // ignore
      }
    }

    sessionStartTimeRef.current = startTime;

    const updateTimer = () => {
      if (!sessionStartTimeRef.current) return;
      const elapsed = Math.max(0, Math.floor((Date.now() - sessionStartTimeRef.current) / 1000));
      setElapsedSeconds(elapsed);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    // Update immediately when tab gains focus to prevent interval background throttling drift
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loading, interview]);

  // Format seconds to mm:ss
  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle Answer Text Change manually via typing
  const handleAnswerChange = (e) => {
    if (!currentQuestion) return;
    const text = e.target.value;
    setDraftAnswers((prev) => ({
      ...prev,
      [currentQuestion.questionNumber]: text,
    }));
  };

  // AI Voice Interviewer: Play current question aloud
  const handlePlayQuestion = () => {
    if (isSpeechListening) {
      stopSpeechRecognition();
      toast('Speech recognition paused while question is playing.', { icon: 'ℹ️' });
    }

    const questionText = currentQuestion?.questionText || currentQuestion?.question || '';
    if (questionText) {
      speakQuestion(questionText);
    }
  };

  // AI Voice Interviewer: Replay question from start
  const handleReplayQuestion = () => {
    if (isSpeechListening) {
      stopSpeechRecognition();
    }
    const questionText = currentQuestion?.questionText || currentQuestion?.question || '';
    if (questionText) {
      speakQuestion(questionText);
    }
  };

  // AI Voice Interviewer: Stop voice playback
  const handleStopVoice = () => {
    stopQuestionVoice();
  };

  // Speech to Text: Start Speaking with Mic coordination
  const handleStartSpeaking = () => {
    // If AI voice is speaking, stop it to prevent audio cross-talk
    if (isVoiceSpeaking) {
      stopQuestionVoice();
    }

    if (!isSpeechSupported) {
      toast.error('Voice dictation is not supported in this browser. Please type your response manually.', { id: 'speech-unsupported' });
      return;
    }

    if (micStatus === 'denied') {
      toast.error('Microphone permission was denied. Please allow microphone access in your browser or continue typing manually.', { id: 'mic-denied' });
      return;
    }

    if (micStatus === 'not_found') {
      toast.error('No microphone hardware detected on your device. Please connect a microphone or type manually.', { id: 'mic-not-found' });
      return;
    }

    if (isMicMuted) {
      toggleMic();
      toast.success('Microphone unmuted for voice answering.');
    }
    startSpeechRecognition();
  };

  // Speech to Text: Stop Speaking
  const handleStopSpeaking = () => {
    stopSpeechRecognition();
  };

  // Speech to Text: Clear current question transcript
  const handleClearTranscript = () => {
    if (!currentQuestion) return;
    setDraftAnswers((prev) => ({
      ...prev,
      [currentQuestion.questionNumber]: '',
    }));
    toast.success('Transcript cleared.');
  };

  // Coordinate hardware toolbar mic toggle with speech recognition
  const handleToolbarMicToggle = () => {
    if (!isMicMuted && isSpeechListening) {
      stopSpeechRecognition();
    }
    toggleMic();
  };

  // 3. Save Answer to Backend API (with duplicate prevention and validation)
  const handleSaveAnswer = async (silent = false) => {
    if (isSaving) return false;
    if (!interview || !currentQuestion) return false;
    if (interview.status === 'completed' || interview.status === 'abandoned') {
      toast.error('This interview session is closed.');
      return false;
    }

    if (!currentAnswer || !currentAnswer.trim()) {
      if (!silent) {
        toast.error('Please enter or dictate an answer before saving.');
      }
      return false;
    }

    if (currentAnswer.length > 10000) {
      toast.error(
        `Answer exceeds the maximum length of 10,000 characters (currently ${currentAnswer.length.toLocaleString()} characters). Please shorten your response before saving.`
      );
      return false;
    }

    // Stop ongoing speech recognition or question voice before saving
    if (isVoiceSpeaking) {
      stopQuestionVoice();
    }
    if (isSpeechListening) {
      stopSpeechRecognition();
    }

    setIsSaving(true);
    try {
      await interviewService.submitAnswer(interview._id, {
        questionNumber: currentQuestion.questionNumber,
        answerText: currentAnswer,
        questionIndex: currentIndex,
      });

      // Update question in local interview state
      setInterview((prev) => {
        if (!prev) return prev;
        const updatedQuestions = prev.questions.map((q) => {
          if (q.questionNumber === currentQuestion.questionNumber) {
            return {
              ...q,
              userAnswer: currentAnswer.trim(),
              answeredAt: new Date(),
            };
          }
          return q;
        });
        return {
          ...prev,
          status: 'in_progress',
          questions: updatedQuestions,
        };
      });

      setSavedStatus((prev) => ({
        ...prev,
        [currentQuestion.questionNumber]: true,
      }));

      if (!silent) {
        toast.success(`Answer for Question #${currentQuestion.questionNumber} saved!`);
      }
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to save answer to server.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // AI Follow-up: Request a smart contextual deep-dive question based on candidate's answer
  const handleRequestFollowUp = async () => {
    if (!interview || !currentQuestion || isGeneratingFollowUp) return;

    // Stop question audio or dictation
    if (isVoiceSpeaking) {
      stopQuestionVoice();
    }
    if (isSpeechListening) {
      stopSpeechRecognition();
    }

    // Ensure current answer is saved first
    if (isCurrentDirty && currentAnswer.trim().length > 0) {
      const saved = await handleSaveAnswer(true);
      if (!saved) {
        toast.error('Could not save your answer before generating follow-up.');
        return;
      }
    } else if (!currentQuestion.userAnswer || currentQuestion.userAnswer.trim().length < 5) {
      toast.error('Please submit or save an answer before requesting an AI follow-up.');
      return;
    }

    setIsGeneratingFollowUp(true);
    const followUpToast = toast.loading('AI interviewer is preparing a deep-dive follow-up question...');

    try {
      const res = await interviewService.generateFollowUp(
        interview._id,
        currentQuestion.questionNumber
      );

      if (res?.data?.interview) {
        const updatedInterview = res.data.interview;
        const newIndex = res.data.newQuestionIndex ?? (currentIndex + 1);

        setInterview(updatedInterview);

        // Populate drafts and saved states for all questions
        setDraftAnswers((prev) => {
          const next = { ...prev };
          updatedInterview.questions.forEach((q) => {
            if (next[q.questionNumber] === undefined) {
              next[q.questionNumber] = q.userAnswer || '';
            }
          });
          return next;
        });

        setSavedStatus((prev) => {
          const next = { ...prev };
          updatedInterview.questions.forEach((q) => {
            if (next[q.questionNumber] === undefined) {
              next[q.questionNumber] = Boolean(q.userAnswer);
            }
          });
          return next;
        });

        toast.success('AI Follow-up question generated!', { id: followUpToast });

        // Jump to the newly added follow-up question
        setCurrentIndex(newIndex);
        if (answerInputRef.current) {
          answerInputRef.current.focus();
        }

        // Auto-read follow-up if enabled
        if (autoPlayQuestions) {
          const followUpText =
            res.data.followUpQuestion?.questionText ||
            res.data.followUpQuestion?.question ||
            '';
          if (followUpText) {
            setTimeout(() => {
              speakQuestion(followUpText);
            }, 400);
          }
        }
      }
    } catch (err) {
      console.error('Follow-up generation error:', err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to generate follow-up question. You may continue to the next question.';
      toast.error(errMsg, { id: followUpToast });
    } finally {
      setIsGeneratingFollowUp(false);
    }
  };

  // 4. Navigation between questions with automatic dirty-state handling & voice coordination
  const goToQuestion = async (targetIndex) => {
    if (targetIndex < 0 || !interview?.questions || targetIndex >= interview.questions.length) return;

    // Stop active speech recognition and question audio when jumping between questions
    if (isVoiceSpeaking) {
      stopQuestionVoice();
    }
    if (isSpeechListening) {
      stopSpeechRecognition();
    }

    // If current question has unsaved text, auto-save it
    if (isCurrentDirty && currentAnswer.trim().length > 0) {
      await handleSaveAnswer(true);
    }

    setCurrentIndex(targetIndex);
    if (answerInputRef.current) {
      answerInputRef.current.focus();
    }

    // If candidate enabled auto-read in voice settings, read the new question after short pause
    if (autoPlayQuestions && interview?.questions && interview.questions[targetIndex]) {
      const targetQ = interview.questions[targetIndex];
      const targetText = targetQ.questionText || targetQ.question || '';
      if (targetText) {
        setTimeout(() => {
          speakQuestion(targetText);
        }, 300);
      }
    }
  };

  const handleNext = async () => {
    if (isVoiceSpeaking) {
      stopQuestionVoice();
    }
    if (isSpeechListening) {
      stopSpeechRecognition();
    }

    // If not saved and not empty, auto-save before advancing
    if (isCurrentDirty && currentAnswer.trim().length > 0) {
      const success = await handleSaveAnswer(true);
      if (!success) {
        toast.error('Could not save answer before proceeding. Please review your answer or connection.');
        return;
      }
    }

    if (currentIndex < interview.questions.length - 1) {
      goToQuestion(currentIndex + 1);
    } else {
      // Last question reached -> trigger completion modal
      setShowCompleteModal(true);
    }
  };

  const handlePrevious = async () => {
    if (isVoiceSpeaking) {
      stopQuestionVoice();
    }
    if (isSpeechListening) {
      stopSpeechRecognition();
    }
    if (isCurrentDirty && currentAnswer.trim().length > 0) {
      await handleSaveAnswer(true);
    }
    if (currentIndex > 0) {
      goToQuestion(currentIndex - 1);
    }
  };

  // 5. Complete Interview Session (POST /api/interviews/:id/complete)
  const handleCompleteSession = async () => {
    if (!interview) return;
    setIsConcluding(true);

    try {
      // Stop question voice & speech recognition
      stopQuestionVoice();
      stopSpeechRecognition();

      // Save current answer if dirty before marking session complete
      if (isCurrentDirty && currentAnswer.trim().length > 0) {
        const saved = await handleSaveAnswer(true);
        if (!saved) {
          setIsConcluding(false);
          return;
        }
      }

      const res = await interviewService.completeInterview(interview._id, 'completed');

      // Stop media tracks when session ends
      stopAllTracks();
      try {
        localStorage.removeItem(`interview_timer_start_${interview._id}`);
      } catch {
        // ignore
      }

      setInterview((prev) => ({
        ...prev,
        status: 'completed',
        completedAt: res.data?.completedAt || new Date(),
      }));

      setShowCompleteModal(false);
      toast.success('Interview session successfully completed!');
    } catch (err) {
      toast.error(err.message || 'Failed to complete interview session.');
    } finally {
      setIsConcluding(false);
    }
  };

  // 6. Abandon / Exit Session Early
  const handleExitSession = async (markAbandoned = false) => {
    stopQuestionVoice();
    stopSpeechRecognition();

    if (!interview) {
      stopAllTracks();
      navigate('/dashboard');
      return;
    }

    setIsConcluding(true);
    try {
      if (isCurrentDirty && currentAnswer.trim().length > 0) {
        await handleSaveAnswer(true);
      }

      if (markAbandoned) {
        await interviewService.completeInterview(interview._id, 'abandoned');
        try {
          localStorage.removeItem(`interview_timer_start_${interview._id}`);
        } catch {
          // ignore
        }
        toast.success('Interview ended early.');
      } else {
        toast.success('Progress saved! You can resume from your dashboard anytime.');
      }

      // Release media tracks when leaving the room
      stopAllTracks();
      setShowExitModal(false);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Failed to exit session.');
    } finally {
      setIsConcluding(false);
    }
  };

  // Calculate stats
  const totalQuestions = interview?.questions?.length || 0;
  const answeredCount = interview?.questions?.filter(
    (q) => (draftAnswers[q.questionNumber] || q.userAnswer || '').trim().length > 0
  ).length || 0;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // -------------------------------------------------------------
  // RENDERING: Loading State
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center space-y-4 px-4 bg-[#F8F6F0]">
        <div className="w-14 h-14 rounded-2xl bg-[#DCE8DC] text-[#245C46] flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-display font-bold text-[#252923]">
            Loading Interview Session
          </h3>
          <p className="text-xs text-[#777970]">
            Restoring your verified questions and saved progress...
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDERING: Error State
  // -------------------------------------------------------------
  if (fetchError || !interview) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-[#252923]">
            Session Not Available
          </h2>
          <p className="text-sm text-[#777970] max-w-md mx-auto leading-relaxed">
            {fetchError || 'The requested interview session could not be found or you do not have permission to view it.'}
          </p>
        </div>
        <div className="pt-2">
          <Link to="/dashboard" className="btn-forest text-xs px-6 py-2.5 inline-flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            <span>Return to Candidate Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDERING: Completed View (When session is already completed)
  // -------------------------------------------------------------
  if (interview.status === 'completed') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#777970]">
          <Link to="/dashboard" className="hover:text-[#245C46] flex items-center gap-1">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <span>/</span>
          <span className="text-[#252923] font-medium">Session Completed</span>
        </div>

        {/* Completion Header Banner */}
        <div className="editorial-card p-6 sm:p-8 bg-white space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#DCE8DC] text-[#245C46] mx-auto flex items-center justify-center border border-[#245C46]/20">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <span className="badge-sage">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#245C46]" />
              Interview Completed
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#252923]">
              Mock Interview Finished: {interview.role}
            </h1>
            <p className="text-xs sm:text-sm text-[#777970] leading-relaxed">
              All {totalQuestions} questions have been answered and recorded to your candidate profile.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#E8E4DA] text-left">
            <div className="space-y-1">
              <span className="text-[11px] text-[#777970]">Seniority</span>
              <p className="text-xs font-semibold text-[#252923]">{interview.experienceLevel}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-[#777970]">Difficulty</span>
              <p className="text-xs font-semibold text-[#252923]">{interview.difficulty}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-[#777970]">Answered</span>
              <p className="text-xs font-semibold text-[#245C46] font-mono">{answeredCount} / {totalQuestions}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-[#777970]">Completion Time</span>
              <p className="text-xs font-semibold text-[#252923] font-mono">
                {interview.completedAt
                  ? new Date(interview.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Completed'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              to={`/interview/${interview._id}/report`}
              className="btn-forest text-xs px-6 py-3 w-full sm:w-auto flex items-center justify-center gap-2 font-semibold shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>View AI Evaluation & Report</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/dashboard"
              className="btn-secondary text-xs px-6 py-3 w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Candidate Dashboard</span>
            </Link>
            <Link
              to="/interview/setup"
              className="btn-secondary text-xs px-6 py-3 w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Configure New Session</span>
            </Link>
          </div>
        </div>

        {/* Review Submitted Answers */}
        <div className="space-y-4">
          <h3 className="text-base font-display font-bold text-[#252923]">
            Review Your Submitted Responses
          </h3>

          {interview.questions.map((q) => (
            <div key={q.questionNumber} className="editorial-card p-5 sm:p-6 space-y-4 bg-white">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-6 h-6 rounded-md bg-[#245C46] text-white flex items-center justify-center font-display font-bold text-xs">
                    {q.questionNumber}
                  </span>
                  <span className="text-xs font-semibold text-[#252923]">Question #{q.questionNumber}</span>
                  {q.isFollowUp && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-semibold">
                      <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                      AI Follow-up
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#DCE8DC] text-[#245C46] border border-[#245C46]/20 font-medium">
                  {q.topic || q.category}
                </span>
              </div>

              <p className="text-sm font-medium text-[#252923] leading-relaxed">
                {q.questionText || q.question}
              </p>

              <div className="p-4 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA] space-y-1.5">
                <span className="text-[11px] font-mono font-bold text-[#777970] uppercase tracking-wider">
                  Your Answer
                </span>
                <p className="text-xs sm:text-sm text-[#252923] whitespace-pre-wrap leading-relaxed">
                  {q.userAnswer ? q.userAnswer : <span className="italic text-[#777970]">No answer provided for this question.</span>}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDERING: Active Interview Session (Top Header + 2-Column or Single-Column Layout)
  // -------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Top Session Utility Header */}
      <div className="editorial-card p-4 sm:p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Role Info & Badges */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#245C46] text-white flex items-center justify-center shrink-0">
            {isVideoRoom ? <Video className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-display font-bold text-[#252923]">
                {interview.role}
              </h2>
              <span className="badge-sage text-[10px] py-0.5">
                {interview.experienceLevel}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F8F6F0] border border-[#E8E4DA] text-[#252923] font-medium">
                {interview.difficulty}
              </span>
              {isVideoRoom ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Video Room</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-[#777970] border border-neutral-200">
                  Text Mode
                </span>
              )}
            </div>
            <p className="text-xs text-[#777970]">
              {isVideoRoom 
                ? 'Live Interactive Video Interview Room • AI Voice & Text Evaluated'
                : 'Text Assessment Session • Verified by Google Gemini'}
            </p>
          </div>
        </div>

        {/* Right: Timer, Save Status, Layout Switcher & Exit Action */}
        <div className="flex items-center gap-2.5 flex-wrap self-end md:self-auto">
          {/* Save Status Pill */}
          {isSaving ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </div>
          ) : isCurrentDirty ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Unsaved edits</span>
            </div>
          ) : isCurrentSaved ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#DCE8DC] text-[#245C46] border border-[#245C46]/20 text-xs font-mono">
              <Check className="w-3 h-3 text-[#245C46]" />
              <span className="hidden sm:inline">Saved</span>
            </div>
          ) : null}

          {/* Accurate Elapsed Timer */}
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8F6F0] border border-[#E8E4DA] text-xs font-mono text-[#245C46] font-bold"
            title="Accurate Elapsed Interview Time"
          >
            <Clock className="w-3.5 h-3.5 text-[#245C46]" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {/* Optional View Switcher for flexibility */}
          {interview.mode === 'audio_video' && (
            <button
              type="button"
              onClick={() => setRoomView(isVideoRoom ? 'text' : 'video')}
              className="btn-secondary text-[11px] px-2.5 py-1.5 flex items-center gap-1 font-mono text-[#777970] hover:text-[#252923]"
              title="Toggle between Video Room layout and Compact Text layout"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span className="hidden lg:inline">{isVideoRoom ? 'Compact View' : 'Video View'}</span>
            </button>
          )}

          {/* Exit Action Button */}
          <button
            type="button"
            onClick={() => setShowExitModal(true)}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-rose-700 hover:text-rose-800 hover:border-rose-300"
            title="Leave or End Interview Session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Session</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LAYOUT CHOICE: Video Interview Room (2-Column) vs Text Session */}
      {/* ------------------------------------------------------------- */}
      {isVideoRoom ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ========================================================= */}
          {/* LEFT COLUMN: Candidate Live Video Feed & Device Controls  */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Live Video Frame Container */}
            <div className="relative aspect-video sm:aspect-[4/3] rounded-2xl bg-[#1d221e] border border-[#245C46]/20 overflow-hidden shadow-sm flex items-center justify-center">
              
              {/* Actual Video Element */}
              <video
                ref={videoElementRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  stream && isCameraEnabled ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              />

              {/* Camera Disabled State Overlay */}
              {stream && !isCameraEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#1d221e]">
                  <div className="w-16 h-16 rounded-full bg-[#245C46]/30 text-[#DCE8DC] flex items-center justify-center border border-[#245C46]/40">
                    <VideoOff className="w-8 h-8 text-[#DCE8DC]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-display font-bold text-white">Camera is Turned Off</p>
                    <p className="text-xs text-neutral-300 max-w-xs">
                      Your video feed is paused. Click &quot;Camera Off&quot; below to re-enable your preview.
                    </p>
                  </div>
                </div>
              )}

              {/* Stream Not Initialized / Offline State */}
              {!stream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3.5 bg-[#1d221e]">
                  <div className="w-14 h-14 rounded-2xl bg-[#245C46]/30 text-[#DCE8DC] flex items-center justify-center border border-[#245C46]/30">
                    <Video className="w-7 h-7 text-[#DCE8DC]" />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <p className="text-sm font-display font-bold text-white">Camera & Microphone Inactive</p>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {mediaErrorMessage || 'Enable your browser camera and microphone preview to participate in this live interview.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startSetup}
                    className="btn-forest text-xs px-4 py-2.5 flex items-center gap-2 bg-[#245C46] text-white hover:bg-[#1b4635] shadow-sm"
                  >
                    <Video className="w-4 h-4 text-[#DCE8DC]" />
                    <span>Activate Camera & Mic</span>
                  </button>
                </div>
              )}

              {/* Top Floating Feed Status */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-black/60 backdrop-blur-md text-white border border-white/10">
                  <span className={`w-2 h-2 rounded-full ${stream && isCameraEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span>{stream && isCameraEnabled ? 'Candidate Live Feed' : 'Preview Paused'}</span>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/50 text-neutral-300 backdrop-blur-xs">
                  {deviceLabels?.video ? 'HD Camera' : 'Video Mode'}
                </span>
              </div>

              {/* Bottom Floating Candidate & Mic Info */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-none">
                <span className="px-2.5 py-1 rounded-lg text-xs font-display font-semibold bg-black/60 text-white backdrop-blur-md">
                  Candidate Preview
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono backdrop-blur-md ${
                  isMicMuted ? 'bg-amber-600/90 text-white' : 'bg-black/60 text-emerald-400'
                }`}>
                  {isMicMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                  <span>{isMicMuted ? 'Muted' : 'Mic Active'}</span>
                </span>
              </div>
            </div>

            {/* Media Device Controls Toolbar */}
            <div className="editorial-card p-4 bg-white space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-bold text-[#252923] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#245C46]" />
                  <span>Device Controls</span>
                </span>
                <Link
                  to={`/interview/${interview._id}/device-check`}
                  className="text-[11px] font-mono text-[#245C46] hover:underline flex items-center gap-1"
                  title="Open device test screen"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Re-test Devices</span>
                </Link>
              </div>

              {/* Hardware Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Camera Toggle */}
                <button
                  type="button"
                  onClick={toggleCamera}
                  disabled={!stream}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    !stream
                      ? 'bg-neutral-100 text-[#777970] border border-neutral-200 cursor-not-allowed opacity-60'
                      : isCameraEnabled
                      ? 'bg-[#DCE8DC] text-[#245C46] border border-[#245C46]/30 hover:bg-[#cde0cd]'
                      : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                  }`}
                  title={isCameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                >
                  {isCameraEnabled ? <Video className="w-4 h-4 text-[#245C46]" /> : <VideoOff className="w-4 h-4 text-amber-700" />}
                  <span>{isCameraEnabled ? 'Camera On' : 'Camera Off'}</span>
                </button>

                {/* Mic Toggle (coordinated with speech recognition) */}
                <button
                  type="button"
                  onClick={handleToolbarMicToggle}
                  disabled={!stream}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    !stream
                      ? 'bg-neutral-100 text-[#777970] border border-neutral-200 cursor-not-allowed opacity-60'
                      : !isMicMuted
                      ? 'bg-[#DCE8DC] text-[#245C46] border border-[#245C46]/30 hover:bg-[#cde0cd]'
                      : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                  }`}
                  title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMicMuted ? <MicOff className="w-4 h-4 text-amber-700" /> : <Mic className="w-4 h-4 text-[#245C46]" />}
                  <span>{isMicMuted ? 'Mic Muted' : 'Mic Active'}</span>
                </button>
              </div>

              {/* Live Audio Level Meter */}
              <div className="p-3 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="flex items-center gap-1.5 text-[#252923]">
                    <Volume2 className="w-3.5 h-3.5 text-[#245C46]" />
                    <span>Microphone Input Level</span>
                  </span>
                  <span className="text-[#777970] font-semibold">
                    {isMicMuted ? 'Muted' : `${audioLevel}%`}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#E8E4DA] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-100 ease-out ${
                      audioLevel > 70 ? 'bg-amber-500' : 'bg-[#245C46]'
                    }`}
                    style={{ width: `${isMicMuted ? 0 : audioLevel}%` }}
                  />
                </div>
              </div>

              {/* Privacy Notice */}
              <p className="text-[11px] text-[#777970] leading-relaxed">
                🔒 <span className="font-medium text-[#252923]">Local Stream:</span> Video and audio remain strictly local to your browser for interview realism. No media tracks are recorded or uploaded.
              </p>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Question, Answer Workspace & Navigation     */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Progress Bar & Question Jump Navigator */}
            <div className="editorial-card p-4 sm:p-5 bg-white space-y-3.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-[#252923]">
                    Question {currentIndex + 1} of {totalQuestions}
                  </span>
                  <span className="text-[#777970]">•</span>
                  <span className="text-[#777970] font-mono">
                    {answeredCount} Answered
                  </span>
                </div>
                <span className="font-mono font-semibold text-[#245C46]">
                  {progressPercent}% Complete
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full h-2 rounded-full bg-[#E8E4DA] overflow-hidden">
                <div
                  className="h-full bg-[#245C46] transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Question Pills Row */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {interview.questions.map((q, idx) => {
                  const hasAnswer = (draftAnswers[q.questionNumber] || q.userAnswer || '').trim().length > 0;
                  const isCurrent = idx === currentIndex;

                  return (
                    <button
                      key={q.questionNumber}
                      type="button"
                      onClick={() => goToQuestion(idx)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-xs font-mono font-bold flex items-center justify-center transition-all relative ${
                        isCurrent
                          ? 'bg-[#245C46] text-white shadow-sm ring-2 ring-[#245C46]/30'
                          : hasAnswer
                          ? 'bg-[#DCE8DC] text-[#245C46] border border-[#245C46]/25 hover:bg-[#c9ddc9]'
                          : 'bg-[#F8F6F0] text-[#777970] border border-[#E8E4DA] hover:border-[#245C46]/40'
                      }`}
                      title={`Jump to Question ${q.questionNumber}`}
                    >
                      {q.questionNumber}
                      {hasAnswer && !isCurrent && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#245C46] text-white flex items-center justify-center text-[8px]">
                          ✓
                        </span>
                      )}
                      {q.isFollowUp && (
                        <span
                          className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white"
                          title="AI Follow-up Question"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Question & Answer Input Card */}
            {currentQuestion && (
              <div className="editorial-card p-6 sm:p-7 bg-white space-y-5">
                
                {/* Question Header & Voice Control Bar */}
                <div className="space-y-3.5 pb-4 border-b border-[#E8E4DA]">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#245C46]">
                        Question #{currentQuestion.questionNumber}
                      </span>
                      {currentQuestion.isFollowUp && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-semibold">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          AI Follow-up to #{currentQuestion.parentQuestionNumber}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#DCE8DC] text-[#245C46] border border-[#245C46]/20 font-medium">
                      {currentQuestion.topic || currentQuestion.category}
                    </span>
                  </div>

                  {currentQuestion.isFollowUp && currentQuestion.followUpReason && (
                    <div className="text-xs text-[#555] bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span><strong>AI Context:</strong> {currentQuestion.followUpReason}</span>
                    </div>
                  )}

                  <h3 className="text-base sm:text-lg font-display font-bold text-[#252923] leading-relaxed">
                    {currentQuestion.questionText || currentQuestion.question}
                  </h3>

                  {/* AI Voice Interviewer Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA]">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Play / Stop Voice Button */}
                      {!isVoiceSpeaking ? (
                        <button
                          type="button"
                          onClick={handlePlayQuestion}
                          disabled={!isVoiceSupported}
                          className="btn-forest text-xs px-3.5 py-1.5 flex items-center gap-1.5 font-semibold shadow-xs disabled:opacity-50"
                          title="Listen to the AI interviewer read this question aloud"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-[#DCE8DC]" />
                          <span>Play Question</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStopVoice}
                          className="text-xs px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 transition-all shadow-xs animate-pulse"
                          title="Stop AI interviewer question audio"
                        >
                          <Square className="w-3 h-3 fill-current text-rose-700" />
                          <span>Stop Voice</span>
                        </button>
                      )}

                      {/* Replay Question Button */}
                      <button
                        type="button"
                        onClick={handleReplayQuestion}
                        disabled={!isVoiceSupported || isVoiceSpeaking}
                        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-[#252923] hover:text-[#245C46] disabled:opacity-50"
                        title="Replay this question from the beginning"
                      >
                        <RotateCcw className="w-3 h-3 text-[#245C46]" />
                        <span>Replay</span>
                      </button>

                      {/* Voice Settings Button */}
                      <button
                        type="button"
                        onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                        disabled={!isVoiceSupported}
                        className={`btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 font-mono transition-all ${
                          showVoiceSettings ? 'bg-[#DCE8DC] text-[#245C46] border-[#245C46]/30' : 'text-[#777970]'
                        }`}
                        title="Configure voice speed and synthesis voice"
                      >
                        <Settings className="w-3 h-3 text-[#245C46]" />
                        <span className="hidden sm:inline">Voice Options</span>
                      </button>
                    </div>

                    {/* Speaking Activity Indicator */}
                    <div className="flex items-center gap-2">
                      {isVoiceSpeaking ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-[#245C46] border border-emerald-200">
                          <span className="flex items-center gap-0.5">
                            <span className="w-1 h-3 bg-[#245C46] rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1 h-4 bg-[#245C46] rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1 h-2.5 bg-[#245C46] rounded-full animate-bounce" />
                          </span>
                          <span>Interviewer Speaking...</span>
                        </div>
                      ) : !isVoiceSupported ? (
                        <span className="text-[11px] font-mono text-amber-800 flex items-center gap-1">
                          <Info className="w-3 h-3 text-amber-600" />
                          <span>Voice synthesis unsupported</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#777970] font-mono hidden md:inline">
                          Speed: {voiceRate}x
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Voice Settings Panel */}
                  {showVoiceSettings && isVoiceSupported && (
                    <div className="p-3.5 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA] space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-[#E8E4DA]">
                        <span className="text-xs font-display font-bold text-[#252923] flex items-center gap-1.5">
                          <Settings className="w-3.5 h-3.5 text-[#245C46]" />
                          <span>AI Interviewer Voice Settings</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowVoiceSettings(false)}
                          className="text-[11px] font-mono text-[#777970] hover:text-[#252923]"
                        >
                          Close
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Voice Selector */}
                        <div className="space-y-1">
                          <label htmlFor="voice-select-video" className="text-[11px] font-mono font-medium text-[#777970]">
                            Interviewer Voice
                          </label>
                          <select
                            id="voice-select-video"
                            value={selectedVoice?.name || ''}
                            onChange={(e) => {
                              const found = voiceList.find((v) => v.name === e.target.value);
                              if (found) setSelectedVoice(found);
                            }}
                            className="input-editorial w-full text-xs p-2 bg-white"
                          >
                            {voiceList.map((v) => (
                              <option key={v.name} value={v.name}>
                                {v.name} ({v.lang})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Speaking Rate (Speed) */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono font-medium text-[#777970]">
                            <span>Speaking Pace</span>
                            <span className="text-[#245C46] font-bold">{voiceRate}x</span>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1">
                            {[0.8, 1.0, 1.2].map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setVoiceRate(r)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                                  voiceRate === r
                                    ? 'bg-[#245C46] text-white'
                                    : 'bg-white text-[#252923] border border-[#E8E4DA] hover:border-[#245C46]/30'
                                }`}
                              >
                                {r}x
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Auto-Play Toggle */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#E8E4DA] text-xs">
                        <label htmlFor="auto-play-toggle-video" className="text-[#252923] font-medium cursor-pointer">
                          Auto-read new questions when navigating
                        </label>
                        <input
                          id="auto-play-toggle-video"
                          type="checkbox"
                          checked={autoPlayQuestions}
                          onChange={(e) => setAutoPlayQuestions(e.target.checked)}
                          className="w-4 h-4 accent-[#245C46] rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                </div>

                {/* Answer Input Workspace */}
                <div className="space-y-3.5">
                  
                  {/* Speech to Text Action Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA]">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!isSpeechListening ? (
                        <button
                          type="button"
                          onClick={handleStartSpeaking}
                          disabled={isVoiceSpeaking || isSpeechInitializing || isSaving}
                          className="btn-forest text-xs px-3.5 py-1.5 flex items-center gap-1.5 font-semibold shadow-xs disabled:opacity-50"
                          title={isVoiceSpeaking ? 'Wait for question audio to finish' : 'Dictate your response using your microphone'}
                        >
                          <Mic className="w-3.5 h-3.5 text-[#DCE8DC]" />
                          <span>Start Speaking</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStopSpeaking}
                          className="text-xs px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 transition-all shadow-xs animate-pulse"
                          title="Stop voice recognition"
                        >
                          <Square className="w-3 h-3 fill-current text-rose-700" />
                          <span>Stop Speaking</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleClearTranscript}
                        disabled={isSaving || !currentAnswer.trim()}
                        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-[#777970] hover:text-rose-700 disabled:opacity-40"
                        title="Clear current answer text"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear Transcript</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {isVoiceSpeaking ? (
                        <span className="text-[11px] font-mono text-emerald-800 font-medium">
                          Listening paused (AI speaking)
                        </span>
                      ) : isSpeechListening ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          <span>Listening live...</span>
                        </div>
                      ) : !isSpeechSupported ? (
                        <span className="text-[11px] font-mono text-amber-800 flex items-center gap-1">
                          <Info className="w-3 h-3 text-amber-600" />
                          <span>Web Speech API unsupported</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#777970] font-medium hidden sm:inline">
                          Speak or type your answer
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Interim Speech Live Feedback */}
                  {isSpeechListening && interimTranscript && (
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-[#252923] flex items-start gap-2.5 animate-in fade-in duration-150">
                      <span className="w-2 h-2 rounded-full bg-[#E99564] animate-pulse mt-1 shrink-0" />
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#E99564] block">
                          Hearing live speech:
                        </span>
                        <p className="italic text-xs text-[#252923]/90 leading-relaxed font-sans">
                          &ldquo;{interimTranscript}&rdquo;
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Speech Recognition Error Banner */}
                  {speechError && (
                    <div className="flex items-start sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 animate-in fade-in duration-150">
                      <div className="flex items-start sm:items-center gap-2 min-w-0">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
                        <span className="leading-relaxed">{speechError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={clearSpeechError}
                        className="text-[10px] font-mono font-bold text-rose-700 hover:text-rose-900 underline shrink-0 cursor-pointer ml-2"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Textarea Label & Counter */}
                  <div className="flex items-center justify-between pt-1">
                    <label
                      htmlFor="interview-answer-input"
                      className="text-xs font-display font-bold text-[#252923] flex items-center gap-1.5"
                    >
                      <span>Your Technical Response</span>
                      {isCurrentDirty ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          Unsaved edits
                        </span>
                      ) : isCurrentSaved ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          Saved
                        </span>
                      ) : null}
                    </label>

                    <div className="text-[11px] font-mono text-[#777970] flex items-center gap-2">
                      <span className={currentAnswer.length > 10000 ? 'text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200' : ''}>
                        {currentAnswer.length.toLocaleString()} / 10,000 chars
                      </span>
                      <span>•</span>
                      <span>{currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0} words</span>
                    </div>
                  </div>

                  <textarea
                    id="interview-answer-input"
                    ref={answerInputRef}
                    rows={8}
                    value={currentAnswer}
                    onChange={handleAnswerChange}
                    placeholder="Speak into your microphone or type your response. You can freely edit the text before saving..."
                    className="input-editorial w-full font-sans text-sm leading-relaxed p-4 resize-y min-h-[180px]"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-[#777970] leading-relaxed max-w-md">
                      💡 Tip: Speak or type your answer. Audio transcription is processed locally by your browser&apos;s Web Speech API and is never uploaded or saved to our servers.
                    </p>

                    <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                      {/* Optional AI Follow-up Question Trigger */}
                      {canRequestFollowUp && (
                        <button
                          type="button"
                          onClick={handleRequestFollowUp}
                          disabled={isGeneratingFollowUp || isSaving}
                          className="btn-secondary text-xs px-3.5 py-2 flex items-center justify-center gap-1.5 border-amber-300 text-amber-900 bg-amber-50/70 hover:bg-amber-100 transition-colors disabled:opacity-50"
                          title="Generate a contextual AI follow-up question based on your response"
                        >
                          {isGeneratingFollowUp ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                              <span>Generating AI Follow-up...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              <span>Ask AI Follow-up</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSaveAnswer(false)}
                        disabled={isSaving || !currentAnswer.trim()}
                        className="btn-secondary text-xs px-4 py-2 flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5 text-[#245C46]" />
                            <span>Save Response</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Question Navigation Controls */}
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-5 border-t border-[#E8E4DA]">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0 || isSaving}
                    className="btn-secondary text-xs px-4 py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Previous Question</span>
                  </button>

                  {currentIndex < totalQuestions - 1 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={isSaving}
                      className="btn-forest text-xs px-5 py-2.5 flex items-center justify-center gap-1.5 w-full sm:w-auto"
                    >
                      <span>Save & Next Question</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCompleteModal(true)}
                      disabled={isSaving}
                      className="btn-forest text-xs px-6 py-2.5 flex items-center justify-center gap-2 bg-[#245C46] text-white shadow-sm w-full sm:w-auto"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#DCE8DC]" />
                      <span>Finish Interview Session</span>
                    </button>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>
      ) : (
        /* ========================================================= */
        /* CLASSIC ASSESSMENT LAYOUT (For text sessions)             */
        /* ========================================================= */
        <div className="space-y-6">
          {/* Progress & Question Pill Navigator */}
          <div className="editorial-card p-5 bg-white space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-[#252923]">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span className="text-[#777970]">•</span>
                <span className="text-[#777970] font-mono">
                  {answeredCount} Answered
                </span>
              </div>
              <span className="font-mono font-semibold text-[#245C46]">
                {progressPercent}% Completed
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2 rounded-full bg-[#E8E4DA] overflow-hidden">
              <div 
                className="h-full bg-[#245C46] transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Question Pills List */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {interview.questions.map((q, idx) => {
                const hasAnswer = (draftAnswers[q.questionNumber] || q.userAnswer || '').trim().length > 0;
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.questionNumber}
                    type="button"
                    onClick={() => goToQuestion(idx)}
                    className={`w-9 h-9 rounded-xl text-xs font-mono font-bold flex items-center justify-center transition-all relative ${
                      isCurrent
                        ? 'bg-[#245C46] text-white shadow-sm ring-2 ring-[#245C46]/30'
                        : hasAnswer
                        ? 'bg-[#DCE8DC] text-[#245C46] border border-[#245C46]/25 hover:bg-[#c9ddc9]'
                        : 'bg-[#F8F6F0] text-[#777970] border border-[#E8E4DA] hover:border-[#245C46]/40'
                    }`}
                    title={`Jump to Question ${q.questionNumber}`}
                  >
                    {q.questionNumber}
                    {hasAnswer && !isCurrent && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#245C46] text-white flex items-center justify-center text-[8px]">
                        ✓
                      </span>
                    )}
                    {q.isFollowUp && (
                      <span
                        className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white"
                        title="AI Follow-up Question"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Question & Answer Card */}
          {currentQuestion && (
            <div className="editorial-card p-6 sm:p-8 bg-white space-y-6">
              
              <div className="space-y-3.5 pb-5 border-b border-[#E8E4DA]">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#245C46]">
                      Question #{currentQuestion.questionNumber}
                    </span>
                    {currentQuestion.isFollowUp && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-semibold">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        AI Follow-up to #{currentQuestion.parentQuestionNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#DCE8DC] text-[#245C46] border border-[#245C46]/20 font-medium">
                    {currentQuestion.topic || currentQuestion.category}
                  </span>
                </div>

                {currentQuestion.isFollowUp && currentQuestion.followUpReason && (
                  <div className="text-xs text-[#555] bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <span><strong>AI Context:</strong> {currentQuestion.followUpReason}</span>
                  </div>
                )}

                <h3 className="text-lg sm:text-xl font-display font-bold text-[#252923] leading-relaxed">
                  {currentQuestion.questionText || currentQuestion.question}
                </h3>

                {/* AI Voice Interviewer Toolbar (Classic View) */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA]">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!isVoiceSpeaking ? (
                      <button
                        type="button"
                        onClick={handlePlayQuestion}
                        disabled={!isVoiceSupported}
                        className="btn-forest text-xs px-3.5 py-1.5 flex items-center gap-1.5 font-semibold shadow-xs disabled:opacity-50"
                        title="Listen to the AI interviewer read this question aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#DCE8DC]" />
                        <span>Play Question</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStopVoice}
                        className="text-xs px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 transition-all shadow-xs animate-pulse"
                        title="Stop AI interviewer voice playback"
                      >
                        <Square className="w-3 h-3 fill-current text-rose-700" />
                        <span>Stop Voice</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleReplayQuestion}
                      disabled={!isVoiceSupported || isVoiceSpeaking}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-[#252923] hover:text-[#245C46] disabled:opacity-50"
                      title="Replay this question from the beginning"
                    >
                      <RotateCcw className="w-3 h-3 text-[#245C46]" />
                      <span>Replay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                      disabled={!isVoiceSupported}
                      className={`btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 font-mono transition-all ${
                        showVoiceSettings ? 'bg-[#DCE8DC] text-[#245C46] border-[#245C46]/30' : 'text-[#777970]'
                      }`}
                      title="Configure voice speed and synthesis voice"
                    >
                      <Settings className="w-3 h-3 text-[#245C46]" />
                      <span className="hidden sm:inline">Voice Options</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isVoiceSpeaking ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-[#245C46] border border-emerald-200">
                        <span className="flex items-center gap-0.5">
                          <span className="w-1 h-3 bg-[#245C46] rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1 h-4 bg-[#245C46] rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1 h-2.5 bg-[#245C46] rounded-full animate-bounce" />
                        </span>
                        <span>Interviewer Speaking...</span>
                      </div>
                    ) : !isVoiceSupported ? (
                      <span className="text-[11px] font-mono text-amber-800 flex items-center gap-1">
                        <Info className="w-3 h-3 text-amber-600" />
                        <span>Voice synthesis unsupported</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#777970] font-mono hidden md:inline">
                        Speed: {voiceRate}x
                      </span>
                    )}
                  </div>
                </div>

                {/* Collapsible Voice Settings Panel (Classic View) */}
                {showVoiceSettings && isVoiceSupported && (
                  <div className="p-3.5 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA] space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E8E4DA]">
                      <span className="text-xs font-display font-bold text-[#252923] flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5 text-[#245C46]" />
                        <span>AI Interviewer Voice Settings</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowVoiceSettings(false)}
                        className="text-[11px] font-mono text-[#777970] hover:text-[#252923]"
                      >
                        Close
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label htmlFor="voice-select-classic" className="text-[11px] font-mono font-medium text-[#777970]">
                          Interviewer Voice
                        </label>
                        <select
                          id="voice-select-classic"
                          value={selectedVoice?.name || ''}
                          onChange={(e) => {
                            const found = voiceList.find((v) => v.name === e.target.value);
                            if (found) setSelectedVoice(found);
                          }}
                          className="input-editorial w-full text-xs p-2 bg-white"
                        >
                          {voiceList.map((v) => (
                            <option key={v.name} value={v.name}>
                              {v.name} ({v.lang})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono font-medium text-[#777970]">
                          <span>Speaking Pace</span>
                          <span className="text-[#245C46] font-bold">{voiceRate}x</span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          {[0.8, 1.0, 1.2].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setVoiceRate(r)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                                voiceRate === r
                                  ? 'bg-[#245C46] text-white'
                                  : 'bg-white text-[#252923] border border-[#E8E4DA] hover:border-[#245C46]/30'
                              }`}
                            >
                              {r}x
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E8E4DA] text-xs">
                      <label htmlFor="auto-play-toggle-classic" className="text-[#252923] font-medium cursor-pointer">
                        Auto-read new questions when navigating
                      </label>
                      <input
                        id="auto-play-toggle-classic"
                        type="checkbox"
                        checked={autoPlayQuestions}
                        onChange={(e) => setAutoPlayQuestions(e.target.checked)}
                        className="w-4 h-4 accent-[#245C46] rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3.5">
                
                {/* Speech to Text Action Toolbar for Text Mode */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA]">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!isSpeechListening ? (
                      <button
                        type="button"
                        onClick={handleStartSpeaking}
                        disabled={isVoiceSpeaking || isSpeechInitializing || isSaving}
                        className="btn-forest text-xs px-3.5 py-1.5 flex items-center gap-1.5 font-semibold shadow-xs disabled:opacity-50"
                        title={isVoiceSpeaking ? 'Wait for question audio to finish' : 'Dictate your response using your microphone'}
                      >
                        <Mic className="w-3.5 h-3.5 text-[#DCE8DC]" />
                        <span>Start Speaking</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStopSpeaking}
                        className="text-xs px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 transition-all shadow-xs animate-pulse"
                        title="Stop voice recognition"
                      >
                        <Square className="w-3 h-3 fill-current text-rose-700" />
                        <span>Stop Speaking</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleClearTranscript}
                      disabled={isSaving || !currentAnswer.trim()}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-[#777970] hover:text-rose-700 disabled:opacity-40"
                      title="Clear current answer text"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear Transcript</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isVoiceSpeaking ? (
                      <span className="text-[11px] font-mono text-emerald-800 font-medium">
                        Listening paused (AI speaking)
                      </span>
                    ) : isSpeechListening ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        <span>Listening live...</span>
                      </div>
                    ) : !isSpeechSupported ? (
                      <span className="text-[11px] font-mono text-amber-800 flex items-center gap-1">
                        <Info className="w-3 h-3 text-amber-600" />
                        <span>Web Speech API unsupported</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#777970] font-medium hidden sm:inline">
                        Voice or keyboard input
                      </span>
                    )}
                  </div>
                </div>

                {/* Interim Speech Live Feedback */}
                {isSpeechListening && interimTranscript && (
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-[#252923] flex items-start gap-2.5 animate-in fade-in duration-150">
                    <span className="w-2 h-2 rounded-full bg-[#E99564] animate-pulse mt-1 shrink-0" />
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#E99564] block">
                        Hearing live speech:
                      </span>
                      <p className="italic text-xs text-[#252923]/90 leading-relaxed font-sans">
                        &ldquo;{interimTranscript}&rdquo;
                      </p>
                    </div>
                  </div>
                )}

                {/* Speech Recognition Error Banner */}
                {speechError && (
                  <div className="flex items-start sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 animate-in fade-in duration-150">
                    <div className="flex items-start sm:items-center gap-2 min-w-0">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
                      <span className="leading-relaxed">{speechError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearSpeechError}
                      className="text-[10px] font-mono font-bold text-rose-700 hover:text-rose-900 underline shrink-0 cursor-pointer ml-2"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <label 
                    htmlFor="interview-answer-input-classic"
                    className="text-xs font-display font-bold text-[#252923] flex items-center gap-1.5"
                  >
                    <span>Your Written Technical Response</span>
                    {isCurrentDirty ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        Unsaved edits
                      </span>
                    ) : isCurrentSaved ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        Saved
                      </span>
                    ) : null}
                  </label>

                  <div className="text-[11px] font-mono text-[#777970] flex items-center gap-2">
                    <span>{currentAnswer.length} characters</span>
                    <span>•</span>
                    <span>{currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0} words</span>
                  </div>
                </div>

                <textarea
                  id="interview-answer-input-classic"
                  ref={answerInputRef}
                  rows={8}
                  value={currentAnswer}
                  onChange={handleAnswerChange}
                  placeholder="Speak into your microphone or type your response. You can freely edit the text before saving..."
                  className="input-editorial w-full font-sans text-sm leading-relaxed p-4 resize-y min-h-[180px]"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <p className="text-[11px] text-[#777970] leading-relaxed max-w-md">
                    💡 Tip: Speak or type your answer. Audio transcription is processed locally by your browser&apos;s Web Speech API and is never uploaded or saved to our servers.
                  </p>

                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    {/* Optional AI Follow-up Question Trigger */}
                    {canRequestFollowUp && (
                      <button
                        type="button"
                        onClick={handleRequestFollowUp}
                        disabled={isGeneratingFollowUp || isSaving}
                        className="btn-secondary text-xs px-3.5 py-2 flex items-center justify-center gap-1.5 border-amber-300 text-amber-900 bg-amber-50/70 hover:bg-amber-100 transition-colors disabled:opacity-50"
                        title="Generate a contextual AI follow-up question based on your response"
                      >
                        {isGeneratingFollowUp ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                            <span>Generating AI Follow-up...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Ask AI Follow-up</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSaveAnswer(false)}
                      disabled={isSaving || !currentAnswer.trim()}
                      className="btn-secondary text-xs px-4 py-2 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5 text-[#245C46]" />
                          <span>Save Response</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-[#E8E4DA]">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0 || isSaving}
                  className="btn-secondary text-xs px-4 py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous Question</span>
                </button>

                {currentIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isSaving}
                    className="btn-forest text-xs px-5 py-2.5 flex items-center justify-center gap-1.5 w-full sm:w-auto"
                  >
                    <span>Save & Next Question</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCompleteModal(true)}
                    disabled={isSaving}
                    className="btn-forest text-xs px-6 py-2.5 flex items-center justify-center gap-2 bg-[#245C46] text-white shadow-sm w-full sm:w-auto"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#DCE8DC]" />
                    <span>Finish Interview Session</span>
                  </button>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Complete Interview Confirmation                        */}
      {/* ------------------------------------------------------------- */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="editorial-card p-6 sm:p-7 max-w-md w-full bg-white space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DCE8DC] text-[#245C46] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-base font-display font-bold text-[#252923]">
                  Conclude Interview Session?
                </h4>
                <p className="text-xs text-[#777970]">
                  You have answered {answeredCount} of {totalQuestions} questions.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#252923]/80 leading-relaxed">
              Once marked complete, your responses will be locked and saved to your candidate workspace. Camera, microphone, and voice synthesis will be immediately released.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                disabled={isConcluding}
                className="btn-secondary text-xs px-4 py-2.5 w-full sm:w-auto"
              >
                Review Answers
              </button>
              <button
                type="button"
                onClick={handleCompleteSession}
                disabled={isConcluding}
                className="btn-forest text-xs px-5 py-2.5 flex items-center justify-center gap-1.5 w-full sm:w-auto"
              >
                {isConcluding ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Finalizing...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Complete</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Exit Session Early Confirmation                        */}
      {/* ------------------------------------------------------------- */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="editorial-card p-6 sm:p-7 max-w-md w-full bg-white space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-base font-display font-bold text-[#252923]">
                  Pause or Leave Interview?
                </h4>
                <p className="text-xs text-[#777970]">
                  Current progress: {answeredCount} of {totalQuestions} questions answered.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#252923]/80 leading-relaxed">
              Choose <span className="font-semibold text-[#245C46]">Save & Exit</span> to pause and resume this session later from your dashboard, or choose <span className="font-semibold text-rose-700">Abandon</span> if you do not plan to finish it.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="btn-secondary text-xs px-4 py-2.5 w-full sm:w-auto text-center justify-center"
              >
                Continue Interview
              </button>
              <button
                type="button"
                onClick={() => handleExitSession(false)}
                disabled={isConcluding}
                className="btn-forest text-xs px-4 py-2.5 w-full sm:w-auto flex items-center justify-center gap-1.5"
              >
                <span>Save & Exit to Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => handleExitSession(true)}
                disabled={isConcluding}
                className="text-xs px-3 py-2.5 text-rose-600 hover:text-rose-700 font-medium w-full sm:w-auto text-center"
              >
                Abandon Session
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
