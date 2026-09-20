import React, { useEffect, useState, useMemo } from 'react';
import {
  getStoredArchives,
  setStoredArchives,
  getStoredMockInterviews,
  getStoredNavigator,
  getStoredLastAnalysis,
} from '../services/userStorage';
import { loadSavedResumes } from '../services/savedResume';

// ─── Score & Match Helpers ───────────────────────────────────────────────────

function matchLabel(score) {
  if (score >= 75) return { label: 'STRONG FIT', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10 border-emerald-500/30' };
  if (score >= 55) return { label: 'POSSIBLE FIT', colorClass: 'text-amber-400', bgClass: 'bg-amber-500/10 border-amber-500/30' };
  return { label: 'NOT ALIGNED', colorClass: 'text-red-400', bgClass: 'bg-red-500/10 border-red-500/30' };
}

function formatDate(ts) {
  if (!ts) return null;
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Radial Score Circle Component ───────────────────────────────────────────
function ScoreRing({ score, size = 48, strokeWidth = 4, colorClass, customColor }) {
  const s = Math.max(0, Math.min(100, Math.round(score || 0)));
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - s / 100);

  const strokeColor = customColor || (
    s >= 75 ? '#22C55E' : s >= 55 ? '#F59E0B' : '#EF4444'
  );

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
          className="text-white/5 text-[#27272A]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className={`text-xs font-black relative z-10 tabular-nums ${colorClass || 'text-[#FAFAFA]'}`}>
        {s}
      </span>
    </div>
  );
}

