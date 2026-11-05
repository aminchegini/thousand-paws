// Token lint: counts, per app, the colour references that come from the shared
// semantic tokens and the ones that do not (raw colour values, stock Tailwind palette
// classes, deprecated legacy names). Token parity is the share that comes from tokens.
//
//   node scripts/token-lint.mjs            report, write metrics/token-parity.json
//   node scripts/token-lint.mjs --enforce  also exit 1 if anything is not from tokens

import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const legacyMap = require.resolve('@paws/tokens/legacy-map.json');
const codemod = join(dirname(require.resolve('@paws/codemod')), 'cli.js');

const APPS = ['thousand-paws'];
const SOURCE = new Set(['.js', '.jsx', '.ts', '.tsx', '.css']);
const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const UTILITY = 'bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|decoration|divide|accent|caret';
const SEMANTIC = 'surface|text|border|action|accent|feedback|display|cabinet|prize';

const RULES = {
  // #rgb, #rgba, #rrggbb, #rrggbbaa, 0xRRGGBB and rgb()/rgba() literals
  rawColour: [/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g, /\b0x[0-9a-fA-F]{6}\b/g, /\brgba?\(\s*\d/g],
  // bg-rose-500, text-amber-300 and the like
  stockTailwind: [new RegExp(`\\b(?:${UTILITY})-(?:${PALETTE})-(?:50|[1-9]00|950)\\b`, 'g'), new RegExp(`\\b(?:${UTILITY})-(?:white|black)\\b`, 'g')],
  // var(--color-surface-page), bg-surface-page, tokens.candy['color.surface.page'], tokenNumber(...)
  semantic: [
    /var\(--(?:color|space|radius|font-size)-[a-z0-9-]+\)/g,
    new RegExp(`\\b(?:${UTILITY})-(?:${SEMANTIC})-[a-z][a-z-]*\\b`, 'g'),
    /['"`](?:color|space|radius|font\.size)\.[a-z0-9.-]+['"`]/g,
  ],
};

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return SOURCE.has(extname(name)) && !/\.test\.[jt]sx?$/.test(name) ? [path] : [];
  });
}

function legacyCount(dir) {
  const run = spawnSync(process.execPath, [codemod, 'count', '--map', legacyMap, dir], { encoding: 'utf8' });
  if (!run.stdout.trim()) throw new Error(`paws-codemod count failed for ${dir}: ${run.stderr}`);
  return JSON.parse(run.stdout);
}

function lint(app) {
  const dir = join(root, 'apps', app, 'src');
  const counts = { semantic: 0, rawColour: 0, stockTailwind: 0, legacy: 0 };
  const worst = [];
  for (const file of files(dir)) {
    const text = readFileSync(file, 'utf8');
    let misses = 0;
    for (const [rule, patterns] of Object.entries(RULES)) {
      const hits = patterns.reduce((n, re) => n + (text.match(re)?.length ?? 0), 0);
      counts[rule] += hits;
      if (rule !== 'semantic') misses += hits;
    }
    if (misses) worst.push({ file: relative(root, file), notFromTokens: misses });
  }
  const legacy = legacyCount(dir);
  counts.legacy = legacy.total;
  const notFromTokens = counts.rawColour + counts.stockTailwind + counts.legacy;
  const all = counts.semantic + notFromTokens;
  return {
    app,
    ...counts,
    notFromTokens,
    parity: all ? Math.round((counts.semantic / all) * 1000) / 10 : 100,
    legacyByName: Object.fromEntries(Object.entries(legacy.byName).filter(([, n]) => n > 0)),
    files: worst.sort((a, b) => b.notFromTokens - a.notFromTokens),
  };
}

const apps = APPS.map(lint);
const total = apps.reduce((sum, a) => ({ semantic: sum.semantic + a.semantic, notFromTokens: sum.notFromTokens + a.notFromTokens }), { semantic: 0, notFromTokens: 0 });
const parity = total.semantic + total.notFromTokens ? Math.round((total.semantic / (total.semantic + total.notFromTokens)) * 1000) / 10 : 100;

mkdirSync(join(root, 'metrics'), { recursive: true });
writeFileSync(join(root, 'metrics', 'token-parity.json'), `${JSON.stringify({ parity, apps }, null, 2)}\n`);

const row = (cells) => cells.map((c, i) => String(c).padEnd(i ? 14 : 16)).join('');
console.log(row(['app', 'from tokens', 'raw colours', 'stock classes', 'legacy names', 'parity']));
for (const a of apps) console.log(row([a.app, a.semantic, a.rawColour, a.stockTailwind, a.legacy, `${a.parity}%`]));
console.log(`\nToken parity: ${parity}% (${total.semantic} of ${total.semantic + total.notFromTokens} colour references come from tokens)`);

if (process.argv.includes('--enforce') && total.notFromTokens > 0) {
  console.error(`\n${total.notFromTokens} colour references do not come from tokens. See metrics/token-parity.json.`);
  process.exitCode = 1;
}
