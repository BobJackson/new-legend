import { MapScene } from '../types/game';

export const MAP_DATABASE: Record<string, MapScene> = {
  'bichi_city': {
    id: 'bichi_city',
    name: '比奇皇城',
    reqLevel: 1,
    width: 20,
    height: 20,
    theme: 'green_field',
    bgGradient: ['#1e293b', '#0f172a'],
    gridColor: '#334155',
    isSafeZone: true,
    monsters: [
      { monsterTemplateId: 'chicken', count: 4 },
      { monsterTemplateId: 'deer', count: 4 }
    ],
    portals: [
      { x: 18, y: 10, targetMapId: 'snake_valley', targetX: 2, targetY: 10, label: '前往 毒蛇山谷 (LV 1+)' },
      { x: 10, y: 18, targetMapId: 'sabak_castle', targetX: 10, targetY: 2, label: '前往 沙巴克皇宫 (LV 35+)' }
    ]
  },

  'snake_valley': {
    id: 'snake_valley',
    name: '毒蛇山谷',
    reqLevel: 1,
    width: 24,
    height: 24,
    theme: 'snake_valley',
    bgGradient: ['#14532d', '#064e3b'],
    gridColor: '#047857',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'chicken', count: 5 },
      { monsterTemplateId: 'deer', count: 6 },
      { monsterTemplateId: 'hook_cat', count: 8 }
    ],
    portals: [
      { x: 1, y: 10, targetMapId: 'bichi_city', targetX: 17, targetY: 10, label: '返回 比奇皇城' },
      { x: 22, y: 12, targetMapId: 'stone_tomb', targetX: 2, targetY: 12, label: '前往 石墓阵七层 (LV 15+)' }
    ]
  },

  'stone_tomb': {
    id: 'stone_tomb',
    name: '石墓阵七层',
    reqLevel: 15,
    width: 26,
    height: 26,
    theme: 'stone_tomb',
    bgGradient: ['#451a03', '#27272a'],
    gridColor: '#78350f',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'skeleton_warrior', count: 12 },
      { monsterTemplateId: 'white_boar', count: 3 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'white_boar', respawnTimeSec: 30, x: 13, y: 13 }
    ],
    portals: [
      { x: 1, y: 12, targetMapId: 'snake_valley', targetX: 21, targetY: 12, label: '返回 毒蛇山谷' },
      { x: 24, y: 13, targetMapId: 'zuma_temple', targetX: 2, targetY: 13, label: '前往 祖玛大殿 (LV 30+)' }
    ]
  },

  'zuma_temple': {
    id: 'zuma_temple',
    name: '祖玛大殿',
    reqLevel: 30,
    width: 28,
    height: 28,
    theme: 'zuma_temple',
    bgGradient: ['#581c87', '#1e1b4b'],
    gridColor: '#6b21a8',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'skeleton_warrior', count: 8 },
      { monsterTemplateId: 'white_boar', count: 5 },
      { monsterTemplateId: 'woma_leader', count: 1 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'zuma_leader', respawnTimeSec: 60, x: 14, y: 14 }
    ],
    portals: [
      { x: 1, y: 13, targetMapId: 'stone_tomb', targetX: 23, targetY: 13, label: '返回 石墓阵七层' },
      { x: 26, y: 14, targetMapId: 'red_moon_altar', targetX: 2, targetY: 14, label: '前往 赤月祭坛 (LV 40+)' }
    ]
  },

  'red_moon_altar': {
    id: 'red_moon_altar',
    name: '赤月峡谷祭坛',
    reqLevel: 40,
    width: 30,
    height: 30,
    theme: 'red_moon',
    bgGradient: ['#7f1d1d', '#450a0a'],
    gridColor: '#991b1b',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'white_boar', count: 8 },
      { monsterTemplateId: 'woma_leader', count: 2 },
      { monsterTemplateId: 'zuma_leader', count: 1 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'red_moon_demon', respawnTimeSec: 90, x: 15, y: 15 }
    ],
    portals: [
      { x: 1, y: 14, targetMapId: 'zuma_temple', targetX: 25, targetY: 14, label: '返回 祖玛大殿' },
      { x: 15, y: 2, targetMapId: 'bichi_city', targetX: 10, targetY: 10, label: '回城卷轴 -> 比奇皇城' }
    ]
  },

  'sabak_castle': {
    id: 'sabak_castle',
    name: '沙巴克皇宫',
    reqLevel: 35,
    width: 25,
    height: 25,
    theme: 'sabak_castle',
    bgGradient: ['#713f12', '#365314'],
    gridColor: '#a16207',
    isSafeZone: false,
    monsters: [
      { monsterTemplateId: 'sabak_guard', count: 4 }
    ],
    bossSpawns: [
      { monsterTemplateId: 'sabak_guard', respawnTimeSec: 45, x: 12, y: 12 }
    ],
    portals: [
      { x: 10, y: 1, targetMapId: 'bichi_city', targetX: 10, targetY: 17, label: '返回 比奇皇城' }
    ]
  }
};
