import { Monster } from '../types/game';

export interface MonsterTemplate extends Omit<Monster, 'id' | 'x' | 'y' | 'targetX' | 'targetY' | 'hp' | 'lastAtkTime'> {}

export const MONSTER_TEMPLATES: Record<string, MonsterTemplate> = {
  'chicken': {
    name: '小野鸡',
    level: 1,
    maxHp: 30,
    physAtk: 4,
    physDef: 1,
    magDef: 1,
    expReward: 15,
    goldReward: 20,
    isBoss: false,
    color: '#fef08a', // Yellow
    speed: 1.2,
    attackRange: 1,
    atkCooldownMs: 1500,
    iconSymbol: '🐔',
    drops: [
      { itemId: 'weapon_wooden_sword', chance: 0.3 },
      { itemId: 'armor_cloth_shirt', chance: 0.3 },
      { itemId: 'boots_leather', chance: 0.15 }
    ]
  },
  'scarecrow': {
    name: '稻草人',
    level: 2,
    maxHp: 45,
    physAtk: 6,
    physDef: 2,
    magDef: 1,
    expReward: 25,
    goldReward: 35,
    isBoss: false,
    color: '#ca8a04', // Straw Yellow
    speed: 1.1,
    attackRange: 1,
    atkCooldownMs: 1400,
    iconSymbol: '🌾',
    drops: [
      { itemId: 'weapon_wooden_sword', chance: 0.35 },
      { itemId: 'armor_cloth_shirt', chance: 0.35 },
      { itemId: 'belt_cloth', chance: 0.2 },
      { itemId: 'boots_leather', chance: 0.2 },
      { itemId: 'potion_sun_water', chance: 0.15 }
    ]
  },
  'deer': {
    name: '野生温顺鹿',
    level: 3,
    maxHp: 60,
    physAtk: 8,
    physDef: 3,
    magDef: 2,
    expReward: 35,
    goldReward: 50,
    isBoss: false,
    color: '#fed7aa', // Light Amber
    speed: 1.0,
    attackRange: 1,
    atkCooldownMs: 1500,
    iconSymbol: '🦌',
    drops: [
      { itemId: 'weapon_ebony_sword', chance: 0.25 },
      { itemId: 'bracelet_silver', chance: 0.2 },
      { itemId: 'helmet_bronze', chance: 0.25 },
      { itemId: 'necklace_bone', chance: 0.25 },
      { itemId: 'potion_sun_water', chance: 0.1 }
    ]
  },
  'snake': {
    name: '毒蛇',
    level: 6,
    maxHp: 120,
    physAtk: 14,
    physDef: 4,
    magDef: 3,
    expReward: 70,
    goldReward: 100,
    isBoss: false,
    color: '#16a34a', // Green
    speed: 1.6,
    attackRange: 1,
    atkCooldownMs: 1200,
    iconSymbol: '🐍',
    drops: [
      { itemId: 'weapon_ebony_sword', chance: 0.25 },
      { itemId: 'potion_sun_water', chance: 0.25 },
      { itemId: 'black_iron_ore', chance: 0.1 }
    ]
  },
  'hook_cat': {
    name: '毒蛇猫',
    level: 8,
    maxHp: 160,
    physAtk: 18,
    physDef: 6,
    magDef: 4,
    expReward: 100,
    goldReward: 150,
    isBoss: false,
    color: '#86efac', // Light Green
    speed: 1.8,
    attackRange: 1,
    atkCooldownMs: 1200,
    iconSymbol: '🐱',
    drops: [
      { itemId: 'weapon_chopper', chance: 0.2 },
      { itemId: 'potion_sun_water', chance: 0.3 },
      { itemId: 'black_iron_ore', chance: 0.15 }
    ]
  },
  'skeleton_warrior': {
    name: '骷髅死士',
    level: 15,
    maxHp: 380,
    physAtk: 35,
    physDef: 12,
    magDef: 8,
    expReward: 300,
    goldReward: 400,
    isBoss: false,
    color: '#e2e8f0', // Slate Gray
    speed: 1.3,
    attackRange: 1,
    atkCooldownMs: 1200,
    iconSymbol: '💀',
    drops: [
      { itemId: 'weapon_purgatory', chance: 0.1 },
      { itemId: 'belt_leather', chance: 0.15 },
      { itemId: 'boots_iron', chance: 0.15 },
      { itemId: 'blessing_oil', chance: 0.1 },
      { itemId: 'black_iron_ore', chance: 0.25 }
    ]
  },
  'white_boar': {
    name: '【精英】白野猪',
    level: 28,
    maxHp: 1800,
    physAtk: 85,
    physDef: 25,
    magDef: 20,
    expReward: 1500,
    goldReward: 2000,
    isBoss: true,
    color: '#f472b6', // Pink / White Boar
    speed: 1.5,
    attackRange: 1,
    atkCooldownMs: 1000,
    iconSymbol: '🐗',
    drops: [
      { itemId: 'weapon_judgment', chance: 0.15 },
      { itemId: 'weapon_bone_jade', chance: 0.15 },
      { itemId: 'weapon_xiaoyao_fan', chance: 0.15 },
      { itemId: 'armor_heavy_armor', chance: 0.3 },
      { itemId: 'necklace_ruby', chance: 0.2 },
      { itemId: 'bracelet_gold', chance: 0.2 },
      { itemId: 'blessing_oil', chance: 0.5 },
      { itemId: 'potion_sun_water', chance: 0.8 }
    ]
  },
  'woma_leader': {
    name: '【Boss】沃玛教主',
    level: 38,
    maxHp: 6000,
    physAtk: 160,
    physDef: 45,
    magDef: 40,
    expReward: 8000,
    goldReward: 10000,
    isBoss: true,
    color: '#a855f7', // Purple Boss
    speed: 1.6,
    attackRange: 2,
    atkCooldownMs: 1000,
    iconSymbol: '👹',
    drops: [
      { itemId: 'weapon_judgment', chance: 0.35 },
      { itemId: 'helmet_black_iron', chance: 0.4 },
      { itemId: 'belt_leather', chance: 0.35 },
      { itemId: 'boots_iron', chance: 0.35 },
      { itemId: 'ring_paralysis', chance: 0.1 },
      { itemId: 'ring_bodyguard', chance: 0.1 },
      { itemId: 'blessing_oil', chance: 0.8 }
    ]
  },
  'zuma_leader': {
    name: '【Boss】祖玛教主',
    level: 45,
    maxHp: 15000,
    physAtk: 280,
    physDef: 75,
    magDef: 65,
    expReward: 20000,
    goldReward: 30000,
    isBoss: true,
    color: '#ef4444', // Red Boss
    speed: 1.8,
    attackRange: 2,
    atkCooldownMs: 800,
    iconSymbol: '🗿',
    drops: [
      { itemId: 'weapon_dragon_slayer', chance: 0.15 },
      { itemId: 'weapon_soul_eater', chance: 0.15 },
      { itemId: 'necklace_ruby', chance: 0.25 },
      { itemId: 'bracelet_gold', chance: 0.25 },
      { itemId: 'ring_paralysis', chance: 0.2 },
      { itemId: 'ring_resurrection', chance: 0.2 },
      { itemId: 'armor_sabak_god', chance: 0.25 },
      { itemId: 'blessing_oil', chance: 1.0 }
    ]
  },
  'red_moon_demon': {
    name: '【世界Boss】赤月恶魔',
    level: 55,
    maxHp: 50000,
    physAtk: 450,
    physDef: 120,
    magDef: 110,
    expReward: 80000,
    goldReward: 100000,
    isBoss: true,
    color: '#dc2626', // Deep Red World Boss
    speed: 0.5,
    attackRange: 8,
    atkCooldownMs: 800,
    iconSymbol: '👾',
    drops: [
      { itemId: 'weapon_dragon_slayer', chance: 0.4 },
      { itemId: 'weapon_soul_eater', chance: 0.4 },
      { itemId: 'ring_paralysis', chance: 0.35 },
      { itemId: 'ring_bodyguard', chance: 0.35 },
      { itemId: 'ring_resurrection', chance: 0.35 },
      { itemId: 'armor_sabak_god', chance: 0.5 }
    ]
  },
  'sabak_guard': {
    name: '【沙城守卫】帝国禁卫军',
    level: 50,
    maxHp: 25000,
    physAtk: 320,
    physDef: 90,
    magDef: 80,
    expReward: 30000,
    goldReward: 50000,
    isBoss: true,
    color: '#eab308', // Gold Guard
    speed: 1.4,
    attackRange: 1,
    atkCooldownMs: 900,
    iconSymbol: '💂‍♂️',
    drops: [
      { itemId: 'armor_sabak_god', chance: 0.3 },
      { itemId: 'blessing_oil', chance: 0.9 },
      { itemId: 'black_iron_ore', chance: 1.0 }
    ]
  }

,  'devil_warrior': {
    name: '恶魔战士',
    level: 60,
    maxHp: 100000,
    physAtk: 800,
    physDef: 200,
    magDef: 180,
    expReward: 150000,
    goldReward: 20000,
    isBoss: false,
    color: '#9f1239', // Rose 800
    speed: 1.5,
    attackRange: 1,
    atkCooldownMs: 1200,
    iconSymbol: '👹',
    drops: [
      { itemId: 'weapon_heaven_breaker', chance: 0.1 },
      { itemId: 'armor_heaven', chance: 0.1 },
      { itemId: 'blessing_oil', chance: 0.5 },
      { itemId: 'black_iron_ore', chance: 0.5 }
    ]
  },
  'devil_lord': {
    name: '【Boss】恶魔领主',
    level: 65,
    maxHp: 250000,
    physAtk: 1500,
    physDef: 300,
    magDef: 280,
    expReward: 300000,
    goldReward: 50000,
    isBoss: true,
    color: '#831843', // Pink 900
    speed: 1.6,
    attackRange: 2,
    atkCooldownMs: 1000,
    iconSymbol: '👿',
    drops: [
      { itemId: 'weapon_heaven_breaker', chance: 0.3 },
      { itemId: 'armor_heaven', chance: 0.3 },
      { itemId: 'blessing_oil', chance: 0.8 },
      { itemId: 'ring_paralysis', chance: 0.2 }
    ]
  },
  'dragon_guard': {
    name: '龙族守卫',
    level: 70,
    maxHp: 500000,
    physAtk: 3000,
    physDef: 500,
    magDef: 450,
    expReward: 500000,
    goldReward: 80000,
    isBoss: false,
    color: '#166534', // Green 800
    speed: 1.6,
    attackRange: 1,
    atkCooldownMs: 1100,
    iconSymbol: '🦎',
    drops: [
      { itemId: 'weapon_dragon_fury', chance: 0.1 },
      { itemId: 'armor_dragon', chance: 0.1 },
      { itemId: 'blessing_oil', chance: 0.6 }
    ]
  },
  'dragon_god': {
    name: '【世界Boss】极光龙神',
    level: 75,
    maxHp: 1500000,
    physAtk: 6000,
    physDef: 800,
    magDef: 750,
    expReward: 1000000,
    goldReward: 200000,
    isBoss: true,
    color: '#14532d', // Green 900
    speed: 1.8,
    attackRange: 4,
    atkCooldownMs: 900,
    iconSymbol: '🐉',
    drops: [
      { itemId: 'weapon_dragon_fury', chance: 0.4 },
      { itemId: 'armor_dragon', chance: 0.4 },
      { itemId: 'ring_resurrection', chance: 0.3 },
      { itemId: 'ring_bodyguard', chance: 0.3 }
    ]
  },
  'abyss_demon': {
    name: '深渊恶魔',
    level: 80,
    maxHp: 3000000,
    physAtk: 12000,
    physDef: 1500,
    magDef: 1400,
    expReward: 2000000,
    goldReward: 300000,
    isBoss: false,
    color: '#4c1d95', // Violet 900
    speed: 1.7,
    attackRange: 1,
    atkCooldownMs: 1000,
    iconSymbol: '👾',
    drops: [
      { itemId: 'weapon_abyss_demon', chance: 0.05 },
      { itemId: 'armor_abyss', chance: 0.05 },
      { itemId: 'blessing_oil', chance: 0.8 }
    ]
  },
  'abyss_lord': {
    name: '【终极神明】深渊魔神',
    level: 90,
    maxHp: 10000000,
    physAtk: 25000,
    physDef: 3000,
    magDef: 2800,
    expReward: 5000000,
    goldReward: 1000000,
    isBoss: true,
    color: '#312e81', // Indigo 900
    speed: 2.0,
    attackRange: 5,
    atkCooldownMs: 800,
    iconSymbol: '👁️',
    drops: [
      { itemId: 'weapon_abyss_demon', chance: 0.3 },
      { itemId: 'armor_abyss', chance: 0.3 },
      { itemId: 'ring_paralysis', chance: 0.5 },
      { itemId: 'ring_resurrection', chance: 0.5 },
      { itemId: 'ring_bodyguard', chance: 0.5 }
    ]
  }

, 'abyss_watcher': {
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
};
