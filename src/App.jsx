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
import HistorySection from './components/ArchivesSection';
import InterviewSection from './components/EvidenceSection';
import SettingsSection from './components/ChambersSection';
import DashboardSection from './components/DashboardSection';
import MatchScoreboard from './components/Scoreboard';
import SubscriptionSection from './components/SubscriptionSection';
import { analyzeWithAgent, generateHiringRecommendation, runDeepAtsScan } from './services/hiringApi';
import { initAudio } from './utils/audio';
import TypewriterText from './components/TypewriterText';
import { auth, onAuthStateChanged, signInWithPopup, googleProvider } from './services/firebase';

const delay = ms => new Promise(res => setTimeout(res, ms));

function BackgroundParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[0] overflow-hidden">
      <div className="absolute top-[20%] left-[10%] w-1.5 h-1.5 rounded-full bg-[#5B8CFF]/25 shadow-[0_0_12px_rgba(91,140,255,0.5)] animate-[float_10s_infinite_ease-in-out]"></div>
      <div className="absolute top-[60%] left-[80%] w-1 h-1 rounded-full bg-[#5B8CFF]/20 shadow-[0_0_8px_rgba(91,140,255,0.4)] animate-[float_15s_infinite_ease-in-out_2s]"></div>
      <div className="absolute top-[80%] left-[30%] w-2 h-2 rounded-full bg-[#5B8CFF]/15 shadow-[0_0_10px_rgba(91,140,255,0.3)] animate-[float_12s_infinite_ease-in-out_1s]"></div>
      <div className="absolute top-[30%] left-[60%] w-1 h-1 rounded-full bg-[#5B8CFF]/30 shadow-[0_0_6px_rgba(91,140,255,0.5)] animate-[float_14s_infinite_ease-in-out_4s]"></div>
      <div className="absolute top-[10%] left-[90%] w-1.5 h-1.5 rounded-full bg-[#5B8CFF]/20 shadow-[0_0_8px_rgba(91,140,255,0.4)] animate-[float_18s_infinite_ease-in-out_3s]"></div>
      <div className="absolute top-[70%] left-[15%] w-1 h-1 rounded-full bg-[#5B8CFF]/25 shadow-[0_0_6px_rgba(91,140,255,0.5)] animate-[float_11s_infinite_ease-in-out_5s]"></div>
    </div>
  );
}

const AGENT_ORDER = ['ats', 'manager', 'optimizer'];

