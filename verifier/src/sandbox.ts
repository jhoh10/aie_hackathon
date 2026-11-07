// Builds commits into images and runs one scenario per fresh, no-egress container.
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { ScenarioRun } from './normalize.ts';

const exec = promisify(execFile);
export const ROOT = resolve(import.meta.dirname, '..');
const NET = 'vouch-sandbox';
const big = { maxBuffer: 256 * 1024 * 1024 };

export async function sh(cmd: string, args: string[], opts: Record<string, unknown> = {}) {
  const { stdout } = await exec(cmd, args, { ...big, ...opts });
  return stdout as unknown as string;
}
const docker = (...a: string[]) => sh('docker', a);

export async function ensureNetwork() {
  await docker('network', 'inspect', NET).catch(() => docker('network', 'create', '--internal', NET));
}

export async function buildImage(repo: string, sha: string): Promise<string> {
  const tag = `vouch-app:${sha.slice(0, 12)}`;
  if (await docker('image', 'inspect', tag).then(() => true, () => false)) return tag;
  const dir = await mkdtemp(join(tmpdir(), 'vouch-build-'));
  try {
    await sh('sh', ['-c', `git -C "$0" archive "$1" | tar -x -C "$2"`, repo, sha, dir]);
    await docker('build', '-q', '-t', tag, '-f', join(ROOT, 'docker/app.Dockerfile'), dir);
    return tag;
  } finally { await rm(dir, { recursive: true, force: true }); }
}

export interface RunOptions { image: string; scenario: unknown; covVolume?: string; }

export async function runScenario({ image, scenario, covVolume }: RunOptions): Promise<ScenarioRun> {
  const name = 'vouch-' + randomBytes(6).toString('hex');
  // Throwaway credentials, generated per run and usable only inside the internal network.
  const superuser = { email: `su-${name}@vouch.test`, password: randomBytes(16).toString('hex') };
  const boot = `pocketbase superuser upsert "$SU_EMAIL" "$SU_PASS" --dir /data >/dev/null && exec pocketbase serve --http 0.0.0.0:8090 --dir /data`;
  await docker('run', '-d', '--name', name, '--network', NET, '--memory', '768m', '--cpus', '2', '--pids-limit', '512',
    '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only',
    '--tmpfs', '/data:rw,uid=10001,gid=10001', '--tmpfs', '/tmp',
    ...(covVolume ? ['-v', `${covVolume}:/cov`] : ['--tmpfs', '/cov:rw,uid=10001,gid=10001']),
    '-e', `SU_EMAIL=${superuser.email}`, '-e', `SU_PASS=${superuser.password}`,
    image, 'sh', '-c', boot);
  try {
    const input = JSON.stringify({ scenario, baseUrl: `http://${name}:8090`, superuser });
    const wrapper = `for i in $(seq 1 60); do wget -q -O- http://${name}:8090/api/health >/dev/null 2>&1 && break; sleep 0.25; done; exec node --no-warnings /r.mjs`;
    const out = await new Promise<string>((res, rej) => {
      const p = spawn('docker', ['run', '--rm', '-i', '--network', NET, '--memory', '256m', '--cap-drop', 'ALL',
        '-v', `${join(ROOT, 'src/runner.mjs')}:/r.mjs:ro`, 'node:23-alpine', 'sh', '-c', wrapper]);
      let o = '', e = '';
      p.stdout.on('data', (d) => (o += d)); p.stderr.on('data', (d) => (e += d));
      p.on('close', (code) => (code === 0 ? res(o) : rej(new Error(`runner exit ${code}: ${e.slice(0, 500)}`))));
      p.stdin.end(input);
    });
    return JSON.parse(out);
  } catch (err) {
    return { id: (scenario as { id: string }).id, status: 'setup_error', steps: [], error: String(err) };
  } finally {
    await docker('stop', '-t', '5', name).catch(() => {});
    await docker('rm', '-f', name).catch(() => {});
  }
}

export async function newCoverageVolume(): Promise<string> {
  const v = 'vouch-cov-' + randomBytes(6).toString('hex');
  await docker('volume', 'create', v);
  return v;
}

export async function readCoverage(volume: string): Promise<string> {
  const out = await sh('docker', ['run', '--rm', '--network', 'none', '-v', `${volume}:/cov:ro`, 'golang:1.27-alpine',
    'sh', '-c', 'go tool covdata textfmt -i=/cov -o=/tmp/c.txt && cat /tmp/c.txt']);
  await docker('volume', 'rm', volume).catch(() => {});
  return out;
}

export async function pool<T, R>(items: T[], n: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}
export { mkdir, writeFile };
