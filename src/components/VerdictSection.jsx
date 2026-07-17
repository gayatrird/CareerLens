import React, { useEffect, useState } from 'react';
import { playGavel } from '../utils/audio';
import TypewriterText from './TypewriterText';
import { generateInterviewQuestions } from '../services/hiringApi';

const CIRCUMFERENCE = 2 * Math.PI * 70;

function getRecommendationData(recommendation, overallMatch) {
  if (recommendation === 'SHORTLIST' || overallMatch >= 75) {
    return {
      label: 'STRONG FIT — SHORTLIST',
      colorClass: 'text-[#22C55E]',
      strokeClass: 'text-[#22C55E]',
      badgeClass: 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
    };
  }
  if (recommendation === 'MAYBE' || overallMatch >= 50) {
    return {
      label: 'POSSIBLE FIT — REVIEW',
      colorClass: 'text-[#F59E0B]',
      strokeClass: 'text-[#F59E0B]',
      badgeClass: 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]'
    };
  }
  return {
    label: 'NOT ALIGNED — OPTIMIZE',
    colorClass: 'text-[#EF4444]',
    strokeClass: 'text-[#EF4444]',
    badgeClass: 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
  };
}

export default function ResultSection({ recommendation, onNew, agentResults, resumeText, jobDescription, companyMode }) {
  const [animatedOffset, setAnimatedOffset] = useState(CIRCUMFERENCE);
  const [displayScore, setDisplayScore] = useState(0);
  const [typed, setTyped] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [interviewData, setInterviewData] = useState(null);
  const [interviewStatus, setInterviewStatus] = useState('idle');

  const overallMatch = recommendation?.overallMatch ?? 0;
  const recLabel = recommendation?.recommendation ?? 'MAYBE';
  const confData = getRecommendationData(recLabel, overallMatch);

  useEffect(() => {
    playGavel();
    const timeout = setTimeout(() => {
      const targetOffset = CIRCUMFERENCE * (1 - overallMatch / 100);
      setAnimatedOffset(targetOffset);
      const duration = 1500;
      const steps = 30;
      const stepTime = duration / steps;
      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        setDisplayScore(Math.round((currentStep / steps) * overallMatch));
        if (currentStep >= steps) clearInterval(interval);
      }, stepTime);
    }, 300);
    return () => clearTimeout(timeout);
  }, [overallMatch]);

  if (!recommendation) return null;

  const {
    hiringInsight = '',
    actionableTakeaway = '',
    keyStrengths = [],
    keyWeaknesses = [],
    nextStep = ''
  } = recommendation;

  const handlePrepareInterview = async () => {
    if (interviewData) { setIsPreparing(true); return; }
    setInterviewStatus('loading');
    try {
      const result = await generateInterviewQuestions(resumeText, jobDescription, companyMode);
      setInterviewData(result);
      setInterviewStatus('complete');
      setIsPreparing(true);
      playGavel();
    } catch (e) {
      console.error(e);
      setInterviewStatus('idle');
    }
  };

  const agentScores = [
    { label: 'ATS Score',     value: agentResults?.ats?.score,                  color: '#3b82f6' },
    { label: 'Recruiter',     value: agentResults?.recruiter?.score,             color: '#8b5cf6' },
    { label: 'Technical',     value: agentResults?.engineer?.score,              color: '#22C55E' },
    { label: 'Manager',       value: agentResults?.manager?.score,               color: '#F59E0B' },
    { label: 'Resume Impact', value: agentResults?.optimizer?.overallImpactScore, color: '#5B8CFF' },
  ];

  return (
    <section className="max-w-5xl mx-auto mb-20">
      <div className="bg-[#171A20] border border-[#2D2F36] rounded-[18px] overflow-hidden animate-fade-in-up shadow-[0_8px_30px_rgba(0,0,0,0.3)]">

        {/* Top accent line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#5B8CFF]/50 to-transparent"></div>

        {/* Header */}
        <div className="bg-[#09090B]/60 py-5 px-8 border-b border-[#27272A] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#5B8CFF]/15 border border-[#5B8CFF]/25 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#5B8CFF] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
            </div>
            <span className="font-semibold text-[#FAFAFA] text-base tracking-tight">Hiring Recommendation</span>
          </div>
          <span className={`font-label-caps text-[11px] tracking-widest px-4 py-1.5 rounded-full border ${confData.badgeClass}`}>
            {confData.label}
          </span>
        </div>

        {/* Body */}
        <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-12 gap-10 relative">
          {/* Left: insight + actions */}
          <div className="md:col-span-7 flex flex-col gap-6 order-2 md:order-1 relative z-10">
            <div>
              <div className="text-[16px] leading-relaxed mb-6 text-[#A1A1AA]">
                {!typed
                  ? <TypewriterText text={hiringInsight} speed={12} onComplete={() => setTyped(true)} cursorClass="text-[#5B8CFF]/60" />
                  : hiringInsight
                }
              </div>

              {typed && actionableTakeaway && (
                <div className="mb-6 animate-fade-in-up bg-[#09090B] p-5 rounded-xl border-l-4 border-[#5B8CFF] border-y border-r border-[#27272A]">
                  <p className="font-label-caps text-[#5B8CFF]/70 text-[10px] tracking-widest mb-2">KEY INSIGHT</p>
                  <p className="text-[#FAFAFA] font-semibold text-[15px] leading-snug">
                    <TypewriterText text={actionableTakeaway} speed={15} cursorClass="hidden" />
                  </p>
                </div>
              )}

              {nextStep && typed && (
                <div className="mb-5 animate-fade-in-up bg-[#09090B] border border-[#27272A] rounded-xl p-4 flex gap-3 items-start">
                  <span className="material-symbols-outlined text-[#5B8CFF] text-[18px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                  <div>
                    <p className="font-label-caps text-[#71717A] text-[10px] tracking-widest mb-1">NEXT STEP</p>
                    <p className="text-sm text-[#A1A1AA] leading-relaxed">{nextStep}</p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className={`flex flex-col sm:flex-row flex-wrap gap-3 ${!typed ? 'opacity-0 pointer-events-none' : 'animate-fade-in-up'}`}>
                {interviewStatus !== 'complete' && !isPreparing && (
                  <>
                    <button
                      onClick={onNew}
                      className="bg-[#5B8CFF] hover:bg-[#4F7CFF] text-white font-semibold text-sm tracking-wide px-6 py-2.5 rounded-[14px] hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-[0_0_20px_rgba(91,140,255,0.2)]"
                    >
                      Save & New Analysis
                    </button>
                    <button
                      onClick={handlePrepareInterview}
                      disabled={interviewStatus === 'loading'}
                      className="border border-[#27272A] bg-[#09090B] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3F3F46] font-semibold text-sm tracking-wide px-6 py-2.5 rounded-[14px] transition-all duration-200 flex items-center gap-2"
                    >
                      {interviewStatus === 'loading' ? (
                        <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Preparing...</>
                      ) : (
                        <><span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>quiz</span> Prepare for Interview</>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Agent Score Breakdown */}
            {typed && (
              <div className="animate-fade-in-up bg-[#09090B] rounded-xl border border-[#27272A] p-5">
                <p className="font-label-caps text-[#71717A] text-[10px] tracking-widest mb-4">EXPERT SCORES BREAKDOWN</p>
                <div className="space-y-3">
                  {agentScores.map(s => s.value != null && (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="w-24 text-[10px] font-label-caps text-[#52525B] uppercase tracking-widest">{s.label}</span>
                      <div className="flex-1 h-1 bg-[#27272A] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full animate-score"
                          style={{ width: `${s.value}%`, backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}60` }}
                        />
                      </div>
                      <span className="w-7 text-right text-xs font-bold" style={{ color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: score ring */}
          <div className="md:col-span-5 flex flex-col items-center justify-center relative order-1 md:order-2 z-10">
            <div className="hidden md:block absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#27272A] to-transparent -translate-x-5"></div>
            <div className="relative w-44 h-44 flex items-center justify-center mb-5">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="text-[#27272A]" cx="88" cy="88" fill="transparent" r="70" stroke="currentColor" strokeWidth="5" />
                <circle
                  className={confData.strokeClass}
                  cx="88" cy="88"
                  fill="transparent"
                  r="70"
                  stroke="currentColor"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={animatedOffset}
                  strokeLinecap="round"
                  strokeWidth="7"
                  style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-5xl font-black ${confData.colorClass}`}>{displayScore}</span>
                <span className="text-[10px] font-label-caps text-[#52525B] mt-1 tracking-widest">MATCH %</span>
              </div>
            </div>
            <div className="text-center bg-[#09090B] px-5 py-3 rounded-xl border border-[#27272A]">
              <p className={`font-semibold tracking-wider text-[11px] uppercase mb-0.5 ${confData.colorClass}`}>{confData.label}</p>
              <p className="text-[10px] font-label-caps text-[#52525B] uppercase tracking-widest">OVERALL MATCH: {overallMatch}%</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-[#27272A]"></div>

        {/* Strengths / Weaknesses grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#27272A]">
          <div className="bg-[#09090B]/40 p-8 md:p-10">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-7 h-7 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#22C55E] text-[14px]">check</span>
              </div>
              <span className="font-label-caps text-[#22C55E] tracking-widest font-semibold text-[11px]">KEY STRENGTHS</span>
            </div>
            <ul className="space-y-4">
              {keyStrengths.length > 0 ? keyStrengths.map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[#A1A1AA] leading-relaxed">
                  <span className="w-1 h-1 rounded-full bg-[#22C55E]/60 mt-2 shrink-0"></span>
                  {point}
                </li>
              )) : <li className="text-[#52525B] text-sm">Analysis in progress...</li>}
            </ul>
          </div>
          <div className="bg-[#09090B]/40 p-8 md:p-10">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-7 h-7 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#EF4444] text-[14px]">close</span>
              </div>
              <span className="font-label-caps text-[#EF4444] tracking-widest font-semibold text-[11px]">AREAS TO IMPROVE</span>
            </div>
            <ul className="space-y-4">
              {keyWeaknesses.length > 0 ? keyWeaknesses.map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[#A1A1AA] leading-relaxed">
                  <span className="w-1 h-1 rounded-full bg-[#EF4444]/60 mt-2 shrink-0"></span>
                  {point}
                </li>
              )) : <li className="text-[#52525B] text-sm">Analysis in progress...</li>}
            </ul>
          </div>
        </div>

        {/* Interview Prep section */}
        {isPreparing && interviewData && (
          <div className="p-8 md:p-10 border-t border-[#27272A] animate-fade-in-up">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-[#5B8CFF]/15 border border-[#5B8CFF]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#5B8CFF] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>quiz</span>
              </div>
              <span className="font-semibold text-[#FAFAFA] text-base tracking-tight">Interview Preparation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'behavioral',     label: 'BEHAVIORAL',     color: '#8b5cf6', data: interviewData.behavioral },
                { key: 'technical',      label: 'TECHNICAL',      color: '#3b82f6', data: interviewData.technical },
                { key: 'projectSpecific',label: 'PROJECT-SPECIFIC',color: '#22C55E', data: interviewData.projectSpecific },
              ].map(({ key, label, color, data }) => (
                <div key={key} className="bg-[#09090B] border border-[#27272A] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></div>
                    <p className="font-label-caps text-[10px] tracking-widest" style={{ color }}>{label}</p>
                  </div>
                  <ul className="space-y-4">
                    {data?.map((q, i) => (
                      <li key={i} className="border-b border-[#18181B] pb-3 last:border-0 last:pb-0">
                        <p className="text-sm text-[#FAFAFA] mb-1 leading-snug">{q.question}</p>
                        <p className="text-[11px] text-[#52525B] italic">{q.context}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={onNew}
                className="bg-[#5B8CFF] hover:bg-[#4F7CFF] text-white font-semibold text-sm tracking-wide px-8 py-3 rounded-[14px] hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-[0_0_20px_rgba(91,140,255,0.2)]"
              >
                Save & Start New Analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
