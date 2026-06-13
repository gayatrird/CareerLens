import React from 'react';

export default function MobileNav() {
  return (
    <>
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 md:hidden bg-[#0a0f1e]/98 border-t border-[#c9a84c]/20 shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
        <a className="flex flex-col items-center justify-center text-[#c9a84c] pt-2 pb-1 active:scale-90 transition-transform" href="#">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
          <span className="font-inter text-[9px] font-bold uppercase mt-1">Debate</span>
        </a>
        <a className="flex flex-col items-center justify-center text-slate-500 opacity-50 pt-2 pb-1 active:scale-90 transition-transform hover:opacity-100 hover:text-[#c9a84c]" href="#">
          <span className="material-symbols-outlined">view_agenda</span>
          <span className="font-inter text-[9px] font-bold uppercase mt-1">Cases</span>
        </a>
        <a className="flex flex-col items-center justify-center text-slate-500 opacity-50 pt-2 pb-1 active:scale-90 transition-transform hover:opacity-100 hover:text-[#c9a84c]" href="#">
          <span className="material-symbols-outlined">folder_special</span>
          <span className="font-inter text-[9px] font-bold uppercase mt-1">Files</span>
        </a>
        <a className="flex flex-col items-center justify-center text-slate-500 opacity-50 pt-2 pb-1 active:scale-90 transition-transform hover:opacity-100 hover:text-[#c9a84c]" href="#">
          <span className="material-symbols-outlined">account_circle</span>
          <span className="font-inter text-[9px] font-bold uppercase mt-1">Profile</span>
        </a>
      </nav>
    </>
  );
}
