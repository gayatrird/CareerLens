import React, { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from '../services/firebase';

export default function Header({ activeTab, setActiveTab }) {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setImgFailed(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!auth) {
      alert("Firebase Auth is not configured. Please add credentials to .env");
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setDropdownOpen(false);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const navClass = (tab) =>
    `font-inter uppercase tracking-[0.15em] font-semibold text-xs transition-all duration-200 pb-1 border-b-2 ${
      activeTab === tab
        ? 'text-[#5B8CFF] border-[#5B8CFF]'
        : 'text-[#71717A] hover:text-[#A1A1AA] border-transparent'
    }`;

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#0F1115]/90 backdrop-blur-xl border-b border-[#27272A] shadow-[0_1px_0_rgba(255,255,255,0.04)]">
      {/* Logo */}
      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab && setActiveTab('DOCKET')}>
        <div className="relative w-7 h-7 flex items-center justify-center rounded-[8px] bg-[#FAFAFA] border border-[#FAFAFA] group-hover:bg-[#E4E4E7] transition-all duration-300">
          <span className="text-[#09090B] font-bold text-xs tracking-tight" style={{ fontFamily: 'var(--font-inter)' }}>
            HF
          </span>
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-[15px] font-semibold text-[#FAFAFA] tracking-tight leading-none">
            HireFlow
          </span>
        </div>
      </div>

      {/* Nav + Auth */}
      <div className="flex items-center gap-6">
        {setActiveTab && (
          <nav className="hidden md:flex gap-7 items-center">
            <button className={navClass('DOCKET')} onClick={() => setActiveTab('DOCKET')}>ANALYZE</button>
            <button className={navClass('ARCHIVES')} onClick={() => setActiveTab('ARCHIVES')}>HISTORY</button>
            <button className={navClass('EVIDENCE')} onClick={() => setActiveTab('EVIDENCE')}>INTERVIEW</button>
            <button
              className={`font-inter uppercase tracking-[0.15em] font-semibold text-xs transition-all duration-200 pb-1 border-b-2 flex items-center gap-1.5 ${
                activeTab === 'DEEPSCAN'
                  ? 'text-[#F59E0B] border-[#F59E0B]'
                  : 'text-[#71717A] hover:text-[#A1A1AA] border-transparent'
              }`}
              onClick={() => setActiveTab('DEEPSCAN')}
            >
              DEEP SCAN
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25 tracking-widest">NEW</span>
            </button>
          </nav>
        )}

        {user ? (
          <div className="relative">
            <button
              className="w-8 h-8 rounded-full border border-[#3F3F46] hover:border-[#5B8CFF]/60 overflow-hidden transition-all duration-200 focus:outline-none flex items-center justify-center bg-[#18181B]"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {user.photoURL && !imgFailed ? (
                <img
                  alt="User Profile"
                  className="w-full h-full object-cover"
                  src={user.photoURL}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <span className="text-[#5B8CFF] font-semibold text-sm uppercase">
                  {(user.displayName || user.email || 'U').charAt(0)}
                </span>
              )}
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-52 bg-[#18181B] border border-[#27272A] rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.4)] z-50 overflow-hidden animate-fade-in-up">
                  <div className="px-4 py-3 border-b border-[#27272A]">
                    <p className="text-sm font-medium text-[#FAFAFA] truncate">{user.displayName || 'User'}</p>
                    <p className="text-xs text-[#71717A] truncate mt-0.5">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[#27272A] transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="bg-[#5B8CFF] hover:bg-[#4F7CFF] text-white font-label-caps px-4 py-1.5 rounded-lg transition-all duration-200 text-xs tracking-wider hover:scale-[1.02] active:scale-95"
          >
            SIGN IN
          </button>
        )}
      </div>
    </header>
  );
}
