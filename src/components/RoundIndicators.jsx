import React from 'react';

export default function RoundIndicators({ rounds = [], isComplete = false }) {
  // A round is "completed" when both advocate and opposer text are present
  const completedCount = rounds.filter(r => r.advocate && r.opposer).length;

  // activeStep: 1 to 4
  const activeStep = isComplete ? 4 : Math.min(completedCount + 1, 4);

  // Progress bar logic:
  // 4 steps -> 3 intervals. (0 to 1, 1 to 2, 2 to 3)
  const progressPercent = (Math.min(activeStep - 1, 3) / 3) * 100;

  const steps = [
    { num: 1, label: 'ROUND 1' },
    { num: 2, label: 'ROUND 2' },
    { num: 3, label: 'ROUND 3' },
    { num: 4, label: 'VERDICT' },
  ];

  return (
    <section className="max-w-4xl mx-auto mb-24 mt-4 px-8">
      <div className="relative flex items-center justify-between w-full">
        {/* Track Background */}
        <div className="absolute top-1/2 left-0 w-full h-1.5 -translate-y-1/2 bg-[#1a1e2e]/80 rounded-full z-0 overflow-hidden shadow-inner border border-white/5 backdrop-blur-sm"></div>
        
        {/* Track Fill */}
        <div 
          className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 bg-gradient-to-r from-primary/30 via-primary/70 to-primary rounded-full z-0 transition-all duration-1000 ease-courtly shadow-[0_0_15px_rgba(230,195,100,0.6)]"
          style={{ width: `${progressPercent}%` }}
        ></div>

        {/* Steps */}
        {steps.map((step) => {
          const isCompleted = step.num < activeStep || (isComplete && step.num === 4);
          const isActive = step.num === activeStep;

          let circleClasses = "w-12 h-12 rounded-full flex items-center justify-center font-bold text-base transition-all duration-700 ease-courtly z-10 relative ";
          let labelClasses = "absolute -bottom-9 whitespace-nowrap font-label-caps text-[11px] transition-all duration-700 ease-courtly ";

          if (isCompleted) {
            circleClasses += "bg-[#161d2f] border-2 border-primary text-primary shadow-[0_0_15px_rgba(230,195,100,0.3)]";
            labelClasses += "text-primary/70";
          } else if (isActive) {
            circleClasses += "bg-primary text-[#101415] shadow-[0_0_30px_rgba(230,195,100,0.8)] ring-4 ring-primary/25 scale-110";
            labelClasses += "text-primary tracking-[0.2em] font-bold translate-y-1";
          } else {
            circleClasses += "bg-[#101415] border-2 border-slate-700/50 text-slate-500 shadow-inner";
            labelClasses += "text-slate-600 tracking-wider";
          }

          return (
            <div key={step.num} className="flex flex-col items-center relative group">
              {/* Active Pulse Glow */}
              {isActive && (
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl scale-[1.8] animate-pulse z-0 pointer-events-none"></div>
              )}
              
              <div className={circleClasses}>
                {isCompleted ? (
                  <span className="material-symbols-outlined text-[20px]">check</span>
                ) : step.num === 4 ? (
                  <span className="material-symbols-outlined text-[18px]">
                    {isComplete ? 'gavel' : 'lock'}
                  </span>
                ) : (
                  step.num
                )}
              </div>
              <span className={labelClasses}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
