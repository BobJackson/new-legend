import React from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { User, ShoppingBag, Flame, Hammer, Skull, Users, Store, Zap, Heart, Award, Bot } from 'lucide-react';

interface BottomBarProps {
  engine: GameEngine;
  onOpenModal: (modalName: string) => void;
  onCastSkill: (skillId: string) => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({ engine, onOpenModal, onCastSkill }) => {
  const hpRatio = engine.stats.maxHp > 0 ? (engine.stats.hp / engine.stats.maxHp) * 100 : 0;
  const mpRatio = engine.stats.maxMp > 0 ? (engine.stats.mp / engine.stats.maxMp) * 100 : 0;
  const expRatio = engine.character.maxExp > 0 ? (engine.character.exp / engine.character.maxExp) * 100 : 0;

  const quickSkills = engine.character.skills;

  return (
    <div className="w-full bg-slate-950/95 border-t-2 border-amber-900/60 p-2 text-amber-100 flex flex-col gap-2 backdrop-blur-md select-none z-20">
      {/* EXP Progress Bar & Quick Levelup Pill */}
      <div className="w-full flex items-center gap-2">
        <div className="flex-1 bg-slate-900 h-2.5 rounded-full overflow-hidden border border-amber-950 relative shadow-inner">
          <div
            className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 h-full transition-all duration-300"
            style={{ width: `${Math.min(100, expRatio)}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            EXP: {engine.character.exp.toLocaleString()} / {engine.character.maxExp.toLocaleString()} ({expRatio.toFixed(1)}%)
          </span>
        </div>

        <button
          onClick={() => engine.buyAndUseLevelUpPill()}
          title="消耗 10 元宝购买直升经验丹，瞬间满经验升级！"
          className="px-2 py-0.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:brightness-125 text-slate-950 text-[10px] font-black rounded-md border border-yellow-200 shadow-[0_0_10px_rgba(245,158,11,0.5)] flex items-center gap-1 active:scale-95 transition-all whitespace-nowrap"
        >
          <span>⚡ 一键升级</span>
          <span className="bg-slate-950 text-amber-300 px-1 py-0.2 rounded text-[9px] border border-amber-500/50">10元宝</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* HP / MP Orbs Gauge */}
        <div className="flex items-center gap-3">
          {/* HP Orb */}
          <div className="relative w-12 h-12 rounded-full bg-slate-900 border-2 border-rose-900 overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(225,29,72,0.3)]">
            <div
              className="absolute bottom-0 w-full bg-gradient-to-t from-rose-700 to-red-500 transition-all duration-300"
              style={{ height: `${hpRatio}%` }}
            />
            <span className="relative z-10 text-[10px] font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              {engine.stats.hp}
            </span>
          </div>

          {/* MP Orb */}
          <div className="relative w-12 h-12 rounded-full bg-slate-900 border-2 border-blue-900 overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.3)]">
            <div
              className="absolute bottom-0 w-full bg-gradient-to-t from-blue-700 to-sky-400 transition-all duration-300"
              style={{ height: `${mpRatio}%` }}
            />
            <span className="relative z-10 text-[10px] font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              {engine.stats.mp}
            </span>
          </div>
        </div>

        {/* Skill Quick Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {quickSkills.map((skill) => {
            const isUnlocked = engine.character.level >= skill.reqLevel;
            const now = Date.now();
            const cdRemaining = Math.max(0, skill.cooldownMs - (now - skill.lastCastTime));
            const cdRatio = skill.cooldownMs > 0 ? cdRemaining / skill.cooldownMs : 0;

            return (
              <button
                key={skill.id}
                onClick={() => isUnlocked && !skill.isPassive && onCastSkill(skill.id)}
                disabled={!isUnlocked || skill.isPassive || cdRemaining > 0}
                className={`relative w-11 h-11 rounded-xl border flex flex-col items-center justify-center transition-all shadow-md overflow-hidden ${
                  !isUnlocked
                    ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'
                    : skill.isPassive
                    ? 'bg-slate-900 border-sky-800/80 hover:border-sky-400'
                    : 'bg-gradient-to-br from-slate-900 to-amber-950 border-amber-800/80 hover:border-amber-400 active:scale-95'
                }`}
                title={
                  !isUnlocked
                    ? `Lv.${skill.reqLevel} 解锁`
                    : skill.isPassive
                    ? `${skill.name} (被动技能，自动生效)`
                    : skill.name
                }
              >
                <span className="text-lg">{skill.icon}</span>
                <span className="text-[9px] font-bold text-amber-200 mt-0.5 truncate max-w-[40px]">
                  {skill.name}
                </span>

                {/* Cooldown Overlay Sweep */}
                {cdRatio > 0 && !skill.isPassive && (
                  <div
                    className="absolute inset-0 bg-black/70 flex items-center justify-center"
                    style={{ clipPath: `inset(0 0 ${(1 - cdRatio) * 100}% 0)` }}
                  >
                    <span className="text-[10px] font-black text-amber-300">
                      {(cdRemaining / 1000).toFixed(1)}s
                    </span>
                  </div>
                )}

                {/* Passive Badge */}
                {skill.isPassive && (
                  <span className="absolute top-0 right-0 bg-sky-600 text-[8px] font-black text-white px-1 rounded-bl">
                    被动
                  </span>
                )}

                {/* Locked Badge */}
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                    <span className="text-[9px] font-black text-slate-400">Lv.{skill.reqLevel}</span>
                  </div>
                )}
              </button>
            );
          })}

          {/* Quick Potion Button */}
          <button
            onClick={() => {
              engine.stats.hp = Math.min(engine.stats.maxHp, engine.stats.hp + 500);
              engine.stats.mp = Math.min(engine.stats.maxMp, engine.stats.mp + 300);
              engine.addParticle(engine.character.x, engine.character.y, 'heal_green', '饮用太阳水 +500HP');
            }}
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-950 to-amber-950 border border-rose-500/60 flex flex-col items-center justify-center hover:brightness-125 transition-all shadow-md"
            title="太阳水保命"
          >
            <span className="text-lg">🧪</span>
            <span className="text-[9px] font-bold text-rose-300">保命</span>
          </button>
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onOpenModal('character')}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-slate-900 border border-amber-900/40 hover:border-amber-500 hover:bg-slate-800 text-amber-200 transition-all text-[10px]"
          >
            <User className="w-4 h-4 text-amber-400" />
            <span>角色</span>
          </button>

          <button
            onClick={() => onOpenModal('achievements')}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-slate-900 border border-amber-900/40 hover:border-amber-500 hover:bg-slate-800 text-yellow-300 transition-all text-[10px] relative"
          >
            <Award className="w-4 h-4 text-yellow-400" />
            <span>成就</span>
          </button>

          <button
            onClick={() => onOpenModal('mount')}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-b from-amber-950 to-slate-900 border border-amber-500/60 hover:border-amber-400 hover:bg-slate-800 text-amber-200 transition-all text-[10px] shadow-sm relative group"
            title="坐骑进阶系统"
          >
            <span className="text-sm">🐴</span>
            <span className="font-bold text-yellow-300">坐骑</span>
          </button>

          <button
            onClick={() => onOpenModal('inventory')}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-slate-900 border border-amber-900/40 hover:border-amber-500 hover:bg-slate-800 text-amber-200 transition-all text-[10px]"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>背包</span>
          </button>

          <button
            onClick={() => onOpenModal('skills')}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-slate-900 border border-amber-900/40 hover:border-amber-500 hover:bg-slate-800 text-amber-200 transition-all text-[10px]"
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>技能</span>
          </button>

          <button
            onClick={() => onOpenModal('forge')}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-slate-900 border border-amber-900/40 hover:border-amber-500 hover:bg-slate-800 text-amber-200 transition-all text-[10px]"
          >
            <Hammer className="w-4 h-4 text-amber-400" />
            <span>锻造</span>
          </button>

          <button
            onClick={() => onOpenModal('boss')}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-slate-900 border border-amber-900/40 hover:border-amber-500 hover:bg-slate-800 text-amber-200 transition-all text-[10px]"
          >
            <Skull className="w-4 h-4 text-rose-400" />
            <span>Boss</span>
          </button>

          <button
            onClick={() => onOpenModal('guild')}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-slate-900 border border-amber-900/40 hover:border-amber-500 hover:bg-slate-800 text-amber-200 transition-all text-[10px]"
          >
            <Users className="w-4 h-4 text-sky-400" />
            <span>行会</span>
          </button>

          <button
            onClick={() => onOpenModal('autoSettings')}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-slate-900 border border-amber-500/50 hover:border-amber-400 hover:bg-slate-800 text-amber-200 transition-all text-[10px]"
            title="拾取与自动回收"
          >
            <Bot className="w-4 h-4 text-emerald-400" />
            <span>回收</span>
          </button>

          <button
            onClick={() => onOpenModal('shop')}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-slate-900 border border-amber-900/40 hover:border-amber-500 hover:bg-slate-800 text-amber-200 transition-all text-[10px]"
          >
            <Store className="w-4 h-4 text-amber-400" />
            <span>商城</span>
          </button>
        </div>
      </div>
    </div>
  );
};
