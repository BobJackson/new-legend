const fs = require('fs');

let content = fs.readFileSync('src/components/CanvasRenderer.tsx', 'utf8');

const oldTreeCode = `          if (obs.type === 'tree') {
            // AO Shadow (Premium PBR)
            ctx.beginPath();
            ctx.ellipse(sx, sy, 28, 14, 0, 0, Math.PI * 2);
            const treeAOGrad = ctx.createRadialGradient(sx, sy, 4, sx, sy, 28);
            treeAOGrad.addColorStop(0, 'rgba(0,0,0,0.9)');
            treeAOGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = treeAOGrad;
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

            // Premium 3D Leaf Canopy
            const sway = Math.sin(now * 0.002 + obs.x) * 2;
            const treeTopY = sy - 35;
            const isSnake = map.theme === 'snake_valley';

            const drawCanopyBubble = (cx, cy, r, baseColor, highlightColor) => {
              ctx.beginPath();
              ctx.arc(cx, cy, r, 0, Math.PI * 2);
              const canopyGrad = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, r*0.1, cx, cy, r);
              canopyGrad.addColorStop(0, highlightColor);
              canopyGrad.addColorStop(0.5, baseColor);
              canopyGrad.addColorStop(1, '#022c22'); // dark edge shadow
              ctx.fillStyle = canopyGrad;
              ctx.shadowColor = 'rgba(0,0,0,0.4)';
              ctx.shadowBlur = 8;
              ctx.fill();
              ctx.shadowBlur = 0;
            };

            drawCanopyBubble(sx + sway, treeTopY - 10, 26, isSnake ? '#047857' : '#15803d', isSnake ? '#10b981' : '#4ade80');
            drawCanopyBubble(sx - 8 + sway, treeTopY - 22, 18, isSnake ? '#059669' : '#16a34a', isSnake ? '#34d399' : '#86efac');
            drawCanopyBubble(sx + 6 + sway, treeTopY - 28, 14, isSnake ? '#10b981' : '#22c55e', '#bbf7d0');

          }`;

const newTreeCode = `          if (obs.type === 'tree') {
            // Giant Towering Tree (参天大树)
            // AO Shadow
            ctx.beginPath();
            ctx.ellipse(sx, sy, 35, 18, 0, 0, Math.PI * 2);
            const treeAOGrad = ctx.createRadialGradient(sx, sy, 4, sx, sy, 35);
            treeAOGrad.addColorStop(0, 'rgba(0,0,0,0.9)');
            treeAOGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = treeAOGrad;
            ctx.fill();

            const isSnake = map.theme === 'snake_valley';
            
            // Towering Trunk
            const trunkGrad = ctx.createLinearGradient(sx - 10, 0, sx + 10, 0);
            trunkGrad.addColorStop(0, '#291002');
            trunkGrad.addColorStop(0.5, '#5c2607');
            trunkGrad.addColorStop(1, '#1c1917');
            ctx.fillStyle = trunkGrad;
            ctx.beginPath();
            ctx.moveTo(sx - 8, sy);
            ctx.lineTo(sx - 3, sy - 90);
            ctx.lineTo(sx + 3, sy - 90);
            ctx.lineTo(sx + 8, sy);
            ctx.closePath();
            ctx.fill();
            
            // Bark texture lines
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.moveTo(sx - 4, sy); ctx.lineTo(sx - 1, sy - 85);
            ctx.moveTo(sx + 4, sy); ctx.lineTo(sx + 1, sy - 85);
            ctx.stroke();

            // Premium 3D Leaf Canopy - Massive Scale
            const sway = Math.sin(now * 0.0015 + obs.x) * 4;
            const treeTopY = sy - 90;

            const drawCanopyBubble = (cx: number, cy: number, rx: number, ry: number, baseColor: string, highlightColor: string) => {
              ctx.beginPath();
              ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
              const canopyGrad = ctx.createRadialGradient(cx - rx*0.3, cy - ry*0.3, rx*0.1, cx, cy, rx);
              canopyGrad.addColorStop(0, highlightColor);
              canopyGrad.addColorStop(0.6, baseColor);
              canopyGrad.addColorStop(1, '#022c22'); 
              ctx.fillStyle = canopyGrad;
              ctx.shadowColor = 'rgba(0,0,0,0.5)';
              ctx.shadowBlur = 10;
              ctx.fill();
              ctx.shadowBlur = 0;
            };

            // Bottom layer
            drawCanopyBubble(sx + sway*0.5, treeTopY, 45, 30, isSnake ? '#047857' : '#15803d', isSnake ? '#059669' : '#16a34a');
            // Middle layer
            drawCanopyBubble(sx - 15 + sway*0.8, treeTopY - 20, 35, 25, isSnake ? '#059669' : '#16a34a', isSnake ? '#10b981' : '#22c55e');
            drawCanopyBubble(sx + 15 + sway*0.8, treeTopY - 25, 30, 22, isSnake ? '#059669' : '#15803d', isSnake ? '#10b981' : '#4ade80');
            // Top layer
            drawCanopyBubble(sx + sway, treeTopY - 45, 25, 20, isSnake ? '#10b981' : '#22c55e', '#bbf7d0');
          }`;

content = content.replace(oldTreeCode, newTreeCode);

const oldGrassCode = `          } else if (obs.type === 'grass') {
            // Swaying Tall Grass Clump
            const sway = Math.sin(now * 0.004 + obs.x + obs.y) * 4;
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            for (let i = -3; i <= 3; i++) {
              ctx.beginPath();
              ctx.moveTo(sx + i * 4, sy);
              ctx.quadraticCurveTo(
                sx + i * 3 + sway * 0.5,
                sy - 10,
                sx + i * 2 + sway + (i % 2) * 2,
                sy - 18 - Math.abs(i)
              );
              ctx.strokeStyle = i % 2 === 0 ? '#4ade80' : '#16a34a';
              ctx.stroke();
            }`;

const newGrassCode = `          } else if (obs.type === 'grass') {
            // Vibrant Lush Green Grass (绿油油的草坪)
            const sway = Math.sin(now * 0.004 + obs.x + obs.y) * 5;
            ctx.lineCap = 'round';
            
            // Draw a dense cluster of grass blades
            for (let i = -5; i <= 5; i++) {
              ctx.beginPath();
              ctx.moveTo(sx + i * 3, sy);
              ctx.quadraticCurveTo(
                sx + i * 2 + sway * 0.7,
                sy - 8,
                sx + i * 1.5 + sway + (i % 2) * 3,
                sy - 14 - Math.random() * 5 - Math.abs(i)*0.5
              );
              ctx.lineWidth = 2 + Math.random();
              // Bright spring green colors
              const colors = ['#22c55e', '#4ade80', '#16a34a', '#86efac'];
              ctx.strokeStyle = colors[(Math.abs(i) + Math.floor(now*0.001)) % colors.length];
              ctx.stroke();
            }`;

content = content.replace(oldGrassCode, newGrassCode);

fs.writeFileSync('src/components/CanvasRenderer.tsx', content);
