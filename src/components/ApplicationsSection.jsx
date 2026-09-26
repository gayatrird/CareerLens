import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { auth, onAuthStateChanged } from '../services/firebase';
import {
  getStoredApplications,
  addStoredApplication,
  updateStoredApplication,
  deleteStoredApplication,
  getStoredLastAnalysis,
} from '../services/userStorage';

const STATUS_OPTIONS = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];

const STATUS_CONFIG = {
  Saved: {
    label: 'Saved',
    icon: 'bookmark',
    badgeCls: 'bg-[#27272A] text-[#A1A1AA] border-[#3F3F46]',
    dotCls: 'bg-[#71717A]',
  },
  Applied: {
    label: 'Applied',
    icon: 'send',
    badgeCls: 'bg-[#4F7DF3]/15 text-[#4F7DF3] border-[#4F7DF3]/30',
    dotCls: 'bg-[#4F7DF3]',
  },
  Interview: {
    label: 'Interview',
    icon: 'record_voice_over',
    badgeCls: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    dotCls: 'bg-purple-400',
  },
  Offer: {
    label: 'Offer',
    icon: 'verified',
    badgeCls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dotCls: 'bg-emerald-400',
  },
  Rejected: {
    label: 'Rejected',
    icon: 'cancel',
    badgeCls: 'bg-red-500/15 text-red-400 border-red-500/30',
    dotCls: 'bg-red-400',
  },
};

