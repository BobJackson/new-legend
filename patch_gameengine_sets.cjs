const fs = require('fs');

let content = fs.readFileSync('src/engine/GameEngine.ts', 'utf8');

// Add import SET_BONUSES
if (!content.includes("SET_BONUSES")) {
  content = content.replace(
    "import { ITEMS } from '../data/items';",
    "import { ITEMS } from '../data/items';\nimport { SET_BONUSES } from '../data/sets';\nimport { SetBonus } from '../types/game';"
  );
}

// Add getActiveSets method
const getActiveSetsMethod = `
  public getActiveSets(): SetBonus[] {
    const setCounts: Record<string, number> = {};
    for (const key of Object.keys(this.character.equipment)) {
      const slot = key as import('../types/game').EquipmentSlot;
      const item = this.character.equipment[slot];
      if (item && item.setId) {
        setCounts[item.setId] = (setCounts[item.setId] || 0) + 1;
      }
    }
    
    const activeSets: SetBonus[] = [];
    for (const [setId, count] of Object.entries(setCounts)) {
      const bonuses = SET_BONUSES[setId];
      if (bonuses) {
        if (count >= bonuses.requiredPieces) {
          activeSets.push(bonuses);
        }
      }
    }
    return activeSets;
  }
`;

if (!content.includes("getActiveSets():")) {
  content = content.replace("public get stats() {", getActiveSetsMethod + "\n  public get stats() {");
}

// Modify stats calculation
const statsInsert = `
    // Add Set Bonuses
    const activeSets = this.getActiveSets();
    for (const setBonus of activeSets) {
      if (setBonus.physAtkBonus) { physMin += setBonus.physAtkBonus; physMax += setBonus.physAtkBonus; }
      if (setBonus.magAtkBonus) { magMin += setBonus.magAtkBonus; magMax += setBonus.magAtkBonus; }
      if (setBonus.taoAtkBonus) { taoMin += setBonus.taoAtkBonus; taoMax += setBonus.taoAtkBonus; }
      if (setBonus.physDefBonus) { physDef += setBonus.physDefBonus; }
      if (setBonus.magDefBonus) { magDef += setBonus.magDefBonus; }
      if (setBonus.hpBonus) { baseHp += setBonus.hpBonus; }
      if (setBonus.mpBonus) { baseMp += setBonus.mpBonus; }
      if (setBonus.critChanceBonus) { crit += setBonus.critChanceBonus; }
    }
`;

const regexStats = /(\/\/ Add Achievement & Title Stat Bonuses)/;
if (!content.includes("const activeSets = this.getActiveSets();")) {
  content = content.replace(regexStats, statsInsert + "\n    $1");
}

fs.writeFileSync('src/engine/GameEngine.ts', content);
console.log("Patched GameEngine.ts with sets");
