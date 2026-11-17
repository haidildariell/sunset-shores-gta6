// Save: the player's cash, mission progress and best cash, kept in
// localStorage. Nothing leaves the browser; a missing or broken save just
// starts a fresh story.

import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return {
      cash: typeof data.cash === 'number' ? data.cash : 120,
      missionIndex: typeof data.missionIndex === 'number' ? data.missionIndex : 0,
      bestCash: typeof data.bestCash === 'number' ? data.bestCash : 0,
      stashesTaken: Array.isArray(data.stashesTaken) ? data.stashesTaken : [],
    };
  } catch {
    return null;
  }
}

export function writeSave(world) {
  try {
    const data = {
      cash: Math.floor(world.player.cash),
      missionIndex: world.mission.index,
      bestCash: Math.max(world.bestCash, Math.floor(world.player.cash)),
      stashesTaken: world.city.stashes.map((s, i) => (s.taken ? i : -1)).filter((i) => i >= 0),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    world.bestCash = data.bestCash;
  } catch {
    // Storage can be off: the game still plays, it just does not persist.
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
