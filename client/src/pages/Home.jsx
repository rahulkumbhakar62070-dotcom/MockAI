import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import InterviewMockup from '../components/ui/InterviewMockup';
import { 
  Sparkles, 
  ArrowRight, 
  Code, 
  Video, 
  MessageSquare, 
  BarChart3, 
  Brain, 
  ShieldCheck, 
  CheckCircle2, 
  Zap,
  Target
} from 'lucide-react';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-24 sm:space-y-32 pb-20">
      
      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 lg:pt-24 text-center px-4 max-w-7xl mx-auto">
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DCE8DC] border border-[#245C46]/20 text-[#245C46] text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-[#245C46]" />
            <span>MERN-Powered Career Technology</span>
          </div>

          {/* Main Hero Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold tracking-tight text-[#252923] leading-[1.1]">
            Ace Your Next Interview{' '}
            <span className="text-[#245C46] underline decoration-[#DCE8DC] decoration-4 underline-offset-8">
              with AI
            </span>
          </h1>

          {/* Clear Product Description */}
          <p className="text-base sm:text-lg text-[#777970] max-w-2xl mx-auto leading-relaxed">
            Practice realistic technical and behavioral interviews with an intelligent AI interviewer. Get instant actionable feedback, structured rubrics, and targeted guidance tailored to modern software engineering roles.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to={isAuthenticated ? "/dashboard" : "/signup"}
              className="btn-forest w-full sm:w-auto text-base px-8 py-3.5"
            >
              <span>{isAuthenticated ? "Go to Dashboard" : "Start Practicing"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#features"
              className="btn-secondary w-full sm:w-auto text-base px-7 py-3.5"
            >
              <span>Explore Features</span>
            </a>
          </div>

          <div className="pt-2 text-xs text-[#777970] flex items-center justify-center gap-6 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#245C46]" />
              <span>Fullstack & System Design tracks</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#245C46]" />
              <span>Text & Audio/Video options</span>
            </span>
          </div>
        </div>

        {/* Live UI Mockup Preview */}
        <div className="mt-14 sm:mt-18">
          <InterviewMockup />
        </div>
      </section>

      {/* Practice Modes Section (Text vs Camera/Audio) */}
      <section id="modes" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-semibold text-[#245C46] tracking-wider uppercase font-display">
            Assessment Formats
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#252923]">
            Choose Your Preferred Interview Mode
          </h2>
          <p className="text-sm text-[#777970]">
            Adapt your practice environment to your schedule, hardware setup, or target interview round.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: Text-Based Practice */}
          <div className="editorial-card editorial-card-hover p-8 space-y-6 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-[#DCE8DC] flex items-center justify-center text-[#245C46] group-hover:scale-105 transition-transform duration-200">
              <MessageSquare className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-bold text-[#252923]">
                  Text-Based Interview Mode
                </h3>
                <span className="text-[11px] font-mono text-[#245C46] bg-[#DCE8DC] px-2.5 py-0.5 rounded font-semibold border border-[#245C46]/20">
                  Async & Rapid
                </span>
              </div>
              <p className="text-sm text-[#777970] leading-relaxed">
                Ideal for quick practice, coding syntax explanation, and structured problem decomposition without requiring microphone or camera hardware.
              </p>
            </div>

            <ul className="space-y-2.5 text-xs text-[#252923] border-t border-[#E8E4DA] pt-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#245C46] shrink-0" />
                <span>Chat-based back-and-forth technical questioning</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#245C46] shrink-0" />
                <span>Structured markdown response support for code snippets</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#245C46] shrink-0" />
                <span>Immediate answer evaluation and optimal answer references</span>
              </li>
            </ul>

            <Link
              to={isAuthenticated ? "/interview/setup" : "/signup"}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#245C46] hover:text-[#1D4A38] pt-2 transition-colors"
            >
              <span>Practice in Text Mode</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Camera & Voice Interview */}
          <div className="editorial-card editorial-card-hover p-8 space-y-6 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-[#DCE8DC] flex items-center justify-center text-[#245C46] group-hover:scale-105 transition-transform duration-200">
              <Video className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-bold text-[#252923]">
                  Camera & Audio Live Simulation
                </h3>
                <span className="badge-orange">
                  Realistic Virtual Setup
                </span>
              </div>
              <p className="text-sm text-[#777970] leading-relaxed">
                Replicate the pressure of actual Zoom, Google Meet, or HireVue rounds with real-time vocal articulation, confidence pacing, and live AI interaction.
              </p>
            </div>

            <ul className="space-y-2.5 text-xs text-[#252923] border-t border-[#E8E4DA] pt-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#245C46] shrink-0" />
                <span>Real-time voice-to-text processing for conversational flow</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#245C46] shrink-0" />
                <span>Pacing, filler word detection, and communication clarity analysis</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#245C46] shrink-0" />
                <span>Simulates full virtual interview atmosphere with adaptive follow-ups</span>
              </li>
            </ul>

            <Link
              to={isAuthenticated ? "/interview/setup" : "/signup"}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#245C46] hover:text-[#1D4A38] pt-2 transition-colors"
            >
              <span>Practice in Camera/Audio Mode</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-semibold text-[#245C46] tracking-wider uppercase font-display">
            Core Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#252923]">
            Built Specifically for Technical Interviews
          </h2>
          <p className="text-sm text-[#777970]">
            Every feature is designed around real engineering interview rubrics used by leading tech organizations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="editorial-card p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#DCE8DC] flex items-center justify-center text-[#245C46]">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#252923]">
              Adaptive Follow-Up Questions
            </h3>
            <p className="text-xs text-[#777970] leading-relaxed">
              The AI interviewer listens to your specific explanations and challenges your architectural trade-offs dynamically rather than reciting static scripts.
            </p>
          </div>

          <div className="editorial-card p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#DCE8DC] flex items-center justify-center text-[#245C46]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#252923]">
              Multi-Dimensional Rubric
            </h3>
            <p className="text-xs text-[#777970] leading-relaxed">
              Receive structured breakdown scores on problem decomposition, algorithmic correctness, scalability considerations, and communication clarity.
            </p>
          </div>

          <div className="editorial-card p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#DCE8DC] flex items-center justify-center text-[#245C46]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#252923]">
              Verified Session Security
            </h3>
            <p className="text-xs text-[#777970] leading-relaxed">
              Stateless JSON Web Tokens with salted bcrypt password hashing protect your mock interview history and profile across devices.
            </p>
          </div>

          <div className="editorial-card p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#DCE8DC] flex items-center justify-center text-[#245C46]">
              <Code className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#252923]">
              Role-Specific Curriculum
            </h3>
            <p className="text-xs text-[#777970] leading-relaxed">
              Practice specialized tracks for React/Frontend, Node.js/Backend, Distributed Systems, Database Design, and behavioral leadership.
            </p>
          </div>

          <div className="editorial-card p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#DCE8DC] flex items-center justify-center text-[#245C46]">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#252923]">
              Zero Pressure Sandbox
            </h3>
            <p className="text-xs text-[#777970] leading-relaxed">
              Make mistakes, rehearse complex explanations, and refine your answers in a private sandbox before taking high-stakes company calls.
            </p>
          </div>

          <div className="editorial-card p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#DCE8DC] flex items-center justify-center text-[#245C46]">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#252923]">
              Actionable Suggested Answers
            </h3>
            <p className="text-xs text-[#777970] leading-relaxed">
              After each session, inspect reference responses highlighting critical terms, edge cases, and design patterns to include in real rounds.
            </p>
          </div>

        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-semibold text-[#245C46] tracking-wider uppercase font-display">
            Simple 4-Step Process
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#252923]">
            How The Platform Works
          </h2>
          <p className="text-sm text-[#777970]">
            From account creation to interview mastery in four seamless steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          <div className="editorial-card p-6 space-y-3">
            <span className="text-3xl font-display font-extrabold text-[#245C46]/25">01</span>
            <h4 className="text-base font-bold text-[#252923]">Create Account</h4>
            <p className="text-xs text-[#777970] leading-relaxed">
              Sign up securely with your email. Your profile persists your practice history and settings.
            </p>
          </div>

          <div className="editorial-card p-6 space-y-3">
            <span className="text-3xl font-display font-extrabold text-[#245C46]/25">02</span>
            <h4 className="text-base font-bold text-[#252923]">Select Track & Mode</h4>
            <p className="text-xs text-[#777970] leading-relaxed">
              Choose your seniority level and preferred format: quick text chat or live camera/microphone simulation.
            </p>
          </div>

          <div className="editorial-card p-6 space-y-3">
            <span className="text-3xl font-display font-extrabold text-[#245C46]/25">03</span>
            <h4 className="text-base font-bold text-[#252923]">Conduct Interview</h4>
            <p className="text-xs text-[#777970] leading-relaxed">
              Answer technical prompts and articulate architectural reasoning to dynamic follow-ups.
            </p>
          </div>

          <div className="editorial-card p-6 space-y-3">
            <span className="text-3xl font-display font-extrabold text-[#245C46]/25">04</span>
            <h4 className="text-base font-bold text-[#252923]">Review Rubric</h4>
            <p className="text-xs text-[#777970] leading-relaxed">
              Examine detailed criteria scores, strengths, weaknesses, and model answers to level up.
            </p>
          </div>

        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="rounded-3xl p-8 sm:p-12 bg-[#245C46] text-white shadow-sm text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white">
            Ready to Accelerate Your Interview Preparation?
          </h2>
          <p className="text-sm sm:text-base text-white/80 max-w-xl mx-auto leading-relaxed">
            Create your account today and experience AI-assisted interview practice designed for modern software engineers.
          </p>
          <div>
            <Link
              to={isAuthenticated ? "/dashboard" : "/signup"}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white hover:bg-[#F8F6F0] text-[#245C46] font-semibold text-sm transition-all duration-200 shadow-sm"
            >
              <span>{isAuthenticated ? "Go to Your Dashboard" : "Start Practicing Now"}</span>
              <ArrowRight className="w-4 h-4 text-[#245C46]" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
