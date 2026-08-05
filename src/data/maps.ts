import { MapScene, MapObstacle } from '../types/game';

// Helper function to build structured obstacle grids
// Advanced organic obstacle generation simulating real-world terrain clusters
function generateObstaclesForMap(mapId: string, width: number, height: number): MapObstacle[] {
  const obsList: MapObstacle[] = [];
  let obsIdCounter = 1;
  const addObs = (x: number, y: number, type: MapObstacle['type'], w = 1, h = 1, label?: string) => {
    if (x <= 2 || y <= 2 || x >= width - 3 || y >= height - 3) return;
    obsList.push({ id: `obs_${mapId}_${obsIdCounter++}`, x, y, width: w, height: h, type, label });
  };

  const addCluster = (count: number, type: MapObstacle['type'], label?: string) => {
    let cx = Math.floor(Math.random() * (width - 10)) + 5;
    let cy = Math.floor(Math.random() * (height - 10)) + 5;
    for (let i = 0; i < count; i++) {
      addObs(cx, cy, type, 1, 1, label);
      cx += Math.floor(Math.random() * 5) - 2;
      cy += Math.floor(Math.random() * 5) - 2;
    }
  };

  const area = width * height;
  
  if (['bichi_city', 'snake_valley', 'dragon_valley'].includes(mapId)) {
    // Lush Forest & Valleys
    for (let i = 0; i < area / 1000; i++) addCluster(12, 'tree');
    for (let i = 0; i < area / 800; i++) addCluster(8, 'bush');
    for (let i = 0; i < area / 1200; i++) addCluster(15, 'grass');
    for (let i = 0; i < area / 2000; i++) addCluster(15, 'puddle');
    for (let i = 0; i < area / 2000; i++) addCluster(8, 'rock');
  } else if (['stone_tomb', 'zuma_temple', 'sabak_castle', 'devil_square'].includes(mapId)) {
    // Dungeons and Castles
    for (let i = 0; i < area / 600; i++) addCluster(15, 'wall');
    for (let i = 0; i < area / 2000; i++) addCluster(5, 'pillar');
    for (let i = 0; i < area / 2500; i++) addCluster(3, 'torch');
    for (let i = 0; i < area / 3000; i++) addCluster(4, 'ruins');
  } else if (['red_moon_altar', 'abyss_realm_1', 'abyss_realm_2', 'abyss_realm_3', 'abyss_domain'].includes(mapId)) {
    // Demonic Realms
    for (let i = 0; i < area / 600; i++) addCluster(10, 'rock');
    for (let i = 0; i < area / 800; i++) addCluster(6, 'crystal', '魔能水晶');
    for (let i = 0; i < area / 1200; i++) addCluster(12, 'puddle', '深渊血泊');
    for (let i = 0; i < area / 2500; i++) addCluster(3, 'torch', '幽冥火');
  }

  // Specific Landmarks
  if (mapId === 'bichi_city') {
    addObs(Math.floor(width / 2), Math.floor(height / 2), 'tree', 2, 2, '世界之树');
    addObs(Math.floor(width / 2) - 10, Math.floor(height / 2) - 10, 'statue', 1, 1, '战神雕像');
  } else if (mapId === 'sabak_castle') {
    addObs(Math.floor(width / 2), Math.floor(height / 2) - 15, 'statue', 2, 2, '霸主尊像');
  }
  
  return obsList;
}

