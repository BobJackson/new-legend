import { SetBonus } from '../types/game';

export const SET_BONUSES: Record<string, SetBonus> = {
  'heaven_set': {
    setId: 'heaven_set',
    setName: '破天套装',
    requiredPieces: 2,
    physAtkBonus: 100,
    magAtkBonus: 100,
    taoAtkBonus: 100,
    hpBonus: 5000,
    specialEffectId: 'aura_heaven'
  },
  'dragon_fury_set': {
    setId: 'dragon_fury_set',
    setName: '狂龙套装',
    requiredPieces: 2,
    physAtkBonus: 300,
    magAtkBonus: 300,
    taoAtkBonus: 300,
    hpBonus: 10000,
    specialEffectId: 'aura_dragon'
  },
  'abyss_set': {
    setId: 'abyss_set',
    setName: '深渊套装',
    requiredPieces: 2,
    physAtkBonus: 500,
    magAtkBonus: 500,
    taoAtkBonus: 500,
    hpBonus: 20000,
    specialEffectId: 'aura_abyss'
  },
  'ancient_dragon_set': {
    setId: 'ancient_dragon_set',
    setName: '远古魔龙套装',
    requiredPieces: 2,
    physAtkBonus: 1000,
    magAtkBonus: 1000,
    taoAtkBonus: 1000,
    hpBonus: 50000,
    specialEffectId: 'aura_ancient_dragon'
  }
};
