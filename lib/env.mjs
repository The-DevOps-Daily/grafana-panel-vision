// Reads DO_INFERENCE_KEY from the environment, or from a dotenv-style file
// (./.env by default, or the path in ENV_FILE). Nothing is printed.
import { existsSync, readFileSync } from 'node:fs';

export function envValue(name) {
  if (process.env[name]) return process.env[name];
  const file = process.env.ENV_FILE || new URL('../.env', import.meta.url).pathname;
  if (existsSync(file)) {
    const re = new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*"?([^"\\n]+)"?`);
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = re.exec(line);
      if (m) return m[1].trim();
    }
  }
  return null;
}

export function inferenceKey() {
  const key = envValue('DO_INFERENCE_KEY');
  if (!key) throw new Error('Set DO_INFERENCE_KEY (or put it in .env). See .env.example.');
  return key;
}

export const BASE_URL = process.env.DO_INFERENCE_BASE_URL || 'https://inference.do-ai.run/v1';
