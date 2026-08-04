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
  AchievementStats
} from '../types/game';
import { MAP_DATABASE } from '../data/maps';
import { MONSTER_TEMPLATES } from '../data/monsters';
import { PROFESSIONS } from '../data/professions';
import { ITEM_DATABASE } from '../data/items';
import { MAIN_QUESTS, DAILY_QUESTS_TEMPLATES } from '../data/quests';
import { ACHIEVEMENT_DATABASE } from '../data/achievements';
import { WEATHER_DATABASE, WeatherType } from '../data/weather';
import { MOUNT_TIERS } from '../data/mounts';
import { soundFX } from '../utils/sound';

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
  public isAutoBattling: boolean = false;
  public lastAutoAtkTime: number = 0;
  public resurrectionCooldownEnd: number = 0;
  public lastPortalTime: number = 0;

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

  // Smooth navigation towards target with obstacle steering
  public stepTowards(tx: number, ty: number, stepSize: number = 0.055): boolean {
    const dx = tx - this.character.x;
    const dy = ty - this.character.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= 0.25) return true; // Reached target

    const actualStep = Math.min(stepSize, dist);
    const baseAngle = Math.atan2(dy, dx);

    // Angle probe offsets for steering around obstacles
    const angleOffsets = [
      0,
      Math.PI / 6, -Math.PI / 6,
      Math.PI / 3, -Math.PI / 3,
      Math.PI / 2, -Math.PI / 2,
      (2 * Math.PI) / 3, -(2 * Math.PI) / 3
    ];

    for (const offset of angleOffsets) {
      const angle = baseAngle + offset;
      const nx = this.character.x + Math.cos(angle) * actualStep;
      const ny = this.character.y + Math.sin(angle) * actualStep;

      if (!this.isTileBlocked(nx, ny)) {
        this.character.x = nx;
        this.character.y = ny;
        return false;
      }
    }

    // Fallback: try wall sliding on X or Y alone
    const tryX = this.character.x + Math.sign(dx) * actualStep * 0.7;
    if (!this.isTileBlocked(tryX, this.character.y)) {
      this.character.x = tryX;
      return false;
    }

    const tryY = this.character.y + Math.sign(dy) * actualStep * 0.7;
    if (!this.isTileBlocked(this.character.x, tryY)) {
      this.character.y = tryY;
      return false;
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

  constructor(characterData: CharacterData) {
    this.character = characterData;
    this.initMount();
    this.initQuestData();
    this.initAutoSettings();
    this.initCombatDisplaySettings();
    this.currentMapId = characterData.currentMapId || 'bichi_city';
    this.recalculateStats();
    this.spawnMonstersForMap(this.currentMapId);
    this.refreshSabakInfo();
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
  }

  public autoRecycleEquipment(isFullTrigger: boolean = false): number {
    this.initAutoSettings();
    const settings = this.character.autoBattleSettings;
    if (!settings.autoRecycleEnabled && !isFullTrigger) return 0;

    const equipmentTypes = ['weapon', 'armor', 'helmet', 'necklace', 'ring', 'bracelet', 'belt', 'boots'];

    let recycledCount = 0;
    let totalGold = 0;
    let totalIngot = 0;
    let totalExp = 0;

    this.character.inventory = this.character.inventory.map(item => {
      if (!item) return null;
      if (!equipmentTypes.includes(item.type)) return item;

      // Check rarity filter
      const shouldRecycleRarity = !!settings.autoRecycleRarities[item.rarity];
      if (!shouldRecycleRarity) return item;

      // Check profession filter
      if (settings.autoRecycleKeepOwnProfession && item.reqProfession === this.character.profession) {
        return item; // Keep player's own class equipment
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
      const emptyIdx = this.character.inventory.findIndex(s => s === null);
      if (emptyIdx >= 0) {
        this.character.inventory[emptyIdx] = { ...ITEM_DATABASE['blessing_oil'], count: 1 };
      }
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

  public notify() {
    this.onStateChangeCallbacks.forEach(cb => cb());
  }

  public recalculateStats() {
    const prof = PROFESSIONS[this.character.profession];
    const lvl = this.character.level;

    let baseHp = prof.baseHp + (lvl - 1) * prof.hpPerLevel + (this.character.wingLevel * 100);
    let baseMp = prof.baseMp + (lvl - 1) * prof.mpPerLevel + (this.character.wingLevel * 50);

    let physMin = prof.basePhysAtk[0] + Math.floor((lvl - 1) * 1.5);
    let physMax = prof.basePhysAtk[1] + Math.floor((lvl - 1) * 2.5);
    let magMin = prof.baseMagAtk[0] + Math.floor((lvl - 1) * 1.5);
    let magMax = prof.baseMagAtk[1] + Math.floor((lvl - 1) * 2.5);
    let taoMin = prof.baseTaoAtk[0] + Math.floor((lvl - 1) * 1.5);
    let taoMax = prof.baseTaoAtk[1] + Math.floor((lvl - 1) * 2.5);

    let physDef = prof.baseDef + Math.floor((lvl - 1) * 1.0);
    let magDef = prof.baseMagDef + Math.floor((lvl - 1) * 0.8);
    let crit = 0.05;
    let luck = 0;

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

  // Engine Update Loop (Run every ~50ms)
  public update(now: number) {
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

      // Dist to player
      const distToPlayer = Math.hypot(this.character.x - m.x, this.character.y - m.y);

      // Dist to Taoist pet
      let distToPet = 999;
      if (this.character.pet && this.character.pet.hp > 0) {
        distToPet = Math.hypot(this.character.pet.x - m.x, this.character.pet.y - m.y);
      }

      const aggroRange = m.isBoss ? 8 : 4;

      if (distToPet < distToPlayer && distToPet <= m.attackRange) {
        // Attack Pet
        if (now - m.lastAtkTime >= m.atkCooldownMs) {
          m.lastAtkTime = now;
          soundFX.playMonsterAttack(this.getMonsterTypeId(m));
          if (this.character.pet) {
            const dmg = Math.max(5, m.physAtk - this.character.pet.def);
            this.character.pet.hp = Math.max(0, this.character.pet.hp - dmg);
            this.addParticle(this.character.pet.x, this.character.pet.y, 'damage_red', `-${dmg}`);
            if (this.character.pet.hp <= 0) {
              this.addParticle(this.character.pet.x, this.character.pet.y, 'text_info', '神兽阵亡');
            }
          }
        }
      } else if (distToPlayer <= m.attackRange) {
        // Attack Player
        if (now - m.lastAtkTime >= m.atkCooldownMs) {
          m.lastAtkTime = now;
          soundFX.playMonsterAttack(this.getMonsterTypeId(m));
          this.monsterAttackPlayer(m, now);
        }
      } else if (distToPlayer <= aggroRange && !map.isSafeZone) {
        // Move towards player
        const dx = Math.sign(this.character.x - m.x) * 0.1 * m.speed;
        const dy = Math.sign(this.character.y - m.y) * 0.1 * m.speed;
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
    let rawDmg = Math.max(2, m.physAtk - this.stats.physDef);

    // Trigger Monster Hit VFX on Player
    if (m.isBoss) {
      this.addVfxParticle({
        x: this.character.x,
        y: this.character.y,
        vfxKind: 'boss_smash',
        durationMs: 750,
        radius: 2.8
      });
    } else {
      this.addVfxParticle({
        x: this.character.x,
        y: this.character.y,
        vfxKind: 'claw',
        durationMs: 450,
        angle: Math.atan2(this.character.y - m.y, this.character.x - m.x)
      });
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
    this.addParticle(this.character.x, this.character.y, 'damage_red', `-${rawDmg}`);
    soundFX.playHit();

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

    // Trigger Visual FX for specific skill types
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
          const pType = isCrit ? 'damage_crit' : isBlock ? 'damage_block' : 'damage_normal';
          const pText = isCrit ? `💥${skill.name}暴击! -${finalDmg}` : isBlock ? `🛡️格挡 -${finalDmg}` : `-${finalDmg}`;
          this.addParticle(m.x, m.y, pType, pText, skill.profession);
          if (m.hp <= 0) this.onMonsterKilled(m);
        }
      });
      if (hitCount > 0) {
        this.registerComboHit(hitCount);
      }
    } else {
      targetM.hp = Math.max(0, targetM.hp - finalDmg);
      const pType = isCrit ? 'damage_crit' : isBlock ? 'damage_block' : 'damage_normal';
      const pText = isCrit ? `💥${skill.name}暴击! -${finalDmg}` : isBlock ? `🛡️格挡 -${finalDmg}` : `-${finalDmg}`;
      this.addParticle(targetM.x, targetM.y, pType, pText, skill.profession);
      this.registerComboHit(1);
      if (targetM.hp <= 0) this.onMonsterKilled(targetM);
    }

    // Play SFX
    if (skill.particleType === 'thunderbolt') soundFX.playThunder();
    else if (skill.particleType === 'fire_sword') soundFX.playFire();
    else soundFX.playSwing();

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

    if (dist > 1.8) {
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
      vfxKind: isCrit ? 'fire_sword' : 'slash',
      durationMs: 400,
      angle: atkAngle
    });
    if (isCrit) {
      this.addVfxParticle({
        x: m.x,
        y: m.y,
        vfxKind: 'spark_burst',
        durationMs: 500
      });
    }

    m.hp = Math.max(0, m.hp - dmg);
    const pType = isCrit ? 'damage_crit' : isBlock ? 'damage_block' : 'damage_normal';
    const pText = isCrit ? `💥暴击 -${dmg}` : isBlock ? `🛡️格挡 -${dmg}` : `-${dmg}`;
    this.addParticle(m.x, m.y, pType, pText, this.character.profession);
    soundFX.playHit();
    this.registerComboHit(1);

    if (m.hp <= 0) {
      this.onMonsterKilled(m);
    }
  }

  private onMonsterKilled(m: Monster) {
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
          m.x = rx;
          m.y = ry;
        }
      }
    }, m.isBoss ? 20000 : 5000);
  }

  private updateAutoBattle(now: number) {
    // Check Auto Potions
    const hpPct = (this.stats.hp / this.stats.hp) * 100;
    if (this.character.autoBattleSettings.enabled && (this.stats.hp / this.stats.maxHp) * 100 < this.character.autoBattleSettings.autoPotionHp) {
      // Auto drink potion
      const potIdx = this.character.inventory.findIndex(item => item?.type === 'potion');
      if (potIdx >= 0) {
        const item = this.character.inventory[potIdx];
        if (item) {
          this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 500);
          this.stats.mp = Math.min(this.stats.maxMp, this.stats.mp + 300);
          this.addParticle(this.character.x, this.character.y, 'heal_green', '+500 HP');
          soundFX.playPotion();
          // Remove potion count or item
          if ((item.count || 1) > 1) {
            item.count! -= 1;
          } else {
            this.character.inventory[potIdx] = null;
          }
        }
      }
    }

    if (!this.character.autoBattleSettings.enabled) return;

    // Find target
    let targetM = this.monsters.find(m => m.id === this.targetMonsterId && m.hp > 0);
    if (!targetM) {
      targetM = this.monsters
        .filter(m => m.hp > 0)
        .sort((a, b) => Math.hypot(a.x - this.character.x, a.y - this.character.y) - Math.hypot(b.x - this.character.x, b.y - this.character.y))[0];
      if (targetM) this.targetMonsterId = targetM.id;
    }

    if (targetM) {
      // Cast best available skill or standard attack
      const availableSkill = this.character.skills.find(s => now - s.lastCastTime >= s.cooldownMs && this.stats.mp >= s.mpCost);
      if (availableSkill) {
        this.castSkill(availableSkill.id, targetM.id);
      } else {
        this.attackTarget(targetM.id);
      }
    }
  }

  private checkCollisionsAndPickups() {
    this.initAutoSettings();
    const settings = this.character.autoBattleSettings;

    const now = Date.now();
    const equipmentTypes = ['weapon', 'armor', 'helmet', 'necklace', 'ring', 'bracelet', 'belt', 'boots'];

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

        // 3. Find Inventory Slot
        let emptySlotIdx = this.character.inventory.findIndex(slot => slot === null);

        // If inventory is full, trigger auto-recycle (if enabled) and auto-organize!
        if (emptySlotIdx < 0) {
          if (settings.autoRecycleEnabled && settings.autoRecycleOnFull) {
            this.autoRecycleEquipment(true);
          }
          this.organizeInventory();
          emptySlotIdx = this.character.inventory.findIndex(slot => slot === null);
        }

        if (emptySlotIdx >= 0) {
          // Instant Auto-Recycle Check
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

          // Normal pickup store into inventory
          this.character.inventory[emptySlotIdx] = { ...item };
          const isRare = ['rare', 'epic', 'legendary', 'mythic'].includes(item.rarity);
          if (isRare) {
            soundFX.playRareDrop();
            this.addParticle(this.character.x, this.character.y, 'text_gold', `【拾取极品】 [${item.name}]！`);
          } else {
            soundFX.playLoot();
            this.addParticle(this.character.x, this.character.y, 'text_gold', `拾取 [${item.name}]`);
          }
          return false; // Remove drop from ground
        } else {
          this.addParticle(this.character.x, this.character.y, 'text_info', '背包已满！请清理或开启自动回收');
        }
      }
      return true;
    });
  }

  private updateParticles(now: number) {
    this.particles = this.particles.filter(p => now - p.startTime < p.durationMs);
  }

  public addParticle(x: number, y: number, type: string, text: string, profession?: 'warrior' | 'mage' | 'taoist') {
    let combatCategory: 'normal' | 'crit' | 'block' | 'heal' | 'info' = 'info';
    let color = '#38bdf8';
    let durationMs = 1200;

    if (type === 'damage_crit' || type === 'damage_gold' || type.includes('crit')) {
      combatCategory = 'crit';
      color = '#fbbf24'; // Gold / Yellow
      durationMs = 1450;
    } else if (type === 'damage_block' || type === 'damage_blue' || type.includes('block')) {
      combatCategory = 'block';
      color = '#38bdf8'; // Sky Blue / Cyan
      durationMs = 1250;
    } else if (type === 'damage_normal' || type === 'damage_red' || type === 'damage_yellow' || type.includes('damage')) {
      combatCategory = 'normal';
      color = '#ef4444'; // Bright Red
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
}
