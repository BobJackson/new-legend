import React from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { MAP_DATABASE } from '../../data/maps';
import { WEATHER_DATABASE } from '../../data/weather';
import { Settings, Play, Pause, Coins, Gem, ShieldAlert, Award, Bot, Mail, ShieldCheck } from 'lucide-react';
import { LevelBadgeTag } from './LevelBadgeTag';

interface TopBarProps {
  engine: GameEngine;
  onOpenModal: (modalName: string) => void;
  onToggleAutoBattle: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ engine, onOpenModal, onToggleAutoBattle }) => {
  const map = MAP_DATABASE[engine.currentMapId] || MAP_DATABASE['bichi_city'];
  const unreadMails = engine.getUnreadMailsCount();

  return (
    <div className="w-full bg-slate-950/90 border-b border-amber-900/40 px-3 py-2 text-amber-100 flex flex-wrap items-center justify-between gap-2 backdrop-blur-md select-none z-20">
      {/* Player Identity & Battle Power */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onOpenModal('character')}
          className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-amber-900/60 to-slate-900 border border-amber-500/50 flex items-center justify-center text-2xl hover:brightness-125 transition-all shadow-md"
        >
          {engine.character.profession === 'warrior' ? '🗡️' : engine.character.profession === 'mage' ? '🔮' : '☯️'}
          <span className="absolute -bottom-1 -right-1 bg-amber-600 text-[10px] text-white font-black px-1 rounded-md">
            {engine.character.level}
          </span>
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-amber-200">{engine.character.name}</span>
            <span className="text-[10px] bg-amber-950/80 border border-amber-800 text-amber-400 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
              <span>{engine.character.gender === 'female' ? '♀️' : '♂️'}</span>
              <span>{engine.character.profession === 'warrior' ? '战士' : engine.character.profession === 'mage' ? '法师' : '道士'}</span>
            </span>
            <LevelBadgeTag level={engine.character.level} size="sm" showName={true} />
          </div>

          <div className="flex items-center gap-2 text-xs mt-0.5">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              战力: <span className="text-amber-300 font-extrabold">{engine.stats.battlePower.toLocaleString()}</span>
            </span>
            {engine.character.uid && (
              <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                {engine.character.uid}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Map Location, Weather & Safe Zone Badge */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onOpenModal('portal')}
          className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 border border-amber-500/50 hover:border-amber-400 px-3 py-1 rounded-full text-xs transition-all shadow-sm group"
          title="点击打开全大陆传送阵名录"
        >
          <span className="font-bold text-amber-300 group-hover:text-amber-200">📍 {map.name}</span>
          <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800/80 px-1 py-0.2 rounded font-bold">
            🌀 传送
          </span>
          {map.isSafeZone ? (
            <span className="bg-emerald-950 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded border border-emerald-800/60 font-bold">
              安全区
            </span>
          ) : (
            <span className="bg-rose-950 text-rose-400 text-[10px] px-1.5 py-0.5 rounded border border-rose-800/60 font-bold flex items-center gap-0.5">
              <ShieldAlert className="w-3 h-3" /> 危险副本
            </span>
          )}
        </button>

        {/* Global Weather Pill */}
        <button
          onClick={() => onOpenModal('weather')}
          className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-500/50 hover:border-amber-400 px-2.5 py-1 rounded-full text-xs transition-all shadow-sm group"
          title="点击查看全域天象与战斗BUFF"
        >
          <span className="text-sm">{WEATHER_DATABASE[engine.currentWeather]?.icon}</span>
          <span className="font-bold text-amber-200 group-hover:text-amber-300">
            {WEATHER_DATABASE[engine.currentWeather]?.name}
          </span>
        </button>
      </div>

      {/* Currency & Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:flex items-center gap-3 text-xs bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-800">
          <span className="text-amber-400 flex items-center gap-1 font-bold">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            {engine.character.gold.toLocaleString()} 金币
          </span>
          <span className="text-amber-300 flex items-center gap-1 font-bold">
            <Gem className="w-3.5 h-3.5 text-amber-400" />
            {engine.character.ingot.toLocaleString()} 元宝
          </span>
        </div>

        {/* Mail Button with Unread Badge */}
        <button
          onClick={() => onOpenModal('mail')}
          className="relative px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-amber-600/70 hover:border-amber-400 rounded-lg text-amber-200 transition-all flex items-center gap-1 text-xs font-bold shadow-sm"
          title="皇家信使 · 邮件中心"
        >
          <Mail className="w-4 h-4 text-amber-400" />
          <span className="hidden md:inline">邮件</span>
          {unreadMails > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-rose-600 text-white rounded-full text-[10px] font-black flex items-center justify-center px-1 shadow-[0_0_8px_#f43f5e] animate-pulse border border-slate-950">
              {unreadMails}
            </span>
          )}
        </button>

        {/* GM Admin Console Button */}
        <button
          onClick={() => onOpenModal('gmAdmin')}
          className="px-2.5 py-1.5 bg-gradient-to-r from-purple-950 to-indigo-950 hover:from-purple-900 hover:to-indigo-900 border border-purple-500/60 rounded-lg text-purple-200 transition-all flex items-center gap-1 text-xs font-bold shadow-sm"
          title="GM运营后台系统 (发奖/日志/花名册)"
        >
          <ShieldCheck className="w-4 h-4 text-purple-300" />
          <span className="hidden md:inline">GM后台</span>
        </button>

        {/* Auto Battle Toggle */}
        <button
          onClick={onToggleAutoBattle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-md ${
            engine.character.autoBattleSettings.enabled
              ? 'bg-amber-600 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.5)] border border-amber-400'
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
          }`}
        >
          {engine.character.autoBattleSettings.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{engine.character.autoBattleSettings.enabled ? '挂机中' : '自动挂机'}</span>
        </button>

        {/* Auto Recycle / Loot Settings Button */}
        <button
          onClick={() => onOpenModal('autoSettings')}
          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-amber-700/60 hover:border-amber-400 rounded-lg text-amber-300 transition-all flex items-center gap-1 text-xs font-extrabold shadow-sm"
          title="自动拾取与装备回收设置"
        >
          <Bot className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">拾取/回收</span>
        </button>

        <button
          onClick={() => onOpenModal('settings')}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-amber-900/50 rounded-lg text-slate-300 hover:text-amber-200 transition-all"
          title="系统设置"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
