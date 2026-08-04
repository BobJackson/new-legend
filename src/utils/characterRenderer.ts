import { CharacterData, Item } from '../types/game';

export interface DrawCharacterOptions {
  ctx: CanvasRenderingContext2D;
  px: number;
  py: number;
  playerCenterY: number;
  character: CharacterData;
  previewEquipment?: CharacterData['equipment'];
  now: number;
  scale?: number;
  isAttacking?: boolean;
  attackProgress?: number; // 0 to 1
  isMoving?: boolean;
  moveProgress?: number; // 0 to 1
  isMounted?: boolean;
  actionOverride?: 'idle' | 'walk' | 'attack' | 'cast';
}

/**
 * Renders an authentic Legend ARPG (热血传奇) Pixel Art character avatar with:
 * - Distinct Male (♂) vs Female (♀) body silhouettes, hairstyles, facial curves, and armor cuts
 * - Classic Legend professions: Warrior (战士), Mage (法师), Taoist (道士)
 * - Multi-frame action sequences:
 *     - Idle Breathing Cycle (待机帧 - 胸腔起伏 / 披风漂移 / 光效耀动)
 *     - Walk Running Cycle (行走帧 - 双腿交替踏步 / 躯干颠簸 / 手臂摆动)
 *     - Heavy Attack / Slash / Spell Casting Cycle (攻击/施法帧 - 蓄力 / 挥刀 / 半月烈火剑气 / 雷电火符)
 * - High equipment fidelity for weapons, helmets, armors, and glowing wings
 */
