// Stage 5: how often does the bot's cross-check catch a wrong read?
// Offline: it re-uses every stage 2 answer (no new calls) and pairs it with the
// alert for the same panel (data/alerts.jsonl). A read is "wrong" when the
// scorer marks any of the four facts wrong, or the model gave no answer.
// Writes results/crosscheck.json and results/crosscheck.md.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { runStamp, readStamped } from '../lib/stamp.mjs';
import { scoreAnswer } from '../lib/score.mjs';
import { crossCheck } from '../lib/bot.mjs';
import { CONFIGS } from '../lib/configs.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const STAMP = runStamp();
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const truth = Object.fromEntries(read('data/truth.jsonl').map((t) => [t.id, t]));
const alerts = Object.fromEntries(read('data/alerts.jsonl').map((a) => [a.id, a]));
const TOLS = [0.05, 0.1, 0.2];

const order = Object.keys(CONFIGS);
const files = readdirSync(`${ROOT}results/raw`).filter((f) => f.endsWith('.jsonl')).sort((a, b) => order.indexOf(a.replace('.jsonl', '')) - order.indexOf(b.replace('.jsonl', '')));
const out = { stamp: STAMP, note: 'All runs. "missed" = wrong read the bot confirmed.', configs: {} };
const md = ['# Cross-check: does the bot catch wrong reads?', '', `Stamp ${STAMP}. Every recorded call, all runs. The bot compares the model's blind read with the alert payload: peak value within the tolerance, the series name when the alert has one, and the threshold state when the model reports a threshold. Peak time is not checked: the alert payload does not carry it.`, ''];
md.push('| configuration | tolerance | reads | wrong reads | caught | missed | right reads flagged | confirmed reads that were wrong |', '|---|---|---|---|---|---|---|---|');

for (const f of files) {
  const id = f.replace('.jsonl', '');
  const recs = readStamped(`${ROOT}results/raw/${f}`, STAMP);
  const calls = new Map();
  for (const r of recs) {
    const k = `${r.panel}#${r.run}`;
    const prev = calls.get(k);
    if (!prev || r.ok || !prev.ok) calls.set(k, r);
  }
  out.configs[id] = {};
  for (const tol of TOLS) {
    const c = { reads: 0, wrong: 0, caught: 0, missed: 0, rightFlagged: 0, confirmed: 0, confirmedWrong: 0, missedBy: {}, missedExamples: [] };
    for (const r of calls.values()) {
      const t = truth[r.panel];
      const s = r.answer ? scoreAnswer(t, r.answer) : { all: false, value: false, time: false, threshold: false, series: false, detail: {} };
      const chk = crossCheck(alerts[r.panel], r.answer, { tol });
      c.reads++;
      const wrong = !s.all;
      const flagged = chk.verdict !== 'confirmed';
      if (wrong) c.wrong++;
      if (wrong && flagged) c.caught++;
      if (!wrong && flagged) c.rightFlagged++;
      if (!flagged) c.confirmed++;
      if (wrong && !flagged) {
        c.missed++;
        c.confirmedWrong++;
        const fields = ['value', 'time', 'threshold', 'series'].filter((x) => !s[x]);
        const key = fields.join('+');
        c.missedBy[key] = (c.missedBy[key] ?? 0) + 1;
        if (c.missedExamples.length < 12) c.missedExamples.push({ panel: r.panel, run: r.run, wrong: fields, valueErrPct: s.detail.valueErr != null ? Math.round(s.detail.valueErr * 1000) / 10 : null, timeErrMin: s.detail.timeErrMin, said: r.answer, truth: { peak: t.peak.display, time: t.peak.hhmm, threshold: t.thresholdCrossed, top: t.topSeries } });
      }
    }
    out.configs[id][tol] = c;
    md.push(`| ${id} | ${tol * 100}% | ${c.reads} | ${c.wrong} | ${c.caught} (${c.wrong ? ((100 * c.caught) / c.wrong).toFixed(0) : '-'}%) | ${c.missed} | ${c.rightFlagged} | ${c.confirmedWrong} of ${c.confirmed} (${c.confirmed ? ((100 * c.confirmedWrong) / c.confirmed).toFixed(1) : '-'}%) |`);
  }
}
md.push('', '## What the 10% check let through, by the facts that were wrong', '');
for (const [id, byTol] of Object.entries(out.configs)) {
  const c = byTol[0.1];
  md.push(`- ${id}: ${Object.entries(c.missedBy).map(([k, v]) => `${k} ${v}`).join(', ') || 'nothing'}`);
}
writeFileSync(`${ROOT}results/crosscheck.json`, JSON.stringify(out, null, 2) + '\n');
writeFileSync(`${ROOT}results/crosscheck.md`, md.join('\n') + '\n');
console.log(md.join('\n'));
