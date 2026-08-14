import { SET_BONUSES } from "../data/sets";
import { 
  CharacterData, 
  Monster, 
  DropItem, 
  ParticleEffect, 
  VfxKind, 
  PlayerStats, 
  EquipmentSlot, 
  Item, 
  Pet, 
  Quest, 
  AchievementStats,
  Mail,
  MailAttachmentItem
} from '../types/game';
import { MAP_DATABASE } from '../data/maps';
import { MONSTER_TEMPLATES } from '../data/monsters';
import { PROFESSIONS } from '../data/professions';
import { ITEM_DATABASE } from '../data/items';
import { MAIN_QUESTS, DAILY_QUESTS_TEMPLATES } from '../data/quests';
import { ACHIEVEMENT_DATABASE } from '../data/achievements';
import { WEATHER_DATABASE, WeatherType } from '../data/weather';
import { MOUNT_TIERS } from '../data/mounts';
import { SKILL_TEMPLATES } from '../data/skills';
import { soundFX } from '../utils/sound';
import { fetchPlayerMails, markMailRead, markMailClaimed, deletePlayerMail } from '../utils/mailService';

export class GameEngine {
  public character: CharacterData;
  public monsters: Monster[] = [];
  public drops: DropItem[] = [];
  public particles: ParticleEffect[] = [];
  public stats: PlayerStats = {
    hp: 100, maxHp: 100,
    mp: 100, maxMp: 100,
    physAtkMin: 5, physAtkMax: 10,
    magAtkMin: 0, magAtkMax: 0,
    taoAtkMin: 0, taoAtkMax: 0,
    physDef: 2, magDef: 2,
    critChance: 0.05,
    luck: 0,
    battlePower: 100
  };

  public currentMapId: string = 'bichi_city';
  public targetMonsterId: string | null = null;
  public autoPatrolTarget: { x: number; y: number } | null = null;
  public lastAutoPatrolTime: number = 0;
  public autoStuckCount: number = 0;
  public unreachableMonsters: Map<string, number> = new Map();

  public get isAutoBattling(): boolean {
    return !!this.character?.autoBattleSettings?.enabled;
  }
  public set isAutoBattling(val: boolean) {
    this.initAutoSettings();
    if (this.character?.autoBattleSettings) {
      this.character.autoBattleSettings.enabled = val;
    }
  }

  public lastAutoAtkTime: number = 0;
  public resurrectionCooldownEnd: number = 0;
  public lastPortalTime: number = 0;
  public aegisShieldUntil: number = 0;

  public sabakInfo: { guildName: string; leaderName: string; taxGold?: number } = {
    guildName: '兄弟会',
    leaderName: '霸天战神',
    taxGold: 1000000
  };

  public territoryBannerTime: number = Date.now();

  public triggerTerritoryBanner() {
    this.territoryBannerTime = Date.now();
    this.notify();
  }

  public async refreshSabakInfo() {
    try {
      const res = await fetch('/api/sabak');
      if (res.ok) {
        const data = await res.json();
        if (data && data.guildName) {
          this.sabakInfo = data;
          this.triggerTerritoryBanner();
        }
      }
    } catch (e) {
      // ignore network issue
    }
  }

  // Check if tile is blocked by map border or obstacles
  public isTileBlocked(x: number, y: number): boolean {
    const map = MAP_DATABASE[this.currentMapId];
    if (!map) return false;

    // Map boundaries padding
    if (x < 1.2 || x > map.width - 1.2 || y < 1.2 || y > map.height - 1.2) {
      return true;
    }

    if (map.obstacles) {
      for (const obs of map.obstacles) {
        // Non-blocking passable environmental elements
        if (
          obs.type === 'water' ||
          obs.type === 'puddle' ||
          obs.type === 'bush' ||
          obs.type === 'grass' ||
          obs.passable
        ) continue;

        const w = obs.width || 1;
        const h = obs.height || 1;
        // Bounding box with 0.4 tile player radius padding
        if (x >= obs.x - 0.4 && x <= obs.x + w + 0.4 &&
            y >= obs.y - 0.4 && y <= obs.y + h + 0.4) {
          return true;
        }
      }
    }
    return false;
  }

  // Determine ground surface material for footstep audio synthesis
  public getTerrainType(x: number, y: number): 'grass' | 'gravel' | 'water' | 'stone' {
    const map = MAP_DATABASE[this.currentMapId];
    if (!map) return 'grass';

    // 1. Check if on/near puddle or water obstacle
    if (map.obstacles) {
      for (const obs of map.obstacles) {
        if (obs.type === 'water' || obs.type === 'puddle') {
          const w = obs.width || 1;
          const h = obs.height || 1;
          if (x >= obs.x - 0.6 && x <= obs.x + w + 0.6 &&
              y >= obs.y - 0.6 && y <= obs.y + h + 0.6) {
            return 'water';
          }
        }
      }
    }

    // 2. Map theme defaults & structural proximity
    const theme = map.theme;
    if (theme === 'stone_tomb' || theme === 'zuma_temple' || theme === 'sabak_castle' || theme === 'red_moon') {
      return 'stone';
    }

    if (theme === 'snake_valley') {
      // Check if near rocks or gravel outcrops
      if (map.obstacles) {
        for (const obs of map.obstacles) {
          if (obs.type === 'rock') {
            const dist = Math.hypot(x - obs.x, y - obs.y);
            if (dist <= 2.2) return 'gravel';
          }
        }
      }
      return 'gravel';
    }

    // For open fields (e.g. bichi_city): check proximity to stone pavements or rock outcrops
    if (map.obstacles) {
      for (const obs of map.obstacles) {
        if (obs.type === 'statue' || obs.type === 'pillar' || obs.type === 'wall' || obs.type === 'ruins') {
          const dist = Math.hypot(x - obs.x, y - obs.y);
          if (dist <= 1.8) return 'stone';
        } else if (obs.type === 'rock') {
          const dist = Math.hypot(x - obs.x, y - obs.y);
          if (dist <= 1.8) return 'gravel';
        }
      }
    }

    return 'grass';
  }

  // Check physical interaction triggers for environmental decorations (bushes, tall grass, puddles, torches, crystals)
  public checkEnvironmentInteraction(x: number, y: number) {
    const map = MAP_DATABASE[this.currentMapId];
    if (!map || !map.obstacles) return;

    for (const obs of map.obstacles) {
      const w = obs.width || 1;
      const h = obs.height || 1;
      const cx = obs.x + w / 2;
      const cy = obs.y + h / 2;
      const dist = Math.hypot(x - cx, y - cy);

      if (obs.type === 'bush' || obs.type === 'grass') {
        if (dist <= 0.85) {
          soundFX.playDecorationTrigger('bush');
        }
      } else if (obs.type === 'puddle' || obs.type === 'water') {
        if (dist <= 0.75) {
          soundFX.playDecorationTrigger('puddle');
        }
      } else if (obs.type === 'torch' || obs.type === 'crystal') {
        if (dist <= 0.9) {
          soundFX.playDecorationTrigger(obs.type);
        }
      }
    }
  }

  // Unified movement notification & physical audio processing
  public onPlayerMoved(oldX: number, oldY: number, isRunning: boolean = false) {
    const hasMoved = this.character.x !== oldX || this.character.y !== oldY;
    if (hasMoved) {
      const isMounted = !!this.character.mount?.isMounted;
      const terrainType = this.getTerrainType(this.character.x, this.character.y);
      
      // Play terrain-aware footstep & equipment response
      soundFX.playPlayerFootstep(isRunning, isMounted, this.getArmorClass(), terrainType);

      // Trigger physical decoration interaction feedback
      this.checkEnvironmentInteraction(this.character.x, this.character.y);
    }
  }

  // Smooth navigation towards target with obstacle steering
  public stepTowards(tx: number, ty: number, stepSize: number = 0.055): boolean {
    const dx = tx - this.character.x;
    const dy = ty - this.character.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= 0.25) return true; // Reached target

    const oldX = this.character.x;
    const oldY = this.character.y;

    const actualStep = Math.min(stepSize, dist);
    const baseAngle = Math.atan2(dy, dx);

    // Angle probe offsets for steering around obstacles
    const angleOffsets = [
      0,
      Math.PI / 6, -Math.PI / 6,
      Math.PI / 3, -Math.PI / 3,
      Math.PI / 2, -Math.PI / 2,
      (2 * Math.PI) / 3, -(2 * Math.PI) / 3,
      (3 * Math.PI) / 4, -(3 * Math.PI) / 4
    ];

    let moved = false;
    for (const offset of angleOffsets) {
      const angle = baseAngle + offset;
      const nx = this.character.x + Math.cos(angle) * actualStep;
      const ny = this.character.y + Math.sin(angle) * actualStep;

      if (!this.isTileBlocked(nx, ny)) {
        this.character.x = nx;
        this.character.y = ny;
        moved = true;
        break;
      }
    }

    if (!moved) {
      // Fallback: try wall sliding on X or Y alone
      const tryX = this.character.x + Math.sign(dx) * actualStep * 0.7;
      if (!this.isTileBlocked(tryX, this.character.y)) {
        this.character.x = tryX;
        moved = true;
      } else {
        const tryY = this.character.y + Math.sign(dy) * actualStep * 0.7;
        if (!this.isTileBlocked(this.character.x, tryY)) {
          this.character.y = tryY;
          moved = true;
        }
      }
    }

    if (moved) {
      this.onPlayerMoved(oldX, oldY, stepSize > 0.065);
    }

