import React, { useState, useEffect } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { MOUNT_TIERS, MountTierConfig } from '../../data/mounts';
import { X, Sparkles, Zap, Shield, Heart, Sword, FastForward, ChevronLeft, ChevronRight, CheckCircle2, Lock } from 'lucide-react';

interface MountModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const MountModal: React.FC<MountModalProps> = ({ engine, onClose }) => {
  const [tick, setTick] = useState(0);
  
  // Ensure mount state is initialized
  engine.initMount();
  const mount = engine.character.mount!;

  const [previewTier, setPreviewTier] = useState(mount.tier);

  useEffect(() => {
    const unsub = engine.subscribe(() => setTick(t => t + 1));
    return unsub;
  }, [engine]);

  const currentTierConfig = MOUNT_TIERS[mount.tier] || MOUNT_TIERS[1];
  const activePreviewConfig = MOUNT_TIERS[previewTier] || currentTierConfig;

  // Calculate pills in inventory
  const invPillIndex = engine.character.inventory.findIndex(i => i?.id === 'pill_mount_advance');
  const invPillCount = invPillIndex >= 0 ? (engine.character.inventory[invPillIndex]?.count || 1) : 0;
  const totalPills = mount.advancePillsCount + invPillCount;

  // Stat calculations
  const starMult = 1 + mount.level * 0.1;
  const currentSpeedBonus = Math.round(currentTierConfig.speedBonus * (1 + mount.level * 0.05) * 100);
  const currentAtkBonus = Math.floor(currentTierConfig.physAtkBonus * starMult);
  const currentHpBonus = Math.floor(currentTierConfig.hpBonus * starMult);
  const currentDefBonus = Math.floor(currentTierConfig.defBonus * starMult);
  const currentCritBonus = (currentTierConfig.critChanceBonus * starMult * 100).toFixed(1);

  // Next level preview
  const isMaxedOut = mount.tier >= 10 && mount.level >= 10;
  const isTierUnlocked = previewTier <= mount.tier;

  const handleAdvance1x = () => {
    engine.advanceMount(false);
  };

  const handleAdvance10x = () => {
    engine.advanceMount(true);
  };

  const handleToggleMount = () => {
    engine.toggleMount();
  };

