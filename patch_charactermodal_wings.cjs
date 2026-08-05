const fs = require('fs');

let content = fs.readFileSync('src/components/Modals/CharacterModal.tsx', 'utf8');

const replacement = `              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    const cost = 10000 + (engine.character.wingLevel || 0) * 2000;
                    if (engine.character.gold >= cost) {
                      engine.character.gold -= cost;
                      engine.character.wingLevel += 1;
                      engine.recalculateStats();
                      engine.addParticle(engine.character.x, engine.character.y, 'text_gold', '【光翼进阶成功!】');
                    } else {
                      engine.addParticle(engine.character.x, engine.character.y, 'text_red', '金币不足');
                    }
                  }}
                  className="flex-1 py-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:brightness-110 text-white font-bold rounded-xl border border-sky-400/40 text-[10px] shadow-md active:scale-95 transition-all flex flex-col items-center justify-center"
                >
                  <span>🪽 单次进阶</span>
                  <span className="text-sky-200">({(10000 + (engine.character.wingLevel || 0) * 2000).toLocaleString()}金)</span>
                </button>
                <button
                  onClick={() => {
                    let cost = 10000 + (engine.character.wingLevel || 0) * 2000;
                    let upgraded = false;
                    let initialLevel = engine.character.wingLevel || 0;
                    while (engine.character.gold >= cost) {
                      engine.character.gold -= cost;
                      engine.character.wingLevel += 1;
                      upgraded = true;
                      cost = 10000 + (engine.character.wingLevel || 0) * 2000;
                    }
                    if (upgraded) {
                      engine.recalculateStats();
                      const levelsGained = engine.character.wingLevel - initialLevel;
                      engine.addParticle(engine.character.x, engine.character.y, 'text_gold', \`【光翼连升\${levelsGained}级!】\`);
                    } else {
                      engine.addParticle(engine.character.x, engine.character.y, 'text_red', '金币不足');
                    }
                  }}
                  className="flex-1 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white font-bold rounded-xl border border-amber-400/40 text-[10px] shadow-md active:scale-95 transition-all flex flex-col items-center justify-center"
                >
                  <span>⚡ 一键进阶</span>
                  <span className="text-amber-200">(自动消耗)</span>
                </button>
              </div>
              
              <div className="mt-1 text-[10px] text-center text-amber-300 font-bold">
                当前: LV{engine.character.wingLevel || 0} - 第{Math.floor((engine.character.wingLevel || 0) / 10)}阶 (每10级形态与属性蜕变)
              </div>`;

const regex = /<button\s*onClick=\{[^}]*\}\s*className="w-full mt-2 py-1\.5 bg-gradient-to-r from-sky-600 to-amber-600 hover:brightness-110 text-white font-bold rounded-xl border border-sky-400\/40 text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1"\s*>\s*🪽 光翼进阶 \(LV\{engine\.character\.wingLevel\}\) · 10,000金币\s*<\/button>/m;

// wait, let's just use string replace for the whole button block. 
const oldBlock = `<button
                onClick={() => {
                  if (engine.character.gold >= 10000) {
                    engine.character.gold -= 10000;
                    engine.character.wingLevel += 1;
                    engine.recalculateStats();
                    engine.addParticle(engine.character.x, engine.character.y, 'text_gold', '【光翼进阶成功!】');
                  }
                }}
                className="w-full mt-2 py-1.5 bg-gradient-to-r from-sky-600 to-amber-600 hover:brightness-110 text-white font-bold rounded-xl border border-sky-400/40 text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1"
              >
                🪽 光翼进阶 (LV{engine.character.wingLevel}) · 10,000金币
              </button>`;
if (content.includes("🪽 光翼进阶")) {
  content = content.replace(oldBlock, replacement);
  fs.writeFileSync('src/components/Modals/CharacterModal.tsx', content);
  console.log("Patched CharacterModal.tsx with auto-upgrade buttons");
} else {
  console.log("Could not find the wing upgrade button block");
}

