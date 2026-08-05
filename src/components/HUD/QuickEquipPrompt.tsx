import React, { useEffect, useState } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { Item, EquipmentSlot } from '../../types/game';
import { ArrowUpCircle, X } from 'lucide-react';


function getItemColor(rarity: string) {
  switch (rarity) {
    case 'mythic': return '#ef4444'; // red
    case 'legendary': return '#f59e0b'; // amber
    case 'epic': return '#a855f7'; // purple
    case 'rare': return '#3b82f6'; // blue
    case 'uncommon': return '#22c55e'; // green
    default: return '#e2e8f0'; // white/slate
  }
}

export function QuickEquipPrompt({ engine, onEquipItem }: { engine: GameEngine, onEquipItem: (item: Item, index: number) => void }) {
  const [promptItem, setPromptItem] = useState<Item | null>(null);

  useEffect(() => {
    if (engine.quickEquipPrompt) {
      setPromptItem(engine.quickEquipPrompt);
      
      const timer = setTimeout(() => {
        engine.clearQuickEquipPrompt();
        setPromptItem(null);
      }, 5000); // hide after 5 seconds

      return () => clearTimeout(timer);
    } else {
      setPromptItem(null);
    }
  }, [engine.quickEquipPrompt]);

  if (!promptItem) return null;

  const handleEquip = () => {
    // Find item in inventory
    const idx = engine.character.inventory.findIndex(i => i === promptItem || (i && i.id === promptItem.id));
    if (idx !== -1) {
      onEquipItem(promptItem, idx);
    }
    engine.clearQuickEquipPrompt();
    setPromptItem(null);
  };

  const handleClose = () => {
    engine.clearQuickEquipPrompt();
    setPromptItem(null);
  };

  return (
    <div className="absolute right-4 bottom-24 bg-slate-900/90 border border-amber-600/50 p-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-8 z-50">
      <div className="flex-1">
        <div className="text-xs text-amber-400 font-bold mb-1 flex items-center gap-1">
          <ArrowUpCircle className="w-4 h-4 text-green-400" /> 获得更好装备
        </div>
        <div className="text-sm font-bold" style={{ color: getItemColor(promptItem.rarity || 'common') }}>
          {promptItem.name} {promptItem.refineLevel ? `+${promptItem.refineLevel}` : ''}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={handleEquip}
          className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 rounded-lg text-xs font-bold text-white shadow-lg active:scale-95 transition-all"
        >
          快捷装备
        </button>
        <button
          onClick={handleClose}
          className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
