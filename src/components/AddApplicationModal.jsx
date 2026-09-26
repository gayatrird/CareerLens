import React, { useState, useEffect, useRef } from 'react';
import {
  findDuplicateApplication,
  extractJobApplicationPrefill,
  findAnalysisForResume,
} from '../services/jobMatch';
import {
  loadSavedResumes,
  saveResume,
  parseResumeFile,
} from '../services/savedResume';
import { getResumeFingerprint, getUserUid } from '../services/userStorage';
import { auth } from '../services/firebase';

const STATUS_OPTIONS = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];

function formatLastUsed(ts) {
  if (!ts) return 'Recently';
  const diffSec = Math.floor((Date.now() - Number(ts)) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

export default function AddApplicationModal({
  isOpen,
  onClose,
  onSave,
  initialData = {},
  currentAnalysis = null,
  existingApplications = [],
  onPrefillShortcut,
  user = null,
  title = 'Add Job Application',
}) {
  const theme = useTheme();
  const isLight = theme === 'light';
  const isNavy = theme === 'navy';

  const backdropClass = isLight
    ? 'bg-transparent backdrop-blur-[6px]'
    : isNavy
    ? 'bg-[#0B132B]/65 backdrop-blur-sm'
    : 'bg-black/60 backdrop-blur-sm';

  const fileInputRef = useRef(null);
  const [savedResumes, setSavedResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [prefillNotice, setPrefillNotice] = useState('');

  const [formCompany, setFormCompany] = useState('');
  const [formJobTitle, setFormJobTitle] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formAppDate, setFormAppDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState('Saved');
  const [formJobDescription, setFormJobDescription] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formMatchScore, setFormMatchScore] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);

  const uid = getUserUid(user?.uid || auth?.currentUser?.uid);

  // Sync saved resumes and active resume on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    (async () => {
      const resumes = await loadSavedResumes(uid).catch(() => []);
      if (!isMounted) return;
      const list = Array.isArray(resumes) ? resumes : [];
      setSavedResumes(list);

      // Select resume:
      // 1. If explicit resumeId requested
      let chosen = null;
      if (initialData.resumeId) {
        chosen = list.find((r) => r.id === initialData.resumeId);
      }
      // 2. If currentAnalysis provided, match by resumeText content fingerprint
      if (!chosen && currentAnalysis?.resumeText) {
        const curFp = getResumeFingerprint(currentAnalysis.resumeText);
        chosen = list.find((r) => r.text && getResumeFingerprint(r.text) === curFp);
        if (!chosen) {
          chosen = {
            id: curFp,
            name: currentAnalysis.resumeName || initialData.resumeName || 'Analyzed Resume',
            text: currentAnalysis.resumeText,
          };
        }
      }
      // 3. If resumeName requested
      if (!chosen && initialData.resumeName) {
        chosen = list.find((r) => r.name === initialData.resumeName);
      }
      // 4. Default to top saved resume
      if (!chosen && list.length > 0) {
        chosen = list[0];
      }

      setSelectedResume(chosen);
      setDropdownOpen(false);
      setPrefillNotice('');
      setUploadError('');
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen, uid, initialData.resumeId, initialData.resumeName, currentAnalysis]);

  // Sync initialData form fields when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setFormCompany(initialData.company || '');
      setFormJobTitle(initialData.jobTitle || '');
      setFormLocation(initialData.location || '');
      setFormAppDate(initialData.applicationDate || new Date().toISOString().split('T')[0]);
      setFormStatus(initialData.status || 'Saved');
      setFormJobDescription(initialData.jobDescription || '');
      setFormNotes(initialData.notes || '');
      setFormMatchScore(
        initialData.matchScore !== null && initialData.matchScore !== undefined
          ? String(initialData.matchScore)
          : ''
      );
      setFormErrors({});
      setShowDuplicateConfirm(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Real-time duplicate check
  const duplicateApp = findDuplicateApplication(
    {
      company: formCompany,
      jobTitle: formJobTitle,
      jobDescription: formJobDescription,
    },
    existingApplications
  );

  const handleSelectResume = (resumeRecord) => {
    setSelectedResume(resumeRecord);
    setDropdownOpen(false);

    if (!resumeRecord) {
      setPrefillNotice('');
      return;
    }

    const matchingAnalysis = findAnalysisForResume(resumeRecord, {
      currentAnalysis,
      explicitUid: uid,
    });

    if (matchingAnalysis) {
      const prefill = extractJobApplicationPrefill({
        jobMatch: matchingAnalysis.jobMatch,
        jobDescription: matchingAnalysis.jobDescription || '',
        resumeText: matchingAnalysis.resumeText || resumeRecord.text || '',
        companyMode: matchingAnalysis.companyMode || 'general',
        agentResults: matchingAnalysis.agentResults || {},
      });

      setFormCompany(prefill.company || '');
      setFormJobTitle(prefill.jobTitle || '');
      setFormLocation(prefill.location || '');
      setFormJobDescription(prefill.jobDescription || '');
      setFormMatchScore(
        prefill.matchScore !== null && prefill.matchScore !== undefined
          ? String(prefill.matchScore)
          : ''
      );
      setPrefillNotice('');
    } else {
      setFormCompany('');
      setFormJobTitle('');
      setFormLocation('');
      setFormJobDescription('');
      setFormMatchScore('');
      setPrefillNotice('No analysis found for this resume yet.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError('');
    try {
      const parsed = await parseResumeFile(file);
      await saveResume(parsed, uid);
      const updatedList = await loadSavedResumes(uid);
      setSavedResumes(updatedList);
      const newlySaved =
        updatedList.find((r) => r.id === parsed.id || r.name === parsed.name) ||
        updatedList[0];
      handleSelectResume(newlySaved);
    } catch (err) {
      setUploadError(err.message || 'Failed to upload resume file.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRefreshFromSelectedResume = () => {
    if (!selectedResume) {
      setPrefillNotice('Please select a resume first.');
      return;
    }
    handleSelectResume(selectedResume);
  };

  const handleSubmit = (e, bypassDuplicate = false) => {
    if (e && e.preventDefault) e.preventDefault();
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

    // Duplicate check: require explicit confirmation if exact duplicate is detected
    if (duplicateApp && !bypassDuplicate && !showDuplicateConfirm) {
      setShowDuplicateConfirm(true);
      return;
    }

    onSave({
      company: formCompany.trim(),
      jobTitle: formJobTitle.trim(),
      location: formLocation.trim(),
      applicationDate: formAppDate || new Date().toISOString().split('T')[0],
      status: formStatus || 'Saved',
      jobDescription: formJobDescription.trim(),
      notes: formNotes.trim(),
      matchScore: parsedScore,
      resumeId: selectedResume?.id || null,
      resumeName: selectedResume?.name || null,
    });
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-overlay ${backdropClass} animate-fade-in-up`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#171A20] border border-[#2D2F36] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272A]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4F7DF3] text-[20px]">add_circle</span>
            <h3 className="font-headline-md text-lg text-[#FAFAFA] font-bold">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#71717A] hover:text-[#FAFAFA] transition-colors p-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* RESUME SELECTOR SECTION */}
          <div>
            <label className="font-label-caps text-[#A1A1AA] text-[10px] block mb-1.5 font-semibold">
              RESUME
            </label>
            <div className="relative">
              {/* Compact active resume selector */}
              <div
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="w-full bg-[#111318] border border-[#27272A] hover:border-[#3F3F46] rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="material-symbols-outlined text-[#4F7DF3] text-[18px] shrink-0">
                    description
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#FAFAFA] truncate">
                      {selectedResume ? selectedResume.name : 'No resume selected'}
                    </p>
                    {selectedResume?.lastUsedAt && (
                      <p className="text-[10px] text-[#71717A] truncate">
                        Last used • {formatLastUsed(selectedResume.lastUsedAt)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-[#71717A]">
                  <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>
              </div>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-[#171A20] border border-[#27272A] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in-up">
                  <div className="max-h-56 overflow-y-auto divide-y divide-[#27272A]/60">
                    {savedResumes.length === 0 ? (
                      <div className="p-3 text-xs text-[#71717A] text-center italic">
                        No saved resumes found
                      </div>
                    ) : (
                      savedResumes.map((r) => {
                        const isSelected = selectedResume?.id === r.id;
                        return (
                          <div
                            key={r.id || r.name}
                            onClick={() => handleSelectResume(r)}
                            className={`px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#4F7DF3]/10 transition-colors cursor-pointer ${
                              isSelected ? 'bg-[#4F7DF3]/15' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span
                                className={`material-symbols-outlined text-[16px] shrink-0 ${
                                  isSelected ? 'text-[#22C55E]' : 'text-[#52525B]'
                                }`}
                                style={isSelected ? { fontVariationSettings: "'FILL' 1" } : {}}
                              >
                                {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs truncate ${isSelected ? 'text-[#FAFAFA] font-semibold' : 'text-[#D4D4D8]'}`}>
                                  {r.name}
                                </p>
                                {r.lastUsedAt && (
                                  <p className="text-[10px] text-[#71717A] truncate">
                                    Last used • {formatLastUsed(r.lastUsedAt)}
                                  </p>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <span className="text-[10px] text-[#22C55E] font-medium shrink-0">
                                Selected
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* + Upload New Resume Button */}
                  <div className="p-2 border-t border-[#27272A] bg-[#111318]/50">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#4F7DF3] hover:text-[#709BFF] hover:bg-[#4F7DF3]/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">upload_file</span>
                      <span>{isUploading ? 'Uploading...' : '+ Upload New Resume'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>
            {uploadError && (
              <p className="text-[11px] text-red-400 mt-1">{uploadError}</p>
            )}
          </div>

          {/* Refresh from selected resume's analysis */}
          <div className="bg-[#111318] border border-[#27272A] p-2.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#71717A] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-[#4F7DF3]">auto_awesome</span>
                Refresh from selected resume
              </span>
              <button
                type="button"
                onClick={handleRefreshFromSelectedResume}
                className="text-xs text-[#4F7DF3] hover:underline font-semibold cursor-pointer shrink-0"
              >
                Refresh
              </button>
            </div>
            {prefillNotice && (
              <p className="text-[11px] text-[#A1A1AA] italic pl-5 animate-fade-in-up">
                {prefillNotice}
              </p>
            )}
          </div>

          {/* Duplicate Detection Alert */}
          {duplicateApp && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-xs text-amber-300 space-y-2 animate-fade-in-up">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-400 text-[18px] shrink-0 mt-0.5">
                  warning
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-amber-200">Application Already Exists</p>
                  <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                    An application for <strong className="text-white">{duplicateApp.company}</strong> as{' '}
                    <strong className="text-white">{duplicateApp.jobTitle}</strong> is already in your tracker
                    (Date: {duplicateApp.applicationDate || 'Recent'}, Status: {duplicateApp.status}).
                  </p>
                </div>
              </div>

              {showDuplicateConfirm && (
                <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-amber-200">Save a duplicate record anyway?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDuplicateConfirm(false)}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-transparent hover:bg-amber-500/10 text-amber-300 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleSubmit(e, true)}
                      className="px-3 py-1 text-[11px] rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-colors cursor-pointer"
                    >
                      Yes, Save Duplicate
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Company & Job Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-label-caps text-[#A1A1AA] text-[10px] block mb-1.5 font-semibold">
                COMPANY NAME *
              </label>
              <input
                type="text"
                value={formCompany}
                onChange={(e) => {
                  setFormCompany(e.target.value);
                  setShowDuplicateConfirm(false);
                }}
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
                onChange={(e) => {
                  setFormJobTitle(e.target.value);
                  setShowDuplicateConfirm(false);
                }}
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

          {/* Match Score */}
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

          {/* Job Description */}
          <div>
            <label className="font-label-caps text-[#A1A1AA] text-[10px] block mb-1.5 font-semibold">
              JOB DESCRIPTION (OPTIONAL)
            </label>
            <textarea
              rows={3}
              value={formJobDescription}
              onChange={(e) => {
                setFormJobDescription(e.target.value);
                setShowDuplicateConfirm(false);
              }}
              placeholder="Paste key responsibilities or full job description here..."
              className="w-full bg-[#111318] border border-[#27272A] focus:border-[#4F7DF3] rounded-xl p-3 text-xs text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none transition-colors resize-y leading-relaxed"
            />
          </div>

          {/* Notes */}
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
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#4F7DF3] hover:bg-[#4069D0] text-white text-xs font-label-caps tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-[0_4px_16px_rgba(79,125,243,0.3)] cursor-pointer"
            >
              {duplicateApp && showDuplicateConfirm ? 'Save Duplicate' : 'Save Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
