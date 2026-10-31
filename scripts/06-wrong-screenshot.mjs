// Break it on purpose: attach the wrong screenshot to an alert.
// Each run-1 read is paired with the alert of ANOTHER panel with the same unit
// (the next one in the list), as if the notification carried a stale or wrong
// image. A working cross-check should say "could not confirm" almost every
// time. No API calls; re-uses stage 2 answers.
// Writes results/wrong-screenshot.md.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { runStamp } from '../lib/stamp.mjs';
import { readConfigRecords } from '../lib/records.mjs';
import { crossCheck } from '../lib/bot.mjs';
import { formatValue } from '../lib/units.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const STAMP = runStamp();
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const truths = read('data/truth.jsonl');
const alerts = Object.fromEntries(read('data/alerts.jsonl').map((a) => [a.id, a]));

// The wrong alert for each panel: the next panel (wrapping) with the same unit.
const wrongAlert = {};
for (const [i, t] of truths.entries()) {
  for (let k = 1; k < truths.length; k++) {
    const o = truths[(i + k) % truths.length];
    if (o.unit === t.unit) { wrongAlert[t.id] = alerts[o.id]; break; }
  }
}

const md = ['# Wrong screenshot attached to the alert', '', `Stamp ${STAMP}. Run 1 reads, each checked against the alert of another panel with the same unit. Tolerance 10%.`, '', '| configuration | reads | could not confirm | confirmed anyway |', '|---|---|---|---|'];
const examples = [];
for (const f of readdirSync(`${ROOT}results/raw`).filter((x) => x.endsWith('.jsonl'))) {
  const id = f.replace('.jsonl', '');
  const recs = readConfigRecords(`${ROOT}results/raw/${f}`, STAMP, f.replace('.jsonl', '')).filter((r) => r.run === 1);
  const last = new Map();
  for (const r of recs) if (!last.get(r.panel)?.ok) last.set(r.panel, r);
  let flagged = 0;
  let confirmed = 0;
  for (const r of last.values()) {
    const a = wrongAlert[r.panel];
    const chk = crossCheck(a, r.answer);
    if (chk.verdict === 'confirmed') {
      confirmed++;
      if (examples.length < 10) examples.push(`${id}: screenshot ${r.panel} confirmed for the alert of ${a.id} (alert max ${formatValue(a.unit, a.values.B)}, model read ${r.answer?.peak?.value} ${r.answer?.peak?.unit}${a.labels.series ? `, series ${a.labels.series} vs ${r.answer?.topSeries}` : ', alert on a sum, no series check'})`);
    } else flagged++;
  }
  md.push(`| ${id} | ${last.size} | ${flagged} | ${confirmed} |`);
}
md.push('', 'Confirmed anyway (the wrong alert happened to agree with the read):', '', ...examples.map((e) => `- ${e}`));
writeFileSync(`${ROOT}results/wrong-screenshot.md`, md.join('\n') + '\n');
console.log(md.join('\n'));
