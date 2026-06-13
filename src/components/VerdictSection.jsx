import React, { useEffect, useState } from 'react';
import { playGavel } from '../utils/audio';
import TypewriterText from './TypewriterText';
import { generateAppealRuling } from '../services/claudeApi';

// Circle constants: r=70, circumference = 2*PI*70 ≈ 439.82
const CIRCUMFERENCE = 2 * Math.PI * 70;

function getConfidenceData(score) {
  if (score >= 86) return { label: 'THE COURT STRONGLY ADVISES', colorClass: 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]', strokeClass: 'text-green-400' };
  if (score >= 71) return { label: 'HIGH CONFIDENCE', colorClass: 'text-green-500', strokeClass: 'text-green-500' };
  if (score >= 51) return { label: 'LEAN FORWARD', colorClass: 'text-yellow-400', strokeClass: 'text-yellow-400' };
  if (score >= 31) return { label: 'PROCEED WITH CAUTION', colorClass: 'text-orange-500', strokeClass: 'text-orange-500' };
  return { label: 'DO NOT PROCEED', colorClass: 'text-red-500', strokeClass: 'text-red-500' };
}

export default function VerdictSection({ verdict, onNew, topic, rounds, leftPersona, rightPersona }) {
  const [animatedOffset, setAnimatedOffset] = useState(CIRCUMFERENCE);
  const [displayScore, setDisplayScore] = useState(0);
  const [typed, setTyped] = useState(false);
  const [isAppealing, setIsAppealing] = useState(false);
  const [appealText, setAppealText] = useState("");
  const [appealStatus, setAppealStatus] = useState('idle');
  const [appealResult, setAppealResult] = useState(null);

  // Animate the clarity score ring and number on mount
  useEffect(() => {
    playGavel();

    const timeout = setTimeout(() => {
      const targetOffset = CIRCUMFERENCE * (1 - (verdict?.clarityScore ?? 0) / 100);
      setAnimatedOffset(targetOffset);

      // Animate score number
      const targetScore = verdict?.clarityScore ?? 0;
      const duration = 1500;
      const steps = 30;
      const stepTime = duration / steps;
      let currentStep = 0;
      
      const interval = setInterval(() => {
        currentStep++;
        setDisplayScore(Math.round((currentStep / steps) * targetScore));
        if (currentStep >= steps) clearInterval(interval);
      }, stepTime);

    }, 300);
    return () => clearTimeout(timeout);
  }, [verdict?.clarityScore]);

  if (!verdict) return null;

  // API returns { verdict: "...", actionableTakeaway, clarityScore, keyPointsFor, keyPointsAgainst }
  const { verdict: text, actionableTakeaway, clarityScore = 0, keyPointsFor = [], keyPointsAgainst = [] } = verdict;
  const confData = getConfidenceData(clarityScore);

  const handleAppeal = async () => {
    if (!appealText.trim()) return;
    setAppealStatus('loading');
    try {
      const result = await generateAppealRuling(
        topic, 
        rounds, 
        text, 
        clarityScore, 
        appealText, 
        leftPersona?.name, 
        rightPersona?.name
      );
      setAppealResult(result);
      setAppealStatus('complete');
      playGavel(); // play gavel when ruling appears
    } catch (e) {
      console.error(e);
      setAppealStatus('idle');
    }
  };

  return (
    <section className="max-w-5xl mx-auto mb-20">
      <div className="glass-panel-gold rounded-2xl overflow-hidden animate-fade-in-up relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-70"></div>
        {/* Header */}
        <div className="bg-primary/10 py-6 px-8 border-b border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
            <span className="font-serif-large text-primary text-2xl tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(201,168,76,0.6)]">Final Verdict</span>
          </div>
          <div className="flex gap-4">
            <span className="font-label-caps text-primary/50 text-[11px] tracking-widest bg-black/40 px-3 py-1.5 rounded-full border border-primary/20">
              CASE ID: #{Math.random().toString(36).substring(2, 8).toUpperCase()}-Z
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 md:p-14 grid grid-cols-1 md:grid-cols-12 gap-12 relative">
          <div className="absolute inset-0 pointer-events-none z-0 opacity-5" style={{ background: `radial-gradient(circle at center, #c9a84c, transparent 80%)` }}></div>
          {/* Left: verdict text + buttons */}
          <div className="md:col-span-7 flex flex-col gap-8 order-2 md:order-1 relative z-10">
            <div>
              <div className="text-body-rt text-[19px] leading-relaxed mb-10 text-gray-200">
                {!typed ? <TypewriterText text={text} speed={15} onComplete={() => setTyped(true)} cursorClass="text-primary/50" /> : text}
              </div>
              
              {typed && actionableTakeaway && (
                <div className="mb-10 text-center animate-fade-in-up bg-black/30 p-6 rounded-xl border border-primary/10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                  <p className="text-primary font-serif-large italic font-bold text-[22px] drop-shadow-[0_0_10px_rgba(201,168,76,0.3)]">
                    <TypewriterText text={actionableTakeaway} speed={15} cursorClass="hidden" />
                  </p>
                </div>
              )}

              <div className={`flex flex-col sm:flex-row flex-wrap gap-4 ${!typed ? 'opacity-0 pointer-events-none' : 'animate-fade-in-up'}`}>
                {!isAppealing && appealStatus === 'idle' && (
                  <>
                    <button
                      onClick={onNew}
                      className="bg-gradient-to-r from-primary to-[#a38027] text-[#101415] font-label-caps font-bold tracking-widest px-8 py-4 rounded-xl hover:shadow-[0_0_25px_rgba(201,168,76,0.6)] transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      ACCEPT VERDICT
                    </button>
                    <button
                      onClick={() => setIsAppealing(true)}
                      className="border-2 border-primary/40 text-primary font-label-caps font-bold tracking-widest px-8 py-4 rounded-xl hover:bg-primary/10 hover:border-primary transition-all duration-300 hover:shadow-[0_0_15px_rgba(201,168,76,0.2)]"
                    >
                      APPEAL DECISION
                    </button>
                  </>
                )}
              </div>
              <p className={`mt-6 text-primary/70 text-[11px] font-label-caps tracking-widest opacity-90 ${!typed ? 'opacity-0' : 'animate-fade-in-up'}`}>
                {confData.label} — BASED ON {clarityScore}% CLARITY SCORE.
              </p>
            </div>
          </div>

          {/* Right: clarity score ring */}
          <div className="md:col-span-5 flex flex-col items-center justify-center relative order-1 md:order-2 z-10">
            <div className="hidden md:block absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-[#c9a84c]/40 to-transparent -translate-x-12"></div>
            <div className="relative w-48 h-48 flex items-center justify-center mb-6">
              <div className="absolute inset-0 bg-primary/5 rounded-full blur-xl pointer-events-none"></div>
              <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(201,168,76,0.3)]">
                <circle
                  className="text-white/5"
                  cx="96" cy="96"
                  fill="transparent"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="6"
                />
                <circle
                  className={confData.strokeClass}
                  cx="96" cy="96"
                  fill="transparent"
                  r="70"
                  stroke="currentColor"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={animatedOffset}
                  strokeLinecap="round"
                  strokeWidth="8"
                  style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-5xl font-serif-large ${confData.colorClass}`}>{displayScore}</span>
                <span className="text-[11px] font-label-caps text-slate-400 mt-1 tracking-widest">SCORE</span>
              </div>
            </div>
            <div className="text-center bg-black/40 px-6 py-3 rounded-xl border border-white/5 backdrop-blur-sm">
              <p className={`font-bold tracking-[0.15em] text-[13px] uppercase mb-1 ${confData.colorClass}`}>
                {confData.label}
              </p>
              <p className="text-[10px] font-label-caps text-slate-500 uppercase tracking-widest">
                JUDICIAL RELIABILITY: {clarityScore}%
              </p>
            </div>
          </div>
        </div>

        <div className="h-[1px] w-full bg-[#c9a84c]/20"></div>

        {/* Key points grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-primary/20">
          {/* Points For */}
          <div className="bg-[#0a0f1e]/80 p-8 md:p-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50">
                <span className="material-symbols-outlined text-green-500 text-sm">check</span>
              </div>
              <span className="font-label-caps text-green-500 tracking-[0.15em] font-bold text-[13px]">KEY POINTS FOR</span>
            </div>
            <ul className="space-y-5">
              {keyPointsFor.length > 0 ? keyPointsFor.map((point, i) => (
                <li key={i} className="flex items-start gap-4 text-[15px] text-gray-300 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500/60 mt-2.5 shrink-0 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
                  {point}
                </li>
              )) : (
                <li className="text-sm text-slate-600 italic">No key points recorded.</li>
              )}
            </ul>
          </div>

          {/* Points Against */}
          <div className="bg-[#0a0f1e]/80 p-8 md:p-12">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
                <span className="material-symbols-outlined text-red-500 text-sm">close</span>
              </div>
              <span className="font-label-caps text-red-500 tracking-[0.15em] font-bold text-[13px]">KEY POINTS AGAINST</span>
            </div>
            <ul className="space-y-5">
              {keyPointsAgainst.length > 0 ? keyPointsAgainst.map((point, i) => (
                <li key={i} className="flex items-start gap-4 text-[15px] text-gray-300 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500/60 mt-2.5 shrink-0 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></span>
                  {point}
                </li>
              )) : (
                <li className="text-sm text-slate-600 italic">No key points recorded.</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {isAppealing && appealStatus === 'idle' && (
        <div className="glass-panel border-primary/30 p-8 md:p-12 rounded-2xl mt-8 animate-fade-in-up shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-[150px]">balance</span>
          </div>
          <h3 className="text-primary font-serif-large text-2xl tracking-[0.15em] uppercase mb-6 flex items-center gap-3 relative z-10">
            <span className="material-symbols-outlined text-2xl">gavel</span>
            Grounds for Appeal
          </h3>
          <textarea 
            className="w-full bg-[#0a0f1e]/80 border-2 border-primary/20 rounded-xl p-6 text-gray-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[140px] mb-6 text-[15px] font-inter relative z-10 transition-all duration-300 placeholder:text-slate-500"
            placeholder="State why you believe the court erred in its judgment..."
            value={appealText}
            onChange={e => setAppealText(e.target.value)}
          ></textarea>
          <button 
            className="bg-gradient-to-r from-primary to-[#a38027] text-[#101415] font-label-caps px-8 py-4 rounded-xl hover:shadow-[0_0_20px_rgba(201,168,76,0.5)] w-full transition-all duration-300 hover:scale-[1.01] active:scale-95 font-bold tracking-[0.2em] relative z-10"
            onClick={handleAppeal}
          >
            FILE FORMAL APPEAL
          </button>
        </div>
      )}

      {appealStatus === 'loading' && (
         <div className="text-center py-16 mt-8 glass-panel rounded-2xl border border-primary/20">
           <p className="text-primary font-serif-large tracking-[0.1em] uppercase text-2xl drop-shadow-[0_0_10px_rgba(201,168,76,0.3)]">
             <TypewriterText text="⚖️ THE CHIEF APPEALS JUDGE IS REVIEWING..." speed={30} className="animate-pulse" cursorClass="text-primary/50" />
           </p>
         </div>
      )}

      {appealStatus === 'complete' && appealResult && (
        <AppealResult ruling={appealResult} onNew={onNew} />
      )}

    </section>
  );
}

function AppealResult({ ruling, onNew }) {
  const isGranted = ruling.ruling === 'APPEAL GRANTED';
  return (
    <div className="glass-panel border-2 p-8 md:p-16 rounded-2xl mt-8 animate-fade-in-up shadow-2xl relative overflow-hidden" style={{ borderColor: isGranted ? '#22c55e40' : '#ef444440' }}>
       <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
         <span className="material-symbols-outlined text-[200px]">account_balance</span>
       </div>
       <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${isGranted ? '#22c55e' : '#ef4444'}, transparent 70%)` }}></div>
       
       <h3 className="font-serif-large text-4xl tracking-[0.2em] uppercase mb-10 text-center relative z-10" 
           style={{ color: isGranted ? '#4ade80' : '#f87171', textShadow: `0 0 25px ${isGranted ? '#22c55e' : '#ef4444'}` }}>
         {ruling.ruling}
       </h3>
       
       <div className="text-slate-200 text-lg leading-relaxed mb-10 relative z-10 font-inter max-w-3xl mx-auto">
         <TypewriterText text={ruling.reasoning} speed={20} cursorClass="text-primary/50" />
       </div>
       
       <div className="border-t border-white/10 pt-10 text-center relative z-10">
         <div className="inline-block bg-black/30 px-8 py-6 rounded-2xl border border-white/5">
           <p className="text-primary font-serif-large italic font-bold text-2xl md:text-3xl drop-shadow-[0_0_15px_rgba(201,168,76,0.4)]">
              "{ruling.finalVerdict}"
           </p>
         </div>
       </div>
       
       <div className="flex justify-center mt-12 relative z-10">
         <button onClick={onNew} className="bg-gradient-to-r from-primary to-[#a38027] text-[#101415] font-label-caps font-bold tracking-widest px-10 py-4 rounded-xl hover:shadow-[0_0_30px_rgba(201,168,76,0.6)] transition-all duration-300 hover:scale-105 active:scale-95">
           ACCEPT FINAL RULING
         </button>
       </div>
    </div>
  );
}
