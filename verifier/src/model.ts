// Model step behind one interface. `files` reads answers produced out of band and records each
// prompt, so runs can be replayed exactly. `openai` works with OpenAI-compatible endpoints.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './sandbox.ts';

export interface Model { name: string; json(role: string, key: string, prompt: string): Promise<any>; }
export const CACHE = join(ROOT, '.work/gen');
export class Pending extends Error {}

function parse(text: string) {
  const t = text.trim().replace(/^```(?:json)?\s*/, '').replace(/```$/, '');
  return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
}
const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 12);

export function fileModel(dir = CACHE): Model {
  return { name: 'files', async json(role, key, prompt) {
    const base = join(dir, key); mkdirSync(base, { recursive: true });
    writeFileSync(join(base, `${role}.prompt.txt`), prompt);
    const answer = join(base, `${role}.json`);
    if (!existsSync(answer)) throw new Pending(`${key}/${role}`);
    return parse(readFileSync(answer, 'utf8'));
  } };
}

export function openaiModel(baseUrl: string, apiKey: string, model: string): Model {
  return { name: model, async json(role, key, prompt) {
    const base = join(CACHE, key); mkdirSync(base, { recursive: true });
    const answer = join(base, `${role}.${hash(prompt + model)}.json`);
    if (existsSync(answer)) return parse(readFileSync(answer, 'utf8'));
    let res: Response | undefined;
    for (let attempt = 0; attempt < 4; attempt++) {
      res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
        signal: AbortSignal.timeout(300000),
      });
      if (res.status !== 429 && res.status < 500) break;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt + Math.random() * 300));
    }
    if (!res!.ok) throw new Error(`model ${res!.status}: ${(await res!.text()).slice(0, 300)}`);
    const text = (await res!.json()).choices[0].message.content;
    writeFileSync(answer, text);
    return parse(text);
  } };
}

export function modelFromEnv(): Model {
  // Defaults to Meta's OpenAI-compatible Model API. Standard (non-contributor) models only, so code isn't used for training.
  const { MODEL_BASE_URL: u = 'https://api.meta.ai/v1', MODEL_API_KEY: k, MODEL_NAME: n = 'muse-spark-1.3' } = process.env;
  return k ? openaiModel(u, k, n) : fileModel();
}
