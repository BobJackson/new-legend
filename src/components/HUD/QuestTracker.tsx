import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { MAIN_QUESTS } from '../../data/quests';
import { Quest } from '../../types/game';
import { Scroll, ChevronLeft, ChevronRight, CheckCircle2, Navigation, Gift, Sparkles, Target, X, MessageSquareQuote } from 'lucide-react';
import { MAP_DATABASE } from '../../data/maps';
import { soundFX } from '../../utils/sound';

interface NpcDialogState {
  show: boolean;
  npcName: string;
  npcAvatar: string;
  npcTitle: string;
  questTitle: string;
  speechText: string;
  isCompleted: boolean;
}

const QUEST_NPC_MAP: Record<string, {
  npcName: string;
  npcAvatar: string;
  npcTitle: string;
  progressDialogue: (c: number, r: number) => string;
  completeDialogue: string;
}> = {
  quest_main_1: {
    npcName: '比奇老兵',
    npcAvatar: '🧙‍♂️',
    npcTitle: '比奇城守卫军长',
    progressDialogue: (c, r) => `勇士！稻草人正在村外作祟，你已斩杀 ${c}/${r} 只！继续挥剑为比奇带来安宁！`,
    completeDialogue: '好样的！城外的稻草人已被你全数荡平！快回到比奇城领取赏金吧！'
  },
  quest_main_2: {
    npcName: '毒蛇商人',
    npcAvatar: '🪓',
    npcTitle: '山谷过路行商',
    progressDialogue: (c, r) => `多谢大侠仗义护航！已清除 ${c}/${r} 只毒蛇，切记提防山谷剧毒！`,
    completeDialogue: '山谷商道终于安全了！这是商会赠予大侠的重金酬谢，请收下！'
  },
  quest_main_3: {
    npcName: '石墓守卫',
    npcAvatar: '🛡️',
    npcTitle: '盟重镇守先锋',
    progressDialogue: (c, r) => `石墓深处恶兽咆哮！已重创狂暴白野猪 (${c}/${r})，一鼓作气解决它！`,
    completeDialogue: '神勇无比！凶残的白野猪轰然倒地，石墓阵的危机终于消弭于无形！'
  },
  quest_main_4: {
    npcName: '大天尊国师',
    npcAvatar: '🧙‍♀️',
    npcTitle: '三清道术宗师',
    progressDialogue: (c, r) => `祖玛大殿魔气冲天！已重创邪教主 (${c}/${r})，用道法神威封印邪魔！`,
    completeDialogue: '邪恶教主已被彻底封印！古老祖玛圣殿破晓重现，你的英名将流芳千古！'
  },
  quest_main_5: {
    npcName: '沙巴克城主',
    npcAvatar: '👑',
    npcTitle: '传奇全服尊者',
    progressDialogue: (c, r) => `决战赤月峡谷！终极魔头赤月恶魔已被重创 (${c}/${r})，英雄加油！`,
    completeDialogue: '赤月恶魔终于伏诛！玛法迎来久违的曙光，你就是众望所归的传奇巨擘！'
  },
  quest_main_6: {
    npcName: '隐世老者',
    npcAvatar: '👴',
    npcTitle: '玛法玄功修仙者',
    progressDialogue: (c, r) => `吐故纳新，凝聚真气！等级已提升至 LV ${c}/${r}，突破巅峰就在当下！`,
    completeDialogue: '脱胎换骨，独尊玛法！如今你功力大成，快去开启属于你的沙城争霸吧！'
  }
};

interface QuestTrackerProps {
  engine: GameEngine;
}

