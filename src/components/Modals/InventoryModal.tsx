import React, { useState } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { Item } from '../../types/game';
import { X, RefreshCw, Sparkles } from 'lucide-react';
import { CharacterPreviewCanvas } from '../CharacterPreviewCanvas';

interface InventoryModalProps {
  engine: GameEngine;
  onClose: () => void;
  onEquipItem: (item: Item, inventoryIndex: number) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ engine, onClose, onEquipItem }) => {
  const [selectedItem, setSelectedItem] = useState<{ item: Item; index: number } | null>(null);
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);

  const handleUseOrEquip = (item: Item, index: number) => {
    if (item.slot) {
      onEquipItem(item, index);
      setSelectedItem(null);
    } else if (item.id === 'material_capture_rope') {
      const success = engine.captureTargetMonster();
      if (success) {
        if ((item.count || 1) > 1) {
          item.count! -= 1;
        } else {
          engine.character.inventory[index] = null;
        }
        setSelectedItem(null);
      }
    } else if (item.id === 'material_exp_fruit') {
      const success = engine.feedPetExp(500);
      if (success) {
        if ((item.count || 1) > 1) {
          item.count! -= 1;
        } else {
          engine.character.inventory[index] = null;
        }
        setSelectedItem(null);
      }
    } else if (item.type === 'potion') {
      engine.stats.hp = Math.min(engine.stats.maxHp, engine.stats.hp + 500);
      engine.stats.mp = Math.min(engine.stats.maxMp, engine.stats.mp + 300);
      engine.addParticle(engine.character.x, engine.character.y, 'heal_green', '使用太阳水 +500HP');

      if ((item.count || 1) > 1) {
        item.count! -= 1;
      } else {
        engine.character.inventory[index] = null;
      }
      setSelectedItem(null);
    }
  };

  const handleRecycleOne = (item: Item, index: number) => {
    engine.character.gold += item.recycleGold;
    engine.character.ingot += item.recycleIngot;
    engine.character.exp += item.recycleExp;

    engine.addParticle(engine.character.x, engine.character.y, 'text_gold', `回收 +${item.recycleIngot}元宝 +${item.recycleGold}金币`);
    engine.character.inventory[index] = null;
    setSelectedItem(null);
  };

  const handleOrganize = () => {
    engine.organizeInventory();
    setSelectedItem(null);
  };

  const handleOneKeyRecycle = () => {
    const recycledCount = engine.autoRecycleEquipment(false);
    if (recycledCount === 0) {
      engine.addParticle(engine.character.x, engine.character.y, 'text_info', '未找到符合回收设置的装备！');
    }
    setSelectedItem(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border-2 border-amber-800 rounded-2xl p-6 relative shadow-2xl text-amber-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 z-30 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header & One-Key Recycle */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/50 pb-4 mb-4 pr-12">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🎒</span>
            <div>
              <h2 className="text-xl font-bold text-amber-300">物品背包 (40格)</h2>
              <p className="text-xs text-amber-500">
                金币: {engine.character.gold.toLocaleString()} · 元宝: {engine.character.ingot.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOrganize}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:brightness-110 text-white font-bold text-xs shadow-md border border-blue-400/40 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" /> 一键整理
            </button>

            <button
              onClick={handleOneKeyRecycle}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white font-bold text-xs shadow-md border border-amber-400/40 active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> 一键回收装备
            </button>
          </div>
        </div>

        {/* Inventory 40 Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 bg-slate-950 p-3 rounded-xl border border-amber-900/40 mb-4">
          {engine.character.inventory.map((item, idx) => {
            const isSelected = selectedItem?.index === idx;
            const isHovered = hoveredItem === item;

            return (
              <button
                key={idx}
                onMouseEnter={() => item && setHoveredItem(item)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => item && setSelectedItem({ item, index: idx })}
                className={`relative w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${
                  item
                    ? isSelected || isHovered
                      ? 'border-amber-400 bg-amber-900/60 shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105 z-10'
                      : 'border-amber-800 bg-slate-900/80 hover:border-amber-600'
                    : 'border-slate-800/80 bg-slate-900/30'
                }`}
              >
                {item && (
                  <>
                    <span className="text-2xl">{item.icon}</span>
                    {item.count && item.count > 1 ? (
                      <span className="absolute bottom-0.5 right-1 text-[9px] font-black text-amber-300">
                        x{item.count}
                      </span>
                    ) : null}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Fixed Height Item Detail & Action Panel (Prevents any layout shift / jittering) */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-900/50 h-[115px] flex flex-col justify-between overflow-hidden shrink-0">
          {hoveredItem || selectedItem?.item ? (
            <div className="flex flex-col justify-between h-full">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-3xl shrink-0">{(hoveredItem || selectedItem?.item)?.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-amber-200 text-sm truncate">
                        {(hoveredItem || selectedItem?.item)?.name}
                      </h4>
                      <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800/80 px-1.5 py-0.5 rounded font-medium shrink-0">
                        {(hoveredItem || selectedItem?.item)?.reqLevel ? `LV ${(hoveredItem || selectedItem?.item)?.reqLevel}` : '通用'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {(hoveredItem || selectedItem?.item)?.description}
                    </p>
                  </div>
                </div>

                {selectedItem && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(selectedItem.item.slot || selectedItem.item.type === 'potion' || selectedItem.item.id === 'material_capture_rope' || selectedItem.item.id === 'material_exp_fruit') && (
                      <button
                        onClick={() => handleUseOrEquip(selectedItem.item, selectedItem.index)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md active:scale-95 transition-all"
                      >
                        {selectedItem.item.slot ? '穿戴装备' : selectedItem.item.id === 'material_capture_rope' ? '使用捕兽索' : selectedItem.item.id === 'material_exp_fruit' ? '喂食宠物' : '使用药水'}
                      </button>
                    )}
                    <button
                      onClick={() => handleRecycleOne(selectedItem.item, selectedItem.index)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow-md active:scale-95 transition-all"
                    >
                      回收元宝 (+{selectedItem.item.recycleIngot})
                    </button>
                  </div>
                )}
              </div>

              {/* Item Attribute Badges */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] mt-1">
                {(hoveredItem || selectedItem?.item)?.physAtkMax ? (
                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-amber-800/60 text-amber-300 font-bold">
                    物攻: +{(hoveredItem || selectedItem?.item)?.physAtkMin}~{(hoveredItem || selectedItem?.item)?.physAtkMax}
                  </span>
                ) : null}
                {(hoveredItem || selectedItem?.item)?.magAtkMax ? (
                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-blue-800/60 text-blue-300 font-bold">
                    魔攻: +{(hoveredItem || selectedItem?.item)?.magAtkMin}~{(hoveredItem || selectedItem?.item)?.magAtkMax}
                  </span>
                ) : null}
                {(hoveredItem || selectedItem?.item)?.taoAtkMax ? (
                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-emerald-800/60 text-emerald-300 font-bold">
                    道攻: +{(hoveredItem || selectedItem?.item)?.taoAtkMin}~{(hoveredItem || selectedItem?.item)?.taoAtkMax}
                  </span>
                ) : null}
                {(hoveredItem || selectedItem?.item)?.physDef ? (
                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-slate-300 font-bold">
                    物防: +{(hoveredItem || selectedItem?.item)?.physDef}
                  </span>
                ) : null}
                {(hoveredItem || selectedItem?.item)?.magDef ? (
                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-slate-300 font-bold">
                    魔防: +{(hoveredItem || selectedItem?.item)?.magDef}
                  </span>
                ) : null}
                {(hoveredItem || selectedItem?.item)?.recycleIngot ? (
                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-amber-500/40 text-yellow-300 font-bold">
                    回收价值: {(hoveredItem || selectedItem?.item)?.recycleIngot}元宝
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs gap-2">
              <span>💡</span>
              <span>鼠标悬停在物品上即可查看属性；点击物品可进行穿戴或回收操作。</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
