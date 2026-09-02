import React, { useState, useEffect } from 'react';

export default function CareerLensLogo({ 
  size = 32, 
  className = '' 
}) {
  const [theme, setTheme] = useState(() => 
    document.documentElement.getAttribute('data-theme') || 'dark'
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Theme-aware colors: C is always blue, L varies
  const cColor = '#4F7DF3';
  const lColor = theme === 'light' ? '#1A1D23' : '#FFFFFF';

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      aria-label="CareerLens Logo"
    >
      {/* Clean geometric C */}
      <path 
        d="M 44 26 A 25 25 0 1 0 44 74" 
        stroke={cColor} 
        strokeWidth="13" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Clean geometric L */}
      <path 
        d="M 64 26 V 74 H 88" 
        stroke={lColor} 
        strokeWidth="13" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}
