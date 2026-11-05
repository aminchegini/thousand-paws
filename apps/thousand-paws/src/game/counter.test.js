import { describe, expect, it } from 'vitest';
import { createCounterSim, mulberry32 } from './counter.js';
import { nextBear } from './progress.js';
import { BEARS, DWELL, END_ZONE, OVERRUN, TARGET, describeResult } from './spec.js';

const FRAME = 1 / 60;

// Plays one round frame by frame the way the engine does: update, draw, record.
function playRound(seed, { level = 0, frame = FRAME, pressAt = null } = {}) {
  const sim = createCounterSim({}, { seed, level });
  const frames = [];
  sim.start();
  for (let i = 0; i < 60 * 120 && sim.getState().phase === 'running'; i++) {
    sim.update(frame);
    sim.drawn();
    frames.push(sim.getState().shown);
    if (pressAt !== null && sim.getState().shown === pressAt) sim.press();
  }
  return { frames, state: sim.getState() };
}

const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 1);

describe('counter simulation', () => {
  it('replays the same round from the same seed', () => {
    expect(playRound(42).frames).toEqual(playRound(42).frames);
    expect(playRound(42).frames).not.toEqual(playRound(43).frames);
  });

  it('never skips the target', () => {
    for (const seed of SEEDS) {
      for (const frame of [1 / 30, FRAME, 1 / 144]) {
        expect(playRound(seed, { frame }).frames).toContain(TARGET);
      }
    }
  });

  it('shows every number of the run-in', () => {
    for (const seed of SEEDS) {
      const seen = new Set(playRound(seed).frames);
      for (let n = END_ZONE; n <= TARGET; n++) expect(seen.has(n)).toBe(true);
    }
  });

  it('keeps the target on screen for at least the minimum dwell at every level', () => {
    for (let level = 0; level < BEARS.length; level++) {
      const want = DWELL.easy + (DWELL.hard - DWELL.easy) * (level / (BEARS.length - 1));
      for (const seed of SEEDS) {
        const { frames } = playRound(seed, { level, frame: 1 / 240 });
        const shownFor = frames.filter((n) => n === TARGET).length / 240;
        expect(shownFor).toBeGreaterThanOrEqual(want - 1 / 240);
      }
    }
  });

  it('changes speed, fast and slow, within a round', () => {
    const speeds = new Set();
    const sim = createCounterSim({ onSpeed: (name) => speeds.add(name) }, { seed: 5 });
    sim.start();
    while (sim.getState().phase === 'running') { sim.update(FRAME); sim.drawn(); }
    expect(speeds.has('run-in')).toBe(true);
    expect(speeds.size).toBeGreaterThanOrEqual(3);
  });

  it('wins only on the target', () => {
    const win = playRound(9, { pressAt: TARGET }).state;
    expect(win.phase).toBe('won');
    expect(win.result).toMatchObject({ win: true, value: TARGET, diff: 0 });

    const short = playRound(9, { pressAt: 997 }).state;
    expect(short.phase).toBe('missed');
    expect(short.result).toMatchObject({ win: false, reason: 'press', value: 997, diff: -3 });

    const over = playRound(9, { pressAt: 1002 }).state;
    expect(over.result).toMatchObject({ win: false, value: 1002, diff: 2 });
  });

  it('judges a press on the number last drawn, not the one being computed', () => {
    const sim = createCounterSim({}, { seed: 9 });
    sim.start();
    while (sim.getState().shown !== TARGET - 1) { sim.update(FRAME); sim.drawn(); }
    while (sim.getState().value !== TARGET) sim.update(FRAME);   // computed but not yet drawn
    expect(sim.press()).toMatchObject({ win: false, value: TARGET - 1 });
  });

  it('ends an unstopped round as a miss at the overrun', () => {
    const { state } = playRound(3);
    expect(state.phase).toBe('missed');
    expect(state.result).toMatchObject({ win: false, reason: 'timeout', value: OVERRUN });
  });

  it('ignores presses outside a round and restarts from zero', () => {
    const sim = createCounterSim({}, { seed: 1 });
    expect(sim.press()).toBeNull();
    sim.start();
    expect(sim.start()).toBe(false);
    sim.update(0.5); sim.drawn(); sim.press();
    expect(sim.start()).toBe(true);
    expect(sim.getState()).toMatchObject({ phase: 'running', value: 0, shown: 0, result: null });
  });
});

describe('bear unlocks', () => {
  it('holds the gold bear back until last and stops when the shelf is full', () => {
    const rnd = mulberry32(11);
    const unlocked = [];
    for (let bear = nextBear(unlocked, rnd); bear; bear = nextBear(unlocked, rnd)) unlocked.push(bear.id);
    expect(unlocked).toHaveLength(BEARS.length);
    expect(new Set(unlocked).size).toBe(BEARS.length);
    expect(unlocked.at(-1)).toBe('grand');
  });
});

describe('result sentence', () => {
  it('says what happened', () => {
    expect(describeResult({ win: true, bear: BEARS[0] })).toBe('1000! Bubblegum Bo joins your shelf.');
    expect(describeResult({ win: true, bear: null })).toBe('1000! Your shelf is already full.');
    expect(describeResult({ win: false, reason: 'press', value: 997, diff: -3 })).toBe('997. 3 short.');
    expect(describeResult({ win: false, reason: 'press', value: 1004, diff: 4 })).toBe('1004. 4 over.');
    expect(describeResult({ win: false, reason: 'timeout', value: 1050, diff: 50 })).toBe('Too late. The counter ran past 1000.');
  });
});
