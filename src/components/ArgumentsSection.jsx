import React, { useState, useEffect, useRef } from 'react';
import TypewriterText from './TypewriterText';
import Scoreboard from './Scoreboard';
import ScoreBars from './ScoreBars';
import { scoreArgument } from '../services/claudeApi';

function ThinkingDots({ colorClass }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${colorClass} animate-bounce`} style={{ animationDelay: '0ms' }}></div>
      <div className={`w-1.5 h-1.5 rounded-full ${colorClass} animate-bounce`} style={{ animationDelay: '150ms' }}></div>
      <div className={`w-1.5 h-1.5 rounded-full ${colorClass} animate-bounce`} style={{ animationDelay: '300ms' }}></div>
    </div>
  );
}

function AdvocateBubble({ roundNum, slot, isThinking, persona, onScoreCalculated }) {
  const bubbleRef = useRef(null);
  const [typed, setTyped] = useState(false);
  const [flash, setFlash] = useState(false);
  const [scores, setScores] = useState(null);

  useEffect(() => {
    if ((isThinking || slot?.advocate) && bubbleRef.current) {
      if (window.innerWidth < 768) {
        bubbleRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isThinking, slot?.advocate]);

  const handleComplete = async () => {
    setTyped(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
    // Score the argument
    const result = await scoreArgument(slot.advocate);
    setScores(result);
    onScoreCalculated('advocate', result);
  };

  const hasContent = !!slot?.advocate;

  return (
    <div className="relative" style={{ minHeight: '6rem' }} ref={bubbleRef}>
      <span className="font-label-caps text-[8px] text-primary/50 absolute -top-4 left-0">ROUND {roundNum}</span>
      {isThinking ? (
        <div className="glass-panel p-6 rounded-2xl rounded-tl-sm h-full flex items-center gap-4 relative overflow-hidden" style={{ borderLeft: `4px solid ${persona.color}` }}>
          <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-white to-transparent pointer-events-none" style={{ backgroundImage: `linear-gradient(to right, ${persona.color}, transparent)` }}></div>
          <ThinkingDots colorClass="bg-white/80" />
          <span className="text-sm font-label-caps tracking-wider" style={{ color: persona.color }}>Composing argument...</span>
        </div>
      ) : hasContent ? (
        <div className={`argument-bubble glass-panel p-6 md:p-8 rounded-2xl rounded-tl-sm relative overflow-hidden animate-slide-in-left transition-all duration-500`} style={{ borderLeft: `4px solid ${flash ? '#c9a84c' : persona.color}`, boxShadow: `0 10px 40px -10px ${persona.color}20` }}>
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" style={{ background: `radial-gradient(circle at top left, ${persona.color}, transparent 60%)` }}></div>
          <span className="absolute -top-4 right-2 opacity-10 text-[120px] font-serif-large leading-none select-none pointer-events-none" style={{ color: persona.color }}>"</span>
          <div className="text-body-rt text-[18px] md:text-[20px] leading-relaxed relative z-10 text-slate-200">
            "{!typed ? <TypewriterText text={slot.advocate} onComplete={handleComplete} cursorClass="text-primary/50" /> : slot.advocate}"
          </div>
          {typed && (
            <div className="text-right mt-6 animate-fade-in-up">
              <span className="text-[12px] font-label-caps tracking-widest px-3 py-1 rounded-full bg-black/20 border border-white/5" style={{ color: persona.color }}>— {persona.name} {persona.emoji}</span>
            </div>
          )}
          {scores && <ScoreBars scores={scores} personaColor={persona.color} />}
        </div>
      ) : (
        <div className="glass-panel p-6 rounded-2xl rounded-tl-sm h-full flex items-center opacity-50" style={{ borderLeft: `4px solid ${persona.color}30` }}>
          <p className="text-sm font-label-caps tracking-wider text-slate-500">Awaiting argument...</p>
        </div>
      )}
    </div>
  );
}

function OpposerBubble({ roundNum, slot, isThinking, persona, onScoreCalculated }) {
  const bubbleRef = useRef(null);
  const [typed, setTyped] = useState(false);
  const [flash, setFlash] = useState(false);
  const [scores, setScores] = useState(null);

  useEffect(() => {
    if ((isThinking || slot?.opposer) && bubbleRef.current) {
      if (window.innerWidth < 768) {
        bubbleRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isThinking, slot?.opposer]);

  const handleComplete = async () => {
    setTyped(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
    const result = await scoreArgument(slot.opposer);
    setScores(result);
    onScoreCalculated('opposer', result);
  };

  const hasContent = !!slot?.opposer;

  return (
    <div className="relative" style={{ minHeight: '6rem' }} ref={bubbleRef}>
      <span className="font-label-caps text-[8px] text-primary/50 absolute -top-4 right-0">ROUND {roundNum}</span>
      {isThinking ? (
        <div className="glass-panel p-6 rounded-2xl rounded-tr-sm text-right h-full flex items-center justify-end gap-4 relative overflow-hidden" style={{ borderRight: `4px solid ${persona.color}` }}>
          <div className="absolute inset-0 opacity-10 bg-gradient-to-l from-white to-transparent pointer-events-none" style={{ backgroundImage: `linear-gradient(to left, ${persona.color}, transparent)` }}></div>
          <span className="text-sm font-label-caps tracking-wider" style={{ color: persona.color }}>Preparing counter...</span>
          <ThinkingDots colorClass="bg-white/80" />
        </div>
      ) : hasContent ? (
        <div className={`argument-bubble glass-panel p-6 md:p-8 rounded-2xl rounded-tr-sm text-right relative overflow-hidden animate-slide-in-right transition-all duration-500`} style={{ borderRight: `4px solid ${flash ? '#c9a84c' : persona.color}`, boxShadow: `0 10px 40px -10px ${persona.color}20` }}>
          <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${persona.color}, transparent 60%)` }}></div>
          <span className="absolute -top-4 left-2 opacity-10 text-[120px] font-serif-large leading-none select-none pointer-events-none" style={{ color: persona.color }}>"</span>
          <div className="text-body-rt text-[18px] md:text-[20px] leading-relaxed relative z-10 text-slate-200">
            "{!typed ? <TypewriterText text={slot.opposer} onComplete={handleComplete} cursorClass="text-primary/50" /> : slot.opposer}"
          </div>
          {typed && (
            <div className="text-left mt-6 animate-fade-in-up">
              <span className="text-[12px] font-label-caps tracking-widest px-3 py-1 rounded-full bg-black/20 border border-white/5" style={{ color: persona.color }}>{persona.emoji} {persona.name} —</span>
            </div>
          )}
          {scores && <ScoreBars scores={scores} personaColor={persona.color} />}
        </div>
      ) : (
        <div className="glass-panel p-6 rounded-2xl rounded-tr-sm text-right h-full flex items-center justify-end opacity-50" style={{ borderRight: `4px solid ${persona.color}30` }}>
          <p className="text-sm font-label-caps tracking-wider text-slate-500">Awaiting argument...</p>
        </div>
      )}
    </div>
  );
}

