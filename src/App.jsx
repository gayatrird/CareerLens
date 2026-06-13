import React, { useState, useEffect, useRef } from 'react';
import { personas } from './config/personas';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import DebateSection from './components/DebateSection';
import RoundIndicators from './components/RoundIndicators';
import ArgumentsSection from './components/ArgumentsSection';
import VerdictSection from './components/VerdictSection';
import ArchivesSection from './components/ArchivesSection';
import EvidenceSection from './components/EvidenceSection';
import ChambersSection from './components/ChambersSection';
import { generateArgument, generateVerdict } from './services/claudeApi';
import { initAudio } from './utils/audio';
import TypewriterText from './components/TypewriterText';
import { auth, onAuthStateChanged, signInWithPopup, googleProvider } from './services/firebase';

const delay = ms => new Promise(res => setTimeout(res, ms));

function BackgroundParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[0] overflow-hidden">
      <div className="absolute top-[20%] left-[10%] w-2 h-2 rounded-full bg-[#c9a84c]/40 shadow-[0_0_10px_rgba(201,168,76,0.8)] animate-[float_10s_infinite_ease-in-out]"></div>
      <div className="absolute top-[60%] left-[80%] w-1.5 h-1.5 rounded-full bg-[#c9a84c]/30 shadow-[0_0_8px_rgba(201,168,76,0.6)] animate-[float_15s_infinite_ease-in-out_2s]"></div>
      <div className="absolute top-[80%] left-[30%] w-2.5 h-2.5 rounded-full bg-[#c9a84c]/20 shadow-[0_0_12px_rgba(201,168,76,0.5)] animate-[float_12s_infinite_ease-in-out_1s]"></div>
      <div className="absolute top-[30%] left-[60%] w-1 h-1 rounded-full bg-[#c9a84c]/50 shadow-[0_0_6px_rgba(201,168,76,0.9)] animate-[float_14s_infinite_ease-in-out_4s]"></div>
      <div className="absolute top-[10%] left-[90%] w-2 h-2 rounded-full bg-[#c9a84c]/30 shadow-[0_0_10px_rgba(201,168,76,0.7)] animate-[float_18s_infinite_ease-in-out_3s]"></div>
      <div className="absolute top-[70%] left-[15%] w-1.5 h-1.5 rounded-full bg-[#c9a84c]/40 shadow-[0_0_8px_rgba(201,168,76,0.8)] animate-[float_11s_infinite_ease-in-out_5s]"></div>
    </div>
  );
}

