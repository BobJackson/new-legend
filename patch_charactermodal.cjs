const fs = require('fs');

let content = fs.readFileSync('src/components/Modals/CharacterModal.tsx', 'utf8');

const insertion = `              {engine.character.mount && (
                <>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">坐骑阶位 / 状态</span>
                    <span className="font-bold text-yellow-300">
                      {engine.character.mount.tier}阶 ({engine.character.mount.level}星) - {engine.character.mount.isMounted ? '骑乘中 🐴' : '未骑乘'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">坐骑移速特权加成</span>
                    <span className="font-bold text-emerald-300">
                      +{engine.stats.moveSpeedBonus ? Math.round(engine.stats.moveSpeedBonus * 100) : 0}%
                    </span>
                  </div>
                </>
              )}
              
              {/* === Set Bonuses === */}
              {engine.getActiveSets && engine.getActiveSets().length > 0 && (
                <div className="mt-4 p-3 border border-amber-500/30 bg-amber-900/20 rounded-lg">
                  <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
                    ✨ 激活的套装效果
                  </h4>
                  {engine.getActiveSets().map((set, idx) => (
                    <div key={idx} className="mb-2 text-xs text-amber-200/90">
                      <div className="font-bold text-amber-300">【{set.setName}】 (已集齐)</div>
                      <div className="grid grid-cols-2 gap-1 mt-1 pl-2">
                        {set.hpBonus && <span>生命 +{set.hpBonus}</span>}
                        {set.physAtkBonus && <span>物攻 +{set.physAtkBonus}</span>}
                        {set.magAtkBonus && <span>魔攻 +{set.magAtkBonus}</span>}
                        {set.taoAtkBonus && <span>道攻 +{set.taoAtkBonus}</span>}
                        {set.physDefBonus && <span>物防 +{set.physDefBonus}</span>}
                        {set.magDefBonus && <span>魔防 +{set.magDefBonus}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}`;

const target = `{engine.character.mount && (
                <>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">坐骑阶位 / 状态</span>
                    <span className="font-bold text-yellow-300">
                      {engine.character.mount.tier}阶 ({engine.character.mount.level}星) - {engine.character.mount.isMounted ? '骑乘中 🐴' : '未骑乘'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">坐骑移速特权加成</span>
                    <span className="font-bold text-emerald-300">
                      +{engine.stats.moveSpeedBonus ? Math.round(engine.stats.moveSpeedBonus * 100) : 0}%
                    </span>
                  </div>
                </>
              )}`;

content = content.replace(target, insertion);

fs.writeFileSync('src/components/Modals/CharacterModal.tsx', content);
console.log("Patched CharacterModal with Set Bonuses");
