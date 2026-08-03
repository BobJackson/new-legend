import { CharacterData } from '../types/game';

const LOCAL_STORAGE_KEY = 'legend_game_character_save_v1';

export async function saveCharacter(character: CharacterData): Promise<void> {
  try {
    const json = JSON.stringify(character);
    localStorage.setItem(LOCAL_STORAGE_KEY, json);

    // Sync to Express backend API asynchronously
    fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: character.id, data: character })
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save character state:', err);
  }
}

export function loadLocalCharacter(): CharacterData | null {
  try {
    const json = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (json) {
      return JSON.parse(json) as CharacterData;
    }
  } catch (err) {
    console.error('Failed to load local character:', err);
  }
  return null;
}

export async function submitLeaderboard(character: CharacterData, battlePower: number) {
  try {
    await fetch('/api/leaderboard/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: character.name,
        profession: character.profession,
        level: character.level,
        battlePower,
        guild: character.guildName || '散人玩家'
      })
    });
  } catch (e) {}
}

export async function clearLocalCharacter() {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
}
