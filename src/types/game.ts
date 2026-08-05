export type ProfessionType = 'warrior' | 'mage' | 'taoist';

export type GenderType = 'male' | 'female';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type EquipmentSlot = 
  | 'weapon' 
  | 'armor' 
  | 'helmet' 
  | 'necklace' 
  | 'ringLeft' 
  | 'ringRight' 
  | 'braceletLeft' 
  | 'braceletRight' 
  | 'belt' 
  | 'boots';

export interface Item {
  id: string;
  name: string;
  icon: string;
  type: 'weapon' | 'armor' | 'helmet' | 'necklace' | 'ring' | 'bracelet' | 'belt' | 'boots' | 'potion' | 'material' | 'book' | 'special_ring';
  rarity: ItemRarity;
  slot?: EquipmentSlot;
  reqLevel: number;
  reqProfession?: ProfessionType;
  physAtkMin?: number;
  physAtkMax?: number;
  magAtkMin?: number;
  magAtkMax?: number;
  taoAtkMin?: number;
  taoAtkMax?: number;
  physDef?: number;
  magDef?: number;
  hpBonus?: number;
  mpBonus?: number;
  critChance?: number; // 0-1
  specialEffect?: 'paralysis' | 'bodyguard' | 'resurrection' | 'vampire';
  luckLevel?: number; // 0-9
  setId?: string;
  refineLevel?: number; // 0-15
  description: string;
  priceGold: number;
  priceIngot: number;
  recycleGold: number;
  recycleIngot: number;
  recycleExp: number;
  count?: number;
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  profession: ProfessionType;
  reqLevel: number;
  level: number; // 1-3
  mpCost: number;
  cooldownMs: number;
  lastCastTime: number;
  range: number; // in grid distance
  aoeRadius: number; // 0 for single target
  damageRatio: number; // multiplier e.g. 1.8 = 180% damage
  description: string;
  isPassive?: boolean;
  particleType: 'fire_sword' | 'crescent' | 'thunderbolt' | 'firewall' | 'ice_storm' | 'poison' | 'heal' | 'soul_fire' | 'summon_dog' | 'magic_shield' | 'sky_slash' | 'sun_chaser' | 'savage_charge' | 'aegis_shield' | 'power_slash' | 'slash';
}

export interface Monster {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  hp: number;
  physAtk: number;
  physDef: number;
  magDef: number;
  expReward: number;
  goldReward: number;
  isBoss: boolean;
  color: string;
  speed: number;
  attackRange: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  lastAtkTime: number;
  atkCooldownMs: number;
  isAttacking?: boolean;
  attackStartTime?: number;
  isEnraged?: boolean;
  drops: { itemId: string; chance: number; countMin?: number; countMax?: number }[];
  spawnTime?: number;
  deathTime?: number;
  iconSymbol: string;
  templateId?: string;
  lastMoveSoundTime?: number;
  aggroPlayer?: number;
  aggroPet?: number;
  stunUntil?: number;
  lastBossSkillTime?: number;
}

export interface DropItem {
  id: string;
  item: Item;
  x: number;
  y: number;
  startX?: number;
  startY?: number;
  animDurationMs?: number;
  count: number;
  dropTime: number;
}

export type VfxKind = 
  | 'slash'
  | 'power_slash'
  | 'fire_sword'
  | 'sky_slash'
  | 'sun_chaser'
  | 'savage_charge'
  | 'aegis_shield'
  | 'crescent'
  | 'thunder'
  | 'ice_storm'
  | 'poison'
  | 'heal_beam'
  | 'talisman'
  | 'shield'
  | 'claw'
  | 'boss_smash'
  | 'death'
  | 'spark_burst'
  | 'hit_warrior'
  | 'hit_mage'
  | 'hit_taoist'
  | 'elemental_fire'
  | 'elemental_ice'
  | 'elemental_thunder';

export interface ParticleEffect {
  id: string;
  x: number;
  y: number;
  type: string;
  startTime: number;
  durationMs: number;
  color: string;
  text?: string;
  combatCategory?: 'normal' | 'crit' | 'block' | 'heal' | 'info' | 'player_hurt';
  elementalType?: 'fire' | 'ice' | 'lightning' | 'poison' | 'holy';
  offsetRandomX?: number;
  vfxKind?: VfxKind;
  profession?: 'warrior' | 'mage' | 'taoist';
  targetX?: number;
  targetY?: number;
  startX?: number;
  startY?: number;
  radius?: number;
  angle?: number;
}

export interface MapPortal {
  x: number;
  y: number;
  targetMapId: string;
  targetX: number;
  targetY: number;
  label: string;
}

export interface MapObstacle {
  id: string;
  x: number;
  y: number;
  width?: number; // width in grid tiles (default 1)
  height?: number; // height in grid tiles (default 1)
  type: 'tree' | 'rock' | 'wall' | 'statue' | 'pillar' | 'water' | 'ruins' | 'crystal' | 'torch' | 'bush' | 'grass' | 'puddle';
  label?: string;
  passable?: boolean;
}

export interface GuildFlagPole {
  x: number;
  y: number;
  label: string;
  isMainFlag?: boolean;
}

export interface GuildTerritory {
  name: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  flagPoles: GuildFlagPole[];
}

