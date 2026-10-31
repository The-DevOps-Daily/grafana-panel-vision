// Every recorded call carries a stamp: a hash of the runner code and of the
// inputs (prompt, ground truth, panel PNGs). The scorer refuses files with no
// stamp, with mixed stamps, or with a stamp from other code or inputs.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, openSync, closeSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const CODE = ['lib/client.mjs', 'lib/prompt.mjs', 'lib/stamp.mjs', 'lib/subset.mjs', 'lib/configs.mjs', 'scripts/02-run-models.mjs'];

export function runStamp() {
  const h = createHash('sha256');
  const files = [
    ...CODE,
    'data/truth.jsonl',
    ...readdirSync(join(ROOT, 'data/panels')).filter((f) => f.endsWith('.png')).sort().map((f) => `data/panels/${f}`),
  ];
  for (const f of files) h.update(f).update(readFileSync(join(ROOT, f)));
  return h.digest('hex').slice(0, 16);
}

// One writer per results file: a second run on the same file refuses to start.
export function lock(file) {
  const lockFile = `${file}.lock`;
  if (existsSync(lockFile)) throw new Error(`${lockFile} exists: another run is writing ${file}`);
  closeSync(openSync(lockFile, 'wx'));
  const release = () => {
    try {
      unlinkSync(lockFile);
    } catch {}
  };
  process.on('exit', release);
  process.on('SIGINT', () => process.exit(130));
  process.on('SIGTERM', () => process.exit(143));
  return release;
}

// Read a stamped JSON-lines file. Throws on an unstamped line, on mixed stamps,
// or (when `expect` is given) on a stamp that is not the current one.
export function readStamped(file, expect) {
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const stamps = new Set(lines.map((l) => l.stamp));
  if (stamps.has(undefined) || stamps.has(null)) throw new Error(`${file}: unstamped records`);
  if (stamps.size > 1) throw new Error(`${file}: mixed stamps ${[...stamps].join(', ')}`);
  if (expect && lines.length && !stamps.has(expect)) throw new Error(`${file}: stamp ${[...stamps][0]} is not the current code and inputs (${expect})`);
  return lines;
}
