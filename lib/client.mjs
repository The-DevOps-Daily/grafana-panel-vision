// One chat completion with an image, against DigitalOcean Serverless Inference.
// Retries 429, 5xx and network errors with backoff. Each attempt is recorded;
// latency is the time of the attempt that succeeded, so waiting on a rate
// limit is never counted as model latency.
import { inferenceKey, BASE_URL } from './env.mjs';

const KEY = inferenceKey();
const BACKOFF_MS = [3000, 10000, 30000];

export async function askImage({ model, system, text, png, maxTokens = 4096, temperature = 0, timeoutMs = 180_000, extra = {} }) {
  const content = [{ type: 'text', text }];
  if (png) content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${png.toString('base64')}` } });
  const body = JSON.stringify({
    model,
    messages: [{ role: 'system', content: system }, { role: 'user', content }],
    max_tokens: maxTokens,
    temperature,
    ...extra,
  });
  const attempts = [];
  for (let a = 0; ; a++) {
    const r = await once(body, timeoutMs);
    attempts.push({ status: r.status, ms: r.ms, ...(r.error ? { error: r.error } : {}) });
    const retryable = r.status === 0 || r.status === 429 || r.status >= 500;
    if (r.ok || !retryable || a >= BACKOFF_MS.length) return { ...r, attempts };
    await new Promise((res) => setTimeout(res, BACKOFF_MS[a]));
  }
}

async function once(body, timeoutMs) {
  const t0 = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body,
    });
    const raw = await res.text();
    const ms = Math.round(performance.now() - t0);
    if (!res.ok) return { ok: false, status: res.status, ms, error: raw.slice(0, 500) };
    const j = JSON.parse(raw);
    const choice = j.choices?.[0] ?? {};
    const msg = choice.message ?? {};
    return {
      ok: true,
      status: res.status,
      ms,
      servedModel: j.model ?? null,
      finishReason: choice.finish_reason ?? null,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? null),
      reasoning: msg.reasoning_content ?? msg.reasoning ?? null,
      usage: j.usage ?? null,
    };
  } catch (err) {
    return { ok: false, status: 0, ms: Math.round(performance.now() - t0), error: String(err).slice(0, 300) };
  } finally {
    clearTimeout(timer);
  }
}
