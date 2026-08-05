const fs = require('fs');
let content = fs.readFileSync('src/engine/GameEngine.ts', 'utf8');

const oldUpdate = `  public update(now: number) {
    // Check Combo Decay`;

const newUpdate = `  public update(now: number) {
    // Failsafe: If character is somehow stuck in an obstacle or out of bounds (e.g. from a bad click teleport), nudge them out
    if (this.isTileBlocked(this.character.x, this.character.y)) {
      const map = MAP_DATABASE[this.currentMapId];
      if (map) {
         this.character.x = Math.max(2, Math.min(map.width - 3, this.character.x));
         this.character.y = Math.max(2, Math.min(map.height - 3, this.character.y));
         // If still blocked, just send to center
         if (this.isTileBlocked(this.character.x, this.character.y)) {
            this.character.x = Math.floor(map.width / 2);
            this.character.y = Math.floor(map.height / 2);
         }
      }
    }

    // Check Combo Decay`;

content = content.replace(oldUpdate, newUpdate);
fs.writeFileSync('src/engine/GameEngine.ts', content);
console.log("Failsafe added.");
