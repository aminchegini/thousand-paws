// What the player has earned, kept in the browser. No account, no server.

import { BEARS } from './spec.js';

const KEY = 'thousandpaws-progress';
const EMPTY = { unlocked: [], attempts: 0, wins: 0, closest: null };

export function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (!saved || !Array.isArray(saved.unlocked)) return { ...EMPTY };
    const known = saved.unlocked.filter((id) => BEARS.some((b) => b.id === id));
    return { ...EMPTY, ...saved, unlocked: [...new Set(known)] };
  } catch { return { ...EMPTY }; }
}

export function saveProgress(progress) {
  try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* storage unavailable */ }
}

export function clearProgress() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  return { ...EMPTY };
}

// The bear a win unlocks: a random locked one, with the gold bear held back until last.
export function nextBear(unlocked, rnd = Math.random) {
  const locked = BEARS.filter((b) => !unlocked.includes(b.id));
  if (!locked.length) return null;
  const pool = locked.filter((b) => !b.last);
  if (!pool.length) return locked[0];
  return pool[Math.floor(rnd() * pool.length)];
}
