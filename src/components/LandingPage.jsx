import React from 'react';

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans relative overflow-hidden">
      {/* Background Grid */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#FAFAFA 1px, transparent 1px), linear-gradient(90deg, #FAFAFA 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      ></div>

      {/* Top Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto border-b border-[#27272A]/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FAFAFA] rounded flex items-center justify-center">
            <span className="text-[#09090B] font-black text-sm tracking-tighter">HF</span>
          </div>
          <span className="font-bold text-lg tracking-tight">HireFlow</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#A1A1AA]">
          <a href="#" className="hover:text-[#FAFAFA] transition-colors">Features</a>
          <a href="#" className="hover:text-[#FAFAFA] transition-colors">How it works</a>
          <a href="#" className="hover:text-[#FAFAFA] transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-sm font-medium text-[#FAFAFA] hover:text-[#4F7DF3] transition-colors hidden sm:block">
            Sign In
          </button>
          <button 
            onClick={onGetStarted}
            className="bg-[#4F7DF3] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#436FE3] transition-colors shadow-[0_0_15px_rgba(79,125,243,0.3)]"
          >
            Get Started
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-6 pb-12 lg:pt-10 lg:pb-24 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">
        
        {/* Left Column: Copy */}
        <div className="flex flex-col items-start text-left animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4F7DF3]/10 border border-[#4F7DF3]/20 text-[#4F7DF3] text-xs font-semibold mb-8">
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            Resume Optimization, Simplified
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Turn Your Resume into an Application <span className="text-[#4F7DF3]">You'll Actually Land</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-[#A1A1AA] max-w-xl mb-10 leading-relaxed">
            No more ghosting. Organize, track, score, and optimize your resume for any tech company using an elite AI hiring panel.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button 
              onClick={onGetStarted}
              className="w-full sm:w-auto bg-[#4F7DF3] text-white px-8 py-3.5 rounded-xl text-[15px] font-semibold hover:bg-[#436FE3] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,125,243,0.3)]"
            >
              Start Analyzing for Free
              <span className="material-symbols-outlined text-[18px]">arrow_outward</span>
            </button>
            <button className="w-full sm:w-auto bg-transparent border border-[#27272A] text-[#FAFAFA] px-8 py-3.5 rounded-xl text-[15px] font-medium hover:border-[#3F3F46] hover:bg-[#111318] transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">play_circle</span>
              Watch Demo
            </button>
          </div>
        </div>

        {/* Right Column: 3D UI Mockup */}
        <div className="relative w-full h-[400px] lg:h-[500px] flex items-center justify-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          
          {/* Glow Behind Mockup */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#4F7DF3]/20 blur-[100px] rounded-full pointer-events-none"></div>

          {/* 3D Container */}
          <div 
            className="relative w-full max-w-[500px] transition-transform duration-700 hover:scale-[1.02]"
            style={{ perspective: '1200px' }}
          >
            <div 
              className="bg-[#171A20] border border-[#2D2F36] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 overflow-hidden relative"
              style={{ transform: 'rotateY(-15deg) rotateX(10deg) translateZ(0)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 border-b border-[#2D2F36] pb-4">
                <div>
                  <h3 className="text-white font-bold text-lg">Senior React Engineer</h3>
                  <p className="text-[#A1A1AA] text-xs mt-1">Google • Software Engineering</p>
                </div>
                <div className="text-right">
                  <div className="text-[#22C55E] text-2xl font-black">88<span className="text-sm">%</span></div>
                  <div className="text-[10px] text-[#22C55E] font-label-caps tracking-widest mt-0.5">STRONG FIT</div>
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-4">
                {/* ATS */}
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#3b82f6]/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#3b82f6] text-[16px]">manage_search</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#FAFAFA] font-medium">ATS Analyzer</span>
                      <span className="text-[#A1A1AA]">90/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#09090B] rounded-full overflow-hidden">
                      <div className="h-full bg-[#3b82f6] w-[90%]"></div>
                    </div>
                  </div>
                </div>

                {/* Recruiter */}
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#8b5cf6] text-[16px]">person_search</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#FAFAFA] font-medium">Tech Recruiter</span>
                      <span className="text-[#A1A1AA]">90/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#09090B] rounded-full overflow-hidden">
                      <div className="h-full bg-[#8b5cf6] w-[90%]"></div>
                    </div>
                  </div>
                </div>

                {/* Engineer */}
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#10b981]/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#10b981] text-[16px]">code</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#FAFAFA] font-medium">Senior Engineer</span>
                      <span className="text-[#A1A1AA]">80/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#09090B] rounded-full overflow-hidden">
                      <div className="h-full bg-[#10b981] w-[80%]"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Banner */}
              <div className="mt-8 bg-[#4F7DF3]/10 border border-[#4F7DF3]/20 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#4F7DF3] text-[16px]">psychology</span>
                  <span className="text-[#4F7DF3] text-xs font-semibold">Generate Interview Questions</span>
                </div>
                <span className="material-symbols-outlined text-[#4F7DF3] text-[16px]">arrow_forward</span>
              </div>
            </div>

            {/* Decorative Floating Elements */}
            <div 
              className="absolute -top-6 -right-6 bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] px-4 py-2 rounded-xl text-xs font-bold shadow-lg backdrop-blur-sm"
              style={{ transform: 'translateZ(50px)' }}
            >
              ✓ Resume Parsed
            </div>
            <div 
              className="absolute -bottom-4 -left-8 bg-[#09090B] border border-[#2D2F36] text-[#A1A1AA] px-4 py-2 rounded-xl text-xs font-medium shadow-xl flex items-center gap-2"
              style={{ transform: 'translateZ(30px)' }}
            >
              <span className="material-symbols-outlined text-[#4F7DF3] text-[14px]">local_fire_department</span>
              Interview Ready in 15s
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
