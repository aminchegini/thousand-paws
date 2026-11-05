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

// Fur and bow colours are semantic token names; the palette turns them into colours.
export const BEARS = [
  { id: 'bo', name: 'Bubblegum Bo', fur: 'color.prize.rose', bow: 'color.prize.mint' },
  { id: 'marmalade', name: 'Captain Marmalade', fur: 'color.prize.tangerine', bow: 'color.prize.sky' },
  { id: 'minty', name: 'Minty McFluff', fur: 'color.prize.mint', bow: 'color.prize.rose' },
  { id: 'blitz', name: 'Blueberry Blitz', fur: 'color.prize.sky', bow: 'color.prize.sun' },
  { id: 'gatsby', name: 'Grape Gatsby', fur: 'color.prize.grape', bow: 'color.prize.sun' },
  { id: 'honey', name: 'Sunny Honeycomb', fur: 'color.prize.sun', bow: 'color.prize.cherry' },
  { id: 'fizz', name: 'Cherry Fizz', fur: 'color.prize.cherry', bow: 'color.text.default' },
  // The gold one only comes off the shelf after every other bear.
  { id: 'grand', name: 'The Grand', fur: 'color.prize.gold', bow: 'color.prize.cherry', metalness: 0.55, last: true },
];

// The cabinet finishes. Each is a mode of the Semantic variable collection in Figma.
export const SKINS = [
  { id: 'candy', name: 'Candy Arcade' },
  { id: 'neon', name: 'Neon Night' },
  { id: 'diner', name: 'Retro Diner' },
  { id: 'walnut', name: 'Walnut & Brass' },
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
