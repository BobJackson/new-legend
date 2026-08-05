import React from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { ITEM_DATABASE } from '../../data/items';
import { X, Store, Coins, Gem, Sparkles } from 'lucide-react';

interface ShopModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ engine, onClose }) => {
  const shopGoods = [
    { item: ITEM_DATABASE['pill_mount_advance'], priceIngot: 20, count: 10, label: '【坐骑神丹】进阶丹 x10' },
    { item: ITEM_DATABASE['potion_sun_water'], priceIngot: 10, count: 10, label: '太阳水 x10' },
    { item: ITEM_DATABASE['blessing_oil'], priceIngot: 20, count: 3, label: '祝福油 x3' },
    { item: ITEM_DATABASE['black_iron_ore'], priceIngot: 15, count: 5, label: '黑铁矿石 x5' },
    { item: ITEM_DATABASE['material_capture_rope'], priceIngot: 10, count: 5, label: '【宠物】捕兽索 x5' },
    { item: ITEM_DATABASE['material_exp_fruit'], priceIngot: 20, count: 10, label: '【宠物】经验果 x10' },
    { item: ITEM_DATABASE['ring_paralysis'], priceIngot: 888, count: 1, label: '【神装】麻痹戒指' },
    { item: ITEM_DATABASE['ring_bodyguard'], priceIngot: 888, count: 1, label: '【神装】护身戒指' },
    { item: ITEM_DATABASE['ring_resurrection'], priceIngot: 999, count: 1, label: '【神装】复活戒指' }
  ];

  const handleBuy = (goods: typeof shopGoods[0]) => {
    if (engine.character.ingot < goods.priceIngot) {
      engine.addParticle(engine.character.x, engine.character.y, 'text_info', '元宝不足！');
      return;
    }

    if (goods.item.id === 'pill_mount_advance') {
      engine.initMount();
      engine.character.ingot -= goods.priceIngot;
      engine.character.mount!.advancePillsCount += goods.count;
      engine.addParticle(engine.character.x, engine.character.y, 'text_gold', `【购买成功!】获得 ${goods.label}`);
      return;
    }

    const success = engine.addItemToInventory({
      ...goods.item,
      count: goods.count
    });

    if (success) {
      engine.character.ingot -= goods.priceIngot;
      engine.addParticle(engine.character.x, engine.character.y, 'text_gold', `【购买成功!】获得 ${goods.label}`);
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
          <div className="text-xs bg-slate-950 border border-amber-900/60 px-3 py-1.5 rounded-lg font-bold text-amber-300">
            元宝余额: {engine.character.ingot.toLocaleString()}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {shopGoods.map((goods, idx) => (
            <div
              key={idx}
              className="bg-slate-950 p-4 rounded-xl border border-amber-900/40 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{goods.item.icon}</span>
                <div>
                  <h4 className="font-bold text-amber-200 text-sm">{goods.label}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 max-w-[150px] truncate">{goods.item.description}</p>
                  <p className="text-xs font-extrabold text-amber-400 mt-1">{goods.priceIngot} 元宝</p>
                </div>
              </div>

              <button
                onClick={() => handleBuy(goods)}
                className="px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white font-bold text-xs rounded-lg shadow-md whitespace-nowrap"
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
