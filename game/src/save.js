// Save: the player's cash, mission progress, best cash, weapon, radio
// station and courier tally, kept in localStorage. Nothing leaves the
// browser; a missing or broken save just starts a fresh story.

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
      // Added in the v3 pass: old saves simply fall back to the defaults.
      weapon: ['pistol', 'shotgun', 'smg'].includes(data.weapon) ? data.weapon : 'pistol',
      radioStation: typeof data.radioStation === 'number' ? data.radioStation : 0,
      courierDone: typeof data.courierDone === 'number' ? data.courierDone : 0,
      carsStolen: typeof data.carsStolen === 'number' ? data.carsStolen : 0,
      storyDone: data.storyDone === true,
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
      weapon: world.player.weapon ?? 'pistol',
      radioStation: world.radioStation ?? 0,
      courierDone: world.courierDone ?? 0,
      carsStolen: world.carsStolen ?? 0,
      storyDone: world.mission.done === true,
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
