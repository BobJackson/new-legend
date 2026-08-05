const fs = require('fs');
const path = 'src/engine/GameEngine.ts';
let content = fs.readFileSync(path, 'utf8');

const regex = /  public calculateItemScore\(item: Item\): number \{[\s\S]*?    return score;\n  \}/m;

const replacement = `  public calculateItemScore(item: Item): number {
    if (!item) return 0;
    let score = 0;
    if (item.hpBonus) score += item.hpBonus * 0.5;
    if (item.mpBonus) score += item.mpBonus * 0.2;
    
    const pAtk = item.physAtkMax || 0;
    const mAtk = item.magAtkMax || 0;
    const tAtk = item.taoAtkMax || 0;
    score += Math.max(pAtk, mAtk, tAtk) * 15;
    
    const pDef = item.physDef || 0;
    const mDef = item.magDef || 0;
    score += (pDef + mDef) * 10;
    
    if (item.critChance) score += item.critChance * 1000;
    if ((item as any).luck) score += (item as any).luck * 50;
    if ((item as any).moveSpeedBonus) score += (item as any).moveSpeedBonus * 500;
    
    score += (item.refineLevel || 0) * 20;
    const rarityBonus: Record<string, number> = { common: 0, rare: 10, epic: 20, legendary: 50, mythic: 100 };
    score += rarityBonus[item.rarity || 'common'] || 0;
    return score;
  }`;

content = content.replace(regex, replacement);

fs.writeFileSync(path, content);
console.log("Patched calculateItemScore");
