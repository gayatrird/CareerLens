import React, { useState, useEffect, useRef } from 'react';
import TypewriterText from './TypewriterText';

function ThinkingDots({ colorClass }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${colorClass} animate-bounce`} style={{ animationDelay: '0ms' }}></div>
      <div className={`w-1.5 h-1.5 rounded-full ${colorClass} animate-bounce`} style={{ animationDelay: '150ms' }}></div>
      <div className={`w-1.5 h-1.5 rounded-full ${colorClass} animate-bounce`} style={{ animationDelay: '300ms' }}></div>
    </div>
  );
}

function AgentScoreBar({ label, score, color }) {
  const [currentScore, setCurrentScore] = useState(0);

  useEffect(() => {
    if (score == null) return;
    let start = 0;
    const duration = 800;
    const startTime = performance.now();
    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCurrentScore(Math.floor(progress * score));
      if (progress < 1) requestAnimationFrame(animate);
      else setCurrentScore(score);
    };
    requestAnimationFrame(animate);
  }, [score]);

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-[10px] font-label-caps text-slate-500 uppercase tracking-widest text-left">{label}</span>
      <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full absolute left-0 top-0"
          style={{
            width: `${currentScore}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}80`,
            transition: 'width 800ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </div>
      <span className="w-8 text-right text-xs font-bold" style={{ color }}>{currentScore}</span>
    </div>
  );
}

function AgentResultCard({ agent, result, isThinking, cardRef }) {
  const [typed, setTyped] = useState(false);

  const hasContent = !!result?.summary;

  const getResultPreview = () => {
    if (!result) return '';
    if (result.summary) return result.summary;
    if (result.decision) return `Decision: ${result.decision}. ${result.reasons?.[0] || ''}`;
    return '';
  };

  const getScore = () => {
    if (!result) return null;
    return result.score ?? result.overallImpactScore ?? null;
  };

  const score = getScore();

  return (
    <div className="relative" ref={cardRef}>
      {isThinking ? (
        <div
          className="glass-panel p-6 rounded-2xl flex items-center gap-4 relative overflow-hidden"
          style={{ borderLeft: `4px solid ${agent.color}` }}
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `linear-gradient(to right, ${agent.color}, transparent)` }}></div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center border" style={{ borderColor: `${agent.color}60`, backgroundColor: `${agent.color}15` }}>
            <span className="material-symbols-outlined text-lg" style={{ color: agent.color }}>{agent.icon}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-label-caps text-xs" style={{ color: agent.color }}>{agent.name}</span>
            <div className="flex items-center gap-2">
              <ThinkingDots colorClass="bg-white/50" />
              <span className="text-xs text-slate-400 animate-pulse">{agent.thinkingLabel}</span>
            </div>
          </div>
        </div>
      ) : hasContent ? (
        <div
          className="argument-bubble glass-panel p-6 md:p-8 rounded-2xl relative overflow-hidden animate-slide-in-left"
          style={{ borderLeft: `4px solid ${agent.color}`, boxShadow: `0 10px 40px -10px ${agent.color}20` }}
        >
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" style={{ background: `radial-gradient(circle at top left, ${agent.color}, transparent 60%)` }}></div>

          {/* Agent header */}
          <div className="flex items-center justify-between mb-5 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center border" style={{ borderColor: `${agent.color}60`, backgroundColor: `${agent.color}15` }}>
                <span className="material-symbols-outlined text-lg" style={{ color: agent.color, fontVariationSettings: "'FILL' 1" }}>{agent.icon}</span>
              </div>
              <div>
                <p className="font-label-caps text-xs tracking-widest" style={{ color: agent.color }}>{agent.name}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{agent.role}</p>
              </div>
            </div>
            {score != null && (
              <div className="text-right">
                <span className="text-2xl font-black" style={{ color: agent.color }}>{score}</span>
                <p className="text-[10px] text-slate-500 font-label-caps">/ 100</p>
              </div>
            )}
          </div>

          {/* Summary text */}
          <div className="text-body-rt text-[16px] leading-relaxed relative z-10 text-slate-300 mb-4">
            {!typed
              ? <TypewriterText text={getResultPreview()} onComplete={() => setTyped(true)} cursorClass="text-primary/50" speed={10} />
              : getResultPreview()
            }
          </div>


          {/* Decision badge for manager */}
          {typed && result?.decision && (
            <div className="mt-4 animate-fade-in-up">
              <span className={`inline-block px-4 py-1.5 rounded-full font-label-caps text-xs tracking-widest border ${
                result.decision === 'HIRE' ? 'bg-green-500/15 border-green-500/50 text-green-400' :
                result.decision === 'REJECT' ? 'bg-red-500/15 border-red-500/50 text-red-400' :
                'bg-amber-500/15 border-amber-500/50 text-amber-400'
              }`}>
                {result.decision === 'HIRE' ? '✓ SHORTLIST' : result.decision === 'REJECT' ? '✗ NOT ALIGNED' : '~ POSSIBLE FIT'}
              </span>
            </div>
          )}

          {/* Key points for ATS / Recruiter / Engineer */}
          {typed && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in-up">
              {agent.id === 'ats' && result.missingKeywords?.length > 0 && (
                <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                  <p className="font-label-caps text-[10px] text-red-400 mb-2 tracking-widest">MISSING KEYWORDS</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missingKeywords.slice(0, 6).map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 rounded text-[10px] text-red-400 font-label-caps">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
              {agent.id === 'ats' && result.presentKeywords?.length > 0 && (
                <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                  <p className="font-label-caps text-[10px] text-green-400 mb-2 tracking-widest">MATCHED KEYWORDS</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.presentKeywords.slice(0, 6).map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-[10px] text-green-400 font-label-caps">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
              {agent.id === 'engineer' && result.likelyInterviewQuestions?.length > 0 && (
                <div className="bg-black/30 rounded-xl p-4 border border-white/5 col-span-full">
                  <p className="font-label-caps text-[10px] text-primary/70 mb-2 tracking-widest">LIKELY INTERVIEW QUESTIONS</p>
                  <ul className="space-y-1">
                    {result.likelyInterviewQuestions.slice(0, 3).map((q, i) => (
                      <li key={i} className="text-[12px] text-slate-400 flex gap-2">
                        <span className="text-primary/50 shrink-0">›</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {agent.id === 'optimizer' && result.improvedBullets?.length > 0 && (
                <div className="bg-black/30 rounded-xl p-4 border border-white/5 col-span-full">
                  <p className="font-label-caps text-[10px] text-primary/70 mb-3 tracking-widest">IMPROVED BULLETS</p>
                  <div className="space-y-3">
                    {result.improvedBullets.slice(0, 2).map((b, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-[11px] text-slate-600 line-through">{b.original}</p>
                        <p className="text-[12px] text-green-400 flex gap-1.5"><span className="shrink-0">→</span> {b.improved}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-3 opacity-30" style={{ borderLeft: `4px solid ${agent.color}25` }}>
          <span className="material-symbols-outlined text-slate-600 text-lg">{agent.icon}</span>
          <p className="text-sm font-label-caps tracking-wider text-slate-600">Awaiting {agent.name}...</p>
        </div>
      )}
    </div>
  );
}

export default function AnalysisSection({ agents, agentResults, activeAgent, overallScore }) {
  const cardRefs = useRef({});

  useEffect(() => {
    if (activeAgent && cardRefs.current[activeAgent]) {
      cardRefs.current[activeAgent].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeAgent]);

  return (
    <div className="mb-20 max-w-3xl mx-auto">
      {/* Overall progress header */}
      {overallScore > 0 && (
        <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-5 mb-8 flex items-center justify-between animate-fade-in-up shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
          <div>
            <p className="font-label-caps text-[#71717A] text-[10px] tracking-widest mb-1">RUNNING MATCH SCORE</p>
            <p className="text-3xl font-black text-[#5B8CFF]">{overallScore}<span className="text-lg text-[#5B8CFF]/50">%</span></p>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#5B8CFF] animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
            <span className="font-label-caps text-[#71717A] text-xs tracking-wider">ANALYZING</span>
          </div>
        </div>
      )}

      {/* Agent cards */}
      <div className="flex flex-col gap-6">
        {agents.map((agent) => {
          const isThinking = activeAgent === agent.id && !agentResults[agent.id];
          const result = agentResults[agent.id] || null;
          const hasStarted = isThinking || !!result;

          if (!hasStarted) {
            return (
              <div key={agent.id} className="glass-panel p-5 rounded-2xl flex items-center gap-3 opacity-25" style={{ borderLeft: `4px solid ${agent.color}20` }}>
                <span className="material-symbols-outlined text-slate-700 text-lg">{agent.icon}</span>
                <p className="text-xs font-label-caps tracking-wider text-slate-700">{agent.name}</p>
              </div>
            );
          }

          return (
            <AgentResultCard
              key={agent.id}
              agent={agent}
              result={result}
              isThinking={isThinking}
              cardRef={(el) => { cardRefs.current[agent.id] = el; }}
            />
          );
        })}
        
        {activeAgent === 'recommendation' && (
          <div className="glass-panel p-6 rounded-2xl flex items-center gap-4 relative overflow-hidden animate-fade-in-up" style={{ borderLeft: `4px solid #F59E0B` }}>
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `linear-gradient(to right, #F59E0B, transparent)` }}></div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center border" style={{ borderColor: `#F59E0B60`, backgroundColor: `#F59E0B15` }}>
              <span className="material-symbols-outlined text-lg text-amber-500">gavel</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-caps text-xs text-amber-500">CHIEF TALENT OFFICER</span>
              <div className="flex items-center gap-2">
                <ThinkingDots colorClass="bg-white/50" />
                <span className="text-xs text-slate-400 animate-pulse">Synthesizing final recommendation & deep scan...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
