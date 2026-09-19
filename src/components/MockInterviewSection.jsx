import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  startMockInterview,
  submitMockInterviewTurn,
  generateMockInterviewFinalReport,
} from '../services/hiringApi';
import {
  loadSavedResumes,
  markResumeUsed,
  saveResume,
  removeSavedResume,
  parseResumeFile,
  MAX_RESUMES,
} from '../services/savedResume';

const STORAGE_KEY = 'careerlens_mock_interviews';

// ─── Compact Resume Selector ───────────────────────────────────────────────────
function ResumeSelector({
  savedResumes,
  selectedResume,
  onSelect,
  onDelete,
  onUploadClick,
  isUploading,
  uploadError,
  uploadNotice,
  disabled,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!savedResumes || savedResumes.length === 0) return null;

  function lastUsedLabel(ts) {
    if (!ts) return 'Today';
    const then = new Date(ts);
    const now = new Date();
    const days = Math.round(
      (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
        Date.UTC(then.getFullYear(), then.getMonth(), then.getDate())) /
        86400000
    );
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const activeResume =
    (selectedResume && savedResumes.find((r) => r.name === selectedResume.name)) ||
    savedResumes[0];

  const otherResumes = savedResumes.filter((r) => r.name !== activeResume.name);

  return (
    <div className="flex flex-col gap-2 mb-5">
      <label className="font-label-caps text-[#A1A1AA] tracking-widest text-[10px]">
        RESUME
      </label>

      {/* Saved resumes — compact selector: last used shown, others in a dropdown */}
      <div className="rounded-xl border border-[#27272A] bg-[#111318] overflow-hidden">
        {/* Current (selected / last used) resume — entire row is clickable */}
        <div
          className="px-3.5 py-2.5 cursor-pointer hover:bg-[#4F7DF3]/5 transition-colors"
          onClick={() => {
            if (!disabled && !isUploading) {
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
                  onDelete(activeResume.name);
                }}
                disabled={disabled || isUploading}
                className="text-[#3F3F46] hover:text-[#EF4444] transition-colors shrink-0 p-0.5"
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
                disabled={disabled || isUploading}
                className="text-[#71717A] hover:text-[#FAFAFA] transition-colors shrink-0 p-0.5 cursor-pointer"
                title={dropdownOpen ? 'Hide other saved resumes' : 'Show other saved resumes'}
                aria-label={dropdownOpen ? 'Hide other saved resumes' : 'Show other saved resumes'}
              >
                <span
                  className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180' : ''
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

        {/* Other saved resumes — each row is fully clickable to select */}
        {dropdownOpen && otherResumes.length > 0 && (
          <div className="border-t border-[#27272A]">
            {otherResumes.map((r) => (
              <div
                key={r.name}
                className="flex items-center gap-2 px-3.5 py-2 border-b border-[#27272A]/70 last:border-b-0 hover:bg-[#4F7DF3]/5 transition-colors cursor-pointer"
                onClick={() => {
                  if (!disabled && !isUploading) {
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
                      onDelete(r.name);
                    }}
                    disabled={disabled || isUploading}
                    className="text-[#3F3F46] hover:text-[#EF4444] transition-colors shrink-0 p-0.5"
                    title="Remove saved resume"
                    aria-label={`Remove ${r.name}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                )}
              </div>
            ))}
            <div className="px-3.5 py-2 border-t border-[#27272A] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#4F7DF3] text-[14px] shrink-0">
                add
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUploadClick();
                }}
                disabled={disabled || isUploading}
                className="text-[11px] font-medium text-[#4F7DF3] hover:text-[#5B8CFF] transition-colors cursor-pointer"
              >
                Upload New Resume
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload button below selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <button
          type="button"
          onClick={onUploadClick}
          disabled={disabled || isUploading}
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

// ─── Score Radial Ring ──────────────────────────────────────────────────────────
function ScoreRing({ score, label, size = 64 }) {
  const r = size * 0.35;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, score || 0)) / 100);
  const color =
    score >= 80 ? '#22C55E' : score >= 65 ? '#4F7DF3' : score >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <svg className="w-full h-full -rotate-90 absolute inset-0" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="4"
            className="text-[#27272A]"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="transparent"
            stroke={color}
            strokeWidth="4"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="text-sm font-bold text-[#FAFAFA] font-headline-md">{score}</span>
      </div>
      {label && (
        <span className="text-[10px] font-label-caps tracking-widest text-[#71717A] mt-1 text-center">
          {label}
        </span>
      )}
    </div>
  );
}

// ─── Category Badge ────────────────────────────────────────────────────────────
function CategoryBadge({ category }) {
  const cfg = {
    TECHNICAL: { label: 'TECHNICAL', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
    BEHAVIORAL: { label: 'BEHAVIORAL', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
    PROBLEM_SOLVING: { label: 'PROBLEM SOLVING', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    ROLE_SPECIFIC: { label: 'ROLE SPECIFIC', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
    PROJECT_DEEP_DIVE: { label: 'PROJECT DEEP-DIVE', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    SYSTEM_DESIGN: { label: 'SYSTEM DESIGN', color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' },
  };
  const { label, color } = cfg[category] || {
    label: (category || 'GENERAL').replace(/_/g, ' '),
    color: 'text-slate-400 border-slate-500/30 bg-slate-500/10',
  };
  return (
    <span className={`font-label-caps text-[9px] tracking-widest px-2.5 py-0.5 rounded-full border ${color}`}>
      {label}
    </span>
  );
}

// ─── Verdict Badge ────────────────────────────────────────────────────────────
function VerdictBadge({ verdict }) {
  const v = verdict || 'Hire';
  const isPositive = v.includes('Hire') && !v.includes('No');
  const isStrong = v.includes('Strong');
  const isNegative = v.includes('No');

  const cls = isStrong
    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
    : isPositive
    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
    : isNegative
    ? 'bg-red-500/20 text-red-400 border-red-500/40'
    : 'bg-amber-500/20 text-amber-400 border-amber-500/40';

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold tracking-wide ${cls}`}>
      <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
        {isPositive ? 'verified' : isNegative ? 'cancel' : 'pending'}
      </span>
      {v.toUpperCase()}
    </span>
  );
}

// ─── Main Mock Interview Component ─────────────────────────────────────────────
export default function MockInterviewSection({ onViewKit }) {
  // Session State
  const [sessionStage, setSessionStage] = useState('setup'); // 'setup' | 'interviewing' | 'report'
  const [savedResumes, setSavedResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);

  // Setup Form
  const [roleTitle, setRoleTitle] = useState('Software Engineer');
  const [companyName, setCompanyName] = useState('General');
  const [mode, setMode] = useState('mixed'); // 'technical' | 'behavioral' | 'mixed'
  const [totalQuestions, setTotalQuestions] = useState(3); // 3–10
  const [sessionPreset, setSessionPreset] = useState('quick'); // 'quick' | 'standard' | 'full' | 'custom'

  // Active Live Interview State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentCategory, setCurrentCategory] = useState('TECHNICAL');
  const [currentInterviewerNote, setCurrentInterviewerNote] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [isTurnSubmitting, setIsTurnSubmitting] = useState(false);
  const [turns, setTurns] = useState([]); // Completed rounds: { question, category, interviewerNote, userAnswer, score, conciseFeedback, idealAnswerPoints }
  const [lastTurnFeedback, setLastTurnFeedback] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(true);

  // Final Report State
  const [finalReport, setFinalReport] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Past Sessions List
  const [pastSessions, setPastSessions] = useState([]);
  const [showPastSessions, setShowPastSessions] = useState(false);
  const [selectedPastSession, setSelectedPastSession] = useState(null);

  // File Upload State
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadNotice, setUploadNotice] = useState('');

  // 1. Initial Load: Load saved resumes, prefill from latest analysis, load past sessions
  useEffect(() => {
    let cancelled = false;
    async function init() {
      // Load saved resumes
      const resumes = await loadSavedResumes().catch(() => []);
      if (!cancelled) {
        const list = Array.isArray(resumes) ? resumes : [];
        setSavedResumes(list);
        if (list.length > 0) {
          setSelectedResume(list[0]);
        }
      }

      // Prefill role from latest analysis if available
      try {
        const raw =
          localStorage.getItem('careerlens_last_analysis') ||
          localStorage.getItem('hireflow_last_analysis');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.jobDescription) {
            const firstLine = parsed.jobDescription.split('\n')[0].replace(/[#*]/g, '').trim();
            if (firstLine && firstLine.length < 50) {
              setRoleTitle(firstLine);
            }
          }
          if (parsed.companyMode && parsed.companyMode !== 'general') {
            setCompanyName(parsed.companyMode.charAt(0).toUpperCase() + parsed.companyMode.slice(1));
          }
        }
      } catch (_) {}

      // Load past sessions
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setPastSessions(JSON.parse(stored));
        }
      } catch (_) {}
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Resume Selection & Upload Handlers
  const handleSelectResume = useCallback((resume) => {
    setSelectedResume(resume);
    setSavedResumes((prev) => [
      { ...resume, lastUsedAt: Date.now() },
      ...prev.filter((r) => r.name !== resume.name),
    ].slice(0, MAX_RESUMES));
    markResumeUsed(resume.name).catch(() => {});
  }, []);

  const handleDeleteResume = useCallback(
    async (name) => {
      try {
        await removeSavedResume(name);
        const updatedList = await loadSavedResumes().catch(() => []);
        const validList = Array.isArray(updatedList) ? updatedList : [];
        setSavedResumes(validList);
        if (selectedResume?.name === name) {
          setSelectedResume(validList.length > 0 ? validList[0] : null);
        }
      } catch (err) {
        console.error('Failed to remove saved resume:', err);
      }
    },
    [selectedResume]
  );

  const handleUploadClick = useCallback(() => {
    setUploadError('');
    setUploadNotice('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');
    setUploadNotice('');

    try {
      const record = await parseResumeFile(file);
      const currentSaved = await loadSavedResumes();
      const isExisting = currentSaved.some((r) => r.name === record.name);
      if (!isExisting && currentSaved.length >= MAX_RESUMES) {
        setUploadNotice(`Storage limit reached (${MAX_RESUMES} max). Oldest resume was replaced.`);
      }

      await saveResume(record);
      const updatedList = await loadSavedResumes();
      setSavedResumes(updatedList);
      setSelectedResume(record);
    } catch (err) {
      console.error('Resume upload failed:', err);
      setUploadError(err?.message || 'Failed to process resume file.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Helper to retrieve latest Job Match / analysis context if available
  const getJobContext = () => {
    try {
      const raw =
        localStorage.getItem('careerlens_last_analysis') ||
        localStorage.getItem('hireflow_last_analysis');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.jobMatch?.matchedSkills || parsed.jobMatch?.missingSkills) {
          const matched = (parsed.jobMatch.matchedSkills || []).slice(0, 5).join(', ');
          const missing = (parsed.jobMatch.missingSkills || []).slice(0, 5).join(', ');
          return `Key matched skills: ${matched}. Target gaps / key focus areas: ${missing}.`;
        }
      }
    } catch (_) {}
    return '';
  };

  // 3. Start Mock Interview (Calls AI to generate Question 1)
  const handleStartInterview = async () => {
    if (!selectedResume?.text) {
      setErrorMsg('Please upload or select a resume first.');
      return;
    }
    if (!roleTitle.trim()) {
      setErrorMsg('Please enter a target role or job title.');
      return;
    }

    setErrorMsg('');
    setIsTurnSubmitting(true);
    setSessionStage('interviewing');
    setCurrentQuestionIndex(1);
    setTurns([]);
    setUserAnswer('');
    setLastTurnFeedback(null);
    setFinalReport(null);

    try {
      const jobContext = getJobContext();
      const q1 = await startMockInterview(
        selectedResume.text,
        roleTitle.trim(),
        companyName.trim() || 'General',
        mode,
        totalQuestions,
        jobContext
      );
      setCurrentQuestion(q1.question);
      setCurrentCategory(q1.category || 'TECHNICAL');
      setCurrentInterviewerNote(q1.interviewerNote || 'Evaluating foundational technical competence.');
    } catch (err) {
      console.error('Failed to start mock interview:', err);
      setErrorMsg(err?.message || 'Failed to start interview. Please check your network and try again.');
      setSessionStage('setup');
    } finally {
      setIsTurnSubmitting(false);
    }
  };

  // 4. Submit Answer (Single API Call: Evaluates current answer AND generates next question)
  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      setErrorMsg('Please provide your answer before submitting.');
      return;
    }

    setErrorMsg('');
    setIsTurnSubmitting(true);

    try {
      const jobContext = getJobContext();
      const turnResult = await submitMockInterviewTurn({
        resumeText: selectedResume?.text || '',
        roleTitle: roleTitle.trim(),
        companyName: companyName.trim() || 'General',
        mode,
        currentQuestionIndex,
        totalQuestions,
        currentQuestion,
        currentCategory,
        userAnswer: userAnswer.trim(),
        previousTurns: turns,
        jobContext,
      });

      const completedTurn = {
        questionNumber: currentQuestionIndex,
        question: currentQuestion,
        category: currentCategory,
        interviewerNote: currentInterviewerNote,
        userAnswer: userAnswer.trim(),
        score: turnResult.score,
        conciseFeedback: turnResult.conciseFeedback,
        idealAnswerPoints: turnResult.idealAnswerPoints || [],
      };

      const updatedTurns = [...turns, completedTurn];
      setTurns(updatedTurns);
      setLastTurnFeedback(completedTurn);

      // Check if interview is complete
      if (turnResult.isFinished || currentQuestionIndex >= totalQuestions) {
        // Trigger final report generation
        await triggerFinalReport(updatedTurns);
      } else {
        // Advance to next question in the session
        setCurrentQuestionIndex((prev) => prev + 1);
        setCurrentQuestion(turnResult.nextQuestion);
        setCurrentCategory(turnResult.nextCategory || 'TECHNICAL');
        setCurrentInterviewerNote(turnResult.nextInterviewerNote || '');
        setUserAnswer('');
      }
    } catch (err) {
      console.error('Failed to submit interview turn:', err);
      setErrorMsg(err?.message || 'Failed to evaluate answer. Please try submitting again.');
    } finally {
      setIsTurnSubmitting(false);
    }
  };

  // 5. Generate Final Report (Single API call at the end of session)
  const triggerFinalReport = async (completedTurns) => {
    setIsGeneratingReport(true);
    setSessionStage('report');

    try {
      const report = await generateMockInterviewFinalReport({
        resumeText: selectedResume?.text || '',
        roleTitle: roleTitle.trim(),
        companyName: companyName.trim() || 'General',
        mode,
        turns: completedTurns,
      });

      setFinalReport(report);

      // Persist completed interview to localStorage under 'careerlens_mock_interviews'
      const sessionRecord = {
        sessionId: `mock_${Date.now()}`,
        resumeName: selectedResume?.name || 'Resume',
        roleTitle: roleTitle.trim(),
        company: companyName.trim() || 'General',
        mode,
        totalQuestions: completedTurns.length,
        turns: completedTurns,
        finalReport: report,
        completionDate: new Date().toISOString(),
      };

      try {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const updated = [sessionRecord, ...existing].slice(0, 15);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setPastSessions(updated);
      } catch (storageErr) {
        console.warn('Storage quota exceeded for mock interview sessions', storageErr);
      }
    } catch (err) {
      console.error('Failed to generate final interview report:', err);
      setErrorMsg(err?.message || 'Failed to compile final report. You can retry below.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // 6. Early End Interview
  const handleEndEarly = async () => {
    if (turns.length === 0) {
      setSessionStage('setup');
      return;
    }
    if (window.confirm('End the mock interview now and generate your report from completed questions?')) {
      await triggerFinalReport(turns);
    }
  };

  // 7. Retake / Reset
  const handleResetSession = () => {
    setSessionStage('setup');
    setUserAnswer('');
    setTurns([]);
    setLastTurnFeedback(null);
    setFinalReport(null);
    setErrorMsg('');
    setSelectedPastSession(null);
  };

  // 8. Delete a past session
  const handleDeletePastSession = (id, e) => {
    e.stopPropagation();
    try {
      const updated = pastSessions.filter((s) => s.sessionId !== id);
      setPastSessions(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (selectedPastSession?.sessionId === id) {
        setSelectedPastSession(null);
      }
    } catch (_) {}
  };

  // Common role suggestions
  const roleSuggestions = [
    'Software Engineer',
    'Frontend Developer',
    'Backend Engineer',
    'Full Stack Developer',
    'AI / ML Engineer',
    'Product Manager',
  ];

  return (
    <div className="animate-fade-in-up max-w-5xl mx-auto pb-16">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-label-caps text-[#4F7DF3] text-[10px] tracking-[0.25em] uppercase font-bold">
              AI-POWERED
            </span>
            <span className="bg-[#4F7DF3]/15 text-[#4F7DF3] border border-[#4F7DF3]/30 text-[9px] font-label-caps tracking-widest px-2 py-0.5 rounded-full">
              INTERACTIVE
            </span>
          </div>
          <h1 className="font-headline-md text-2xl md:text-3xl text-[#FAFAFA] tracking-tight font-bold">
            AI Mock Interview
          </h1>
          <p className="text-[#71717A] text-sm mt-1">
            Real-time interactive interview simulation with turn-by-turn feedback & scoring
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowPastSessions((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#27272A] bg-[#111318] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3F3F46] text-xs font-medium transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            <span>Past Sessions ({pastSessions.length})</span>
          </button>
          {onViewKit && (
            <button
              type="button"
              onClick={onViewKit}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#27272A] bg-[#111318] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3F3F46] text-xs font-medium transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">quiz</span>
              <span>Question Kit</span>
            </button>
          )}
        </div>
      </div>

      {/* Past Sessions Drawer/Modal */}
      {showPastSessions && (
        <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-5 mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#4F7DF3] text-[18px]">history</span>
              <h3 className="font-semibold text-sm text-[#FAFAFA]">Completed Mock Interviews</h3>
            </div>
            <button
              onClick={() => setShowPastSessions(false)}
              className="text-[#71717A] hover:text-[#FAFAFA] text-xs cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          {pastSessions.length === 0 ? (
            <p className="text-xs text-[#71717A] py-3 text-center">
              No completed mock interview sessions yet. Start one below!
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {pastSessions.map((session) => (
                <div
                  key={session.sessionId}
                  onClick={() => {
                    setSelectedPastSession(session);
                    setFinalReport(session.finalReport);
                    setTurns(session.turns || []);
                    setRoleTitle(session.roleTitle);
                    setCompanyName(session.company);
                    setMode(session.mode);
                    setSessionStage('report');
                    setShowPastSessions(false);
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#111318] border border-[#27272A] hover:border-[#3F3F46] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ScoreRing score={session.finalReport?.overallScore || 0} size={40} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#FAFAFA] truncate">
                          {session.roleTitle}
                        </span>
                        <span className="text-[10px] text-[#71717A]">@{session.company}</span>
                      </div>
                      <p className="text-[11px] text-[#52525B]">
                        {new Date(session.completionDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        • {session.totalQuestions} Questions • {session.mode.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <VerdictBadge verdict={session.finalReport?.verdict} />
                    <button
                      type="button"
                      onClick={(e) => handleDeletePastSession(session.sessionId, e)}
                      className="text-[#3F3F46] hover:text-[#EF4444] transition-colors p-1"
                      title="Delete session"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-3 text-xs animate-fade-in-up">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm shrink-0">error</span>
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-xs hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ─── STAGE 1: SETUP VIEW ─────────────────────────────────────────────── */}
      {sessionStage === 'setup' && (
        <div className="space-y-6">
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
            disabled={isTurnSubmitting}
          />

          {/* Configuration Card */}
          <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-8 animate-fade-in-up">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg bg-[#4F7DF3]/15 border border-[#4F7DF3]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#4F7DF3] text-[16px]">tune</span>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-[#FAFAFA]">Interview Settings</h3>
                <p className="text-[11px] text-[#71717A]">
                  Customize the role, target company, and interview depth
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              {/* Target Role */}
              <div>
                <label className="font-label-caps text-[#A1A1AA] tracking-widest text-[10px] block mb-2 font-semibold">
                  TARGET ROLE / JOB TITLE *
                </label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Senior Full Stack Engineer"
                  className="w-full bg-[#111318] border border-[#27272A] rounded-xl px-4 py-2.5 text-xs text-[#FAFAFA] placeholder-[#52525B] focus:border-[#4F7DF3] focus:outline-none transition-colors"
                />
                {/* Suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {roleSuggestions.map((title) => (
                    <button
                      key={title}
                      type="button"
                      onClick={() => setRoleTitle(title)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        roleTitle === title
                          ? 'bg-[#4F7DF3]/15 border-[#4F7DF3]/40 text-[#4F7DF3]'
                          : 'bg-[#09090B] border-[#27272A] text-[#71717A] hover:text-[#FAFAFA] hover:border-[#3F3F46]'
                      }`}
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Company */}
              <div>
                <label className="font-label-caps text-[#A1A1AA] tracking-widest text-[10px] block mb-2 font-semibold">
                  TARGET COMPANY (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Google, Stripe, High-growth Startup"
                  className="w-full bg-[#111318] border border-[#27272A] rounded-xl px-4 py-2.5 text-xs text-[#FAFAFA] placeholder-[#52525B] focus:border-[#4F7DF3] focus:outline-none transition-colors"
                />
                <p className="text-[11px] text-[#52525B] mt-2">
                  The AI adjusts question style, bar, and company cultural expectations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 border-t border-[#27272A]">
              {/* Interview Mode */}
              <div>
                <label className="font-label-caps text-[#A1A1AA] tracking-widest text-[10px] block mb-2 font-semibold">
                  INTERVIEW FOCUS MODE
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'mixed', label: 'Mixed', icon: 'auto_awesome', desc: 'Balanced' },
                    { id: 'technical', label: 'Technical', icon: 'code', desc: 'Deep Tech' },
                    { id: 'behavioral', label: 'Behavioral', icon: 'psychology', desc: 'STAR / Fit' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMode(item.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        mode === item.id
                          ? 'bg-[#4F7DF3]/15 border-[#4F7DF3] text-[#FAFAFA]'
                          : 'bg-[#111318] border-[#27272A] text-[#71717A] hover:text-[#FAFAFA] hover:border-[#3F3F46]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px] mb-1 text-[#4F7DF3]">
                        {item.icon}
                      </span>
                      <span className="text-xs font-semibold">{item.label}</span>
                      <span className="text-[10px] opacity-60">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div>
                <label className="font-label-caps text-[#A1A1AA] tracking-widest text-[10px] block mb-2 font-semibold">
                  SESSION LENGTH
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'quick', count: 3, label: 'Quick', icon: 'bolt', desc: '3 Qs · ~8 min' },
                    { id: 'standard', count: 5, label: 'Standard', icon: 'target', desc: '5 Qs · ~15 min' },
                    { id: 'full', count: 8, label: 'Full', icon: 'diamond', desc: '8 Qs · ~20 min' },
                    { id: 'custom', count: null, label: 'Custom', icon: 'tune', desc: '3–10 Qs' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSessionPreset(item.id);
                        if (item.count !== null) setTotalQuestions(item.count);
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        sessionPreset === item.id
                          ? 'bg-[#4F7DF3]/15 border-[#4F7DF3] text-[#FAFAFA]'
                          : 'bg-[#111318] border-[#27272A] text-[#71717A] hover:text-[#FAFAFA] hover:border-[#3F3F46]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] mb-0.5 text-[#4F7DF3]">
                        {item.icon}
                      </span>
                      <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
                      <span className="text-[9px] opacity-60 leading-tight mt-0.5">{item.desc}</span>
                    </button>
                  ))}
                </div>
                {/* Custom stepper — visible only when Custom is selected */}
                {sessionPreset === 'custom' && (
                  <div className="mt-2.5 flex items-center justify-center gap-3 bg-[#111318] border border-[#27272A] rounded-xl px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setTotalQuestions((q) => Math.max(3, q - 1))}
                      disabled={totalQuestions <= 3}
                      className="w-7 h-7 rounded-lg border border-[#3F3F46] bg-[#18181B] text-[#FAFAFA] flex items-center justify-center text-base font-bold transition-all hover:border-[#4F7DF3] hover:bg-[#4F7DF3]/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold text-[#FAFAFA] tabular-nums min-w-[3.5rem] text-center">
                      {totalQuestions} <span className="text-[10px] font-normal text-[#71717A]">Qs</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setTotalQuestions((q) => Math.min(10, q + 1))}
                      disabled={totalQuestions >= 10}
                      className="w-7 h-7 rounded-lg border border-[#3F3F46] bg-[#18181B] text-[#FAFAFA] flex items-center justify-center text-base font-bold transition-all hover:border-[#4F7DF3] hover:bg-[#4F7DF3]/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      +
                    </button>
                    <span className="text-[10px] text-[#52525B] ml-1">
                      ~{totalQuestions <= 3 ? 8 : totalQuestions <= 5 ? 15 : totalQuestions <= 8 ? 22 : 30} min
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Start CTA */}
            <div className="mt-8 pt-6 border-t border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <p className="text-xs font-medium text-[#FAFAFA]">
                  Ready to practice for {roleTitle}?
                </p>
                <p className="text-[11px] text-[#71717A]">
                  AI evaluates each answer in real-time and dynamically adapts follow-up questions.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartInterview}
                disabled={isTurnSubmitting || !selectedResume?.text}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#4F7DF3] hover:bg-[#4069D0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-label-caps px-6 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 text-xs tracking-wider shadow-[0_4px_16px_rgba(79,125,243,0.3)] cursor-pointer"
              >
                {isTurnSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">
                      progress_activity
                    </span>
                    <span>Preparing Question 1...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                    <span>Start Mock Interview</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STAGE 2: LIVE INTERVIEW IN-PROGRESS ─────────────────────────────── */}
      {sessionStage === 'interviewing' && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Status & Progress Bar */}
          <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-label-caps text-xs font-bold text-[#4F7DF3]">
                  QUESTION {currentQuestionIndex} OF {totalQuestions}
                </span>
                <CategoryBadge category={currentCategory} />
                <span className="text-xs text-[#71717A]">• {roleTitle}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleEndEarly}
                  disabled={isTurnSubmitting}
                  className="text-[11px] text-[#71717A] hover:text-amber-400 transition-colors cursor-pointer"
                >
                  End Interview Early
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full bg-[#111318] rounded-full overflow-hidden border border-[#27272A]">
              <div
                className="h-full bg-[#4F7DF3] transition-all duration-500 ease-out rounded-full"
                style={{
                  width: `${((currentQuestionIndex - (isTurnSubmitting ? 0.5 : 1)) / totalQuestions) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Previous Turn Feedback Banner (if user just answered a question) */}
          {lastTurnFeedback && showFeedbackModal && (
            <div className="bg-[#111318] border border-[#4F7DF3]/30 rounded-2xl p-5 animate-fade-in-up">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#22C55E] text-[18px]">
                    check_circle
                  </span>
                  <span className="font-semibold text-xs text-[#FAFAFA]">
                    Feedback for Question {lastTurnFeedback.questionNumber}
                  </span>
                  <span className="bg-[#4F7DF3]/15 text-[#4F7DF3] text-[10px] font-bold px-2 py-0.5 rounded">
                    Score: {lastTurnFeedback.score}/100
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="text-[#71717A] hover:text-[#FAFAFA] text-xs cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed mb-3">
                {lastTurnFeedback.conciseFeedback}
              </p>
              {lastTurnFeedback.idealAnswerPoints?.length > 0 && (
                <div className="bg-[#09090B] rounded-xl p-3 border border-[#27272A]">
                  <p className="text-[10px] font-label-caps tracking-widest text-[#71717A] mb-1.5">
                    KEY POINTS A TOP CANDIDATE WOULD MENTION:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-[#71717A]">
                    {lastTurnFeedback.idealAnswerPoints.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Interviewer Question Box */}
          <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-8">
            <div className="flex items-start gap-3.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#4F7DF3]/20 border border-[#4F7DF3]/30 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#4F7DF3] text-[20px]">
                  record_voice_over
                </span>
              </div>
              <div>
                <p className="text-[11px] font-label-caps text-[#71717A] tracking-wider">
                  INTERVIEWER QUESTION
                </p>
                <h3 className="text-base md:text-lg font-semibold text-[#FAFAFA] leading-snug mt-1 font-headline-md">
                  {currentQuestion || 'Loading next question...'}
                </h3>
                {currentInterviewerNote && (
                  <p className="text-xs text-[#52525B] mt-2 italic flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">psychology</span>
                    <span>Evaluation focus: {currentInterviewerNote}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Answer Input Area */}
            <div className="mt-6 pt-5 border-t border-[#27272A]">
              <label className="font-label-caps text-[#A1A1AA] tracking-widest text-[10px] block mb-2 font-semibold">
                YOUR ANSWER
              </label>
              <textarea
                rows={6}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={isTurnSubmitting}
                placeholder="Type your structured answer here. Speak as if talking directly to the hiring manager. For technical questions, mention trade-offs and decisions; for behavioral, use the STAR format (Situation, Task, Action, Result)..."
                className="w-full bg-[#111318] border border-[#27272A] rounded-xl p-4 text-xs text-[#FAFAFA] placeholder-[#52525B] focus:border-[#4F7DF3] focus:outline-none transition-colors resize-y leading-relaxed font-sans"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
                <span className="text-[11px] text-[#52525B]">
                  {userAnswer.trim().split(/\s+/).filter(Boolean).length} words •{' '}
                  {userAnswer.length} characters
                </span>

                <button
                  type="button"
                  onClick={handleSubmitAnswer}
                  disabled={isTurnSubmitting || !userAnswer.trim()}
                  className="flex items-center justify-center gap-2 bg-[#4F7DF3] hover:bg-[#4069D0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-label-caps px-6 py-2.5 rounded-xl transition-all duration-200 text-xs tracking-wider shadow-[0_4px_16px_rgba(79,125,243,0.3)] cursor-pointer"
                >
                  {isTurnSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">
                        progress_activity
                      </span>
                      <span>
                        {currentQuestionIndex >= totalQuestions
                          ? 'Evaluating final answer & compiling report...'
                          : 'Evaluating answer & loading next question...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {currentQuestionIndex >= totalQuestions ? 'Finish & Generate Report' : 'Submit Answer'}
                      </span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STAGE 3: FINAL EVALUATION REPORT ──────────────────────────────── */}
      {sessionStage === 'report' && (
        <div className="space-y-6 animate-fade-in-up">
          {isGeneratingReport ? (
            <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-12 text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined animate-spin text-4xl text-[#4F7DF3] mb-4">
                progress_activity
              </span>
              <h3 className="font-semibold text-base text-[#FAFAFA]">
                Compiling Mock Interview Report...
              </h3>
              <p className="text-xs text-[#71717A] mt-1 max-w-sm">
                The hiring committee is evaluating your technical depth, problem-solving reasoning, and communication clarity.
              </p>
            </div>
          ) : finalReport ? (
            <>
              {/* Executive Summary Card */}
              <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#27272A]">
                  <div className="flex items-start gap-4">
                    <ScoreRing score={finalReport.overallScore} size={80} label="OVERALL SCORE" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <VerdictBadge verdict={finalReport.verdict} />
                        <span className="text-xs text-[#71717A]">• {mode.toUpperCase()}</span>
                      </div>
                      <h2 className="font-headline-md text-xl md:text-2xl font-bold text-[#FAFAFA]">
                        {roleTitle} Interview Report
                      </h2>
                      <p className="text-xs text-[#71717A] mt-1">
                        Target: {companyName} • {turns.length} Questions Answered
                      </p>
                    </div>
                  </div>

                  {/* Retake / Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleResetSession}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#27272A] bg-[#111318] text-[#FAFAFA] hover:border-[#4F7DF3] text-xs font-semibold transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">replay</span>
                      <span>Practice Again</span>
                    </button>
                  </div>
                </div>

                {/* Dimension Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  {[
                    { label: 'Technical Knowledge', score: finalReport.technicalKnowledge, color: '#3b82f6' },
                    { label: 'Problem Solving', score: finalReport.problemSolving, color: '#8b5cf6' },
                    { label: 'Communication', score: finalReport.communication, color: '#22C55E' },
                    { label: 'Answer Quality', score: finalReport.answerQuality, color: '#F59E0B' },
                  ].map((dim) => (
                    <div key={dim.label} className="bg-[#111318] rounded-xl p-4 border border-[#27272A]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-[#A1A1AA]">{dim.label}</span>
                        <span className="text-xs font-bold text-[#FAFAFA]">{dim.score}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#09090B] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${dim.score}%`, backgroundColor: dim.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Detailed Feedback Paragraph */}
                {finalReport.interviewFeedback && (
                  <div className="mt-6 pt-6 border-t border-[#27272A]">
                    <h4 className="text-xs font-semibold text-[#FAFAFA] mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#4F7DF3] text-[16px]">
                        assessment
                      </span>
                      Committee Evaluation Summary
                    </h4>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed whitespace-pre-line">
                      {finalReport.interviewFeedback}
                    </p>
                  </div>
                )}
              </div>

              {/* Strengths & Improvements Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4 text-[#22C55E]">
                    <span className="material-symbols-outlined text-[18px]">thumb_up</span>
                    <h3 className="font-semibold text-sm text-[#FAFAFA]">Demonstrated Strengths</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {(finalReport.strengths || []).map((str, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-[#A1A1AA] leading-relaxed">
                        <span className="material-symbols-outlined text-xs text-[#22C55E] mt-0.5 shrink-0">
                          check_circle
                        </span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Areas to Improve */}
                <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4 text-amber-400">
                    <span className="material-symbols-outlined text-[18px]">trending_up</span>
                    <h3 className="font-semibold text-sm text-[#FAFAFA]">Areas to Refine</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {(finalReport.areasToImprove || []).map((area, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-[#A1A1AA] leading-relaxed">
                        <span className="material-symbols-outlined text-xs text-amber-400 mt-0.5 shrink-0">
                          arrow_forward
                        </span>
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Suggested Practice Topics */}
              {finalReport.suggestedNextPractice?.length > 0 && (
                <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6">
                  <h3 className="font-semibold text-sm text-[#FAFAFA] mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#4F7DF3] text-[18px]">
                      school
                    </span>
                    Recommended Practice Next
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {finalReport.suggestedNextPractice.map((topic, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-xl border border-[#27272A] bg-[#111318] text-xs text-[#A1A1AA]"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete Q&A Breakdown */}
              <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-8">
                <h3 className="font-semibold text-sm text-[#FAFAFA] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#4F7DF3] text-[18px]">
                    format_list_bulleted
                  </span>
                  Question-by-Question Detailed Review ({turns.length})
                </h3>

                <div className="space-y-4">
                  {turns.map((turn, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-[#27272A] bg-[#111318] p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-label-caps text-[10px] text-[#4F7DF3] font-bold">
                              QUESTION {i + 1}
                            </span>
                            <CategoryBadge category={turn.category} />
                          </div>
                          <p className="text-sm font-semibold text-[#FAFAFA] leading-snug">
                            {turn.question}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#4F7DF3]/15 text-[#4F7DF3] border border-[#4F7DF3]/30 shrink-0">
                          {turn.score}/100
                        </span>
                      </div>

                      <div className="bg-[#09090B] rounded-lg p-3 border border-[#27272A]">
                        <p className="font-label-caps text-[9px] text-[#71717A] tracking-wider mb-1">
                          YOUR ANSWER:
                        </p>
                        <p className="text-xs text-[#A1A1AA] leading-relaxed whitespace-pre-line">
                          {turn.userAnswer}
                        </p>
                      </div>

                      <div className="pt-1">
                        <p className="font-label-caps text-[9px] text-[#4F7DF3] tracking-wider mb-1">
                          INTERVIEWER FEEDBACK:
                        </p>
                        <p className="text-xs text-[#71717A] leading-relaxed">
                          {turn.conciseFeedback}
                        </p>
                      </div>

                      {turn.idealAnswerPoints?.length > 0 && (
                        <div className="bg-[#09090B]/60 rounded-lg p-3 border border-[#27272A]/70">
                          <p className="font-label-caps text-[9px] text-[#22C55E] tracking-wider mb-1">
                            IDEAL POINTS:
                          </p>
                          <ul className="list-disc list-inside space-y-0.5 text-xs text-[#71717A]">
                            {turn.idealAnswerPoints.map((pt, idx) => (
                              <li key={idx}>{pt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-xs text-red-400 mb-4">No report could be generated.</p>
              <button
                type="button"
                onClick={handleResetSession}
                className="px-4 py-2 rounded-xl bg-[#4F7DF3] text-white text-xs font-medium"
              >
                Back to Setup
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
