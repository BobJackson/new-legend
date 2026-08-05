const fs = require('fs');

let content = fs.readFileSync('src/components/CanvasRenderer.tsx', 'utf8');

// We need to initialize the textures inside the render loop once.
const renderStart = `  useEffect(() => {`;
const initTextures = `
    if (!mapTextures) {
      mapTextures = generateTextures();
    }
`;
content = content.replace(renderStart, renderStart + initTextures);

const oldTerrainEnd = `          let tileFill = '#1e293b';

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
          } else if (isLoessTile) {
            // 🏜️ Loess Plateau & Natural Sand Dunes
            const baseHue = 35 + macroNoise * 8;
            const baseSat = 70 + microVal * 15;
            const baseLight = 32 + macroNoise * 12 + microVal * 4;
            tileFill = \`hsl(\${baseHue}, \${baseSat}%, \${baseLight}%)\`;
          } else if (map.theme === 'green_field') {
            // 🌲 Primeval Forest & Emerald Meadows (Natural Green Blend)
            const isDirtPath = Math.abs(gx - gy) <= 1.5 || Math.abs(gx + gy - 60) <= 1.5;
            if (isDirtPath) {
              // Rich Woodland Dirt Path
              tileFill = \`hsl(\${28 + microVal * 6}, \${45 + macroNoise * 10}%, \${24 + microVal * 6}%)\`;
            } else {
              // Rich Multi-tonal Grass Turf
              const gHue = 138 + macroNoise * 18;
              const gSat = 45 + microVal * 20;
              const gLight = 22 + macroNoise * 10 + microVal * 5;
              tileFill = \`hsl(\${gHue}, \${gSat}%, \${gLight}%)\`;
            }
          } else if (map.theme === 'snake_valley') {
            // 🐍 Poisonous Valley (Dark Olive Swamp Grass)
            const gHue = 82 + macroNoise * 15;
            const gSat = 50 + microVal * 15;
            const gLight = 20 + macroNoise * 8 + microVal * 4;
            tileFill = \`hsl(\${gHue}, \${gSat}%, \${gLight}%)\`;
          } else if (map.theme === 'stone_tomb') {
            // 🗿 Ancient Granite Crypt Flagstones
            const stoneLight = 18 + macroNoise * 10 + microVal * 6;
            tileFill = \`hsl(215, 12%, \${stoneLight}%)\`;
          } else if (map.theme === 'zuma_temple') {
            // 🔮 Mystical Zuma Shrine (Indigo Slate with Rune Veins)
            const baseHue = 240 + microVal * 20;
            const isRuneLine = microVal > 0.95;
            if (isRuneLine) {
              tileFill = '#a855f7';
            } else {
              tileFill = \`hsl(\${baseHue}, 30%, \${15 + macroNoise * 5}%)\`;
            }
          }

          ctx.fillStyle = tileFill;
          ctx.fill();`;

const newTerrainEnd = `          let tileFill = '#1e293b';
          let patternToUse = null;

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
          } else if (isLoessTile) {
            // 🏜️ Loess Plateau & Natural Sand Dunes
            patternToUse = mapTextures.dirt;
          } else if (map.theme === 'green_field') {
            // 🌲 Primeval Forest & Emerald Meadows (Natural Green Blend)
            const isDirtPath = Math.abs(gx - gy) <= 1.5 || Math.abs(gx + gy - 60) <= 1.5;
            if (isDirtPath) {
              patternToUse = mapTextures.dirt;
            } else {
              patternToUse = mapTextures.grass;
            }
          } else if (map.theme === 'snake_valley') {
            // 🐍 Poisonous Valley (Dark Olive Swamp Grass)
            patternToUse = mapTextures.swamp;
          } else if (map.theme === 'stone_tomb') {
            // 🗿 Ancient Granite Crypt Flagstones
            patternToUse = mapTextures.stone;
          } else if (map.theme === 'zuma_temple') {
            // 🔮 Mystical Zuma Shrine (Indigo Slate with Rune Veins)
            const baseHue = 240 + microVal * 20;
            const isRuneLine = microVal > 0.95;
            if (isRuneLine) {
              tileFill = '#a855f7';
            } else {
              patternToUse = mapTextures.stone;
            }
          }

          if (patternToUse) {
            // Create a pattern for this tile, offset to match global coordinates for seamless tiling
            const pattern = ctx.createPattern(patternToUse, 'repeat');
            ctx.fillStyle = pattern;
            
            // Adjust the matrix of the pattern so it aligns seamlessly across tiles
            const matrix = new DOMMatrix();
            matrix.translateSelf(sx - (gx * tileWidth), sy - (gy * tileHeight));
            pattern.setTransform(matrix);
          } else {
            ctx.fillStyle = tileFill;
          }
          
          ctx.fill();
          
          // Apply macro noise overlay for lighting variation (shadows & highlights)
          const baseLight = macroNoise * 0.15;
          ctx.fillStyle = baseLight > 0 ? \`rgba(255, 255, 255, \${baseLight})\` : \`rgba(0, 0, 0, \${-baseLight})\`;
          ctx.fill();
          
          `;

content = content.replace(oldTerrainEnd, newTerrainEnd);

// Adding ambient light overlay to global illumination
const oldLightEnd = `      // 3. Directional/Specular Global Illumination (PBR Rim Light)
      const dirLight = ctx.createLinearGradient(0, 0, width, height);
      dirLight.addColorStop(0, 'rgba(255, 255, 255, 0.12)'); // Top-left soft sun
      dirLight.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
      dirLight.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = dirLight;
      ctx.fillRect(0, 0, width, height);

      ctx.restore();`;

const newLightEnd = `      // 3. Directional/Specular Global Illumination & Dynamic Ambient Mood Lighting
      
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      
      let ambientColor = 'rgba(255, 255, 255, 1)'; // Default neutral
      if (map.theme === 'snake_valley') ambientColor = 'rgba(163, 230, 53, 0.5)'; // sickly green
      else if (map.theme === 'stone_tomb') ambientColor = 'rgba(71, 85, 105, 0.7)'; // gloomy grey
      else if (map.theme === 'zuma_temple') ambientColor = 'rgba(49, 46, 129, 0.6)'; // deep mystical purple
      else if (currentWeather === 'rain') ambientColor = 'rgba(148, 163, 184, 0.8)'; // overcast
      else if (currentWeather === 'sandstorm') ambientColor = 'rgba(253, 230, 138, 0.8)'; // sandy tint
      else if (currentWeather === 'snow') ambientColor = 'rgba(224, 242, 254, 0.9)'; // cold tint
      
      ctx.fillStyle = ambientColor;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      const dirLight = ctx.createLinearGradient(0, 0, width, height);
      dirLight.addColorStop(0, 'rgba(255, 255, 255, 0.12)'); // Top-left soft sun
      dirLight.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
      dirLight.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = dirLight;
      ctx.fillRect(0, 0, width, height);

      ctx.restore();`;

content = content.replace(oldLightEnd, newLightEnd);

fs.writeFileSync('src/components/CanvasRenderer.tsx', content);
