import React from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { Shield, Swords, X, Skull, Crown, Flame } from 'lucide-react';

interface MonsterTargetBarProps {
  engine: GameEngine;
}

export const MonsterTargetBar: React.FC<MonsterTargetBarProps> = ({ engine }) => {
  // Find active target monster (explicitly targeted or currently engaged in combat)
  const targetId = engine.targetMonsterId;
  let targetMonster = engine.monsters.find(m => m.id === targetId && m.hp > 0);

  // If no explicit target, fallback to nearest monster with aggro or living monster in range
  if (!targetMonster) {
    targetMonster = engine.monsters.find(m => m.hp > 0 && (m.aggroPlayer || 0) > 0);
  }

  if (!targetMonster || targetMonster.hp <= 0) {
    return null;
  }

  const hpRatio = Math.max(0, Math.min(1, targetMonster.hp / targetMonster.maxHp));
  const hpPercent = (hpRatio * 100).toFixed(1);

  const isBoss = targetMonster.isBoss;
  const isElite = targetMonster.rarity === 'epic' || targetMonster.rarity === 'legendary' || targetMonster.maxHp > 3000;

  // Icon badge based on monster name or template
  const name = targetMonster.name;
  const icon = isBoss ? '👹' :
    name.includes('猪') ? '🐗' :
    name.includes('鸡') ? '🐔' :
    name.includes('鹿') ? '🦌' :
    name.includes('猫') ? '🐱' :
    name.includes('蛇') ? '🐍' :
    (name.includes('骷髅') || name.includes('尸')) ? '💀' :
    name.includes('沃玛') ? '😈' :
    name.includes('祖玛') ? '🗿' :
    name.includes('赤月') ? '👁️' :
    name.includes('龙') ? '🐉' : '👾';

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-md sm:max-w-lg pointer-events-auto animate-fadeIn">
      <div className={`relative overflow-hidden rounded-2xl p-2.5 sm:p-3 border-2 shadow-[0_10px_25px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all ${
        isBoss
          ? 'bg-gradient-to-r from-red-950/95 via-slate-950/95 to-red-950/95 border-red-500/80 shadow-red-950/50'
          : isElite
          ? 'bg-gradient-to-r from-purple-950/95 via-slate-950/95 to-purple-950/95 border-purple-500/70 shadow-purple-950/40'
          : 'bg-slate-950/90 border-amber-600/50 shadow-black/80'
      }`}>
        {/* Animated Background Pulse for Boss */}
        {isBoss && (
          <div className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none" />
        )}

        {/* Top Header Row: Icon, Name, Level, Rarity Tag, Close */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            {/* Monster Icon Avatar */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
              isBoss
                ? 'bg-red-900/80 border-red-400 text-red-200 shadow-md shadow-red-500/30'
                : isElite
                ? 'bg-purple-900/80 border-purple-400 text-purple-200'
                : 'bg-slate-800 border-amber-500/40'
            }`}>
              {icon}
            </div>

            {/* Monster Name & Badges */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className={`font-black text-sm sm:text-base truncate ${
                  isBoss ? 'text-red-300 drop-shadow-[0_2px_4px_rgba(239,68,68,0.8)]' : isElite ? 'text-purple-200' : 'text-amber-200'
                }`}>
                  {targetMonster.name}
                </span>

                <span className="text-[10px] font-extrabold bg-amber-950/80 border border-amber-700/60 text-amber-300 px-1.5 py-0.2 rounded shrink-0">
                  LV.{targetMonster.level}
                </span>

                {isBoss && (
                  <span className="text-[10px] font-black bg-red-600 text-white px-1.5 py-0.2 rounded-md shadow-sm flex items-center gap-0.5 shrink-0 animate-pulse">
                    <Flame className="w-3 h-3" /> 终极BOSS
                  </span>
                )}

                {!isBoss && isElite && (
                  <span className="text-[10px] font-bold bg-purple-900 text-purple-200 border border-purple-500/50 px-1.5 py-0.2 rounded shrink-0 flex items-center gap-0.5">
                    <Crown className="w-3 h-3 text-amber-300" /> 精英霸主
                  </span>
                )}
              </div>

              {/* Stats Summary */}
              <div className="flex items-center gap-3 text-[11px] text-slate-300/90 font-medium">
                <span className="flex items-center gap-1 text-amber-400">
                  <Swords className="w-3 h-3" /> 攻击: {targetMonster.physAtk}
                </span>
                <span className="flex items-center gap-1 text-blue-300">
                  <Shield className="w-3 h-3" /> 防御: {targetMonster.physDef}
                </span>
              </div>
            </div>
          </div>

          {/* Deselect Button */}
          <button
            onClick={() => {
              engine.targetMonsterId = null;
              engine.notify();
            }}
            title="取消锁定目标"
            className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all shrink-0 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Monster HP Bar Container */}
        <div className="relative z-10 w-full h-5 sm:h-6 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
          {/* Animated Liquid HP Bar */}
          <div
            className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ease-out rounded-l-xl ${
              isBoss
                ? 'bg-gradient-to-r from-red-700 via-rose-500 to-red-600'
                : isElite
                ? 'bg-gradient-to-r from-purple-700 via-fuchsia-500 to-pink-600'
                : 'bg-gradient-to-r from-amber-600 via-yellow-500 to-orange-500'
            }`}
            style={{ width: `${hpRatio * 100}%` }}
          >
            {/* Shimmer Effect */}
            <div className="w-full h-full bg-gradient-to-b from-white/25 via-transparent to-black/20" />
          </div>

          {/* HP Numerical Display Overlay (e.g., 8,450 / 12,000 HP (70.4%)) */}
          <div className="relative z-10 font-black text-xs sm:text-sm text-white drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)] flex items-center gap-1.5 px-2">
            <span>{targetMonster.hp.toLocaleString()}</span>
            <span className="text-slate-300 font-normal">/</span>
            <span>{targetMonster.maxHp.toLocaleString()}</span>
            <span className="text-amber-300 font-extrabold ml-1">({hpPercent}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
