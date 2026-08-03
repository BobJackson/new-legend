import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { MOUNT_TIERS } from '../data/mounts';
import { MAP_DATABASE } from '../data/maps';
import { WEATHER_DATABASE, WeatherType } from '../data/weather';
import { soundFX } from '../utils/sound';
import { ComboOverlay } from './HUD/ComboOverlay';

interface CanvasRendererProps {
  engine: GameEngine;
  onSelectMonster?: (monsterId: string) => void;
  onOpenWeatherModal?: () => void;
}

interface CanvasWeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  length?: number;
  alpha: number;
  pulsePhase: number;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({ engine, onSelectMonster, onOpenWeatherModal }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Weather Particles State
  const weatherParticlesRef = useRef<CanvasWeatherParticle[]>([]);
  const weatherTypeRef = useRef<WeatherType | null>(null);
  const lastThunderFlashTimeRef = useRef<number>(0);
  const thunderFlashDurationRef = useRef<number>(150);
  const thunderFlashIntervalRef = useRef<number>(5000);

  // Dynamic Mount Displacement Tracking & Motion Trail Ref
  const mountPosRef = useRef<{ x: number; y: number; vx: number; vy: number; angle: number } | null>(null);
  const mountTrailRef = useRef<{ x: number; y: number; alpha: number; tier: number; angle: number; time: number }[]>([]);

  const initWeatherParticles = (type: WeatherType, width: number, height: number) => {
    const particles: CanvasWeatherParticle[] = [];
    const count = type === 'sandstorm' ? 140 : type === 'rain' || type === 'thunder' ? 120 : type === 'snow' ? 100 : 35;

    for (let i = 0; i < count; i++) {
      let vx = 0;
      let vy = 0;
      let size = 2;
      let length = 15;
      let alpha = 0.6;

      if (type === 'rain' || type === 'thunder') {
        vx = -2 - Math.random() * 2;
        vy = 14 + Math.random() * 8;
        size = 1.5;
        length = 16 + Math.random() * 14;
        alpha = 0.4 + Math.random() * 0.4;
      } else if (type === 'snow') {
        vx = (Math.random() - 0.5) * 1.2;
        vy = 1.2 + Math.random() * 2.2;
        size = 1.5 + Math.random() * 3.5;
        alpha = 0.5 + Math.random() * 0.5;
      } else if (type === 'sandstorm') {
        vx = 10 + Math.random() * 9;
        vy = 0.5 + Math.random() * 2;
        size = 1 + Math.random() * 2.5;
        alpha = 0.3 + Math.random() * 0.5;
      } else {
        // Sunny Sparkles
        vx = (Math.random() - 0.5) * 0.6;
        vy = -0.4 - Math.random() * 0.8;
        size = 2 + Math.random() * 3.5;
        alpha = 0.3 + Math.random() * 0.5;
      }

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx,
        vy,
        size,
        length,
        alpha,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }

    weatherParticlesRef.current = particles;
    weatherTypeRef.current = type;
  };

  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const now = Date.now();
      engine.update(now);

      // Resize canvas to match display size cleanly
      const width = canvas.width = canvas.parentElement?.clientWidth || 800;
      const height = canvas.height = canvas.parentElement?.clientHeight || 600;

      const map = MAP_DATABASE[engine.currentMapId] || MAP_DATABASE['bichi_city'];
      const currentWeather = engine.currentWeather || 'sunny';

      // Initialize weather particles if weather changed or uninitialized
      if (weatherTypeRef.current !== currentWeather || weatherParticlesRef.current.length === 0) {
        initWeatherParticles(currentWeather, width, height);
      }

      // Isometric tile dimensions
      const tileWidth = 60;
      const tileHeight = 30;

      // Center view on player
      const playerX = engine.character.x;
      const playerY = engine.character.y;

      const screenCenterX = width / 2;
      const screenCenterY = height / 2;

      // Coordinate converter: grid (x, y) to screen canvas (sx, sy)
      const toScreen = (gx: number, gy: number) => {
        const isoX = (gx - gy) * (tileWidth / 2);
        const isoY = (gx + gy) * (tileHeight / 2);
        const playerIsoX = (playerX - playerY) * (tileWidth / 2);
        const playerIsoY = (playerX + playerY) * (tileHeight / 2);

        return {
          sx: screenCenterX + (isoX - playerIsoX),
          sy: screenCenterY + (isoY - playerIsoY)
        };
      };

      // 1. Clear background
      const bgGrad = ctx.createRadialGradient(screenCenterX, screenCenterY, 10, screenCenterX, screenCenterY, width);
      bgGrad.addColorStop(0, map.bgGradient[0]);
      bgGrad.addColorStop(1, map.bgGradient[1]);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Floor Grid
      ctx.lineWidth = 1;
      ctx.strokeStyle = map.gridColor;

      for (let gx = 0; gx < map.width; gx++) {
        for (let gy = 0; gy < map.height; gy++) {
          const { sx, sy } = toScreen(gx, gy);

          // Skip tiles way off screen
          if (sx < -100 || sx > width + 100 || sy < -100 || sy > height + 100) continue;

          ctx.beginPath();
          ctx.moveTo(sx, sy - tileHeight / 2);
          ctx.lineTo(sx + tileWidth / 2, sy);
          ctx.lineTo(sx, sy + tileHeight / 2);
          ctx.lineTo(sx - tileWidth / 2, sy);
          ctx.closePath();

          ctx.fillStyle = ((gx + gy) % 2 === 0) ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.02)';
          ctx.fill();
          ctx.stroke();
        }
      }

      // 3. Draw Portals
      map.portals.forEach(portal => {
        const { sx, sy } = toScreen(portal.x, portal.y);
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(sx, sy, tileWidth / 2, tileHeight / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.35)';
        ctx.fill();
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#93c5fd';
        ctx.textAlign = 'center';
        ctx.fillText(`🌀 ${portal.label}`, sx, sy - 15);
        ctx.restore();
      });

      // 4. Draw Drops on Ground & Light Beams
      engine.drops.forEach(drop => {
        const elapsed = now - drop.dropTime;
        const animDuration = drop.animDurationMs || 500;
        const animProgress = Math.min(1, elapsed / animDuration);

        // Position calculation with airborne parabola curve
        let currentGx = drop.x;
        let currentGy = drop.y;
        let arcZ = 0;

        if (animProgress < 1 && drop.startX !== undefined && drop.startY !== undefined) {
          currentGx = drop.startX + (drop.x - drop.startX) * animProgress;
          currentGy = drop.startY + (drop.y - drop.startY) * animProgress;
          arcZ = Math.sin(animProgress * Math.PI) * 45;
        }

        const { sx: groundSx, sy: groundSy } = toScreen(currentGx, currentGy);
        const itemSx = groundSx;
        const itemSy = groundSy - arcZ;

        ctx.save();

        // Rarity colors & Beam parameters
        const rarity = drop.item.rarity;
        const isMythic = rarity === 'mythic';
        const isLegendary = rarity === 'legendary';
        const isEpic = rarity === 'epic';
        const isRare = rarity === 'rare';
        const isHighRarity = isMythic || isLegendary || isEpic || isRare;

        const mainColor = isMythic ? '#fbbf24'
                        : isLegendary ? '#f97316'
                        : isEpic ? '#c084fc'
                        : isRare ? '#38bdf8'
                        : drop.item.rarity === 'uncommon' ? '#34d399'
                        : '#94a3b8';

        const glowColor = isMythic ? 'rgba(251, 191, 36, 0.6)'
                        : isLegendary ? 'rgba(249, 115, 22, 0.55)'
                        : isEpic ? 'rgba(192, 132, 252, 0.5)'
                        : isRare ? 'rgba(56, 189, 248, 0.45)'
                        : 'rgba(52, 211, 153, 0.3)';

        // A. Draw Shadow on Floor
        ctx.beginPath();
        const shadowRadius = Math.max(4, 14 * (1 - arcZ / 80));
        ctx.ellipse(groundSx, groundSy, shadowRadius, shadowRadius * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.1, 0.5 - arcZ / 100)})`;
        ctx.fill();

        // B. Ground Ripple Impact when landing
        if (elapsed >= animDuration && elapsed < animDuration + 300) {
          const impactProgress = (elapsed - animDuration) / 300;
          ctx.beginPath();
          ctx.ellipse(groundSx, groundSy, 20 * impactProgress, 10 * impactProgress, 0, 0, Math.PI * 2);
          ctx.strokeStyle = mainColor;
          ctx.lineWidth = 2 * (1 - impactProgress);
          ctx.stroke();
        }

        // C. Light Beam (冲天光柱) for Rare Items
        if (isHighRarity) {
          const beamWidth = isMythic ? 32 : isLegendary ? 24 : isEpic ? 18 : 14;
          const beamHeight = isMythic ? Math.min(320, groundSy + 50) : isLegendary ? 260 : isEpic ? 200 : 140;

          // 1. Rotating Floor Aura Halo
          const pulse = Math.sin(now / 150) * 0.15;
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(groundSx, groundSy, (tileWidth / 2.2) * (0.85 + pulse), (tileHeight / 2.2) * (0.85 + pulse), 0, 0, Math.PI * 2);
          const haloGrad = ctx.createRadialGradient(groundSx, groundSy, 2, groundSx, groundSy, tileWidth / 2);
          haloGrad.addColorStop(0, glowColor);
          haloGrad.addColorStop(0.7, glowColor);
          haloGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = haloGrad;
          ctx.fill();

          // Rotating Rune Dots
          for (let r = 0; r < 4; r++) {
            const angle = (now / 350) + (r * Math.PI / 2);
            const rx = groundSx + Math.cos(angle) * (tileWidth / 2.6);
            const ry = groundSy + Math.sin(angle) * (tileHeight / 2.6);
            ctx.beginPath();
            ctx.arc(rx, ry, isMythic ? 3 : 2, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = mainColor;
            ctx.shadowBlur = 8;
            ctx.fill();
          }
          ctx.restore();

          // 2. Vertical Light Pillar (Volumetric Beam)
          ctx.save();
          const beamGrad = ctx.createLinearGradient(groundSx - beamWidth / 2, 0, groundSx + beamWidth / 2, 0);
          beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          beamGrad.addColorStop(0.2, glowColor);
          beamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
          beamGrad.addColorStop(0.8, glowColor);
          beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.fillStyle = beamGrad;
          ctx.shadowColor = mainColor;
          ctx.shadowBlur = isMythic ? 25 : 15;

          ctx.beginPath();
          ctx.rect(groundSx - beamWidth / 2, groundSy - beamHeight, beamWidth, beamHeight);
          ctx.fill();

          // Inner Intense Core Beam
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(groundSx - 1.5, groundSy - beamHeight, 3, beamHeight);

          // 3. Rising Particle Stars along the beam
          const sparkleCount = isMythic ? 8 : isLegendary ? 6 : 4;
          for (let i = 0; i < sparkleCount; i++) {
            const particleProgress = ((now * (0.06 + i * 0.01) + i * 45) % beamHeight);
            const py = groundSy - particleProgress;
            const px = groundSx + Math.sin(now * 0.004 + i * 2) * (beamWidth * 0.35);
            const pAlpha = Math.sin((particleProgress / beamHeight) * Math.PI);

            ctx.beginPath();
            ctx.arc(px, py, isMythic ? 2.5 : 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${pAlpha})`;
            ctx.shadowColor = mainColor;
            ctx.shadowBlur = 6;
            ctx.fill();
          }
          ctx.restore();
        }

        // D. Item Icon & Item Label Box
        const hoverOffsetY = animProgress >= 1 ? Math.sin(now / 180) * 3 : 0;
        const displaySy = itemSy - hoverOffsetY;

        // Draw Item Symbol / Icon
        ctx.font = isMythic ? '22px sans-serif' : '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = mainColor;
        ctx.shadowBlur = isHighRarity ? 10 : 3;
        ctx.fillText(drop.item.icon || '🎁', itemSx, displaySy - 18);

        // Item Name Tag Box
        const nameText = drop.item.name + (drop.count > 1 ? ` x${drop.count}` : '');
        ctx.font = 'bold 11px sans-serif';
        const textWidth = ctx.measureText(nameText).width;
        const boxWidth = Math.max(64, textWidth + 16);
        const boxHeight = 18;
        const boxX = itemSx - boxWidth / 2;
        const boxY = displaySy - 34;

        // Label Background
        ctx.fillStyle = isMythic ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = isHighRarity ? 2 : 1;

        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(boxX, boxY, boxWidth, boxHeight, 4);
        } else {
          ctx.rect(boxX, boxY, boxWidth, boxHeight);
        }
        ctx.fill();
        ctx.stroke();

        // Shiny border effect for Mythic & Legendary
        if (isMythic || isLegendary) {
          ctx.save();
          ctx.shadowColor = mainColor;
          ctx.shadowBlur = 12;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.strokeRect(boxX + 1, boxY + 1, boxWidth - 2, boxHeight - 2);
          ctx.restore();
        }

        // Label Text
        ctx.fillStyle = mainColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nameText, itemSx, boxY + boxHeight / 2);

        ctx.restore();
      });

      // 5. Draw Monsters (High-end Monster & Boss Visual Graphics)
      engine.monsters.forEach(m => {
        if (m.hp <= 0) return;
        const { sx, sy } = toScreen(m.x, m.y);
        const isTargeted = engine.targetMonsterId === m.id;

        ctx.save();

        // A. Ground Shadow
        ctx.beginPath();
        ctx.ellipse(sx, sy, m.isBoss ? 28 : 16, m.isBoss ? 14 : 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fill();

        // B. Runic Rarity Magic Circle & Targeting Reticle
        if (m.isBoss) {
          // Boss Hellfire Magic Circle on Ground
          const bossRot = (now * 0.0012) % (Math.PI * 2);
          ctx.beginPath();
          ctx.ellipse(sx, sy, 36, 18, 0, 0, Math.PI * 2);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#dc2626';
          ctx.shadowBlur = 18;
          ctx.stroke();

          // Rotating Runic Star Spikes
          for (let i = 0; i < 6; i++) {
            const rotAngle = bossRot + (i * Math.PI) / 3;
            const rx = sx + Math.cos(rotAngle) * 36;
            const ry = sy + Math.sin(rotAngle) * 18;

            ctx.beginPath();
            ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#fef08a';
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 10;
            ctx.fill();
          }

          // Flame Ember Particles rising around boss
          for (let i = 0; i < 4; i++) {
            const emberAngle = (now * 0.002) + i * 1.57;
            const ex = sx + Math.cos(emberAngle) * 22;
            const ey = sy - 12 + Math.sin(emberAngle * 1.5) * 8 - ((now * 0.02 + i * 15) % 25);
            ctx.beginPath();
            ctx.arc(ex, ey, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(251, 146, 60, 0.85)';
            ctx.shadowColor = '#ea580c';
            ctx.shadowBlur = 6;
            ctx.fill();
          }
        } else if (isTargeted) {
          // Targeted Highlight Ring
          ctx.beginPath();
          ctx.ellipse(sx, sy, 22, 11, 0, 0, Math.PI * 2);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#f87171';
          ctx.shadowBlur = 8;
          ctx.stroke();
        }

        // C. Idle Floating / Breathing Animation
        const bobY = Math.sin(now * 0.004 + m.id.charCodeAt(0) % 10) * (m.isBoss ? 4 : 2.5);

        // D. High-End 2D Creature Visual Sprite Renderer (废除单图例，全面升级为2D怪物与Boss具象化形态)
        const entityCenterY = sy - (m.isBoss ? 26 : 16) + bobY;
        const mName = m.name;

        ctx.save();

        if (m.isBoss) {
          // ==================== BOSS CREATURE MODEL ====================
          // Demonic Boss Wings / Shoulder Spikes
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(sx - 32, entityCenterY - 10);
          ctx.quadraticCurveTo(sx - 48, entityCenterY - 30, sx - 20, entityCenterY - 38);
          ctx.quadraticCurveTo(sx - 16, entityCenterY - 18, sx - 10, entityCenterY - 12);
          ctx.moveTo(sx + 32, entityCenterY - 10);
          ctx.quadraticCurveTo(sx + 48, entityCenterY - 30, sx + 20, entityCenterY - 38);
          ctx.quadraticCurveTo(sx + 16, entityCenterY - 18, sx + 10, entityCenterY - 12);
          ctx.fillStyle = '#7f1d1d';
          ctx.shadowColor = '#dc2626';
          ctx.shadowBlur = 15;
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();

          // Boss Heavy Torso & Armor Plate
          ctx.beginPath();
          ctx.moveTo(sx - 18, entityCenterY - 16);
          ctx.lineTo(sx + 18, entityCenterY - 16);
          ctx.lineTo(sx + 14, entityCenterY + 16);
          ctx.lineTo(sx - 14, entityCenterY + 16);
          ctx.closePath();

          const bossBodyGrad = ctx.createLinearGradient(sx - 15, entityCenterY - 16, sx + 15, entityCenterY + 16);
          bossBodyGrad.addColorStop(0, '#450a0a');
          bossBodyGrad.addColorStop(0.5, '#7f1d1d');
          bossBodyGrad.addColorStop(1, '#0f172a');
          ctx.fillStyle = bossBodyGrad;
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 10;
          ctx.stroke();

          // Boss Horned Headpiece
          ctx.beginPath();
          ctx.arc(sx, entityCenterY - 24, 11, 0, Math.PI * 2);
          ctx.fillStyle = '#1e1b4b';
          ctx.fill();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Crimson Glowing Boss Eyes
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = '#dc2626';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(sx - 4, entityCenterY - 24, 2.5, 0, Math.PI * 2);
          ctx.arc(sx + 4, entityCenterY - 24, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Demonic Horns
          ctx.beginPath();
          ctx.moveTo(sx - 8, entityCenterY - 28);
          ctx.quadraticCurveTo(sx - 18, entityCenterY - 42, sx - 12, entityCenterY - 44);
          ctx.quadraticCurveTo(sx - 6, entityCenterY - 34, sx - 4, entityCenterY - 28);
          ctx.moveTo(sx + 8, entityCenterY - 28);
          ctx.quadraticCurveTo(sx + 18, entityCenterY - 42, sx + 12, entityCenterY - 44);
          ctx.quadraticCurveTo(sx + 6, entityCenterY - 34, sx + 4, entityCenterY - 28);
          ctx.fillStyle = '#f59e0b';
          ctx.shadowColor = '#ea580c';
          ctx.shadowBlur = 12;
          ctx.fill();

          // Giant Boss Flame Cleaver / Mace Weapon
          ctx.save();
          ctx.translate(sx + 24, entityCenterY - 4);
          ctx.rotate(0.35);
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(-3, -28, 7, 30);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(-1, -26, 3, 26);
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 18;
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-4, -29, 9, 32);
          ctx.restore();

        } else {
          // ==================== NORMAL MONSTER MODEL ====================
          const mColor = m.color || '#3b82f6';

          if (mName.includes('稻草人')) {
            // Strawman / Scarecrow (稻草人形象)
            ctx.fillStyle = '#854d0e';
            ctx.fillRect(sx - 2, entityCenterY - 14, 4, 24);
            ctx.fillRect(sx - 12, entityCenterY - 8, 24, 3); // Arms
            // Straw Hat
            ctx.beginPath();
            ctx.moveTo(sx, entityCenterY - 24);
            ctx.lineTo(sx - 12, entityCenterY - 12);
            ctx.lineTo(sx + 12, entityCenterY - 12);
            ctx.fillStyle = '#ca8a04';
            ctx.fill();

          } else if (mName.includes('骷髅') || mName.includes('尸王') || mName.includes('僵尸')) {
            // Skeleton / Undead Warrior (骷髅战士/尸王形象)
            ctx.fillStyle = '#e2e8f0'; // Bone white
            // Torso Ribs
            ctx.fillRect(sx - 6, entityCenterY - 10, 12, 16);
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx - 6, entityCenterY - 10, 12, 16);
            // Skull
            ctx.beginPath();
            ctx.arc(sx, entityCenterY - 16, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#f8fafc';
            ctx.fill();
            // Glowing Eye Sockets
            ctx.fillStyle = '#10b981';
            ctx.shadowColor = '#34d399';
            ctx.shadowBlur = 8;
            ctx.fillRect(sx - 3, entityCenterY - 17, 2, 2);
            ctx.fillRect(sx + 1, entityCenterY - 17, 2, 2);
            // Rusty Sword
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(sx + 9, entityCenterY - 16, 2.5, 18);

          } else {
            // General Beast / Monster Silhouette (通用兽型/魔物身姿)
            // Body Tunic
            ctx.beginPath();
            ctx.moveTo(sx - 10, entityCenterY - 10);
            ctx.lineTo(sx + 10, entityCenterY - 10);
            ctx.lineTo(sx + 8, entityCenterY + 10);
            ctx.lineTo(sx - 8, entityCenterY + 10);
            ctx.closePath();
            ctx.fillStyle = mColor;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Head & Horns
            ctx.beginPath();
            ctx.arc(sx, entityCenterY - 15, 6.5, 0, Math.PI * 2);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
            ctx.strokeStyle = mColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Spikes
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(sx - 8, entityCenterY - 20, 3, 6);
            ctx.fillRect(sx + 5, entityCenterY - 20, 3, 6);
          }
        }

        ctx.restore();

        // G. HP Bar & Name Plate
        const hpRatio = Math.max(0, Math.min(1, m.hp / m.maxHp));

        if (m.isBoss) {
          // Boss Level Badge & Name Header
          const barW = 80;
          const barH = 7;
          const barX = sx - barW / 2;
          const barY = entityCenterY - 42;

          // Header Name & Level String
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#fef08a';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#dc2626';
          ctx.shadowBlur = 8;
          ctx.fillText(`👑 [BOSS] ${m.name} LV.${m.level}`, sx, barY - 6);

          // Dark Metal Health Frame
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

          // Crimson Gradient Health Fill
          const hpGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
          hpGrad.addColorStop(0, '#ef4444');
          hpGrad.addColorStop(1, '#b91c1c');
          ctx.fillStyle = hpGrad;
          ctx.fillRect(barX, barY, barW * hpRatio, barH);
        } else {
          // Normal Monster Health Bar & Name
          const barW = 38;
          const barH = 4;
          const barX = sx - barW / 2;
          const barY = entityCenterY - 26;

          // Name Tag
          ctx.font = 'bold 10px sans-serif';
          ctx.fillStyle = '#fef08a';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 4;
          ctx.fillText(`${m.name}`, sx, barY - 4);

          // Health Bar
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
          ctx.fillStyle = '#eab308';
          ctx.fillRect(barX, barY, barW * hpRatio, barH);
        }

        ctx.restore();
      });

      // 6. Draw Taoist Pet (High-End Divine Beast Visual)
      if (engine.character.pet && engine.character.pet.hp > 0) {
        const pet = engine.character.pet;
        const { sx, sy } = toScreen(pet.x, pet.y);
        const petBobY = Math.sin(now * 0.004) * 3;
        const petCenterY = sy - 14 + petBobY;

        ctx.save();

        // Divine Flame Aura Circle on Ground
        ctx.beginPath();
        ctx.ellipse(sx, sy, 22, 11, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 10;
        ctx.stroke();

        // Pet Avatar Medallion Badge
        ctx.beginPath();
        ctx.arc(sx, petCenterY, 16, 0, Math.PI * 2);
        const petGrad = ctx.createRadialGradient(sx - 5, petCenterY - 5, 2, sx, petCenterY, 16);
        petGrad.addColorStop(0, '#065f46');
        petGrad.addColorStop(1, '#064e3b');
        ctx.fillStyle = petGrad;
        ctx.fill();
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pet Icon
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#6ee7b7';
        ctx.shadowBlur = 8;
        ctx.fillText('🐕🔥', sx, petCenterY);

        // Pet HP Bar & Name Plate
        const petHpRatio = Math.max(0, Math.min(1, pet.hp / pet.maxHp));
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#6ee7b7';
        ctx.textAlign = 'center';
        ctx.fillText(`[神兽] ${pet.name}`, sx, petCenterY - 22);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(sx - 18, petCenterY - 18, 36, 4);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(sx - 18, petCenterY - 18, 36 * petHpRatio, 4);

        ctx.restore();
      }

      // 7. Draw Player Character & Dynamic Mount (Full Body Figure, Profession Silhouettes, Armor & Weapon Visuals)
      const isMounted = !!engine.character.mount?.isMounted;
      const mTier = engine.character.mount?.tier || 1;
      const mtConfig = MOUNT_TIERS[mTier] || MOUNT_TIERS[1];

      // Dynamic Mount Tracking & Smooth Displacement Interpolation Logic
      if (!mountPosRef.current) {
        mountPosRef.current = { x: playerX, y: playerY, vx: 0, vy: 0, angle: 0 };
      }
      const curM = mountPosRef.current;
      const distToPlayer = Math.hypot(playerX - curM.x, playerY - curM.y);

      // Reset immediately if teleported or initial map transition
      if (distToPlayer > 8) {
        curM.x = playerX;
        curM.y = playerY;
        curM.vx = 0;
        curM.vy = 0;
      } else {
        // Smooth lerp factor for riding tracking delay & natural inertia
        const lerpFactor = isMounted ? 0.22 : 0.35;
        const dx = playerX - curM.x;
        const dy = playerY - curM.y;
        curM.x += dx * lerpFactor;
        curM.y += dy * lerpFactor;
        curM.vx = dx * lerpFactor;
        curM.vy = dy * lerpFactor;
        if (Math.hypot(dx, dy) > 0.02) {
          curM.angle = Math.atan2(dy, dx);
        }
      }

      // Record motion trail points when moving and mounted
      if (isMounted && distToPlayer > 0.02) {
        mountTrailRef.current.push({
          x: curM.x,
          y: curM.y,
          alpha: 0.85,
          tier: mTier,
          angle: curM.angle,
          time: now
        });
      }
      // Prune trail points older than 450ms
      mountTrailRef.current = mountTrailRef.current.filter(t => now - t.time < 450);

      // Screen positions from dynamic tracking position
      const { sx: mpx, sy: mpy } = toScreen(curM.x, curM.y);
      const prof = engine.character.profession;

      const charBobY = Math.sin(now * 0.0035) * 3;
      const mountBobY = isMounted ? Math.sin(now * 0.007) * 3.5 : 0;
      const px = mpx;
      const py = mpy;
      const playerCenterY = mpy - (isMounted ? 32 : 20) + charBobY + mountBobY;

      // Draw Mount Differentiated Motion Trail Effects BEFORE character body
      if (isMounted && mountTrailRef.current.length > 0) {
        mountTrailRef.current.forEach(tPoint => {
          const ageMs = now - tPoint.time;
          const progress = 1 - ageMs / 450;
          if (progress <= 0) return;

          const { sx: tx, sy: ty } = toScreen(tPoint.x, tPoint.y);
          ctx.save();

          if (mTier <= 2) {
            // Tier 1-2 (1-2阶 宝马/灰狼): Dust cloud & soft golden speed line
            ctx.beginPath();
            ctx.ellipse(tx, ty + 2, 20 * progress, 10 * progress, 0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(253, 224, 71, ${0.35 * progress})`;
            ctx.fill();

            ctx.font = `${Math.floor(16 * progress)}px sans-serif`;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.45 * progress})`;
            ctx.textAlign = 'center';
            ctx.fillText('☁️', tx, ty - 6);
          } else if (mTier <= 4) {
            // Tier 3-4 (3-4阶 战熊/金睛兽): Flaming embers & fiery ground streak
            ctx.beginPath();
            ctx.ellipse(tx, ty + 2, 26 * progress, 13 * progress, 0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(249, 115, 22, ${0.45 * progress})`;
            ctx.shadowColor = '#ea580c';
            ctx.shadowBlur = 12;
            ctx.fill();

            ctx.font = `${Math.floor(22 * progress)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('🔥', tx, ty - 8);
          } else if (mTier <= 6) {
            // Tier 5-6 (5-6阶 独角兽/烈焰虎): Starlight spectral ghost copy & purple/pink stardust
            ctx.beginPath();
            ctx.ellipse(tx, ty + 2, 30 * progress, 15 * progress, 0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(168, 85, 247, ${0.45 * progress})`;
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = 16;
            ctx.fill();

            ctx.font = `${Math.floor(34 * progress)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = `rgba(244, 114, 182, ${0.35 * progress})`;
            ctx.fillText(mtConfig.icon, tx, ty - 12);
          } else if (mTier <= 8) {
            // Tier 7-8 (7-8阶 蛟龙/大鹏): Divine tempest lightning arcs & cyan dragon waves
            ctx.beginPath();
            ctx.ellipse(tx, ty + 2, 36 * progress, 18 * progress, 0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(6, 182, 212, ${0.5 * progress})`;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 20;
            ctx.fill();

            ctx.font = `${Math.floor(24 * progress)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('⚡', tx + (Math.random() - 0.5) * 12, ty - 10);
          } else {
            // Tier 9-10 (9-10阶 金龙/麒麟 - 圣兽级别): Supreme Golden Light Pillars & Dragon Runes
            ctx.beginPath();
            ctx.ellipse(tx, ty + 2, 42 * progress, 21 * progress, 0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(234, 179, 8, ${0.6 * progress})`;
            ctx.shadowColor = '#fef08a';
            ctx.shadowBlur = 24;
            ctx.fill();

            ctx.font = `${Math.floor(32 * progress)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = `rgba(254, 240, 138, ${0.55 * progress})`;
            ctx.fillText('✦', tx, ty - 16);
          }

          ctx.restore();
        });
      }

      ctx.save();

      // A. Ground Shadow & Tier-Differentiated Mount Rendering
      ctx.beginPath();
      ctx.ellipse(px, py + (isMounted ? 4 : 0), isMounted ? 44 : 24, isMounted ? 22 : 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fill();

      // Full Divine Mount Beast & Aura Array in Combat Scene
      if (isMounted) {
        const mPulse = Math.sin(now * 0.005) * 4;

        ctx.save();
        // 1. Tier-Differentiated Divine Mount Aura Ring & Magic Array
        const baseRadius = 40 + mTier * 2.2;
        ctx.beginPath();
        ctx.ellipse(px, py + 2, baseRadius + mPulse, baseRadius / 2 + mPulse * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = mtConfig.auraColor || 'rgba(245, 158, 11, 0.35)';
        ctx.fill();
        ctx.strokeStyle = mTier >= 9 ? '#fef08a' : mTier >= 6 ? '#e0e7ff' : '#fde047';
        ctx.lineWidth = mTier >= 7 ? 2.5 : 2;
        ctx.shadowColor = mtConfig.auraColor || '#f59e0b';
        ctx.shadowBlur = 12 + mTier * 1.5;
        ctx.stroke();

        // Secondary Concentric Ring for Tier >= 3
        if (mTier >= 3) {
          ctx.beginPath();
          ctx.ellipse(px, py + 2, baseRadius - 10 + mPulse, (baseRadius - 10) / 2 + mPulse * 0.5, 0, 0, Math.PI * 2);
          ctx.strokeStyle = mTier >= 7 ? '#38bdf8' : '#f59e0b';
          ctx.lineWidth = 1;
          ctx.setLineDash([6, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Rotating Magic Array Stars/Runes (Count & Icons scale with Tier)
        const runeCount = mTier >= 9 ? 8 : mTier >= 5 ? 6 : 4;
        const runeRot = (now * (mTier >= 7 ? 0.003 : 0.002)) % (Math.PI * 2);
        const runeIcons = mTier >= 9 ? ['✦', '🐉', '🔥', '⚡'] : mTier >= 7 ? ['✦', '⚡'] : ['✦'];

        for (let i = 0; i < runeCount; i++) {
          const ra = runeRot + (i * Math.PI * 2) / runeCount;
          const rx = px + Math.cos(ra) * (baseRadius - 4);
          const ry = py + 2 + Math.sin(ra) * ((baseRadius - 4) / 2);
          ctx.font = `${mTier >= 9 ? 12 : 10}px sans-serif`;
          ctx.fillStyle = mTier >= 9 ? '#fef08a' : mTier >= 6 ? '#c084fc' : '#fef08a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 10;
          ctx.fillText(runeIcons[i % runeIcons.length], rx, ry);
        }

        // Supreme Golden Light Pillar for Tier 9 & 10 (九天金龙 / 麒麟)
        if (mTier >= 9) {
          const pillarGrad = ctx.createLinearGradient(px, py, px, py - 90);
          pillarGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
          pillarGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.25)');
          pillarGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
          ctx.fillStyle = pillarGrad;
          ctx.fillRect(px - 28, py - 90, 56, 90);
        }

        // 2. Large Divine Beast Body Avatar Under Player with Dynamic Tilt on Movement
        const beastY = py - 14 + mountBobY;
        ctx.save();
        ctx.translate(px, beastY);

        // Lean tilt based on movement velocity curM.vx
        const tiltAngle = Math.max(-0.15, Math.min(0.15, curM.vx * 0.8));
        ctx.rotate(tiltAngle);

        ctx.font = '50px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = mtConfig.auraColor || '#f59e0b';
        ctx.shadowBlur = 20 + mTier * 1.5;
        ctx.fillText(mtConfig.icon, 0, 0);

        // 3. Saddle & Golden Reins
        ctx.beginPath();
        ctx.moveTo(-14, 2);
        ctx.lineTo(14, 2);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-10, 2);
        ctx.lineTo(-6, playerCenterY - beastY + 12);
        ctx.moveTo(10, 2);
        ctx.lineTo(6, playerCenterY - beastY + 12);
        ctx.strokeStyle = mTier >= 7 ? '#fde047' : '#fef08a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
        ctx.restore();
      }

      // B. Profession Ground Aura Ring
      if (prof === 'warrior') {
        const wRot = (now * 0.002) % (Math.PI * 2);
        ctx.beginPath();
        ctx.ellipse(px, py, 30, 15, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 12;
        ctx.stroke();

        for (let i = 0; i < 3; i++) {
          const fa = wRot + (i * Math.PI * 2) / 3;
          const fx = px + Math.cos(fa) * 30;
          const fy = py + Math.sin(fa) * 15;
          ctx.beginPath();
          ctx.arc(fx, fy, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = '#ea580c';
          ctx.shadowBlur = 8;
          ctx.fill();
        }
      } else if (prof === 'mage') {
        ctx.beginPath();
        ctx.arc(px, playerCenterY, 28, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 12;
        ctx.stroke();

        for (let i = 0; i < 3; i++) {
          const cAngle = (now * 0.003) + (i * Math.PI * 2) / 3;
          const cx = px + Math.cos(cAngle) * 28;
          const cy = playerCenterY + Math.sin(cAngle) * 14;
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#93c5fd';
          ctx.shadowBlur = 8;
          ctx.fillText('💠', cx, cy);
        }
      } else {
        const tRot = (now * 0.0015) % (Math.PI * 2);
        ctx.beginPath();
        ctx.ellipse(px, py, 32, 16, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;
        ctx.stroke();

        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#a7f3d0';
        ctx.shadowBlur = 8;
        const yx = px + Math.cos(tRot) * 32;
        const yy = py + Math.sin(tRot) * 16;
        ctx.fillText('☯️', yx, yy);
      }

      // C. Equipped Wing System (神级翼展)
      const wingLvl = engine.character.wingLevel || 0;
      if (wingLvl > 0) {
        const flap = Math.sin(now * 0.005) * 0.14;
        const wingY = playerCenterY - 8;

        ctx.save();
        let wingPrimary = '#38bdf8';
        let wingGlow = '#60a5fa';
        if (wingLvl >= 7) {
          wingPrimary = '#ef4444';
          wingGlow = '#f59e0b';
        } else if (wingLvl >= 4) {
          wingPrimary = '#f59e0b';
          wingGlow = '#fef08a';
        }

        // Left Wing
        ctx.save();
        ctx.translate(px - 10, wingY);
        ctx.rotate(-0.35 + flap);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-26, -32, -42, -14);
        ctx.quadraticCurveTo(-28, 0, 0, 10);
        ctx.fillStyle = wingPrimary;
        ctx.shadowColor = wingGlow;
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // Right Wing
        ctx.save();
        ctx.translate(px + 10, wingY);
        ctx.rotate(0.35 - flap);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(26, -32, 42, -14);
        ctx.quadraticCurveTo(28, 0, 0, 10);
        ctx.fillStyle = wingPrimary;
        ctx.shadowColor = wingGlow;
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        ctx.restore();
      }

      // D. Full Humanoid Character Body & Armor Layer (完整人物姿态与铠甲/法袍)
      const armorItem = engine.character.equipment.armor;
      const helmetItem = engine.character.equipment.helmet;
      const weaponItem = engine.character.equipment.weapon;

      // Color palette based on Armor & Profession
      let armorColorPrimary = '#475569';
      let armorColorSecondary = '#1e293b';
      let armorTrimColor = '#94a3b8';
      let armorGlowColor = '#64748b';

      if (armorItem) {
        if (armorItem.rarity === 'legendary' || armorItem.rarity === 'mythic') {
          armorColorPrimary = '#b91c1c';
          armorColorSecondary = '#7f1d1d';
          armorTrimColor = '#f59e0b';
          armorGlowColor = '#ef4444';
        } else if (armorItem.rarity === 'epic') {
          armorColorPrimary = '#6b21a8';
          armorColorSecondary = '#4c1d95';
          armorTrimColor = '#c084fc';
          armorGlowColor = '#a855f7';
        } else if (armorItem.rarity === 'rare') {
          armorColorPrimary = '#1e40af';
          armorColorSecondary = '#1e3a8a';
          armorTrimColor = '#60a5fa';
          armorGlowColor = '#3b82f6';
        } else {
          armorColorPrimary = '#334155';
          armorColorSecondary = '#0f172a';
          armorTrimColor = '#e2e8f0';
          armorGlowColor = '#94a3b8';
        }
      } else {
        // Default Starter Clothes by Profession
        if (prof === 'warrior') {
          armorColorPrimary = '#854d0e';
          armorColorSecondary = '#451a03';
          armorTrimColor = '#f59e0b';
          armorGlowColor = '#d97706';
        } else if (prof === 'mage') {
          armorColorPrimary = '#3730a3';
          armorColorSecondary = '#1e1b4b';
          armorTrimColor = '#a5b4fc';
          armorGlowColor = '#6366f1';
        } else {
          armorColorPrimary = '#065f46';
          armorColorSecondary = '#022c22';
          armorTrimColor = '#6ee7b7';
          armorGlowColor = '#10b981';
        }
      }

      ctx.save();

      // D1. Legs / Boots (双腿与战靴)
      ctx.fillStyle = armorColorSecondary;
      ctx.fillRect(px - 7, playerCenterY + 8, 5, 12);
      ctx.fillRect(px + 2, playerCenterY + 8, 5, 12);

      // Steel Boot Caps
      ctx.fillStyle = armorTrimColor;
      ctx.fillRect(px - 8, playerCenterY + 16, 6, 4);
      ctx.fillRect(px + 2, playerCenterY + 16, 6, 4);

      // D2. Torso / Robe / Chestplate (胸甲 / 法袍躯干)
      ctx.beginPath();
      if (prof === 'mage' || prof === 'taoist') {
        // Long Robe Silhouette (长袍裙摆)
        ctx.moveTo(px - 9, playerCenterY - 10);
        ctx.lineTo(px + 9, playerCenterY - 10);
        ctx.lineTo(px + 12, playerCenterY + 14);
        ctx.lineTo(px - 12, playerCenterY + 14);
      } else {
        // Warrior Heavy Plate Silhouette (重型铠甲胸甲)
        ctx.moveTo(px - 11, playerCenterY - 12);
        ctx.lineTo(px + 11, playerCenterY - 12);
        ctx.lineTo(px + 8, playerCenterY + 10);
        ctx.lineTo(px - 8, playerCenterY + 10);
      }
      ctx.closePath();

      const chestGrad = ctx.createLinearGradient(px - 10, playerCenterY - 10, px + 10, playerCenterY + 10);
      chestGrad.addColorStop(0, armorColorPrimary);
      chestGrad.addColorStop(1, armorColorSecondary);
      ctx.fillStyle = chestGrad;
      ctx.fill();

      // Armor Metallic Trim & Emblems (胸甲金边/图腾)
      ctx.strokeStyle = armorTrimColor;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = armorGlowColor;
      ctx.shadowBlur = 6;
      ctx.stroke();

      // Belt (金腰带)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(px - 9, playerCenterY + 2, 18, 3.5);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(px - 3, playerCenterY + 1, 6, 5.5); // Belt Buckle

      // D3. Shoulder Pauldrons (双肩拉风肩甲)
      ctx.beginPath();
      // Left Shoulder
      ctx.arc(px - 12, playerCenterY - 8, 5.5, 0, Math.PI * 2);
      // Right Shoulder
      ctx.arc(px + 12, playerCenterY - 8, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = armorTrimColor;
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (armorItem && (armorItem.rarity === 'epic' || armorItem.rarity === 'legendary' || armorItem.rarity === 'mythic')) {
        // Spiked Shoulder Ornaments (高阶翅尖肩刺)
        ctx.beginPath();
        ctx.moveTo(px - 16, playerCenterY - 14);
        ctx.lineTo(px - 11, playerCenterY - 8);
        ctx.lineTo(px - 14, playerCenterY - 4);
        ctx.moveTo(px + 16, playerCenterY - 14);
        ctx.lineTo(px + 11, playerCenterY - 8);
        ctx.lineTo(px + 14, playerCenterY - 4);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
      }

      // D4. Head, Hair & Helmet (头部/发型/头盔)
      const headY = playerCenterY - 20;

      if (helmetItem) {
        // Armored Helmet Graphic (装备头盔外观)
        ctx.beginPath();
        ctx.arc(px, headY, 8, 0, Math.PI * 2);
        ctx.fillStyle = armorColorPrimary;
        ctx.fill();
        ctx.strokeStyle = armorTrimColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Helmet Crown Plume / Crest
        ctx.beginPath();
        ctx.moveTo(px, headY - 11);
        ctx.lineTo(px - 4, headY - 6);
        ctx.lineTo(px + 4, headY - 6);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
      } else {
        // Character Face & Hair (不同职业专属面貌)
        // Face Skin Tone
        ctx.beginPath();
        ctx.arc(px, headY, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fde047';
        ctx.fill();

        if (prof === 'warrior') {
          // Warrior Red Headband & Dark Hair (战士战意头带)
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(px - 7, headY - 4, 14, 3);
          ctx.beginPath();
          ctx.arc(px, headY - 3, 7, Math.PI, Math.PI * 2);
          ctx.fillStyle = '#1e293b';
          ctx.fill();
        } else if (prof === 'mage') {
          // Mage Arcane Hood & Crown (法师魔导兜帽)
          ctx.beginPath();
          ctx.arc(px, headY - 1, 8.5, Math.PI * 0.8, Math.PI * 2.2);
          ctx.fillStyle = '#312e81';
          ctx.fill();
          ctx.strokeStyle = '#a5b4fc';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // Taoist High Hair Bun & Jade Pin (道士道冠发髻)
          ctx.beginPath();
          ctx.arc(px, headY - 7, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#064e3b';
          ctx.fill();
          ctx.fillStyle = '#34d399';
          ctx.fillRect(px - 6, headY - 7, 12, 1.5); // Jade Pin
        }
      }

      // E. Hand-held Weapon Visualization (手持装备武器渲染)
      const weaponX = px + 16;
      const weaponY = playerCenterY - 6;

      ctx.save();
      ctx.translate(weaponX, weaponY);

      if (prof === 'warrior') {
        // Warrior Sword / Greatsword Pose (战士重剑/屠龙刀姿态)
        ctx.rotate(-0.4);

        const wName = weaponItem?.name || '';
        const isDragonSlayer = wName.includes('屠龙') || wName.includes('裁决') || wName.includes('怒斩') || weaponItem?.rarity === 'legendary' || weaponItem?.rarity === 'mythic';

        if (isDragonSlayer) {
          // Legendary Dragon Slayer Sword (屠龙宝刀)
          // Blade
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-3, -28, 7, 26);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(-1, -26, 3, 22);

          // Dragon Head Hilt
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(-6, -4, 13, 5);

          // Flame Aura
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 15;
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          ctx.strokeRect(-4, -29, 9, 28);
        } else {
          // Steel Broadsword (常规战刀)
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(-2, -22, 4, 20);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(-4, -3, 9, 3); // Crossguard
        }

        // Sword Tip Star Sparkle
        ctx.font = '10px sans-serif';
        ctx.fillText('✨', -2, -28);

      } else if (prof === 'mage') {
        // Mage Arcane Staff Pose (法师魔杖/骨玉权杖姿态)
        ctx.rotate(-0.15);

        const mName = weaponItem?.name || '';
        const isBoneJade = mName.includes('骨玉') || mName.includes('嗜魂') || mName.includes('镇天') || weaponItem?.rarity === 'legendary' || weaponItem?.rarity === 'mythic';

        // Staff Shaft
        ctx.fillStyle = isBoneJade ? '#f8fafc' : '#78350f';
        ctx.fillRect(-1.5, -30, 3, 34);

        // Staff Top Orb Head
        ctx.beginPath();
        ctx.arc(0, -32, isBoneJade ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = isBoneJade ? '#a855f7' : '#38bdf8';
        ctx.shadowColor = isBoneJade ? '#c084fc' : '#60a5fa';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Orbiting Magic Sparkle
        const orbAngle = now * 0.006;
        const ox = Math.cos(orbAngle) * 9;
        const oy = -32 + Math.sin(orbAngle) * 5;
        ctx.beginPath();
        ctx.arc(ox, oy, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.fill();

      } else {
        // Taoist Fan / Sword Pose (道士玄天剑/逍遥扇姿态)
        ctx.rotate(-0.25);

        const tName = weaponItem?.name || '';
        const isFan = tName.includes('扇') || tName.includes('逍遥');

        if (isFan) {
          // Taoist Xuan-Yao Fan (逍遥扇)
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-12, -24);
          ctx.quadraticCurveTo(0, -32, 12, -24);
          ctx.closePath();
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // Taoist Jade Sword (降魔/玄天剑)
          ctx.fillStyle = '#34d399';
          ctx.fillRect(-1.5, -24, 3, 22);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-4, -3, 9, 3);
          ctx.shadowColor = '#6ee7b7';
          ctx.shadowBlur = 10;
        }

        // Floating Taoist Paper Charm (道家秘符)
        const charmY = -18 + Math.sin(now * 0.005) * 4;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(8, charmY, 5, 9);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(9.5, charmY + 2, 2, 5);
      }

      ctx.restore(); // Restore Weapon transform

      ctx.restore(); // Restore Character Body

      // E. Name Tag & Rebirth / Guild / Mount Titles
      let titleOffset = playerCenterY - 36;

      if (engine.character.mount?.isMounted) {
        const mTier = engine.character.mount.tier;
        const mtConfig = MOUNT_TIERS[mTier] || MOUNT_TIERS[1];
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#fde047';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#d97706';
        ctx.shadowBlur = 8;
        ctx.fillText(`【骑乘 · ${mtConfig.name} (${engine.character.mount.level}星)】`, px, titleOffset);
        titleOffset -= 13;
      }

      if (engine.character.guildName) {
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#7dd3fc';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 6;
        ctx.fillText(`<${engine.character.guildName}>`, px, titleOffset);
        titleOffset -= 13;
      }

      const rbLvl = engine.character.rebirthLevel || 0;
      const titleText = rbLvl > 0
        ? `[${rbLvl}转] ${engine.character.name} LV.${engine.character.level}`
        : `${engine.character.name} LV.${engine.character.level}`;

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 8;
      ctx.fillText(titleText, px, titleOffset);

      // F. Polished Dual Health (HP) & Mana (MP) Bars
      const hpRatio = Math.max(0, Math.min(1, engine.stats.hp / engine.stats.maxHp));
      const mpRatio = Math.max(0, Math.min(1, engine.stats.mp / engine.stats.maxMp));

      const dualBarW = 54;
      const barX = px - dualBarW / 2;
      const hpBarY = playerCenterY - 32;
      const mpBarY = hpBarY + 5;

      // Dark Glass Background Box
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(barX - 2, hpBarY - 2, dualBarW + 4, 12);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX - 2, hpBarY - 2, dualBarW + 4, 12);

      // HP Bar Fill (Red)
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(barX, hpBarY, dualBarW * hpRatio, 4);

      // MP Bar Fill (Blue)
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(barX, mpBarY, dualBarW * mpRatio, 4);

      ctx.restore();

      // 8. Draw Floating Particles & Damage Numbers (Real-Time Combat Text System)
      engine.particles.forEach(p => {
        const { sx: baseSx, sy: baseSy } = toScreen(p.x, p.y);
        const elapsed = now - p.startTime;
        const progress = Math.min(1, elapsed / p.durationMs);

        // Alpha fade out near end
        const alpha = Math.max(0, 1 - Math.pow(progress, 1.4));

        // Horizontal jitter & drift so overlapping numbers don't clash
        const driftX = (p.offsetRandomX || 0) * tileWidth;
        let sx = baseSx + driftX;
        let sy = baseSy;

        // Vertical flotation curve (starts with pop-up velocity then slows down)
        const flyUpY = Math.sin(progress * Math.PI * 0.5) * 44;
        sy = baseSy - 24 - flyUpY;

        ctx.save();
        ctx.globalAlpha = alpha;

        const category = p.combatCategory || 'info';

        if (category === 'crit') {
          // --- CRITICAL HIT (暴击伤害) ---
          // Pop animation curve: grows quickly to 1.55x scale in first 20% of duration, then settles to 1.1x
          let scale = 1;
          if (progress < 0.2) {
            scale = 1 + Math.sin((progress / 0.2) * Math.PI) * 0.55;
          } else {
            scale = 1.1;
          }

          ctx.translate(sx, sy);
          ctx.scale(scale, scale);

          // Gold Glowing Aura
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 14;

          // Thick Dark Outer Stroke for High Contrast
          ctx.font = 'black 22px "Plus Jakarta Sans", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 4;
          ctx.strokeText(p.text || '', 0, 0);

          // Golden Yellow Linear Gradient Fill
          const goldGrad = ctx.createLinearGradient(0, -12, 0, 12);
          goldGrad.addColorStop(0, '#fffbeb');
          goldGrad.addColorStop(0.3, '#fef08a');
          goldGrad.addColorStop(1, '#f59e0b');
          ctx.fillStyle = goldGrad;
          ctx.fillText(p.text || '', 0, 0);

        } else if (category === 'block') {
          // --- BLOCKED HIT (格挡/抵挡伤害) ---
          // Rebound Horizontal Shake animation (wobble left-right)
          const shakeX = Math.sin(progress * Math.PI * 5) * (1 - progress) * 5;
          sx += shakeX;

          ctx.translate(sx, sy);

          // Cyan Glowing Aura
          ctx.shadowColor = '#0284c7';
          ctx.shadowBlur = 10;

          // Deep Blue Outer Stroke
          ctx.font = 'bold 16px "Plus Jakarta Sans", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = '#0c4a6e';
          ctx.lineWidth = 3;
          ctx.strokeText(p.text || '', 0, 0);

          // Sky Blue Fill
          const blockGrad = ctx.createLinearGradient(0, -10, 0, 10);
          blockGrad.addColorStop(0, '#e0f2fe');
          blockGrad.addColorStop(0.5, '#38bdf8');
          blockGrad.addColorStop(1, '#0284c7');
          ctx.fillStyle = blockGrad;
          ctx.fillText(p.text || '', 0, 0);

        } else if (category === 'normal') {
          // --- NORMAL HIT (普通伤害) ---
          let scale = 1;
          if (progress < 0.15) {
            scale = 1 + Math.sin((progress / 0.15) * Math.PI) * 0.25;
          }

          ctx.translate(sx, sy);
          ctx.scale(scale, scale);

          // Crimson Red Glow
          ctx.shadowColor = '#dc2626';
          ctx.shadowBlur = 8;

          // Dark Crimson Outer Stroke
          ctx.font = 'bold 17px "Plus Jakarta Sans", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = '#450a0a';
          ctx.lineWidth = 3;
          ctx.strokeText(p.text || '', 0, 0);

          // Bright Crimson Fill
          const redGrad = ctx.createLinearGradient(0, -9, 0, 9);
          redGrad.addColorStop(0, '#fef2f2');
          redGrad.addColorStop(0.4, '#f87171');
          redGrad.addColorStop(1, '#dc2626');
          ctx.fillStyle = redGrad;
          ctx.fillText(p.text || '', 0, 0);

        } else if (category === 'heal') {
          // --- HEAL NUMBERS ---
          ctx.translate(sx, sy);
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 8;

          ctx.font = 'bold 16px "Plus Jakarta Sans", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = '#064e3b';
          ctx.lineWidth = 3;
          ctx.strokeText(p.text || '', 0, 0);

          ctx.fillStyle = '#34d399';
          ctx.fillText(p.text || '', 0, 0);

        } else {
          // --- SYSTEM / QUEST / ANNOUNCEMENT TEXT ---
          ctx.translate(sx, sy);
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 4;

          ctx.font = 'bold 14px "Plus Jakarta Sans", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 3.5;
          ctx.strokeText(p.text || '', 0, 0);

          ctx.fillStyle = p.color;
          ctx.fillText(p.text || '', 0, 0);
        }

        ctx.restore();
      });

      // 6.5. Draw Screen-Center Combat Combo Number & Shockwave Flame Animation
      const combo = engine.comboCount;
      const showCenter = engine.character.combatDisplaySettings?.showCenterDamage ?? false;
      if (combo >= 2 && showCenter) {
        const timeElapsed = now - engine.lastHitTime;
        const timeoutMs = engine.comboTimeoutMs || 3000;
        const remainingRatio = Math.max(0, (timeoutMs - timeElapsed) / timeoutMs);

        if (remainingRatio > 0) {
          ctx.save();
          const centerX = width / 2;
          const centerY = height * 0.28; // Centered upper-middle screen area for optimal combat view

          // Calculate Hit Scale Punch & Alpha Fade
          const isFreshHit = timeElapsed < 220;
          const popScale = isFreshHit ? 1 + (1 - timeElapsed / 220) * 0.42 : 1;
          const comboAlpha = remainingRatio < 0.15 ? remainingRatio / 0.15 : 1;

          ctx.translate(centerX, centerY);
          ctx.scale(popScale, popScale);
          ctx.globalAlpha = comboAlpha;

          // Rank Titles & Color Schemes
          let rankText = '🔥 初露锋芒';
          let mainColor1 = '#fde047'; // Bright Yellow
          let mainColor2 = '#f59e0b'; // Amber
          let strokeColor = '#451a03'; // Dark Brown/Amber stroke
          let glowColor = '#f59e0b'; // Amber Glow

          if (combo >= 50) {
            rankText = '👑 超神连斩 GODLIKE 👑';
            mainColor1 = '#f472b6';
            mainColor2 = '#e879f9';
            strokeColor = '#4c1d95';
            glowColor = '#ec4899';
          } else if (combo >= 35) {
            rankText = '🐲 万夫不当 RAMPAGE';
            mainColor1 = '#fb7185';
            mainColor2 = '#f43f5e';
            strokeColor = '#4c0519';
            glowColor = '#f43f5e';
          } else if (combo >= 20) {
            rankText = '💥 横扫千军 DOMINATING';
            mainColor1 = '#fed7aa';
            mainColor2 = '#ea580c';
            strokeColor = '#431407';
            glowColor = '#ea580c';
          } else if (combo >= 10) {
            rankText = '⚡ 势如破竹 UNSTOPPABLE';
            mainColor1 = '#fef08a';
            mainColor2 = '#eab308';
            strokeColor = '#422006';
            glowColor = '#eab308';
          }

          // A. Radiant Central Shockwave Aura Pulse
          const waveRadius = 75 + Math.min(30, combo * 0.6);
          ctx.beginPath();
          ctx.ellipse(0, 0, waveRadius, waveRadius * 0.38, 0, 0, Math.PI * 2);
          ctx.fillStyle = `${glowColor}22`;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 24 + (isFreshHit ? 16 : 0);
          ctx.fill();

          // Shockwave Expanding Ring on Fresh Hit
          if (isFreshHit) {
            const shockRadius = (1 - timeElapsed / 220) * (waveRadius + 32);
            ctx.beginPath();
            ctx.ellipse(0, 0, shockRadius, shockRadius * 0.38, 0, 0, Math.PI * 2);
            ctx.strokeStyle = mainColor1;
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 12;
            ctx.stroke();
          }

          // B. Rank Title Badge Ribbon Above Combo Number
          ctx.font = '900 13px "Plus Jakarta Sans", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 4;
          ctx.strokeText(rankText, 0, -32);

          ctx.fillStyle = mainColor1;
          ctx.fillText(rankText, 0, -32);

          // C. Big Central Combo Digits + "连击 / COMBO" Text
          const comboNumStr = `${combo}`;
          ctx.font = '900 52px "Plus Jakarta Sans", system-ui, sans-serif';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 7;
          ctx.strokeText(comboNumStr, -8, 2);

          const numGrad = ctx.createLinearGradient(0, -25, 0, 25);
          numGrad.addColorStop(0, '#ffffff');
          numGrad.addColorStop(0.4, mainColor1);
          numGrad.addColorStop(1, mainColor2);
          ctx.fillStyle = numGrad;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 20;
          ctx.fillText(comboNumStr, -8, 2);

          // Right Label "连击 / HITS"
          ctx.font = '900 22px "Plus Jakarta Sans", system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 4.5;
          ctx.strokeText('连击', 6, 0);

          ctx.fillStyle = mainColor1;
          ctx.fillText('连击', 6, 0);

          ctx.font = '900 10px "Plus Jakarta Sans", system-ui, sans-serif';
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 3;
          ctx.strokeText('COMBO HITS', 6, 18);
          ctx.fillStyle = '#fef08a';
          ctx.fillText('COMBO HITS', 6, 18);

          // D. Smooth Countdown Timer Bar Under Combo Text
          const barWidth = 120;
          const barHeight = 4;
          const barY = 32;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

          if (remainingRatio > 0) {
            const fillWidth = Math.max(0, barWidth * remainingRatio);
            const barGrad = ctx.createLinearGradient(-barWidth / 2, 0, barWidth / 2, 0);
            barGrad.addColorStop(0, mainColor1);
            barGrad.addColorStop(1, mainColor2);
            ctx.fillStyle = barGrad;
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 8;
            ctx.fillRect(-barWidth / 2, barY, fillWidth, barHeight);
          }

          ctx.restore();
        }
      }

      // 7. Draw Weather Ambient Lighting Tint & Weather Particles
      ctx.save();
      if (currentWeather === 'sunny') {
        const sunGrad = ctx.createLinearGradient(0, 0, width * 0.7, height);
        sunGrad.addColorStop(0, 'rgba(254, 240, 138, 0.10)');
        sunGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.04)');
        sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = sunGrad;
        ctx.fillRect(0, 0, width, height);
      } else if (currentWeather === 'rain') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
        ctx.fillRect(0, 0, width, height);
      } else if (currentWeather === 'snow') {
        ctx.fillStyle = 'rgba(186, 230, 253, 0.10)';
        ctx.fillRect(0, 0, width, height);

        const frostGrad = ctx.createRadialGradient(screenCenterX, screenCenterY, height * 0.3, screenCenterX, screenCenterY, width * 0.65);
        frostGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        frostGrad.addColorStop(1, 'rgba(224, 242, 254, 0.20)');
        ctx.fillStyle = frostGrad;
        ctx.fillRect(0, 0, width, height);
      } else if (currentWeather === 'sandstorm') {
        ctx.fillStyle = 'rgba(180, 83, 9, 0.22)';
        ctx.fillRect(0, 0, width, height);

        const sandGrad = ctx.createLinearGradient(0, 0, width, 0);
        sandGrad.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
        sandGrad.addColorStop(0.5, 'rgba(180, 83, 9, 0.22)');
        sandGrad.addColorStop(1, 'rgba(217, 119, 6, 0.12)');
        ctx.fillStyle = sandGrad;
        ctx.fillRect(0, 0, width, height);
      } else if (currentWeather === 'thunder') {
        ctx.fillStyle = 'rgba(46, 16, 70, 0.35)';
        ctx.fillRect(0, 0, width, height);

        // Thunder Lightning Screen Flash
        if (now - lastThunderFlashTimeRef.current > thunderFlashIntervalRef.current) {
          lastThunderFlashTimeRef.current = now;
          thunderFlashDurationRef.current = 140;
          thunderFlashIntervalRef.current = 3500 + Math.random() * 4500;
          soundFX.playThunder();
        }

        const flashElapsed = now - lastThunderFlashTimeRef.current;
        if (flashElapsed < thunderFlashDurationRef.current) {
          const flashAlpha = (1 - flashElapsed / thunderFlashDurationRef.current) * 0.70;
          ctx.fillStyle = `rgba(243, 232, 255, ${flashAlpha})`;
          ctx.fillRect(0, 0, width, height);

          // Lightning Bolt Stroke
          ctx.beginPath();
          ctx.moveTo(width * 0.62, 0);
          ctx.lineTo(width * 0.58, height * 0.28);
          ctx.lineTo(width * 0.65, height * 0.34);
          ctx.lineTo(width * 0.52, height * 0.68);
          ctx.strokeStyle = `rgba(255, 255, 255, ${flashAlpha})`;
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 18;
          ctx.stroke();
        }
      }

      // Draw & Update Weather Particles
      weatherParticlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        // Reset particles that move out of canvas frame
        if (p.x < -30) p.x = width + 20;
        if (p.x > width + 30) p.x = -20;
        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        }
        if (p.y < -30) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }

        if (currentWeather === 'rain' || currentWeather === 'thunder') {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 1.2, p.y + (p.length || 18));
          ctx.strokeStyle = `rgba(186, 230, 253, ${p.alpha})`;
          ctx.lineWidth = p.size;
          ctx.stroke();
        } else if (currentWeather === 'snow') {
          ctx.beginPath();
          const wobbleX = p.x + Math.sin(now * 0.002 + p.pulsePhase) * 12;
          ctx.arc(wobbleX, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.shadowColor = '#e0f2fe';
          ctx.shadowBlur = 4;
          ctx.fill();
        } else if (currentWeather === 'sandstorm') {
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * 2.8, p.size, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(251, 191, 36, ${p.alpha})`;
          ctx.fill();
        } else {
          // Sunny Light Sparkles
          ctx.beginPath();
          const pSize = p.size * (0.8 + Math.sin(now * 0.003 + p.pulsePhase) * 0.35);
          ctx.arc(p.x, p.y, pSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(253, 224, 71, ${p.alpha})`;
          ctx.shadowColor = '#fef08a';
          ctx.shadowBlur = 6;
          ctx.fill();
        }
      });
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [engine]);

  // Handle Click / Tap on Canvas for Movement or Targeting
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const screenCenterX = width / 2;
    const screenCenterY = height / 2;

    const playerX = engine.character.x;
    const playerY = engine.character.y;
    const tileWidth = 60;
    const tileHeight = 30;

    // Check if clicked a monster
    for (const m of engine.monsters) {
      if (m.hp <= 0) continue;
      const isoX = (m.x - m.y) * (tileWidth / 2);
      const isoY = (m.x + m.y) * (tileHeight / 2);
      const playerIsoX = (playerX - playerY) * (tileWidth / 2);
      const playerIsoY = (playerX + playerY) * (tileHeight / 2);

      const msx = screenCenterX + (isoX - playerIsoX);
      const msy = screenCenterY + (isoY - playerIsoY);

      if (Math.hypot(clickX - msx, clickY - msy) < 25) {
        engine.targetMonsterId = m.id;
        engine.attackTarget(m.id);
        if (onSelectMonster) onSelectMonster(m.id);
        return;
      }
    }

    // Convert Screen click back to Grid coordinates for movement
    const dx = clickX - screenCenterX;
    const dy = clickY - screenCenterY;

    const playerIsoX = (playerX - playerY) * (tileWidth / 2);
    const playerIsoY = (playerX + playerY) * (tileHeight / 2);

    const targetIsoX = playerIsoX + dx;
    const targetIsoY = playerIsoY + dy;

    const targetGx = Math.round((targetIsoX / (tileWidth / 2) + targetIsoY / (tileHeight / 2)) / 2);
    const targetGy = Math.round((targetIsoY / (tileHeight / 2) - targetIsoX / (tileWidth / 2)) / 2);

    const map = MAP_DATABASE[engine.currentMapId];
    if (map && targetGx >= 1 && targetGx < map.width - 1 && targetGy >= 1 && targetGy < map.height - 1) {
      engine.character.x = targetGx;
      engine.character.y = targetGy;

      // Check if stepped on portal
      const portal = map.portals.find(p => Math.abs(p.x - targetGx) <= 1 && Math.abs(p.y - targetGy) <= 1);
      if (portal) {
        engine.changeMap(portal.targetMapId, portal.targetX, portal.targetY);
      }
    }
  };

  const currentWeatherInfo = WEATHER_DATABASE[engine.currentWeather] || WEATHER_DATABASE.sunny;

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 rounded-xl border border-amber-900/30 shadow-2xl">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-crosshair touch-none"
      />

      {/* Floating Canvas Combo Effect Counter */}
      <ComboOverlay engine={engine} />

      {/* Floating Canvas Weather Badge Pill */}
      {onOpenWeatherModal && (
        <button
          onClick={onOpenWeatherModal}
          className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-amber-500/60 hover:border-amber-400 text-amber-200 backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.8)] flex items-center gap-2 text-xs font-bold transition-all hover:scale-105 active:scale-95 z-20"
          title="点击查看/祈福改变全域天象与BUFF"
        >
          <span className="text-base">{currentWeatherInfo.icon}</span>
          <span className="text-amber-100">{currentWeatherInfo.name}</span>
          <span className="text-[10px] bg-amber-950/90 text-amber-400 px-1.5 py-0.5 rounded border border-amber-800/80">
            {currentWeatherInfo.buffText}
          </span>
        </button>
      )}
    </div>
  );
};

function sy_offset(py: number, offset: number) {
  return py + offset;
}
