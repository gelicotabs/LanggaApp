import React, { useState, useEffect, useRef } from 'react';

// ========== CONFIGURATION (fully customisable) ==========
const CONFIG = {
  valentineName: "Dianne Claire",
  pageTitle: "Will You Be My Valentine? 💝",
  floatingEmojis: {
    hearts: ['❤️', '💖', '💝', '💗', '💓'],
    bears: ['🧸', '🐻']
  },
  questions: {
    first: {
      text: "Do you like me?",
      yesBtn: "Yes",
      noBtn: "No",
      secretAnswer: "I don't like you, I love you! ❤️"
    },
    second: {
      text: "How much do you love me?",
      startText: "This much!",
      nextBtn: "Next ❤️"
    },
    third: {
      text: "Will you be my Valentine on February 14th, 2026? 🌹",
      yesBtn: "Yes!",
      noBtn: "No"
    }
  },
  loveMessages: {
    extreme: "WOOOOW You love me that much?? 🥰🚀💝",
    high: "To infinity and beyond! 🚀💝",
    normal: "And beyond! 🥰"
  },
  celebration: {
    title: "Yay! I'm the luckiest person in the world! 🎉💝💖💝💓",
    message: "Now come get your gift, a big warm hug and a huge kiss!",
    emojis: "🎁💖🤗💝💋❤️💕🌸🌺🌼🌻"
  },
  colors: {
    backgroundStart: "#ffafbd",
    backgroundEnd: "#ffc3a0",
    buttonBackground: "#ff6b6b",
    buttonHover: "#ff8787",
    textColor: "#ff4757"
  },
  animations: {
    floatDuration: "15s",
    floatDistance: "50px",
    bounceSpeed: "0.5s",
    heartExplosionSize: 1.5
  }
  // music block removed
};
// =========================================================

