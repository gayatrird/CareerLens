import React from 'react';

const quotes = [
  { text: "The law is reason, free from passion.", author: "Aristotle" },
  { text: "In any moment of decision, the best thing you do is the right thing.", author: "Roosevelt" },
  { text: "It is not the mountain we conquer, but ourselves.", author: "Edmund Hillary" },
  { text: "The risk of a wrong decision is preferable to the terror of indecision.", author: "Maimonides" },
  { text: "Hard choices, easy life. Easy choices, hard life.", author: "Jerzy Gregorek" }
];

export default function Sidebar({ activeTab, setActiveTab }) {
  const [currentQuoteIndex, setCurrentQuoteIndex] = React.useState(0);
  const [fade, setFade] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
        setFade(true);
      }, 500);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getTabClass = (tabName) => {
    const isActive = activeTab === tabName;
    return isActive 
      ? "flex items-center gap-4 bg-[#c9a84c]/10 text-[#c9a84c] border-l-[3px] border-[#c9a84c] py-4 px-6 transition-all duration-300 w-full text-left"
      : "flex items-center gap-4 text-slate-500 border-l-[3px] border-transparent py-4 px-6 opacity-60 hover:bg-white/5 hover:opacity-100 transition-all duration-300 w-full text-left";
  };

  return (
    <aside className="fixed left-0 top-20 h-[calc(100vh-80px)] w-72 z-40 bg-gradient-to-br from-[#161d2f] to-[#0a0f1e] border-r border-white/5 hidden lg:flex flex-col shadow-[20px_0_40px_rgba(0,0,0,0.4)]">
      <div className="p-8 border-b border-white/5">
        <span className="font-inter tracking-widest text-xs font-semibold text-[#c9a84c] uppercase">THE DOCK</span>
      </div>
      <nav className="flex-1 py-6 flex flex-col">
        <button className={getTabClass('DOCKET')} onClick={() => setActiveTab && setActiveTab('DOCKET')}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>balance</span>
          <span className="font-inter tracking-widest text-xs font-semibold">DOCKET</span>
        </button>
        <button className={getTabClass('ARCHIVES')} onClick={() => setActiveTab && setActiveTab('ARCHIVES')}>
          <span className="material-symbols-outlined">history_edu</span>
          <span className="font-inter tracking-widest text-xs font-semibold">ARCHIVES</span>
        </button>
        <button className={getTabClass('EVIDENCE')} onClick={() => setActiveTab && setActiveTab('EVIDENCE')}>
          <span className="material-symbols-outlined">folder_shared</span>
          <span className="font-inter tracking-widest text-xs font-semibold">EVIDENCE</span>
        </button>
        <button className={getTabClass('CHAMBERS')} onClick={() => setActiveTab && setActiveTab('CHAMBERS')}>
          <span className="material-symbols-outlined">settings_applications</span>
          <span className="font-inter tracking-widest text-xs font-semibold">CHAMBERS</span>
        </button>
      </nav>
      <div className="p-6 bg-primary/5 m-4 rounded-xl border border-primary/10 hidden lg:block">
        <p className="font-label-caps text-[10px] text-primary/70 mb-2">PRECEDENT QUOTE</p>
        <div className={`transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}>
          <p className="font-quote-italic text-sm text-on-surface italic">
            "{quotes[currentQuoteIndex].text}"
          </p>
          <p className="text-right text-[10px] text-primary/70 font-label-caps mt-2">
            — {quotes[currentQuoteIndex].author}
          </p>
        </div>
      </div>
    </aside>
  );
}
