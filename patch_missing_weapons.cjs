const fs = require('fs');

let content = fs.readFileSync('src/data/items.ts', 'utf8');

const missingWeapons = `,
  'weapon_heaven_breaker': {
    id: 'weapon_heaven_breaker',
    name: '破天穹',
    icon: '🗡️',
    type: 'weapon',
    rarity: 'mythic',
    slot: 'weapon',
    reqLevel: 60,
    setId: 'heaven_set',
    physAtkMin: 50,
    physAtkMax: 150,
    magAtkMin: 50,
    magAtkMax: 150,
    taoAtkMin: 50,
    taoAtkMax: 150,
    critChance: 0.1
  },
  'weapon_dragon_fury': {
    id: 'weapon_dragon_fury',
    name: '狂龙之怒',
    icon: '🗡️',
    type: 'weapon',
    rarity: 'mythic',
    slot: 'weapon',
    reqLevel: 70,
    setId: 'dragon_fury_set',
    physAtkMin: 100,
    physAtkMax: 300,
    magAtkMin: 100,
    magAtkMax: 300,
    taoAtkMin: 100,
    taoAtkMax: 300,
    critChance: 0.15
  },
  'weapon_abyss_demon': {
    id: 'weapon_abyss_demon',
    name: '深渊魔剑',
    icon: '🗡️',
    type: 'weapon',
    rarity: 'mythic',
    slot: 'weapon',
    reqLevel: 80,
    setId: 'abyss_set',
    physAtkMin: 200,
    physAtkMax: 600,
    magAtkMin: 200,
    magAtkMax: 600,
    taoAtkMin: 200,
    taoAtkMax: 600,
    critChance: 0.2
  },
  'weapon_ancient_dragon': {
    id: 'weapon_ancient_dragon',
    name: '远古魔龙刃',
    icon: '🗡️',
    type: 'weapon',
    rarity: 'mythic',
    slot: 'weapon',
    reqLevel: 90,
    setId: 'ancient_dragon_set',
    physAtkMin: 400,
    physAtkMax: 1200,
    magAtkMin: 400,
    magAtkMax: 1200,
    taoAtkMin: 400,
    taoAtkMax: 1200,
    critChance: 0.3
  }`;

const insertPos = content.lastIndexOf("};");
content = content.substring(0, insertPos) + missingWeapons + "\n" + content.substring(insertPos);

fs.writeFileSync('src/data/items.ts', content);
console.log("Patched missing weapons into items.ts");
