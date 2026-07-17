import React, { useState, useRef } from 'react';
import { companies } from '../config/agents';

const MAX_JD_CHARS = 3000;

const jdTemplates = [
  { label: 'SWE INTERN', text: 'Software Engineer Intern. We are looking for a motivated software engineering intern to join our team. You will work on production systems, design and implement features, write clean code, and collaborate with senior engineers. Requirements: Strong knowledge of data structures and algorithms, proficiency in Python or Java, experience with web technologies (React, Node.js), familiarity with databases and SQL, good communication skills.' },
  { label: 'DATA ANALYST', text: 'Data Analyst. We seek a detail-oriented data analyst to help us make data-driven decisions. Responsibilities include analyzing large datasets, building dashboards, creating reports, and communicating insights to stakeholders. Requirements: Proficiency in Python and SQL, experience with Tableau or Power BI, statistical analysis skills, strong attention to detail, ability to present data clearly.' },
  { label: 'FULL-STACK DEV', text: 'Full Stack Developer. We are looking for a full-stack developer experienced with modern web technologies. You will design, develop, and maintain both frontend and backend systems. Requirements: React.js and Node.js expertise, REST API design, database management (PostgreSQL, MongoDB), cloud services (AWS/GCP), CI/CD pipelines, version control with Git.' },
];

const inputClass = "w-full bg-[#111318] border border-[#27272A] rounded-xl focus:border-[#5B8CFF] focus:ring-1 focus:ring-[#5B8CFF]/30 focus:outline-none py-4 px-5 text-[#FAFAFA] text-sm placeholder:text-[#3F3F46] transition-all duration-200 resize-none";

