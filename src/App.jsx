import React, { useState, useEffect, useRef } from 'react';
import { agents } from './config/agents';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import UploadSection from './components/DebateSection';
import LandingPage from './components/LandingPage';
import StepIndicators from './components/RoundIndicators';
import LoadingSequence from './components/LoadingSequence';
import AnalysisSection from './components/ArgumentsSection';
import ResultSection from './components/VerdictSection';
import JobMatchSection from './components/JobMatchSection';
import HistorySection from './components/ArchivesSection';
import InterviewSection from './components/EvidenceSection';
import SettingsSection from './components/ChambersSection';
import DashboardSection from './components/DashboardSection';
import CareerNavigatorSection from './components/CareerNavigatorSection';
import MatchScoreboard from './components/Scoreboard';
import { analyzeWithAgent, generateHiringRecommendation, runDeepAtsScan, subscribeRateLimitRetry } from './services/hiringApi';
import { computeJobMatch, detectJobDomain } from './services/jobMatch';
import { initAudio, playAnalysisStart, playAgentComplete, playResultReveal } from './utils/audio';
import TypewriterText from './components/TypewriterText';
import { auth, onAuthStateChanged, signInWithPopup, googleProvider } from './services/firebase';
import {
  getStoredLastAnalysis,
  setStoredLastAnalysis,
  getStoredArchives,
  setStoredArchives,
  migrateLegacyDataIfNeeded,
  getStoredUserMotion,
} from './services/userStorage';

const delay = ms => new Promise(res => setTimeout(res, ms));

function BackgroundParticles() {
  const [reduceMotion, setReduceMotion] = React.useState(() => {
    return typeof document !== 'undefined' && document.documentElement.getAttribute('data-reduce-motion') === 'true';
  });

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setReduceMotion(document.documentElement.getAttribute('data-reduce-motion') === 'true');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-reduce-motion'] });
    return () => observer.disconnect();
  }, []);

  if (reduceMotion) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[0] overflow-hidden">
      <div className="absolute top-[20%] left-[10%] w-1.5 h-1.5 rounded-full bg-[#4F7DF3]/25 shadow-[0_0_12px_rgba(79,125,243,0.5)] animate-[float_10s_infinite_ease-in-out]"></div>
      <div className="absolute top-[60%] left-[80%] w-1 h-1 rounded-full bg-[#4F7DF3]/20 shadow-[0_0_8px_rgba(79,125,243,0.4)] animate-[float_15s_infinite_ease-in-out_2s]"></div>
      <div className="absolute top-[80%] left-[30%] w-2 h-2 rounded-full bg-[#4F7DF3]/15 shadow-[0_0_10px_rgba(79,125,243,0.3)] animate-[float_12s_infinite_ease-in-out_1s]"></div>
      <div className="absolute top-[30%] left-[60%] w-1 h-1 rounded-full bg-[#4F7DF3]/30 shadow-[0_0_6px_rgba(79,125,243,0.5)] animate-[float_14s_infinite_ease-in-out_4s]"></div>
      <div className="absolute top-[10%] left-[90%] w-1.5 h-1.5 rounded-full bg-[#4F7DF3]/20 shadow-[0_0_8px_rgba(79,125,243,0.4)] animate-[float_18s_infinite_ease-in-out_3s]"></div>
      <div className="absolute top-[70%] left-[15%] w-1 h-1 rounded-full bg-[#4F7DF3]/25 shadow-[0_0_6px_rgba(79,125,243,0.5)] animate-[float_11s_infinite_ease-in-out_5s]"></div>
    </div>
  );
}

// Full CareerLens agent pipeline: ATS → Recruiter → Engineer → Hiring Manager
// → Optimizer → Final Job Match Report (computed deterministically afterwards).
const AGENT_ORDER = ['ats', 'recruiter', 'engineer', 'manager', 'optimizer'];