function formatRelativeTime(ts) {
  if (!ts) return 'Recently';
  const time = typeof ts === 'number' ? ts : new Date(ts).getTime();
  if (isNaN(time)) return 'Recently';
  const diffMs = Date.now() - time;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) {
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function useTheme() {
  const [theme, setTheme] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.getAttribute('data-theme') || 'dark'
      : 'dark'
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export default function ApplicationsSection({ onNavigate }) {
  const theme = useTheme();
  const isLight = theme === 'light';
  const isNavy = theme === 'navy';

  const backdropClass = isLight
    ? 'bg-transparent backdrop-blur-[6px]'
    : isNavy
    ? 'bg-[#0B132B]/65 backdrop-blur-sm'
    : 'bg-black/60 backdrop-blur-sm';

  const [currentUser, setCurrentUser] = useState(() => auth?.currentUser || null);
  const [applications, setApplications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingApp, setViewingApp] = useState(null);
  const [deleteConfirmApp, setDeleteConfirmApp] = useState(null);

  // Form State for Add Application
  const [formCompany, setFormCompany] = useState('');
  const [formJobTitle, setFormJobTitle] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formAppDate, setFormAppDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState('Saved');
  const [formJobDescription, setFormJobDescription] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formMatchScore, setFormMatchScore] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Editable notes state inside the View Modal
  const [modalNotes, setModalNotes] = useState('');
  const [notesSaveNotice, setNotesSaveNotice] = useState('');

  // 1. Sync auth and load user-scoped applications
  useEffect(() => {
    const uid = currentUser?.uid || 'anonymous';
    const loaded = getStoredApplications(uid);
    setApplications(Array.isArray(loaded) ? loaded : []);

    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      const userUid = user?.uid || 'anonymous';
      const userApps = getStoredApplications(userUid);
      setApplications(Array.isArray(userApps) ? userApps : []);
    });
    return () => unsubscribe();
  }, [currentUser?.uid]);

  const reloadApplications = useCallback(() => {
    const uid = currentUser?.uid || 'anonymous';
    const loaded = getStoredApplications(uid);
    setApplications(Array.isArray(loaded) ? loaded : []);
  }, [currentUser?.uid]);

  // When opening viewing modal, sync notes
  useEffect(() => {
    if (viewingApp) {
      setModalNotes(viewingApp.notes || '');
      setNotesSaveNotice('');
    }
  }, [viewingApp]);

  // Pre-fill helper from latest analysis if form fields are empty
  const handlePrefillFromAnalysis = () => {
    try {
      const lastAnalysis = getStoredLastAnalysis(currentUser?.uid);
      if (lastAnalysis) {
        const role = lastAnalysis.jobMatch?.targetRole || lastAnalysis.agentResults?.ats?.detectedRole || '';
        const company = lastAnalysis.jobMatch?.targetCompany || (lastAnalysis.companyMode && lastAnalysis.companyMode !== 'general' ? lastAnalysis.companyMode : '');
        const score = lastAnalysis.jobMatch?.overallScore || lastAnalysis.agentResults?.ats?.score || '';
        const jd = lastAnalysis.jobDescription || '';

        if (company && !formCompany) setFormCompany(company.charAt(0).toUpperCase() + company.slice(1));
        if (role && !formJobTitle) setFormJobTitle(role);
        if (score && !formMatchScore) setFormMatchScore(String(score));
        if (jd && !formJobDescription) setFormJobDescription(jd);
      }
    } catch (_) {}
  };

  // 2. Add Application Handler
  const handleOpenAddModal = () => {
    setFormCompany('');
    setFormJobTitle('');
    setFormLocation('');
    setFormAppDate(new Date().toISOString().split('T')[0]);
    setFormStatus('Saved');
    setFormJobDescription('');
    setFormNotes('');
    setFormMatchScore('');
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleSaveNewApplication = (e) => {
    e.preventDefault();
    const errors = {};
    if (!formCompany.trim()) {
      errors.company = 'Company name is required';
    }
    if (!formJobTitle.trim()) {
      errors.jobTitle = 'Job title is required';
    }

    let parsedScore = null;
    if (formMatchScore.trim() !== '') {
      const num = parseInt(formMatchScore, 10);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        parsedScore = num;
      } else {
        errors.matchScore = 'Score must be between 0 and 100';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const uid = currentUser?.uid || 'anonymous';
    const created = addStoredApplication(
      {
        company: formCompany.trim(),
        jobTitle: formJobTitle.trim(),
        location: formLocation.trim(),
        applicationDate: formAppDate || new Date().toISOString().split('T')[0],
        status: formStatus || 'Saved',
        jobDescription: formJobDescription.trim(),
        notes: formNotes.trim(),
        matchScore: parsedScore,
      },
      uid
    );

    if (created) {
      reloadApplications();
      setIsAddModalOpen(false);
    }
  };

  // 3. Status Change Handler
  const handleStatusChange = (appId, newStatus) => {
    const uid = currentUser?.uid || 'anonymous';
    const updated = updateStoredApplication(appId, { status: newStatus }, uid);
    if (updated) {
      reloadApplications();
      if (viewingApp && viewingApp.id === appId) {
        setViewingApp(updated);
      }
    }
  };

  // 4. Update Notes Handler
  const handleSaveModalNotes = () => {
    if (!viewingApp) return;
    const uid = currentUser?.uid || 'anonymous';
    const updated = updateStoredApplication(viewingApp.id, { notes: modalNotes.trim() }, uid);
    if (updated) {
      reloadApplications();
      setViewingApp(updated);
      setNotesSaveNotice('Notes saved successfully');
      setTimeout(() => setNotesSaveNotice(''), 2500);
    }
  };

  // 5. Delete Application Handler
  const handleDeleteApplication = (app) => {
    if (!app) return;
    const uid = currentUser?.uid || 'anonymous';
    const success = deleteStoredApplication(app.id, uid);
    if (success) {
      reloadApplications();
      if (viewingApp && viewingApp.id === app.id) {
        setViewingApp(null);
      }
      setDeleteConfirmApp(null);
    }
  };

  // 6. Summary Counts
  const counts = useMemo(() => {
    const res = { ALL: applications.length, Saved: 0, Applied: 0, Interview: 0, Offer: 0, Rejected: 0 };
    applications.forEach((a) => {
      if (res[a.status] !== undefined) {
        res[a.status]++;
      }
    });
    return res;
  }, [applications]);

  // 7. Filtered & Searched Applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Status filter
      if (statusFilter !== 'ALL' && app.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const comp = (app.company || '').toLowerCase();
        const title = (app.jobTitle || '').toLowerCase();
        const loc = (app.location || '').toLowerCase();
        if (!comp.includes(q) && !title.includes(q) && !loc.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [applications, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* ─── 1. TOP HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="material-symbols-outlined text-[#4F7DF3] text-[20px]">
              business_center
            </span>
            <span className="font-label-caps text-[#4F7DF3] tracking-widest text-[11px] font-semibold">
              CAREER PIPELINE
            </span>
            <span className="bg-[#4F7DF3]/15 text-[#4F7DF3] border border-[#4F7DF3]/30 text-[9px] font-label-caps tracking-widest px-2 py-0.5 rounded-full font-semibold">
              STAGE 1
            </span>
          </div>
          <h1 className="font-headline-md text-2xl md:text-3xl text-[#FAFAFA] tracking-tight font-bold">
            Applications
          </h1>
          <p className="text-[#71717A] text-xs md:text-sm mt-1">
            Track, manage, and organize your job applications across every stage of the hiring pipeline in one place.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="bg-[#4F7DF3] hover:bg-[#4069D0] text-white text-xs font-label-caps tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-[0_4px_16px_rgba(79,125,243,0.3)] flex items-center justify-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add Application</span>
        </button>
      </div>

      {/* ─── 2. SUMMARY METRICS ROW ────────────────────────────────────────── */}
      {applications.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            { id: 'ALL', label: 'Total', count: counts.ALL, icon: 'layers', color: 'text-[#FAFAFA]', border: 'border-[#2D2F36]' },
            { id: 'Saved', label: 'Saved', count: counts.Saved, icon: 'bookmark', color: 'text-[#A1A1AA]', border: 'border-[#3F3F46]' },
            { id: 'Applied', label: 'Applied', count: counts.Applied, icon: 'send', color: 'text-[#4F7DF3]', border: 'border-[#4F7DF3]/40' },
            { id: 'Interview', label: 'Interview', count: counts.Interview, icon: 'record_voice_over', color: 'text-purple-400', border: 'border-purple-500/40' },
            { id: 'Offer', label: 'Offer', count: counts.Offer, icon: 'verified', color: 'text-emerald-400', border: 'border-emerald-500/40' },
            { id: 'Rejected', label: 'Rejected', count: counts.Rejected, icon: 'cancel', color: 'text-red-400', border: 'border-red-500/40' },
          ].map((stat) => (
            <div
              key={stat.id}
              onClick={() => setStatusFilter(stat.id)}
              className={`bg-[#171A20] border ${stat.border} rounded-xl p-3 flex flex-col justify-between cursor-pointer hover:bg-[#1C2028] transition-all ${
                statusFilter === stat.id ? 'ring-1 ring-[#4F7DF3]' : ''
              }`}
            >
              <div className="flex items-center justify-between text-[#71717A] mb-1">
                <span className="text-[10px] font-label-caps tracking-wider">{stat.label}</span>
                <span className={`material-symbols-outlined text-[15px] ${stat.color}`}>{stat.icon}</span>
              </div>
              <span className={`text-lg font-bold ${stat.color}`}>{stat.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── 3. SEARCH & STATUS FILTERS ───────────────────────────────────── */}
      {applications.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#171A20] border border-[#2D2F36] p-2 md:p-2.5 rounded-2xl">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All', count: counts.ALL },
              { id: 'Saved', label: 'Saved', count: counts.Saved },
              { id: 'Applied', label: 'Applied', count: counts.Applied },
              { id: 'Interview', label: 'Interview', count: counts.Interview },
              { id: 'Offer', label: 'Offer', count: counts.Offer },
              { id: 'Rejected', label: 'Rejected', count: counts.Rejected },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#4F7DF3] text-white shadow-[0_2px_10px_rgba(79,125,243,0.3)] font-semibold'
                      : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#111318]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#27272A] text-[#71717A]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px] md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[#71717A]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, job title..."
              className="w-full bg-[#111318] border border-[#27272A] rounded-xl pl-9 pr-8 py-1.5 text-xs text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#4F7DF3] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── 4. MAIN APPLICATIONS CONTENT ─────────────────────────────────── */}
      {applications.length === 0 ? (
        /* Empty State */
        <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-10 md:p-16 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-[#4F7DF3]/15 border border-[#4F7DF3]/30 flex items-center justify-center mb-5 shadow-[0_0_24px_rgba(79,125,243,0.15)]">
            <span className="material-symbols-outlined text-3xl text-[#4F7DF3]">business_center</span>
          </div>

          <h3 className="font-headline-md text-lg md:text-xl text-[#FAFAFA] font-semibold mb-2">
            No applications yet
          </h3>

          <p className="text-xs md:text-sm text-[#71717A] max-w-md leading-relaxed mb-6">
            Track your job hunt pipeline in one place. Add jobs you’re applying for, track interview stages, save recruiter notes, and record offers.
          </p>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="bg-[#4F7DF3] hover:bg-[#4069D0] text-white text-xs font-label-caps tracking-wider px-6 py-3 rounded-xl transition-all shadow-[0_4px_16px_rgba(79,125,243,0.3)] flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add Your First Application</span>
          </button>
        </div>
      ) : filteredApplications.length === 0 ? (
        /* Filter/Search Empty State */
        <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-[#52525B] mb-3">search_off</span>
          <h3 className="text-sm font-semibold text-[#FAFAFA] mb-1">No matching applications</h3>
          <p className="text-xs text-[#71717A] mb-4">
            No applications match your current search query or filter criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
            className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] text-xs font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Clear Search & Filters
          </button>
        </div>
      ) : (
        /* Applications Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApplications.map((app) => {
            const statusCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.Saved;
            return (
              <div
                key={app.id}
                className="bg-[#171A20] border border-[#2D2F36] hover:border-[#3F3F46] rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] group"
              >
                {/* Top Section */}
                <div>
                  {/* Status Badge + Match Score */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="relative inline-block">
                      <select
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        className={`text-[10px] font-label-caps font-semibold px-2.5 py-1 rounded-full border cursor-pointer appearance-none pr-6 focus:outline-none transition-colors ${statusCfg.badgeCls}`}
                        title="Click to change status"
                      >
                        {STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st} className="bg-[#18181B] text-[#FAFAFA]">
                            {st}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined text-[13px] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70">
                        expand_more
                      </span>
                    </div>

                    {typeof app.matchScore === 'number' && (
                      <span
                        className={`text-[10px] font-label-caps font-bold px-2 py-0.5 rounded-full border ${
                          app.matchScore >= 80
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : app.matchScore >= 60
                            ? 'bg-[#4F7DF3]/15 text-[#4F7DF3] border-[#4F7DF3]/30'
                            : 'bg-amber-400/15 text-amber-400 border-amber-400/30'
                        }`}
                        title="Job Match Score"
                      >
                        {app.matchScore}% Match
                      </span>
                    )}
                  </div>

                  {/* Job Title & Company */}
                  <h3
                    onClick={() => setViewingApp(app)}
                    className="text-base font-semibold text-[#FAFAFA] group-hover:text-[#4F7DF3] transition-colors leading-snug cursor-pointer"
                    title={app.jobTitle}
                  >
                    {app.jobTitle}
                  </h3>

                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#A1A1AA]">
                    <span className="material-symbols-outlined text-[15px] text-[#4F7DF3]">apartment</span>
                    <span className="font-medium text-[#FAFAFA]">{app.company}</span>
                  </div>

                  {app.location && (
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#71717A]">
                      <span className="material-symbols-outlined text-[13px]">location_on</span>
                      <span>{app.location}</span>
                    </div>
                  )}

                  {/* Notes Snippet */}
                  {app.notes && (
                    <div className="mt-3 p-2.5 rounded-xl bg-[#111318] border border-[#27272A] text-[11px] text-[#A1A1AA] line-clamp-2 leading-relaxed">
                      <span className="font-semibold text-[#71717A]">Note: </span>
                      {app.notes}
                    </div>
                  )}
                </div>

                {/* Footer Metadata & Actions */}
                <div className="mt-4 pt-3.5 border-t border-[#27272A] flex items-center justify-between gap-2">
                  <div className="text-[10px] text-[#71717A] flex flex-col">
                    <span>Applied: {formatDate(app.applicationDate)}</span>
                    <span className="text-[9px] text-[#52525B]">Updated {formatRelativeTime(app.updatedAt)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmApp(app)}
                      className="text-[#52525B] hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete application"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewingApp(app)}
                      className="bg-[#111318] hover:bg-[#27272A] border border-[#27272A] hover:border-[#3F3F46] text-[#FAFAFA] text-xs font-medium px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>View</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── 5. ADD APPLICATION MODAL ─────────────────────────────────────── */}
      {isAddModalOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-overlay ${backdropClass} animate-fade-in-up`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div
            className="bg-[#171A20] border border-[#2D2F36] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272A]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4F7DF3] text-[20px]">add_circle</span>
                <h3 className="font-headline-md text-lg text-[#FAFAFA] font-bold">Add Job Application</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#71717A] hover:text-[#FAFAFA] transition-colors p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewApplication} className="p-6 space-y-4">
              {/* Optional Prefill Shortcut */}
              <div className="flex items-center justify-between bg-[#111318] border border-[#27272A] p-2.5 rounded-xl">
                <span className="text-[11px] text-[#71717A] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#4F7DF3]">auto_awesome</span>
                  Prefill with data from your latest resume analysis?
                </span>
                <button
                  type="button"
                  onClick={handlePrefillFromAnalysis}
                  className="text-xs text-[#4F7DF3] hover:underline font-semibold cursor-pointer"
                >
                  Prefill
                </button>
              </div>

              {/* Company & Job Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-[#A1A1AA] text-[10px] block mb-1.5 font-semibold">
                    COMPANY NAME *
                  </label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="e.g. TCS, Apollo Hospitals, ABC School"
                    className={`w-full bg-[#111318] border rounded-xl px-3.5 py-2 text-xs text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none transition-colors ${
                      formErrors.company ? 'border-red-500' : 'border-[#27272A] focus:border-[#4F7DF3]'
                    }`}
                  />
                  {formErrors.company && (
                    <p className="text-[11px] text-red-400 mt-1">{formErrors.company}</p>
                  )}
                </div>

                <div>
                  <label className="font-label-caps text-[#A1A1AA] text-[10px] block mb-1.5 font-semibold">
                    JOB TITLE *
                  </label>
                  <input
                    type="text"
                    value={formJobTitle}
                    onChange={(e) => setFormJobTitle(e.target.value)}
                    placeholder="e.g. Software Developer, Registered Nurse, Primary School Teacher"
                    className={`w-full bg-[#111318] border rounded-xl px-3.5 py-2 text-xs text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none transition-colors ${
                      formErrors.jobTitle ? 'border-red-500' : 'border-[#27272A] focus:border-[#4F7DF3]'
                    }`}
                  />
                  {formErrors.jobTitle && (
                    <p className="text-[11px] text-red-400 mt-1">{formErrors.jobTitle}</p>
                  )}
                </div>
              </div>

              {/* Location, Date, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-label-caps text-[#A1A1AA] text-[10px] block mb-1.5 font-semibold">
                    LOCATION
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Mumbai, Remote, Pune"
                    className="w-full bg-[#111318] border border-[#27272A] focus:border-[#4F7DF3] rounded-xl px-3.5 py-2 text-xs text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="font-label-caps text-[#A1A1AA] text-[10px] block mb-1.5 font-semibold">
                    APPLICATION DATE
                  </label>
                  <input
                    type="date"
                    value={formAppDate}
                    onChange={(e) => setFormAppDate(e.target.value)}
                    className="w-full bg-[#111318] border border-[#27272A] focus:border-[#4F7DF3] rounded-xl px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="font-label-caps text-[#A1A1AA] text-[10px] block mb-1.5 font-semibold">
                    STATUS
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-[#111318] border border-[#27272A] focus:border-[#4F7DF3] rounded-xl px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none transition-colors"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st} className="bg-[#18181B] text-[#FAFAFA]">
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Match Score (optional) */}
              <div>
                <label className="font-label-caps text-[#A1A1AA] text-[10px] block mb-1.5 font-semibold">
                  JOB MATCH SCORE (OPTIONAL, 0–100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formMatchScore}
                  onChange={(e) => setFormMatchScore(e.target.value)}
                  placeholder="e.g. 85"
                  className={`w-full bg-[#111318] border rounded-xl px-3.5 py-2 text-xs text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none transition-colors ${
                    formErrors.matchScore ? 'border-red-500' : 'border-[#27272A] focus:border-[#4F7DF3]'
                  }`}
                />
                {formErrors.matchScore && (
                  <p className="text-[11px] text-red-400 mt-1">{formErrors.matchScore}</p>
                )}
              </div>

              {/* Job Description (optional) */}
              <div>
                <label className="font-label-caps text-[#A1A1AA] text-[10px] block mb-1.5 font-semibold">
                  JOB DESCRIPTION (OPTIONAL)
                </label>
                <textarea
                  rows={3}
                  value={formJobDescription}
                  onChange={(e) => setFormJobDescription(e.target.value)}
                  placeholder="Paste key responsibilities or full job description here..."
                  className="w-full bg-[#111318] border border-[#27272A] focus:border-[#4F7DF3] rounded-xl p-3 text-xs text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none transition-colors resize-y leading-relaxed"
                />
              </div>

              {/* Notes (optional) */}
              <div>
                <label className="font-label-caps text-[#A1A1AA] text-[10px] block mb-1.5 font-semibold">
                  NOTES (OPTIONAL)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Reached out to recruiter, sent follow up email, referral info..."
                  className="w-full bg-[#111318] border border-[#27272A] focus:border-[#4F7DF3] rounded-xl p-3 text-xs text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none transition-colors resize-y leading-relaxed"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#4F7DF3] hover:bg-[#4069D0] text-white text-xs font-label-caps tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-[0_4px_16px_rgba(79,125,243,0.3)] cursor-pointer"
                >
                  Save Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 6. VIEW / EDIT APPLICATION MODAL ─────────────────────────────── */}
      {viewingApp && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-overlay ${backdropClass} animate-fade-in-up`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingApp(null);
          }}
        >
          <div
            className="bg-[#171A20] border border-[#2D2F36] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-[#27272A]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[16px] text-[#4F7DF3]">apartment</span>
                  <span className="text-xs font-semibold text-[#4F7DF3]">{viewingApp.company}</span>
                  {viewingApp.location && (
                    <>
                      <span className="text-[#52525B]">•</span>
                      <span className="text-xs text-[#71717A]">{viewingApp.location}</span>
                    </>
                  )}
                </div>
                <h2 className="font-headline-md text-xl text-[#FAFAFA] font-bold">
                  {viewingApp.jobTitle}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setViewingApp(null)}
                className="text-[#71717A] hover:text-[#FAFAFA] transition-colors p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Status & Pipeline Lifecycle Bar */}
              <div className="bg-[#111318] border border-[#27272A] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-label-caps text-[#A1A1AA] text-[10px] font-semibold">
                    PIPELINE STAGE
                  </span>
                  <span className="text-[11px] text-[#71717A]">
                    Current Status: <strong className="text-[#FAFAFA]">{viewingApp.status}</strong>
                  </span>
                </div>

                {/* Status Switcher Buttons */}
                <div className="grid grid-cols-5 gap-1.5">
                  {STATUS_OPTIONS.map((st) => {
                    const isCurrent = viewingApp.status === st;
                    const cfg = STATUS_CONFIG[st];
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleStatusChange(viewingApp.id, st)}
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all cursor-pointer border ${
                          isCurrent
                            ? `${cfg.badgeCls} font-bold shadow-[0_2px_10px_rgba(79,125,243,0.2)]`
                            : 'bg-[#171A20] border-[#27272A] text-[#71717A] hover:text-[#FAFAFA] hover:border-[#3F3F46]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px] mb-0.5">{cfg.icon}</span>
                        <span className="text-[10px] leading-tight">{st}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Info Grid: Date, Match Score, Created, Updated */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#111318] border border-[#27272A] rounded-xl p-3.5 text-xs">
                <div>
                  <span className="text-[10px] text-[#71717A] block font-label-caps">APPLICATION DATE</span>
                  <span className="font-medium text-[#FAFAFA] mt-0.5 block">{formatDate(viewingApp.applicationDate)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#71717A] block font-label-caps">MATCH SCORE</span>
                  <span className="font-medium text-[#FAFAFA] mt-0.5 block">
                    {typeof viewingApp.matchScore === 'number' ? `${viewingApp.matchScore}%` : 'Not evaluated'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#71717A] block font-label-caps">ADDED</span>
                  <span className="font-medium text-[#FAFAFA] mt-0.5 block">{formatRelativeTime(viewingApp.createdAt)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#71717A] block font-label-caps">LAST UPDATED</span>
                  <span className="font-medium text-[#FAFAFA] mt-0.5 block">{formatRelativeTime(viewingApp.updatedAt)}</span>
                </div>
              </div>

              {/* Job Description (if present) */}
              {viewingApp.jobDescription ? (
                <div>
                  <label className="font-label-caps text-[#A1A1AA] text-[10px] block mb-2 font-semibold">
                    JOB DESCRIPTION
                  </label>
                  <div className="bg-[#111318] border border-[#27272A] rounded-xl p-4 text-xs text-[#FAFAFA] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {viewingApp.jobDescription}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#71717A] italic bg-[#111318]/50 border border-[#27272A] rounded-xl p-3">
                  No job description recorded for this application.
                </div>
              )}

              {/* Editable Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-label-caps text-[#A1A1AA] text-[10px] font-semibold">
                    APPLICATION NOTES
                  </label>
                  {notesSaveNotice && (
                    <span className="text-[11px] text-emerald-400 font-medium animate-fade-in-up">
                      {notesSaveNotice}
                    </span>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Record interview notes, compensation details, recruiter contacts, or next steps..."
                  className="w-full bg-[#111318] border border-[#27272A] focus:border-[#4F7DF3] rounded-xl p-3 text-xs text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none transition-colors resize-y leading-relaxed"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={handleSaveModalNotes}
                    className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] text-xs font-medium px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[15px]">save</span>
                    <span>Save Notes</span>
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmApp(viewingApp)}
                  className="text-red-400 hover:text-red-300 text-xs font-medium flex items-center gap-1.5 p-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span>Delete Application</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingApp(null)}
                  className="bg-[#4F7DF3] hover:bg-[#4069D0] text-white text-xs font-label-caps tracking-wider px-5 py-2 rounded-xl transition-all shadow-[0_4px_16px_rgba(79,125,243,0.3)] cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. DELETE CONFIRMATION DIALOG ────────────────────────────────── */}
      {deleteConfirmApp && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-overlay ${backdropClass} animate-fade-in-up`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteConfirmApp(null);
          }}
        >
          <div
            className="bg-[#171A20] border border-[#2D2F36] rounded-2xl w-full max-w-md p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3 text-red-400">
              <span className="material-symbols-outlined text-2xl">warning</span>
              <h3 className="font-headline-md text-base text-[#FAFAFA] font-bold">
                Delete Application?
              </h3>
            </div>
            <p className="text-xs text-[#A1A1AA] leading-relaxed mb-5">
              Are you sure you want to delete the application for{' '}
              <strong className="text-[#FAFAFA]">{deleteConfirmApp.jobTitle}</strong> at{' '}
              <strong className="text-[#FAFAFA]">{deleteConfirmApp.company}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmApp(null)}
                className="px-4 py-2 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteApplication(deleteConfirmApp)}
                className="bg-red-500 hover:bg-red-600 text-white text-xs font-label-caps tracking-wider px-4 py-2 rounded-xl transition-all shadow-[0_4px_16px_rgba(239,68,68,0.3)] cursor-pointer"
              >
                Delete Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