export const MAP_DATABASE: Record<string, MapScene> = {
  'bichi_city': {
    id: 'bichi_city',
    name: '比奇皇城',
    reqLevel: 1,
    width: 400,
    height: 400,
    theme: 'green_field',
    bgGradient: ['#1e293b', '#0f172a'],
    gridColor: '#334155',
    isSafeZone: true,
    monsters: [
      { monsterTemplateId: 'chicken', count: 275 },
      { monsterTemplateId: 'deer', count: 275 },
      { monsterTemplateId: 'scarecrow', count: 330 }
    ],
    portals: [
      { x: 200, y: 200, targetMapId: 'snake_valley', targetX: 233, targetY: 233, label: '皇城中央传送阵 (通往全大陆)' },
      { x: 386, y: 200, targetMapId: 'snake_valley', targetX: 17, targetY: 233, label: '东关隘 -> 毒蛇山谷 (LV 1+)' },
      { x: 200, y: 386, targetMapId: 'sabak_castle', targetX: 250, targetY: 17, label: '南城门 -> 沙巴克皇宫 (LV 35+)' },
      { x: 33, y: 200, targetMapId: 'devil_square', targetX: 333, targetY: 333, label: '西关隘 -> 恶魔广场 (LV 60+)' },
      { x: 200, y: 33, targetMapId: 'abyss_realm_1', targetX: 333, targetY: 599, label: '北城门 -> 深渊之境 (LV 85+)' }
    ],
    obstacles: generateObstaclesForMap('bichi_city', 400, 400),
    guildTerritory: {
      name: '比奇皇城沙城驻地',
      bounds: { minX: 150, minY: 150, maxX: 250, maxY: 250 },
      flagPoles: [
        { x: 200, y: 160, label: '比奇沙城使馆主旗', isMainFlag: true },
        { x: 160, y: 160, label: '左辅行会战旗', isMainFlag: false },
        { x: 240, y: 160, label: '右弼行会战旗', isMainFlag: false }
      ]
    }
  },
  'snake_valley': {
    id: 'snake_valley',
    name: '毒蛇山谷',
    reqLevel: 1,
    width: 466,
    height: 466,
    theme: 'snake_valley',
    bgGradient: ['#14532d', '#064e3b'],
    gridColor: '#047857',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'scarecrow', count: 330 },
      { monsterTemplateId: 'hook_cat', count: 495 },
      { monsterTemplateId: 'snake', count: 660 }
    ],
    portals: [
      { x: 233, y: 233, targetMapId: 'bichi_city', targetX: 200, targetY: 200, label: '毒蛇山谷传送阵 (通往比奇/全大陆)' },
      { x: 17, y: 233, targetMapId: 'bichi_city', targetX: 366, targetY: 200, label: '返回 比奇皇城' },
      { x: 450, y: 233, targetMapId: 'stone_tomb', targetX: 17, targetY: 250, label: '前往 石墓阵七层 (LV 15+)' }
    ],
    obstacles: generateObstaclesForMap('snake_valley', 466, 466)
  },
  'stone_tomb': {
    id: 'stone_tomb',
    name: '石墓阵七层',
    reqLevel: 15,
    width: 500,
    height: 500,
    theme: 'stone_tomb',
    bgGradient: ['#451a03', '#27272a'],
    gridColor: '#78350f',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'skeleton_warrior', count: 660 },
      { monsterTemplateId: 'white_boar', count: 275 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'white_boar', respawnTimeSec: 30, x: 250, y: 250 }
    ],
    portals: [
      { x: 250, y: 250, targetMapId: 'bichi_city', targetX: 200, targetY: 200, label: '石墓传送阵 (通往比奇/全大陆)' },
      { x: 17, y: 250, targetMapId: 'snake_valley', targetX: 433, targetY: 233, label: '返回 毒蛇山谷' },
      { x: 483, y: 250, targetMapId: 'zuma_temple', targetX: 17, targetY: 266, label: '前往 祖玛大殿 (LV 30+)' }
    ],
    obstacles: generateObstaclesForMap('stone_tomb', 500, 500)
  },
  'zuma_temple': {
    id: 'zuma_temple',
    name: '祖玛大殿',
    reqLevel: 30,
    width: 533,
    height: 533,
    theme: 'zuma_temple',
    bgGradient: ['#581c87', '#1e1b4b'],
    gridColor: '#6b21a8',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'skeleton_warrior', count: 550 },
      { monsterTemplateId: 'white_boar', count: 330 },
      { monsterTemplateId: 'woma_leader', count: 165 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'zuma_leader', respawnTimeSec: 60, x: 266, y: 266 }
    ],
    portals: [
      { x: 266, y: 266, targetMapId: 'bichi_city', targetX: 200, targetY: 200, label: '祖玛神殿传送阵 (通往比奇/全大陆)' },
      { x: 17, y: 266, targetMapId: 'stone_tomb', targetX: 466, targetY: 250, label: '返回 石墓阵七层' },
      { x: 516, y: 266, targetMapId: 'red_moon_altar', targetX: 17, targetY: 300, label: '前往 赤月祭坛 (LV 40+)' }
    ],
    obstacles: generateObstaclesForMap('zuma_temple', 533, 533)
  },
  'red_moon_altar': {
    id: 'red_moon_altar',
    name: '赤月峡谷祭坛',
    reqLevel: 40,
    width: 599,
    height: 599,
    theme: 'red_moon',
    bgGradient: ['#7f1d1d', '#450a0a'],
    gridColor: '#991b1b',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'white_boar', count: 550 },
      { monsterTemplateId: 'woma_leader', count: 220 },
      { monsterTemplateId: 'zuma_leader', count: 110 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'red_moon_demon', respawnTimeSec: 90, x: 300, y: 300 }
    ],
    portals: [
      { x: 300, y: 300, targetMapId: 'bichi_city', targetX: 200, targetY: 200, label: '赤月祭坛传送阵 (通往比奇/全大陆)' },
      { x: 17, y: 300, targetMapId: 'zuma_temple', targetX: 500, targetY: 266, label: '返回 祖玛大殿' },
      { x: 300, y: 33, targetMapId: 'bichi_city', targetX: 200, targetY: 200, label: '回城卷轴 -> 比奇皇城' }
    ],
    obstacles: generateObstaclesForMap('red_moon_altar', 599, 599)
  },
  'sabak_castle': {
    id: 'sabak_castle',
    name: '沙巴克皇宫',
    reqLevel: 35,
    width: 500,
    height: 500,
    theme: 'sabak_castle',
    bgGradient: ['#713f12', '#365314'],
    gridColor: '#a16207',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'sabak_guard', count: 330 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'sabak_guard', respawnTimeSec: 45, x: 250, y: 250 }
    ],
    portals: [
      { x: 250, y: 200, targetMapId: 'bichi_city', targetX: 200, targetY: 200, label: '御前传送阵 (通往比奇/全大陆)' },
      { x: 250, y: 17, targetMapId: 'bichi_city', targetX: 200, targetY: 366, label: '返回 比奇皇城' }
    ],
    obstacles: generateObstaclesForMap('sabak_castle', 500, 500),
    guildTerritory: {
      name: '沙巴克皇宫霸主领地',
      bounds: { minX: 133, minY: 133, maxX: 366, maxY: 366 },
      flagPoles: [
        { x: 250, y: 140, label: '沙城霸主主战旗', isMainFlag: true },
        { x: 167, y: 140, label: '皇宫左翼大将旗', isMainFlag: false },
        { x: 333, y: 140, label: '皇宫右翼大将旗', isMainFlag: false },
        { x: 167, y: 360, label: '左城门哨所战旗', isMainFlag: false },
        { x: 333, y: 360, label: '右城门哨所战旗', isMainFlag: false }
      ]
    }
  },
  'devil_square': {
    id: 'devil_square',
    name: '恶魔广场',
    reqLevel: 60,
    width: 666,
    height: 666,
    theme: 'stone_tomb',
    bgGradient: ['#4a044e', '#171717'],
    gridColor: '#701a75',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'devil_warrior', count: 660 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'devil_lord', respawnTimeSec: 120, x: 333, y: 333 }
    ],
    portals: [
      { x: 333, y: 333, targetMapId: 'bichi_city', targetX: 200, targetY: 200, label: '传送阵 (通往比奇)' },
      { x: 633, y: 333, targetMapId: 'dragon_valley', targetX: 33, targetY: 333, label: '前往 龙之谷 (LV 70+)' }
    ],
    obstacles: generateObstaclesForMap('stone_tomb', 666, 666)
  },
  'dragon_valley': {
    id: 'dragon_valley',
    name: '龙之谷',
    reqLevel: 70,
    width: 666,
    height: 666,
    theme: 'green_field',
    bgGradient: ['#064e3b', '#022c22'],
    gridColor: '#047857',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'dragon_guard', count: 440 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'dragon_god', respawnTimeSec: 180, x: 333, y: 333 }
    ],
    portals: [
      { x: 33, y: 333, targetMapId: 'devil_square', targetX: 599, targetY: 333, label: '返回 恶魔广场' },
      { x: 633, y: 333, targetMapId: 'abyss_domain', targetX: 33, targetY: 333, label: '前往 深渊神域 (LV 80+)' }
    ],
    obstacles: generateObstaclesForMap('bichi_city', 666, 666)
  },
  'abyss_domain': {
    id: 'abyss_domain',
    name: '深渊神域',
    reqLevel: 80,
    width: 666,
    height: 666,
    theme: 'red_moon',
    bgGradient: ['#1e1b4b', '#000000'],
    gridColor: '#312e81',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'abyss_demon', count: 550 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'abyss_lord', respawnTimeSec: 300, x: 333, y: 333 }
    ],
    portals: [
      { x: 33, y: 333, targetMapId: 'dragon_valley', targetX: 599, targetY: 333, label: '返回 龙之谷' }
    ],
    obstacles: generateObstaclesForMap('red_moon_altar', 666, 666)
  }
