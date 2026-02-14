import React, { useEffect, useRef } from 'react';

const FLOATING_CONFIG = {
  hearts: ['❤️', '💖', '💝', '💗', '💓'],
  bears: ['🧸', '🐻']
};

const GlobalFloatingEmojis: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Ensure CSS variables are set on :root (if not already)
  useEffect(() => {
    const root = document.documentElement;
    if (!getComputedStyle(root).getPropertyValue('--float-duration')) {
      root.style.setProperty('--float-duration', '15s');
      root.style.setProperty('--float-distance', '50px');
    }
  }, []);

  // Create initial floating elements and listen for explosion event
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const createElement = (emoji: string, className: string) => {
      const el = document.createElement('div');
      el.className = className;
      el.innerHTML = emoji;
      el.style.left = Math.random() * 100 + 'vw';
      el.style.animationDelay = Math.random() * 5 + 's';
      el.style.animationDuration = 10 + Math.random() * 20 + 's';
      container.appendChild(el);
    };

    FLOATING_CONFIG.hearts.forEach(h => createElement(h, 'heart'));
    FLOATING_CONFIG.bears.forEach(b => createElement(b, 'bear'));

    const handleExplosion = (e: CustomEvent) => {
      const count = e.detail || 50;
      for (let i = 0; i < count; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart';
        const randomHeart = FLOATING_CONFIG.hearts[Math.floor(Math.random() * FLOATING_CONFIG.hearts.length)];
        heart.innerHTML = randomHeart;
        heart.style.left = Math.random() * 100 + 'vw';
        heart.style.animationDelay = Math.random() * 5 + 's';
        heart.style.animationDuration = 10 + Math.random() * 20 + 's';
        container.appendChild(heart);
      }
    };

    window.addEventListener('heartExplosion', handleExplosion as EventListener);

    return () => {
      window.removeEventListener('heartExplosion', handleExplosion as EventListener);
      container.innerHTML = '';
    };
  }, []);

  return (
    <>
      {/* Global styles for floating animations */}
      <style>{`
        .heart, .bear {
          position: absolute;
          font-size: 2rem;
          pointer-events: none;
          animation: float var(--float-duration) linear infinite;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
          z-index: 1; /* Ensure emojis appear above background but below content */
        }
        @keyframes float {
          0% { 
            transform: translateY(100vh) translateX(0) rotate(0deg); 
            opacity: 0;
          }
          10% { 
            opacity: 0.8; 
          }
          90% { 
            opacity: 0.8; 
          }
          100% { 
            transform: translateY(-100px) translateX(var(--float-distance)) rotate(360deg); 
            opacity: 0;
          }
        }
      `}</style>
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 40, // Increased z-index to appear above overlays
          overflow: 'hidden' // Prevent scrollbars
        }}
      />
    </>
  );
};

export default GlobalFloatingEmojis;