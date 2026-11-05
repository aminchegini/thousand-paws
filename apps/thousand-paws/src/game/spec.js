// The rules of a round and the bears on the shelf. Every tunable number lives here.

export const TARGET = 1000;
export const OVERRUN = 1050;        // a round nobody stops ends here as a miss
export const END_ZONE = 985;        // from here on only the slow speeds are drawn

// The counter changes speed at random: each stretch lasts this many seconds...
export const SEGMENT = { min: 0.3, max: 1.2 };
// ...and runs at a rate (counts per second) drawn from one of these bands.
export const SPEEDS = [
  { name: 'crawl', min: 8, max: 20, weight: 0.25 },
  { name: 'medium', min: 40, max: 90, weight: 0.4 },
  { name: 'sprint', min: 180, max: 420, weight: 0.35 },
];
export const END_SPEED = { name: 'run-in', min: 6, max: 24 };

// Seconds the target is guaranteed to stay on screen: generous with an empty shelf,
// tight with a full one.
export const DWELL = { easy: 0.12, hard: 0.05 };

// Fur, belly and bow colours are hex numbers, ready for Three.js materials.
export const BEARS = [
  { id: 'bo', name: 'Bubblegum Bo', fur: 0xff6fb5, belly: 0xffd1e8, bow: 0x2ad4bd },
  { id: 'marmalade', name: 'Captain Marmalade', fur: 0xff8c2b, belly: 0xffe0b8, bow: 0x3b6cff },
  { id: 'minty', name: 'Minty McFluff', fur: 0x2ad4bd, belly: 0xd2fff6, bow: 0xff3f94 },
  { id: 'blitz', name: 'Blueberry Blitz', fur: 0x3f8cff, belly: 0xd6e8ff, bow: 0xffd23f },
  { id: 'gatsby', name: 'Grape Gatsby', fur: 0x9b5cff, belly: 0xeadcff, bow: 0xffd23f },
  { id: 'honey', name: 'Sunny Honeycomb', fur: 0xffc933, belly: 0xfff3c4, bow: 0xff5a36 },
  { id: 'fizz', name: 'Cherry Fizz', fur: 0xff3b4e, belly: 0xffd6da, bow: 0xffffff },
  // The gold one only comes off the shelf after every other bear.
  { id: 'grand', name: 'The Grand', fur: 0xe8b923, belly: 0xfff0b0, bow: 0xc1121f, metalness: 0.55, last: true },
];

export const bearById = (id) => BEARS.find((b) => b.id === id) || null;
export const pad4 = (n) => String(n).padStart(4, '0');

// One sentence for a finished round, used by the page and by screen readers.
export function describeResult(result) {
  if (!result) return '';
  if (result.win) {
    return result.bear ? `1000! ${result.bear.name} joins your shelf.` : '1000! Your shelf is already full.';
  }
  if (result.reason === 'timeout') return 'Too late. The counter ran past 1000.';
  const off = Math.abs(result.diff);
  return `${result.value}. ${off} ${result.diff < 0 ? 'short' : 'over'}.`;
}
