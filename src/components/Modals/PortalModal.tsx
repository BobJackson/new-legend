import React, { useState } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { MAP_DATABASE } from '../../data/maps';
import { MapScene } from '../../types/game';
import { X, Compass, Zap, ShieldAlert, ShieldCheck, MapPin, Sparkles, Lock } from 'lucide-react';

interface PortalModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const PortalModal: React.FC<PortalModalProps> = ({ engine, onClose }) => {
  const [filter, setFilter] = useState<'all' | 'safe' | 'field' | 'dungeon'>('all');

  const mapsList = Object.values(MAP_DATABASE);
  const currentMap = MAP_DATABASE[engine.currentMapId] || mapsList[0];

  const filteredMaps = mapsList.filter(map => {
    if (filter === 'safe') return map.isSafeZone;
    if (filter === 'field') return !map.isSafeZone && map.reqLevel <= 15;
    if (filter === 'dungeon') return !map.isSafeZone && map.reqLevel > 15;
    return true;
  });

  const handleTeleport = (map: MapScene) => {
    if (engine.character.level < map.reqLevel) {
      engine.addParticle(engine.character.x, engine.character.y, 'text_crit', `❌ 等级不足！需要 LV ${map.reqLevel}`);
      return;
    }

    let tx = Math.floor(map.width / 2);
    let ty = Math.floor(map.height / 2);

    // If map has portals back or central portal, spawn near center
    if (map.portals && map.portals.length > 0) {
      tx = map.portals[0].x;
      ty = map.portals[0].y + 1;
    }

    engine.changeMap(map.id, tx, ty);
    engine.addParticle(engine.character.x, engine.character.y, 'text_gold', `🌀 【传送阵】场景切换至 ${map.name}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none">
      <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-amber-600/50 shadow-[0_0_50px_rgba(0,0,0,0.9)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-950/90 border-b border-amber-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/60 flex items-center justify-center text-xl text-amber-400 shadow-md">
              🌀
            </div>
            <div>
              <h2 className="text-lg font-black text-amber-200 flex items-center gap-2">
                玛法大陆传送阵名录
                <span className="text-xs bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-full font-normal">
                  快捷场景切换
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                当前位置: <span className="text-amber-300 font-bold">📍 {currentMap.name}</span> (X: {Math.round(engine.character.x)}, Y: {Math.round(engine.character.y)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTeleport(MAP_DATABASE['bichi_city'])}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-amber-100 font-bold text-xs rounded-xl border border-amber-400/50 shadow-md active:scale-95 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              回城卷轴 (比奇)
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="px-5 py-3 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filter === 'all'
                  ? 'bg-amber-600 text-amber-100 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🌐 全部区域 ({mapsList.length})
            </button>
            <button
              onClick={() => setFilter('safe')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filter === 'safe'
                  ? 'bg-emerald-700 text-emerald-100 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🛡️ 主城安全区
            </button>
            <button
              onClick={() => setFilter('field')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filter === 'field'
                  ? 'bg-blue-700 text-blue-100 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🌲 野外草场
            </button>
            <button
              onClick={() => setFilter('dungeon')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filter === 'dungeon'
                  ? 'bg-purple-700 text-purple-100 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              💀 危险地宫/试炼场
            </button>
          </div>

          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            提示: 靠近传送阵交互点亦可直接触发传送
          </span>
        </div>

        {/* Map Cards Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          {filteredMaps.map(map => {
            const isCurrent = map.id === engine.currentMapId;
            const isUnlocked = engine.character.level >= map.reqLevel;

            return (
              <div
                key={map.id}
                className={`relative rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-amber-950/30 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                    : isUnlocked
                    ? 'bg-slate-900/70 border-slate-800 hover:border-amber-600/40 hover:bg-slate-900'
                    : 'bg-slate-950/60 border-slate-900 opacity-75'
                }`}
              >
                {/* Current Map Tag */}
                {isCurrent && (
                  <span className="absolute top-3 right-3 bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow">
                    <MapPin className="w-3 h-3" /> 当前所在
                  </span>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">
                      {map.id === 'bichi_city' ? '🏰' : map.id === 'snake_valley' ? '🐍' : map.id === 'stone_tomb' ? '🪨' : map.id === 'zuma_temple' ? '🏛️' : map.id === 'red_moon_altar' ? '🩸' : '👑'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base text-amber-200">{map.name}</h3>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          map.isSafeZone
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border-rose-800'
                        }`}>
                          {map.isSafeZone ? '安全区' : '危险区域'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        地图尺寸: {map.width} × {map.height} 步长
                      </span>
                    </div>
                  </div>

                  {/* Level requirement badge */}
                  <div className="flex items-center gap-3 text-xs my-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
                    <span className="flex items-center gap-1 font-bold">
                      {isUnlocked ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> 推荐等级: LV {map.reqLevel}+ (已开启)
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1 font-bold">
                          <Lock className="w-3.5 h-3.5" /> 限制等级: LV {map.reqLevel}+ (未满足)
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Portal points info */}
                  <div className="text-xs text-slate-300 space-y-1 my-2">
                    <div className="font-bold text-amber-400/90 flex items-center gap-1">
                      <span>🌀 传送阵坐标:</span>
                    </div>
                    <ul className="pl-2 space-y-0.5 text-[11px] text-slate-400">
                      {map.portals.map((p, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="text-blue-400">•</span>
                          <span>{p.label} (X:{p.x}, Y:{p.y})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Teleport Button */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {map.isSafeZone ? '无战斗损耗 / 全功能NPCNPC' : '包含精英怪与地宫BOSS'}
                  </span>

                  <button
                    onClick={() => handleTeleport(map)}
                    disabled={isCurrent || !isUnlocked}
                    className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                      isCurrent
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-default'
                        : isUnlocked
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                        : 'bg-rose-950/60 text-rose-400 border border-rose-900/60 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    {isCurrent ? '已在当前地图' : isUnlocked ? '传送前往' : `需 LV ${map.reqLevel}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