const TRANSITION_LABELS = {
  ats: '🤖 ATS ANALYSIS — SCANNING REQUIREMENTS & DOMAIN',
  recruiter: '📋 CANDIDATE SCREENING — EVALUATING RELEVANCE',
  engineer: '⚙️ DOMAIN SPECIALIST — ANALYZING DEPTH & RIGOR',
  manager: '🎯 HIRING MANAGER — MAKING DECISION',
  optimizer: '✨ RESUME OPTIMIZER — IMPROVING CONTENT',
};

export default function App() {
  const [analysisState, setAnalysisState] = useState({
    resumeText: '',
    jobDescription: '',
    companyMode: 'general',
    agentResults: {},
    recommendation: null,
    deepScanResult: null,
    status: 'idle', // idle | analyzing | complete | error
    activeAgent: null,
    completedAgents: [],
  });

  const [errorMsg, setErrorMsg] = useState('');
  // Shown while the Groq API is backing off and retrying a 429, so the
  // analysis UI never looks frozen during a rate-limit window.
  const [rateLimitNotice, setRateLimitNotice] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [hasPreviousAnalysis, setHasPreviousAnalysis] = useState(false);

  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [selectedMockSession, setSelectedMockSession] = useState(null);
  const [selectedNavigatorResume, setSelectedNavigatorResume] = useState(null);
  const [user, setUser] = useState(null);
  const [currentRoute, setCurrentRoute] = useState('landing');
  const resultRef = useRef(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      // Reset in-memory analysis and sub-view states on any user switch / logout
      setAnalysisState({
        resumeText: '',
        jobDescription: '',
        companyMode: 'general',
        agentResults: {},
        recommendation: null,
        deepScanResult: null,
        status: 'idle',
        activeAgent: null,
        completedAgents: [],
      });
      setSelectedMockSession(null);
      setSelectedNavigatorResume(null);
      setErrorMsg('');
      setRateLimitNotice('');

      if (currentUser) {
        // Safe one-time legacy data migration for initial user
        migrateLegacyDataIfNeeded(currentUser.uid);
        const saved = getStoredLastAnalysis(currentUser.uid);
        setHasPreviousAnalysis(Boolean(saved));
        const isMotionReduced = getStoredUserMotion(currentUser.uid);
        if (isMotionReduced) {
          document.documentElement.setAttribute('data-reduce-motion', 'true');
        } else {
          document.documentElement.removeAttribute('data-reduce-motion');
        }
      } else {
        setHasPreviousAnalysis(false);
        setCurrentRoute('landing');
        const isMotionReduced = getStoredUserMotion('anonymous');
        if (isMotionReduced) {
          document.documentElement.setAttribute('data-reduce-motion', 'true');
        } else {
          document.documentElement.removeAttribute('data-reduce-motion');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('careerlens_theme') || localStorage.getItem('hireflow_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const isMotionReduced = getStoredUserMotion(auth?.currentUser?.uid);
    if (isMotionReduced) {
      document.documentElement.setAttribute('data-reduce-motion', 'true');
    } else {
      document.documentElement.removeAttribute('data-reduce-motion');
    }
  }, []);

  const loadPreviousAnalysis = () => {
    try {
      const saved = getStoredLastAnalysis(user?.uid);
      if (saved) {
        setAnalysisState(saved);
        setHasPreviousAnalysis(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartAnalysis = async (resumeText, jobDescription, companyMode) => {
    if (auth && !user) {
      const confirmLogin = window.confirm("Sign in with Google to save your analyses. Log in now?");
      if (confirmLogin) {
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (error) {
          console.error("Login failed", error);
          // Allow proceeding without login
        }
      }
      // Allow proceeding without login
    }

    if (!resumeText || resumeText.trim().length < 20) {
      setErrorMsg("Please upload a resume or paste resume content (minimum 20 characters).");
      return;
    }
    if (!jobDescription || jobDescription.trim().length < 30) {
      setErrorMsg("Please paste a job description (minimum 30 characters).");
      return;
    }

    setErrorMsg('');
    setRateLimitNotice('');
    setHasPreviousAnalysis(false);
    initAudio();
    playAnalysisStart();

    setAnalysisState({
      resumeText,
      jobDescription,
      companyMode,
      agentResults: {},
      recommendation: null,
      deepScanResult: null,
      status: 'initializing',
      activeAgent: null,
      completedAgents: [],
    });
  };

  const handleSequenceComplete = async () => {
    setAnalysisState(prev => ({ ...prev, status: 'analyzing' }));
    // Surface Groq 429 retries live: callGroq notifies this listener each time
    // it backs off, and we render the notice instead of appearing frozen.
    const unsubscribeRateLimit = subscribeRateLimitRetry(setRateLimitNotice);
    try {
      await runAnalysisEngine(analysisState.resumeText, analysisState.jobDescription, analysisState.companyMode);
      setRateLimitNotice('');
    } catch (error) {
      setRateLimitNotice('');
      console.error(error);
      const errorMsgText = error.message || '';
      const isRateLimit = errorMsgText.includes('RATE_LIMIT_EXCEEDED') || errorMsgText.includes('429');
      const isDailyLimit = isRateLimit && (errorMsgText.includes('TPD') || errorMsgText.includes('RPD') || errorMsgText.includes('per day') || errorMsgText.includes('daily'));

      if (isDailyLimit) {
        setErrorMsg("Daily AI request limit reached. Please wait a while or try again later.");
        setAnalysisState(prev => ({ ...prev, status: 'error' }));
      } else if (isRateLimit) {
        // All bounded retries were exhausted while Groq stayed rate limited.
        setErrorMsg("AI service stayed rate limited after several automatic retries. Wait about a minute, then press Try Again.");
        setAnalysisState(prev => ({ ...prev, status: 'error' }));
      } else {
        setErrorMsg("Analysis error. Please try again. (" + errorMsgText + ")");
        setAnalysisState(prev => ({ ...prev, status: 'error' }));
      }
    } finally {
      unsubscribeRateLimit();
    }
  };

  // Re-runs the last analysis after a failure (e.g. an exhausted rate limit)
  // without making the user re-upload the resume.
  const handleRetryAnalysis = async () => {
    const { resumeText, jobDescription, companyMode } = analysisState;
    if (!resumeText || !jobDescription) {
      handleNewAnalysis();
      return;
    }
    await handleStartAnalysis(resumeText, jobDescription, companyMode);
  };

  const runAnalysisEngine = async (resumeText, jobDescription, companyMode) => {
    // Current analysis isolation: initialize fresh domain context strictly from current inputs
    const freshDomainInfo = detectJobDomain(jobDescription, resumeText);
    let accumulatedResults = {
      ats: {
        detectedDomain: freshDomainInfo.domain,
        detectedRole: freshDomainInfo.role,
      }
    };
    let completedAgents = [];
    // Records per-agent failures (reported, never silently swallowed). A failed
    // agent does not stop the pipeline: successful agents are preserved and the
    // final match report degrades deterministically (see services/jobMatch.js).
    const agentErrors = {};

    for (const agentId of AGENT_ORDER) {
      await delay(50);

      // Mark agent as active (thinking)
      setAnalysisState(prev => ({
        ...prev,
        activeAgent: agentId,
        completedAgents,
      }));

      try {
        // Call the agent API with accumulated results context (for domain & role awareness)
        const result = await analyzeWithAgent(agentId, resumeText, jobDescription, companyMode, accumulatedResults);
        accumulatedResults = { ...accumulatedResults, [agentId]: result };
      } catch (err) {
        console.error(`Agent "${agentId}" failed:`, err);
        agentErrors[agentId] = (err && err.message) || 'Agent analysis failed';
      }
      completedAgents = [...completedAgents, agentId];

      // Update state with result. We keep activeAgent null briefly to let the UI settle.
      setAnalysisState(prev => ({
        ...prev,
        agentResults: accumulatedResults,
        activeAgent: null,
        completedAgents,
      }));

      playAgentComplete();

      // Wait 1.2 seconds between agents to allow the typewriter effect to progress 
      // and prevent visual flickering or feeling like it's happening all at once.
      await delay(1200);
    }

    // ── Final Job Match Report (deterministic, no extra API call) ──────────
    let jobMatch = null;
    try {
      jobMatch = computeJobMatch({
        resumeText,
        jobDescription,
        agentResults: accumulatedResults,
      });
    } catch (err) {
      console.error('Failed to compute job match report:', err);
    }

    setAnalysisState(prev => ({ ...prev, activeAgent: 'recommendation' }));

    const recommendation = await generateHiringRecommendation(
      resumeText,
      jobDescription,
      accumulatedResults,
      companyMode,
      jobMatch
    );
    
    // Deep ATS scan is now optional and triggered manually to save tokens.
    const deepScanResult = null;

    const finalState = {
      id: Math.random().toString(36).substring(2, 8).toUpperCase(),
      date: new Date().toISOString(),
      topic: jobMatch?.targetRole ? `${jobMatch.targetRole} (${jobMatch.targetDomain || 'Role'})` : jobDescription.substring(0, 100),
      resumeText,
      jobDescription,
      companyMode,
      agentResults: accumulatedResults,
      jobMatch,
      agentErrors,
      recommendation,
      deepScanResult,
      status: 'complete',
      activeAgent: null,
      completedAgents: AGENT_ORDER,
    };

    setAnalysisState(finalState);
    playResultReveal();

    // Persist to user-scoped storage
    setStoredLastAnalysis(finalState, user?.uid);
    try {
      const existingArchives = getStoredArchives(user?.uid);
      existingArchives.push(finalState);
      setStoredArchives(existingArchives, user?.uid);
    } catch (e) {
      console.error("Failed to save to history", e);
    }

    // Removed automatic scroll so user can see agent results above.
  };

  const handleRunDeepScan = async () => {
    try {
      const context = {
        role: analysisState?.jobMatch?.targetRole || analysisState?.agentResults?.ats?.detectedRole,
        domain: analysisState?.jobMatch?.targetDomain || analysisState?.agentResults?.ats?.detectedDomain,
      };
      const result = await runDeepAtsScan(analysisState.resumeText, analysisState.jobDescription, context);
      const newState = { ...analysisState, deepScanResult: result };
      setAnalysisState(newState);
      
      // Update persistent storage
      setStoredLastAnalysis(newState, user?.uid);
      try {
        const archives = getStoredArchives(user?.uid);
        const updatedArchives = archives.map(a => 
          a.id === newState.id ? newState : a
        );
        setStoredArchives(updatedArchives, user?.uid);
      } catch (err) {
        console.error("Failed to update archives with deep scan", err);
      }
      return true;
    } catch (err) {
      console.error(err);
      if (err.message.includes('RATE_LIMIT_EXCEEDED') || err.message.includes('429')) {
        setErrorMsg("Rate limit reached. Please wait a moment before running a deep scan.");
      } else {
        setErrorMsg("Deep scan failed. Please try again. (" + err.message + ")");
      }
      return false;
    }
  };

  const handleNewAnalysis = () => {
    setAnalysisState({
      resumeText: '',
      jobDescription: '',
      companyMode: 'general',
      agentResults: {},
      recommendation: null,
      status: 'idle',
      activeAgent: null,
      completedAgents: [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── History 2.0 Result Restorers (Zero API calls, purely local) ─────────
  const handleLoadAnalysis = (analysisRecord) => {
    if (analysisRecord) {
      setAnalysisState(analysisRecord);
      setActiveTab('DOCKET');
      setHasPreviousAnalysis(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLoadMockInterview = (sessionRecord) => {
    if (sessionRecord) {
      setSelectedMockSession(sessionRecord);
      setActiveTab('EVIDENCE');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLoadNavigator = (resumeRecord) => {
    if (resumeRecord) {
      setSelectedNavigatorResume(resumeRecord);
      setActiveTab('NAVIGATOR');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const agentScores = {
    ats: analysisState.agentResults?.ats?.score,
    recruiter: analysisState.agentResults?.recruiter?.score,
    engineer: analysisState.agentResults?.engineer?.score,
    manager: analysisState.agentResults?.manager?.score,
  };
  const overallScore = (() => {
    const scores = Object.values(agentScores).filter(s => s != null);
    return scores.length > 0 ? Math.round(scores.reduce((a, s) => a + s, 0) / scores.length) : 0;
  })();

  if (currentRoute === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => setCurrentRoute('app')}
        onSignIn={async () => {
          if (!auth) {
            alert("Firebase Auth is not configured. Please add credentials to .env");
            return;
          }
          try {
            await signInWithPopup(auth, googleProvider);
            setCurrentRoute('app');
          } catch (error) {
            console.error("Login failed", error);
          }
        }}
      />
    );
  }

  return (
    <div className="text-on-background selection:bg-primary/30 selection:text-primary min-h-screen relative" data-page="app">
      <BackgroundParticles />
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <Sidebar key={user?.uid || 'anonymous'} activeTab={activeTab} setActiveTab={setActiveTab} />

      {toastVisible && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-[#171A20] border border-[#4F7DF3]/40 text-[#4F7DF3] px-6 py-3 rounded-xl shadow-lg z-50 animate-fade-in-up text-sm font-label-caps tracking-wider">
          Copied to clipboard! 📋
        </div>
      )}

      <main className="lg:ml-64 pt-24 pb-32 px-4 md:px-10 max-w-7xl mx-auto">
        {/* Previous analysis banner */}
        {hasPreviousAnalysis && analysisState.status === 'idle' && (
          <div className="w-full mx-auto mb-5 bg-[#171A20] border border-[#2D2F36] px-5 py-3 rounded-xl animate-fade-in-up flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#4F7DF3] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
              <span className="text-[13px] text-[#8B8F98]">You have a previous analysis on record.</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={loadPreviousAnalysis} className="text-[#4F7DF3] text-[12px] font-semibold hover:underline">View it?</button>
              <button onClick={() => setHasPreviousAnalysis(false)} className="text-[#6B7080] hover:text-[#8B8F98] material-symbols-outlined text-[16px]">close</button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="w-full mx-auto mb-5 bg-red-500/10 border border-red-500/25 text-red-400 px-5 py-3 rounded-xl flex items-center justify-between">
            <p className="text-[13px]">{errorMsg}</p>
            <div className="flex items-center gap-2 shrink-0">
              {analysisState.status === 'error' && analysisState.resumeText && (
                <button
                  onClick={handleRetryAnalysis}
                  className="text-[12px] font-semibold text-red-400 border border-red-500/40 rounded-lg px-3 py-1.5 hover:bg-red-500/10 transition-colors"
                >
                  ↻ Try Again
                </button>
              )}
              <button onClick={() => setErrorMsg('')} className="material-symbols-outlined text-red-400/60 hover:text-red-400 ml-1 text-[18px]">close</button>
            </div>
          </div>
        )}

        {/* Transient rate-limit retry notice — shown while callGroq backs off */}
        {analysisState.status === 'analyzing' && rateLimitNotice && (
          <div className="w-full mx-auto mb-5 bg-amber-400/10 border border-amber-400/30 text-amber-300 px-5 py-3 rounded-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-300 text-[18px]">hourglass_top</span>
            <p className="text-[13px]">{rateLimitNotice}</p>
          </div>
        )}

        {/* DOCKET: Main analysis tab */}
        {activeTab === 'DOCKET' && (
          <>
            {/* Loading Sequence */}
            {analysisState.status === 'initializing' && (
              <LoadingSequence onComplete={handleSequenceComplete} />
            )}

            {/* Upload section — show only when idle */}
            {analysisState.status === 'idle' && (
              <UploadSection
                key={user?.uid || 'anonymous'}
                onStartAnalysis={handleStartAnalysis}
                isAnalyzing={false}
              />
            )}

            {/* Step progress indicator */}
            {(analysisState.status === 'analyzing' || analysisState.status === 'complete') && (
              <StepIndicators
                completedAgents={analysisState.completedAgents || []}
                activeAgent={analysisState.activeAgent}
                isComplete={analysisState.status === 'complete'}
              />
            )}

            {/* Scoreboard during analysis */}
            {(analysisState.status === 'analyzing' || analysisState.status === 'complete') && (
              <MatchScoreboard
                atsScore={agentScores.ats}
                recruiterScore={agentScores.recruiter}
                engineerScore={agentScores.engineer}
                managerScore={agentScores.manager}
              />
            )}

            {/* Agent analysis cards */}
            {(analysisState.status === 'analyzing' || analysisState.status === 'complete') && (
              <AnalysisSection
                agents={agents}
                agentResults={analysisState.agentResults}
                activeAgent={analysisState.activeAgent}
                overallScore={overallScore}
                domainContext={
                  analysisState.jobMatch?.targetDomain
                    ? { domain: analysisState.jobMatch.targetDomain, role: analysisState.jobMatch.targetRole }
                    : analysisState.agentResults?.ats?.detectedDomain
                    ? { domain: analysisState.agentResults.ats.detectedDomain, role: analysisState.agentResults.ats.detectedRole }
                    : detectJobDomain(analysisState.jobDescription, analysisState.resumeText)
                }
              />
            )}

            {/* Final "deliberating" overlay removed based on user feedback */}

            {/* Result section */}
            {analysisState.status === 'complete' && analysisState.recommendation && (
              <div ref={resultRef}>
                {analysisState.jobMatch && (
                  <JobMatchSection jobMatch={analysisState.jobMatch} />
                )}
                <ResultSection
                  recommendation={analysisState.recommendation}
                  agentResults={analysisState.agentResults}
                  deepScanResult={analysisState.deepScanResult}
                  resumeText={analysisState.resumeText}
                  jobDescription={analysisState.jobDescription}
                  companyMode={analysisState.companyMode}
                  analysisId={analysisState.id}
                  onNew={handleNewAnalysis}
                  onRunDeepScan={handleRunDeepScan}
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'DASHBOARD' && (
          <DashboardSection
            key={user?.uid || 'anonymous'}
            onNavigate={setActiveTab}
            onNavigateToAnalyze={() => setActiveTab('DOCKET')}
          />
        )}
        {activeTab === 'NAVIGATOR' && (
          <CareerNavigatorSection
            key={`${user?.uid || 'anonymous'}_${selectedNavigatorResume?.name || 'default'}`}
            initialResume={selectedNavigatorResume}
            onNavigateToAnalyze={() => setActiveTab('DOCKET')}
          />
        )}
        {activeTab === 'ARCHIVES' && (
          <HistorySection
            key={user?.uid || 'anonymous'}
            onLoadAnalysis={handleLoadAnalysis}
            onLoadMockInterview={handleLoadMockInterview}
            onLoadNavigator={handleLoadNavigator}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === 'EVIDENCE' && (
          <InterviewSection
            key={`${user?.uid || 'anonymous'}_${selectedMockSession?.sessionId || 'default'}`}
            initialSession={selectedMockSession}
          />
        )}

        {activeTab === 'CHAMBERS' && <SettingsSection key={user?.uid || 'anonymous'} />}
      </main>

      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
