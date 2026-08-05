const fs = require('fs');
let content = fs.readFileSync('src/components/CanvasRenderer.tsx', 'utf8');

const oldCamera = `      } else {
        // Exponential smoothing for butter-smooth camera following
        const dx = playerX - cameraPosRef.current.x;
        const dy = playerY - cameraPosRef.current.y;
        const distToPlayer = Math.hypot(dx, dy);
        if (distToPlayer > 25) { // Reset instantly on teleport/map change
          cameraPosRef.current = { x: playerX, y: playerY };
        } else if (distToPlayer < 0.002) { // Snap directly to avoid micro-vibrations when stationary
          cameraPosRef.current = { x: playerX, y: playerY };
        } else {
          cameraPosRef.current.x += dx * 0.15;
          cameraPosRef.current.y += dy * 0.15;
        }
      }`;

const newCamera = `      } else {
        // Exponential smoothing for butter-smooth camera following
        const dx = playerX - cameraPosRef.current.x;
        const dy = playerY - cameraPosRef.current.y;
        const distToPlayer = Math.hypot(dx, dy);
        if (distToPlayer > 25) { // Reset instantly on teleport/map change
          cameraPosRef.current = { x: playerX, y: playerY };
        } else if (distToPlayer < 0.002) { // Snap directly to avoid micro-vibrations when stationary
          cameraPosRef.current = { x: playerX, y: playerY };
        } else {
          const smoothingFactor = engine.isAutoBattling ? 0.06 : 0.15;
          cameraPosRef.current.x += dx * smoothingFactor;
          cameraPosRef.current.y += dy * smoothingFactor;
        }
      }`;

content = content.replace(oldCamera, newCamera);
fs.writeFileSync('src/components/CanvasRenderer.tsx', content);
console.log("Camera smoothing patched.");
