import React from 'react';

export default function EvidenceSection() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in-up px-4">
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-6xl text-primary/80" style={{ fontVariationSettings: "'FILL' 1" }}>construction</span>
      </div>
      <h2 className="font-headline-md text-3xl text-primary tracking-widest uppercase mb-4">Evidence Locker</h2>
      <div className="h-[1px] w-32 bg-primary/30 mb-6"></div>
      <p className="text-body-rt text-lg text-slate-300 max-w-xl">
        The Evidence Locker is under construction. Future updates will allow you to attach documents and links to support your case.
      </p>
    </div>
  );
}
