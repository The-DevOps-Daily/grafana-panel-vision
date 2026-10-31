// Our own count of DigitalOcean spend: every call any script recorded under
// results/ (including runs already in the repo), priced from its reported
// usage. The runner stops before this passes the cap. Set SPEND_CAP_USD to
// change the cap.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { callCost } from './cost.mjs';

const RESULTS = new URL('../results', import.meta.url).pathname;
export const CAP_USD = Number(process.env.SPEND_CAP_USD ?? 3.5);

function* jsonlFiles(dir) {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* jsonlFiles(p);
    else if (f.endsWith('.jsonl')) yield p;
  }
}

export function countedSpend() {
  let usd = 0;
  for (const f of jsonlFiles(RESULTS)) {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      if (!line) continue;
      const r = JSON.parse(line);
      if (r.usage && r.model) usd += callCost(r.model, r.usage);
    }
  }
  return usd;
}
