const fs = require('fs');

let content = fs.readFileSync('src/components/CanvasRenderer.tsx', 'utf8');

// Insert the missing functions after 'const screenCenterY = height / 2 + shakeY;'
const functionsCode = `
      // Coordinate converter: grid (x, y) to screen canvas (sx, sy)
      const getElevation = (x: number, y: number) => {
        const isOcean = x <= 3 || y <= 3 || x >= map.width - 4 || y >= map.height - 4;
        const mapHalfX = Math.floor(map.width / 2);
        const isRiver = !isOcean && (
          (map.theme === 'green_field' && Math.abs(x - y + Math.sin(x*0.1)*5 - Math.floor(map.width/10)) <= 2) ||
          (map.theme === 'snake_valley' && Math.abs(x + y + Math.cos(y*0.1)*5 - Math.floor(map.width*0.8)) <= 2)
        );
        if (isOcean || isRiver) return 0;
        const macroNoise = Math.sin(x * 0.12 + y * 0.09) * 0.5 + Math.cos(x * 0.06 - y * 0.14) * 0.5;
        const microSeed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const microVal = microSeed - Math.floor(microSeed);
        let elev = Math.pow((macroNoise + 1) / 2, 2.5) * 25; 
        if (microVal > 0.8) elev += 2; 
        return Math.max(0, elev);
      };

      const toScreen = (gx: number, gy: number) => {
        const isoX = (gx - gy) * (tileWidth / 2);
        const isoY = (gx + gy) * (tileHeight / 2);
        const camIsoX = (camX - camY) * (tileWidth / 2);
        const camIsoY = (camX + camY) * (tileHeight / 2);

        return {
          sx: screenCenterX + (isoX - camIsoX),
          sy: screenCenterY + (isoY - camIsoY) - getElevation(gx, gy)
        };
      };
      
      const toScreenFlat = (gx: number, gy: number) => {
        const isoX = (gx - gy) * (tileWidth / 2);
        const isoY = (gx + gy) * (tileHeight / 2);
        const camIsoX = (camX - camY) * (tileWidth / 2);
        const camIsoY = (camX + camY) * (tileHeight / 2);

        return {
          sx: screenCenterX + (isoX - camIsoX),
          sy: screenCenterY + (isoY - camIsoY)
        };
      };
`;

const replacePoint = `      // Coordinate converter: grid (x, y) to screen canvas (sx, sy)
      
      
`;

if (content.includes(replacePoint)) {
  content = content.replace(replacePoint, functionsCode);
  fs.writeFileSync('src/components/CanvasRenderer.tsx', content);
  console.log("Functions inserted successfully.");
} else {
  console.log("Could not find insertion point. Trying regex.");
  content = content.replace(/      \/\/ Coordinate converter: grid \(x, y\) to screen canvas \(sx, sy\)[\s\n]*/, functionsCode);
  fs.writeFileSync('src/components/CanvasRenderer.tsx', content);
}
