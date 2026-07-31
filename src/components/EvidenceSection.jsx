import React, { useEffect, useState } from 'react';

export default function InterviewSection() {
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('courtroom_archives');
      if (saved) {
        const parsed = JSON.parse(saved).reverse();
        // Filter only those that actually have interviewData generated
        const withInterviews = parsed.filter(a => a.interviewData);
        setInterviewHistory(withInterviews);
      }
    } catch (e) {
      console.error("Error loading interview history", e);
    }
  }, []);

  if (interviewHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in-up px-4">
        <div className="w-20 h-20 rounded-2xl bg-[#171A20] border border-[#2D2F36] flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-5xl text-[#3F3F46]" style={{ fontVariationSettings: "'FILL' 1" }}>quiz</span>
        </div>
        <h2 className="font-headline-md text-xl text-[#FAFAFA] mb-2">Interview Prep</h2>
        <p className="text-[#71717A] text-sm max-w-sm leading-relaxed mb-8">
          Run a resume analysis first. After your analysis, click <strong className="text-[#5B8CFF] font-semibold">Prepare for Interview</strong> to get personalized questions based on your resume and the specific job description.
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
        {interviewHistory.map((item) => {
          const isExpanded = expandedId === item.id;
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
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
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
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-label-caps text-slate-500 uppercase">Questions Generated</p>
                    <p className="text-sm font-semibold text-gray-300">
                      {(item.interviewData?.behavioral?.length || 0) + (item.interviewData?.technical?.length || 0) + (item.interviewData?.projectSpecific?.length || 0)}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-slate-500 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    expand_more
                  </span>
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
