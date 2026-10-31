// Reads DO_INFERENCE_KEY from the environment, or from a dotenv-style file
// (./.env by default, or the path in ENV_FILE). Nothing is printed.
import { existsSync, readFileSync } from 'node:fs';

export function inferenceKey() {
  if (process.env.DO_INFERENCE_KEY) return process.env.DO_INFERENCE_KEY;
  const file = process.env.ENV_FILE || new URL('../.env', import.meta.url).pathname;
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = /^\s*(?:export\s+)?DO_INFERENCE_KEY\s*=\s*"?([^"\n]+)"?/.exec(line);
      if (m) return m[1].trim();
    }
  }
  throw new Error('Set DO_INFERENCE_KEY (or put it in .env). See .env.example.');
}

export const BASE_URL = process.env.DO_INFERENCE_BASE_URL || 'https://inference.do-ai.run/v1';