export function drawCharacterAvatar(options: DrawCharacterOptions) {
  const {
    ctx,
    px,
    py,
    playerCenterY,
    character,
    previewEquipment,
    now,
    scale = 1,
    isAttacking = false,
    attackProgress = 0,
    isMoving = false,
    moveProgress = 0,
    isMounted = false,
    actionOverride
  } = options;

  const prof = character.profession;
  const gender = character.gender || 'male';
  const isFemale = gender === 'female';

  const eq = previewEquipment || character.equipment;
  const armorItem = eq?.armor || null;
  const helmetItem = eq?.helmet || null;
  const weaponItem = eq?.weapon || null;

  // Determine current action state & animation frame
  let action: 'idle' | 'walk' | 'attack' | 'cast' = 'idle';

  if (actionOverride) {
    action = actionOverride;
  } else if (isAttacking) {
    action = prof === 'warrior' ? 'attack' : 'cast';
  } else if (isMoving) {
    action = 'walk';
  }

  // Animation frame timing & offsets
  let frameOffsetY = 0; // Body bobbing
  let legAngleL = 0;
  let legAngleR = 0;
  let armAngleL = 0;
  let armAngleR = 0;
  let capeSwayX = Math.sin(now * 0.004) * 2;
  let weaponAngle = -0.35;
  let weaponOffsetX = 0;
  let weaponOffsetY = 0;

  // ----------------------------------------------------
  // ACTION FRAME SEQUENCES (动作帧序列计算: 步战 vs 骑乘姿态)
  // ----------------------------------------------------
  if (isMounted) {
    // --------------------------------------------------
    // MOUNTED RIDING ACTION FRAMES (骑乘专用动作帧)
    // --------------------------------------------------
    // Straddled riding legs posture over saddle
    legAngleL = -32 + Math.sin(now * (isMoving ? 0.016 : 0.005)) * (isMoving ? 6 : 1.5);
    legAngleR = 32 - Math.sin(now * (isMoving ? 0.016 : 0.005)) * (isMoving ? 6 : 1.5);

    if (action === 'attack') {
      // Mounted heavy slash (马背挥刀劈砍)
      const prog = isAttacking ? attackProgress : ((now * 0.008) % 1);
      weaponAngle = -1.1 + prog * 2.2;
      weaponOffsetX = prog * 8;
      weaponOffsetY = -2 + prog * 4;
      frameOffsetY = -Math.sin(prog * Math.PI) * 4;
      capeSwayX = -8 + Math.sin(now * 0.02) * 12;
      armAngleR = -10 + prog * 40;
    } else if (action === 'cast') {
      // Mounted magic cast (马背法杖高举)
      const prog = isAttacking ? attackProgress : ((now * 0.006) % 1);
      weaponAngle = -0.9 + prog * 0.6;
      weaponOffsetY = -8;
      frameOffsetY = -3;
      capeSwayX = Math.sin(now * 0.01) * 8;
      armAngleL = -25;
      armAngleR = -30;
    } else if (isMoving) {
      // High-speed Gallop riding frames (高速疾驰奔袭帧)
      const gallopPhase = (now * 0.018) % (Math.PI * 2);
      frameOffsetY = Math.sin(gallopPhase) * 5 - 2;
      capeSwayX = Math.sin(gallopPhase) * 14 - 4; // Wind billowing back
      weaponAngle = -0.58 + Math.sin(gallopPhase) * 0.12;
      weaponOffsetY = -4;
      armAngleL = -20;
      armAngleR = 15;
    } else {
      // Idle Riding posture frames (马背待机律动)
      const rideIdle = Math.sin(now * 0.004);
      frameOffsetY = rideIdle * 2 - 1;
      capeSwayX = rideIdle * 4;
      weaponAngle = -0.42 + rideIdle * 0.05;
      armAngleL = -15;
      armAngleR = 10;
    }
  } else if (action === 'idle') {
    // 4-frame breathing sequence
    const idleFrame = Math.floor((now * 0.004) % 4);
    if (idleFrame === 1 || idleFrame === 3) frameOffsetY = -1;
    if (idleFrame === 2) frameOffsetY = -1.5;

    capeSwayX = Math.sin(now * 0.003) * 3;
    weaponAngle = -0.35 + Math.sin(now * 0.003) * 0.05;
  } else if (action === 'walk') {
    // 6-frame walking/running gait sequence
    const walkProgress = moveProgress || ((now * 0.008) % 1);
    const walkPhase = walkProgress * Math.PI * 2;

    legAngleL = Math.sin(walkPhase) * 12;
    legAngleR = -Math.sin(walkPhase) * 12;
    armAngleL = -Math.sin(walkPhase) * 15;
    armAngleR = Math.sin(walkPhase) * 15;

    frameOffsetY = -Math.abs(Math.sin(walkPhase)) * 2.5; // Step bounce
    capeSwayX = Math.sin(walkPhase) * 6;
    weaponAngle = -0.35 + Math.sin(walkPhase) * 0.15;
  } else if (action === 'attack') {
    // 6-frame heavy slash sequence (战士绝技重斩/半月/烈火)
    const prog = isAttacking ? attackProgress : ((now * 0.008) % 1);

    if (prog < 0.2) {
      // Windup backswing (蓄力)
      weaponAngle = -1.2;
      frameOffsetY = 1;
      armAngleR = -25;
    } else if (prog < 0.6) {
      // Powerful Forward Slash (重劈下斩)
      const slashNorm = (prog - 0.2) / 0.4; // 0 to 1
      weaponAngle = -1.2 + slashNorm * 2.2; // -1.2 to +1.0
      frameOffsetY = -1 + slashNorm * 2;
      armAngleR = 30 * slashNorm;
      weaponOffsetX = slashNorm * 6;
      weaponOffsetY = slashNorm * 4;
    } else {
      // Recovery follow-through
      weaponAngle = 0.8;
      frameOffsetY = 0;
    }
  } else if (action === 'cast') {
    // 6-frame spell cast sequence (法师/道士施法)
    const prog = isAttacking ? attackProgress : ((now * 0.006) % 1);

    if (prog < 0.3) {
      // Raise staff/fan high
      weaponAngle = -0.8;
      weaponOffsetY = -6;
      frameOffsetY = -2;
    } else if (prog < 0.7) {
      // Thrust magic forward
      weaponAngle = 0.2;
      weaponOffsetX = 8;
      weaponOffsetY = -2;
      frameOffsetY = 0;
    } else {
      weaponAngle = -0.3;
    }
  }

  ctx.save();
  ctx.translate(px, playerCenterY + frameOffsetY);
  if (scale !== 1) {
    ctx.scale(scale, scale);
  }

  // ----------------------------------------------------
  // 1. Flowing Back Cape / Cloak (霸气战袍 / 法袍披风)
  // ----------------------------------------------------
  const aName = armorItem?.name || '';
  let showCape = true;
  let capeColor1 = '#991b1b';
  let capeColor2 = '#450a0a';
  let capeBorder = '#f59e0b';

  if (aName.includes('布衣')) {
    showCape = false;
  } else if (aName.includes('战神') || aName.includes('圣战') || armorItem?.rarity === 'legendary') {
    capeColor1 = '#b91c1c';
    capeColor2 = '#7f1d1d';
    capeBorder = '#fef08a';
  } else if (aName.includes('沙城') || aName.includes('霸者') || armorItem?.rarity === 'mythic') {
    capeColor1 = '#d97706';
    capeColor2 = '#78350f';
    capeBorder = '#fde047';
  } else if (prof === 'mage') {
    capeColor1 = '#4c1d95';
    capeColor2 = '#1e1b4b';
    capeBorder = '#c084fc';
  } else if (prof === 'taoist') {
    capeColor1 = '#065f46';
    capeColor2 = '#022c22';
    capeBorder = '#6ee7b7';
  } else {
    if (prof === 'warrior') {
      capeColor1 = '#854d0e';
      capeColor2 = '#451a03';
    } else if (prof === 'mage') {
      capeColor1 = '#3730a3';
      capeColor2 = '#1e1b4b';
    } else {
      capeColor1 = '#047857';
      capeColor2 = '#022c22';
    }
  }

  if (showCape) {
    ctx.save();
    const capeGrad = ctx.createLinearGradient(0, -14, 0, 22);
    capeGrad.addColorStop(0, capeColor1);
    capeGrad.addColorStop(1, capeColor2);

    ctx.beginPath();
    const capeTopW = isFemale ? 9 : 12;
    const capeBottomW = isFemale ? 16 : 21;

    ctx.moveTo(-capeTopW, -12);
    ctx.lineTo(capeTopW, -12);
    ctx.lineTo(capeBottomW + capeSwayX, 23);
    ctx.lineTo(-capeBottomW + capeSwayX, 23);
    ctx.closePath();

    ctx.fillStyle = capeGrad;
    ctx.fill();
    ctx.strokeStyle = capeBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cape Inner Gold Trim Lines (披风纹路)
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(capeSwayX * 0.8, 22);
    ctx.strokeStyle = capeBorder;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }

  // ----------------------------------------------------
  // 2. Pixel Art Legs & Boots (双腿与高阶战靴 + 步态帧)
  // ----------------------------------------------------
  const legW = isFemale ? 4 : 5;
  const legDist = isFemale ? 3 : 4;
  const legY = 8;
  const bootH = 12;

  let legColor = '#1e293b';
  let bootColor = '#475569';
  let bootTrim = '#94a3b8';

  if (armorItem) {
    if (armorItem.rarity === 'legendary' || armorItem.rarity === 'mythic') {
      legColor = '#7f1d1d';
      bootColor = '#991b1b';
      bootTrim = '#fde047';
    } else if (armorItem.rarity === 'epic') {
      legColor = '#3b0764';
      bootColor = '#581c87';
      bootTrim = '#c084fc';
    } else if (armorItem.rarity === 'rare') {
      legColor = '#172554';
      bootColor = '#1e40af';
      bootTrim = '#60a5fa';
    }
  }

  // Left Leg (Left stride)
  ctx.save();
  ctx.translate(-legDist - legW / 2, legY);
  ctx.rotate((legAngleL * Math.PI) / 180);
  ctx.fillStyle = legColor;
  ctx.fillRect(-legW / 2, 0, legW, bootH);
  ctx.fillStyle = bootColor;
  ctx.fillRect(-legW / 2 - 1, 5, legW + 1, bootH - 5);
  ctx.fillStyle = bootTrim;
  ctx.fillRect(-legW / 2 - 1, bootH - 2, legW + 2, 2.5);
  ctx.restore();

  // Right Leg (Right stride)
  ctx.save();
  ctx.translate(legDist + legW / 2, legY);
  ctx.rotate((legAngleR * Math.PI) / 180);
  ctx.fillStyle = legColor;
  ctx.fillRect(-legW / 2, 0, legW, bootH);
  ctx.fillStyle = bootColor;
  ctx.fillRect(-legW / 2 - 1, 5, legW + 1, bootH - 5);
  ctx.fillStyle = bootTrim;
  ctx.fillRect(-legW / 2 - 1, bootH - 2, legW + 2, 2.5);
  ctx.restore();

  // ----------------------------------------------------
  // 3. Torso / Armor Body (男女区分盔甲/法袍裁切)
  // ----------------------------------------------------
  let armorPrimary = '#475569';
  let armorSecondary = '#1e293b';
  let armorTrim = '#e2e8f0';
  let isRobeStyle = prof === 'mage' || prof === 'taoist' || aName.includes('衣') || aName.includes('袍');

  if (aName.includes('布衣')) {
    armorPrimary = isFemale ? '#be185d' : '#854d0e';
    armorSecondary = isFemale ? '#831843' : '#451a03';
    armorTrim = '#fde047';
  } else if (aName.includes('重型') || aName.includes('战神') || aName.includes('圣战')) {
    armorPrimary = '#b91c1c';
    armorSecondary = '#7f1d1d';
    armorTrim = '#fde047';
  } else if (aName.includes('沙城') || aName.includes('霸者')) {
    armorPrimary = '#d97706';
    armorSecondary = '#78350f';
    armorTrim = '#fef08a';
  } else if (aName.includes('恶魔') || aName.includes('法神') || aName.includes('烈焰')) {
    armorPrimary = '#6b21a8';
    armorSecondary = '#3b0764';
    armorTrim = '#e879f9';
  } else if (aName.includes('幽灵') || aName.includes('天尊') || aName.includes('光芒')) {
    armorPrimary = '#047857';
    armorSecondary = '#022c22';
    armorTrim = '#6ee7b7';
  } else if (armorItem) {
    if (armorItem.rarity === 'legendary' || armorItem.rarity === 'mythic') {
      armorPrimary = '#dc2626';
      armorSecondary = '#7f1d1d';
      armorTrim = '#f59e0b';
    } else if (armorItem.rarity === 'epic') {
      armorPrimary = '#7e22ce';
      armorSecondary = '#4c1d95';
      armorTrim = '#c084fc';
    } else if (armorItem.rarity === 'rare') {
      armorPrimary = '#2563eb';
      armorSecondary = '#1e3a8a';
      armorTrim = '#60a5fa';
    }
  } else {
    if (prof === 'warrior') {
      armorPrimary = isFemale ? '#991b1b' : '#854d0e';
      armorSecondary = isFemale ? '#450a0a' : '#451a03';
      armorTrim = '#f59e0b';
    } else if (prof === 'mage') {
      armorPrimary = isFemale ? '#7e22ce' : '#3730a3';
      armorSecondary = isFemale ? '#3b0764' : '#1e1b4b';
      armorTrim = '#a5b4fc';
    } else {
      armorPrimary = isFemale ? '#0f766e' : '#065f46';
      armorSecondary = isFemale ? '#134e4a' : '#022c22';
      armorTrim = '#6ee7b7';
    }
  }

  // Male vs Female Torso Dimensions & Curves
  const shoulderW = isFemale ? 10 : 13;
  const waistW = isFemale ? 6 : 8.5;
  const skirtW = isFemale ? 12 : 9.5;

  ctx.beginPath();
  if (isRobeStyle) {
    // Flowing Robe Silhouette
    ctx.moveTo(-shoulderW, -12);
    ctx.lineTo(shoulderW, -12);
    ctx.lineTo(skirtW + 2, 12);
    ctx.lineTo(-skirtW - 2, 12);
  } else {
    // Heavy Heroic Armor Plate
    ctx.moveTo(-shoulderW, -12);
    ctx.lineTo(shoulderW, -12);
    ctx.lineTo(waistW, 8);
    ctx.lineTo(-waistW, 8);
  }
  ctx.closePath();

  const chestGrad = ctx.createLinearGradient(-shoulderW, -12, shoulderW, 12);
  chestGrad.addColorStop(0, armorPrimary);
  chestGrad.addColorStop(1, armorSecondary);
  ctx.fillStyle = chestGrad;
  ctx.fill();

  ctx.strokeStyle = armorTrim;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Female Chest Cutouts vs Male Heavy V-Chest
  if (isFemale) {
    ctx.beginPath();
    ctx.moveTo(-shoulderW + 2, -10);
    ctx.quadraticCurveTo(0, -3, shoulderW - 2, -10);
    ctx.strokeStyle = armorTrim;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-5, -10);
    ctx.lineTo(0, -2);
    ctx.lineTo(5, -10);
    ctx.strokeStyle = armorTrim;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Heavy Gold Belt & Gem Buckle
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-waistW - 1, 2, (waistW + 1) * 2, 3.5);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(-3, 1, 6, 5.5);
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-3, 1, 6, 5.5);

  // ----------------------------------------------------
  // 4. Shoulder Pauldrons (霸气肩甲与肩刺)
  // ----------------------------------------------------
  const shoulderRadius = isFemale ? 5 : 6.5;

  // Left Shoulder
  ctx.beginPath();
  ctx.arc(-shoulderW, -9, shoulderRadius, 0, Math.PI * 2);
  ctx.fillStyle = armorPrimary;
  ctx.fill();
  ctx.strokeStyle = armorTrim;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Right Shoulder
  ctx.beginPath();
  ctx.arc(shoulderW, -9, shoulderRadius, 0, Math.PI * 2);
  ctx.fillStyle = armorPrimary;
  ctx.fill();
  ctx.strokeStyle = armorTrim;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // High Rarity Shoulder Spikes / Dragon Horns (高阶肩刺)
  if (armorItem && (armorItem.rarity === 'epic' || armorItem.rarity === 'legendary' || armorItem.rarity === 'mythic')) {
    ctx.beginPath();
    ctx.moveTo(-shoulderW - 4, -15);
    ctx.lineTo(-shoulderW, -9);
    ctx.lineTo(-shoulderW - 2, -5);
    ctx.fillStyle = '#fde047';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(shoulderW + 4, -15);
    ctx.lineTo(shoulderW, -9);
    ctx.lineTo(shoulderW + 2, -5);
    ctx.fillStyle = '#fde047';
    ctx.fill();
  }

  // ----------------------------------------------------
  // 5. Head, Hair, Face & Helmet (男女头面发型与头盔)
  // ----------------------------------------------------
  const headY = -21;
  const headRadius = isFemale ? 6 : 7;

  if (helmetItem) {
    const hName = helmetItem.name || '';
    let helmColor = armorPrimary;
    let helmTrim = armorTrim;

    if (hName.includes('黑铁') || hName.includes('圣战')) {
      helmColor = '#1e293b';
      helmTrim = '#f59e0b';
    } else if (hName.includes('法神') || hName.includes('烈焰')) {
      helmColor = '#4c1d95';
      helmTrim = '#e879f9';
    } else if (hName.includes('天尊') || hName.includes('光芒')) {
      helmColor = '#064e3b';
      helmTrim = '#34d399';
    }

    ctx.beginPath();
    ctx.arc(0, headY, headRadius + 1, 0, Math.PI * 2);
    ctx.fillStyle = helmColor;
    ctx.fill();
    ctx.strokeStyle = helmTrim;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Helmet Crown Plume
    ctx.beginPath();
    ctx.moveTo(0, headY - headRadius - 4);
    ctx.lineTo(-4, headY - headRadius + 1);
    ctx.lineTo(4, headY - headRadius + 1);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
  } else {
    // Unhelmeted Face & Hairstyles - Gender Specific!

    if (isFemale) {
      // Female Hair Flowing Behind Face First
      ctx.beginPath();
      if (prof === 'warrior') {
        // High Crimson Ponytail
        ctx.moveTo(0, headY - 4);
        ctx.quadraticCurveTo(-12, headY + 2, -10 + Math.sin(now * 0.005) * 2, headY + 16);
        ctx.lineTo(-6, headY + 16);
        ctx.quadraticCurveTo(-6, headY + 4, 0, headY - 2);
        ctx.fillStyle = '#991b1b';
      } else if (prof === 'mage') {
        // Royal Purple Long Hair
        ctx.moveTo(-6, headY - 4);
        ctx.quadraticCurveTo(-10, headY + 6, -8, headY + 18);
        ctx.lineTo(8, headY + 18);
        ctx.quadraticCurveTo(10, headY + 6, 6, headY - 4);
        ctx.fillStyle = '#6b21a8';
      } else {
        // Jet Black Long Hair with Green Ribbons
        ctx.moveTo(-6, headY - 4);
        ctx.quadraticCurveTo(-9, headY + 8, -7, headY + 16);
        ctx.lineTo(7, headY + 16);
        ctx.quadraticCurveTo(9, headY + 8, 6, headY - 4);
        ctx.fillStyle = '#0f172a';
      }
      ctx.fill();
    }

    // Face Skin Tone
    ctx.beginPath();
    ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = isFemale ? '#fef3c7' : '#fde047';
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#1e293b';
    if (isFemale) {
      ctx.fillRect(-3, headY - 1, 2, 1.8);
      ctx.fillRect(1, headY - 1, 2, 1.8);
    } else {
      ctx.fillRect(-3.5, headY - 1, 2.2, 1.5);
      ctx.fillRect(1.5, headY - 1, 2.2, 1.5);
    }

    // Front Hair Bangs
    if (!isFemale) {
      if (prof === 'warrior') {
        // Male Warrior Red Headband & Spiked Black Hair
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-headRadius, headY - 3, headRadius * 2, 3);
        ctx.beginPath();
        ctx.arc(0, headY - 2, headRadius + 0.5, Math.PI, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
      } else if (prof === 'mage') {
        // Male Mage Arcane Hood/Crown
        ctx.beginPath();
        ctx.arc(0, headY, headRadius + 1, Math.PI * 0.8, Math.PI * 2.2);
        ctx.fillStyle = '#312e81';
        ctx.fill();
        ctx.strokeStyle = '#a5b4fc';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Male Taoist Top-Knot Bun & Jade Pin
        ctx.beginPath();
        ctx.arc(0, headY - headRadius - 1, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.fillStyle = '#34d399';
        ctx.fillRect(-6, headY - headRadius - 1, 12, 1.8);
      }
    } else {
      // Female Hair Bangs & Hairpins
      ctx.beginPath();
      ctx.arc(0, headY - 2, headRadius + 0.5, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fillStyle = prof === 'warrior' ? '#991b1b' : prof === 'mage' ? '#6b21a8' : '#0f172a';
      ctx.fill();

      // Golden Hairpin Ornament
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(headRadius - 2, headY - 5, 4, 2);
    }
  }

  // ----------------------------------------------------
  // 6. Weapon Rendering & Dynamic Attack Trail (武器与砍击剑气动画)
  // ----------------------------------------------------
  const weaponHandX = shoulderW + 3 + weaponOffsetX;
  const weaponHandY = -2 + weaponOffsetY;

  ctx.save();
  ctx.translate(weaponHandX, weaponHandY);
  ctx.rotate(weaponAngle);

  const wName = weaponItem?.name || '';
  const wRarity = weaponItem?.rarity || 'common';

  if (prof === 'warrior') {
    // WARRIOR WEAPONS
    if (wName.includes('木剑') || wName.includes('乌木')) {
      const isEbony = wName.includes('乌木');
      ctx.fillStyle = isEbony ? '#262626' : '#854d0e';
      ctx.fillRect(-2, -26, 4, 24);
      ctx.fillStyle = isEbony ? '#525252' : '#a16207';
      ctx.fillRect(-4, -4, 9, 3);
      if (isEbony) {
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(-0.5, -24, 1, 20);
      }
    } else if (wName.includes('斩马刀') || wName.includes('修罗') || wName.includes('半月')) {
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(-2, -28);
      ctx.quadraticCurveTo(8, -18, 2, 0);
      ctx.closePath();
      ctx.fillStyle = '#e2e8f0';
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-4, -2, 9, 3);
    } else if (wName.includes('炼狱') || wName.includes('霜天')) {
      // Executioner Cleaver / Purgatory Axe (炼狱巨斧)
      ctx.fillStyle = '#334155';
      ctx.fillRect(-2, -32, 4, 30);
      ctx.beginPath();
      ctx.arc(-8, -22, 10, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(8, -22, 10, Math.PI * 0.6, Math.PI * 1.4);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (wName.includes('裁决')) {
      // Judgement Mace (裁决之杖) - Black Iron Column
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-4, -34, 8, 30);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-6, -30, 12, 3);
      ctx.fillRect(-6, -22, 12, 3);
      ctx.fillRect(-6, -14, 12, 3);
      ctx.fillRect(-6, -6, 12, 3);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-2, -36, 4, 3);
    } else if (wName.includes('屠龙') || wRarity === 'mythic') {
      // Legendary Dragon Slayer Sword (屠龙宝刀)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-5, -36, 10, 32);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-2, -34, 4, 28);

      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-6, -37, 12, 34);

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-9, -5, 18, 6);
    } else if (wName.includes('霸者') || wName.includes('怒斩')) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-4, -36, 8, 32);
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-8, -6, 16, 6);
    } else {
      // Standard Steel Sword
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-2, -26, 4, 24);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-5, -4, 10, 3);
    }

    // WARRIOR SWORD SWEEP ARC EFFECT (半月弯刀/烈火剑气斩击特效)
    if (action === 'attack') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, -18, 32, -Math.PI * 0.8, -Math.PI * 0.1);
      ctx.strokeStyle = wName.includes('屠龙') ? '#ef4444' : '#f59e0b';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 20;
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -18, 30, -Math.PI * 0.75, -Math.PI * 0.15);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

  } else if (prof === 'mage') {
    // MAGE WEAPONS
    const isBoneJade = wName.includes('骨玉') || wName.includes('嗜魂') || wName.includes('镇天') || wRarity === 'legendary' || wRarity === 'mythic';

    ctx.fillStyle = isBoneJade ? '#f8fafc' : '#78350f';
    ctx.fillRect(-2, -32, 4, 36);

    const orbRadius = isBoneJade ? 7 : 5;
    ctx.beginPath();
    ctx.arc(0, -34, orbRadius, 0, Math.PI * 2);
    ctx.fillStyle = isBoneJade ? '#a855f7' : '#38bdf8';
    ctx.shadowColor = isBoneJade ? '#e879f9' : '#60a5fa';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Magic Orbit Sparkle
    const orbAngle = now * 0.006;
    const ox = Math.cos(orbAngle) * 10;
    const oy = -34 + Math.sin(orbAngle) * 6;
    ctx.beginPath();
    ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fef08a';
    ctx.fill();

    // MAGE SPELL CASTING AURA RINGS (法师雷电/冰咆哮施法特效)
    if (action === 'cast') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, -34, 18, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 20;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

  } else {
    // TAOIST WEAPONS
    if (wName.includes('扇') || wName.includes('逍遥')) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-14, -28);
      ctx.quadraticCurveTo(0, -36, 14, -28);
      ctx.closePath();
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#34d399';
      ctx.fillRect(-2, -28, 4, 26);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-5, -4, 10, 3);
      ctx.shadowColor = '#6ee7b7';
      ctx.shadowBlur = 10;

      const charmY = -20 + Math.sin(now * 0.005) * 4;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(8, charmY, 5, 9);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(9.5, charmY + 2, 2, 5);
    }

    // TAOIST YIN-YANG CHARM AURA (道士灵魂火符/太极阵施法特效)
    if (action === 'cast') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, -25, 14, 0, Math.PI * 2);
      ctx.strokeStyle = '#34d399';
      ctx.shadowColor = '#6ee7b7';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore(); // Restore Weapon

  ctx.restore(); // Restore Character Root
}
