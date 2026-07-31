import React, { useState, useEffect } from 'react';
import { getMasterVolume, setMasterVolume, playTestSound } from '../utils/audio';
import { auth } from '../services/firebase';

export default function SettingsSection() {
  // Volume & Audio state
  const [volume, setVolumeState] = useState(() => Math.round(getMasterVolume() * 100));
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('hireflow_sound_enabled') !== 'false';
  });

  // Appearance State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('hireflow_theme') || 'dark';
  });

  // AI Preferences
  const [seniority, setSeniority] = useState(() => {
    return localStorage.getItem('hireflow_seniority') || 'senior';
  });

  const [aiTone, setAiTone] = useState(() => {
    return localStorage.getItem('hireflow_ai_tone') || 'balanced';
  });

  const [autoDeepScan, setAutoDeepScan] = useState(() => {
    return localStorage.getItem('hireflow_auto_deep_scan') === 'true';
  });

  const [toastMsg, setToastMsg] = useState('');

  const user = auth?.currentUser;

  // Sync volume change
  const handleVolumeChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setVolumeState(val);
    setMasterVolume(val / 100);
    if (!soundEnabled && val > 0) {
      setSoundEnabled(true);
      localStorage.setItem('hireflow_sound_enabled', 'true');
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('hireflow_sound_enabled', next ? 'true' : 'false');
    if (!next) {
      setMasterVolume(0);
    } else {
      setMasterVolume(volume / 100);
      playTestSound();
    }
  };

  const handleTestAudio = () => {
    if (soundEnabled && volume > 0) {
      playTestSound();
    }
  };

  // Theme change
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('hireflow_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    showToast(`Theme switched to ${newTheme.toUpperCase()} mode!`);
  };

  // Save AI options
  const handleSeniorityChange = (val) => {
    setSeniority(val);
    localStorage.setItem('hireflow_seniority', val);
    showToast('Target seniority updated.');
  };

  const handleToneChange = (val) => {
    setAiTone(val);
    localStorage.setItem('hireflow_ai_tone', val);
    showToast('AI review tone preference saved.');
  };

  const handleToggleAutoDeepScan = () => {
    const next = !autoDeepScan;
    setAutoDeepScan(next);
    localStorage.setItem('hireflow_auto_deep_scan', next ? 'true' : 'false');
    showToast(next ? 'Auto Deep Scan enabled.' : 'Auto Deep Scan disabled.');
  };

  // Export history
  const handleExportData = () => {
    try {
      const archives = localStorage.getItem('courtroom_archives') || '[]';
      const blob = new Blob([archives], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hireflow_history_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('History exported successfully! 📁');
    } catch (e) {
      console.error(e);
      showToast('Failed to export history.');
    }
  };

  // Clear history
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all stored resume analyses? This action cannot be undone.')) {
      localStorage.removeItem('courtroom_archives');
      localStorage.removeItem('hireflow_last_analysis');
      showToast('All local analysis history cleared.');
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  return (
    <div className="animate-fade-in-up max-w-4xl mx-auto pb-16 space-y-8">
      {/* Toast popup */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#171A20] border border-[#5B8CFF]/50 text-[#5B8CFF] px-6 py-3 rounded-xl shadow-2xl z-50 animate-fade-in-up text-xs font-label-caps tracking-wider">
          {toastMsg}
        </div>
      )}

      {/* Title */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-[#5B8CFF]/15 border border-[#5B8CFF]/25 flex items-center justify-center">
          <span className="material-symbols-outlined text-[#5B8CFF] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            settings
          </span>
        </div>
        <div>
          <h2 className="font-headline-md text-xl text-[#FAFAFA] font-bold tracking-tight">Settings & Preferences</h2>
          <p className="text-xs text-[#71717A]">Customize audio, themes, AI evaluation behavior, and data storage.</p>
        </div>
      </div>

      {/* ── SECTION 1: Audio & Sound Effects ── */}
      <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-8 space-y-6 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#5B8CFF]">volume_up</span>
            <div>
              <h3 className="text-sm font-semibold text-[#FAFAFA]">Audio & Sound Effects</h3>
              <p className="text-[11px] text-[#71717A]">Control UI sound cues and master audio level.</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={handleToggleSound}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#27272A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5B8CFF]"></div>
          </label>
        </div>

        {/* Volume Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label-caps text-[#A1A1AA] uppercase tracking-wider">
              MASTER VOLUME ({soundEnabled ? `${volume}%` : 'MUTED'})
            </span>
            <button
              onClick={handleTestAudio}
              disabled={!soundEnabled || volume === 0}
              className="flex items-center gap-1.5 text-xs text-[#5B8CFF] hover:text-[#4F7CFF] bg-[#5B8CFF]/10 px-3 py-1 rounded-lg border border-[#5B8CFF]/20 disabled:opacity-40 transition-all"
            >
              <span className="material-symbols-outlined text-sm">play_arrow</span>
              Test Sound
            </button>
          </div>

          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-[#71717A] text-lg">
              {volume === 0 || !soundEnabled ? 'volume_off' : volume < 50 ? 'volume_down' : 'volume_up'}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={soundEnabled ? volume : 0}
              onChange={handleVolumeChange}
              className="w-full h-2 bg-[#27272A] rounded-lg appearance-none cursor-pointer accent-[#5B8CFF]"
            />
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Appearance & Theme ── */}
      <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-8 space-y-6 shadow-lg">
        <div className="flex items-center gap-3 border-b border-[#27272A] pb-4">
          <span className="material-symbols-outlined text-[#F59E0B]">palette</span>
          <div>
            <h3 className="text-sm font-semibold text-[#FAFAFA]">Appearance & Themes</h3>
            <p className="text-[11px] text-[#71717A]">Choose your preferred workspace aesthetic.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Dark Mode */}
          <button
            onClick={() => handleThemeChange('dark')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-28 ${
              theme === 'dark'
                ? 'bg-[#0F1115] border-[#5B8CFF] shadow-[0_0_15px_rgba(91,140,255,0.2)]'
                : 'bg-[#09090B] border-[#27272A] hover:border-[#3F3F46]'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="material-symbols-outlined text-[#5B8CFF]">dark_mode</span>
              {theme === 'dark' && <span className="w-2 h-2 rounded-full bg-[#5B8CFF]"></span>}
            </div>
            <div>
              <p className="text-xs font-bold text-[#FAFAFA]">Cyber Dark</p>
              <p className="text-[10px] text-[#71717A]">Deep slate with glowing accents</p>
            </div>
          </button>

          {/* Light Mode */}
          <button
            onClick={() => handleThemeChange('light')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-28 ${
              theme === 'light'
                ? 'bg-[#F4F4F5] border-[#5B8CFF] text-[#09090B] shadow-md'
                : 'bg-[#18181B] border-[#27272A] hover:border-[#3F3F46]'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="material-symbols-outlined text-[#F59E0B]">light_mode</span>
              {theme === 'light' && <span className="w-2 h-2 rounded-full bg-[#5B8CFF]"></span>}
            </div>
            <div>
              <p className={`text-xs font-bold ${theme === 'light' ? 'text-[#09090B]' : 'text-[#FAFAFA]'}`}>Clean Light</p>
              <p className="text-[10px] text-[#71717A]">High contrast daylight design</p>
            </div>
          </button>

          {/* Midnight Navy */}
          <button
            onClick={() => handleThemeChange('navy')}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-28 ${
              theme === 'navy'
                ? 'bg-[#0B132B] border-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                : 'bg-[#09090B] border-[#27272A] hover:border-[#3F3F46]'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="material-symbols-outlined text-[#3B82F6]">night_sight</span>
              {theme === 'navy' && <span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span>}
            </div>
            <div>
              <p className="text-xs font-bold text-[#FAFAFA]">Midnight Navy</p>
              <p className="text-[10px] text-[#71717A]">Deep sapphire tones</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── SECTION 3: AI Personalization ── */}
      <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-8 space-y-6 shadow-lg">
        <div className="flex items-center gap-3 border-b border-[#27272A] pb-4">
          <span className="material-symbols-outlined text-[#22C55E]">auto_awesome</span>
          <div>
            <h3 className="text-sm font-semibold text-[#FAFAFA]">AI Evaluation Preferences</h3>
            <p className="text-[11px] text-[#71717A]">Fine-tune how agents evaluate your resume.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Target Seniority */}
          <div>
            <label className="block text-xs font-label-caps text-[#A1A1AA] uppercase tracking-wider mb-2">
              TARGET SENIORITY LEVEL
            </label>
            <select
              value={seniority}
              onChange={(e) => handleSeniorityChange(e.target.value)}
              className="w-full bg-[#09090B] border border-[#27272A] focus:border-[#5B8CFF] text-[#FAFAFA] rounded-xl px-4 py-2.5 text-xs outline-none transition-colors"
            >
              <option value="junior">Junior (0 - 2 Years)</option>
              <option value="mid">Mid-Level (2 - 5 Years)</option>
              <option value="senior">Senior (5 - 8 Years)</option>
              <option value="lead">Lead / Staff (8+ Years)</option>
              <option value="executive">Executive / Director</option>
            </select>
          </div>

          {/* AI Review Tone */}
          <div>
            <label className="block text-xs font-label-caps text-[#A1A1AA] uppercase tracking-wider mb-2">
              AI REVIEWER TONE
            </label>
            <select
              value={aiTone}
              onChange={(e) => handleToneChange(e.target.value)}
              className="w-full bg-[#09090B] border border-[#27272A] focus:border-[#5B8CFF] text-[#FAFAFA] rounded-xl px-4 py-2.5 text-xs outline-none transition-colors"
            >
              <option value="balanced">Balanced & Strategic (Default)</option>
              <option value="strict">Strict Hiring Manager (Hard Signal)</option>
              <option value="supportive">Encouraging & Educational</option>
            </select>
          </div>
        </div>

        {/* Auto Deep Scan toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-[#27272A]">
          <div>
            <p className="text-xs font-semibold text-[#FAFAFA]">Auto-run Deep ATS Scan</p>
            <p className="text-[11px] text-[#71717A]">Automatically compute missing keywords & cover letters during analysis.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoDeepScan}
              onChange={handleToggleAutoDeepScan}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#27272A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#22C55E]"></div>
          </label>
        </div>
      </div>

      {/* ── SECTION 4: Data & Backup ── */}
      <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-8 space-y-6 shadow-lg">
        <div className="flex items-center gap-3 border-b border-[#27272A] pb-4">
          <span className="material-symbols-outlined text-[#8B5CF6]">database</span>
          <div>
            <h3 className="text-sm font-semibold text-[#FAFAFA]">Data & Account Sync</h3>
            <p className="text-[11px] text-[#71717A]">Manage local storage, history exports, and account sync.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#09090B] p-4 rounded-xl border border-[#27272A]">
          <div>
            <p className="text-xs font-bold text-[#FAFAFA]">Account Status</p>
            <p className="text-[11px] text-[#71717A]">
              {user ? `Signed in as ${user.email}` : 'Guest Mode (Data stored locally in browser)'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-label-caps ${user ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30' : 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'}`}>
            {user ? 'CLOUD SYNC ACTIVE' : 'LOCAL ONLY'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 bg-[#09090B] hover:bg-[#1C1F26] border border-[#27272A] text-[#FAFAFA] text-xs font-semibold px-5 py-2.5 rounded-xl transition-all"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export History Backup (.json)
          </button>

          <button
            onClick={handleClearHistory}
            className="flex items-center gap-2 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 text-red-400 text-xs font-semibold px-5 py-2.5 rounded-xl transition-all"
          >
            <span className="material-symbols-outlined text-sm">delete_forever</span>
            Clear History
          </button>
        </div>
      </div>
    </div>
  );
}
