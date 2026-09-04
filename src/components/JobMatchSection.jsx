import React, { useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// CareerLens — "Job Match Analysis" results section.
// Pure presentation: consumes the `jobMatch` object already produced by the
// analysis engine (src/services/jobMatch.js). No AI calls, no score
// calculation here — every number is displayed as-is from the stored result.
// ─────────────────────────────────────────────────────────────────────────────

const RING_RADIUS = 64;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Same thresholds as the Hiring Recommendation card.
function scoreTone(score) {
  if (score >= 75) return { color: '#22C55E', label: 'STRONG MATCH' };
  if (score >= 50) return { color: '#F59E0B', label: 'POSSIBLE FIT' };
  return { color: '#EF4444', label: 'WEAK MATCH' };
}

function StatusChip({ status }) {
  const map = {
    matched: { label: 'MATCHED', cls: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30' },
    weak:    { label: 'WEAK',    cls: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30' },
    missing: { label: 'MISSING', cls: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30' },
  };
  const { label, cls } = map[status] || map.missing;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-label-caps tracking-widest shrink-0 ${cls}`}>
      {label}
    </span>
  );
}

function BlockTitle({ icon, label, color = '#5B8CFF' }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center border" style={{ background: `${color}15`, borderColor: `${color}30` }}>
        <span className="material-symbols-outlined text-[14px]" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <span className="font-label-caps text-[11px] tracking-widest font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

function SkillChip({ label, tone }) {
  const tones = {
    matched: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30',
    missing: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
    weak:    'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
  };
  return (
    <span className={`px-2.5 py-1 rounded-md border text-[10px] font-label-caps tracking-wider ${tones[tone] || tones.matched}`}>
      {label}
    </span>
  );
}

function SkillGroup({ label, color, items, tone, emptyText }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="bg-[#09090B] border border-[#27272A] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}></div>
        <p className="font-label-caps text-[10px] tracking-widest" style={{ color }}>{label}</p>
        <span className="text-[10px] text-[#52525B] ml-auto">{list.length}</span>
      </div>
      {list.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {list.map((s, i) => <SkillChip key={`${s}-${i}`} label={s} tone={tone} />)}
        </div>
      ) : (
        <p className="text-[#52525B] text-xs italic">{emptyText}</p>
      )}
    </div>
  );
}

function RequirementGroup({ config, items }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="bg-[#09090B] border border-[#27272A] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[14px]" style={{ color: config.color, fontVariationSettings: "'FILL' 1" }}>{config.icon}</span>
        <p className="font-label-caps text-[10px] tracking-widest" style={{ color: config.color }}>{config.label}</p>
        <span className="text-[10px] text-[#52525B] ml-auto">{list.length}</span>
      </div>
      {list.length > 0 ? (
        <div>
          {list.map((item, i) => (
            <div key={i} className="flex items-start justify-between gap-3 py-2.5 border-b border-[#27272A] last:border-0">
              <span className="text-sm text-[#FAFAFA] leading-snug min-w-0">{item.name}</span>
              <StatusChip status={item.status} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[#52525B] text-xs italic">{config.empty}</p>
      )}
    </div>
  );
}

const SUB_SCORES = [
  { key: 'atsCompatibility', label: 'ATS Compatibility', color: '#3b82f6', icon: 'manage_search' },
  { key: 'skillsMatch',      label: 'Skills Match',      color: '#22C55E', icon: 'rule' },
  { key: 'experienceMatch',  label: 'Experience Match',  color: '#8b5cf6', icon: 'work_history' },
  { key: 'technicalMatch',   label: 'Technical Match',   color: '#10b981', icon: 'code' },
];

const REQUIREMENT_GROUPS = [
  { key: 'technicalSkills',        label: 'TECHNICAL SKILLS',         color: '#3b82f6', icon: 'memory',         empty: 'No technical skills required' },
  { key: 'responsibilities',       label: 'RESPONSIBILITIES',         color: '#8b5cf6', icon: 'checklist',      empty: 'No responsibilities listed' },
  { key: 'experienceRequirements', label: 'EXPERIENCE / ELIGIBILITY', color: '#F59E0B', icon: 'work_history',   empty: 'No experience or eligibility requirements' },
  { key: 'softSkills',             label: 'SOFT SKILLS',              color: '#22C55E', icon: 'diversity_3',    empty: 'No soft skills listed' },
];

export default function JobMatchSection({ jobMatch }) {
  const overall = Number(jobMatch?.overallMatch) || 0;
  const tone = scoreTone(overall);

  // Animated ring + count-up (displays the stored score, never recomputes it).
  const [animatedOffset, setAnimatedOffset] = useState(RING_CIRCUMFERENCE);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const targetOffset = RING_CIRCUMFERENCE * (1 - overall / 100);
    const timeout = setTimeout(() => {
      setAnimatedOffset(targetOffset);
      const steps = 30;
      const stepTime = 1500 / steps;
      let step = 0;
      const interval = setInterval(() => {
        step++;
        setDisplayScore(Math.round((step / steps) * overall));
        if (step >= steps) clearInterval(interval);
      }, stepTime);
      return () => clearInterval(interval);
    }, 250);
    return () => clearTimeout(timeout);
  }, [overall]);

  if (!jobMatch) return null;

  const {
    matchedSkills = [],
    missingSkills = [],
    weakSkills = [],
    requirementBreakdown = {},
    topGaps = [],
    recommendations = [],
  } = jobMatch;

  return (
    <section className="max-w-5xl mx-auto mb-20">
      <div className="bg-[#171A20] border border-[#2D2F36] rounded-[18px] overflow-hidden animate-fade-in-up shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
        {/* Top accent line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#5B8CFF]/50 to-transparent"></div>

        {/* Header */}
        <div className="bg-[#09090B]/60 py-5 px-8 border-b border-[#27272A] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#5B8CFF]/15 border border-[#5B8CFF]/25 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#5B8CFF] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>compare_arrows</span>
            </div>
            <div>
              <span className="font-semibold text-[#FAFAFA] text-base tracking-tight">Job Match Analysis</span>
              <p className="text-[10px] font-label-caps text-[#52525B] tracking-widest mt-0.5">FINAL RESUME ↔ JOB MATCH REPORT</p>
            </div>
          </div>
          <span
            className="font-label-caps text-[11px] tracking-widest px-4 py-1.5 rounded-full border"
            style={{ color: tone.color, backgroundColor: `${tone.color}12`, borderColor: `${tone.color}30` }}
          >
            {tone.label} · {overall}%
          </span>
        </div>

        {/* Body */}
        <div className="p-8 md:p-10 space-y-10">
          {/* ── Overview: overall ring + four sub-scores ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Overall score ring */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center">
              <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle className="text-[#27272A]" cx="80" cy="80" fill="transparent" r={RING_RADIUS} stroke="currentColor" strokeWidth="5" />
                  <circle
                    className="score-arc"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r={RING_RADIUS}
                    stroke={tone.color}
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={animatedOffset}
                    strokeLinecap="round"
                    strokeWidth="7"
                    style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)', filter: `drop-shadow(0 0 6px ${tone.color}80)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black score-value" style={{ color: tone.color }}>{displayScore}</span>
                  <span className="text-[10px] font-label-caps text-[#52525B] mt-1 tracking-widest">MATCH %</span>
                </div>
              </div>
              <div className="text-center bg-[#09090B] px-5 py-3 rounded-xl border border-[#27272A] w-full max-w-[220px]">
                <p className="font-semibold tracking-wider text-[11px] uppercase mb-0.5" style={{ color: tone.color }}>{tone.label}</p>
                <p className="text-[10px] font-label-caps text-[#52525B] uppercase tracking-widest">OVERALL MATCH: {overall}%</p>
              </div>
            </div>

            {/* Sub-scores */}
            <div className="lg:col-span-8">
              <BlockTitle icon="speed" label="MATCH BREAKDOWN" />
              <div className="space-y-4 bg-[#09090B] border border-[#27272A] rounded-xl p-5">
                {SUB_SCORES.map(({ key, label, color }) => {
                  const value = Number(jobMatch[key]) || 0;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-[10px] font-label-caps text-[#52525B] uppercase tracking-widest">{label}</span>
                      <div className="flex-1 h-1 bg-[#27272A] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full animate-score"
                          style={{ width: `${value}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs font-bold" style={{ color }}>{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Skills: matched / missing / weak ── */}
          <div>
            <BlockTitle icon="rule" label="SKILLS" color="#22C55E" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SkillGroup label="MATCHED SKILLS" color="#22C55E" items={matchedSkills} tone="matched" emptyText="No matched skills detected" />
              <SkillGroup label="MISSING SKILLS" color="#EF4444" items={missingSkills} tone="missing" emptyText="No missing skills — strong coverage" />
              <SkillGroup label="WEAK SKILLS" color="#F59E0B" items={weakSkills} tone="weak" emptyText="No weak skills detected" />
            </div>
          </div>

          {/* ── Requirement Breakdown ── */}
          <div>
            <BlockTitle icon="account_tree" label="REQUIREMENT BREAKDOWN" color="#8b5cf6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REQUIREMENT_GROUPS.map((config) => (
                <RequirementGroup key={config.key} config={config} items={requirementBreakdown[config.key]} />
              ))}
            </div>
          </div>

          {/* ── Top Skill Gaps ── */}
          <div>
            <BlockTitle icon="trending_down" label="TOP SKILL GAPS" color="#EF4444" />
            {Array.isArray(topGaps) && topGaps.length > 0 ? (
              <div className="space-y-3">
                {topGaps.map((gap, i) => {
                  const importanceHigh = String(gap.importance).toLowerCase() === 'high';
                  return (
                    <div key={i} className="flex items-start gap-4 bg-[#09090B] border border-[#27272A] rounded-xl p-4">
                      <div className="shrink-0 w-6 h-6 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center">
                        <span className="text-[#EF4444] text-xs font-bold">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="text-[#FAFAFA] font-semibold text-sm">{gap.skill}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-label-caps tracking-widest ${importanceHigh ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30' : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'}`}>
                            {importanceHigh ? 'HIGH' : 'MEDIUM'}
                          </span>
                        </div>
                        <p className="text-[#52525B] text-xs italic leading-relaxed">{gap.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#09090B] border border-[#27272A] rounded-xl p-5 flex items-center gap-3">
                <span className="material-symbols-outlined text-[#22C55E] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <p className="text-sm text-[#A1A1AA]">No significant gaps detected between this resume and the job description.</p>
              </div>
            )}
          </div>

          {/* ── Recommendations ── */}
          <div>
            <BlockTitle icon="tips_and_updates" label="RECOMMENDATIONS" color="#F59E0B" />
            {Array.isArray(recommendations) && recommendations.length > 0 ? (
              <ol className="space-y-3">
                {recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3 bg-[#09090B] border border-[#27272A] rounded-xl p-4">
                    <span className="w-6 h-6 rounded-md bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#F59E0B] text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                    </span>
                    <p className="text-sm text-[#A1A1AA] leading-relaxed">{rec}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="bg-[#09090B] border border-[#27272A] rounded-xl p-5">
                <p className="text-sm text-[#A1A1AA]">No specific recommendations were generated for this analysis.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}