export default function UploadSection({ onStartAnalysis, isAnalyzing }) {
  const [jobDescription, setJobDescription] = useState('');
  const [companyMode, setCompanyMode] = useState('general');
  const [localError, setLocalError] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileRead = (file) => {
    if (!file) return;
    if (!file.name.match(/\.(txt|pdf|docx|doc)$/i)) {
      setLocalError('Please upload a .txt, .pdf, or .docx file.');
      return;
    }
    setFileName(file.name);
    setLocalError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const cleaned = typeof text === 'string' ? text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n').trim() : '';
      setResumeText(cleaned || text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileRead(file);
  };

  const handleStart = () => {
    if (!resumeText.trim() && !fileName) {
      setLocalError('Please upload your resume or paste its content below.');
      return;
    }
    if (!jobDescription.trim() || jobDescription.trim().length < 30) {
      setLocalError('Please paste a job description (at least 30 characters).');
      return;
    }
    setLocalError('');
    onStartAnalysis(resumeText || fileName, jobDescription.trim(), companyMode);
  };

  const fillTemplate = (text) => {
    setJobDescription(text);
    setLocalError('');
  };

  const getCompanyLogo = (id) => {
    switch(id) {
      case 'google': 
        return <svg className="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.88 12.18c0-.77-.07-1.51-.2-2.23H12v4.22h5c-.21 1.09-.8 2.01-1.69 2.63v2.18h2.74c1.6-1.48 2.53-3.66 2.53-6.4z"/><path d="M12 21c2.5 0 4.6-1.12 6.13-2.92l-2.74-2.18c-.83.56-1.89.89-3.03.89-2.33 0-4.3-1.58-5.01-3.71H4.49v2.26C6.01 18.23 8.78 21 12 21z"/><path d="M6.99 12.87a5.41 5.41 0 0 1 0-3.46V7.15H4.49A9 9 0 0 0 3 12c0 1.45.35 2.83.96 4.07l2.53-2.07z"/><path d="M12 7.02c1.36 0 2.58.47 3.54 1.39l2.65-2.65C16.6 4.22 14.5 3 12 3 8.78 3 6.01 5.77 4.49 8.35l2.5 2.07C7.7 8.29 9.67 7.02 12 7.02z"/></svg>;
      case 'microsoft': 
        return <svg className="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
      case 'amazon': 
        return <svg className="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.7 18.6c-2.4 1.8-5.7 2.8-8.8 2.8-3.4 0-6.6-1.1-9.2-3.1"/><path d="M18.7 18.6c.3-1 .2-2.1-.3-3"/><path d="M18.7 18.6c-.9.1-1.8 0-2.6-.4"/></svg>;
      case 'jpmorgan': 
      case 'barclays': 
        return <svg className="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
      default: 
        return <svg className="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4a2 2 0 0 1 4 0v4"/></svg>;
    }
  };

  return (
    <section className="mb-16">
      <div className="w-full max-w-[900px] mx-auto">
        {/* Hero */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 rounded-full px-4 py-1.5 mb-8">
            <span className="material-symbols-outlined text-[#5B8CFF] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
            <span className="text-[11px] font-label-caps text-[#5B8CFF] tracking-widest">AI HIRING INTELLIGENCE</span>
          </div>
          <h1 className="font-display-lg text-4xl md:text-5xl text-[#FAFAFA] mb-6 leading-tight tracking-tight">
            Optimize Your Resume<br />
            <span className="text-[#5B8CFF]">For Every Company</span>
          </h1>
          <p className="text-[#71717A] max-w-md mx-auto text-base leading-relaxed mb-12">
            AI Hiring Experts analyze your resume against any Job Description and help maximize your chances of getting shortlisted.
          </p>

          {/* Visual Flow */}
          <div className="flex items-center justify-center gap-2 md:gap-4 text-[#52525B] font-label-caps tracking-widest text-[10px] md:text-xs mb-12 opacity-80">
            <span>RESUME</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            <span className="text-[#5B8CFF]">AI</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            <span>ATS</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            <span>INTERVIEW</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            <span className="text-[#22C55E]">OFFER</span>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-3xl mx-auto mb-16">
            <div className="bg-[#111318] border border-[#27272A] rounded-xl p-5 hover:border-[#3F3F46] transition-colors">
              <div className="flex items-center gap-2 mb-2 text-[#FAFAFA]">
                <span className="material-symbols-outlined text-[#5B8CFF] text-[18px]">rule</span>
                <h3 className="font-semibold text-sm">ATS Score</h3>
              </div>
              <p className="text-[#71717A] text-xs leading-relaxed">Know exactly whether your resume passes automated applicant tracking systems.</p>
            </div>
            <div className="bg-[#111318] border border-[#27272A] rounded-xl p-5 hover:border-[#3F3F46] transition-colors">
              <div className="flex items-center gap-2 mb-2 text-[#FAFAFA]">
                <span className="material-symbols-outlined text-[#5B8CFF] text-[18px]">radar</span>
                <h3 className="font-semibold text-sm">Company Match</h3>
              </div>
              <p className="text-[#71717A] text-xs leading-relaxed">Tailor and optimize your experience for specific Job Descriptions and companies.</p>
            </div>
            <div className="bg-[#111318] border border-[#27272A] rounded-xl p-5 hover:border-[#3F3F46] transition-colors">
              <div className="flex items-center gap-2 mb-2 text-[#FAFAFA]">
                <span className="material-symbols-outlined text-[#5B8CFF] text-[18px]">groups</span>
                <h3 className="font-semibold text-sm">AI Hiring Panel</h3>
              </div>
              <p className="text-[#71717A] text-xs leading-relaxed">Simulate a real hiring committee with recruiter, engineering, and manager feedback.</p>
            </div>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-[#171A20] border border-[#2D2F36] rounded-[18px] p-8 md:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.25)] group hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-300">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Resume */}
            <div className="flex flex-col gap-3">
              <label className="font-label-caps text-[#A1A1AA] tracking-widest text-[10px]">RESUME</label>

              {/* Drag-drop zone */}
              <div
                className={`relative border-2 border-dashed rounded-xl flex flex-col items-center justify-center min-h-[200px] cursor-pointer transition-all duration-300 group ${
                  isDragOver
                    ? 'border-[#4F7DF3] bg-[#4F7DF3]/05'
                    : fileName
                    ? 'border-[#22C55E]/50 bg-[#22C55E]/05'
                    : 'border-[#3F3F46] bg-[#09090B]/60 hover:border-[#4F7DF3] hover:bg-[#111318]'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !isAnalyzing && fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".txt,.pdf,.docx,.doc"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isAnalyzing}
                />
                {fileName ? (
                  <div className="flex flex-col items-center gap-3 p-6">
                    <div className="w-10 h-10 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#22C55E] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                    <p className="font-label-caps text-[#22C55E] tracking-wider text-[10px] text-center">{fileName}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFileName(''); setResumeText(''); }}
                      className="text-[#71717A] hover:text-[#A1A1AA] text-xs underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 p-6 pointer-events-none">
                    <span className="material-symbols-outlined text-[#4F7DF3] text-4xl mb-1 opacity-80 group-hover:-translate-y-1 transition-transform duration-300">cloud_upload</span>
                    <div className="text-center">
                      <p className="text-[13px] font-medium text-[#FAFAFA] mb-1">Drag & Drop Resume</p>
                      <p className="text-[11px] text-[#71717A]">or click to browse • PDF, DOCX, TXT</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Paste fallback */}
              {!fileName && (
                <div>
                  <p className="text-[10px] text-[#52525B] font-label-caps text-center mb-2">— OR PASTE TEXT —</p>
                  <textarea
                    className={`${inputClass} min-h-[100px]`}
                    placeholder="Paste your resume content here..."
                    disabled={isAnalyzing}
                    value={typeof resumeText === 'string' ? resumeText : ''}
                    onChange={e => { setResumeText(e.target.value); setLocalError(''); }}
                  />
                </div>
              )}
            </div>

            {/* Right: Job Description */}
            <div className="flex flex-col gap-3">
              <label className="font-label-caps text-[#A1A1AA] tracking-widest text-[10px]">JOB DESCRIPTION</label>
              <div className="relative flex-1">
                <textarea
                  className={`${inputClass} min-h-[300px] h-full`}
                  placeholder="Paste the job description here..."
                  disabled={isAnalyzing}
                  value={jobDescription}
                  maxLength={MAX_JD_CHARS}
                  onChange={e => { setJobDescription(e.target.value); setLocalError(''); }}
                />
                <div className="absolute bottom-4 right-4">
                  <span className="text-[10px] font-label-caps text-[#3F3F46]">{jobDescription.length}/{MAX_JD_CHARS}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Company selector */}
          <div className="mt-6 pt-6 border-t border-[#27272A]">
            <label className="block font-label-caps text-[#71717A] mb-3 tracking-widest text-[10px]">TARGET COMPANY</label>
            <div className="flex flex-wrap gap-2">
              {companies.map(c => (
                <button
                  key={c.id}
                  disabled={isAnalyzing}
                  onClick={() => setCompanyMode(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium tracking-wide transition-all duration-200 border flex items-center gap-2 ${
                    companyMode === c.id
                      ? 'border-[#4F7DF3] bg-[#4F7DF3]/15 text-[#4F7DF3]'
                      : 'border-[#27272A] bg-[#111318] text-[#71717A] hover:border-[#3F3F46] hover:text-[#A1A1AA]'
                  }`}
                >
                  {getCompanyLogo(c.id)}
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {localError && (
            <div className="mt-4 text-[#EF4444] text-sm py-2.5 px-4 rounded-lg bg-[#EF4444]/08 border border-[#EF4444]/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {localError}
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleStart}
              disabled={isAnalyzing}
              className={`w-full sm:w-auto px-8 h-12 bg-[#4F7DF3] text-white font-semibold text-[14px] tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                isAnalyzing 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-[#436FE3] active:scale-[0.98]'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[18px] ${isAnalyzing ? 'animate-pulse' : ''}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isAnalyzing ? 'hourglass_top' : 'analytics'}
              </span>
              {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
            </button>
          </div>

          {/* Quick-fill templates */}
          <div className="flex flex-wrap gap-2 pt-5 border-t border-[#27272A] mt-5">
            <span className="text-[10px] font-label-caps text-[#52525B] self-center mr-1">QUICK FILL:</span>
            {jdTemplates.map(t => (
              <button
                key={t.label}
                onClick={() => fillTemplate(t.text)}
                className="px-3 py-1 bg-[#09090B] border border-[#27272A] rounded-lg text-[10px] font-label-caps tracking-wider text-[#71717A] hover:border-[#3F3F46] hover:text-[#A1A1AA] transition-all duration-200"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
