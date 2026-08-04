import React, { useRef, useState, useEffect } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Compass } from 'lucide-react';

interface JoystickProps {
  engine: GameEngine;
}

export const Joystick: React.FC<JoystickProps> = ({ engine }) => {
  const [activeDir, setActiveDir] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(hasTouch || isSmallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const move = (dx: number, dy: number) => {
    engine.moveCharacter(dx, dy);
  };

  const startMoving = (dx: number, dy: number, dirName: string) => {
    setActiveDir(dirName);
    move(dx, dy);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      move(dx, dy);
    }, 140);
  };

  const stopMoving = () => {
    setActiveDir(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!isMobile) {
    return null;
  }

  return (
    <div className="absolute bottom-16 left-3 z-20 select-none md:hidden">
      {/* Semi-transparent Circular Control Disc */}
      <div className="w-36 h-36 rounded-full bg-slate-950/35 backdrop-blur-xs border-2 border-amber-500/25 p-1.5 shadow-xl relative flex items-center justify-center opacity-65 hover:opacity-100 transition-opacity duration-300">
        
        {/* Outer Ring Accent */}
        <div className="absolute inset-1 rounded-full border border-amber-500/15 pointer-events-none" />

        {/* Center Knob / Compass Badge */}
        <div className={`w-10 h-10 rounded-full border transition-all flex items-center justify-center pointer-events-none z-10 ${
          activeDir
            ? 'bg-amber-500/40 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-110'
            : 'bg-slate-900/60 border-amber-500/30 text-amber-400/80'
        }`}>
          <Compass className={`w-5 h-5 ${activeDir ? 'animate-spin' : ''}`} />
        </div>

        {/* Up Button */}
        <button
          onMouseDown={() => startMoving(0, -1, 'up')}
          onMouseUp={stopMoving}
          onMouseLeave={stopMoving}
          onTouchStart={(e) => { e.preventDefault(); startMoving(0, -1, 'up'); }}
          onTouchEnd={stopMoving}
          className={`absolute top-2 w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
            activeDir === 'up'
              ? 'bg-amber-500 text-slate-950 border-amber-300 scale-110 shadow-lg'
              : 'bg-slate-900/50 hover:bg-slate-800/80 border-amber-500/30 text-amber-300 active:scale-90'
          }`}
          title="向上"
        >
          <ChevronUp className="w-5 h-5" />
        </button>

        {/* Down Button */}
        <button
          onMouseDown={() => startMoving(0, 1, 'down')}
          onMouseUp={stopMoving}
          onMouseLeave={stopMoving}
          onTouchStart={(e) => { e.preventDefault(); startMoving(0, 1, 'down'); }}
          onTouchEnd={stopMoving}
          className={`absolute bottom-2 w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
            activeDir === 'down'
              ? 'bg-amber-500 text-slate-950 border-amber-300 scale-110 shadow-lg'
              : 'bg-slate-900/50 hover:bg-slate-800/80 border-amber-500/30 text-amber-300 active:scale-90'
          }`}
          title="向下"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        {/* Left Button */}
        <button
          onMouseDown={() => startMoving(-1, 0, 'left')}
          onMouseUp={stopMoving}
          onMouseLeave={stopMoving}
          onTouchStart={(e) => { e.preventDefault(); startMoving(-1, 0, 'left'); }}
          onTouchEnd={stopMoving}
          className={`absolute left-2 w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
            activeDir === 'left'
              ? 'bg-amber-500 text-slate-950 border-amber-300 scale-110 shadow-lg'
              : 'bg-slate-900/50 hover:bg-slate-800/80 border-amber-500/30 text-amber-300 active:scale-90'
          }`}
          title="向左"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Right Button */}
        <button
          onMouseDown={() => startMoving(1, 0, 'right')}
          onMouseUp={stopMoving}
          onMouseLeave={stopMoving}
          onTouchStart={(e) => { e.preventDefault(); startMoving(1, 0, 'right'); }}
          onTouchEnd={stopMoving}
          className={`absolute right-2 w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
            activeDir === 'right'
              ? 'bg-amber-500 text-slate-950 border-amber-300 scale-110 shadow-lg'
              : 'bg-slate-900/50 hover:bg-slate-800/80 border-amber-500/30 text-amber-300 active:scale-90'
          }`}
          title="向右"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

      </div>
    </div>
  );
};
