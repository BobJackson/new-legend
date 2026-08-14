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
  attackProgress?: number;
  isMoving?: boolean;
  moveProgress?: number;
  isMounted?: boolean;
  actionOverride?: 'idle' | 'walk' | 'attack' | 'cast';
  lookAtTarget?: { x: number; y: number };
}

interface SkeletalState {
  lastTime: number;
  spineAngle: number;
  chestOffsetY: number;
  legAngleL: number;
  kneeAngleL: number;
  legAngleR: number;
  kneeAngleR: number;
  armAngleL: number;
  elbowAngleL: number;
  armAngleR: number;
  elbowAngleR: number;
  weaponAngle: number;
  headAngle: number;
  capeWave: number;
  hairWave: number;
}

const stateMap = new Map<string, SkeletalState>();

function lerp(start: number, end: number, amt: number): number {
  return (1 - amt) * start + amt * end;
}

// 辅助颜色渐变解析
function hexToRgba(hex: string, alpha: number): string {
  if (!hex || hex.startsWith('rgba')) return hex;
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function drawCharacterAvatar(options: DrawCharacterOptions) {
  const {
    ctx,
    px,
    py,
    playerCenterY,
    character,
    previewEquipment,
    now,
    scale = 1.0,
    isAttacking,
    attackProgress = 0,
    isMoving,
    isMounted,
    actionOverride,
    lookAtTarget
  } = options;

  let state = stateMap.get(character.id || 'player');
  if (!state) {
    state = {
      lastTime: now,
      spineAngle: 0,
      chestOffsetY: 0,
      legAngleL: 0,
      kneeAngleL: 0,
      legAngleR: 0,
      kneeAngleR: 0,
      armAngleL: 0,
      elbowAngleL: 0,
      armAngleR: 0,
      elbowAngleR: 0,
      weaponAngle: 0,
      headAngle: 0,
      capeWave: 0,
      hairWave: 0
    };
    stateMap.set(character.id || 'player', state);
  }

  const dt = Math.min(0.1, Math.max(0.001, (now - state.lastTime) / 1000));
  state.lastTime = now;

  const charAny = character as unknown as { state?: { action?: 'idle' | 'walk' | 'attack' | 'cast'; direction?: { x: number; y: number } } };
  const action = actionOverride || charAny.state?.action || 'idle';
  const direction = charAny.state?.direction || { x: 0, y: 1 };
  
  let targetAngle = Math.atan2(direction.y, direction.x);
  if (lookAtTarget) {
    targetAngle = Math.atan2(lookAtTarget.y - py, lookAtTarget.x - px);
  }

  // 计算朝向判定
  const isFacingUp = targetAngle < -Math.PI / 8 && targetAngle > -Math.PI + Math.PI / 8;
  const isFacingRight = targetAngle >= -Math.PI / 8 && targetAngle <= Math.PI / 8;
  const isFacingLeft = targetAngle <= -Math.PI + Math.PI / 8 || targetAngle >= Math.PI - Math.PI / 8;
  const isFacingDown = !isFacingUp && !isFacingRight && !isFacingLeft;

  // 动画动力学参数
  const walkSpeed = 9;
  const idleSpeed = 2.2;

  let targetSpine = 0;
  let targetChestY = 0;
  let targetArmL = 0;
  let targetElbowL = 0;
  let targetArmR = 0;
  let targetElbowR = 0;
  let targetWeapon = 0;
  let targetLegL = 0;
  let targetKneeL = 0;
  let targetLegR = 0;
  let targetKneeR = 0;
  let targetHeadAngle = 0;

  // 披风与发丝波动
  state.capeWave = Math.sin(now * 0.006) * 0.15 + (isMoving ? Math.sin(now * 0.015) * 0.3 : 0);
  state.hairWave = Math.sin(now * 0.005) * 0.1 + (isMoving ? Math.sin(now * 0.012) * 0.2 : 0);

  if (action === 'attack' || isAttacking) {
    const p = attackProgress || ((now % 400) / 400);
    // 战士力劈/斩击动作曲线 (蓄力 -> 极速重劈 -> 收刀)
    if (p < 0.3) {
      // 蓄力后仰
      const prep = p / 0.3;
      targetChestY = -2 * prep;
      targetSpine = -0.2 * prep;
      targetArmR = -2.2 * prep;
      targetElbowR = -1.2 * prep;
      targetWeapon = -2.6 * prep;
      targetArmL = 0.5 * prep;
      targetHeadAngle = -0.1 * prep;
    } else if (p < 0.7) {
      // 势大力沉重劈
      const strike = (p - 0.3) / 0.4;
      targetChestY = 4 * strike;
      targetSpine = 0.35 * strike;
      targetArmR = 1.6 * strike - 0.2;
      targetElbowR = 0.4 * strike;
      targetWeapon = 1.9 * strike;
      targetArmL = -1.0 * strike;
      targetHeadAngle = 0.2 * strike;
    } else {
      // 收刀回位
      const rec = (p - 0.7) / 0.3;
      targetChestY = 4 * (1 - rec);
      targetSpine = 0.35 * (1 - rec);
      targetArmR = 1.4 * (1 - rec);
      targetElbowR = 0.4 * (1 - rec);
      targetWeapon = 1.6 * (1 - rec);
      targetArmL = -0.8 * (1 - rec);
    }
    targetLegL = isMounted ? -0.25 : 0.35;
    targetLegR = isMounted ? 0.25 : -0.35;
  } else if (action === 'cast') {
    const p = (now % 600) / 600;
    const wave = Math.sin(p * Math.PI * 2);
    targetChestY = -4 + wave * 1.5;
    targetSpine = -0.15;
    targetArmR = -2.0 + wave * 0.2;
    targetElbowR = -0.6;
    targetArmL = -2.0 + wave * 0.2;
    targetElbowL = -0.6;
    targetWeapon = -2.1 + wave * 0.2;
    targetLegL = isMounted ? -0.2 : 0.1;
    targetLegR = isMounted ? 0.2 : -0.1;
    targetHeadAngle = -0.15;
  } else if (isMoving || action === 'walk') {
    const t = (now / 1000) * walkSpeed;
    targetChestY = Math.abs(Math.sin(t)) * 2.5;
    targetSpine = Math.sin(t * 0.5) * 0.08;
    
    targetArmL = Math.sin(t) * 0.75;
    targetElbowL = Math.max(0, Math.sin(t) * 0.4);
    targetArmR = Math.sin(t + Math.PI) * 0.75;
    targetElbowR = Math.max(0, Math.sin(t + Math.PI) * 0.4);
    targetWeapon = targetArmR * 0.8;
    
    if (isMounted) {
      targetChestY += Math.sin(t * 1.5) * 2.5;
      targetLegL = -0.3;
      targetLegR = 0.3;
    } else {
      targetLegL = Math.sin(t) * 0.85;
      targetKneeL = Math.max(0, Math.sin(t + 0.8) * 0.75);
      targetLegR = Math.sin(t + Math.PI) * 0.85;
      targetKneeR = Math.max(0, Math.sin(t + Math.PI + 0.8) * 0.75);
    }
  } else {
    // 呼吸待机 Idle
    const t = (now / 1000) * idleSpeed;
    targetChestY = Math.sin(t) * 1.6;
    targetSpine = Math.sin(t * 0.5) * 0.03;
    
    targetArmL = 0.15 + Math.sin(t) * 0.05;
    targetElbowL = 0.1;
    targetArmR = -0.15 - Math.sin(t) * 0.05;
    targetElbowR = 0.15;
    targetWeapon = -0.2 - Math.sin(t) * 0.05;
    
    targetLegL = isMounted ? -0.25 : 0.08;
    targetKneeL = 0.02;
    targetLegR = isMounted ? 0.25 : -0.08;
    targetKneeR = 0.02;
  }

  const lerpSpeed = 16;
  state.spineAngle = lerp(state.spineAngle, targetSpine, dt * lerpSpeed);
  state.chestOffsetY = lerp(state.chestOffsetY, targetChestY, dt * lerpSpeed);
  state.armAngleL = lerp(state.armAngleL, targetArmL, dt * lerpSpeed);
  state.elbowAngleL = lerp(state.elbowAngleL, targetElbowL, dt * lerpSpeed);
  state.armAngleR = lerp(state.armAngleR, targetArmR, dt * lerpSpeed);
  state.elbowAngleR = lerp(state.elbowAngleR, targetElbowR, dt * lerpSpeed);
  state.weaponAngle = lerp(state.weaponAngle, targetWeapon, dt * lerpSpeed);
  state.legAngleL = lerp(state.legAngleL, targetLegL, dt * lerpSpeed);
  state.kneeAngleL = lerp(state.kneeAngleL, targetKneeL, dt * lerpSpeed);
  state.legAngleR = lerp(state.legAngleR, targetLegR, dt * lerpSpeed);
  state.kneeAngleR = lerp(state.kneeAngleR, targetKneeR, dt * lerpSpeed);
  state.headAngle = lerp(state.headAngle, targetHeadAngle, dt * lerpSpeed);

  const equipment = previewEquipment || character.equipment;
  const profession = character.profession || 'warrior';
  const gender = character.gender || 'male';

  ctx.save();
  ctx.translate(px, playerCenterY);
  ctx.scale(scale, scale);

  // 1. 脚下阴影与高阶转生光环 (Rebirth / Footprint Aura)
  drawCharacterFloorShadow(ctx, character, now, isMounted);

  // 2. 躯干主节点位移
  ctx.translate(0, state.chestOffsetY - 10);
  ctx.rotate(state.spineAngle);

  // 3. 背后披风/背饰/神翅 (如果存在翅膀或高级战袍披风)
  const hasMythicArmor = equipment?.armor?.rarity === 'mythic' || equipment?.armor?.rarity === 'legendary';
  const wingTier = character.wingLevel || 0;

  if (hasMythicArmor || profession === 'warrior' || isFacingUp) {
    drawFlowingCape(ctx, state.capeWave, profession, equipment?.armor, isFacingUp);
  }

  if (wingTier > 0) {
    drawMajesticWings(ctx, now, wingTier, isFacingUp);
  }

  // 4. 分层肢体渲染 (根据前后视向深度排序)
  if (isFacingUp) {
    // 背向视向：先武器手臂、再躯干、最后头部与前肢
    drawLeftArm(ctx, state.armAngleL, state.elbowAngleL, profession, equipment, gender, now);
    drawRightArmAndWeapon(ctx, state.armAngleR, state.elbowAngleR, state.weaponAngle, profession, equipment, now, action);
    drawLegs(ctx, state.legAngleL, state.kneeAngleL, state.legAngleR, state.kneeAngleR, profession, equipment, isMounted);
    drawTorso(ctx, profession, equipment, gender, now, true);
    drawHead(ctx, state.headAngle, gender, profession, equipment?.helmet, isFacingUp, state.hairWave, now);
  } else {
    // 正向/侧向视向
    drawLeftArm(ctx, state.armAngleL, state.elbowAngleL, profession, equipment, gender, now);
    drawLegs(ctx, state.legAngleL, state.kneeAngleL, state.legAngleR, state.kneeAngleR, profession, equipment, isMounted);
    drawTorso(ctx, profession, equipment, gender, now, false);
    drawHead(ctx, state.headAngle, gender, profession, equipment?.helmet, isFacingUp, state.hairWave, now);
    drawRightArmAndWeapon(ctx, state.armAngleR, state.elbowAngleR, state.weaponAngle, profession, equipment, now, action);
  }

  // 5. 施法/攻击时的聚气光晕 (Combat Particle Aura)
  if (action === 'cast') {
    drawCastingAura(ctx, now, profession);
  } else if ((action === 'attack' || isAttacking) && (attackProgress > 0.2 && attackProgress < 0.8)) {
    drawSlashBladeTrail(ctx, profession, attackProgress);
  }

  ctx.restore();
}

// ----------------------------------------------------
// A. 脚下阴影与转生/八卦阵光环
// ----------------------------------------------------
function drawCharacterFloorShadow(ctx: CanvasRenderingContext2D, char: CharacterData, now: number, isMounted?: boolean) {
  ctx.save();
  const shadowW = isMounted ? 30 : 20;
  const shadowH = isMounted ? 12 : 8;

  // 柔和径向阴影
  const grad = ctx.createRadialGradient(0, 22, 2, 0, 22, shadowW);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.3)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 22, shadowW, shadowH, 0, 0, Math.PI * 2);
  ctx.fill();

  // 高阶转生/战力地阵光环
  const rebirth = char.rebirthLevel || 0;
  if (rebirth > 0) {
    const rot = now * 0.0015;
    ctx.save();
    ctx.translate(0, 22);
    ctx.scale(1, 0.45);
    ctx.rotate(rot);

    ctx.strokeStyle = rebirth >= 4 ? '#f59e0b' : rebirth >= 2 ? '#38bdf8' : '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();

    // 旋转符文星芒
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const rx = Math.cos(a) * 22;
      const ry = Math.sin(a) * 22;
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(rx - 2, ry - 2, 4, 4);
    }
    ctx.restore();
  }

  // 道士专属乾坤微光
  if (char.profession === 'taoist') {
    ctx.save();
    ctx.translate(0, 22);
    ctx.scale(1, 0.4);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// ----------------------------------------------------
// B. 动态披风 (Cape / Mantle)
// ----------------------------------------------------
function drawFlowingCape(
  ctx: CanvasRenderingContext2D,
  wave: number,
  profession: string,
  armor?: Item | null,
  isFacingUp?: boolean
) {
  ctx.save();
  ctx.translate(0, -6);

  let capeColor1 = '#991b1b'; // 深红战袍
  let capeColor2 = '#450a0a';
  let capeGoldTrim = '#f59e0b';

  if (profession === 'mage') {
    capeColor1 = '#1e1b4b'; // 法皇秘术幽蓝披风
    capeColor2 = '#0f172a';
    capeGoldTrim = '#38bdf8';
  } else if (profession === 'taoist') {
    capeColor1 = '#064e3b'; // 天尊碧波道袍披帛
    capeColor2 = '#022c22';
    capeGoldTrim = '#34d399';
  }

  if (armor?.rarity === 'mythic') {
    capeColor1 = '#7c2d12'; // 凤天神甲金边炽烈披风
    capeColor2 = '#431407';
    capeGoldTrim = '#fde047';
  }

  // 披风梯形弧形轮廓
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.quadraticCurveTo(-14 + wave * 8, 16, -12 + wave * 14, 30);
  ctx.quadraticCurveTo(0, 28 + wave * 4, 12 + wave * 14, 30);
  ctx.quadraticCurveTo(14 + wave * 8, 16, 7, 0);
  ctx.closePath();

  const grad = ctx.createLinearGradient(-10, 0, 10, 30);
  grad.addColorStop(0, capeColor1);
  grad.addColorStop(1, capeColor2);
  ctx.fillStyle = grad;
  ctx.fill();

  // 金色边缘花纹
  ctx.strokeStyle = capeGoldTrim;
  ctx.lineWidth = 1.2;
  ctx.shadowColor = capeGoldTrim;
  ctx.shadowBlur = 4;
  ctx.stroke();

  // 披风内部下摆金边线
  ctx.beginPath();
  ctx.moveTo(-10 + wave * 12, 27);
  ctx.quadraticCurveTo(0, 25 + wave * 4, 10 + wave * 12, 27);
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

// ----------------------------------------------------
// C. 华丽神羽翅膀 (Majestic Angel / Demon Wings)
// ----------------------------------------------------
function drawMajesticWings(ctx: CanvasRenderingContext2D, now: number, wingTier: number, isFacingUp: boolean) {
  ctx.save();
  ctx.translate(0, -6);
  const flap = Math.sin(now * 0.005) * 0.15;
  const wingScale = 0.9 + Math.min(0.5, wingTier * 0.08);

  // 翅膀色泽定义 (随等级从圣白 -> 炽金 -> 幽冥赤红)
  let wingColor1 = '#ffffff';
  let wingColor2 = '#e0f2fe';
  let wingGlow = '#38bdf8';

  if (wingTier >= 7) {
    wingColor1 = '#fef08a';
    wingColor2 = '#ef4444';
    wingGlow = '#f59e0b';
  } else if (wingTier >= 4) {
    wingColor1 = '#ffffff';
    wingColor2 = '#fef08a';
    wingGlow = '#eab308';
  }

  const drawSingleWing = () => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-15, -24, -38, -26, -50, -10);
    ctx.quadraticCurveTo(-42, 0, -48, 12);
    ctx.quadraticCurveTo(-34, 6, -36, 20);
    ctx.quadraticCurveTo(-24, 12, -22, 26);
    ctx.quadraticCurveTo(-12, 16, -6, 20);
    ctx.lineTo(0, 0);
    ctx.closePath();

    const wGrad = ctx.createLinearGradient(0, 0, -50, 20);
    wGrad.addColorStop(0, wingColor1);
    wGrad.addColorStop(1, wingColor2);
    ctx.fillStyle = wGrad;
    ctx.shadowColor = wingGlow;
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 羽毛内部纹理骨线
    ctx.beginPath();
    ctx.moveTo(-10, -8); ctx.lineTo(-38, -4);
    ctx.moveTo(-8, -2); ctx.lineTo(-30, 8);
    ctx.moveTo(-5, 4); ctx.lineTo(-20, 14);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();
  };

  // 左翼
  ctx.save();
  ctx.translate(-6, -2);
  ctx.rotate(-0.25 + flap);
  ctx.scale(wingScale, wingScale);
  drawSingleWing();
  ctx.restore();

  // 右翼 (水平镜像)
  ctx.save();
  ctx.translate(6, -2);
  ctx.rotate(0.25 - flap);
  ctx.scale(-wingScale, wingScale);
  drawSingleWing();
  ctx.restore();

  ctx.restore();
}

