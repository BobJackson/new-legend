const fs = require('fs');

let content = fs.readFileSync('src/components/CanvasRenderer.tsx', 'utf8');

const replacement = `      // C. Equipped Wing System (神级翼展 - 每10级蜕变)
      const wingLvl = engine.character.wingLevel || 0;
      if (wingLvl > 0) {
        const wingTier = Math.floor(wingLvl / 10);
        const flapSpeed = 0.005 + wingTier * 0.001; // wings flap faster at higher tiers
        const flap = Math.sin(now * flapSpeed) * (0.14 + wingTier * 0.02);
        const wingY = playerCenterY - 8 - wingTier; // Wings float a bit higher

        ctx.save();
        
        // Define colors based on tier
        const tierColors = [
          { p: '#38bdf8', g: '#60a5fa' }, // Tier 0 (0-9): Light Blue
          { p: '#f59e0b', g: '#fef08a' }, // Tier 1 (10-19): Golden
          { p: '#ef4444', g: '#f59e0b' }, // Tier 2 (20-29): Crimson / Orange
          { p: '#a855f7', g: '#d8b4fe' }, // Tier 3 (30-39): Purple / Violet
          { p: '#10b981', g: '#34d399' }, // Tier 4 (40-49): Emerald
          { p: '#6366f1', g: '#818cf8' }, // Tier 5 (50-59): Indigo
          { p: '#f43f5e', g: '#fb7185' }, // Tier 6 (60-69): Rose
          { p: '#0f172a', g: '#64748b' }, // Tier 7 (70-79): Dark Abyss
          { p: '#ffffff', g: '#e2e8f0' }, // Tier 8 (80-89): Pure White (Angelic)
          { p: '#fbbf24', g: '#ffffff' }, // Tier 9+ (90+): Golden White (Divine)
        ];
        
        const colorIdx = Math.min(wingTier, tierColors.length - 1);
        const wingPrimary = tierColors[colorIdx].p;
        const wingGlow = tierColors[colorIdx].g;

        const feathersCount = 1 + Math.min(wingTier, 4); // Up to 5 layers of feathers
        
        // Left Wing
        ctx.save();
        ctx.translate(px - 10, wingY);
        ctx.rotate(-0.35 + flap);
        for(let i=0; i<feathersCount; i++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          const extX = -42 - (i * 8) - (wingTier * 2);
          const extY = -14 + (i * 6) - (wingTier * 1);
          const ctrlX = -26 - (i * 4);
          const ctrlY = -32 - (i * 4) - (wingTier * 2);
          ctx.quadraticCurveTo(ctrlX, ctrlY, extX, extY);
          ctx.quadraticCurveTo(-28, 0 + (i*3), 0, 10 + (i*2));
          ctx.fillStyle = wingPrimary;
          ctx.shadowColor = wingGlow;
          ctx.shadowBlur = 10 + wingTier * 2;
          ctx.globalAlpha = 1 - (i * 0.15); // Outer feathers are slightly more transparent
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();

        // Right Wing
        ctx.save();
        ctx.translate(px + 10, wingY);
        ctx.rotate(0.35 - flap);
        for(let i=0; i<feathersCount; i++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          const extX = 42 + (i * 8) + (wingTier * 2);
          const extY = -14 + (i * 6) - (wingTier * 1);
          const ctrlX = 26 + (i * 4);
          const ctrlY = -32 - (i * 4) - (wingTier * 2);
          ctx.quadraticCurveTo(ctrlX, ctrlY, extX, extY);
          ctx.quadraticCurveTo(28, 0 + (i*3), 0, 10 + (i*2));
          ctx.fillStyle = wingPrimary;
          ctx.shadowColor = wingGlow;
          ctx.shadowBlur = 10 + wingTier * 2;
          ctx.globalAlpha = 1 - (i * 0.15);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
        
        // Advanced Aura Effect for higher tiers
        if (wingTier >= 2) {
          ctx.save();
          ctx.translate(px, wingY + 10);
          const auraPulse = Math.sin(now * 0.004) * (5 + wingTier);
          ctx.shadowColor = wingGlow;
          ctx.shadowBlur = 20 + wingTier * 5;
          ctx.fillStyle = wingGlow;
          ctx.globalAlpha = 0.1 + (wingTier * 0.02);
          ctx.beginPath();
          ctx.arc(0, 0, 20 + auraPulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.restore();
      }`;

const startMarker = "// C. Equipped Wing System";
const endMarker = "// D. Full Humanoid Character Body";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + replacement + "\n\n      " + content.substring(endIndex);
  fs.writeFileSync('src/components/CanvasRenderer.tsx', content);
  console.log("Patched CanvasRenderer.tsx with wing tier visual changes");
} else {
  console.log("Could not find wing rendering block");
}