,
  'abyss_realm_1': {
    id: 'abyss_realm_1',
    name: '深渊之境·外围',
    reqLevel: 85,
    width: 666,
    height: 666,
    theme: 'stone_tomb',
    bgGradient: ['#0f172a', '#000000'],
    gridColor: '#1e293b',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'abyss_watcher', count: 660 }
    ],
    portals: [
      { x: 333, y: 633, targetMapId: 'bichi_city', targetX: 200, targetY: 200, label: '离开深渊 (回城)' },
      { x: 333, y: 33, targetMapId: 'abyss_realm_2', targetX: 333, targetY: 599, label: '深入 深渊之内殿 (LV 90+)' }
    ],
    obstacles: generateObstaclesForMap('stone_tomb', 666, 666)
  },
  'abyss_realm_2': {
    id: 'abyss_realm_2',
    name: '深渊之境·内殿',
    reqLevel: 90,
    width: 666,
    height: 666,
    theme: 'zuma_temple',
    bgGradient: ['#312e81', '#000000'],
    gridColor: '#3730a3',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'abyss_watcher', count: 440 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'abyss_knight', respawnTimeSec: 200, x: 333, y: 333 }
    ],
    portals: [
      { x: 333, y: 633, targetMapId: 'abyss_realm_1', targetX: 333, targetY: 67, label: '返回 外围' },
      { x: 333, y: 33, targetMapId: 'abyss_realm_3', targetX: 416, targetY: 766, label: '前往 魔龙祭坛 (LV 100+)' }
    ],
    obstacles: generateObstaclesForMap('zuma_temple', 666, 666)
  },
  'abyss_realm_3': {
    id: 'abyss_realm_3',
    name: '深渊之境·魔龙祭坛',
    reqLevel: 95,
    width: 833,
    height: 833,
    theme: 'red_moon',
    bgGradient: ['#4c1d95', '#000000'],
    gridColor: '#5b21b6',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'abyss_watcher', count: 220 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'ancient_magic_dragon', respawnTimeSec: 600, x: 416, y: 416 }
    ],
    portals: [
      { x: 416, y: 799, targetMapId: 'abyss_realm_2', targetX: 333, targetY: 67, label: '返回 内殿' },
      { x: 416, y: 33, targetMapId: 'bichi_city', targetX: 200, targetY: 200, label: '凯旋回城' }
    ],
    obstacles: generateObstaclesForMap('red_moon_altar', 833, 833)
  }
};
