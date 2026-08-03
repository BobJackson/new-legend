export type WeatherType = 'sunny' | 'rain' | 'snow' | 'sandstorm' | 'thunder';

export interface WeatherInfo {
  type: WeatherType;
  name: string;
  icon: string;
  description: string;
  brightness: number; // 0.6 - 1.1 multiplier for ambient lighting
  overlayColor: string; // canvas tint overlay
  buffText: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  statBonus: {
    physAtkMult?: number; // e.g. 1.10 = +10%
    magAtkMult?: number;
    taoAtkMult?: number;
    physDefMult?: number;
    magDefMult?: number;
    critChanceAdd?: number; // e.g. 0.10
    critDamageAdd?: number; // e.g. 0.25
    cdReductionMult?: number; // e.g. 0.90 (-10% CD)
  };
}

export const WEATHER_DATABASE: Record<WeatherType, WeatherInfo> = {
  sunny: {
    type: 'sunny',
    name: '晴空万里',
    icon: '☀️',
    description: '阳光明媚，天朗气清，勇士身手矫健，全军攻击力增加10%',
    brightness: 1.05,
    overlayColor: 'rgba(253, 224, 71, 0.05)',
    buffText: '全系攻击 +10% | 移动气力 +10%',
    badgeBg: 'bg-amber-950/80',
    badgeBorder: 'border-amber-500',
    textColor: 'text-amber-300',
    statBonus: {
      physAtkMult: 1.10,
      magAtkMult: 1.10,
      taoAtkMult: 1.10
    }
  },
  rain: {
    type: 'rain',
    name: '暴雨倾盆',
    icon: '🌧️',
    description: '疾风骤雨，元素充盈，法术吟唱加快，魔法攻击增加15%',
    brightness: 0.75,
    overlayColor: 'rgba(15, 23, 42, 0.35)',
    buffText: '魔法攻击 +15% | 技能冷却 -10% | 物防 -5%',
    badgeBg: 'bg-sky-950/80',
    badgeBorder: 'border-sky-500',
    textColor: 'text-sky-300',
    statBonus: {
      magAtkMult: 1.15,
      physDefMult: 0.95,
      cdReductionMult: 0.90
    }
  },
  snow: {
    type: 'snow',
    name: '大雪纷飞',
    icon: '❄️',
    description: '寒风凛冽，银装素裹，冰霜护体，物理与魔法防御增加20%',
    brightness: 0.85,
    overlayColor: 'rgba(186, 230, 253, 0.15)',
    buffText: '物理防御 +20% | 魔法防御 +20% | 闪避 +5%',
    badgeBg: 'bg-cyan-950/80',
    badgeBorder: 'border-cyan-400',
    textColor: 'text-cyan-200',
    statBonus: {
      physDefMult: 1.20,
      magDefMult: 1.20
    }
  },
  sandstorm: {
    type: 'sandstorm',
    name: '狂沙漫天',
    icon: '🌪️',
    description: '黄沙滚滚，视线蒙蔽，风沙混淆视听，暴击率与暴击伤害大增',
    brightness: 0.70,
    overlayColor: 'rgba(180, 83, 9, 0.25)',
    buffText: '暴击率 +10% | 暴击伤害 +25%',
    badgeBg: 'bg-yellow-950/80',
    badgeBorder: 'border-yellow-600',
    textColor: 'text-yellow-400',
    statBonus: {
      critChanceAdd: 0.10,
      critDamageAdd: 0.25
    }
  },
  thunder: {
    type: 'thunder',
    name: '雷暴交加',
    icon: '⚡',
    description: '狂雷如狱，天威难测，天雷感应，道术攻击与技能伤害大增20%',
    brightness: 0.65,
    overlayColor: 'rgba(88, 28, 135, 0.30)',
    buffText: '道术攻击 +20% | 技能伤害 +15%',
    badgeBg: 'bg-purple-950/80',
    badgeBorder: 'border-purple-500',
    textColor: 'text-purple-300',
    statBonus: {
      taoAtkMult: 1.20,
      magAtkMult: 1.10
    }
  }
};
