import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full bg-[#F8F6F0] border-t border-[#E8E4DA] text-[#777970] text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Brand & Description */}
          <div className="space-y-3 sm:col-span-2 md:col-span-6 lg:col-span-6">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#245C46] rounded-lg p-0.5"
            >
              <div className="w-7 h-7 rounded-lg bg-[#245C46] flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="font-display font-bold text-base tracking-tight text-[#252923]">
                MockAI
              </span>
            </Link>
            <p className="text-sm text-[#777970] max-w-sm leading-relaxed">
              Practice interviews, improve your answers, and track your progress.
            </p>
          </div>

          {/* Column 1 — Practice */}
          <div className="space-y-3 sm:col-span-1 md:col-span-3 lg:col-span-3">
            <h4 className="text-xs font-semibold text-[#252923] tracking-wider uppercase font-display">
              Practice
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link 
                  to="/interview/setup" 
                  className="hover:text-[#245C46] transition-colors focus-visible:outline-none focus-visible:underline inline-block py-0.5"
                >
                  Technical Interviews
                </Link>
              </li>
              <li>
                <Link 
                  to="/interview/history" 
                  className="hover:text-[#245C46] transition-colors focus-visible:outline-none focus-visible:underline inline-block py-0.5"
                >
                  Interview History
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2 — Account */}
          <div className="space-y-3 sm:col-span-1 md:col-span-3 lg:col-span-3">
            <h4 className="text-xs font-semibold text-[#252923] tracking-wider uppercase font-display">
              Account
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link 
                  to="/login" 
                  className="hover:text-[#245C46] transition-colors focus-visible:outline-none focus-visible:underline inline-block py-0.5"
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link 
                  to="/signup" 
                  className="hover:text-[#245C46] transition-colors focus-visible:outline-none focus-visible:underline inline-block py-0.5"
                >
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Section */}
        <div className="mt-10 pt-6 border-t border-[#E8E4DA] text-xs text-[#777970] text-center sm:text-left">
          <p>© 2026 MockAI. Built for interview practice.</p>
        </div>
      </div>
    </footer>
  );
}

