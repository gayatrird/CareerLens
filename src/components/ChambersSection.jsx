import React from 'react';

export default function SettingsSection() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in-up px-4">
      <div className="w-20 h-20 rounded-2xl bg-[#171A20] border border-[#2D2F36] flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-5xl text-[#3F3F46]" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
      </div>
      <h2 className="font-headline-md text-xl text-[#FAFAFA] mb-2">Settings</h2>
      <p className="text-[#71717A] text-sm max-w-sm leading-relaxed">
        Advanced settings and account preferences coming soon. Sign in with Google to save your analyses across devices.
      </p>
    </div>
  );
}
