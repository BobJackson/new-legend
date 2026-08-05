const fs = require('fs');
let content = fs.readFileSync('src/components/CanvasRenderer.tsx', 'utf8');

content = content.replace(
  /const screenCenterX = width \/ 2 \+ shakeX;\s*const screenCenterY = height \/ 2 \+ shakeY;/,
  `const screenCenterX = Math.floor(width / 2) + Math.round(shakeX);
      const screenCenterY = Math.floor(height / 2) + Math.round(shakeY);`
);

content = content.replace(
  /let elev = Math\.pow\(\(macroNoise \+ 1\) \/ 2, 2\.5\) \* 25;[\s\n]*if \(microVal > 0\.8\) elev \+= 2;[\s\n]*return Math\.max\(0, elev\);/,
  `let elev = Math.pow((macroNoise + 1) / 2, 2.5) * 25; 
        if (microVal > 0.8) elev += 2; 
        return Math.round(Math.max(0, elev));`
);

content = content.replace(
  /const camIsoX = Math\.round\(\(camX - camY\) \* \(tileWidth \/ 2\)\);\s*const camIsoY = Math\.round\(\(camX \+ camY\) \* \(tileHeight \/ 2\)\);/g,
  `const camIsoX = (camX - camY) * (tileWidth / 2);
        const camIsoY = (camX + camY) * (tileHeight / 2);`
);

content = content.replace(
  /sx: screenCenterX \+ \(isoX - camIsoX\),\s*sy: screenCenterY \+ \(isoY - camIsoY\) - getElevation\(gx, gy\)/,
  `sx: Math.round(screenCenterX + (isoX - camIsoX)),
          sy: Math.round(screenCenterY + (isoY - camIsoY) - getElevation(gx, gy))`
);

content = content.replace(
  /sx: screenCenterX \+ \(isoX - camIsoX\),\s*sy: screenCenterY \+ \(isoY - camIsoY\)\s*\};/g,
  `sx: Math.round(screenCenterX + (isoX - camIsoX)),
          sy: Math.round(screenCenterY + (isoY - camIsoY))
        };`
);

// We need to disable image smoothing to keep pixels sharp
content = content.replace(
  /ctx\.setTransform\(dpr, 0, 0, dpr, 0, 0\);/,
  `ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false; // Prevents blur on textures and scaling`
);

fs.writeFileSync('src/components/CanvasRenderer.tsx', content);
