// The one question every model gets, per panel. The bot in lib/bot.mjs asks the
// same question, without the alert's numbers, so the model cannot copy them.
export const SYSTEM = 'You read Grafana dashboard panel screenshots for an on-call engineer. Answer with one JSON object and nothing else.';

export const QUESTION = `The image is one Grafana time-series panel. The x-axis shows the time of day in UTC. Read the panel and answer with a JSON object with exactly these keys:
{
  "peak": {"value": <number>, "unit": "<the unit as written on the y-axis labels, for example ms, s, %, req/s, K req/s, MiB, GiB>"},
  "peakTime": "<HH:MM, the x-axis time of the highest point>",
  "thresholdCrossed": "<yes | no | no threshold>",
  "topSeries": "<the legend name of the series with the highest values>",
  "summary": "<one line for the on-call engineer: what the panel shows>"
}
Rules:
- peak is the highest point drawn, read against the y-axis. If the series are stacked (filled bands on top of each other), use the top edge of the stack.
- A threshold is a red dashed line or a red shaded region. thresholdCrossed is "yes" if the data goes above it, "no" if the data stays below it, and "no threshold" if the panel shows no threshold.
- topSeries: for stacked bands, the series whose own band is thickest at the peak, not the band drawn on top. With one series, give its name.
- Give only the JSON object.`;

// Pull the first JSON object out of a reply (models add code fences or prose).
export function parseAnswer(text) {
  if (!text) return { ok: false, error: 'empty reply' };
  const t = text.replace(/<think>[\s\S]*?<\/think>/g, '');
  const start = t.indexOf('{');
  if (start < 0) return { ok: false, error: 'no JSON object' };
  let depth = 0;
  let inStr = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) {
      try {
        return { ok: true, answer: JSON.parse(t.slice(start, i + 1)) };
      } catch (e) {
        return { ok: false, error: `bad JSON: ${e.message}` };
      }
    }
  }
  return { ok: false, error: 'unterminated JSON object' };
}
