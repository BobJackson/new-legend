import React, { useEffect, useRef } from 'react';
import { CharacterData, EquipmentSlot, Item } from '../types/game';
import { drawCharacterAvatar } from '../utils/characterRenderer';

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
  const [actionState, setActionState] = React.useState<'idle' | 'walk' | 'attack'>('idle');

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
      const playerCenterY = cy - 35 + charBobY;
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

      // D. Full Humanoid Character Avatar (统一画风与装备辨识度 + 动作帧切换)
      drawCharacterAvatar({
        ctx,
        px,
        py,
        playerCenterY,
        character,
        previewEquipment,
        now,
        actionOverride: actionState === 'attack' ? (character.profession === 'warrior' ? 'attack' : 'cast') : actionState
      });

      ctx.restore(); // Restore root canvas transform

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [character, hoveredItem, actionState]);

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
          ✨ 传奇像素艺术形态 (试穿装备)
        </div>
      )}

      {/* Action Frame Switcher Controls */}
      <div className="flex items-center gap-1.5 mt-2 z-10">
        <button
          onClick={() => setActionState('idle')}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
            actionState === 'idle'
              ? 'bg-amber-600 text-slate-950 shadow-md font-extrabold'
              : 'bg-slate-900 text-amber-400/80 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          🌬️ 待机姿态
        </button>
        <button
          onClick={() => setActionState('walk')}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
            actionState === 'walk'
              ? 'bg-amber-600 text-slate-950 shadow-md font-extrabold'
              : 'bg-slate-900 text-amber-400/80 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          🏃 奔跑踏步
        </button>
        <button
          onClick={() => setActionState('attack')}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
            actionState === 'attack'
              ? 'bg-amber-600 text-slate-950 shadow-md font-extrabold'
              : 'bg-slate-900 text-amber-400/80 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          ⚔️ 斩击/施法
        </button>
      </div>
    </div>
  );
};
