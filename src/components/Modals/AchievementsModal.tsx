import React, { useState } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { ACHIEVEMENT_DATABASE } from '../../data/achievements';
import { AchievementCategory, Achievement } from '../../types/game';
import { X, Award, CheckCircle2, Shield, Sparkles, Lock, Trophy, Zap } from 'lucide-react';

interface AchievementsModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ engine, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');

  engine.initAchievementData();
  const unlockedSet = new Set(engine.character.unlockedAchievementIds || []);
  const claimedSet = new Set(engine.character.claimedAchievementIds || []);
  const equippedTitleId = engine.character.equippedTitleId;
  const stats = engine.character.achievementStats!;

  const categories: { key: AchievementCategory | 'all'; label: string; icon: string }[] = [
    { key: 'all', label: '全部成就', icon: '🏆' },
    { key: 'kill', label: '斩妖杀敌', icon: '🪓' },
    { key: 'level', label: '等级突破', icon: '👑' },
    { key: 'boss', label: 'Boss屠戮', icon: '🐉' },
    { key: 'map', label: '地图探险', icon: '🗺️' },
    { key: 'forge', label: '神兵淬炼', icon: '🔨' },
    { key: 'gold', label: '富甲一方', icon: '💰' }
  ];

  const filteredAchievements = ACHIEVEMENT_DATABASE.filter(ach => {
    if (selectedCategory === 'all') return true;
    return ach.category === selectedCategory;
  });

  const getProgress = (ach: Achievement): { current: number; target: number; pct: number } => {
    let current = 0;
    if (ach.category === 'level') current = stats.maxLevelReached;
    else if (ach.category === 'kill') current = stats.totalKills;
    else if (ach.category === 'boss') current = stats.bossKills;
    else if (ach.category === 'map') current = stats.mapClears;
    else if (ach.category === 'forge') current = stats.forgeTimes;
    else if (ach.category === 'gold') current = stats.totalGoldEarned;

    const target = ach.targetCount;
    const pct = Math.min(100, Math.floor((current / target) * 100));
    return { current, target, pct };
  };

  const totalUnlockedCount = unlockedSet.size;
  const totalCount = ACHIEVEMENT_DATABASE.length;
  const overallProgressPct = Math.floor((totalUnlockedCount / totalCount) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-slate-900 border-2 border-amber-800 rounded-2xl p-6 relative shadow-2xl text-amber-100 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-900/50 pb-4 mb-4 gap-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl p-2 bg-gradient-to-br from-amber-950 to-slate-900 border border-amber-600/40 rounded-xl shadow-inner">
              🏆
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-amber-300 flex items-center gap-2">
                成就徽章与神级称号
              </h2>
              <p className="text-xs text-amber-500/90 mt-0.5">
                达成条件解锁专属称号与永久战斗属性提升，佩戴称号可享 1.5 倍属性增幅！
              </p>
            </div>
          </div>

          {/* Progress Badge */}
          <div className="bg-slate-950/80 border border-amber-800/60 rounded-xl p-2.5 px-4 flex flex-col items-end min-w-[150px]">
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              成就完成度: {totalUnlockedCount} / {totalCount}
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-amber-950 mt-1.5">
              <div
                className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 h-full transition-all duration-300"
                style={{ width: `${overallProgressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Currently Equipped Title Display */}
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-950 to-amber-950/60 border border-amber-600/40 rounded-xl p-3 mb-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-400 font-bold">当前佩戴称号:</span>
            <span className="text-sm font-extrabold text-amber-300 px-3 py-1 bg-amber-900/50 border border-amber-500/60 rounded-lg shadow-[0_0_10px_rgba(245,158,11,0.25)]">
              {engine.character.title || '平民'}
            </span>
            {equippedTitleId && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-600/50 px-2 py-0.5 rounded">
                ⚡ 享受 1.5 倍专属属性增幅
              </span>
            )}
          </div>

          {equippedTitleId && (
            <button
              onClick={() => engine.equipTitle(null)}
              className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 font-bold"
            >
              卸下称号
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none border-b border-slate-800">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.key
                  ? 'bg-amber-600 text-white border border-amber-400 shadow-md scale-105'
                  : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Achievements List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-amber-800/40">
          {filteredAchievements.map(ach => {
            const isUnlocked = unlockedSet.has(ach.id);
            const isClaimed = claimedSet.has(ach.id);
            const isEquipped = equippedTitleId === ach.id;
            const { current, target, pct } = getProgress(ach);

            return (
              <div
                key={ach.id}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isEquipped
                    ? 'bg-gradient-to-r from-amber-950/80 via-slate-950 to-amber-950/80 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : isUnlocked
                    ? 'bg-slate-950 border-amber-800/60 hover:border-amber-600'
                    : 'bg-slate-950/40 border-slate-800/80 opacity-75'
                }`}
              >
                {/* Left: Badge & Info */}
                <div className="flex items-start gap-3.5 flex-1">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2 shrink-0 ${
                      isUnlocked
                        ? 'bg-amber-950/80 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'bg-slate-900 border-slate-800 grayscale'
                    }`}
                  >
                    {ach.titleBadge}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-base font-bold ${isUnlocked ? 'text-amber-200' : 'text-slate-400'}`}>
                        {ach.titleName}
                      </h3>
                      {isEquipped && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500 text-slate-950 border border-amber-300">
                          当前佩戴中
                        </span>
                      )}
                      {isUnlocked && !isClaimed && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 animate-pulse">
                          可领奖
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300">{ach.description}</p>

                    {/* Stat Bonus Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {ach.statBonus.maxHp && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-800/60 rounded">
                          HP +{ach.statBonus.maxHp}
                        </span>
                      )}
                      {ach.statBonus.physAtk && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800/60 rounded">
                          攻击 +{ach.statBonus.physAtk}
                        </span>
                      )}
                      {ach.statBonus.physDef && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-900 text-slate-300 border border-slate-700 rounded">
                          防御 +{ach.statBonus.physDef}
                        </span>
                      )}
                      {ach.statBonus.critChance && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-950/80 text-purple-300 border border-purple-800/60 rounded">
                          暴击 +{(ach.statBonus.critChance * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Progress Bar & Actions */}
                <div className="flex flex-col sm:items-end justify-between gap-2.5 shrink-0 min-w-[160px]">
                  {/* Progress info */}
                  <div className="w-full text-right">
                    <div className="text-[11px] font-bold text-slate-400 mb-1 flex justify-between sm:justify-end gap-2">
                      <span>进度:</span>
                      <span className={isUnlocked ? 'text-amber-300 font-extrabold' : 'text-slate-400'}>
                        {current.toLocaleString()} / {target.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isUnlocked ? 'bg-amber-400' : 'bg-slate-700'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Rewards and Action Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full pt-1">
                    {/* Rewards icons */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      {ach.rewardGold && <span>🪙 {ach.rewardGold.toLocaleString()}</span>}
                      {ach.rewardIngot && <span className="text-yellow-300">💎 {ach.rewardIngot}</span>}
                    </div>

                    {/* Action buttons */}
                    {isUnlocked && !isClaimed ? (
                      <button
                        onClick={() => engine.claimAchievementReward(ach.id)}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-xs rounded-lg shadow-md border border-amber-300 active:scale-95 transition-all flex items-center gap-1 animate-bounce"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> 领取奖励
                      </button>
                    ) : isUnlocked && isClaimed ? (
                      isEquipped ? (
                        <button
                          disabled
                          className="px-3 py-1.5 bg-amber-950 text-amber-400 border border-amber-600/50 rounded-lg text-xs font-bold cursor-default"
                        >
                          已佩戴
                        </button>
                      ) : (
                        <button
                          onClick={() => engine.equipTitle(ach.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-600/60 hover:border-amber-400 rounded-lg text-xs font-bold transition-all"
                        >
                          佩戴称号
                        </button>
                      )
                    ) : (
                      <div className="px-3 py-1.5 bg-slate-900 text-slate-500 border border-slate-800 rounded-lg text-xs font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" /> 未达成
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
