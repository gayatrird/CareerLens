import React, { useState, useEffect } from 'react';

const steps = [
  { id: 'parse', label: 'Parsing Resume...', success: '✓ Resume Parsed' },
  { id: 'match', label: 'Matching Job Description...', success: '✓ Context Aligned' },
  { id: 'ats', label: 'Initializing ATS Engine...', success: '✓ ATS Ready' },
  { id: 'panel', label: 'Assembling AI Panel...', success: '✓ Panel Ready' }
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
      <div className="w-full max-w-md">
        {steps.map((step, idx) => {
          const isPast = idx < activeStep;
          const isActive = idx === activeStep;
          const isFuture = idx > activeStep;

          if (isFuture) return null;

          return (
            <div key={step.id} className="mb-6 animate-fade-in-up">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-label-caps tracking-wider ${isPast ? 'text-[#22C55E]' : 'text-[#4F7DF3]'}`}>
                  {isPast ? step.success : step.label}
                </span>
                {isActive && <span className="text-xs text-[#71717A]">{progress}%</span>}
              </div>
              <div className="h-1.5 w-full bg-[#171A20] rounded-full overflow-hidden border border-[#2D2F36]">
                <div 
                  className={`h-full transition-all duration-200 ${isPast ? 'bg-[#22C55E]' : 'bg-[#4F7DF3]'}`}
                  style={{ width: isPast ? '100%' : `${progress}%` }}
                />
              </div>
              {idx < steps.length - 1 && isPast && idx === activeStep - 1 && (
                <div className="flex justify-center mt-6 text-[#3F3F46] animate-pulse">
                  <span className="material-symbols-outlined text-sm">arrow_downward</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
