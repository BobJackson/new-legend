const fs = require('fs');
let content = fs.readFileSync('src/components/CanvasRenderer.tsx', 'utf8');

// 1. Add file-scoped cache variables at the top (after imports)
const importsRegex = /import.*?;\n/g;
let lastImportIndex = 0;
let match;
while ((match = importsRegex.exec(content)) !== null) {
    lastImportIndex = match.index + match[0].length;
}

const cacheVars = `
// --- TERRAIN BITMAP CACHE ---
let _terrainCacheCanvas: HTMLCanvasElement | null = null;
let _terrainCacheCtx: CanvasRenderingContext2D | null = null;
let _terrainCacheMapId = '';
let _terrainCacheCamX = -9999;
let _terrainCacheCamY = -9999;
let _terrainCacheTime = 0;
let _terrainCacheTargetW = 0;
let _terrainCacheTargetH = 0;
// ----------------------------
`;
content = content.slice(0, lastImportIndex) + cacheVars + content.slice(lastImportIndex);

// 2. Modify toScreen and toScreenFlat in render()
const toScreenRegex = /      const toScreen = \[\s\S\]*?      const toScreenFlat = \[\s\S\]*?        \};\n      \};/;
// Let's use a robust replace
content = content.replace(
`      const toScreen = (gx: number, gy: number) => {
        const isoX = (gx - gy) * (tileWidth / 2);
        const isoY = (gx + gy) * (tileHeight / 2);
        // Round camera iso coordinates to prevent sub-pixel smearing during camera motion
        const camIsoX = (camX - camY) * (tileWidth / 2);
        const camIsoY = (camX + camY) * (tileHeight / 2);

        return {
          sx: Math.round(screenCenterX + (isoX - camIsoX)),
          sy: Math.round(screenCenterY + (isoY - camIsoY) - getElevation(gx, gy))
        };
      };
      
      const toScreenFlat = (gx: number, gy: number) => {
        const isoX = (gx - gy) * (tileWidth / 2);
        const isoY = (gx + gy) * (tileHeight / 2);
        const camIsoX = (camX - camY) * (tileWidth / 2);
        const camIsoY = (camX + camY) * (tileHeight / 2);

        return {
          sx: Math.round(screenCenterX + (isoX - camIsoX)),
          sy: Math.round(screenCenterY + (isoY - camIsoY))
        };
      };`,
`      // Round camera iso coordinates to prevent sub-pixel smearing/shimmering during camera motion
      const camIsoX_pixel = Math.round((camX - camY) * (tileWidth / 2));
      const camIsoY_pixel = Math.round((camX + camY) * (tileHeight / 2));

      const toScreen = (gx: number, gy: number) => {
        const isoX = (gx - gy) * (tileWidth / 2);
        const isoY = (gx + gy) * (tileHeight / 2);
        return {
          sx: Math.round(screenCenterX + (isoX - camIsoX_pixel)),
          sy: Math.round(screenCenterY + (isoY - camIsoY_pixel) - getElevation(gx, gy))
        };
      };
      
      const toScreenFlat = (gx: number, gy: number) => {
        const isoX = (gx - gy) * (tileWidth / 2);
        const isoY = (gx + gy) * (tileHeight / 2);
        return {
          sx: Math.round(screenCenterX + (isoX - camIsoX_pixel)),
          sy: Math.round(screenCenterY + (isoY - camIsoY_pixel))
        };
      };`
);

// 3. Extract Terrain Rendering into Cache Logic
const terrainRenderRegex = /\/\/ 1\.5 Draw 3D Island Base[\s\S]*?(?=\/\/ 2\.5 Draw Footprints & Ripples)/;
const terrainBlock = content.match(terrainRenderRegex)[0];