  const handleEquipMount = (tier: number) => {
    if (tier <= mount.tier) {
      mount.tier = tier;
      mount.isMounted = true;
      engine.recalculateStats();
      const config = MOUNT_TIERS[tier];
      engine.addParticle(
        engine.character.x,
        engine.character.y,
        'text_gold',
        `🐴 【骑乘上马】跨上 [${config?.name || '坐骑'}]，移速翻倍！`
      );
      engine.notify();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="w-full max-w-3xl bg-slate-950 border-2 border-amber-600/70 rounded-3xl p-4 sm:p-6 relative shadow-[0_0_50px_rgba(245,158,11,0.25)] text-amber-100 max-h-[95vh] overflow-y-auto flex flex-col gap-4">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-amber-500/30 transition-all z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐴</span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                坐骑进阶系统
              </h2>
              <p className="text-[11px] text-amber-400/80 font-medium">消耗进阶丹提升阶位，获得极致移速与全属性暴增</p>
            </div>
          </div>

          <button
            onClick={handleToggleMount}
            className={`px-3.5 py-1.5 rounded-full font-bold text-xs border shadow-lg transition-all flex items-center gap-1.5 ${
              mount.isMounted
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-400 text-white shadow-emerald-900/50'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300'
            }`}
          >
            <span>{mount.isMounted ? '骑乘中 🐴' : '步战中 🚶'}</span>
            <span className="text-[10px] opacity-80">(点击切换)</span>
          </button>
        </div>

        {/* Tier Selector Carousel */}
        <div className="relative bg-slate-900/90 border border-amber-500/40 p-2.5 rounded-2xl">
          <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-thin scrollbar-thumb-amber-600/50 scrollbar-track-slate-950/50 py-1 px-1">
            {Object.values(MOUNT_TIERS).map(t => {
              const isUnlocked = t.tier <= mount.tier;
              const isCurrent = t.tier === mount.tier;
              const isSelected = t.tier === previewTier;

              return (
                <button
                  key={t.tier}
                  onClick={() => setPreviewTier(t.tier)}
                  className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl min-w-[82px] sm:min-w-[92px] h-[85px] sm:h-[95px] shrink-0 transition-all border relative ${
                    isSelected
                      ? 'bg-gradient-to-b from-amber-500/30 to-yellow-600/20 border-amber-400 text-yellow-300 shadow-[0_0_18px_rgba(245,158,11,0.5)] scale-105 z-10'
                      : isCurrent
                      ? 'bg-amber-950/70 border-amber-500/70 text-amber-200'
                      : isUnlocked
                      ? 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      : 'bg-slate-950/90 border-slate-800/80 text-slate-500 opacity-60'
                  }`}
                >
                  <span className="text-2xl sm:text-3xl leading-none mb-1">{t.icon}</span>
                  <span className="text-xs font-black tracking-wide truncate max-w-full">
                    {t.tier}阶
                  </span>
                  
                  {isCurrent && (
                    <span className="mt-0.5 text-[9px] bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 px-1.5 py-0.2 rounded font-black shadow-sm">
                      当前骑乘
                    </span>
                  )}
                  
                  {!isUnlocked && (
                    <span className="flex items-center gap-0.5 text-[9px] text-slate-500 mt-0.5">
                      <Lock className="w-2.5 h-2.5" /> 未解锁
                    </span>
                  )}
                  {isUnlocked && !isCurrent && (
                    <span className="text-[9px] text-amber-400/60 mt-0.5 font-semibold">
                      已解锁
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Display Box */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Left Column: Visual Showcase */}
          <div className="md:col-span-5 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-amber-500/30 rounded-2xl p-4 flex flex-col items-center justify-between relative overflow-hidden min-h-[260px]">
            {/* Background Glow */}
            <div
              className="absolute inset-0 opacity-20 blur-2xl rounded-full"
              style={{ backgroundColor: activePreviewConfig.auraColor }}
            />

            {/* Title & Badge */}
            <div className="z-10 text-center">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 border border-amber-400/50 text-amber-300 uppercase tracking-widest mb-1">
                {activePreviewConfig.name}
              </div>
              <p className="text-[11px] text-amber-200/80 italic">{activePreviewConfig.subtitle}</p>
            </div>

            {/* Giant Icon Visual */}
            <div className="z-10 my-4 relative group">
              <div
                className="text-7xl sm:text-8xl transition-all duration-300 transform group-hover:scale-110 drop-shadow-[0_0_25px_rgba(245,158,11,0.6)]"
              >
                {activePreviewConfig.icon}
              </div>
            </div>

            {/* Description Text */}
            <p className="z-10 text-[11px] text-slate-300 text-center px-2 leading-relaxed bg-slate-950/80 border border-amber-900/40 p-2 rounded-xl w-full">
              {activePreviewConfig.description}
            </p>

            {/* Equip / Mount Selected Tier Button */}
            <div className="w-full mt-2 z-10">
              {isTierUnlocked ? (
                <button
                  onClick={() => handleEquipMount(previewTier)}
                  className={`w-full py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md border transition-all ${
                    mount.isMounted && mount.tier === previewTier
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-400 text-white shadow-emerald-900/50'
                      : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 border-yellow-300 text-slate-950 cursor-pointer active:scale-95'
                  }`}
                >
                  <span>
                    {mount.isMounted && mount.tier === previewTier
                      ? '✅ 正在骑乘中 (移速翻倍生效)'
                      : `🐴 骑乘 [${activePreviewConfig.name}] (移速翻倍)`}
                  </span>
                </button>
              ) : (
                <div className="w-full py-2 px-3 rounded-xl font-bold text-xs bg-slate-950/80 border border-slate-800 text-slate-500 text-center flex items-center justify-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> 进阶升至 {previewTier}阶 解锁此坐骑
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Stats & Advancement Controls */}
          <div className="md:col-span-7 bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3">
            
            {/* Star Rating Section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  当前坐骑星级: <span className="text-yellow-400 font-extrabold">{mount.tier}阶 {mount.level}星</span>
                </span>
                <span className="text-[11px] font-bold text-amber-400">
                  {mount.level} / {currentTierConfig.maxLevel} 星
                </span>
              </div>

              {/* Star Rating Icons */}
              <div className="flex items-center justify-between bg-slate-950 border border-amber-900/50 p-2 rounded-xl">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const isFilled = idx < mount.level;
                  return (
                    <span
                      key={idx}
                      className={`text-base sm:text-lg transition-transform ${
                        isFilled ? 'scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'opacity-25 grayscale'
                      }`}
                    >
                      ⭐
                    </span>
                  );
                })}
              </div>

              {/* Advancement EXP Progress Bar */}
              <div className="mt-2.5">
                <div className="flex justify-between text-[10px] text-amber-300/80 mb-1 font-extrabold">
                  <span>进阶值经验 (祝福值)</span>
                  <span>{mount.exp} / {currentTierConfig.expPerLevel} EXP</span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-amber-600/40 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.8)]"
                    style={{ width: `${Math.min(100, (mount.exp / currentTierConfig.expPerLevel) * 100).toFixed(1)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stat Attributes Table */}
            <div className="bg-slate-950/90 border border-amber-900/60 p-3 rounded-xl flex flex-col gap-2">
              <div className="text-xs font-black text-amber-400 border-b border-amber-900/40 pb-1 flex items-center justify-between">
                <span>坐骑战力加成属性 (当前属性)</span>
                {mount.isMounted && (
                  <span className="text-[10px] text-emerald-400 font-extrabold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                    ⚡ 骑乘状态特权生效
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" /> 移动速度
                  </span>
                  <span className="font-extrabold text-yellow-300">
                    {mount.isMounted ? `⚡ 骑乘加速 (+${Math.round((engine.stats.moveSpeedBonus || 0) * 100)}%)` : `+${currentSpeedBonus}%`}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Sword className="w-3.5 h-3.5 text-rose-400" /> 全系攻击
                  </span>
                  <span className="font-extrabold text-amber-200">+{currentAtkBonus}</span>
                </div>

                <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-red-500" /> 生命上限
                  </span>
                  <span className="font-extrabold text-emerald-300">+{currentHpBonus}</span>
                </div>

                <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" /> 双防防御
                  </span>
                  <span className="font-extrabold text-cyan-200">+{currentDefBonus}</span>
                </div>

                <div className="col-span-2 flex items-center justify-between bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" /> 额外暴击率加成
                  </span>
                  <span className="font-extrabold text-purple-300">+{currentCritBonus}%</span>
                </div>
              </div>
            </div>

            {/* Material Counter & Buttons */}
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-amber-900/50 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💊✨</span>
                  <div>
                    <span className="font-bold text-amber-200">坐骑进阶丹</span>
                    <p className="text-[10px] text-slate-400">可在打怪爆装或元宝商城中购买</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-amber-300 text-sm">{totalPills}</span>
                  <span className="text-[10px] text-slate-400 ml-1">颗可用</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleAdvance1x}
                  disabled={totalPills <= 0 || isMaxedOut}
                  className="py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-600 to-yellow-600 hover:brightness-110 disabled:opacity-50 disabled:grayscale text-slate-950 shadow-lg border border-yellow-300 flex items-center justify-center gap-1 transition-all active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>单次进阶 (1丹)</span>
                </button>

                <button
                  onClick={handleAdvance10x}
                  disabled={totalPills <= 0 || isMaxedOut}
                  className="py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 hover:brightness-110 disabled:opacity-50 disabled:grayscale text-white shadow-lg border border-amber-300 flex items-center justify-center gap-1 transition-all active:scale-95"
                >
                  <FastForward className="w-4 h-4 text-yellow-200" />
                  <span>一键进阶 (10丹)</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
