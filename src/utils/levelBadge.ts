export interface LevelBadgeInfo {
  tier: number;
  name: string;
  shortTitle: string;
  icon: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  glowClass: string;
  canvasBorderColor: string;
  canvasGlowColor: string;
  canvasBgColor: string;
}

/**
 * Returns Level Badge metadata based on character level (10 levels per tier).
 */
export function getLevelBadge(level: number): LevelBadgeInfo {
  if (level >= 70) {
    return {
      tier: 8,
      name: '神圣至尊勋章',
      shortTitle: '神圣至尊',
      icon: '🌌',
      bgGradient: 'from-purple-900 via-pink-700 to-amber-500',
      borderColor: 'border-pink-300',
      textColor: 'text-pink-200',
      glowClass: 'shadow-[0_0_12px_rgba(236,72,153,0.8)]',
      canvasBorderColor: '#f472b6',
      canvasGlowColor: '#ec4899',
      canvasBgColor: '#581c87'
    };
  } else if (level >= 60) {
    return {
      tier: 7,
      name: '王者主宰勋章',
      shortTitle: '王者主宰',
      icon: '🔱',
      bgGradient: 'from-amber-700 via-yellow-500 to-amber-600',
      borderColor: 'border-yellow-300',
      textColor: 'text-yellow-100',
      glowClass: 'shadow-[0_0_10px_rgba(245,158,11,0.8)]',
      canvasBorderColor: '#fde047',
      canvasGlowColor: '#f59e0b',
      canvasBgColor: '#78350f'
    };
  } else if (level >= 50) {
    return {
      tier: 6,
      name: '钻石霸者勋章',
      shortTitle: '钻石霸者',
      icon: '👑',
      bgGradient: 'from-indigo-900 via-purple-700 to-indigo-600',
      borderColor: 'border-purple-300',
      textColor: 'text-purple-200',
      glowClass: 'shadow-[0_0_8px_rgba(168,85,247,0.7)]',
      canvasBorderColor: '#c084fc',
      canvasGlowColor: '#a855f7',
      canvasBgColor: '#3b0764'
    };
  } else if (level >= 40) {
    return {
      tier: 5,
      name: '翡翠宗师勋章',
      shortTitle: '翡翠宗师',
      icon: '🔰',
      bgGradient: 'from-emerald-900 via-teal-700 to-emerald-600',
      borderColor: 'border-emerald-300',
      textColor: 'text-emerald-100',
      glowClass: 'shadow-[0_0_8px_rgba(16,185,129,0.7)]',
      canvasBorderColor: '#6ee7b7',
      canvasGlowColor: '#10b981',
      canvasBgColor: '#064e3b'
    };
  } else if (level >= 30) {
    return {
      tier: 4,
      name: '铂金战勋',
      shortTitle: '铂金精英',
      icon: '💎',
      bgGradient: 'from-sky-900 via-cyan-700 to-blue-600',
      borderColor: 'border-cyan-300',
      textColor: 'text-cyan-100',
      glowClass: 'shadow-[0_0_8px_rgba(6,182,212,0.6)]',
      canvasBorderColor: '#67e8f9',
      canvasGlowColor: '#06b6d4',
      canvasBgColor: '#164e63'
    };
  } else if (level >= 20) {
    return {
      tier: 3,
      name: '黄金战勋',
      shortTitle: '黄金勇士',
      icon: '🥇',
      bgGradient: 'from-amber-900 via-amber-600 to-yellow-600',
      borderColor: 'border-amber-300',
      textColor: 'text-amber-100',
      glowClass: 'shadow-[0_0_6px_rgba(245,158,11,0.5)]',
      canvasBorderColor: '#fcd34d',
      canvasGlowColor: '#d97706',
      canvasBgColor: '#451a03'
    };
  } else if (level >= 10) {
    return {
      tier: 2,
      name: '白银战勋',
      shortTitle: '白银锐士',
      icon: '🥈',
      bgGradient: 'from-slate-800 via-slate-600 to-zinc-600',
      borderColor: 'border-slate-300',
      textColor: 'text-slate-100',
      glowClass: 'shadow-[0_0_5px_rgba(148,163,184,0.4)]',
      canvasBorderColor: '#cbd5e1',
      canvasGlowColor: '#94a3b8',
      canvasBgColor: '#1e293b'
    };
  } else {
    return {
      tier: 1,
      name: '青铜战勋',
      shortTitle: '初出茅庐',
      icon: '🥉',
      bgGradient: 'from-amber-950 via-stone-800 to-amber-900',
      borderColor: 'border-amber-700',
      textColor: 'text-amber-300',
      glowClass: '',
      canvasBorderColor: '#b45309',
      canvasGlowColor: '#78350f',
      canvasBgColor: '#292524'
    };
  }
}