export default function App() {
  const [debateState, setDebateState] = useState({
    topic: "",
    leftPersonaId: "elon",
    rightPersonaId: "buffett",
    rounds: [],
    verdict: null,
    status: "idle", // idle | running | complete | error
    activeAgent: null, // 'advocate' | 'opposer' | 'judge'
    leftScoreTotal: 0,
    leftScoreCount: 0,
    rightScoreTotal: 0,
    rightScoreCount: 0
  });
  
  const [errorMsg, setErrorMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [hasPreviousDebate, setHasPreviousDebate] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState(null);
  const [activeTab, setActiveTab] = useState("DOCKET");
  const [user, setUser] = useState(null);
  
  const verdictRef = useRef(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('courtroom_last_debate');
    if (saved) {
      setHasPreviousDebate(true);
    }
  }, []);

  const loadPreviousDebate = () => {
    try {
      const saved = localStorage.getItem('courtroom_last_debate');
      if (saved) {
        setDebateState(JSON.parse(saved));
        setHasPreviousDebate(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartDebate = async (topic, leftId, rightId) => {
    if (auth && !user) {
      const confirmLogin = window.confirm("You must be logged in to start a debate. Log in now with Google?");
      if (confirmLogin) {
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (error) {
          console.error("Login failed", error);
          setErrorMsg("Login failed: " + error.message);
          return;
        }
      } else {
        return;
      }
    }

    if (topic.length < 10) {
      setErrorMsg("Please provide more detail about your decision (min 10 characters).");
      return;
    }
    
    setErrorMsg("");
    setHasPreviousDebate(false);
    initAudio();
    
    setDebateState({
      topic,
      leftPersonaId: leftId,
      rightPersonaId: rightId,
      rounds: [],
      verdict: null,
      status: "running",
      activeAgent: null,
      leftScoreTotal: 0,
      leftScoreCount: 0,
      rightScoreTotal: 0,
      rightScoreCount: 0
    });

    try {
      await runDebateEngine(topic, leftId, rightId);
    } catch (error) {
      console.error(error);
      setErrorMsg("The court is in recess. Please try again. (" + error.message + ")");
      setDebateState(prev => ({ ...prev, status: "error" }));
    }
  };

  const runDebateEngine = async (topic, leftId, rightId) => {
    let currentRounds = [];
    let lastOpposingArgument = "";
    
    const leftPersona = personas.find(p => p.id === leftId);
    const rightPersona = personas.find(p => p.id === rightId);

    // Run 3 Rounds
    for (let round = 1; round <= 3; round++) {
      if (round > 1) {
        setTransitionMessage(round === 3 ? "⚔️ ROUND 3 — FINAL ARGUMENTS" : "⚔️ ROUND 2 BEGINS");
        await delay(1500);
        setTransitionMessage(null);
      }

      currentRounds.push({ round, advocate: "", opposer: "" });
      
      // Update state to show Advocate is thinking
      setDebateState(prev => ({ ...prev, rounds: [...currentRounds], activeAgent: 'advocate' }));
      
      // Advocate Call
      const advocateResponse = await generateArgument('advocate', leftPersona, rightPersona, topic, round, currentRounds, lastOpposingArgument);
      currentRounds[round - 1].advocate = advocateResponse;
      lastOpposingArgument = advocateResponse;
      
      // Update state to show Opposer is thinking
      setDebateState(prev => ({ ...prev, rounds: [...currentRounds], activeAgent: 'opposer' }));
      
      // Dramatic Pause
      await delay(300);

      // Opposer Call
      const opposerResponse = await generateArgument('opposer', leftPersona, rightPersona, topic, round, currentRounds, lastOpposingArgument);
      currentRounds[round - 1].opposer = opposerResponse;
      lastOpposingArgument = opposerResponse;

      // Update state after round completes
      setDebateState(prev => ({ ...prev, rounds: [...currentRounds] }));
      
      if (round < 3) {
        await delay(500);
      }
    }

    // Judge Call
    await delay(800);
    setDebateState(prev => ({ ...prev, activeAgent: 'judge' }));
    const verdict = await generateVerdict(`${leftPersona.name} vs ${rightPersona.name}`, topic, currentRounds);
    
    // Finalize
    const finalState = {
      id: Math.random().toString(36).substring(2, 8).toUpperCase(),
      date: new Date().toISOString(),
      topic,
      mode: `${leftPersona.name} vs ${rightPersona.name}`,
      leftPersonaId: leftId,
      rightPersonaId: rightId,
      rounds: currentRounds,
      verdict,
      status: "complete",
      activeAgent: null
    };
    
    setDebateState(finalState);
    localStorage.setItem('courtroom_last_debate', JSON.stringify(finalState));
    
    try {
      const existingArchives = JSON.parse(localStorage.getItem('courtroom_archives') || '[]');
      existingArchives.push(finalState);
      localStorage.setItem('courtroom_archives', JSON.stringify(existingArchives));
    } catch (e) {
      console.error("Failed to save to archives", e);
    }
    
    setTimeout(() => {
      if (verdictRef.current) {
        verdictRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 500);
  };

  const handleArgumentScored = (agent, scores) => {
    const avg = Math.round((scores.logic + scores.evidence + scores.impact) / 3);
    setDebateState(prev => {
      if (agent === 'advocate') {
        const newTotal = (prev.leftScoreTotal || 0) + avg;
        const newCount = (prev.leftScoreCount || 0) + 1;
        return { ...prev, leftScoreTotal: newTotal, leftScoreCount: newCount };
      } else {
        const newTotal = (prev.rightScoreTotal || 0) + avg;
        const newCount = (prev.rightScoreCount || 0) + 1;
        return { ...prev, rightScoreTotal: newTotal, rightScoreCount: newCount };
      }
    });
  };

  const handleShareDebate = () => {
    const leftPersona = personas.find(p => p.id === debateState.leftPersonaId);
    const rightPersona = personas.find(p => p.id === debateState.rightPersonaId);
    let text = `DualMind Debate: "${debateState.topic}"\nMatchup: ${leftPersona?.name} vs ${rightPersona?.name}\n\n`;
    
    debateState.rounds.forEach(r => {
      text += `--- ROUND ${r.round} ---\n`;
      text += `Advocate: ${r.advocate}\n\n`;
      text += `Opposer: ${r.opposer}\n\n`;
    });
    
    if (debateState.verdict) {
      text += `--- FINAL VERDICT ---\n`;
      text += `${debateState.verdict.verdict}\n\n`;
      text += `Clarity Score: ${debateState.verdict.clarityScore}/100\n`;
    }
    
    navigator.clipboard.writeText(text);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  const isDebating = debateState.status === 'running';

  return (
    <div className="text-on-background selection:bg-primary/30 selection:text-primary min-h-screen relative">
      <BackgroundParticles />
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {toastVisible && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-surface border border-primary/50 text-primary px-6 py-3 rounded-full shadow-lg z-50 animate-fade-in-up">
          Copied to clipboard! ⚖️
        </div>
      )}

      <main className="lg:ml-72 pt-28 pb-32 px-4 md:px-10 max-w-7xl mx-auto">
        {hasPreviousDebate && debateState.status === 'idle' && (
          <div className="w-full max-w-[800px] mx-auto mb-6 bg-[#161d2f] border border-primary/30 px-6 py-3 rounded-xl shadow-lg animate-fade-in-up flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#c9a84c] text-lg">folder_open</span>
              <span className="text-sm text-gray-300">You have a previous debate on record.</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={loadPreviousDebate} className="text-[#c9a84c] text-sm font-label-caps hover:brightness-110 underline">View it?</button>
              <button onClick={() => setHasPreviousDebate(false)} className="text-gray-500 hover:text-gray-300 material-symbols-outlined text-sm">close</button>
            </div>
          </div>
        )}
        
        {errorMsg && (
          <div className="w-full md:w-3/4 mx-auto mb-6 bg-red-900/20 border border-primary text-primary px-6 py-4 rounded-xl flex items-center justify-between">
            <p>{errorMsg}</p>
          </div>
        )}

        {transitionMessage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-up">
            <h2 className="text-4xl md:text-6xl font-headline-md text-[#c9a84c] tracking-widest uppercase text-center md:scale-100 scale-75">
              <TypewriterText text={transitionMessage} speed={30} />
            </h2>
          </div>
        )}

        {activeTab === 'DOCKET' && (
          <>
            <DebateSection
              onStartDebate={handleStartDebate}
              isDebating={isDebating}
            />

            {debateState.status !== 'idle' && (
              <RoundIndicators rounds={debateState.rounds} isComplete={debateState.status === 'complete'} />
            )}

            {debateState.status !== 'idle' && (
              <ArgumentsSection 
                rounds={debateState.rounds} 
                activeAgent={debateState.activeAgent} 
                leftPersona={personas.find(p => p.id === debateState.leftPersonaId)}
                rightPersona={personas.find(p => p.id === debateState.rightPersonaId)}
                leftScoreTotal={debateState.leftScoreTotal}
                leftScoreCount={debateState.leftScoreCount}
                rightScoreTotal={debateState.rightScoreTotal}
                rightScoreCount={debateState.rightScoreCount}
                onArgumentScored={handleArgumentScored}
              />
            )}

            {debateState.activeAgent === 'judge' && (
              <div className="text-center py-12">
                <p className="text-primary font-headline-md tracking-widest uppercase text-2xl md:text-3xl">
                   <TypewriterText text="⚖️ THE COURT DELIBERATES..." speed={30} className="animate-pulse" />
                </p>
              </div>
            )}

            {debateState.status === 'complete' && debateState.verdict && (
              <div ref={verdictRef}>
                <VerdictSection 
                  verdict={debateState.verdict} 
                  onNew={() => setDebateState({ topic: "", leftPersonaId: "elon", rightPersonaId: "buffett", rounds: [], verdict: null, status: "idle", activeAgent: null })} 
                  topic={debateState.topic}
                  rounds={debateState.rounds}
                  leftPersona={personas.find(p => p.id === debateState.leftPersonaId)}
                  rightPersona={personas.find(p => p.id === debateState.rightPersonaId)}
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'ARCHIVES' && <ArchivesSection />}
        {activeTab === 'EVIDENCE' && <EvidenceSection />}
        {activeTab === 'CHAMBERS' && <ChambersSection />}
      </main>

      <MobileNav />
    </div>
  );
}
