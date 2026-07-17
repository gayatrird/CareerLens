import React from 'react';

export default function MatchScoreboard({ atsScore, recruiterScore, engineerScore, managerScore }) {
  const scores = [
    { label: 'ATS', score: atsScore, color: '#3b82f6' },
    { label: 'Recruiter', score: recruiterScore, color: '#8b5cf6' },
    { label: 'Engineer', score: engineerScore, color: '#10b981' },
    { label: 'Manager', score: managerScore, color: '#f59e0b' },
  ].filter(s => s.score != null && s.score > 0);

  if (scores.length === 0) return null;

  const avg = Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length);

  return (
    <div className="flex flex-wrap justify-center items-center gap-4 mb-8 animate-fade-in-up">
      <div className="flex items-center gap-4 bg-[#111827] border border-white/10 px-6 py-3 rounded-full shadow-lg flex-wrap">
        {scores.map(({ label, score, color }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-label-caps text-slate-400 uppercase tracking-widest">{label}</span>
              <span className="font-black text-base" style={{ color }}>{score}</span>
            </div>
          </div>
        ))}

        {scores.length > 1 && (
          <>
            <div className="h-8 w-px bg-white/10 mx-1"></div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-label-caps text-slate-400 uppercase tracking-widest">AVG</span>
              <span className="font-black text-base text-primary">{avg}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
