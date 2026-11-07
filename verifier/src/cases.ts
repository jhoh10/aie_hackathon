// Turns the manifest into concrete base and head commits in a local clone.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from './sandbox.ts';

export const REPO = join(ROOT, '.work/repos/pocketbase');
const git = (args: string[], opts: any = {}) => execFileSync('git', args, { maxBuffer: 1 << 28, ...opts }).toString().trim();
const rp = (r: string) => git(['-C', REPO, 'rev-parse', r]);
const IDENT = ['-c', 'user.name=case-builder', '-c', 'user.email=case-builder@vouch.test', '-c', 'commit.gpgsign=false'];

export interface Case { id: string; split: 'dev' | 'holdout'; group: 'honest' | 'revert' | 'injected' | 'gaming'; expected: 'good' | 'bad'; base: string; head: string; issue: string; prTitle: string; prBody: string; defect?: string; }

function commitPatch(id: string, base: string, patch: string, reverse: boolean): string {
  const branch = `case/${id}`;
  try { return rp(`refs/heads/${branch}`); } catch {}
  const dir = mkdtempSync(join(tmpdir(), 'vouch-case-'));
  rmSync(dir, { recursive: true });
  git(['-C', REPO, 'worktree', 'add', '-q', '--detach', dir, base]);
  try {
    execFileSync('git', ['-C', dir, 'apply', ...(reverse ? ['-R'] : [])], { input: patch });
    git(['-C', dir, 'add', '-A']);
    git(['-C', dir, ...IDENT, 'commit', '-q', '-m', `case ${id}`]);
    const sha = git(['-C', dir, 'rev-parse', 'HEAD']);
    git(['-C', REPO, 'branch', '-f', branch, sha]);
    return sha;
  } finally { git(['-C', REPO, 'worktree', 'remove', '--force', dir]); }
}

export function loadCases(): Case[] {
  const m = JSON.parse(readFileSync(join(ROOT, 'cases/manifest.json'), 'utf8'));
  const out: Case[] = [];
  for (const h of m.honest) out.push({ id: h.id, split: h.split, group: 'honest', expected: 'good', base: rp(h.fix + '^'), head: rp(h.fix), issue: h.issue, prTitle: h.issue.split('.')[0], prBody: h.issue });
  for (const r of m.reverts) {
    const base = rp(r.fix);
    const patch = execFileSync('git', ['-C', REPO, 'show', '--format=', base, '--', '*.go'], { maxBuffer: 1 << 28 }).toString();
    out.push({ id: r.id, split: r.split, group: 'revert', expected: 'bad', base, head: commitPatch(r.id, base, patch, true), issue: r.issue, prTitle: r.issue.split('.')[0], prBody: r.issue, defect: r.defect });
  }
  const dir = join(ROOT, 'cases/authored');
  if (existsSync(dir)) for (const id of readdirSync(dir).sort()) {
    const p = join(dir, id);
    if (!existsSync(join(p, 'meta.json')) || !existsSync(join(p, 'patch.diff'))) continue;
    const meta = JSON.parse(readFileSync(join(p, 'meta.json'), 'utf8'));
    const base = rp(meta.fix_commit + '^');
    out.push({ id, split: m.authoredDevIds.includes(id) ? 'dev' : 'holdout', group: meta.group, expected: 'bad', base, head: commitPatch(id, base, readFileSync(join(p, 'patch.diff'), 'utf8'), false), issue: meta.issue, prTitle: meta.pr_title, prBody: meta.pr_body, defect: existsSync(join(p, 'secret.md')) ? readFileSync(join(p, 'secret.md'), 'utf8') : undefined });
  }
  return out;
}
