// Compares two capture folders pixel for pixel and fails if any pixel differs.
//   node scripts/compare.mjs <before folder> <after folder>

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const [before, after] = process.argv.slice(2);
if (!before || !after) throw new Error('Usage: compare.mjs <before folder> <after folder>');
const read = (dir, name) => PNG.sync.read(readFileSync(join(dir, name)));

let total = 0;
for (const name of readdirSync(before).filter((f) => f.endsWith('.png')).sort()) {
  const a = read(before, name);
  const b = read(after, name);
  if (a.width !== b.width || a.height !== b.height) throw new Error(`${name}: sizes differ`);
  const changed = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0, includeAA: true });
  console.log(`${name}: ${changed} of ${a.width * a.height} pixels changed`);
  total += changed;
}
console.log(`Total changed pixels: ${total}`);
process.exitCode = total === 0 ? 0 : 1;
