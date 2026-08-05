const fs = require('fs');
let content = fs.readFileSync('src/components/CanvasRenderer.tsx', 'utf8');

const regex = /(ctx\.drawImage\(_terrainCacheCanvas!, drawX, drawY, cacheCssW, cacheCssH\);\n\s+\/\/ ------------------------------\n)/;

const insertion = `
      // --- DYNAMIC WEATHER GROUND EFFECTS ---
      if (currentWeather === 'rain' || map.theme === 'green_field') {
        ctx.save();
        const baseGx = Math.floor(camX);
        const baseGy = Math.floor(camY);
        const radius = 15;
        
        for (let x = -radius; x <= radius; x++) {
          for (let y = -radius; y <= radius; y++) {
             const gx = baseGx + x;
             const gy = baseGy + y;
             if (gx < 0 || gy < 0 || gx >= map.width || gy >= map.height) continue;
             
             // Pseudo-random value for this tile
             const seed = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
             const rand = seed - Math.floor(seed);
             
             const { sx, sy } = toScreen(gx, gy);
             if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) continue;
             
             // Rain Puddle Ripples
             if (currentWeather === 'rain' && rand > 0.7) {
                const puddlePhase = (now * 0.0015 + rand * 100) % (Math.PI * 2);
                const puddleScale = 1 + Math.sin(puddlePhase) * 0.1;
                
                // Draw puddle base
                ctx.beginPath();
                ctx.ellipse(sx, sy + 5, 20 * puddleScale, 10 * puddleScale, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(14, 116, 144, 0.15)'; // Wet puddle
                ctx.fill();
                
                // Occasional raindrop ripple on puddle
                const rippleTime = (now + rand * 10000) % 2000;
                if (rippleTime < 600) {
                   const rProg = rippleTime / 600;
                   ctx.beginPath();
                   ctx.ellipse(sx + (rand - 0.5) * 10, sy + 5 + (rand - 0.5) * 5, 10 * rProg, 5 * rProg, 0, 0, Math.PI * 2);
                   ctx.strokeStyle = \`rgba(255, 255, 255, \${(1 - rProg) * 0.4})\`;
                   ctx.lineWidth = 1;
                   ctx.stroke();
                }
             }
             
             // Falling Leaves / Wind sweeping across ground
             if (map.theme === 'green_field' && rand > 0.85) {
                const windPhase = (now * 0.002 + gx * 0.5 + gy * 0.5) % (Math.PI * 2);
                const isSweeping = Math.sin(windPhase) > 0.5;
                if (isSweeping) {
                   const leafX = sx + Math.cos(windPhase * 2 + rand * 10) * 15;
                   const leafY = sy + Math.sin(windPhase * 2 + rand * 10) * 8 - 2;
                   
                   ctx.save();
                   ctx.translate(leafX, leafY);
                   ctx.rotate(windPhase * 3 + rand * 5);
                   ctx.beginPath();
                   ctx.ellipse(0, 0, 3, 1.5, 0, 0, Math.PI * 2);
                   ctx.fillStyle = rand > 0.92 ? 'rgba(250, 204, 21, 0.6)' : 'rgba(74, 222, 128, 0.6)'; // Yellow or Green leaf
                   ctx.fill();
                   ctx.restore();
                }
             }
          }
        }
        ctx.restore();
      }
      // ----------------------------------------
`;

content = content.replace(regex, "$1" + insertion);
fs.writeFileSync('src/components/CanvasRenderer.tsx', content);
console.log("Weather ground effects added.");
