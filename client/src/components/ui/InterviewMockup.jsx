import { 
  Mic, 
  Video, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Activity, 
  Volume2
} from 'lucide-react';

export default function InterviewMockup() {
  return (
    <div className="relative w-full max-w-5xl mx-auto rounded-2xl bg-white border border-[#E8E4DA] shadow-[0_8px_32px_rgba(37,41,35,0.06)] overflow-hidden text-left">
      {/* Top Header Mockup Bar */}
      <div className="px-4 py-3 bg-[#F8F6F0] border-b border-[#E8E4DA] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8E4DA] border border-[#777970]/30"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8E4DA] border border-[#777970]/30"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8E4DA] border border-[#777970]/30"></span>
          </div>
          <span className="text-xs font-mono text-[#777970] pl-2 border-l border-[#E8E4DA] hidden sm:inline truncate">
            SESSION #AI-9402 • SENIOR FULLSTACK TRACK
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-[#245C46] bg-[#DCE8DC] px-2.5 py-1 rounded-full border border-[#245C46]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#245C46] animate-pulse"></span>
            <span>Live Analysis Active</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#252923] font-mono">
            <Clock className="w-3.5 h-3.5 text-[#245C46]" />
            <span>12:45 / 30:00</span>
          </div>
        </div>
      </div>

      {/* Main Mockup Body */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white">
        
        {/* Left Column: Question & Candidate Response Flow */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* AI Interviewer Question Card */}
          <div className="p-4 rounded-xl bg-[#F8F6F0] border border-[#245C46]/20 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#245C46] font-display">
                <Sparkles className="w-3.5 h-3.5 text-[#245C46]" />
                AI Interviewer (Question 3 of 6)
              </span>
              <span className="text-[11px] font-mono text-[#245C46] bg-[#DCE8DC] px-2 py-0.5 rounded font-medium border border-[#245C46]/15">
                System Architecture & State
              </span>
            </div>
            <p className="text-sm font-medium text-[#252923] leading-relaxed">
              "How would you design a distributed session cache when scaling a Node.js microservice architecture across multiple regions, and how would you handle eventual consistency during split-brain scenarios?"
            </p>
          </div>

          {/* Candidate Live Stream Simulation */}
          <div className="relative rounded-xl bg-white border border-[#E8E4DA] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#777970]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#245C46]"></div>
                <span className="font-semibold text-[#252923]">Live Candidate Transcript</span>
              </div>
              <div className="flex items-center gap-2 text-[#245C46] font-mono">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Audio Stream: Active</span>
              </div>
            </div>

            {/* Speech to text simulation */}
            <div className="p-3 rounded-lg bg-[#F8F6F0] border border-[#E8E4DA] font-mono text-xs text-[#252923] leading-relaxed">
              "I would leverage Redis Cluster with multi-region read replicas. For write operations, routing to a regional primary with raft-consensus avoids conflicting locks, while client-side fallback retains cached user context..."
            </div>

            {/* Audio Waveform visualization */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1 h-5">
                {[6, 14, 22, 10, 18, 28, 12, 20, 30, 16, 24, 18, 10, 14, 26, 12, 8].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}px` }}
                    className="w-1 rounded-full bg-[#245C46] opacity-75"
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#DCE8DC] text-[#245C46]">
                  <Mic className="w-4 h-4 text-[#245C46]" />
                </span>
                <span className="p-1.5 rounded-lg bg-[#DCE8DC] text-[#245C46]">
                  <Video className="w-4 h-4 text-[#245C46]" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time AI Metrics & Feedback */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E4DA]">
              <span className="text-xs font-semibold text-[#252923] uppercase tracking-wider flex items-center gap-1.5 font-display">
                <Activity className="w-3.5 h-3.5 text-[#245C46]" />
                Live Evaluation
              </span>
              <span className="text-[10px] font-mono text-[#245C46] bg-[#DCE8DC] px-2 py-0.5 rounded border border-[#245C46]/20 font-medium">
                Real-Time Rubric
              </span>
            </div>

            {/* Metric Bars */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#252923]">Architectural Depth</span>
                  <span className="font-mono text-[#245C46] font-bold">94%</span>
                </div>
                <div className="w-full h-2 bg-[#E8E4DA] rounded-full overflow-hidden">
                  <div className="h-full bg-[#245C46] rounded-full w-[94%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#252923]">Communication Clarity</span>
                  <span className="font-mono text-[#245C46] font-bold">88%</span>
                </div>
                <div className="w-full h-2 bg-[#E8E4DA] rounded-full overflow-hidden">
                  <div className="h-full bg-[#245C46] rounded-full w-[88%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#252923]">Technical Rigor</span>
                  <span className="font-mono text-[#245C46] font-bold">91%</span>
                </div>
                <div className="w-full h-2 bg-[#E8E4DA] rounded-full overflow-hidden">
                  <div className="h-full bg-[#245C46] rounded-full w-[91%]"></div>
                </div>
              </div>
            </div>

            {/* AI Highlight insight in Sage Green Card */}
            <div className="p-3 rounded-lg bg-[#DCE8DC]/70 border border-[#245C46]/20 text-xs text-[#252923] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#245C46] font-semibold text-[11px] font-display">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#245C46]" />
                Key Strength Detected
              </div>
              <p className="text-[11px] leading-relaxed text-[#252923]/90">
                Strong intuition addressing data replication consistency and split-brain recovery through consensus mechanisms.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
