const fs = require('fs');

let content = fs.readFileSync('src/data/items.ts', 'utf8');

const replacements = [
  { id: 'weapon_heaven_breaker', setId: 'heaven_set' },
  { id: 'armor_heaven', setId: 'heaven_set' },
  { id: 'weapon_dragon_fury', setId: 'dragon_fury_set' },
  { id: 'armor_dragon', setId: 'dragon_fury_set' },
  { id: 'weapon_abyss_demon', setId: 'abyss_set' },
  { id: 'armor_abyss', setId: 'abyss_set' },
  { id: 'weapon_ancient_dragon', setId: 'ancient_dragon_set' },
  { id: 'armor_ancient_dragon', setId: 'ancient_dragon_set' }
];

for (const rep of replacements) {
  const id = rep.id;
  const setId = rep.setId;
  const regex = new RegExp("('" + id + "': \\{\\n(?:.|\\n)*?reqLevel: \\d+,)");
  content = content.replace(regex, (match, p1) => {
    return p1 + "\n    setId: '" + setId + "',";
  });
}

fs.writeFileSync('src/data/items.ts', content);
console.log("Patched items.ts with setIds");
