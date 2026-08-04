import React from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { MAP_DATABASE } from '../../data/maps';

interface MiniMapProps {
  engine: GameEngine;
  onOpenPortalModal?: () => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({ engine, onOpenPortalModal }) => {
  const map = MAP_DATABASE[engine.currentMapId] || MAP_DATABASE['bichi_city'];
  const guildTerritory = map.guildTerritory;
  const sabakGuildName = engine.sabakInfo?.guildName || '兄弟会';

  return (
    <div
      onClick={onOpenPortalModal}
      className="absolute top-14 right-3 z-20 w-32 h-32 bg-slate-950/85 hover:bg-slate-900 border-2 border-amber-900/80 hover:border-amber-500/80 rounded-xl p-1 shadow-2xl backdrop-blur-md hidden sm:block cursor-pointer group transition-all"
      title="点击打开地图传送阵与场景名录"
    >
      <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
        {/* Guild Territory Range Overlay on Minimap */}
        {guildTerritory && (
          <>
            <div
              className="absolute border border-dashed border-amber-400/90 bg-amber-500/15 pointer-events-none z-0 transition-all animate-pulse"
              style={{
                left: `${(guildTerritory.bounds.minX / map.width) * 100}%`,
                top: `${(guildTerritory.bounds.minY / map.height) * 100}%`,
                width: `${((guildTerritory.bounds.maxX - guildTerritory.bounds.minX + 1) / map.width) * 100}%`,
                height: `${((guildTerritory.bounds.maxY - guildTerritory.bounds.minY + 1) / map.height) * 100}%`
              }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[7px] font-extrabold text-amber-200/80 whitespace-nowrap drop-shadow">
                  《{sabakGuildName}》
                </span>
              </div>
            </div>

            {/* Guild Territory Flags on Minimap */}
            {guildTerritory.flagPoles.map((fp, fIdx) => (
              <div
                key={`fp_${fIdx}`}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center ${
                  fp.isMainFlag ? 'w-3 h-3 text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,1)] scale-110' : 'w-2.5 h-2.5 text-red-400'
                }`}
                style={{
                  left: `${(fp.x / map.width) * 100}%`,
                  top: `${(fp.y / map.height) * 100}%`
                }}
                title={`🚩 ${fp.label} (霸主: 《${sabakGuildName}》)`}
              >
                🚩
              </div>
            ))}
          </>
        )}

        {/* Player Radar Dot */}
        <div
          className="absolute w-2.5 h-2.5 bg-yellow-400 border border-black rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(250,204,21,1)] z-10"
          style={{
            left: `${(engine.character.x / map.width) * 100}%`,
            top: `${(engine.character.y / map.height) * 100}%`
          }}
        />

        {/* Monster Radar Dots */}
        {engine.monsters.map(m => {
          if (m.hp <= 0) return null;
          return (
            <div
              key={m.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full ${
                m.isBoss ? 'w-2 h-2 bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,1)]' : 'w-1 h-1 bg-red-400'
              }`}
              style={{
                left: `${(m.x / map.width) * 100}%`,
                top: `${(m.y / map.height) * 100}%`
              }}
            />
          );
        })}

        {/* Portals Dots */}
        {map.portals.map((p, idx) => (
          <div
            key={idx}
            className="absolute w-2 h-2 bg-blue-400 rounded-full border border-sky-200 transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
            style={{
              left: `${(p.x / map.width) * 100}%`,
              top: `${(p.y / map.height) * 100}%`
            }}
          />
        ))}

        {/* Territory Header Badge on Minimap */}
        {guildTerritory && (
          <div className="absolute top-1 left-1 bg-amber-950/80 border border-amber-500/50 px-1 py-0.2 rounded text-[8px] font-bold text-amber-300 backdrop-blur-xs flex items-center gap-0.5">
            <span>👑</span>
            <span className="truncate max-w-[65px]">{sabakGuildName}</span>
          </div>
        )}

        {/* Map Name Overlay */}
        <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-300">
          ({Math.floor(engine.character.x)}, {Math.floor(engine.character.y)})
        </div>
      </div>
    </div>
  );
};
