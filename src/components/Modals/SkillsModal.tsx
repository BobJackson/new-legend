import React from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { X, Flame, Zap, Shield } from 'lucide-react';

interface SkillsModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const SkillsModal: React.FC<SkillsModalProps> = ({ engine, onClose }) => {
  const handleLevelUpSkill = (skillId: string) => {
    const skill = engine.character.skills.find(s => s.id === skillId);
    if (!skill) return;

    if (skill.level >= 3) {
      engine.addParticle(engine.character.x, engine.character.y, 'text_info', '技能已满级！');
      return;
    }

    const costGold = skill.level * 10000;
    if (engine.character.gold < costGold) {
      engine.addParticle(engine.character.x, engine.character.y, 'text_info', '金币不足！');
      return;
    }

    engine.character.gold -= costGold;
    skill.level += 1;
    skill.damageRatio += 0.3;
    engine.addParticle(engine.character.x, engine.character.y, 'text_gold', `【${skill.name}】突破到 LV${skill.level}！`);
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

        <div className="flex items-center gap-2 border-b border-amber-900/50 pb-4 mb-4">
          <Flame className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-bold text-amber-300">技能秘籍与修练</h2>
        </div>

        <div className="space-y-3">
          {engine.character.skills.map((skill) => {
            const costGold = skill.level * 10000;

            return (
              <div
                key={skill.id}
                className="bg-slate-950 p-4 rounded-xl border border-amber-900/40 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{skill.icon}</span>
                  <div>
                    <h3 className="font-bold text-amber-200 text-sm flex items-center gap-2">
                      {skill.name}
                      <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded">
                        LV {skill.level} / 3
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{skill.description}</p>
                    <p className="text-[10px] text-amber-500 mt-1">
                      消耗魔法: {skill.mpCost} MP · 冷却时间: {(skill.cooldownMs / 1000).toFixed(1)}s · 伤害系数: {(skill.damageRatio * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleLevelUpSkill(skill.id)}
                  disabled={skill.level >= 3}
                  className={`px-3 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
                    skill.level >= 3
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md'
                  }`}
                >
                  {skill.level >= 3 ? '已满级' : `升级 (${costGold}金币)`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
