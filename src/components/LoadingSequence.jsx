import React, { useState, useEffect } from 'react';

const steps = [
  { id: 'parse', label: 'Parsing Resume...', success: 'Resume Parsed' },
  { id: 'match', label: 'Matching Job Description...', success: 'Context Aligned' },
  { id: 'ats', label: 'Initializing ATS Engine...', success: 'ATS Ready' },
  { id: 'panel', label: 'Assembling AI Panel...', success: 'Panel Ready' }
];

export default function LoadingSequence({ onComplete }) {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let currentStep = 0;
    
    const runStep = () => {
      setProgress(0);
      let p = 0;
      const interval = setInterval(() => {
        p += Math.floor(Math.random() * 20) + 10;
        if (p >= 100) {
          p = 100;
          setProgress(p);
          clearInterval(interval);
          setTimeout(() => {
            currentStep++;
            if (currentStep < steps.length) {
              setActiveStep(currentStep);
              runStep();
            } else {
              setTimeout(onComplete, 500);
            }
          }, 400);
        } else {
          setProgress(p);
        }
      }, 100);
    };

    runStep();
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-in-up">
      <div className="w-full max-w-md bg-[#09090B] border border-[#27272A] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-[#5B8CFF]/5 blur-3xl pointer-events-none"></div>

        <h3 className="text-white font-headline-md text-xl mb-8 flex items-center gap-3">
          <span className="material-symbols-outlined text-[#5B8CFF] animate-spin-slow">hourglass_empty</span>
          Initializing AI Court
        </h3>

        <div className="space-y-6 relative">
          {/* Vertical connecting line */}
          <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-[#27272A] z-0"></div>

          {steps.map((step, idx) => {
            const isPast = idx < activeStep;
            const isActive = idx === activeStep;
            const isFuture = idx > activeStep;

            return (
              <div key={step.id} className="relative z-10">
                <div className="flex items-center gap-4">
                  {/* Icon Indicator */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-500
                    ${isPast ? 'bg-[#22C55E]/20 text-[#22C55E]' : 
                      isActive ? 'bg-[#5B8CFF]/20 text-[#5B8CFF] ring-2 ring-[#5B8CFF]/50 shadow-[0_0_10px_rgba(91,140,255,0.4)]' : 
                      'bg-[#18181B] border border-[#27272A] text-[#52525B]'}`}
                  >
                    {isPast && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                    {isActive && <div className="w-2 h-2 bg-[#5B8CFF] rounded-full animate-pulse"></div>}
                  </div>

                  {/* Text */}
                  <div className="flex-1 flex justify-between items-center">
                    <span className={`text-sm font-label-caps tracking-wider transition-colors duration-300
                      ${isPast ? 'text-[#A1A1AA]' : isActive ? 'text-[#5B8CFF] font-bold' : 'text-[#52525B]'}`}>
                      {isPast ? step.success : step.label}
                    </span>
                    {isActive && <span className="text-xs text-[#71717A] font-mono">{progress}%</span>}
                  </div>
                </div>
                
                {/* Progress Bar just for the active step */}
                {isActive && (
                  <div className="ml-10 mt-3 h-1 w-full max-w-[85%] bg-[#171A20] rounded-full overflow-hidden border border-[#2D2F36]">
                    <div 
                      className="h-full bg-[#5B8CFF] transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