export const QuestTracker: React.FC<QuestTrackerProps> = ({ engine }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'daily'>('main');
  const [npcDialog, setNpcDialog] = useState<NpcDialogState | null>(null);

  const prevCompletedRef = useRef<boolean>(false);
  const prevMainQuestIdRef = useRef<string | null>(null);
  const prevMainCountRef = useRef<number>(-1);
  const prevDailyCountsRef = useRef<Record<string, number>>({});
  const isInitializedRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const mainQuestIndex = engine.character.questData?.currentMainQuestIndex ?? 0;
  const currentMainQuestTemplate = MAIN_QUESTS[Math.min(mainQuestIndex, MAIN_QUESTS.length - 1)];

  // Get current main quest status
  const mainProgress = engine.character.questData?.mainQuestProgress ?? 0;
  let currentMainQuest: Quest | null = null;

  if (currentMainQuestTemplate) {
    let count = mainProgress;
    if (currentMainQuestTemplate.targetType === 'reach_level') {
      count = engine.character.level;
    }

    const isCompleted = count >= currentMainQuestTemplate.requiredCount;
    const isClaimed = mainQuestIndex >= MAIN_QUESTS.length;

    currentMainQuest = {
      ...currentMainQuestTemplate,
      currentCount: Math.min(count, currentMainQuestTemplate.requiredCount),
      isCompleted,
      isClaimed
    };
  }

  // Effect to trigger NPC interaction dialogue when quest progress changes
  useEffect(() => {
    const dailyQuests = engine.getDailyQuests();

    // Skip trigger on initial mount render
    if (!isInitializedRef.current) {
      if (currentMainQuest) {
        prevMainQuestIdRef.current = currentMainQuest.id;
        prevMainCountRef.current = currentMainQuest.currentCount;
      }
      const initialDaily: Record<string, number> = {};
      dailyQuests.forEach(dq => { initialDaily[dq.id] = dq.currentCount; });
      prevDailyCountsRef.current = initialDaily;
      isInitializedRef.current = true;
      return;
    }

    let triggerNpcState: NpcDialogState | null = null;

    // 1. Check Main Quest Progress or Completion Changes
    if (currentMainQuest) {
      const qId = currentMainQuest.id;
      const count = currentMainQuest.currentCount;
      const req = currentMainQuest.requiredCount;
      const npcConfig = QUEST_NPC_MAP[qId] || {
        npcName: '比奇老兵',
        npcAvatar: '🧙‍♂️',
        npcTitle: '剧情指引官',
        progressDialogue: (c: number, r: number) => `勇士加油，任务进度: ${c}/${r}！`,
        completeDialogue: '任务顺利完成！快去领取属于你的奖励！'
      };

      const isSameQuest = prevMainQuestIdRef.current === qId;
      const countIncreased = isSameQuest && count > prevMainCountRef.current;
      const justCompleted = currentMainQuest.isCompleted && !prevCompletedRef.current;

      if (justCompleted) {
        triggerNpcState = {
          show: true,
          npcName: npcConfig.npcName,
          npcAvatar: npcConfig.npcAvatar,
          npcTitle: npcConfig.npcTitle,
          questTitle: currentMainQuest.title,
          speechText: npcConfig.completeDialogue,
          isCompleted: true
        };
        soundFX.playQuestComplete();
      } else if (countIncreased) {
        triggerNpcState = {
          show: true,
          npcName: npcConfig.npcName,
          npcAvatar: npcConfig.npcAvatar,
          npcTitle: npcConfig.npcTitle,
          questTitle: currentMainQuest.title,
          speechText: npcConfig.progressDialogue(count, req),
          isCompleted: false
        };
        soundFX.playLoot();
      }

      prevMainQuestIdRef.current = qId;
      prevMainCountRef.current = count;
    }

    // 2. Check Daily Quest Progress
    if (!triggerNpcState) {
      dailyQuests.forEach(dq => {
        const prevCount = prevDailyCountsRef.current[dq.id] ?? 0;
        if (dq.currentCount > prevCount) {
          triggerNpcState = {
            show: true,
            npcName: '赏金官',
            npcAvatar: '📜',
            npcTitle: '玛法布告大使',
            questTitle: dq.title,
            speechText: dq.isCompleted
              ? `【${dq.title}】目标已完成！速来提取赏金元宝！`
              : `【${dq.title}】进度更新 (${dq.currentCount}/${dq.requiredCount})！坚持修行，大奖指日可待！`,
            isCompleted: dq.isCompleted
          };
          if (dq.isCompleted) soundFX.playQuestComplete();
          else soundFX.playLoot();
        }
      });
    }

    // Update daily counts ref
    const newDailyMap: Record<string, number> = {};
    dailyQuests.forEach(dq => { newDailyMap[dq.id] = dq.currentCount; });
    prevDailyCountsRef.current = newDailyMap;

    prevCompletedRef.current = !!currentMainQuest?.isCompleted;

    // Show dialogue if triggered
    if (triggerNpcState) {
      setNpcDialog(triggerNpcState);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setNpcDialog(prev => prev ? { ...prev, show: false } : null);
      }, 5000);
    }
  }, [
    currentMainQuest?.currentCount,
    currentMainQuest?.isCompleted,
    currentMainQuest?.id,
    mainQuestIndex,
    engine.character.questData?.dailyQuests
  ]);

  // Get daily quests
  const dailyQuests = engine.getDailyQuests();

  const handleClaimMainReward = () => {
    soundFX.playQuestComplete();
    engine.claimMainQuestReward();
  };

  const handleClaimDailyReward = (questId: string) => {
    soundFX.playQuestComplete();
    engine.claimDailyQuestReward(questId);
  };

  const handleNavigateToMap = (mapId?: string) => {
    if (!mapId || !MAP_DATABASE[mapId]) return;
    const map = MAP_DATABASE[mapId];
    if (engine.character.level < map.reqLevel) {
      engine.addParticle(engine.character.x, engine.character.y, 'text_info', `角色等级不足，需要 LV ${map.reqLevel}！`);
      return;
    }
    engine.changeMap(mapId, 10, 10);
    engine.addParticle(10, 10, 'text_gold', `【任务寻路】传送至 ${map.name}`);
  };

  if (isCollapsed) {
    return (
      <div className="absolute left-2 top-24 z-20">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-slate-900/90 border-2 border-amber-600/80 hover:border-amber-400 text-amber-200 px-2.5 py-2 rounded-r-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] backdrop-blur-md flex items-center gap-1.5 font-bold text-xs transition-all active:scale-95"
        >
          <Scroll className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>任务</span>
          <ChevronRight className="w-4 h-4 text-amber-500" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="absolute left-2 top-24 z-20 w-64 sm:w-72 bg-slate-950/90 border-2 border-amber-800/80 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.8)] backdrop-blur-md text-amber-100 overflow-hidden transition-all duration-300">
        {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 px-3 py-2 border-b border-amber-900/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Scroll className="w-4 h-4 text-amber-400" />
          <span className="font-extrabold text-xs text-amber-300 tracking-wide">传奇任务追踪</span>
        </div>

        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300"
          title="收起"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-amber-900/40 bg-slate-900/60">
        <button
          onClick={() => setActiveTab('main')}
          className={`flex-1 py-1.5 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'main'
              ? 'bg-amber-950/60 text-amber-300 border-b-2 border-amber-500'
              : 'text-slate-400 hover:text-amber-200'
          }`}
        >
          <Target className="w-3 h-3" /> 主线剧情
          {currentMainQuest?.isCompleted && !currentMainQuest.isClaimed && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 py-1.5 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'daily'
              ? 'bg-amber-950/60 text-amber-300 border-b-2 border-amber-500'
              : 'text-slate-400 hover:text-amber-200'
          }`}
        >
          <Sparkles className="w-3 h-3" /> 每日目标
          {dailyQuests.some(q => q.isCompleted && !q.isClaimed) && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
          )}
        </button>
      </div>

      {/* Main Quest Content */}
      {activeTab === 'main' && (
        <div className="p-3">
          {mainQuestIndex >= MAIN_QUESTS.length ? (
            <div className="text-center py-4 text-xs text-amber-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
              <p className="font-bold text-amber-200">主线剧情全通关！</p>
              <p className="text-[10px] text-slate-400 mt-1">沙巴克霸业指日可待</p>
            </div>
          ) : currentMainQuest ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded font-bold">
                  {currentMainQuest.chapter || '剧情'}
                </span>
                <span className="text-xs font-bold text-amber-300">{currentMainQuest.title}</span>
              </div>

              <p className="text-[11px] text-slate-300 leading-tight bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                {currentMainQuest.description}
              </p>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-amber-400 font-semibold">
                  <span>进度: {currentMainQuest.targetName}</span>
                  <span>{currentMainQuest.currentCount} / {currentMainQuest.requiredCount}</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-amber-950">
                  <div
                    className="bg-gradient-to-r from-amber-600 to-amber-400 h-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (currentMainQuest.currentCount / currentMainQuest.requiredCount) * 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Rewards */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/40 p-1.5 rounded">
                <span>奖励:</span>
                <span className="text-amber-300 font-bold">
                  +{currentMainQuest.rewardExp}经验 · +{currentMainQuest.rewardGold}金币
                  {currentMainQuest.rewardIngot ? ` · +${currentMainQuest.rewardIngot}元宝` : ''}
                  {currentMainQuest.rewardItemName ? ` · +${currentMainQuest.rewardItemName}` : ''}
                </span>
              </div>

              {/* Action Button */}
              {currentMainQuest.isCompleted ? (
                <button
                  onClick={handleClaimMainReward}
                  className="w-full py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-black text-xs rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-amber-300 hover:brightness-110 active:scale-95 flex items-center justify-center gap-1"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>完成任务 (领取奖励)</span>
                </button>
              ) : (
                currentMainQuest.targetMapId && (
                  <button
                    onClick={() => handleNavigateToMap(currentMainQuest?.targetMapId)}
                    className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-900/60 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95"
                  >
                    <Navigation className="w-3 h-3 text-amber-400" />
                    <span>前往目标地图 ({MAP_DATABASE[currentMainQuest.targetMapId]?.name})</span>
                  </button>
                )
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Daily Quests Content */}
      {activeTab === 'daily' && (
        <div className="p-2 space-y-2 max-h-60 overflow-y-auto">
          {dailyQuests.map((quest) => (
            <div
              key={quest.id}
              className="bg-slate-900/80 p-2 rounded-lg border border-amber-900/40 space-y-1 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-200 text-[11px]">{quest.title}</span>
                <span className="text-[10px] text-amber-400 font-semibold">
                  {quest.currentCount} / {quest.requiredCount}
                </span>
              </div>

              <p className="text-[10px] text-slate-400">{quest.description}</p>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[9px] text-amber-500">
                  +{quest.rewardExp}经验 · +{quest.rewardIngot}元宝
                </span>

                {quest.isClaimed ? (
                  <span className="text-[10px] text-slate-500 font-bold">已完成</span>
                ) : quest.isCompleted ? (
                  <button
                    onClick={() => handleClaimDailyReward(quest.id)}
                    className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] rounded shadow"
                  >
                    领奖
                  </button>
                ) : (
                  <span className="text-[10px] text-amber-500/80 font-semibold">进行中</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

      {/* Central Map NPC Interaction Bubble */}
      {npcDialog?.show && (
        <div
          onClick={() => setNpcDialog(prev => prev ? { ...prev, show: false } : null)}
          className="fixed top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-lg cursor-pointer select-none animate-in fade-in zoom-in-95 duration-300"
        >
          <div className="bg-slate-950/95 border-2 border-amber-500/90 rounded-2xl p-4 shadow-[0_0_35px_rgba(245,158,11,0.5)] backdrop-blur-xl relative flex items-center gap-4 text-amber-100 hover:border-amber-400 transition-all">
            {/* Bubble Tail pointer */}
            <div className="absolute -bottom-2 left-10 w-4 h-4 bg-slate-950 border-r-2 border-b-2 border-amber-500/90 rotate-45" />

            {/* NPC Portrait */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-950 via-slate-900 to-amber-900 border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center justify-center text-3xl">
                {npcDialog.npcAvatar}
              </div>
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full border border-yellow-200">
                NPC
              </span>
            </div>

            {/* Dialogue Bubble Text */}
            <div className="flex-1 space-y-1.5 pr-5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm text-amber-300 flex items-center gap-1">
                  <MessageSquareQuote className="w-4 h-4 text-amber-400" />
                  {npcDialog.npcName}
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-amber-950/80 text-amber-400 border border-amber-800 rounded-md font-bold">
                  {npcDialog.npcTitle}
                </span>
                {npcDialog.isCompleted && (
                  <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500 text-slate-950 rounded-md animate-pulse">
                    任务达成
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-200 leading-relaxed font-medium bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 shadow-inner">
                "{npcDialog.speechText}"
              </p>

              <div className="flex items-center justify-between text-[10px] text-amber-500/80 pt-0.5">
                <span className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-400" /> 关联任务: {npcDialog.questTitle}
                </span>
                <span className="text-slate-400 font-semibold hover:text-amber-300">
                  [点击任意处关闭]
                </span>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNpcDialog(prev => prev ? { ...prev, show: false } : null);
              }}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-700 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
