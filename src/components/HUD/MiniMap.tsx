import React from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { MAP_DATABASE } from '../../data/maps';

interface MiniMapProps {
  engine: GameEngine;
}

export const MiniMap: React.FC<MiniMapProps> = ({ engine }) => {
  const map = MAP_DATABASE[engine.currentMapId] || MAP_DATABASE['bichi_city'];

  return (
    <div className="absolute top-14 right-3 z-20 w-32 h-32 bg-slate-950/85 border-2 border-amber-900/80 rounded-xl p-1 shadow-2xl backdrop-blur-md hidden sm:block">
      <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
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

        {/* Map Name Overlay */}
        <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-300">
          ({Math.floor(engine.character.x)}, {Math.floor(engine.character.y)})
        </div>
      </div>
    </div>
  );
};
