const fs = require('fs');
let mapsContent = fs.readFileSync('src/data/maps.ts', 'utf8');

const newMaps = `
  'abyss_realm_1': {
    id: 'abyss_realm_1',
    name: '深渊之境·外围',
    reqLevel: 85,
    width: 200,
    height: 200,
    theme: 'stone_tomb',
    bgGradient: ['#0f172a', '#000000'],
    gridColor: '#1e293b',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'abyss_watcher', count: 60 }
    ],
    portals: [
      { x: 100, y: 190, targetMapId: 'bichi_city', targetX: 60, targetY: 60, label: '离开深渊 (回城)' },
      { x: 100, y: 10, targetMapId: 'abyss_realm_2', targetX: 100, targetY: 180, label: '深入 深渊之内殿 (LV 90+)' }
    ],
    obstacles: generateObstaclesForMap('stone_tomb', 200, 200)
  },
  'abyss_realm_2': {
    id: 'abyss_realm_2',
    name: '深渊之境·内殿',
    reqLevel: 90,
    width: 200,
    height: 200,
    theme: 'zuma_temple',
    bgGradient: ['#312e81', '#000000'],
    gridColor: '#3730a3',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'abyss_watcher', count: 40 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'abyss_knight', respawnTimeSec: 200, x: 100, y: 100 }
    ],
    portals: [
      { x: 100, y: 190, targetMapId: 'abyss_realm_1', targetX: 100, targetY: 20, label: '返回 外围' },
      { x: 100, y: 10, targetMapId: 'abyss_realm_3', targetX: 125, targetY: 230, label: '前往 魔龙祭坛 (LV 100+)' }
    ],
    obstacles: generateObstaclesForMap('zuma_temple', 200, 200)
  },
  'abyss_realm_3': {
    id: 'abyss_realm_3',
    name: '深渊之境·魔龙祭坛',
    reqLevel: 95,
    width: 250,
    height: 250,
    theme: 'red_moon',
    bgGradient: ['#4c1d95', '#000000'],
    gridColor: '#5b21b6',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'abyss_watcher', count: 20 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'ancient_magic_dragon', respawnTimeSec: 600, x: 125, y: 125 }
    ],
    portals: [
      { x: 125, y: 240, targetMapId: 'abyss_realm_2', targetX: 100, targetY: 20, label: '返回 内殿' },
      { x: 125, y: 10, targetMapId: 'bichi_city', targetX: 60, targetY: 60, label: '凯旋回城' }
    ],
    obstacles: generateObstaclesForMap('red_moon_altar', 250, 250)
  }
};
`;

mapsContent = mapsContent.replace(/}\s*;\s*$/, "," + newMaps);

const bichiPortalsRegex = /\{ x: 10, y: 60, targetMapId: 'devil_square', targetX: 100, targetY: 100, label: '西关隘 -> 恶魔广场 \(LV 60\+\)' \}/;
const bichiPortalsReplacement = `{ x: 10, y: 60, targetMapId: 'devil_square', targetX: 100, targetY: 100, label: '西关隘 -> 恶魔广场 (LV 60+)' },
      { x: 60, y: 10, targetMapId: 'abyss_realm_1', targetX: 100, targetY: 180, label: '北城门 -> 深渊之境 (LV 85+)' }`;
mapsContent = mapsContent.replace(bichiPortalsRegex, bichiPortalsReplacement);
fs.writeFileSync('src/data/maps.ts', mapsContent);
console.log("Restored and appended to maps.ts");
