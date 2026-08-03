import React, { useState } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { X, Hammer, Sparkles, AlertCircle, ShoppingCart, Navigation, MapPin } from 'lucide-react';
import { MAP_DATABASE } from '../../data/maps';

interface ForgeModalProps {
  engine: GameEngine;
  onClose: () => void;
  onOpenShop?: () => void;
}

interface MaterialShortageInfo {
  itemId: string;
  itemName: string;
  icon: string;
  description: string;
  sources: {
    title: string;
    desc: string;
    mapId?: string;
    isShop?: boolean;
  }[];
}

export const ForgeModal: React.FC<ForgeModalProps> = ({ engine, onClose, onOpenShop }) => {
  const [shortageInfo, setShortageInfo] = useState<MaterialShortageInfo | null>(null);
  const weapon = engine.character.equipment.weapon;

  const handleApplyBlessingOil = () => {
    if (!weapon) {
      engine.addParticle(engine.character.x, engine.character.y, 'text_info', '未装备武器！');
      return;
    }

    const oilIdx = engine.character.inventory.findIndex(item => item?.id === 'blessing_oil');
    if (oilIdx < 0) {
      // Trigger shortage tip modal
      setShortageInfo({
        itemId: 'blessing_oil',
        itemName: '祝福油',
        icon: '🏺',
        description: '提升武器幸运等级的珍稀圣品。涂抹后提升锁定最大攻击上线的几率（最高幸+9）。',
        sources: [
          {
            title: '元宝云端商城',
            desc: '可以使用元宝快捷采购（20元宝 / 3瓶）。',
            isShop: true
          },
          {
            title: '毒蛇山谷',
            desc: '山谷野怪与毒蛇小怪有概率掉落祝福油。',
            mapId: 'snake_valley'
          },
          {
            title: '石墓阵七层',
            desc: '击杀石墓阵野蛮白野猪，高概率爆出祝福油。',
            mapId: 'stone_tomb'
          },
          {
            title: '祖玛大殿',
            desc: '祖玛教主及高阶精英怪掉落祝福油与神装。',
            mapId: 'zuma_temple'
          }
        ]
      });
      return;
    }

    // Deduct oil
    const oilItem = engine.character.inventory[oilIdx]!;
    if ((oilItem.count || 1) > 1) {
      oilItem.count! -= 1;
    } else {
      engine.character.inventory[oilIdx] = null;
    }

    // Success roll
    const currentLuck = weapon.luckLevel || 0;
    if (currentLuck >= 9) {
      engine.addParticle(engine.character.x, engine.character.y, 'text_gold', '【幸运+9已达上限】威力登峰造极！');
      return;
    }

    const chance = currentLuck < 5 ? 0.8 : 0.4;
    if (Math.random() < chance) {
      weapon.luckLevel = currentLuck + 1;
      engine.recalculateStats();
      engine.addParticle(engine.character.x, engine.character.y, 'text_gold', `【涂抹成功!】武器幸运 +${weapon.luckLevel}！`);
    } else {
      engine.addParticle(engine.character.x, engine.character.y, 'text_info', '涂抹失败，幸运未发生改变');
    }
    engine.triggerForgeQuest();
  };

  const handleRefineWeapon = () => {
    if (!weapon) {
      engine.addParticle(engine.character.x, engine.character.y, 'text_info', '未装备武器！');
      return;
    }

    const oreIdx = engine.character.inventory.findIndex(item => item?.id === 'black_iron_ore');
    if (oreIdx < 0) {
      // Trigger shortage tip modal
      setShortageInfo({
        itemId: 'black_iron_ore',
        itemName: '黑铁矿石',
        icon: '🪨',
        description: '神兵淬炼强化不可或缺的高纯度矿石。每提升 1 级增加基础攻防数值（最高+15）。',
        sources: [
          {
            title: '元宝云端商城',
            desc: '可以使用元宝快捷采购（15元宝 / 5块）。',
            isShop: true
          },
          {
            title: '比奇皇城 (矿区)',
            desc: '在比奇城矿区入口击杀野怪或参与矿洞采矿。',
            mapId: 'bichi_city'
          },
          {
            title: '石墓阵七层',
            desc: '石墓阵高阶精英怪物有高概率爆出黑铁矿石。',
            mapId: 'stone_tomb'
          }
        ]
      });
      return;
    }

    // Deduct ore
    const oreItem = engine.character.inventory[oreIdx]!;
    if ((oreItem.count || 1) > 1) {
      oreItem.count! -= 1;
    } else {
      engine.character.inventory[oreIdx] = null;
    }

    const currentRefine = weapon.refineLevel || 0;
    if (currentRefine >= 15) {
      engine.addParticle(engine.character.x, engine.character.y, 'text_gold', '【强化+15满级】神兵震撼世间！');
      return;
    }

    weapon.refineLevel = currentRefine + 1;
    engine.recalculateStats();
    engine.addParticle(engine.character.x, engine.character.y, 'text_gold', `【强化成功!】武器等级升至 +${weapon.refineLevel}！`);
    engine.triggerForgeQuest();
  };

  const handleTeleportToMap = (mapId: string) => {
    const targetMap = MAP_DATABASE[mapId];
    if (!targetMap) return;

    if (engine.character.level < targetMap.reqLevel) {
      engine.addParticle(
        engine.character.x,
        engine.character.y,
        'text_info',
        `等级不足！${targetMap.name} 需要角色达到 LV ${targetMap.reqLevel}`
      );
      return;
    }

    engine.changeMap(mapId, 10, 10);
    engine.addParticle(
      10,
      10,
      'text_gold',
      `【快速传送】已抵达 ${targetMap.name}！`
    );
    onClose();
  };

  const handleGoToShop = () => {
    onClose();
    if (onOpenShop) {
      onOpenShop();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-xl bg-slate-900 border-2 border-amber-800 rounded-2xl p-6 relative shadow-2xl text-amber-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 border-b border-amber-900/50 pb-4 mb-6">
          <Hammer className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-bold text-amber-300">神兵锻造与祝融炼金</h2>
        </div>

        {/* Current Weapon Preview */}
        <div className="bg-slate-950 p-4 rounded-xl border border-amber-600/60 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{weapon ? weapon.icon : '❓'}</span>
            <div>
              <h3 className="font-bold text-amber-200 text-sm">
                {weapon ? weapon.name : '未装备任何武器'}
                {weapon?.refineLevel ? <span className="text-amber-400 font-extrabold ml-1">+{weapon.refineLevel}</span> : null}
              </h3>
              <p className="text-xs text-amber-500 mt-0.5">
                幸运等级: 幸{weapon?.luckLevel || 0} / 9 {weapon?.luckLevel === 9 ? '（100%固定上限攻击!）' : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Blessing Oil Section */}
          <div className="bg-slate-950 p-4 rounded-xl border border-amber-900/40 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> 涂抹祝福油 (幸运+9)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                使用祝福油提升当前武器幸运值（最高幸+9）。幸运+9可使每次触发攻击时固定锁定最高面板输出！
              </p>
            </div>
            <button
              onClick={handleApplyBlessingOil}
              className="mt-4 w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white font-bold rounded-lg text-xs shadow-md border border-amber-400/30 active:scale-95 transition-all"
            >
              🏺 涂抹祝福油
            </button>
          </div>

          {/* Black Iron Reinforcement */}
          <div className="bg-slate-950 p-4 rounded-xl border border-amber-900/40 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2 mb-2">
                <Hammer className="w-4 h-4 text-amber-400" /> 黑铁强化 (+15)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                消耗黑铁矿石强化装备，每级大幅增加基础攻击力与物理魔法防御（最高+15）。
              </p>
            </div>
            <button
              onClick={handleRefineWeapon}
              className="mt-4 w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white font-bold rounded-lg text-xs shadow-md border border-amber-400/30 active:scale-95 transition-all"
            >
              🪨 黑铁淬炼强化
            </button>
          </div>
        </div>
      </div>

      {/* Material Shortage Sub-Modal / Pop-up */}
      {shortageInfo && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border-2 border-red-500/80 rounded-2xl p-5 relative shadow-[0_0_30px_rgba(239,68,68,0.3)] text-amber-100">
            <button
              onClick={() => setShortageInfo(null)}
              className="absolute top-4 right-4 p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-red-900/50 pb-3 mb-4">
              <div className="p-2 bg-red-950/80 rounded-xl border border-red-800/80 text-red-400">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-red-400 tracking-wide flex items-center gap-1.5">
                  强化材料不足提示
                </h3>
                <p className="text-[11px] text-slate-400">缺少关键炼金材料 [{shortageInfo.itemName}]</p>
              </div>
            </div>

            {/* Item Info Card */}
            <div className="bg-slate-950 p-3 rounded-xl border border-amber-900/40 mb-4 flex items-center gap-3">
              <span className="text-3xl">{shortageInfo.icon}</span>
              <div className="flex-1">
                <h4 className="font-bold text-amber-200 text-xs">{shortageInfo.itemName}</h4>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{shortageInfo.description}</p>
              </div>
            </div>

            {/* Material Source Drop List & Navigation */}
            <div className="space-y-2 mb-5">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" /> 获取途径与快捷导航:
              </span>

              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {shortageInfo.sources.map((src, index) => {
                  const targetMap = src.mapId ? MAP_DATABASE[src.mapId] : null;

                  return (
                    <div
                      key={index}
                      className="bg-slate-950 p-2.5 rounded-xl border border-amber-900/30 flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-amber-200 truncate">{src.title}</span>
                          {targetMap && (
                            <span className="text-[9px] bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded font-mono">
                              LV {targetMap.reqLevel}+
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{src.desc}</p>
                      </div>

                      {src.isShop ? (
                        <button
                          onClick={handleGoToShop}
                          className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-black text-[11px] rounded-lg flex items-center gap-1 shadow whitespace-nowrap active:scale-95 transition-all"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          <span>去商城</span>
                        </button>
                      ) : src.mapId ? (
                        <button
                          onClick={() => handleTeleportToMap(src.mapId!)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-800 font-bold text-[11px] rounded-lg flex items-center gap-1 whitespace-nowrap active:scale-95 transition-all"
                        >
                          <Navigation className="w-3 h-3 text-amber-400" />
                          <span>传送</span>
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Close */}
            <button
              onClick={() => setShortageInfo(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