    return false;
  }

  // Combo Counter System State
  public comboCount: number = 0;
  public lastHitTime: number = 0;
  public comboTimeoutMs: number = 3000; // 3 seconds window to keep combo active
  public highestCombo: number = 0;

  public registerComboHit(hits: number = 1) {
    const now = Date.now();
    if (this.comboCount > 0 && now - this.lastHitTime <= this.comboTimeoutMs) {
      this.comboCount += hits;
    } else {
      this.comboCount = hits;
    }
    this.lastHitTime = now;
    if (this.comboCount > this.highestCombo) {
      this.highestCombo = this.comboCount;
    }

    this.recalculateStats();

    if (this.comboCount === 5 || this.comboCount === 10 || this.comboCount === 20 || this.comboCount === 30 || this.comboCount === 50) {
      const bonusPct = Math.min(40, Math.floor(this.comboCount * 1.5));
      this.addParticle(
        this.character.x,
        this.character.y - 0.5,
        'text_gold',
        `⚡ ${this.comboCount}连击达成! 暴击率+${bonusPct}%`
      );
      soundFX.playLevelUp();
    }
  }

  // Quest Navigation State
  public questNavTarget: {
    mapId: string;
    targetX: number;
    targetY: number;
    targetName: string;
    monsterId?: string;
    targetMonsterId?: string;
  } | null = null;

  public startQuestNavigation(targetMapId?: string, targetMonsterId?: string, targetName?: string) {
    const mapId = targetMapId || this.currentMapId;
    const map = MAP_DATABASE[mapId];

    if (!map) return;

    if (this.character.level < map.reqLevel) {
      this.addParticle(this.character.x, this.character.y, 'text_info', `等级不足，进入 ${map.name} 需要 LV ${map.reqLevel}！`);
      soundFX.playHit();
      return;
    }

    if (this.currentMapId !== mapId) {
      this.changeMap(mapId, 10, 10);
    }

    const nameToMatch = targetName || '';
    const monster = this.monsters.find(m => m.hp > 0 && (
      (targetMonsterId && (m.templateId === targetMonsterId || m.id.includes(targetMonsterId) || this.getMonsterTypeId(m) === targetMonsterId)) ||
      (nameToMatch && (m.name.includes(nameToMatch) || nameToMatch.includes(m.name.replace('【精英】', '').replace('【BOSS】', '').trim())))
    ));

    let tx = 10;
    let ty = 10;
    let monsterId: string | undefined = undefined;

    if (monster) {
      tx = monster.x;
      ty = monster.y;
      monsterId = monster.id;
    } else {
      const anyM = this.monsters.find(m => m.hp > 0);
      if (anyM) {
        tx = anyM.x;
        ty = anyM.y;
        monsterId = anyM.id;
      }
    }

    const nameTag = targetName || (monster ? monster.name : map.name);
    this.questNavTarget = {
      mapId,
      targetX: tx,
      targetY: ty,
      targetName: nameTag,
      monsterId,
      targetMonsterId
    };

    this.addParticle(this.character.x, this.character.y, 'text_gold', `【任务寻路】目标: ${nameTag} (${tx}, ${ty})`);
    soundFX.playLoot();
    this.notify();
  }

  public stopQuestNavigation() {
    this.questNavTarget = null;
    this.notify();
  }

  private updateQuestNavigation(now: number) {
    if (!this.questNavTarget) return;

    if (this.questNavTarget.mapId !== this.currentMapId) {
      return;
    }

    if (this.questNavTarget.monsterId) {
      const m = this.monsters.find(m => m.id === this.questNavTarget!.monsterId);
      if (m && m.hp > 0) {
        this.questNavTarget.targetX = m.x;
        this.questNavTarget.targetY = m.y;
      } else {
        const targetMonId = this.questNavTarget.targetMonsterId;
        const targetName = this.questNavTarget.targetName;
        const nextM = this.monsters.find(m => m.hp > 0 && (
          (targetMonId && (m.templateId === targetMonId || m.id.includes(targetMonId) || this.getMonsterTypeId(m) === targetMonId)) ||
          (targetName && (m.name.includes(targetName) || targetName.includes(m.name.replace('【精英】', '').replace('【BOSS】', '').trim())))
        ));
        if (nextM) {
          this.questNavTarget.monsterId = nextM.id;
          this.questNavTarget.targetX = nextM.x;
          this.questNavTarget.targetY = nextM.y;
        } else {
          this.questNavTarget.monsterId = undefined;
        }
      }
    }

    const dx = this.questNavTarget.targetX - this.character.x;
    const dy = this.questNavTarget.targetY - this.character.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 1.2) {
      const mountSpeedBonus = this.stats.moveSpeedBonus || 0;
      const stepSize = 0.055 * (1 + mountSpeedBonus);
      this.stepTowards(this.questNavTarget.targetX, this.questNavTarget.targetY, stepSize);
      this.notify();
    } else {
      if (this.questNavTarget.monsterId) {
        const m = this.monsters.find(m => m.id === this.questNavTarget!.monsterId && m.hp > 0);
        if (m) {
          this.targetMonsterId = m.id;
          this.attackTarget(m.id);
        }
      }
    }
  }

  // Weather System State
  public currentWeather: WeatherType = 'sunny';
  private lastWeatherCycleTime: number = Date.now();
  private weatherCycleIntervalMs: number = 90000; // Auto switch weather every 90 seconds

  // Listeners
  private onStateChangeCallbacks: (() => void)[] = [];

  public mails: Mail[] = [];

  constructor(characterData: CharacterData) {
    this.character = characterData;
    if (!this.character.uid) {
      this.character.uid = `UID-${Math.floor(100000 + Math.random() * 900000)}`;
    }
    if (!this.character.createdAt) {
      this.character.createdAt = new Date().toISOString();
    }
    this.initMount();
    this.initQuestData();
    this.initAutoSettings();
    this.initCombatDisplaySettings();
    this.currentMapId = characterData.currentMapId || 'bichi_city';
    
    const mapTheme = MAP_DATABASE[this.currentMapId]?.theme;
    if (mapTheme === 'stone_tomb' || mapTheme === 'red_moon') {
      this.currentWeather = Math.random() > 0.5 ? 'thunder' : 'snow';
    } else if (mapTheme === 'snake_valley') {
      this.currentWeather = Math.random() > 0.5 ? 'rain' : 'sandstorm';
    } else if (mapTheme === 'sabak_castle') {
      this.currentWeather = 'sandstorm';
    } else {
      this.currentWeather = 'sunny';
    }

    this.syncClassSkills();
    this.syncItemsWithDatabase();
    this.recalculateStats();
    this.spawnMonstersForMap(this.currentMapId);
    this.refreshSabakInfo();
    this.refreshMails();
  }

  public syncClassSkills() {
    if (!this.character || !this.character.skills) return;
    const profSkills = SKILL_TEMPLATES.filter(s => s.profession === this.character.profession);
    profSkills.forEach(tmpl => {
      const existing = this.character.skills.find(s => s.id === tmpl.id);
      if (!existing) {
        this.character.skills.push({ ...tmpl });
      } else {
        // Update skill data to latest template values
        existing.description = tmpl.description;
        existing.damageRatio = tmpl.damageRatio;
        existing.isPassive = tmpl.isPassive;
        existing.range = tmpl.range;
        existing.aoeRadius = tmpl.aoeRadius;
        existing.reqLevel = tmpl.reqLevel;
        existing.particleType = tmpl.particleType;
      }
      if (!this.character.equippedSkills.includes(tmpl.id)) {
        this.character.equippedSkills.push(tmpl.id);
      }
    });
  }

  public syncItemsWithDatabase() {
    if (!this.character) return;

    // 1. Sync inventory items with ITEM_DATABASE templates
    if (this.character.inventory) {
      this.character.inventory = this.character.inventory.map(item => {
        if (!item) return null;
        const dbItem = ITEM_DATABASE[item.id];
        if (dbItem) {
          return {
            ...item,
            name: dbItem.name,
            icon: dbItem.icon,
            type: dbItem.type,
            slot: dbItem.slot || item.slot,
            description: dbItem.description,
            priceGold: dbItem.priceGold ?? item.priceGold,
            priceIngot: dbItem.priceIngot ?? item.priceIngot,
            recycleGold: dbItem.recycleGold ?? item.recycleGold,
            recycleIngot: dbItem.recycleIngot ?? item.recycleIngot,
            recycleExp: dbItem.recycleExp ?? item.recycleExp,
          };
        }
        return item;
      });
    }

    // 2. Sync equipment items with ITEM_DATABASE templates
    if (this.character.equipment) {
      (Object.keys(this.character.equipment) as EquipmentSlot[]).forEach(slotKey => {
        const equip = this.character.equipment[slotKey];
        if (equip) {
          const dbItem = ITEM_DATABASE[equip.id];
          if (dbItem) {
            this.character.equipment[slotKey] = {
              ...equip,
              name: dbItem.name,
              icon: dbItem.icon,
              type: dbItem.type,
              slot: dbItem.slot || equip.slot,
              description: dbItem.description,
              priceGold: dbItem.priceGold ?? equip.priceGold,
              priceIngot: dbItem.priceIngot ?? equip.priceIngot,
              recycleGold: dbItem.recycleGold ?? equip.recycleGold,
              recycleIngot: dbItem.recycleIngot ?? equip.recycleIngot,
              recycleExp: dbItem.recycleExp ?? equip.recycleExp,
            };
          }
        }
      });
    }
  }

  public initCombatDisplaySettings() {
    if (!this.character.combatDisplaySettings) {
      this.character.combatDisplaySettings = {
        showRightDamage: true,
        showCenterDamage: false,
      };
    } else {
      if (this.character.combatDisplaySettings.showRightDamage === undefined) {
        this.character.combatDisplaySettings.showRightDamage = true;
      }
      if (this.character.combatDisplaySettings.showCenterDamage === undefined) {
        this.character.combatDisplaySettings.showCenterDamage = false;
      }
    }
  }

  public initMount() {
    if (!this.character.mount) {
      this.character.mount = {
        tier: 1,
        level: 0,
        exp: 0,
        isMounted: true,
        advancePillsCount: 20
      };
    }
  }

  public advanceMount(useBatch: boolean = false): boolean {
    this.initMount();
    const mount = this.character.mount!;

    if (mount.tier >= 10 && mount.level >= 10) {
      this.addParticle(this.character.x, this.character.y, 'text_gold', '【坐骑巅峰】已达到最高阶位（十阶满星）！');
      return false;
    }

    const invPillIndex = this.character.inventory.findIndex(i => i?.id === 'pill_mount_advance');
    const invPillCount = invPillIndex >= 0 ? (this.character.inventory[invPillIndex]?.count || 1) : 0;
    const totalPills = mount.advancePillsCount + invPillCount;

    if (totalPills <= 0) {
      this.addParticle(this.character.x, this.character.y, 'text_info', '缺少 [坐骑进阶丹]！可在商城购买或打怪掉落！');
      return false;
    }

    const maxTimes = useBatch ? Math.min(10, totalPills) : 1;
    let timesRun = 0;

    for (let t = 0; t < maxTimes; t++) {
      if (mount.tier >= 10 && mount.level >= 10) break;

      // Deduct pill
      if (mount.advancePillsCount > 0) {
        mount.advancePillsCount -= 1;
      } else if (invPillIndex >= 0 && this.character.inventory[invPillIndex]) {
        const item = this.character.inventory[invPillIndex]!;
        if ((item.count || 1) > 1) {
          item.count! -= 1;
        } else {
          this.character.inventory[invPillIndex] = null;
        }
      }

      timesRun++;
      const tierConfig = MOUNT_TIERS[mount.tier] || MOUNT_TIERS[1];
      mount.exp += tierConfig.pillExp;

      // Check star level up
      if (mount.exp >= tierConfig.expPerLevel && mount.level < tierConfig.maxLevel) {
        mount.exp -= tierConfig.expPerLevel;
        mount.level += 1;
        this.addParticle(this.character.x, this.character.y, 'text_gold', `【坐骑升星】提升至 ${mount.tier}阶 ${mount.level}星！`);
        soundFX.playLevelUp();

        // Tier advancement trigger if star level reaches 10
        if (mount.level >= 10 && mount.tier < 10) {
          mount.tier += 1;
          mount.level = 0;
          mount.exp = 0;
          const nextTier = MOUNT_TIERS[mount.tier];
          this.addParticle(this.character.x, this.character.y, 'text_gold', `【坐骑突破!】恭喜成功进阶为 [${nextTier.name}]！`);
          soundFX.playRareDrop();
        }
      }
    }

    if (timesRun > 0) {
      soundFX.playPotion();
      this.recalculateStats();
      this.notify();
    }
    return true;
  }

  public toggleMount() {
    this.initMount();
    const mount = this.character.mount!;
    mount.isMounted = !mount.isMounted;
    this.recalculateStats();

    const tierConfig = MOUNT_TIERS[mount.tier] || MOUNT_TIERS[1];
    if (mount.isMounted) {
      const speedPct = Math.round(tierConfig.speedBonus * (1 + mount.level * 0.05) * 100);
      this.addParticle(
        this.character.x,
        this.character.y,
        'text_gold',
        `【骑乘上马】骑乘 [${tierConfig.name}]，移动速度+${speedPct}%！`
      );
      soundFX.playLevelUp();
    } else {
      this.addParticle(
        this.character.x,
        this.character.y,
        'text_info',
        '【下马收拢】恢复步战模式'
      );
      soundFX.playHit();
    }
    this.notify();
  }

  public moveCharacter(dx: number, dy: number) {
    const speedBonus = this.stats.moveSpeedBonus || 0;
    const speedMult = 1 + speedBonus;
    const stepMagnitude = 0.055 * speedMult;

    const len = Math.hypot(dx, dy);
    if (len === 0) return;

    const oldX = this.character.x;
    const oldY = this.character.y;

    const nx = this.character.x + (dx / len) * stepMagnitude;
    const ny = this.character.y + (dy / len) * stepMagnitude;

    // Try full move
    if (!this.isTileBlocked(nx, ny)) {
      this.character.x = nx;
      this.character.y = ny;
    } else {
      // Wall slide on X
      if (!this.isTileBlocked(nx, this.character.y)) {
        this.character.x = nx;
      }
      // Wall slide on Y
      else if (!this.isTileBlocked(this.character.x, ny)) {
        this.character.y = ny;
      }
    }

    this.onPlayerMoved(oldX, oldY, speedMult > 1.2);
    this.notify();
  }

  public initAutoSettings() {
    if (!this.character.autoBattleSettings) {
      this.character.autoBattleSettings = {} as any;
    }
    const settings = this.character.autoBattleSettings;
    if (settings.enabled === undefined) settings.enabled = true;
    if (settings.autoPotionHp === undefined) settings.autoPotionHp = 50;
    if (settings.autoPotionMp === undefined) settings.autoPotionMp = 30;
    if (settings.range === undefined) settings.range = 10;

    // Auto Loot Settings
    if (settings.pickupEnabled === undefined) settings.pickupEnabled = true;
    if (!settings.pickupTypes) {
      settings.pickupTypes = {
        gold: true,
        potion: true,
        equipment: true,
        material: true
      };
    }
    if (!settings.pickupRarities) {
      settings.pickupRarities = {
        common: true,
        uncommon: true,
        rare: true,
        epic: true,
        legendary: true,
        mythic: true
      };
    }

    // Auto Equipment Recycling Settings
    if (settings.autoRecycleEnabled === undefined) settings.autoRecycleEnabled = true;
    if (settings.autoRecycleOnFull === undefined) settings.autoRecycleOnFull = true;
    if (settings.autoRecycleInstant === undefined) settings.autoRecycleInstant = false;
    if (!settings.autoRecycleRarities) {
      settings.autoRecycleRarities = {
        common: true,
        uncommon: true,
        rare: false,
        epic: false,
        legendary: false,
        mythic: false
      };
    }
    if (settings.autoRecycleKeepOwnProfession === undefined) settings.autoRecycleKeepOwnProfession = true;
    if (settings.autoRecycleSpecialRings === undefined) settings.autoRecycleSpecialRings = false;
  }

  public recycleSpecialRings(): number {
    const specialRingIds = ['ring_paralysis', 'ring_bodyguard', 'ring_resurrection'];
    let recycledCount = 0;
    let totalGold = 0;
    let totalIngot = 0;
    let totalExp = 0;

    this.character.inventory = this.character.inventory.map(item => {
      if (!item) return null;
      if (item.type === 'special_ring' || specialRingIds.includes(item.id)) {
        recycledCount += 1;
        totalGold += item.recycleGold || 250000;
        totalIngot += item.recycleIngot || 800;
        totalExp += item.recycleExp || 500000;
        return null;
      }
      return item;
    });

    if (recycledCount > 0) {
      this.character.gold += totalGold;
      this.character.ingot += totalIngot;
      this.character.exp += totalExp;

      this.trackAchievementProgress('forgeTimes', recycledCount);
      this.trackAchievementProgress('totalGoldEarned', totalGold);

      this.addParticle(
        this.character.x,
        this.character.y,
        'text_gold',
        `【特戒一键回收】成功回收 ${recycledCount} 枚特戒 +${totalIngot}元宝 +${totalGold}金币!`
      );
      soundFX.playGold();
      this.notify();
    } else {
      this.addParticle(
        this.character.x,
        this.character.y,
        'text_info',
        '背包中未找到可回收的特戒（麻痹/护身/复活）！'
      );
    }

    return recycledCount;
  }

  public autoRecycleEquipment(isFullTrigger: boolean = false, includeSpecialRings: boolean = false): number {
    this.initAutoSettings();
    const settings = this.character.autoBattleSettings;
    if (!settings.autoRecycleEnabled && !isFullTrigger && !includeSpecialRings) return 0;

    const equipmentTypes = ['weapon', 'armor', 'helmet', 'necklace', 'ring', 'bracelet', 'belt', 'boots', 'special_ring'];
    const specialRingIds = ['ring_paralysis', 'ring_bodyguard', 'ring_resurrection'];

    let recycledCount = 0;
    let totalGold = 0;
    let totalIngot = 0;
    let totalExp = 0;

    this.character.inventory = this.character.inventory.map(item => {
      if (!item) return null;
      if (!equipmentTypes.includes(item.type)) return item;

      const isSpecialRing = item.type === 'special_ring' || specialRingIds.includes(item.id);

      if (isSpecialRing) {
        const canRecycleSpecial = includeSpecialRings || !!settings.autoRecycleSpecialRings || !!settings.autoRecycleRarities[item.rarity];
        if (!canRecycleSpecial) return item;
      } else {
        // Check rarity filter
        const shouldRecycleRarity = !!settings.autoRecycleRarities[item.rarity];
        if (!shouldRecycleRarity) return item;

        // Check profession filter
        if (settings.autoRecycleKeepOwnProfession && item.reqProfession === this.character.profession) {
          return item; // Keep player's own class equipment
        }
      }

      // Perform recycling
      recycledCount += 1;
      totalGold += item.recycleGold || 150;
      totalIngot += item.recycleIngot || 0;
      totalExp += item.recycleExp || 500;

      return null; // Item recycled & cleared from inventory slot
    });

    if (recycledCount > 0) {
      this.character.gold += totalGold;
      this.character.ingot += totalIngot;
      this.character.exp += totalExp;

      this.trackAchievementProgress('forgeTimes', recycledCount);
      this.trackAchievementProgress('totalGoldEarned', totalGold);

      const causeTag = isFullTrigger ? '【背包满触发回收】' : '【装备自动回收】';
      this.addParticle(
        this.character.x,
        this.character.y,
        'text_gold',
        `${causeTag} 清理 ${recycledCount} 件装备 +${totalGold}金币 +${totalExp}经验!`
      );
      soundFX.playGold();
      this.notify();
    }

    return recycledCount;
  }

  public initQuestData() {
    if (!this.character.questData) {
      this.character.questData = {
        currentMainQuestIndex: 0,
        mainQuestProgress: 0,
        dailyQuests: JSON.parse(JSON.stringify(DAILY_QUESTS_TEMPLATES))
      };
    }
  }

  public getDailyQuests(): Quest[] {
    this.initQuestData();
    return this.character.questData!.dailyQuests;
  }

  public checkMonsterKillQuests(m: Monster) {
    this.initQuestData();
    const qData = this.character.questData!;

    // 1. Check Main Quest
    const currentMainTemplate = MAIN_QUESTS[qData.currentMainQuestIndex];
    if (currentMainTemplate && currentMainTemplate.targetType === 'kill_monster') {
      const monsterTypeId = this.getMonsterTypeId(m);
      const targetId = currentMainTemplate.targetMonsterId;
      const targetName = currentMainTemplate.targetName;

      const cleanMName = m.name.replace('【精英】', '').replace('【BOSS】', '').trim();
      const isMatch = (targetId && (m.templateId === targetId || monsterTypeId === targetId || m.id.includes(targetId))) ||
                      (targetName && (m.name.includes(targetName) || targetName.includes(cleanMName) || cleanMName.includes(targetName)));

      if (isMatch) {
        if (qData.mainQuestProgress < currentMainTemplate.requiredCount) {
          qData.mainQuestProgress += 1;
          if (qData.mainQuestProgress >= currentMainTemplate.requiredCount) {
            this.addParticle(this.character.x, this.character.y, 'text_gold', `【主线达成!】${currentMainTemplate.title}`);
            soundFX.playQuestComplete();
          }
        }
      }
    }

    // 2. Check Daily Quests
    qData.dailyQuests.forEach(dq => {
      if (dq.isClaimed) return;
      const wasCompleted = dq.isCompleted;
      if (dq.targetType === 'kill_any') {
        if (dq.currentCount < dq.requiredCount) {
          dq.currentCount += 1;
          if (dq.currentCount >= dq.requiredCount) dq.isCompleted = true;
        }
      } else if (dq.targetType === 'accumulate_gold') {
        dq.currentCount = Math.min(dq.requiredCount, this.character.gold);
        if (dq.currentCount >= dq.requiredCount) dq.isCompleted = true;
      }
      if (!wasCompleted && dq.isCompleted) {
        this.addParticle(this.character.x, this.character.y, 'text_gold', `【每日目标达成!】${dq.title}`);
        soundFX.playQuestComplete();
      }
    });

    this.notify();
  }

  public triggerForgeQuest() {
    this.initQuestData();
    this.trackAchievementProgress('forgeTimes', 1);
    const qData = this.character.questData!;
    qData.dailyQuests.forEach(dq => {
      if (dq.targetType === 'forge_item' && !dq.isClaimed) {
        const wasCompleted = dq.isCompleted;
        dq.currentCount = Math.min(dq.requiredCount, dq.currentCount + 1);
        if (dq.currentCount >= dq.requiredCount) dq.isCompleted = true;
        if (!wasCompleted && dq.isCompleted) {
          this.addParticle(this.character.x, this.character.y, 'text_gold', `【每日目标达成!】${dq.title}`);
          soundFX.playQuestComplete();
        }
      }
    });
    this.notify();
  }

  public claimMainQuestReward() {
    this.initQuestData();
    const qData = this.character.questData!;
    const template = MAIN_QUESTS[qData.currentMainQuestIndex];
    if (!template) return;

    // Grant rewards
    this.character.exp += template.rewardExp;
    this.character.gold += template.rewardGold;
    if (template.rewardIngot) this.character.ingot += template.rewardIngot;

    if (template.rewardItemName) {
      this.addItemToInventory({ ...ITEM_DATABASE['blessing_oil'], count: 1 });
    }

    qData.currentMainQuestIndex += 1;
    qData.mainQuestProgress = 0;

    this.addParticle(this.character.x, this.character.y, 'text_gold', `【领奖成功!】完成主线: ${template.title}`);
    soundFX.playQuestComplete();
    this.notify();
  }

  public claimDailyQuestReward(questId: string) {
    this.initQuestData();
    const qData = this.character.questData!;
    const quest = qData.dailyQuests.find(q => q.id === questId);
    if (!quest || !quest.isCompleted || quest.isClaimed) return;

    quest.isClaimed = true;
    this.character.exp += quest.rewardExp;
    this.character.gold += quest.rewardGold;
    if (quest.rewardIngot) this.character.ingot += quest.rewardIngot;

    this.addParticle(this.character.x, this.character.y, 'text_gold', `【领奖成功!】+${quest.rewardExp}经验 +${quest.rewardIngot || 0}元宝`);
    soundFX.playQuestComplete();
    this.notify();
  }

  // --- Achievement System Methods ---
  public initAchievementData() {
    if (!this.character.achievementStats) {
      this.character.achievementStats = {
        totalKills: 0,
        bossKills: 0,
        maxLevelReached: this.character.level || 1,
        forgeTimes: 0,
        totalGoldEarned: this.character.gold || 0,
        mapClears: 0
      };
    }
    if (!this.character.unlockedAchievementIds) this.character.unlockedAchievementIds = [];
    if (!this.character.claimedAchievementIds) this.character.claimedAchievementIds = [];
  }

  public trackAchievementProgress(type: keyof AchievementStats, delta: number = 1) {
    this.initAchievementData();
    const stats = this.character.achievementStats!;
    if (type === 'maxLevelReached') {
      stats.maxLevelReached = Math.max(stats.maxLevelReached, delta);
    } else {
      stats[type] += delta;
    }

    this.checkAchievements();
  }

  public checkAchievements() {
    this.initAchievementData();
    const stats = this.character.achievementStats!;
    const unlockedSet = new Set(this.character.unlockedAchievementIds || []);

    ACHIEVEMENT_DATABASE.forEach(ach => {
      if (unlockedSet.has(ach.id)) return;

      let currentVal = 0;
      if (ach.category === 'level') currentVal = stats.maxLevelReached;
      else if (ach.category === 'kill') currentVal = stats.totalKills;
      else if (ach.category === 'boss') currentVal = stats.bossKills;
      else if (ach.category === 'map') currentVal = stats.mapClears;
      else if (ach.category === 'forge') currentVal = stats.forgeTimes;
      else if (ach.category === 'gold') currentVal = stats.totalGoldEarned;

      if (currentVal >= ach.targetCount) {
        this.character.unlockedAchievementIds!.push(ach.id);
        this.addParticle(
          this.character.x,
          this.character.y,
          'text_gold',
          `🏆【成就达成!】${ach.titleBadge} 解锁称号 [${ach.titleName}]`
        );
        soundFX.playRareDrop();
      }
    });
  }

  public claimAchievementReward(achievementId: string) {
    this.initAchievementData();
    const unlocked = this.character.unlockedAchievementIds!.includes(achievementId);
    const claimed = this.character.claimedAchievementIds!.includes(achievementId);
    if (!unlocked || claimed) return;

    const ach = ACHIEVEMENT_DATABASE.find(a => a.id === achievementId);
    if (!ach) return;

    this.character.claimedAchievementIds!.push(achievementId);
    if (ach.rewardGold) this.character.gold += ach.rewardGold;
    if (ach.rewardIngot) this.character.ingot += ach.rewardIngot;

    this.recalculateStats();
    this.addParticle(
      this.character.x,
      this.character.y,
      'text_gold',
      `【成就领奖!】+${ach.rewardGold || 0}金币 +${ach.rewardIngot || 0}元宝`
    );
    soundFX.playQuestComplete();
    this.notify();
  }

  public equipTitle(achievementId: string | null) {
    this.initAchievementData();
    if (!achievementId) {
      this.character.equippedTitleId = null;
      this.character.title = '平民';
      this.recalculateStats();
      this.notify();
      return;
    }

    const unlocked = this.character.unlockedAchievementIds!.includes(achievementId);
    if (!unlocked) return;

    const ach = ACHIEVEMENT_DATABASE.find(a => a.id === achievementId);
    if (!ach) return;

    this.character.equippedTitleId = achievementId;
    this.character.title = `${ach.titleBadge} ${ach.titleName}`;
    this.recalculateStats();
    this.addParticle(
      this.character.x,
      this.character.y,
      'text_gold',
      `【佩戴称号】${ach.titleBadge} [${ach.titleName}]`
    );
    soundFX.playLevelUp();
    this.notify();
  }

  public organizeInventory() {
    const inventory = this.character.inventory;
    const items: Item[] = [];

    // Step 1: Stack identical consumables, materials, potions, and stackable items
    const stackableMap: Map<string, Item> = new Map();

    inventory.forEach(item => {
      if (!item) return;

      const isStackable = !item.slot || item.type === 'potion' || item.type === 'material' || item.type === 'book';

      if (isStackable) {
        const key = item.id || item.name;
        if (stackableMap.has(key)) {
          const existing = stackableMap.get(key)!;
          existing.count = (existing.count || 1) + (item.count || 1);
        } else {
          stackableMap.set(key, { ...item, count: item.count || 1 });
        }
      } else {
        items.push({ ...item });
      }
    });

    stackableMap.forEach(stackedItem => {
      items.push(stackedItem);
    });

    // Step 2: Sort items by Rarity (Equipment & Rare items first)
    const rarityRank: Record<string, number> = {
      mythic: 6,
      legendary: 5,
      epic: 4,
      rare: 3,
      uncommon: 2,
      common: 1
    };

    items.sort((a, b) => {
      // 1. Equipment vs Non-Equipment (Equipment first)
      const aIsEquip = a.slot ? 1 : 0;
      const bIsEquip = b.slot ? 1 : 0;
      if (aIsEquip !== bIsEquip) {
        return bIsEquip - aIsEquip;
      }

      // 2. Rarity rank (higher rarity first)
      const rA = rarityRank[a.rarity] || 0;
      const rB = rarityRank[b.rarity] || 0;
      if (rA !== rB) {
        return rB - rA;
      }

      // 3. Required Level (higher level first)
      if (a.reqLevel !== b.reqLevel) {
        return b.reqLevel - a.reqLevel;
      }

      // 4. Refine/Luck bonus score (higher first)
      const scoreA = (a.refineLevel || 0) + (a.luckLevel || 0);
      const scoreB = (b.refineLevel || 0) + (b.luckLevel || 0);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      // 5. Item Type
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }

      // 6. Name
      return a.name.localeCompare(b.name);
    });

    // Step 3: Re-fill 40 inventory slots
    const newInventory: (Item | null)[] = new Array(40).fill(null);
    for (let i = 0; i < Math.min(40, items.length); i++) {
      newInventory[i] = items[i];
    }

    this.character.inventory = newInventory;
    this.addParticle(this.character.x, this.character.y, 'text_gold', '【一键整理】背包物品已自动合并与排序！');
    soundFX.playLoot();
    this.notify();
  }

  public quickEquipPrompt: Item | null = null;
  
  public calculateItemScore(item: Item): number {
    if (!item) return 0;
    let score = 0;
    if (item.hpBonus) score += item.hpBonus * 0.5;
    if (item.mpBonus) score += item.mpBonus * 0.2;
    
    const pAtk = item.physAtkMax || 0;
    const mAtk = item.magAtkMax || 0;
    const tAtk = item.taoAtkMax || 0;
    score += Math.max(pAtk, mAtk, tAtk) * 15;
    
    const pDef = item.physDef || 0;
    const mDef = item.magDef || 0;
    score += (pDef + mDef) * 10;
    
    if (item.critChance) score += item.critChance * 1000;
    const luckVal = item.luckLevel || (item as any).luck || 0;
    score += luckVal * 50;
    if ((item as any).moveSpeedBonus) score += (item as any).moveSpeedBonus * 500;
    
    score += (item.refineLevel || 0) * 20;
    const rarityBonus: Record<string, number> = { common: 0, rare: 10, epic: 20, legendary: 50, mythic: 100 };
    score += rarityBonus[item.rarity || 'common'] || 0;
    return score;
  }

  public clearQuickEquipPrompt = () => {
    this.quickEquipPrompt = null;
    this.notify();
  };

  public getCandidateSlotsForItem(item: Item): EquipmentSlot[] {
    if (item.type === 'bracelet') {
      return ['braceletLeft', 'braceletRight'];
    }
    if (item.type === 'ring' || item.type === 'special_ring') {
      return ['ringLeft', 'ringRight'];
    }
    if (item.slot) {
      return [item.slot];
    }
    return [];
  }

  public getBestTargetSlotForItem(item: Item): { targetSlot: EquipmentSlot | null; isBetter: boolean } {
    if (item.reqLevel && this.character.level < item.reqLevel) {
      return { targetSlot: null, isBetter: false };
    }
    if (item.reqProfession && this.character.profession !== item.reqProfession) {
      return { targetSlot: null, isBetter: false };
    }

    const candidateSlots = this.getCandidateSlotsForItem(item);
    if (candidateSlots.length === 0) {
      return { targetSlot: null, isBetter: false };
    }

    // 1. First priority: check if ANY candidate slot is currently empty
    for (const slot of candidateSlots) {
      if (!this.character.equipment[slot]) {
        return { targetSlot: slot, isBetter: true };
      }
    }

    // 2. Second priority: all candidate slots are filled, find the slot where equipping item yields the biggest upgrade
    let minScore = Infinity;
    let minSlot = candidateSlots[0];
    let bestNewScore = 0;

    for (const slot of candidateSlots) {
      const equipped = this.character.equipment[slot];
      const score = equipped ? this.calculateItemScore(equipped) : 0;

      // Calculate potential score of item if equipped in this slot with inheritance
      const potentialRefine = Math.max(item.refineLevel || 0, equipped?.refineLevel || 0);
      const potentialLuck = Math.max(item.luckLevel || 0, equipped?.luckLevel || 0);
      const potentialItem = { ...item, refineLevel: potentialRefine, luckLevel: potentialLuck };
      const potentialScore = this.calculateItemScore(potentialItem);

      if (score < minScore) {
        minScore = score;
        minSlot = slot;
        bestNewScore = potentialScore;
      }
    }

    if (bestNewScore > minScore) {
      return { targetSlot: minSlot, isBetter: true };
    }

    return { targetSlot: candidateSlots[0], isBetter: false };
  }

  public equipItem(item: Item, inventoryIndex?: number, slotOverride?: EquipmentSlot): boolean {
    if (!item) return false;

    const { targetSlot } = this.getBestTargetSlotForItem(item);
    const equipSlot = slotOverride || targetSlot || item.slot;
    if (!equipSlot) return false;

    const currentEquip = this.character.equipment[equipSlot];

    // 装备与武器属性无损传承逻辑 (Weapon & Equipment Lossless Inheritance)
    let inheritanceMsg = '';
    if (currentEquip) {
      const oldRefine = currentEquip.refineLevel || 0;
      const oldLuck = currentEquip.luckLevel || 0;
      const newRefine = item.refineLevel || 0;
      const newLuck = item.luckLevel || 0;

      const targetRefine = Math.max(oldRefine, newRefine);
      const targetLuck = Math.max(oldLuck, newLuck);
      const legacyRefine = Math.min(oldRefine, newRefine);
      const legacyLuck = Math.min(oldLuck, newLuck);

      const refineInherited = targetRefine > newRefine;
      const luckInherited = targetLuck > newLuck;

      item.refineLevel = targetRefine;
      item.luckLevel = targetLuck;

      currentEquip.refineLevel = legacyRefine;
      currentEquip.luckLevel = legacyLuck;

      if (refineInherited || luckInherited) {
        const parts = [];
        if (refineInherited) parts.push(`强化+${targetRefine}`);
        if (luckInherited) parts.push(`幸运+${targetLuck}`);
        inheritanceMsg = `⚡【无损传承】成功继承原装备 ${parts.join(' ')}！`;
      }
    }

    // Equip item
    this.character.equipment[equipSlot] = item;

    // Swap currentEquip into inventory
    if (inventoryIndex !== undefined && inventoryIndex >= 0) {
      this.character.inventory[inventoryIndex] = currentEquip;
    } else if (currentEquip) {
      this.addItemToInventory(currentEquip);
    }

    if (this.quickEquipPrompt?.id === item.id) {
      this.clearQuickEquipPrompt();
    }

    this.recalculateStats();

    if (inheritanceMsg) {
      this.addParticle(this.character.x, this.character.y, 'text_gold', inheritanceMsg);
      soundFX.playLevelUp();
    } else {
      this.addParticle(this.character.x, this.character.y, 'text_gold', `穿戴 [${item.name}]`);
      soundFX.playGold();
    }

    this.notify();
    return true;
  }

  public checkQuickEquip(item: Item) {
    const { targetSlot, isBetter } = this.getBestTargetSlotForItem(item);
    if (isBetter && targetSlot) {
      this.quickEquipPrompt = { ...item, slot: targetSlot };
      this.notify();
    }
  }

  public addItemToInventory(item: Item): boolean {
    // 1. Try to stack with existing consumable/material item
    const isStackable = !item.slot || item.type === 'potion' || item.type === 'material' || item.type === 'book';
    if (isStackable) {
      const existingIdx = this.character.inventory.findIndex(
        i => i && (i.id === item.id || i.name === item.name)
      );
      if (existingIdx >= 0) {
        const existing = this.character.inventory[existingIdx]!;
        existing.count = (existing.count || 1) + (item.count || 1);
        this.notify();
        return true;
      }
    }

    // 2. Find empty slot
    let emptySlotIdx = this.character.inventory.findIndex(slot => slot === null);

    // 3. If full, trigger auto-recycle & auto-organize!
    if (emptySlotIdx < 0) {
      this.initAutoSettings();
      const settings = this.character.autoBattleSettings;
      if (settings && settings.autoRecycleEnabled && settings.autoRecycleOnFull) {
        this.autoRecycleEquipment(true);
      }
      this.organizeInventory();
      emptySlotIdx = this.character.inventory.findIndex(slot => slot === null);
    }

    if (emptySlotIdx >= 0) {
      this.character.inventory[emptySlotIdx] = { ...item };
      this.notify();
      return true;
    }

    this.addParticle(this.character.x, this.character.y, 'text_info', '【背包满】一键整理后无空位，请清理背包！');
    return false;
  }

  public subscribe(cb: () => void) {
    this.onStateChangeCallbacks.push(cb);
    return () => {
      this.onStateChangeCallbacks = this.onStateChangeCallbacks.filter(c => c !== cb);
    };
  }

  
  public getActiveSets(): import('../types/game').SetBonus[] {
    const setCounts: Record<string, number> = {};
    for (const key of Object.keys(this.character.equipment)) {
      const slot = key as import('../types/game').EquipmentSlot;
      const item = this.character.equipment[slot];
      if (item && item.setId) {
        setCounts[item.setId] = (setCounts[item.setId] || 0) + 1;
      }
    }
    
    const activeSets: import('../types/game').SetBonus[] = [];
    for (const [setId, count] of Object.entries(setCounts)) {
      const bonuses = SET_BONUSES[setId];
      if (bonuses) {
        if (count >= bonuses.requiredPieces) {
          activeSets.push(bonuses);
        }
      }
    }
    return activeSets;
  }

  public notify() {
    this.onStateChangeCallbacks.forEach(cb => cb());
  }

  public recalculateStats() {
    const prof = PROFESSIONS[this.character.profession];
    const lvl = this.character.level;

    
    let baseHp = prof.baseHp + (lvl - 1) * prof.hpPerLevel;
    let baseMp = prof.baseMp + (lvl - 1) * prof.mpPerLevel;

    // Wing Stats Calculation
    const wingLvl = this.character.wingLevel || 0;
    const wingTier = Math.floor(wingLvl / 10);
    baseHp += wingLvl * 100 + wingTier * 1000;
    baseMp += wingLvl * 50 + wingTier * 500;

    let physMin = prof.basePhysAtk[0] + Math.floor((lvl - 1) * 1.5) + wingLvl * 2 + wingTier * 25;
    let physMax = prof.basePhysAtk[1] + Math.floor((lvl - 1) * 2.5) + wingLvl * 5 + wingTier * 60;
    let magMin = prof.baseMagAtk[0] + Math.floor((lvl - 1) * 1.5) + wingLvl * 2 + wingTier * 25;
    let magMax = prof.baseMagAtk[1] + Math.floor((lvl - 1) * 2.5) + wingLvl * 5 + wingTier * 60;
    let taoMin = prof.baseTaoAtk[0] + Math.floor((lvl - 1) * 1.5) + wingLvl * 2 + wingTier * 25;
    let taoMax = prof.baseTaoAtk[1] + Math.floor((lvl - 1) * 2.5) + wingLvl * 5 + wingTier * 60;
    let physDef = prof.baseDef + Math.floor((lvl - 1) * 1.0) + wingLvl * 1 + wingTier * 15;
    let magDef = prof.baseMagDef + Math.floor((lvl - 1) * 0.8) + wingLvl * 1 + wingTier * 15;
    let crit = 0.05 + wingTier * 0.01; // 1% extra crit per tier
    let luck = 0 + Math.floor(wingTier / 2); // 1 extra luck per 2 tiers


    // Add Equipment bonuses
    const slots: EquipmentSlot[] = [
      'weapon', 'armor', 'helmet', 'necklace', 
      'ringLeft', 'ringRight', 'braceletLeft', 'braceletRight', 
      'belt', 'boots'
    ];

    slots.forEach(slot => {
      const eq = this.character.equipment[slot];
      if (eq) {
        physMin += eq.physAtkMin || 0;
        physMax += eq.physAtkMax || 0;
        magMin += eq.magAtkMin || 0;
        magMax += eq.magAtkMax || 0;
        taoMin += eq.taoAtkMin || 0;
        taoMax += eq.taoAtkMax || 0;
        physDef += eq.physDef || 0;
        magDef += eq.magDef || 0;
        baseHp += eq.hpBonus || 0;
        baseMp += eq.mpBonus || 0;
        if (eq.critChance) crit += eq.critChance;
        if (eq.luckLevel) luck += eq.luckLevel;

        // Add Refine Level Bonus
        if (eq.refineLevel) {
          physMin += eq.refineLevel * 3;
          physMax += eq.refineLevel * 8;
          magMin += eq.refineLevel * 3;
          magMax += eq.refineLevel * 8;
          taoMin += eq.refineLevel * 3;
          taoMax += eq.refineLevel * 8;
          physDef += eq.refineLevel * 2;
          magDef += eq.refineLevel * 2;
        }
      }
    });

    
    // Add Set Bonuses
    const activeSets = this.getActiveSets();
    for (const setBonus of activeSets) {
      if (setBonus.physAtkBonus) { physMin += setBonus.physAtkBonus; physMax += setBonus.physAtkBonus; }
      if (setBonus.magAtkBonus) { magMin += setBonus.magAtkBonus; magMax += setBonus.magAtkBonus; }
      if (setBonus.taoAtkBonus) { taoMin += setBonus.taoAtkBonus; taoMax += setBonus.taoAtkBonus; }
      if (setBonus.physDefBonus) { physDef += setBonus.physDefBonus; }
      if (setBonus.magDefBonus) { magDef += setBonus.magDefBonus; }
      if (setBonus.hpBonus) { baseHp += setBonus.hpBonus; }
      if (setBonus.mpBonus) { baseMp += setBonus.mpBonus; }
      if (setBonus.critChanceBonus) { crit += setBonus.critChanceBonus; }
    }

    // Add Achievement & Title Stat Bonuses
    this.initAchievementData();
    const claimedSet = new Set(this.character.claimedAchievementIds || []);
    const equippedTitle = this.character.equippedTitleId;

    ACHIEVEMENT_DATABASE.forEach(ach => {
      if (claimedSet.has(ach.id)) {
        const isEquipped = ach.id === equippedTitle;
        // Equipping a title boosts that achievement's stat bonus by +50%!
        const mult = isEquipped ? 1.5 : 1.0;

        if (ach.statBonus.maxHp) baseHp += Math.floor(ach.statBonus.maxHp * mult);
        if (ach.statBonus.physAtk) {
          physMin += Math.floor(ach.statBonus.physAtk * mult);
          physMax += Math.floor(ach.statBonus.physAtk * mult);
        }
        if (ach.statBonus.magAtk) {
          magMin += Math.floor(ach.statBonus.magAtk * mult);
          magMax += Math.floor(ach.statBonus.magAtk * mult);
        }
        if (ach.statBonus.taoAtk) {
          taoMin += Math.floor(ach.statBonus.taoAtk * mult);
          taoMax += Math.floor(ach.statBonus.taoAtk * mult);
        }
        if (ach.statBonus.physDef) physDef += Math.floor(ach.statBonus.physDef * mult);
        if (ach.statBonus.magDef) magDef += Math.floor(ach.statBonus.magDef * mult);
        if (ach.statBonus.critChance) crit += ach.statBonus.critChance * mult;
      }
    });

    // Add Mount Stat Buffs
    this.initMount();
    const mount = this.character.mount;
    let moveSpeedBonus = 0;
    if (mount) {
      const tierConfig = MOUNT_TIERS[mount.tier] || MOUNT_TIERS[1];
      const starMult = 1 + mount.level * 0.1; // +10% per star level
      physMin += Math.floor(tierConfig.physAtkBonus * starMult);
      physMax += Math.floor(tierConfig.physAtkBonus * starMult);
      magMin += Math.floor(tierConfig.magAtkBonus * starMult);
      magMax += Math.floor(tierConfig.magAtkBonus * starMult);
      taoMin += Math.floor(tierConfig.taoAtkBonus * starMult);
      taoMax += Math.floor(tierConfig.taoAtkBonus * starMult);
      baseHp += Math.floor(tierConfig.hpBonus * starMult);
      physDef += Math.floor(tierConfig.defBonus * starMult);
      magDef += Math.floor(tierConfig.defBonus * starMult);
      crit += tierConfig.critChanceBonus * starMult;

      if (mount.isMounted) {
        // Comfortable speed boost when mounted (+45% ~ +65% speed boost)
        moveSpeedBonus = 0.45 + (tierConfig.speedBonus * (1 + mount.level * 0.05));
      }
    }

    // Add Weather Stat Buff Multipliers
    const weatherInfo = WEATHER_DATABASE[this.currentWeather] || WEATHER_DATABASE.sunny;
    const wBonus = weatherInfo.statBonus;

    if (wBonus.physAtkMult) {
      physMin = Math.floor(physMin * wBonus.physAtkMult);
      physMax = Math.floor(physMax * wBonus.physAtkMult);
    }
    if (wBonus.magAtkMult) {
      magMin = Math.floor(magMin * wBonus.magAtkMult);
      magMax = Math.floor(magMax * wBonus.magAtkMult);
    }
    if (wBonus.taoAtkMult) {
      taoMin = Math.floor(taoMin * wBonus.taoAtkMult);
      taoMax = Math.floor(taoMax * wBonus.taoAtkMult);
    }
    if (wBonus.physDefMult) {
      physDef = Math.floor(physDef * wBonus.physDefMult);
    }
    if (wBonus.magDefMult) {
      magDef = Math.floor(magDef * wBonus.magDefMult);
    }
    if (wBonus.critChanceAdd) {
      crit += wBonus.critChanceAdd;
    }

    // Add Combo Crit Rate BUFF (+1.5% per combo hit, capped at +40%)
    const comboCritBonus = Math.min(0.40, Math.floor(this.comboCount * 0.015 * 1000) / 1000);
    crit += comboCritBonus;

    const totalAtk = Math.max(physMax, magMax, taoMax);
    const power = Math.floor(baseHp * 0.5 + totalAtk * 15 + (physDef + magDef) * 10 + lvl * 100 + this.character.rebirthLevel * 5000);

    const hpRatio = this.stats.maxHp > 0 ? this.stats.hp / this.stats.maxHp : 1;
    const mpRatio = this.stats.maxMp > 0 ? this.stats.mp / this.stats.maxMp : 1;

    this.stats = {
      hp: Math.min(baseHp, Math.floor(baseHp * hpRatio)),
      maxHp: baseHp,
      mp: Math.min(baseMp, Math.floor(baseMp * mpRatio)),
      maxMp: baseMp,
      physAtkMin: physMin,
      physAtkMax: physMax,
      magAtkMin: magMin,
      magAtkMax: magMax,
      taoAtkMin: taoMin,
      taoAtkMax: taoMax,
      physDef,
      magDef,
      critChance: Math.min(0.85, crit),
      luck,
      battlePower: power,
      comboCount: this.comboCount,
      comboCritBonus,
      moveSpeedBonus
    };

    if (this.stats.hp <= 0) this.stats.hp = this.stats.maxHp;
    if (this.stats.mp <= 0) this.stats.mp = this.stats.maxMp;
  }

  public setWeather(weather: WeatherType, isManual: boolean = false) {
    if (this.currentWeather === weather && !isManual) return;
    this.currentWeather = weather;
    this.lastWeatherCycleTime = Date.now();
    this.recalculateStats();

    const info = WEATHER_DATABASE[weather];
    if (info) {
      this.addParticle(
        this.character.x,
        this.character.y,
        'text_gold',
        `【天象变幻】转为 [${info.icon} ${info.name}]! ${info.buffText}`
      );
      if (weather === 'thunder') soundFX.playThunder();
      else if (weather === 'rain') soundFX.playLoot();
      else soundFX.playLevelUp();
    }
    this.notify();
  }

  private updateWeather(now: number) {
    if (now - this.lastWeatherCycleTime >= this.weatherCycleIntervalMs) {
      const allWeathers: WeatherType[] = ['sunny', 'rain', 'snow', 'sandstorm', 'thunder'];
      const available = allWeathers.filter(w => w !== this.currentWeather);
      const nextWeather = available[Math.floor(Math.random() * available.length)];
      this.setWeather(nextWeather, false);
    }
  }

  public changeMap(newMapId: string, targetX?: number, targetY?: number) {
    const map = MAP_DATABASE[newMapId];
    if (!map) return;
    this.currentMapId = newMapId;
    this.character.currentMapId = newMapId;

    // Dynamically trigger weather based on map region
    if (map.theme === 'stone_tomb' || map.theme === 'red_moon') {
      this.setWeather(Math.random() > 0.5 ? 'thunder' : 'snow', true); 
    } else if (map.theme === 'snake_valley') {
      this.setWeather(Math.random() > 0.5 ? 'rain' : 'sandstorm', true); 
    } else if (map.theme === 'sabak_castle') {
      this.setWeather('sandstorm', true); 
    } else {
      this.setWeather('sunny', true);
    }

    const spawnX = targetX ?? Math.floor(map.width / 2);
    const spawnY = targetY ?? Math.floor(map.height / 2);
    this.character.x = spawnX;
    this.character.y = spawnY;

    // Ensure player is not placed inside an obstacle
    if (this.isTileBlocked(this.character.x, this.character.y)) {
      this.character.x = spawnX + 2;
      this.character.y = spawnY + 2;
    }

    this.targetMonsterId = null;
    this.drops = [];
    this.spawnMonstersForMap(newMapId);

    if (map.guildTerritory) {
      this.triggerTerritoryBanner();
    }

    // Weather change on map switch
    if (newMapId.includes('desert') || newMapId.includes('sabak')) {
      this.setWeather('sandstorm');
    } else if (newMapId.includes('stone') || newMapId.includes('zuma') || newMapId.includes('chiyue')) {
      this.setWeather(Math.random() > 0.5 ? 'thunder' : 'rain');
    } else {
      const bichiWeathers: WeatherType[] = ['sunny', 'rain', 'snow'];
      this.setWeather(bichiWeathers[Math.floor(Math.random() * bichiWeathers.length)]);
    }

    this.trackAchievementProgress('mapClears', 1);
    this.notify();
  }

  public spawnMonstersForMap(mapId: string) {
    const map = MAP_DATABASE[mapId];
    if (!map) return;
    this.monsters = [];

    map.monsters.forEach(({ monsterTemplateId, count }) => {
      const template = MONSTER_TEMPLATES[monsterTemplateId];
      if (!template) return;

      for (let i = 0; i < count; i++) {
        let randX = Math.floor(Math.random() * (map.width - 6)) + 3;
        let randY = Math.floor(Math.random() * (map.height - 6)) + 3;

        // Ensure monster is not spawned inside blocked tile
        let tries = 0;
        while (this.isTileBlocked(randX, randY) && tries < 10) {
          randX = Math.floor(Math.random() * (map.width - 6)) + 3;
          randY = Math.floor(Math.random() * (map.height - 6)) + 3;
          tries++;
        }

        this.monsters.push({
          ...template,
          templateId: monsterTemplateId,
          id: `${monsterTemplateId}_${Date.now()}_${i}_${Math.random()}`,
          hp: template.maxHp,
          spawnTime: Date.now(),
          x: randX,
          y: randY,
          targetX: randX,
          targetY: randY,
          lastAtkTime: 0
        });
      }
    });

    if (map.bossSpawns) {
      map.bossSpawns.forEach((boss, idx) => {
        const template = MONSTER_TEMPLATES[boss.monsterTemplateId];
        if (template) {
          this.monsters.push({
            ...template,
            templateId: boss.monsterTemplateId,
            id: `boss_${boss.monsterTemplateId}_${idx}`,
            hp: template.maxHp,
            x: boss.x,
            y: boss.y,
            targetX: boss.x,
            targetY: boss.y,
            lastAtkTime: 0
          });
        }
      });
    }
  }

  public getNearbyPortal(maxDist = 3.5) {
    const map = MAP_DATABASE[this.currentMapId];
    if (!map || !map.portals) return null;

    let closest = null;
    let minDist = maxDist;

    for (const portal of map.portals) {
      const dist = Math.hypot(portal.x - this.character.x, portal.y - this.character.y);
      if (dist <= minDist) {
        minDist = dist;
        closest = portal;
      }
    }
    return closest;
  }

  public teleportToPortal(portal: { targetMapId: string; targetX: number; targetY: number; label: string }) {
    const targetMap = MAP_DATABASE[portal.targetMapId];
    if (!targetMap) return;

    // Check level requirement
    if (this.character.level < targetMap.reqLevel) {
      this.addParticle(this.character.x, this.character.y, 'text_crit', `❌ 等级不足！需 LV ${targetMap.reqLevel}`);
      return;
    }

    this.lastPortalTime = Date.now();
    this.changeMap(portal.targetMapId, portal.targetX, portal.targetY);
    this.addParticle(this.character.x, this.character.y, 'text_gold', `🌀 【传送】到达 ${targetMap.name}`);
    this.notify();
  }

  public getMonsterTypeId(m: Monster): string {
    if (m.templateId) return m.templateId;
    if (m.name.includes('鸡')) return 'chicken';
    if (m.name.includes('鹿')) return 'deer';
    if (m.name.includes('稻草')) return 'scarecrow';
    if (m.name.includes('蛇')) return 'snake';
    if (m.name.includes('猫')) return 'hook_cat';
    if (m.name.includes('骷髅') || m.name.includes('尸') || m.name.includes('僵')) return 'skeleton_warrior';
    if (m.name.includes('白野猪') || m.name.includes('猪')) return 'white_boar';
    if (m.name.includes('沃玛')) return 'woma_leader';
    if (m.name.includes('祖玛')) return 'zuma_leader';
    if (m.name.includes('赤月')) return 'red_moon_demon';
    if (m.name.includes('卫') || m.name.includes('禁卫')) return 'sabak_guard';
    return 'default';
  }

  public getWeaponType(): 'sword' | 'staff' | 'talisman' {
    const weapon = this.character.equipment.weapon;
    const profession = this.character.profession;
    if (weapon) {
      const name = weapon.name.toLowerCase();
      const id = weapon.id.toLowerCase();
      if (
        id.includes('fan') || 
        name.includes('扇') || 
        id.includes('talisman') || 
        name.includes('符') || 
        id.includes('wuji') || 
        name.includes('棍') || 
        id.includes('yinshe') || 
        name.includes('银蛇') || 
        name.includes('玄天')
      ) {
        return 'talisman';
      }
      if (id.includes('staff') || id.includes('wand') || name.includes('权杖') || name.includes('杖') || id.includes('soul_eater') || id.includes('bone_jade')) {
        return 'staff';
      }
      if (id.includes('sword') || id.includes('chopper') || id.includes('axe') || id.includes('blade') || id.includes('purgatory') || id.includes('slayer') || name.includes('剑') || name.includes('刀') || name.includes('斧') || name.includes('刃') || name.includes('裁决')) {
        return 'sword';
      }
      // Fallback by stats
      if ((weapon.physAtkMax || 0) > (weapon.magAtkMax || 0) && (weapon.physAtkMax || 0) > (weapon.taoAtkMax || 0)) {
        return 'sword';
      }
      if ((weapon.magAtkMax || 0) > (weapon.physAtkMax || 0) && (weapon.magAtkMax || 0) > (weapon.taoAtkMax || 0)) {
        return 'staff';
      }
      if ((weapon.taoAtkMax || 0) > (weapon.physAtkMax || 0) && (weapon.taoAtkMax || 0) > (weapon.magAtkMax || 0)) {
        return 'talisman';
      }
    }
    // Fallback to profession
    if (profession === 'warrior') return 'sword';
    if (profession === 'mage') return 'staff';
    if (profession === 'taoist') return 'talisman';
    return 'sword';
  }

  public getArmorClass(): 'heavy' | 'light' | 'robe' {
    const armor = this.character.equipment.armor;
    const profession = this.character.profession;
    if (armor) {
      const name = armor.name || '';
      if (
        name.includes('战甲') ||
        name.includes('盔') ||
        name.includes('重') ||
        name.includes('金属') ||
        name.includes('幽灵') ||
        name.includes('恶魔战甲')
      ) {
        return 'heavy';
      }
      if (
        name.includes('袍') ||
        name.includes('羽衣') ||
        name.includes('灵魂') ||
        name.includes('魔衣')
      ) {
        return 'robe';
      }
      if (
        name.includes('皮') ||
        name.includes('轻') ||
        name.includes('衣')
      ) {
        return 'light';
      }
    }
    if (profession === 'warrior') return 'heavy';
    if (profession === 'mage') return 'robe';
    return 'light';
  }

  public getMonsterCategory(m: Monster): 'beast' | 'humanoid' | 'undead' {
    const templateId = m.templateId || this.getMonsterTypeId(m);
    const name = m.name;
    
    // 1. Undead (亡灵)
    if (
      templateId === 'skeleton_warrior' ||
      templateId.includes('skeleton') ||
      templateId.includes('zombie') ||
      templateId.includes('ghost') ||
      name.includes('骷髅') ||
      name.includes('僵尸') ||
      name.includes('尸') ||
      name.includes('鬼') ||
      name.includes('亡灵') ||
      name.includes('骨') ||
      name.includes('幽灵')
    ) {
      return 'undead';
    }

    // 2. Beast (野兽)
    if (
      templateId === 'chicken' ||
      templateId === 'deer' ||
      templateId === 'snake' ||
      templateId === 'white_boar' ||
      templateId.includes('dragon') ||
      templateId.includes('boar') ||
      templateId.includes('beast') ||
      name.includes('鸡') ||
      name.includes('鹿') ||
      name.includes('蛇') ||
      name.includes('猪') ||
      name.includes('龙') ||
      name.includes('犬') ||
      name.includes('狼') ||
      name.includes('蜈蚣') ||
      name.includes('多角虫') ||
      name.includes('蛤蟆') ||
      name.includes('蝎') ||
      name.includes('兽') ||
      name.includes('白野猪')
    ) {
      return 'beast';
    }

    // 3. Humanoid (人形) - Default fallback
    return 'humanoid';
  }

  // Engine Update Loop (Run every ~50ms)
  public update(now: number) {
    // Failsafe: If character is somehow stuck in an obstacle or out of bounds (e.g. from a bad click teleport), nudge them out
    if (this.isTileBlocked(this.character.x, this.character.y)) {
      const map = MAP_DATABASE[this.currentMapId];
      if (map) {
         this.character.x = Math.max(2, Math.min(map.width - 3, this.character.x));
         this.character.y = Math.max(2, Math.min(map.height - 3, this.character.y));
         // If still blocked, just send to center
         if (this.isTileBlocked(this.character.x, this.character.y)) {
            this.character.x = Math.floor(map.width / 2);
            this.character.y = Math.floor(map.height / 2);
         }
      }
    }

    // Check Combo Decay
    if (this.comboCount > 0 && now - this.lastHitTime > this.comboTimeoutMs) {
      this.comboCount = 0;
      this.recalculateStats();
      this.notify();
    }

    // Check Portal stepping
    const map = MAP_DATABASE[this.currentMapId];
    if (map) {
      for (const portal of map.portals) {
        if (Math.hypot(portal.x - this.character.x, portal.y - this.character.y) < 1.0) {
          if (!this.lastPortalTime || now - this.lastPortalTime > 2500) {
            this.lastPortalTime = now;
            this.changeMap(portal.targetMapId, portal.targetX, portal.targetY);
            this.addParticle(this.character.x, this.character.y, 'text_gold', `🌀 【传送】${portal.label}`);
            break;
          }
        }
      }
    }

    this.updateWeather(now);
    this.updateMonsters(now);
    this.updateParticles(now);
    this.updateAutoBattle(now);
    this.updateQuestNavigation(now);
    this.checkCollisionsAndPickups();
  }

  private updateMonsters(now: number) {
    const map = MAP_DATABASE[this.currentMapId];
    if (!map) return;

    this.monsters.forEach(m => {
      if (m.hp <= 0) return;
      if (m.stunUntil && now < m.stunUntil) return; // Stunned monster cannot act

      // Boss Enrage Logic
      if (m.isBoss && (m.hp / m.maxHp) < 0.5 && !m.isEnraged) {
        m.isEnraged = true;
        m.atkCooldownMs = Math.max(500, m.atkCooldownMs * 0.7); // attack 30% faster
        m.speed = m.speed * 1.5; // move 50% faster
        m.physAtk = Math.floor(m.physAtk * 1.5); // 50% more damage
        
        this.addParticle(m.x, m.y, 'text_info', '【狂暴】进入暴走状态！');
        
        // Huge enrage burst VFX
        for (let i = 0; i < 8; i++) {
          this.addVfxParticle({
            x: m.x + (Math.random() - 0.5) * 2,
            y: m.y + (Math.random() - 0.5) * 2,
            vfxKind: 'fire_sword',
            color: '#dc2626'
          });
        }
      }

      // Intermittent Enrage VFX
      if (m.isEnraged && Math.random() < 0.03) {
        this.addParticle(m.x + (Math.random() - 0.5), m.y - 1 + (Math.random() - 0.5), 'damage_red', '💢');
      }

      // Determine Aggro Target
      const aggroPlayer = m.aggroPlayer || 0;
      const aggroPet = m.aggroPet || 0;
      let targetIsPet = false;

      // Base distances
      const distToPlayer = Math.hypot(this.character.x - m.x, this.character.y - m.y);
      let distToPet = 999;
      if (this.character.pet && this.character.pet.hp > 0) {
        distToPet = Math.hypot(this.character.pet.x - m.x, this.character.pet.y - m.y);
      }

      // If pet exists and has more aggro, or is significantly closer without player having much aggro
      if (this.character.pet && this.character.pet.hp > 0) {
        if (aggroPet > aggroPlayer * 1.5) {
          targetIsPet = true;
        } else if (aggroPet > 0 && aggroPlayer === 0) {
          targetIsPet = true;
        } else if (distToPet < distToPlayer - 2 && aggroPlayer < 50) {
          targetIsPet = true;
        }
      }

      const activeDist = targetIsPet ? distToPet : distToPlayer;
      const targetX = targetIsPet ? this.character.pet!.x : this.character.x;
      const targetY = targetIsPet ? this.character.pet!.y : this.character.y;

      const aggroRange = m.isBoss ? 8 : (aggroPlayer > 0 || aggroPet > 0 ? 12 : 5);

      if (activeDist <= m.attackRange) {
        // Attack Target
        if (m.isAttacking) {
          const windupTime = m.isBoss ? 600 : 400; // Longer windup for bosses
          if (now - (m.attackStartTime || 0) >= windupTime) {
            m.isAttacking = false;
            m.lastAtkTime = now;
            soundFX.playMonsterAttack(this.getMonsterTypeId(m));
            
            if (targetIsPet) {
              const dmg = Math.max(5, m.physAtk - this.character.pet!.def);
              this.character.pet!.hp = Math.max(0, this.character.pet!.hp - dmg);
              this.addParticle(this.character.pet!.x, this.character.pet!.y, 'damage_red', `-${dmg}`);
              if (this.character.pet!.hp <= 0) {
                this.addParticle(this.character.pet!.x, this.character.pet!.y, 'text_info', '神兽阵亡');
              }
            } else {
              this.monsterAttackPlayer(m, now);
            }
          }
        } else if (now - m.lastAtkTime >= m.atkCooldownMs) {
          // Start attack wind-up
          m.isAttacking = true;
          m.attackStartTime = now;
          if (m.isBoss) {
            // Add a visual tell for boss attacks
            this.addParticle(m.x, m.y, 'text_info', '❗');
          }
        }
      } else if (activeDist <= aggroRange && !map.isSafeZone) {
        // Cancel attack if target moved out of range
        m.isAttacking = false;
        
        // AI Logic: Move towards or kite
        let moveDir = 1; // 1 = towards, -1 = away

        // Kiting logic for ranged monsters
        if (m.attackRange > 2 && activeDist < m.attackRange - 1.5) {
          moveDir = -1; // back away
        }

        const dx = Math.sign(targetX - m.x) * 0.1 * m.speed * moveDir;
        const dy = Math.sign(targetY - m.y) * 0.1 * m.speed * moveDir;
        
        m.x = Math.max(1, Math.min(map.width - 1, m.x + dx));
        m.y = Math.max(1, Math.min(map.height - 1, m.y + dy));

        if (!m.lastMoveSoundTime || now - m.lastMoveSoundTime > 1200) {
          m.lastMoveSoundTime = now;
          soundFX.playMonsterMove(this.getMonsterTypeId(m));
        }
      }
    });

    // Update Pet actions
    if (this.character.pet && this.character.pet.hp > 0) {
      const pet = this.character.pet;
      // Follow player or attack target monster
      let targetM: Monster | null = null;
      if (this.targetMonsterId) {
        targetM = this.monsters.find(m => m.id === this.targetMonsterId && m.hp > 0) || null;
      }
      if (!targetM) {
        targetM = this.monsters.find(m => m.hp > 0 && Math.hypot(m.x - pet.x, m.y - pet.y) < 5) || null;
      }

      if (targetM) {
        const dist = Math.hypot(targetM.x - pet.x, targetM.y - pet.y);
        if (dist <= 1.5) {
          if (now - pet.lastAtkTime >= 1000) {
            pet.lastAtkTime = now;
            const dmg = Math.max(10, pet.atk - targetM.physDef);
            targetM.hp = Math.max(0, targetM.hp - dmg);
            targetM.aggroPet = (targetM.aggroPet || 0) + dmg;
            this.addParticle(targetM.x, targetM.y, 'damage_yellow', `狗子三昧真火 -${dmg}`);
            soundFX.playFire();
            if (targetM.hp <= 0) {
              this.onMonsterKilled(targetM);
            }
          }
        } else {
          // Move towards target
          pet.x += Math.sign(targetM.x - pet.x) * 0.12;
          pet.y += Math.sign(targetM.y - pet.y) * 0.12;
        }
      } else {
        // Follow player closely
        const distToPlayer = Math.hypot(this.character.x - pet.x, this.character.y - pet.y);
        if (distToPlayer > 1.5) {
          pet.x += Math.sign(this.character.x - pet.x) * 0.15;
          pet.y += Math.sign(this.character.y - pet.y) * 0.15;
        }
      }
    }
  }

  private monsterAttackPlayer(m: Monster, now: number) {
    m.aggroPlayer = (m.aggroPlayer || 0) + 100;
    let rawDmg = Math.max(2, m.physAtk - this.stats.physDef);

    // Trigger Monster / Boss Skill Attacks
    if (m.isBoss) {
      if (!m.lastBossSkillTime || now - m.lastBossSkillTime >= 3500) {
        m.lastBossSkillTime = now;
        rawDmg = this.executeBossUniqueSkill(m, rawDmg, now);
      } else {
        this.addVfxParticle({
          x: this.character.x,
          y: this.character.y,
          vfxKind: 'boss_smash',
          durationMs: 750,
          radius: 2.8
        });
      }
    } else {
      this.addVfxParticle({
        x: this.character.x,
        y: this.character.y,
        vfxKind: 'claw',
        durationMs: 450,
        angle: Math.atan2(this.character.y - m.y, this.character.x - m.x)
      });
    }

    // Check 护体神盾 Aegis Shield Mitigation
    if (now < this.aegisShieldUntil) {
      rawDmg = Math.max(1, Math.floor(rawDmg * 0.75));
      if (Math.random() < 0.40) {
        rawDmg = Math.max(1, Math.floor(rawDmg * 0.5));
        this.addParticle(this.character.x, this.character.y, 'damage_block', `🛡️【神盾格挡】 -${rawDmg}`);
      }
    }

    // Check Special Ring - 护身戒指 Bodyguard Ring (takes MP first)
    const ringR = this.character.equipment.ringRight;
    const ringL = this.character.equipment.ringLeft;
    const hasBodyguard = ringR?.specialEffect === 'bodyguard' || ringL?.specialEffect === 'bodyguard';

    if (hasBodyguard && this.stats.mp > 0) {
      if (this.stats.mp >= rawDmg) {
        this.stats.mp -= rawDmg;
        this.addParticle(this.character.x, this.character.y, 'damage_blue', `护身抵扣 -${rawDmg}MP`);
        return;
      } else {
        rawDmg -= this.stats.mp;
        this.stats.mp = 0;
      }
    }

    this.stats.hp = Math.max(0, this.stats.hp - rawDmg);
    this.addParticle(this.character.x, this.character.y, 'damage_player_hurt', `💔 -${rawDmg}`);
    soundFX.playPlayerHurt(this.character.profession, this.character.gender === 'female');

    // Check Player Death & 复活戒指 Resurrection Ring
    if (this.stats.hp <= 0) {
      const hasResurrection = ringR?.specialEffect === 'resurrection' || ringL?.specialEffect === 'resurrection';
      if (hasResurrection && now >= this.resurrectionCooldownEnd) {
        this.resurrectionCooldownEnd = now + 60000; // 60s CD
        this.stats.hp = this.stats.maxHp;
        this.stats.mp = this.stats.maxMp;
        this.addParticle(this.character.x, this.character.y, 'text_gold', '【复活戒指生效】满血满蓝原地复活！');
        soundFX.playLevelUp();
      } else {
        // Player Died -> Revive in Bichi City safe zone (60, 60)
        this.stats.hp = this.stats.maxHp;
        this.changeMap('bichi_city', 60, 60);
        this.addParticle(60, 60, 'text_info', '角色复活，返回比奇城安全区！');
      }
    }
  }

  private knockbackPlayer(fromX: number, fromY: number, dist: number = 2) {
    let dx = Math.sign(this.character.x - fromX);
    let dy = Math.sign(this.character.y - fromY);
    if (dx === 0 && dy === 0) { dx = (Math.random() > 0.5 ? 1 : -1); }
    const currentMapConfig = MAP_DATABASE[this.currentMapId];
    const mapW = currentMapConfig?.width || 30;
    const mapH = currentMapConfig?.height || 30;
    const targetX = Math.max(2, Math.min(mapW - 2, Math.round(this.character.x + dx * dist)));
    const targetY = Math.max(2, Math.min(mapH - 2, Math.round(this.character.y + dy * dist)));
    if (!this.isTileBlocked(targetX, targetY)) {
      this.character.x = targetX;
      this.character.y = targetY;
    }
  }

  private executeBossUniqueSkill(m: Monster, baseDmg: number, now: number): number {
    const templateId = m.templateId || '';
    const name = m.name;
    const hpRatio = m.hp / Math.max(1, m.maxHp);
    const isEnragedPhase = hpRatio <= 0.5;
    const currentMapConfig = MAP_DATABASE[this.currentMapId];
    const mapW = currentMapConfig?.width || 30;
    const mapH = currentMapConfig?.height || 30;

    if (templateId === 'white_boar' || name.includes('白野猪')) {
      if (isEnragedPhase) {
        this.addParticle(m.x, m.y, 'text_crit', '【白野猪】 💢 狂暴二阶段: 震地重踏击退！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'boss_smash', durationMs: 950, radius: 4.5 });
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'elemental_fire', durationMs: 800, radius: 3.5 });
        this.knockbackPlayer(m.x, m.y, 2);
        soundFX.playHit();
        return Math.floor(baseDmg * 1.8);
      } else {
        this.addParticle(m.x, m.y, 'text_crit', '【白野猪】 🐗 狂暴重碾践踏！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'savage_charge', durationMs: 800, radius: 2.5 });
        soundFX.playHit();
        return Math.floor(baseDmg * 1.4);
      }
    } 
    else if (templateId === 'woma_leader' || name.includes('沃玛')) {
      if (isEnragedPhase) {
        this.addParticle(m.x, m.y, 'text_crit', '【沃玛教主】 ⚡ 狂暴二阶段: 万雷天牢 & 召集卫队！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'elemental_thunder', durationMs: 1100, radius: 5.5 });
        this.addVfxParticle({ x: m.x, y: m.y, vfxKind: 'elemental_thunder', durationMs: 800, radius: 4.0 });
        this.knockbackPlayer(m.x, m.y, 2);
        soundFX.playThunder();
        if (this.monsters.length < 18) {
          for (let i = 0; i < 2; i++) {
            this.monsters.push({
              templateId: 'hook_cat',
              id: `woma_minion_${now}_${i}_${Math.random()}`,
              name: '沃玛教主狂暴卫士',
              level: 35,
              maxHp: 1500,
              hp: 1500,
              physAtk: 90,
              physDef: 30,
              magDef: 30,
              expReward: 600,
              goldReward: 1000,
              isBoss: false,
              color: '#a855f7',
              speed: 1.5,
              attackRange: 1,
              x: Math.max(2, Math.min(mapW - 2, m.x + (i === 0 ? 1 : -1))),
              y: Math.max(2, Math.min(mapH - 2, m.y + (i === 0 ? -1 : 1))),
              targetX: m.x,
              targetY: m.y,
              lastAtkTime: 0,
              atkCooldownMs: 1200,
              drops: [],
              iconSymbol: '😈'
            });
          }
        }
        return Math.floor(baseDmg * 2.2);
      } else {
        this.addParticle(m.x, m.y, 'text_crit', '【沃玛教主】 ⚡ 沃玛紫电狂轰！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'elemental_thunder', durationMs: 900, radius: 3.2 });
        soundFX.playThunder();
        return Math.floor(baseDmg * 1.5);
      }
    }
    else if (templateId === 'zuma_leader' || name.includes('祖玛')) {
      if (isEnragedPhase) {
        this.addParticle(m.x, m.y, 'text_crit', '【祖玛教主】 🔥 狂暴二阶段: 地火天崩熔岩狂暴！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'elemental_fire', durationMs: 1100, radius: 5.5 });
        this.addVfxParticle({ x: m.x, y: m.y, vfxKind: 'elemental_fire', durationMs: 1100, radius: 4.5 });
        this.knockbackPlayer(m.x, m.y, 2);
        soundFX.playFire();
        m.hp = Math.min(m.maxHp, m.hp + Math.floor(m.maxHp * 0.03));
        this.addParticle(m.x, m.y, 'heal_green', '【熔岩天甲】 🛡️ 恢复 3% 气血！');
        return Math.floor(baseDmg * 2.3);
      } else {
        this.addParticle(m.x, m.y, 'text_crit', '【祖玛教主】 🗿 祖玛熔岩天崩裂地！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'elemental_fire', durationMs: 1000, radius: 3.5 });
        soundFX.playFire();
        m.hp = Math.min(m.maxHp, m.hp + Math.floor(m.maxHp * 0.02));
        this.addParticle(m.x, m.y, 'heal_green', '【熔岩护甲】 🛡️ 恢复 2% 气血！');
        return Math.floor(baseDmg * 1.6);
      }
    }
    else if (templateId === 'red_moon_demon' || name.includes('赤月')) {
      if (isEnragedPhase) {
        this.addParticle(m.x, m.y, 'text_crit', '【赤月恶魔】 🩸 狂暴二阶段: 赤月血海狂怒击退！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'sky_slash', durationMs: 1200, radius: 6.5 });
        this.addVfxParticle({ x: m.x, y: m.y, vfxKind: 'sky_slash', durationMs: 800, radius: 4.5 });
        this.knockbackPlayer(m.x, m.y, 2);
        soundFX.playRareDrop();
        const finalDmg = Math.floor(baseDmg * 2.5);
        const leech = Math.floor(finalDmg * 0.35);
        m.hp = Math.min(m.maxHp, m.hp + leech);
        this.addParticle(m.x, m.y, 'heal_green', `🩸 赤月狂怒汲血 +${leech} HP`);
        return finalDmg;
      } else {
        this.addParticle(m.x, m.y, 'text_crit', '【赤月恶魔】 👁️ 赤月万刺 & 嗜血！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'sky_slash', durationMs: 1100, radius: 4.0 });
        soundFX.playRareDrop();
        const finalDmg = Math.floor(baseDmg * 1.7);
        const leech = Math.floor(finalDmg * 0.2);
        m.hp = Math.min(m.maxHp, m.hp + leech);
        this.addParticle(m.x, m.y, 'heal_green', `🩸 赤月汲血 +${leech} HP`);
        return finalDmg;
      }
    }
    else if (templateId === 'devil_lord' || name.includes('恶魔领主')) {
      if (isEnragedPhase) {
        this.addParticle(m.x, m.y, 'text_crit', '【恶魔领主】 🔥 狂暴二阶段: 地狱焚天毁灭震击！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'sun_chaser', durationMs: 1200, radius: 5.5 });
        this.addVfxParticle({ x: m.x, y: m.y, vfxKind: 'elemental_fire', durationMs: 900, radius: 4.0 });
        this.knockbackPlayer(m.x, m.y, 2);
        soundFX.playHit();
        return Math.floor(baseDmg * 2.6);
      } else {
        this.addParticle(m.x, m.y, 'text_crit', '【恶魔领主】 👿 灭世魔斩 & 地狱焚天！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'sun_chaser', durationMs: 1000, radius: 3.6 });
        soundFX.playHit();
        return Math.floor(baseDmg * 1.8);
      }
    }
    else if (templateId === 'dragon_god' || name.includes('龙神')) {
      if (isEnragedPhase) {
        this.addParticle(m.x, m.y, 'text_crit', '【极光龙神】 ❄️🔥 狂暴二阶段: 龙威咆哮震退 & 冰火暴轰！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'elemental_fire', durationMs: 1300, radius: 6.5 });
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'elemental_thunder', durationMs: 1300, radius: 5.5 });
        this.knockbackPlayer(m.x, m.y, 3);
        soundFX.playThunder();
        return Math.floor(baseDmg * 2.8);
      } else {
        this.addParticle(m.x, m.y, 'text_crit', '【极光龙神】 🐉 极光灭世龙息震天！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'elemental_fire', durationMs: 1200, radius: 4.5 });
        soundFX.playThunder();
        return Math.floor(baseDmg * 2.0);
      }
    }
    else if (templateId === 'abyss_lord' || name.includes('深渊魔神')) {
      if (isEnragedPhase) {
        this.addParticle(m.x, m.y, 'text_crit', '【深渊魔神】 🌀 狂暴二阶段: 时空撕裂虚空冲击！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'elemental_thunder', durationMs: 1400, radius: 7.0 });
        this.addVfxParticle({ x: m.x, y: m.y, vfxKind: 'boss_smash', durationMs: 1000, radius: 5.0 });
        this.knockbackPlayer(m.x, m.y, 3);
        soundFX.playHit();
        return Math.floor(baseDmg * 3.0);
      } else {
        this.addParticle(m.x, m.y, 'text_crit', '【深渊魔神】 👁️‍🗨️ 深渊毁灭黑洞！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'elemental_thunder', durationMs: 1200, radius: 5.0 });
        soundFX.playHit();
        return Math.floor(baseDmg * 2.2);
      }
    }
    else if (templateId === 'abyss_knight' || name.includes('骑士')) {
      if (isEnragedPhase) {
        this.addParticle(m.x, m.y, 'text_crit', '【深渊骑士】 💥 狂暴二阶段: 噬魂重踏狂暴击退！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'savage_charge', durationMs: 1000, radius: 5.8 });
        this.addVfxParticle({ x: m.x, y: m.y, vfxKind: 'boss_smash', durationMs: 800, radius: 4.0 });
        this.knockbackPlayer(m.x, m.y, 2);
        soundFX.playHit();
        return Math.floor(baseDmg * 2.4);
      } else {
        this.addParticle(m.x, m.y, 'text_crit', '【深渊骑士】 🏇 魇马踏碎 & 噬魂冲锋！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'savage_charge', durationMs: 900, radius: 3.0 });
        soundFX.playHit();
        return Math.floor(baseDmg * 1.8);
      }
    }
    else if (templateId === 'ancient_magic_dragon' || name.includes('魔龙')) {
      if (isEnragedPhase) {
        this.addParticle(m.x, m.y, 'text_crit', '【远古魔龙】 ⚡🔥 狂暴二阶段: 神魔天劫全屏击退！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'elemental_fire', durationMs: 1500, radius: 8.0 });
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'sky_slash', durationMs: 1000, radius: 6.0 });
        this.knockbackPlayer(m.x, m.y, 3);
        soundFX.playHit();
        return Math.floor(baseDmg * 3.5);
      } else {
        this.addParticle(m.x, m.y, 'text_crit', '【远古魔龙】 🐉 远古毁天灭地龙炎暴轰！');
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'elemental_fire', durationMs: 1300, radius: 5.0 });
        soundFX.playHit();
        return Math.floor(baseDmg * 2.5);
      }
    }
    else {
      if (isEnragedPhase) {
        this.addParticle(m.x, m.y, 'text_crit', `【${m.name}】 💢 狂暴姿态: 震退重压！`);
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'boss_smash', durationMs: 1000, radius: 5.0 });
        this.knockbackPlayer(m.x, m.y, 2);
        soundFX.playHit();
        return Math.floor(baseDmg * 2.0);
      } else {
        this.addParticle(m.x, m.y, 'text_crit', `【${m.name}】 💥 霸主暴强轰击！`);
        this.addVfxParticle({ x: this.character.x, y: this.character.y, vfxKind: 'boss_smash', durationMs: 900, radius: 3.2 });
        soundFX.playHit();
        return Math.floor(baseDmg * 1.5);
      }
    }
    return baseDmg;
  }

  public castSkill(skillId: string, targetMonsterId?: string) {
    const now = Date.now();
    const skill = this.character.skills.find(s => s.id === skillId);
    if (!skill) return;

    if (now - skill.lastCastTime < skill.cooldownMs) {
      return; // Skill in cooldown
    }

    if (this.stats.mp < skill.mpCost) {
      this.addParticle(this.character.x, this.character.y, 'text_info', '法力不足！');
      return;
    }

    this.stats.mp -= skill.mpCost;
    skill.lastCastTime = now;

    // Handle passive skills
    if (skill.isPassive) {
      return;
    }

    // Handle Aegis Shield
    if (skill.particleType === 'aegis_shield') {
      this.aegisShieldUntil = now + 25000;
      this.addVfxParticle({
        x: this.character.x,
        y: this.character.y,
        vfxKind: 'aegis_shield',
        durationMs: 2500
      });
      this.addParticle(this.character.x, this.character.y, 'text_gold', '【护体神盾】守护真气激活（25秒）！');
      soundFX.playLevelUp();
      return;
    }

    // Handle Savage Charge
    if (skill.particleType === 'savage_charge') {
      let targetM = this.monsters.find(m => m.id === targetMonsterId && m.hp > 0);
      if (!targetM && this.targetMonsterId) {
        targetM = this.monsters.find(m => m.id === this.targetMonsterId && m.hp > 0);
      }
      if (!targetM) {
        targetM = this.monsters
          .filter(m => m.hp > 0)
          .sort((a, b) => Math.hypot(a.x - this.character.x, a.y - this.character.y) - Math.hypot(b.x - this.character.x, b.y - this.character.y))[0];
      }
      if (!targetM) return;

      const dx = Math.sign(targetM.x - this.character.x) || 1;
      const dy = Math.sign(targetM.y - this.character.y) || 0;
      let nextX = this.character.x + dx * 2;
      let nextY = this.character.y + dy * 2;

      if (this.isTileBlocked(nextX, nextY)) {
        const recoil = Math.floor(this.stats.maxHp * 0.05);
        this.stats.hp = Math.max(1, this.stats.hp - recoil);
        this.addParticle(this.character.x, this.character.y, 'damage_red', `冲撞壁障! -${recoil}`);
      } else {
        this.character.x = nextX;
        this.character.y = nextY;
      }

      targetM.x += dx * 2;
      targetM.y += dy * 2;
      targetM.stunUntil = now + 1800;

      const angle = Math.atan2(dy, dx);
      this.addVfxParticle({
        x: targetM.x,
        y: targetM.y,
        startX: this.character.x,
        startY: this.character.y,
        vfxKind: 'savage_charge',
        durationMs: 650,
        angle
      });
      this.addParticle(targetM.x, targetM.y, 'text_gold', '【野蛮冲撞】撞飞眩晕！');
      
      const dmg = Math.max(10, Math.floor(this.stats.physAtkMax * skill.damageRatio) - targetM.physDef);
      targetM.hp = Math.max(0, targetM.hp - dmg);
      this.addParticle(targetM.x, targetM.y, 'damage_crit', `💥野蛮冲撞 -${dmg}`, 'warrior');
      soundFX.playWeaponHit(this.getWeaponType(), this.getMonsterCategory(targetM), true, false, this.getArmorClass());
      if (targetM.hp <= 0) this.onMonsterKilled(targetM);
      return;
    }

    // Handle Sky Slash
    if (skill.particleType === 'sky_slash') {
      let targetM = this.monsters.find(m => m.id === targetMonsterId && m.hp > 0);
      if (!targetM && this.targetMonsterId) {
        targetM = this.monsters.find(m => m.id === this.targetMonsterId && m.hp > 0);
      }
      if (!targetM) {
        targetM = this.monsters
          .filter(m => m.hp > 0)
          .sort((a, b) => Math.hypot(a.x - this.character.x, a.y - this.character.y) - Math.hypot(b.x - this.character.x, b.y - this.character.y))[0];
      }
      if (!targetM) return;

      const angle = Math.atan2(targetM.y - this.character.y, targetM.x - this.character.x);
      this.addVfxParticle({
        x: targetM.x,
        y: targetM.y,
        startX: this.character.x,
        startY: this.character.y,
        vfxKind: 'sky_slash',
        durationMs: 850,
        angle
      });

      const dx = targetM.x - this.character.x;
      const dy = targetM.y - this.character.y;
      const len = Math.hypot(dx, dy) || 1;
      const dirX = dx / len;
      const dirY = dy / len;

      let hitCount = 0;
      this.monsters.forEach(m => {
        if (m.hp <= 0) return;
        const mDx = m.x - this.character.x;
        const mDy = m.y - this.character.y;
        const dot = mDx * dirX + mDy * dirY;
        const perp = Math.abs(mDx * (-dirY) + mDy * dirX);
        if (dot >= 0 && dot <= 3.8 && perp <= 1.2) {
          hitCount++;
          const dmg = Math.max(15, Math.floor(this.stats.physAtkMax * skill.damageRatio) - m.physDef);
          m.hp = Math.max(0, m.hp - dmg);
          this.addParticle(m.x, m.y, 'damage_crit', `⚡【开天斩】 -${dmg}`, 'warrior');
          soundFX.playWeaponHit(this.getWeaponType(), this.getMonsterCategory(m), true, false, this.getArmorClass());
          if (m.hp <= 0) this.onMonsterKilled(m);
        }
      });
      if (hitCount > 0) this.registerComboHit(hitCount);
      return;
    }

    // Handle Sun Chaser
    if (skill.particleType === 'sun_chaser') {
      let targetM = this.monsters.find(m => m.id === targetMonsterId && m.hp > 0);
      if (!targetM && this.targetMonsterId) {
        targetM = this.monsters.find(m => m.id === this.targetMonsterId && m.hp > 0);
      }
      if (!targetM) {
        targetM = this.monsters
          .filter(m => m.hp > 0)
          .sort((a, b) => Math.hypot(a.x - this.character.x, a.y - this.character.y) - Math.hypot(b.x - this.character.x, b.y - this.character.y))[0];
      }
      if (!targetM) return;

      const angle = Math.atan2(targetM.y - this.character.y, targetM.x - this.character.x);
      const dx = targetM.x - this.character.x;
      const dy = targetM.y - this.character.y;
      const len = Math.hypot(dx, dy) || 1;
      const dirX = dx / len;
      const dirY = dy / len;

      const oldX = this.character.x;
      const oldY = this.character.y;

      let newX = oldX + Math.round(dirX * 3.5);
      let newY = oldY + Math.round(dirY * 3.5);
      if (!this.isTileBlocked(newX, newY)) {
        this.character.x = newX;
        this.character.y = newY;
      }

      this.addVfxParticle({
        x: this.character.x,
        y: this.character.y,
        startX: oldX,
        startY: oldY,
        vfxKind: 'sun_chaser',
        durationMs: 900,
        angle
      });

      let hitCount = 0;
      this.monsters.forEach(m => {
        if (m.hp <= 0) return;
        const mDx = m.x - oldX;
        const mDy = m.y - oldY;
        const dot = mDx * dirX + mDy * dirY;
        const perp = Math.abs(mDx * (-dirY) + mDy * dirX);
        if (dot >= 0 && dot <= 4.5 && perp <= 1.5) {
          hitCount++;
          const dmg = Math.max(20, Math.floor(this.stats.physAtkMax * skill.damageRatio) - m.physDef);
          m.hp = Math.max(0, m.hp - dmg);
          this.addParticle(m.x, m.y, 'damage_crit', `☀️【逐日剑法】 -${dmg}`, 'warrior');
          soundFX.playWeaponHit(this.getWeaponType(), this.getMonsterCategory(m), true, false, this.getArmorClass());
          if (m.hp <= 0) this.onMonsterKilled(m);
        }
      });
      if (hitCount > 0) this.registerComboHit(hitCount);
      return;
    }

    // Handle Skill Actions & VFX
    if (skill.particleType === 'heal') {
      const healAmount = Math.floor((this.stats.taoAtkMax || 20) * 2.2 + 50);
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + healAmount);
      this.addParticle(this.character.x, this.character.y, 'heal_green', `+${healAmount} HP`);
      this.addVfxParticle({
        x: this.character.x,
        y: this.character.y,
        vfxKind: 'heal_beam',
        durationMs: 900
      });
      soundFX.playHeal();

      if (this.character.pet) {
        this.character.pet.hp = Math.min(this.character.pet.maxHp, this.character.pet.hp + healAmount);
      }
      return;
    }

    if (skill.particleType === 'magic_shield') {
      this.addVfxParticle({
        x: this.character.x,
        y: this.character.y,
        vfxKind: 'shield',
        durationMs: 2500
      });
      this.addParticle(this.character.x, this.character.y, 'text_gold', '【魔法盾】气血结界激活！');
      soundFX.playLevelUp();
      return;
    }

    if (skill.particleType === 'summon_dog') {
      this.character.pet = {
        id: `pet_dog_${now}`,
        name: '【二转神兽】喷火兽',
        type: 'dog',
        hp: 3000 + this.character.level * 100,
        maxHp: 3000 + this.character.level * 100,
        atk: Math.floor(this.stats.taoAtkMax * 1.8) + 80,
        def: 50,
        x: this.character.x + 1,
        y: this.character.y + 1,
        lastAtkTime: 0
      };
      this.addVfxParticle({
        x: this.character.x + 1,
        y: this.character.y + 1,
        vfxKind: 'fire_sword',
        durationMs: 1000
      });
      this.addParticle(this.character.x, this.character.y, 'text_gold', '召唤三昧真火神兽成功！');
      soundFX.playLevelUp();
      return;
    }

    // Target Attack Skills
    let targetM = this.monsters.find(m => m.id === targetMonsterId && m.hp > 0);
    if (!targetM && this.targetMonsterId) {
      targetM = this.monsters.find(m => m.id === this.targetMonsterId && m.hp > 0);
    }
    if (!targetM) {
      // Find closest monster
      targetM = this.monsters
        .filter(m => m.hp > 0)
        .sort((a, b) => Math.hypot(a.x - this.character.x, a.y - this.character.y) - Math.hypot(b.x - this.character.x, b.y - this.character.y))[0];
    }

    if (!targetM) return;

    this.targetMonsterId = targetM.id;
    const skillAngle = Math.atan2(targetM.y - this.character.y, targetM.x - this.character.x);

    // Trigger Visual FX for specific skill types & elemental effects
    let elemType: 'fire' | 'ice' | 'lightning' | 'poison' | 'holy' | undefined;
    if (skill.particleType === 'fire_sword' || skill.particleType === 'firewall' || skill.name.includes('火') || skill.name.includes('开天') || skill.name.includes('逐日')) {
      elemType = 'fire';
    } else if (skill.particleType === 'ice_storm' || skill.name.includes('冰') || skill.name.includes('雪')) {
      elemType = 'ice';
    } else if (skill.particleType === 'thunderbolt' || skill.name.includes('雷') || skill.name.includes('电')) {
      elemType = 'lightning';
    } else if (skill.particleType === 'poison' || skill.name.includes('毒')) {
      elemType = 'poison';
    } else if (skill.particleType === 'soul_fire' || skill.name.includes('符') || skill.name.includes('治愈')) {
      elemType = 'holy';
    }

    if (elemType === 'fire') {
      this.addVfxParticle({
        x: targetM.x,
        y: targetM.y,
        vfxKind: 'elemental_fire',
        durationMs: 700
      });
    } else if (elemType === 'ice') {
      this.addVfxParticle({
        x: targetM.x,
        y: targetM.y,
        vfxKind: 'elemental_ice',
        durationMs: 800
      });
    } else if (elemType === 'lightning') {
      this.addVfxParticle({
        x: targetM.x,
        y: targetM.y,
        vfxKind: 'elemental_thunder',
        durationMs: 650
      });
    }

    if (skill.particleType === 'fire_sword') {
      this.addVfxParticle({
        x: targetM.x,
        y: targetM.y,
        startX: this.character.x,
        startY: this.character.y,
        vfxKind: 'fire_sword',
        durationMs: 700,
        angle: skillAngle
      });
    } else if (skill.particleType === 'crescent') {
      this.addVfxParticle({
        x: this.character.x,
        y: this.character.y,
        vfxKind: 'crescent',
        durationMs: 550,
        radius: skill.aoeRadius || 2.2,
        angle: skillAngle
      });
    } else if (skill.particleType === 'thunderbolt') {
      this.addVfxParticle({
        x: targetM.x,
        y: targetM.y,
        vfxKind: 'thunder',
        durationMs: 650
      });
    } else if (skill.particleType === 'ice_storm') {
      this.addVfxParticle({
        x: targetM.x,
        y: targetM.y,
        vfxKind: 'ice_storm',
        durationMs: 900,
        radius: skill.aoeRadius || 2.5
      });
    } else if (skill.particleType === 'poison') {
      this.addVfxParticle({
        x: targetM.x,
        y: targetM.y,
        vfxKind: 'poison',
        durationMs: 1100
      });
    } else if (skill.particleType === 'soul_fire') {
      this.addVfxParticle({
        x: targetM.x,
        y: targetM.y,
        startX: this.character.x,
        startY: this.character.y,
        vfxKind: 'talisman',
        durationMs: 550
      });
    } else {
      this.addVfxParticle({
        x: targetM.x,
        y: targetM.y,
        startX: this.character.x,
        startY: this.character.y,
        vfxKind: 'slash',
        durationMs: 450,
        angle: skillAngle
      });
    }

    // Calculate Damage
    let baseAtkRoll = 0;
    if (this.stats.luck >= 9) {
      // Guaranteed Max Atk on Luck+9
      baseAtkRoll = Math.max(this.stats.physAtkMax, this.stats.magAtkMax, this.stats.taoAtkMax);
    } else {
      const pRoll = Math.floor(Math.random() * (this.stats.physAtkMax - this.stats.physAtkMin + 1)) + this.stats.physAtkMin;
      const mRoll = Math.floor(Math.random() * (this.stats.magAtkMax - this.stats.magAtkMin + 1)) + this.stats.magAtkMin;
      const tRoll = Math.floor(Math.random() * (this.stats.taoAtkMax - this.stats.taoAtkMin + 1)) + this.stats.taoAtkMin;
      baseAtkRoll = Math.max(pRoll, mRoll, tRoll);
    }

    let finalDmg = Math.floor(baseAtkRoll * skill.damageRatio);
    const def = skill.profession === 'mage' ? targetM.magDef : targetM.physDef;
    finalDmg = Math.max(5, finalDmg - def);

    // Critical & Block Chance Roll
    const isCrit = Math.random() < this.stats.critChance;
    if (isCrit) {
      finalDmg = Math.floor(finalDmg * 1.8);
      this.addVfxParticle({
        x: targetM.x,
        y: targetM.y,
        vfxKind: 'spark_burst',
        durationMs: 500
      });
    }

    const isBlock = !isCrit && Math.random() < 0.12;
    if (isBlock) finalDmg = Math.max(2, Math.floor(finalDmg * 0.6));

    // Apply AoE if skill has radius
    if (skill.aoeRadius > 0) {
      let hitCount = 0;
      this.monsters.forEach(m => {
        if (m.hp <= 0) return;
        const dist = Math.hypot(m.x - targetM!.x, m.y - targetM!.y);
        if (dist <= skill.aoeRadius) {
          hitCount++;
          m.hp = Math.max(0, m.hp - finalDmg);
          m.aggroPlayer = (m.aggroPlayer || 0) + finalDmg;
          const pType = isCrit ? 'damage_crit' : isBlock ? 'damage_block' : 'damage_normal';
          const pText = isCrit ? `💥${skill.name}暴击! -${finalDmg}` : isBlock ? `🛡️格挡 -${finalDmg}` : `-${finalDmg}`;
          this.addParticle(m.x, m.y, pType, pText, skill.profession);
          
          const wType = this.getWeaponType();
          const mCat = this.getMonsterCategory(m);
          soundFX.playWeaponHit(wType, mCat, isCrit, isBlock, this.getArmorClass());
          soundFX.playMonsterHit(this.getMonsterTypeId(m));

          if (m.hp <= 0) this.onMonsterKilled(m);
        }
      });
      if (hitCount > 0) {
        this.registerComboHit(hitCount);
      }
    } else {
      targetM.hp = Math.max(0, targetM.hp - finalDmg);
      targetM.aggroPlayer = (targetM.aggroPlayer || 0) + finalDmg;
      const pType = isCrit ? 'damage_crit' : isBlock ? 'damage_block' : 'damage_normal';
      const pText = isCrit ? `💥${skill.name}暴击! -${finalDmg}` : isBlock ? `🛡️格挡 -${finalDmg}` : `-${finalDmg}`;
      this.addParticle(targetM.x, targetM.y, pType, pText, skill.profession);
      
      const wType = this.getWeaponType();
      const mCat = this.getMonsterCategory(targetM);
      soundFX.playWeaponHit(wType, mCat, isCrit, isBlock, this.getArmorClass());
      soundFX.playMonsterHit(this.getMonsterTypeId(targetM));

      this.registerComboHit(1);
      if (targetM.hp <= 0) this.onMonsterKilled(targetM);
    }

    // Play SFX
    soundFX.playSkillRelease(skill.profession, skill.particleType);

    // Special Ring Check - 麻痹戒指 Paralysis
    const ringL = this.character.equipment.ringLeft;
    const ringR = this.character.equipment.ringRight;
    if (ringL?.specialEffect === 'paralysis' || ringR?.specialEffect === 'paralysis') {
      if (Math.random() < 0.25 && targetM.hp > 0) {
        this.addParticle(targetM.x, targetM.y, 'text_gold', '【麻痹石化!】');
      }
    }
  }

  public attackTarget(monsterId: string) {
    const now = Date.now();
    const m = this.monsters.find(mon => mon.id === monsterId && mon.hp > 0);
    if (!m) return;

    this.targetMonsterId = monsterId;
    const dist = Math.hypot(m.x - this.character.x, m.y - this.character.y);

    const isMelee = this.character.profession === 'warrior';
    const maxAtkDist = isMelee ? 1.8 : 5.0;

    if (dist > maxAtkDist) {
      // Move closer smoothly without jumping walls
      const speedBonus = this.stats.moveSpeedBonus || 0;
      this.stepTowards(m.x, m.y, 0.055 * (1 + speedBonus));
      return;
    }

    // Standard Attack
    if (now - this.lastAutoAtkTime < 800) return;
    this.lastAutoAtkTime = now;

    let baseAtk = 0;
    if (this.stats.luck >= 9) {
      baseAtk = Math.max(this.stats.physAtkMax, this.stats.magAtkMax, this.stats.taoAtkMax);
    } else {
      baseAtk = Math.floor(Math.random() * (this.stats.physAtkMax - this.stats.physAtkMin + 1)) + this.stats.physAtkMin;
    }

    let dmg = Math.max(2, baseAtk - m.physDef);
    
    // Check 攻杀剑术 Passive Trigger
    const hasPowerSlash = this.character.skills.some(s => s.id === 'warrior_power_slash');
    let isPowerSlash = false;
    if (hasPowerSlash && Math.random() < 0.30) {
      isPowerSlash = true;
      dmg = Math.floor(dmg * 1.8);
    }

    const isCrit = Math.random() < this.stats.critChance;
    if (isCrit) {
      dmg = Math.floor(dmg * 1.5);
    }
    const isBlock = !isCrit && Math.random() < 0.15;
    if (isBlock) {
      dmg = Math.max(1, Math.floor(dmg * 0.5));
    }

    const atkAngle = Math.atan2(m.y - this.character.y, m.x - this.character.x);
    this.addVfxParticle({
      x: m.x,
      y: m.y,
      startX: this.character.x,
      startY: this.character.y,
      vfxKind: isPowerSlash ? 'power_slash' : (isCrit ? 'fire_sword' : 'slash'),
      durationMs: 400,
      angle: atkAngle
    });
    if (isCrit || isPowerSlash) {
      this.addVfxParticle({
        x: m.x,
        y: m.y,
        vfxKind: 'spark_burst',
        durationMs: 500
      });
    }

    m.hp = Math.max(0, m.hp - dmg);
    m.aggroPlayer = (m.aggroPlayer || 0) + dmg;
    const pType = (isPowerSlash || isCrit) ? 'damage_crit' : isBlock ? 'damage_block' : 'damage_normal';
    const pText = isPowerSlash ? `💥攻杀剑术! -${dmg}` : (isCrit ? `💥暴击 -${dmg}` : isBlock ? `🛡️格挡 -${dmg}` : `-${dmg}`);
    this.addParticle(m.x, m.y, pType, pText, this.character.profession);
    
    const wType = this.getWeaponType();
    const mCat = this.getMonsterCategory(m);
    soundFX.playWeaponHit(wType, mCat, isCrit, isBlock, this.getArmorClass());
    soundFX.playMonsterHit(this.getMonsterTypeId(m));

    this.registerComboHit(1);

    if (m.hp <= 0) {
      this.onMonsterKilled(m);
    }
  }

  private onMonsterKilled(m: Monster) {
    if (this.targetMonsterId === m.id) {
      this.targetMonsterId = null;
    }
    m.aggroPlayer = 0;
    m.deathTime = Date.now();
    soundFX.playMonsterDeath(this.getMonsterTypeId(m));
    this.registerComboHit(1);
    this.addVfxParticle({
      x: m.x,
      y: m.y,
      vfxKind: 'death',
      durationMs: 800
    });
    this.addParticle(m.x, m.y, 'text_gold', `+${m.expReward} EXP`);
    this.character.exp += m.expReward;
    this.character.gold += m.goldReward;

    // Track Achievement Stats
    this.trackAchievementProgress('totalKills', 1);
    if (m.isBoss) {
      this.trackAchievementProgress('bossKills', 1);
    }
    if (m.goldReward > 0) {
      this.trackAchievementProgress('totalGoldEarned', m.goldReward);
    }

    // Check quest progress
    this.checkMonsterKillQuests(m);

    // Check Level Up
    if (this.character.exp >= this.character.maxExp) {
      this.character.level += 1;
      this.character.exp -= this.character.maxExp;
      this.character.maxExp = Math.floor(this.character.maxExp * 1.35);
      this.trackAchievementProgress('maxLevelReached', this.character.level);
      this.recalculateStats();
      this.stats.hp = this.stats.maxHp;
      this.stats.mp = this.stats.maxMp;
      this.addParticle(this.character.x, this.character.y, 'text_gold', '【恭喜升级!】属性大幅提升！');
      soundFX.playLevelUp();
    }

    // Boss or Elite/Monster Mount Pill Drops
    const pillChance = m.isBoss ? 0.70 : 0.25;
    if (Math.random() <= pillChance) {
      const pillTemplate = ITEM_DATABASE['pill_mount_advance'];
      if (pillTemplate) {
        const dropX = Math.max(1, m.x + (Math.random() - 0.5) * 1.8);
        const dropY = Math.max(1, m.y + (Math.random() - 0.5) * 1.8);
        const count = m.isBoss ? Math.floor(Math.random() * 4) + 2 : Math.floor(Math.random() * 2) + 1;
        this.drops.push({
          id: `drop_pill_${Date.now()}_${Math.random()}`,
          item: { ...pillTemplate },
          startX: m.x,
          startY: m.y,
          x: dropX,
          y: dropY,
          animDurationMs: 500,
          count,
          dropTime: Date.now()
        });
        this.addParticle(m.x, m.y, 'text_gold', `【天降珍宝】掉落 [坐骑进阶丹] x${count}`);
      }
    }

    // Generate Drops
    m.drops.forEach(drop => {
      if (Math.random() <= drop.chance) {
        const itemTemplate = ITEM_DATABASE[drop.itemId];
        if (itemTemplate) {
          const isRare = ['rare', 'epic', 'legendary', 'mythic'].includes(itemTemplate.rarity);
          const dropX = Math.max(1, m.x + (Math.random() - 0.5) * 1.6);
          const dropY = Math.max(1, m.y + (Math.random() - 0.5) * 1.6);

          this.drops.push({
            id: `drop_${Date.now()}_${Math.random()}`,
            item: { ...itemTemplate },
            startX: m.x,
            startY: m.y,
            x: dropX,
            y: dropY,
            animDurationMs: 500,
            count: Math.floor(Math.random() * ((drop.countMax || 1) - (drop.countMin || 1) + 1)) + (drop.countMin || 1),
            dropTime: Date.now()
          });

          if (isRare) {
            soundFX.playRareDrop();
            const rarityTag = itemTemplate.rarity === 'mythic' ? '【神器神兵!】'
                            : itemTemplate.rarity === 'legendary' ? '【传说重宝!】'
                            : itemTemplate.rarity === 'epic' ? '【史诗爆装!】'
                            : '【稀有装备!】';
            this.addParticle(m.x, m.y, 'text_gold', `${rarityTag} 掉落 [${itemTemplate.name}]`);
          }
        }
      }
    });

    // Respawn Monster after timer
    setTimeout(() => {
      if (this.currentMapId === MAP_DATABASE[this.currentMapId]?.id) {
        const templateId = m.templateId || this.getMonsterTypeId(m);
        const template = MONSTER_TEMPLATES[templateId];
        if (template) {
          const map = MAP_DATABASE[this.currentMapId];
          const rx = Math.floor(Math.random() * (map.width - 4)) + 2;
          const ry = Math.floor(Math.random() * (map.height - 4)) + 2;
          m.hp = template.maxHp;
          m.spawnTime = Date.now();
          m.deathTime = undefined;
          soundFX.playMonsterSpawn();
          m.x = rx;
          m.y = ry;
        }
      }
    }, m.isBoss ? 20000 : 5000);
  }

  private updateAutoBattle(now: number) {
    this.initAutoSettings();
    const settings = this.character.autoBattleSettings;

    // 1. Check Auto Potions
    if (settings.enabled && (this.stats.hp / this.stats.maxHp) * 100 < settings.autoPotionHp) {
      const potIdx = this.character.inventory.findIndex(item => item?.type === 'potion');
      if (potIdx >= 0) {
        const item = this.character.inventory[potIdx];
        if (item) {
          this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 500);
          this.stats.mp = Math.min(this.stats.maxMp, this.stats.mp + 300);
          this.addParticle(this.character.x, this.character.y, 'heal_green', '+500 HP');
          soundFX.playPotion();
          if ((item.count || 1) > 1) {
            item.count! -= 1;
          } else {
            this.character.inventory[potIdx] = null;
          }
        }
      }
    }

    if (!settings.enabled) return;

    const speedBonus = this.stats.moveSpeedBonus || 0;
    const moveStep = 0.065 * (1 + speedBonus);
    const prevX = this.character.x;
    const prevY = this.character.y;

    // 2. Clear expired unreachable monster entries
    for (const [mId, expireTime] of this.unreachableMonsters.entries()) {
      if (now >= expireTime) {
        this.unreachableMonsters.delete(mId);
      }
    }

    // Filter living monsters excluding temporarily unreachable ones
    const livingMonsters = this.monsters.filter(
      m => m.hp > 0 && (!this.unreachableMonsters.has(m.id) || now >= this.unreachableMonsters.get(m.id)!)
    );

    // Active attacker check: any living monster that attacked player or is within close proximity
    const activeAttacker = livingMonsters
      .filter(m => {
        const dist = Math.hypot(m.x - this.character.x, m.y - this.character.y);
        return (m.aggroPlayer && m.aggroPlayer > 0) || dist <= (m.attackRange + 1.5) || dist <= 4.0;
      })
      .sort((a, b) => 
        Math.hypot(a.x - this.character.x, a.y - this.character.y) - 
        Math.hypot(b.x - this.character.x, b.y - this.character.y)
      )[0];

    let targetM: Monster | null = null;

    if (activeAttacker) {
      // Priority 1: Immediate counter-attack against monster attacking/threatening the player!
      targetM = activeAttacker;
      this.targetMonsterId = targetM.id;
    } else {
      // Priority 2: Find nearest living monster
      let currentTarget = this.targetMonsterId ? livingMonsters.find(m => m.id === this.targetMonsterId) : null;
      let closestMonster = livingMonsters
        .sort((a, b) => 
          Math.hypot(a.x - this.character.x, a.y - this.character.y) - 
          Math.hypot(b.x - this.character.x, b.y - this.character.y)
        )[0];

      if (closestMonster) {
        const closestDist = Math.hypot(closestMonster.x - this.character.x, closestMonster.y - this.character.y);
        const currentDist = currentTarget ? Math.hypot(currentTarget.x - this.character.x, currentTarget.y - this.character.y) : 999;

        // Switch to closest if no current target OR current target is dead/further away (> closest + 5.0) or > 15 tiles
        if (!currentTarget || currentDist > 15.0 || closestDist < currentDist - 5.0) {
          targetM = closestMonster;
          this.targetMonsterId = targetM.id;
        } else {
          targetM = currentTarget;
        }
      }
    }

    // 3. Auto-Loot Movement (Only for drops that pass user pickup settings, when no immediate monster threat within 3.5 tiles)
    const immediateThreat = targetM && Math.hypot(targetM.x - this.character.x, targetM.y - this.character.y) <= 3.5;
    if (!immediateThreat && settings.pickupEnabled && this.drops.length > 0) {
      const validDrops = this.drops.filter(d => now - d.dropTime >= 150 && this.isDropPickupEligible(d));
      if (validDrops.length > 0) {
        const closestDrop = validDrops.sort((a, b) => 
          Math.hypot(a.x - this.character.x, a.y - this.character.y) - 
          Math.hypot(b.x - this.character.x, b.y - this.character.y)
        )[0];

        const dropDist = Math.hypot(closestDrop.x - this.character.x, closestDrop.y - this.character.y);
        // If close enough to drop (<= 12 tiles), step directly onto it and leave immediately upon pickup
        if (dropDist <= 12.0 && dropDist > 0.4) {
          this.stepTowards(closestDrop.x, closestDrop.y, moveStep);
          if (this.character.x !== prevX || this.character.y !== prevY) {
            this.notify();
          }
          return;
        }
      }
    }

    // 4. Combat & Auto-Navigation towards monster
    if (targetM) {
      const dist = Math.hypot(targetM.x - this.character.x, targetM.y - this.character.y);
      const isMelee = this.character.profession === 'warrior';
      const idealDist = isMelee ? 1.0 : 3.5;
      const attackDistThreshold = isMelee ? 1.8 : 5.8;

      // Always step towards monster if outside ideal combat distance
      if (dist > idealDist) {
        const startX = this.character.x;
        const startY = this.character.y;
        this.stepTowards(targetM.x, targetM.y, moveStep);

        const movedDist = Math.hypot(this.character.x - startX, this.character.y - startY);

        // Stuck detection against obstacles/walls
        if (movedDist < 0.005) {
          this.autoStuckCount = (this.autoStuckCount || 0) + 1;
          if (this.autoStuckCount >= 6) { // ~100ms stuck
            this.unreachableMonsters.set(targetM.id, now + 4000); // temporary 4s blacklist
            this.targetMonsterId = null;
            this.autoStuckCount = 0;
          }
        } else {
          this.autoStuckCount = 0;
        }
      }

      // Cast best available skill or standard attack when within attack range
      if (dist <= attackDistThreshold) {
        const availableSkill = this.character.skills.find(
          s => !s.isPassive && now - s.lastCastTime >= s.cooldownMs && this.stats.mp >= s.mpCost
        );
        if (availableSkill) {
          this.castSkill(availableSkill.id, targetM.id);
        } else {
          this.attackTarget(targetM.id);
        }
      }
    } else {
      // 5. Smart Continuous Auto Patrol Search (Never freeze / pause!)
      const map = MAP_DATABASE[this.currentMapId];
      if (map) {
        if (!this.autoPatrolTarget) {
          // Find direction towards any living monster on the map
          const anyLivingMonster = this.monsters
            .filter(m => m.hp > 0)
            .sort((a, b) => 
              Math.hypot(a.x - this.character.x, a.y - this.character.y) - 
              Math.hypot(b.x - this.character.x, b.y - this.character.y)
            )[0];

          let foundTarget = false;
          if (anyLivingMonster) {
            const angle = Math.atan2(anyLivingMonster.y - this.character.y, anyLivingMonster.x - this.character.x);
            // Try steps along this angle at dist 12-16
            for (let d = 14; d >= 6; d -= 2) {
              const testAngle = angle + (Math.random() - 0.5) * 0.5;
              const tx = Math.max(3, Math.min(map.width - 4, Math.floor(this.character.x + Math.cos(testAngle) * d)));
              const ty = Math.max(3, Math.min(map.height - 4, Math.floor(this.character.y + Math.sin(testAngle) * d)));
              if (!this.isTileBlocked(tx, ty)) {
                this.autoPatrolTarget = { x: tx, y: ty };
                foundTarget = true;
                break;
              }
            }
          }

          if (!foundTarget) {
            // Pick a random unblocked waypoint in 8-16 tile radius
            for (let attempts = 0; attempts < 15; attempts++) {
              const randomAngle = Math.random() * Math.PI * 2;
              const randomDist = 8 + Math.random() * 8;
              const tx = Math.max(3, Math.min(map.width - 4, Math.floor(this.character.x + Math.cos(randomAngle) * randomDist)));
              const ty = Math.max(3, Math.min(map.height - 4, Math.floor(this.character.y + Math.sin(randomAngle) * randomDist)));
              if (!this.isTileBlocked(tx, ty)) {
                this.autoPatrolTarget = { x: tx, y: ty };
                break;
              }
            }
          }
          this.lastAutoPatrolTime = now;
        }

        if (this.autoPatrolTarget) {
          const startX = this.character.x;
          const startY = this.character.y;
          const reached = this.stepTowards(this.autoPatrolTarget.x, this.autoPatrolTarget.y, moveStep * 0.9);
          const movedDist = Math.hypot(this.character.x - startX, this.character.y - startY);

          // Immediately clear target if reached OR stuck against obstacle so a new search angle is chosen instantly!
          if (reached || movedDist < 0.005) {
            this.autoPatrolTarget = null;
          }
        }
      }
    }

    if (this.character.x !== prevX || this.character.y !== prevY) {
      this.notify();
    }
  }

  // Helper to determine if a ground drop is eligible for auto-pickup based on player settings
  public isDropPickupEligible(drop: DropItem): boolean {
    this.initAutoSettings();
    const settings = this.character.autoBattleSettings;
    if (!settings.pickupEnabled) return false;

    const item = drop.item;
    const equipmentTypes = ['weapon', 'armor', 'helmet', 'necklace', 'ring', 'bracelet', 'belt', 'boots', 'special_ring'];

    // Special items like mount pills are always eligible
    if (item.id === 'pill_mount_advance') return true;

    const isEquipment = equipmentTypes.includes(item.type);
    const isPotion = item.type === 'potion';
    const isMaterial = item.type === 'material' || item.type === 'book';
    const isGold = item.priceGold > 0 && !isEquipment && !isPotion && !isMaterial;

    // 1. Check Category Enable Settings
    if (isGold && !settings.pickupTypes.gold) return false;
    if (isPotion && !settings.pickupTypes.potion) return false;
    if (isMaterial && !settings.pickupTypes.material) return false;
    if (isEquipment && !settings.pickupTypes.equipment) return false;

    // 2. Check Equipment Rarity Settings
    if (isEquipment) {
      if (!settings.pickupRarities[item.rarity]) return false;
    }

    return true;
  }

  private checkCollisionsAndPickups() {
    this.initAutoSettings();
    const settings = this.character.autoBattleSettings;

    const now = Date.now();
    const equipmentTypes = ['weapon', 'armor', 'helmet', 'necklace', 'ring', 'bracelet', 'belt', 'boots', 'special_ring'];

    this.drops = this.drops.filter(drop => {
      // 1. 掉落物满1分钟（60000ms）未拾取则自动消失
      if (now - drop.dropTime >= 60000) {
        return false;
      }

      if (!settings.pickupEnabled) return true;

      // Don't auto-pickup while drop landing animation is playing
      if (now - drop.dropTime < 350) return true;

      const dist = Math.hypot(drop.x - this.character.x, drop.y - this.character.y);
      if (dist <= 1.5) {
        const item = drop.item;

        // Auto add mount pills directly into mount pill count
        if (item.id === 'pill_mount_advance') {
          this.initMount();
          const count = drop.count || 1;
          this.character.mount!.advancePillsCount += count;
          soundFX.playGold();
          this.addParticle(this.character.x, this.character.y, 'text_gold', `【获得丹药】 [坐骑进阶丹] x${count}！`);
          return false;
        }

        const isEquipment = equipmentTypes.includes(item.type);
        const isPotion = item.type === 'potion';
        const isMaterial = item.type === 'material' || item.type === 'book';
        const isGold = item.priceGold > 0 && !isEquipment && !isPotion && !isMaterial;

        // 1. Item Type Filtering
        if (isGold && !settings.pickupTypes.gold) return true;
        if (isPotion && !settings.pickupTypes.potion) return true;
        if (isMaterial && !settings.pickupTypes.material) return true;
        if (isEquipment && !settings.pickupTypes.equipment) return true;

        // 2. Equipment Quality Tier Filtering
        if (isEquipment) {
          const rarityAllowed = settings.pickupRarities[item.rarity];
          if (!rarityAllowed) {
            // Player chose to skip this equipment quality tier
            return true;
          }
        }

        // 3. Instant Auto-Recycle Check
        if (
          isEquipment &&
          settings.autoRecycleEnabled &&
          settings.autoRecycleInstant &&
          settings.autoRecycleRarities[item.rarity] &&
          (!settings.autoRecycleKeepOwnProfession || item.reqProfession !== this.character.profession)
        ) {
          const earnGold = item.recycleGold || 150;
          const earnExp = item.recycleExp || 500;
          this.character.gold += earnGold;
          this.character.exp += earnExp;
          this.trackAchievementProgress('totalGoldEarned', earnGold);
          this.addParticle(this.character.x, this.character.y, 'text_gold', `【即时分解】拾取 [${item.name}] +${earnGold}金`);
          soundFX.playGold();
          return false;
        }

        // 4. Try adding to inventory
        const added = this.addItemToInventory(item);
        if (added) {
          const equipmentTypes = ['weapon', 'armor', 'helmet', 'necklace', 'ring', 'bracelet', 'belt', 'boots', 'special_ring'];
          if (item.slot) {
            this.checkQuickEquip(item);
          }
          const isRare = ['rare', 'epic', 'legendary', 'mythic'].includes(item.rarity);
          if (isRare) {
            soundFX.playRareDrop();
            this.addParticle(this.character.x, this.character.y, 'text_gold', `【拾取极品】 [${item.name}]！`);
          } else {
            soundFX.playLoot();
            this.addParticle(this.character.x, this.character.y, 'text_gold', `拾取 [${item.name}]`);
          }
          return false; // Remove drop from ground
        }
        
        return true;
      }
      return true;
    });
  }

  private updateParticles(now: number) {
    this.particles = this.particles.filter(p => now - p.startTime < p.durationMs);
  }

  public addParticle(x: number, y: number, type: string, text: string, profession?: 'warrior' | 'mage' | 'taoist', elementalType?: 'fire' | 'ice' | 'lightning' | 'poison' | 'holy') {
    let combatCategory: 'normal' | 'crit' | 'block' | 'heal' | 'info' | 'player_hurt' = 'info';
    let color = '#38bdf8';
    let durationMs = 1200;

    if (type === 'damage_player_hurt') {
      combatCategory = 'player_hurt';
      color = '#f43f5e'; // Bright Rose / Crimson
      durationMs = 1300;
    } else if (type === 'damage_crit' || type === 'damage_gold' || type.includes('crit')) {
      combatCategory = 'crit';
      color = '#fbbf24'; // Gold / Yellow
      durationMs = 1450;
    } else if (type === 'damage_block' || type === 'damage_blue' || type.includes('block')) {
      combatCategory = 'block';
      color = '#38bdf8'; // Sky Blue / Cyan
      durationMs = 1250;
    } else if (type === 'damage_normal' || type === 'damage_red' || type === 'damage_yellow' || type.includes('damage')) {
      combatCategory = 'normal';
      color = '#f97316'; // Bright Flame Orange / Red
      durationMs = 1150;
    } else if (type.includes('heal') || type.includes('green')) {
      combatCategory = 'heal';
      color = '#34d399'; // Emerald Green
      durationMs = 1200;
    } else if (type.includes('gold')) {
      combatCategory = 'info';
      color = '#f59e0b';
    } else {
      combatCategory = 'info';
      color = '#38bdf8';
    }

    // Determine target profession for exclusive hit particle effects
    const prof = profession || (this.character ? this.character.profession : 'warrior');

    // Trigger profession-specific hit VFX simultaneously with damage numbers
    if (combatCategory === 'crit' || combatCategory === 'normal' || combatCategory === 'block') {
      const hitVfxKind: VfxKind = prof === 'mage' ? 'hit_mage' : prof === 'taoist' ? 'hit_taoist' : 'hit_warrior';
      this.addVfxParticle({
        x,
        y,
        vfxKind: hitVfxKind,
        durationMs: 600
      });
    }

    // Horizontal random jitter so overlapping floating text numbers fan out naturally
    const offsetRandomX = (Math.random() - 0.5) * 0.7;

    this.particles.push({
      id: `part_${Date.now()}_${Math.random()}`,
      x,
      y,
      type,
      startTime: Date.now(),
      durationMs,
      color,
      text,
      combatCategory,
      elementalType,
      profession: prof,
      offsetRandomX
    });
  }

  public addVfxParticle(params: {
    x: number;
    y: number;
    vfxKind: VfxKind;
    targetX?: number;
    targetY?: number;
    startX?: number;
    startY?: number;
    durationMs?: number;
    radius?: number;
    angle?: number;
    color?: string;
  }) {
    this.particles.push({
      id: `vfx_${Date.now()}_${Math.random()}`,
      x: params.x,
      y: params.y,
      type: `vfx_${params.vfxKind}`,
      startTime: Date.now(),
      durationMs: params.durationMs || 650,
      color: params.color || '#fbbf24',
      vfxKind: params.vfxKind,
      targetX: params.targetX,
      targetY: params.targetY,
      startX: params.startX,
      startY: params.startY,
      radius: params.radius,
      angle: params.angle
    });
  }

  public captureTargetMonster(): boolean {
    if (!this.targetMonsterId) {
      this.addParticle(this.character.x, this.character.y, 'text_info', '请先选中一个目标怪物！');
      return false;
    }
    const m = this.monsters.find(mon => mon.id === this.targetMonsterId && mon.hp > 0);
    if (!m) {
      this.addParticle(this.character.x, this.character.y, 'text_info', '怪物已死亡或不存在！');
      return false;
    }
    if (m.hp / m.maxHp > 0.3) {
      this.addParticle(this.character.x, this.character.y, 'text_info', '怪物生命值高于30%，捕捉失败！');
      return false;
    }
    if (m.isBoss) {
      this.addParticle(this.character.x, this.character.y, 'text_info', 'BOSS无法被捕捉！');
      return false;
    }

    // Capture success
    this.character.pet = {
      id: `pet_${Date.now()}`,
      name: m.name,
      type: m.templateId || 'dog',
      hp: m.maxHp,
      maxHp: m.maxHp,
      atk: Math.floor(m.physAtk * 1.5),
      def: Math.floor(m.physDef * 1.5),
      x: this.character.x - 1,
      y: this.character.y,
      lastAtkTime: 0,
      level: 1,
      exp: 0,
      maxExp: 1000,
      iconSymbol: m.iconSymbol,
      color: m.color
    };
    
    // Remove monster
    m.hp = 0;
    this.addParticle(m.x, m.y, 'text_gold', `成功捕捉: ${m.name}!`);
    this.targetMonsterId = null;
    this.notify();
    return true;
  }

  public feedPetExp(amount: number): boolean {
    if (!this.character.pet) {
      this.addParticle(this.character.x, this.character.y, 'text_info', '当前没有出战的宠物！');
      return false;
    }
    const pet = this.character.pet;
    pet.exp = (pet.exp || 0) + amount;
    pet.maxExp = pet.maxExp || 1000;
    pet.level = pet.level || 1;
    let leveledUp = false;
    while (pet.exp >= pet.maxExp) {
      pet.exp -= pet.maxExp;
      pet.level += 1;
      pet.maxExp = Math.floor(pet.maxExp * 1.5);
      pet.maxHp += 50;
      pet.atk += 10;
      pet.def += 5;
      pet.hp = pet.maxHp;
      leveledUp = true;
    }
    
    this.addParticle(pet.x, pet.y, 'heal_green', `宠物经验 +${amount}`);
    if (leveledUp) {
      this.addParticle(pet.x, pet.y, 'text_gold', `宠物升级! LV.${pet.level}`);
      soundFX.playLevelUp();
    }
    this.notify();
    return true;
  }

  public useInstantLevelUpPill(): boolean {
    const startLvl = this.character.level;
    const expNeeded = this.character.maxExp - this.character.exp;
    this.character.exp += expNeeded;

    while (this.character.exp >= this.character.maxExp) {
      this.character.level += 1;
      this.character.exp -= this.character.maxExp;
      this.character.maxExp = Math.floor(this.character.maxExp * 1.35);
      this.trackAchievementProgress('maxLevelReached', this.character.level);
    }

    this.recalculateStats();
    this.stats.hp = this.stats.maxHp;
    this.stats.mp = this.stats.maxMp;

    this.addParticle(this.character.x, this.character.y, 'text_gold', `【直升升级!】突破提升至 LV.${this.character.level}！`);
    this.addParticle(this.character.x, this.character.y, 'level_up', '⚡ 经验爆发 ⚡');
    soundFX.playLevelUp();
    this.notify();
    return true;
  }

  public getLevelUpPillPrice(level?: number): { price: number; tierName: string; reqLevelRange: string } {
    const currentLvl = level !== undefined ? level : this.character.level;
    if (currentLvl <= 20) {
      return { price: 50, tierName: '初级直升', reqLevelRange: 'LV.1-20' };
    } else if (currentLvl <= 35) {
      return { price: 150, tierName: '中级直升', reqLevelRange: 'LV.21-35' };
    } else if (currentLvl <= 50) {
      return { price: 500, tierName: '高级直升', reqLevelRange: 'LV.36-50' };
    } else if (currentLvl <= 65) {
      return { price: 1500, tierName: '特级直升', reqLevelRange: 'LV.51-65' };
    } else if (currentLvl <= 80) {
      return { price: 4000, tierName: '大师直升', reqLevelRange: 'LV.66-80' };
    } else if (currentLvl <= 100) {
      return { price: 10000, tierName: '宗师直升', reqLevelRange: 'LV.81-100' };
    } else {
      const extra = Math.floor((currentLvl - 100) / 10) * 10000;
      return { price: 20000 + extra, tierName: '巅峰直升', reqLevelRange: 'LV.100+' };
    }
  }

  public buyAndUseLevelUpPill(): boolean {
    const tierInfo = this.getLevelUpPillPrice();
    if (this.character.ingot < tierInfo.price) {
      this.addParticle(this.character.x, this.character.y, 'text_info', `元宝不足！当前阶梯需要 ${tierInfo.price.toLocaleString()} 元宝！`);
      return false;
    }
    this.character.ingot -= tierInfo.price;
    this.useInstantLevelUpPill();
    this.addParticle(this.character.x, this.character.y, 'text_gold', `【${tierInfo.tierName}】消耗 ${tierInfo.price.toLocaleString()} 元宝购买并使用了直升经验丹！`);
    return true;
  }

  // ==========================================
  // 邮件系统核心管理逻辑 (Mail System Core)
  // ==========================================

  public async refreshMails(): Promise<Mail[]> {
    try {
      const list = await fetchPlayerMails(
        this.character.id,
        this.character.name,
        this.character.uid
      );
      this.mails = list;
      this.notify();
      return list;
    } catch (e) {
      console.warn('refreshMails failed:', e);
      return this.mails;
    }
  }

  public hasUnreadMails(): boolean {
    return this.mails.some(m => !m.isRead || (!m.isClaimed && this.hasAttachment(m)));
  }

  public getUnreadMailsCount(): number {
    return this.mails.filter(m => !m.isRead || (!m.isClaimed && this.hasAttachment(m))).length;
  }

  public hasAttachment(mail: Mail): boolean {
    if (!mail.attachment) return false;
    const att = mail.attachment;
    if (att.gold && att.gold > 0) return true;
    if (att.ingot && att.ingot > 0) return true;
    if (att.expPills && att.expPills > 0) return true;
    if (att.items && att.items.length > 0) return true;
    return false;
  }

  public async markMailRead(mailId: string): Promise<void> {
    const target = this.mails.find(m => m.id === mailId);
    if (target) {
      target.isRead = true;
      this.notify();
      await markMailRead(this.character.id, mailId);
    }
  }

  public async claimMail(mailId: string): Promise<{ success: boolean; message: string }> {
    const mail = this.mails.find(m => m.id === mailId);
    if (!mail) {
      return { success: false, message: '邮件不存在！' };
    }
    if (mail.isClaimed) {
      return { success: false, message: '该邮件附件已领取！' };
    }
    if (!this.hasAttachment(mail)) {
      mail.isClaimed = true;
      mail.isRead = true;
      await markMailClaimed(this.character.id, mailId);
      this.notify();
      return { success: true, message: '邮件无附件，已确认查阅！' };
    }

    const att = mail.attachment!;
    
    // 检查背包空间需求
    let requiredSlots = 0;
    if (att.expPills && att.expPills > 0) {
      requiredSlots += 1;
    }
    if (att.items && Array.isArray(att.items)) {
      att.items.forEach(it => {
        const itemTemplate = it.customItem || ITEM_DATABASE[it.itemId];
        if (itemTemplate) {
          // 堆叠物品检查
          const stackable = itemTemplate.type === 'potion' || itemTemplate.type === 'material';
          if (stackable) {
            const existing = this.character.inventory.find(inv => inv && inv.id === itemTemplate.id);
            if (!existing) requiredSlots += 1;
          } else {
            requiredSlots += it.count || 1;
          }
        }
      });
    }

    const emptySlots = this.character.inventory.filter(slot => slot === null).length;
    if (emptySlots < requiredSlots) {
      this.addParticle(this.character.x, this.character.y, 'text_info', `背包空间不足！需要 ${requiredSlots} 格空位！`);
      return { success: false, message: `背包空间不足！领取附件至少需要 ${requiredSlots} 个空闲背包栏位！` };
    }

    // 发放奖励
    const gainedMessages: string[] = [];

    if (att.gold && att.gold > 0) {
      this.character.gold += att.gold;
      gainedMessages.push(`金币 +${att.gold.toLocaleString()}`);
    }

    if (att.ingot && att.ingot > 0) {
      this.character.ingot += att.ingot;
      gainedMessages.push(`元宝 +${att.ingot.toLocaleString()}`);
    }

    if (att.expPills && att.expPills > 0) {
      const pillTemplate = ITEM_DATABASE['pill_instant_levelup'];
      if (pillTemplate) {
        this.addItemToInventory({
          ...pillTemplate,
          count: att.expPills
        });
        gainedMessages.push(`直升经验丹 x${att.expPills}`);
      }
    }

    if (att.items && Array.isArray(att.items)) {
      att.items.forEach(it => {
        const baseItem = it.customItem || ITEM_DATABASE[it.itemId];
        if (baseItem) {
          const itemToAdd: Item = {
            ...baseItem,
            count: it.count || 1
          };
          this.addItemToInventory(itemToAdd);
          gainedMessages.push(`${baseItem.name} x${it.count || 1}`);
        }
      });
    }

    mail.isClaimed = true;
    mail.isRead = true;
    await markMailClaimed(this.character.id, mailId);

    const summary = gainedMessages.join('、');
    this.addParticle(this.character.x, this.character.y, 'text_gold', `【邮件附件领取】获得: ${summary}`);
    soundFX.playLoot();
    this.notify();

    return { success: true, message: `领取成功！获得：${summary}` };
  }

  public async claimAllMails(): Promise<{ success: boolean; claimedCount: number; message: string }> {
    const claimable = this.mails.filter(m => !m.isClaimed && this.hasAttachment(m));
    if (claimable.length === 0) {
      return { success: false, claimedCount: 0, message: '暂无可领取的邮件附件！' };
    }

    let successCount = 0;
    const gainedAll: string[] = [];

    for (const mail of claimable) {
      const res = await this.claimMail(mail.id);
      if (res.success) {
        successCount++;
        gainedAll.push(res.message);
      } else {
        // 如果背包满了中断
        break;
      }
    }

    this.notify();
    if (successCount === 0) {
      return { success: false, claimedCount: 0, message: '背包空间不足，未能成功领取邮件！' };
    }

    return {
      success: true,
      claimedCount: successCount,
      message: `已一键领取 ${successCount} 封邮件奖励！`
    };
  }

  public async deleteMail(mailId: string): Promise<boolean> {
    this.mails = this.mails.filter(m => m.id !== mailId);
    await deletePlayerMail(this.character.id, mailId);
    this.notify();
    return true;
  }

  public async deleteReadAndClaimedMails(): Promise<number> {
    const toDelete = this.mails.filter(m => m.isRead && (m.isClaimed || !this.hasAttachment(m)));
    for (const m of toDelete) {
      await this.deleteMail(m.id);
    }
    this.notify();
    return toDelete.length;
  }
}

