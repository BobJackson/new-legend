import React, { useEffect, useState } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { Zap } from 'lucide-react';

interface ComboOverlayProps {
  engine: GameEngine;
}

export const ComboOverlay: React.FC<ComboOverlayProps> = ({ engine }) => {
  const [combo, setCombo] = useState(engine.comboCount);
  const [lastHit, setLastHit] = useState(engine.lastHitTime);
  const [now, setNow] = useState(Date.now());
  const [isHitAnim, setIsHitAnim] = useState(false);

  useEffect(() => {
    const unsubscribe = engine.subscribe(() => {
      if (engine.comboCount !== combo || engine.lastHitTime !== lastHit) {
        setCombo(engine.comboCount);
        setLastHit(engine.lastHitTime);
        setIsHitAnim(true);
        const timer = setTimeout(() => setIsHitAnim(false), 150);
        return () => clearTimeout(timer);
      }
    });
    return unsubscribe;
  }, [engine, combo, lastHit]);

  // Smooth timer tick for countdown bar
  useEffect(() => {
    if (combo <= 0) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 40);
    return () => clearInterval(interval);
  }, [combo]);

  if (combo < 2) return null;

  const showRight = engine.character.combatDisplaySettings?.showRightDamage ?? true;
  if (!showRight) return null;

  const timeElapsed = now - lastHit;
  const timeoutMs = engine.comboTimeoutMs || 3000;
  const timeRemainingRatio = Math.max(0, (timeoutMs - timeElapsed) / timeoutMs);
  const bonusPct = (Math.min(0.40, Math.floor(combo * 0.015 * 1000) / 1000) * 100).toFixed(1);

  // Dynamic Combo Tier Titles & Styling
  let rankTitle = '初露锋芒';
  let badgeGradient = 'from-amber-500 to-yellow-600 text-slate-950 border-yellow-300';
  let numberGradient = 'from-yellow-300 via-amber-400 to-orange-500';
  let glowColor = 'rgba(245,158,11,0.85)';
  let icon = '🔥';

  if (combo >= 50) {
    rankTitle = '👑 超神连斩 GODLIKE';
    badgeGradient = 'from-purple-600 via-pink-500 to-amber-400 text-white border-yellow-200';
    numberGradient = 'from-yellow-200 via-purple-300 to-pink-500';
    glowColor = 'rgba(236,72,153,0.95)';
    icon = '👑';
  } else if (combo >= 35) {
    rankTitle = '🐲 万夫不当 RAMPAGE';
    badgeGradient = 'from-rose-600 to-orange-500 text-white border-rose-300';
    numberGradient = 'from-rose-300 via-orange-400 to-red-600';
    glowColor = 'rgba(244,63,94,0.9)';
    icon = '🐲';
  } else if (combo >= 20) {
    rankTitle = '💥 横扫千军 DOMINATING';
    badgeGradient = 'from-red-600 to-amber-500 text-white border-amber-300';
    numberGradient = 'from-amber-200 via-red-400 to-orange-600';
    glowColor = 'rgba(239,68,68,0.85)';
    icon = '💥';
  } else if (combo >= 10) {
    rankTitle = '⚡ 势如破竹 UNSTOPPABLE';
    badgeGradient = 'from-yellow-500 to-amber-600 text-slate-950 border-yellow-200';
    numberGradient = 'from-yellow-200 via-amber-300 to-yellow-500';
    glowColor = 'rgba(234,179,8,0.85)';
    icon = '⚡';
  }

  return (
    <div className="absolute right-3 top-16 sm:top-20 z-30 pointer-events-none flex flex-col items-end select-none animate-fadeIn">
      <div className="bg-slate-950/85 backdrop-blur-md border-2 border-amber-500/60 p-2.5 sm:p-3 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.85)] flex flex-col items-end gap-1 min-w-[160px] sm:min-w-[190px]">
        {/* Combo Title Badge */}
        <div className={`px-2.5 py-0.5 rounded-full font-black text-[10px] sm:text-xs bg-gradient-to-r ${badgeGradient} shadow-md border flex items-center gap-1 uppercase tracking-wider`}>
          <span>{icon}</span>
          <span>{rankTitle}</span>
        </div>

        {/* Big Combo Counter Number */}
        <div className="flex items-baseline gap-1 my-0.5">
          <span className="text-[10px] sm:text-xs font-black text-amber-400 italic">COMBO</span>
          <span
            className={`font-black italic text-4xl sm:text-5xl tracking-tighter bg-gradient-to-b ${numberGradient} bg-clip-text text-transparent transition-all duration-100 ${
              isHitAnim ? 'scale-125' : 'scale-100'
            }`}
            style={{ filter: `drop-shadow(0 0 14px ${glowColor})` }}
          >
            {combo}
          </span>
          <span className="text-base sm:text-lg font-black text-yellow-300">连击</span>
        </div>

        {/* BUFF Indicator */}
        <div className="w-full bg-slate-900/90 border border-amber-600/40 rounded-xl p-1.5 flex flex-col gap-1 text-[10px] sm:text-[11px]">
          <div className="flex items-center justify-between font-extrabold text-amber-200">
            <span className="flex items-center gap-1 text-amber-300">
              <Zap className="w-3.5 h-3.5 text-yellow-400 animate-bounce" /> 狂暴BUFF
            </span>
            <span className="text-emerald-400 font-black">
              暴击率 +{bonusPct}%
            </span>
          </div>

          {/* Countdown Bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-orange-500 rounded-full transition-all duration-75"
              style={{ width: `${(timeRemainingRatio * 100).toFixed(1)}%` }}
            />
          </div>
        </div>

        {engine.highestCombo > 3 && (
          <div className="text-[9px] text-amber-400/80 font-bold mt-0.5">
            最高连击: {engine.highestCombo} 次
          </div>
        )}
      </div>
    </div>
  );
};
