import React, { useEffect, useState } from 'react';
import { generateInterviewQuestions } from '../services/hiringApi';

export default function InterviewSection() {
  const [archives, setArchives] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('courtroom_archives');
      if (saved) {
        const parsed = JSON.parse(saved).reverse();
        setArchives(parsed);
      }
    } catch (e) {
      console.error("Error loading interview history", e);
    }
  }, []);

  const handleGenerate = async (e, item) => {
    e.stopPropagation();
    setLoadingId(item.id);
    try {
      const result = await generateInterviewQuestions(item.resumeText, item.jobDescription, item.companyMode);
      
      const updatedArchives = archives.map(a => 
        a.id === item.id ? { ...a, interviewData: result } : a
      );
      setArchives(updatedArchives);
      setExpandedId(item.id);

      // Persist update to localStorage
      const rawArchives = JSON.parse(localStorage.getItem('courtroom_archives') || '[]');
      const updatedRaw = rawArchives.map(a => 
        a.id === item.id ? { ...a, interviewData: result } : a
      );
      localStorage.setItem('courtroom_archives', JSON.stringify(updatedRaw));

      const last = JSON.parse(localStorage.getItem('hireflow_last_analysis'));
      if (last && last.id === item.id) {
        last.interviewData = result;
        localStorage.setItem('hireflow_last_analysis', JSON.stringify(last));
      }
    } catch (err) {
      console.error("Failed to generate interview questions", err);
    } finally {
      setLoadingId(null);
    }
  };

  if (archives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in-up px-4">
        <div className="w-20 h-20 rounded-2xl bg-[#171A20] border border-[#2D2F36] flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-5xl text-[#3F3F46]" style={{ fontVariationSettings: "'FILL' 1" }}>quiz</span>
        </div>
        <h2 className="font-headline-md text-xl text-[#FAFAFA] mb-2">Interview Prep</h2>
        <p className="text-[#71717A] text-sm max-w-sm leading-relaxed mb-8">
          Run a resume analysis first in the <strong className="text-[#5B8CFF] font-semibold">Analyze</strong> tab to generate tailored interview questions based on your resume and target job description.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full">
          {[
            { icon: 'psychology',    label: 'Behavioral',      color: '#8b5cf6', desc: 'STAR-method questions from your experience' },
            { icon: 'code',          label: 'Technical',       color: '#3b82f6', desc: 'Tech stack & problem-solving deep dives' },
            { icon: 'folder_open',   label: 'Project-Specific', color: '#22C55E', desc: 'Questions about your actual projects' },
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

  return (
    <div className="animate-fade-in-up max-w-5xl mx-auto">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-7 h-7 rounded-lg bg-[#5B8CFF]/15 border border-[#5B8CFF]/25 flex items-center justify-center">
          <span className="material-symbols-outlined text-[#5B8CFF] text-[14px]">quiz</span>
        </div>
        <h2 className="font-semibold text-[#FAFAFA] text-base tracking-tight">Interview Prep History</h2>
      </div>

      <div className="space-y-4">
        {archives.map((item) => {
          const isExpanded = expandedId === item.id;
          const isLoading = loadingId === item.id;
          const hasData = Boolean(item.interviewData);
          const dateStr = item.date
            ? new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
            : 'Unknown Date';
          const company = item.companyMode && item.companyMode !== 'general'
            ? item.companyMode.charAt(0).toUpperCase() + item.companyMode.slice(1)
            : 'General';
          
          return (
            <div key={item.id} className="bg-[#171A20] border border-[#2D2F36] rounded-xl overflow-hidden transition-all duration-200">
              <div 
                className="p-5 cursor-pointer hover:bg-[#1C1F26] flex flex-col md:flex-row md:items-center justify-between gap-4"
                onClick={() => {
                  if (hasData) setExpandedId(isExpanded ? null : item.id);
                }}
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-label-caps text-xs text-slate-500 uppercase tracking-widest">
                      #{item.id}
                    </span>
                    <span className="font-label-caps text-[10px] text-slate-400">{dateStr}</span>
                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-label-caps uppercase">
                      <span className="material-symbols-outlined text-[10px]">business</span>
                      {company}
                    </span>
                  </div>
                  <h3 className="text-base text-gray-200 font-headline-md leading-snug line-clamp-1" title={item.topic || item.jobDescription}>
                    {item.topic || 'Interview Prep'}
                  </h3>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                  {hasData ? (
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-label-caps text-emerald-400 uppercase">Prep Ready</p>
                        <p className="text-xs text-slate-400">
                          {(item.interviewData?.behavioral?.length || 0) + (item.interviewData?.technical?.length || 0) + (item.interviewData?.projectSpecific?.length || 0)} Questions
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-slate-500 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        expand_more
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleGenerate(e, item)}
                      disabled={isLoading}
                      className="bg-[#5B8CFF]/10 hover:bg-[#5B8CFF]/20 border border-[#5B8CFF]/30 text-[#5B8CFF] text-xs font-label-caps px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                    >
                      {isLoading ? (
                        <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> Generating...</>
                      ) : (
                        <><span className="material-symbols-outlined text-sm">auto_awesome</span> Generate Questions</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && item.interviewData && (
                <div className="p-5 md:p-8 border-t border-[#27272A] bg-[#09090B]">
                  <div className="grid grid-cols-1 gap-6">
                    {[
                      { key: 'behavioral',     label: 'BEHAVIORAL',     color: '#8b5cf6', data: item.interviewData.behavioral },
                      { key: 'technical',      label: 'TECHNICAL',      color: '#3b82f6', data: item.interviewData.technical },
                      { key: 'projectSpecific',label: 'PROJECT-SPECIFIC',color: '#22C55E', data: item.interviewData.projectSpecific },
                    ].map(({ key, label, color, data }) => (
                      <div key={key} className="bg-[#171A20] border border-[#2D2F36] rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></div>
                          <p className="font-label-caps text-[10px] tracking-widest" style={{ color }}>{label}</p>
                        </div>
                        <ul className="space-y-4">
                          {data?.map((q, i) => (
                            <li key={i} className="border-b border-[#27272A] pb-3 last:border-0 last:pb-0">
                              <p className="text-sm text-[#FAFAFA] mb-1 leading-snug">{q.question}</p>
                              <p className="text-[11px] text-[#52525B] italic">{q.context}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
