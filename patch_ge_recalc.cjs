const fs = require('fs');
let content = fs.readFileSync('src/engine/GameEngine.ts', 'utf8');

const getActiveSetsMethod = `
  public getActiveSets(): import('../types/game').SetBonus[] {
    const setCounts: Record<string, number> = {};
    for (const key of Object.keys(this.character.equipment)) {
      const slot = key as import('../types/game').EquipmentSlot;
      const item = this.character.equipment[slot];
      if (item && item.setId) {
        setCounts[item.setId] = (setCounts[item.setId] || 0) + 1;
      }
    }
    
    const activeSets: import('../types/game').SetBonus[] = [];
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

if (!content.includes("public getActiveSets")) {
  content = content.replace("public notify() {", getActiveSetsMethod + "\n  public notify() {");
  fs.writeFileSync('src/engine/GameEngine.ts', content);
  console.log("Added getActiveSets");
}
