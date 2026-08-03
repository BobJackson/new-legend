import React from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { MONSTER_TEMPLATES } from '../../data/monsters';
import { MAP_DATABASE } from '../../data/maps';
import { X, Skull, MapPin, Sparkles } from 'lucide-react';

interface BossModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const BossModal: React.FC<BossModalProps> = ({ engine, onClose }) => {
  const bossList = [
    { id: 'white_boar', mapId: 'stone_tomb', name: '白野猪', loc: '石墓阵七层' },
    { id: 'woma_leader', mapId: 'zuma_temple', name: '沃玛教主', loc: '祖玛大殿' },
    { id: 'zuma_leader', mapId: 'zuma_temple', name: '祖玛教主', loc: '祖玛大殿' },
    { id: 'red_moon_demon', mapId: 'red_moon_altar', name: '赤月恶魔', loc: '赤月峡谷祭坛' },
    { id: 'sabak_guard', mapId: 'sabak_castle', name: '沙城禁卫军', loc: '沙巴克皇宫' }
  ];

  const handleTeleportToBoss = (mapId: string) => {
    const map = MAP_DATABASE[mapId];
    if (!map) return;

    if (engine.character.level < map.reqLevel) {
      engine.addParticle(engine.character.x, engine.character.y, 'text_info', `角色等级不足，需要 LV ${map.reqLevel}！`);
      return;
    }

    engine.changeMap(mapId, 10, 10);
    engine.addParticle(10, 10, 'text_gold', `【传送成功!】抵达 ${map.name}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border-2 border-amber-800 rounded-2xl p-6 relative shadow-2xl text-amber-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 border-b border-amber-900/50 pb-4 mb-6">
          <Skull className="w-6 h-6 text-rose-500" />
          <h2 className="text-xl font-bold text-amber-300">玛法大陆 Boss 挑战榜</h2>
        </div>

        <div className="space-y-3">
          {bossList.map((boss) => {
            const template = MONSTER_TEMPLATES[boss.id];
            const map = MAP_DATABASE[boss.mapId];
            if (!template || !map) return null;

            return (
              <div
                key={boss.id}
                className="bg-slate-950 p-4 rounded-xl border border-amber-900/40 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{template.iconSymbol}</span>
                  <div>
                    <h3 className="font-bold text-rose-400 text-sm flex items-center gap-2">
                      {boss.name}
                      <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.5 rounded">
                        LV {template.level}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" /> {boss.loc} (需要 LV{map.reqLevel})
                    </p>
                    <p className="text-[10px] text-amber-500 mt-1">
                      掉落极品: 屠龙宝刀、裁决之杖、麻痹戒指、复活戒指、重装战铠
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleTeleportToBoss(boss.mapId)}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white font-bold text-xs rounded-lg shadow-md whitespace-nowrap"
                >
                  🚀 直达副本
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
