// The counter simulation. createCounterSim(handlers, options) owns the count, its random
// speed changes and the win or miss judgement. No DOM, no rendering.

import { TARGET, OVERRUN, END_ZONE, SEGMENT, SPEEDS, END_SPEED, DWELL, BEARS } from './spec.js';

// Small seeded random generator, so a round can be replayed exactly.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createCounterSim(handlers = {}, { seed = Date.now(), level = 0 } = {}) {
  const rnd = mulberry32(seed);
  let phase = 'idle';       // idle | running | won | missed
  let value = 0;            // the count
  let shown = 0;            // the count last drawn on screen; a press is judged on this
  let carry = 0;            // fraction of a count carried between updates
  let rate = 0;             // counts per second in the current stretch
  let speed = '';
  let segLeft = 0;
  let hold = 0;             // extra time the target still has to stay up
  let result = null;

  const between = (a, b) => a + (b - a) * rnd();
  const minDwell = () => DWELL.easy + (DWELL.hard - DWELL.easy) * Math.min(1, level / (BEARS.length - 1));

  function pickSpeed() {
    let band = END_SPEED;
    if (value < END_ZONE) {
      let roll = rnd();
      band = SPEEDS[SPEEDS.length - 1];
      for (const s of SPEEDS) { if (roll < s.weight) { band = s; break; } roll -= s.weight; }
    }
    speed = band.name;
    rate = between(band.min, band.max);
    segLeft = between(SEGMENT.min, SEGMENT.max);
    handlers.onSpeed?.(speed, rate);
  }

  function finish(win, reason) {
    phase = win ? 'won' : 'missed';
    result = { win, reason, value: shown, diff: shown - TARGET };
    handlers.onPhase?.(phase);
    handlers.onResult?.(result);
  }

  return {
    start() {
      if (phase === 'running') return false;
      value = shown = 0; carry = 0; hold = 0; result = null;
      phase = 'running';
      pickSpeed();
      handlers.onPhase?.(phase);
      return true;
    },
    // Stops the counter. The player wins only if the number on screen is the target.
    press() {
      if (phase !== 'running') return null;
      finish(shown === TARGET, 'press');
      return result;
    },
    update(dt) {
      if (phase !== 'running') return;
      let left = dt;
      if (hold > 0) {
        const used = Math.min(hold, left);
        hold -= used; left -= used;
      }
      while (left > 0 && phase === 'running') {
        if (segLeft <= 0) pickSpeed();
        const step = Math.min(left, segLeft);
        segLeft -= step; left -= step;
        carry += step * rate;
        const whole = Math.floor(carry);
        if (!whole) continue;
        carry -= whole;
        const before = value;
        value += whole;
        if (before < END_ZONE && value >= END_ZONE) {
          // slow down for the run-in, whatever the speed was
          value = END_ZONE; carry = 0; pickSpeed();
        } else if (before < TARGET && value >= TARGET) {
          // The target is never skipped: stop on it, let it be drawn, and keep it up
          // for the minimum dwell before the count moves on at whatever speed is next.
          value = TARGET; carry = 0;
          hold = minDwell();
          left = 0;
        } else if (value >= OVERRUN) {
          value = shown = OVERRUN;
          finish(false, 'timeout');
        }
      }
    },
    // The renderer calls this after each frame it draws.
    drawn() { shown = value; },
    setLevel(n) { level = Math.max(0, n); },
    getState() { return { phase, value, shown, rate, speed, level, result }; },
  };
}
