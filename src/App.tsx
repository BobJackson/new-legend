import React, { useState, useEffect, useRef } from 'react';
import { CharacterData, Item, EquipmentSlot } from './types/game';
import { GameEngine } from './engine/GameEngine';
import { loadLocalCharacter, saveCharacter, clearLocalCharacter, submitLeaderboard } from './utils/storage';
import { CharacterCreate } from './components/CharacterCreate';
import { CanvasRenderer } from './components/CanvasRenderer';
import { TopBar } from './components/HUD/TopBar';
import { BottomBar } from './components/HUD/BottomBar';
import { Joystick } from './components/HUD/Joystick';
import { MiniMap } from './components/HUD/MiniMap';
import { QuestTracker } from './components/HUD/QuestTracker';

// Modals
import { CharacterModal } from './components/Modals/CharacterModal';
import { AchievementsModal } from './components/Modals/AchievementsModal';
import { InventoryModal } from './components/Modals/InventoryModal';
import { SkillsModal } from './components/Modals/SkillsModal';
import { ForgeModal } from './components/Modals/ForgeModal';
import { BossModal } from './components/Modals/BossModal';
import { GuildModal } from './components/Modals/GuildModal';
import { ShopModal } from './components/Modals/ShopModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { AutoSettingsModal } from './components/Modals/AutoSettingsModal';
import { WeatherModal } from './components/Modals/WeatherModal';
import { MountModal } from './components/Modals/MountModal';

export default function App() {
  const [characterData, setCharacterData] = useState<CharacterData | null>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [, setTick] = useState<number>(0);

  // Initialize on mount
  useEffect(() => {
    const saved = loadLocalCharacter();
    if (saved) {
      const eng = new GameEngine(saved);
      setCharacterData(saved);
      setEngine(eng);
    }
  }, []);

  // Engine state listener & Auto-Save timer
  useEffect(() => {
    if (!engine) return;

    const unsubscribe = engine.subscribe(() => {
      setTick(t => t + 1);
    });

    const saveInterval = setInterval(() => {
      saveCharacter(engine.character);
      submitLeaderboard(engine.character, engine.stats.battlePower);
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(saveInterval);
    };
  }, [engine]);

  const handleCharacterCreated = (data: CharacterData) => {
    saveCharacter(data);
    const eng = new GameEngine(data);
    setCharacterData(data);
    setEngine(eng);
  };

  const handleResetGame = () => {
    clearLocalCharacter();
    setEngine(null);
    setCharacterData(null);
    setActiveModal(null);
  };

  const handleEquipItem = (item: Item, inventoryIndex: number) => {
    if (!engine || !item.slot) return;
    const currentEquip = engine.character.equipment[item.slot];

    engine.character.equipment[item.slot] = item;
    engine.character.inventory[inventoryIndex] = currentEquip;
    engine.recalculateStats();
    engine.addParticle(engine.character.x, engine.character.y, 'text_gold', `穿戴 [${item.name}]`);
    saveCharacter(engine.character);
  };

  const handleUnEquipItem = (slot: EquipmentSlot) => {
    if (!engine) return;
    const item = engine.character.equipment[slot];
    if (!item) return;

    const emptyIdx = engine.character.inventory.findIndex(s => s === null);
    if (emptyIdx < 0) {
      engine.addParticle(engine.character.x, engine.character.y, 'text_info', '背包已满，无法卸下！');
      return;
    }

    engine.character.inventory[emptyIdx] = item;
    engine.character.equipment[slot] = null;
    engine.recalculateStats();
    engine.addParticle(engine.character.x, engine.character.y, 'text_info', `卸下 [${item.name}]`);
    saveCharacter(engine.character);
  };

  if (!engine || !characterData) {
    return <CharacterCreate onCreate={handleCharacterCreated} />;
  }

  return (
    <div className="w-screen h-screen bg-slate-950 overflow-hidden flex flex-col justify-between relative select-none font-sans">
      {/* Top HUD */}
      <TopBar
        engine={engine}
        onOpenModal={(modal) => setActiveModal(modal)}
        onToggleAutoBattle={() => {
          engine.character.autoBattleSettings.enabled = !engine.character.autoBattleSettings.enabled;
          engine.addParticle(
            engine.character.x,
            engine.character.y,
            'text_gold',
            engine.character.autoBattleSettings.enabled ? '【开启自动挂机】' : '【停止挂机】'
          );
        }}
      />

      {/* Main Game World Canvas */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <CanvasRenderer
          engine={engine}
          onOpenWeatherModal={() => setActiveModal('weather')}
        />
        <QuestTracker engine={engine} />
        <MiniMap engine={engine} />
        <Joystick engine={engine} />
      </div>

      {/* Bottom HUD */}
      <BottomBar
        engine={engine}
        onOpenModal={(modal) => setActiveModal(modal)}
        onCastSkill={(skillId) => engine.castSkill(skillId)}
      />

      {/* Active Modals */}
      {activeModal === 'character' && (
        <CharacterModal
          engine={engine}
          onClose={() => setActiveModal(null)}
          onUnEquipItem={handleUnEquipItem}
          onEquipItem={handleEquipItem}
          onOpenAchievements={() => setActiveModal('achievements')}
        />
      )}

      {activeModal === 'achievements' && (
        <AchievementsModal
          engine={engine}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'inventory' && (
        <InventoryModal
          engine={engine}
          onClose={() => setActiveModal(null)}
          onEquipItem={handleEquipItem}
        />
      )}

      {activeModal === 'skills' && (
        <SkillsModal
          engine={engine}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'forge' && (
        <ForgeModal
          engine={engine}
          onClose={() => setActiveModal(null)}
          onOpenShop={() => setActiveModal('shop')}
        />
      )}

      {activeModal === 'boss' && (
        <BossModal
          engine={engine}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'guild' && (
        <GuildModal
          engine={engine}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'shop' && (
        <ShopModal
          engine={engine}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          engine={engine}
          onClose={() => setActiveModal(null)}
          onResetGame={handleResetGame}
        />
      )}

      {activeModal === 'autoSettings' && (
        <AutoSettingsModal
          engine={engine}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'weather' && (
        <WeatherModal
          engine={engine}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'mount' && (
        <MountModal
          engine={engine}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
