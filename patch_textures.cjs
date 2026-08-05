const fs = require('fs');

let content = fs.readFileSync('src/components/CanvasRenderer.tsx', 'utf8');

const patternGeneratorCode = `
const generateTextures = () => {
  const textures = {};
  
  // Grass Texture
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 128;
  grassCanvas.height = 128;
  const gCtx = grassCanvas.getContext('2d');
  gCtx.fillStyle = '#166534'; // Base green
  gCtx.fillRect(0, 0, 128, 128);
  for(let i=0; i<300; i++) {
    gCtx.fillStyle = Math.random() > 0.5 ? '#15803d' : '#14532d';
    gCtx.fillRect(Math.random()*128, Math.random()*128, 2, 8 + Math.random()*6);
    gCtx.fillRect(Math.random()*128, Math.random()*128, 6 + Math.random()*4, 2);
  }
  textures.grass = grassCanvas;

  // Dirt/Loess Texture
  const dirtCanvas = document.createElement('canvas');
  dirtCanvas.width = 128;
  dirtCanvas.height = 128;
  const dCtx = dirtCanvas.getContext('2d');
  dCtx.fillStyle = '#78350f'; // Base brown
  dCtx.fillRect(0, 0, 128, 128);
  for(let i=0; i<500; i++) {
    dCtx.fillStyle = Math.random() > 0.5 ? '#92400e' : '#451a03';
    dCtx.beginPath();
    dCtx.arc(Math.random()*128, Math.random()*128, Math.random()*2, 0, Math.PI*2);
    dCtx.fill();
  }
  textures.dirt = dirtCanvas;

  // Swamp/Snake Valley Texture
  const swampCanvas = document.createElement('canvas');
  swampCanvas.width = 128;
  swampCanvas.height = 128;
  const sCtx = swampCanvas.getContext('2d');
  sCtx.fillStyle = '#3f6212'; // Base dark olive
  sCtx.fillRect(0, 0, 128, 128);
  for(let i=0; i<200; i++) {
    sCtx.fillStyle = Math.random() > 0.5 ? '#4d7c0f' : '#14532d';
    sCtx.beginPath();
    sCtx.ellipse(Math.random()*128, Math.random()*128, 4+Math.random()*6, 2+Math.random()*3, Math.random()*Math.PI, 0, Math.PI*2);
    sCtx.fill();
  }
  textures.swamp = swampCanvas;
  
  // Stone Texture
  const stoneCanvas = document.createElement('canvas');
  stoneCanvas.width = 128;
  stoneCanvas.height = 128;
  const stCtx = stoneCanvas.getContext('2d');
  stCtx.fillStyle = '#334155'; // Base slate
  stCtx.fillRect(0, 0, 128, 128);
  for(let i=0; i<400; i++) {
    stCtx.fillStyle = Math.random() > 0.5 ? '#475569' : '#1e293b';
    stCtx.fillRect(Math.random()*128, Math.random()*128, 4+Math.random()*4, 4+Math.random()*4);
  }
  textures.stone = stoneCanvas;

  return textures;
};

let mapTextures = null;
`;

const importPoint = `import { MAP_DATABASE } from '../engine/data';`;
content = content.replace(importPoint, importPoint + '\n' + patternGeneratorCode);

fs.writeFileSync('src/components/CanvasRenderer.tsx', content);
