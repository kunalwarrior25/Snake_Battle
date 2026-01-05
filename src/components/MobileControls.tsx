interface MobileControlsProps {
  onDirectionChange: (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
}

export function MobileControls({ onDirectionChange }: MobileControlsProps) {
  // Styles for the glassmorphism buttons
  const buttonStyle = "w-20 h-20 bg-slate-800/60 backdrop-blur-md border-2 border-slate-600/50 active:bg-slate-700/80 active:border-slate-500 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all active:scale-90 touch-none select-none text-white/90";

  const handlePress = (e: React.PointerEvent, dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    e.preventDefault();
    onDirectionChange(dir);
  };

  return (
    <>
      {/* Left Side Container - Vertical (Up/Down) */}
      <div className="fixed left-6 bottom-10 z-50 flex flex-col gap-6">
        <button
          onPointerDown={(e) => handlePress(e, 'UP')}
          className={buttonStyle}
          aria-label="Up"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
        </button>
        
        <button
          onPointerDown={(e) => handlePress(e, 'DOWN')}
          className={buttonStyle}
          aria-label="Down"
        >
           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </button>
      </div>

      {/* Right Side Container - Horizontal (Left/Right) */}
      <div className="fixed right-6 bottom-20 z-50 flex gap-6">
        <button
          onPointerDown={(e) => handlePress(e, 'LEFT')}
          className={buttonStyle}
          aria-label="Left"
        >
           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        
        <button
          onPointerDown={(e) => handlePress(e, 'RIGHT')}
          className={buttonStyle}
          aria-label="Right"
        >
           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </>
  );
}