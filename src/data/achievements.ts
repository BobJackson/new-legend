import { Achievement } from '../types/game';

export const ACHIEVEMENT_DATABASE: Achievement[] = [
  // --- Level Progression ---
  {
    id: 'level_10',
    titleName: '初出茅庐',
    titleBadge: '🗡️',
    description: '成长蜕变！角色等级达到 LV 10',
    category: 'level',
    targetCount: 10,
    statBonus: { maxHp: 100, physAtk: 10, magAtk: 10, taoAtk: 10 },
    rewardGold: 2000,
    rewardIngot: 20
  },
  {
    id: 'level_25',
    titleName: '威震一方',
    titleBadge: '⚔️',
    description: '威名远播！角色等级达到 LV 25',
    category: 'level',
    targetCount: 25,
    statBonus: { maxHp: 350, physAtk: 25, magAtk: 25, taoAtk: 25, critChance: 0.03 },
    rewardGold: 8000,
    rewardIngot: 80
  },
  {
    id: 'level_40',
    titleName: '传奇尊者',
    titleBadge: '👑',
    description: '登峰造极！角色等级达到 LV 40',
    category: 'level',
    targetCount: 40,
    statBonus: { maxHp: 1000, physAtk: 70, magAtk: 70, taoAtk: 70, physDef: 25, critChance: 0.08 },
    rewardGold: 30000,
    rewardIngot: 300
  },

  // --- Kill Counts ---
  {
    id: 'kill_30',
    titleName: '斩妖除魔',
    titleBadge: '🪓',
    description: '小试身手！累计击杀 30 只怪物',
    category: 'kill',
    targetCount: 30,
    statBonus: { maxHp: 120, physAtk: 8, magAtk: 8, taoAtk: 8 },
    rewardGold: 1500,
    rewardIngot: 15
  },
  {
    id: 'kill_150',
    titleName: '百斩千雄',
    titleBadge: '🩸',
    description: '横扫荒野！累计击杀 150 只怪物',
    category: 'kill',
    targetCount: 150,
    statBonus: { maxHp: 400, physAtk: 30, magAtk: 30, taoAtk: 30, critChance: 0.04 },
    rewardGold: 10000,
    rewardIngot: 100
  },
  {
    id: 'kill_500',
    titleName: '万夫莫敌',
    titleBadge: '☠️',
    description: '所向披靡！累计击杀 500 只怪物',
    category: 'kill',
    targetCount: 500,
    statBonus: { maxHp: 1200, physAtk: 85, magAtk: 85, taoAtk: 85, physDef: 30, critChance: 0.09 },
    rewardGold: 40000,
    rewardIngot: 400
  },

  // --- Boss Slaying ---
  {
    id: 'boss_1',
    titleName: '首杀斩将',
    titleBadge: '👹',
    description: '王者初体验！成功击杀 1 只野外 Boss',
    category: 'boss',
    targetCount: 1,
    statBonus: { maxHp: 200, physAtk: 15, magAtk: 15, taoAtk: 15 },
    rewardGold: 3000,
    rewardIngot: 30
  },
  {
    id: 'boss_5',
    titleName: '弑君狂魔',
    titleBadge: '🐉',
    description: '狂暴猎手！成功击杀 5 只野外 Boss',
    category: 'boss',
    targetCount: 5,
    statBonus: { maxHp: 700, physAtk: 50, magAtk: 50, taoAtk: 50, physDef: 20, critChance: 0.05 },
    rewardGold: 18000,
    rewardIngot: 180
  },
  {
    id: 'boss_20',
    titleName: '深渊屠龙者',
    titleBadge: '🐲',
    description: '至尊屠龙！成功击杀 20 只野外 Boss',
    category: 'boss',
    targetCount: 20,
    statBonus: { maxHp: 1800, physAtk: 130, magAtk: 130, taoAtk: 130, physDef: 45, critChance: 0.12 },
    rewardGold: 60000,
    rewardIngot: 600
  },

  // --- Map Clears / Explorations ---
  {
    id: 'map_3',
    titleName: '奇境探险家',
    titleBadge: '🗺️',
    description: '踏遍山河！通关/切换传送探索地图 3 次',
    category: 'map',
    targetCount: 3,
    statBonus: { maxHp: 250, physDef: 15 },
    rewardGold: 2500,
    rewardIngot: 25
  },

  // --- Forge & Refine ---
  {
    id: 'forge_5',
    titleName: '祝融淬火',
    titleBadge: '🔨',
    description: '神兵淬炼！进行武器强化或涂抹祝福油 5 次',
    category: 'forge',
    targetCount: 5,
    statBonus: { maxHp: 200, physAtk: 20, magAtk: 20, taoAtk: 20 },
    rewardGold: 4000,
    rewardIngot: 40
  },
  {
    id: 'forge_20',
    titleName: '神兵造物主',
    titleBadge: '⚡',
    description: '炼金巨擘！进行武器强化或涂抹祝福油 20 次',
    category: 'forge',
    targetCount: 20,
    statBonus: { maxHp: 900, physAtk: 75, magAtk: 75, taoAtk: 75, critChance: 0.07 },
    rewardGold: 25000,
    rewardIngot: 250
  },

  // --- Gold Accumulation ---
  {
    id: 'gold_10k',
    titleName: '第一桶金',
    titleBadge: '💰',
    description: '小有资产！累计获得 10,000 金币',
    category: 'gold',
    targetCount: 10000,
    statBonus: { maxHp: 150, physAtk: 10, magAtk: 10, taoAtk: 10 },
    rewardGold: 2000,
    rewardIngot: 20
  },
  {
    id: 'gold_100k',
    titleName: '富甲一方',
    titleBadge: '💎',
    description: '金玉满堂！累计获得 100,000 金币',
    category: 'gold',
    targetCount: 100000,
    statBonus: { maxHp: 600, physAtk: 50, magAtk: 50, taoAtk: 50, critChance: 0.05 },
    rewardGold: 20000,
    rewardIngot: 200
  }
];
