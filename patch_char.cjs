const fs = require('fs');
let content = fs.readFileSync('src/utils/characterRenderer.ts', 'utf8');

// 1. Proportions
content = content.replace(
  /const headRadius = isFemale \? 5\.5 : 6\.5;/g,
  "const headRadius = isFemale ? 4.0 : 4.5;"
);
content = content.replace(
  /const chestY = -14;/g,
  "const chestY = -18;"
);
content = content.replace(
  /const armW = isFemale \? 2\.5 : 3\.5;/g,
  "const armW = isFemale ? 2.0 : 3.0;"
);
content = content.replace(
  /const upperArmL = 12;/g,
  "const upperArmL = 15;"
);
content = content.replace(
  /const lowerArmL = 14;/g,
  "const lowerArmL = 17;"
);
content = content.replace(
  /const legW = isFemale \? 3\.5 : 4\.5;/g,
  "const legW = isFemale ? 2.8 : 3.8;"
);
content = content.replace(
  /const upperLegL = 12;/g,
  "const upperLegL = 16;"
);
content = content.replace(
  /const lowerLegL = 15;/g,
  "const lowerLegL = 19;"
);

// 2. drawLimb bezier curves
const oldDrawLimb = `  const drawLimb = (
    w: number, length: number, isLeg: boolean, hasArmor: boolean, 
    baseColor: string, darkColor: string, lightColor: string, 
    taper = 0.8
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w * taper, length);
    ctx.lineTo(-w * taper, length);
    ctx.closePath();`;

const newDrawLimb = `  const drawLimb = (
    w: number, length: number, isLeg: boolean, hasArmor: boolean, 
    baseColor: string, darkColor: string, lightColor: string, 
    taper = 0.8
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    
    // Organic muscle curves
    if (isLeg) {
      ctx.quadraticCurveTo(-w - 1.5, length * 0.4, -w * taper, length);
      ctx.lineTo(w * taper, length);
      ctx.quadraticCurveTo(w + 1.5, length * 0.4, w, 0);
    } else {
      ctx.quadraticCurveTo(-w - 1.0, length * 0.5, -w * taper, length);
      ctx.lineTo(w * taper, length);
      ctx.quadraticCurveTo(w + 1.0, length * 0.5, w, 0);
    }
    ctx.closePath();`;

content = content.replace(oldDrawLimb, newDrawLimb);

// 3. Remove hard strokes in drawLimb
content = content.replace(
`    if (hasArmor) {
       ctx.strokeStyle = currentMat === 'metal' ? '#ffffff' : lightColor;
       ctx.lineWidth = currentMat === 'metal' ? 0.75 : 0.5;
       ctx.stroke();
    }`,
`    // Removed hard limb strokes to prevent "stitched" doll look
    if (hasArmor && currentMat === 'metal') {
       ctx.strokeStyle = 'rgba(255,255,255,0.3)';
       ctx.lineWidth = 0.5;
       ctx.stroke();
    }`
);

// 4. Remove hard strokes in drawTorso
content = content.replace(
`  // Torso Outline
  ctx.strokeStyle = matType === 'metal' ? '#ffffff' : armorTrim;
  ctx.lineWidth = matType === 'metal' ? 1.5 : 1.2;
  ctx.stroke();`,
`  // Torso Outline
  if (matType === 'metal') {
     ctx.strokeStyle = 'rgba(255,255,255,0.4)';
     ctx.lineWidth = 1.0;
     ctx.stroke();
  }`
);

fs.writeFileSync('src/utils/characterRenderer.ts', content);
console.log("Patched characterRenderer.ts");
