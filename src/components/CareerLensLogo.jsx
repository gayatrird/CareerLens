import React from 'react';

export default function CareerLensLogo({ 
  size = 32, 
  className = '', 
  cColor = '#3B82F6', 
  lColor = '#FFFFFF' 
}) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 transition-transform duration-200 hover:scale-105 ${className}`}
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
