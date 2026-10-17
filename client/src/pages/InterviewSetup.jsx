import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import interviewService from '../services/interviewService';
import { 
  Sparkles, 
  MessageSquare, 
  Video, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Layers, 
  ChevronLeft,
  RotateCcw,
  LayoutDashboard
} from 'lucide-react';
import toast from 'react-hot-toast';

const PRESET_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Software Engineer',
  'Data Analyst',
];

const EXPERIENCE_LEVELS = [
  {
    id: 'Beginner',
    label: 'Beginner (0–2 yrs)',
    desc: 'Focus on core syntax, fundamental patterns, and problem decomposition.',
  },
  {
    id: 'Intermediate',
    label: 'Intermediate (2–5 yrs)',
    desc: 'Practical system architecture, error handling, performance & concurrency.',
  },
  {
    id: 'Experienced',
    label: 'Experienced (5+ yrs)',
    desc: 'Large-scale distributed systems, trade-offs, scalability, and technical leadership.',
  },
];

const DIFFICULTIES = [
  {
    id: 'Easy',
    label: 'Easy',
    desc: 'Foundational concepts, clean code logic, and basic technical definitions.',
  },
  {
    id: 'Medium',
    label: 'Medium',
    desc: 'Real-world production scenarios, state management, and edge-case handling.',
  },
  {
    id: 'Hard',
    label: 'Hard',
    desc: 'Deep distributed failure modes, performance bottlenecks, and non-trivial algorithms.',
  },
];

const QUESTION_COUNTS = [
  { count: 5, time: '~15 mins', label: '5 Questions', tag: 'Fast Drill' },
  { count: 10, time: '~30 mins', label: '10 Questions', tag: 'Standard Round' },
  { count: 15, time: '~45 mins', label: '15 Questions', tag: 'Comprehensive' },
];

