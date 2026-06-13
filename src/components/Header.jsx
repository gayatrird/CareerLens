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

  const navClass = (tab) => `font-inter uppercase tracking-[0.2em] font-bold text-sm transition-all duration-300 pb-1 border-b ${activeTab === tab ? 'text-[#c9a84c] brightness-125 border-[#c9a84c]' : 'text-slate-500 hover:text-[#c9a84c] border-transparent'}`;

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-20 bg-[#060913]/60 backdrop-blur-2xl border-b border-primary/10 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab && setActiveTab('DOCKET')}>
        <div className="relative group-hover:scale-110 transition-transform duration-500">
          <div className="absolute inset-0 blur-md bg-primary/20 rounded-full scale-150"></div>
          <span className="material-symbols-outlined text-[#c9a84c] brightness-125 text-2xl relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
        </div>
        <div className="flex flex-col">
          <span className="text-base sm:text-2xl font-serif-large text-primary drop-shadow-[0_0_15px_rgba(201,168,76,0.5)] uppercase tracking-[0.15em] sm:tracking-[0.25em] whitespace-nowrap transition-transform group-hover:scale-105 duration-500">DualMind</span>
          <span className="font-label-caps text-[8px] sm:text-[10px] text-slate-400 uppercase tracking-widest sm:-mt-1 truncate opacity-80 group-hover:opacity-100 transition-opacity duration-500">Two minds. One decision. Ultimate clarity.</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        {setActiveTab && (
          <nav className="hidden md:flex gap-8 items-center">
            <button className={navClass('DOCKET')} onClick={() => setActiveTab('DOCKET')}>DEBATE</button>
            <button className={navClass('ARCHIVES')} onClick={() => setActiveTab('ARCHIVES')}>
              ARCHIVES<span className="material-symbols-outlined text-[14px] align-middle ml-1">lock</span>
            </button>
            <button className={navClass('EVIDENCE')} onClick={() => setActiveTab('EVIDENCE')}>
              EVIDENCE<span className="material-symbols-outlined text-[14px] align-middle ml-1">lock</span>
            </button>
          </nav>
        )}
        
        {user ? (
          <div className="relative">
            <button 
              className="w-10 h-10 rounded-full border-2 border-primary/50 hover:border-primary overflow-hidden transition-all duration-300 focus:outline-none flex items-center justify-center bg-[#101415]"
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
                <span className="text-[#c9a84c] font-bold text-base uppercase">
                  {(user.displayName || user.email || 'U').charAt(0)}
                </span>
              )}
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
                <div className="absolute right-0 mt-3 w-56 bg-[#161d2f] border border-primary/20 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-up">
                  <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                    <p className="text-sm font-semibold text-gray-200 truncate">{user.displayName || 'User'}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button 
            onClick={handleLogin}
            className="border border-primary text-primary font-label-caps px-5 py-2 rounded-lg hover:bg-primary/10 transition-all duration-300 shadow-[0_0_15px_rgba(201,168,76,0.15)] hover:shadow-[0_0_25px_rgba(201,168,76,0.3)] hover:scale-105"
          >
            LOGIN
          </button>
        )}
      </div>
    </header>
  );
}
