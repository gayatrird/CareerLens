import React, { useState, useEffect, useCallback } from "react";
import { loadSavedResumes, markResumeUsed } from "../services/savedResume";
import { generateCareerNavigator } from "../services/hiringApi";

// ─── Constants ────────────────────────────────────────────────────────────────
const CACHE_KEY_PREFIX = "careerlens_navigator_";

function resumeHash(text) {
  if (!text) return "empty";
  let h = 0;
  for (let i = 0; i < Math.min(text.length, 500); i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function readCache(resumeText) {
  try {
    const key = CACHE_KEY_PREFIX + resumeHash(resumeText);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(resumeText, result) {
  try {
    const key = CACHE_KEY_PREFIX + resumeHash(resumeText);
    localStorage.setItem(key, JSON.stringify(result));
  } catch { /* Storage quota — silent */ }
}

// ─── Priority Badge ───────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const cfg = {
    high:   { label: "HIGH",   cls: "bg-red-500/15 text-red-400 border-red-500/30" },
    medium: { label: "MEDIUM", cls: "bg-amber-400/15 text-amber-400 border-amber-400/30" },
    low:    { label: "LOW",    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  };
  const { label, cls } = cfg[priority] || cfg.low;
  return (
    <span className={`font-label-caps text-[9px] tracking-widest px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Fit Score Ring ───────────────────────────────────────────────────────────
function FitRing({ score }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 75 ? "#22C55E" : score >= 55 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90 absolute inset-0" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="transparent" stroke="currentColor" strokeWidth="4" className="text-[#27272A]" />
        <circle
          cx="28" cy="28" r={r}
          fill="transparent"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-sm font-black relative z-10" style={{ color }}>{score}</span>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onNavigateToAnalyze }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in-up px-4">
      <div className="w-20 h-20 rounded-2xl bg-[#171A20] border border-[#2D2F36] flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-5xl text-[#3F3F46]" style={{ fontVariationSettings: "'FILL' 1" }}>
          explore
        </span>
      </div>
      <h2 className="font-headline-md text-xl text-[#FAFAFA] mb-2">No Resume Found Yet</h2>
      <p className="text-[#71717A] text-sm max-w-sm leading-relaxed mb-8">
        Analyze a resume first or select a saved resume to build your personalized career roadmap.
      </p>
      <button
        onClick={onNavigateToAnalyze}
        className="flex items-center gap-2 bg-[#4F7DF3] hover:bg-[#4069D0] text-white font-label-caps px-5 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 text-xs tracking-wider"
      >
        <span className="material-symbols-outlined text-sm">work</span>
        Go to Analyze
      </button>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full mt-10">
        {[
          { icon: "route",     label: "Career Paths",       color: "#4F7DF3", desc: "Discover your best-fit directions" },
          { icon: "label",     label: "Skill Gap Analysis", color: "#EF4444", desc: "Know exactly what to learn next" },
          { icon: "timeline",  label: "4-Phase Roadmap",    color: "#22C55E", desc: "A concrete plan from now to hired" },
        ].map(({ icon, label, color, desc }) => (
          <div key={label} className="bg-[#171A20] border border-[#2D2F36] rounded-xl p-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[18px]" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
              <p className="font-label-caps text-[10px] tracking-widest" style={{ color }}>{label}</p>
            </div>
            <p className="text-[12px] text-[#52525B] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Resume Selector ──────────────────────────────────────────────────────────
function ResumeSelector({ savedResumes, selectedResume, onSelect }) {
  if (savedResumes.length === 0) return null;

  function lastUsedLabel(ts) {
    if (!ts) return "";
    const then = new Date(ts);
    const now = new Date();
    const days = Math.round(
      (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
       Date.UTC(then.getFullYear(), then.getMonth(), then.getDate())) / 86400000
    );
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-5 md:p-6 mb-6 animate-fade-in-up">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[#4F7DF3]/15 border border-[#4F7DF3]/25 flex items-center justify-center">
          <span className="material-symbols-outlined text-[#4F7DF3] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
        </div>
        <div>
          <h3 className="font-semibold text-[#FAFAFA] text-sm tracking-tight">Resume in use</h3>
          <p className="text-[11px] text-[#71717A]">Switch to analyze a different resume</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {savedResumes.map((resume) => {
          const isActive = selectedResume && resume.name === selectedResume.name;
          return (
            <button
              key={resume.name}
              onClick={() => onSelect(resume)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all duration-200 text-xs ${
                isActive
                  ? "bg-[#4F7DF3]/15 border-[#4F7DF3]/40 text-[#4F7DF3]"
                  : "bg-[#09090B] border-[#27272A] text-[#A1A1AA] hover:border-[#4F7DF3]/30 hover:text-[#FAFAFA]"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
              <div className="text-left">
                <span className="block font-medium truncate max-w-[140px]">{resume.name}</span>
                {resume.lastUsedAt && (
                  <span className="block text-[10px] opacity-60">{lastUsedLabel(resume.lastUsedAt)}</span>
                )}
              </div>
              {isActive && <span className="material-symbols-outlined text-[12px] ml-1">check</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Career Path Card ─────────────────────────────────────────────────────────
function CareerPathCard({ path, index }) {
  const [expanded, setExpanded] = useState(false);
  const colors = ["#4F7DF3", "#8B5CF6", "#22C55E", "#F59E0B"];
  const accentColor = colors[index % colors.length];

  return (
    <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl overflow-hidden transition-all duration-200 hover:border-[#3F3F46] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
      <div className="p-5 cursor-pointer" onClick={() => setExpanded((e) => !e)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-label-caps text-[10px] tracking-widest" style={{ color: accentColor }}>
                PATH {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <h3 className="font-semibold text-[#FAFAFA] text-base leading-snug tracking-tight">{path.title}</h3>
            <p className="text-[13px] text-[#A1A1AA] mt-1 leading-relaxed line-clamp-2">{path.whyFit}</p>
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0">
            <FitRing score={path.fitScore} />
            <span className="font-label-caps text-[9px] text-[#71717A] tracking-widest">FIT SCORE</span>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-3 text-[#71717A] hover:text-[#A1A1AA] transition-colors">
          <span className="text-[11px] font-label-caps tracking-wider">{expanded ? "Less detail" : "More detail"}</span>
          <span
            className="material-symbols-outlined text-[16px] transition-transform duration-200"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          >expand_more</span>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 pt-0 border-t border-[#27272A] bg-[#09090B] animate-fade-in-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <p className="font-label-caps text-[10px] tracking-widest text-emerald-400 mb-2">CURRENT STRENGTHS</p>
              <ul className="space-y-1.5">
                {path.currentStrengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-[#A1A1AA]">
                    <span className="material-symbols-outlined text-emerald-400 text-[14px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-label-caps text-[10px] tracking-widest text-red-400 mb-2">SKILL GAPS</p>
              <ul className="space-y-1.5">
                {path.skillGaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-[#A1A1AA]">
                    <span className="material-symbols-outlined text-red-400 text-[14px] mt-0.5 shrink-0">remove_circle</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4 bg-[#171A20] border border-[#2D2F36] rounded-xl p-3.5">
            <p className="font-label-caps text-[10px] tracking-widest text-amber-400 mb-1.5">ENTRY-LEVEL REALITY</p>
            <p className="text-[13px] text-[#A1A1AA] leading-relaxed">{path.entryLevelReality}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Roadmap Phase ────────────────────────────────────────────────────────────
function RoadmapPhase({ phase, index, isLast }) {
  const phaseColors = ["#4F7DF3", "#8B5CF6", "#22C55E", "#F59E0B"];
  const color = phaseColors[index % phaseColors.length];

  return (
    <div className="flex gap-4 min-w-0">
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-black text-sm shrink-0"
          style={{ borderColor: color, color, backgroundColor: `${color}18` }}
        >
          {index + 1}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 mt-1" style={{ backgroundColor: `${color}30`, minHeight: "32px" }} />
        )}
      </div>
      <div className="pb-6 min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2 mb-2">
          <h4 className="font-semibold text-[#FAFAFA] text-sm">{phase.phase}</h4>
          <span
            className="font-label-caps text-[9px] tracking-widest px-2 py-0.5 rounded-full border"
            style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
          >
            {phase.timeframe}
          </span>
        </div>
        <ul className="space-y-1.5 mb-2">
          {phase.actions.map((action, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] text-[#A1A1AA]">
              <span className="text-[#71717A] mt-0.5 shrink-0">{"→"}</span>
              {action}
            </li>
          ))}
        </ul>
        <div className="bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 mt-2 inline-block">
          <span className="font-label-caps text-[9px] tracking-widest text-[#71717A] mr-1">OUTCOME</span>
          <span className="text-[12px] text-[#A1A1AA]">{phase.outcome}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CareerNavigatorSection({ onNavigateToAnalyze }) {
  const [savedResumes, setSavedResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      const resumes = await loadSavedResumes().catch(() => []);
      let analysis = null;
      try {
        const raw =
          localStorage.getItem("careerlens_last_analysis") ||
          localStorage.getItem("hireflow_last_analysis");
        if (raw) analysis = JSON.parse(raw);
      } catch { /* corrupt storage */ }

      if (cancelled) return;

      setSavedResumes(Array.isArray(resumes) ? resumes : []);
      setLatestAnalysis(analysis);

      let autoResume = null;
      if (resumes && resumes.length > 0) {
        autoResume = { name: resumes[0].name, text: resumes[0].text, lastUsedAt: resumes[0].lastUsedAt };
      } else if (analysis && analysis.resumeText) {
        autoResume = { name: "Last Analysis Resume", text: analysis.resumeText };
      }

      if (autoResume) {
        setSelectedResume(autoResume);
        const cached = readCache(autoResume.text);
        if (cached) setResult(cached);
      }
      setDataLoaded(true);
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  const handleSelectResume = useCallback((resume) => {
    setSelectedResume(resume);
    setResult(null);
    setErrorMsg("");
    setStatus("idle");
    const cached = readCache(resume.text);
    if (cached) setResult(cached);
    markResumeUsed(resume.name).catch(() => {});
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedResume?.text) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const context = {};
      if (latestAnalysis) {
        if (latestAnalysis.agentResults)   context.agentResults   = latestAnalysis.agentResults;
        if (latestAnalysis.recommendation) context.recommendation = latestAnalysis.recommendation;
        if (latestAnalysis.jobMatch)       context.jobMatch       = latestAnalysis.jobMatch;
        if (latestAnalysis.jobDescription) context.jobDescription = latestAnalysis.jobDescription;
      }
      const data = await generateCareerNavigator(selectedResume.text, context);
      setResult(data);
      writeCache(selectedResume.text, data);
      setStatus("idle");
    } catch (err) {
      console.error("Career Navigator generation failed:", err);
      const msg = err?.message || "An unknown error occurred.";
      const isRateLimit = msg.includes("429") || msg.includes("RATE_LIMIT_EXCEEDED");
      setErrorMsg(
        isRateLimit
          ? "Groq is rate-limited right now. Please wait a moment and try again."
          : `Generation failed: ${msg}`
      );
      setStatus("error");
    }
  }, [selectedResume, latestAnalysis]);

  const hasResume = Boolean(
    savedResumes.length > 0 ||
    (latestAnalysis?.resumeText && latestAnalysis.resumeText.trim().length > 20)
  );

  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-[#4F7DF3] text-4xl">progress_activity</span>
      </div>
    );
  }

  if (!hasResume) {
    return <EmptyState onNavigateToAnalyze={onNavigateToAnalyze} />;
  }

  return (
    <div className="animate-fade-in-up max-w-5xl mx-auto pb-16">

      {/* Page Header */}
      <div className="text-center mb-8">
        <span className="font-label-caps text-[#4F7DF3] text-[10px] tracking-[0.25em] uppercase font-bold">AI-POWERED</span>
        <h1 className="font-headline-md text-2xl md:text-3xl text-[#FAFAFA] tracking-tight mt-1 font-bold">Career Navigator</h1>
        <p className="text-[#71717A] text-sm mt-2">Your personalized career direction</p>
      </div>

      {/* Resume Selector */}
      <ResumeSelector savedResumes={savedResumes} selectedResume={selectedResume} onSelect={handleSelectResume} />

      {/* Generate CTA */}
      {!result && status !== "loading" && (
        <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-8 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-up">
          <div>
            <h3 className="font-semibold text-[#FAFAFA] text-base mb-1">Ready to map your career?</h3>
            <p className="text-[13px] text-[#71717A] leading-relaxed max-w-md">
              {selectedResume ? `Using: ${selectedResume.name}` : "Select a resume above to get started."}
              {latestAnalysis ? " · Enriched with your latest analysis." : ""}
            </p>
          </div>
          <button
            id="career-navigator-generate-btn"
            onClick={handleGenerate}
            disabled={!selectedResume?.text}
            className="shrink-0 flex items-center gap-2.5 bg-[#4F7DF3] hover:bg-[#4069D0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-label-caps px-6 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 text-xs tracking-wider shadow-[0_4px_16px_rgba(79,125,243,0.3)]"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
            Generate Roadmap
          </button>
        </div>
      )}

      {/* Loading */}
      {status === "loading" && (
        <div className="bg-[#171A20] border border-[#4F7DF3]/30 rounded-2xl p-8 mb-6 flex flex-col items-center gap-4 animate-fade-in-up">
          <span className="material-symbols-outlined animate-spin text-[#4F7DF3] text-4xl">progress_activity</span>
          <div className="text-center">
            <p className="text-[#FAFAFA] font-semibold text-sm">Building your career roadmap…</p>
            <p className="text-[#71717A] text-xs mt-1">Analyzing your resume and crafting personalized paths</p>
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && errorMsg && (
        <div className="bg-red-500/10 border border-red-500/25 text-red-400 rounded-2xl px-5 py-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
            <p className="text-[13px] leading-relaxed">{errorMsg}</p>
          </div>
          <button
            onClick={handleGenerate}
            className="shrink-0 text-[12px] font-semibold text-red-400 border border-red-500/40 rounded-lg px-4 py-1.5 hover:bg-red-500/10 transition-colors"
          >
            ↻ Retry
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-fade-in-up">

          {/* Section 1 — Career Summary */}
          <section className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#4F7DF3]/15 border border-[#4F7DF3]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#4F7DF3] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              </div>
              <h2 className="font-semibold text-[#FAFAFA] text-base tracking-tight">Career Summary</h2>
            </div>
            <p className="text-[#A1A1AA] text-sm leading-relaxed">{result.careerSummary}</p>
          </section>

          {/* Section 2 — Top Career Paths */}
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#8B5CF6] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>route</span>
              </div>
              <h2 className="font-semibold text-[#FAFAFA] text-base tracking-tight">Top Career Paths</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {(result.topCareerPaths || []).map((path, i) => (
                <CareerPathCard key={i} path={path} index={i} />
              ))}
            </div>
          </section>

          {/* Section 3 — Transferable Skills */}
          <section className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#22C55E]/15 border border-[#22C55E]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#22C55E] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
              </div>
              <h2 className="font-semibold text-[#FAFAFA] text-base tracking-tight">Transferable Skills</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {(result.transferableSkills || []).map((skill, i) => (
                <span key={i} className="bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/25 px-3 py-1.5 rounded-lg text-xs font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </section>

          {/* Section 4 — Priority Skill Gaps */}
          <section className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#EF4444] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>label</span>
              </div>
              <h2 className="font-semibold text-[#FAFAFA] text-base tracking-tight">Priority Skill Gaps</h2>
            </div>
            <div className="space-y-3">
              {(result.prioritySkillGaps || []).map((gap, i) => (
                <div key={i} className="bg-[#09090B] border border-[#27272A] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <PriorityBadge priority={gap.priority} />
                    <span className="font-semibold text-[#FAFAFA] text-sm">{gap.skill}</span>
                  </div>
                  <p className="text-[12px] text-[#71717A] leading-snug sm:text-right sm:max-w-[55%]">{gap.reason}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5 — Career Roadmap */}
          <section className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-7 h-7 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#F59E0B] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>timeline</span>
              </div>
              <h2 className="font-semibold text-[#FAFAFA] text-base tracking-tight">Career Roadmap</h2>
            </div>

            {/* Phase flow pills */}
            <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
              {(result.roadmap || []).map((phase, i) => {
                const phaseColors = ["#4F7DF3", "#8B5CF6", "#22C55E", "#F59E0B"];
                const color = phaseColors[i % phaseColors.length];
                return (
                  <React.Fragment key={i}>
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full border font-label-caps text-[10px] tracking-widest shrink-0"
                      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
                    >
                      <span className="font-black">{i + 1}</span>
                      {phase.phase}
                    </div>
                    {i < (result.roadmap.length - 1) && (
                      <span className="material-symbols-outlined text-[#3F3F46] text-sm self-center shrink-0">arrow_forward</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Phase detail stack */}
            <div>
              {(result.roadmap || []).map((phase, i) => (
                <RoadmapPhase key={i} phase={phase} index={i} isLast={i === (result.roadmap.length - 1)} />
              ))}
            </div>
          </section>

          {/* Section 6 — Next Best Action */}
          <section className="bg-gradient-to-r from-[#4F7DF3]/20 via-[#4F7DF3]/10 to-transparent border border-[#4F7DF3]/30 rounded-2xl p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#4F7DF3] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              </div>
              <div>
                <p className="font-label-caps text-[10px] tracking-widest text-[#4F7DF3] mb-1.5">NEXT BEST ACTION</p>
                <p className="text-[#FAFAFA] text-base font-semibold leading-snug">{result.nextBestAction}</p>
              </div>
            </div>
          </section>

          {/* Regenerate */}
          <div className="flex justify-center pt-2">
            <button
              id="career-navigator-regenerate-btn"
              onClick={handleGenerate}
              disabled={status === "loading"}
              className="flex items-center gap-2 text-[#71717A] hover:text-[#A1A1AA] border border-[#27272A] hover:border-[#3F3F46] px-5 py-2.5 rounded-xl text-xs font-label-caps tracking-wider transition-all duration-200"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
