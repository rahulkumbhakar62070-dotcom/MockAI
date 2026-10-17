import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import interviewService from '../services/interviewService';
import { 
  Sparkles, 
  Plus, 
  Clock, 
  BarChart3, 
  Award, 
  CheckCircle2, 
  ArrowRight, 
  MessageSquare, 
  Video, 
  BookOpen, 
  User, 
  LogOut, 
  AlertCircle,
  TrendingUp,
  RotateCcw,
  History,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Dashboard Data State
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  
  // Recent interviews from history endpoint
  const [recentInterviews, setRecentInterviews] = useState([]);
  
  // Analytics aggregate & trend data from analytics endpoint
  const [analytics, setAnalytics] = useState({
    summary: {
      totalInterviews: 0,
      completedInterviews: 0,
      evaluatedInterviews: 0,
      averageScore: null,
      bestScore: null,
    },
    trendData: [],
    comparison: null,
    roleAnalytics: [],
  });

  // Hover state for compact chart tooltip
  const [activeChartPoint, setActiveChartPoint] = useState(null);

  // Fetch Dashboard Data from real authenticated endpoints in parallel
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError('');

      const [analyticsRes, historyRes] = await Promise.all([
        interviewService.getPerformanceAnalytics(),
        interviewService.getInterviewHistory(),
      ]);

      if (analyticsRes?.data) {
        setAnalytics(analyticsRes.data);
      }

      if (historyRes?.data?.interviews) {
        // Take top 5 newest sessions for recent activity list
        setRecentInterviews(historyRes.data.interviews.slice(0, 5));
      }
    } catch (err) {
      setFetchError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully.');
    navigate('/');
  };

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

  // Compact Chart Geometry Calculations (viewBox: 0 0 600 200)
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = { top: 20, right: 25, bottom: 35, left: 40 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  const trendPoints = useMemo(() => {
    const list = analytics.trendData || [];
    if (list.length < 2) return [];
    return list.map((item, idx) => {
      const x = padding.left + (idx / (list.length - 1)) * graphWidth;
      const score = Math.max(0, Math.min(100, item.score));
      const y = padding.top + (1 - score / 100) * graphHeight;
      return { x, y, ...item };
    });
  }, [analytics.trendData, graphHeight, graphWidth, padding.left, padding.top]);

  // Construct SVG Path
  const linePath = useMemo(() => {
    if (trendPoints.length < 2) return '';
    return trendPoints.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  }, [trendPoints]);

  // Construct Area Path for gradient
  const areaPath = useMemo(() => {
    if (trendPoints.length < 2) return '';
    const bottomY = padding.top + graphHeight;
    const first = trendPoints[0];
    const last = trendPoints[trendPoints.length - 1];
    return `${linePath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [linePath, trendPoints, graphHeight, padding.top]);

  const { summary, comparison } = analytics;
  const isZeroState = summary.totalInterviews === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-10">
      
      {/* Top Header & Greeting Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E8E4DA]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="badge-sage">
              <Sparkles className="w-3.5 h-3.5 text-[#245C46]" />
              Candidate Workspace
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-[#252923] tracking-tight">
            Welcome back, {user?.name || 'Engineer'}
          </h1>
          <p className="text-xs sm:text-sm text-[#777970]">
            Track your interview readiness, review session configurations, and analyze your performance trends.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          <Link
            to="/interview/history"
            className="btn-secondary text-xs px-3.5 py-2.5 flex-1 sm:flex-none flex items-center justify-center gap-1.5"
          >
            <History className="w-4 h-4 text-[#245C46]" />
            <span>Interview History</span>
          </Link>
          <Link
            to="/interview/analytics"
            className="btn-secondary text-xs px-3.5 py-2.5 flex-1 sm:flex-none flex items-center justify-center gap-1.5"
          >
            <BarChart3 className="w-4 h-4 text-[#245C46]" />
            <span>Performance Analytics</span>
          </Link>
          <Link
            to="/interview/setup"
            className="btn-forest text-xs px-5 py-2.5 w-full sm:w-auto flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Start New Interview</span>
          </Link>
        </div>
      </div>

      {/* Global Error Banner */}
      {fetchError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="btn-secondary text-[11px] px-3 py-1 flex items-center gap-1 shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Overview Stat Cards Grid (4 Actual Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Stat 1: Completed Interviews */}
        <div className="editorial-card p-4 sm:p-6 bg-white space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#777970] uppercase tracking-wider font-display">
            <span>Completed Rounds</span>
            <div className="w-8 h-8 rounded-lg bg-[#DCE8DC] flex items-center justify-center text-[#245C46]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-9 w-16 bg-[#E8E4DA]/60 rounded-md animate-pulse my-0.5" />
          ) : (
            <div className="text-3xl font-display font-bold text-[#252923]">
              {summary.completedInterviews}
            </div>
          )}
          <p className="text-xs text-[#777970]">
            {summary.completedInterviews === 1
              ? '1 finished full session'
              : `${summary.completedInterviews} finished full sessions`}
          </p>
        </div>

        {/* Stat 2: Evaluated Interviews */}
        <div className="editorial-card p-4 sm:p-6 bg-white space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#777970] uppercase tracking-wider font-display">
            <span>Evaluated Rounds</span>
            <div className="w-8 h-8 rounded-lg bg-[#DCE8DC] flex items-center justify-center text-[#245C46]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-9 w-16 bg-[#E8E4DA]/60 rounded-md animate-pulse my-0.5" />
          ) : (
            <div className="text-3xl font-display font-bold text-[#252923]">
              {summary.evaluatedInterviews}
            </div>
          )}
          <p className="text-xs text-[#777970]">
            {summary.evaluatedInterviews === 1
              ? '1 session with AI report'
              : `${summary.evaluatedInterviews} sessions with AI reports`}
          </p>
        </div>

        {/* Stat 3: Average Score */}
        <div className="editorial-card p-4 sm:p-6 bg-white space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#777970] uppercase tracking-wider font-display">
            <span>Average Score</span>
            <div className="w-8 h-8 rounded-lg bg-[#DCE8DC] flex items-center justify-center text-[#245C46]">
              <Award className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-9 w-20 bg-[#E8E4DA]/60 rounded-md animate-pulse my-0.5" />
          ) : (
            <div className="text-3xl font-display font-bold text-[#252923]">
              {summary.averageScore !== null ? `${summary.averageScore}%` : '—'}
            </div>
          )}
          <p className="text-xs text-[#777970]">
            {summary.averageScore !== null
              ? 'Average across evaluated rounds'
              : 'Complete and evaluate rounds to calculate score'}
          </p>
        </div>

        {/* Stat 4: Best Score */}
        <div className="editorial-card p-4 sm:p-6 bg-white space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#777970] uppercase tracking-wider font-display">
            <span>Best Score</span>
            <div className="w-8 h-8 rounded-lg bg-[#DCE8DC] flex items-center justify-center text-[#245C46]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-9 w-20 bg-[#E8E4DA]/60 rounded-md animate-pulse my-0.5" />
          ) : (
            <div className="text-3xl font-display font-bold text-[#245C46]">
              {summary.bestScore !== null ? `${summary.bestScore}%` : '—'}
            </div>
          )}
          <p className="text-xs text-[#777970]">
            {summary.bestScore !== null
              ? 'Highest score recorded'
              : 'No evaluations yet'}
          </p>
        </div>

      </div>

      {/* Zero State Callout for Fresh Users */}
      {isZeroState && !loading && (
        <div className="editorial-card p-8 sm:p-12 text-center bg-white space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#DCE8DC] text-[#245C46] flex items-center justify-center mx-auto shadow-2xs">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-display font-bold text-[#252923]">
              No mock interviews on record yet
            </h3>
            <p className="text-xs text-[#777970] leading-relaxed">
              Configure your first practice round. Select your target engineering role, difficulty, and practice mode to receive personalized AI evaluation and performance metrics.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/interview/setup"
              className="btn-forest text-xs px-6 py-2.5 inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Configure Your First Session</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Layout: Left (Recent Sessions & Performance Chart) & Right (Tips & Quick Actions) */}
      {!isZeroState && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (8 cols): Performance Trend & Recent Activity */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Component 1: Compact Performance Progression Chart */}
            <div className="editorial-card p-6 bg-white space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-display font-bold text-[#252923] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#245C46]" />
                    <span>Performance Progression</span>
                  </h3>
                  <p className="text-xs text-[#777970]">
                    Chronological progression of calibrated summary scores (0 - 100%).
                  </p>
                </div>
                <Link
                  to="/interview/analytics"
                  className="text-xs font-semibold text-[#245C46] hover:underline flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>Detailed Analytics</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Chart Body */}
              {trendPoints.length >= 2 ? (
                <div className="space-y-3">
                  <div className="relative w-full overflow-hidden select-none bg-[#F8F6F0]/60 rounded-xl p-2 border border-[#E8E4DA]/60">
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="w-full h-auto overflow-visible"
                    >
                      <defs>
                        <linearGradient id="dashboardAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#245C46" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#245C46" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      {/* Gridlines at 0%, 50%, 75%, 100% */}
                      {[0, 50, 75, 100].map((val) => {
                        const y = padding.top + (1 - val / 100) * graphHeight;
                        return (
                          <g key={val}>
                            <line
                              x1={padding.left}
                              y1={y}
                              x2={chartWidth - padding.right}
                              y2={y}
                              stroke="#E8E4DA"
                              strokeWidth="1"
                              strokeDasharray={val === 75 ? '3 3' : 'none'}
                            />
                            <text
                              x={padding.left - 8}
                              y={y + 3}
                              fontSize="9"
                              fill="#777970"
                              textAnchor="end"
                              fontFamily="monospace"
                            >
                              {val}%
                            </text>
                          </g>
                        );
                      })}

                      {/* Benchmark Label */}
                      <text
                        x={chartWidth - padding.right}
                        y={padding.top + (1 - 75 / 100) * graphHeight - 4}
                        fontSize="8"
                        fill="#245C46"
                        textAnchor="end"
                        fontWeight="bold"
                      >
                        Benchmark (75%)
                      </text>

                      {/* Area Fill */}
                      {areaPath && (
                        <path d={areaPath} fill="url(#dashboardAreaGradient)" />
                      )}

                      {/* Line Path */}
                      {linePath && (
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#245C46"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Data Point Circles */}
                      {trendPoints.map((pt, i) => (
                        <g
                          key={i}
                          className="cursor-pointer"
                          onMouseEnter={() => setActiveChartPoint(pt)}
                          onClick={() => setActiveChartPoint(pt)}
                        >
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={activeChartPoint?.interviewId === pt.interviewId ? 6 : 4}
                            fill="#FFFFFF"
                            stroke="#245C46"
                            strokeWidth="2"
                            className="transition-all duration-150"
                          />
                        </g>
                      ))}

                      {/* X-axis labels */}
                      {trendPoints.map((pt, i) => {
                        const showLabel =
                          trendPoints.length <= 5 ||
                          i === 0 ||
                          i === trendPoints.length - 1;
                        if (!showLabel) return null;
                        return (
                          <text
                            key={i}
                            x={pt.x}
                            y={chartHeight - 10}
                            fontSize="9"
                            fill="#777970"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {formatDate(pt.date).replace(/, \d{4}/, '')}
                          </text>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Tooltip / Delta Callout */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1">
                    {activeChartPoint ? (
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-[#252923]">
                          {activeChartPoint.role}:
                        </span>
                        <span className="font-mono font-bold text-[#245C46]">
                          {activeChartPoint.score}%
                        </span>
                        <span className="text-[#777970]">
                          ({formatDate(activeChartPoint.date)})
                        </span>
                        <Link
                          to={`/interview/${activeChartPoint.interviewId}/report`}
                          className="text-[#245C46] hover:underline inline-flex items-center gap-0.5 ml-1"
                        >
                          <span>Report</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    ) : (
                      <span className="text-[#777970] italic">
                        Hover data points on the curve to inspect scores.
                      </span>
                    )}

                    {comparison?.hasComparison && (
                      <div className="flex items-center gap-1.5 self-start sm:self-auto text-[11px] font-mono font-medium">
                        <span className="text-[#777970]">Latest Delta:</span>
                        <span className={`px-2 py-0.5 rounded-full ${
                          comparison.difference > 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : comparison.difference < 0
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-neutral-100 text-[#777970]'
                        }`}>
                          {comparison.difference > 0 ? `+${comparison.difference}%` : `${comparison.difference}%`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : analytics.trendData?.length === 1 ? (
                /* Single session card */
                <div className="p-4 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-display font-bold text-[#252923]">
                      Single Evaluated Interview On Record
                    </p>
                    <p className="text-[#777970]">
                      {analytics.trendData[0].role} evaluated at {analytics.trendData[0].score}% on {formatDate(analytics.trendData[0].date)}. Complete at least 2 sessions to establish a trend.
                    </p>
                  </div>
                  <Link
                    to={`/interview/${analytics.trendData[0].interviewId}/report`}
                    className="btn-secondary text-[11px] px-3 py-1.5 shrink-0"
                  >
                    View Report
                  </Link>
                </div>
              ) : (
                /* Zero evaluated interviews */
                <div className="p-5 text-center bg-[#F8F6F0] rounded-xl border border-[#E8E4DA] text-xs text-[#777970] space-y-1">
                  <p>No evaluated interviews found yet.</p>
                  <p className="text-[11px]">
                    Complete and evaluate mock rounds to track your progression curve.
                  </p>
                </div>
              )}
            </div>

            {/* Component 2: Recent Mock Interviews Activity */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-display font-bold text-[#252923]">
                    Recent Mock Interviews
                  </h2>
                  <p className="text-xs text-[#777970]">
                    Your latest interactive rounds, transcripts, and evaluation reports.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    to="/interview/history"
                    className="text-xs font-semibold text-[#777970] hover:text-[#245C46] transition-colors flex items-center gap-1"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>View All History</span>
                  </Link>
                  <Link
                    to="/interview/setup"
                    className="text-xs font-semibold text-[#245C46] hover:underline flex items-center gap-1"
                  >
                    <span>New Setup</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Sessions List */}
              <div className="space-y-3">
                {loading ? (
                  [1, 2, 3].map((skeleton) => (
                    <div
                      key={skeleton}
                      className="editorial-card p-4 sm:p-5 flex items-center justify-between gap-4 bg-white animate-pulse"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-[#E8E4DA]/60 shrink-0" />
                        <div className="space-y-2">
                          <div className="w-40 sm:w-56 h-4 bg-[#E8E4DA]/80 rounded" />
                          <div className="w-24 sm:w-36 h-3 bg-[#E8E4DA]/50 rounded" />
                        </div>
                      </div>
                      <div className="w-24 h-8 bg-[#E8E4DA]/60 rounded-xl" />
                    </div>
                  ))
                ) : recentInterviews.length === 0 ? (
                  <div className="editorial-card p-6 text-center bg-white space-y-2 border border-[#E8E4DA]">
                    <p className="text-xs text-[#777970]">
                      No recent mock interview sessions on record yet.
                    </p>
                  </div>
                ) : (
                  recentInterviews.map((item) => (
                    <div
                      key={item._id}
                      className="editorial-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white hover:border-[#245C46]/35 transition-all"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-[#DCE8DC] text-[#245C46] flex items-center justify-center shrink-0">
                          {item.mode === 'text' ? (
                            <MessageSquare className="w-5 h-5" />
                          ) : (
                            <Video className="w-5 h-5" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-display font-bold text-[#252923]">
                              {item.role}
                            </h4>
                            <span className="badge-sage text-[10px] py-0.5">
                              {item.experienceLevel}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F8F6F0] border border-[#E8E4DA] text-[#252923] font-medium">
                              {item.difficulty}
                            </span>
                          </div>
                          <div className="text-xs text-[#777970] flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#245C46]" />
                              <span>{formatDate(item.createdAt)}</span>
                            </span>
                            {item.answeredCount !== undefined && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{item.answeredCount} answered</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
                        {/* Status & Score Badges */}
                        {item.status === 'completed' ? (
                          <>
                            {item.hasScore ? (
                              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#DCE8DC] text-[#245C46] font-semibold border border-[#245C46]/20">
                                Score: {item.score}%
                              </span>
                            ) : (
                              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                                Completed
                              </span>
                            )}

                            <Link
                              to={`/interview/${item._id}/report`}
                              className="btn-forest text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm"
                            >
                              <Sparkles className="w-3 h-3 text-emerald-200" />
                              <span>{item.hasScore ? 'View Report' : 'Evaluate'}</span>
                            </Link>

                            <Link
                              to={`/interview/session/${item._id}`}
                              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                              title="Review questions and answer transcript"
                            >
                              <span>Transcript</span>
                            </Link>
                          </>
                        ) : item.status === 'abandoned' ? (
                          <>
                            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-neutral-100 text-[#777970] font-medium border border-neutral-200">
                              Ended Early
                            </span>
                            <Link
                              to={`/interview/${item._id}/report`}
                              className="btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-1.5"
                            >
                              <span>View Report</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#DCE8DC] text-[#245C46] font-medium border border-[#245C46]/15">
                              {item.status === 'in_progress' ? 'In Progress' : 'Ready'}
                            </span>
                            <Link
                              to={`/interview/session/${item._id}`}
                              className="btn-forest text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm"
                            >
                              <span>{item.status === 'in_progress' ? 'Continue Session' : 'Start'}</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Column (4 cols): Quick Setup, Hub, Strategies & Profile */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Setup Callout Card */}
            <div className="rounded-2xl p-6 bg-[#DCE8DC]/70 border border-[#245C46]/20 space-y-3.5">
              <span className="text-[11px] font-mono text-[#245C46] font-bold uppercase tracking-wider">
                Quick Setup
              </span>
              <h3 className="text-base font-display font-bold text-[#252923]">
                Preparing for a specific interview?
              </h3>
              <p className="text-xs text-[#252923]/80 leading-relaxed">
                Customize question topics for Frontend, Backend, Fullstack, or Cloud Architecture in under 60 seconds.
              </p>
              <Link
                to="/interview/setup"
                className="btn-forest text-xs w-full py-2.5 justify-center shadow-none"
              >
                <span>Setup Interview Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Quick Navigation Hub */}
            <div className="editorial-card p-5 bg-white space-y-3">
              <h3 className="text-xs font-display font-bold text-[#777970] uppercase tracking-wider">
                Dashboard Navigation Hub
              </h3>
              <div className="space-y-2 text-xs">
                <Link
                  to="/interview/setup"
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F8F6F0] text-[#252923] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Plus className="w-4 h-4 text-[#245C46]" />
                    <span className="font-semibold">Start New Interview</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#777970]" />
                </Link>

                <Link
                  to="/interview/history"
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F8F6F0] text-[#252923] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <History className="w-4 h-4 text-[#245C46]" />
                    <span className="font-semibold">View All Interview History</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#777970]" />
                </Link>

                <Link
                  to="/interview/analytics"
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F8F6F0] text-[#252923] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className="w-4 h-4 text-[#245C46]" />
                    <span className="font-semibold">Performance Analytics & Charts</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#777970]" />
                </Link>
              </div>
            </div>

            {/* Technical Interview Preparation Strategies */}
            <div className="editorial-card p-6 bg-white space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E8E4DA]">
                <BookOpen className="w-4 h-4 text-[#245C46]" />
                <h3 className="text-sm font-display font-bold text-[#252923]">
                  Core Interview Strategies
                </h3>
              </div>

              <div className="space-y-3.5 text-xs text-[#252923]">
                <div className="space-y-1">
                  <span className="font-semibold text-[#245C46] flex items-center gap-1.5 font-display">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#245C46]" />
                    1. Use the STAR Framework
                  </span>
                  <p className="text-[#777970] pl-5 leading-relaxed">
                    For behavioral questions, clearly delineate Situation, Task, Action, and quantifiable Result.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-[#245C46] flex items-center gap-1.5 font-display">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#245C46]" />
                    2. Vocalize Trade-offs First
                  </span>
                  <p className="text-[#777970] pl-5 leading-relaxed">
                    Compare memory vs CPU trade-offs and explain your architectural rationale before answering.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-[#245C46] flex items-center gap-1.5 font-display">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#245C46]" />
                    3. Clarify Boundary Conditions
                  </span>
                  <p className="text-[#777970] pl-5 leading-relaxed">
                    Check payload scale, null safety, concurrency limits, and expected failure modes.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-[#245C46] flex items-center gap-1.5 font-display">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#245C46]" />
                    4. Analyze Time & Space Complexity
                  </span>
                  <p className="text-[#777970] pl-5 leading-relaxed">
                    State the Big-O Time and Space complexities before finishing your technical answer.
                  </p>
                </div>
              </div>
            </div>

            {/* Account Profile Shortcuts */}
            <div className="editorial-card p-4 bg-white space-y-2">
              <div className="flex items-center justify-between text-xs text-[#777970]">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 hover:text-[#245C46] font-medium transition-colors"
                >
                  <User className="w-4 h-4 text-[#245C46]" />
                  <span>Account Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-rose-600 hover:underline font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
