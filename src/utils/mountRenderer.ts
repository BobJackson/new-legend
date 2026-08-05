export function drawMountBeastOnCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tier: number,
  now: number,
  icon: string,
  auraColor: string,
  scale: number = 1.0,
  vx: number = 0
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  if (tier === 10) {
    // 【十阶 · 混沌鸿蒙圣兽】 Ultra High-End Custom 2D Sacred Beast Renderer
    const bob = Math.sin(now * 0.005) * 4;
    const wingFlap = Math.sin(now * 0.006) * 0.18;
    const tilt = Math.max(-0.15, Math.min(0.15, vx * 0.8));
    ctx.rotate(tilt);

    // 1. Cosmic Nebulae Aura Disk on Ground
    ctx.save();
    const diskGrad = ctx.createRadialGradient(0, 15, 2, 0, 15, 45);
    diskGrad.addColorStop(0, 'rgba(217, 70, 239, 0.6)');
    diskGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.3)');
    diskGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.ellipse(0, 15, 45, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rotating Primordial Runic Ring
    const ringRot = now * 0.0015;
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#d946ef';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.ellipse(0, 15, 38, 15, ringRot, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 6; i++) {
      const a = ringRot + (i * Math.PI) / 3;
      const rx = Math.cos(a) * 38;
      const ry = 15 + Math.sin(a) * 15;
      ctx.beginPath();
      ctx.arc(rx, ry, 3, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#fde047';
      ctx.fill();
    }
    ctx.restore();

    // 2. Massive Cosmic Stardust Nebulae Wings (Flapping Left & Right)
    ctx.save();
    ctx.translate(0, -10 + bob);

    // Left Wing
    ctx.save();
    ctx.translate(-10, -5);
    ctx.rotate(-0.2 + wingFlap);
    const leftWingGrad = ctx.createLinearGradient(-55, -45, 0, 0);
    leftWingGrad.addColorStop(0, '#fef08a');
    leftWingGrad.addColorStop(0.35, '#d946ef');
    leftWingGrad.addColorStop(0.75, '#3b0764');
    leftWingGrad.addColorStop(1, '#1e1b4b');

    ctx.fillStyle = leftWingGrad;
    ctx.shadowColor = '#e879f9';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-38, -48, -60, -32);
    ctx.quadraticCurveTo(-42, -16, -28, -5);
    ctx.quadraticCurveTo(-48, -5, -65, 12);
    ctx.quadraticCurveTo(-32, 12, -10, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Wingtip Stardust Sparks
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-62, -34, 2.5, 2.5);
    ctx.fillRect(-67, 10, 2, 2);
    ctx.restore();

    // Right Wing
    ctx.save();
    ctx.translate(10, -5);
    ctx.rotate(0.2 - wingFlap);
    const rightWingGrad = ctx.createLinearGradient(55, -45, 0, 0);
    rightWingGrad.addColorStop(0, '#fef08a');
    rightWingGrad.addColorStop(0.35, '#d946ef');
    rightWingGrad.addColorStop(0.75, '#3b0764');
    rightWingGrad.addColorStop(1, '#1e1b4b');

    ctx.fillStyle = rightWingGrad;
    ctx.shadowColor = '#e879f9';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(38, -48, 60, -32);
    ctx.quadraticCurveTo(42, -16, 28, -5);
    ctx.quadraticCurveTo(48, -5, 65, 12);
    ctx.quadraticCurveTo(32, 12, 10, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Wingtip Stardust Sparks
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(60, -34, 2.5, 2.5);
    ctx.fillRect(65, 10, 2, 2);
    ctx.restore();

    // 3. Sacred Beast Main Body (Dragon-Kilin Body)
    ctx.beginPath();
    ctx.ellipse(0, 2 + bob, 24, 15, 0, 0, Math.PI * 2);
    const bodyGrad = ctx.createRadialGradient(-4, -2 + bob, 2, 0, 2 + bob, 24);
    bodyGrad.addColorStop(0, '#fef08a');
    bodyGrad.addColorStop(0.2, '#a855f7');
    bodyGrad.addColorStop(0.7, '#3b0764');
    bodyGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bodyGrad;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Claws / Hooves with Flame Effect
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-17, 12 + bob, 5, 7);
    ctx.fillRect(12, 12 + bob, 5, 7);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-16, 17 + bob, 3, 3);
    ctx.fillRect(13, 17 + bob, 3, 3);

    // 4. Primordial Chaos Orb Core (Chest Center)
    const orbPulse = Math.sin(now * 0.008) * 2.5;
    ctx.beginPath();
    ctx.arc(0, 0 + bob, 6 + orbPulse, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#fef08a';
    ctx.shadowBlur = 20;
    ctx.fill();

    // 5. Majestic Dragon-Kilin Head
    ctx.beginPath();
    ctx.ellipse(0, -15 + bob, 13, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2e1065';
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Dual Primordial Horns
    ctx.fillStyle = '#fde047';
    ctx.shadowColor = '#e879f9';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(-6, -19 + bob);
    ctx.quadraticCurveTo(-20, -38 + bob, -11, -40 + bob);
    ctx.lineTo(-3, -21 + bob);
    ctx.moveTo(6, -19 + bob);
    ctx.quadraticCurveTo(20, -38 + bob, 11, -40 + bob);
    ctx.lineTo(3, -21 + bob);
    ctx.fill();

    // Glowing Cyan Eyes
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 12;
    ctx.fillRect(-7, -17 + bob, 3.5, 2.5);
    ctx.fillRect(3.5, -17 + bob, 3.5, 2.5);

    // Whiskers / Snout Light Rays
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-8, -13 + bob);
    ctx.lineTo(-20, -11 + bob);
    ctx.moveTo(8, -13 + bob);
    ctx.lineTo(20, -11 + bob);
    ctx.stroke();

    ctx.restore();
  } else if (tier >= 7) {
    // Tiers 7-9: Dragons & Phoenix
    const bob = Math.sin(now * 0.005) * 3;
    const tilt = Math.max(-0.15, Math.min(0.15, vx * 0.8));
    ctx.rotate(tilt);

    // Dynamic Flapping Wings Behind
    const wingFlap = Math.sin(now * 0.006) * 0.15;
    ctx.fillStyle = tier === 9 ? '#f59e0b' : tier === 8 ? '#f43f5e' : '#a855f7';
    ctx.shadowColor = auraColor;
    ctx.shadowBlur = 16;

    ctx.beginPath();
    ctx.moveTo(-8, -5 + bob);
    ctx.quadraticCurveTo(-35 - wingFlap * 20, -30 + bob, -48, -15 + bob);
    ctx.quadraticCurveTo(-25, 0 + bob, -5, 5 + bob);
    ctx.moveTo(8, -5 + bob);
    ctx.quadraticCurveTo(35 + wingFlap * 20, -30 + bob, 48, -15 + bob);
    ctx.quadraticCurveTo(25, 0 + bob, 5, 5 + bob);
    ctx.fill();

    // Base Emoji Beast Symbol
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = auraColor;
    ctx.shadowBlur = 20;
    ctx.fillText(icon, 0, bob);
  } else {
    // Tiers 1-6
    const bob = Math.sin(now * 0.005) * 2.5;
    const tilt = Math.max(-0.15, Math.min(0.15, vx * 0.8));
    ctx.rotate(tilt);

    ctx.font = '46px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = auraColor;
    ctx.shadowBlur = 12 + tier * 1.5;
    ctx.fillText(icon, 0, bob);
  }

  // Saddle & Golden Reins for all mounted tiers
  ctx.beginPath();
  ctx.moveTo(-14, 2);
  ctx.lineTo(14, 2);
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.restore();
}
