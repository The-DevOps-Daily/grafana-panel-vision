// The on-call bot: the alert payload is the source of truth, the model only
// explains the screenshot. The model reads the image blind (it is not given
// the alert's numbers, so it cannot copy them). Rules then compare its read
// with the payload. If they disagree, the bot says "could not confirm" and
// posts the alert's own facts, not the model's.
import { readPeak, matchSeries, normThreshold } from './score.mjs';
import { formatValue } from './units.mjs';
import { SYSTEM, QUESTION, parseAnswer } from './prompt.mjs';

export const BOT_TOL = 0.1;

export function crossCheck(alert, answer, { tol = BOT_TOL } = {}) {
  if (!answer || typeof answer !== 'object') {
    return { verdict: 'could not confirm', checks: [{ fact: 'read', ok: false, note: 'the model gave no usable read' }] };
  }
  const checks = [];
  // 1. Peak value against the alert's reduced value (max over the same range).
  const p = readPeak(alert.unit, answer.peak);
  if (!p.ok) checks.push({ fact: 'peak value', ok: false, note: p.reason });
  else {
    const rel = (p.base - alert.values.B) / alert.values.B;
    checks.push({ fact: 'peak value', ok: Math.abs(rel) <= tol, model: p.base, alert: alert.values.B, rel });
  }
  // 2. Series, when the alert is for one series (a rule on a sum has none).
  if (alert.labels.series) {
    const m = matchSeries(answer.topSeries, [alert.labels.series]);
    checks.push({ fact: 'series', ok: m === alert.labels.series, model: answer.topSeries, alert: alert.labels.series });
  }
  // 3. Threshold state, when the model saw a threshold on the panel. The rule's
  //    threshold is not always drawn, so "no threshold" is not a disagreement.
  const th = normThreshold(answer.thresholdCrossed);
  if (th === 'yes' || th === 'no') {
    const expected = alert.status === 'firing' ? 'yes' : 'no';
    checks.push({ fact: 'threshold', ok: th === expected, model: th, alert: alert.status });
  }
  return { verdict: checks.every((c) => c.ok) ? 'confirmed' : 'could not confirm', checks };
}

export function message(alert, answer, check) {
  const facts = `${alert.labels.alertname}: ${alert.status}, max ${formatValue(alert.unit, alert.values.B)} over the last ${alert.range}, threshold ${formatValue(alert.unit, alert.threshold)}${alert.labels.series ? `, series ${alert.labels.series}` : ''}.`;
  if (check.verdict === 'confirmed') return `${facts}\nScreenshot (checked against the alert): ${answer.summary}`;
  const why = check.checks
    .filter((c) => !c.ok)
    .map((c) => {
      if (c.fact === 'peak value' && c.model != null) return `the screenshot reads ${formatValue(alert.unit, c.model)}, the alert says ${formatValue(alert.unit, c.alert)}`;
      if (c.fact === 'series') return `the screenshot names ${c.model}, the alert is for ${c.alert}`;
      if (c.fact === 'threshold') return `the screenshot says threshold crossed: ${c.model}, the alert is ${c.alert}`;
      return c.note;
    })
    .join('; ');
  return `${facts}\nCould not confirm the screenshot (${why}). Open the dashboard before you trust the image.`;
}

// The whole bot: read the image blind, check it, and write the message.
export async function explainAlert({ alert, png, model, extra = {}, maxTokens = 1024, temperature = 0 }) {
  const { askImage } = await import('./client.mjs');
  const r = await askImage({ model, system: SYSTEM, text: QUESTION, png, extra, maxTokens, temperature });
  const parsed = r.ok ? parseAnswer(r.content) : { ok: false };
  const answer = parsed.ok ? parsed.answer : null;
  const check = crossCheck(alert, answer);
  return { verdict: check.verdict, message: message(alert, answer, check), answer, check, call: r };
}