const newTerrainLogic = `
      // --- BITMAP CACHE RENDERING ---
      const cacheBufferPx = 250; // Extra rendering area around screen
      const cacheCssW = cssWidth + cacheBufferPx * 2;
      const cacheCssH = cssHeight + cacheBufferPx * 2;
      const cacheTargetW = Math.floor(cacheCssW * dpr);
      const cacheTargetH = Math.floor(cacheCssH * dpr);
      
      // Determine base integer camera position for the cache center
      const cacheBaseCamX = Math.round(camX);
      const cacheBaseCamY = Math.round(camY);
      
      const distToCacheCenter = Math.hypot(camX - _terrainCacheCamX, camY - _terrainCacheCamY);
      // We rebuild cache if camera moves by more than ~4 tiles, or every 200ms for water animation, or window resizes
      const needsCacheUpdate = 
         _terrainCacheMapId !== engine.currentMapId ||
         _terrainCacheTargetW !== cacheTargetW ||
         _terrainCacheTargetH !== cacheTargetH ||
         distToCacheCenter > 4 ||
         (now - _terrainCacheTime > 200);

      if (needsCacheUpdate) {
         if (!_terrainCacheCanvas) {
            _terrainCacheCanvas = document.createElement('canvas');
            _terrainCacheCtx = _terrainCacheCanvas.getContext('2d', { alpha: false });
         }
         _terrainCacheCanvas.width = cacheTargetW;
         _terrainCacheCanvas.height = cacheTargetH;
         
         _terrainCacheMapId = engine.currentMapId;
         _terrainCacheTargetW = cacheTargetW;
         _terrainCacheTargetH = cacheTargetH;
         _terrainCacheCamX = cacheBaseCamX;
         _terrainCacheCamY = cacheBaseCamY;
         _terrainCacheTime = now;
         
         const cctx = _terrainCacheCtx!;
         cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
         cctx.imageSmoothingEnabled = false;
         
         // Fill deep background
         cctx.fillStyle = '#0f172a';
         cctx.fillRect(0, 0, cacheCssW, cacheCssH);
         
         const cacheCenterX = cacheCssW / 2;
         const cacheCenterY = cacheCssH / 2;
         const cacheCamIsoX = Math.round((cacheBaseCamX - cacheBaseCamY) * (tileWidth / 2));
         const cacheCamIsoY = Math.round((cacheBaseCamX + cacheBaseCamY) * (tileHeight / 2));
         
         const toCacheScreen = (gx: number, gy: number) => {
            const isoX = (gx - gy) * (tileWidth / 2);
            const isoY = (gx + gy) * (tileHeight / 2);
            return {
               sx: Math.round(cacheCenterX + (isoX - cacheCamIsoX)),
               sy: Math.round(cacheCenterY + (isoY - cacheCamIsoY) - getElevation(gx, gy))
            };
         };
         
         const toCacheScreenFlat = (gx: number, gy: number) => {
            const isoX = (gx - gy) * (tileWidth / 2);
            const isoY = (gx + gy) * (tileHeight / 2);
            return {
               sx: Math.round(cacheCenterX + (isoX - cacheCamIsoX)),
               sy: Math.round(cacheCenterY + (isoY - cacheCamIsoY))
            };
         };

         // Original Terrain Loop adjusted to cache ctx
         const originalCtx = ctx;
         const originalToScreen = toScreen;
         const originalToScreenFlat = toScreenFlat;
         const originalWidth = width;
         const originalHeight = height;
         
         // Overwrite locally for the inner block
         const ctx_dummy = cctx;
         const toScreen_dummy = toCacheScreen;
         const toScreenFlat_dummy = toCacheScreenFlat;
         const width_dummy = cacheCssW;
         const height_dummy = cacheCssH;
         
         (function(ctx, toScreen, toScreenFlat, width, height, camX, camY) {
            ${terrainBlock.replace(/ctx\./g, 'ctx.').replace(/\n/g, '\n            ')}
         })(cctx, toCacheScreen, toCacheScreenFlat, cacheCssW, cacheCssH, cacheBaseCamX, cacheBaseCamY);
      }
      
      // Draw the Bitmap Cache to main canvas
      const cacheCamIsoX = Math.round((_terrainCacheCamX - _terrainCacheCamY) * (tileWidth / 2));
      const cacheCamIsoY = Math.round((_terrainCacheCamX + _terrainCacheCamY) * (tileHeight / 2));
      
      const drawOffsetX = (cacheCamIsoX - camIsoX_pixel);
      const drawOffsetY = (cacheCamIsoY - camIsoY_pixel);
      
      const drawX = Math.round(screenCenterX - (cacheCssW / 2) + drawOffsetX);
      const drawY = Math.round(screenCenterY - (cacheCssH / 2) + drawOffsetY);
      
      ctx.drawImage(_terrainCacheCanvas!, drawX, drawY, cacheCssW, cacheCssH);
      // ------------------------------
`;

content = content.replace(terrainBlock, newTerrainLogic);

// 4. Fix handleCanvasClick
content = content.replace(
`    const camIsoX = (camX - camY) * (tileWidth / 2);
    const camIsoY = (camX + camY) * (tileHeight / 2);`,
`    const camIsoX = Math.round((camX - camY) * (tileWidth / 2));
    const camIsoY = Math.round((camX + camY) * (tileHeight / 2));`
);

fs.writeFileSync('src/components/CanvasRenderer.tsx', content);
console.log("Rewrite completed");
