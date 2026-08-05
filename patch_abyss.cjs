const fs = require('fs');

// 1. ITEMS
let itemsContent = fs.readFileSync('src/data/items.ts', 'utf8');
const newWeapons = `
  'weapon_ancient_dragon': {
    id: 'weapon_ancient_dragon',
    name: '远古魔龙刃',
    icon: '🗡️',
    type: 'weapon',
    rarity: 'mythic',
    slot: 'weapon',
    reqLevel: 90,
    physAtkMin: 500,
    physAtkMax: 1200,
    magAtkMin: 450,
    magAtkMax: 1100,
    taoAtkMin: 450,
    taoAtkMax: 1100,
    description: '斩杀远古魔龙所铸就的神器，威力毁天灭地。',
    priceGold: 2000000,
    priceIngot: 20000,
    recycleGold: 500000,
    recycleIngot: 2000,
    recycleExp: 500000
  },
`;
itemsContent = itemsContent.replace("// === 防具 Armor ===", newWeapons + "\n  // === 防具 Armor ===");

const newArmors = `
  'armor_ancient_dragon': {
    id: 'armor_ancient_dragon',
    name: '远古魔龙铠',
    icon: '🛡️',
    type: 'armor',
    rarity: 'mythic',
    slot: 'armor',
    reqLevel: 90,
    physDef: 250,
    magDef: 200,
    hpBonus: 20000,
    description: '远古魔龙的坚不可摧之鳞甲。',
    priceGold: 1500000,
    priceIngot: 15000,
    recycleGold: 300000,
    recycleIngot: 1500,
    recycleExp: 300000
  },
`;
itemsContent = itemsContent.replace("// === 头盔 Helmets ===", newArmors + "\n  // === 头盔 Helmets ===");
fs.writeFileSync('src/data/items.ts', itemsContent);

// 2. MONSTERS
let monstersContent = fs.readFileSync('src/data/monsters.ts', 'utf8');
const newMonsters = `
  'abyss_watcher': {
    name: '深渊守望者',
    level: 85,
    maxHp: 5000000,
    physAtk: 15000,
    physDef: 2000,
    magDef: 1800,
    expReward: 3000000,
    goldReward: 400000,
    isBoss: false,
    color: '#1e3a8a', // blue-900
    speed: 1.6,
    attackRange: 2,
    atkCooldownMs: 1100,
    iconSymbol: '👁️‍🗨️',
    drops: [
      { itemId: 'blessing_oil', chance: 0.8 },
      { itemId: 'weapon_abyss_demon', chance: 0.05 },
      { itemId: 'armor_abyss', chance: 0.05 }
    ]
  },
  'abyss_knight': {
    name: '【Boss】深渊魔王骑士',
    level: 90,
    maxHp: 12000000,
    physAtk: 28000,
    physDef: 3500,
    magDef: 3000,
    expReward: 6000000,
    goldReward: 800000,
    isBoss: true,
    color: '#312e81', 
    speed: 1.8,
    attackRange: 1,
    atkCooldownMs: 900,
    iconSymbol: '🏇',
    drops: [
      { itemId: 'weapon_abyss_demon', chance: 0.2 },
      { itemId: 'armor_abyss', chance: 0.2 },
      { itemId: 'ring_paralysis', chance: 0.3 }
    ]
  },
  'ancient_magic_dragon': {
    name: '【世界Boss】远古魔龙',
    level: 100,
    maxHp: 30000000,
    physAtk: 50000,
    physDef: 6000,
    magDef: 5500,
    expReward: 15000000,
    goldReward: 2000000,
    isBoss: true,
    color: '#000000', 
    speed: 2.0,
    attackRange: 6,
    atkCooldownMs: 700,
    iconSymbol: '🐉',
    drops: [
      { itemId: 'weapon_ancient_dragon', chance: 0.5 },
      { itemId: 'armor_ancient_dragon', chance: 0.5 },
      { itemId: 'ring_resurrection', chance: 0.8 },
      { itemId: 'ring_bodyguard', chance: 0.8 },
      { itemId: 'ring_paralysis', chance: 0.8 }
    ]
  }
};`;
monstersContent = monstersContent.replace("};", newMonsters);
fs.writeFileSync('src/data/monsters.ts', monstersContent);

// 3. MAPS
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
};`;

mapsContent = mapsContent.replace("};", newMaps);

// Add portal to Bichi City
const bichiPortalsRegex = /\{ x: 10, y: 60, targetMapId: 'devil_square', targetX: 100, targetY: 100, label: '西关隘 -> 恶魔广场 \(LV 60\+\)' \}/;
const bichiPortalsReplacement = `{ x: 10, y: 60, targetMapId: 'devil_square', targetX: 100, targetY: 100, label: '西关隘 -> 恶魔广场 (LV 60+)' },
      { x: 60, y: 10, targetMapId: 'abyss_realm_1', targetX: 100, targetY: 180, label: '北城门 -> 深渊之境 (LV 85+)' }`;
mapsContent = mapsContent.replace(bichiPortalsRegex, bichiPortalsReplacement);
fs.writeFileSync('src/data/maps.ts', mapsContent);

// 4. QUESTS
let questsContent = fs.readFileSync('src/data/quests.ts', 'utf8');
const newQuests = `
  {
    id: 'quest_main_10',
    title: '深渊的呼唤',
    chapter: '深渊篇',
    type: 'main',
    description: '深渊之境的封印松动，前往深渊之境·外围击杀 10 只深渊守望者。',
    targetType: 'kill_monster',
    targetMonsterId: 'abyss_watcher',
    targetName: '深渊守望者',
    targetMapId: 'abyss_realm_1',
    requiredCount: 10,
    currentCount: 0,
    rewardExp: 5000000,
    rewardGold: 1000000,
    rewardIngot: 1000,
    isCompleted: false,
    isClaimed: false
  },
  {
    id: 'quest_main_11',
    title: '突破内殿',
    chapter: '深渊篇',
    type: 'main',
    description: '深入深渊之境内殿，消灭深渊魔王骑士！',
    targetType: 'kill_monster',
    targetMonsterId: 'abyss_knight',
    targetName: '深渊魔王骑士',
    targetMapId: 'abyss_realm_2',
    requiredCount: 1,
    currentCount: 0,
    rewardExp: 10000000,
    rewardGold: 5000000,
    rewardIngot: 3000,
    isCompleted: false,
    isClaimed: false
  },
  {
    id: 'quest_main_12',
    title: '远古魔龙',
    chapter: '深渊终章',
    type: 'main',
    description: '踏入魔龙祭坛，直面最强大的存在——远古魔龙，拯救整个世界！',
    targetType: 'kill_monster',
    targetMonsterId: 'ancient_magic_dragon',
    targetName: '远古魔龙',
    targetMapId: 'abyss_realm_3',
    requiredCount: 1,
    currentCount: 0,
    rewardExp: 50000000,
    rewardGold: 20000000,
    rewardIngot: 10000,
    rewardItemName: '远古魔龙刃',
    isCompleted: false,
    isClaimed: false
  }
];`;

questsContent = questsContent.replace(/\{\s*id:\s*'quest_main_9'[\s\S]*\}\s*\];/, "{\n    id: 'quest_main_9'" + questsContent.match(/\{\s*id:\s*'quest_main_9'[\s\S]*\}\s*\];/)[0].replace("];", ",") + newQuests);
fs.writeFileSync('src/data/quests.ts', questsContent);
console.log("Patched all abyss files");
