const fs = require('fs');

let content = fs.readFileSync('src/data/quests.ts', 'utf8');

// The file has a bunch of garbage at the end.
// Let's truncate everything from `];\n  {\n    id: 'quest_main_10',` onwards
const garbageIndex = content.indexOf("];\n  {\n    id: 'quest_main_10',");
if (garbageIndex !== -1) {
  content = content.substring(0, garbageIndex + 2) + "\n";
}

// Now we need to insert the new quests into the main quest array.
// Where is quest_main_9?
const main9Index = content.indexOf("id: 'quest_main_9'");
if (main9Index !== -1) {
  const main9End = content.indexOf("  }", main9Index);
  if (main9End !== -1) {
    const insertPos = main9End + 3;
    const newQuests = `,
  {
    id: 'quest_main_10',
    title: '深渊的呼唤',
    chapter: '深渊篇',
    type: 'main',
    description: '深渊之境的封印松动，前往深渊之境·外围击杀 10 只深渊守望者。',
    targetType: 'kill_monster',
    targetMonsterId: 'abyss_watcher',
    targetName: '深渊守望者',
    targetMapId: 'abyss_realm_1',
    requiredCount: 10,
    currentCount: 0,
    rewardExp: 5000000,
    rewardGold: 1000000,
    rewardIngot: 1000,
    isCompleted: false,
    isClaimed: false
  },
  {
    id: 'quest_main_11',
    title: '突破内殿',
    chapter: '深渊篇',
    type: 'main',
    description: '深入深渊之境内殿，消灭深渊魔王骑士！',
    targetType: 'kill_monster',
    targetMonsterId: 'abyss_knight',
    targetName: '深渊魔王骑士',
    targetMapId: 'abyss_realm_2',
    requiredCount: 1,
    currentCount: 0,
    rewardExp: 10000000,
    rewardGold: 5000000,
    rewardIngot: 3000,
    isCompleted: false,
    isClaimed: false
  },
  {
    id: 'quest_main_12',
    title: '远古魔龙',
    chapter: '深渊终章',
    type: 'main',
    description: '踏入魔龙祭坛，直面最强大的存在——远古魔龙，拯救整个世界！',
    targetType: 'kill_monster',
    targetMonsterId: 'ancient_magic_dragon',
    targetName: '远古魔龙',
    targetMapId: 'abyss_realm_3',
    requiredCount: 1,
    currentCount: 0,
    rewardExp: 50000000,
    rewardGold: 20000000,
    rewardIngot: 10000,
    rewardItemName: '远古魔龙刃',
    isCompleted: false,
    isClaimed: false
  }`;
    content = content.substring(0, insertPos) + newQuests + content.substring(insertPos);
  }
}

fs.writeFileSync('src/data/quests.ts', content);
console.log("Fixed quests.ts");