const ValentineWizard: React.FC = () => {
  // ---------- State ----------
  const [currentQuestion, setCurrentQuestion] = useState(1); // 1,2,3,4 (4 = celebration)
  const [loveMeterValue, setLoveMeterValue] = useState(100);
  const [extraLoveMessage, setExtraLoveMessage] = useState('');
  const [showExtra, setShowExtra] = useState(false);

  // Positions for movable buttons (null = not moved yet, rendered statically)
  const [q1YesPos, setQ1YesPos] = useState<{ x: number; y: number } | null>(null);
  const [q1NoPos, setQ1NoPos] = useState<{ x: number; y: number } | null>(null);
  const [q3NoPos, setQ3NoPos] = useState<{ x: number; y: number } | null>(null);

  // Refs
  const loveMeterRef = useRef<HTMLInputElement>(null);

  // ---------- Effects ----------
  // Set page title and apply theme (CSS variables)
  useEffect(() => {
    document.title = CONFIG.pageTitle;

    const root = document.documentElement;
    root.style.setProperty('--background-color-1', CONFIG.colors.backgroundStart);
    root.style.setProperty('--background-color-2', CONFIG.colors.backgroundEnd);
    root.style.setProperty('--button-color', CONFIG.colors.buttonBackground);
    root.style.setProperty('--button-hover', CONFIG.colors.buttonHover);
    root.style.setProperty('--text-color', CONFIG.colors.textColor);
    root.style.setProperty('--float-duration', CONFIG.animations.floatDuration);
    root.style.setProperty('--float-distance', CONFIG.animations.floatDistance);
    root.style.setProperty('--bounce-speed', CONFIG.animations.bounceSpeed);
    root.style.setProperty('--heart-explosion-size', CONFIG.animations.heartExplosionSize.toString());
  }, []);

  // Update love meter extra message
  useEffect(() => {
    if (loveMeterValue > 100) {
      setShowExtra(true);
      if (loveMeterValue >= 5000) {
        setExtraLoveMessage(CONFIG.loveMessages.extreme);
      } else if (loveMeterValue > 1000) {
        setExtraLoveMessage(CONFIG.loveMessages.high);
      } else {
        setExtraLoveMessage(CONFIG.loveMessages.normal);
      }
    } else {
      setShowExtra(false);
    }
  }, [loveMeterValue]);

  // ---------- Handlers ----------
  const handleLoveMeterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setLoveMeterValue(val);

    // Expand slider width when value > 100 (original behaviour)
    if (loveMeterRef.current) {
      if (val > 100) {
        const overflowPercentage = (val - 100) / 9900;
        const extraWidth = overflowPercentage * window.innerWidth * 0.8;
        loveMeterRef.current.style.width = `calc(100% + ${extraWidth}px)`;
      } else {
        loveMeterRef.current.style.width = '100%';
      }
    }
  };

  const celebrate = () => {
    setCurrentQuestion(4); // celebration screen

    // Heart explosion: add 50 new hearts to the **global** floating container
    // We'll dispatch a custom event that the global container listens to
    window.dispatchEvent(new CustomEvent('heartExplosion', { detail: 50 }));
  };

  // Helper to get button style (static or fixed)
  const getMovableButtonStyle = (pos: { x: number; y: number } | null): React.CSSProperties => {
    if (pos) {
      return {
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 20,
        transition: 'left 0.2s, top 0.2s'
      };
    }
    return {
      position: 'static',
      display: 'inline-block',
      margin: '0 10px'
    };
  };

  // ---------- Render ----------
  return (
    <div className="valentine-wizard" style={{ position: 'relative', minHeight: '500px' }}>
      {/* Main content card (no floating elements inside) */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          background: 'rgba(255,255,255,0.9)',
          padding: '2rem',
          borderRadius: 20,
          maxWidth: 600,
          margin: '0 auto',
          boxShadow: '0 0 20px rgba(0,0,0,0.1)'
        }}
      >
        <h1 style={{ color: CONFIG.colors.textColor, textAlign: 'center', marginBottom: '2rem' }}>
          {CONFIG.valentineName}, langga, my love...
        </h1>

        {/* ---------- QUESTION 1 ---------- */}
        {currentQuestion === 1 && (
          <div className="question-section" style={{ textAlign: 'center' }}>
            <h2 style={{ color: CONFIG.colors.textColor }}>{CONFIG.questions.first.text}</h2>

            {/* Yes button (static initially, moves on click) */}
            <button
              className="cute-btn"
              style={{
                background: CONFIG.colors.buttonBackground,
                ...getMovableButtonStyle(q1YesPos)
              }}
              onClick={() => {
                setQ1YesPos({
                  x: Math.random() * (window.innerWidth - 120),
                  y: Math.random() * (window.innerHeight - 60)
                });
              }}
            >
              {CONFIG.questions.first.yesBtn}
            </button>

            {/* No button (static initially, moves on click) */}
            <button
              className="cute-btn"
              style={{
                background: CONFIG.colors.buttonBackground,
                ...getMovableButtonStyle(q1NoPos)
              }}
              onClick={() => {
                setQ1NoPos({
                  x: Math.random() * (window.innerWidth - 120),
                  y: Math.random() * (window.innerHeight - 60)
                });
              }}
            >
              {CONFIG.questions.first.noBtn}
            </button>
            
            {/* ✅ SECRET ANSWER BUTTON */}
            <div style={{ margin: '200px 0 20px 0' }}>
              <button
                className="cute-btn special"
                style={{
                  background: CONFIG.colors.buttonBackground,
                  fontSize: '0.9rem',
                  padding: '8px 16px',
                  opacity: 0.3,
                  transition: 'opacity 0.3s',
                  border: 'none'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                onClick={() => setCurrentQuestion(2)}
              >
                {CONFIG.questions.first.secretAnswer}
              </button>
            </div>
          </div>
        )}

        {/* ---------- QUESTION 2 (Love Meter) ---------- */}
        {currentQuestion === 2 && (
          <div className="question-section" style={{ textAlign: 'center' }}>
            <h2 style={{ color: CONFIG.colors.textColor }}>{CONFIG.questions.second.text}</h2>
            <div className="love-meter" style={{ margin: '20px 0', overflow: 'visible' }}>
              <input
                ref={loveMeterRef}
                type="range"
                min="0"
                max="10000"
                value={loveMeterValue}
                onChange={handleLoveMeterChange}
                className="slider"
                style={{
                  width: '100%',
                  height: 25,
                  background: 'linear-gradient(to right, #ff6b6b, #ff8787, #ffb8b8)',
                  borderRadius: 15,
                  transition: 'width 0.3s'
                }}
              />
              <p style={{ fontSize: '1.2rem', color: CONFIG.colors.textColor }}>
                <span className="love-value-container">
                  <span id="startText">{CONFIG.questions.second.startText}</span> (<span id="loveValue">{loveMeterValue}</span>%)
                </span>
                {showExtra && (
                  <span
                    id="extraLove"
                    className={loveMeterValue >= 5000 ? 'super-love' : ''}
                    style={{
                      display: 'block',
                      marginTop: 10,
                      fontWeight: 'bold',
                      color: CONFIG.colors.buttonBackground,
                      animation: 'bounce 0.5s infinite alternate'
                    }}
                  >
                    {extraLoveMessage}
                  </span>
                )}
              </p>
            </div>
            <button
              className="cute-btn"
              style={{ background: CONFIG.colors.buttonBackground }}
              onClick={() => setCurrentQuestion(3)}
            >
              {CONFIG.questions.second.nextBtn}
            </button>
          </div>
        )}

        {/* ---------- QUESTION 3 ---------- */}
        {currentQuestion === 3 && (
          <div className="question-section" style={{ textAlign: 'center' }}>
            <h2 style={{ color: CONFIG.colors.textColor }}>{CONFIG.questions.third.text}</h2>
            <button
              className="cute-btn final-yes"
              style={{ background: CONFIG.colors.buttonBackground, margin: '0 10px' }}
              onClick={celebrate}
            >
              {CONFIG.questions.third.yesBtn}
            </button>
            {/* No button (static initially, moves on click) */}
            <button
              className="cute-btn"
              style={{
                background: CONFIG.colors.buttonBackground,
                ...getMovableButtonStyle(q3NoPos)
              }}
              onClick={() => {
                setQ3NoPos({
                  x: Math.random() * (window.innerWidth - 120),
                  y: Math.random() * (window.innerHeight - 60)
                });
              }}
            >
              {CONFIG.questions.third.noBtn}
            </button>
          </div>
        )}

        {/* ---------- CELEBRATION ---------- */}
        {currentQuestion === 4 && (
          <div className="celebration" style={{ textAlign: 'center' }}>
            <h2 style={{ color: CONFIG.colors.textColor }}>{CONFIG.celebration.title}</h2>
            <p style={{ fontSize: '1.5rem', color: CONFIG.colors.textColor, margin: '30px 0' }}>
              {CONFIG.celebration.message}
            </p>
            <p style={{ fontSize: '3rem', animation: 'bounce 0.5s infinite alternate' }}>
              {CONFIG.celebration.emojis}
            </p>
          </div>
        )}
      </div>

      {/* Global styles remain the same (floating animations included) */}
      <style>{`
        .heart, .bear {
          position: absolute;
          font-size: 2rem;
          pointer-events: none;
          animation: float var(--float-duration) linear infinite;
        }
        @keyframes float {
          0% { transform: translateY(100vh) translateX(0); }
          100% { transform: translateY(-100px) translateX(var(--float-distance)); }
        }
        @keyframes bounce {
          from { transform: scale(1); }
          to { transform: scale(1.2); }
        }
        .cute-btn {
          border: none;
          padding: 10px 20px;
          border-radius: 20px;
          color: white;
          font-size: 1.1rem;
          cursor: pointer;
          transition: transform 0.3s, background 0.3s;
        }
        .cute-btn:hover {
          transform: scale(1.1);
          background: var(--button-hover) !important;
        }
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 35px;
          height: 35px;
          background: linear-gradient(135deg, #ff4757, #ff6b6b);
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid white;
          margin-top: -5px;
        }
        .slider::-moz-range-thumb {
          width: 35px;
          height: 35px;
          background: linear-gradient(135deg, #ff4757, #ff6b6b);
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid white;
        }
        .super-love {
          font-size: 1.2em;
          background: rgba(255,107,107,0.2);
          padding: 8px 15px;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default ValentineWizard;