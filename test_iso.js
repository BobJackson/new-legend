const tileWidth = 60;
const tileHeight = 30;
function toScreen(gx, gy) {
    const isoX = (gx - gy) * (tileWidth / 2);
    const isoY = (gx + gy) * (tileHeight / 2);
    return { sx: isoX, sy: isoY };
}
console.log("0,0 (Top?):", toScreen(0, 0));
console.log("10,0 (Right?):", toScreen(10, 0));
console.log("10,10 (Bottom?):", toScreen(10, 10));
console.log("0,10 (Left?):", toScreen(0, 10));
