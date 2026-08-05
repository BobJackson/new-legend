const fs = require('fs');

let mapsContent = fs.readFileSync('src/data/maps.ts', 'utf8');

// The file was messed up, let's restore it from a backup if possible, or just replace the bad part.
// Actually, it's easier to just do it via regex, but let's rewrite it from scratch using our previous rewrite_maps.cjs, then append properly.
