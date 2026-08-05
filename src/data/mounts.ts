export interface MountTierConfig {
  tier: number;
  name: string;
  subtitle: string;
  icon: string;
  description: string;
  maxLevel: number; // 10 stars per tier
  expPerLevel: number; // EXP required to level up one star
  pillExp: number; // EXP per Mount Advancement Pill
  speedBonus: number; // Movement speed multiplier bonus (e.g. 0.20 = +20%)
  physAtkBonus: number;
  magAtkBonus: number;
  taoAtkBonus: number;
  hpBonus: number;
  defBonus: number;
  critChanceBonus: number;
  themeColor: string;
  auraColor: string;
}

export const MOUNT_TIERS: Record<number, MountTierConfig> = {
  1: {
    tier: 1,
    name: '一阶 · 追风驹',
    subtitle: '疾风迅雷 踏雪无痕',
    icon: '🐴',
    description: '通体雪白的千里名驹，步履轻盈，能大幅提升武者的奔袭与移动速度。',
    maxLevel: 10,
    expPerLevel: 50,
    pillExp: 10,
    speedBonus: 0.20,
    physAtkBonus: 60,
    magAtkBonus: 60,
    taoAtkBonus: 60,
    hpBonus: 600,
    defBonus: 25,
    critChanceBonus: 0.02,
    themeColor: 'from-amber-600 to-yellow-600',
    auraColor: 'rgba(245, 158, 11, 0.6)'
  },
  2: {
    tier: 2,
    name: '二阶 · 踏雪疾风狼',
    subtitle: '北境孤狼 凶猛疾驰',
    icon: '🐺',
    description: '产于寒冰极地的高阶灵兽，双眼如炬，奔跑时带起凛冽寒风。',
    maxLevel: 10,
    expPerLevel: 100,
    pillExp: 10,
    speedBonus: 0.35,
    physAtkBonus: 140,
    magAtkBonus: 140,
    taoAtkBonus: 140,
    hpBonus: 1400,
    defBonus: 60,
    critChanceBonus: 0.04,
    themeColor: 'from-blue-600 to-cyan-500',
    auraColor: 'rgba(56, 189, 248, 0.7)'
  },
  3: {
    tier: 3,
    name: '三阶 · 避水金睛兽',
    subtitle: '上天入地 水陆双栖',
    icon: '🦏',
    description: '头生独角、目怒金光的洪荒异兽，辟水抗火，兼具极强的攻防能力。',
    maxLevel: 10,
    expPerLevel: 180,
    pillExp: 10,
    speedBonus: 0.50,
    physAtkBonus: 250,
    magAtkBonus: 250,
    taoAtkBonus: 250,
    hpBonus: 2500,
    defBonus: 100,
    critChanceBonus: 0.06,
    themeColor: 'from-cyan-600 to-teal-500',
    auraColor: 'rgba(20, 184, 166, 0.75)'
  },
  4: {
    tier: 4,
    name: '四阶 · 烈焰赤兔马',
    subtitle: '日行千里 烈火焚天',
    icon: '🐎',
    description: '传奇神将之专属座驾，通体燃烧着不灭赤焰，踏过的地面尽留余烬。',
    maxLevel: 10,
    expPerLevel: 280,
    pillExp: 10,
    speedBonus: 0.65,
    physAtkBonus: 400,
    magAtkBonus: 400,
    taoAtkBonus: 400,
    hpBonus: 4000,
    defBonus: 160,
    critChanceBonus: 0.08,
    themeColor: 'from-red-600 to-orange-500',
    auraColor: 'rgba(239, 68, 68, 0.8)'
  },
  5: {
    tier: 5,
    name: '五阶 · 寒冰天神麒麟',
    subtitle: '祥云缭绕 寒冰护体',
    icon: '🦄',
    description: '天界降世的祥瑞天兽，踏云而行，吐息结霜，能为骑乘者赋予高额防御与暴击。',
    maxLevel: 10,
    expPerLevel: 400,
    pillExp: 10,
    speedBonus: 0.80,
    physAtkBonus: 600,
    magAtkBonus: 600,
    taoAtkBonus: 600,
    hpBonus: 6500,
    defBonus: 240,
    critChanceBonus: 0.10,
    themeColor: 'from-emerald-500 to-teal-600',
    auraColor: 'rgba(16, 185, 129, 0.8)'
  },
  6: {
    tier: 6,
    name: '六阶 · 幽冥血脉白虎',
    subtitle: '百兽之王 虎啸龙吟',
    icon: '🐅',
    description: '吸收九幽煞气长成的神兽白虎，万兽臣服，散发令人窒息的血脉威压。',
    maxLevel: 10,
    expPerLevel: 550,
    pillExp: 10,
    speedBonus: 0.95,
    physAtkBonus: 850,
    magAtkBonus: 850,
    taoAtkBonus: 850,
    hpBonus: 9000,
    defBonus: 320,
    critChanceBonus: 0.12,
    themeColor: 'from-purple-600 to-indigo-600',
    auraColor: 'rgba(168, 85, 247, 0.85)'
  },
  7: {
    tier: 7,
    name: '七阶 · 紫金飞天苍龙',
    subtitle: '翱翔九天 龙跃苍穹',
    icon: '🐉',
    description: '龙族之尊，御风腾云，飞天绝尘，骑乘者可享如神明降世般的极致速攻体验。',
    maxLevel: 10,
    expPerLevel: 750,
    pillExp: 10,
    speedBonus: 1.10,
    physAtkBonus: 1200,
    magAtkBonus: 1200,
    taoAtkBonus: 1200,
    hpBonus: 13000,
    defBonus: 450,
    critChanceBonus: 0.15,
    themeColor: 'from-violet-600 via-purple-500 to-pink-500',
    auraColor: 'rgba(139, 92, 246, 0.9)'
  },
  8: {
    tier: 8,
    name: '八阶 · 九天彩凤圣兽',
    subtitle: '涅槃重生 凤鸣九霄',
    icon: '🦅',
    description: '蕴含无尽涅槃真火的上古圣凤，金羽华彩，可大幅强化全属性战术能力。',
    maxLevel: 10,
    expPerLevel: 1000,
    pillExp: 10,
    speedBonus: 1.25,
    physAtkBonus: 1650,
    magAtkBonus: 1650,
    taoAtkBonus: 1650,
    hpBonus: 18000,
    defBonus: 600,
    critChanceBonus: 0.18,
    themeColor: 'from-amber-400 via-rose-500 to-purple-600',
    auraColor: 'rgba(244, 63, 94, 0.95)'
  },
  9: {
    tier: 9,
    name: '九阶 · 太古不灭神龙',
    subtitle: '万龙归宗 威慑洪荒',
    icon: '🐲',
    description: '开天辟地之初诞生的至高神龙，浑身覆盖金灿雷霆，执掌天地自然之力。',
    maxLevel: 10,
    expPerLevel: 1300,
    pillExp: 10,
    speedBonus: 1.40, // +140% speed
    physAtkBonus: 2200,
    magAtkBonus: 2200,
    taoAtkBonus: 2200,
    hpBonus: 24000,
    defBonus: 800,
    critChanceBonus: 0.22,
    themeColor: 'from-yellow-400 via-amber-500 to-red-600',
    auraColor: 'rgba(234, 179, 8, 0.95)'
  },
  10: {
    tier: 10,
    name: '十阶 · 混沌鸿蒙圣兽',
    subtitle: '鸿蒙初开 主宰诸天',
    icon: '🌌',
    description: '超越凡尘天道法则的混沌鸿蒙至高神兽，展舒星海苍穹巨翼，踏九幽游九天，掌控无上鸿蒙紫气与混沌天雷！',
    maxLevel: 10,
    expPerLevel: 1800,
    pillExp: 10,
    speedBonus: 1.60, // +160% speed
    physAtkBonus: 3500,
    magAtkBonus: 3500,
    taoAtkBonus: 3500,
    hpBonus: 35000,
    defBonus: 1200,
    critChanceBonus: 0.25,
    themeColor: 'from-fuchsia-500 via-purple-600 to-amber-400',
    auraColor: 'rgba(217, 70, 239, 1)'
  }
};
