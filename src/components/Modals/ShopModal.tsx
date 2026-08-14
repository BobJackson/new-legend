import React from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { ITEM_DATABASE } from '../../data/items';
import { X, Store, Coins, Gem, Sparkles } from 'lucide-react';

interface ShopModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ engine, onClose }) => {
  const pillTierInfo = engine.getLevelUpPillPrice();

  const shopGoods = [
    {
      item: ITEM_DATABASE['pill_instant_levelup'],
      priceIngot: pillTierInfo.price,
      count: 1,
      label: `【阶梯直升】直升经验丹 x1`,
      tierSub: `当前LV.${engine.character.level} (${pillTierInfo.tierName} · ${pillTierInfo.reqLevelRange})`
    },
    { item: ITEM_DATABASE['pill_mount_advance'], priceIngot: 20, count: 10, label: '【坐骑神丹】进阶丹 x10' },
    { item: ITEM_DATABASE['potion_sun_water'], priceIngot: 10, count: 10, label: '太阳水 x10' },
    { item: ITEM_DATABASE['blessing_oil'], priceIngot: 20, count: 3, label: '祝福油 x3' },
    { item: ITEM_DATABASE['black_iron_ore'], priceIngot: 15, count: 5, label: '黑铁矿石 x5' },
    { item: ITEM_DATABASE['material_capture_rope'], priceIngot: 10, count: 5, label: '【宠物】捕兽索 x5' },
    { item: ITEM_DATABASE['material_exp_fruit'], priceIngot: 20, count: 10, label: '【宠物】经验果 x10' },
    { item: ITEM_DATABASE['ring_paralysis'], priceIngot: 888, count: 1, label: '【神装】麻痹戒指' },
    { item: ITEM_DATABASE['ring_bodyguard'], priceIngot: 888, count: 1, label: '【神装】护身戒指' },
    { item: ITEM_DATABASE['ring_resurrection'], priceIngot: 999, count: 1, label: '【神装】复活戒指' },
    { item: ITEM_DATABASE['weapon_genesis'], priceIngot: 50000, count: 1, label: '【终极神装】创世神剑' },
    { item: ITEM_DATABASE['armor_genesis'], priceIngot: 50000, count: 1, label: '【终极神装】创世神铠' },
    { item: ITEM_DATABASE['helmet_genesis'], priceIngot: 20000, count: 1, label: '【终极神装】创世神盔' },
    { item: ITEM_DATABASE['necklace_genesis'], priceIngot: 20000, count: 1, label: '【终极神装】创世神链' },
    { item: ITEM_DATABASE['bracelet_genesis'], priceIngot: 20000, count: 1, label: '【终极神装】创世神镯' },
    { item: ITEM_DATABASE['ring_genesis'], priceIngot: 20000, count: 1, label: '【终极神装】创世神戒' },
    { item: ITEM_DATABASE['boot_genesis'], priceIngot: 20000, count: 1, label: '【终极神装】创世神靴' },
    { item: ITEM_DATABASE['belt_genesis'], priceIngot: 20000, count: 1, label: '【终极神装】创世神带' }
  ];

