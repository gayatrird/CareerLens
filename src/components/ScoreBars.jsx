import React, { useEffect, useState } from 'react';

export default function ScoreBars({ scores, personaColor }) {
  if (!scores) return null;

  return (
    <div className="mt-4 space-y-2 animate-fade-in-up border-t border-white/5 pt-4">
      <ScoreBar label="Logic" score={scores.logic} color="#3b82f6" />
      <ScoreBar label="Evidence" score={scores.evidence} color="#eab308" />
      <ScoreBar label="Impact" score={scores.impact} color={personaColor} />
    </div>
  );
}

function ScoreBar({ label, score, color }) {
  const [currentScore, setCurrentScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800;
    const startTime = performance.now();

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setCurrentScore(Math.floor(progress * score));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentScore(score);
      }
    };
    
    requestAnimationFrame(animate);
  }, [score]);

  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-[10px] font-label-caps text-slate-400 uppercase tracking-widest text-left">{label}</span>
      <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden relative">
        <div 
          className="h-full rounded-full shadow-[0_0_8px_currentColor] absolute left-0 top-0"
          style={{ 
            width: `${currentScore}%`, 
            backgroundColor: color,
            color: color,
            transition: 'width 800ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        ></div>
      </div>
      <span className="w-6 text-right text-xs font-bold" style={{ color }}>{currentScore}</span>
    </div>
  );
}
