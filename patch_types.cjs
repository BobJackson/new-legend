const fs = require('fs');

let content = fs.readFileSync('src/types/game.ts', 'utf8');
content = content.replace("luckLevel?: number; // 0-9", "luckLevel?: number; // 0-9\n  setId?: string;");
fs.writeFileSync('src/types/game.ts', content);
console.log("Patched game.ts with setId for Item");
