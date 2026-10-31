// Stage 2: ask each model the same question about each panel.
//   node scripts/02-run-models.mjs --configs nemotron-3.5-super-vl,glm-5.3-flash --runs 1
//   node scripts/02-run-models.mjs --configs ... --runs 3 --subset   (runs 2 and 3 on the fixed subset)
//   node scripts/02-run-models.mjs --configs ... --panels p004,p021  (only these panels)
// Configurations (model + settings) are in lib/configs.mjs.
// One file per configuration, results/raw/<id>.jsonl, one writer each (lock file).
// Every line is stamped with the hash of this code and the inputs. A file with
// another stamp is refused: move it away to start again. Calls already on disk
// with an answer are skipped, so a crashed run resumes.
// Stops before our counted spend passes the cap in lib/spend.mjs.
import { readFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { askImage } from '../lib/client.mjs';
import { SYSTEM, QUESTION, parseAnswer } from '../lib/prompt.mjs';
import { callCost } from '../lib/cost.mjs';
import { countedSpend, CAP_USD } from '../lib/spend.mjs';
import { runStamp, lock, readStamped } from '../lib/stamp.mjs';
import { inSubset } from '../lib/subset.mjs';
import { config } from '../lib/configs.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? dflt : args[i + 1] ?? true;
};
const CONFIG_IDS = String(opt('configs', '')).split(',').filter(Boolean);
const RUNS = Number(opt('runs', 1));
const SUBSET_ONLY = args.includes('--subset');
const CONCURRENCY = Number(opt('concurrency', 3));
const ONLY = opt('panels', null) ? String(opt('panels')).split(',') : null;
if (!CONFIG_IDS.length) throw new Error('give --configs a,b,c (see lib/configs.mjs)');

const STAMP = runStamp();
const truths = readFileSync(`${ROOT}data/truth.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

mkdirSync(`${ROOT}results/raw`, { recursive: true });
let spent = countedSpend();
console.log(`stamp ${STAMP}; counted spend so far $${spent.toFixed(4)} of $${CAP_USD}`);

for (const id of CONFIG_IDS) {
  const cfg = config(id);
  const model = cfg.model;
  const file = `${ROOT}results/raw/${id}.jsonl`;
  const release = lock(file);
  const prior = existsSync(file) ? readStamped(file, STAMP) : [];
  const have = new Set(prior.filter((r) => r.ok).map((r) => `${r.panel}#${r.run}`));
  const jobs = [];
  for (let run = 1; run <= RUNS; run++) {
    for (const t of truths) {
      if (run > 1 && SUBSET_ONLY && !inSubset(t.id)) continue;
      if (ONLY && !ONLY.includes(t.id)) continue;
      if (!have.has(`${t.id}#${run}`)) jobs.push({ t, run });
    }
  }
  console.log(`${id}: ${jobs.length} calls to make (${have.size} already on disk)`);
  let stop = false;
  let n = 0;
  const worker = async () => {
    while (jobs.length && !stop) {
      spent = countedSpend(); // re-read: other runners may be writing too
      if (spent >= CAP_USD) {
        stop = true;
        console.log(`counted spend $${spent.toFixed(4)} reached the cap $${CAP_USD}: stopping`);
        break;
      }
      const { t, run } = jobs.shift();
      const png = readFileSync(`${ROOT}${t.file}`);
      const r = await askImage({ model, system: SYSTEM, text: QUESTION, png, maxTokens: cfg.maxTokens, temperature: cfg.temperature, extra: cfg.extra });
      const cost = r.ok ? callCost(model, r.usage) : 0;
      spent += cost;
      const parsed = r.ok ? parseAnswer(r.content) : null;
      const rec = {
        stamp: STAMP, ts: new Date().toISOString(), config: id, model, panel: t.id, run,
        ok: r.ok, status: r.status, attempts: r.attempts,
        latencyMs: r.ok ? r.ms : null,
        servedModel: r.servedModel ?? null, finishReason: r.finishReason ?? null,
        usage: r.usage ?? null, cost,
        content: r.content ?? null, reasoning: r.reasoning ?? null, error: r.error ?? null,
        answer: parsed?.ok ? parsed.answer : null, parseError: parsed && !parsed.ok ? parsed.error : null,
      };
      appendFileSync(file, JSON.stringify(rec) + '\n');
      n++;
      if (n % 10 === 0 || !r.ok) console.log(`${id} ${n} done, last ${t.id} run ${run}: HTTP ${r.status} ${r.ms} ms, spend $${spent.toFixed(4)}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  release();
  if (stop) break;
}
console.log(`finished; counted spend $${countedSpend().toFixed(4)}`);
