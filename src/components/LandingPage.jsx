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
          <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features').scrollIntoView({behavior: 'smooth'}); }} className="hover:text-[#FAFAFA] transition-colors">Features</a>
          <a href="#how-it-works" onClick={(e) => { e.preventDefault(); document.getElementById('how-it-works').scrollIntoView({behavior: 'smooth'}); }} className="hover:text-[#FAFAFA] transition-colors">How it works</a>
          <a href="#faq" className="hover:text-[#FAFAFA] transition-colors">FAQ</a>
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

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 bg-[#111318] border-y border-[#27272A]/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-[#FAFAFA]">
              Why Use <span className="text-[#4F7DF3]">HireFlow?</span>
            </h2>
            <p className="text-[#A1A1AA] text-lg max-w-2xl mx-auto">
              A complete toolkit to optimize your resume and ace the interview process.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-8 hover:border-[#4F7DF3]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(79,125,243,0.15)] group">
              <div className="w-12 h-12 rounded-xl bg-[#4F7DF3]/10 border border-[#4F7DF3]/20 flex items-center justify-center mb-6 group-hover:bg-[#4F7DF3]/20 transition-colors">
                <span className="material-symbols-outlined text-[#4F7DF3] text-[24px]">gavel</span>
              </div>
              <h3 className="text-xl font-bold text-[#FAFAFA] mb-3">AI Hiring Panel</h3>
              <p className="text-[#A1A1AA] leading-relaxed text-sm">
                Get your resume reviewed by a simulated panel: an ATS bot, a Tech Recruiter, a Senior Engineer, and a Hiring Manager. Understand exactly how different roles view your application.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-8 hover:border-[#F59E0B]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] group">
              <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center mb-6 group-hover:bg-[#F59E0B]/20 transition-colors">
                <span className="material-symbols-outlined text-[#F59E0B] text-[24px]">manage_search</span>
              </div>
              <h3 className="text-xl font-bold text-[#FAFAFA] mb-3">Deep ATS Scan</h3>
              <p className="text-[#A1A1AA] leading-relaxed text-sm">
                Identify exact missing keywords, analyze skills gaps, and get your bullet points automatically rewritten using the STAR method to maximize your matching score.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-8 hover:border-[#22C55E]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.15)] group">
              <div className="w-12 h-12 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center mb-6 group-hover:bg-[#22C55E]/20 transition-colors">
                <span className="material-symbols-outlined text-[#22C55E] text-[24px]">quiz</span>
              </div>
              <h3 className="text-xl font-bold text-[#FAFAFA] mb-3">Interview Kit</h3>
              <p className="text-[#A1A1AA] leading-relaxed text-sm">
                Don't just pass the resume screen. HireFlow automatically generates behavioral and technical interview questions perfectly tailored to the gaps in your resume and the target JD.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="relative z-10 py-24 bg-[#09090B]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-[#FAFAFA]">
              How it <span className="text-[#4F7DF3]">Works</span>
            </h2>
            <p className="text-[#A1A1AA] text-lg max-w-2xl mx-auto">
              Three simple steps to optimize your job hunt.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto pt-4">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-[3rem] left-0 w-full h-0.5 bg-gradient-to-r from-[#27272A] via-[#4F7DF3]/50 to-[#27272A] z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 relative z-10">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#171A20] border-2 border-[#4F7DF3] flex items-center justify-center text-xl font-bold text-[#FAFAFA] mb-6 shadow-[0_0_20px_rgba(79,125,243,0.3)]">
                  1
                </div>
                <h3 className="text-xl font-bold text-[#FAFAFA] mb-3">Upload Assets</h3>
                <p className="text-[#A1A1AA] text-sm leading-relaxed">
                  Drop your current resume (PDF, DOCX) and paste the exact Job Description you are targeting.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#171A20] border-2 border-[#4F7DF3] flex items-center justify-center text-xl font-bold text-[#FAFAFA] mb-6 shadow-[0_0_20px_rgba(79,125,243,0.3)]">
                  2
                </div>
                <h3 className="text-xl font-bold text-[#FAFAFA] mb-3">AI Analysis</h3>
                <p className="text-[#A1A1AA] text-sm leading-relaxed">
                  Our autonomous agents review your profile from multiple perspectives simultaneously to find weaknesses.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#171A20] border-2 border-[#4F7DF3] flex items-center justify-center text-xl font-bold text-[#FAFAFA] mb-6 shadow-[0_0_20px_rgba(79,125,243,0.3)]">
                  3
                </div>
                <h3 className="text-xl font-bold text-[#FAFAFA] mb-3">Optimize & Prep</h3>
                <p className="text-[#A1A1AA] text-sm leading-relaxed">
                  Apply the recommended bullet rewrites and use the generated interview questions to ace the real thing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 border-t border-[#27272A]/50 bg-[#111318]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-[#FAFAFA]">
            Ready to stop guessing?
          </h2>
          <p className="text-[#A1A1AA] text-lg mb-10 max-w-xl mx-auto">
            Join other engineers and professionals who are using AI to land their dream jobs.
          </p>
          <button 
            onClick={onGetStarted}
            className="bg-[#4F7DF3] text-white px-10 py-4 rounded-xl text-[16px] font-semibold hover:bg-[#436FE3] transition-all inline-flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(79,125,243,0.4)] hover:scale-105"
          >
            Start Analyzing for Free
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="relative z-10 border-t border-[#27272A] bg-[#09090B] py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 bg-[#FAFAFA] rounded flex items-center justify-center">
                <span className="text-[#09090B] font-black text-xs tracking-tighter">HF</span>
              </div>
              <span className="font-bold text-lg tracking-tight text-[#FAFAFA]">HireFlow</span>
            </div>
            <p className="text-[#A1A1AA] text-sm max-w-xs leading-relaxed">
              The ultimate AI-powered application workflow. Built for the modern job seeker.
            </p>
          </div>
          
          <div>
            <h4 className="text-[#FAFAFA] font-semibold mb-4 text-sm">Product</h4>
            <ul className="space-y-2 text-sm text-[#A1A1AA]">
              <li><a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features').scrollIntoView({behavior: 'smooth'}); }} className="hover:text-[#FAFAFA] transition-colors">Features</a></li>
              <li><a href="#how-it-works" onClick={(e) => { e.preventDefault(); document.getElementById('how-it-works').scrollIntoView({behavior: 'smooth'}); }} className="hover:text-[#FAFAFA] transition-colors">How it works</a></li>
              <li><a href="#" className="hover:text-[#FAFAFA] transition-colors">Pricing</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-[#FAFAFA] font-semibold mb-4 text-sm">Legal</h4>
            <ul className="space-y-2 text-sm text-[#A1A1AA]">
              <li><a href="#" className="hover:text-[#FAFAFA] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#FAFAFA] transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 border-t border-[#27272A] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#52525B] text-xs">© {new Date().getFullYear()} HireFlow AI. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="text-[#52525B] hover:text-[#FAFAFA] transition-colors">
              <span className="material-symbols-outlined text-[20px]">link</span>
            </a>
            <a href="#" className="text-[#52525B] hover:text-[#FAFAFA] transition-colors">
              <span className="material-symbols-outlined text-[20px]">share</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
