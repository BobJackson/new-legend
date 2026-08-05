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
  frameOffsetY: number;
  capeSwayX: number;
  breathing: number;
}

const blendStateMap = new Map<string, SkeletalState>();

/**
 * Procedural 2.5D Depth Map Displacement & Tessellation Shader for Facial Contours.
 * Generates 3D facial depth (brow ridge, eye sockets, nose bridge, cheekbones, chin, lips)
 * with micro-tessellated polygon grid subdivision, normal mapping, specular highlights,
 * and subsurface skin warmth gradients.
 */
function renderTessellatedFacialDepthMap(
  ctx: CanvasRenderingContext2D,
  headRadius: number,
  isFemale: boolean,
  skinBase: string,
  skinShadow: string,
  now: number,
  gazeX: number,
  gazeY: number
) {
  // Heightmap function Z(u, v) where u in [-1, 1], v in [-1, 1]
  const getFacialDepth = (u: number, v: number): number => {
    const r2 = u * u + v * v;
    if (r2 > 1.0) return 0;
    let z = Math.sqrt(Math.max(0, 1.0 - r2)) * 0.7; // Base skull sphere

    // Brow ridge elevation
    if (v >= -0.45 && v <= -0.1) {
      const browDist = 1 - Math.abs((v + 0.25) / 0.15);
      z += browDist * 0.45 * Math.cos(u * 1.5);
    }

    // Eye socket depressions
    const leftEyeDist = Math.hypot(u + 0.42, v + 0.15);
    const rightEyeDist = Math.hypot(u - 0.42, v + 0.15);
    if (leftEyeDist < 0.35) z -= (0.35 - leftEyeDist) * 1.1;
    if (rightEyeDist < 0.35) z -= (0.35 - rightEyeDist) * 1.1;

    // Nose bridge & ridge
    if (Math.abs(u) < 0.28 && v >= -0.25 && v <= 0.4) {
      const noseW = 1.0 - Math.abs(u / 0.28);
      const noseH = Math.sin(((v + 0.25) / 0.65) * Math.PI);
      z += noseW * noseH * 0.95;
    }

    // Cheekbones (Zygomatic arch)
    if (Math.abs(u) > 0.35 && Math.abs(u) < 0.85 && v >= 0.0 && v <= 0.4) {
      const cheekDist = 1.0 - Math.abs((Math.abs(u) - 0.6) / 0.25);
      if (cheekDist > 0) z += cheekDist * 0.35;
    }

    // Lips & Philtrum
    if (Math.abs(u) < 0.3 && v >= 0.42 && v <= 0.72) {
      const lipU = 1.0 - Math.abs(u / 0.3);
      const lipV = Math.sin(((v - 0.42) / 0.3) * Math.PI);
      z += lipU * lipV * 0.5;
    }

    // Chin
    if (Math.abs(u) < 0.35 && v >= 0.75 && v <= 0.95) {
      const chinU = 1.0 - Math.abs(u / 0.35);
      const chinV = Math.sin(((v - 0.75) / 0.2) * Math.PI);
      z += chinU * chinV * 0.55;
    }

    return z;
  };

  // Directional Light Vector (Key light from upper-left with gaze sway)
  const lx = -0.5 + gazeX * 0.2;
  const ly = -0.7 + gazeY * 0.1;
  const lz = 0.8;
  const lLen = Math.hypot(lx, ly, lz);
  const Lx = lx / lLen, Ly = ly / lLen, Lz = lz / lLen;

  // Micro-tessellation Grid Resolution
  const gridU = 12;
  const gridV = 14;
  const stepU = 2.0 / gridU;
  const stepV = 2.0 / gridV;

  const rx = headRadius * 0.95;
  const ry = headRadius * 1.1;

  ctx.save();
  // Clip to head oval boundary
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();

  // Render Tessellated Mesh Polygons
  for (let i = 0; i < gridU; i++) {
    const u0 = -1.0 + i * stepU;
    const u1 = u0 + stepU;
    for (let j = 0; j < gridV; j++) {
      const v0 = -1.0 + j * stepV;
      const v1 = v0 + stepV;

      const z00 = getFacialDepth(u0, v0);
      const z10 = getFacialDepth(u1, v0);
      const z01 = getFacialDepth(u0, v1);
      const z11 = getFacialDepth(u1, v1);

      if (z00 === 0 && z10 === 0 && z01 === 0 && z11 === 0) continue;

      // Surface normal N
      const dzdu = (z10 - z00 + z11 - z01) * 0.5 / stepU;
      const dzdv = (z01 - z00 + z11 - z10) * 0.5 / stepV;
      const nLen = Math.hypot(-dzdu, -dzdv, 1.0);
      const Nx = -dzdu / nLen;
      const Ny = -dzdv / nLen;
      const Nz = 1.0 / nLen;

      // Diffuse Dot product
      const dotL = Math.max(0, Nx * Lx + Ny * Ly + Nz * Lz);

      // Specular highlight
      const hx = Lx, hy = Ly, hz = Lz + 1.0;
      const hLen = Math.hypot(hx, hy, hz);
      const spec = Math.pow(Math.max(0, (Nx * hx + Ny * hy + Nz * hz) / hLen), 10);

      const avgZ = (z00 + z10 + z01 + z11) * 0.25;

      const x0 = u0 * rx, x1 = u1 * rx;
      const y0 = v0 * ry, y1 = v1 * ry;

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x0, y1);
      ctx.closePath();

      if (spec > 0.4 && avgZ > 0.35) {
        ctx.fillStyle = `rgba(255, 255, 255, ${spec * 0.32})`;
      } else if (dotL < 0.35) {
        ctx.fillStyle = `rgba(20, 10, 5, ${(0.35 - dotL) * 0.35})`;
      } else {
        ctx.fillStyle = `rgba(251, 196, 171, ${avgZ * 0.22})`;
      }
      ctx.fill();

      // Micro-tessellation wireframe accent lines
      if (avgZ > 0.45 && (i === Math.floor(gridU / 2) || j === Math.floor(gridV * 0.4))) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 + spec * 0.18})`;
        ctx.lineWidth = 0.35;
        ctx.stroke();
      }
    }
  }

  // 3D Sculpted Nose Ridge Tessellation Highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  ctx.moveTo(0, -ry * 0.18);
  ctx.lineTo(0.35, ry * 0.12);
  ctx.lineTo(0, ry * 0.2);
  ctx.stroke();

  // Nose tip specular glint
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0.2, ry * 0.16, 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Renders eyes with dynamic pupil/iris gaze tracking, micro-saccades,
 * periodic natural blinking, class-themed radial iris, and specular catchlights.
 */
function renderDynamicTrackingEyes(
  ctx: CanvasRenderingContext2D,
  headRadius: number,
  isFemale: boolean,
  prof: string,
  now: number,
  lookAtTarget?: { x: number; y: number },
  absHeadX: number = 0,
  absHeadY: number = 0
) {
  // 1. GAZE VECTOR CALCULATION & CLAMPING
  let gazeX = 0;
  let gazeY = 0;

  if (lookAtTarget) {
    const dx = lookAtTarget.x - absHeadX;
    const dy = lookAtTarget.y - absHeadY;
    const dist = Math.hypot(dx, dy);
    if (dist > 1) {
      gazeX = dx / dist;
      gazeY = dy / dist;
    }
  } else {
    // Subtle organic ambient gaze drift
    gazeX = Math.sin(now * 0.0012) * 0.3;
    gazeY = Math.cos(now * 0.0017) * 0.2;
  }

  // Micro-saccades jitter for realistic biological feel
  const saccadeJitterX = Math.sin(now * 0.015) * 0.06;
  const saccadeJitterY = Math.cos(now * 0.019) * 0.06;
  gazeX += saccadeJitterX;
  gazeY += saccadeJitterY;

  const maxShiftX = isFemale ? 0.75 : 0.85;
  const maxShiftY = isFemale ? 0.55 : 0.65;
  const irisShiftX = Math.max(-maxShiftX, Math.min(maxShiftX, gazeX * maxShiftX));
  const irisShiftY = Math.max(-maxShiftY, Math.min(maxShiftY, gazeY * maxShiftY));

  // 2. PERIODIC NATURAL BLINKING ANIMATION
  const blinkCycle = (now * 0.0018) % 10;
  let blinkFactor = 0;
  if (blinkCycle > 9.2) {
    const t = (blinkCycle - 9.2) / 0.8;
    blinkFactor = Math.sin(t * Math.PI);
  }

  // 3. EYE SOCKET PARAMETERS
  const eX = isFemale ? 2.3 : 2.8;
  const eY = isFemale ? -1.0 : -1.2;
  const eW = isFemale ? 1.3 : 1.6;
  const eH = isFemale ? 1.8 : 1.4;

  const scleraGrad = ctx.createLinearGradient(0, eY - eH, 0, eY + eH);
  scleraGrad.addColorStop(0, '#e2e8f0');
  scleraGrad.addColorStop(0.3, '#f8fafc');
  scleraGrad.addColorStop(1, '#ffffff');

  let irisColorPrimary = '#3b82f6';
  let irisColorSecondary = '#1d4ed8';
  let pupilGlow = '#e0f2fe';

  if (prof === 'warrior') {
    irisColorPrimary = isFemale ? '#ef4444' : '#dc2626';
    irisColorSecondary = '#7f1d1d';
    pupilGlow = '#fca5a5';
  } else if (prof === 'mage') {
    irisColorPrimary = '#38bdf8';
    irisColorSecondary = '#0369a1';
    pupilGlow = '#e0f2fe';
  } else {
    irisColorPrimary = '#10b981';
    irisColorSecondary = '#047857';
    pupilGlow = '#a7f3d0';
  }

  const renderSingleEye = (eyeX: number, isRightEye: boolean) => {
    ctx.save();

    // Socket Clipping Mask
    ctx.beginPath();
    if (isFemale) {
      ctx.ellipse(eyeX, eY, eW, Math.max(0.1, eH * (1 - blinkFactor * 0.88)), isRightEye ? -0.08 : 0.08, 0, Math.PI * 2);
    } else {
      ctx.rect(
        eyeX - (isRightEye ? eW : 0),
        eY - 0.2 + (eH * blinkFactor * 0.4),
        eW,
        Math.max(0.1, eH * (1 - blinkFactor * 0.88))
      );
    }
    ctx.fillStyle = scleraGrad;
    ctx.fill();
    ctx.clip();

    // Socket Ambient Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.beginPath();
    ctx.rect(eyeX - eW - 1, eY - eH - 1, (eW + 1) * 2, eH * 0.6);
    ctx.fill();

    // Iris
    const irisX = (isFemale ? eyeX : eyeX - (isRightEye ? eW / 2 : -eW / 2)) + irisShiftX;
    const irisY = eY + irisShiftY;
    const irisR = isFemale ? 0.95 : 0.85;

    ctx.beginPath();
    ctx.arc(irisX, irisY, irisR, 0, Math.PI * 2);
    const irisGrad = ctx.createRadialGradient(irisX, irisY, 0.1, irisX, irisY, irisR);
    irisGrad.addColorStop(0, pupilGlow);
    irisGrad.addColorStop(0.4, irisColorPrimary);
    irisGrad.addColorStop(1, irisColorSecondary);
    ctx.fillStyle = irisGrad;
    ctx.fill();

    // Pupil
    const pupilR = isFemale ? 0.45 : 0.4;
    ctx.beginPath();
    ctx.arc(irisX, irisY, pupilR, 0, Math.PI * 2);
    ctx.fillStyle = '#020617';
    ctx.fill();

    // Catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(irisX - 0.3, irisY - 0.3, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(irisX + 0.3, irisY + 0.3, 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Eyelid line
    ctx.strokeStyle = isFemale ? '#0f172a' : '#1e293b';
    ctx.lineWidth = isFemale ? 0.9 : 0.75;
    ctx.beginPath();
    if (isFemale) {
      ctx.ellipse(eyeX, eY - eH * 0.1 + (eH * blinkFactor * 0.4), eW + 0.1, eH * 0.5, isRightEye ? -0.08 : 0.08, Math.PI, Math.PI * 2);
    } else {
      ctx.moveTo(eyeX - (isRightEye ? eW : 0), eY + (eH * blinkFactor * 0.4));
      ctx.lineTo(eyeX - (isRightEye ? eW : 0) + eW, eY + (eH * blinkFactor * 0.4));
    }
    ctx.stroke();
  };

  renderSingleEye(-eX, false);
  renderSingleEye(eX, true);

  return { gazeX, gazeY };
}

export function drawCharacterAvatar(options: DrawCharacterOptions) {
  const {
    ctx, px, py, playerCenterY, character, previewEquipment, now,
    scale = 1, isAttacking = false, attackProgress = 0,
    isMoving = false, moveProgress = 0, isMounted = false, actionOverride,
    lookAtTarget
  } = options;

  const prof = character.profession;
  const isFemale = character.gender === 'female';
  const eq = previewEquipment || character.equipment;
  const armorItem = eq?.armor || null;
  const helmetItem = eq?.helmet || null;
  const weaponItem = eq?.weapon || null;

  let action = actionOverride || (isAttacking ? (prof === 'warrior' ? 'attack' : 'cast') : (isMoving ? 'walk' : 'idle'));

  // --- SKELETAL STATE ---
  let spineAngle = 0;
  let chestOffsetY = 0;
  let legAngleL = 0, kneeAngleL = 0;
  let legAngleR = 0, kneeAngleR = 0;
  let armAngleL = 0, elbowAngleL = 0;
  let armAngleR = 0, elbowAngleR = 0;
  let weaponAngle = -0.35;
  let frameOffsetY = 0;
  let capeSwayX = 0;
  let breathing = 0;

  // --- KINEMATICS ---
  if (isMounted) {
    legAngleL = -35; kneeAngleL = 70;
    legAngleR = 35; kneeAngleR = 70;
    if (action === 'attack') {
      const prog = isAttacking ? attackProgress : ((now * 0.008) % 1);
      spineAngle = 0.2 - Math.sin(prog * Math.PI) * 0.4;
      armAngleR = -20 + prog * 100; elbowAngleR = -40 + prog * 40;
      weaponAngle = -1.5 + prog * 2.5;
      frameOffsetY = -Math.sin(prog * Math.PI) * 4;
      capeSwayX = -8;
    } else if (action === 'cast') {
      const prog = isAttacking ? attackProgress : ((now * 0.006) % 1);
      spineAngle = -0.1;
      armAngleR = -120; elbowAngleR = -20;
      weaponAngle = -0.5 + prog;
      frameOffsetY = -3;
    } else if (isMoving) {
      const gallopPhase = (now * 0.018) % (Math.PI * 2);
      spineAngle = 0.3 + Math.sin(gallopPhase) * 0.1;
      frameOffsetY = Math.sin(gallopPhase) * 5;
      capeSwayX = Math.sin(gallopPhase) * 14 - 8; 
      armAngleL = -20; armAngleR = 15;
    } else {
      const rideIdle = Math.sin(now * 0.004);
      frameOffsetY = rideIdle * 2; spineAngle = 0.1;
      armAngleL = -15; armAngleR = 10;
    }
  } else if (action === 'walk') {
    const walkPhase = (moveProgress || ((now * 0.008) % 1)) * Math.PI * 2;
    spineAngle = 0.1; 
    frameOffsetY = -Math.abs(Math.sin(walkPhase)) * 2;
    legAngleL = Math.sin(walkPhase) * 35; kneeAngleL = legAngleL > 0 ? -legAngleL * 0.8 : 0; 
    legAngleR = -Math.sin(walkPhase) * 35; kneeAngleR = legAngleR > 0 ? -legAngleR * 0.8 : 0;
    armAngleL = -Math.sin(walkPhase) * 30; elbowAngleL = armAngleL > 0 ? -armAngleL * 0.5 : -10;
    armAngleR = Math.sin(walkPhase) * 30; elbowAngleR = armAngleR > 0 ? -armAngleR * 0.5 : -10;
    capeSwayX = Math.sin(walkPhase) * 5;
    weaponAngle = -0.35 + Math.sin(walkPhase) * 0.2;
  } else if (action === 'attack') {
    const prog = isAttacking ? attackProgress : ((now * 0.008) % 1);
    if (prog < 0.2) {
      spineAngle = -0.25; armAngleR = -100; elbowAngleR = -60;
      weaponAngle = -1.8; frameOffsetY = 2; armAngleL = 20; elbowAngleL = -20;
    } else if (prog < 0.6) {
      const sn = (prog - 0.2) / 0.4;
      spineAngle = -0.25 + sn * 0.7; armAngleR = -100 + sn * 200; elbowAngleR = -60 + sn * 60;
      weaponAngle = -1.8 + sn * 3.5; frameOffsetY = 2 - Math.sin(sn * Math.PI) * 4;
      armAngleL = 20 - sn * 40;
    } else {
      spineAngle = 0.45; armAngleR = 100; elbowAngleR = 0;
      weaponAngle = 1.7; frameOffsetY = 2; armAngleL = -20;
    }
  } else if (action === 'cast') {
    const prog = isAttacking ? attackProgress : ((now * 0.006) % 1);
    if (prog < 0.3) {
      spineAngle = -0.1; armAngleR = -130; elbowAngleR = -30; weaponAngle = -0.6; frameOffsetY = -1;
    } else if (prog < 0.7) {
      spineAngle = 0.25; armAngleR = -40; elbowAngleR = -10; weaponAngle = 0.6; frameOffsetY = 1;
    } else {
      spineAngle = 0.1; armAngleR = -30; weaponAngle = 0;
    }
    armAngleL = -30; elbowAngleL = -40;
  } else {
    // IDLE - Organic Breathing & Class-Specific Stances
    const idlePhase = (now * 0.002) % (Math.PI * 2);
    breathing = Math.sin(idlePhase);
    chestOffsetY = breathing * -0.5; // Very subtle shift, not jerky

    if (prof === 'warrior') {
      // 战士：沉稳且充满爆发力的重压防守姿态 (Grounded Heavy Power Stance)
      spineAngle = 0.08 + breathing * 0.015;
      legAngleL = -12; kneeAngleL = 18;
      legAngleR = 12; kneeAngleR = 18;
      armAngleR = 26 + breathing * 2; elbowAngleR = -28;
      armAngleL = -18 - breathing * 2; elbowAngleL = -20;
      weaponAngle = -0.55 + breathing * 0.02;
      capeSwayX = Math.sin(now * 0.0018) * 3;
    } else if (prof === 'mage') {
      // 法师：凌空御气神秘姿态 (Hovering Arcane Stance & Open Palm Magic Gathering)
      const hoverY = Math.sin(now * 0.003) * 3;
      frameOffsetY = hoverY;
      spineAngle = -0.04 + breathing * 0.01;
      legAngleL = -4; kneeAngleL = 8;
      legAngleR = 6; kneeAngleR = 12;
      armAngleR = -28 + breathing * 2.5; elbowAngleR = -18;
      armAngleL = -50 + breathing * 3.5; elbowAngleL = -45;
      weaponAngle = 0.15 - breathing * 0.02;
      capeSwayX = Math.sin(now * 0.0022) * 5;
    } else {
      // 道士：仙风道骨阴阳太极姿态 (Taoist Zen Stance & Secret Mudra Seal)
      spineAngle = 0.02 + breathing * 0.01;
      legAngleL = -6; kneeAngleL = 10;
      legAngleR = 8; kneeAngleR = 6;
      armAngleR = 18 + breathing * 1.5; elbowAngleR = -15;
      armAngleL = -62 + breathing * 2; elbowAngleL = -75;
      weaponAngle = -0.75 + breathing * 0.02;
      capeSwayX = Math.sin(now * 0.0012) * 2.5;
    }
  }

  // --- ACTION BLENDING SYSTEM ---
  const charId = character.id || 'default_player';
  const cached = blendStateMap.get(charId);
  if (cached) {
    const deltaTime = Math.min(100, now - cached.lastTime);
    if (deltaTime > 0 && deltaTime < 500) {
      // 80ms half-life creates an extremely smooth, non-laggy skeletal transition
      const t = 1 - Math.exp(-deltaTime / 80);
      spineAngle = cached.spineAngle + (spineAngle - cached.spineAngle) * t;
      chestOffsetY = cached.chestOffsetY + (chestOffsetY - cached.chestOffsetY) * t;
      legAngleL = cached.legAngleL + (legAngleL - cached.legAngleL) * t;
      kneeAngleL = cached.kneeAngleL + (kneeAngleL - cached.kneeAngleL) * t;
      legAngleR = cached.legAngleR + (legAngleR - cached.legAngleR) * t;
      kneeAngleR = cached.kneeAngleR + (kneeAngleR - cached.kneeAngleR) * t;
      armAngleL = cached.armAngleL + (armAngleL - cached.armAngleL) * t;
      elbowAngleL = cached.elbowAngleL + (elbowAngleL - cached.elbowAngleL) * t;
      armAngleR = cached.armAngleR + (armAngleR - cached.armAngleR) * t;
      elbowAngleR = cached.elbowAngleR + (elbowAngleR - cached.elbowAngleR) * t;
      weaponAngle = cached.weaponAngle + (weaponAngle - cached.weaponAngle) * t;
      frameOffsetY = cached.frameOffsetY + (frameOffsetY - cached.frameOffsetY) * t;
      capeSwayX = cached.capeSwayX + (capeSwayX - cached.capeSwayX) * t;
      breathing = cached.breathing + (breathing - cached.breathing) * t;
    }
  }

  // Update/Save the newly computed skeleton configuration
  blendStateMap.set(charId, {
    lastTime: now,
    spineAngle,
    chestOffsetY,
    legAngleL,
    kneeAngleL,
    legAngleR,
    kneeAngleR,
    armAngleL,
    elbowAngleL,
    armAngleR,
    elbowAngleR,
    weaponAngle,
    frameOffsetY,
    capeSwayX,
    breathing
  });

  // --- ANATOMY & PROPORTIONS (Realistic 2.5D) ---
  const skinBase = isFemale ? '#ffe0bd' : '#f1c27d';
  const skinShadow = isFemale ? '#e0ac69' : '#c68e4c';
  
  // 1. SKIN SHADER (Subsurface Scattering & Warmth)
  const getSkinGradient = (x1: number, y1: number, x2: number, y2: number) => {
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, skinShadow);
    grad.addColorStop(0.18, '#e07a5f'); // Warm red-pink subsurface transition
    grad.addColorStop(0.35, skinBase);
    grad.addColorStop(0.7, skinBase);
    grad.addColorStop(0.85, '#fbc4ab');  // Soft rosy highlight
    grad.addColorStop(1, skinShadow);
    return grad;
  };

  // 2. METAL SHADER (High Gloss, Multiple Reflection Bands & Chrome Highlights)
  const getMetalGradient = (x1: number, y1: number, x2: number, y2: number, base: string, dark: string, light: string) => {
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, '#090d16');       // Deep ambient shadow
    grad.addColorStop(0.12, dark);
    grad.addColorStop(0.3, base);
    grad.addColorStop(0.48, '#ffffff');    // Brilliant primary specular highlight
    grad.addColorStop(0.55, light);
    grad.addColorStop(0.75, dark);
    grad.addColorStop(0.88, '#ffffff');    // Secondary specular highlight (edge reflection)
    grad.addColorStop(0.94, light);
    grad.addColorStop(1, '#05070c');       // Rim shadow
    return grad;
  };

  // 3. LEATHER SHADER (Satin Shine & Organic Curvature)
  const getLeatherGradient = (x1: number, y1: number, x2: number, y2: number, base: string, dark: string, light: string) => {
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, dark);
    grad.addColorStop(0.25, dark);
    grad.addColorStop(0.45, base);
    grad.addColorStop(0.65, light);       // Semi-gloss warm specular point
    grad.addColorStop(0.85, base);
    grad.addColorStop(1, '#070707');
    return grad;
  };

  // 4. CLOTH SHADER (Velvety, Soft, Low Specular Diffuse Light)
  const getClothGradient = (x1: number, y1: number, x2: number, y2: number, base: string, dark: string, light: string) => {
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, dark);
    grad.addColorStop(0.3, base);
    grad.addColorStop(0.7, light);
    grad.addColorStop(1, dark);
    return grad;
  };

  // Shader dispatcher
  const getMaterialGradient = (
    x1: number, y1: number, x2: number, y2: number, 
    type: string, base: string, dark: string, light: string
  ) => {
    if (type === 'metal') return getMetalGradient(x1, y1, x2, y2, base, dark, light);
    if (type === 'leather') return getLeatherGradient(x1, y1, x2, y2, base, dark, light);
    return getClothGradient(x1, y1, x2, y2, base, dark, light);
  };

  const getCylinderGradient = (colorBase: string, colorDark: string, colorLight: string, w: number) => {
    return getMaterialGradient(-w, 0, w, 0, matType, colorBase, colorDark, colorLight);
  };

  // 5. SPECULAR SHIMMER GLOSS OVERLAY (Moves dynamically with breathe/walk phases)
  const drawSpecularGlossOverlay = (
    w: number, length: number, type: string, 
    offsetX: number, offsetY: number, angle = 0.2
  ) => {
    if (type !== 'metal' && type !== 'leather') return;
    
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.rotate(angle);
    ctx.globalCompositeOperation = 'source-atop'; // Restrict drawing strictly within the bounds of the parent shape
    
    // Calculate a dynamic specular highlight drift based on character's motion/idle breathe
    const shift = Math.sin(now * 0.002) * w * 0.7;
    const opacity = type === 'metal' ? 0.4 : 0.15;
    
    const grad = ctx.createLinearGradient(-w * 1.5 + shift, 0, w * 1.5 + shift, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.46, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(255,255,255,' + opacity + ')'); // Shiny spec glint
    grad.addColorStop(0.54, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = grad;
    ctx.fillRect(-w * 2, -10, w * 4, length + 20);
    ctx.restore();
  };

  // --- MATERIAL COLORS ---
  const aName = armorItem?.name || '';
  let matType = 'cloth'; 
  let armorPrimary = '#475569', armorSecondary = '#1e293b', armorTrim = '#e2e8f0';
  let capeColor1 = '#991b1b', capeColor2 = '#450a0a', capeBorder = '#f59e0b';
  let legColor = '#1e293b', bootColor = '#334155', bootTrim = '#94a3b8';
  let showCape = !aName.includes('布衣');

  if (prof === 'warrior') {
    matType = 'metal'; 
    armorPrimary = isFemale ? '#d97706' : '#b45309'; // Golden
    armorSecondary = '#7f1d1d'; // Crimson Red
    armorTrim = '#fef08a'; // Bright Gold Trim
    capeColor1 = '#ffffff'; // White flowing cape
    capeColor2 = '#e2e8f0'; 
    capeBorder = '#d97706'; 
    showCape = true;
  } else if (prof === 'mage') {
    matType = 'cloth'; armorPrimary = isFemale ? '#7e22ce' : '#4338ca'; armorSecondary = isFemale ? '#3b0764' : '#1e1b4b'; armorTrim = '#c084fc';
  } else {
    matType = 'leather'; armorPrimary = isFemale ? '#0f766e' : '#065f46'; armorSecondary = isFemale ? '#042f2e' : '#022c22'; armorTrim = '#6ee7b7';
  }

  if (aName.includes('布衣') || armorItem?.id === 'armor_cloth_shirt') {
    matType = 'cloth'; armorPrimary = isFemale ? '#be185d' : '#854d0e'; armorSecondary = isFemale ? '#831843' : '#451a03'; armorTrim = '#fde047'; showCape = false;
  } else if (aName.includes('战神') || aName.includes('圣战') || armorItem?.id === 'armor_heavy_armor') {
    matType = 'metal'; armorPrimary = '#b91c1c'; armorSecondary = '#7f1d1d'; armorTrim = '#fde047'; capeColor1 = '#b91c1c'; capeColor2 = '#7f1d1d'; capeBorder = '#fef08a'; legColor = '#7f1d1d'; bootColor = '#991b1b'; bootTrim = '#fde047';
  } else if (aName.includes('沙城') || aName.includes('霸者') || armorItem?.id === 'armor_sabak_god') {
    matType = 'metal'; armorPrimary = '#d97706'; armorSecondary = '#78350f'; armorTrim = '#fef08a'; capeColor1 = '#d97706'; capeColor2 = '#78350f'; capeBorder = '#fde047'; legColor = '#78350f'; bootColor = '#b45309'; bootTrim = '#fef08a';
  } else if (aName.includes('破天') || armorItem?.id === 'armor_heaven') {
    matType = 'metal'; armorPrimary = '#0284c7'; armorSecondary = '#0c4a6e'; armorTrim = '#38bdf8'; capeColor1 = '#0284c7'; capeColor2 = '#0369a1'; capeBorder = '#7dd3fc'; legColor = '#0c4a6e'; bootColor = '#0369a1'; bootTrim = '#38bdf8';
  } else if (aName.includes('狂龙') || armorItem?.id === 'armor_dragon') {
    matType = 'metal'; armorPrimary = '#dc2626'; armorSecondary = '#450a0a'; armorTrim = '#f59e0b'; capeColor1 = '#ef4444'; capeColor2 = '#7f1d1d'; capeBorder = '#fbbf24'; legColor = '#450a0a'; bootColor = '#991b1b'; bootTrim = '#f59e0b';
  } else if (aName.includes('深渊') || armorItem?.id === 'armor_abyss') {
    matType = 'metal'; armorPrimary = '#7e22ce'; armorSecondary = '#2e1065'; armorTrim = '#c084fc'; capeColor1 = '#581c87'; capeColor2 = '#1e1b4b'; capeBorder = '#e879f9'; legColor = '#2e1065'; bootColor = '#3b0764'; bootTrim = '#c084fc';
  } else if (aName.includes('远古魔龙') || armorItem?.id === 'armor_ancient_dragon') {
    matType = 'metal'; armorPrimary = '#059669'; armorSecondary = '#022c22'; armorTrim = '#fef08a'; capeColor1 = '#047857'; capeColor2 = '#064e3b'; capeBorder = '#fde047'; legColor = '#022c22'; bootColor = '#065f46'; bootTrim = '#fef08a';
  } else if (aName.includes('创世神') || armorItem?.id === 'armor_genesis') {
    matType = 'metal'; armorPrimary = '#fef08a'; armorSecondary = '#d97706'; armorTrim = '#ffffff'; capeColor1 = '#ffffff'; capeColor2 = '#fef08a'; capeBorder = '#ffffff'; legColor = '#fef08a'; bootColor = '#d97706'; bootTrim = '#ffffff';
  } else if (aName.includes('法神') || aName.includes('烈焰')) {
    matType = 'cloth'; armorPrimary = '#6b21a8'; armorSecondary = '#3b0764'; armorTrim = '#e879f9'; capeColor1 = '#6b21a8'; capeColor2 = '#3b0764'; capeBorder = '#e879f9'; legColor = '#3b0764'; bootColor = '#581c87'; bootTrim = '#c084fc';
  }

  ctx.save();
  ctx.translate(px, playerCenterY + frameOffsetY);
  ctx.scale(scale, scale);

  // --- 0. CLASS AMBIENT GROUND AURA (职业专属脚下环境光辉) ---
  ctx.save();
  const auraPhase = (now * 0.003) % (Math.PI * 2);
  const auraPulse = Math.sin(auraPhase) * 2.5;

  if (prof === 'warrior') {
    // 战士：威严烈火重力压迫光圈 (Crimson-Gold Heavy Martial Ground Ring)
    ctx.beginPath();
    ctx.ellipse(0, 24, 22 + auraPulse, 10 + auraPulse * 0.4, 0, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.8)';
    ctx.shadowColor = '#ea580c';
    ctx.shadowBlur = 18;
    ctx.stroke();

    ctx.fillStyle = 'rgba(234, 88, 12, 0.2)';
    ctx.fill();

    // Ground Martial Particle Sparks
    for (let i = 0; i < 4; i++) {
      const spAng = auraPhase + (i * Math.PI) / 2;
      const spDist = 18 + Math.sin(auraPhase + i) * 4;
      const spx = Math.cos(spAng) * spDist;
      const spy = 24 + Math.sin(spAng) * spDist * 0.45;
      ctx.fillStyle = i % 2 === 0 ? '#fef08a' : '#f97316';
      ctx.fillRect(spx - 1.5, spy - 1.5, 3, 3);
    }
  } else if (prof === 'mage') {
    // 法师：秘法蓝紫奥术光辉星芒阵 (Arcane Cosmic Magic Aura)
    ctx.beginPath();
    ctx.ellipse(0, 24, 20 + auraPulse, 9 + auraPulse * 0.4, 0, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 20;
    ctx.stroke();

    ctx.fillStyle = 'rgba(126, 34, 206, 0.22)';
    ctx.fill();

    // Swirling Cosmic Star Motes
    for (let i = 0; i < 5; i++) {
      const mAng = -auraPhase * 1.5 + (i * Math.PI * 2) / 5;
      const mx = Math.cos(mAng) * (18 + auraPulse);
      const my = 24 + Math.sin(mAng) * (8 + auraPulse * 0.4);
      ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#e879f9';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(mx, my, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // 道士：仙风道骨碧绿太极阴阳玄光 (Taoist Emerald Taiji Aura)
    ctx.beginPath();
    ctx.ellipse(0, 24, 20 + auraPulse, 9 + auraPulse * 0.4, 0, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 18;
    ctx.stroke();

    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.fill();

    // Rotating Yin-Yang Taiji Symbol
    ctx.save();
    ctx.translate(0, 24);
    ctx.scale(1, 0.45);
    ctx.rotate(auraPhase * 0.5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath(); ctx.arc(0, 0, 11, -Math.PI / 2, Math.PI / 2); ctx.fill();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.65)';
    ctx.beginPath(); ctx.arc(0, 0, 11, Math.PI / 2, (Math.PI * 3) / 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -5.5, 5.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 5.5, 5.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(16, 185, 129, 0.65)'; ctx.fill();
    ctx.restore();
  }

  // --- 0.5. SPECIAL ARMOR RADIANT BODY AURA & PARTICLES (高级铠甲专属穿戴特效光辉) ---
  if (aName.includes('创世神') || armorItem?.id === 'armor_genesis') {
    // Genesis Divine Aura
    ctx.beginPath();
    ctx.ellipse(0, 5, 20 + Math.sin(now * 0.005) * 3, 26 + Math.cos(now * 0.005) * 3, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 3;
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 20;
    ctx.stroke(); ctx.shadowBlur = 0;
    for (let i = 0; i < 5; i++) {
      const pAng = now * 0.003 + (i * Math.PI * 2) / 5;
      const pxOffset = Math.cos(pAng) * 18;
      const pyOffset = Math.sin(pAng) * 24;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(pxOffset, pyOffset, 1.5 + Math.sin(now * 0.01 + i), 0, Math.PI * 2); ctx.fill();
    }
  } else if (aName.includes('远古魔龙') || armorItem?.id === 'armor_ancient_dragon') {
    // Emerald Dragon Sovereign Body Aura
    ctx.beginPath();
    ctx.ellipse(0, 5, 16 + Math.sin(now * 0.005) * 2, 22 + Math.cos(now * 0.005) * 2, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)'; ctx.lineWidth = 2;
    ctx.shadowColor = '#10b981'; ctx.shadowBlur = 15;
    ctx.stroke(); ctx.shadowBlur = 0;
    for (let i = 0; i < 3; i++) {
      const pAng = now * 0.004 + (i * Math.PI * 2) / 3;
      const pxOffset = Math.cos(pAng) * 14;
      const pyOffset = Math.sin(pAng) * 20;
      ctx.fillStyle = '#fde047'; ctx.shadowColor = '#fde047'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(pxOffset, pyOffset, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  } else if (aName.includes('深渊') || armorItem?.id === 'armor_abyss') {
    // Abyssal Phantom Void Particle Aura
    ctx.beginPath();
    ctx.ellipse(0, 5, 15 + Math.cos(now * 0.004) * 2, 20 + Math.sin(now * 0.004) * 2, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.65)'; ctx.lineWidth = 1.8;
    ctx.shadowColor = '#c084fc'; ctx.shadowBlur = 16;
    ctx.stroke(); ctx.shadowBlur = 0;
    for (let i = 0; i < 4; i++) {
      const pAng = -now * 0.003 + (i * Math.PI * 2) / 4;
      const pxOffset = Math.cos(pAng) * 13;
      const pyOffset = Math.sin(pAng) * 18;
      ctx.fillStyle = '#e879f9'; ctx.shadowColor = '#e879f9'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(pxOffset, pyOffset, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  } else if (aName.includes('狂龙') || armorItem?.id === 'armor_dragon') {
    // Blazing Dragon Scale Flame Sparks
    for (let i = 0; i < 3; i++) {
      const fTime = (now * 0.006 + i * 2.1) % (Math.PI * 2);
      const fx = Math.sin(fTime * 2 + i) * 12;
      const fy = 15 - (fTime * 6) % 30;
      ctx.fillStyle = i % 2 === 0 ? '#f97316' : '#ef4444';
      ctx.shadowColor = '#f97316'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(fx, fy, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (aName.includes('破天') || armorItem?.id === 'armor_heaven') {
    // Sky-Breaker Lightning Sparks
    for (let i = 0; i < 3; i++) {
      const lTime = (now * 0.008 + i * 1.5) % (Math.PI * 2);
      const lx = Math.cos(lTime * 3) * 13;
      const ly = Math.sin(lTime * 2) * 16;
      ctx.fillStyle = '#38bdf8'; ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 10;
      ctx.fillRect(lx, ly, 2, 2);
    }
  } else if (aName.includes('沙城') || aName.includes('霸者') || armorItem?.id === 'armor_sabak_god') {
    // Imperial Overlord Golden Ring
    ctx.beginPath();
    ctx.ellipse(0, 6, 14, 18, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)'; ctx.lineWidth = 1.5;
    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 12;
    ctx.stroke(); ctx.shadowBlur = 0;
  }
  ctx.restore();

  const drawLimb = (
    w: number, length: number, isLeg: boolean, hasArmor: boolean, 
    baseColor: string, darkColor: string, lightColor: string, 
    taper = 0.8
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    
    // Organic muscle curves
    if (isLeg) {
      ctx.quadraticCurveTo(-w - 1.5, length * 0.4, -w * taper, length);
      ctx.lineTo(w * taper, length);
      ctx.quadraticCurveTo(w + 1.5, length * 0.4, w, 0);
    } else {
      ctx.quadraticCurveTo(-w - 1.0, length * 0.5, -w * taper, length);
      ctx.lineTo(w * taper, length);
      ctx.quadraticCurveTo(w + 1.0, length * 0.5, w, 0);
    }
    ctx.closePath();
    
    const currentMat = hasArmor ? matType : 'skin';
    
    if (currentMat === 'skin') {
       ctx.fillStyle = getSkinGradient(-w, 0, w, 0);
    } else {
       ctx.fillStyle = getMaterialGradient(-w, 0, w, 0, currentMat, baseColor, darkColor, lightColor);
    }
    ctx.fill();
    
    // Dynamic specular specular gloss shimmer mapping
    if (currentMat === 'metal' || currentMat === 'leather') {
       drawSpecularGlossOverlay(w, length, currentMat, 0, 0, 0.15);
    }
    
    // Removed hard limb strokes to prevent "stitched" doll look
    if (hasArmor && currentMat === 'metal') {
       ctx.strokeStyle = 'rgba(255,255,255,0.3)';
       ctx.lineWidth = 0.5;
       ctx.stroke();
    }

    // Joint shading
    const grad = ctx.createLinearGradient(0, length - 4, 0, length);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  };

  const drawBoot = (w: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-w*0.8, 0);
    ctx.lineTo(w*0.8, 0);
    ctx.lineTo(w*1.2, 10);
    ctx.lineTo(w*1.5, 12); // Toe
    ctx.lineTo(-w*0.9, 12); // Heel
    ctx.closePath();
    
    const bootMat = matType === 'metal' ? 'metal' : 'leather';
    ctx.fillStyle = getMaterialGradient(-w*1.2, 0, w*1.2, 0, bootMat, bootColor, '#000000', bootTrim);
    ctx.fill();
    
    if (bootMat === 'metal' || bootMat === 'leather') {
       drawSpecularGlossOverlay(w*1.2, 12, bootMat, 0, 0, 0.1);
    }
    
    ctx.strokeStyle = bootTrim;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  };

  const drawArm = (isLeft: boolean) => {
    ctx.save();
    const shoulderX = isLeft ? -9 : 9;
    const shoulderY = -12;
    ctx.translate(shoulderX, shoulderY);
    ctx.rotate((isLeft ? armAngleL : armAngleR) * Math.PI / 180);

    const armW = isFemale ? 2.0 : 3.0;
    const upperArmL = 15;
    const lowerArmL = 17;

    // Shoulder pad & Pauldrons
    if (aName || matType === 'metal') {
      ctx.save();
      const pSize = isFemale ? 5.5 : 7.0;
      
      if (aName.includes('创世神') || armorItem?.id === 'armor_genesis') {
        // Genesis Divine Winged Pauldrons
        ctx.beginPath();
        ctx.moveTo(0, pSize);
        ctx.quadraticCurveTo(-pSize * 2, -pSize, -pSize * 2.5, -pSize * 2);
        ctx.lineTo(-pSize * 1.5, -pSize * 2.5);
        ctx.lineTo(0, -pSize);
        ctx.lineTo(pSize * 1.5, -pSize * 2.5);
        ctx.lineTo(pSize * 2.5, -pSize * 2);
        ctx.quadraticCurveTo(pSize * 2, -pSize, 0, pSize);
        ctx.closePath();
        ctx.fillStyle = getMetalGradient(-pSize * 2.5, 0, pSize * 2.5, 0, '#ffffff', '#fef08a', '#d97706');
        ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        // Divine Core Gem
        ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(0, -pSize * 0.5, 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      } else if (aName.includes('远古魔龙') || armorItem?.id === 'armor_ancient_dragon') {
        // Primordial Dragon-God Emerald Pauldrons
        ctx.beginPath();
        ctx.arc(0, -2, pSize * 1.5, Math.PI, 0);
        ctx.lineTo(pSize * 1.8, pSize * 1.3);
        ctx.lineTo(0, pSize * 1.6);
        ctx.lineTo(-pSize * 1.8, pSize * 1.3);
        ctx.closePath();
        ctx.fillStyle = getMetalGradient(-pSize * 1.8, 0, pSize * 1.8, 0, '#059669', '#022c22', '#fef08a');
        ctx.fill();
        ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 1.5; ctx.stroke();
        // Emerald Dragon Core Gem
        ctx.fillStyle = '#10b981'; ctx.shadowColor = '#34d399'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(0, 1, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      } else if (aName.includes('深渊') || armorItem?.id === 'armor_abyss') {
        // Abyssal Phantom Void Horn Pauldrons
        ctx.beginPath();
        ctx.moveTo(-pSize * 1.6, pSize);
        ctx.quadraticCurveTo(-pSize * 2.0, -pSize * 1.5, 0, -pSize * 1.8);
        ctx.quadraticCurveTo(pSize * 2.0, -pSize * 1.5, pSize * 1.6, pSize);
        ctx.lineTo(0, pSize * 1.2);
        ctx.closePath();
        ctx.fillStyle = getMetalGradient(-pSize * 1.8, 0, pSize * 1.8, 0, '#7e22ce', '#2e1065', '#c084fc');
        ctx.fill();
        ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 1.3; ctx.stroke();
        // Abyssal Void Gem
        ctx.fillStyle = '#e879f9'; ctx.shadowColor = '#c084fc'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      } else if (aName.includes('狂龙') || armorItem?.id === 'armor_dragon') {
        // Fiery Dragon Horn Spike Pauldrons
        ctx.beginPath();
        ctx.arc(0, -1, pSize * 1.4, Math.PI, 0);
        ctx.lineTo(pSize * 1.7, pSize * 1.4);
        ctx.lineTo(pSize * 0.8, pSize * 0.8);
        ctx.lineTo(0, pSize * 1.5);
        ctx.lineTo(-pSize * 0.8, pSize * 0.8);
        ctx.lineTo(-pSize * 1.7, pSize * 1.4);
        ctx.closePath();
        ctx.fillStyle = getMetalGradient(-pSize * 1.7, 0, pSize * 1.7, 0, '#dc2626', '#450a0a', '#fbbf24');
        ctx.fill();
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.3; ctx.stroke();
        // Flame Core
        ctx.fillStyle = '#f97316'; ctx.shadowColor = '#f97316'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(0, 1, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      } else if (aName.includes('破天') || armorItem?.id === 'armor_heaven') {
        // Celestial Lightning Blade Pauldrons
        ctx.beginPath();
        ctx.arc(0, -2, pSize * 1.3, Math.PI, 0);
        ctx.lineTo(pSize * 1.6, pSize * 1.1);
        ctx.lineTo(0, pSize * 1.3);
        ctx.lineTo(-pSize * 1.6, pSize * 1.1);
        ctx.closePath();
        ctx.fillStyle = getMetalGradient(-pSize * 1.6, 0, pSize * 1.6, 0, '#0284c7', '#0c4a6e', '#7dd3fc');
        ctx.fill();
        ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.3; ctx.stroke();
        // Celestial Lightning Gem
        ctx.fillStyle = '#38bdf8'; ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(0, 0, 2.0, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      } else if (aName.includes('沙城') || aName.includes('霸者') || armorItem?.id === 'armor_sabak_god') {
        // Imperial Gold Winged Dragon Pauldrons
        ctx.beginPath();
        ctx.arc(0, -1, pSize * 1.3, Math.PI, 0);
        ctx.lineTo(pSize * 1.6, pSize);
        ctx.lineTo(0, pSize * 1.4);
        ctx.lineTo(-pSize * 1.6, pSize);
        ctx.closePath();
        ctx.fillStyle = getMetalGradient(-pSize * 1.6, 0, pSize * 1.6, 0, '#f59e0b', '#78350f', '#fef08a');
        ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
        
        // Dragon Crest Gem
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(0, 2, 2, 0, Math.PI * 2); ctx.fill();
      } else if (aName.includes('战神') || aName.includes('圣战') || armorItem?.id === 'armor_heavy_armor') {
        // Crimson Lion-Head Heavy Pauldrons
        ctx.beginPath();
        ctx.arc(0, -1, pSize * 1.2, Math.PI, 0);
        ctx.lineTo(pSize * 1.4, pSize * 1.2);
        ctx.lineTo(-pSize * 1.4, pSize * 1.2);
        ctx.closePath();
        ctx.fillStyle = getMetalGradient(-pSize * 1.4, 0, pSize * 1.4, 0, '#b91c1c', '#450a0a', '#fde047');
        ctx.fill();
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1.2; ctx.stroke();
      } else if (!aName.includes('布衣')) {
        // Massive Epic Golden/Spiked Pauldron for Warrior default
        if (prof === 'warrior') {
            ctx.beginPath();
            ctx.arc(0, -2, armW * 2.8, Math.PI, 0); // Very large round top
            ctx.lineTo(armW * 3, armW * 2);
            ctx.lineTo(armW * 1.5, armW * 3);
            ctx.lineTo(-armW * 1.5, armW * 3);
            ctx.lineTo(-armW * 3, armW * 2);
            ctx.closePath();
            ctx.fillStyle = getMetalGradient(-armW * 3, 0, armW * 3, 0, '#d97706', '#7f1d1d', '#fef08a');
            ctx.fill();
            ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 1.5; ctx.stroke();

            // Giant Spikes
            ctx.fillStyle = getMetalGradient(0, -5, 0, -armW * 5, '#fef08a', '#d97706', '#ffffff');
            ctx.beginPath(); ctx.moveTo(-armW * 1.5, -armW); ctx.lineTo(0, -armW * 4); ctx.lineTo(armW * 1.5, -armW); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-armW * 2.5, 0); ctx.lineTo(-armW * 3, -armW * 3); ctx.lineTo(-armW, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(armW * 2.5, 0); ctx.lineTo(armW * 3, -armW * 3); ctx.lineTo(armW, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
            
            // Red gem center
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(0, armW, 3, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#fef08a'; ctx.stroke();
        } else {
            // Standard Steel Pauldron
            ctx.beginPath();
            ctx.arc(0, 0, armW * 1.8, Math.PI, 0);
            ctx.lineTo(armW * 2, armW);
            ctx.lineTo(-armW * 2, armW);
            ctx.closePath();
            ctx.fillStyle = getMetalGradient(-armW * 2, 0, armW * 2, 0, armorPrimary, armorSecondary, armorTrim);
            ctx.fill();
            drawSpecularGlossOverlay(armW * 2, armW * 2, 'metal', 0, 0, 0.25);
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Upper Arm
    drawLimb(armW, upperArmL, false, prof !== 'warrior' && matType !== 'metal', armorSecondary, '#000', armorPrimary);
    
    ctx.translate(0, upperArmL);
    ctx.rotate((isLeft ? elbowAngleL : elbowAngleR) * Math.PI / 180);

    // Lower Arm / Bracer
    drawLimb(armW * 0.9, lowerArmL, false, true, armorPrimary, armorSecondary, armorTrim, 0.7);

    // Hand
    ctx.translate(0, lowerArmL);
    ctx.beginPath();
    ctx.arc(0, 2, armW * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = skinBase;
    ctx.fill();

    // Weapon in right hand
    if (!isLeft && weaponItem) {
      ctx.save();
      ctx.rotate(weaponAngle);
      
      const wName = weaponItem.name || '';
      const wRefine = weaponItem.refineLevel || 0;
      let wGlow = '';
      if (wRefine >= 1 || weaponItem.rarity === 'mythic' || weaponItem.rarity === 'legendary') {
        if (weaponItem.rarity === 'mythic') wGlow = '#ef4444';
        else if (weaponItem.rarity === 'legendary') wGlow = '#f59e0b';
        else if (weaponItem.rarity === 'epic') wGlow = '#a855f7';
        else wGlow = '#3b82f6';
      }

      if (wGlow) {
        ctx.shadowColor = wGlow;
        ctx.shadowBlur = 12 + Math.sin(now * 0.01) * 8;
      }

      if (wName.includes('创世神') || weaponItem?.id === 'weapon_genesis') {
        // 🌟 创世神剑 (Genesis Divine Sword)
        ctx.save();
        
        // Radiant Divine Aura
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20 + Math.sin(now * 0.01) * 10;
        
        // Blade
        ctx.beginPath();
        ctx.moveTo(-5, 0); 
        ctx.lineTo(5, 0); 
        ctx.lineTo(8, -50); 
        ctx.lineTo(0, -70); 
        ctx.lineTo(-8, -50);
        ctx.closePath();
        
        const bGrad = ctx.createLinearGradient(0, 0, 0, -70);
        bGrad.addColorStop(0, '#fef08a');
        bGrad.addColorStop(0.5, '#ffffff');
        bGrad.addColorStop(1, '#60a5fa');
        ctx.fillStyle = bGrad;
        ctx.fill();

        // Glowing center core
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -65); ctx.stroke();

        // Ethereal floating shards
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 5;
        for(let i=0; i<3; i++) {
           const phase = (now * 0.005 + i * 2) % (Math.PI * 2);
           const ox = Math.cos(phase) * 12;
           const oy = -20 - i*15 + Math.sin(phase) * 5;
           ctx.beginPath(); ctx.arc(ox, oy, 1.5, 0, Math.PI*2); ctx.fill();
        }

        // Crossguard - Angelic wings
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.quadraticCurveTo(15, -15, 20, -5);
        ctx.lineTo(5, 5);
        ctx.lineTo(-5, 5);
        ctx.lineTo(-20, -5);
        ctx.quadraticCurveTo(-15, -15, 0, -5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1; ctx.stroke();
        
        // Handle
        ctx.fillStyle = '#d97706'; ctx.fillRect(-2, 5, 4, 15);
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 20, 4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        
        ctx.restore();
      } else if (wName.includes('屠龙')) {
        // 🗡️✨ 屠龙宝刀 (Dragon Slayer Broadsword)
        ctx.save();
        ctx.beginPath();
        // Massive heavy broadsword shape
        ctx.moveTo(-10, 5); 
        ctx.lineTo(10, 5); 
        ctx.lineTo(15, -45); 
        ctx.lineTo(18, -60);
        ctx.lineTo(0, -75);
        ctx.lineTo(-8, -60); 
        ctx.lineTo(-6, -45); 
        ctx.closePath();
        
        const bladeGrad = ctx.createLinearGradient(-10, 0, 15, 0);
        bladeGrad.addColorStop(0, '#1e293b');
        bladeGrad.addColorStop(0.5, '#475569');
        bladeGrad.addColorStop(0.8, '#cbd5e1');
        bladeGrad.addColorStop(1, '#f8fafc');
        ctx.fillStyle = bladeGrad;
        ctx.fill();

        // Blood groove & Edge
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, -75); ctx.stroke();
        
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(10, 5); ctx.lineTo(15, -45); ctx.lineTo(18, -60); ctx.lineTo(0, -75); ctx.stroke();

        // Ornate dragon engravings
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let py = -10; py >= -50; py-=10) {
           ctx.moveTo(-2, py);
           ctx.quadraticCurveTo(0, py - 5, -5, py - 10);
        }
        ctx.stroke();

        // Massive Dragon Head Crossguard
        ctx.fillStyle = '#b45309';
        ctx.beginPath(); ctx.moveTo(-16, -2); ctx.lineTo(16, -2); ctx.lineTo(20, 8); ctx.lineTo(-20, 8); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 1.5; ctx.stroke();
        
        // Dragon eyes
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(-8, 3, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, 3, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Long handle
        ctx.fillStyle = '#450a0a'; ctx.fillRect(-3, 8, 6, 18);
        ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 1;
        for (let y = 10; y <= 24; y += 3) {
           ctx.beginPath(); ctx.moveTo(-3, y); ctx.lineTo(3, y+2); ctx.stroke();
        }

        // Heavy Pommel
        ctx.fillStyle = '#b45309'; 
        ctx.beginPath(); ctx.arc(0, 28, 6, 0, Math.PI * 2); ctx.fill(); 
        ctx.strokeStyle = '#fef08a'; ctx.stroke();

        ctx.restore();
      } else if (wName.includes('裁决')) {
        // 🔱 裁决之杖 (Judgment Black-Iron Mace)
        ctx.save();
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-3, -32, 6, 42);
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1; ctx.strokeRect(-3, -32, 6, 42);

        ctx.fillStyle = '#d97706';
        ctx.fillRect(-4, -24, 8, 3);
        ctx.fillRect(-4, -12, 8, 3);
        ctx.fillRect(-4, 0, 8, 3);

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(-8, -32); ctx.lineTo(8, -32); ctx.lineTo(10, -42); ctx.lineTo(0, -48); ctx.lineTo(-10, -42);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1.5; ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath(); ctx.moveTo(-10, -37); ctx.lineTo(-15, -37); ctx.lineTo(-10, -40); ctx.fill();
        ctx.beginPath(); ctx.moveTo(10, -37); ctx.lineTo(15, -37); ctx.lineTo(10, -40); ctx.fill();

        ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
        ctx.beginPath(); ctx.arc(0, -38, 12, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (wName.includes('炼狱')) {
        // 🪓 炼狱巨斧 (Purgatory Double-Headed Axe)
        ctx.save();
        ctx.fillStyle = '#334155'; ctx.fillRect(-2, -30, 4, 45);
        ctx.fillStyle = '#cbd5e1'; ctx.fillRect(-0.5, -30, 1, 45);

        ctx.beginPath();
        ctx.moveTo(-2, -15); ctx.quadraticCurveTo(-22, -35, -18, -42); ctx.lineTo(-2, -30);
        ctx.closePath();
        ctx.fillStyle = getMetalGradient(-22, -30, 0, -30, '#94a3b8', '#0f172a', '#ffffff');
        ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(2, -15); ctx.quadraticCurveTo(22, -35, 18, -42); ctx.lineTo(2, -30);
        ctx.closePath();
        ctx.fillStyle = getMetalGradient(0, -30, 22, -30, '#94a3b8', '#0f172a', '#ffffff');
        ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.stroke();

        ctx.fillStyle = '#dc2626';
        ctx.beginPath(); ctx.arc(0, -26, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.moveTo(-2, -30); ctx.lineTo(2, -30); ctx.lineTo(0, -48); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (wName.includes('斩马刀') || wName.includes('刀')) {
        // ⚔️ 斩马刀 (Chopper)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(-2, 2); ctx.lineTo(2, 2); ctx.lineTo(4, -30); ctx.quadraticCurveTo(8, -38, 0, -42); ctx.lineTo(-1, -30);
        ctx.closePath();
        ctx.fillStyle = getMetalGradient(-2, 0, 4, 0, '#cbd5e1', '#1e293b', '#ffffff');
        ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();

        ctx.fillStyle = '#92400e'; ctx.fillRect(-1.5, 2, 3, 8);
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 12, 3, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      } else if (wName.includes('乌木剑')) {
        // 🗡️ 乌木剑 (Ebony Sword)
        ctx.save();
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.lineTo(2.5, -32); ctx.lineTo(0, -38); ctx.lineTo(-2.5, -32); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1; ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath(); ctx.arc(0, -38, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (wName.includes('木剑')) {
        // 🗡️ 木剑 (Wooden Sword)
        ctx.save();
        ctx.fillStyle = '#b45309';
        ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.lineTo(2, -30); ctx.lineTo(0, -35); ctx.lineTo(-2, -30); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.fillStyle = '#92400e'; ctx.fillRect(-5, -2, 10, 2);
        ctx.restore();
      } else if (wName.includes('骨玉') || wName.includes('权杖')) {
        // 🪄 骨玉权杖 (Bone Jade Staff)
        ctx.save();
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-2, -8, 4, 42);
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 0.8; ctx.strokeRect(-2, -8, 4, 42);

        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#0284c7'; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(0, -14, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-1.5, -15.5, 2, 0, Math.PI * 2); ctx.fill();

        const ringAng = now * 0.004;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, -14, 10, 4, ringAng, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      } else if (wName.includes('噬魂')) {
        // 🔮✨ 噬魂法杖 (Soul Eater Staff)
        ctx.save();
        ctx.fillStyle = '#312e81'; ctx.fillRect(-2, -10, 4, 45);

        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#7e22ce'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(0, -16, 7.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f0abfc'; ctx.beginPath(); ctx.arc(-2, -18, 2.5, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#e879f9'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-6, -16); ctx.lineTo(-2, -22); ctx.lineTo(3, -12); ctx.lineTo(6, -16);
        ctx.stroke();
        ctx.restore();
      } else if (wName.includes('扇') || wName.includes('逍遥')) {
        // 🪭 逍遥扇 (Xiaoyao Fan)
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, -8, 22, -Math.PI * 0.75, -Math.PI * 0.25);
        ctx.lineTo(0, -2);
        ctx.closePath();
        ctx.fillStyle = '#065f46'; ctx.fill();
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1.5; ctx.stroke();

        ctx.fillStyle = '#fde047';
        for (let f = -3; f <= 3; f++) {
          const fAng = -Math.PI / 2 + (f * Math.PI) / 12;
          ctx.fillRect(Math.cos(fAng) * 16 - 1, -8 + Math.sin(fAng) * 16 - 1, 2, 2);
        }
        ctx.restore();
      } else {
        // Default Sword
        ctx.save();
        ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.lineTo(3, -34); ctx.lineTo(0, -40); ctx.lineTo(-3, -34); ctx.closePath();
        ctx.fillStyle = getMetalGradient(-3, 0, 3, 0, '#94a3b8', '#111827', '#ffffff');
        ctx.fill();
        drawSpecularGlossOverlay(3, 40, 'metal', 0, -20, -0.12);
        ctx.fillStyle = '#b45309'; ctx.fillRect(-1.5, 0, 3, 9);
        ctx.fillStyle = '#f59e0b'; ctx.fillRect(-6, -2, 12, 3);
        ctx.restore();
      }

      ctx.restore();
    }

    ctx.restore();
  };

  const drawLeg = (isLeft: boolean) => {
    ctx.save();
    const hipX = isLeft ? -4 : 4;
    const hipY = 3;
    ctx.translate(hipX, hipY);
    ctx.rotate((isLeft ? legAngleL : legAngleR) * Math.PI / 180);

    const legW = isFemale ? 3 : 4;
    const thighL = 13;
    const calfL = 13;

    // Thigh
    drawLimb(legW, thighL, true, true, legColor, '#000', armorSecondary, 0.85);

    ctx.translate(0, thighL);
    ctx.rotate((isLeft ? kneeAngleL : kneeAngleR) * Math.PI / 180);

    // Calf
    drawLimb(legW * 0.85, calfL, true, true, bootColor, '#000', bootTrim, 0.8);
    
    // Boot foot
    ctx.translate(0, calfL);
    drawBoot(legW * 0.8);

    ctx.restore();
  };

  // 1. CAPE (Background)
  if (showCape && !isMounted) {
    ctx.save();
    ctx.translate(0, -12);
    ctx.rotate(spineAngle * 0.5);
    
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.quadraticCurveTo(12 + capeSwayX, 20, 10 + capeSwayX * 1.5, 38);
    ctx.lineTo(-10 + capeSwayX * 1.5, 38);
    ctx.quadraticCurveTo(-12 + capeSwayX, 20, -7, 0);
    
    const capeGrad = ctx.createLinearGradient(0, 0, 0, 38);
    capeGrad.addColorStop(0, capeColor1);
    capeGrad.addColorStop(1, capeColor2);
    ctx.fillStyle = capeGrad;
    
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fill();
    
    ctx.strokeStyle = capeBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Folds
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.moveTo(-3, 0); ctx.quadraticCurveTo(-4 + capeSwayX * 0.5, 20, -2 + capeSwayX, 36); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, 0); ctx.quadraticCurveTo(4 + capeSwayX * 0.5, 20, 2 + capeSwayX, 36); ctx.stroke();
    
    ctx.restore();
  }

  // 1.5. RADIANT 3D WINGS SYSTEM (光翼翅膀系统)
  const wingLvl = character.wingLevel || 0;
  if (wingLvl > 0 && !isMounted) {
    const flap = Math.sin(now * 0.005) * 0.16;
    const wingY = -12 + chestOffsetY;

    ctx.save();
    let wPrimary = '#38bdf8';
    let wSecondary = '#0284c7';
    let wGlow = '#60a5fa';

    if (wingLvl >= 7) {
      wPrimary = '#ef4444'; wSecondary = '#991b1b'; wGlow = '#f59e0b';
    } else if (wingLvl >= 4) {
      wPrimary = '#f59e0b'; wSecondary = '#b45309'; wGlow = '#fef08a';
    }

    // Left Wing
    ctx.save();
    ctx.translate(-8, wingY);
    ctx.rotate(-0.3 + flap);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-26, -32, -42, -14);
    ctx.quadraticCurveTo(-28, 2, 0, 8);
    ctx.fillStyle = wPrimary;
    ctx.shadowColor = wGlow; ctx.shadowBlur = 15;
    ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();

    for (let f = 1; f <= 3; f++) {
      ctx.beginPath();
      ctx.moveTo(-5 * f, -2);
      ctx.quadraticCurveTo(-20 * (f / 3) - 10, -22, -32 * (f / 3) - 6, -10);
      ctx.strokeStyle = wSecondary; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.restore();

    // Right Wing
    ctx.save();
    ctx.translate(8, wingY);
    ctx.rotate(0.3 - flap);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(26, -32, 42, -14);
    ctx.quadraticCurveTo(28, 2, 0, 8);
    ctx.fillStyle = wPrimary;
    ctx.shadowColor = wGlow; ctx.shadowBlur = 15;
    ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();

    for (let f = 1; f <= 3; f++) {
      ctx.beginPath();
      ctx.moveTo(5 * f, -2);
      ctx.quadraticCurveTo(20 * (f / 3) + 10, -22, 32 * (f / 3) + 6, -10);
      ctx.strokeStyle = wSecondary; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
  }

  // 2. LEFT ARM (Background)
  drawArm(true);

  // 3. LEFT LEG
  drawLeg(true);

  // 4. RIGHT LEG
  drawLeg(false);

  // 5. TORSO (Detailed 2.5D Mesh)
  ctx.save();
  ctx.translate(0, chestOffsetY);
  ctx.rotate(spineAngle);
  
  // Ribcage expansion simulation
  const breathX = 1 + breathing * 0.02;
  const breathY = 1 + breathing * 0.01;
  ctx.scale(breathX, breathY);
  
  const chestY = -18;
  const pelvisY = 2;
  const waistW = isFemale ? 4 : 5.5;
  const shoulderW = isFemale ? 7 : 9.5;
  
  ctx.beginPath();
  if (matType === 'cloth') {
    // Flowing Robes
    const skirtY = 16;
    ctx.moveTo(-shoulderW, chestY);
    ctx.lineTo(shoulderW, chestY);
    ctx.quadraticCurveTo(waistW + 1, pelvisY, shoulderW + 1, skirtY);
    ctx.lineTo(-shoulderW - 1, skirtY);
    ctx.quadraticCurveTo(-waistW - 1, pelvisY, -shoulderW, chestY);
  } else {
    // Sculpted Armor
    ctx.moveTo(-shoulderW, chestY);
    ctx.lineTo(shoulderW, chestY);
    ctx.quadraticCurveTo(waistW, pelvisY - 2, waistW, pelvisY + 3);
    ctx.lineTo(-waistW, pelvisY + 3);
    ctx.quadraticCurveTo(-waistW, pelvisY - 2, -shoulderW, chestY);
  }
  ctx.closePath();
  
  ctx.fillStyle = getMaterialGradient(-shoulderW, 0, shoulderW, 0, matType, armorPrimary, armorSecondary, armorTrim);
  ctx.fill();
  
  // Specular overlay for chest / torso
  if (matType === 'metal' || matType === 'leather') {
     drawSpecularGlossOverlay(shoulderW, 20, matType, 0, chestY, 0.15);
  }

  // Torso Outline
  if (matType === 'metal') {
     ctx.strokeStyle = 'rgba(255,255,255,0.4)';
     ctx.lineWidth = 1.0;
     ctx.stroke();
  }

  // Folds for Cloth
  if (matType === 'cloth') {
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-waistW*0.5, pelvisY); ctx.lineTo(-shoulderW*0.5, 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(waistW*0.5, pelvisY); ctx.lineTo(shoulderW*0.5, 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pelvisY); ctx.lineTo(0, 16); ctx.stroke();
  }
  
  // Breastplate / Anatomy highlights
  if (isFemale) {
     // Curved chest armor with realistic high-specular 3D rounded reflections
     ctx.save();
     ctx.strokeStyle = '#ffffff';
     ctx.lineWidth = 0.8;
     
     ctx.fillStyle = getMetalGradient(-6.5, chestY + 5, 0.5, chestY + 5, armorTrim, armorPrimary, '#ffffff');
     ctx.beginPath(); ctx.arc(-3.2, chestY + 5.5, 3.8, 0, Math.PI*2); ctx.fill(); ctx.stroke();
     
     ctx.fillStyle = getMetalGradient(-0.5, chestY + 5, 6.5, chestY + 5, armorTrim, armorPrimary, '#ffffff');
     ctx.beginPath(); ctx.arc(3.2, chestY + 5.5, 3.8, 0, Math.PI*2); ctx.fill(); ctx.stroke();
     
     ctx.fillStyle = '#ffffff';
     ctx.beginPath(); ctx.arc(-2.2, chestY + 4.5, 0.8, 0, Math.PI*2); ctx.fill();
     ctx.beginPath(); ctx.arc(4.2, chestY + 4.5, 0.8, 0, Math.PI*2); ctx.fill();
     ctx.restore();
  } else if (matType === 'metal') {
     ctx.save();
     // Pectoral plate shadows
     ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.2;
     ctx.beginPath(); ctx.moveTo(-shoulderW*0.6, chestY+6); ctx.lineTo(0, chestY+8); ctx.lineTo(shoulderW*0.6, chestY+6); ctx.stroke();
     
     // Specular highlights on pecs
     ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.8;
     ctx.beginPath(); ctx.moveTo(-shoulderW*0.6, chestY+7); ctx.lineTo(0, chestY+9); ctx.lineTo(shoulderW*0.6, chestY+7); ctx.stroke();
     
     // Abdominal plate grooves
     ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1;
     ctx.beginPath(); ctx.moveTo(-waistW*0.5, chestY+12); ctx.lineTo(waistW*0.5, chestY+12); ctx.stroke();
     
     // Abdominal plate specular highlights
     ctx.strokeStyle = 'rgba(255,255,255,0.6)';
     ctx.beginPath(); ctx.moveTo(-waistW*0.5, chestY+13); ctx.lineTo(waistW*0.5, chestY+13); ctx.stroke();
     ctx.restore();
  }

  // --- CHEST INSIGNIA & EMBLEM FOR DISTINCT ARMORS ---
  if (aName.includes('创世神') || armorItem?.id === 'armor_genesis') {
    ctx.save();
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, chestY + 2); ctx.lineTo(5, chestY + 7); ctx.lineTo(0, chestY + 12); ctx.lineTo(-5, chestY + 7);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fef08a'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0, chestY + 7, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (aName.includes('远古魔龙') || armorItem?.id === 'armor_ancient_dragon') {
    ctx.save();
    ctx.fillStyle = '#fde047'; ctx.strokeStyle = '#059669'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, chestY + 3); ctx.lineTo(4, chestY + 8); ctx.lineTo(0, chestY + 12); ctx.lineTo(-4, chestY + 8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#10b981'; ctx.shadowColor = '#34d399'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, chestY + 7.5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (aName.includes('深渊') || armorItem?.id === 'armor_abyss') {
    ctx.save();
    ctx.fillStyle = '#c084fc'; ctx.strokeStyle = '#3b0764'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, chestY + 7.5, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e879f9'; ctx.shadowColor = '#c084fc'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0, chestY + 7.5, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (aName.includes('狂龙') || armorItem?.id === 'armor_dragon') {
    ctx.save();
    ctx.fillStyle = '#f59e0b'; ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, chestY + 2); ctx.lineTo(3.5, chestY + 7); ctx.lineTo(0, chestY + 11); ctx.lineTo(-3.5, chestY + 7);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, chestY + 6.5, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (aName.includes('破天') || armorItem?.id === 'armor_heaven') {
    ctx.save();
    ctx.fillStyle = '#38bdf8'; ctx.strokeStyle = '#0c4a6e'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, chestY + 3); ctx.lineTo(3, chestY + 7.5); ctx.lineTo(0, chestY + 11); ctx.lineTo(-3, chestY + 7.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7dd3fc'; ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, chestY + 7, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (aName.includes('沙城') || aName.includes('霸者') || armorItem?.id === 'armor_sabak_god') {
    ctx.save();
    ctx.fillStyle = '#fef08a'; ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, chestY + 7, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(0, chestY + 7, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (aName.includes('战神') || aName.includes('圣战') || armorItem?.id === 'armor_heavy_armor') {
    ctx.save();
    ctx.fillStyle = '#fde047'; ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2.5, chestY + 4); ctx.lineTo(2.5, chestY + 4); ctx.lineTo(0, chestY + 9);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // Belt
  ctx.fillStyle = armorSecondary;
  ctx.fillRect(-waistW - 1, pelvisY - 2, waistW * 2 + 2, 4);
  ctx.fillStyle = armorTrim;
  ctx.fillRect(-waistW - 1, pelvisY - 2, waistW * 2 + 2, 1);
  ctx.fillRect(-waistW - 1, pelvisY + 1, waistW * 2 + 2, 1);
  
  // Belt Buckle
  ctx.beginPath();
  ctx.arc(0, pelvisY, isFemale ? 2.5 : 3.5, 0, Math.PI * 2);
  ctx.fillStyle = prof === 'warrior' ? '#ef4444' : prof === 'mage' ? '#3b82f6' : '#10b981';
  ctx.fill();
  ctx.strokeStyle = armorTrim;
  ctx.stroke();

  ctx.restore();

  // 6. HEAD & HAIR
  ctx.save();
  ctx.translate(0, chestOffsetY - 16);
  ctx.rotate(spineAngle * 0.7); // Head turns slightly with spine

  const headRadius = isFemale ? 4.0 : 4.5;
  const absHeadX = px;
  const absHeadY = playerCenterY + frameOffsetY + chestOffsetY - 16;
  
  // Face Shape (Slightly oval base)
  ctx.beginPath();
  ctx.ellipse(0, 0, headRadius * 0.95, headRadius * 1.1, 0, 0, Math.PI * 2);
  ctx.fillStyle = getSkinGradient(-headRadius, 0, headRadius, 0);
  ctx.fill();

  // 1. Dynamic Eye Tracking (computes gaze vector & renders gaze-tracking pupils/iris)
  const { gazeX, gazeY } = renderDynamicTrackingEyes(
    ctx, headRadius, isFemale, prof, now, lookAtTarget, absHeadX, absHeadY
  );

  // 2. Procedural Facial Depth Map Displacement & Tessellation Shader
  renderTessellatedFacialDepthMap(
    ctx, headRadius, isFemale, skinBase, skinShadow, now, gazeX, gazeY
  );

  // 3. Eye Shadow Mask (Ambient Occlusion depth under brow ridge & nose bridge)
  ctx.save();
  ctx.fillStyle = 'rgba(12, 10, 8, 0.18)';
  ctx.beginPath();
  ctx.ellipse(0, -1.5, headRadius * 0.72, headRadius * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(12, 10, 8, 0.12)';
  ctx.beginPath();
  ctx.arc(0, 1.5, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const eX = isFemale ? 2.3 : 2.8;
  const eY = isFemale ? -1.0 : -1.2;

  // 4. Profession-Specific Dynamic Face Texture & Details
  if (isFemale) {
    if (prof === 'warrior') {
      // Fierce Crimson Slash / War Paint UV Line
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 1.0;
      ctx.beginPath(); ctx.moveTo(-eX - 1.5, eY + 1.5); ctx.lineTo(-eX + 0.5, eY + 0.5); ctx.stroke();
      
      // Angry/Determined Brows
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-eX - 1.2, eY - 2.5); ctx.lineTo(-eX + 1.2, eY - 1.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(eX + 1.2, eY - 2.5); ctx.lineTo(eX - 1.2, eY - 1.6); ctx.stroke();
      
      // Warrior Nose Shadow
      ctx.strokeStyle = 'rgba(120,50,30,0.45)'; ctx.lineWidth = 0.75;
      ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(0.5, 1.8); ctx.lineTo(-0.2, 2.2); ctx.stroke();

      // Lips
      ctx.fillStyle = '#e11d48';
      ctx.beginPath(); ctx.ellipse(0, 3.4, 1.4, 0.6, 0, 0, Math.PI*2); ctx.fill();
    } else if (prof === 'mage') {
      // Forehead Arcane Rune
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath(); ctx.arc(0, -headRadius + 2.2, 0.9, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 0.5; ctx.stroke();

      // Focused elegant brows
      ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = 1.0;
      ctx.beginPath(); ctx.moveTo(-eX - 1.0, eY - 2.3); ctx.quadraticCurveTo(-eX, eY - 2.6, -eX + 1.0, eY - 2.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(eX + 1.0, eY - 2.3); ctx.quadraticCurveTo(eX, eY - 2.6, eX - 1.0, eY - 2.1); ctx.stroke();

      // Elegant Nose Line
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(0.4, 1.8); ctx.stroke();

      // Lips
      ctx.fillStyle = '#db2777';
      ctx.beginPath(); ctx.ellipse(0, 3.4, 1.5, 0.7, 0, 0, Math.PI*2); ctx.fill();
    } else {
      // Taoist: Taoist Yin-yang/Lotus Forehead Dot
      ctx.fillStyle = '#10b981';
      ctx.beginPath(); ctx.arc(0, -headRadius + 2.2, 0.8, 0, Math.PI*2); ctx.fill();
      
      // Serene Calm Brows
      ctx.strokeStyle = '#065f46'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-eX - 1.0, eY - 2.1); ctx.quadraticCurveTo(-eX, eY - 2.3, -eX + 1.0, eY - 2.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(eX + 1.0, eY - 2.1); ctx.quadraticCurveTo(eX, eY - 2.3, eX - 1.0, eY - 2.1); ctx.stroke();

      // Nose
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.55;
      ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(0.4, 1.8); ctx.stroke();

      // Lips
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath(); ctx.ellipse(0, 3.4, 1.3, 0.5, 0, 0, Math.PI*2); ctx.fill();
    }
  } else {
    if (prof === 'warrior') {
      // Scar
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.0;
      ctx.beginPath(); ctx.moveTo(-eX - 1.2, eY - 1.8); ctx.lineTo(-eX + 1.2, eY + 1.8); ctx.stroke();

      // Brows
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.moveTo(-eX - 1.2, eY - 2.8); ctx.lineTo(-eX + 1.3, eY - 1.9); ctx.lineTo(-eX + 1.3, eY - 1.1); ctx.lineTo(-eX - 1.2, eY - 2.0);
      ctx.closePath(); ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(eX + 1.2 - 1.6, eY - 2.8); ctx.lineTo(eX - 1.6 - 1.3, eY - 1.9); ctx.lineTo(eX - 1.6 - 1.3, eY - 1.1); ctx.lineTo(eX + 1.2 - 1.6, eY - 2.0);
      ctx.closePath(); ctx.fill();

      // Nose
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-0.4, -0.5); ctx.lineTo(0.8, 1.8); ctx.lineTo(-0.2, 2.3); ctx.stroke();

      // Mouth
      ctx.strokeStyle = '#450a0a'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-1.6, 3.8); ctx.lineTo(1.6, 3.8); ctx.stroke();
    } else if (prof === 'mage') {
      // Third-Eye seal
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath(); ctx.arc(0, -headRadius + 2.5, 0.8, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 0.5; ctx.stroke();

      // Eyebrows
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(-eX - 0.8, eY - 2.4, 2.4, 1.0);
      ctx.fillRect(eX - 1.6 - 0.2, eY - 2.4, 2.4, 1.0);

      // Nose
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.65;
      ctx.beginPath(); ctx.moveTo(-0.3, -0.5); ctx.lineTo(0.7, 1.8); ctx.stroke();

      // Mouth
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-1.4, 3.8); ctx.lineTo(1.4, 3.8); ctx.stroke();
    } else {
      // Taoist point
      ctx.fillStyle = '#10b981';
      ctx.beginPath(); ctx.arc(0, -headRadius + 2.5, 0.8, 0, Math.PI*2); ctx.fill();

      // Brows
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(-eX - 0.8, eY - 2.2, 2.4, 0.8);
      ctx.fillRect(eX - 1.6 - 0.2, eY - 2.2, 2.4, 0.8);

      // Nose
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(-0.3, -0.5); ctx.lineTo(0.6, 1.8); ctx.stroke();

      // Mouth
      ctx.strokeStyle = '#022c22'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-1.4, 3.8); ctx.lineTo(1.4, 3.8); ctx.stroke();
    }
  }

  // Helmet / Hair
  if (helmetItem) {
    const hName = helmetItem.name || '';
    ctx.save();

    if (hName.includes('黑铁') || hName.includes('铁')) {
      // 🛡️ 黑铁头盔 (Black Iron Heavy Horned Helmet)
      ctx.beginPath();
      ctx.arc(0, -1, headRadius + 1.8, Math.PI * 0.75, Math.PI * 2.25);
      ctx.fillStyle = getMetalGradient(-headRadius - 1.8, 0, headRadius + 1.8, 0, '#1e293b', '#020617', '#f59e0b');
      ctx.fill();
      drawSpecularGlossOverlay(headRadius + 1.8, headRadius, 'metal', 0, -2, 0.2);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.0; ctx.stroke();

      // Nose Guard & Golden Horn Spikes
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.moveTo(-0.8, -headRadius); ctx.lineTo(0.8, -headRadius); ctx.lineTo(0, -headRadius + 5); ctx.closePath(); ctx.fill();

      // Dual Horn Spikes
      ctx.beginPath(); ctx.moveTo(-headRadius - 1, -2); ctx.quadraticCurveTo(-headRadius - 6, -10, -headRadius - 2, -14); ctx.lineTo(-headRadius + 2, -5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(headRadius + 1, -2); ctx.quadraticCurveTo(headRadius + 6, -10, headRadius + 2, -14); ctx.lineTo(headRadius - 2, -5); ctx.fill();
    } else if (hName.includes('金冠') || hName.includes('霸者') || hName.includes('战神') || helmetItem.rarity === 'mythic' || helmetItem.rarity === 'legendary') {
      // 👑 霸者/金冠 (Sovereign Horned Golden Crown)
      ctx.beginPath();
      ctx.arc(0, -1, headRadius + 2, Math.PI * 0.7, Math.PI * 2.3);
      ctx.fillStyle = getMetalGradient(-headRadius - 2, 0, headRadius + 2, 0, '#f59e0b', '#78350f', '#fef08a');
      ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();

      // Forehead Ruby Gem
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#dc2626'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0, -headRadius, 3, 0, Math.PI * 2); ctx.fill();

      // Golden Crown Wings
      ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.moveTo(-headRadius, -2); ctx.quadraticCurveTo(-headRadius - 8, -14, -headRadius - 4, -20); ctx.lineTo(-headRadius + 2, -6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(headRadius, -2); ctx.quadraticCurveTo(headRadius + 8, -14, headRadius + 4, -20); ctx.lineTo(headRadius - 2, -6); ctx.fill();
    } else if (prof === 'mage' || prof === 'taoist') {
      // 🧙 法帽/道冠 (Arcane Hood / Zen Cap)
      const capColor = prof === 'mage' ? '#312e81' : '#064e3b';
      const capTrim = prof === 'mage' ? '#c084fc' : '#6ee7b7';

      ctx.beginPath(); ctx.arc(0, -2, headRadius + 2, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fillStyle = getCylinderGradient(capColor, '#000', capTrim, headRadius + 2); ctx.fill();

      // Forehead Seal Gem
      ctx.fillStyle = capTrim;
      ctx.beginPath(); ctx.arc(0, -headRadius - 2, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      // Standard Steel Helmet
      ctx.beginPath(); ctx.arc(0, -1, headRadius + 1.5, Math.PI * 0.75, Math.PI * 2.25);
      ctx.fillStyle = getMetalGradient(-headRadius - 1.5, 0, headRadius + 1.5, 0, '#475569', '#0f172a', '#cbd5e1');
      ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.0; ctx.stroke();
    }
    ctx.restore();
  } else {
    // No helmet, show hair
    const hairColor = '#171717'; // Deep black hair for traditional wuxia look
    ctx.fillStyle = hairColor;
    if (!isFemale) {
      if (prof === 'warrior') {
        // Black topknot with gold hairband
        ctx.beginPath(); ctx.arc(0, -3, headRadius + 0.5, Math.PI, Math.PI*2); ctx.fill(); // Base hair
        ctx.beginPath(); ctx.arc(0, -headRadius - 2, 3, 0, Math.PI*2); ctx.fill(); // Topknot ball
        // Gold hairpin / ring
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-3.5, -headRadius - 2); ctx.lineTo(3.5, -headRadius - 2); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(0, -headRadius - 2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -2, headRadius + 0.5, Math.PI, Math.PI*2); ctx.fill();
      }
    } else {
      if (prof === 'warrior') {
        ctx.beginPath(); ctx.arc(0, -2, headRadius + 1, Math.PI * 0.8, Math.PI * 2.2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(headRadius, 0); ctx.quadraticCurveTo(headRadius + 8, 5, headRadius + 10, 15); ctx.lineTo(headRadius + 6, 12); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(0, -2, headRadius + 1, Math.PI * 0.8, Math.PI * 2.2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -headRadius - 3, 5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-6, -headRadius - 3); ctx.lineTo(8, -headRadius - 3); ctx.stroke();
      }
    }
  }
  ctx.restore();

  // 7. RIGHT ARM (Foreground)
  drawArm(false);

  // 8. CLASS FOREGROUND VISUAL EFFECTS (职业专属视觉特效：战士重压、法师元素流动、道士随身符纸微动)
  ctx.save();
  if (prof === 'warrior') {
    // 战士：武器重压感与地面碎石/气劲 (Heavy Weapon Grip Pressure Effect)
    const pressPhase = (now * 0.005) % (Math.PI * 2);
    const pressPulse = Math.sin(pressPhase);

    // Pressure energy crackles
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(8 + Math.sin(pressPhase * 2) * 2, 5);
    ctx.lineTo(14 - Math.sin(pressPhase * 2) * 2, 0);
    ctx.lineTo(10, -12);
    ctx.stroke();

    // Ground pressure distortion ripple beneath blade tip
    ctx.beginPath();
    ctx.ellipse(10, 22, 12 + pressPulse * 2, 5 + pressPulse, 0, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.shadowColor = '#dc2626';
    ctx.shadowBlur = 15;
    ctx.stroke();

    // Bursting martial energy sparks
    for (let p = 0; p < 5; p++) {
      const pAngle = pressPhase + (p * Math.PI * 2) / 5;
      const px0 = 10 + Math.cos(pAngle) * (10 + pressPulse * 3);
      const py0 = 22 + Math.sin(pAngle) * (4 + pressPulse);
      ctx.fillStyle = p % 2 === 0 ? '#fef08a' : '#f97316';
      ctx.fillRect(px0 - 1, py0 - 1, 2.5, 2.5);
    }
  } else if (prof === 'mage') {
    // 法师：周身三系元素流动 (Subtle Swirling Elemental Orbs: Fire, Ice, Lightning)
    const elemPhase = now * 0.0025;
    const orbRadiusX = 24;
    const orbRadiusY = 11;
    const orbCenterY = -10;

    const elements = [
      { color: '#f97316', glow: '#ea580c', core: '#fef08a', phaseOffset: 0 },
      { color: '#38bdf8', glow: '#0284c7', core: '#ffffff', phaseOffset: (Math.PI * 2) / 3 },
      { color: '#c084fc', glow: '#7e22ce', core: '#f0abfc', phaseOffset: (Math.PI * 4) / 3 }
    ];

    elements.forEach((elem) => {
      const ang = elemPhase + elem.phaseOffset;
      const orbX = Math.cos(ang) * orbRadiusX;
      const orbY = orbCenterY + Math.sin(ang) * orbRadiusY;
      const orbScale = 0.8 + Math.sin(ang) * 0.25;

      ctx.save();
      ctx.translate(orbX, orbY);
      ctx.beginPath();
      ctx.arc(0, 0, 3.5 * orbScale, 0, Math.PI * 2);
      ctx.fillStyle = elem.color;
      ctx.shadowColor = elem.glow;
      ctx.shadowBlur = 12 * orbScale;
      ctx.fill();

      // Hot inner core
      ctx.beginPath();
      ctx.arc(-0.5, -0.5, 1.2 * orbScale, 0, Math.PI * 2);
      ctx.fillStyle = elem.core;
      ctx.fill();

      // Trailing micro particles
      for (let t = 1; t <= 3; t++) {
        const trailAng = ang - t * 0.18;
        const tx = Math.cos(trailAng) * orbRadiusX - orbX;
        const ty = orbCenterY + Math.sin(trailAng) * orbRadiusY - orbY;
        ctx.beginPath();
        ctx.arc(tx, ty, Math.max(0.5, (3 - t) * 0.8 * orbScale), 0, Math.PI * 2);
        ctx.fillStyle = elem.color;
        ctx.globalAlpha = 0.5 - t * 0.12;
        ctx.fill();
      }
      ctx.restore();
    });

    // Ascending elemental sparks
    for (let s = 0; s < 4; s++) {
      const sparkPhase = (now * 0.002 + s * 1.5) % 1;
      const sx = Math.sin(s * 4 + now * 0.003) * 16;
      const sy = 10 - sparkPhase * 40;
      const sAlpha = Math.sin(sparkPhase * Math.PI);
      ctx.fillStyle = s % 3 === 0 ? '#fde047' : s % 2 === 0 ? '#38bdf8' : '#e879f9';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = Math.max(0, sAlpha);
      ctx.fillRect(sx - 1, sy - 1, 2, 2);
    }
  } else {
    // 道士：随身符纸微动与灵气悬浮 (Floating Taoist Talismans with Micro-Motion)
    const talisPhase = now * 0.002;

    const talismans = [
      { baseAngle: -0.6, dist: 22, yOffset: -20, speed: 1.0 },
      { baseAngle: 0.7, dist: 24, yOffset: -14, speed: 1.2 },
      { baseAngle: 2.2, dist: 20, yOffset: -26, speed: 0.9 }
    ];

    talismans.forEach((t, idx) => {
      const waveY = Math.sin(talisPhase * t.speed + idx * 2) * 4;
      const waveRot = Math.cos(talisPhase * t.speed + idx) * 0.25;
      const tx = Math.cos(t.baseAngle) * t.dist;
      const ty = t.yOffset + waveY;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(0.1 + waveRot);

      // Yellow Talisman Paper (黄符)
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 10;
      ctx.fillRect(-3, -7, 6, 14);

      // Red Border Trim & Taoist Seal Rune Glyphs
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-2.5, -6.5, 5, 13);

      ctx.beginPath();
      ctx.moveTo(0, -4); ctx.lineTo(0, 4);
      ctx.moveTo(-1.5, -2); ctx.lineTo(1.5, -2);
      ctx.moveTo(-1.5, 1); ctx.lineTo(1.5, 1);
      ctx.stroke();

      // Spiritual Green Light Glow
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(0, -8, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // Green Spiritual Dust Motes
    for (let d = 0; d < 5; d++) {
      const dustPhase = (now * 0.0018 + d * 1.2) % 1;
      const dx = Math.sin(d * 3 + now * 0.002) * 18;
      const dy = 5 - dustPhase * 35;
      const dAlpha = Math.sin(dustPhase * Math.PI);
      ctx.fillStyle = '#6ee7b7';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 8;
      ctx.globalAlpha = Math.max(0, dAlpha);
      ctx.beginPath();
      ctx.arc(dx, dy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.restore(); // End Character Root
}
