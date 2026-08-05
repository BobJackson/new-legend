const fs = require('fs');

let content = fs.readFileSync('src/engine/GameEngine.ts', 'utf8');

const replacement = `
    let baseHp = prof.baseHp + (lvl - 1) * prof.hpPerLevel;
    let baseMp = prof.baseMp + (lvl - 1) * prof.mpPerLevel;

    // Wing Stats Calculation
    const wingLvl = this.character.wingLevel || 0;
    const wingTier = Math.floor(wingLvl / 10);
    baseHp += wingLvl * 100 + wingTier * 1000;
    baseMp += wingLvl * 50 + wingTier * 500;

    let physMin = prof.basePhysAtk[0] + Math.floor((lvl - 1) * 1.5) + wingLvl * 2 + wingTier * 25;
    let physMax = prof.basePhysAtk[1] + Math.floor((lvl - 1) * 2.5) + wingLvl * 5 + wingTier * 60;
    let magMin = prof.baseMagAtk[0] + Math.floor((lvl - 1) * 1.5) + wingLvl * 2 + wingTier * 25;
    let magMax = prof.baseMagAtk[1] + Math.floor((lvl - 1) * 2.5) + wingLvl * 5 + wingTier * 60;
    let taoMin = prof.baseTaoAtk[0] + Math.floor((lvl - 1) * 1.5) + wingLvl * 2 + wingTier * 25;
    let taoMax = prof.baseTaoAtk[1] + Math.floor((lvl - 1) * 2.5) + wingLvl * 5 + wingTier * 60;
    let physDef = prof.baseDef + Math.floor((lvl - 1) * 1.0) + wingLvl * 1 + wingTier * 15;
    let magDef = prof.baseMagDef + Math.floor((lvl - 1) * 0.8) + wingLvl * 1 + wingTier * 15;
    let crit = 0.05 + wingTier * 0.01; // 1% extra crit per tier
    let luck = 0 + Math.floor(wingTier / 2); // 1 extra luck per 2 tiers
`;

const regex = /let baseHp = prof\.baseHp \+ \(lvl - 1\) \* prof\.hpPerLevel \+ \(this\.character\.wingLevel \* 100\);\s*let baseMp = prof\.baseMp \+ \(lvl - 1\) \* prof\.mpPerLevel \+ \(this\.character\.wingLevel \* 50\);\s*let physMin = prof\.basePhysAtk\[0\] \+ Math\.floor\(\(lvl - 1\) \* 1\.5\);\s*let physMax = prof\.basePhysAtk\[1\] \+ Math\.floor\(\(lvl - 1\) \* 2\.5\);\s*let magMin = prof\.baseMagAtk\[0\] \+ Math\.floor\(\(lvl - 1\) \* 1\.5\);\s*let magMax = prof\.baseMagAtk\[1\] \+ Math\.floor\(\(lvl - 1\) \* 2\.5\);\s*let taoMin = prof\.baseTaoAtk\[0\] \+ Math\.floor\(\(lvl - 1\) \* 1\.5\);\s*let taoMax = prof\.baseTaoAtk\[1\] \+ Math\.floor\(\(lvl - 1\) \* 2\.5\);\s*let physDef = prof\.baseDef \+ Math\.floor\(\(lvl - 1\) \* 1\.0\);\s*let magDef = prof\.baseMagDef \+ Math\.floor\(\(lvl - 1\) \* 0\.8\);\s*let crit = 0\.05;\s*let luck = 0;/;

content = content.replace(regex, replacement);

fs.writeFileSync('src/engine/GameEngine.ts', content);
console.log("Patched GameEngine.ts with wing tier stats");
