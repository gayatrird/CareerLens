import React, { useState, useEffect, useRef } from 'react';

export default function TypewriterText({ text, speed = 15, onComplete, className = "", cursorClass = "text-[#5B8CFF]", delayStart = 0 }) {
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textRef = useRef(text);
  
  useEffect(() => {
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
  }, [text, speed, delayStart]); // omit onComplete to prevent re-renders, but text change restarts

  return (
    <span className={className}>
      {displayed}
      {isTyping && <span className={`animate-pulse ml-[1px] ${cursorClass}`}>|</span>}
    </span>
  );
}
