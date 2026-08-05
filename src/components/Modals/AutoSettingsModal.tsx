import React, { useState } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { ItemRarity } from '../../types/game';
import { soundFX } from '../../utils/sound';
import { saveCharacter } from '../../utils/storage';
import { X, Bot, ShieldAlert, Sparkles, RefreshCw, CheckSquare, Square, PackageCheck, Zap } from 'lucide-react';

interface AutoSettingsModalProps {
  engine: GameEngine;
  onClose: () => void;
}

const RARITY_LABELS: Record<ItemRarity, { label: string; color: string; badge: string }> = {
  common: { label: '普通装备', color: 'text-slate-300', badge: 'bg-slate-800 text-slate-300 border-slate-700' },
  uncommon: { label: '精良装备', color: 'text-emerald-400', badge: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  rare: { label: '卓越装备', color: 'text-sky-400', badge: 'bg-sky-950 text-sky-300 border-sky-800' },
  epic: { label: '史诗装备', color: 'text-purple-400', badge: 'bg-purple-950 text-purple-300 border-purple-800' },
  legendary: { label: '传说装备', color: 'text-amber-400', badge: 'bg-amber-950 text-amber-300 border-amber-800' },
  mythic: { label: '神话神器', color: 'text-rose-400', badge: 'bg-rose-950 text-rose-300 border-rose-800' }
};

export const AutoSettingsModal: React.FC<AutoSettingsModalProps> = ({ engine, onClose }) => {
  engine.initAutoSettings();
  const settings = engine.character.autoBattleSettings;

  const [activeTab, setActiveTab] = useState<'recycle' | 'pickup' | 'battle'>('recycle');
  const [, setTick] = useState<number>(0);

  const forceUpdate = () => {
    setTick(t => t + 1);
    engine.notify();
  };

  const handleSaveAndClose = () => {
    saveCharacter(engine.character);
    soundFX.playClick();
    onClose();
  };

  const handleManualRecycleNow = () => {
    const recycledCount = engine.autoRecycleEquipment(false);
    if (recycledCount === 0) {
      engine.addParticle(engine.character.x, engine.character.y, 'text_info', '背包内未找到符合回收规则的低阶装备！');
    }
    forceUpdate();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="w-full max-w-xl bg-slate-900 border-2 border-amber-800/90 rounded-2xl p-4 sm:p-6 relative shadow-[0_0_50px_rgba(0,0,0,0.9)] text-amber-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-900/60 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-amber-400" />
            <h2 className="text-lg sm:text-xl font-black text-amber-300 tracking-wide">
              挂机 / 自动拾取 / 自动回收设置
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-amber-900/40 mb-4 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('recycle')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'recycle'
                ? 'bg-amber-600 text-slate-950 font-black shadow-md'
                : 'text-amber-200/70 hover:text-amber-100 hover:bg-slate-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>自动回收装备</span>
          </button>
          <button
            onClick={() => setActiveTab('pickup')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'pickup'
                ? 'bg-amber-600 text-slate-950 font-black shadow-md'
                : 'text-amber-200/70 hover:text-amber-100 hover:bg-slate-900'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>拾取分类过滤</span>
          </button>
          <button
            onClick={() => setActiveTab('battle')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'battle'
                ? 'bg-amber-600 text-slate-950 font-black shadow-md'
                : 'text-amber-200/70 hover:text-amber-100 hover:bg-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>挂机与喝药</span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {/* TAB 1: AUTO RECYCLE */}
          {activeTab === 'recycle' && (
            <div className="space-y-4">
              {/* Master Toggle */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-900/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-amber-300">自动回收总开关</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    打怪挂机时，自动将低阶装备转化为金币、元宝与角色经验
                  </div>
                </div>
                <button
                  onClick={() => {
                    settings.autoRecycleEnabled = !settings.autoRecycleEnabled;
                    forceUpdate();
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-extrabold border transition-all ${
                    settings.autoRecycleEnabled
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {settings.autoRecycleEnabled ? '已开启' : '已关闭'}
                </button>
              </div>

              {/* Trigger Rules */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-900/40 space-y-3">
                <div className="font-bold text-amber-200 border-b border-slate-800 pb-2">
                  回收触发规则与保护
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      settings.autoRecycleOnFull = !settings.autoRecycleOnFull;
                      forceUpdate();
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      settings.autoRecycleOnFull
                        ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.autoRecycleOnFull ? (
                      <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-xs">背包满时自动回收</div>
                      <div className="text-[10px] text-slate-400">空间不足时自动腾出格子</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      settings.autoRecycleInstant = !settings.autoRecycleInstant;
                      forceUpdate();
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      settings.autoRecycleInstant
                        ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.autoRecycleInstant ? (
                      <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-xs">拾取时实时分解</div>
                      <div className="text-[10px] text-slate-400">落包即刻自动转化为资源</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      settings.autoRecycleKeepOwnProfession = !settings.autoRecycleKeepOwnProfession;
                      forceUpdate();
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      settings.autoRecycleKeepOwnProfession
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.autoRecycleKeepOwnProfession ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-xs">🛡️ 保留本职业装备</div>
                      <div className="text-[10px] text-slate-400">
                        不误删自身能穿戴的强力武器与装备
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      settings.autoRecycleSpecialRings = !settings.autoRecycleSpecialRings;
                      forceUpdate();
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      settings.autoRecycleSpecialRings
                        ? 'bg-purple-950/60 border-purple-500 text-purple-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.autoRecycleSpecialRings ? (
                      <CheckSquare className="w-4 h-4 text-purple-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-xs">💍 包含特戒回收</div>
                      <div className="text-[10px] text-slate-400">
                        回收麻痹/护身/复活戒指，换高额元宝与金币
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Rarity Selection for Recycling */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-200">选择自动回收的装备品质</span>
                  <span className="text-[10px] text-amber-500 font-semibold">勾选即纳入回收列表</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as ItemRarity[]).map((rarityKey) => {
                    const info = RARITY_LABELS[rarityKey];
                    const isChecked = !!settings.autoRecycleRarities[rarityKey];

                    return (
                      <button
                        key={rarityKey}
                        onClick={() => {
                          settings.autoRecycleRarities[rarityKey] = !isChecked;
                          forceUpdate();
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                          isChecked
                            ? 'bg-amber-950/40 border-amber-500/80'
                            : 'bg-slate-900 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          <span className={`font-bold ${info.color}`}>{info.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* One-click Manual Recycle Buttons */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    engine.recycleSpecialRings();
                    forceUpdate();
                  }}
                  className="py-3 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:brightness-110 text-white font-black text-xs sm:text-sm rounded-xl shadow-[0_4px_15px_rgba(168,85,247,0.4)] flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <span>💍 一键回收特戒</span>
                </button>

                <button
                  onClick={handleManualRecycleNow}
                  className="py-3 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-[0_4px_15px_rgba(245,158,11,0.4)] flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <RefreshCw className="w-4 h-4 animate-spin-slow shrink-0" />
                  <span>一键回收低阶装备</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: AUTO PICKUP */}
          {activeTab === 'pickup' && (
            <div className="space-y-4">
              {/* Pickup Master Toggle */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-900/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-amber-300">自动拾取总开关</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    靠近地上掉落物时自动收入背包
                  </div>
                </div>
                <button
                  onClick={() => {
                    settings.pickupEnabled = !settings.pickupEnabled;
                    forceUpdate();
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-extrabold border transition-all ${
                    settings.pickupEnabled
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {settings.pickupEnabled ? '已开启' : '已关闭'}
                </button>
              </div>

              {/* Item Type Toggles */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-900/40 space-y-2.5">
                <div className="font-bold text-amber-200 border-b border-slate-800 pb-2">
                  拾取物品大类勾选
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      settings.pickupTypes.gold = !settings.pickupTypes.gold;
                      forceUpdate();
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                      settings.pickupTypes.gold
                        ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.pickupTypes.gold ? (
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="font-bold">🪙 拾取金币散落</span>
                  </button>

                  <button
                    onClick={() => {
                      settings.pickupTypes.potion = !settings.pickupTypes.potion;
                      forceUpdate();
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                      settings.pickupTypes.potion
                        ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.pickupTypes.potion ? (
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="font-bold">🧪 拾取神水药剂</span>
                  </button>

                  <button
                    onClick={() => {
                      settings.pickupTypes.equipment = !settings.pickupTypes.equipment;
                      forceUpdate();
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                      settings.pickupTypes.equipment
                        ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.pickupTypes.equipment ? (
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="font-bold">⚔️ 拾取武器装备</span>
                  </button>

                  <button
                    onClick={() => {
                      settings.pickupTypes.material = !settings.pickupTypes.material;
                      forceUpdate();
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                      settings.pickupTypes.material
                        ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.pickupTypes.material ? (
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="font-bold">📜 拾取黑铁/秘籍</span>
                  </button>
                </div>
              </div>

              {/* Rarity Tier Filter for Equipment Pickup */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-900/40 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-amber-200">装备品质拾取过滤器</span>
                  <span className="text-[10px] text-amber-500">不勾选的品质将留在地上</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as ItemRarity[]).map((rarityKey) => {
                    const info = RARITY_LABELS[rarityKey];
                    const isChecked = !!settings.pickupRarities[rarityKey];

                    return (
                      <button
                        key={rarityKey}
                        onClick={() => {
                          settings.pickupRarities[rarityKey] = !isChecked;
                          forceUpdate();
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                          isChecked
                            ? 'bg-amber-950/40 border-amber-500/80'
                            : 'bg-slate-900 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          <span className={`font-bold ${info.color}`}>{info.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUTO BATTLE */}
          {activeTab === 'battle' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-900/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-amber-300">智能挂机战斗</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    自动寻找周围怪物并施放最强职业技能
                  </div>
                </div>
                <button
                  onClick={() => {
                    settings.enabled = !settings.enabled;
                    forceUpdate();
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-extrabold border transition-all ${
                    settings.enabled
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {settings.enabled ? '已开启' : '已关闭'}
                </button>
              </div>

              {/* Auto HP Potion */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-900/40 space-y-2">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-amber-200">🧪 自动使用生命水 (HP)</span>
                  <span className="text-amber-400 font-extrabold text-xs">低于 {settings.autoPotionHp}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={settings.autoPotionHp}
                  onChange={(e) => {
                    settings.autoPotionHp = parseInt(e.target.value);
                    forceUpdate();
                  }}
                  className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Auto MP Potion */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-900/40 space-y-2">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-amber-200">🧪 自动使用魔法水 (MP)</span>
                  <span className="text-amber-400 font-extrabold text-xs">低于 {settings.autoPotionMp}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={settings.autoPotionMp}
                  onChange={(e) => {
                    settings.autoPotionMp = parseInt(e.target.value);
                    forceUpdate();
                  }}
                  className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-amber-900/50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-amber-500/80 font-medium">
            💡 设置即刻对所有打怪与副本落包生效
          </span>
          <button
            onClick={handleSaveAndClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg transition-all"
          >
            完成保存
          </button>
        </div>
      </div>
    </div>
  );
};