export default function InterviewSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, token: authToken } = useAuth();

  // Form states
  const [role, setRole] = useState('Full Stack Developer');
  const [experienceLevel, setExperienceLevel] = useState('Intermediate');
  const [mode, setMode] = useState('text');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(5);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Generated questions state
  const [generatedData, setGeneratedData] = useState(null);
  const [isStartingSession, setIsStartingSession] = useState(false);

  // Launch the interactive session with verified questions
  const handleStartInterview = async () => {
    if (!generatedData) return;
    setIsStartingSession(true);
    try {
      const res = await interviewService.startInterview({
        interviewId: generatedData.interviewId,
        role: generatedData.jobRole,
        experienceLevel: generatedData.experienceLevel,
        difficulty: generatedData.difficulty,
        mode: generatedData.mode,
        questionCount: generatedData.questionCount,
        questions: generatedData.questions,
      });

      const activeId = res?.data?.interview?._id || generatedData.interviewId;
      toast.success('Interactive interview session started!');
      if (generatedData.mode === 'audio_video') {
        navigate(`/interview/${activeId}/device-check`);
      } else {
        navigate(`/interview/session/${activeId}`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start interview session.');
    } finally {
      setIsStartingSession(false);
    }
  };

  // Inline validation
  const validateForm = () => {
    const newErrors = {};

    if (!role || !role.trim()) {
      newErrors.role = 'Job role is required.';
    } else if (role.trim().length < 2) {
      newErrors.role = 'Role must be at least 2 characters long.';
    } else if (role.trim().length > 100) {
      newErrors.role = 'Role cannot exceed 100 characters.';
    }

    if (!experienceLevel) {
      newErrors.experienceLevel = 'Please select your experience level.';
    }

    if (!mode) {
      newErrors.mode = 'Please select an interview mode.';
    }

    if (!difficulty) {
      newErrors.difficulty = 'Please select a difficulty level.';
    }

    if (!questionCount) {
      newErrors.questionCount = 'Please select the number of questions.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    // Pre-flight check: Verify user is authenticated with a valid token
    const activeToken = authToken || localStorage.getItem('token');
    if (!activeToken || !isAuthenticated) {
      toast.error('Authentication required. Please log in to generate interview questions.');
      navigate('/login', { state: { from: location } });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Request real AI questions from Gemini
      const genResponse = await interviewService.generateQuestions({
        jobRole: role.trim(),
        experienceLevel,
        difficulty,
        questionCount: Number(questionCount),
      }, activeToken);

      const questions = genResponse?.data?.questions || [];

      // 2. Also persist session to user dashboard
      const createRes = await interviewService.createInterview({
        role: role.trim(),
        experienceLevel,
        mode,
        difficulty,
        questionCount: Number(questionCount),
      });

      const interviewId = createRes?.data?.interview?._id;

      // 3. Set verified questions in state
      setGeneratedData({
        questions,
        jobRole: role.trim(),
        experienceLevel,
        difficulty,
        mode,
        questionCount: Number(questionCount),
        interviewId,
      });

      toast.success(genResponse.message || 'AI questions generated successfully!');
    } catch (err) {
      // If unauthorized (token expired or rejected by server)
      if (err?.status === 401) {
        toast.error('Your session has expired. Please log in again.');
        navigate('/login', { state: { from: location } });
        return;
      }

      const message = err.message || 'Failed to generate questions. Please try again.';
      setServerError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEstimatedTime = () => {
    if (questionCount === 5) return '~15 minutes';
    if (questionCount === 10) return '~30 minutes';
    return '~45 minutes';
  };

  // Render Generated Questions View when available
  if (generatedData) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#777970]">
          <Link to="/dashboard" className="hover:text-[#245C46] flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <span>/</span>
          <button 
            onClick={() => setGeneratedData(null)}
            className="hover:text-[#245C46] text-[#777970]"
          >
            Interview Setup
          </button>
          <span>/</span>
          <span className="text-[#252923] font-medium">Generated Questions</span>
        </div>

        {/* Header Banner */}
        <div className="editorial-card p-6 sm:p-8 bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="badge-sage">
                  <Sparkles className="w-3.5 h-3.5 text-[#245C46]" />
                  Google Gemini Live Generation
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#F8F6F0] border border-[#E8E4DA] text-[#252923]">
                  {generatedData.questions.length} Questions Ready
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#252923]">
                AI Questions for {generatedData.jobRole}
              </h1>
              <p className="text-xs sm:text-sm text-[#777970]">
                Review the structured questions generated for your {generatedData.experienceLevel} level at {generatedData.difficulty} difficulty.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => setGeneratedData(null)}
                className="btn-secondary text-xs px-4 py-2.5 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Change Config</span>
              </button>
              <Link
                to="/dashboard"
                className="btn-secondary text-xs px-4 py-2.5 flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
              <button
                onClick={handleStartInterview}
                disabled={isStartingSession}
                className="btn-forest text-xs px-5 py-2.5 flex items-center justify-center gap-2 shadow-sm"
              >
                {isStartingSession ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Launching Session...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#DCE8DC]" />
                    <span>Start Interactive Interview</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Generated Questions List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-bold text-[#252923]">
              Curated Interview Questions
            </h2>
            <span className="text-xs text-[#777970] font-mono">
              Validated Structured Output
            </span>
          </div>

          {generatedData.questions.map((q) => (
            <div
              key={q.questionNumber}
              className="editorial-card p-5 sm:p-6 space-y-3 bg-white hover:border-[#245C46]/35 transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#245C46] text-white flex items-center justify-center font-display font-bold text-xs">
                  {q.questionNumber}
                </span>
                <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded bg-[#DCE8DC] text-[#245C46] border border-[#245C46]/20">
                  {q.topic}
                </span>
              </div>

              <p className="text-sm sm:text-base font-medium text-[#252923] leading-relaxed">
                {q.questionText}
              </p>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="editorial-card p-6 bg-[#F8F6F0] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-0.5 text-center sm:text-left">
            <h4 className="text-sm font-display font-bold text-[#252923]">
              Ready to Practice Your Technical Answers?
            </h4>
            <p className="text-xs text-[#777970]">
              Start the interactive text interview session now to submit and record your answers.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <Link
              to="/dashboard"
              className="btn-secondary text-xs px-4 py-2.5 flex items-center justify-center gap-2"
            >
              <span>View Dashboard</span>
            </Link>
            <button
              onClick={handleStartInterview}
              disabled={isStartingSession}
              className="btn-forest text-xs px-6 py-2.5 flex items-center justify-center gap-2 shadow-sm"
            >
              {isStartingSession ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Launching Session...</span>
                </>
              ) : (
                <>
                  <span>Start Interview Now</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#777970]">
        <Link to="/dashboard" className="hover:text-[#245C46] flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <span className="text-[#252923] font-medium">Interview Setup</span>
      </div>

      {/* Header Banner */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE8DC] border border-[#245C46]/20 text-[#245C46] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Session Customization & Gemini AI</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-[#252923] tracking-tight">
          Configure Your Mock Interview
        </h1>
        <p className="text-sm text-[#777970] max-w-2xl leading-relaxed">
          Select your target role, seniority level, assessment format, and length to customize the AI interviewer's questioning strategy.
        </p>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Configuration Form (8 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-8" noValidate>
          
          {serverError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="space-y-1">
                <span className="font-semibold">AI Question Generation Error:</span>
                <p className="leading-relaxed">{serverError}</p>
                {serverError.includes('GEMINI_API_KEY') && (
                  <p className="pt-1 text-[11px] text-rose-800">
                    💡 Please ensure <code className="bg-rose-100 px-1 py-0.5 rounded font-mono">GEMINI_API_KEY</code> is defined in your <code className="bg-rose-100 px-1 py-0.5 rounded font-mono">backend/.env</code> file.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Section 1: Job Role Selection */}
          <div className="editorial-card p-6 sm:p-7 space-y-4">
            <div className="space-y-1">
              <label 
                htmlFor="role-input" 
                className="block text-sm font-display font-bold text-[#252923]"
              >
                1. Target Job Role
              </label>
              <p className="text-xs text-[#777970]">
                Choose a suggested track or type any specialized software engineering title.
              </p>
            </div>

            {/* Role Quick Picks */}
            <div className="flex flex-wrap gap-2 pt-1">
              {PRESET_ROLES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setRole(preset);
                    if (errors.role) setErrors((prev) => ({ ...prev, role: '' }));
                  }}
                  className={`text-xs px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    role === preset
                      ? 'bg-[#245C46] text-white border-[#245C46] font-medium shadow-sm'
                      : 'bg-[#F8F6F0] text-[#252923] border-[#E8E4DA] hover:border-[#245C46]/40'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Custom Role Input */}
            <div className="pt-2">
              <input
                id="role-input"
                type="text"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  if (errors.role) setErrors((prev) => ({ ...prev, role: '' }));
                }}
                placeholder="Or enter a custom role (e.g., DevOps Engineer, ML Engineer)"
                className={`input-field ${errors.role ? 'border-rose-400 focus:border-rose-500' : ''}`}
              />
              {errors.role && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1 pt-1 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.role}</span>
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Experience Level */}
          <div className="editorial-card p-6 sm:p-7 space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-display font-bold text-[#252923]">
                2. Experience Level
              </label>
              <p className="text-xs text-[#777970]">
                Determines architectural scope and complexity of follow-up questions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {EXPERIENCE_LEVELS.map((lvl) => (
                <div
                  key={lvl.id}
                  onClick={() => setExperienceLevel(lvl.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    experienceLevel === lvl.id
                      ? 'bg-[#DCE8DC]/40 border-[#245C46] shadow-sm'
                      : 'bg-white border-[#E8E4DA] hover:border-[#245C46]/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-display font-bold text-[#252923]">
                      {lvl.label}
                    </span>
                    <input
                      type="radio"
                      name="experienceLevel"
                      checked={experienceLevel === lvl.id}
                      onChange={() => setExperienceLevel(lvl.id)}
                      className="accent-[#245C46]"
                    />
                  </div>
                  <p className="text-[11px] text-[#777970] leading-relaxed">
                    {lvl.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Interview Mode Selection */}
          <div className="editorial-card p-6 sm:p-7 space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-display font-bold text-[#252923]">
                3. Interview Mode
              </label>
              <p className="text-xs text-[#777970]">
                Select between rapid async text or live video/microphone atmosphere.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Option 1: Text Interview */}
              <div
                onClick={() => setMode('text')}
                className={`p-5 rounded-2xl border text-left cursor-pointer transition-all space-y-3 ${
                  mode === 'text'
                    ? 'bg-[#DCE8DC]/40 border-[#245C46] shadow-sm'
                    : 'bg-white border-[#E8E4DA] hover:border-[#245C46]/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#DCE8DC] text-[#245C46] flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'text'}
                    onChange={() => setMode('text')}
                    className="accent-[#245C46]"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-display font-bold text-[#252923]">
                    Text Interview Mode
                  </h4>
                  <p className="text-xs text-[#777970] pt-1 leading-relaxed">
                    Interactive chat-style technical dialogue. Includes structured markdown code formatting with zero microphone requirements.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#245C46] font-medium font-mono pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Async & Low-Pressure</span>
                </div>
              </div>

              {/* Option 2: Camera & Microphone */}
              <div
                onClick={() => setMode('audio_video')}
                className={`p-5 rounded-2xl border text-left cursor-pointer transition-all space-y-3 ${
                  mode === 'audio_video'
                    ? 'bg-[#DCE8DC]/40 border-[#245C46] shadow-sm'
                    : 'bg-white border-[#E8E4DA] hover:border-[#245C46]/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#DCE8DC] text-[#245C46] flex items-center justify-center">
                    <Video className="w-5 h-5" />
                  </div>
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'audio_video'}
                    onChange={() => setMode('audio_video')}
                    className="accent-[#245C46]"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-display font-bold text-[#252923]">
                    Camera + Microphone
                  </h4>
                  <p className="text-xs text-[#777970] pt-1 leading-relaxed">
                    Full audio-visual interview simulation. Practice speaking clearly, conversational pacing, and handling face-to-face follow-ups.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#C9713C] font-medium font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Real Virtual Setup</span>
                  </div>
                  <Link
                    to="/interview/devices"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[11px] font-semibold text-[#245C46] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Test Camera & Mic</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

            </div>
          </div>

          {/* Section 4: Difficulty Level */}
          <div className="editorial-card p-6 sm:p-7 space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-display font-bold text-[#252923]">
                4. Target Difficulty
              </label>
              <p className="text-xs text-[#777970]">
                Calibrate the depth of technical edge cases and distributed failure scenarios.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DIFFICULTIES.map((diff) => (
                <div
                  key={diff.id}
                  onClick={() => setDifficulty(diff.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    difficulty === diff.id
                      ? 'bg-[#DCE8DC]/40 border-[#245C46] shadow-sm'
                      : 'bg-white border-[#E8E4DA] hover:border-[#245C46]/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-display font-bold text-[#252923]">
                      {diff.label}
                    </span>
                    <input
                      type="radio"
                      name="difficulty"
                      checked={difficulty === diff.id}
                      onChange={() => setDifficulty(diff.id)}
                      className="accent-[#245C46]"
                    />
                  </div>
                  <p className="text-[11px] text-[#777970] leading-relaxed">
                    {diff.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Question Count */}
          <div className="editorial-card p-6 sm:p-7 space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-display font-bold text-[#252923]">
                5. Number of Questions
              </label>
              <p className="text-xs text-[#777970]">
                Choose how many questions to generate for this mock interview.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {QUESTION_COUNTS.map((item) => (
                <div
                  key={item.count}
                  onClick={() => setQuestionCount(item.count)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    questionCount === item.count
                      ? 'bg-[#DCE8DC]/40 border-[#245C46] shadow-sm'
                      : 'bg-white border-[#E8E4DA] hover:border-[#245C46]/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-display font-bold text-[#252923]">
                      {item.label}
                    </span>
                    <span className="text-[10px] font-mono text-[#245C46] bg-[#DCE8DC] px-2 py-0.5 rounded font-semibold">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#777970]">
                    {item.tag}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Submit Button */}
          <div className="block lg:hidden pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-forest w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating {questionCount} Questions with AI...</span>
                </>
              ) : (
                <>
                  <span>Generate Questions with Gemini</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>

        {/* Right Column: Live Configuration Summary Card (4 cols) */}
        <div className="lg:col-span-4 sticky top-24 space-y-6">
          <div className="editorial-card p-6 sm:p-7 space-y-6">
            
            <div className="flex items-center gap-2 pb-3 border-b border-[#E8E4DA]">
              <Layers className="w-4 h-4 text-[#245C46]" />
              <h3 className="text-sm font-display font-bold text-[#252923]">
                Configuration Summary
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#E8E4DA]">
                <span className="text-[#777970]">Target Role</span>
                <span className="font-semibold text-[#252923] text-right font-display max-w-[160px] truncate">
                  {role || 'Not specified'}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#E8E4DA]">
                <span className="text-[#777970]">Seniority Level</span>
                <span className="font-semibold text-[#245C46] bg-[#DCE8DC] px-2 py-0.5 rounded text-[11px]">
                  {experienceLevel}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#E8E4DA]">
                <span className="text-[#777970]">Interview Format</span>
                <span className="font-semibold text-[#252923] font-display">
                  {mode === 'text' ? 'Text Interview' : 'Camera + Mic'}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#E8E4DA]">
                <span className="text-[#777970]">Difficulty</span>
                <span className="font-semibold text-[#252923] font-display">
                  {difficulty}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#E8E4DA]">
                <span className="text-[#777970]">Questions</span>
                <span className="font-semibold text-[#252923] font-mono">
                  {questionCount} Questions
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#777970] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#245C46]" />
                  Estimated Time
                </span>
                <span className="font-semibold text-[#245C46] font-mono">
                  {getEstimatedTime()}
                </span>
              </div>
            </div>

            {/* Desktop Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-forest w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating {questionCount} Questions...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Questions with Gemini</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-[#777970] text-center leading-relaxed">
              Questions are created by the official Google Gemini SDK and customized to your level.
            </p>

          </div>
        </div>

      </div>

    </div>
  );
}
