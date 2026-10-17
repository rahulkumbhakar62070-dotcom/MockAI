import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  LogOut, 
  Sparkles, 
  Layers,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully.');
    navigate('/');
  };

  const formattedDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Recently';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 bg-[#F8F6F0]">
      {/* Header Banner */}
      <div className="editorial-card p-6 sm:p-8 relative overflow-hidden bg-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#245C46] flex items-center justify-center text-white text-2xl font-bold font-display shadow-sm">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-display font-bold text-[#252923] tracking-tight">
                  {user?.name}
                </h1>
                <span className="badge-sage">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#245C46]" />
                  Verified Session
                </span>
              </div>
              <p className="text-sm text-[#777970] font-mono">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="btn-secondary text-xs px-4 py-2 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50"
          >
            <LogOut className="w-4 h-4 text-[#777970] group-hover:text-rose-600" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* User Detail Cards */}
        <div className="editorial-card p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#777970] uppercase tracking-wider font-display">
            <User className="w-4 h-4 text-[#245C46]" />
            <span>Full Name</span>
          </div>
          <p className="text-base font-semibold text-[#252923]">
            {user?.name}
          </p>
        </div>

        <div className="editorial-card p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#777970] uppercase tracking-wider font-display">
            <Mail className="w-4 h-4 text-[#245C46]" />
            <span>Registered Email</span>
          </div>
          <p className="text-base font-semibold text-[#252923] truncate">
            {user?.email}
          </p>
        </div>

        <div className="editorial-card p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#777970] uppercase tracking-wider font-display">
            <Calendar className="w-4 h-4 text-[#245C46]" />
            <span>Member Since</span>
          </div>
          <p className="text-base font-semibold text-[#252923]">
            {formattedDate}
          </p>
        </div>

      </div>

      {/* Phase Roadmap Card */}
      <div className="editorial-card p-6 sm:p-8 space-y-5 bg-white">
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E4DA] flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#DCE8DC] text-[#245C46] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#252923] font-display">
              Mock Interview System Status
            </h2>
          </div>
          <span className="badge-sage">
            Phase 4 Active: Frontend Auth Connected
          </span>
        </div>

        <div className="space-y-3 text-xs text-[#252923] leading-relaxed">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#245C46] shrink-0 mt-0.5" />
            <span>
              <strong>Authentication & Session:</strong> Full MERN authentication integrated. Private requests automatically attach verified JWT Bearer tokens to the Express backend.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-[#245C46] shrink-0 mt-0.5" />
            <span>
              <strong>Coming in Next Phases:</strong> Interactive AI Question Generation, Real-Time Speech/Camera streaming, and Multi-Criteria Interview Evaluation.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
