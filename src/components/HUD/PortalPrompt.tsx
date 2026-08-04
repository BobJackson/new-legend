import React, { useEffect } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { MAP_DATABASE } from '../../data/maps';
import { Zap, Compass, Sparkles } from 'lucide-react';

interface PortalPromptProps {
  engine: GameEngine;
  onOpenPortalModal: () => void;
}

export const PortalPrompt: React.FC<PortalPromptProps> = ({ engine, onOpenPortalModal }) => {
  const nearbyPortal = engine.getNearbyPortal(3.5);

  // Keyboard shortcut listener: Press 'F' or 'Space' to trigger nearby portal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in input or modal open
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.key === 'f' || e.key === 'F') && nearbyPortal) {
        e.preventDefault();
        engine.teleportToPortal(nearbyPortal);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, nearbyPortal]);

  if (!nearbyPortal) return null;

  const targetMap = MAP_DATABASE[nearbyPortal.targetMapId];
  const reqLevel = targetMap ? targetMap.reqLevel : 1;
  const isLevelEnough = engine.character.level >= reqLevel;

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 animate-bounce-short">
      {/* Glow pulse container */}
      <div className="bg-slate-950/90 border border-blue-500/70 shadow-[0_0_25px_rgba(59,130,246,0.6)] rounded-2xl p-2.5 px-4 flex items-center gap-3 backdrop-blur-md">
        <div className="relative w-10 h-10 rounded-xl bg-blue-900/60 border border-blue-400/60 flex items-center justify-center text-xl shadow-inner">
          <span className="animate-spin-slow">🌀</span>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-300 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              发现传送阵交互点
            </span>
            <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-700/60 px-1.5 py-0.2 rounded font-mono">
              [靠近中]
            </span>
          </div>
          <span className="text-sm font-black text-amber-200 truncate max-w-[220px]">
            {nearbyPortal.label}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-1">
          <button
            onClick={() => engine.teleportToPortal(nearbyPortal)}
            disabled={!isLevelEnough}
            className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
              isLevelEnough
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-300/60 shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            {isLevelEnough ? '立即传送 (F)' : `LV ${reqLevel} 解锁`}
          </button>

          <button
            onClick={onOpenPortalModal}
            className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-amber-500/50 text-amber-200 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm"
            title="查看大陆所有传送阵与地图名录"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            全传送阵
          </button>
        </div>
      </div>

      <span className="text-[10px] text-blue-200/80 bg-slate-900/80 px-2 py-0.5 rounded-full border border-blue-900/40">
        💡 按 <b>[F]</b> 键或点击按钮直接场景切换
      </span>
    </div>
  );
};
