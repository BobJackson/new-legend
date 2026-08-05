const fs = require('fs');
let content = fs.readFileSync('src/components/CanvasRenderer.tsx', 'utf8');

const oldClick = `  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const screenCenterX = width / 2;
    const screenCenterY = height / 2;`;

const newClick = `  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const cssWidth = canvas.parentElement?.clientWidth || 800;
    const cssHeight = canvas.parentElement?.clientHeight || 600;
    const screenCenterX = cssWidth / 2;
    const screenCenterY = cssHeight / 2;`;

content = content.replace(oldClick, newClick);
fs.writeFileSync('src/components/CanvasRenderer.tsx', content);
console.log("Click fixed.");
