import React, { useState } from 'react';
import { personas } from '../config/personas';

const MAX_CHARS = 500;

export default function DebateSection({ onStartDebate, isDebating }) {
  const [topic, setTopic] = useState('');
  const [leftPersona, setLeftPersona] = useState('elon');
  const [rightPersona, setRightPersona] = useState('buffett');
  const [localError, setLocalError] = useState('');

  const handleStart = () => {
    if (!topic.trim()) {
      setLocalError('Please state your case before the court');
      return;
    }
    if (topic.trim().length < 10) {
      setLocalError('Please provide more detail about your decision');
      return;
    }
    setLocalError('');
    onStartDebate(topic.trim(), leftPersona, rightPersona);
  };

  const fillPrecedent = (text) => {
    setTopic(text);
    setLocalError('');
  };

  return (
    <section className="mb-16">
      <div className="w-full max-w-[800px] mx-auto glass-panel border border-primary/20 rounded-2xl p-8 md:p-12 relative overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(201,168,76,0.15)] group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
        <h2 className="font-serif-large text-3xl text-primary mb-8 text-center drop-shadow-md">State Your Case</h2>
        <div className="space-y-8">
          <div className="relative">
            <textarea
              className="w-full bg-[#0a0f1e]/50 border-2 border-primary/20 rounded-xl focus:border-primary focus:bg-[#0a0f1e]/80 focus:shadow-[0_0_25px_rgba(201,168,76,0.2)] focus:ring-1 focus:ring-primary outline-none py-5 px-6 text-body-rt transition-all duration-300 resize-none min-h-[120px] placeholder:text-slate-600"
              placeholder="Enter your decision for cross-examination..."
              disabled={isDebating}
              value={topic}
              maxLength={MAX_CHARS}
              onChange={e => { setTopic(e.target.value); setLocalError(''); }}
            ></textarea>
            <div className="absolute bottom-4 right-4 flex gap-2">
              <span className="text-[10px] font-label-caps text-slate-500">{topic.length}/{MAX_CHARS} CHARACTERS</span>
            </div>
          </div>

          {localError && (
            <div className="text-primary font-label-caps text-sm py-2 px-4 rounded-lg bg-primary/10 border border-primary/30">
              ⚠️ {localError}
            </div>
          )}

          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block font-label-caps text-primary/70 mb-3 tracking-widest">LEFT CHAIR</label>
                <select
                  className="w-full bg-[#0a0f1e]/80 border-2 border-primary/20 text-on-surface py-3 px-4 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none h-[56px] transition-all hover:border-primary/50 appearance-none cursor-pointer"
                  disabled={isDebating}
                  value={leftPersona}
                  onChange={e => setLeftPersona(e.target.value)}
                >
                  {personas.map(p => (
                    <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 w-full relative">
                <label className="block font-label-caps text-primary/70 mb-3 tracking-widest">RIGHT CHAIR</label>
                <select
                  className="w-full bg-[#0a0f1e]/80 border-2 border-primary/20 text-on-surface py-3 px-4 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none h-[56px] transition-all hover:border-primary/50 appearance-none cursor-pointer"
                  disabled={isDebating}
                  value={rightPersona}
                  onChange={e => setRightPersona(e.target.value)}
                >
                  {personas.map(p => (
                    <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleStart}
                disabled={isDebating}
                className={`w-full md:w-1/3 bg-gradient-to-br from-[#e6c364] to-[#a38027] text-[#101415] font-label-caps font-bold tracking-widest rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(201,168,76,0.6)] active:scale-95 transition-all duration-300 group h-[56px] ${isDebating ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1'}`}
              >
                <span className={`material-symbols-outlined transition-transform duration-300 ${isDebating ? 'animate-pulse' : 'group-hover:rotate-12 group-hover:scale-110'}`}>gavel</span>
                <span className="whitespace-nowrap">{isDebating ? 'DELIBERATING...' : 'START DEBATE'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-6 border-t border-primary/10">
            <span className="text-[10px] font-label-caps text-primary/50 self-center mr-2">PRECEDENTS:</span>
            <button
              onClick={() => fillPrecedent('Should I drop out of college and pursue my startup idea full time?')}
              className="px-4 py-1.5 bg-[#0a0f1e]/40 border border-primary/20 rounded-full text-[11px] font-label-caps tracking-wider text-slate-300 hover:border-primary hover:text-primary hover:bg-primary/5 hover:shadow-[0_0_15px_rgba(201,168,76,0.2)] transition-all duration-300"
            >"DROP OUT?"</button>
            <button
              onClick={() => fillPrecedent('Should I move to a different city for a better job opportunity?')}
              className="px-4 py-1.5 bg-[#0a0f1e]/40 border border-primary/20 rounded-full text-[11px] font-label-caps tracking-wider text-slate-300 hover:border-primary hover:text-primary hover:bg-primary/5 hover:shadow-[0_0_15px_rgba(201,168,76,0.2)] transition-all duration-300"
            >"MOVE CITIES?"</button>
            <button
              onClick={() => fillPrecedent('Should I change careers and start something completely new?')}
              className="px-4 py-1.5 bg-[#0a0f1e]/40 border border-primary/20 rounded-full text-[11px] font-label-caps tracking-wider text-slate-300 hover:border-primary hover:text-primary hover:bg-primary/5 hover:shadow-[0_0_15px_rgba(201,168,76,0.2)] transition-all duration-300"
            >"CHANGE CAREERS?"</button>
          </div>
        </div>
      </div>
    </section>
  );
}
