import React, { useEffect, useState } from 'react';

function matchLabel(score) {
  if (score >= 75) return { label: 'STRONG FIT', colorClass: 'text-green-400' };
  if (score >= 55) return { label: 'POSSIBLE FIT', colorClass: 'text-amber-400' };
  return { label: 'NOT ALIGNED', colorClass: 'text-red-400' };
}

export default function HistorySection() {
  const [archives, setArchives] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('courtroom_archives');
      if (saved) {
        setArchives(JSON.parse(saved).reverse());
      }
    } catch (e) {
      console.error("Error loading history", e);
    }
  }, []);

  const clearHistory = () => {
    if (window.confirm("Clear all analysis history?")) {
      localStorage.removeItem('courtroom_archives');
      setArchives([]);
    }
  };

  if (archives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in-up px-4">
        <div className="w-20 h-20 rounded-2xl bg-[#171A20] border border-[#2D2F36] flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-5xl text-[#3F3F46]" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
        </div>
        <h2 className="font-headline-md text-xl text-[#FAFAFA] mb-2">No History Yet</h2>
        <p className="text-[#71717A] text-sm max-w-sm leading-relaxed">
          Upload your resume and paste a job description to get started. Your analyses will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#5B8CFF]/15 border border-[#5B8CFF]/25 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#5B8CFF] text-[14px]">history</span>
          </div>
          <h2 className="font-semibold text-[#FAFAFA] text-base tracking-tight">Resume Analyses</h2>
        </div>
        <button
          onClick={clearHistory}
          className="text-[10px] font-label-caps text-[#52525B] hover:text-red-400 transition-colors tracking-widest border border-[#27272A] hover:border-red-400/30 px-3 py-1.5 rounded-lg"
        >
          CLEAR
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {archives.map((analysis, idx) => {
          const score = analysis.recommendation?.overallMatch ?? analysis.verdict?.clarityScore ?? 0;
          const matchData = matchLabel(score);
          const dateStr = analysis.date
            ? new Date(analysis.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
            : 'Unknown Date';
          const company = analysis.companyMode && analysis.companyMode !== 'general'
            ? analysis.companyMode.charAt(0).toUpperCase() + analysis.companyMode.slice(1)
            : 'General';

          return (
            <div
              key={analysis.id || idx}
              className="bg-[#171A20] border border-[#2D2F36] hover:border-[#3F3F46] transition-all duration-200 rounded-xl p-5 flex flex-col justify-between group hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] cursor-default"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="font-label-caps text-xs text-slate-500 uppercase tracking-widest">
                    #{analysis.id || Math.random().toString(36).substring(2, 8).toUpperCase()}
                  </span>
                  <span className="font-label-caps text-[10px] text-slate-400">{dateStr}</span>
                </div>

                <h3 className="text-base text-gray-200 font-headline-md mb-2 leading-snug line-clamp-2" title={analysis.topic || analysis.jobDescription}>
                  {analysis.topic || 'Resume Analysis'}
                </h3>

                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-[10px] font-label-caps uppercase">
                    <span className="material-symbols-outlined text-[12px]">business</span>
                    {company}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                <div>
                  <p className={`font-bold tracking-widest text-[10px] uppercase ${matchData.colorClass}`}>
                    {matchData.label}
                  </p>
                  <p className="text-[10px] font-label-caps text-slate-500 uppercase">Match Score</p>
                </div>
                <div className="w-12 h-12 relative flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90 absolute inset-0">
                    <circle className="text-white/5" cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="4" />
                    <circle
                      className={matchData.colorClass}
                      cx="24" cy="24" r="20"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray={2 * Math.PI * 20}
                      strokeDashoffset={(2 * Math.PI * 20) * (1 - score / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-sm font-black text-gray-200 relative z-10">{score}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
