import React from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { WEATHER_DATABASE, WeatherType } from '../../data/weather';
import { soundFX } from '../../utils/sound';
import { X, CloudRain, Sun, Snowflake, Zap, Wind, Sparkles } from 'lucide-react';

interface WeatherModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const WeatherModal: React.FC<WeatherModalProps> = ({ engine, onClose }) => {
  const currentWeatherKey = engine.currentWeather || 'sunny';
  const currentWeatherInfo = WEATHER_DATABASE[currentWeatherKey];

  const handleSelectWeather = (wKey: WeatherType) => {
    if (engine.currentWeather === wKey) return;
    engine.setWeather(wKey, true);
    soundFX.playThunder();
  };

  const getWeatherIconComponent = (key: WeatherType) => {
    switch (key) {
      case 'sunny': return <Sun className="w-6 h-6 text-amber-400" />;
      case 'rain': return <CloudRain className="w-6 h-6 text-sky-400" />;
      case 'snow': return <Snowflake className="w-6 h-6 text-cyan-300" />;
      case 'sandstorm': return <Wind className="w-6 h-6 text-yellow-500" />;
      case 'thunder': return <Zap className="w-6 h-6 text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="w-full max-w-xl bg-slate-900 border-2 border-amber-700/80 rounded-2xl p-4 sm:p-6 relative shadow-[0_0_50px_rgba(0,0,0,0.9)] text-amber-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-900/60 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-lg sm:text-xl font-black text-amber-300 tracking-wide">
                全局天象与天气BUFF系统
              </h2>
              <p className="text-[11px] text-amber-400/80">
                天象更迭影响全域场景光影与全局角色战斗数值
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Weather Banner */}
        <div className={`p-4 rounded-xl border-2 mb-4 shrink-0 flex items-center justify-between shadow-lg ${currentWeatherInfo.badgeBg} ${currentWeatherInfo.badgeBorder}`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-white/10 text-3xl">
              {currentWeatherInfo.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-amber-200">当前天象：{currentWeatherInfo.name}</span>
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                  生效中
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-md">
                {currentWeatherInfo.description}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/40 rounded-lg text-xs font-bold text-emerald-300 border border-emerald-500/30">
                ⚡ 战斗特权BUFF: {currentWeatherInfo.buffText}
              </div>
            </div>
          </div>
        </div>

        {/* Weather Selection List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          <div className="text-xs font-bold text-amber-400/90 flex items-center justify-between">
            <span>祈福改天换地 (选择天象即刻生效)</span>
            <span className="text-[11px] text-slate-400 font-normal">天象每 90 秒自然轮转</span>
          </div>

          {(Object.keys(WEATHER_DATABASE) as WeatherType[]).map((wKey) => {
            const info = WEATHER_DATABASE[wKey];
            const isActive = currentWeatherKey === wKey;

            return (
              <div
                key={wKey}
                onClick={() => handleSelectWeather(wKey)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-amber-950/70 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'bg-slate-950/80 border-slate-800 hover:border-amber-700/60 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 shrink-0">
                    {getWeatherIconComponent(wKey)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${info.textColor}`}>{info.icon} {info.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        亮度 {Math.round(info.brightness * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{info.description}</p>
                    <div className="text-[11px] font-semibold text-amber-300/90 mt-1">
                      ✨ BUFF: {info.buffText}
                    </div>
                  </div>
                </div>

                <button
                  disabled={isActive}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectWeather(wKey);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs shrink-0 transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-slate-950 cursor-default opacity-80'
                      : 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-md active:scale-95'
                  }`}
                >
                  {isActive ? '正在降临' : '祈福召唤'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-amber-900/50 flex items-center justify-between shrink-0 text-xs">
          <span className="text-amber-500/80">
            💡 不同副本可能具备天然天象倾向，切换地图时天象会重置
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg transition-all"
          >
            完成关闭
          </button>
        </div>
      </div>
    </div>
  );
};
