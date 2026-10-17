import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Sparkles, 
  Menu, 
  X, 
  LogOut, 
  ChevronRight,
  LayoutDashboard,
  Plus,
  Clock,
  BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Successfully logged out.');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#F8F6F0]/90 border-b border-[#E8E4DA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-[#245C46] rounded-lg p-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#245C46] flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-lg tracking-tight text-[#252923] flex items-center gap-1.5 truncate">
                MockAI
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#DCE8DC] text-[#245C46] border border-[#245C46]/15 font-semibold shrink-0">
                  CAREER TECH
                </span>
              </span>
              <span className="text-[11px] text-[#777970] font-medium hidden sm:inline truncate">Smart Interview Preparation</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#777970]">
            <Link to="/" className="hover:text-[#245C46] transition-colors">
              Home
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="hover:text-[#245C46] transition-colors flex items-center gap-1.5 text-[#252923]">
                  <LayoutDashboard className="w-4 h-4 text-[#245C46]" />
                  <span>Dashboard</span>
                </Link>
                <Link to="/interview/history" className="hover:text-[#245C46] transition-colors flex items-center gap-1.5 text-[#777970]">
                  <Clock className="w-3.5 h-3.5 text-[#777970]" />
                  <span>History</span>
                </Link>
                <Link to="/interview/analytics" className="hover:text-[#245C46] transition-colors flex items-center gap-1.5 text-[#777970]">
                  <BarChart3 className="w-3.5 h-3.5 text-[#777970]" />
                  <span>Analytics</span>
                </Link>
                <Link to="/interview/setup" className="hover:text-[#245C46] transition-colors flex items-center gap-1.5 text-[#245C46] font-semibold">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Setup Interview</span>
                </Link>
              </>
            ) : (
              <>
                <a href="#features" className="hover:text-[#245C46] transition-colors">
                  Features
                </a>
                <a href="#modes" className="hover:text-[#245C46] transition-colors">
                  Practice Modes
                </a>
                <a href="#how-it-works" className="hover:text-[#245C46] transition-colors">
                  How It Works
                </a>
              </>
            )}
          </nav>

          {/* Auth Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#E8E4DA] hover:border-[#245C46]/40 text-[#252923] transition-colors shadow-sm"
                  title="Go to Dashboard"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#245C46] text-white flex items-center justify-center font-bold text-xs uppercase">
                    {user?.name ? user.name[0] : 'U'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-[#252923] leading-tight">
                      {user?.name}
                    </span>
                    <span className="text-[10px] text-[#777970] leading-tight font-mono">
                      {user?.email}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-[#777970] hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all duration-200"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-[#252923] hover:text-[#245C46] transition-colors"
                >
                  Sign In
                </Link>
                <Link to="/signup" className="btn-forest text-xs">
                  <span>Start Practicing</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-[#252923] hover:bg-white border border-[#E8E4DA] min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E8E4DA] bg-[#F8F6F0] px-4 pt-2 pb-6 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-[44px] px-3.5 py-2.5 rounded-xl text-base font-medium text-[#252923] hover:bg-white transition-colors"
          >
            Home
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] px-3.5 py-2.5 rounded-xl text-base font-medium text-[#245C46] bg-[#DCE8DC]/50 border border-[#245C46]/15"
              >
                Dashboard
              </Link>
              <Link
                to="/interview/setup"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] px-3.5 py-2.5 rounded-xl text-base font-medium text-[#245C46] hover:bg-white transition-colors"
              >
                Setup New Interview
              </Link>
              <Link
                to="/interview/history"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] px-3.5 py-2.5 rounded-xl text-base font-medium text-[#252923] hover:bg-white transition-colors"
              >
                Interview History
              </Link>
              <Link
                to="/interview/analytics"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] px-3.5 py-2.5 rounded-xl text-base font-medium text-[#252923] hover:bg-white transition-colors"
              >
                Performance Analytics
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] px-3.5 py-2.5 rounded-xl text-base font-medium text-[#252923] hover:bg-white transition-colors"
              >
                Profile & Settings
              </Link>
            </>
          ) : (
            <>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] px-3.5 py-2.5 rounded-xl text-base font-medium text-[#252923] hover:bg-white transition-colors"
              >
                Features
              </a>
              <a
                href="#modes"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] px-3.5 py-2.5 rounded-xl text-base font-medium text-[#252923] hover:bg-white transition-colors"
              >
                Practice Modes
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] px-3.5 py-2.5 rounded-xl text-base font-medium text-[#252923] hover:bg-white transition-colors"
              >
                How It Works
              </a>
            </>
          )}

          <div className="pt-4 border-t border-[#E8E4DA] space-y-2">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-3.5 py-2.5 bg-white rounded-xl border border-[#E8E4DA]">
                  <div className="w-9 h-9 rounded-lg bg-[#245C46] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {user?.name ? user.name[0] : 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#252923] truncate">{user?.name}</div>
                    <div className="text-xs text-[#777970] truncate">{user?.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium text-sm cursor-pointer hover:bg-rose-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-secondary text-center text-xs min-h-[44px]"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-forest text-center text-xs min-h-[44px]"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
