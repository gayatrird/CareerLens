import React, { useState, useEffect, useCallback } from 'react';
import { loadSavedResumes } from '../services/savedResume';
import {
  getStoredLastAnalysis,
  getStoredNavigator,
  getStoredMockInterviews,
  getStoredArchives,
} from '../services/userStorage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(ts) {
  if (!ts) return 'Recently';
  const time = typeof ts === 'number' ? ts : new Date(ts).getTime();
  if (isNaN(time)) return 'Recently';
  const diffMs = Date.now() - time;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function PriorityBadge({ priority }) {
  const p = (priority || 'low').toLowerCase();
  const cfg = {
    high: { label: 'HIGH', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
    medium: { label: 'MEDIUM', cls: 'bg-amber-400/15 text-amber-400 border-amber-400/30' },
    low: { label: 'LOW', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  };
  const { label, cls } = cfg[p] || cfg.low;
  return (
    <span className={`font-label-caps text-[9px] tracking-widest px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

function ScoreRing({ score, size = 44, strokeWidth = 3.5, color = '#4F7DF3' }) {
  const s = Math.max(0, Math.min(100, Math.round(score || 0)));
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - s / 100);

  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90 absolute inset-0" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-[#27272A]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="text-[11px] font-bold text-[#FAFAFA] relative z-10 tabular-nums">
        {s}%
      </span>
    </div>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────────────

export default function DashboardSection({ onNavigate, onNavigateToAnalyze }) {
  const [activeResume, setActiveResume] = useState(null);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [careerNav, setCareerNav] = useState(null);
  const [mockSessions, setMockSessions] = useState([]);
  const [archives, setArchives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Central tab navigation dispatcher
  const handleNavigate = useCallback(
    (tab) => {
      if (typeof onNavigate === 'function') {
        onNavigate(tab);
      } else if (tab === 'DOCKET' && typeof onNavigateToAnalyze === 'function') {
        onNavigateToAnalyze();
      }
    },
    [onNavigate, onNavigateToAnalyze]
  );

  // Load purely local stored data on mount
  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      setIsLoading(true);

      // 1. Saved Resumes from IndexedDB (scoped to current user)
      let resumes = [];
      try {
        resumes = await loadSavedResumes().catch(() => []);
      } catch (_) {}

      // 2. Latest Analysis from user storage
      let analysis = null;
      try {
        analysis = getStoredLastAnalysis();
      } catch (_) {}

      // Resolve active resume (IndexedDB MRU first, fallback to latest analysis record)
      let resolvedResume = null;
      if (Array.isArray(resumes) && resumes.length > 0) {
        resolvedResume = resumes[0];
      } else if (analysis?.resumeText) {
        resolvedResume = {
          name: analysis.resumeName || 'Analyzed Resume',
          text: analysis.resumeText,
          lastUsedAt: analysis.date ? new Date(analysis.date).getTime() : Date.now(),
        };
      }

      // 3. Career Navigator cache (user-scoped)
      const navData = getStoredNavigator(resolvedResume?.text);

      // 4. Mock Interview History (user-scoped)
      let mocks = [];
      try {
        mocks = getStoredMockInterviews();
      } catch (_) {}

      // 5. Historical Activity (user-scoped)
      let arch = [];
      try {
        arch = getStoredArchives();
      } catch (_) {}

      if (!cancelled) {
        setActiveResume(resolvedResume);
        setLatestAnalysis(analysis);
        setCareerNav(navData);
        setMockSessions(Array.isArray(mocks) ? mocks : []);
        setArchives(Array.isArray(arch) ? arch : []);
        setIsLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Extract Real Metrics (Zero fabrications) ─────────────────────────────────

  // Job Match
  const jobMatchData = latestAnalysis?.jobMatch;
  const jobMatchScore =
    jobMatchData?.overallScore ??
    latestAnalysis?.recommendation?.overallMatch ??
    latestAnalysis?.agentResults?.ats?.score ??
    null;
  const jobMatchRole = jobMatchData?.targetRole || latestAnalysis?.topic || null;
  const jobMatchLevel = jobMatchData?.matchLevel || null;

  // Career Navigator
  const topCareerPath = careerNav?.topCareerPaths?.[0] || null;
  const careerFitScore = topCareerPath?.fitScore ?? null;

  // Mock Interview
  const latestMock = mockSessions[0] || null;
  const mockScore = latestMock?.finalReport?.overallScore ?? null;
  const mockRole = latestMock?.roleTitle || null;
  const mockVerdict = latestMock?.finalReport?.verdict || null;

  // Priority Skill Gaps
  const priorityGaps = careerNav?.prioritySkillGaps || [];
  const highPriorityGaps = priorityGaps.filter((g) => g.priority === 'high');
  const missingSkillsFromMatch = jobMatchData?.missingSkills || [];

  let skillGapsCount = null;
  let skillGapsPreview = [];
  if (priorityGaps.length > 0) {
    skillGapsCount = highPriorityGaps.length > 0 ? highPriorityGaps.length : priorityGaps.length;
    skillGapsPreview = priorityGaps.slice(0, 3).map((g) => g.skill);
  } else if (missingSkillsFromMatch.length > 0) {
    skillGapsCount = missingSkillsFromMatch.length;
    skillGapsPreview = missingSkillsFromMatch.slice(0, 3);
  }

  // ─── Deterministic Next Best Action Logic ─────────────────────────────────────
  let nextAction = null;

  if (!activeResume) {
    // Priority A: No resume
    nextAction = {
      title: 'Upload your resume to get started',
      desc: 'Upload your resume in Analyze to unlock your baseline Job Match, ATS scoring, and career trajectory.',
      btnLabel: 'Upload Resume',
      icon: 'upload_file',
      tab: 'DOCKET',
    };
  } else if (!latestAnalysis && !jobMatchData) {
    // Priority B: Resume exists but no Job Match analysis
    nextAction = {
      title: 'Run your first Job Match analysis',
      desc: `Compare "${activeResume.name}" against a target job description to measure real keyword alignment and fit.`,
      btnLabel: 'Analyze Job Match',
      icon: 'target',
      tab: 'DOCKET',
    };
  } else if (!careerNav) {
    // Priority C: Analysis exists but no Career Navigator result
    nextAction = {
      title: 'Map your career direction and skill gaps',
      desc: 'Explore high-fit career transitions, transferable strengths, and a targeted roadmap in Career Navigator.',
      btnLabel: 'Open Career Navigator',
      icon: 'explore',
      tab: 'NAVIGATOR',
    };
  } else if (mockScore === null || mockScore < 70) {
    // Priority D: Interview never taken or score below 70
    nextAction = {
      title: `Practice with AI Mock Interview${jobMatchRole ? ` for ${jobMatchRole}` : ''}`,
      desc: 'Sharpen your answers with a realistic interactive interview simulation with turn-by-turn evaluation.',
      btnLabel: 'Start Mock Interview',
      icon: 'record_voice_over',
      tab: 'EVIDENCE',
    };
  } else {
    // Priority E: Career Navigator action or ongoing skill building
    nextAction = {
      title: 'Focus on your next career milestone',
      desc:
        careerNav.nextBestAction ||
        `Focus on bridging your priority skills in ${priorityGaps[0]?.skill || 'core engineering domain'}.`,
      btnLabel: 'Review Roadmap',
      icon: 'flag',
      tab: 'NAVIGATOR',
    };
  }

  // ─── Synthesized Recent Activity Feed ────────────────────────────────────────
  const activityList = [];

  if (activeResume) {
    activityList.push({
      id: 'res-1',
      type: 'resume',
      title: `Active resume: ${activeResume.name}`,
      detail: activeResume.size ? `${Math.round(activeResume.size / 1024)} KB` : 'Uploaded',
      timestamp: activeResume.lastUsedAt || activeResume.savedAt || Date.now(),
      icon: 'description',
      iconColor: 'text-[#4F7DF3]',
      tab: 'DOCKET',
    });
  }

  if (Array.isArray(archives)) {
    archives.forEach((item, idx) => {
      activityList.push({
        id: `arch-${item.id || idx}`,
        type: 'analysis',
        title: `Job Match: ${item.jobMatch?.targetRole || item.topic || 'Role Analysis'}`,
        detail: `Match Score: ${item.jobMatch?.overallScore ?? item.recommendation?.overallMatch ?? item.agentResults?.ats?.score ?? 'N/A'}%`,
        timestamp: item.date ? new Date(item.date).getTime() : Date.now() - (idx + 1) * 86400000,
        icon: 'target',
        iconColor: 'text-[#3B82F6]',
        tab: 'ARCHIVES',
      });
    });
  }

  if (Array.isArray(mockSessions)) {
    mockSessions.forEach((item, idx) => {
      activityList.push({
        id: item.sessionId || `mock-${idx}`,
        type: 'interview',
        title: `Mock Interview: ${item.roleTitle || 'Interview Practice'}`,
        detail: `Score: ${item.finalReport?.overallScore || 'N/A'}/100 • ${item.finalReport?.verdict || 'Completed'}`,
        timestamp: item.completionDate ? new Date(item.completionDate).getTime() : Date.now() - (idx + 1) * 86400000,
        icon: 'record_voice_over',
        iconColor: 'text-[#22C55E]',
        tab: 'EVIDENCE',
      });
    });
  }

  if (careerNav && topCareerPath) {
    activityList.push({
      id: 'nav-1',
      type: 'navigator',
      title: `Career Navigator: ${topCareerPath.title}`,
      detail: `${topCareerPath.fitScore}% Fit • ${priorityGaps.length} Skill Gaps Identified`,
      timestamp: activeResume?.lastUsedAt ? activeResume.lastUsedAt - 1000 : Date.now() - 3600000,
      icon: 'explore',
      iconColor: 'text-[#A855F7]',
      tab: 'NAVIGATOR',
    });
  }

  // Sort chronological descending (most recent first)
  activityList.sort((a, b) => b.timestamp - a.timestamp);
  const recentTimeline = activityList.slice(0, 5);

  return (
    <div className="animate-fade-in-up max-w-6xl mx-auto pb-16 space-y-8">
      {/* ─── 1. HEADER SECTION ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 pb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-label-caps text-[#4F7DF3] text-[10px] tracking-[0.25em] uppercase font-bold">
              CAREERLENS
            </span>
            <span className="bg-[#4F7DF3]/15 text-[#4F7DF3] border border-[#4F7DF3]/30 text-[9px] font-label-caps tracking-widest px-2 py-0.5 rounded-full font-semibold">
              OVERVIEW
            </span>
          </div>
          <h1 className="font-headline-md text-2xl md:text-3xl text-[#FAFAFA] tracking-tight font-bold">
            CareerLens Dashboard
          </h1>
          <p className="text-[#71717A] text-xs md:text-sm mt-1">
            Unified career intelligence, real-time readiness benchmarks, and next steps
          </p>
        </div>

        {/* Active Resume Indicator Pill */}
        <div className="flex items-center gap-2.5 bg-[#171A20] border border-[#2D2F36] rounded-xl px-3.5 py-2.5 shrink-0">
          <span
            className={`material-symbols-outlined text-[16px] ${
              activeResume ? 'text-[#22C55E]' : 'text-[#71717A]'
            }`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {activeResume ? 'check_circle' : 'info'}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-label-caps text-[#71717A] tracking-wider">RESUME:</span>
              <span className="text-xs font-semibold text-[#FAFAFA] truncate max-w-[160px] md:max-w-[200px]" title={activeResume?.name}>
                {activeResume ? activeResume.name : 'No resume uploaded'}
              </span>
            </div>
            {activeResume?.lastUsedAt && (
              <p className="text-[10px] text-[#52525B]">
                Last used • {formatRelativeTime(activeResume.lastUsedAt)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleNavigate('DOCKET')}
            className="text-[11px] font-medium text-[#4F7DF3] hover:text-[#5B8CFF] ml-1 transition-colors cursor-pointer shrink-0"
          >
            {activeResume ? 'Switch' : 'Upload'}
          </button>
        </div>
      </div>

      {/* ─── 2. TOP METRICS — 4 CARDS ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Job Match Score */}
        <div
          onClick={() => handleNavigate('DOCKET')}
          className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-5 hover:border-[#4F7DF3]/60 transition-all duration-200 cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#4F7DF3]/15 border border-[#4F7DF3]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#4F7DF3] text-[18px]">target</span>
              </div>
              <span className="text-[10px] font-label-caps text-[#71717A] group-hover:text-[#4F7DF3] transition-colors flex items-center gap-0.5">
                Analyze <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
              </span>
            </div>
            <span className="font-label-caps text-[10px] text-[#71717A] tracking-widest uppercase block mb-1">
              JOB MATCH
            </span>
            {jobMatchScore !== null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#FAFAFA] tracking-tight">
                  {jobMatchScore}%
                </span>
                {jobMatchLevel && (
                  <span className="text-[10px] text-[#22C55E] font-medium">
                    {jobMatchLevel}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm font-semibold text-[#71717A] italic">
                Not available yet
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#71717A] mt-3 line-clamp-1 border-t border-[#27272A] pt-2.5">
            {jobMatchRole || 'Run Job Match analysis to measure ATS fit'}
          </p>
        </div>

        {/* Card 2: Career Direction */}
        <div
          onClick={() => handleNavigate('NAVIGATOR')}
          className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-5 hover:border-[#A855F7]/60 transition-all duration-200 cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#A855F7]/15 border border-[#A855F7]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#A855F7] text-[18px]">explore</span>
              </div>
              <span className="text-[10px] font-label-caps text-[#71717A] group-hover:text-[#A855F7] transition-colors flex items-center gap-0.5">
                Navigator <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
              </span>
            </div>
            <span className="font-label-caps text-[10px] text-[#71717A] tracking-widest uppercase block mb-1">
              CAREER DIRECTION
            </span>
            {careerFitScore !== null ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-[#FAFAFA] tracking-tight">
                  {careerFitScore}%
                </span>
                <span className="text-[10px] text-[#A855F7] font-semibold uppercase">Fit</span>
              </div>
            ) : (
              <span className="text-sm font-semibold text-[#71717A] italic">
                Not available yet
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#71717A] mt-3 line-clamp-1 border-t border-[#27272A] pt-2.5" title={topCareerPath?.title}>
            {topCareerPath?.title || 'Map career paths in Navigator'}
          </p>
        </div>

        {/* Card 3: Mock Interview */}
        <div
          onClick={() => handleNavigate('EVIDENCE')}
          className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-5 hover:border-[#22C55E]/60 transition-all duration-200 cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#22C55E] text-[18px]">record_voice_over</span>
              </div>
              <span className="text-[10px] font-label-caps text-[#71717A] group-hover:text-[#22C55E] transition-colors flex items-center gap-0.5">
                Interview <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
              </span>
            </div>
            <span className="font-label-caps text-[10px] text-[#71717A] tracking-widest uppercase block mb-1">
              MOCK INTERVIEW
            </span>
            {mockScore !== null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#FAFAFA] tracking-tight">
                  {mockScore}
                </span>
                <span className="text-xs text-[#71717A]">/100</span>
                {mockVerdict && (
                  <span className="text-[10px] text-[#22C55E] font-medium ml-auto">
                    {mockVerdict}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm font-semibold text-[#71717A] italic">
                Not available yet
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#71717A] mt-3 line-clamp-1 border-t border-[#27272A] pt-2.5" title={mockRole}>
            {mockRole || 'Practice with live AI simulation'}
          </p>
        </div>

        {/* Card 4: Priority Skill Gaps */}
        <div
          onClick={() => handleNavigate(careerNav ? 'NAVIGATOR' : 'DOCKET')}
          className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-5 hover:border-[#F59E0B]/60 transition-all duration-200 cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#F59E0B] text-[18px]">bolt</span>
              </div>
              <span className="text-[10px] font-label-caps text-[#71717A] group-hover:text-[#F59E0B] transition-colors flex items-center gap-0.5">
                Skills <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
              </span>
            </div>
            <span className="font-label-caps text-[10px] text-[#71717A] tracking-widest uppercase block mb-1">
              PRIORITY SKILL GAPS
            </span>
            {skillGapsCount !== null ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-[#F59E0B] tracking-tight">
                  {skillGapsCount}
                </span>
                <span className="text-[10px] text-[#71717A] uppercase font-semibold">Gaps Flagged</span>
              </div>
            ) : (
              <span className="text-sm font-semibold text-[#71717A] italic">
                Not available yet
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#71717A] mt-3 line-clamp-1 border-t border-[#27272A] pt-2.5" title={skillGapsPreview.join(', ')}>
            {skillGapsPreview.length > 0
              ? skillGapsPreview.join(', ')
              : 'Scan resume to highlight critical gaps'}
          </p>
        </div>
      </div>

      {/* ─── 3. NEXT BEST ACTION SPOTLIGHT ─────────────────────────────────── */}
      {nextAction && (
        <div className="dashboard-action-banner relative overflow-hidden rounded-2xl border border-[#4F7DF3]/35 bg-gradient-to-r from-[#4F7DF3]/15 via-[#171A20] to-[#171A20] p-6 md:p-7 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#4F7DF3]/25 border border-[#4F7DF3]/40 flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[#4F7DF3] text-[20px]">
                  {nextAction.icon}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-label-caps text-[10px] text-[#4F7DF3] font-bold tracking-widest">
                    RECOMMENDED NEXT STEP
                  </span>
                </div>
                <h3 className="font-headline-md text-base md:text-lg text-[#FAFAFA] font-bold">
                  {nextAction.title}
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-1 max-w-2xl leading-relaxed">
                  {nextAction.desc}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleNavigate(nextAction.tab)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#4F7DF3] hover:bg-[#4069D0] text-white font-label-caps px-5 py-2.5 rounded-xl transition-all duration-200 text-xs tracking-wider shadow-[0_4px_16px_rgba(79,125,243,0.3)] hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0"
            >
              <span>{nextAction.btnLabel}</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── 4. CAREER DIRECTION & SKILL READINESS (TWO-COLUMN) ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Top Career Path */}
        <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-7 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#A855F7]/15 border border-[#A855F7]/25 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#A855F7] text-[16px]">explore</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#FAFAFA]">Target Career Direction</h3>
                  <p className="text-[11px] text-[#71717A]">Highest alignment trajectory</p>
                </div>
              </div>
              {topCareerPath && (
                <ScoreRing score={topCareerPath.fitScore} size={44} color="#A855F7" />
              )}
            </div>

            {topCareerPath ? (
              <div className="space-y-4">
                <div className="bg-[#09090B] border border-[#27272A] rounded-xl p-4">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h4 className="text-sm font-bold text-[#FAFAFA]">{topCareerPath.title}</h4>
                    <span className="text-xs font-semibold text-[#A855F7]">
                      {topCareerPath.fitScore}% Match
                    </span>
                  </div>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed mt-1">
                    {topCareerPath.whyFit}
                  </p>
                </div>

                {topCareerPath.currentStrengths?.length > 0 && (
                  <div>
                    <span className="text-[10px] font-label-caps text-[#71717A] tracking-wider block mb-2">
                      TRANSFERABLE STRENGTHS
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {topCareerPath.currentStrengths.slice(0, 4).map((str, idx) => (
                        <span
                          key={idx}
                          className="bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">check</span>
                          {str}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#09090B] border border-[#27272A] rounded-xl p-6 text-center space-y-2">
                <span className="material-symbols-outlined text-3xl text-[#71717A]">explore</span>
                <p className="text-xs font-medium text-[#FAFAFA]">Career paths not mapped yet</p>
                <p className="text-[11px] text-[#71717A] max-w-xs mx-auto">
                  Run Career Navigator to calculate personalized role transitions and growth roadmaps.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#27272A] flex justify-end">
            <button
              type="button"
              onClick={() => handleNavigate('NAVIGATOR')}
              className="text-xs font-medium text-[#4F7DF3] hover:text-[#5B8CFF] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{topCareerPath ? 'View Full Career Roadmap' : 'Open Career Navigator'}</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Right Column: Skill Readiness */}
        <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-7 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#F59E0B] text-[16px]">psychology</span>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-[#FAFAFA]">Skill Readiness & Gaps</h3>
                <p className="text-[11px] text-[#71717A]">High impact competencies to bridge</p>
              </div>
            </div>

            {priorityGaps.length > 0 ? (
              <div className="space-y-2.5">
                {priorityGaps.slice(0, 4).map((gap, idx) => (
                  <div
                    key={idx}
                    className="bg-[#09090B] border border-[#27272A] rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#FAFAFA] truncate">{gap.skill}</p>
                      {gap.reason && (
                        <p className="text-[11px] text-[#71717A] truncate mt-0.5">{gap.reason}</p>
                      )}
                    </div>
                    <PriorityBadge priority={gap.priority} />
                  </div>
                ))}
              </div>
            ) : missingSkillsFromMatch.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {missingSkillsFromMatch.slice(0, 6).map((skill, idx) => (
                    <div
                      key={idx}
                      className="bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-[#A1A1AA] flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                      <span>{skill}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#71717A] mt-2">
                  Identified from your latest Job Match analysis.
                </p>
              </div>
            ) : (
              <div className="bg-[#09090B] border border-[#27272A] rounded-xl p-6 text-center space-y-2">
                <span className="material-symbols-outlined text-3xl text-[#71717A]">checklist</span>
                <p className="text-xs font-medium text-[#FAFAFA]">No skill gaps recorded yet</p>
                <p className="text-[11px] text-[#71717A] max-w-xs mx-auto">
                  Run a Job Match analysis or Career Navigator scan to uncover high-impact gaps.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#27272A] flex justify-end">
            <button
              type="button"
              onClick={() => handleNavigate(careerNav ? 'NAVIGATOR' : 'DOCKET')}
              className="text-xs font-medium text-[#4F7DF3] hover:text-[#5B8CFF] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{careerNav ? 'Manage Skills in Navigator' : 'Analyze Job Description'}</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 5. RECENT ACTIVITY TIMELINE ───────────────────────────────────── */}
      <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-7 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/25 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#3B82F6] text-[16px]">history</span>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#FAFAFA]">Recent Activity Timeline</h3>
              <p className="text-[11px] text-[#71717A]">Actual recorded session history</p>
            </div>
          </div>
          {archives.length > 0 && (
            <button
              type="button"
              onClick={() => handleNavigate('ARCHIVES')}
              className="text-xs font-medium text-[#71717A] hover:text-[#FAFAFA] transition-colors cursor-pointer"
            >
              View Full History →
            </button>
          )}
        </div>

        {recentTimeline.length > 0 ? (
          <div className="space-y-3 pt-2">
            {recentTimeline.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNavigate(item.tab)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#09090B] border border-[#27272A] hover:border-[#3F3F46] transition-all duration-150 cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#171A20] border border-[#27272A] flex items-center justify-center shrink-0">
                    <span className={`material-symbols-outlined text-[16px] ${item.iconColor}`}>
                      {item.icon}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#FAFAFA] truncate group-hover:text-[#4F7DF3] transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[#71717A] truncate">{item.detail}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[10px] text-[#52525B] font-mono">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                  <span className="material-symbols-outlined text-[14px] text-[#3F3F46] group-hover:text-[#FAFAFA] transition-colors">
                    chevron_right
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-[#09090B] border border-[#27272A] rounded-xl space-y-2">
            <span className="material-symbols-outlined text-3xl text-[#71717A]">history</span>
            <p className="text-xs font-medium text-[#FAFAFA]">No recent activity yet</p>
            <p className="text-[11px] text-[#71717A] max-w-xs mx-auto">
              Your resume scans, Career Navigator plans, and completed Mock Interviews will appear here.
            </p>
          </div>
        )}
      </div>

      {/* ─── 6. QUICK ACTIONS GRID ─────────────────────────────────────────── */}
      <div>
        <span className="font-label-caps text-[#71717A] tracking-widest text-[10px] uppercase font-semibold block mb-3">
          QUICK NAVIGATION
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id: 'DOCKET',
              title: 'Analyze Resume',
              desc: 'ATS scan & Job Match',
              icon: 'work',
              color: 'text-[#4F7DF3]',
            },
            {
              id: 'NAVIGATOR',
              title: 'Career Navigator',
              desc: 'Trajectories & roadmaps',
              icon: 'explore',
              color: 'text-[#A855F7]',
            },
            {
              id: 'EVIDENCE',
              title: 'Mock Interview',
              desc: 'Live interactive simulation',
              icon: 'record_voice_over',
              color: 'text-[#22C55E]',
            },
            {
              id: 'ARCHIVES',
              title: 'History & Archives',
              desc: 'All completed evaluations',
              icon: 'history',
              color: 'text-[#F59E0B]',
            },
          ].map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleNavigate(action.id)}
              className="flex items-center gap-3.5 p-4 rounded-xl bg-[#171A20] border border-[#2D2F36] hover:border-[#4F7DF3]/50 transition-all text-left group cursor-pointer shadow-md hover:scale-[1.01]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-center shrink-0 group-hover:border-[#4F7DF3]/40 transition-colors">
                <span className={`material-symbols-outlined text-[20px] ${action.color}`}>
                  {action.icon}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#FAFAFA] group-hover:text-[#4F7DF3] transition-colors">
                  {action.title}
                </p>
                <p className="text-[11px] text-[#71717A] truncate">{action.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