  const handleBuy = (goods: typeof shopGoods[0]) => {
    const cost = goods.item.id === 'pill_instant_levelup' ? engine.getLevelUpPillPrice().price : goods.priceIngot;

    if (engine.character.ingot < cost) {
      engine.addParticle(engine.character.x, engine.character.y, 'text_info', `元宝不足！需要 ${cost.toLocaleString()} 元宝！`);
      return;
    }

    if (goods.item.id === 'pill_mount_advance') {
      engine.initMount();
      engine.character.ingot -= cost;
      engine.character.mount!.advancePillsCount += goods.count;
      engine.addParticle(engine.character.x, engine.character.y, 'text_gold', `【购买成功!】获得 ${goods.label}`);
      return;
    }

    const success = engine.addItemToInventory({
      ...goods.item,
      count: goods.count
    });

    if (success) {
      engine.character.ingot -= cost;
      engine.addParticle(engine.character.x, engine.character.y, 'text_gold', `【购买成功!】获得 ${goods.label}`);
    } else {
      engine.addParticle(engine.character.x, engine.character.y, 'text_info', '背包已满，请先清理背包！');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border-2 border-amber-800 rounded-2xl p-6 relative shadow-2xl text-amber-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between border-b border-amber-900/50 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-amber-300">元宝云端商城</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                engine.character.ingot += 10000000;
                engine.notify();
              }}
              className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg shadow font-bold"
            >
              【系统奖励】10,000,000 元宝
            </button>
            <div className="text-xs bg-slate-950 border border-amber-900/60 px-3 py-1.5 rounded-lg font-bold text-amber-300">
              元宝余额: {engine.character.ingot.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 直升经验丹 阶梯售价规则提示条 */}
        <div className="mb-4 bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-xs flex flex-col gap-1.5 shadow-inner">
          <div className="flex items-center justify-between text-amber-300 font-bold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              直升经验丹 · 阶梯售价说明（根据角色当前等级计算）
            </span>
            <span className="text-[11px] text-amber-200/80">
              当前等级: <strong className="text-yellow-300">LV.{engine.character.level}</strong> (对应 {pillTierInfo.tierName}: <strong className="text-yellow-400">{pillTierInfo.price.toLocaleString()} 元宝</strong>)
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-300">
            <span className={`px-2 py-0.5 rounded border ${engine.character.level <= 20 ? 'bg-amber-500/30 border-amber-400 text-yellow-200 font-bold' : 'bg-slate-900/80 border-slate-800 text-slate-400'}`}>LV.1-20: 50元宝</span>
            <span className={`px-2 py-0.5 rounded border ${engine.character.level > 20 && engine.character.level <= 35 ? 'bg-amber-500/30 border-amber-400 text-yellow-200 font-bold' : 'bg-slate-900/80 border-slate-800 text-slate-400'}`}>LV.21-35: 150元宝</span>
            <span className={`px-2 py-0.5 rounded border ${engine.character.level > 35 && engine.character.level <= 50 ? 'bg-amber-500/30 border-amber-400 text-yellow-200 font-bold' : 'bg-slate-900/80 border-slate-800 text-slate-400'}`}>LV.36-50: 500元宝</span>
            <span className={`px-2 py-0.5 rounded border ${engine.character.level > 50 && engine.character.level <= 65 ? 'bg-amber-500/30 border-amber-400 text-yellow-200 font-bold' : 'bg-slate-900/80 border-slate-800 text-slate-400'}`}>LV.51-65: 1,500元宝</span>
            <span className={`px-2 py-0.5 rounded border ${engine.character.level > 65 && engine.character.level <= 80 ? 'bg-amber-500/30 border-amber-400 text-yellow-200 font-bold' : 'bg-slate-900/80 border-slate-800 text-slate-400'}`}>LV.66-80: 4,000元宝</span>
            <span className={`px-2 py-0.5 rounded border ${engine.character.level > 80 && engine.character.level <= 100 ? 'bg-amber-500/30 border-amber-400 text-yellow-200 font-bold' : 'bg-slate-900/80 border-slate-800 text-slate-400'}`}>LV.81-100: 10,000元宝</span>
            <span className={`px-2 py-0.5 rounded border ${engine.character.level > 100 ? 'bg-amber-500/30 border-amber-400 text-yellow-200 font-bold' : 'bg-slate-900/80 border-slate-800 text-slate-400'}`}>LV.100+: 20,000+元宝</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {shopGoods.map((goods, idx) => (
            <div
              key={idx}
              className="bg-slate-950 p-4 rounded-xl border border-amber-900/40 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-3xl shrink-0">{goods.item.icon}</span>
                <div className="min-w-0">
                  <h4 className="font-bold text-amber-200 text-sm truncate">{goods.label}</h4>
                  {goods.tierSub ? (
                    <p className="text-[10px] text-amber-300 font-medium">{goods.tierSub}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{goods.item.description}</p>
                  )}
                  <p className="text-xs font-extrabold text-amber-400 mt-1">{goods.priceIngot.toLocaleString()} 元宝</p>
                </div>
              </div>

              <button
                onClick={() => handleBuy(goods)}
                className="px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white font-bold text-xs rounded-lg shadow-md whitespace-nowrap shrink-0"
              >
                购买
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
