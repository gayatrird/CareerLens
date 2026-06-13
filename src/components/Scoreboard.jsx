import React from 'react';

export default function Scoreboard({ leftPersona, rightPersona, leftScore, rightScore }) {
  if (!leftPersona || !rightPersona) return null;

  const showLeftCrown = leftScore > rightScore && leftScore > 0;
  const showRightCrown = rightScore > leftScore && rightScore > 0;

  return (
    <div className="flex justify-center items-center gap-6 mb-8 animate-fade-in-up">
      <div className="flex items-center gap-4 bg-[#111827] border border-white/10 px-6 py-3 rounded-full shadow-lg">
        {/* Left Side */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">{leftPersona.emoji}</span>
          <div className="flex flex-col">
            <span className="text-[10px] font-label-caps text-slate-400 uppercase tracking-widest">{leftPersona.name}</span>
            <span className="font-black text-xl" style={{ color: leftPersona.color }}>{leftScore}</span>
          </div>
          {showLeftCrown && <span className="text-xl drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">👑</span>}
        </div>

        <div className="h-8 w-px bg-white/10 mx-2"></div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {showRightCrown && <span className="text-xl drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">👑</span>}
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-label-caps text-slate-400 uppercase tracking-widest">{rightPersona.name}</span>
            <span className="font-black text-xl" style={{ color: rightPersona.color }}>{rightScore}</span>
          </div>
          <span className="text-2xl">{rightPersona.emoji}</span>
        </div>
      </div>
    </div>
  );
}
