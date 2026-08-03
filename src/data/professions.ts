import { ProfessionType } from '../types/game';

export interface ProfessionConfig {
  type: ProfessionType;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  primaryStat: string;
  baseHp: number;
  hpPerLevel: number;
  baseMp: number;
  mpPerLevel: number;
  basePhysAtk: [number, number];
  baseMagAtk: [number, number];
  baseTaoAtk: [number, number];
  baseDef: number;
  baseMagDef: number;
  themeColor: string;
  bgColor: string;
  avatarIcon: string;
}

export const PROFESSIONS: Record<ProfessionType, ProfessionConfig> = {
  warrior: {
    type: 'warrior',
    name: '战士',
    icon: '⚔️',
    tagline: '血量厚高防御 近战爆发刺杀',
    description: '强大的物理近战战神，拥有全职业最高的生命值与物理防御。技能包含烈火剑法与野蛮冲撞，是沙巴克攻城的前排核心！',
    primaryStat: '物理攻击 / 生命值',
    baseHp: 220,
    hpPerLevel: 45,
    baseMp: 40,
    mpPerLevel: 8,
    basePhysAtk: [12, 28],
    baseMagAtk: [0, 0],
    baseTaoAtk: [0, 0],
    baseDef: 10,
    baseMagDef: 5,
    themeColor: '#f97316', // Amber / Orange
    bgColor: 'from-amber-950/80 to-amber-900/40',
    avatarIcon: '🗡️'
  },
  mage: {
    type: 'mage',
    name: '法师',
    icon: '🔮',
    tagline: '群体暴击元素 魔法盾远程群攻',
    description: '掌握毁灭性元素魔法的掌控者，群体攻击之王。拥有雷电术、冰咆哮与火墙，配有魔法盾抵挡致命伤害，清怪打金效率第一！',
    primaryStat: '魔法攻击 / 范围杀伤',
    baseHp: 90,
    hpPerLevel: 18,
    baseMp: 180,
    mpPerLevel: 35,
    basePhysAtk: [2, 5],
    baseMagAtk: [15, 32],
    baseTaoAtk: [0, 0],
    baseDef: 4,
    baseMagDef: 12,
    themeColor: '#3b82f6', // Blue
    bgColor: 'from-blue-950/80 to-blue-900/40',
    avatarIcon: '🪄'
  },
  taoist: {
    type: 'taoist',
    name: '道士',
    icon: '☯️',
    tagline: '召唤神兽神圣治愈 红绿毒辅助无敌',
    description: '通晓天地阴阳的尊者，能召唤神兽圣兽协作战斗，同时拥有施毒术（降低防御与持续伤害）和治愈术，越级打Boss神器！',
    primaryStat: '道术攻击 / 召唤与毒术',
    baseHp: 150,
    hpPerLevel: 30,
    baseMp: 110,
    mpPerLevel: 20,
    basePhysAtk: [5, 12],
    baseMagAtk: [0, 0],
    baseTaoAtk: [14, 30],
    baseDef: 7,
    baseMagDef: 8,
    themeColor: '#10b981', // Emerald / Green
    bgColor: 'from-emerald-950/80 to-emerald-900/40',
    avatarIcon: '🪷'
  }
};
