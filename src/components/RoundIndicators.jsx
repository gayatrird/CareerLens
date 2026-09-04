import React from 'react';

const STEPS = [
  { num: 1, label: 'ATS', icon: 'manage_search' },
  { num: 2, label: 'RECRUITER', icon: 'person_search' },
  { num: 3, label: 'ENGINEER', icon: 'code' },
  { num: 4, label: 'MANAGER', icon: 'supervisor_account' },
  { num: 5, label: 'OPTIMIZER', icon: 'auto_fix_high' },
  { num: 6, label: 'RESULT', icon: 'analytics' },
];

export default function StepIndicators({ completedAgents = [], activeAgent = null, isComplete = false }) {
  // Map agent id to step number
  const agentToStep = { ats: 1, recruiter: 2, engineer: 3, manager: 4, optimizer: 5 };
  const completedCount = completedAgents.length;
  const activeStep = isComplete ? 6 : (agentToStep[activeAgent] ?? Math.min(completedCount + 1, 5));
  const progressPercent = (Math.min(activeStep - 1, 5) / 5) * 100;

  return (
    <section className="max-w-4xl mx-auto mb-20 mt-4 pb-10 px-4 md:px-8 w-full overflow-hidden sm:overflow-visible">
      <div className="relative flex items-center justify-between w-full min-w-[400px]">
        {/* Track Background */}
        <div className="absolute top-1/2 left-0 w-full h-[3px] -translate-y-1/2 bg-[#27272A] rounded-full z-0"></div>

        {/* Track Fill */}
        <div
          className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 bg-[#5B8CFF] rounded-full z-0 transition-all duration-1000 ease-courtly"
          style={{ width: `${progressPercent}%`, boxShadow: '0 0 8px rgba(91,140,255,0.4)' }}
        />

        {/* Steps */}
        {STEPS.map((step) => {
          const isCompleted = step.num < activeStep || (isComplete && step.num === 6);
          const isActive = step.num === activeStep;

          let circleClasses = "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-700 ease-courtly z-10 relative ";
          let labelClasses = "absolute -bottom-9 whitespace-nowrap font-label-caps text-[10px] transition-all duration-700 ease-courtly ";

          if (isCompleted) {
            circleClasses += "w-9 h-9 bg-[#18181B] border-2 border-[#5B8CFF]/60 text-[#5B8CFF] transition-all duration-500";
            labelClasses += "text-[#71717A]";
          } else if (isActive) {
            circleClasses += "w-9 h-9 bg-[#5B8CFF] text-white shadow-[0_0_20px_rgba(91,140,255,0.5)] ring-4 ring-[#5B8CFF]/20 scale-110";
            labelClasses += "text-[#5B8CFF] font-semibold";
          } else {
            circleClasses += "w-9 h-9 bg-[#09090B] border-2 border-[#27272A] text-[#52525B]";
            labelClasses += "text-[#52525B]";
          }

          return (
            <div key={step.num} className="flex flex-col items-center relative group">
              {isActive && (
                <div className="absolute inset-0 rounded-full bg-[#5B8CFF]/15 blur-xl scale-[2] animate-pulse z-0 pointer-events-none"></div>
              )}
              <div className={circleClasses}>
                {isCompleted ? (
                  <span className="material-symbols-outlined text-[16px]">check</span>
                ) : step.num === 6 ? (
                  <span className="material-symbols-outlined text-[16px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    {isComplete ? 'analytics' : 'lock'}
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-[14px]">{step.icon}</span>
                )}
              </div>
              <span className={labelClasses}>{step.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
