// Synthesised arcade audio: sound effects, a motor hum while the claw moves,
// and a looping chiptune tune, all on the shared tone engine. Its AudioContext is
// created lazily on the first user gesture (unlock), because browsers block audio
// before any interaction.

import { createToneEngine } from '@paws/arcade-kit';

const TEMPO = 132;
const SIXTEENTH = 60 / TEMPO / 4;
// Two bars in C major, 16th notes (0 = rest), MIDI note numbers.
const MELODY = [
  72, 76, 79, 76, 81, 79, 76, 72, 74, 77, 81, 77, 79, 76, 74, 71,
  72, 76, 79, 84, 83, 79, 76, 74, 72, 74, 76, 79, 76, 74, 72, 0,
];
// Bass on 8th notes.
const BASS = [48, 48, 43, 43, 53, 53, 55, 55, 48, 48, 52, 52, 53, 53, 55, 55];
const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

export function createSfx() {
  const engine = createToneEngine();
  const { tone } = engine;
  let musicWanted = true;
  let motorGain = null;
  let motorOn = false;
  let musicTimer = 0;
  let musicRunning = false;
  let nextNoteTime = 0;
  let step = 0;

  function unlock() {
    const ac = engine.unlock();
    if (ac && musicWanted) startMusic();
    return ac;
  }

  // ---- motor hum ----
  function setMotorGain() {
    const ac = engine.context;
    if (!motorGain || !ac) return;
    motorGain.gain.cancelScheduledValues(ac.currentTime);
    motorGain.gain.setTargetAtTime(motorOn && !engine.muted ? 0.05 : 0, ac.currentTime, 0.04);
  }
  function motor(on) {
    const ac = engine.context;
    if (!ac) return;
    if (!motorGain) {
      const o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter();
      o1.type = 'sawtooth'; o1.frequency.value = 48;
      o2.type = 'square'; o2.frequency.value = 97;
      f.type = 'lowpass'; f.frequency.value = 420;
      motorGain = ac.createGain(); motorGain.gain.value = 0;
      o1.connect(f); o2.connect(f); f.connect(motorGain).connect(ac.destination);
      o1.start(); o2.start();
    }
    if (on !== motorOn) { motorOn = on; setMotorGain(); }
  }

  // ---- music loop (lookahead scheduler) ----
  function musicTick() {
    const ac = engine.context;
    if (!ac || !musicRunning) return;
    while (nextNoteTime < ac.currentTime + 0.25) {
      const offset = nextNoteTime - ac.currentTime;
      if (musicWanted && !engine.muted) {
        const m = MELODY[step % MELODY.length];
        if (m) tone(midiHz(m), offset, SIXTEENTH * 0.85, 'square', 0.045);
        if (step % 2 === 0) tone(midiHz(BASS[(step / 2) % BASS.length]), offset, SIXTEENTH * 1.7, 'triangle', 0.07);
        if (step % 4 === 2) tone(6000, offset, 0.025, 'square', 0.012);
      }
      nextNoteTime += SIXTEENTH;
      step++;
    }
    musicTimer = setTimeout(musicTick, 90);
  }
  function startMusic() {
    const ac = engine.context;
    if (!ac || musicRunning) return;
    musicRunning = true;
    nextNoteTime = ac.currentTime + 0.1;
    musicTick();
  }
  function stopMusic() {
    musicRunning = false;
    clearTimeout(musicTimer);
  }

  return {
    unlock,
    motor,
    posTap() { tone(1760, 0, 0.07, 'sine', 0.16); },
    posApproved() { tone(1568, 0, 0.11, 'sine', 0.2); tone(2093, 0.13, 0.2, 'sine', 0.2); },
    drop() { tone(240, 0, 0.3, 'sawtooth', 0.1, 110); },
    grab() { tone(160, 0, 0.12, 'square', 0.14); tone(115, 0.1, 0.16, 'square', 0.14); },
    release() { tone(520, 0, 0.09, 'triangle', 0.12); },
    slip() { tone(420, 0, 0.32, 'sawtooth', 0.12, 110); },
    miss() { tone(300, 0, 0.22, 'triangle', 0.12); tone(220, 0.22, 0.4, 'triangle', 0.12); },
    buzz() { tone(110, 0, 0.25, 'square', 0.1); },
    crank() { for (let i = 0; i < 7; i++) { tone(2100, i * 0.12, 0.025, 'square', 0.07); tone(1050, i * 0.12 + 0.01, 0.03, 'triangle', 0.06); } },
    tick() { tone(1500, 0, 0.03, 'triangle', 0.09); tone(800, 0.015, 0.04, 'triangle', 0.06); },
    capsuleDrop() {
      tone(150, 0, 0.14, 'sine', 0.3, 70);
      tone(900, 0.04, 0.05, 'triangle', 0.1);
      for (let i = 0; i < 4; i++) tone(1300 - i * 120, 0.16 + i * 0.13, 0.03, 'triangle', 0.06);
    },
    pop() {
      tone(480, 0, 0.12, 'square', 0.12, 1500);
      [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.1 + i * 0.07, 0.16, 'triangle', 0.1));
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.18, 'square', 0.14));
      tone(1319, 0.44, 0.45, 'square', 0.14);
    },
    setMuted(m) { engine.setMuted(m); setMotorGain(); },
    setMusic(on) { musicWanted = !!on; if (musicWanted) startMusic(); },
    get muted() { return engine.muted; },
    get music() { return musicWanted; },
    destroy() {
      stopMusic();
      engine.destroy();
      motorGain = null; motorOn = false;
    },
  };
}
