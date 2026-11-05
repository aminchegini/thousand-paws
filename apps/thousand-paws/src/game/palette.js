// Colours of the 3D arcade in one skin. Every value comes from the shared semantic
// tokens; tints and shades are mixed from them, never typed in.

import { colorNumber, defaultMode, modes, tokens } from '@paws/tokens';

const PRIZES = ['rose', 'tangerine', 'sun', 'mint', 'sky', 'grape', 'cherry'].map((name) => `color.prize.${name}`);
const DOTS = ['color.prize.mint', 'color.prize.rose', 'color.prize.sun', 'color.prize.grape'];

// Blends two colour numbers: t = 0 gives a, t = 1 gives b.
function mix(a, b, t) {
  const channel = (shift) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
const alpha = (n, a) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;

export const skinOf = (id) => (modes.includes(id) ? id : defaultMode);

export function paletteFor(skin) {
  const mode = skinOf(skin);
  const hex = (name) => tokens[mode][name];
  const num = (name) => colorNumber(mode, name);
  const light = num('color.text.default');
  const locked = {
    fur: mix(num('color.border.default'), num('color.text.muted'), 0.45),
    belly: num('color.text.muted'),
    bow: num('color.border.default'),
  };
  return {
    mode,
    room: num('color.surface.page'),
    floor: hex('color.surface.panel'),
    floorDots: DOTS.map((name) => alpha(num(name), 0.55)),
    wall: hex('color.surface.card'),
    wallStripe: alpha(light, 0.05),
    body: num('color.cabinet.body'),
    trim: num('color.cabinet.trim'),
    deck: num('color.text.on-accent'),
    button: num('color.action.primary'),
    buttonGlow: num('color.action.primary'),
    wood: num('color.surface.shelf'),
    woodDark: mix(num('color.surface.shelf'), num('color.surface.page'), 0.4),
    lock: num('color.accent.trim'),
    led: hex('color.display.on'),
    ledDim: hex('color.display.off'),
    tagBg: hex('color.text.on-accent'),
    tagText: hex('color.accent.trim'),
    tagLocked: hex('color.text.muted'),
    paw: hex('color.cabinet.trim'),
    bulbs: PRIZES.map(num),
    confetti: [...PRIZES.map(num), light],
    light,
    lightGround: num('color.border.default'),
    // A bear's colours: fur and bow are prize tokens, the belly is the fur lightened.
    bear(bear) {
      const fur = num(bear.fur);
      return { fur, belly: mix(fur, light, 0.7), bow: num(bear.bow), metalness: bear.metalness, locked };
    },
  };
}
