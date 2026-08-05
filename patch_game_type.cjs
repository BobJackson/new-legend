const fs = require('fs');
const path = 'src/types/game.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "  drops: { itemId: string; chance: number; countMin?: number; countMax?: number   spawnTime?: number;\n  deathTime?: number;\n}[];",
  "  drops: { itemId: string; chance: number; countMin?: number; countMax?: number }[];\n  spawnTime?: number;\n  deathTime?: number;"
);

fs.writeFileSync(path, content);
