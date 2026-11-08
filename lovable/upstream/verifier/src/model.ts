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

// Token use per model call, saved next to the answer so metrics can read it later.
// When the endpoint reports no usage (or answers come from files), tokens are estimated at 4 characters each.
export interface Usage { role: string; model: string; prompt_tokens: number; completion_tokens: number; estimated: boolean; }
export const estimateTokens = (text: string) => Math.ceil(text.length / 4);
function saveUsage(base: string, role: string, u: Usage) { writeFileSync(join(base, `${role}.usage.json`), JSON.stringify(u)); }

export function fileModel(dir = CACHE): Model {
  return { name: 'files', async json(role, key, prompt) {
    const base = join(dir, key); mkdirSync(base, { recursive: true });
    writeFileSync(join(base, `${role}.prompt.txt`), prompt);
    const answer = join(base, `${role}.json`);
    if (!existsSync(answer)) throw new Pending(`${key}/${role}`);
    const text = readFileSync(answer, 'utf8');
    saveUsage(base, role, { role, model: 'files', prompt_tokens: estimateTokens(prompt), completion_tokens: estimateTokens(text), estimated: true });
    return parse(text);
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
    const data = await res!.json();
    const text = data.choices[0].message.content;
    writeFileSync(answer, text);
    const u = data.usage;
    saveUsage(base, role, u?.prompt_tokens != null
      ? { role, model, prompt_tokens: u.prompt_tokens, completion_tokens: u.completion_tokens ?? 0, estimated: false }
      : { role, model, prompt_tokens: estimateTokens(prompt), completion_tokens: estimateTokens(text), estimated: true });
    return parse(text);
  } };
}

export function modelFromEnv(env: Record<string, string | undefined> = process.env): Model {
  // Defaults to Meta's OpenAI-compatible Model API (Muse Spark). Standard (non-contributor) models only, so code isn't
  // used for training. The key is MODEL_API_KEY, or META_API_KEY as in the team .env. MODEL=files forces saved answers.
  // `||` rather than defaults, so empty lines copied from .env.example don't blank them out.
  const u = env.MODEL_BASE_URL || 'https://api.meta.ai/v1', n = env.MODEL_NAME || 'muse-spark-1.3';
  const k = env.MODEL_API_KEY || env.META_API_KEY;
  return k && env.MODEL !== 'files' ? openaiModel(u, k, n) : fileModel();
}
