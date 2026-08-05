const fs = require('fs');

let content = fs.readFileSync('src/components/CanvasRenderer.tsx', 'utf8');

const oldResize = `      // Resize canvas to match display size cleanly
      const width = canvas.width = canvas.parentElement?.clientWidth || 800;
      const height = canvas.height = canvas.parentElement?.clientHeight || 600;`;

const newResize = `      // Resize canvas to match display size cleanly with Device Pixel Ratio support for crisp rendering
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = canvas.parentElement?.clientWidth || 800;
      const cssHeight = canvas.parentElement?.clientHeight || 600;
      const width = cssWidth;
      const height = cssHeight;
      
      const targetW = Math.floor(cssWidth * dpr);
      const targetH = Math.floor(cssHeight * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.style.width = \`\${cssWidth}px\`;
        canvas.style.height = \`\${cssHeight}px\`;
      }
      
      // Reset transform and apply DPR scale every frame to ensure crisp rendering
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);`;

content = content.replace(oldResize, newResize);

fs.writeFileSync('src/components/CanvasRenderer.tsx', content);
console.log("Canvas DPR fixed!");
