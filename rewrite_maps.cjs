const fs = require('fs');
const path = 'src/data/maps.ts';

let content = `import { MapScene, MapObstacle } from '../types/game';

// Helper function to build structured obstacle grids
function generateObstaclesForMap(mapId: string, width: number, height: number): MapObstacle[] {
  const obsList: MapObstacle[] = [];
  let obsIdCounter = 1;

  const addObs = (x: number, y: number, type: MapObstacle['type'], w = 1, h = 1, label?: string) => {
    // Keep borders free for portals
    if (x <= 2 || y <= 2 || x >= width - 3 || y >= height - 3) return;
    obsList.push({
      id: \`obs_\${mapId}_\${obsIdCounter++}\`,
      x,
      y,
      width: w,
      height: h,
      type,
      label
    });
  };

  if (mapId === 'bichi_city') {
    // Central Safe Zone Fountain
    addObs(60, 60, 'tree', 2, 2, '比奇喷泉');
    
    // Guild Master Statues
    addObs(50, 50, 'statue', 1, 1, '战神雕像');
    addObs(70, 50, 'statue', 1, 1, '法神雕像');
    addObs(60, 75, 'statue', 1, 1, '天尊雕像');

    // Sparse trees
    for (let i = 0; i < 20; i++) {
      addObs(Math.floor(Math.random() * width), Math.floor(Math.random() * height), 'tree');
    }
  } 
  else if (mapId === 'snake_valley') {
    for (let i = 0; i < 35; i++) {
      addObs(Math.floor(Math.random() * width), Math.floor(Math.random() * height), 'rock');
      addObs(Math.floor(Math.random() * width), Math.floor(Math.random() * height), 'tree');
    }
  }
  else if (mapId === 'stone_tomb') {
    // Maze-like structure
    for (let x = 10; x < width - 10; x += 15) {
      for (let y = 10; y < height - 10; y += 15) {
        if (Math.random() > 0.4) {
          addObs(x, y, 'wall', 3, 1, '墓穴砖墙');
        }
        if (Math.random() > 0.4) {
          addObs(x, y, 'wall', 1, 3, '墓穴砖墙');
        }
      }
    }
    // Tomb Pillars
    addObs(40, 40, 'pillar');
    addObs(110, 110, 'pillar');
  }
  else if (mapId === 'zuma_temple') {
    // Grand Ceremony Stone Pillars in double grid alignment
    for (let x = 20; x <= width - 20; x += 14) {
      for (let y = 20; y <= height - 20; y += 14) {
        addObs(x, y, 'pillar', 1, 2, '祖玛神柱');
        if ((x + y) % 28 === 0) {
          addObs(x + 4, y + 2, 'statue', 1, 1, '祖玛雕像');
        }
      }
    }
    // Sanctuary Guard Walls
    for (let i = 60; i <= 100; i += 3) {
      if (Math.abs(i - 80) > 3) {
        addObs(i, 55, 'wall', 1, 1, '神殿长墙');
        addObs(i, 105, 'wall', 1, 1, '神殿长墙');
      }
    }
  }
  else if (mapId === 'red_moon_altar') {
    // Crimson Crystal Formations & Blood Altars
    for (let cx = 25; cx <= width - 25; cx += 25) {
      for (let cy = 25; cy <= height - 25; cy += 25) {
        if (Math.abs(cx - 90) > 15 || Math.abs(cy - 90) > 15) {
          addObs(cx, cy, 'crystal', 2, 2, '赤月血晶');
        }
      }
    }
    // Jagged Lava Crags around Boss Room
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const rx = Math.round(90 + Math.cos(angle) * 20);
      const ry = Math.round(90 + Math.sin(angle) * 20);
      if (angle !== 0 && angle !== Math.PI) { // Leave entry openings
        addObs(rx, ry, 'rock', 1, 1, '熔岩焦石');
      }
    }
  }
  else if (mapId === 'sabak_castle') {
    // Palace Inner Fortification Walls
    for (let x = 40; x <= 110; x++) {
      if (Math.abs(x - 75) > 3) { // Main Throne Gate
        addObs(x, 40, 'wall', 1, 1, '皇宫御墙');
      }
    }
    for (let y = 40; y <= 110; y++) {
      if (Math.abs(y - 75) > 3) {
        addObs(40, y, 'wall', 1, 1, '沙城左栅');
        addObs(110, y, 'wall', 1, 1, '沙城右栅');
      }
    }
    // Throne Room Gold Pillars
    addObs(68, 60, 'pillar', 1, 2, '沙巴克金柱');
    addObs(82, 60, 'pillar', 1, 2, '沙巴克金柱');
    addObs(68, 90, 'pillar', 1, 2, '沙巴克金柱');
    addObs(82, 90, 'pillar', 1, 2, '沙巴克金柱');
    addObs(74, 74, 'statue', 2, 2, '霸主尊像');
  }

  return obsList;
}

export const MAP_DATABASE: Record<string, MapScene> = {
  'bichi_city': {
    id: 'bichi_city',
    name: '比奇皇城',
    reqLevel: 1,
    width: 120,
    height: 120,
    theme: 'green_field',
    bgGradient: ['#1e293b', '#0f172a'],
    gridColor: '#334155',
    isSafeZone: true,
    monsters: [
      { monsterTemplateId: 'chicken', count: 25 },
      { monsterTemplateId: 'deer', count: 25 },
      { monsterTemplateId: 'scarecrow', count: 30 }
    ],
    portals: [
      { x: 60, y: 60, targetMapId: 'snake_valley', targetX: 70, targetY: 70, label: '皇城中央传送阵 (通往全大陆)' },
      { x: 116, y: 60, targetMapId: 'snake_valley', targetX: 5, targetY: 70, label: '东关隘 -> 毒蛇山谷 (LV 1+)' },
      { x: 60, y: 116, targetMapId: 'sabak_castle', targetX: 75, targetY: 5, label: '南城门 -> 沙巴克皇宫 (LV 35+)' },
      { x: 10, y: 60, targetMapId: 'devil_square', targetX: 100, targetY: 100, label: '西关隘 -> 恶魔广场 (LV 60+)' }
    ],
    obstacles: generateObstaclesForMap('bichi_city', 120, 120),
    guildTerritory: {
      name: '比奇皇城沙城驻地',
      bounds: { minX: 45, minY: 45, maxX: 75, maxY: 75 },
      flagPoles: [
        { x: 60, y: 48, label: '比奇沙城使馆主旗', isMainFlag: true },
        { x: 48, y: 48, label: '左辅行会战旗', isMainFlag: false },
        { x: 72, y: 48, label: '右弼行会战旗', isMainFlag: false }
      ]
    }
  },
  'snake_valley': {
    id: 'snake_valley',
    name: '毒蛇山谷',
    reqLevel: 1,
    width: 140,
    height: 140,
    theme: 'snake_valley',
    bgGradient: ['#14532d', '#064e3b'],
    gridColor: '#047857',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'scarecrow', count: 30 },
      { monsterTemplateId: 'hook_cat', count: 45 },
      { monsterTemplateId: 'snake', count: 60 }
    ],
    portals: [
      { x: 70, y: 70, targetMapId: 'bichi_city', targetX: 60, targetY: 60, label: '毒蛇山谷传送阵 (通往比奇/全大陆)' },
      { x: 5, y: 70, targetMapId: 'bichi_city', targetX: 110, targetY: 60, label: '返回 比奇皇城' },
      { x: 135, y: 70, targetMapId: 'stone_tomb', targetX: 5, targetY: 75, label: '前往 石墓阵七层 (LV 15+)' }
    ],
    obstacles: generateObstaclesForMap('snake_valley', 140, 140)
  },
  'stone_tomb': {
    id: 'stone_tomb',
    name: '石墓阵七层',
    reqLevel: 15,
    width: 150,
    height: 150,
    theme: 'stone_tomb',
    bgGradient: ['#451a03', '#27272a'],
    gridColor: '#78350f',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'skeleton_warrior', count: 60 },
      { monsterTemplateId: 'white_boar', count: 25 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'white_boar', respawnTimeSec: 30, x: 75, y: 75 }
    ],
    portals: [
      { x: 75, y: 75, targetMapId: 'bichi_city', targetX: 60, targetY: 60, label: '石墓传送阵 (通往比奇/全大陆)' },
      { x: 5, y: 75, targetMapId: 'snake_valley', targetX: 130, targetY: 70, label: '返回 毒蛇山谷' },
      { x: 145, y: 75, targetMapId: 'zuma_temple', targetX: 5, targetY: 80, label: '前往 祖玛大殿 (LV 30+)' }
    ],
    obstacles: generateObstaclesForMap('stone_tomb', 150, 150)
  },
  'zuma_temple': {
    id: 'zuma_temple',
    name: '祖玛大殿',
    reqLevel: 30,
    width: 160,
    height: 160,
    theme: 'zuma_temple',
    bgGradient: ['#581c87', '#1e1b4b'],
    gridColor: '#6b21a8',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'skeleton_warrior', count: 50 },
      { monsterTemplateId: 'white_boar', count: 30 },
      { monsterTemplateId: 'woma_leader', count: 15 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'zuma_leader', respawnTimeSec: 60, x: 80, y: 80 }
    ],
    portals: [
      { x: 80, y: 80, targetMapId: 'bichi_city', targetX: 60, targetY: 60, label: '祖玛神殿传送阵 (通往比奇/全大陆)' },
      { x: 5, y: 80, targetMapId: 'stone_tomb', targetX: 140, targetY: 75, label: '返回 石墓阵七层' },
      { x: 155, y: 80, targetMapId: 'red_moon_altar', targetX: 5, targetY: 90, label: '前往 赤月祭坛 (LV 40+)' }
    ],
    obstacles: generateObstaclesForMap('zuma_temple', 160, 160)
  },
  'red_moon_altar': {
    id: 'red_moon_altar',
    name: '赤月峡谷祭坛',
    reqLevel: 40,
    width: 180,
    height: 180,
    theme: 'red_moon',
    bgGradient: ['#7f1d1d', '#450a0a'],
    gridColor: '#991b1b',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'white_boar', count: 50 },
      { monsterTemplateId: 'woma_leader', count: 20 },
      { monsterTemplateId: 'zuma_leader', count: 10 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'red_moon_demon', respawnTimeSec: 90, x: 90, y: 90 }
    ],
    portals: [
      { x: 90, y: 90, targetMapId: 'bichi_city', targetX: 60, targetY: 60, label: '赤月祭坛传送阵 (通往比奇/全大陆)' },
      { x: 5, y: 90, targetMapId: 'zuma_temple', targetX: 150, targetY: 80, label: '返回 祖玛大殿' },
      { x: 90, y: 10, targetMapId: 'bichi_city', targetX: 60, targetY: 60, label: '回城卷轴 -> 比奇皇城' }
    ],
    obstacles: generateObstaclesForMap('red_moon_altar', 180, 180)
  },
  'sabak_castle': {
    id: 'sabak_castle',
    name: '沙巴克皇宫',
    reqLevel: 35,
    width: 150,
    height: 150,
    theme: 'sabak_castle',
    bgGradient: ['#713f12', '#365314'],
    gridColor: '#a16207',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'sabak_guard', count: 30 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'sabak_guard', respawnTimeSec: 45, x: 75, y: 75 }
    ],
    portals: [
      { x: 75, y: 60, targetMapId: 'bichi_city', targetX: 60, targetY: 60, label: '御前传送阵 (通往比奇/全大陆)' },
      { x: 75, y: 5, targetMapId: 'bichi_city', targetX: 60, targetY: 110, label: '返回 比奇皇城' }
    ],
    obstacles: generateObstaclesForMap('sabak_castle', 150, 150),
    guildTerritory: {
      name: '沙巴克皇宫霸主领地',
      bounds: { minX: 40, minY: 40, maxX: 110, maxY: 110 },
      flagPoles: [
        { x: 75, y: 42, label: '沙城霸主主战旗', isMainFlag: true },
        { x: 50, y: 42, label: '皇宫左翼大将旗', isMainFlag: false },
        { x: 100, y: 42, label: '皇宫右翼大将旗', isMainFlag: false },
        { x: 50, y: 108, label: '左城门哨所战旗', isMainFlag: false },
        { x: 100, y: 108, label: '右城门哨所战旗', isMainFlag: false }
      ]
    }
  },
  'devil_square': {
    id: 'devil_square',
    name: '恶魔广场',
    reqLevel: 60,
    width: 200,
    height: 200,
    theme: 'stone_tomb',
    bgGradient: ['#4a044e', '#171717'],
    gridColor: '#701a75',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'devil_warrior', count: 60 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'devil_lord', respawnTimeSec: 120, x: 100, y: 100 }
    ],
    portals: [
      { x: 100, y: 100, targetMapId: 'bichi_city', targetX: 60, targetY: 60, label: '传送阵 (通往比奇)' },
      { x: 190, y: 100, targetMapId: 'dragon_valley', targetX: 10, targetY: 100, label: '前往 龙之谷 (LV 70+)' }
    ],
    obstacles: generateObstaclesForMap('stone_tomb', 200, 200)
  },
  'dragon_valley': {
    id: 'dragon_valley',
    name: '龙之谷',
    reqLevel: 70,
    width: 200,
    height: 200,
    theme: 'green_field',
    bgGradient: ['#064e3b', '#022c22'],
    gridColor: '#047857',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'dragon_guard', count: 40 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'dragon_god', respawnTimeSec: 180, x: 100, y: 100 }
    ],
    portals: [
      { x: 10, y: 100, targetMapId: 'devil_square', targetX: 180, targetY: 100, label: '返回 恶魔广场' },
      { x: 190, y: 100, targetMapId: 'abyss_domain', targetX: 10, targetY: 100, label: '前往 深渊神域 (LV 80+)' }
    ],
    obstacles: generateObstaclesForMap('bichi_city', 200, 200)
  },
  'abyss_domain': {
    id: 'abyss_domain',
    name: '深渊神域',
    reqLevel: 80,
    width: 200,
    height: 200,
    theme: 'red_moon',
    bgGradient: ['#1e1b4b', '#000000'],
    gridColor: '#312e81',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'abyss_demon', count: 50 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'abyss_lord', respawnTimeSec: 300, x: 100, y: 100 }
    ],
    portals: [
      { x: 10, y: 100, targetMapId: 'dragon_valley', targetX: 180, targetY: 100, label: '返回 龙之谷' }
    ],
    obstacles: generateObstaclesForMap('red_moon_altar', 200, 200)
  }
};
`;

fs.writeFileSync(path, content);
console.log("Rewrote maps.ts");
