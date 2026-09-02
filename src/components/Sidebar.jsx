import React from 'react';

function useTheme() {
  const [theme, setTheme] = React.useState(() =>
    document.documentElement.getAttribute('data-theme') || 'dark'
  );
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

export default function Sidebar({ activeTab, setActiveTab }) {
  const theme = useTheme();
  const isLight = theme === 'light';
  const [historyCount, setHistoryCount] = React.useState(12);

  React.useEffect(() => {
    try {
      // Support all CareerLens storage keys
      const saved =
        localStorage.getItem('careerlens_history') ||
        localStorage.getItem('courtroom_archives') ||
        localStorage.getItem('courtRoomArchives');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) setHistoryCount(parsed.length + 11);
      }
    } catch(e) {}
  }, []);

  // Match HireFlow tab styles exactly
  const getTabClass = (tabName) => {
    const isActive = activeTab === tabName;
    if (isLight) {
      return isActive
        ? "flex items-center gap-3 bg-white text-[#4F7DF3] border-l-[3px] border-[#4F7DF3] py-3 px-5 transition-all duration-200 w-full text-left"
        : "flex items-center gap-3 text-[#374151] border-l-[3px] border-transparent py-3 px-5 hover:bg-[#F3F4F6] hover:text-[#111827] transition-all duration-200 w-full text-left";
    }
    return isActive
      ? "flex items-center gap-3 bg-[#171A20] text-[#4F7DF3] border-l-[3px] border-[#4F7DF3] py-3 px-5 transition-all duration-200 w-full text-left"
      : "flex items-center gap-3 text-[#71717A] border-l-[3px] border-transparent py-3 px-5 hover:bg-[#171A20] hover:text-[#A1A1AA] transition-all duration-200 w-full text-left";
  };

  return (
    // HireFlow: w-64 top-16 bg-[#0F1115] border-r border-[#27272A]
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 z-40 bg-[#0F1115] border-r border-[#27272A] hidden lg:flex flex-col">
      {/* Workspace header — HireFlow style: all-caps label */}
      <div className="px-5 py-4 border-b border-[#27272A]">
        <span className="font-label-caps text-[#71717A] tracking-widest">WORKSPACE</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 flex flex-col">
        <button className={getTabClass('DASHBOARD')} onClick={() => setActiveTab && setActiveTab('DASHBOARD')}>
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ fontVariationSettings: activeTab === 'DASHBOARD' ? "'FILL' 1" : "'FILL' 0" }}
          >grid_view</span>
          <span className="text-xs font-semibold tracking-wider">Dashboard</span>
        </button>

        <button className={getTabClass('DOCKET')} onClick={() => setActiveTab && setActiveTab('DOCKET')}>
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ fontVariationSettings: activeTab === 'DOCKET' ? "'FILL' 1" : "'FILL' 0" }}
          >work</span>
          <span className="text-xs font-semibold tracking-wider">Analyze</span>
        </button>

        <button className={getTabClass('ARCHIVES')} onClick={() => setActiveTab && setActiveTab('ARCHIVES')}>
          <span className="material-symbols-outlined text-[18px]">history</span>
          <span className="text-xs font-semibold tracking-wider">History</span>
        </button>

        <button className={getTabClass('EVIDENCE')} onClick={() => setActiveTab && setActiveTab('EVIDENCE')}>
          <span className="material-symbols-outlined text-[18px]">quiz</span>
          <span className="text-xs font-semibold tracking-wider">Interview Kit</span>
        </button>

        <button className={getTabClass('SUBSCRIPTION')} onClick={() => setActiveTab && setActiveTab('SUBSCRIPTION')}>
          <span className="material-symbols-outlined text-[18px]">credit_card</span>
          <span className="text-xs font-semibold tracking-wider">Pricing</span>
        </button>

        <button className={getTabClass('CHAMBERS')} onClick={() => setActiveTab && setActiveTab('CHAMBERS')}>
          <span className="material-symbols-outlined text-[18px]">settings</span>
          <span className="text-xs font-semibold tracking-wider">Settings</span>
        </button>
      </nav>

      {/* Today's Progress — HireFlow style */}
      <div className="p-4 border-t border-[#27272A]">
        <div className="bg-[#171A20] rounded-xl p-4 border border-[#2D2F36]">
          <p className="font-label-caps text-[10px] text-[#FAFAFA] mb-4 tracking-widest">TODAY'S PROGRESS</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A1A1AA]">Resume Reviews</span>
              <span className="text-xs font-semibold text-[#FAFAFA]">{historyCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A1A1AA]">Applications</span>
              <span className="text-xs font-semibold text-[#FAFAFA]">4</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A1A1AA]">Interview Ready</span>
              <span className="text-xs font-semibold text-[#22C55E]">82%</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
