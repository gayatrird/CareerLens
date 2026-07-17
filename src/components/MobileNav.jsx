import React from 'react';

export default function MobileNav({ activeTab, setActiveTab }) {
  const navItems = [
    { tab: 'DOCKET',   icon: 'work',     label: 'Analyze',   fill: true  },
    { tab: 'ARCHIVES', icon: 'history',  label: 'History',   fill: false },
    { tab: 'EVIDENCE', icon: 'quiz',     label: 'Interview Kit', fill: false },
    { tab: 'CHAMBERS', icon: 'settings', label: 'Settings',  fill: false },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-14 md:hidden bg-[#0F1115]/98 border-t border-[#27272A] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        {navItems.map(({ tab, icon, label, fill }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab && setActiveTab(tab)}
              className={`flex flex-col items-center justify-center px-3 pt-1.5 pb-1 active:scale-90 transition-transform ${
                isActive ? 'text-[#5B8CFF]' : 'text-[#52525B] hover:text-[#71717A]'
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isActive && fill ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {icon}
              </span>
              <span className={`text-[9px] font-semibold uppercase tracking-wider mt-0.5 ${isActive ? 'text-[#5B8CFF]' : 'text-[#52525B]'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
