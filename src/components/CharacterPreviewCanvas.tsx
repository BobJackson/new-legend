import React, { useEffect, useRef } from 'react';
import { CharacterData, EquipmentSlot, Item } from '../types/game';

interface CharacterPreviewCanvasProps {
  character: CharacterData;
  hoveredItem?: Item | null;
  width?: number;
  height?: number;
  className?: string;
}

export const CharacterPreviewCanvas: React.FC<CharacterPreviewCanvasProps> = ({
  character,
  hoveredItem,
  width = 240,
  height = 280,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine effective equipment to display (override slot if hoveredItem is equipment)
    const previewEquipment = { ...character.equipment };
    let isPreviewing = false;

    if (hoveredItem && hoveredItem.slot) {
      previewEquipment[hoveredItem.slot] = hoveredItem;
      isPreviewing = true;
    }

    const render = () => {
      const now = Date.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Canvas Background Pedestal & Ambient Glow
      const cx = canvas.width / 2;
      const cy = canvas.height / 2 + 30;

      // Pedestal Ring
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy + 20, 65, 30, 0, 0, Math.PI * 2);
      const bgGrad = ctx.createRadialGradient(cx, cy + 20, 5, cx, cy + 20, 65);
      bgGrad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
      bgGrad.addColorStop(0.6, 'rgba(30, 41, 59, 0.6)');
      bgGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fill();

      // Rotating Pedestal Runes
      const pRot = (now * 0.001) % (Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(cx, cy + 20, 55, 25, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isPreviewing ? 'rgba(245, 158, 11, 0.8)' : 'rgba(100, 116, 139, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = isPreviewing ? '#f59e0b' : '#3b82f6';
      ctx.shadowBlur = isPreviewing ? 15 : 6;
      ctx.stroke();

      for (let i = 0; i < 4; i++) {
        const prAngle = pRot + (i * Math.PI) / 2;
        const px = cx + Math.cos(prAngle) * 55;
        const py = cy + 20 + Math.sin(prAngle) * 25;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isPreviewing ? '#fef08a' : '#94a3b8';
        ctx.fill();
      }

      // Character Center & Breathing Bob
      const prof = character.profession;
      const charBobY = Math.sin(now * 0.0035) * 3;
      const playerCenterY = cy - 25 + charBobY;
      const px = cx;
      const py = cy + 18;

      // A. Ground Shadow
      ctx.beginPath();
      ctx.ellipse(px, py, 26, 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fill();

      // B. Profession Ground Aura Ring
      if (prof === 'warrior') {
        const wRot = (now * 0.002) % (Math.PI * 2);
        ctx.beginPath();
        ctx.ellipse(px, py, 32, 16, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 12;
        ctx.stroke();

        for (let i = 0; i < 3; i++) {
          const fa = wRot + (i * Math.PI * 2) / 3;
          const fx = px + Math.cos(fa) * 32;
          const fy = py + Math.sin(fa) * 16;
          ctx.beginPath();
          ctx.arc(fx, fy, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = '#ea580c';
          ctx.shadowBlur = 8;
          ctx.fill();
        }
      } else if (prof === 'mage') {
        ctx.beginPath();
        ctx.arc(px, playerCenterY, 30, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 12;
        ctx.stroke();

        for (let i = 0; i < 3; i++) {
          const cAngle = (now * 0.003) + (i * Math.PI * 2) / 3;
          const cxPos = px + Math.cos(cAngle) * 30;
          const cyPos = playerCenterY + Math.sin(cAngle) * 15;
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#93c5fd';
          ctx.shadowBlur = 8;
          ctx.fillText('💠', cxPos, cyPos);
        }
      } else {
        const tRot = (now * 0.0015) % (Math.PI * 2);
        ctx.beginPath();
        ctx.ellipse(px, py, 34, 17, 0, 0, Math.PI * 2);
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
        const yx = px + Math.cos(tRot) * 34;
        const yy = py + Math.sin(tRot) * 17;
        ctx.fillText('☯️', yx, yy);
      }

      // C. Wing System
      const wingLvl = character.wingLevel || 0;
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
        ctx.quadraticCurveTo(-28, -34, -46, -16);
        ctx.quadraticCurveTo(-30, 0, 0, 10);
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
        ctx.quadraticCurveTo(28, -34, 46, -16);
        ctx.quadraticCurveTo(30, 0, 0, 10);
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

      // D. Full Body Figure & Armor
      const armorItem = previewEquipment.armor;
      const helmetItem = previewEquipment.helmet;
      const weaponItem = previewEquipment.weapon;

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

      // Boots / Legs
      ctx.fillStyle = armorColorSecondary;
      ctx.fillRect(px - 7, playerCenterY + 8, 5, 12);
      ctx.fillRect(px + 2, playerCenterY + 8, 5, 12);

      ctx.fillStyle = armorTrimColor;
      ctx.fillRect(px - 8, playerCenterY + 16, 6, 4);
      ctx.fillRect(px + 2, playerCenterY + 16, 6, 4);

      // Torso / Robe / Chestplate
      ctx.beginPath();
      if (prof === 'mage' || prof === 'taoist') {
        ctx.moveTo(px - 9, playerCenterY - 10);
        ctx.lineTo(px + 9, playerCenterY - 10);
        ctx.lineTo(px + 12, playerCenterY + 14);
        ctx.lineTo(px - 12, playerCenterY + 14);
      } else {
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

      ctx.strokeStyle = armorTrimColor;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = armorGlowColor;
      ctx.shadowBlur = 6;
      ctx.stroke();

      // Belt
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(px - 9, playerCenterY + 2, 18, 3.5);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(px - 3, playerCenterY + 1, 6, 5.5);

      // Shoulder Pauldrons
      ctx.beginPath();
      ctx.arc(px - 12, playerCenterY - 8, 5.5, 0, Math.PI * 2);
      ctx.arc(px + 12, playerCenterY - 8, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = armorTrimColor;
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (armorItem && (armorItem.rarity === 'epic' || armorItem.rarity === 'legendary' || armorItem.rarity === 'mythic')) {
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

      // Head, Hair & Helmet
      const headY = playerCenterY - 20;

      if (helmetItem) {
        ctx.beginPath();
        ctx.arc(px, headY, 8, 0, Math.PI * 2);
        ctx.fillStyle = armorColorPrimary;
        ctx.fill();
        ctx.strokeStyle = armorTrimColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(px, headY - 11);
        ctx.lineTo(px - 4, headY - 6);
        ctx.lineTo(px + 4, headY - 6);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(px, headY, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fde047';
        ctx.fill();

        if (prof === 'warrior') {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(px - 7, headY - 4, 14, 3);
          ctx.beginPath();
          ctx.arc(px, headY - 3, 7, Math.PI, Math.PI * 2);
          ctx.fillStyle = '#1e293b';
          ctx.fill();
        } else if (prof === 'mage') {
          ctx.beginPath();
          ctx.arc(px, headY - 1, 8.5, Math.PI * 0.8, Math.PI * 2.2);
          ctx.fillStyle = '#312e81';
          ctx.fill();
          ctx.strokeStyle = '#a5b4fc';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(px, headY - 7, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#064e3b';
          ctx.fill();
          ctx.fillStyle = '#34d399';
          ctx.fillRect(px - 6, headY - 7, 12, 1.5);
        }
      }

      // Handheld Weapon
      const weaponX = px + 16;
      const weaponY = playerCenterY - 6;

      ctx.save();
      ctx.translate(weaponX, weaponY);

      if (prof === 'warrior') {
        ctx.rotate(-0.4);
        const wName = weaponItem?.name || '';
        const isDragonSlayer = wName.includes('屠龙') || wName.includes('裁决') || wName.includes('怒斩') || weaponItem?.rarity === 'legendary' || weaponItem?.rarity === 'mythic';

        if (isDragonSlayer) {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-3, -28, 7, 26);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(-1, -26, 3, 22);
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(-6, -4, 13, 5);

          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 15;
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          ctx.strokeRect(-4, -29, 9, 28);
        } else {
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(-2, -22, 4, 20);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(-4, -3, 9, 3);
        }

        ctx.font = '10px sans-serif';
        ctx.fillText('✨', -2, -28);

      } else if (prof === 'mage') {
        ctx.rotate(-0.15);
        const mName = weaponItem?.name || '';
        const isBoneJade = mName.includes('骨玉') || mName.includes('嗜魂') || mName.includes('镇天') || weaponItem?.rarity === 'legendary' || weaponItem?.rarity === 'mythic';

        ctx.fillStyle = isBoneJade ? '#f8fafc' : '#78350f';
        ctx.fillRect(-1.5, -30, 3, 34);

        ctx.beginPath();
        ctx.arc(0, -32, isBoneJade ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = isBoneJade ? '#a855f7' : '#38bdf8';
        ctx.shadowColor = isBoneJade ? '#c084fc' : '#60a5fa';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        const orbAngle = now * 0.006;
        const ox = Math.cos(orbAngle) * 9;
        const oy = -32 + Math.sin(orbAngle) * 5;
        ctx.beginPath();
        ctx.arc(ox, oy, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.fill();

      } else {
        ctx.rotate(-0.25);
        const tName = weaponItem?.name || '';
        const isFan = tName.includes('扇') || tName.includes('逍遥');

        if (isFan) {
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
          ctx.fillStyle = '#34d399';
          ctx.fillRect(-1.5, -24, 3, 22);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-4, -3, 9, 3);
          ctx.shadowColor = '#6ee7b7';
          ctx.shadowBlur = 10;
        }

        const charmY = -18 + Math.sin(now * 0.005) * 4;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(8, charmY, 5, 9);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(9.5, charmY + 2, 2, 5);
      }

      ctx.restore(); // Restore weapon
      ctx.restore(); // Restore character

      ctx.restore(); // Restore root canvas transform

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [character, hoveredItem]);

  return (
    <div className={`relative flex flex-col items-center justify-center bg-slate-950/90 rounded-2xl border border-amber-900/50 p-2 shadow-inner ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
      />

      {/* Hover Preview Indicator Badge */}
      {hoveredItem && hoveredItem.slot ? (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-amber-950/90 border border-amber-400 text-amber-200 text-[10px] font-black shadow-lg flex items-center gap-1 animate-pulse z-10 whitespace-nowrap">
          <span>🔮 实时预览:</span>
          <span className="text-white underline decoration-amber-400">{hoveredItem.name}</span>
        </div>
      ) : (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-400 text-[10px] font-bold z-10 whitespace-nowrap">
          ✨ 3D角色全貌 (悬停背包装备实时试穿)
        </div>
      )}
    </div>
  );
};
