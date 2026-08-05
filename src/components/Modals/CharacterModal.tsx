import React, { useState } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { EquipmentSlot, Item } from '../../types/game';
import { X, Shield, Award, Sparkles, RefreshCw, Eye } from 'lucide-react';
import { CharacterPreviewCanvas } from '../CharacterPreviewCanvas';
import { LevelBadgeTag } from '../HUD/LevelBadgeTag';

interface CharacterModalProps {
  engine: GameEngine;
  onClose: () => void;
  onUnEquipItem: (slot: EquipmentSlot) => void;
  onEquipItem?: (item: Item, inventoryIndex: number) => void;
  onOpenAchievements?: () => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  engine,
  onClose,
  onUnEquipItem,
  onEquipItem,
  onOpenAchievements
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'stats'>('preview');
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [selectedInventoryIndex, setSelectedInventoryIndex] = useState<number | null>(null);

  const eq = engine.character.equipment;
  engine.initAchievementData();
  const unlockedCount = engine.character.unlockedAchievementIds?.length || 0;
  const titleText = engine.character.title || '平民';

  const slotLabels: Record<EquipmentSlot, { label: string; icon: string }> = {
    weapon: { label: '武器', icon: '🗡️' },
    armor: { label: '铠甲', icon: '👕' },
    helmet: { label: '头盔', icon: '🪖' },
    necklace: { label: '项链', icon: '📿' },
    ringLeft: { label: '左戒', icon: '💍' },
    ringRight: { label: '右戒', icon: '💍' },
    braceletLeft: { label: '左手', icon: '⌚' },
    braceletRight: { label: '右手', icon: '⌚' },
    belt: { label: '腰带', icon: '🎗️' },
    boots: { label: '战靴', icon: '👢' }
  };

  const handleEquipFromModal = (item: Item, index: number) => {
    if (onEquipItem) {
      onEquipItem(item, index);
    } else {
      engine.equipItem(item, index);
    }
    setHoveredItem(null);
  };

  const handleOrganize = () => {
    engine.organizeInventory();
    setHoveredItem(null);
  };

  const handleOneKeyRecycle = () => {
    engine.autoRecycleEquipment(false);
    setHoveredItem(null);
  };