const TRANSITION_LABELS = {
  ats: '🤖 ATS ANALYSIS — SCANNING KEYWORDS',
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
  const [toastVisible, setToastVisible] = useState(false);
  const [hasPreviousAnalysis, setHasPreviousAnalysis] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [user, setUser] = useState(null);
  const [currentRoute, setCurrentRoute] = useState('landing');
  const resultRef = useRef(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('hireflow_last_analysis');
    if (saved) setHasPreviousAnalysis(true);

    const savedTheme = localStorage.getItem('hireflow_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const loadPreviousAnalysis = () => {
    try {
      const saved = localStorage.getItem('hireflow_last_analysis');
      if (saved) {
        setAnalysisState(JSON.parse(saved));
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
          setErrorMsg("Login failed: " + error.message);
          return;
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
    setHasPreviousAnalysis(false);
    initAudio();

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
    try {
      await runAnalysisEngine(analysisState.resumeText, analysisState.jobDescription, analysisState.companyMode);
    } catch (error) {
      console.error(error);
      const errorMsgText = error.message || '';
      const isRateLimit = errorMsgText.includes('RATE_LIMIT_EXCEEDED') || errorMsgText.includes('429');
      const isDailyLimit = isRateLimit && (errorMsgText.includes('TPD') || errorMsgText.includes('RPD') || errorMsgText.includes('per day') || errorMsgText.includes('daily'));

      if (isDailyLimit) {
        setAnalysisState(prev => ({ ...prev, status: 'idle' }));
        setActiveTab('SUBSCRIPTION');
      } else if (isRateLimit) {
        setErrorMsg("Service is busy (Rate limit). Please wait a few seconds and try again.");
        setAnalysisState(prev => ({ ...prev, status: 'error' }));
      } else {
        setErrorMsg("Analysis error. Please try again. (" + errorMsgText + ")");
        setAnalysisState(prev => ({ ...prev, status: 'error' }));
      }
    }
  };

  const runAnalysisEngine = async (resumeText, jobDescription, companyMode) => {
    let accumulatedResults = {};
    let completedAgents = [];

    for (const agentId of AGENT_ORDER) {
      await delay(50);

      // Mark agent as active (thinking)
      setAnalysisState(prev => ({
        ...prev,
        activeAgent: agentId,
        completedAgents,
      }));

      // Call the agent API
      const result = await analyzeWithAgent(agentId, resumeText, jobDescription, companyMode);
      accumulatedResults = { ...accumulatedResults, [agentId]: result };
      completedAgents = [...completedAgents, agentId];

      // Update state with result. We keep activeAgent null briefly to let the UI settle.
      setAnalysisState(prev => ({
        ...prev,
        agentResults: accumulatedResults,
        activeAgent: null,
        completedAgents,
      }));

      // Wait 1.2 seconds between agents to allow the typewriter effect to progress 
      // and prevent visual flickering or feeling like it's happening all at once.
      await delay(1200);
    }

    setAnalysisState(prev => ({ ...prev, activeAgent: 'recommendation' }));

    const recommendation = await generateHiringRecommendation(
      resumeText,
      jobDescription,
      accumulatedResults,
      companyMode
    );
    
    // Deep ATS scan is now optional and triggered manually to save tokens.
    const deepScanResult = null;

    const finalState = {
      id: Math.random().toString(36).substring(2, 8).toUpperCase(),
      date: new Date().toISOString(),
      topic: jobDescription.substring(0, 100),
      resumeText,
      jobDescription,
      companyMode,
      agentResults: accumulatedResults,
      recommendation,
      deepScanResult,
      status: 'complete',
      activeAgent: null,
      completedAgents: AGENT_ORDER,
    };

    setAnalysisState(finalState);

    // Persist to localStorage
    localStorage.setItem('hireflow_last_analysis', JSON.stringify(finalState));
    try {
      const existingArchives = JSON.parse(localStorage.getItem('courtroom_archives') || '[]');
      existingArchives.push(finalState);
      localStorage.setItem('courtroom_archives', JSON.stringify(existingArchives));
    } catch (e) {
      console.error("Failed to save to history", e);
    }

    // Removed automatic scroll so user can see agent results above.
  };

  const handleRunDeepScan = async () => {
    try {
      const result = await runDeepAtsScan(analysisState.resumeText, analysisState.jobDescription);
      const newState = { ...analysisState, deepScanResult: result };
      setAnalysisState(newState);
      
      // Update persistent storage
      localStorage.setItem('hireflow_last_analysis', JSON.stringify(newState));
      try {
        const archives = JSON.parse(localStorage.getItem('courtroom_archives') || '[]');
        const updatedArchives = archives.map(a => 
          a.id === newState.id ? newState : a
        );
        localStorage.setItem('courtroom_archives', JSON.stringify(updatedArchives));
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

  const handleShareAnalysis = () => {
    const text = `HireFlow AI Analysis\nMatch Score: ${analysisState.recommendation?.overallMatch ?? 0}%\nRecommendation: ${analysisState.recommendation?.recommendation ?? ''}\n\n${analysisState.recommendation?.hiringInsight ?? ''}`;
    navigator.clipboard.writeText(text);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
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

  const isAnalyzing = analysisState.status === 'analyzing';
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
    return <LandingPage onGetStarted={() => setCurrentRoute('app')} />;
  }

  return (
    <div className="text-on-background selection:bg-primary/30 selection:text-primary min-h-screen relative">
      <BackgroundParticles />
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {toastVisible && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-[#171A20] border border-[#5B8CFF]/40 text-[#5B8CFF] px-6 py-3 rounded-xl shadow-lg z-50 animate-fade-in-up text-sm font-label-caps tracking-wider">
          Copied to clipboard! 📋
        </div>
      )}

      <main className="lg:ml-64 pt-24 pb-32 px-4 md:px-10 max-w-7xl mx-auto">
        {/* Previous analysis banner */}
        {hasPreviousAnalysis && analysisState.status === 'idle' && (
          <div className="w-full max-w-[900px] mx-auto mb-6 bg-[#171A20] border border-[#2D2F36] px-6 py-3 rounded-xl shadow-lg animate-fade-in-up flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#5B8CFF] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
              <span className="text-sm text-[#A1A1AA]">You have a previous analysis on record.</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={loadPreviousAnalysis} className="text-[#5B8CFF] text-sm font-label-caps hover:brightness-110 underline">View it?</button>
              <button onClick={() => setHasPreviousAnalysis(false)} className="text-[#71717A] hover:text-[#A1A1AA] material-symbols-outlined text-sm">close</button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="w-full md:w-3/4 mx-auto mb-6 bg-red-900/20 border border-primary text-primary px-6 py-4 rounded-xl flex items-center justify-between">
            <p>{errorMsg}</p>
            <button onClick={() => setErrorMsg('')} className="material-symbols-outlined text-primary/50 hover:text-primary ml-4">close</button>
          </div>
        )}

        {/* Transition overlay */}
        {transitionMessage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in-up">
            <div className="text-center px-8">
              <h2 className="text-2xl md:text-4xl font-headline-md text-[#5B8CFF] tracking-[0.1em] uppercase text-center">
                <TypewriterText text={transitionMessage} speed={25} />
              </h2>
              <div className="mt-4 h-px w-48 mx-auto bg-gradient-to-r from-transparent via-[#5B8CFF]/40 to-transparent"></div>
            </div>
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
              />
            )}

            {/* Final "deliberating" overlay removed based on user feedback */}

            {/* Result section */}
            {analysisState.status === 'complete' && analysisState.recommendation && (
              <div ref={resultRef}>
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

        {activeTab === 'DASHBOARD' && <DashboardSection onNavigateToAnalyze={() => setActiveTab('DOCKET')} />}
        {activeTab === 'ARCHIVES' && <HistorySection />}
        {activeTab === 'EVIDENCE' && <InterviewSection />}

        {activeTab === 'SUBSCRIPTION' && <SubscriptionSection />}

        {activeTab === 'CHAMBERS' && <SettingsSection />}
      </main>

      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
