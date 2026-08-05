const fs = require('fs');

let content = fs.readFileSync('src/components/CanvasRenderer.tsx', 'utf8');

const elevFunc = `
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
        return elev;
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

const oldToScreen = /const toScreen = \([\s\S]*?return \{\s*sx:[\s\S]*?sy:[\s\S]*?\};\s*\};/;
content = content.replace(oldToScreen, elevFunc);

// Fix the terrain rendering loop again since we previously used getElevatedScreen
const fixElevated = /const pTop = getElevatedScreen\(gx - 0.5, gy - 0.5\);\s*const pRight = getElevatedScreen\(gx \+ 0.5, gy - 0.5\);\s*const pBottom = getElevatedScreen\(gx \+ 0.5, gy \+ 0.5\);\s*const pLeft = getElevatedScreen\(gx - 0.5, gy \+ 0.5\);/;
const replaceElevated = `const pTop = toScreen(gx - 0.5, gy - 0.5);
          const pRight = toScreen(gx + 0.5, gy - 0.5);
          const pBottom = toScreen(gx + 0.5, gy + 0.5);
          const pLeft = toScreen(gx - 0.5, gy + 0.5);`;
content = content.replace(fixElevated, replaceElevated);

// Also remove the old getElevation and getElevatedScreen we added below the bgGrad
const oldElevCode = /const getElevation = \([\s\S]*?const getElevatedScreen = \([\s\S]*?sy: sy - getElevation\(gx, gy\)\};\s*\};/;
content = content.replace(oldElevCode, '');

// Fix island base rendering (1.5) to use toScreenFlat so it stays at the bottom
content = content.replace('const mapTop = toScreen(0, 0);', 'const mapTop = toScreenFlat(0, 0);');
content = content.replace('const mapRight = toScreen(map.width - 1, 0);', 'const mapRight = toScreenFlat(map.width - 1, 0);');
content = content.replace('const mapBottom = toScreen(map.width - 1, map.height - 1);', 'const mapBottom = toScreenFlat(map.width - 1, map.height - 1);');
content = content.replace('const mapLeft = toScreen(0, map.height - 1);', 'const mapLeft = toScreenFlat(0, map.height - 1);');

fs.writeFileSync('src/components/CanvasRenderer.tsx', content);