  const renderSlot = (slotKey: EquipmentSlot) => {
    const item = eq[slotKey];
    const { label, icon } = slotLabels[slotKey];
    const isHovered = hoveredItem === item;

    return (
      <button
        key={slotKey}
        onClick={() => item && onUnEquipItem(slotKey)}
        onMouseEnter={() => item && setHoveredItem(item)}
        onMouseLeave={() => setHoveredItem(null)}
        className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl border-2 flex flex-col items-center justify-center p-0.5 transition-all ${
          item
            ? isHovered
              ? 'border-yellow-300 bg-amber-900/80 shadow-[0_0_15px_rgba(245,158,11,0.6)] scale-105'
              : 'border-amber-500/80 bg-amber-950/40 hover:border-amber-300'
            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
        }`}
      >
        {item ? (
          <>
            <span className="text-xl">{item.icon}</span>
            <span className="text-[8px] font-bold text-amber-200 truncate w-full text-center leading-tight">
              {item.name}
            </span>
            {item.refineLevel && item.refineLevel > 0 ? (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[8px] px-1 rounded-full shadow">
                +{item.refineLevel}
              </span>
            ) : null}
          </>
        ) : (
          <>
            <span className="text-lg opacity-30">{icon}</span>
            <span className="text-[8px] text-slate-500 font-bold">{label}</span>
          </>
        )}
      </button>
    );
  };

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'mythic': return 'text-red-400 border-red-500/60 bg-red-950/80';
      case 'legendary': return 'text-amber-300 border-amber-500/60 bg-amber-950/80';
      case 'epic': return 'text-purple-300 border-purple-500/60 bg-purple-950/80';
      case 'rare': return 'text-blue-300 border-blue-500/60 bg-blue-950/80';
      default: return 'text-slate-300 border-slate-700 bg-slate-900/80';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3">
      <div className="w-full max-w-4xl bg-slate-900 border-2 border-amber-800 rounded-2xl p-4 sm:p-5 relative shadow-2xl text-amber-100 max-h-[92vh] flex flex-col overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-900/50 pb-3 mb-3 gap-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-1.5 bg-slate-950 border border-amber-600/40 rounded-xl">⚔️</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-amber-300">{engine.character.name}</h2>
                <LevelBadgeTag level={engine.character.level} size="md" showName={true} />
                <span className="px-2 py-0.5 text-xs font-extrabold bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 rounded-md shadow-md border border-yellow-300">
                  {titleText}
                </span>
                <span className="text-xs text-amber-400 font-bold bg-amber-950 px-2 py-0.5 rounded border border-amber-800 flex items-center gap-1">
                  {engine.character.gender === 'female' ? '♀️ 女' : '♂️ 男'}
                  {engine.character.profession === 'warrior' ? '战士' : engine.character.profession === 'mage' ? '法师' : '道士'}
                </span>
                <button
                  onClick={() => {
                    engine.character.gender = engine.character.gender === 'female' ? 'male' : 'female';
                    engine.notify();
                  }}
                  title="切换角色性别"
                  className="text-[10px] text-amber-300 hover:text-amber-100 bg-amber-950/80 hover:bg-amber-900 px-2 py-0.5 rounded border border-amber-700 font-bold transition-all"
                >
                  🔄 换别: {engine.character.gender === 'female' ? '切换为男' : '切换为女'}
                </button>
              </div>
              <p className="text-[11px] text-amber-500/90 mt-0.5">
                等级: LV {engine.character.level} · 转生: {engine.character.rebirthLevel}转 · 功勋成就: 已解锁 {unlockedCount} 项
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeTab === 'preview'
                    ? 'bg-amber-600 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> 换装试穿与背包
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeTab === 'stats'
                    ? 'bg-amber-600 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Award className="w-3.5 h-3.5" /> 战斗属性
              </button>
            </div>

            {onOpenAchievements && (
              <button
                onClick={onOpenAchievements}
                className="px-2.5 py-1 bg-gradient-to-r from-amber-600 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-xs rounded-xl shadow-lg border border-yellow-300 flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <span>🏆 成就</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'preview' ? (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-3 pr-1">
            {/* Left 6 Cols: Character Live 2D Model Canvas & Equipment Slots */}
            <div className="lg:col-span-6 bg-slate-950 p-3 rounded-2xl border border-amber-900/40 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Shield className="w-4 h-4 text-amber-500" /> 3D外观实时预览
                </span>
                <span className="text-[10px] text-amber-300 font-extrabold bg-amber-950 border border-amber-800 px-2 py-0.5 rounded-full">
                  ⚔️ 战力 {engine.stats.battlePower.toLocaleString()}
                </span>
              </div>

              {/* Character 2D Model Canvas Preview */}
              <CharacterPreviewCanvas
                character={engine.character}
                hoveredItem={hoveredItem}
                width={250}
                height={260}
                className="mb-2"
              />

              {/* Equipped 10 Slots Grid */}
              <div className="w-full bg-slate-900/80 p-2 rounded-xl border border-amber-900/30">
                <div className="text-[10px] font-bold text-slate-400 mb-1 text-center">已穿戴装备 (悬停或点击更换)</div>
                <div className="grid grid-cols-5 gap-1.5 justify-items-center">
                  {(['weapon', 'armor', 'helmet', 'necklace', 'belt'] as EquipmentSlot[]).map(renderSlot)}
                  {(['ringLeft', 'ringRight', 'braceletLeft', 'braceletRight', 'boots'] as EquipmentSlot[]).map(renderSlot)}
                </div>
              </div>

              {/* Wings Upgrade Button */}
                            <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    const cost = 10000 + (engine.character.wingLevel || 0) * 2000;
                    if (engine.character.gold >= cost) {
                      engine.character.gold -= cost;
                      engine.character.wingLevel += 1;
                      engine.recalculateStats();
                      engine.addParticle(engine.character.x, engine.character.y, 'text_gold', '【光翼进阶成功!】');
                    } else {
                      engine.addParticle(engine.character.x, engine.character.y, 'text_red', '金币不足');
                    }
                  }}
                  className="flex-1 py-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:brightness-110 text-white font-bold rounded-xl border border-sky-400/40 text-[10px] shadow-md active:scale-95 transition-all flex flex-col items-center justify-center"
                >
                  <span>🪽 单次进阶</span>
                  <span className="text-sky-200">({(10000 + (engine.character.wingLevel || 0) * 2000).toLocaleString()}金)</span>
                </button>
                <button
                  onClick={() => {
                    let cost = 10000 + (engine.character.wingLevel || 0) * 2000;
                    let upgraded = false;
                    let initialLevel = engine.character.wingLevel || 0;
                    while (engine.character.gold >= cost) {
                      engine.character.gold -= cost;
                      engine.character.wingLevel += 1;
                      upgraded = true;
                      cost = 10000 + (engine.character.wingLevel || 0) * 2000;
                    }
                    if (upgraded) {
                      engine.recalculateStats();
                      const levelsGained = engine.character.wingLevel - initialLevel;
                      engine.addParticle(engine.character.x, engine.character.y, 'text_gold', `【光翼连升${levelsGained}级!】`);
                    } else {
                      engine.addParticle(engine.character.x, engine.character.y, 'text_red', '金币不足');
                    }
                  }}
                  className="flex-1 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white font-bold rounded-xl border border-amber-400/40 text-[10px] shadow-md active:scale-95 transition-all flex flex-col items-center justify-center"
                >
                  <span>⚡ 一键进阶</span>
                  <span className="text-amber-200">(自动消耗)</span>
                </button>
              </div>
              
              <div className="mt-1 text-[10px] text-center text-amber-300 font-bold">
                当前: LV{engine.character.wingLevel || 0} - 第{Math.floor((engine.character.wingLevel || 0) / 10)}阶 (每10级形态与属性蜕变)
              </div>
            </div>

            {/* Right 6 Cols: Backpack Inventory Grid (40 Slots) with Live Hover Preview */}
            <div className="lg:col-span-6 bg-slate-950 p-3 rounded-2xl border border-amber-900/40 flex flex-col justify-between min-h-[360px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    🎒 物品背包 (悬停试穿效果)
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleOrganize}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-200 text-[10px] font-bold rounded-lg border border-slate-700 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" /> 整理
                    </button>
                    <button
                      onClick={handleOneKeyRecycle}
                      className="px-2 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 text-[10px] font-bold rounded-lg border border-amber-800 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> 回收
                    </button>
                  </div>
                </div>

                {/* 40 Grid Items */}
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5 p-1 bg-slate-900/60 rounded-xl border border-slate-800">
                  {engine.character.inventory.map((item, idx) => {
                    const isHovered = hoveredItem === item;
                    const isSelected = selectedInventoryIndex === idx;

                    return (
                      <button
                        key={idx}
                        onMouseEnter={() => item && setHoveredItem(item)}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={() => {
                          if (item) {
                            setSelectedInventoryIndex(idx);
                            if (item.slot) {
                              handleEquipFromModal(item, idx);
                            }
                          }
                        }}
                        className={`relative w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${
                          item
                            ? isHovered || isSelected
                              ? 'border-yellow-400 bg-amber-900/80 shadow-[0_0_12px_rgba(245,158,11,0.6)] scale-105 z-10'
                              : 'border-amber-800/80 bg-slate-900 hover:border-amber-500'
                            : 'border-slate-800/60 bg-slate-950/40'
                        }`}
                      >
                        {item && (
                          <>
                            <span className="text-xl">{item.icon}</span>
                            {item.count && item.count > 1 ? (
                              <span className="absolute bottom-0.5 right-0.5 text-[8px] font-black text-amber-300">
                                x{item.count}
                              </span>
                            ) : null}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Item Hover Detail Panel (Fixed height container to prevent layout shifting) */}
              <div className="mt-2 h-[105px] p-2.5 rounded-xl border border-amber-900/50 bg-slate-900/90 text-xs flex flex-col justify-between overflow-hidden shrink-0">
                {hoveredItem ? (
                  <div className="flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between border-b border-amber-900/30 pb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl shrink-0">{hoveredItem.icon}</span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-amber-200 text-xs flex items-center gap-1.5 truncate">
                            {hoveredItem.name}
                            {hoveredItem.slot && (
                              <span className="text-[9px] bg-amber-900/90 text-amber-300 px-1 rounded border border-amber-700 shrink-0">
                                装备
                              </span>
                            )}
                          </h4>
                          <p className="text-[10px] text-slate-300 truncate">
                            {hoveredItem.reqLevel ? `需求等级: LV ${hoveredItem.reqLevel}` : '通用物品'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-snug truncate">{hoveredItem.description}</p>

                    {/* Item Stats Badges */}
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {hoveredItem.physAtkMax ? (
                        <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-amber-800/60 text-amber-300 font-bold">
                          物攻: +{hoveredItem.physAtkMin}~{hoveredItem.physAtkMax}
                        </span>
                      ) : null}
                      {hoveredItem.magAtkMax ? (
                        <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-blue-800/60 text-blue-300 font-bold">
                          魔攻: +{hoveredItem.magAtkMin}~{hoveredItem.magAtkMax}
                        </span>
                      ) : null}
                      {hoveredItem.taoAtkMax ? (
                        <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-emerald-800/60 text-emerald-300 font-bold">
                          道攻: +{hoveredItem.taoAtkMin}~{hoveredItem.taoAtkMax}
                        </span>
                      ) : null}
                      {hoveredItem.physDef ? (
                        <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300 font-bold">
                          防: +{hoveredItem.physDef}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-[11px] text-slate-400 text-center">
                    💡 <span className="text-amber-300 font-bold mx-1">提示：</span> 鼠标悬停在物品上可显示其详细属性，点击装备即可快捷换装。
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Stats Breakdown Tab */
          <div className="bg-slate-950 p-5 rounded-2xl border border-amber-900/40 space-y-3 text-xs overflow-y-auto">
            <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" /> 详细战斗属性面板
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">综合战斗力</span>
                <span className="font-extrabold text-amber-300">{engine.stats.battlePower.toLocaleString()}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">生命上限 (HP)</span>
                <span className="font-bold text-rose-400">{engine.stats.hp} / {engine.stats.maxHp}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">法力上限 (MP)</span>
                <span className="font-bold text-sky-400">{engine.stats.mp} / {engine.stats.maxMp}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">物理攻击 (Phys Atk)</span>
                <span className="font-bold text-amber-300">{engine.stats.physAtkMin} - {engine.stats.physAtkMax}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">魔法攻击 (Mag Atk)</span>
                <span className="font-bold text-blue-300">{engine.stats.magAtkMin} - {engine.stats.magAtkMax}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">道术攻击 (Tao Atk)</span>
                <span className="font-bold text-emerald-300">{engine.stats.taoAtkMin} - {engine.stats.taoAtkMax}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">物理防御 / 魔法防御</span>
                <span className="font-bold text-slate-300">{engine.stats.physDef} / {engine.stats.magDef}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">暴击概率 / 幸运值</span>
                <span className="font-bold text-amber-400">{(engine.stats.critChance * 100).toFixed(0)}% / 幸{engine.stats.luck}</span>
              </div>

                            {engine.character.mount && (
                <>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">坐骑阶位 / 状态</span>
                    <span className="font-bold text-yellow-300">
                      {engine.character.mount.tier}阶 ({engine.character.mount.level}星) - {engine.character.mount.isMounted ? '骑乘中 🐴' : '未骑乘'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">坐骑移速特权加成</span>
                    <span className="font-bold text-emerald-300">
                      +{engine.stats.moveSpeedBonus ? Math.round(engine.stats.moveSpeedBonus * 100) : 0}%
                    </span>
                  </div>
                </>
              )}
              
              {/* === Set Bonuses === */}
              {engine.getActiveSets && engine.getActiveSets().length > 0 && (
                <div className="mt-4 p-3 border border-amber-500/30 bg-amber-900/20 rounded-lg">
                  <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
                    ✨ 激活的套装效果
                  </h4>
                  {engine.getActiveSets().map((set, idx) => (
                    <div key={idx} className="mb-2 text-xs text-amber-200/90">
                      <div className="font-bold text-amber-300">【{set.setName}】 (已集齐)</div>
                      <div className="grid grid-cols-2 gap-1 mt-1 pl-2">
                        {set.hpBonus && <span>生命 +{set.hpBonus}</span>}
                        {set.physAtkBonus && <span>物攻 +{set.physAtkBonus}</span>}
                        {set.magAtkBonus && <span>魔攻 +{set.magAtkBonus}</span>}
                        {set.taoAtkBonus && <span>道攻 +{set.taoAtkBonus}</span>}
                        {set.physDefBonus && <span>物防 +{set.physDefBonus}</span>}
                        {set.magDefBonus && <span>魔防 +{set.magDefBonus}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