export default function ArgumentsSection({ 
  rounds = [], 
  activeAgent, 
  leftPersona, 
  rightPersona,
  leftScoreTotal,
  leftScoreCount,
  rightScoreTotal,
  rightScoreCount,
  onArgumentScored
}) {
  const getSlot = (n) => rounds.find(r => r.round === n) || null;

  const isAdvocateThinking = (roundNum) => {
    const slot = getSlot(roundNum);
    return activeAgent === 'advocate' && rounds.length === roundNum && !slot?.advocate;
  };

  const isOpposerThinking = (roundNum) => {
    const slot = getSlot(roundNum);
    return activeAgent === 'opposer' && rounds.length === roundNum && !!slot?.advocate && !slot?.opposer;
  };

  const leftAvg = leftScoreCount > 0 ? Math.round(leftScoreTotal / leftScoreCount) : 0;
  const rightAvg = rightScoreCount > 0 ? Math.round(rightScoreTotal / rightScoreCount) : 0;

  return (
    <div className="mb-20">
      <Scoreboard leftPersona={leftPersona} rightPersona={rightPersona} leftScore={leftAvg} rightScore={rightAvg} />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12 items-start" style={{ gridAutoRows: 'auto' }}>
        <div className="glass-panel rounded-2xl p-6 md:p-8 relative overflow-hidden group flex flex-col" style={{ borderTop: `1px solid ${leftPersona?.color}30`, boxShadow: `0 10px 30px ${leftPersona?.color}05` }}>
          <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: `${leftPersona?.color}10` }}>
            {activeAgent === 'advocate' && (
              <div className="h-full" style={{
                backgroundColor: leftPersona?.color,
                boxShadow: `0 0 15px ${leftPersona?.color}`,
                width: '0%',
                animation: 'fillProgress 15s ease-out forwards'
              }}></div>
            )}
          </div>
          <div className="absolute inset-0 pointer-events-none z-0 opacity-20" style={{ background: `radial-gradient(circle at top left, ${leftPersona?.color}, transparent 70%)` }}></div>
          <div className="flex items-center gap-4 z-10 relative">
            <div className={`w-4 h-4 rounded-full ${activeAgent === 'advocate' ? 'animate-pulse' : 'opacity-30'}`} style={{ backgroundColor: leftPersona?.color, boxShadow: `0 0 15px ${leftPersona?.color}` }}></div>
            <span className="text-xl">{leftPersona?.emoji}</span>
            <h3 className="font-serif-large uppercase tracking-widest text-2xl" style={{ color: leftPersona?.color }}>{leftPersona?.name}</h3>
          </div>
          {activeAgent === 'advocate' && (
            <p className="text-[11px] font-label-caps mt-3 animate-pulse z-10 relative tracking-[0.2em] opacity-80" style={{ color: leftPersona?.color }}>
              ● {leftPersona?.name.toUpperCase()} IS BUILDING CASE...
            </p>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-6 md:p-8 relative overflow-hidden group text-right flex flex-col" style={{ borderTop: `1px solid ${rightPersona?.color}30`, boxShadow: `0 10px 30px ${rightPersona?.color}05` }}>
          <div className="absolute top-0 left-0 right-0 h-1 flex justify-end" style={{ backgroundColor: `${rightPersona?.color}10` }}>
            {activeAgent === 'opposer' && (
              <div className="h-full" style={{
                backgroundColor: rightPersona?.color,
                boxShadow: `0 0 15px ${rightPersona?.color}`,
                width: '0%',
                animation: 'fillProgress 15s ease-out forwards'
              }}></div>
            )}
          </div>
          <div className="absolute inset-0 pointer-events-none z-0 opacity-20" style={{ background: `radial-gradient(circle at top right, ${rightPersona?.color}, transparent 70%)` }}></div>
          <div className="flex items-center gap-4 justify-end z-10 relative">
            <h3 className="font-serif-large uppercase tracking-widest text-2xl" style={{ color: rightPersona?.color }}>{rightPersona?.name}</h3>
            <span className="text-xl">{rightPersona?.emoji}</span>
            <div className={`w-4 h-4 rounded-full ${activeAgent === 'opposer' ? 'animate-pulse' : 'opacity-30'}`} style={{ backgroundColor: rightPersona?.color, boxShadow: `0 0 15px ${rightPersona?.color}` }}></div>
          </div>
          {activeAgent === 'opposer' && (
            <p className="text-[11px] font-label-caps mt-3 animate-pulse z-10 relative text-right tracking-[0.2em] opacity-80" style={{ color: rightPersona?.color }}>
              {rightPersona?.name.toUpperCase()} IS PREPARING COUNTER... ●
            </p>
          )}
        </div>

        {/* Row 2: Round 1 */}
        <div className="relative pt-4">
          <AdvocateBubble roundNum={1} slot={getSlot(1)} isThinking={isAdvocateThinking(1)} persona={leftPersona} onScoreCalculated={onArgumentScored} />
        </div>
        <div className="relative pt-4">
          <OpposerBubble roundNum={1} slot={getSlot(1)} isThinking={isOpposerThinking(1)} persona={rightPersona} onScoreCalculated={onArgumentScored} />
        </div>

        {/* Row 3: Round 2 */}
        <div className="relative pt-4">
          <AdvocateBubble roundNum={2} slot={getSlot(2)} isThinking={isAdvocateThinking(2)} persona={leftPersona} onScoreCalculated={onArgumentScored} />
        </div>
        <div className="relative pt-4">
          <OpposerBubble roundNum={2} slot={getSlot(2)} isThinking={isOpposerThinking(2)} persona={rightPersona} onScoreCalculated={onArgumentScored} />
        </div>

        {/* Row 4: Round 3 */}
        <div className="relative pt-4">
          <AdvocateBubble roundNum={3} slot={getSlot(3)} isThinking={isAdvocateThinking(3)} persona={leftPersona} onScoreCalculated={onArgumentScored} />
        </div>
        <div className="relative pt-4">
          <OpposerBubble roundNum={3} slot={getSlot(3)} isThinking={isOpposerThinking(3)} persona={rightPersona} onScoreCalculated={onArgumentScored} />
        </div>
      </section>
    </div>
  );
}
