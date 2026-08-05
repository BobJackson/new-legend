const fs = require('fs');
let content = fs.readFileSync('src/components/CanvasRenderer.tsx', 'utf8');

content = content.replace(
  /const playerCenterY = mpy - \(isMounted \? 32 : 20\) \+ charBobY \+ mountBobY;/g,
  "const playerCenterY = mpy - (isMounted ? 42 : 30) + charBobY + mountBobY;"
);

fs.writeFileSync('src/components/CanvasRenderer.tsx', content);
console.log("Canvas renderer patched");
