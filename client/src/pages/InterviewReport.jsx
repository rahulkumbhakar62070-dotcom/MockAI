import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import interviewService from '../services/interviewService';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  LayoutDashboard,
  Loader2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Target,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  Lightbulb,
  History,
  Calendar,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function InterviewReport() {
  const { id } = useParams();

  // State
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [copiedQuestionNum, setCopiedQuestionNum] = useState(null);

  // Active question accordion filter (or expand all)
  const [expandedQuestions, setExpandedQuestions] = useState({});

  // Helper: Format Date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Helper: Status Badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Completed Round</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>In Progress</span>
          </span>
        );
      case 'abandoned':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-0.5 rounded-full bg-neutral-100 text-[#777970] border border-neutral-200">
            <AlertTriangle className="w-3 h-3 text-[#777970]" />
            <span>Ended Early</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#F8F6F0] text-[#777970] border border-[#E8E4DA]">
            <span>Not Started</span>
          </span>
        );
    }
  };

  // Fetch Report Data
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError('');
      const res = await interviewService.getInterviewReport(id);

      if (res?.data) {
        setReportData(res.data);

        // Initialize accordion states (expand first question by default)
        if (res.data.questions && res.data.questions.length > 0) {
          const initialExpanded = {};
          res.data.questions.forEach((q, idx) => {
            initialExpanded[q.questionNumber] = idx === 0;
          });
          setExpandedQuestions(initialExpanded);
        }
      }
    } catch (err) {
      setFetchError(err.message || 'Failed to retrieve interview report.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Trigger Session Evaluation
  const handleGenerateReport = async (forceReevaluate = false) => {
    try {
      setEvaluating(true);
      toast.loading('Analyzing answers with Gemini AI...', { id: 'eval-toast' });

      const res = await interviewService.evaluateSession(id, { forceReevaluate });

      if (res?.data) {
        toast.success('Interview evaluation complete!', { id: 'eval-toast' });
        // Refresh report data
        await fetchReport();
      }
    } catch (err) {
      toast.error(err.message || 'Evaluation encountered an error.', { id: 'eval-toast' });
    } finally {
      setEvaluating(false);
    }
  };

  // Toggle Accordion
  const toggleQuestion = (qNum) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [qNum]: !prev[qNum],
    }));
  };

  // Copy Suggested Answer to Clipboard
  const handleCopyAnswer = (text, qNum) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedQuestionNum(qNum);
    toast.success('Suggested answer copied to clipboard');
    setTimeout(() => {
      setCopiedQuestionNum(null);
    }, 2500);
  };

  // Helper: Dimension Color & Label
  const getScoreColor = (score) => {
    if (typeof score !== 'number' || isNaN(score)) return 'text-[#777970] bg-neutral-100 border-neutral-200';
    if (score >= 8.5) return 'text-[#245C46] bg-[#DCE8DC] border-[#245C46]/20';
    if (score >= 7.0) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 5.0) return 'text-amber-800 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  // Helper: Dimension percentage width
  const getDimensionWidth = (score) => {
    if (typeof score !== 'number' || isNaN(score)) return 0;
    return Math.max(0, Math.min(100, (score / 10) * 100));
  };

  // Helper: Performance Tier Name
  const getPerformanceTier = (score) => {
    if (typeof score !== 'number' || isNaN(score)) return null;
    if (score >= 90) return { title: 'Exceptional (Senior Mastery)', color: 'text-[#245C46] bg-[#DCE8DC]' };
    if (score >= 75) return { title: 'Proficient (Strong Candidate)', color: 'text-emerald-700 bg-emerald-50' };
    if (score >= 60) return { title: 'Developing (Core Potential)', color: 'text-amber-800 bg-amber-50' };
    return { title: 'Foundational (Needs Polish)', color: 'text-rose-700 bg-rose-50' };
  };

  // -------------------------------------------------------------
  // RENDERING: Loading State
  // -------------------------------------------------------------
  if (loading && !reportData) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center space-y-4 px-4 bg-[#F8F6F0]">
        <div className="w-14 h-14 rounded-2xl bg-[#DCE8DC] text-[#245C46] flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-display font-bold text-[#252923]">
            Loading Interview Report
          </h3>
          <p className="text-xs text-[#777970]">
            Retrieving interview answers and evaluation metrics...
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDERING: Error State
  // -------------------------------------------------------------
  if (fetchError || !reportData?.interview) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-[#252923]">
            Unable to Load Report
          </h2>
          <p className="text-sm text-[#777970] max-w-md mx-auto leading-relaxed">
            {fetchError || 'The interview session was not found or could not be accessed.'}
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
          <Link to="/interview/history" className="btn-secondary text-xs px-5 py-2.5 inline-flex items-center gap-2">
            <History className="w-4 h-4 text-[#245C46]" />
            <span>Back to Interview History</span>
          </Link>
          <Link to="/dashboard" className="btn-forest text-xs px-6 py-2.5 inline-flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            <span>Candidate Dashboard</span>
          </Link>
          <button
            onClick={() => fetchReport()}
            className="btn-secondary text-xs px-5 py-2.5 inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const { interview, report, questions } = reportData;
  const hasReport = Boolean(report && report.status === 'completed');
  const answeredCount = questions?.filter((q) => q.userAnswer && q.userAnswer.trim().length > 0).length || 0;
  const totalQuestions = questions?.length || 0;
  const tierInfo = report?.summaryScore !== null && report?.summaryScore !== undefined
    ? getPerformanceTier(report.summaryScore)
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Navigation Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-[#777970] flex-wrap">
          <Link
            to="/interview/history"
            className="hover:text-[#245C46] flex items-center gap-1 font-medium transition-colors"
          >
            <History className="w-3.5 h-3.5 text-[#245C46]" />
            <span>Interview History</span>
          </Link>
          <span>/</span>
          <Link
            to="/dashboard"
            className="hover:text-[#245C46] flex items-center gap-1 transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <span>/</span>
          <span className="text-[#252923] font-medium">Performance Report</span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
          <Link
            to="/interview/history"
            className="btn-secondary text-xs px-3.5 py-1.5 flex-1 sm:flex-none flex items-center justify-center gap-1.5"
          >
            <History className="w-3.5 h-3.5 text-[#245C46]" />
            <span>Back to History</span>
          </Link>
          <Link
            to={`/interview/session/${interview._id}`}
            className="btn-secondary text-xs px-3.5 py-1.5 flex-1 sm:flex-none flex items-center justify-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Review Transcript</span>
          </Link>
          <Link
            to="/interview/setup"
            className="btn-forest text-xs px-4 py-1.5 w-full sm:w-auto flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Practice Round</span>
          </Link>
        </div>
      </div>

      {/* Hero Header Card: Section A - Interview Summary */}
      <div className="editorial-card p-5 sm:p-8 bg-white space-y-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="badge-sage text-xs">
                {interview.experienceLevel}
              </span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#F8F6F0] border border-[#E8E4DA] text-[#252923] font-medium">
                {interview.difficulty} Difficulty
              </span>
              {/* Interview Date Display */}
              <span className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#F8F6F0] border border-[#E8E4DA] text-[#777970] font-medium">
                <Calendar className="w-3 h-3 text-[#245C46]" />
                <span>{formatDate(interview.createdAt || report?.generatedAt)}</span>
              </span>
              {/* Interview Status Badge */}
              {getStatusBadge(interview.status)}
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#252923]">
              AI Evaluation Report: {interview.role}
            </h1>

            <p className="text-xs sm:text-sm text-[#777970] max-w-2xl leading-relaxed">
              Comprehensive technical evaluation conducted across relevance, technical accuracy, completeness, and clarity.
            </p>
          </div>

          {/* Quick Metrics Badge Group */}
          <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-4 bg-[#F8F6F0] p-3 sm:p-4 rounded-xl border border-[#E8E4DA] w-full sm:w-auto shrink-0">
            <div className="space-y-0.5 text-center px-1 sm:px-2">
              <span className="text-[10px] sm:text-[11px] font-mono text-[#777970] uppercase">Answered</span>
              <p className="text-xs sm:text-sm font-display font-bold text-[#245C46]">
                {answeredCount} / {totalQuestions}
              </p>
            </div>
            <div className="w-px h-8 bg-[#E8E4DA] hidden sm:block"></div>
            <div className="space-y-0.5 text-center px-1 sm:px-2">
              <span className="text-[10px] sm:text-[11px] font-mono text-[#777970] uppercase">Evaluated</span>
              <p className="text-xs sm:text-sm font-display font-bold text-[#252923]">
                {reportData.interview?.evaluatedCount || (hasReport ? answeredCount : 0)} / {totalQuestions}
              </p>
            </div>
            <div className="w-px h-8 bg-[#E8E4DA] hidden sm:block"></div>
            <div className="space-y-0.5 text-center px-1 sm:px-2">
              <span className="text-[10px] sm:text-[11px] font-mono text-[#777970] uppercase">Final Score</span>
              <p className="text-xs sm:text-sm font-display font-bold text-[#245C46]">
                {report?.summaryScore !== null && report?.summaryScore !== undefined
                  ? `${report.summaryScore}%`
                  : 'Pending'}
              </p>
            </div>
          </div>
        </div>

        {/* Action button if report is not yet generated */}
        {!hasReport && (
          <div className="p-5 rounded-xl bg-[#F0F5F2] border border-[#245C46]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-display font-bold text-[#245C46] flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>AI Evaluation Ready for Generation</span>
              </h4>
              <p className="text-xs text-[#777970] max-w-xl">
                {answeredCount > 0
                  ? 'Your submitted responses have been recorded. Generate your dimensional evaluation, score breakdown, and suggested model answers with Gemini.'
                  : 'No answers were submitted during this session. At least one response is required for AI evaluation.'}
              </p>
            </div>
            <button
              onClick={() => handleGenerateReport(false)}
              disabled={evaluating || answeredCount === 0}
              className="btn-forest text-xs px-6 py-2.5 shrink-0 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {evaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Answers...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Evaluation Report</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Section C: Overall Feedback and Macro Syntheses */}
      {hasReport && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Overall Performance Score Card (5 cols) */}
          <div className="lg:col-span-5 editorial-card p-6 bg-white space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] font-mono font-semibold text-[#777970] uppercase tracking-wider">
                  Performance Index
                </span>
                <h3 className="text-base font-display font-bold text-[#252923]">
                  Overall Assessment
                </h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#DCE8DC] text-[#245C46] flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
            </div>

            {/* Score Display Logic */}
            {report.summaryScore !== null ? (
              <div className="space-y-4 text-center py-2">
                <div className="inline-flex flex-col items-center justify-center w-36 h-36 rounded-full bg-[#F8F6F0] border-4 border-[#245C46] shadow-inner mx-auto">
                  <span className="text-4xl font-display font-extrabold text-[#252923] tracking-tight">
                    {report.summaryScore}
                  </span>
                  <span className="text-[11px] font-mono text-[#777970] uppercase tracking-wider">
                    out of 100
                  </span>
                </div>

                {tierInfo && (
                  <div>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${tierInfo.color}`}>
                      {tierInfo.title}
                    </span>
                  </div>
                )}

                <p className="text-[11px] text-[#777970] leading-relaxed max-w-xs mx-auto">
                  Score represents the calibrated average of all 4 dimensions across all evaluated questions.
                </p>
              </div>
            ) : (
              /* Honest Incomplete Explanation */
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-left">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>Summary Score Omitted</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  A summary score is only calculated when all questions are answered and the full session is concluded. Because this session was ended early or has unsubmitted questions, individual answer evaluations are provided below without a fabricated overall score.
                </p>
              </div>
            )}

            {/* Re-evaluation button for candidate */}
            <div className="pt-2 border-t border-[#E8E4DA] flex items-center justify-between">
              <span className="text-xs text-[#777970]">
                Generated {formatDate(report.generatedAt)}
              </span>
              <button
                onClick={() => handleGenerateReport(true)}
                disabled={evaluating}
                className="text-xs font-semibold text-[#245C46] hover:underline flex items-center gap-1"
              >
                {evaluating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Re-evaluate</span>
              </button>
            </div>
          </div>

          {/* Right Column: Executive Synthesis, Strengths & Focus Topics (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Overall Feedback Narrative */}
            <div className="editorial-card p-6 bg-white space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#245C46] font-display uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Executive AI Evaluation</span>
              </div>
              <p className="text-xs sm:text-sm text-[#252923] leading-relaxed whitespace-pre-line">
                {report.overallFeedback}
              </p>
            </div>

            {/* Macro Strengths & Growth Areas Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Standout Strengths */}
              <div className="editorial-card p-5 bg-white space-y-3">
                <div className="flex items-center gap-2 text-xs font-display font-bold text-[#245C46]">
                  <CheckCircle2 className="w-4 h-4 text-[#245C46]" />
                  <span>Key Strengths</span>
                </div>
                <ul className="space-y-2 text-xs text-[#252923]">
                  {report.strengths && report.strengths.length > 0 ? (
                    report.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#245C46] mt-1.5 shrink-0"></span>
                        <span className="leading-relaxed">{str}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[#777970] italic">No specific macro strengths recorded.</li>
                  )}
                </ul>
              </div>

              {/* Priority Growth Areas */}
              <div className="editorial-card p-5 bg-white space-y-3">
                <div className="flex items-center gap-2 text-xs font-display font-bold text-[#C9713C]">
                  <Target className="w-4 h-4 text-[#C9713C]" />
                  <span>Growth Areas</span>
                </div>
                <ul className="space-y-2 text-xs text-[#252923]">
                  {report.commonImprovements && report.commonImprovements.length > 0 ? (
                    report.commonImprovements.map((imp, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C9713C] mt-1.5 shrink-0"></span>
                        <span className="leading-relaxed">{imp}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[#777970] italic">Review individual question feedback below.</li>
                  )}
                </ul>
              </div>

            </div>

            {/* Recommended Practice Topics */}
            {report.suggestedTopics && report.suggestedTopics.length > 0 && (
              <div className="editorial-card p-5 bg-white space-y-3">
                <div className="flex items-center gap-2 text-xs font-display font-bold text-[#252923]">
                  <BookOpen className="w-4 h-4 text-[#245C46]" />
                  <span>Recommended Practice Topics</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {report.suggestedTopics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium px-3 py-1 rounded-lg bg-[#F8F6F0] text-[#252923] border border-[#E8E4DA] hover:border-[#245C46]/35 transition-colors"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* Section B: Per-Question Detailed Breakdown */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-display font-bold text-[#252923]">
              Question-by-Question Evaluation
            </h2>
            <p className="text-xs text-[#777970]">
              Detailed dimensional breakdown, concrete feedback, strengths, and expert model answers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const allExpanded = {};
                questions?.forEach((q) => {
                  allExpanded[q.questionNumber] = true;
                });
                setExpandedQuestions(allExpanded);
              }}
              className="text-xs font-semibold text-[#245C46] hover:underline"
            >
              Expand All
            </button>
            <span className="text-[#E8E4DA]">|</span>
            <button
              onClick={() => setExpandedQuestions({})}
              className="text-xs font-semibold text-[#777970] hover:underline"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {questions?.map((q) => {
            const hasAnswer = Boolean(q.userAnswer && q.userAnswer.trim().length > 0);
            const hasEval = Boolean(q.evaluation && typeof q.evaluation.overallScore === 'number');
            const isExpanded = Boolean(expandedQuestions[q.questionNumber]);

            return (
              <div
                key={q.questionNumber}
                className="editorial-card bg-white overflow-hidden transition-all duration-200"
              >
                {/* Question Header Accordion Trigger */}
                <div
                  onClick={() => toggleQuestion(q.questionNumber)}
                  className="p-5 sm:p-6 flex items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#F8F6F0]/50 transition-colors select-none"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <span className="w-8 h-8 rounded-xl bg-[#245C46] text-white flex items-center justify-center font-display font-bold text-xs shrink-0 shadow-sm">
                      {q.questionNumber}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#DCE8DC] text-[#245C46] font-medium border border-[#245C46]/20">
                          {q.topic || q.category || 'Domain'}
                        </span>
                        {hasEval ? (
                          <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full border ${getScoreColor(q.evaluation.overallScore)}`}>
                            Score: {q.evaluation.overallScore} / 10
                          </span>
                        ) : hasAnswer ? (
                          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            Answered (Pending Evaluation)
                          </span>
                        ) : (
                          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-[#777970] border border-neutral-200">
                            Unanswered
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-display font-bold text-[#252923] text-left">
                        {q.questionText || q.question}
                      </h4>
                    </div>
                  </div>

                  <div className="text-[#777970] shrink-0 pt-1 sm:pt-0">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[#245C46]" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>

                {/* Expanded Question Body */}
                {isExpanded && (
                  <div className="px-5 pb-6 sm:px-6 space-y-6 border-t border-[#E8E4DA] pt-5">
                    
                    {/* User's Submitted Answer */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#777970]">
                        <span>Your Submitted Answer</span>
                        {q.answeredAt && (
                          <span>Submitted {new Date(q.answeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                      <div className="p-4 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA] text-xs sm:text-sm text-[#252923] whitespace-pre-wrap leading-relaxed font-sans">
                        {hasAnswer ? (
                          q.userAnswer
                        ) : (
                          <span className="text-[#777970] italic">
                            No response was submitted for this question during the interview.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* AI Dimensional Evaluation Breakdown */}
                    {hasEval ? (
                      <div className="space-y-6">
                        
                        {/* Optional Top-level Feedback if present */}
                        {q.evaluation.feedback && (
                          <div className="p-3.5 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA] text-xs text-[#252923] leading-relaxed">
                            <span className="font-bold text-[#245C46]">Evaluator Note: </span>
                            {q.evaluation.feedback}
                          </div>
                        )}

                        {/* 4 Dimension Score Bars */}
                        <div className="space-y-3">
                          <h5 className="text-xs font-mono font-bold text-[#777970] uppercase tracking-wider">
                            Dimensional Score Breakdown (0 - 10 Scale)
                          </h5>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            
                            {/* Dimension 1: Relevance */}
                            <div className="p-4 rounded-xl bg-white border border-[#E8E4DA] space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-display font-bold text-[#252923]">Relevance</span>
                                <span className="font-mono font-bold text-[#245C46]">
                                  {q.evaluation.relevance?.score ?? '—'} / 10
                                </span>
                              </div>
                              <div className="w-full bg-[#E8E4DA] h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-[#245C46] h-full rounded-full transition-all duration-300"
                                  style={{ width: `${getDimensionWidth(q.evaluation.relevance?.score)}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-[#777970] leading-relaxed">
                                {q.evaluation.relevance?.feedback}
                              </p>
                            </div>

                            {/* Dimension 2: Technical Accuracy */}
                            <div className="p-4 rounded-xl bg-white border border-[#E8E4DA] space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-display font-bold text-[#252923]">Technical Accuracy</span>
                                <span className="font-mono font-bold text-[#245C46]">
                                  {q.evaluation.technicalAccuracy?.score ?? '—'} / 10
                                </span>
                              </div>
                              <div className="w-full bg-[#E8E4DA] h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-[#245C46] h-full rounded-full transition-all duration-300"
                                  style={{ width: `${getDimensionWidth(q.evaluation.technicalAccuracy?.score)}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-[#777970] leading-relaxed">
                                {q.evaluation.technicalAccuracy?.feedback}
                              </p>
                            </div>

                            {/* Dimension 3: Completeness */}
                            <div className="p-4 rounded-xl bg-white border border-[#E8E4DA] space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-display font-bold text-[#252923]">Completeness</span>
                                <span className="font-mono font-bold text-[#245C46]">
                                  {q.evaluation.completeness?.score ?? '—'} / 10
                                </span>
                              </div>
                              <div className="w-full bg-[#E8E4DA] h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-[#245C46] h-full rounded-full transition-all duration-300"
                                  style={{ width: `${getDimensionWidth(q.evaluation.completeness?.score)}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-[#777970] leading-relaxed">
                                {q.evaluation.completeness?.feedback}
                              </p>
                            </div>

                            {/* Dimension 4: Clarity & Communication */}
                            <div className="p-4 rounded-xl bg-white border border-[#E8E4DA] space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-display font-bold text-[#252923]">Clarity & Communication</span>
                                <span className="font-mono font-bold text-[#245C46]">
                                  {q.evaluation.communication?.score ?? '—'} / 10
                                </span>
                              </div>
                              <div className="w-full bg-[#E8E4DA] h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-[#245C46] h-full rounded-full transition-all duration-300"
                                  style={{ width: `${getDimensionWidth(q.evaluation.communication?.score)}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-[#777970] leading-relaxed">
                                {q.evaluation.communication?.feedback}
                              </p>
                            </div>

                          </div>
                        </div>

                        {/* Strengths & Areas for Improvement for this specific answer */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                          
                          {/* Answer Strengths */}
                          <div className="p-4 rounded-xl bg-[#F0F5F2] border border-[#245C46]/20 space-y-2">
                            <span className="text-xs font-display font-bold text-[#245C46] flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Answer Strengths</span>
                            </span>
                            <ul className="space-y-1.5 text-xs text-[#252923]">
                              {q.evaluation.strengths && q.evaluation.strengths.length > 0 ? (
                                q.evaluation.strengths.map((str, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5">
                                    <span className="text-[#245C46] font-bold">•</span>
                                    <span>{str}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-[#777970] italic">Fundamental understanding demonstrated.</li>
                              )}
                            </ul>
                          </div>

                          {/* Areas for Improvement */}
                          <div className="p-4 rounded-xl bg-[#E99564]/10 border border-[#E99564]/30 space-y-2">
                            <span className="text-xs font-display font-bold text-[#C9713C] flex items-center gap-1.5">
                              <Lightbulb className="w-3.5 h-3.5" />
                              <span>Areas for Improvement</span>
                            </span>
                            <ul className="space-y-1.5 text-xs text-[#252923]">
                              {q.evaluation.improvements && q.evaluation.improvements.length > 0 ? (
                                q.evaluation.improvements.map((imp, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5">
                                    <span className="text-[#C9713C] font-bold">•</span>
                                    <span>{imp}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-[#777970] italic">Solid response with no critical deficiencies.</li>
                              )}
                            </ul>
                          </div>

                        </div>

                        {/* High-Quality Suggested Reference Answer */}
                        {q.evaluation.suggestedAnswer && (
                          <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#245C46]/30 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-[#DCE8DC] text-[#245C46] flex items-center justify-center">
                                  <Sparkles className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-display font-bold text-[#245C46]">
                                  Suggested Improvements & Optimal Model Answer
                                </span>
                              </div>
                              <button
                                onClick={() => handleCopyAnswer(q.evaluation.suggestedAnswer, q.questionNumber)}
                                className="text-xs font-medium text-[#777970] hover:text-[#245C46] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-[#F8F6F0] transition-colors"
                              >
                                {copiedQuestionNum === q.questionNumber ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-[#245C46]" />
                                    <span className="text-[#245C46]">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-xs sm:text-sm text-[#252923] leading-relaxed whitespace-pre-wrap font-sans bg-[#F8F6F0] p-3.5 rounded-lg border border-[#E8E4DA]">
                              {q.evaluation.suggestedAnswer}
                            </p>
                          </div>
                        )}

                      </div>
                    ) : (
                      /* Not evaluated state */
                      <div className="p-4 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA] text-center text-xs text-[#777970] space-y-1">
                        <p>
                          {hasAnswer
                            ? 'Answer submitted. Click "Generate Evaluation Report" above to evaluate with Gemini.'
                            : 'This question was skipped and has no response to evaluate.'}
                        </p>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Sticky-style Action Banner */}
      <div className="editorial-card p-6 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-sm font-display font-bold text-[#252923]">
            Ready for your next mock interview?
          </h4>
          <p className="text-xs text-[#777970]">
            Continuous practice sharpens your ability to articulate trade-offs under real pressure.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <Link
            to="/interview/history"
            className="btn-secondary text-xs px-4 py-2.5 flex-1 sm:flex-none flex items-center justify-center gap-2"
          >
            <History className="w-4 h-4 text-[#245C46]" />
            <span>Interview History</span>
          </Link>
          <Link
            to="/dashboard"
            className="btn-secondary text-xs px-4 py-2.5 flex-1 sm:flex-none flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/interview/setup"
            className="btn-forest text-xs px-5 py-2.5 flex-1 sm:flex-none flex items-center justify-center gap-2"
          >
            <span>Configure Next Session</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

    </div>
  );
}
