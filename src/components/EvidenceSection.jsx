import React from 'react';

export default function InterviewSection() {
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
