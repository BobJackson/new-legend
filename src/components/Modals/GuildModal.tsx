import React, { useEffect, useState } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { X, Users, Crown, ShieldAlert, Sparkles, Trophy } from 'lucide-react';

interface GuildModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const GuildModal: React.FC<GuildModalProps> = ({ engine, onClose }) => {
  const [sabakInfo, setSabakInfo] = useState<{ guildName: string; leaderName: string; taxGold: number } | null>(null);
  const [newGuildName, setNewGuildName] = useState('热血兄弟会');

  useEffect(() => {
    fetch('/api/sabak')
      .then(res => res.json())
      .then(data => setSabakInfo(data))
      .catch(() => {});
  }, []);

  const handleCreateGuild = () => {
    if (!newGuildName.trim()) return;
    if (engine.character.gold < 50000) {
      engine.addParticle(engine.character.x, engine.character.y, 'text_info', '建会需要 50,000金币！');
      return;
    }

    engine.character.gold -= 50000;
    engine.character.guildName = newGuildName.trim();
    engine.addParticle(engine.character.x, engine.character.y, 'text_gold', `【行会建立成功!】成为《${newGuildName}》会长！`);
  };

  const handleClaimSabak = () => {
    if (!engine.character.guildName) {
      engine.addParticle(engine.character.x, engine.character.y, 'text_info', '尚未加入任何行会！');
      return;
    }

    fetch('/api/sabak/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guildName: engine.character.guildName,
        leaderName: engine.character.name
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSabakInfo(data.sabakLord);
          engine.character.ingot += 500;
          engine.character.title = '沙城城主';
          engine.addParticle(engine.character.x, engine.character.y, 'text_gold', '【占领沙巴克!】荣登沙城霸主，独享金币税收！');
        }
      })
      .catch(() => {});
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
          <Crown className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-bold text-amber-300">行会与沙巴克攻城战</h2>
        </div>

        {/* Current Sabak Lord Banner */}
        <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-slate-950 p-5 rounded-xl border-2 border-amber-500/80 mb-6 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded">
                👑 沙巴克霸主行会
              </span>
              <h3 className="text-2xl font-black text-amber-200 mt-2">
                {sabakInfo ? sabakInfo.guildName : '兄弟会'}
              </h3>
              <p className="text-xs text-amber-400 mt-1">
                城主大天尊: <span className="font-bold text-white">{sabakInfo ? sabakInfo.leaderName : '霸天战神'}</span>
              </p>
            </div>

            <button
              onClick={handleClaimSabak}
              className="px-4 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-black text-sm rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.5)] border border-amber-300 hover:brightness-110 active:scale-95"
            >
              🏰 占领沙城皇宫
            </button>
          </div>
        </div>

        {/* Guild Creation or Info */}
        <div className="bg-slate-950 p-4 rounded-xl border border-amber-900/40">
          <h4 className="font-bold text-amber-300 text-sm mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> 我的行会状态
          </h4>

          {engine.character.guildName ? (
            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800">
              <span className="text-slate-400">已加入行会:</span>
              <span className="font-bold text-amber-300 text-sm">《{engine.character.guildName}》</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={newGuildName}
                onChange={e => setNewGuildName(e.target.value)}
                maxLength={10}
                className="bg-slate-900 border border-amber-900/60 rounded-lg px-3 py-2 text-xs text-amber-200 focus:outline-none w-full"
                placeholder="请输入行会名称..."
              />
              <button
                onClick={handleCreateGuild}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg shadow-md whitespace-nowrap w-full sm:w-auto"
              >
                建立行会 (5万金币)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
