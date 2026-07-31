import React, { useState, useEffect } from 'react';

export default function DashboardSection({ onNavigateToAnalyze }) {
  const [archives, setArchives] = useState([]);
  const [selectedId1, setSelectedId1] = useState('');
  const [selectedId2, setSelectedId2] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('courtroom_archives');
      if (saved) {
        const parsed = JSON.parse(saved);
        setArchives(parsed);
        if (parsed.length >= 2) {
          setSelectedId1(parsed[parsed.length - 1].id);
          setSelectedId2(parsed[parsed.length - 2].id);
        } else if (parsed.length === 1) {
          setSelectedId1(parsed[0].id);
        }
      }
    } catch (e) {
      console.error("Error loading archives in Dashboard", e);
    }
  }, []);

  // Calculate Metrics from history or provide default fallback stats
  const recentAnalysesCount = archives.length > 0 ? archives.length : 2;
  
  const highestMatch = archives.length > 0 
    ? Math.max(...archives.map(a => a.recommendation?.overallMatch ?? a.agentResults?.ats?.score ?? 0))
    : 50;
    
  const averageMatch = archives.length > 0
    ? Math.round(archives.reduce((acc, a) => acc + (a.recommendation?.overallMatch ?? a.agentResults?.ats?.score ?? 0), 0) / archives.length)
    : 50;

  // Aggregate missing skills across analyses
  const getMissingSkills = () => {
    if (archives.length === 0) {
      return [
        { skill: 'Docker & Kubernetes', count: 2 },
        { skill: 'AWS / Cloud Architecture', count: 2 },
        { skill: 'GraphQL APIs', count: 1 },
        { skill: 'System Design', count: 1 },
        { skill: 'CI/CD Pipelines', count: 1 }
      ];
    }
    const skillCounts = {};
    archives.forEach(item => {
      const keywords = item.agentResults?.ats?.missingKeywords || [];
      keywords.forEach(kw => {
        const clean = kw.trim();
        skillCounts[clean] = (skillCounts[clean] || 0) + 1;
      });
      if (item.deepScanResult?.missing_keywords) {
        item.deepScanResult.missing_keywords.forEach(mk => {
          const clean = mk.keyword?.trim();
          if (clean) skillCounts[clean] = (skillCounts[clean] || 0) + 1;
        });
      }
    });
    const sorted = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count);

    return sorted.length > 0 ? sorted.slice(0, 6) : [
      { skill: 'TypeScript', count: 1 },
      { skill: 'Docker', count: 1 },
      { skill: 'Cloud Security', count: 1 }
    ];
  };

  // Extract recommended roles from topics
  const getRecommendedRoles = () => {
    if (archives.length === 0) {
      return [
        { title: 'Full Stack Software Engineer', match: '78%', level: 'Senior' },
        { title: 'Frontend Developer (React/Vite)', match: '85%', level: 'Mid-Senior' },
        { title: 'Technical Product Specialist', match: '72%', level: 'Mid' }
      ];
    }
    return archives.slice(0, 3).map(a => {
      const title = a.topic ? a.topic.substring(0, 40) + '...' : 'Software Development Specialist';
      const score = a.recommendation?.overallMatch ?? a.agentResults?.ats?.score ?? 70;
      return {
        title,
        match: `${score}%`,
        level: score > 75 ? 'Strong Match' : 'Possible Match'
      };
    });
  };

  const missingSkills = getMissingSkills();
  const recommendedRoles = getRecommendedRoles();

  const item1 = archives.find(a => a.id === selectedId1);
  const item2 = archives.find(a => a.id === selectedId2);

  return (
    <div className="animate-fade-in-up max-w-6xl mx-auto pb-12 space-y-8">
      {/* Header section */}
      <div className="text-center my-6">
        <span className="font-label-caps text-[#5B8CFF] text-[10px] tracking-[0.25em] uppercase font-bold">
          DASHBOARD
        </span>
        <h1 className="font-headline-md text-2xl md:text-3xl text-[#FAFAFA] tracking-tight mt-1 font-bold">
          Career progress overview
        </h1>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg hover:border-[#3F3F46] transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[#5B8CFF] text-xl">history</span>
          </div>
          <span className="text-3xl font-black text-[#FAFAFA] tracking-tight mb-1">
            {recentAnalysesCount}
          </span>
          <span className="font-label-caps text-[10px] text-[#71717A] tracking-widest uppercase">
            RECENT ANALYSES
          </span>
        </div>

        {/* Card 2 */}
        <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg hover:border-[#3F3F46] transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[#F59E0B] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
          </div>
          <span className="text-3xl font-black text-[#F59E0B] tracking-tight mb-1">
            {highestMatch}%
          </span>
          <span className="font-label-caps text-[10px] text-[#71717A] tracking-widest uppercase">
            HIGHEST ATS / MATCH
          </span>
        </div>

        {/* Card 3 */}
        <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg hover:border-[#3F3F46] transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[#3B82F6] text-xl">bar_chart</span>
          </div>
          <span className="text-3xl font-black text-[#3B82F6] tracking-tight mb-1">
            {averageMatch}%
          </span>
          <span className="font-label-caps text-[10px] text-[#71717A] tracking-widest uppercase">
            AVERAGE MATCH
          </span>
        </div>

        {/* Card 4 */}
        <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg hover:border-[#3F3F46] transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[#22C55E] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
          </div>
          <span className="text-2xl font-black text-[#FAFAFA] tracking-tight mb-1">
            In progress
          </span>
          <span className="font-label-caps text-[10px] text-[#71717A] tracking-widest uppercase">
            LEARNING PROGRESS
          </span>
        </div>
      </div>

      {/* Middle Row: Recommended roles & Most missing skills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recommended Roles */}
        <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-[#5B8CFF]/15 border border-[#5B8CFF]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#5B8CFF] text-sm">work</span>
              </div>
              <h3 className="font-headline-md text-base text-[#FAFAFA] font-semibold">Recommended roles</h3>
            </div>
            
            <div className="space-y-3">
              {recommendedRoles.map((role, idx) => (
                <div key={idx} className="bg-[#09090B] border border-[#27272A] rounded-xl p-4 flex items-center justify-between gap-3 hover:border-[#3F3F46] transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-[#FAFAFA] line-clamp-1">{role.title}</p>
                    <p className="text-[11px] text-[#71717A] mt-0.5">{role.level}</p>
                  </div>
                  <span className="bg-[#5B8CFF]/10 text-[#5B8CFF] border border-[#5B8CFF]/25 px-2.5 py-1 rounded-md text-xs font-bold shrink-0">
                    {role.match}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Most Missing Skills */}
        <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#EF4444] text-sm">label</span>
              </div>
              <h3 className="font-headline-md text-base text-[#FAFAFA] font-semibold">Most missing skills</h3>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {missingSkills.map((sk, idx) => (
                <div key={idx} className="bg-[#09090B] border border-[#27272A] rounded-xl px-3.5 py-2.5 flex items-center gap-2 hover:border-[#EF4444]/40 transition-colors">
                  <span className="text-xs font-medium text-[#A1A1AA]">{sk.skill}</span>
                  <span className="bg-[#EF4444]/15 text-[#EF4444] text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-[#EF4444]/25">
                    {sk.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Resume version comparison */}
      <div className="bg-[#171A20] border border-[#2D2F36] rounded-2xl p-6 md:p-8 shadow-lg space-y-6">
        <div className="text-center">
          <h3 className="font-headline-md text-base md:text-lg text-[#FAFAFA] font-semibold">
            Resume version comparison
          </h3>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-label-caps text-[#71717A] tracking-widest uppercase mb-1.5">
              Select first analysis
            </label>
            <select
              value={selectedId1}
              onChange={(e) => setSelectedId1(e.target.value)}
              className="w-full bg-[#09090B] border border-[#27272A] focus:border-[#5B8CFF] text-[#FAFAFA] rounded-xl px-4 py-3 text-xs outline-none transition-colors"
            >
              <option value="">Select first analysis...</option>
              {archives.map(a => (
                <option key={a.id} value={a.id}>
                  #{a.id} — {a.topic ? a.topic.substring(0, 45) : 'Analysis'} ({new Date(a.date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-label-caps text-[#71717A] tracking-widest uppercase mb-1.5">
              Select second analysis
            </label>
            <select
              value={selectedId2}
              onChange={(e) => setSelectedId2(e.target.value)}
              className="w-full bg-[#09090B] border border-[#27272A] focus:border-[#5B8CFF] text-[#FAFAFA] rounded-xl px-4 py-3 text-xs outline-none transition-colors"
            >
              <option value="">Select second analysis...</option>
              {archives.map(a => (
                <option key={a.id} value={a.id}>
                  #{a.id} — {a.topic ? a.topic.substring(0, 45) : 'Analysis'} ({new Date(a.date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-side comparison display */}
        {item1 && item2 ? (
          <div className="pt-4 border-t border-[#27272A] grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
            {/* Analysis 1 */}
            <div className="bg-[#09090B] border border-[#27272A] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E2025] pb-3">
                <div>
                  <span className="font-label-caps text-xs text-[#5B8CFF] font-bold">#{item1.id}</span>
                  <p className="text-xs text-[#FAFAFA] font-medium line-clamp-1 mt-0.5">{item1.topic || 'Analysis 1'}</p>
                </div>
                <span className="text-xl font-black text-[#5B8CFF]">
                  {item1.recommendation?.overallMatch ?? item1.agentResults?.ats?.score ?? 0}%
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#A1A1AA]">
                  <span>ATS Score:</span>
                  <span className="font-bold text-[#FAFAFA]">{item1.agentResults?.ats?.score ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between text-[#A1A1AA]">
                  <span>Manager Decision:</span>
                  <span className="font-bold text-[#FAFAFA]">{item1.agentResults?.manager?.decision ?? 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Analysis 2 */}
            <div className="bg-[#09090B] border border-[#27272A] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E2025] pb-3">
                <div>
                  <span className="font-label-caps text-xs text-[#22C55E] font-bold">#{item2.id}</span>
                  <p className="text-xs text-[#FAFAFA] font-medium line-clamp-1 mt-0.5">{item2.topic || 'Analysis 2'}</p>
                </div>
                <span className="text-xl font-black text-[#22C55E]">
                  {item2.recommendation?.overallMatch ?? item2.agentResults?.ats?.score ?? 0}%
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#A1A1AA]">
                  <span>ATS Score:</span>
                  <span className="font-bold text-[#FAFAFA]">{item2.agentResults?.ats?.score ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between text-[#A1A1AA]">
                  <span>Manager Decision:</span>
                  <span className="font-bold text-[#FAFAFA]">{item2.agentResults?.manager?.decision ?? 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 bg-[#09090B] border border-[#27272A] rounded-xl">
            <p className="text-xs text-[#71717A]">
              {archives.length < 2 
                ? "Run multiple resume analyses in the Analyze tab to compare versions side-by-side."
                : "Select two analyses from the dropdowns above to compare scores and metrics."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
