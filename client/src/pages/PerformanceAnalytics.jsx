import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import interviewService from '../services/interviewService';
import {
  Award,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Minus,
  Briefcase,
  AlertCircle,
  History,
  Calendar,
  Info,
  ExternalLink,
} from 'lucide-react';

export default function PerformanceAnalytics() {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [data, setData] = useState({
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

  // Role filter for chart & table
  const [selectedRole, setSelectedRole] = useState('ALL');

  // Tooltip state for SVG chart
  const [activePoint, setActivePoint] = useState(null);

  // Fetch analytics from authenticated backend
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError('');
      const res = await interviewService.getPerformanceAnalytics();
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      setFetchError(err.message || 'Failed to load performance analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

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

  // Filter trend data by role
  const filteredTrend = useMemo(() => {
    if (!data.trendData || data.trendData.length === 0) return [];
    if (selectedRole === 'ALL') return data.trendData;
    return data.trendData.filter((item) => item.role === selectedRole);
  }, [data.trendData, selectedRole]);

  // Unique roles for filter dropdown
  const availableRoles = useMemo(() => {
    if (!data.trendData) return [];
    const roles = Array.from(new Set(data.trendData.map((d) => d.role))).filter(Boolean);
    return roles;
  }, [data.trendData]);

  // SVG Chart Geometry Calculations (viewBox: 0 0 800 300)
  const chartWidth = 800;
  const chartHeight = 280;
  const padding = { top: 30, right: 40, bottom: 40, left: 50 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  const points = useMemo(() => {
    if (filteredTrend.length < 2) return [];
    return filteredTrend.map((item, idx) => {
      const x = padding.left + (idx / (filteredTrend.length - 1)) * graphWidth;
      // score is 0 to 100
      const score = Math.max(0, Math.min(100, item.score));
      const y = padding.top + (1 - score / 100) * graphHeight;
      return { x, y, ...item };
    });
  }, [filteredTrend, graphHeight, graphWidth, padding.left, padding.top]);

  // Construct SVG Path
  const linePath = useMemo(() => {
    if (points.length < 2) return '';
    return points.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  }, [points]);

  // Construct Closed Area Path for gradient fill
  const areaPath = useMemo(() => {
    if (points.length < 2) return '';
    const bottomY = padding.top + graphHeight;
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [linePath, points, graphHeight, padding.top]);

  // -------------------------------------------------------------
  // RENDERING: Loading State
  // -------------------------------------------------------------
  if (loading && !data.summary.totalInterviews) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-[#E8E4DA] rounded animate-pulse"></div>
          <div className="h-8 w-72 bg-[#E8E4DA] rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="editorial-card p-6 h-32 animate-pulse bg-white space-y-3">
              <div className="h-3 w-24 bg-[#E8E4DA] rounded"></div>
              <div className="h-8 w-16 bg-[#E8E4DA] rounded"></div>
            </div>
          ))}
        </div>
        <div className="editorial-card p-8 h-80 animate-pulse bg-white"></div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDERING: Error State
  // -------------------------------------------------------------
  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-[#252923]">
            Unable to Load Analytics
          </h2>
          <p className="text-sm text-[#777970] max-w-md mx-auto leading-relaxed">
            {fetchError}
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => fetchAnalytics()}
            className="btn-forest text-xs px-6 py-2.5 inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry</span>
          </button>
          <Link
            to="/dashboard"
            className="btn-secondary text-xs px-5 py-2.5 inline-flex items-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const { summary, comparison, roleAnalytics } = data;
  const isZeroState = summary.totalInterviews === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-10">
      
      {/* Top Header & Breadcrumb Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E8E4DA]">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-[#777970]">
            <Link to="/dashboard" className="hover:text-[#245C46] flex items-center gap-1 transition-colors">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span className="text-[#252923] font-medium">Performance Analytics</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-[#252923] tracking-tight">
            Performance Analytics & Progress
          </h1>
          <p className="text-xs sm:text-sm text-[#777970] max-w-2xl leading-relaxed">
            Track your technical interview readiness, chronological score progression, and performance across engineering roles.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          <Link
            to="/interview/history"
            className="btn-secondary text-xs px-4 py-2.5 flex-1 sm:flex-none flex items-center justify-center gap-1.5"
          >
            <History className="w-3.5 h-3.5 text-[#245C46]" />
            <span>Interview History</span>
          </Link>
          <Link
            to="/interview/setup"
            className="btn-forest text-xs px-5 py-2.5 w-full sm:w-auto flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>New Practice Round</span>
          </Link>
        </div>
      </div>

      {/* Zero State Notice */}
      {isZeroState && (
        <div className="editorial-card p-6 sm:p-12 text-center bg-white space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#DCE8DC] text-[#245C46] mx-auto flex items-center justify-center border border-[#245C46]/20 shadow-xs">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-display font-bold text-[#252923]">
              No Interview Analytics Yet
            </h3>
            <p className="text-xs sm:text-sm text-[#777970] leading-relaxed">
              Complete and submit your first AI mock interview session. Your performance metrics, dimensional scores, and progress trends will automatically populate here.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/interview/setup"
              className="btn-forest text-xs px-6 py-3 inline-flex items-center gap-2"
            >
              <span>Configure Your First Round</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Section 1: Analytics Summary Cards (Honest Metrics) */}
      {!isZeroState && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Card 1: Completed Interviews */}
          <div className="editorial-card p-4 sm:p-6 bg-white space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#777970] uppercase tracking-wider font-display">
              <span>Completed Rounds</span>
              <div className="w-8 h-8 rounded-lg bg-[#DCE8DC] flex items-center justify-center text-[#245C46]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-display font-bold text-[#252923]">
              {summary.completedInterviews}
            </div>
            <p className="text-xs text-[#777970]">
              {summary.completedInterviews === 1
                ? '1 full round concluded'
                : `${summary.completedInterviews} full rounds concluded`}
            </p>
          </div>

          {/* Card 2: Evaluated Interviews */}
          <div className="editorial-card p-4 sm:p-6 bg-white space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#777970] uppercase tracking-wider font-display">
              <span>Evaluated Rounds</span>
              <div className="w-8 h-8 rounded-lg bg-[#DCE8DC] flex items-center justify-center text-[#245C46]">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-display font-bold text-[#252923]">
              {summary.evaluatedInterviews}
            </div>
            <p className="text-xs text-[#777970]">
              {summary.evaluatedInterviews === 1
                ? '1 session with AI report'
                : `${summary.evaluatedInterviews} sessions with AI reports`}
            </p>
          </div>

          {/* Card 3: Average Score */}
          <div className="editorial-card p-4 sm:p-6 bg-white space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#777970] uppercase tracking-wider font-display">
              <span>Average Score</span>
              <div className="w-8 h-8 rounded-lg bg-[#DCE8DC] flex items-center justify-center text-[#245C46]">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-display font-bold text-[#252923]">
              {summary.averageScore !== null ? `${summary.averageScore}%` : '—'}
            </div>
            <p className="text-xs text-[#777970]">
              {summary.averageScore !== null
                ? 'Average across evaluated rounds'
                : 'Evaluate rounds to calculate score'}
            </p>
          </div>

          {/* Card 4: Best Interview Score */}
          <div className="editorial-card p-4 sm:p-6 bg-white space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#777970] uppercase tracking-wider font-display">
              <span>Best Score</span>
              <div className="w-8 h-8 rounded-lg bg-[#DCE8DC] flex items-center justify-center text-[#245C46]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-display font-bold text-[#245C46]">
              {summary.bestScore !== null ? `${summary.bestScore}%` : '—'}
            </div>
            <p className="text-xs text-[#777970]">
              {summary.bestScore !== null
                ? 'Highest evaluated score achieved'
                : 'No evaluated sessions yet'}
            </p>
          </div>

        </div>
      )}

      {/* Section 2: Performance Comparison & Trend Chart */}
      {!isZeroState && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Chart Column (8 cols) */}
          <div className="lg:col-span-8 editorial-card p-6 sm:p-8 bg-white space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-display font-bold text-[#252923] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#245C46]" />
                  <span>Performance Trend Over Time</span>
                </h3>
                <p className="text-xs text-[#777970]">
                  Chronological progression of calibrated summary scores (0 - 100%).
                </p>
              </div>

              {/* Role Filter Selector */}
              {availableRoles.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#777970] font-mono">Role:</span>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E8E4DA] bg-[#F8F6F0] text-[#252923] font-medium focus:outline-none focus:ring-1 focus:ring-[#245C46]"
                  >
                    <option value="ALL">All Roles ({data.trendData.length})</option>
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Chart Area */}
            {filteredTrend.length >= 2 ? (
              <div className="space-y-4">
                <div className="relative w-full overflow-hidden select-none bg-[#F8F6F0]/50 rounded-xl p-2 border border-[#E8E4DA]/60">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-auto overflow-visible"
                  >
                    <defs>
                      <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#245C46" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#245C46" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>

                    {/* Y-Axis Gridlines & Labels */}
                    {[0, 25, 50, 75, 100].map((val) => {
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
                            strokeDasharray={val === 75 ? '4 4' : 'none'}
                          />
                          <text
                            x={padding.left - 10}
                            y={y + 4}
                            fontSize="10"
                            fill="#777970"
                            textAnchor="end"
                            fontFamily="monospace"
                          >
                            {val}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Benchmark 75% indicator label */}
                    <text
                      x={chartWidth - padding.right}
                      y={padding.top + (1 - 75 / 100) * graphHeight - 6}
                      fontSize="9"
                      fill="#245C46"
                      textAnchor="end"
                      fontWeight="bold"
                    >
                      Benchmark (75%)
                    </text>

                    {/* Area Fill */}
                    {areaPath && (
                      <path d={areaPath} fill="url(#scoreAreaGradient)" />
                    )}

                    {/* Trend Line */}
                    {linePath && (
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#245C46"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Data Points */}
                    {points.map((pt, i) => (
                      <g
                        key={i}
                        className="cursor-pointer group"
                        onMouseEnter={() => setActivePoint(pt)}
                        onClick={() => setActivePoint(pt)}
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={activePoint?.interviewId === pt.interviewId ? 7 : 5}
                          fill="#FFFFFF"
                          stroke="#245C46"
                          strokeWidth="2.5"
                          className="transition-all duration-200"
                        />
                      </g>
                    ))}

                    {/* X-Axis Labels (Date strings) */}
                    {points.map((pt, i) => {
                      // Display labels on first, last, and middle points to prevent crowding
                      const showLabel =
                        points.length <= 6 ||
                        i === 0 ||
                        i === points.length - 1 ||
                        i === Math.floor(points.length / 2);

                      if (!showLabel) return null;

                      return (
                        <text
                          key={i}
                          x={pt.x}
                          y={chartHeight - 12}
                          fontSize="10"
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

                {/* Interactive Tooltip Card */}
                {activePoint ? (
                  <div className="p-4 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-[#252923]">
                          Session #{activePoint.sessionNumber}: {activePoint.role}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DCE8DC] text-[#245C46]">
                          {activePoint.difficulty}
                        </span>
                      </div>
                      <div className="text-[#777970] flex items-center gap-2 font-mono">
                        <Calendar className="w-3 h-3 text-[#245C46]" />
                        <span>{formatDate(activePoint.date)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-mono text-[#777970] block">Score</span>
                        <span className="text-base font-display font-bold text-[#245C46]">
                          {activePoint.score}%
                        </span>
                      </div>
                      <Link
                        to={`/interview/${activePoint.interviewId}/report`}
                        className="btn-forest text-xs px-3 py-1.5 flex items-center gap-1 shadow-2xs"
                      >
                        <span>View Report</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#777970] italic text-center">
                    Hover or tap any data point on the chart to inspect session details and view its report.
                  </p>
                )}
              </div>
            ) : filteredTrend.length === 1 ? (
              /* Single evaluated interview state */
              <div className="p-6 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA] space-y-4 text-center sm:text-left">
                <div className="flex items-center gap-2 text-xs font-display font-bold text-[#245C46]">
                  <Info className="w-4 h-4 text-[#245C46]" />
                  <span>Single Evaluated Interview On Record</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E8E4DA]">
                  <div className="space-y-1">
                    <h4 className="text-sm font-display font-bold text-[#252923]">
                      {filteredTrend[0].role} ({filteredTrend[0].difficulty})
                    </h4>
                    <p className="text-xs text-[#777970]">
                      Conducted on {formatDate(filteredTrend[0].date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 self-center sm:self-auto">
                    <div className="text-center sm:text-right">
                      <span className="text-xs font-mono text-[#777970]">Score</span>
                      <p className="text-lg font-display font-bold text-[#245C46]">
                        {filteredTrend[0].score}%
                      </p>
                    </div>
                    <Link
                      to={`/interview/${filteredTrend[0].interviewId}/report`}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      View Report
                    </Link>
                  </div>
                </div>
                <p className="text-xs text-[#777970] leading-relaxed">
                  A minimum of 2 evaluated sessions is required to plot a chronological trend line. Complete another mock interview to track your score progression over time.
                </p>
              </div>
            ) : (
              /* No evaluated interviews for the selected filter */
              <div className="p-8 text-center bg-[#F8F6F0] rounded-xl border border-[#E8E4DA] space-y-3">
                <p className="text-xs text-[#777970]">
                  No evaluated interviews match the selected filter.
                </p>
                <button
                  onClick={() => setSelectedRole('ALL')}
                  className="text-xs font-semibold text-[#245C46] hover:underline"
                >
                  Reset Role Filter
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Performance Comparison Card (4 cols) */}
          <div className="lg:col-span-4 editorial-card p-6 bg-white space-y-5">
            <div className="space-y-1">
              <span className="text-[11px] font-mono font-semibold text-[#777970] uppercase tracking-wider">
                Session Comparison
              </span>
              <h3 className="text-base font-display font-bold text-[#252923]">
                Recent Delta
              </h3>
            </div>

            {comparison?.hasComparison ? (
              <div className="space-y-4">
                {/* Score Difference Pill */}
                <div className="p-4 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA] space-y-2">
                  <span className="text-[11px] font-mono text-[#777970] uppercase">
                    Score Difference
                  </span>
                  <div className="flex items-center gap-2">
                    {comparison.difference > 0 ? (
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    ) : comparison.difference < 0 ? (
                      <div className="w-8 h-8 rounded-lg bg-[#E99564]/20 text-[#C9713C] flex items-center justify-center border border-[#E99564]/30">
                        <TrendingDown className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 text-[#777970] flex items-center justify-center border border-neutral-200">
                        <Minus className="w-4 h-4" />
                      </div>
                    )}
                    <span className="text-2xl font-display font-extrabold text-[#252923]">
                      {comparison.difference > 0 ? `+${comparison.difference}%` : `${comparison.difference}%`}
                    </span>
                  </div>
                  <p className="text-xs text-[#777970]">
                    {comparison.label}
                  </p>
                </div>

                {/* Side-by-side latest vs previous */}
                <div className="space-y-2.5 text-xs">
                  {/* Latest Session */}
                  <div className="p-3 rounded-lg bg-white border border-[#E8E4DA] flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-[#245C46] font-bold uppercase">Latest Session</span>
                      <p className="font-semibold text-[#252923] truncate max-w-[150px]">{comparison.latest.role}</p>
                      <span className="text-[10px] text-[#777970]">{formatDate(comparison.latest.date)}</span>
                    </div>
                    <span className="text-base font-display font-bold text-[#245C46]">
                      {comparison.latest.score}%
                    </span>
                  </div>

                  {/* Previous Session */}
                  <div className="p-3 rounded-lg bg-white border border-[#E8E4DA] flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-[#777970] font-bold uppercase">Previous Session</span>
                      <p className="font-semibold text-[#252923] truncate max-w-[150px]">{comparison.previous.role}</p>
                      <span className="text-[10px] text-[#777970]">{formatDate(comparison.previous.date)}</span>
                    </div>
                    <span className="text-base font-display font-bold text-[#777970]">
                      {comparison.previous.score}%
                    </span>
                  </div>
                </div>

                {/* Honest Comparison Disclaimer */}
                <div className="p-3.5 rounded-lg bg-[#F8F6F0] border border-[#E8E4DA] text-[11px] text-[#777970] leading-relaxed">
                  <span className="font-bold text-[#252923]">Evaluation Context: </span>
                  This reflects a direct comparison between your two most recent evaluated sessions. Score variance can occur naturally based on difficulty level and topic domain.
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA] text-center text-xs text-[#777970] space-y-2">
                <Info className="w-5 h-5 mx-auto text-[#777970]" />
                <p className="leading-relaxed">
                  {comparison?.message || 'Complete at least 2 evaluated interviews to view a session comparison.'}
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Section 3: Role-Wise Analytics Breakdown */}
      {!isZeroState && (
        <div className="editorial-card p-6 sm:p-8 bg-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-display font-bold text-[#252923] flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#245C46]" />
                <span>Performance Breakdown by Job Role</span>
              </h3>
              <p className="text-xs text-[#777970]">
                Compare your readiness and score consistency across distinct engineering target roles.
              </p>
            </div>
            <span className="text-xs font-mono text-[#777970]">
              {roleAnalytics.length} Role{roleAnalytics.length > 1 ? 's' : ''} Practiced
            </span>
          </div>

          {roleAnalytics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E8E4DA] text-[11px] font-mono text-[#777970] uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Target Job Role</th>
                    <th className="py-3 px-4 font-semibold text-center">Total Sessions</th>
                    <th className="py-3 px-4 font-semibold text-center">Completed</th>
                    <th className="py-3 px-4 font-semibold text-center">Evaluated</th>
                    <th className="py-3 px-4 font-semibold text-center">Average Score</th>
                    <th className="py-3 px-4 font-semibold text-center">Best Score</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4DA] text-xs">
                  {roleAnalytics.map((entry) => (
                    <tr key={entry.role} className="hover:bg-[#F8F6F0]/50 transition-colors">
                      <td className="py-3.5 px-4 font-display font-bold text-[#252923]">
                        {entry.role}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        {entry.totalInterviews}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px]">
                          {entry.completedInterviews}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        {entry.evaluatedInterviews}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-[#245C46]">
                        {entry.averageScore !== null ? `${entry.averageScore}%` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-[#252923]">
                        {entry.bestScore !== null ? `${entry.bestScore}%` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to="/interview/setup"
                          className="btn-secondary text-[11px] px-3 py-1 inline-flex items-center gap-1"
                        >
                          <span>Practice</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center bg-[#F8F6F0] rounded-xl border border-[#E8E4DA] text-xs text-[#777970]">
              No role breakdown available yet.
            </div>
          )}
        </div>
      )}

      {/* Navigation Bottom Sticky-style Action Banner */}
      <div className="editorial-card p-6 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-sm font-display font-bold text-[#252923]">
            Ready to improve your interview performance?
          </h4>
          <p className="text-xs text-[#777970]">
            Repeated mock rounds build muscle memory for articulating trade-offs and algorithms.
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
            <span>Start Practice Round</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

    </div>
  );
}