export interface MapScene {
  id: string;
  name: string;
  reqLevel: number;
  width: number;
  height: number;
  theme: 'green_field' | 'snake_valley' | 'stone_tomb' | 'zuma_temple' | 'red_moon' | 'sabak_castle';
  bgGradient: [string, string];
  gridColor: string;
  monsters: { monsterTemplateId: string; count: number }[];
  portals: MapPortal[];
  obstacles?: MapObstacle[];
  isSafeZone?: boolean;
  bossSpawns?: { monsterTemplateId: string; respawnTimeSec: number; x: number; y: number }[];
  guildTerritory?: GuildTerritory;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  physAtkMin: number;
  physAtkMax: number;
  magAtkMin: number;
  magAtkMax: number;
  taoAtkMin: number;
  taoAtkMax: number;
  physDef: number;
  magDef: number;
  critChance: number;
  luck: number;
  battlePower: number;
  comboCount?: number;
  comboCritBonus?: number;
  moveSpeedBonus?: number;
}

export interface MountData {
  tier: number; // 1 to 10
  level: number; // 0 to 10
  exp: number; // Current advancement exp
  isMounted: boolean;
  advancePillsCount: number;
}

export interface Pet {
  id: string;
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  x: number;
  y: number;
  lastAtkTime: number;
  level?: number;
  exp?: number;
  maxExp?: number;
  iconSymbol?: string;
  color?: string;
}

export type QuestType = 'main' | 'daily';
export type QuestTargetType = 'kill_monster' | 'kill_any' | 'reach_level' | 'accumulate_gold' | 'forge_item';

export type AchievementCategory = 'kill' | 'level' | 'boss' | 'forge' | 'gold' | 'map';

export interface Achievement {
  id: string;
  titleName: string;
  titleBadge: string;
  description: string;
  category: AchievementCategory;
  targetCount: number;
  statBonus: {
    maxHp?: number;
    physAtk?: number;
    magAtk?: number;
    taoAtk?: number;
    physDef?: number;
    magDef?: number;
    critChance?: number;
  };
  rewardGold?: number;
  rewardIngot?: number;
}

export interface AchievementStats {
  totalKills: number;
  bossKills: number;
  maxLevelReached: number;
  forgeTimes: number;
  totalGoldEarned: number;
  mapClears: number;
}

export interface Quest {
  id: string;
  title: string;
  chapter?: string;
  type: QuestType;
  description: string;
  targetType: QuestTargetType;
  targetMonsterId?: string;
  targetName: string;
  targetMapId?: string;
  requiredCount: number;
  currentCount: number;
  rewardExp: number;
  rewardGold: number;
  rewardIngot?: number;
  rewardItemName?: string;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface AutoSettings {
  enabled: boolean;
  autoPotionHp: number; // %
  autoPotionMp: number; // %
  range: number;
  pickupFilter?: 'all' | 'rare_plus' | 'gold_only';
  // Auto Loot Filtering
  pickupEnabled: boolean;
  pickupTypes: {
    gold: boolean;
    potion: boolean;
    equipment: boolean;
    material: boolean;
  };
  pickupRarities: Record<ItemRarity, boolean>;
  // Auto Equipment Recycling
  autoRecycleEnabled: boolean;
  autoRecycleOnFull: boolean;
  autoRecycleInstant: boolean;
  autoRecycleRarities: Record<ItemRarity, boolean>;
  autoRecycleKeepOwnProfession: boolean;
  autoRecycleSpecialRings?: boolean;
}

export interface CombatDisplaySettings {
  showRightDamage: boolean; // 默认开启右侧伤害特效
  showCenterDamage: boolean; // 默认关闭中间伤害特效
}

export interface CharacterData {
  id: string;
  name: string;
  gender: GenderType;
  profession: ProfessionType;
  level: number;
  exp: number;
  maxExp: number;
  gold: number;
  ingot: number; // 元宝
  rebirthLevel: number; // 转生等级
  wingLevel: number; // 光翼等级
  title: string;
  guildName: string;
  currentMapId: string;
  x: number;
  y: number;
  equipment: Record<EquipmentSlot, Item | null>;
  inventory: (Item | null)[]; // 40 slots
  skills: Skill[];
  equippedSkills: string[]; // Skill IDs in quick bar
  autoBattleSettings: AutoSettings;
  combatDisplaySettings?: CombatDisplaySettings;
  pet: Pet | null;
  questData?: {
    currentMainQuestIndex: number;
    dailyQuests: Quest[];
    mainQuestProgress: number;
  };
  achievementStats?: AchievementStats;
  unlockedAchievementIds?: string[];
  claimedAchievementIds?: string[];
  equippedTitleId?: string | null;
  mount?: MountData;
}

export interface GuildInfo {
  id: string;
  name: string;
  leaderName: string;
  level: number;
  membersCount: number;
  maxMembers: number;
  notice: string;
  isSabakLord: boolean;
}

export interface SetBonus {
  setId: string;
  setName: string;
  requiredPieces: number;
  physAtkBonus?: number;
  magAtkBonus?: number;
  taoAtkBonus?: number;
  hpBonus?: number;
  mpBonus?: number;
  physDefBonus?: number;
  magDefBonus?: number;
  critChanceBonus?: number;
  specialEffectId?: string;
}
