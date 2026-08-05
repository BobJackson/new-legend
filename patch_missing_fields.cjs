const fs = require('fs');
let content = fs.readFileSync('src/data/items.ts', 'utf8');

content = content.replace(/critChance: 0\.1\n  },/g, "critChance: 0.1,\n    description: '神器',\n    priceGold: 100000,\n    priceIngot: 0,\n    recycleGold: 10000,\n    recycleIngot: 0,\n    recycleExp: 1000\n  },");
content = content.replace(/critChance: 0\.15\n  },/g, "critChance: 0.15,\n    description: '神器',\n    priceGold: 100000,\n    priceIngot: 0,\n    recycleGold: 10000,\n    recycleIngot: 0,\n    recycleExp: 1000\n  },");
content = content.replace(/critChance: 0\.2\n  },/g, "critChance: 0.2,\n    description: '神器',\n    priceGold: 100000,\n    priceIngot: 0,\n    recycleGold: 10000,\n    recycleIngot: 0,\n    recycleExp: 1000\n  },");
content = content.replace(/critChance: 0\.3\n  }/g, "critChance: 0.3,\n    description: '神器',\n    priceGold: 100000,\n    priceIngot: 0,\n    recycleGold: 10000,\n    recycleIngot: 0,\n    recycleExp: 1000\n  }");

fs.writeFileSync('src/data/items.ts', content);
