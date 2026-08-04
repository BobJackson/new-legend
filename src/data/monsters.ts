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
      { itemId: 'armor_cloth_shirt', chance: 0.3 }
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
      { itemId: 'helmet_bronze', chance: 0.25 },
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
};
