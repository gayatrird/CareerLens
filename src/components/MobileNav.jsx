import React from 'react';

export default function MobileNav({ activeTab, setActiveTab }) {
  const navItems = [
    { tab: 'DASHBOARD', icon: 'grid_view',     label: 'Dashboard',  fill: true,  activeColor: '#5B8CFF' },
    { tab: 'DOCKET',   icon: 'work',          label: 'Analyze',    fill: true,  activeColor: '#5B8CFF' },
    { tab: 'ARCHIVES', icon: 'history',        label: 'History',    fill: false, activeColor: '#5B8CFF' },
    { tab: 'EVIDENCE', icon: 'quiz',           label: 'Interview',  fill: false, activeColor: '#5B8CFF' },
    { tab: 'SUBSCRIPTION', icon: 'credit_card', label: 'Pricing',   fill: false, activeColor: '#5B8CFF' },
    { tab: 'CHAMBERS', icon: 'settings',       label: 'Settings',   fill: false, activeColor: '#5B8CFF' },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-14 md:hidden bg-[#0F1115]/98 border-t border-[#27272A] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        {navItems.map(({ tab, icon, label, fill, activeColor }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab && setActiveTab(tab)}
              className="flex flex-col items-center justify-center px-2 pt-1.5 pb-1 active:scale-90 transition-transform"
              style={{ color: isActive ? activeColor : '#52525B' }}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isActive && fill ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {icon}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider mt-0.5">
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
