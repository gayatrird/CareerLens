import React, { useState, useEffect, useCallback, useRef } from "react";
import { loadSavedResumes, markResumeUsed, saveResume, removeSavedResume, parseResumeFile, MAX_RESUMES } from "../services/savedResume";
import { generateCareerNavigator } from "../services/hiringApi";
import { getStoredNavigator, setStoredNavigator, getStoredLastAnalysis, getResumeFingerprint } from "../services/userStorage";
import { detectJobDomain } from "../services/jobMatch";
import { playNavigatorComplete, playActionConfirm } from "../utils/audio";

// ─── Cache Helpers (User-scoped via userStorage) ──────────────────────────────

function readCache(resumeText) {
  return getStoredNavigator(resumeText);
}

function writeCache(resumeText, result) {
  setStoredNavigator(resumeText, result);
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
function EmptyState({ onNavigateToAnalyze, onUploadClick, isUploading, uploadError }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in-up px-4">
      <div className="w-20 h-20 rounded-2xl bg-[#171A20] border border-[#2D2F36] flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-5xl text-[#3F3F46]" style={{ fontVariationSettings: "'FILL' 1" }}>
          explore
        </span>
      </div>
      <h2 className="font-headline-md text-xl text-[#FAFAFA] mb-2">No Resume Found Yet</h2>
      <p className="text-[#71717A] text-sm max-w-sm leading-relaxed mb-6">
        Upload your resume directly or analyze one first to build your personalized career roadmap.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onUploadClick}
          disabled={isUploading}
          className="flex items-center gap-2 bg-[#4F7DF3] hover:bg-[#4069D0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-label-caps px-5 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 text-xs tracking-wider cursor-pointer shadow-[0_4px_16px_rgba(79,125,243,0.3)]"
        >
          {isUploading ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">upload_file</span>
              <span>Upload New Resume</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onNavigateToAnalyze}
          className="flex items-center gap-2 bg-[#171A20] hover:bg-[#27272A] border border-[#2D2F36] text-[#A1A1AA] hover:text-[#FAFAFA] font-label-caps px-5 py-2.5 rounded-xl transition-all duration-200 text-xs tracking-wider"
        >
          <span className="material-symbols-outlined text-sm">work</span>
          Go to Analyze
        </button>
      </div>
      {uploadError && (
        <div className="mt-3 text-xs text-red-400 flex items-center gap-1.5 justify-center animate-fade-in-up">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{uploadError}</span>
        </div>
      )}
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
function ResumeSelector({
  savedResumes,
  selectedResume,
  onSelect,
  onDelete,
  onUploadClick,
  isUploading,
  uploadError,
  uploadNotice,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!savedResumes || savedResumes.length === 0) return null;

  function lastUsedLabel(ts) {
    if (!ts) return "Today";
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

  const activeResume =
    (selectedResume && savedResumes.find((r) => (r.id && selectedResume.id ? r.id === selectedResume.id : (r.text && selectedResume.text ? r.text === selectedResume.text : r.name === selectedResume.name)))) ||
    savedResumes[0];

  const otherResumes = savedResumes.filter((r) =>
    activeResume ? (r.id && activeResume.id ? r.id !== activeResume.id : (r.text && activeResume.text ? r.text !== activeResume.text : r.name !== activeResume.name)) : true
  );

  return (
    <div className="flex flex-col gap-2 mb-6 animate-fade-in-up">
      <label className="font-label-caps text-[#A1A1AA] tracking-widest text-[10px]">RESUME</label>

      {/* Saved resumes — compact selector: last used shown, others in a dropdown */}
      <div className="rounded-xl border border-[#27272A] bg-[#111318] overflow-hidden">
        {/* Current (selected / last used) resume — entire row is clickable */}
        <div
          className="px-3.5 py-2.5 cursor-pointer hover:bg-[#4F7DF3]/5 transition-colors"
          onClick={() => {
            if (!isUploading) {
              onSelect(activeResume);
            }
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="material-symbols-outlined text-[#22C55E] text-[15px] shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <p
              className="text-[12px] font-medium text-[#FAFAFA] truncate flex-1 min-w-0"
              title={activeResume.name}
            >
              {activeResume.name}
            </p>
            {(dropdownOpen || savedResumes.length === 1) && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(activeResume.id || activeResume.name);
                }}
                disabled={isUploading}
                className="text-[#3F3F46] hover:text-[#EF4444] transition-colors shrink-0 p-0.5 cursor-pointer"
                title="Remove saved resume"
                aria-label={`Remove ${activeResume.name}`}
              >
                <span className="material-symbols-outlined text-[15px]">delete</span>
              </button>
            )}
            {savedResumes.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen((v) => !v);
                }}
                disabled={isUploading}
                className="text-[#71717A] hover:text-[#FAFAFA] transition-colors shrink-0 p-0.5 cursor-pointer"
                title={dropdownOpen ? "Hide other saved resumes" : "Show other saved resumes"}
                aria-label={dropdownOpen ? "Hide other saved resumes" : "Show other saved resumes"}
              >
                <span
                  className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                >
                  expand_more
                </span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <p className="text-[10px] text-[#52525B] truncate">
              Last used • {lastUsedLabel(activeResume.lastUsedAt)}
            </p>
          </div>
        </div>

        {/* Other saved resumes (hidden until the arrow is clicked) */}
        {dropdownOpen && otherResumes.length > 0 && (
          <div className="border-t border-[#27272A]">
            {otherResumes.map((r) => (
              <div
                key={r.id || `${r.name}_${r.lastUsedAt || ""}`}
                className="flex items-center gap-2 px-3.5 py-2 border-b border-[#27272A]/70 last:border-b-0 hover:bg-[#4F7DF3]/5 transition-colors cursor-pointer"
                onClick={() => {
                  if (!isUploading) {
                    onSelect(r);
                    setDropdownOpen(false);
                  }
                }}
              >
                <span className="material-symbols-outlined text-[#3F3F46] text-[14px] shrink-0">
                  radio_button_unchecked
                </span>
                <p className="text-[12px] text-[#A1A1AA] truncate flex-1 min-w-0" title={r.name}>
                  {r.name}
                </p>
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(r.id || r.name);
                    }}
                    disabled={isUploading}
                    className="text-[#3F3F46] hover:text-[#EF4444] transition-colors shrink-0 p-0.5 cursor-pointer"
                    title="Remove saved resume"
                    aria-label={`Remove ${r.name}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                )}
              </div>
            ))}
            <div className="px-3.5 py-2 border-t border-[#27272A] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#4F7DF3] text-[14px] shrink-0">add</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUploadClick();
                }}
                disabled={isUploading}
                className="text-[11px] font-medium text-[#4F7DF3] hover:text-[#5B8CFF] transition-colors cursor-pointer"
              >
                Upload New Resume
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Direct Upload button & notices below the selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <button
          type="button"
          onClick={onUploadClick}
          disabled={isUploading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4F7DF3] hover:text-[#5B8CFF] transition-colors py-1 cursor-pointer disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <span className="material-symbols-outlined text-[15px] animate-spin text-[#4F7DF3]">
                progress_activity
              </span>
              <span>Processing resume...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span>Upload New Resume</span>
            </>
          )}
        </button>
        {uploadNotice && (
          <span className="text-[11px] text-amber-400 font-medium animate-fade-in-up">
            {uploadNotice}
          </span>
        )}
      </div>

      {uploadError && (
        <div className="text-xs text-red-400 flex items-center gap-1.5 animate-fade-in-up">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{uploadError}</span>
        </div>
      )}
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

// ─── Generation Progress Animation ────────────────────────────────────────────
const GENERATION_STAGES = [
  "Reading your resume",
  "Identifying your strengths",
  "Finding best-fit career paths",
  "Mapping your skill gaps",
  "Building your career roadmap",
  "Preparing your next best action",
];

function NavigatorGenerationProgress({ isDone }) {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    if (isDone) {
      setCurrentStage(GENERATION_STAGES.length);
      return;
    }

    // Step through the stages naturally while the single AI request runs.
    // The final stage stays active until the real request completes.
    const t1 = setTimeout(() => setCurrentStage(1), 750);
    const t2 = setTimeout(() => setCurrentStage(2), 1600);
    const t3 = setTimeout(() => setCurrentStage(3), 2550);
    const t4 = setTimeout(() => setCurrentStage(4), 3500);
    const t5 = setTimeout(() => setCurrentStage(5), 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [isDone]);

  const total = GENERATION_STAGES.length;
  const progressPercent = isDone
    ? 100
    : Math.min(94, Math.round(((currentStage + 0.6) / total) * 100));

  return (
    <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 sm:p-8 mb-6 max-w-md mx-auto animate-fade-in-up text-center shadow-lg transition-all">
      {/* Sparkle Icon */}
      <div className="w-10 h-10 rounded-xl bg-[#4F7DF3]/15 border border-[#4F7DF3]/25 flex items-center justify-center mx-auto mb-3">
        <span
          className="material-symbols-outlined text-[#4F7DF3] text-xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          auto_awesome
        </span>
      </div>

      {/* Header */}
      <span className="font-label-caps text-[#4F7DF3] text-[10px] tracking-[0.2em] uppercase font-bold block mb-1">
        AI CAREER NAVIGATOR
      </span>
      <h2 className="text-[#FAFAFA] font-headline-md text-base sm:text-lg font-bold tracking-tight">
        {isDone ? "Roadmap generated!" : "Building your career roadmap..."}
      </h2>

      {/* Sequential Stages List */}
      <div className="max-w-xs mx-auto space-y-3.5 my-6 text-left">
        {GENERATION_STAGES.map((label, idx) => {
          const isCompleted = isDone || idx < currentStage;
          const isActive = !isDone && idx === currentStage;

          return (
            <div
              key={label}
              className="flex items-center gap-3 transition-all duration-300"
            >
              {/* Stage Icon */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isCompleted
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : isActive
                    ? "bg-[#4F7DF3]/20 border border-[#4F7DF3]/60 text-[#4F7DF3]"
                    : "border border-[#3F3F46] bg-[#09090B]/40 text-transparent"
                }`}
              >
                {isCompleted ? (
                  <span className="material-symbols-outlined text-[13px] font-bold">
                    check
                  </span>
                ) : isActive ? (
                  <span className="w-2 h-2 rounded-full bg-[#4F7DF3] animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3F3F46]" />
                )}
              </div>

              {/* Stage Label */}
              <span
                className={`text-[13px] tracking-wide transition-colors duration-300 ${
                  isCompleted
                    ? "text-[#A1A1AA] font-medium"
                    : isActive
                    ? "text-[#FAFAFA] font-semibold"
                    : "text-[#52525B]"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-[#27272A] rounded-full overflow-hidden border border-[#2D2F36]/40 mb-3">
        <div
          className="h-full bg-[#4F7DF3] transition-all duration-300 ease-out rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Status indicator text */}
      <p className="text-[11px] font-label-caps text-[#71717A] tracking-wider uppercase">
        {isDone ? "Revealing results..." : "Analyzing..."}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CareerNavigatorSection({ onNavigateToAnalyze, initialResume }) {
  const [savedResumes, setSavedResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [isDone, setIsDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const activeRequestIdRef = useRef(0);
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadNotice, setUploadNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      const resumes = await loadSavedResumes().catch(() => []);
      let analysis = null;
      try {
        analysis = getStoredLastAnalysis();
      } catch { /* corrupt storage */ }

      if (cancelled) return;

      setSavedResumes(Array.isArray(resumes) ? resumes : []);
      setLatestAnalysis(analysis);

      let autoResume = null;
      if (initialResume && initialResume.text) {
        autoResume = initialResume;
      } else if (resumes && resumes.length > 0) {
        autoResume = resumes[0];
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
  }, [initialResume]);

  const executeGeneration = useCallback(async (resumeToRun, reqId) => {
    if (!resumeToRun?.text) return;
    setStatus("loading");
    setResult(null);
    setIsDone(false);
    setErrorMsg("");

    try {
      const context = {};
      const detected = detectJobDomain("", resumeToRun.text);
      if (detected?.domain) context.targetDomain = detected.domain;
      if (detected?.role)   context.targetRole   = detected.role;

      // DO NOT USE PREVIOUS ANALYSIS AS THE SOURCE
      // Only attach previous analysis if it strictly matches this exact resume's content fingerprint
      if (latestAnalysis?.resumeText && resumeToRun?.text) {
        const isSameResume = getResumeFingerprint(resumeToRun.text) === getResumeFingerprint(latestAnalysis.resumeText);

        if (isSameResume) {
          if (latestAnalysis.agentResults)   context.agentResults   = latestAnalysis.agentResults;
          if (latestAnalysis.recommendation) context.recommendation = latestAnalysis.recommendation;
          if (latestAnalysis.jobMatch)       context.jobMatch       = latestAnalysis.jobMatch;
          if (latestAnalysis.jobDescription) context.jobDescription = latestAnalysis.jobDescription;
          if (latestAnalysis.jobMatch?.targetRole)   context.targetRole   = latestAnalysis.jobMatch.targetRole;
          if (latestAnalysis.jobMatch?.targetDomain) context.targetDomain = latestAnalysis.jobMatch.targetDomain;
        }
      }

      const data = await generateCareerNavigator(resumeToRun.text, context);

      if (activeRequestIdRef.current !== reqId) return;

      setIsDone(true);
      playNavigatorComplete();
      await new Promise((res) => setTimeout(res, 350));

      if (activeRequestIdRef.current !== reqId) return;

      setResult(data);
      writeCache(resumeToRun.text, data);
      setStatus("idle");
      setIsDone(false);
    } catch (err) {
      if (activeRequestIdRef.current !== reqId) return;
      setIsDone(false);
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
  }, [latestAnalysis]);

  const handleSelectResume = useCallback((resume) => {
    if (!resume) return;

    // Resolve full record from savedResumes to ensure complete content is available
    const record = savedResumes.find((r) =>
      (resume.id && r.id ? r.id === resume.id : (resume.text && r.text ? r.text === resume.text : r.name === resume.name))
    ) || resume;

    // If this exact resume is already active and currently loaded or loading, do not restart
    const isAlreadyActive = selectedResume && (
      (record.id && selectedResume.id ? record.id === selectedResume.id : false) ||
      (record.text && selectedResume.text ? record.text === selectedResume.text : false) ||
      (record.name === selectedResume.name)
    );

    if (isAlreadyActive && (result || status === "loading")) {
      return;
    }

    const reqId = ++activeRequestIdRef.current;
    setSelectedResume(record);
    setResult(null);
    setErrorMsg("");
    setUploadError("");
    setUploadNotice("");
    setStatus("idle");
    setIsDone(false);

    // Update MRU ordering
    setSavedResumes((prev) => [
      { ...record, lastUsedAt: Date.now() },
      ...prev.filter((r) => (r.id && record.id ? r.id !== record.id : (r.text && record.text ? r.text !== record.text : r.name !== record.name))),
    ].slice(0, MAX_RESUMES));
    markResumeUsed(record.id || record.name).catch(() => {});

    // Check cache for this exact resume
    const cached = record.text ? readCache(record.text) : null;
    if (cached) {
      setResult(cached);
      setStatus("idle");
    } else if (record.text && record.text.trim().length >= 20) {
      // IF NOT CACHED:
      // Clear previous result immediately, show loading, and generate fresh result
      executeGeneration(record, reqId);
    }
  }, [savedResumes, selectedResume, result, status, executeGeneration]);

  const handleDeleteResume = useCallback(async (identifier) => {
    try {
      activeRequestIdRef.current++;
      await removeSavedResume(identifier);
      const updatedList = await loadSavedResumes().catch(() => []);
      const validList = Array.isArray(updatedList) ? updatedList : [];
      setSavedResumes(validList);
      if (selectedResume?.name === identifier || selectedResume?.id === identifier) {
        if (validList.length > 0) {
          const next = validList[0];
          setSelectedResume(next);
          const cached = readCache(next.text);
          setResult(cached || null);
          setStatus("idle");
          setErrorMsg("");
        } else {
          setSelectedResume(null);
          setResult(null);
          setStatus("idle");
          setErrorMsg("");
        }
      }
    } catch (err) {
      console.error("Failed to remove saved resume:", err);
    }
  }, [selectedResume]);

  const handleUploadClick = useCallback(() => {
    setUploadError("");
    setUploadNotice("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, []);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const reqId = ++activeRequestIdRef.current;
    setIsUploading(true);
    setUploadError("");
    setUploadNotice("");
    setResult(null);
    setStatus("idle");
    setErrorMsg("");

    try {
      // 1. Extract text using shared parser
      const record = await parseResumeFile(file);

      // 2. Check maximum limit of 5 saved resumes
      const currentSaved = await loadSavedResumes();
      const isExisting = currentSaved.some((r) => (record.id && r.id ? r.id === record.id : r.name === record.name));
      if (!isExisting && currentSaved.length >= MAX_RESUMES) {
        setUploadNotice(`Storage limit reached (${MAX_RESUMES} max). Oldest resume was replaced.`);
      }

      // 3. Save to IndexedDB
      await saveResume(record);

      // 4. Reload updated list
      const updatedList = await loadSavedResumes();
      setSavedResumes(updatedList);

      // 5. Automatically make newly uploaded resume active & selected
      setSelectedResume(record);
      playActionConfirm();

      // 6. Reset or check cache for this newly uploaded resume
      const cached = readCache(record.text);
      if (cached) {
        setResult(cached);
        setStatus("idle");
      } else {
        // Automatically generate fresh result for new resume
        executeGeneration(record, reqId);
      }
    } catch (err) {
      console.error("Resume upload failed:", err);
      setUploadError(err?.message || "Failed to process resume file. Please check the file format.");
      setStatus("idle");
    } finally {
      setIsUploading(false);
    }
  }, [executeGeneration]);

  const handleGenerate = useCallback(() => {
    if (!selectedResume?.text) return;
    const reqId = ++activeRequestIdRef.current;
    executeGeneration(selectedResume, reqId);
  }, [selectedResume, executeGeneration]);

  const hasResume = Boolean(
    savedResumes.length > 0 ||
    selectedResume?.text ||
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
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />
        <EmptyState
          onNavigateToAnalyze={onNavigateToAnalyze}
          onUploadClick={handleUploadClick}
          isUploading={isUploading}
          uploadError={uploadError}
        />
      </>
    );
  }

  const activeDomain = result?.targetDomain || (
    selectedResume?.text ? detectJobDomain("", selectedResume.text).domain : (latestAnalysis?.jobMatch?.targetDomain || latestAnalysis?.agentResults?.ats?.detectedDomain)
  );
  const activeRole = result?.targetRole || (
    selectedResume?.text ? detectJobDomain("", selectedResume.text).role : (latestAnalysis?.jobMatch?.targetRole || latestAnalysis?.agentResults?.ats?.detectedRole)
  );

  return (
    <div className="animate-fade-in-up max-w-5xl mx-auto pb-16">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Page Header */}
      <div className="text-center mb-8">
        <span className="font-label-caps text-[#4F7DF3] text-[10px] tracking-[0.25em] uppercase font-bold">AI-POWERED</span>
        <h1 className="font-headline-md text-2xl md:text-3xl text-[#FAFAFA] tracking-tight mt-1 font-bold">Career Navigator</h1>
        <p className="text-[#71717A] text-sm mt-2">Your personalized career direction</p>
        {(activeDomain || activeRole) && (
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            {activeDomain && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#4F7DF3]/30 bg-[#4F7DF3]/10 text-[#4F7DF3] text-xs font-medium">
                <span className="material-symbols-outlined text-[14px]">domain</span>
                {activeDomain}
              </span>
            )}
            {activeRole && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#27272A] bg-[#111318] text-[#A1A1AA] text-xs font-medium">
                <span className="material-symbols-outlined text-[14px]">work</span>
                {activeRole}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Resume Selector */}
      <ResumeSelector
        savedResumes={savedResumes}
        selectedResume={selectedResume}
        onSelect={handleSelectResume}
        onDelete={handleDeleteResume}
        onUploadClick={handleUploadClick}
        isUploading={isUploading}
        uploadError={uploadError}
        uploadNotice={uploadNotice}
      />

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

      {/* Generation Animation */}
      {status === "loading" && (
        <NavigatorGenerationProgress isDone={isDone} />
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
      {result && status !== "loading" && (
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
