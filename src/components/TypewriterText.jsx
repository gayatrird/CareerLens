import React, { useState, useEffect, useRef } from 'react';

const globalTypedTexts = new Set();

export default function TypewriterText({ text, speed = 15, onComplete, className = "", cursorClass = "text-[#5B8CFF]", delayStart = 0 }) {
  const [displayed, setDisplayed] = useState(() => globalTypedTexts.has(text) ? text : '');
  const [isTyping, setIsTyping] = useState(() => !globalTypedTexts.has(text));
  const textRef = useRef(text);
  
  useEffect(() => {
    // If it was already fully typed or started in another mount, just finish it instantly to avoid restart glitches.
    if (globalTypedTexts.has(text)) {
      setDisplayed(text);
      setIsTyping(false);
      if (onComplete) onComplete();
      return;
    }

    globalTypedTexts.add(text);
    let timeout;
    
    // Start typing after delay
    timeout = setTimeout(() => {
      setIsTyping(true);
      setDisplayed('');
      let i = 0;
      
      const typeChar = () => {
        if (i < text.length) {
          setDisplayed(text.substring(0, i + 1));
          i++;
          timeout = setTimeout(typeChar, speed);
        } else {
          setIsTyping(false);
          if (onComplete) onComplete();
        }
      };
      
      typeChar();
    }, delayStart);
    
    return () => clearTimeout(timeout);
  }, [text, speed, delayStart]); // omit onComplete to prevent re-renders

  return (
    <span className={className}>
      {displayed}
      {isTyping && <span className={`animate-pulse ml-[1px] ${cursorClass}`}>|</span>}
    </span>
  );
}
