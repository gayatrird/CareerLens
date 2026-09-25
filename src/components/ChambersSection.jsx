import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import {
  getStoredUserMotion,
  setStoredUserMotion,
  exportAllUserData,
  clearUserHistory,
} from '../services/userStorage';
import { playActionConfirm } from '../utils/audio';

export default function SettingsSection() {
  const user = auth?.currentUser;

  const [reduceMotion, setReduceMotion] = useState(() => getStoredUserMotion(user?.uid));
  const [theme, setTheme] = useState(() => localStorage.getItem('careerlens_theme') || localStorage.getItem('hireflow_theme') || 'dark');
  const [seniority, setSeniority] = useState(() => localStorage.getItem('careerlens_seniority') || localStorage.getItem('hireflow_seniority') || 'senior');
  const [aiTone, setAiTone] = useState(() => localStorage.getItem('careerlens_ai_tone') || localStorage.getItem('hireflow_ai_tone') || 'balanced');
  const [autoDeepScan, setAutoDeepScan] = useState(() => (localStorage.getItem('careerlens_auto_deep_scan') ?? localStorage.getItem('hireflow_auto_deep_scan')) === 'true');
  const [toastMsg, setToastMsg] = useState('');

  // Keep motion state in sync when user switches
  useEffect(() => {
    setReduceMotion(getStoredUserMotion(user?.uid));
  }, [user?.uid]);

  const showToast = (msg) => {
    setToastMsg(msg);
    playActionConfirm();
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleToggleReduceMotion = () => {
    const next = !reduceMotion;
    setReduceMotion(next);
    setStoredUserMotion(next, user?.uid);
    showToast(next ? 'Reduce Motion enabled.' : 'Standard motion restored.');
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('careerlens_theme', newTheme);
    localStorage.setItem('hireflow_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    showToast(`Theme: ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)}`);
  };

  const handleSeniorityChange = (val) => {
    setSeniority(val);
    localStorage.setItem('careerlens_seniority', val);
    localStorage.setItem('hireflow_seniority', val);
    showToast('Target seniority updated.');
  };

  const handleToneChange = (val) => {
    setAiTone(val);
    localStorage.setItem('careerlens_ai_tone', val);
    localStorage.setItem('hireflow_ai_tone', val);
    showToast('AI tone saved.');
  };

  const handleToggleAutoDeepScan = () => {
    const next = !autoDeepScan;
    setAutoDeepScan(next);
    localStorage.setItem('careerlens_auto_deep_scan', next ? 'true' : 'false');
    localStorage.setItem('hireflow_auto_deep_scan', next ? 'true' : 'false');
    showToast(next ? 'Auto Deep Scan enabled.' : 'Auto Deep Scan disabled.');
  };

  const handleExportData = () => {
    try {
      const exportData = exportAllUserData(user?.uid);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `careerlens_data_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Personal data exported!');
    } catch (e) {
      console.error(e);
      showToast('Export failed.');
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all stored analyses for this account? Roadmaps and mock interviews will remain intact.')) {
      clearUserHistory(user?.uid);
      showToast('Analysis history cleared.');
    }
  };

  const card = { background: 'var(--color-card)', border: '1px solid var(--color-border-default)', borderRadius: 12 };
  const inputStyle = { background: 'var(--color-card-inset)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-heading)' };

  const SectionCard = ({ children, className = '' }) => (
    <div className={`p-5 md:p-6 space-y-4 ${className}`} style={card}>
      {children}
    </div>
  );

  const SectionHeader = ({ icon, iconColor, title, subtitle }) => (
    <div className="flex items-center gap-3 pb-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <span className="material-symbols-outlined text-lg" style={{ color: iconColor }}>{icon}</span>
      <div>
        <h3 className="text-[13px] font-semibold text-text-heading">{title}</h3>
        <p className="text-[11px] text-text-muted">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in-up max-w-[800px] mx-auto pb-16 space-y-5">
      {toastMsg && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-lg shadow-xl z-50 animate-fade-in-up text-[11px] font-semibold tracking-wide text-accent"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-accent)', opacity: 0.95 }}
        >
          {toastMsg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center gap-3 pt-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(79,125,243,0.1)', border: '1px solid rgba(79,125,243,0.2)' }}>
          <span className="material-symbols-outlined text-accent text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
        </div>
        <div>
          <h2 className="text-[17px] font-semibold text-text-heading tracking-tight">Settings & Preferences</h2>
          <p className="text-[11px] text-text-muted">Customize interface motion, themes, AI evaluation, and privacy.</p>
        </div>
      </div>

      {/* Appearance & Themes */}
      <SectionCard>
        <SectionHeader icon="palette" iconColor="#F59E0B" title="Appearance & Themes" subtitle="Choose your preferred workspace aesthetic." />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'dark', label: 'Cyber Dark', desc: 'Deep slate with blue accents', icon: 'dark_mode' },
            { id: 'light', label: 'Clean Light', desc: 'High contrast daylight', icon: 'light_mode' },
            { id: 'navy', label: 'Midnight Navy', desc: 'Deep sapphire tones', icon: 'stars' },
          ].map((t) => {
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className="p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-[108px] cursor-pointer"
                style={{
                  background: isActive ? (t.id === 'light' ? '#F0F1F3' : t.id === 'navy' ? '#0B132B' : 'var(--color-card-section)') : 'var(--color-card-inset)',
                  borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border-subtle)',
                  color: t.id === 'light' && isActive ? '#0F1115' : 'var(--color-text-heading)',
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="material-symbols-outlined" style={{ color: isActive ? (t.id === 'light' ? '#F59E0B' : 'var(--color-accent)') : 'var(--color-text-muted)' }}>{t.icon}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                </div>
                <div>
                  <p className="text-[12px] font-semibold" style={{ color: isActive ? (t.id === 'light' ? '#0F1115' : 'var(--color-text-heading)') : 'var(--color-text-body)' }}>{t.label}</p>
                  <p className="text-[10px] text-text-muted">{t.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Motion & Interface */}
      <SectionCard>
        <SectionHeader
          icon="motion_photos_paused"
          iconColor="#38BDF8"
          title="Motion & Interface"
          subtitle="Control animations, transitions, and dynamic effects."
        />
        <div className="flex items-center justify-between gap-4">
          <div className="max-w-[78%]">
            <p className="text-[12px] font-medium text-text-heading">Reduce Motion</p>
            <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
              Minimizes transitions, disables background floating particles, and suppresses animation-related sound cues.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={handleToggleReduceMotion}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-white/[0.08] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#38BDF8]" />
          </label>
        </div>
      </SectionCard>

      {/* AI Evaluation Preferences */}
      <SectionCard>
        <SectionHeader icon="auto_awesome" iconColor="#22C55E" title="AI Evaluation Preferences" subtitle="Fine-tune how agents evaluate your resume." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-label-caps text-[10px] text-text-body mb-1.5">Target Seniority</label>
            <select value={seniority} onChange={(e) => handleSeniorityChange(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-[12px] outline-none transition-colors cursor-pointer" style={inputStyle}>
              <option value="junior">Junior (0–2 Years)</option>
              <option value="mid">Mid-Level (2–5 Years)</option>
              <option value="senior">Senior (5–8 Years)</option>
              <option value="lead">Lead / Staff (8+ Years)</option>
              <option value="executive">Executive / Director</option>
            </select>
          </div>
          <div>
            <label className="block font-label-caps text-[10px] text-text-body mb-1.5">AI Reviewer Tone</label>
            <select value={aiTone} onChange={(e) => handleToneChange(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-[12px] outline-none transition-colors cursor-pointer" style={inputStyle}>
              <option value="balanced">Balanced & Strategic (Default)</option>
              <option value="strict">Strict Hiring Manager</option>
              <option value="supportive">Encouraging & Educational</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <div>
            <p className="text-[12px] font-medium text-text-heading">Auto-run Deep ATS Scan</p>
            <p className="text-[10px] text-text-muted">Compute missing keywords during analysis.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={autoDeepScan} onChange={handleToggleAutoDeepScan} className="sr-only peer" />
            <div className="w-10 h-5 bg-white/[0.08] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#22C55E]" />
          </label>
        </div>
      </SectionCard>

      {/* Data & Privacy */}
      <SectionCard>
        <SectionHeader icon="shield" iconColor="#8B5CF6" title="Data & Privacy" subtitle="Manage local storage, history, and personal CareerLens data." />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg" style={{ background: 'var(--color-card-inset)', border: '1px solid var(--color-border-subtle)' }}>
          <div>
            <p className="text-[12px] font-medium text-text-heading">Account Isolation</p>
            <p className="text-[10px] text-text-muted">{user ? `Scoped to ${user.email}` : 'Guest Session (Private local sandbox)'}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-semibold ${user ? 'text-[#22C55E]' : 'text-[#F59E0B]'}`} style={{ background: user ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', border: `1px solid ${user ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
            {user ? 'CLOUD SYNC' : 'LOCAL ONLY'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 text-[11px] font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
            style={{ background: 'var(--color-card-inset)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-heading)' }}
            title="Export full CareerLens personal data (resumes, interviews, roadmaps)"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>Export Personal Data
          </button>
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 text-[11px] font-medium px-4 py-2 rounded-lg transition-colors text-red-400 cursor-pointer"
            style={{ background: 'var(--color-card-inset)', border: '1px solid var(--color-border-subtle)' }}
            title="Clear stored analysis history"
          >
            <span className="material-symbols-outlined text-[14px]">delete_forever</span>Clear History
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
