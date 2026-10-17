import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import interviewService from '../services/interviewService';
import { 
  ArrowLeft,
  Clock, 
  Sparkles, 
  Plus, 
  MessageSquare, 
  Video, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  ArrowRight,
  BarChart3,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function InterviewHistory() {

  const [interviews, setInterviews] = useState([]);
  const [summary, setSummary] = useState({
    totalInterviews: 0,
    completedCount: 0,
    inProgressCount: 0,
    averageScore: null,
  });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'completed' | 'in_progress' | 'configured'

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError('');
      const res = await interviewService.getInterviewHistory();

      if (res?.data) {
        setInterviews(res.data.interviews || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to load interview history.';
      setFetchError(message);
      toast.error(message, { id: 'history-fetch-error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Filtered interviews according to selected tab
  const filteredInterviews = interviews.filter((item) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'completed') return item.status === 'completed';
    if (statusFilter === 'in_progress') return item.status === 'in_progress';
    if (statusFilter === 'configured') return item.status === 'configured';
    if (statusFilter === 'abandoned') return item.status === 'abandoned';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#777970] hover:text-[#245C46] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
          <Link
            to="/interview/analytics"
            className="btn-secondary text-xs px-3.5 py-2 flex-1 sm:flex-none flex items-center justify-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#245C46]" />
            <span>Performance Analytics</span>
          </Link>
          <Link
            to="/interview/setup"
            className="btn-forest text-xs px-4 py-2 flex-1 sm:flex-none flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Start New Interview</span>
          </Link>
        </div>
      </div>

      {/* Page Header */}
      <div className="space-y-2 pb-6 border-b border-[#E8E4DA]">
        <div className="flex items-center gap-2">
          <span className="badge-sage">
            <Clock className="w-3.5 h-3.5 text-[#245C46]" />
            Session Archives
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-[#252923] tracking-tight">
          Interview History
        </h1>
        <p className="text-sm text-[#777970] max-w-2xl leading-relaxed">
          Inspect all your previous mock rounds, track performance scores over time, review past question transcripts, and view AI evaluation reports.
        </p>
      </div>

      {/* Aggregate Honest Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
        
        {/* Metric 1: Total Rounds */}
        <div className="editorial-card p-3.5 sm:p-5 space-y-1">
          <div className="text-[11px] font-semibold text-[#777970] uppercase tracking-wider font-display flex items-center justify-between">
            <span>Total Rounds</span>
            <Layers className="w-3.5 h-3.5 text-[#245C46]" />
          </div>
          <div className="text-2xl sm:text-3xl font-display font-bold text-[#252923]">
            {loading ? '...' : summary.totalInterviews}
          </div>
          <p className="text-[11px] text-[#777970]">Sessions configured</p>
        </div>

        {/* Metric 2: Completed Rounds */}
        <div className="editorial-card p-4 sm:p-5 space-y-1">
          <div className="text-[11px] font-semibold text-[#777970] uppercase tracking-wider font-display flex items-center justify-between">
            <span>Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-display font-bold text-[#252923]">
            {loading ? '...' : summary.completedCount}
          </div>
          <p className="text-[11px] text-[#777970]">Full rounds finished</p>
        </div>

        {/* Metric 3: In Progress */}
        <div className="editorial-card p-4 sm:p-5 space-y-1">
          <div className="text-[11px] font-semibold text-[#777970] uppercase tracking-wider font-display flex items-center justify-between">
            <span>In Progress</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-display font-bold text-[#252923]">
            {loading ? '...' : summary.inProgressCount}
          </div>
          <p className="text-[11px] text-[#777970]">Active or ready to resume</p>
        </div>

        {/* Metric 4: Average Score */}
        <div className="editorial-card p-4 sm:p-5 space-y-1">
          <div className="text-[11px] font-semibold text-[#777970] uppercase tracking-wider font-display flex items-center justify-between">
            <span>Average Score</span>
            <Award className="w-3.5 h-3.5 text-[#245C46]" />
          </div>
          <div className="text-2xl sm:text-3xl font-display font-bold text-[#252923]">
            {loading ? '...' : (summary.averageScore !== null ? `${summary.averageScore}%` : '—')}
          </div>
          <p className="text-[11px] text-[#777970]">
            {summary.averageScore !== null ? 'Evaluated completed rounds' : 'No evaluations yet'}
          </p>
        </div>

      </div>

      {/* Filter Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-white border border-[#E8E4DA] rounded-xl shadow-xs overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-[#245C46] text-white shadow-xs'
                : 'text-[#777970] hover:text-[#252923]'
            }`}
          >
            All Sessions ({interviews.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'completed'
                ? 'bg-[#245C46] text-white shadow-xs'
                : 'text-[#777970] hover:text-[#252923]'
            }`}
          >
            Completed ({interviews.filter((i) => i.status === 'completed').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'in_progress'
                ? 'bg-[#245C46] text-white shadow-xs'
                : 'text-[#777970] hover:text-[#252923]'
            }`}
          >
            In Progress ({interviews.filter((i) => i.status === 'in_progress').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('configured')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'configured'
                ? 'bg-[#245C46] text-white shadow-xs'
                : 'text-[#777970] hover:text-[#252923]'
            }`}
          >
            Not Started ({interviews.filter((i) => i.status === 'configured').length})
          </button>
        </div>

        <span className="text-xs text-[#777970] font-mono">
          Showing {filteredInterviews.length} of {interviews.length} sessions
        </span>
      </div>

      {/* Error State Banner */}
      {fetchError && (
        <div className="editorial-card p-5 border-rose-300 bg-rose-50 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Unable to load interview history</p>
              <p className="text-xs text-rose-700 mt-0.5">{fetchError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchHistory}
            className="btn-secondary text-xs px-4 py-2 flex items-center justify-center gap-1.5 border-rose-300 hover:bg-rose-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton State */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((skeleton) => (
            <div key={skeleton} className="editorial-card p-6 animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E8E4DA]/60" />
                  <div className="space-y-2">
                    <div className="w-48 h-4 bg-[#E8E4DA]/80 rounded" />
                    <div className="w-32 h-3 bg-[#E8E4DA]/50 rounded" />
                  </div>
                </div>
                <div className="w-24 h-7 bg-[#E8E4DA]/60 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : interviews.length === 0 ? (
        /* Empty State: No Mock Interviews Created Yet */
        <div className="editorial-card p-8 sm:p-14 text-center space-y-5 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#DCE8DC] text-[#245C46] flex items-center justify-center mx-auto shadow-xs">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold text-[#252923]">
              No Mock Interviews on Record
            </h2>
            <p className="text-xs sm:text-sm text-[#777970] leading-relaxed max-w-md mx-auto">
              You haven&apos;t completed or started any practice rounds yet. Configure your job role, question count, and experience level to begin practicing with AI.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/interview/setup"
              className="btn-forest text-sm px-6 py-3 inline-flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Configure Your First Session</span>
            </Link>
          </div>
        </div>
      ) : filteredInterviews.length === 0 ? (
        /* Empty Filter State */
        <div className="editorial-card p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-[#252923]">
            No interviews found matching status: <span className="capitalize font-mono text-[#245C46]">&ldquo;{statusFilter}&rdquo;</span>
          </p>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="btn-secondary text-xs px-4 py-2"
          >
            Reset Status Filter
          </button>
        </div>
      ) : (
        /* Interviews List */
        <div className="space-y-4">
          {filteredInterviews.map((item) => {
            const hasScore = item.hasScore || (item.report && typeof item.report.summaryScore === 'number' && !isNaN(item.report.summaryScore));
            const scoreValue = hasScore ? (item.score ?? item.report?.summaryScore) : null;
            const isCompleted = item.status === 'completed';
            const isInProgress = item.status === 'in_progress';
            const isConfigured = item.status === 'configured';
            const isAbandoned = item.status === 'abandoned';

            // Clean formatted date
            const createdDate = new Date(item.createdAt);
            const formattedDate = createdDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const formattedTime = createdDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            return (
              <div
                key={item._id}
                className="editorial-card p-5 sm:p-6 hover:border-[#245C46]/40 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Left: Role Icon & Primary Details */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#DCE8DC] text-[#245C46] flex items-center justify-center shrink-0 shadow-2xs">
                      {item.mode === 'text' ? (
                        <MessageSquare className="w-5 h-5" />
                      ) : (
                        <Video className="w-5 h-5" />
                      )}
                    </div>
                    
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-display font-bold text-[#252923] truncate">
                          {item.role}
                        </h3>
                        <span className="badge-sage text-[10px] py-0.5 font-medium">
                          {item.experienceLevel}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F8F6F0] border border-[#E8E4DA] text-[#252923] font-medium">
                          {item.difficulty}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F8F6F0] border border-[#E8E4DA] text-[#777970] capitalize">
                          {item.mode === 'text' ? 'Text Mode' : 'Audio & Video'}
                        </span>
                      </div>

                      {/* Date & Metadata */}
                      <div className="text-xs text-[#777970] flex items-center gap-2 sm:gap-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#777970]" />
                          <span>{formattedDate} at {formattedTime}</span>
                        </span>
                        <span>•</span>
                        <span>{item.questionCount} Questions</span>
                        {item.answeredCount !== undefined && item.answeredCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{item.answeredCount} answered</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Score Pill & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
                    
                    {/* Status Badge */}
                    {isCompleted ? (
                      <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-medium border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Completed</span>
                      </span>
                    ) : isInProgress ? (
                      <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-medium border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>In Progress</span>
                      </span>
                    ) : isConfigured ? (
                      <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-neutral-100 text-[#777970] font-medium border border-neutral-200">
                        Not Started
                      </span>
                    ) : (
                      <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-neutral-100 text-[#777970] font-medium border border-neutral-200">
                        Ended Early
                      </span>
                    )}

                    {/* Final Score (Honest score display, only if actually evaluated) */}
                    {hasScore ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#DCE8DC] text-[#245C46] border border-[#245C46]/25 shadow-2xs">
                        <Award className="w-3.5 h-3.5 text-[#245C46]" />
                        <span>Score: {scoreValue}%</span>
                      </div>
                    ) : isCompleted ? (
                      <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-neutral-50 text-[#777970] border border-neutral-200">
                        Score: Pending
                      </span>
                    ) : null}

                    {/* Contextual Action Button */}
                    {isCompleted || isAbandoned ? (
                      <>
                        <Link
                          to={`/interview/${item._id}/report`}
                          className="btn-forest text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-xs"
                        >
                          <Sparkles className="w-3 h-3 text-emerald-200" />
                          <span>{item.report?.status === 'completed' || hasScore ? 'View Report' : 'Evaluate Round'}</span>
                        </Link>
                        <Link
                          to={`/interview/session/${item._id}`}
                          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                          title="Review questions and answer transcript"
                        >
                          <FileText className="w-3 h-3 text-[#777970]" />
                          <span>Transcript</span>
                        </Link>
                      </>
                    ) : isInProgress ? (
                      <Link
                        to={`/interview/session/${item._id}`}
                        className="btn-forest text-xs px-4 py-1.5 flex items-center gap-1.5 shadow-xs"
                      >
                        <span>Resume Interview</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <Link
                        to={`/interview/session/${item._id}`}
                        className="btn-forest text-xs px-4 py-1.5 flex items-center gap-1.5 shadow-xs"
                      >
                        <span>Start Interview</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
