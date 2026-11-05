// Synthesised sound effects for the counter cabinet, built on the shared tone engine.

import { createToneEngine } from '@paws/arcade-kit';

export function createSfx() {
  const engine = createToneEngine();
  const { tone } = engine;
  return {
    unlock: engine.unlock,
    start() { tone(330, 0, 0.09, 'square', 0.1); tone(494, 0.08, 0.12, 'square', 0.1); },
    // One tick per number; the pitch climbs as the count nears the target.
    tick(progress = 0) { tone(700 + 900 * progress, 0, 0.03, 'triangle', 0.07); },
    press() { tone(180, 0, 0.1, 'square', 0.14, 90); },
    miss() { tone(300, 0, 0.22, 'triangle', 0.12); tone(220, 0.22, 0.4, 'triangle', 0.12); },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.18, 'square', 0.14));
      tone(1319, 0.44, 0.45, 'square', 0.14);
      [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.95 + i * 0.07, 0.16, 'triangle', 0.1));
    },
    setMuted(m) { engine.setMuted(m); },
    get muted() { return engine.muted; },
    destroy() { engine.destroy(); },
  };
}
