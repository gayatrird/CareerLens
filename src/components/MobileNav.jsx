import React from 'react';

export default function MobileNav({ activeTab, setActiveTab }) {
  const navItems = [
    { tab: 'DASHBOARD', icon: 'grid_view',     label: 'Home',    fill: true },
    { tab: 'DOCKET',   icon: 'work',          label: 'Analyze',  fill: true },
    { tab: 'ARCHIVES', icon: 'history',        label: 'History',  fill: false },
    { tab: 'EVIDENCE', icon: 'quiz',           label: 'Interview', fill: false },
    { tab: 'CHAMBERS', icon: 'settings',       label: 'Settings', fill: false },
  ];

  return (
    <nav className="nav-bottom fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-14 md:hidden glass-panel border-t rounded-none" style={{ borderRadius: 0 }}>
      {navItems.map(({ tab, icon, label, fill }) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => setActiveTab && setActiveTab(tab)}
            className="flex flex-col items-center justify-center px-2 pt-1.5 pb-1 active:scale-90 transition-transform"
            style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={isActive && fill ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {icon}
            </span>
            <span className="text-[9px] font-medium tracking-wide mt-0.5">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