// ─── Verdict Badge ────────────────────────────────────────────────────────────
function VerdictBadge({ verdict }) {
  const v = verdict || 'Hire';
  const isPositive = v.includes('Hire') && !v.includes('No');
  const isStrong = v.includes('Strong');
  const isNegative = v.includes('No');

  const cls = isStrong
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : isPositive
    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    : isNegative
    ? 'bg-red-500/15 text-red-400 border-red-500/30'
    : 'bg-amber-500/15 text-amber-400 border-amber-500/30';

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-label-caps tracking-wider ${cls}`}>
      <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>
        {isPositive ? 'verified' : isNegative ? 'cancel' : 'pending'}
      </span>
      {v.toUpperCase()}
    </span>
  );
}

// ─── Main History 2.0 Component ───────────────────────────────────────────────
export default function HistorySection({
  onLoadAnalysis,
  onLoadMockInterview,
  onLoadNavigator,
  onNavigate,
}) {
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'ANALYSIS' | 'NAVIGATOR' | 'INTERVIEW'
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Raw data from user-scoped storage
  const [rawArchives, setRawArchives] = useState([]);
  const [rawMocks, setRawMocks] = useState([]);
  const [rawNavigators, setRawNavigators] = useState([]);

  // Load purely local stored data on mount
  useEffect(() => {
    let cancelled = false;

    async function loadAllHistory() {
      setIsLoading(true);

      // 1. Resume Analyses
      let archivesList = [];
      try {
        const savedArch = getStoredArchives();
        if (Array.isArray(savedArch)) {
          archivesList = savedArch;
        }
      } catch (e) {
        console.error('Error loading archives', e);
      }

      // 2. Mock Interview Sessions
      let mockList = [];
      try {
        const savedMocks = getStoredMockInterviews();
        if (Array.isArray(savedMocks)) {
          mockList = savedMocks;
        }
      } catch (e) {
        console.error('Error loading mock interviews', e);
      }

      // 3. Career Navigator Results (cached plans for saved resumes)
      const navList = [];
      try {
        const resumes = await loadSavedResumes().catch(() => []);
        const validResumes = Array.isArray(resumes) ? resumes : [];
        const seenResumeTexts = new Set();

        for (const resume of validResumes) {
          if (resume.text && !seenResumeTexts.has(resume.text)) {
            seenResumeTexts.add(resume.text);
            const cachedNav = getStoredNavigator(resume.text);
            if (cachedNav && cachedNav.topCareerPaths && cachedNav.topCareerPaths.length > 0) {
              navList.push({
                resume,
                navData: cachedNav,
                realTimestamp: resume.lastUsedAt || resume.savedAt || null,
              });
            }
          }
        }

        // Also check if latest analysis resume has a cached navigator plan
        try {
          const lastAnalysis = getStoredLastAnalysis();
          if (lastAnalysis?.resumeText && !seenResumeTexts.has(lastAnalysis.resumeText)) {
            seenResumeTexts.add(lastAnalysis.resumeText);
            const cachedNav = getStoredNavigator(lastAnalysis.resumeText);
            if (cachedNav && cachedNav.topCareerPaths && cachedNav.topCareerPaths.length > 0) {
              navList.push({
                resume: {
                  name: lastAnalysis.resumeName || 'Analyzed Resume',
                  text: lastAnalysis.resumeText,
                  lastUsedAt: lastAnalysis.date ? new Date(lastAnalysis.date).getTime() : null,
                },
                navData: cachedNav,
                realTimestamp: lastAnalysis.date ? new Date(lastAnalysis.date).getTime() : null,
              });
            }
          }
        } catch (_) {}
      } catch (e) {
        console.error('Error loading navigator cache', e);
      }

      if (!cancelled) {
        setRawArchives(archivesList);
        setRawMocks(mockList);
        setRawNavigators(navList);
        setIsLoading(false);
      }
    }

    loadAllHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  // Normalize into unified history timeline records
  const unifiedRecords = useMemo(() => {
    const list = [];

    // 1. Analyses
    rawArchives.forEach((item, idx) => {
      const score = item.jobMatch?.overallScore ?? item.recommendation?.overallMatch ?? item.agentResults?.ats?.score ?? 0;
      const ts = item.date ? new Date(item.date).getTime() : 0;
      const role = item.jobMatch?.targetRole || item.topic || 'Resume Analysis';
      const company = item.companyMode && item.companyMode !== 'general'
        ? item.companyMode.charAt(0).toUpperCase() + item.companyMode.slice(1)
        : 'General';

      list.push({
        id: `analysis-${item.id || idx}`,
        displayId: item.id || `AN-${idx + 1}`,
        type: 'ANALYSIS',
        typeLabel: 'Resume Analysis',
        typeColor: 'text-[#4F7DF3]',
        typeBg: 'bg-[#4F7DF3]/15 border-[#4F7DF3]/30',
        icon: 'target',
        title: role,
        subtitle: `Target Company: ${company}`,
        company,
        dateFormatted: formatDate(item.date) || 'Recorded Analysis',
        timestamp: ts,
        hasRealTimestamp: Boolean(item.date && !isNaN(ts) && ts > 0),
        score,
        matchData: matchLabel(score),
        raw: item,
      });
    });

    // 2. Mock Interviews
    rawMocks.forEach((item, idx) => {
      const score = item.finalReport?.overallScore ?? 0;
      const ts = item.completionDate ? new Date(item.completionDate).getTime() : 0;
      const role = item.roleTitle || 'Mock Interview';
      const company = item.company || 'General';

      list.push({
        id: item.sessionId || `mock-${idx}`,
        displayId: (item.sessionId || `MI-${idx + 1}`).replace('mock_', 'MI-'),
        type: 'INTERVIEW',
        typeLabel: 'Mock Interview',
        typeColor: 'text-[#22C55E]',
        typeBg: 'bg-[#22C55E]/15 border-[#22C55E]/30',
        icon: 'record_voice_over',
        title: role,
        subtitle: `${item.totalQuestions || item.turns?.length || 0} Questions • ${(item.mode || 'MIXED').toUpperCase()}`,
        company,
        dateFormatted: formatDate(item.completionDate) || 'Completed Session',
        timestamp: ts,
        hasRealTimestamp: Boolean(item.completionDate && !isNaN(ts) && ts > 0),
        score,
        verdict: item.finalReport?.verdict || 'Hire',
        raw: item,
      });
    });

    // 3. Career Navigator Plans
    rawNavigators.forEach((item, idx) => {
      const topPath = item.navData.topCareerPaths?.[0];
      const score = topPath?.fitScore ?? null;
      const ts = item.realTimestamp ? new Date(item.realTimestamp).getTime() : 0;
      const role = topPath?.title || 'Personalized Career Roadmap';
      const gaps = (item.navData.prioritySkillGaps || []).slice(0, 3).map((g) => g.skill).join(', ');

      list.push({
        id: `nav-${item.resume.name || idx}`,
        displayId: `NAV-${idx + 1}`,
        type: 'NAVIGATOR',
        typeLabel: 'Career Navigator',
        typeColor: 'text-[#A855F7]',
        typeBg: 'bg-[#A855F7]/15 border-[#A855F7]/30',
        icon: 'explore',
        title: role,
        subtitle: `Resume: ${item.resume.name}`,
        gapsSummary: gaps,
        company: 'Career Trajectory',
        dateFormatted: item.realTimestamp ? formatDate(item.realTimestamp) : 'Saved Roadmap',
        timestamp: ts,
        hasRealTimestamp: Boolean(item.realTimestamp && !isNaN(ts) && ts > 0),
        score,
        raw: item,
      });
    });

    // Sort newest first: Items with real timestamps sort by descending time, followed by un-timestamped
    list.sort((a, b) => {
      if (a.hasRealTimestamp && b.hasRealTimestamp) {
        return b.timestamp - a.timestamp;
      }
      if (a.hasRealTimestamp && !b.hasRealTimestamp) return -1;
      if (!a.hasRealTimestamp && b.hasRealTimestamp) return 1;
      return 0;
    });

    return list;
  }, [rawArchives, rawMocks, rawNavigators]);

  // Filtered & Searched records
  const filteredRecords = useMemo(() => {
    let result = unifiedRecords;

    // Type Filter
    if (activeFilter !== 'ALL') {
      result = result.filter((item) => item.type === activeFilter);
    }

    // Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        const titleMatch = item.title?.toLowerCase().includes(query);
        const companyMatch = item.company?.toLowerCase().includes(query);
        const subtitleMatch = item.subtitle?.toLowerCase().includes(query);
        const gapsMatch = item.gapsSummary?.toLowerCase().includes(query);
        const idMatch = item.displayId?.toLowerCase().includes(query);
        return titleMatch || companyMatch || subtitleMatch || gapsMatch || idMatch;
      });
    }

    return result;
  }, [unifiedRecords, activeFilter, searchQuery]);

  // Counts per tab
  const counts = useMemo(() => {
    return {
      ALL: unifiedRecords.length,
      ANALYSIS: unifiedRecords.filter((i) => i.type === 'ANALYSIS').length,
      NAVIGATOR: unifiedRecords.filter((i) => i.type === 'NAVIGATOR').length,
      INTERVIEW: unifiedRecords.filter((i) => i.type === 'INTERVIEW').length,
    };
  }, [unifiedRecords]);

  // Action handlers
  const handleOpenAnalysis = (analysisRecord) => {
    if (typeof onLoadAnalysis === 'function') {
      onLoadAnalysis(analysisRecord);
    } else if (typeof onNavigate === 'function') {
      onNavigate('DOCKET');
    }
  };

  const handleOpenMockInterview = (mockRecord) => {
    if (typeof onLoadMockInterview === 'function') {
      onLoadMockInterview(mockRecord);
    } else if (typeof onNavigate === 'function') {
      onNavigate('EVIDENCE');
    }
  };

  const handleOpenNavigator = (navRecord) => {
    if (typeof onLoadNavigator === 'function') {
      onLoadNavigator(navRecord.resume);
    } else if (typeof onNavigate === 'function') {
      onNavigate('NAVIGATOR');
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all resume analysis history? Mock interviews and saved roadmaps will remain intact.')) {
      setStoredArchives([]);
      setRawArchives([]);
    }
  };

  return (
    <div className="animate-fade-in-up max-w-6xl mx-auto pb-16 space-y-6">
      {/* ─── 1. HEADER & CONTROLS ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-label-caps text-[#4F7DF3] text-[10px] tracking-[0.25em] uppercase font-bold">
              TIMELINE 2.0
            </span>
            <span className="bg-[#4F7DF3]/15 text-[#4F7DF3] border border-[#4F7DF3]/30 text-[9px] font-label-caps tracking-widest px-2 py-0.5 rounded-full font-semibold">
              UNIFIED HISTORY
            </span>
          </div>
          <h1 className="font-headline-md text-2xl md:text-3xl text-[#FAFAFA] tracking-tight font-bold">
            Activity & Archives
          </h1>
          <p className="text-[#71717A] text-xs md:text-sm mt-1">
            Browse and reopen your past resume analyses, Career Navigator roadmaps, and mock interviews
          </p>
        </div>

        {rawArchives.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="text-[11px] font-label-caps text-[#71717A] hover:text-red-400 transition-colors tracking-widest border border-[#27272A] hover:border-red-400/30 px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            title="Clear resume analysis history"
          >
            <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
            <span>CLEAR ANALYSES</span>
          </button>
        )}
      </div>

      {/* ─── 2. FILTERS & SEARCH BAR ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#171A20] border border-[#2D2F36] p-2 md:p-2.5 rounded-2xl">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Activity', icon: 'history', count: counts.ALL },
            { id: 'ANALYSIS', label: 'Resume Analyses', icon: 'target', count: counts.ANALYSIS },
            { id: 'NAVIGATOR', label: 'Career Navigator', icon: 'explore', count: counts.NAVIGATOR },
            { id: 'INTERVIEW', label: 'Mock Interviews', icon: 'record_voice_over', count: counts.INTERVIEW },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#4F7DF3] text-white shadow-[0_2px_10px_rgba(79,125,243,0.3)] font-semibold'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#111318]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#27272A] text-[#71717A]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Real-time Search Input */}
        <div className="relative min-w-[220px] md:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[#71717A]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search role, company, skill..."
            className="w-full bg-[#111318] border border-[#27272A] rounded-xl pl-9 pr-8 py-1.5 text-xs text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#4F7DF3] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 3. CARDS GRID & TIMELINE ────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <span className="material-symbols-outlined animate-spin text-[#4F7DF3] text-4xl">progress_activity</span>
        </div>
      ) : filteredRecords.length === 0 ? (
        /* Empty State */
        <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-10 text-center flex flex-col items-center justify-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-[#111318] border border-[#27272A] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-4xl text-[#52525B]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {searchQuery
                ? 'search_off'
                : activeFilter === 'ANALYSIS'
                ? 'target'
                : activeFilter === 'NAVIGATOR'
                ? 'explore'
                : activeFilter === 'INTERVIEW'
                ? 'record_voice_over'
                : 'history'}
            </span>
          </div>

          <h3 className="font-headline-md text-lg text-[#FAFAFA] mb-1">
            {searchQuery
              ? 'No matching activity found'
              : activeFilter === 'ANALYSIS'
              ? 'No Resume Analyses Yet'
              : activeFilter === 'NAVIGATOR'
              ? 'No Career Plans Yet'
              : activeFilter === 'INTERVIEW'
              ? 'No Mock Interviews Yet'
              : 'No Activity Recorded Yet'}
          </h3>

          <p className="text-xs text-[#71717A] max-w-md leading-relaxed mb-6">
            {searchQuery
              ? `No activity matched "${searchQuery}". Try searching for another role, company, or skill keyword.`
              : activeFilter === 'ANALYSIS'
              ? 'Upload your resume and analyze it against a job description in the Analyze tab to measure your fit score.'
              : activeFilter === 'NAVIGATOR'
              ? 'Build a personalized career trajectory and skill-gap roadmap in the Career Navigator tab.'
              : activeFilter === 'INTERVIEW'
              ? 'Practice with real-time AI simulations in Mock Interview to record turn-by-turn performance reports.'
              : 'Start by analyzing a resume, mapping your career trajectory, or practicing with mock interviews.'}
          </p>

          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] text-xs font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Clear Search Query
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (activeFilter === 'ANALYSIS' && typeof onNavigate === 'function') onNavigate('DOCKET');
                else if (activeFilter === 'NAVIGATOR' && typeof onNavigate === 'function') onNavigate('NAVIGATOR');
                else if (activeFilter === 'INTERVIEW' && typeof onNavigate === 'function') onNavigate('EVIDENCE');
                else if (typeof onNavigate === 'function') onNavigate('DOCKET');
              }}
              className="bg-[#4F7DF3] hover:bg-[#4069D0] text-white text-xs font-label-caps tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-[0_4px_16px_rgba(79,125,243,0.3)] cursor-pointer"
            >
              {activeFilter === 'ANALYSIS'
                ? 'Go to Analyze'
                : activeFilter === 'NAVIGATOR'
                ? 'Open Career Navigator'
                : activeFilter === 'INTERVIEW'
                ? 'Start Mock Interview'
                : 'Get Started with Analyze'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredRecords.map((item) => {
            if (item.type === 'ANALYSIS') {
              // ── Analysis Card ──
              return (
                <div
                  key={item.id}
                  className="bg-[#171A20] border border-[#2D2F36] hover:border-[#3F3F46] rounded-2xl p-5 md:p-6 transition-all duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Type Pill, ID & Date */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-label-caps tracking-wider px-2 py-0.5 rounded-full border ${item.typeBg} ${item.typeColor}`}>
                          <span className="material-symbols-outlined text-[12px]">{item.icon}</span>
                          {item.typeLabel}
                        </span>
                        <span className="font-label-caps text-[10px] text-[#71717A] tracking-widest">
                          #{item.displayId}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#71717A]">
                        {item.dateFormatted}
                      </span>
                    </div>

                    {/* Role / Job Title */}
                    <h3
                      className="text-base text-[#FAFAFA] font-headline-md font-semibold leading-snug line-clamp-2 mb-2 group-hover:text-[#4F7DF3] transition-colors"
                      title={item.title}
                    >
                      {item.title}
                    </h3>

                    {/* Company Pill */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="inline-flex items-center gap-1 bg-[#111318] border border-[#27272A] text-[#A1A1AA] px-2.5 py-1 rounded-lg text-[11px]">
                        <span className="material-symbols-outlined text-[13px] text-[#71717A]">business</span>
                        <span>{item.company}</span>
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: Score, Fit Badge & View Action */}
                  <div className="border-t border-[#27272A] pt-4 mt-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ScoreRing score={item.score} size={46} colorClass={item.matchData.colorClass} />
                      <div>
                        <span className={`text-[10px] font-label-caps font-bold tracking-wider uppercase block ${item.matchData.colorClass}`}>
                          {item.matchData.label}
                        </span>
                        <span className="text-[10px] font-label-caps text-[#71717A] tracking-wider uppercase">
                          MATCH SCORE
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenAnalysis(item.raw)}
                      className="flex items-center gap-1.5 bg-[#4F7DF3]/10 hover:bg-[#4F7DF3] text-[#4F7DF3] hover:text-white border border-[#4F7DF3]/30 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer shrink-0"
                    >
                      <span>View Report</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              );
            }

            if (item.type === 'INTERVIEW') {
              // ── Mock Interview Card ──
              return (
                <div
                  key={item.id}
                  className="bg-[#171A20] border border-[#2D2F36] hover:border-[#3F3F46] rounded-2xl p-5 md:p-6 transition-all duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Type Pill, ID & Date */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-label-caps tracking-wider px-2 py-0.5 rounded-full border ${item.typeBg} ${item.typeColor}`}>
                          <span className="material-symbols-outlined text-[12px]">{item.icon}</span>
                          {item.typeLabel}
                        </span>
                        <span className="font-label-caps text-[10px] text-[#71717A] tracking-widest">
                          #{item.displayId}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#71717A]">
                        {item.dateFormatted}
                      </span>
                    </div>

                    {/* Role Title */}
                    <h3
                      className="text-base text-[#FAFAFA] font-headline-md font-semibold leading-snug line-clamp-2 mb-2 group-hover:text-[#22C55E] transition-colors"
                      title={item.title}
                    >
                      {item.title}
                    </h3>

                    {/* Subtitle / Company Pill */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="inline-flex items-center gap-1 bg-[#111318] border border-[#27272A] text-[#A1A1AA] px-2.5 py-1 rounded-lg text-[11px]">
                        <span className="material-symbols-outlined text-[13px] text-[#71717A]">domain</span>
                        <span>@{item.company}</span>
                      </span>
                      <span className="text-[11px] text-[#71717A]">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: Score, Verdict Badge & View Action */}
                  <div className="border-t border-[#27272A] pt-4 mt-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ScoreRing score={item.score} size={46} customColor="#22C55E" />
                      <div>
                        <VerdictBadge verdict={item.verdict} />
                        <span className="text-[10px] font-label-caps text-[#71717A] tracking-wider uppercase block mt-1">
                          OVERALL SCORE
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenMockInterview(item.raw)}
                      className="flex items-center gap-1.5 bg-[#22C55E]/10 hover:bg-[#22C55E] text-[#22C55E] hover:text-white border border-[#22C55E]/30 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer shrink-0"
                    >
                      <span>View Interview</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              );
            }

            if (item.type === 'NAVIGATOR') {
              // ── Career Navigator Card ──
              return (
                <div
                  key={item.id}
                  className="bg-[#171A20] border border-[#2D2F36] hover:border-[#3F3F46] rounded-2xl p-5 md:p-6 transition-all duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Type Pill, ID & Date */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-label-caps tracking-wider px-2 py-0.5 rounded-full border ${item.typeBg} ${item.typeColor}`}>
                          <span className="material-symbols-outlined text-[12px]">{item.icon}</span>
                          {item.typeLabel}
                        </span>
                        <span className="font-label-caps text-[10px] text-[#71717A] tracking-widest">
                          #{item.displayId}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#71717A]">
                        {item.dateFormatted}
                      </span>
                    </div>

                    {/* Career Path Title */}
                    <h3
                      className="text-base text-[#FAFAFA] font-headline-md font-semibold leading-snug line-clamp-2 mb-2 group-hover:text-[#A855F7] transition-colors"
                      title={item.title}
                    >
                      {item.title}
                    </h3>

                    {/* Resume & Skill Gap Summary */}
                    <div className="space-y-1.5 mb-4">
                      <p className="text-[11px] text-[#A1A1AA] truncate">
                        {item.subtitle}
                      </p>
                      {item.gapsSummary && (
                        <p className="text-[11px] text-[#71717A] truncate">
                          <strong className="text-[#F59E0B] font-medium">Key Gaps:</strong> {item.gapsSummary}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Fit Score & View Action */}
                  <div className="border-t border-[#27272A] pt-4 mt-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {item.score !== null ? (
                        <ScoreRing score={item.score} size={46} customColor="#A855F7" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-[#A855F7]/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#A855F7] text-[18px]">explore</span>
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-bold text-[#FAFAFA] block">
                          {item.score !== null ? `${item.score}% Fit` : 'Roadmap Ready'}
                        </span>
                        <span className="text-[10px] font-label-caps text-[#71717A] tracking-wider uppercase">
                          CAREER TRAJECTORY
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenNavigator(item.raw)}
                      className="flex items-center gap-1.5 bg-[#A855F7]/10 hover:bg-[#A855F7] text-[#A855F7] hover:text-white border border-[#A855F7]/30 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer shrink-0"
                    >
                      <span>View Roadmap</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}