// ----------------------------------------------------
// D. 躯干与铠甲/法袍 (Torso & Armor)
// ----------------------------------------------------
function drawTorso(
  ctx: CanvasRenderingContext2D,
  profession: string,
  equipment: CharacterData['equipment'] | undefined,
  gender: 'male' | 'female',
  now: number,
  isFacingUp: boolean
) {
  ctx.save();

  const armor = equipment?.armor;
  const isMythic = armor?.rarity === 'mythic';
  const isEpic = armor?.rarity === 'epic' || armor?.rarity === 'legendary';

  // 基础材质色彩
  let mainArmorColor = '#475569'; // 基础钢甲
  let trimGold = '#f59e0b';
  let innerCloth = '#1e293b';

  if (profession === 'warrior') {
    mainArmorColor = isMythic ? '#991b1b' : isEpic ? '#78350f' : '#334155';
    trimGold = '#fbbf24';
    innerCloth = '#450a0a';
  } else if (profession === 'mage') {
    mainArmorColor = isMythic ? '#312e81' : isEpic ? '#1e3a8a' : '#1e293b';
    trimGold = '#38bdf8';
    innerCloth = '#0f172a';
  } else if (profession === 'taoist') {
    mainArmorColor = isMythic ? '#064e3b' : isEpic ? '#047857' : '#14532d';
    trimGold = '#a7f3d0';
    innerCloth = '#f8fafc';
  }

  // 1. 身体主干 (胸甲/长袍基础层)
  ctx.beginPath();
  if (gender === 'male') {
    ctx.moveTo(-9, -10);
    ctx.lineTo(9, -10);
    ctx.lineTo(8, 12);
    ctx.lineTo(-8, 12);
  } else {
    // 女性曲线稍收腰
    ctx.moveTo(-8, -10);
    ctx.lineTo(8, -10);
    ctx.lineTo(6, 1);
    ctx.lineTo(7.5, 12);
    ctx.lineTo(-7.5, 12);
    ctx.lineTo(-6, 1);
  }
  ctx.closePath();

  const torsoGrad = ctx.createLinearGradient(-9, -10, 9, 12);
  torsoGrad.addColorStop(0, mainArmorColor);
  torsoGrad.addColorStop(0.5, innerCloth);
  torsoGrad.addColorStop(1, mainArmorColor);
  ctx.fillStyle = torsoGrad;
  ctx.fill();

  ctx.strokeStyle = trimGold;
  ctx.lineWidth = 1;
  ctx.stroke();

  // 2. 职业专属胸部装饰 (胸镜/八卦/奥术宝石)
  if (!isFacingUp) {
    if (profession === 'warrior') {
      // 战士：战神胸镜与金色龙纹护胸
      ctx.fillStyle = trimGold;
      ctx.beginPath();
      ctx.arc(0, -2, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // 胸镜核心红/金宝石高光
      ctx.fillStyle = isMythic ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 护胸金属斜板强化
      ctx.beginPath();
      ctx.moveTo(-8, -8); ctx.lineTo(-1, -4);
      ctx.moveTo(8, -8); ctx.lineTo(1, -4);
      ctx.strokeStyle = trimGold;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (profession === 'mage') {
      // 法师：奥术符文领扣与深邃蓝宝石
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(3.5, -2);
      ctx.lineTo(0, 2);
      ctx.lineTo(-3.5, -2);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // 领口法纹折边
      ctx.beginPath();
      ctx.moveTo(-7, -10); ctx.lineTo(0, -1); ctx.lineTo(7, -10);
      ctx.strokeStyle = trimGold;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (profession === 'taoist') {
      // 道士：胸前太极八卦图 (Yin-Yang Taiji Emblem)
      ctx.save();
      ctx.translate(0, -2);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, -Math.PI / 2, Math.PI / 2);
      ctx.arc(0, -2.25, 2.25, Math.PI / 2, -Math.PI / 2, true);
      ctx.arc(0, 2.25, 2.25, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      // 阴阳双鱼眼
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 2.25, 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(0, -2.25, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // 3. 战神腰带与兽首扣 (Combat Belt & Lion Buckle)
  ctx.fillStyle = '#78350f'; // 深色皮带
  ctx.fillRect(-8.5, 7, 17, 4);

  // 金色腰扣
  ctx.fillStyle = trimGold;
  ctx.beginPath();
  ctx.arc(0, 9, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // 4. 战裙/下摆战甲 (Tassets / Robe Skirt)
  ctx.fillStyle = mainArmorColor;
  ctx.beginPath();
  ctx.moveTo(-8, 11);
  ctx.lineTo(-10, 19);
  ctx.lineTo(10, 19);
  ctx.lineTo(8, 11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = trimGold;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 中缝开叉装饰
  ctx.beginPath();
  ctx.moveTo(0, 11); ctx.lineTo(0, 19);
  ctx.strokeStyle = innerCloth;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 左右霸气护肩 (Pauldrons)
  drawPauldrons(ctx, profession, trimGold, mainArmorColor, isMythic);

  ctx.restore();
}

// ----------------------------------------------------
// E. 霸气护肩 (Pauldrons / Spikes)
// ----------------------------------------------------
function drawPauldrons(
  ctx: CanvasRenderingContext2D,
  profession: string,
  trimGold: string,
  mainColor: string,
  isMythic: boolean
) {
  const drawSingleShoulder = (xOffset: number, isRight: boolean) => {
    ctx.save();
    ctx.translate(xOffset, -9);
    const sign = isRight ? 1 : -1;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(sign * 8, -6, sign * 11, -2);
    ctx.lineTo(sign * 7, 7);
    ctx.lineTo(0, 4);
    ctx.closePath();

    const pGrad = ctx.createLinearGradient(0, -6, sign * 11, 7);
    pGrad.addColorStop(0, trimGold);
    pGrad.addColorStop(0.5, mainColor);
    pGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = pGrad;
    ctx.fill();

    ctx.strokeStyle = trimGold;
    ctx.lineWidth = 1;
    ctx.stroke();

    // 神装肩部尖刺/龙角
    if (isMythic || profession === 'warrior') {
      ctx.fillStyle = trimGold;
      ctx.beginPath();
      ctx.moveTo(sign * 8, -4);
      ctx.lineTo(sign * 14, -8);
      ctx.lineTo(sign * 10, 0);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };

  drawSingleShoulder(-9, false);
  drawSingleShoulder(9, true);
}

// ----------------------------------------------------
// F. 头部、发型与头盔 (Head, Hair & Helmet)
// ----------------------------------------------------
function drawHead(
  ctx: CanvasRenderingContext2D,
  headAngle: number,
  gender: 'male' | 'female',
  profession: string,
  helmet: Item | null | undefined,
  isFacingUp: boolean,
  hairWave: number,
  now: number
) {
  ctx.save();
  ctx.translate(0, -18);
  ctx.rotate(headAngle);

  const skinTone = '#fed7aa'; // 东方自然健康肤色
  const hairColor = '#0f172a'; // 墨黑发色
  const hairHighlight = '#334155';

  if (!isFacingUp) {
    // 1. 脸型底胚 (Jaw & Face Contour)
    ctx.fillStyle = skinTone;
    ctx.beginPath();
    ctx.arc(0, 3, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // 2. 发型 (Hair)
    ctx.fillStyle = hairColor;
    if (gender === 'male') {
      // 男性：束发冠 + 英武刘海 + 飘逸发带
      ctx.beginPath();
      ctx.arc(0, -1, 8.5, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fill();

      // 顶部高耸束发髻
      ctx.beginPath();
      ctx.ellipse(0, -9, 4, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 红色/金色彩带飘动
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(2, -9);
      ctx.quadraticCurveTo(8 + hairWave * 6, -10, 12 + hairWave * 10, -5);
      ctx.stroke();

      // 侧边鬓角
      ctx.fillStyle = hairColor;
      ctx.fillRect(-7.5, 0, 2, 6);
      ctx.fillRect(5.5, 0, 2, 6);
    } else {
      // 女性：优雅高马尾 + 侧分刘海 + 金色发簪
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, Math.PI * 0.7, Math.PI * 2.3);
      ctx.fill();

      // 高马尾发辫 (向后侧飘动)
      ctx.beginPath();
      ctx.moveTo(3, -7);
      ctx.quadraticCurveTo(12 + hairWave * 8, -6, 14 + hairWave * 12, 4);
      ctx.quadraticCurveTo(8, 0, 2, -4);
      ctx.fill();

      // 金色发簪
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-3, -7); ctx.lineTo(6, -9);
      ctx.stroke();

      // 柔美侧发
      ctx.fillRect(-7.5, 1, 2, 7);
      ctx.fillRect(5.5, 1, 2, 7);
    }

    // 3. 五官精致细节 (Heroic Facial Features)
    // 剑眉 (Sharp Brows)
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-5, 1); ctx.lineTo(-1.5, 2);
    ctx.moveTo(5, 1); ctx.lineTo(1.5, 2);
    ctx.stroke();

    // 明眸 (Eyes with Glistening Highlights)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(-3.2, 3.5, 1.4, 1.1, 0, 0, Math.PI * 2);
    ctx.ellipse(3.2, 3.5, 1.4, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // 眼神高光
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-3.5, 3.2, 0.5, 0, Math.PI * 2);
    ctx.arc(2.9, 3.2, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // 鼻尖与微光
    ctx.fillStyle = '#f97316';
    ctx.globalAlpha = 0.4;
    ctx.fillRect(-0.5, 5, 1, 1.5);
    ctx.globalAlpha = 1.0;

    // 唇线 (Lips)
    ctx.strokeStyle = gender === 'female' ? '#f43f5e' : '#b45309';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-1.5, 7.5); ctx.lineTo(1.5, 7.5);
    ctx.stroke();
  } else {
    // 背面发型 (Back of head)
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(0, 2, 8.5, 0, Math.PI * 2);
    ctx.fill();

    // 发带与马尾垂向
    if (gender === 'male') {
      ctx.beginPath();
      ctx.ellipse(0, -7, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.quadraticCurveTo(hairWave * 8, 4, hairWave * 12, 10);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.quadraticCurveTo(hairWave * 10, 6, hairWave * 14, 14);
      ctx.quadraticCurveTo(0, 10, -2, -2);
      ctx.fill();
    }
  }

  // 4. 头盔装备覆盖 (Helmet System)
  if (helmet) {
    drawEquippedHelmet(ctx, helmet, isFacingUp, now);
  }

  ctx.restore();
}

// ----------------------------------------------------
// G. 经典传奇头盔 (Helmets)
// ----------------------------------------------------
function drawEquippedHelmet(ctx: CanvasRenderingContext2D, helmet: Item, isFacingUp: boolean, now: number) {
  const hid = helmet.id || '';

  if (hid.includes('black_iron') || hid.includes('holy_war') || hid.includes('god')) {
    // 黑铁头盔 / 圣战头盔 / 至尊战盔 (Heavy Iron Visor Helm)
    ctx.save();
    ctx.fillStyle = hid.includes('holy_war') ? '#78350f' : '#1e293b';
    ctx.beginPath();
    ctx.arc(0, -1, 9, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();

    // 金色额顶战盔翼 (Golden Horns/Crest)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(-4, -5);
    ctx.lineTo(4, -5);
    ctx.closePath();
    ctx.fill();

    // 左右护角
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-7, -4); ctx.lineTo(-11, -9);
    ctx.moveTo(7, -4); ctx.lineTo(11, -9);
    ctx.stroke();

    ctx.restore();
  } else if (hid.includes('skeleton')) {
    // 骷髅头盔 (Demonic Horned Skull Helm)
    ctx.save();
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(0, -1, 8.8, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -4); ctx.lineTo(-12, -10);
    ctx.moveTo(6, -4); ctx.lineTo(12, -10);
    ctx.stroke();
    ctx.restore();
  } else {
    // 普通青铜头盔 / 魔法头巾 / 黄金战冠
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 1, 8.5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    // 额前明珠
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ----------------------------------------------------
// H. 左右手臂与护腕 (Arms & Gauntlets)
// ----------------------------------------------------
function drawLeftArm(
  ctx: CanvasRenderingContext2D,
  armAngle: number,
  elbowAngle: number,
  profession: string,
  equipment: CharacterData['equipment'] | undefined,
  gender: 'male' | 'female',
  now: number
) {
  ctx.save();
  ctx.translate(-10, -7);
  ctx.rotate(armAngle);

  const armorColor = profession === 'warrior' ? '#475569' : profession === 'mage' ? '#1e3a8a' : '#047857';
  const trimColor = profession === 'mage' ? '#38bdf8' : '#f59e0b';

  // 大臂 (Upper Arm)
  ctx.fillStyle = armorColor;
  ctx.fillRect(-3, 0, 6, 9);
  ctx.strokeStyle = trimColor;
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-3, 0, 6, 9);

  ctx.translate(0, 9);
  ctx.rotate(elbowAngle);

  // 小臂与精钢护腕 (Forearm & Gauntlet)
  ctx.fillStyle = '#334155';
  ctx.fillRect(-2.5, 0, 5, 9);

  // 金边护腕
  ctx.fillStyle = trimColor;
  ctx.fillRect(-3, 4, 6, 4);

  // 手掌
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.arc(0, 10, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ----------------------------------------------------
// I. 右手与传奇神兵专属渲染 (Right Arm & Legendary Weapons)
// ----------------------------------------------------
function drawRightArmAndWeapon(
  ctx: CanvasRenderingContext2D,
  armAngle: number,
  elbowAngle: number,
  weaponAngle: number,
  profession: string,
  equipment: CharacterData['equipment'] | undefined,
  now: number,
  action: string
) {
  ctx.save();
  ctx.translate(10, -7);
  ctx.rotate(armAngle);

  const armorColor = profession === 'warrior' ? '#475569' : profession === 'mage' ? '#1e3a8a' : '#047857';
  const trimColor = profession === 'mage' ? '#38bdf8' : '#f59e0b';

  // 大臂
  ctx.fillStyle = armorColor;
  ctx.fillRect(-3, 0, 6, 9);
  ctx.strokeStyle = trimColor;
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-3, 0, 6, 9);

  ctx.translate(0, 9);
  ctx.rotate(elbowAngle);

  // 小臂
  ctx.fillStyle = '#334155';
  ctx.fillRect(-2.5, 0, 5, 9);
  ctx.fillStyle = trimColor;
  ctx.fillRect(-3, 4, 6, 4);

  // 手握武器节点
  ctx.translate(0, 9);
  ctx.rotate(weaponAngle);

  // 手掌
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.arc(0, 1, 2.8, 0, Math.PI * 2);
  ctx.fill();

  // 绘制神兵利器
  const weapon = equipment?.weapon;
  drawDetailedWeapon(ctx, weapon, profession, now);

  ctx.restore();
}

// ----------------------------------------------------
// J. 经典传奇神兵 (Legendary Weapons)
// ----------------------------------------------------
function drawDetailedWeapon(
  ctx: CanvasRenderingContext2D,
  weapon: Item | null | undefined,
  profession: string,
  now: number
) {
  ctx.save();
  const wid = weapon?.id || '';

  if (wid.includes('dragon_slayer') || wid.includes('slayer')) {
    // ⚔️ 【屠龙宝刀】 (Dragon Slayer)
    // 霸气巨型阔刃、龙脊背刺、炽热红金流光
    ctx.rotate(-Math.PI * 0.4);

    // 刀柄 (Dragon Hilt)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-2, 0, 4, 14);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, 14, 3.5, 0, Math.PI * 2); // 刀首龙头宝珠
    ctx.fill();

    // 龙吞口护手 (Dragon Mouth Guard)
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.lineTo(4, -5); ctx.lineTo(-4, -5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 宽厚屠龙刀身 (Heavy Broad Blade with Dragon Spine)
    const bladeGrad = ctx.createLinearGradient(-6, -42, 6, 0);
    bladeGrad.addColorStop(0, '#1c1917');
    bladeGrad.addColorStop(0.5, '#7f1d1d');
    bladeGrad.addColorStop(1, '#1c1917');
    ctx.fillStyle = bladeGrad;

    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.lineTo(-7, -35);
    ctx.lineTo(-2, -45); // 霸气斜切刀尖
    ctx.lineTo(6, -40);
    ctx.lineTo(4, -5);
    ctx.closePath();
    ctx.fill();

    // 炽热锋刃金色发光描边 (Glowing Red-Hot Edge)
    ctx.strokeStyle = '#ef4444';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 刀身龙鳞金纹 (Dragon Scale Etchings)
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(0, -34);
    ctx.moveTo(-3, -16); ctx.lineTo(2, -20);
    ctx.moveTo(-3, -26); ctx.lineTo(2, -30);
    ctx.stroke();
  } else if (wid.includes('judgment')) {
    // 🔱 【裁决之杖】 (Judgment Mace)
    // 沉重玄铁巨棍、金色螺旋龙箍、威震玛法
    ctx.rotate(-Math.PI * 0.4);

    // 握把 (Grip)
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-2, 0, 4, 15);

    // 玄铁杖身 (Black Iron Shaft)
    const rodGrad = ctx.createLinearGradient(-5, 0, 5, 0);
    rodGrad.addColorStop(0, '#09090b');
    rodGrad.addColorStop(0.5, '#52525b');
    rodGrad.addColorStop(1, '#09090b');
    ctx.fillStyle = rodGrad;
    ctx.fillRect(-4.5, -42, 9, 42);

    // 金色降魔箍 (Golden Rings)
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-5.5, -38, 11, 4);
    ctx.fillRect(-5.5, -24, 11, 4);
    ctx.fillRect(-5.5, -10, 11, 4);

    // 杖首重型尖顶 (Heavy Spiked Head)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-5.5, -42);
    ctx.lineTo(0, -48);
    ctx.lineTo(5.5, -42);
    ctx.closePath();
    ctx.fill();

    // 裁决神力微光
    ctx.strokeStyle = '#fde047';
    ctx.shadowColor = '#d97706';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1;
    ctx.strokeRect(-4.5, -42, 9, 42);
  } else if (wid.includes('bone_jade')) {
    // 🪄 【骨玉权杖】 (Bonejade Scepter)
    // 白龙骨盘旋法杖、镶嵌极品极光冰蓝魔玉
    ctx.rotate(-Math.PI * 0.35);

    // 龙骨杖身
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-2, -35, 4, 48);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-2, -35, 4, 48);

    // 杖首盘龙骨爪
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(0, -36, 6, 0, Math.PI * 2);
    ctx.fill();

    // 极光魔玉 (Pulsing Cyan Core Gem)
    const pulse = Math.sin(now * 0.008) * 1.5;
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 14 + pulse * 2;
    ctx.beginPath();
    ctx.arc(0, -36, 4 + pulse * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (wid.includes('soul_eater') || wid.includes('eater')) {
    // 🔮 【噬魂法杖】 (Soulreaver Staff)
    // 幽冥黑曜石法杖、紫电神魂光球
    ctx.rotate(-Math.PI * 0.35);

    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(-2.5, -36, 5, 50);

    // 噬魂邪龙爪
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, -30); ctx.lineTo(-8, -42); ctx.lineTo(0, -46); ctx.lineTo(8, -42); ctx.lineTo(6, -30);
    ctx.stroke();

    // 悬浮噬魂灵珠 (Floating Violet Soul Orb)
    const sPulse = Math.sin(now * 0.006) * 1.5;
    ctx.fillStyle = '#a855f7';
    ctx.shadowColor = '#d946ef';
    ctx.shadowBlur = 16 + sPulse * 3;
    ctx.beginPath();
    ctx.arc(0, -38, 5.5 + sPulse * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (wid.includes('xiaoyao_fan') || wid.includes('fan')) {
    // 🪭 【逍遥扇】 (Immortal Fan)
    // 纯金玉骨展开折扇、仙风道骨、飘动玉佩流苏
    ctx.rotate(-Math.PI * 0.3);

    // 扇骨柄 (Handle)
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-1.5, 0, 3, 12);

    // 扇面大张 (Unfolded Fan Silk)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 26, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.closePath();

    const fanGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 26);
    fanGrad.addColorStop(0, '#fef08a');
    fanGrad.addColorStop(0.8, '#f59e0b');
    fanGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = fanGrad;
    ctx.shadowColor = '#fef08a';
    ctx.shadowBlur = 10;
    ctx.fill();

    // 扇骨辐射金线 (Fan Ribs)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let a = -Math.PI * 0.85; a <= -Math.PI * 0.15; a += Math.PI * 0.14) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26);
      ctx.stroke();
    }
    ctx.restore();

    // 飘拂的朱红流苏 (Hanging Red Tassel)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.quadraticCurveTo(Math.sin(now * 0.005) * 5, 18, Math.sin(now * 0.005) * 8, 24);
    ctx.stroke();
  } else if (wid.includes('purgatory')) {
    // 🪓 【炼狱巨斧】 (Purgatory Battleaxe)
    ctx.rotate(-Math.PI * 0.4);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-2, -32, 4, 45);

    // 双月斧刃 (Twin Crescent Blades)
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.quadraticCurveTo(-14, -30, -16, -18);
    ctx.quadraticCurveTo(-10, -12, 0, -14);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else {
    // 默认新手木剑 / 乌木剑 / 铁剑 (Standard Broadsword / Wood Sword)
    ctx.rotate(-Math.PI * 0.4);
    const isWood = wid.includes('wooden') || wid.includes('ebony');

    // 剑柄
    ctx.fillStyle = isWood ? '#78350f' : '#334155';
    ctx.fillRect(-1.5, 0, 3, 10);
    // 护手
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-6, -2, 12, 3);
    // 剑刃
    ctx.fillStyle = isWood ? (wid.includes('ebony') ? '#1c1917' : '#d97706') : '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(-3, -2);
    ctx.lineTo(-2.5, -30);
    ctx.lineTo(0, -34);
    ctx.lineTo(2.5, -30);
    ctx.lineTo(3, -2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  ctx.restore();
}

// ----------------------------------------------------
// K. 下肢、战靴与踏云履 (Legs & Boots)
// ----------------------------------------------------
function drawLegs(
  ctx: CanvasRenderingContext2D,
  legAngleL: number,
  kneeAngleL: number,
  legAngleR: number,
  kneeAngleR: number,
  profession: string,
  equipment: CharacterData['equipment'] | undefined,
  isMounted?: boolean
) {
  const drawSingleLeg = (xOffset: number, legAngle: number, kneeAngle: number, isRight: boolean) => {
    ctx.save();
    ctx.translate(xOffset, 10);
    ctx.rotate(legAngle);

    const pantsColor = profession === 'warrior' ? '#334155' : profession === 'mage' ? '#1e293b' : '#14532d';
    const bootsColor = '#0f172a'; // 黑金战靴
    const trimGold = '#f59e0b';

    // 大腿 (Thigh)
    ctx.fillStyle = pantsColor;
    ctx.fillRect(-3.5, 0, 7, 10);

    ctx.translate(0, 10);
    ctx.rotate(kneeAngle);

    // 小腿与战靴 (Calf & Plated Boot)
    ctx.fillStyle = bootsColor;
    ctx.fillRect(-3, 0, 6, 10);

    // 金色护膝
    ctx.fillStyle = trimGold;
    ctx.beginPath();
    ctx.arc(0, 1, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 靴底 (Boot Sole)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(isRight ? 1 : -1, 10, 4.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = trimGold;
    ctx.lineWidth = 0.6;
    ctx.stroke();

    ctx.restore();
  };

  drawSingleLeg(-5.5, legAngleL, kneeAngleL, false);
  drawSingleLeg(5.5, legAngleR, kneeAngleR, true);
}

// ----------------------------------------------------
// L. 施法特效 (Casting Gathering Aura)
// ----------------------------------------------------
function drawCastingAura(ctx: CanvasRenderingContext2D, now: number, profession: string) {
  ctx.save();
  const auraColor = profession === 'mage' ? '#38bdf8' : profession === 'taoist' ? '#10b981' : '#f59e0b';
  const pulse = (Math.sin(now * 0.01) + 1) * 0.5;

  ctx.strokeStyle = auraColor;
  ctx.shadowColor = auraColor;
  ctx.shadowBlur = 14;
  ctx.lineWidth = 1.5;

  // 双手能量球
  ctx.fillStyle = auraColor;
  ctx.beginPath();
  ctx.arc(-10, -22, 3 + pulse * 2, 0, Math.PI * 2);
  ctx.arc(10, -22, 3 + pulse * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ----------------------------------------------------
// M. 斩击刀光拖尾 (Dynamic Blade Slash Trail)
// ----------------------------------------------------
function drawSlashBladeTrail(ctx: CanvasRenderingContext2D, profession: string, progress: number) {
  ctx.save();
  const slashColor = profession === 'warrior' ? '#ef4444' : profession === 'mage' ? '#38bdf8' : '#10b981';

  ctx.strokeStyle = slashColor;
  ctx.shadowColor = slashColor;
  ctx.shadowBlur = 16;
  ctx.lineWidth = 3.5;

  ctx.beginPath();
  ctx.arc(0, 0, 32, -Math.PI * 0.6, Math.PI * 0.4);
  ctx.stroke();

  // 核心亮白刀芒
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 32, -Math.PI * 0.4, Math.PI * 0.2);
  ctx.stroke();

  ctx.restore();
}
