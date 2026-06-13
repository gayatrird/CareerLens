import React, { useEffect, useState } from 'react';

function confidenceLabel(score) {
  if (score >= 86) return { label: 'THE COURT STRONGLY ADVISES', colorClass: 'text-green-400' };
  if (score >= 71) return { label: 'HIGH CONFIDENCE', colorClass: 'text-green-500' };
  if (score >= 51) return { label: 'LEAN FORWARD', colorClass: 'text-yellow-400' };
  if (score >= 31) return { label: 'PROCEED WITH CAUTION', colorClass: 'text-orange-500' };
  return { label: 'DO NOT PROCEED', colorClass: 'text-red-500' };
}

export default function ArchivesSection() {
  const [archives, setArchives] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('courtroom_archives');
      if (saved) {
        setArchives(JSON.parse(saved).reverse());
      }
    } catch (e) {
      console.error("Error loading archives", e);
    }
  }, []);

  if (archives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in-up px-4">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-6xl text-primary/80" style={{ fontVariationSettings: "'FILL' 1" }}>history_edu</span>
        </div>
        <h2 className="font-headline-md text-3xl text-primary tracking-widest uppercase mb-4">Case Archives</h2>
        <div className="h-[1px] w-32 bg-primary/30 mb-6"></div>
        <p className="text-body-rt text-lg text-slate-300">
          No cases on record yet.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>history_edu</span>
        <h2 className="font-headline-md text-2xl text-primary tracking-widest uppercase">Case Archives</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {archives.map((caseData, idx) => {
          const score = caseData.verdict?.clarityScore || 0;
          const confData = confidenceLabel(score);
          const dateStr = caseData.date ? new Date(caseData.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown Date';

          return (
            <div key={caseData.id || idx} className="bg-[#161d2f] border border-primary/20 hover:border-primary/50 transition-colors rounded-xl p-6 flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="font-label-caps text-xs text-slate-500 uppercase tracking-widest">
                    CASE ID: #{caseData.id || Math.random().toString(36).substring(2, 8).toUpperCase()}
                  </span>
                  <span className="font-label-caps text-[10px] text-slate-400">{dateStr}</span>
                </div>
                <h3 className="text-lg text-gray-200 font-headline-md mb-2 leading-snug line-clamp-2" title={caseData.topic}>
                  {caseData.topic}
                </h3>
                <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded text-[10px] font-label-caps mb-6 uppercase">
                  {caseData.mode}
                </span>
              </div>
              
              <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                <div>
                  <p className={`font-bold tracking-widest text-[10px] uppercase ${confData.colorClass}`}>
                    {confData.label}
                  </p>
                  <p className="text-[10px] font-label-caps text-slate-500 uppercase">
                    Clarity Score
                  </p>
                </div>
                <div className="w-12 h-12 relative flex items-center justify-center">
                   <svg className="w-full h-full transform -rotate-90 absolute inset-0">
                    <circle className="text-white/5" cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="4" />
                    <circle 
                      className={confData.colorClass} 
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
