const fs = require('fs');

let content = fs.readFileSync('src/components/CanvasRenderer.tsx', 'utf8');

const oldTerrainEnd = `          let tileFill = '#1e293b';

          if (isOceanTile) {
            // 🌊 Seamless Deep Ocean with Animated Surface Waves
            const wavePhase = (now * 0.002 + gx * 0.4 + gy * 0.4) % (Math.PI * 2);
            const waveGlow = Math.sin(wavePhase) * 0.15;
            const oGrad = ctx.createLinearGradient(sx, sy - tileHeight / 2, sx, sy + tileHeight / 2);
            oGrad.addColorStop(0, \`rgba(14, 116, 144, \${0.85 + waveGlow})\`);
            oGrad.addColorStop(1, \`rgba(8, 47, 73, \${0.9 + waveGlow})\`);
            tileFill = oGrad as any;
          } else if (isRiverTile) {
            // 🏔️ Flowing Alpine River Current
            const flowOffset = (now * 0.003 + gx * 0.3) % (Math.PI * 2);
            const flowGlow = Math.sin(flowOffset) * 0.12;
            const rGrad = ctx.createLinearGradient(sx - tileWidth / 2, sy, sx + tileWidth / 2, sy);
            rGrad.addColorStop(0, \`rgba(2, 132, 199, \${0.85 + flowGlow})\`);
            rGrad.addColorStop(1, \`rgba(56, 189, 248, \${0.75 + flowGlow})\`);
            tileFill = rGrad as any;
          } else if (isLoessTile) {`;

const newTerrainEnd = `          let tileFill = '#1e293b';

          if (isOceanTile) {
            // 🌊 Seamless Deep Ocean with Animated Surface Waves
            const wavePhase = (now * 0.002 + gx * 0.4 + gy * 0.4) % (Math.PI * 2);
            const waveGlow = Math.sin(wavePhase) * 0.15;
            const oGrad = ctx.createLinearGradient(sx, sy - tileHeight / 2, sx, sy + tileHeight / 2);
            oGrad.addColorStop(0, \`rgba(14, 116, 144, \${0.9 + waveGlow})\`);
            oGrad.addColorStop(1, \`rgba(8, 47, 73, \${0.95 + waveGlow})\`);
            tileFill = oGrad as any;
          } else if (isRiverTile) {
            // 🏔️ Flowing Alpine River Current (流水潺潺)
            const flowOffset = (now * 0.003 + gx * 0.3 + gy * 0.1) % (Math.PI * 2);
            const flowGlow = Math.sin(flowOffset) * 0.15;
            const rGrad = ctx.createLinearGradient(sx - tileWidth / 2, sy, sx + tileWidth / 2, sy);
            rGrad.addColorStop(0, \`rgba(2, 132, 199, \${0.85 + flowGlow})\`);
            rGrad.addColorStop(1, \`rgba(56, 189, 248, \${0.85 + flowGlow})\`);
            tileFill = rGrad as any;
          } else if (isLoessTile) {`;

content = content.replace(oldTerrainEnd, newTerrainEnd);

// Add ripples and sparkles for river and ocean after ctx.fill()
const fillCode = `          ctx.fillStyle = tileFill;
          ctx.fill();`;
          
const fillCodeWithRipples = `          ctx.fillStyle = tileFill;
          ctx.fill();
          
          if (isRiverTile || isOceanTile) {
            ctx.save();
            ctx.clip(); // clip ripples to this tile
            const time = now * 0.002;
            const sparkle = Math.sin(time * 2 + gx*3 + gy*7);
            if (sparkle > 0.8) {
              ctx.beginPath();
              ctx.arc(sx + Math.sin(time+gx)*10, sy + Math.cos(time+gy)*5, 1.5, 0, Math.PI*2);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.shadowColor = '#fff';
              ctx.shadowBlur = 4;
              ctx.fill();
            }
            // Flow lines
            const offset = (time * 5 + gx * 10) % 20;
            ctx.beginPath();
            ctx.moveTo(sx - 10 + offset, sy);
            ctx.quadraticCurveTo(sx + offset, sy - 5, sx + 10 + offset, sy);
            ctx.strokeStyle = \`rgba(255, 255, 255, \${isRiverTile ? 0.3 : 0.1})\`;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
          }`;

content = content.replace(fillCode, fillCodeWithRipples);

fs.writeFileSync('src/components/CanvasRenderer.tsx', content);
