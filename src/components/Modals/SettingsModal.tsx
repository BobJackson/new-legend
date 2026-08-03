import React, { useState } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { soundFX } from '../../utils/sound';
import { saveCharacter } from '../../utils/storage';
import { X, Settings, Volume2, VolumeX, Save, RotateCcw, Eye, Sparkles, Zap } from 'lucide-react';

interface SettingsModalProps {
  engine: GameEngine;
  onClose: () => void;
  onResetGame: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ engine, onClose, onResetGame }) => {
  engine.initCombatDisplaySettings();

  const [isMuted, setIsMuted] = useState(soundFX.getMuted());
  const [autoHp, setAutoHp] = useState(engine.character.autoBattleSettings.autoPotionHp);
  const [showRight, setShowRight] = useState(engine.character.combatDisplaySettings?.showRightDamage ?? true);
  const [showCenter, setShowCenter] = useState(engine.character.combatDisplaySettings?.showCenterDamage ?? false);

  const toggleMute = () => {
    soundFX.setMuted(!isMuted);
    setIsMuted(!isMuted);
  };

  const handleSave = () => {
    engine.character.autoBattleSettings.autoPotionHp = autoHp;
    if (!engine.character.combatDisplaySettings) {
      engine.character.combatDisplaySettings = { showRightDamage: true, showCenterDamage: false };
    }
    engine.character.combatDisplaySettings.showRightDamage = showRight;
    engine.character.combatDisplaySettings.showCenterDamage = showCenter;
    saveCharacter(engine.character);
    engine.notify();
    engine.addParticle(engine.character.x, engine.character.y, 'text_gold', '【存档成功!】设置与进度已保存');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border-2 border-amber-800 rounded-2xl p-6 relative shadow-2xl text-amber-100 max-h-[92vh] flex flex-col overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 border-b border-amber-900/50 pb-4 mb-6 shrink-0">
          <Settings className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-bold text-amber-300">系统设置与存档</h2>
        </div>

        <div className="space-y-5 text-xs flex-1">
          {/* Sound FX Toggle */}
          <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-amber-900/40">
            <span className="font-bold text-amber-200">复古战斗音效</span>
            <button
              onClick={toggleMute}
              className={`p-2 rounded-lg flex items-center gap-2 font-bold ${
                isMuted ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isMuted ? '静音中' : '音效开启'}</span>
            </button>
          </div>

          {/* Combat Damage Effects Toggle Section */}
          <div className="bg-slate-950 p-4 rounded-xl border border-amber-900/40 space-y-3">
            <div className="flex items-center gap-2 border-b border-amber-900/30 pb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-amber-200">战斗伤害特效展示设置</span>
            </div>

            {/* Right Side Damage FX Switch */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-bold text-slate-200">右侧伤害特效 (连击面板)</span>
                <span className="text-[10px] text-slate-400">屏幕右侧连击面板与狂暴BUFF (默认开启)</span>
              </div>
              <button
                onClick={() => {
                  const val = !showRight;
                  setShowRight(val);
                  if (engine.character.combatDisplaySettings) {
                    engine.character.combatDisplaySettings.showRightDamage = val;
                  }
                  engine.notify();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 border shrink-0 ${
                  showRight
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-900 text-slate-500 border-slate-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showRight ? '已开启' : '已关闭'}</span>
              </button>
            </div>

            {/* Center Screen Damage FX Switch */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-bold text-slate-200">中间伤害特效 (屏幕爆字)</span>
                <span className="text-[10px] text-slate-400">屏幕中央巨幅爆字连击与火焰冲击波 (默认关闭)</span>
              </div>
              <button
                onClick={() => {
                  const val = !showCenter;
                  setShowCenter(val);
                  if (engine.character.combatDisplaySettings) {
                    engine.character.combatDisplaySettings.showCenterDamage = val;
                  }
                  engine.notify();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 border shrink-0 ${
                  showCenter
                    ? 'bg-amber-950 text-amber-300 border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-900 text-slate-500 border-slate-700'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{showCenter ? '已开启' : '已关闭'}</span>
              </button>
            </div>
          </div>

          {/* Auto Potion Slider */}
          <div className="bg-slate-950 p-4 rounded-xl border border-amber-900/40">
            <div className="flex justify-between font-bold text-amber-200 mb-2">
              <span>自动吃药触发阀值</span>
              <span className="text-amber-400">生命低于 {autoHp}%</span>
            </div>
            <input
              type="range"
              min={20}
              max={80}
              value={autoHp}
              onChange={(e) => setAutoHp(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-2 shrink-0">
            <button
              onClick={handleSave}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-md border border-amber-400/30 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> 保存当前角色进度
            </button>

            <button
              onClick={onResetGame}
              className="w-full py-2.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> 重新创建新角色
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
