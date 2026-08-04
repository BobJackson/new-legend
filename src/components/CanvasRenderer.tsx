import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { MOUNT_TIERS } from '../data/mounts';
import { MAP_DATABASE } from '../data/maps';
import { WEATHER_DATABASE, WeatherType } from '../data/weather';
import { soundFX } from '../utils/sound';
import { ComboOverlay } from './HUD/ComboOverlay';
import { drawCharacterAvatar } from '../utils/characterRenderer';

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
  const wasInsideTerritoryRef = useRef<boolean>(false);
  const cameraPosRef = useRef<{ x: number; y: number } | null>(null);

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

      // Center view on player with smooth camera damping
      const playerX = engine.character.x;
      const playerY = engine.character.y;

      if (!cameraPosRef.current) {
        cameraPosRef.current = { x: playerX, y: playerY };
      } else {
        // Exponential smoothing for butter-smooth camera following
        const dx = playerX - cameraPosRef.current.x;
        const dy = playerY - cameraPosRef.current.y;
        if (Math.hypot(dx, dy) > 25) { // Reset instantly on teleport/map change
          cameraPosRef.current = { x: playerX, y: playerY };
        } else {
          cameraPosRef.current.x += dx * 0.15;
          cameraPosRef.current.y += dy * 0.15;
        }
      }
      const camX = cameraPosRef.current.x;
      const camY = cameraPosRef.current.y;

      // Dynamic Camera Screen Shake on heavy combat impacts
      let shakeX = 0;
      let shakeY = 0;
      const heavyPart = engine.particles.find(p => p.vfxKind === 'boss_smash' || p.vfxKind === 'thunder' || p.vfxKind === 'spark_burst' || p.combatCategory === 'crit');
      if (heavyPart) {
        const elapsed = now - heavyPart.startTime;
        if (elapsed < 320) {
          const intensity = (1 - elapsed / 320) * (heavyPart.vfxKind === 'boss_smash' ? 12 : 6);
          shakeX = (Math.random() - 0.5) * intensity;
          shakeY = (Math.random() - 0.5) * intensity;
        }
      }

      const screenCenterX = width / 2 + shakeX;
      const screenCenterY = height / 2 + shakeY;

      // Coordinate converter: grid (x, y) to screen canvas (sx, sy)
      const toScreen = (gx: number, gy: number) => {
        const isoX = (gx - gy) * (tileWidth / 2);
        const isoY = (gx + gy) * (tileHeight / 2);
        const camIsoX = (camX - camY) * (tileWidth / 2);
        const camIsoY = (camX + camY) * (tileHeight / 2);

        return {
          sx: screenCenterX + (isoX - camIsoX),
          sy: screenCenterY + (isoY - camIsoY)
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

      // 2.5 Draw Guild Territory Ground Highlights, Imperial Magic Seal & Perimeter Laser Fence
      if (map.guildTerritory) {
        const terr = map.guildTerritory;
        const sabakGuild = engine.sabakInfo?.guildName || '兄弟会';
        const sabakLeader = engine.sabakInfo?.leaderName || '霸天战神';

        // A. Floor Tile Territory Shading
        for (let gx = terr.bounds.minX; gx <= terr.bounds.maxX; gx++) {
          for (let gy = terr.bounds.minY; gy <= terr.bounds.maxY; gy++) {
            const { sx, sy } = toScreen(gx, gy);
            if (sx < -100 || sx > width + 100 || sy < -100 || sy > height + 100) continue;

            ctx.beginPath();
            ctx.moveTo(sx, sy - tileHeight / 2);
            ctx.lineTo(sx + tileWidth / 2, sy);
            ctx.lineTo(sx, sy + tileHeight / 2);
            ctx.lineTo(sx - tileWidth / 2, sy);
            ctx.closePath();

            const isAlt = (gx + gy) % 2 === 0;
            ctx.fillStyle = isAlt ? 'rgba(245, 158, 11, 0.12)' : 'rgba(220, 38, 38, 0.08)';
            ctx.fill();
          }
        }

        // B. Central Imperial Magic Crest / Seal on Floor
        const centerX = Math.floor((terr.bounds.minX + terr.bounds.maxX) / 2);
        const centerY = Math.floor((terr.bounds.minY + terr.bounds.maxY) / 2);
        const { sx: csx, sy: csy } = toScreen(centerX, centerY);

        if (csx >= -200 && csx <= width + 200 && csy >= -200 && csy <= height + 200) {
          ctx.save();

          const sealRadius = tileWidth * 3.2;
          const sealGrad = ctx.createRadialGradient(csx, csy, 5, csx, csy, sealRadius);
          sealGrad.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
          sealGrad.addColorStop(0.6, 'rgba(180, 83, 9, 0.2)');
          sealGrad.addColorStop(1, 'rgba(120, 53, 15, 0)');

          ctx.beginPath();
          ctx.ellipse(csx, csy, sealRadius, sealRadius * 0.5, 0, 0, Math.PI * 2);
          ctx.fillStyle = sealGrad;
          ctx.fill();

          const rotAngle = (now * 0.0008) % (Math.PI * 2);
          ctx.save();
          ctx.translate(csx, csy);
          ctx.scale(1, 0.5);
          ctx.rotate(rotAngle);

          ctx.beginPath();
          ctx.arc(0, 0, sealRadius * 0.75, 0, Math.PI * 2);
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2;
          ctx.setLineDash([12, 8]);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(0, 0, sealRadius * 0.5, 0, Math.PI * 2);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 6]);
          ctx.stroke();
          ctx.restore();

          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = '#d97706';
          ctx.shadowBlur = 10;
          ctx.fillText(`👑 【${sabakGuild}】沙城霸主专属领地`, csx, csy - 10);

          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#fde047';
          ctx.fillText(`城主大天尊: ${sabakLeader} · 奉天承运 独霸天下`, csx, csy + 12);

          ctx.restore();
        }

        // C. Perimeter Boundary Laser Lines (行会领地范围标记)
        const { minX, minY, maxX, maxY } = terr.bounds;
        ctx.save();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 12;

        const edgeSegments = [
          { start: { x: minX, y: minY }, end: { x: maxX, y: minY } },
          { start: { x: maxX, y: minY }, end: { x: maxX, y: maxY } },
          { start: { x: maxX, y: maxY }, end: { x: minX, y: maxY } },
          { start: { x: minX, y: maxY }, end: { x: minX, y: minY } },
        ];

        edgeSegments.forEach(seg => {
          const p1 = toScreen(seg.start.x, seg.start.y);
          const p2 = toScreen(seg.end.x, seg.end.y);

          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.stroke();

          const steps = 6;
          for (let i = 0; i <= steps; i++) {
            const t = (i / steps + (now * 0.0003)) % 1;
            const nx = p1.sx + (p2.sx - p1.sx) * t;
            const ny = p1.sy + (p2.sy - p1.sy) * t;

            ctx.beginPath();
            ctx.arc(nx, ny, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#fef08a';
            ctx.fill();
          }
        });
        ctx.restore();

        // D. Corner Stone Posts (领地界碑)
        const cornerCoords = [
          { x: minX, y: minY, label: '西北霸主界碑' },
          { x: maxX, y: minY, label: '东北霸主界碑' },
          { x: maxX, y: maxY, label: '东南霸主界碑' },
          { x: minX, y: maxY, label: '西南霸主界碑' },
        ];

        cornerCoords.forEach(c => {
          const { sx, sy } = toScreen(c.x, c.y);
          if (sx < -100 || sx > width + 100 || sy < -100 || sy > height + 100) return;

          ctx.save();
          ctx.beginPath();
          ctx.ellipse(sx, sy + 2, 16, 8, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fill();

          const colGrad = ctx.createLinearGradient(sx - 8, 0, sx + 8, 0);
          colGrad.addColorStop(0, '#78350f');
          colGrad.addColorStop(0.5, '#b45309');
          colGrad.addColorStop(1, '#451a03');

          ctx.fillStyle = colGrad;
          ctx.fillRect(sx - 7, sy - 35, 14, 35);
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1;
          ctx.strokeRect(sx - 7, sy - 35, 14, 35);

          const orbPulse = Math.sin(now * 0.005) * 2;
          ctx.beginPath();
          ctx.arc(sx, sy - 42, Math.max(0, 6 + orbPulse * 0.5), 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 12;
          ctx.fill();

          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fde047';
          ctx.fillText('【界碑】', sx, sy - 52);

          ctx.restore();
        });
      }

      // 3. Draw Portals & Teleport Arrays
      map.portals.forEach(portal => {
        const { sx, sy } = toScreen(portal.x, portal.y);
        if (sx < -100 || sx > width + 100 || sy < -100 || sy > height + 100) return;

        const distToPlayer = Math.hypot(portal.x - playerX, portal.y - playerY);
        const isNearby = distToPlayer <= 3.5;

        ctx.save();

        // 3.1 Light Beam Rising Up
        const beamH = isNearby ? 90 : 60;
        const beamGrad = ctx.createLinearGradient(sx, sy, sx, sy - beamH);
        beamGrad.addColorStop(0, isNearby ? 'rgba(59, 130, 246, 0.45)' : 'rgba(99, 102, 241, 0.25)');
        beamGrad.addColorStop(0.5, isNearby ? 'rgba(147, 197, 253, 0.3)' : 'rgba(165, 180, 252, 0.15)');
        beamGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');

        ctx.beginPath();
        ctx.moveTo(sx - tileWidth / 2.2, sy);
        ctx.lineTo(sx - tileWidth / 4, sy - beamH);
        ctx.lineTo(sx + tileWidth / 4, sy - beamH);
        ctx.lineTo(sx + tileWidth / 2.2, sy);
        ctx.closePath();
        ctx.fillStyle = beamGrad;
        ctx.fill();

        // 3.2 Outer Magic Disc Base
        ctx.beginPath();
        ctx.ellipse(sx, sy, tileWidth / 1.8, tileHeight / 1.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = isNearby ? 'rgba(37, 99, 235, 0.45)' : 'rgba(30, 58, 138, 0.3)';
        ctx.fill();
        ctx.strokeStyle = isNearby ? '#60a5fa' : '#3b82f6';
        ctx.lineWidth = isNearby ? 2.5 : 1.5;
        ctx.stroke();

        // 3.3 Rotating Magic Runes
        const angle = (now * 0.0015 + portal.x * 3) % (Math.PI * 2);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(1, tileHeight / tileWidth);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.arc(0, 0, tileWidth * 0.4, 0, Math.PI * 2);
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = isNearby ? '#93c5fd' : '#60a5fa';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // 3.4 Proximity Pulse Wave
        if (isNearby) {
          const pulseR = ((now % 1000) / 1000) * (tileWidth * 0.7);
          const pulseAlpha = 1 - (now % 1000) / 1000;
          ctx.beginPath();
          ctx.ellipse(sx, sy, pulseR, pulseR * (tileHeight / tileWidth), 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(147, 197, 253, ${pulseAlpha * 0.8})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // 3.5 Portal Title Label
        const labelY = sy - beamH / 2 - 15;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';

        // Background tag pill
        const textWidth = ctx.measureText(`🌀 ${portal.label}`).width;
        ctx.fillStyle = isNearby ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(sx - textWidth / 2 - 8, labelY - 14, textWidth + 16, 22, 6);
        } else {
          ctx.rect(sx - textWidth / 2 - 8, labelY - 14, textWidth + 16, 22);
        }
        ctx.fill();
        ctx.strokeStyle = isNearby ? '#60a5fa' : '#3b82f6';
        ctx.lineWidth = isNearby ? 1.5 : 1;
        ctx.stroke();

        ctx.fillStyle = isNearby ? '#fbbf24' : '#93c5fd';
        ctx.fillText(`🌀 ${portal.label}`, sx, labelY);

        if (isNearby) {
          ctx.font = 'bold 10px sans-serif';
          ctx.fillStyle = '#6ee7b7';
          ctx.fillText('⚡ [点击或靠近 立即传送]', sx, labelY + 14);
        }

        ctx.restore();
      });

      // 3.5 Draw Map Obstacles
      if (map.obstacles && map.obstacles.length > 0) {
        map.obstacles.forEach(obs => {
          const { sx, sy } = toScreen(obs.x + (obs.width || 1) / 2 - 0.5, obs.y + (obs.height || 1) / 2 - 0.5);

          // Skip if way off screen
          if (sx < -150 || sx > width + 150 || sy < -150 || sy > height + 150) return;

          ctx.save();

          if (obs.type === 'tree') {
            // Shadow
            ctx.beginPath();
            ctx.ellipse(sx, sy, 24, 12, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fill();

            // Trunk
            const trunkGrad = ctx.createLinearGradient(sx - 6, 0, sx + 6, 0);
            trunkGrad.addColorStop(0, '#451a03');
            trunkGrad.addColorStop(0.5, '#78350f');
            trunkGrad.addColorStop(1, '#27272a');
            ctx.fillStyle = trunkGrad;
            ctx.beginPath();
            ctx.moveTo(sx - 5, sy);
            ctx.lineTo(sx - 3, sy - 35);
            ctx.lineTo(sx + 3, sy - 35);
            ctx.lineTo(sx + 5, sy);
            ctx.closePath();
            ctx.fill();

            // Leaf Canopy
            const sway = Math.sin(now * 0.002 + obs.x) * 2;
            const treeTopY = sy - 35;

            ctx.beginPath();
            ctx.arc(sx + sway, treeTopY - 10, 24, 0, Math.PI * 2);
            ctx.fillStyle = map.theme === 'snake_valley' ? '#047857' : '#15803d';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(sx - 6 + sway, treeTopY - 20, 18, 0, Math.PI * 2);
            ctx.fillStyle = map.theme === 'snake_valley' ? '#10b981' : '#22c55e';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(sx + 4 + sway, treeTopY - 28, 12, 0, Math.PI * 2);
            ctx.fillStyle = '#86efac';
            ctx.fill();

          } else if (obs.type === 'rock') {
            // Shadow
            ctx.beginPath();
            ctx.ellipse(sx, sy, 22, 11, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fill();

            // Rock facets
            ctx.beginPath();
            ctx.moveTo(sx - 18, sy);
            ctx.lineTo(sx - 10, sy - 20);
            ctx.lineTo(sx + 6, sy - 24);
            ctx.lineTo(sx + 18, sy - 10);
            ctx.lineTo(sx + 14, sy + 2);
            ctx.lineTo(sx - 12, sy + 4);
            ctx.closePath();

            const rockGrad = ctx.createLinearGradient(sx - 18, sy - 24, sx + 18, sy + 4);
            rockGrad.addColorStop(0, '#64748b');
            rockGrad.addColorStop(0.6, '#334155');
            rockGrad.addColorStop(1, '#1e293b');
            ctx.fillStyle = rockGrad;
            ctx.fill();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Moss / detail
            ctx.beginPath();
            ctx.arc(sx - 2, sy - 14, 6, 0, Math.PI * 2);
            ctx.fillStyle = map.theme === 'snake_valley' ? '#059669' : '#475569';
            ctx.fill();

          } else if (obs.type === 'wall') {
            const wWidth = 32 * (obs.width || 1);
            const wHeight = 28;

            ctx.beginPath();
            ctx.rect(sx - wWidth / 2, sy - wHeight, wWidth, wHeight);
            const wallGrad = ctx.createLinearGradient(sx - wWidth / 2, 0, sx + wWidth / 2, 0);
            wallGrad.addColorStop(0, '#334155');
            wallGrad.addColorStop(0.5, '#475569');
            wallGrad.addColorStop(1, '#1e293b');
            ctx.fillStyle = wallGrad;
            ctx.fill();
            ctx.strokeStyle = '#a1a1aa';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#64748b';
            ctx.fillRect(sx - wWidth / 2, sy - wHeight - 4, wWidth, 4);

          } else if (obs.type === 'pillar') {
            ctx.beginPath();
            ctx.ellipse(sx, sy, 16, 8, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fill();

            const pGrad = ctx.createLinearGradient(sx - 10, 0, sx + 10, 0);
            pGrad.addColorStop(0, '#52525b');
            pGrad.addColorStop(0.3, '#a1a1aa');
            pGrad.addColorStop(0.8, '#d4d4d8');
            pGrad.addColorStop(1, '#3f3f46');

            ctx.fillStyle = pGrad;
            ctx.fillRect(sx - 10, sy - 44, 20, 44);

            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(sx - 13, sy - 48, 26, 6);
            ctx.fillRect(sx - 12, sy - 4, 24, 4);

          } else if (obs.type === 'statue') {
            ctx.beginPath();
            ctx.ellipse(sx, sy, 20, 10, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fill();

            ctx.fillStyle = '#3f3f46';
            ctx.fillRect(sx - 14, sy - 12, 28, 12);
            ctx.strokeStyle = '#d4d4d8';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx - 14, sy - 12, 28, 12);

            ctx.fillStyle = '#71717a';
            ctx.beginPath();
            ctx.arc(sx, sy - 26, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(sx - 3, sy - 28, 2, 0, Math.PI * 2);
            ctx.arc(sx + 3, sy - 28, 2, 0, Math.PI * 2);
            ctx.fill();

          } else if (obs.type === 'crystal') {
            ctx.beginPath();
            ctx.ellipse(sx, sy, 20, 10, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(185, 28, 28, 0.4)';
            ctx.fill();

            for (let i = -2; i <= 2; i++) {
              const spikeH = 26 + Math.abs(i) * -4;
              const spikeX = sx + i * 7;
              ctx.beginPath();
              ctx.moveTo(spikeX - 4, sy);
              ctx.lineTo(spikeX, sy - spikeH);
              ctx.lineTo(spikeX + 4, sy);
              ctx.closePath();

              const cGrad = ctx.createLinearGradient(spikeX - 4, 0, spikeX + 4, 0);
              cGrad.addColorStop(0, '#991b1b');
              cGrad.addColorStop(0.5, '#ef4444');
              cGrad.addColorStop(1, '#fca5a5');
              ctx.fillStyle = cGrad;
              ctx.fill();
            }

          } else if (obs.type === 'ruins') {
            ctx.beginPath();
            ctx.ellipse(sx, sy, 22, 12, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fill();

            ctx.fillStyle = '#27272a';
            ctx.fillRect(sx - 18, sy - 16, 36, 16);
            ctx.strokeStyle = '#71717a';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(sx - 18, sy - 16, 36, 16);

            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('💀', sx, sy - 4);
          }

          if (obs.label) {
            ctx.font = '10px sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.textAlign = 'center';
            ctx.fillText(obs.label, sx, sy + 14);
          }

          ctx.restore();
        });
      }

      // 3.6 Draw Occupying Guild Flags (占领行会旗帜)
      if (map.guildTerritory && map.guildTerritory.flagPoles) {
        const sabakGuild = engine.sabakInfo?.guildName || '兄弟会';

        map.guildTerritory.flagPoles.forEach(fp => {
          const { sx, sy } = toScreen(fp.x, fp.y);
          if (sx < -120 || sx > width + 120 || sy < -120 || sy > height + 120) return;

          const distToPlayer = Math.hypot(fp.x - playerX, fp.y - playerY);
          const isClose = distToPlayer <= 4;
          const isMain = fp.isMainFlag;

          ctx.save();

          // A. Ground Shadow & Base Pedestal
          ctx.beginPath();
          ctx.ellipse(sx, sy + 3, isMain ? 24 : 18, isMain ? 12 : 9, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.fill();

          const baseW = isMain ? 22 : 16;
          const baseH = isMain ? 14 : 10;
          const pGrad = ctx.createLinearGradient(sx - baseW / 2, 0, sx + baseW / 2, 0);
          pGrad.addColorStop(0, '#78350f');
          pGrad.addColorStop(0.5, '#f59e0b');
          pGrad.addColorStop(1, '#451a03');

          ctx.fillStyle = pGrad;
          ctx.fillRect(sx - baseW / 2, sy - baseH, baseW, baseH);
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sx - baseW / 2, sy - baseH, baseW, baseH);

          // B. Metallic Flag Pole
          const poleH = isMain ? 110 : 85;
          const poleY = sy - baseH;
          const topY = poleY - poleH;

          const poleGrad = ctx.createLinearGradient(sx - 3, 0, sx + 3, 0);
          poleGrad.addColorStop(0, '#d97706');
          poleGrad.addColorStop(0.5, '#fef08a');
          poleGrad.addColorStop(1, '#78350f');

          ctx.fillStyle = poleGrad;
          ctx.fillRect(sx - 2.5, topY, 5, poleH);

          // Spearhead / Trident Top Ornament
          ctx.beginPath();
          ctx.moveTo(sx, topY - 14);
          ctx.lineTo(sx - 6, topY);
          ctx.lineTo(sx + 6, topY);
          ctx.closePath();
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 10;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(sx, topY - 3, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();

          // C. Dynamic Waving Banner Cloth
          const bannerW = isMain ? 58 : 42;
          const bannerH = isMain ? 40 : 30;
          const bannerTopY = topY + 6;

          const wave1 = Math.sin(now * 0.0035 + fp.x * 2) * 8;
          const wave2 = Math.cos(now * 0.0045 + fp.y * 2) * 6;

          ctx.beginPath();
          ctx.moveTo(sx, bannerTopY);
          ctx.quadraticCurveTo(sx + bannerW * 0.5, bannerTopY + wave1, sx + bannerW, bannerTopY + wave2 * 0.5);
          ctx.lineTo(sx + bannerW, bannerTopY + bannerH + wave2 * 0.5);
          ctx.quadraticCurveTo(sx + bannerW * 0.5, bannerTopY + bannerH + wave1, sx, bannerTopY + bannerH);
          ctx.closePath();

          const clothGrad = ctx.createLinearGradient(sx, bannerTopY, sx + bannerW, bannerTopY + bannerH);
          clothGrad.addColorStop(0, '#dc2626');
          clothGrad.addColorStop(0.6, '#991b1b');
          clothGrad.addColorStop(1, '#7f1d1d');

          ctx.fillStyle = clothGrad;
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = isMain ? 15 : 8;
          ctx.fill();

          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // Tassels / Fringe along bottom edge
          ctx.beginPath();
          for (let tx = 0; tx <= bannerW; tx += 6) {
            const ty = bannerTopY + bannerH + Math.sin(now * 0.0035 + (sx + tx) * 0.1) * 4;
            ctx.moveTo(sx + tx, ty);
            ctx.lineTo(sx + tx, ty + 6);
          }
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // D. Calligraphy Text on Flag Cloth
          ctx.font = isMain ? 'bold 12px sans-serif' : 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 4;

          const labelX = sx + bannerW * 0.5 + wave1 * 0.3;
          const labelY = bannerTopY + bannerH * 0.5;

          ctx.fillText(sabakGuild, labelX, labelY);

          // E. Floating Flag Title Badge
          const tagY = topY - 26;
          ctx.font = 'bold 11px sans-serif';
          const tagText = isMain ? `👑 霸主主旗: 《${sabakGuild}》` : `🚩 ${fp.label}`;
          const tw = ctx.measureText(tagText).width;

          ctx.beginPath();
          if (typeof (ctx as any).roundRect === 'function') {
            (ctx as any).roundRect(sx - tw / 2 - 8, tagY - 12, tw + 16, 20, 5);
          } else {
            ctx.rect(sx - tw / 2 - 8, tagY - 12, tw + 16, 20);
          }
          ctx.fillStyle = isClose ? 'rgba(120, 53, 15, 0.95)' : 'rgba(15, 23, 42, 0.85)';
          ctx.fill();
          ctx.strokeStyle = isClose ? '#fef08a' : '#f59e0b';
          ctx.lineWidth = isClose ? 2 : 1;
          ctx.stroke();

          ctx.fillStyle = isClose ? '#ffffff' : '#fde047';
          ctx.fillText(tagText, sx, tagY);

          // F. Proximity Victory Sparkles
          if (isClose) {
            for (let s = 0; s < 4; s++) {
              const spTime = (now * 0.002 + s * 1.5) % (Math.PI * 2);
              const spX = sx + Math.cos(spTime) * 20;
              const spY = topY + Math.sin(spTime * 2) * 15;

              ctx.beginPath();
              ctx.arc(spX, spY, 2.5, 0, Math.PI * 2);
              ctx.fillStyle = '#fef08a';
              ctx.shadowColor = '#fbbf24';
              ctx.shadowBlur = 8;
              ctx.fill();
            }
          }

          ctx.restore();
        });
      }

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

        // Expiring drop fade/flicker effect in final 10 seconds (50s - 60s)
        if (elapsed > 50000) {
          const blink = (Math.floor(now / 180) % 2 === 0) ? 0.35 : 0.9;
          ctx.globalAlpha = blink;
        }

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
        const shadowRadius = Math.max(0, 14 * (1 - arcZ / 80));
        ctx.ellipse(groundSx, groundSy, shadowRadius, shadowRadius * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.1, 0.5 - arcZ / 100)})`;
        ctx.fill();

        // B. Ground Ripple Impact when landing
        if (elapsed >= animDuration && elapsed < animDuration + 300) {
          const impactProgress = (elapsed - animDuration) / 300;
          ctx.beginPath();
          ctx.ellipse(groundSx, groundSy, Math.max(0, 20 * impactProgress), Math.max(0, 10 * impactProgress), 0, 0, Math.PI * 2);
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
          ctx.ellipse(groundSx, groundSy, Math.max(0, (tileWidth / 2.2) * (0.85 + pulse)), Math.max(0, (tileHeight / 2.2) * (0.85 + pulse)), 0, 0, Math.PI * 2);
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

        // D. High-End 2D Creature Visual Sprite Renderer
        const entityCenterY = sy - (m.isBoss ? 26 : 16) + bobY;
        const mName = m.name;
        const typeKey = m.templateId || (
          mName.includes('鸡') ? 'chicken' :
          mName.includes('鹿') ? 'deer' :
          mName.includes('猫') ? 'hook_cat' :
          mName.includes('蛇') ? 'snake' :
          (mName.includes('骷髅') || mName.includes('尸') || mName.includes('僵')) ? 'skeleton_warrior' :
          (mName.includes('白野猪') || mName.includes('猪')) ? 'white_boar' :
          mName.includes('沃玛') ? 'woma_leader' :
          mName.includes('祖玛') ? 'zuma_leader' :
          mName.includes('赤月') ? 'red_moon_demon' :
          (mName.includes('卫') || mName.includes('禁卫')) ? 'sabak_guard' :
          (mName.includes('稻草') ? 'scarecrow' : 'default')
        );

        ctx.save();

        // Check recent attack lunge (shift monster slightly towards player when attacking)
        let lungeX = 0;
        let lungeY = 0;
        if (now - m.lastAtkTime < 220) {
          const lungeAngle = Math.atan2(engine.character.y - m.y, engine.character.x - m.x);
          lungeX = Math.cos(lungeAngle) * 8;
          lungeY = Math.sin(lungeAngle) * 8;
        }

        const renderX = sx + lungeX;
        const renderY = entityCenterY + lungeY;

        switch (typeKey) {
          case 'chicken': {
            // 小野鸡 - Plump feather body, comb, beak, fluttering wings
            const wingAngle = Math.sin(now * 0.015) * 0.25;
            
            // Tail Feathers
            ctx.fillStyle = '#d97706';
            ctx.beginPath();
            ctx.moveTo(renderX - 8, renderY - 4);
            ctx.lineTo(renderX - 16, renderY - 14);
            ctx.lineTo(renderX - 10, renderY - 18);
            ctx.lineTo(renderX - 4, renderY - 8);
            ctx.fill();

            // Plump Yellow Body
            ctx.beginPath();
            ctx.arc(renderX, renderY - 4, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#fef08a';
            ctx.fill();
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Head
            ctx.beginPath();
            ctx.arc(renderX + 6, renderY - 12, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#fef08a';
            ctx.fill();
            ctx.stroke();

            // Red Comb on Top
            ctx.beginPath();
            ctx.arc(renderX + 6, renderY - 18, 3, 0, Math.PI * 2);
            ctx.arc(renderX + 4, renderY - 17, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ef4444';
            ctx.fill();

            // Beak
            ctx.beginPath();
            ctx.moveTo(renderX + 11, renderY - 12);
            ctx.lineTo(renderX + 17, renderY - 10);
            ctx.lineTo(renderX + 11, renderY - 8);
            ctx.fillStyle = '#f97316';
            ctx.fill();

            // Eye
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(renderX + 8, renderY - 13, 1.2, 0, Math.PI * 2);
            ctx.fill();

            // Fluttering Wing
            ctx.save();
            ctx.translate(renderX - 2, renderY - 6);
            ctx.rotate(wingAngle);
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.ellipse(0, 0, 7, 4, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ca8a04';
            ctx.stroke();
            ctx.restore();

            // Legs
            ctx.strokeStyle = '#ea580c';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(renderX - 3, renderY + 5);
            ctx.lineTo(renderX - 3, renderY + 11);
            ctx.moveTo(renderX + 3, renderY + 5);
            ctx.lineTo(renderX + 3, renderY + 11);
            ctx.stroke();
            break;
          }

          case 'deer': {
            // 野生温顺鹿 - Graceful brown body, white spots, antlers
            // Body
            ctx.beginPath();
            ctx.ellipse(renderX, renderY - 2, 14, 9, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#d97706';
            ctx.fill();
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // White Spots on Back
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(renderX - 4, renderY - 6, 1.5, 0, Math.PI * 2);
            ctx.arc(renderX + 2, renderY - 7, 1.5, 0, Math.PI * 2);
            ctx.arc(renderX + 6, renderY - 5, 1.2, 0, Math.PI * 2);
            ctx.fill();

            // Neck & Head
            ctx.beginPath();
            ctx.moveTo(renderX + 8, renderY - 4);
            ctx.lineTo(renderX + 12, renderY - 18);
            ctx.lineTo(renderX + 18, renderY - 16);
            ctx.lineTo(renderX + 12, renderY - 2);
            ctx.fillStyle = '#d97706';
            ctx.fill();

            // Head
            ctx.beginPath();
            ctx.ellipse(renderX + 14, renderY - 18, 5, 3.5, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Antlers
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(renderX + 13, renderY - 21);
            ctx.lineTo(renderX + 11, renderY - 30);
            ctx.lineTo(renderX + 7, renderY - 33);
            ctx.moveTo(renderX + 11, renderY - 27);
            ctx.lineTo(renderX + 16, renderY - 32);

            ctx.moveTo(renderX + 15, renderY - 21);
            ctx.lineTo(renderX + 17, renderY - 31);
            ctx.lineTo(renderX + 22, renderY - 34);
            ctx.stroke();

            // Black Nose & Eye
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(renderX + 18, renderY - 18, 1.5, 1.5);
            ctx.arc(renderX + 14, renderY - 19, 1, 0, Math.PI * 2);
            ctx.fill();

            // Legs
            ctx.strokeStyle = '#92400e';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(renderX - 8, renderY + 6); ctx.lineTo(renderX - 8, renderY + 14);
            ctx.moveTo(renderX - 2, renderY + 6); ctx.lineTo(renderX - 2, renderY + 14);
            ctx.moveTo(renderX + 4, renderY + 6); ctx.lineTo(renderX + 4, renderY + 14);
            ctx.moveTo(renderX + 10, renderY + 6); ctx.lineTo(renderX + 10, renderY + 14);
            ctx.stroke();
            break;
          }

          case 'hook_cat': {
            // 毒蛇猫 - Agile feline, sharp hook claws, glowing eyes, venom aura
            // Venom Toxic Foot Aura
            ctx.save();
            ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.ellipse(renderX, renderY + 8, 16, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Feline Body
            ctx.beginPath();
            ctx.ellipse(renderX, renderY - 2, 12, 8, -0.1, 0, Math.PI * 2);
            ctx.fillStyle = '#22c55e';
            ctx.fill();
            ctx.strokeStyle = '#15803d';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Cat Tail
            const tailAngle = Math.sin(now * 0.008) * 0.3;
            ctx.beginPath();
            ctx.moveTo(renderX - 11, renderY - 4);
            ctx.quadraticCurveTo(renderX - 20, renderY - 14 + tailAngle * 10, renderX - 16, renderY - 20);
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Cat Head
            ctx.beginPath();
            ctx.arc(renderX + 10, renderY - 8, 6.5, 0, Math.PI * 2);
            ctx.fillStyle = '#22c55e';
            ctx.fill();
            ctx.stroke();

            // Pointed Ears
            ctx.fillStyle = '#15803d';
            ctx.beginPath();
            ctx.moveTo(renderX + 7, renderY - 13);
            ctx.lineTo(renderX + 5, renderY - 20);
            ctx.lineTo(renderX + 10, renderY - 14);
            ctx.moveTo(renderX + 11, renderY - 13);
            ctx.lineTo(renderX + 13, renderY - 20);
            ctx.lineTo(renderX + 15, renderY - 13);
            ctx.fill();

            // Glowing Slit Eye
            ctx.fillStyle = '#fef08a';
            ctx.shadowColor = '#86efac';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.ellipse(renderX + 12, renderY - 9, 2, 1, 0, 0, Math.PI * 2);
            ctx.fill();

            // Metallic Hook Claws on Front Paws
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(renderX + 10, renderY + 4);
            ctx.lineTo(renderX + 16, renderY + 8);
            ctx.lineTo(renderX + 14, renderY + 11);
            ctx.stroke();
            break;
          }

          case 'skeleton_warrior': {
            // 骷髅死士 - Ribs, skull with green spectral eyes, bone blade, shield
            // Ribcage & Torso
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(renderX - 5, renderY - 10, 10, 14);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.strokeRect(renderX - 5, renderY - 10, 10, 14);

            // Rib lines
            ctx.strokeStyle = '#64748b';
            ctx.beginPath();
            ctx.moveTo(renderX - 4, renderY - 7); ctx.lineTo(renderX + 4, renderY - 7);
            ctx.moveTo(renderX - 4, renderY - 4); ctx.lineTo(renderX + 4, renderY - 4);
            ctx.moveTo(renderX - 4, renderY - 1); ctx.lineTo(renderX + 4, renderY - 1);
            ctx.stroke();

            // Skull
            ctx.beginPath();
            ctx.arc(renderX, renderY - 17, 6.5, 0, Math.PI * 2);
            ctx.fillStyle = '#f8fafc';
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.stroke();

            // Glowing Green Spectral Eyes
            ctx.fillStyle = '#10b981';
            ctx.shadowColor = '#34d399';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(renderX - 2.2, renderY - 18, 1.5, 0, Math.PI * 2);
            ctx.arc(renderX + 2.2, renderY - 18, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Bone Sword in Hand
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(renderX + 8, renderY - 18, 3, 20);
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(renderX + 6, renderY - 8, 7, 2.5);

            // Round Iron Shield in Offhand
            ctx.beginPath();
            ctx.arc(renderX - 8, renderY - 3, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#475569';
            ctx.fill();
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            break;
          }

          case 'white_boar': {
            // 【精英】白野猪 - Massive pink/white boar, giant curved ivory tusks, spiked iron mace
            // Elite Aura Ring
            ctx.save();
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.ellipse(renderX, renderY + 10, 22, 10, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Heavy Torso
            ctx.beginPath();
            ctx.ellipse(renderX, renderY - 4, 18, 13, 0, 0, Math.PI * 2);
            const boarGrad = ctx.createLinearGradient(renderX - 18, renderY - 10, renderX + 18, renderY + 10);
            boarGrad.addColorStop(0, '#fce7f3');
            boarGrad.addColorStop(1, '#f472b6');
            ctx.fillStyle = boarGrad;
            ctx.fill();
            ctx.strokeStyle = '#db2777';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Boar Head & Snout
            ctx.beginPath();
            ctx.arc(renderX + 14, renderY - 6, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#fce7f3';
            ctx.fill();
            ctx.stroke();

            // Snout
            ctx.beginPath();
            ctx.ellipse(renderX + 21, renderY - 5, 4, 3, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#f472b6';
            ctx.fill();

            // Giant Curved White Ivory Tusks
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#fef08a';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(renderX + 18, renderY - 2);
            ctx.quadraticCurveTo(renderX + 26, renderY - 12, renderX + 22, renderY - 16);
            ctx.stroke();

            // Wild Red Eye
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(renderX + 15, renderY - 8, 1.8, 0, Math.PI * 2);
            ctx.fill();

            // Spiked Iron Mace
            ctx.save();
            ctx.translate(renderX + 10, renderY - 22);
            ctx.rotate(0.3);
            ctx.fillStyle = '#334155';
            ctx.fillRect(-3, -16, 6, 22);
            // Spikes on club
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(-6, -14, 12, 2.5);
            ctx.fillRect(-6, -8, 12, 2.5);
            ctx.restore();
            break;
          }

          case 'woma_leader': {
            // 【Boss】沃玛教主 - Purple bat wings, horned demon body, lightning scepter
            // Bat Wings
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(renderX - 32, renderY - 6);
            ctx.quadraticCurveTo(renderX - 48, renderY - 28, renderX - 22, renderY - 34);
            ctx.quadraticCurveTo(renderX - 16, renderY - 16, renderX - 10, renderY - 10);
            ctx.moveTo(renderX + 32, renderY - 6);
            ctx.quadraticCurveTo(renderX + 48, renderY - 28, renderX + 22, renderY - 34);
            ctx.quadraticCurveTo(renderX + 16, renderY - 16, renderX + 10, renderY - 10);
            ctx.fillStyle = '#6b21a8';
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();

            // Demon Body
            ctx.beginPath();
            ctx.moveTo(renderX - 14, renderY - 12);
            ctx.lineTo(renderX + 14, renderY - 12);
            ctx.lineTo(renderX + 10, renderY + 12);
            ctx.lineTo(renderX - 10, renderY + 12);
            ctx.closePath();
            ctx.fillStyle = '#3b0764';
            ctx.fill();
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Horned Head
            ctx.beginPath();
            ctx.arc(renderX, renderY - 20, 9, 0, Math.PI * 2);
            ctx.fillStyle = '#2e1065';
            ctx.fill();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 4 Demon Horns
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.moveTo(renderX - 6, renderY - 24); ctx.lineTo(renderX - 16, renderY - 36); ctx.lineTo(renderX - 3, renderY - 26);
            ctx.moveTo(renderX + 6, renderY - 24); ctx.lineTo(renderX + 16, renderY - 36); ctx.lineTo(renderX + 3, renderY - 26);
            ctx.fill();

            // Burning Crimson Eyes
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#dc2626';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(renderX - 3, renderY - 20, 2, 0, Math.PI * 2);
            ctx.arc(renderX + 3, renderY - 20, 2, 0, Math.PI * 2);
            ctx.fill();

            // Lightning Scepter
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(renderX + 18, renderY + 10);
            ctx.lineTo(renderX + 18, renderY - 28);
            ctx.stroke();

            // Floating Lightning Orb
            ctx.fillStyle = '#e879f9';
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(renderX + 18, renderY - 32, 5, 0, Math.PI * 2);
            ctx.fill();
            break;
          }

          case 'zuma_leader': {
            // 【Boss】祖玛教主 - Ancient stone Golem idol, magma runes, floating rocks
            // Floating Orbiting Stone Debris
            const orbit = now * 0.003;
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.arc(renderX + Math.cos(orbit) * 26, renderY + Math.sin(orbit) * 12, 4, 0, Math.PI * 2);
            ctx.arc(renderX + Math.cos(orbit + Math.PI) * 26, renderY + Math.sin(orbit + Math.PI) * 12, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // Heavy Stone Body
            ctx.beginPath();
            ctx.moveTo(renderX - 16, renderY - 14);
            ctx.lineTo(renderX + 16, renderY - 14);
            ctx.lineTo(renderX + 12, renderY + 14);
            ctx.lineTo(renderX - 12, renderY + 14);
            ctx.closePath();
            ctx.fillStyle = '#292524';
            ctx.fill();
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ea580c';
            ctx.shadowBlur = 10;
            ctx.stroke();

            // Magma Crack Runes on Body
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(renderX - 6, renderY - 8); ctx.lineTo(renderX, renderY); ctx.lineTo(renderX + 8, renderY + 6);
            ctx.stroke();

            // Ancient Stone Face
            ctx.beginPath();
            ctx.arc(renderX, renderY - 22, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#1c1917';
            ctx.fill();
            ctx.strokeStyle = '#dc2626';
            ctx.stroke();

            // Visor Red Eyes
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#dc2626';
            ctx.shadowBlur = 12;
            ctx.fillRect(renderX - 6, renderY - 23, 12, 3);
            break;
          }

          case 'red_moon_demon': {
            // 【世界Boss】赤月恶魔 - Eldritch blood core, 6 writhing tentacles, multiple eyes
            // Writhing Blood Tentacles
            ctx.save();
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#dc2626';
            ctx.shadowBlur = 10;
            for (let i = 0; i < 6; i++) {
              const angle = (i * Math.PI) / 3 + Math.sin(now * 0.005 + i) * 0.2;
              const tx = renderX + Math.cos(angle) * 32;
              const ty = renderY + Math.sin(angle) * 24;
              ctx.beginPath();
              ctx.moveTo(renderX, renderY - 6);
              ctx.quadraticCurveTo(renderX + Math.cos(angle) * 16, renderY + Math.sin(angle) * 12, tx, ty);
              ctx.stroke();
            }
            ctx.restore();

            // Pulsating Core
            const corePulse = Math.sin(now * 0.006) * 2;
            ctx.beginPath();
            ctx.arc(renderX, renderY - 6, 16 + corePulse, 0, Math.PI * 2);
            const redGrad = ctx.createRadialGradient(renderX, renderY - 6, 2, renderX, renderY - 6, 18);
            redGrad.addColorStop(0, '#f87171');
            redGrad.addColorStop(0.5, '#dc2626');
            redGrad.addColorStop(1, '#450a0a');
            ctx.fillStyle = redGrad;
            ctx.fill();
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Multiple Glowing Eyes
            ctx.fillStyle = '#fef08a';
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(renderX - 6, renderY - 10, 2.5, 0, Math.PI * 2);
            ctx.arc(renderX + 6, renderY - 10, 2.5, 0, Math.PI * 2);
            ctx.arc(renderX, renderY - 4, 3, 0, Math.PI * 2);
            ctx.arc(renderX - 8, renderY - 2, 2, 0, Math.PI * 2);
            ctx.arc(renderX + 8, renderY - 2, 2, 0, Math.PI * 2);
            ctx.fill();
            break;
          }

          case 'sabak_guard': {
            // 【沙城守卫】帝国禁卫军 - Golden full plate armor, red plume helmet, halberd spear
            // Red Royal Cape
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.moveTo(renderX - 8, renderY - 8);
            ctx.lineTo(renderX - 16, renderY + 12);
            ctx.lineTo(renderX + 16, renderY + 12);
            ctx.lineTo(renderX + 8, renderY - 8);
            ctx.fill();

            // Golden Plate Torso
            ctx.beginPath();
            ctx.moveTo(renderX - 10, renderY - 10);
            ctx.lineTo(renderX + 10, renderY - 10);
            ctx.lineTo(renderX + 8, renderY + 10);
            ctx.lineTo(renderX - 8, renderY + 10);
            ctx.closePath();
            ctx.fillStyle = '#eab308';
            ctx.fill();
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Helmet
            ctx.beginPath();
            ctx.arc(renderX, renderY - 16, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#ca8a04';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            // Red Helmet Plume
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(renderX, renderY - 23);
            ctx.quadraticCurveTo(renderX - 8, renderY - 28, renderX - 12, renderY - 22);
            ctx.lineTo(renderX, renderY - 20);
            ctx.fill();

            // Halberd Spear
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(renderX + 12, renderY + 14);
            ctx.lineTo(renderX + 12, renderY - 28);
            ctx.stroke();

            // Spear Blade
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.moveTo(renderX + 12, renderY - 34);
            ctx.lineTo(renderX + 9, renderY - 28);
            ctx.lineTo(renderX + 15, renderY - 28);
            ctx.fill();
            break;
          }

          case 'snake': {
            // 毒蛇 - Coiling green viper with red tongue and glowing eyes
            ctx.beginPath();
            ctx.moveTo(renderX - 10, renderY + 4);
            ctx.quadraticCurveTo(renderX - 12, renderY - 4, renderX - 4, renderY - 6);
            ctx.quadraticCurveTo(renderX + 6, renderY - 8, renderX + 10, renderY - 2);
            ctx.quadraticCurveTo(renderX + 12, renderY + 6, renderX, renderY + 8);
            ctx.quadraticCurveTo(renderX - 8, renderY + 8, renderX + 4, renderY + 2);
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 4.5;
            ctx.stroke();

            // Snake Head
            ctx.beginPath();
            ctx.ellipse(renderX + 10, renderY - 6, 4.5, 3, 0.4, 0, Math.PI * 2);
            ctx.fillStyle = '#22c55e';
            ctx.fill();
            ctx.strokeStyle = '#15803d';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Red Forked Tongue
            const tongueFlick = Math.sin(now * 0.012) * 2;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(renderX + 13, renderY - 5);
            ctx.lineTo(renderX + 18, renderY - 5 + tongueFlick);
            ctx.lineTo(renderX + 21, renderY - 7 + tongueFlick);
            ctx.moveTo(renderX + 18, renderY - 5 + tongueFlick);
            ctx.lineTo(renderX + 21, renderY - 3 + tongueFlick);
            ctx.stroke();

            // Yellow Glowing Eye
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(renderX + 11, renderY - 7, 1.2, 0, Math.PI * 2);
            ctx.fill();
            break;
          }

          case 'scarecrow': {
            // 稻草人 - Straw body, hat, wooden cross arms
            ctx.fillStyle = '#854d0e';
            ctx.fillRect(renderX - 2, renderY - 14, 4, 24);
            ctx.fillRect(renderX - 12, renderY - 8, 24, 3);

            // Straw Hat
            ctx.beginPath();
            ctx.moveTo(renderX, renderY - 24);
            ctx.lineTo(renderX - 12, renderY - 12);
            ctx.lineTo(renderX + 12, renderY - 12);
            ctx.fillStyle = '#ca8a04';
            ctx.fill();

            // Glowing Eyes
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(renderX - 3, renderY - 10, 2, 2);
            ctx.fillRect(renderX + 1, renderY - 10, 2, 2);
            break;
          }

          default: {
            // General Refined Monster Silhouette
            const mColor = m.color || '#3b82f6';
            ctx.beginPath();
            ctx.moveTo(renderX - 10, renderY - 10);
            ctx.lineTo(renderX + 10, renderY - 10);
            ctx.lineTo(renderX + 8, renderY + 10);
            ctx.lineTo(renderX - 8, renderY + 10);
            ctx.closePath();
            ctx.fillStyle = mColor;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(renderX, renderY - 15, 6.5, 0, Math.PI * 2);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
            ctx.strokeStyle = mColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#fef08a';
            ctx.fillRect(renderX - 8, renderY - 20, 3, 6);
            ctx.fillRect(renderX + 5, renderY - 20, 3, 6);
            break;
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
        ctx.ellipse(px, py + 2, Math.max(0, baseRadius + mPulse), Math.max(0, (baseRadius + mPulse) / 2), 0, 0, Math.PI * 2);
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
          ctx.ellipse(px, py + 2, Math.max(0, baseRadius - 10 + mPulse), Math.max(0, (baseRadius - 10 + mPulse) / 2), 0, 0, Math.PI * 2);
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

      // D. Full Humanoid Character Body, Armor & Weapon Layer (使用全新的热血战术姿态、男女形象与装备渲染引擎 + 骑乘专属动作帧)
      drawCharacterAvatar({
        ctx,
        px,
        py,
        playerCenterY,
        character: engine.character,
        now,
        isMoving: distToPlayer > 0.02,
        isMounted
      });

      // E. Name Tag & Guild Name (简化头顶信息，仅显示名称与行会名称)
      let titleOffset = playerCenterY - 28;

      if (engine.character.guildName) {
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#7dd3fc';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 6;
        ctx.fillText(`<${engine.character.guildName}>`, px, titleOffset);
        titleOffset -= 14;
      }

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 8;
      ctx.fillText(engine.character.name, px, titleOffset);

      ctx.restore();

      // 8. Draw Floating Particles, Combat Visual Effects (VFX) & Damage Numbers
      engine.particles.forEach(p => {
        const { sx: baseSx, sy: baseSy } = toScreen(p.x, p.y);
        const elapsed = now - p.startTime;
        const progress = Math.min(1, elapsed / p.durationMs);

        // Alpha fade out near end
        const alpha = Math.max(0, 1 - Math.pow(progress, 1.4));

        if (p.vfxKind) {
          // --- 2D VISUAL COMBAT EFFECTS ENGINE ---
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - Math.pow(progress, 1.6));

          switch (p.vfxKind) {
            case 'slash': {
              // Standard Physical Melee Sword Slash
              const angle = p.angle || 0;
              ctx.translate(baseSx, baseSy - 10);
              ctx.rotate(angle);

              const radius = 30 + progress * 14;
              ctx.beginPath();
              ctx.arc(0, 0, radius, -Math.PI * 0.45, Math.PI * 0.45, false);
              ctx.lineWidth = 5 * (1 - progress);
              ctx.shadowColor = '#fbbf24';
              ctx.shadowBlur = 12;

              const slashGrad = ctx.createLinearGradient(-radius, 0, radius, 0);
              slashGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
              slashGrad.addColorStop(0.5, '#ffffff');
              slashGrad.addColorStop(1, '#f59e0b');
              ctx.strokeStyle = slashGrad;
              ctx.stroke();

              // Sparkles
              for (let i = 0; i < 4; i++) {
                const sparkAng = (i - 1.5) * 0.35 + angle;
                const sparkDist = 12 + progress * 32;
                const spx = Math.cos(sparkAng) * sparkDist;
                const spy = Math.sin(sparkAng) * sparkDist;
                ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#fbbf24';
                ctx.fillRect(spx, spy, 3, 3);
              }
              break;
            }

            case 'fire_sword': {
              // Flaming Sword Burst (烈火剑法)
              const angle = p.angle || 0;
              ctx.translate(baseSx, baseSy - 12);

              // 1. Fiery Blade Arc
              ctx.save();
              ctx.rotate(angle);
              const arcRad = 36 + progress * 22;
              ctx.beginPath();
              ctx.arc(0, 0, arcRad, -Math.PI * 0.5, Math.PI * 0.5, false);
              ctx.lineWidth = 14 * (1 - progress * 0.7);
              ctx.shadowColor = '#ea580c';
              ctx.shadowBlur = 24;

              const fireGrad = ctx.createLinearGradient(-arcRad, 0, arcRad, 0);
              fireGrad.addColorStop(0, '#fef08a');
              fireGrad.addColorStop(0.4, '#f97316');
              fireGrad.addColorStop(1, '#dc2626');
              ctx.strokeStyle = fireGrad;
              ctx.stroke();
              ctx.restore();

              // 2. Erupting Flame Pillar
              const flameH = Math.max(0, (1 - Math.pow(progress, 0.5)) * 55);
              ctx.beginPath();
              ctx.ellipse(0, -flameH / 2, Math.max(0, 18 * (1 - progress * 0.5)), flameH, 0, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 20;
              ctx.fill();

              // Flame Embers
              for (let i = 0; i < 7; i++) {
                const eProgress = (progress + i * 0.14) % 1;
                const ex = (Math.sin(i * 3 + now * 0.01) * 20) * (1 - eProgress);
                const ey = -eProgress * 50;
                ctx.fillStyle = i % 2 === 0 ? '#fef08a' : '#f97316';
                ctx.beginPath();
                ctx.arc(ex, ey, (1 - eProgress) * 3.5 + 1, 0, Math.PI * 2);
                ctx.fill();
              }
              break;
            }

            case 'crescent': {
              // Crescent Moon Energy Wave (半月弯刀)
              const waveRadius = Math.max(0, (p.radius || 2.2) * tileWidth * progress);
              ctx.translate(baseSx, baseSy);

              ctx.beginPath();
              ctx.ellipse(0, 0, waveRadius, waveRadius * 0.5, 0, 0, Math.PI * 2);
              ctx.lineWidth = 8 * (1 - progress);
              ctx.shadowColor = '#38bdf8';
              ctx.shadowBlur = 18;

              const cGrad = ctx.createRadialGradient(0, 0, waveRadius * 0.3, 0, 0, waveRadius);
              cGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
              cGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.8)');
              cGrad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
              ctx.strokeStyle = cGrad;
              ctx.stroke();
              break;
            }

            case 'thunder': {
              // Sky Lightning Strike (狂龙紫电 / 疾光电影)
              const startY = baseSy - 210;
              ctx.shadowColor = '#a855f7';
              ctx.shadowBlur = 25;

              ctx.beginPath();
              let currX = baseSx + (Math.sin(now * 0.05) * 12);
              ctx.moveTo(currX, startY);

              const steps = 7;
              for (let i = 1; i <= steps; i++) {
                const nextY = startY + (i / steps) * 210;
                const nextX = baseSx + (i === steps ? 0 : (Math.sin(i * 2.5 + now * 0.02) * 26));
                ctx.lineTo(nextX, nextY);
              }

              ctx.lineWidth = 7 * (1 - progress * 0.5);
              ctx.strokeStyle = progress < 0.3 ? '#ffffff' : '#c084fc';
              ctx.stroke();

              ctx.lineWidth = 2.5;
              ctx.strokeStyle = '#ffffff';
              ctx.stroke();

              // Impact Flash Ring
              const impactR = Math.max(0, 32 * progress);
              ctx.beginPath();
              ctx.ellipse(baseSx, baseSy, impactR, impactR * 0.5, 0, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(168, 85, 247, ${0.4 * (1 - progress)})`;
              ctx.fill();
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 3;
              ctx.stroke();
              break;
            }

            case 'ice_storm': {
              // Blizzard Ice Tornado (冰咆哮)
              ctx.translate(baseSx, baseSy);
              const iceRadius = Math.max(0, (p.radius || 2.5) * tileWidth * 0.5);

              ctx.beginPath();
              ctx.ellipse(0, 0, Math.max(0, iceRadius * (0.5 + progress * 0.5)), Math.max(0, iceRadius * 0.5 * (0.5 + progress * 0.5)), 0, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(56, 189, 248, ${0.25 * (1 - progress)})`;
              ctx.shadowColor = '#0284c7';
              ctx.shadowBlur = 18;
              ctx.fill();

              // Swirling Ice Shards
              for (let i = 0; i < 7; i++) {
                const rotAng = now * 0.008 + (i * Math.PI * 2) / 7;
                const distR = iceRadius * (0.3 + progress * 0.7);
                const ix = Math.cos(rotAng) * distR;
                const iy = Math.sin(rotAng) * distR * 0.5 - (progress * 18);

                ctx.save();
                ctx.translate(ix, iy);
                ctx.rotate(rotAng * 2);

                ctx.beginPath();
                ctx.moveTo(0, -7);
                ctx.lineTo(3.5, 0);
                ctx.lineTo(0, 7);
                ctx.lineTo(-3.5, 0);
                ctx.closePath();
                ctx.fillStyle = i % 2 === 0 ? '#e0f2fe' : '#38bdf8';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
              }
              break;
            }

            case 'poison': {
              // Toxic Mist Cloud (施毒术)
              ctx.translate(baseSx, baseSy);

              const poisonR = Math.max(0, 24 + Math.sin(now * 0.006) * 5);
              ctx.beginPath();
              ctx.ellipse(0, 0, poisonR, poisonR * 0.5, 0, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(34, 197, 94, ${0.35 * (1 - progress)})`;
              ctx.shadowColor = '#16a34a';
              ctx.shadowBlur = 16;
              ctx.fill();

              for (let i = 0; i < 5; i++) {
                const bx = (Math.sin(i * 2 + now * 0.005) * 16);
                const by = (Math.cos(i * 3 + now * 0.007) * 8) - (progress * 10);
                ctx.fillStyle = i % 2 === 0 ? '#22c55e' : '#a855f7';
                ctx.beginPath();
                ctx.arc(bx, by, 3 + (i % 3), 0, Math.PI * 2);
                ctx.fill();
              }
              break;
            }

            case 'heal_beam': {
              // Divine Holy Light Column (治愈术)
              const beamH = 170;
              ctx.translate(baseSx, baseSy);

              const beamGrad = ctx.createLinearGradient(0, -beamH, 0, 0);
              beamGrad.addColorStop(0, 'rgba(52, 211, 153, 0)');
              beamGrad.addColorStop(0.5, 'rgba(52, 211, 153, 0.45)');
              beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0.9)');

              ctx.beginPath();
              ctx.rect(-16, -beamH, 32, beamH);
              ctx.fillStyle = beamGrad;
              ctx.shadowColor = '#34d399';
              ctx.shadowBlur = 20;
              ctx.fill();

              ctx.beginPath();
              ctx.ellipse(0, 0, 22, 11, 0, 0, Math.PI * 2);
              ctx.strokeStyle = '#fef08a';
              ctx.lineWidth = 3;
              ctx.stroke();

              for (let i = 0; i < 5; i++) {
                const hProgress = (progress + i * 0.18) % 1;
                const hx = (Math.sin(i * 2 + now * 0.008) * 12);
                const hy = -hProgress * beamH;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(hx, hy, 2.5, 0, Math.PI * 2);
                ctx.fill();
              }
              break;
            }

            case 'talisman': {
              // Flying Taoist Paper Talisman (灵魂火符)
              const startX = p.startX !== undefined ? p.startX : p.x - 2;
              const startY = p.startY !== undefined ? p.startY : p.y - 2;
              const { sx: ssx, sy: ssy } = toScreen(startX, startY);

              const curSx = ssx + (baseSx - ssx) * progress;
              const arcH = Math.sin(progress * Math.PI) * 40;
              const curSy = ssy + (baseSy - ssy) * progress - arcH;

              ctx.translate(curSx, curSy);

              if (progress < 0.75) {
                ctx.rotate(progress * Math.PI * 2);
                ctx.fillStyle = '#fef08a';
                ctx.fillRect(-5, -9, 10, 18);
                ctx.strokeStyle = '#dc2626';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(-5, -9, 10, 18);

                ctx.fillStyle = '#dc2626';
                ctx.fillRect(-1.5, -5, 3, 10);

                ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
                ctx.beginPath();
                ctx.arc(-7, 0, 5, 0, Math.PI * 2);
                ctx.fill();
              } else {
                const burstR = Math.max(0, (progress - 0.75) * 4 * 30);
                ctx.beginPath();
                ctx.arc(0, 0, burstR, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 18;
                ctx.fill();
              }
              break;
            }

            case 'shield': {
              // Magic Barrier Shell (魔法盾)
              ctx.translate(baseSx, baseSy - 18);
              const pulseR = Math.max(0, 25 + Math.sin(now * 0.01) * 3);

              ctx.beginPath();
              ctx.ellipse(0, 0, pulseR, pulseR * 0.8, 0, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 2.5;
              ctx.shadowColor = '#38bdf8';
              ctx.shadowBlur = 16;
              ctx.fill();
              ctx.stroke();
              break;
            }

            case 'claw': {
              // Monster Claw Scratch Attack
              ctx.translate(baseSx, baseSy - 10);
              const angle = p.angle || 0;
              ctx.rotate(angle);

              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 3.5;
              ctx.shadowColor = '#dc2626';
              ctx.shadowBlur = 12;

              for (let i = -1; i <= 1; i++) {
                const offsetY = i * 7;
                const slashLen = 20 * (1 - progress);
                ctx.beginPath();
                ctx.moveTo(-slashLen, offsetY - 7);
                ctx.lineTo(slashLen, offsetY + 7);
                ctx.stroke();
              }
              break;
            }

            case 'boss_smash': {
              // Boss Ground Smash Shockwave
              ctx.translate(baseSx, baseSy);
              const shockR = Math.max(0, (p.radius || 2.8) * tileWidth * 0.5 * progress);

              ctx.beginPath();
              ctx.ellipse(0, 0, shockR, shockR * 0.5, 0, 0, Math.PI * 2);
              ctx.lineWidth = 9 * (1 - progress);
              ctx.strokeStyle = '#dc2626';
              ctx.shadowColor = '#f97316';
              ctx.shadowBlur = 24;
              ctx.stroke();

              for (let i = 0; i < 6; i++) {
                const cAng = (i * Math.PI * 2) / 6;
                const cx = Math.cos(cAng) * shockR;
                const cy = Math.sin(cAng) * shockR * 0.5;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(cx, cy);
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 2;
                ctx.stroke();
              }
              break;
            }

            case 'death': {
              // Monster Death Soul Ascension
              ctx.translate(baseSx, baseSy);
              for (let i = 0; i < 5; i++) {
                const sProgress = (progress + i * 0.16) % 1;
                const sxPos = Math.sin(i * 2 + now * 0.005) * 15;
                const syPos = -sProgress * 40;
                ctx.fillStyle = i % 2 === 0 ? '#fbbf24' : '#c084fc';
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(sxPos, syPos, (1 - sProgress) * 3 + 1, 0, Math.PI * 2);
                ctx.fill();
              }
              break;
            }

            case 'spark_burst': {
              // Critical Hit Starburst
              ctx.translate(baseSx, baseSy);
              for (let i = 0; i < 8; i++) {
                const sAng = (i * Math.PI * 2) / 8;
                const sDist = progress * 28;
                const spx = Math.cos(sAng) * sDist;
                const spy = Math.sin(sAng) * sDist * 0.6;
                ctx.fillStyle = '#fffbeb';
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 12;
                ctx.fillRect(spx - 2, spy - 2, 4, 4);
              }
              break;
            }

            case 'hit_warrior': {
              // 战士专属打击特效：烈火光影 (Fiery Cross Blade Light, Erupting Embers, Radiant Flame Shockwave)
              ctx.translate(baseSx, baseSy - 10);

              // 1. Double Fiery Blade Light Cross Slashes
              ctx.save();
              for (let s = 0; s < 2; s++) {
                ctx.rotate(s === 0 ? Math.PI * 0.25 : -Math.PI * 0.25);
                const slashRad = 26 + progress * 22;

                ctx.beginPath();
                ctx.arc(0, 0, slashRad, -Math.PI * 0.38, Math.PI * 0.38, false);
                ctx.lineWidth = 11 * (1 - progress * 0.75);
                ctx.shadowColor = '#ea580c';
                ctx.shadowBlur = 22;

                const fireGrad = ctx.createLinearGradient(-slashRad, 0, slashRad, 0);
                fireGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
                fireGrad.addColorStop(0.3, '#fef08a');
                fireGrad.addColorStop(0.7, '#f97316');
                fireGrad.addColorStop(1, '#dc2626');

                ctx.strokeStyle = fireGrad;
                ctx.stroke();
              }
              ctx.restore();

              // 2. Fiery Erupting Impact Shockwave Ring
              const ringR = Math.max(0, 20 + progress * 32);
              ctx.beginPath();
              ctx.ellipse(0, 0, ringR, ringR * 0.5, 0, 0, Math.PI * 2);
              ctx.lineWidth = 4 * (1 - progress);
              ctx.strokeStyle = '#f59e0b';
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 18;
              ctx.stroke();

              // 3. Erupting Flame Embers
              for (let i = 0; i < 8; i++) {
                const ang = (i * Math.PI * 2) / 8 + progress * 0.6;
                const dist = (12 + progress * 38);
                const ex = Math.cos(ang) * dist;
                const ey = Math.sin(ang) * dist * 0.55 - (progress * 18);

                ctx.beginPath();
                ctx.arc(ex, ey, Math.max(0, (1 - progress) * 4.5 + 1), 0, Math.PI * 2);
                ctx.fillStyle = i % 2 === 0 ? '#fef08a' : '#f97316';
                ctx.shadowColor = '#f43f5e';
                ctx.shadowBlur = 12;
                ctx.fill();
              }

              // 4. Intense Center Fire Burst Core
              ctx.beginPath();
              ctx.arc(0, 0, Math.max(0, (1 - progress) * 15), 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
              ctx.shadowColor = '#fbbf24';
              ctx.shadowBlur = 18;
              ctx.fill();

              break;
            }

            case 'hit_mage': {
              // 法师专属打击特效：元素波纹 (Concentric Elemental Ripple Waves & Arcane Starbursts)
              ctx.translate(baseSx, baseSy - 8);

              // 1. Triple Concentric Elemental Ripple Waves
              for (let r = 0; r < 3; r++) {
                const delay = r * 0.12;
                const rProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
                if (rProgress <= 0) continue;

                const waveRadius = rProgress * (34 + r * 12);
                ctx.beginPath();
                ctx.ellipse(0, 0, waveRadius, waveRadius * 0.5, 0, 0, Math.PI * 2);
                ctx.lineWidth = Math.max(1, (1 - rProgress) * 6.5);

                const rGrad = ctx.createRadialGradient(0, 0, waveRadius * 0.2, 0, 0, waveRadius);
                if (r === 0) {
                  rGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
                  rGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.75)');
                  rGrad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
                  ctx.shadowColor = '#38bdf8';
                } else if (r === 1) {
                  rGrad.addColorStop(0, 'rgba(168, 85, 247, 0)');
                  rGrad.addColorStop(0.7, 'rgba(168, 85, 247, 0.75)');
                  rGrad.addColorStop(1, 'rgba(250, 204, 21, 0.9)');
                  ctx.shadowColor = '#a855f7';
                } else {
                  rGrad.addColorStop(0, 'rgba(14, 165, 233, 0)');
                  rGrad.addColorStop(0.7, 'rgba(14, 165, 233, 0.65)');
                  rGrad.addColorStop(1, 'rgba(56, 189, 248, 0.85)');
                  ctx.shadowColor = '#0284c7';
                }

                ctx.strokeStyle = rGrad;
                ctx.shadowBlur = 18;
                ctx.stroke();
              }

              // 2. Swirling Arcane Star Sparks
              for (let i = 0; i < 8; i++) {
                const rotAng = (i * Math.PI * 2) / 8 + now * 0.008;
                const orbitR = 14 + progress * 34;
                const sx = Math.cos(rotAng) * orbitR;
                const sy = Math.sin(rotAng) * orbitR * 0.5 - (progress * 14);

                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(rotAng);
                ctx.fillStyle = i % 3 === 0 ? '#e0f2fe' : i % 3 === 1 ? '#e9d5ff' : '#fef08a';
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 12;

                // 4-point star shape
                ctx.beginPath();
                ctx.moveTo(0, -6);
                ctx.lineTo(1.8, -1.8);
                ctx.lineTo(6, 0);
                ctx.lineTo(1.8, 1.8);
                ctx.lineTo(0, 6);
                ctx.lineTo(-1.8, 1.8);
                ctx.lineTo(-6, 0);
                ctx.lineTo(-1.8, -1.8);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
              }

              // 3. Arcane Elemental Core Flash
              ctx.beginPath();
              ctx.arc(0, 0, Math.max(0, (1 - progress) * 13), 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
              ctx.shadowColor = '#a855f7';
              ctx.shadowBlur = 18;
              ctx.fill();

              break;
            }

            case 'hit_taoist': {
              // 道士专属打击特效：符咒闪烁 (Paper Talismans, Taoist Bagua Floor Seal & Spiritual Runes)
              ctx.translate(baseSx, baseSy - 10);

              // 1. Taoist Spiritual Bagua / Yin-Yang Floor Seal Ring
              const sealR = 22 + progress * 18;
              ctx.save();
              ctx.beginPath();
              ctx.ellipse(0, 0, sealR, sealR * 0.5, 0, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(34, 197, 94, ${0.28 * (1 - progress)})`;
              ctx.shadowColor = '#10b981';
              ctx.shadowBlur = 18;
              ctx.fill();

              ctx.strokeStyle = 'rgba(254, 240, 138, 0.9)';
              ctx.lineWidth = 1.8;
              ctx.setLineDash([6, 4]);
              ctx.stroke();
              ctx.restore();

              // 2. Flying Paper Talismans Flashing & Swirling Outwards
              for (let i = 0; i < 4; i++) {
                const tAng = (i * Math.PI * 0.5) + (progress * Math.PI * 1.3);
                const tDist = 12 + progress * 34;
                const tx = Math.cos(tAng) * tDist;
                const ty = Math.sin(tAng) * tDist * 0.5 - (progress * 24);

                ctx.save();
                ctx.translate(tx, ty);
                ctx.rotate(tAng + progress * Math.PI);

                // Yellow Paper Talisman Tag
                ctx.fillStyle = '#fde047';
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = 14;
                ctx.fillRect(-5, -9, 10, 18);

                // Red Cinnabar Seal Border & Line (朱砂符文)
                ctx.strokeStyle = '#dc2626';
                ctx.lineWidth = 1.2;
                ctx.strokeRect(-5, -9, 10, 18);
                ctx.beginPath();
                ctx.moveTo(0, -6);
                ctx.lineTo(0, 6);
                ctx.stroke();

                // Mystic Spiritual Aura Spark
                ctx.fillStyle = '#22c55e';
                ctx.beginPath();
                ctx.arc(0, -10, 3.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
              }

              // 3. Spiritual Energy Rune Sparkles
              for (let i = 0; i < 6; i++) {
                const sProgress = (progress + i * 0.16) % 1;
                const rx = (Math.sin(i * 2 + now * 0.006) * 20);
                const ry = -sProgress * 38;
                ctx.fillStyle = i % 2 === 0 ? '#86efac' : '#fef08a';
                ctx.shadowColor = '#22c55e';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(rx, ry, (1 - sProgress) * 3.5 + 1, 0, Math.PI * 2);
                ctx.fill();
              }

              // 4. White & Emerald Holy Flash Impact Core
              ctx.beginPath();
              ctx.arc(0, 0, Math.max(0, (1 - progress) * 12), 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
              ctx.shadowColor = '#10b981';
              ctx.shadowBlur = 22;
              ctx.fill();

              break;
            }
          }

          ctx.restore();
          return;
        }

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

      // 6.4. Draw Quest Navigation Path Line, Target Beacon & Guidance Arrow
      if (engine.questNavTarget && engine.questNavTarget.mapId === engine.currentMapId) {
        const nav = engine.questNavTarget;
        const { sx: targetSx, sy: targetSy } = toScreen(nav.targetX, nav.targetY);

        ctx.save();

        // A. Dynamic Glowing Animated Path Line connecting Player to Target
        ctx.beginPath();
        ctx.moveTo(px, py);

        // Smooth curve midway for isometric depth
        const midX = (px + targetSx) / 2;
        const midY = (py + targetSy) / 2 - 12;
        ctx.quadraticCurveTo(midX, midY, targetSx, targetSy);

        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -now * 0.05;
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#f59e0b'; // Gold Path Line
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 15;
        ctx.stroke();

        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -now * 0.08;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fef08a';
        ctx.stroke();
        ctx.setLineDash([]);

        // B. Flowing Energy Pulse Dots Along Path
        const pathDist = Math.hypot(targetSx - px, targetSy - py);
        const particleCount = Math.max(3, Math.min(10, Math.floor(pathDist / 50)));
        for (let i = 0; i < particleCount; i++) {
          const progress = ((now * 0.0008 + i / particleCount) % 1);
          const curX = px + (targetSx - px) * progress;
          const curY = py + (targetSy - py) * progress;
          ctx.beginPath();
          ctx.arc(curX, curY, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 10;
          ctx.fill();
        }

        // C. Target Ground Beacon Ring & Vertical Crimson Pillar
        const ringRadius = Math.max(0, 22 + Math.sin(now * 0.008) * 5);
        ctx.beginPath();
        ctx.ellipse(targetSx, targetSy, ringRadius, ringRadius * 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 18;
        ctx.stroke();

        // Light Pillar Beam
        const beamGrad = ctx.createLinearGradient(targetSx, targetSy, targetSx, targetSy - 75);
        beamGrad.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
        beamGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.25)');
        beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(targetSx - 14, targetSy - 75, 28, 75);

        // Target Pin Badge
        const pinBobY = Math.sin(now * 0.006) * 5;
        const pinY = targetSy - 70 + pinBobY;

        ctx.beginPath();
        ctx.arc(targetSx, pinY, 13, 0, Math.PI * 2);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🎯', targetSx, pinY);

        // Target Text Banner
        const labelText = `🎯 任务目标: ${nav.targetName}`;
        ctx.font = 'bold 12px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.textAlign = 'center';
        const textWidth = ctx.measureText(labelText).width;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(targetSx - textWidth / 2 - 8, pinY - 26, textWidth + 16, 20);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.strokeRect(targetSx - textWidth / 2 - 8, pinY - 26, textWidth + 16, 20);

        ctx.fillStyle = '#fef08a';
        ctx.fillText(labelText, targetSx, pinY - 16);

        // D. Guidance Direction Arrow HUD Badge (Clamped to Screen Border or Near Player)
        const distInTiles = Math.round(Math.hypot(nav.targetX - playerX, nav.targetY - playerY));
        const angle = Math.atan2(targetSy - py, targetSx - px);
        const margin = 55;
        const isOffscreen = targetSx < margin || targetSx > width - margin || targetSy < margin || targetSy > height - margin;

        let arrowX = targetSx;
        let arrowY = targetSy;

        if (isOffscreen) {
          arrowX = Math.max(margin, Math.min(width - margin, targetSx));
          arrowY = Math.max(margin, Math.min(height - margin, targetSy));
        } else {
          arrowX = px + Math.cos(angle) * 65;
          arrowY = py + Math.sin(angle) * 65;
        }

        ctx.translate(arrowX, arrowY);

        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.stroke();

        ctx.save();
        ctx.rotate(angle);
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-7, -6);
        ctx.lineTo(-3, 0);
        ctx.lineTo(-7, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.font = '900 10px sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.fillText(`${distInTiles}米`, 0, isOffscreen ? 28 : -26);

        ctx.restore();
      }

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
          const waveRadius = Math.max(0, 75 + Math.min(30, combo * 0.6));
          ctx.beginPath();
          ctx.ellipse(0, 0, waveRadius, waveRadius * 0.38, 0, 0, Math.PI * 2);
          ctx.fillStyle = `${glowColor}22`;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 24 + (isFreshHit ? 16 : 0);
          ctx.fill();

          // Shockwave Expanding Ring on Fresh Hit
          if (isFreshHit) {
            const shockRadius = Math.max(0, (1 - timeElapsed / 220) * (waveRadius + 32));
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
          ctx.ellipse(p.x, p.y, Math.max(0, p.size * 2.8), Math.max(0, p.size), 0, 0, Math.PI * 2);
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

      // Check Proximity to Territory Bounds to Trigger Floating Banner on Foot Entry
      if (map.guildTerritory) {
        const bounds = map.guildTerritory.bounds;
        const isInside = playerX >= bounds.minX && playerX <= bounds.maxX && playerY >= bounds.minY && playerY <= bounds.maxY;
        if (isInside && !wasInsideTerritoryRef.current) {
          engine.triggerTerritoryBanner();
        }
        wasInsideTerritoryRef.current = isInside;
      } else {
        wasInsideTerritoryRef.current = false;
      }

      // 8. Draw Sabak Battlefield Glassmorphism Floating Top Status Banner (漂浮动画, 7秒后滑出隐藏)
      if (map.guildTerritory) {
        const bannerAge = now - (engine.territoryBannerTime || 0);
        const bannerDuration = 7000; // 7 seconds total duration

        if (bannerAge >= 0 && bannerAge < bannerDuration) {
          const sabakGuild = engine.sabakInfo?.guildName || '兄弟会';
          const sabakLeader = engine.sabakInfo?.leaderName || '霸天战神';

          // Slide & Fade Animation
          let bannerY = 22;
          let alpha = 1.0;

          if (bannerAge < 800) {
            // Slide down & Fade in
            const t = bannerAge / 800;
            const easeOut = 1 - Math.pow(1 - t, 3);
            bannerY = -50 + easeOut * 72;
            alpha = Math.min(1, t * 1.5);
          } else if (bannerAge > 5600) {
            // Slide up & Fade out
            const t = (bannerAge - 5600) / 1400;
            const easeIn = Math.pow(t, 2);
            bannerY = 22 - easeIn * 70;
            alpha = Math.max(0, 1 - t);
          } else {
            // Floating bounce
            const floatOffset = Math.sin((bannerAge - 800) * 0.003) * 2;
            bannerY = 22 + floatOffset;
            alpha = 1.0;
          }

          ctx.save();
          ctx.globalAlpha = alpha;

          const titlePart = `👑 【${map.guildTerritory.name}】`;
          const infoPart = `霸主行会: 《${sabakGuild}》 · 城主大天尊: ${sabakLeader}`;
          const bannerText = `${titlePart}   ${infoPart}`;

          ctx.font = 'bold 12px "Plus Jakarta Sans", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const textWidth = ctx.measureText(bannerText).width;
          const paddingX = 22;
          const bannerWidth = textWidth + paddingX * 2;
          const bannerHeight = 32;
          const centerX = width / 2;
          const bx = centerX - bannerWidth / 2;
          const by = bannerY;

          // A. Soft Golden Glow & Glassmorphism Container
          ctx.beginPath();
          if (typeof (ctx as any).roundRect === 'function') {
            (ctx as any).roundRect(bx, by, bannerWidth, bannerHeight, 16);
          } else {
            ctx.rect(bx, by, bannerWidth, bannerHeight);
          }

          const glassGrad = ctx.createLinearGradient(bx, by, bx + bannerWidth, by + bannerHeight);
          glassGrad.addColorStop(0, 'rgba(15, 23, 42, 0.88)');
          glassGrad.addColorStop(0.5, 'rgba(45, 26, 14, 0.86)');
          glassGrad.addColorStop(1, 'rgba(15, 23, 42, 0.88)');

          ctx.fillStyle = glassGrad;
          ctx.shadowColor = 'rgba(245, 158, 11, 0.55)';
          ctx.shadowBlur = 18;
          ctx.fill();

          // Frosted Glass Reflection Border
          const glassReflect = ctx.createLinearGradient(bx, by, bx + bannerWidth, by + bannerHeight);
          glassReflect.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
          glassReflect.addColorStop(0.5, 'rgba(245, 158, 11, 0.6)');
          glassReflect.addColorStop(1, 'rgba(254, 240, 138, 0.9)');

          ctx.strokeStyle = glassReflect;
          ctx.lineWidth = 1.6;
          ctx.stroke();

          // Animated Metallic Glass Sheen Streak
          if (bannerAge >= 400 && bannerAge <= 5800) {
            const sheenProgress = ((now % 2200) / 2200);
            const sheenX = bx - 30 + sheenProgress * (bannerWidth + 60);

            ctx.save();
            ctx.clip();
            ctx.beginPath();
            ctx.moveTo(sheenX, by - 10);
            ctx.lineTo(sheenX + 22, by - 10);
            ctx.lineTo(sheenX - 10, by + bannerHeight + 10);
            ctx.lineTo(sheenX - 32, by + bannerHeight + 10);
            ctx.closePath();

            const sheenGrad = ctx.createLinearGradient(sheenX - 20, by, sheenX + 15, by);
            sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            sheenGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.38)');
            sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = sheenGrad;
            ctx.fill();
            ctx.restore();
          }

          // Gold Accent Side Jewels
          ctx.beginPath();
          ctx.arc(bx + 10, by + bannerHeight / 2, 3, 0, Math.PI * 2);
          ctx.arc(bx + bannerWidth - 10, by + bannerHeight / 2, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 8;
          ctx.fill();

          // High Contrast Gold Typography
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = '#d97706';
          ctx.shadowBlur = 8;
          ctx.fillText(bannerText, centerX, by + bannerHeight / 2);

          ctx.restore();
        }
      }

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

    const camX = cameraPosRef.current ? cameraPosRef.current.x : engine.character.x;
    const camY = cameraPosRef.current ? cameraPosRef.current.y : engine.character.y;
    const tileWidth = 60;
    const tileHeight = 30;

    const camIsoX = (camX - camY) * (tileWidth / 2);
    const camIsoY = (camX + camY) * (tileHeight / 2);

    // Check if clicked a monster
    for (const m of engine.monsters) {
      if (m.hp <= 0) continue;
      const isoX = (m.x - m.y) * (tileWidth / 2);
      const isoY = (m.x + m.y) * (tileHeight / 2);

      const msx = screenCenterX + (isoX - camIsoX);
      const msy = screenCenterY + (isoY - camIsoY);

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

    const targetIsoX = camIsoX + dx;
    const targetIsoY = camIsoY + dy;

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
