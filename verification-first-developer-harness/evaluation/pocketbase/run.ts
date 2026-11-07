// Developer-side eval: default Claude Code vs the harness on PocketBase issues, graded by the upstream fix's tests.
//   node --no-warnings run.ts <task|all> <default|harness|both> [--model <id>] [--grade-only]
//   node --no-warnings run.ts all --report                 tables in results/report.md
//   node --no-warnings run.ts <task|all> --check-graders   hidden tests must fail before the fix and pass after it
// Needs: Docker, the `claude` CLI, and the PocketBase clone at verifier/.work/repos/pocketbase.
// Output: .work/<task>/<arm>/ (the agent's worktree) and results/<task>-<arm>.json.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const HERE = import.meta.dirname;
const ROOT = resolve(HERE, '../../..');
const REPO = join(ROOT, 'verifier/.work/repos/pocketbase');
const WORK = join(HERE, '.work');
const OUT = join(HERE, 'results');
const HARNESS = readFileSync(join(ROOT, 'verification-first-developer-harness/harness-prompt.md'), 'utf8').split('\n---\n').slice(1).join('\n---\n').trim();
const ENGINEER = readFileSync(join(HERE, 'engineer-prompt.md'), 'utf8');
const { tasks } = JSON.parse(readFileSync(join(HERE, 'tasks.json'), 'utf8'));

const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const [which = 'all', armArg = 'both'] = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const MODEL = flag('--model') ?? 'claude-opus-5-5';
const GRADE_ONLY = args.includes('--grade-only');
const MAX_ENGINEER_REPLIES = 3;
const BUDGET_USD = '5';

const git = (a: string[], cwd = REPO) => execFileSync('git', ['-C', cwd, ...a], { maxBuffer: 1 << 28 }).toString().trim();
const words = (s: string) => (s.match(/\S+/g) ?? []).length;
const log = (...a: unknown[]) => console.log(new Date().toTimeString().slice(0, 8), ...a);

// `go` and `gofmt` for the agent, running in Docker with the same paths as on the host. Old commits need json v1.
function shim(dir: string, fix: string) {
  const bin = join(dir, '.devh-bin'); mkdirSync(bin, { recursive: true });
  const exp = /^go 1\.(1\d|2[0-6])\b/m.test(git(['show', `${fix}^:go.mod`])) ? 'nojsonv2' : '';
  for (const tool of ['go', 'gofmt']) {
    writeFileSync(join(bin, tool), `#!/bin/sh
exec docker run --rm -i -v "${dir}:${dir}" -w "$PWD" -v vouch-gomod:/go/pkg/mod -v vouch-gocache:/root/.cache/go-build \\
  -e CGO_ENABLED=0 -e GOFLAGS=-buildvcs=false -e GOEXPERIMENT=${exp} golang:1.27-alpine ${tool} "$@"
`);
    chmodSync(join(bin, tool), 0o755);
  }
  return bin;
}

function worktree(dir: string, rev: string) {
  if (existsSync(dir)) { try { git(['worktree', 'remove', '--force', dir]); } catch {} rmSync(dir, { recursive: true, force: true }); }
  mkdirSync(resolve(dir, '..'), { recursive: true });
  git(['worktree', 'add', '-q', '--detach', dir, rev]);
}

function setup(task: any, arm: string) {
  const dir = join(WORK, task.id, arm);
  worktree(dir, `${task.fix}^`);
  return { dir, bin: shim(dir, task.fix) };
}

interface Turn { result: string; session_id: string; total_cost_usd: number; duration_ms: number; num_turns: number; is_error?: boolean }

function claude(cwd: string, bin: string, prompt: string, opts: { system?: string; resume?: string; tools?: boolean }): Turn {
  const a = ['-p', '--output-format', 'json', '--model', MODEL, '--max-budget-usd', BUDGET_USD];
  if (opts.tools === false) a.push('--tools', '');
  else a.push('--permission-mode', 'acceptEdits', '--allowedTools', 'Bash', 'Read', 'Edit', 'Write', 'Grep', 'Glob');
  if (opts.system) a.push('--append-system-prompt', opts.system);
  if (opts.resume) a.push('--resume', opts.resume);
  const r = spawnSync('claude', a, { cwd, input: prompt, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, maxBuffer: 1 << 28 });
  const out = r.stdout.toString();
  try { return JSON.parse(out.slice(out.indexOf('{'))); }
  catch { throw new Error(`claude failed (${r.status}): ${r.stderr.toString().slice(-800)}`); }
}

// The agent is waiting on the engineer if it ends on a question or asks for approval.
const waitsOnEngineer = (msg: string) => /\?\s*(\**)?\s*$/.test(msg.trim()) || /approve,? or edit/i.test(msg);

function engineerReply(task: any, message: string): Turn {
  const prompt = ENGINEER.replace('{{BRIEF}}', task.brief).replace('{{MESSAGE}}', message);
  return claude(WORK, '/nonexistent', prompt, { tools: false });
}

function runAgent(task: any, arm: string) {
  const { dir, bin } = setup(task, arm);
  const prompt = `${task.issue}\n\nThe repository is PocketBase (Go), checked out in the current directory. \`go\` runs in Docker, so the first build or test run is slow; test only the packages you touch.`;
  const transcript: { who: 'agent' | 'engineer'; text: string }[] = [];
  let cost = 0, ms = 0, agentTurns = 0, engineerCost = 0;
  const started = Date.now();
  log(task.id, arm, 'start');
  let t = claude(dir, bin, prompt, { system: arm === 'harness' ? HARNESS : undefined });
  for (let replies = 0; ; replies++) {
    cost += t.total_cost_usd ?? 0; ms += t.duration_ms ?? 0; agentTurns += t.num_turns ?? 0;
    transcript.push({ who: 'agent', text: t.result ?? '' });
    if (replies >= MAX_ENGINEER_REPLIES || !waitsOnEngineer(t.result ?? '')) break;
    const e = engineerReply(task, t.result);
    engineerCost += e.total_cost_usd ?? 0;
    transcript.push({ who: 'engineer', text: e.result });
    log(task.id, arm, 'engineer:', e.result.replace(/\s+/g, ' ').slice(0, 100));
    t = claude(dir, bin, e.result, { system: arm === 'harness' ? HARNESS : undefined, resume: t.session_id });
  }
  const engineerReplies = transcript.filter((x) => x.who === 'engineer').length;
  // Words the engineer had to read: every agent message they replied to, plus the final one.
  const wordsRead = transcript.filter((x) => x.who === 'agent').reduce((n, x) => n + words(x.text), 0);
  const diff = execFileSync('git', ['-C', dir, 'diff', '--', '.', ':!.devh-bin', ':!.verify'], { maxBuffer: 1 << 28 }).toString();
  writeFileSync(join(WORK, task.id, `${arm}.diff`), diff);
  return { task: task.id, kind: task.kind, arm, model: MODEL, costUsd: +cost.toFixed(4), engineerCostUsd: +engineerCost.toFixed(4), agentMs: ms, wallMs: Date.now() - started, agentTurns, engineerReplies, wordsRead, diffLines: diff.split('\n').filter((l) => /^[+-][^+-]/.test(l)).length, transcript };
}

// Hidden grader: a fresh copy at the base commit, plus the agent's diff, plus the upstream fix's test files.
function grade(task: any, arm: string) {
  const dir = join(WORK, task.id, `${arm}-grade`);
  worktree(dir, `${task.fix}^`);
  const bin = shim(dir, task.fix);
  const diffFile = join(WORK, task.id, `${arm}.diff`);
  const diff = existsSync(diffFile) ? readFileSync(diffFile, 'utf8') : '';
  if (diff.trim()) execFileSync('git', ['-C', dir, 'apply', '--whitespace=nowarn'], { input: diff });
  const tests = git(['show', '--format=', '--name-only', task.fix]).split('\n').filter((f) => f.endsWith('_test.go'));
  git(['-C', dir, 'checkout', task.fix, '--', ...tests], dir);
  const pkgs = [...new Set(tests.map((f) => './' + f.split('/').slice(0, -1).join('/')))];
  // Only the test functions the fix added or changed: the rest of the package has unrelated, environment-dependent failures.
  const patch = git(['show', '--format=', '-U0', task.fix, '--', ...tests]);
  const funcs: string[] = task.graderTests ?? [...new Set([...patch.matchAll(/^(?:@@.*?|\+)func (Test\w+)\(/gm)].map((m) => m[1]))];
  const r = spawnSync(join(bin, 'go'), ['test', '-count=1', '-run', `^(${funcs.join('|')})$`, ...pkgs], { cwd: dir, maxBuffer: 1 << 28 });
  const out = r.stdout.toString() + r.stderr.toString();
  git(['worktree', 'remove', '--force', dir]);
  // Passes only if at least one package actually ran tests ("[no tests to run]" alone doesn't count).
  return { pass: r.status === 0 && /^ok\s+\S+\s+[\d.]+s\s*$/m.test(out), tests, funcs, tail: out.split('\n').filter((l) => /^(--- FAIL|FAIL|ok|panic)|undefined|cannot/.test(l)).slice(0, 25).join('\n') };
}

mkdirSync(OUT, { recursive: true });
const picked = which === 'all' ? tasks : tasks.filter((t: any) => t.id === which);
if (!picked.length) { console.error(`No task "${which}". Tasks: ${tasks.map((t: any) => t.id).join(' ')}`); process.exit(1); }
if (args.includes('--report')) {
  // One row per task and arm, then totals for ambiguous and control tasks.
  const rows = tasks.flatMap((t: any) => ['default', 'harness'].map((arm) => {
    const f = join(OUT, `${t.id}-${arm}.json`);
    return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
  })).filter(Boolean);
  let md = '| Task | Kind | Arm | Hidden tests | Cost | Time | Engineer replies | Words read |\n|---|---|---|---|---|---|---|---|\n';
  for (const r of rows) md += `| ${r.task} | ${r.kind} | ${r.arm} | ${r.grade?.pass ? 'pass' : 'FAIL'} | $${r.costUsd.toFixed(2)} | ${(r.wallMs / 60000).toFixed(1)} min | ${r.engineerReplies} | ${r.wordsRead} |\n`;
  md += '\n| Kind | Arm | Passed | Total cost | Median time |\n|---|---|---|---|---|\n';
  for (const kind of ['ambiguous', 'control']) for (const arm of ['default', 'harness']) {
    const g = rows.filter((r: any) => r.kind === kind && r.arm === arm);
    if (!g.length) continue;
    const t = g.map((r: any) => r.wallMs).sort((a: number, b: number) => a - b)[Math.floor(g.length / 2)];
    md += `| ${kind} | ${arm} | ${g.filter((r: any) => r.grade?.pass).length} of ${g.length} | $${g.reduce((n: number, r: any) => n + r.costUsd, 0).toFixed(2)} | ${(t / 60000).toFixed(1)} min |\n`;
  }
  md += '\n## Did the setup surface the open question?\n\nMark each yes or no by hand: did the agent ask about it, or decide it explicitly in its plan?\n';
  for (const t of tasks) for (const arm of ['default', 'harness']) {
    const r = rows.find((x: any) => x.task === t.id && x.arm === arm);
    if (!r) continue;
    md += `\n### ${t.id} / ${arm}\n\n**Open question:** ${t.ambiguity}\n\n**First agent message:**\n\n> ${(r.transcript[0]?.text ?? '').slice(0, 1500).replace(/\n/g, '\n> ')}\n\n**Surfaced it?** \n`;
  }
  writeFileSync(join(OUT, 'report.md'), md);
  console.log(md.split('\n## ')[0]);
  process.exit(0);
}
if (args.includes('--check-graders')) {
  // Each grader must fail on the unfixed code and pass with the upstream fix, or it can't tell the arms apart.
  const rows: any[] = [];
  await Promise.all(picked.map(async (task: any) => {
    mkdirSync(join(WORK, task.id), { recursive: true });
    writeFileSync(join(WORK, task.id, 'base.diff'), '');
    writeFileSync(join(WORK, task.id, 'upstream.diff'), execFileSync('git', ['-C', REPO, 'show', '--format=', task.fix, '--', '*.go', ':!*_test.go'], { maxBuffer: 1 << 28 }));
    const [b, u] = [grade(task, 'base'), grade(task, 'upstream')];
    const ok = !b.pass && u.pass;
    rows.push({ id: task.id, ok, base: b.pass ? 'pass' : 'fail', upstream: u.pass ? 'pass' : 'fail', baseTail: b.tail, upstreamTail: u.tail });
    log(task.id, ok ? 'grader OK' : 'grader BAD', `base ${b.pass ? 'pass' : 'fail'}, upstream ${u.pass ? 'pass' : 'fail'}`);
  }));
  for (const r of rows) writeFileSync(join(OUT, `grader-${r.id}.json`), JSON.stringify(r, null, 2));
  process.exit(0);
}
const arms = armArg === 'both' ? ['default', 'harness'] : [armArg];
for (const task of picked) for (const arm of arms) {
  const file = join(OUT, `${task.id}-${arm}.json`);
  try {
    const r = GRADE_ONLY && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : runAgent(task, arm);
    r.grade = grade(task, arm);
    writeFileSync(file, JSON.stringify(r, null, 2));
    log(task.id, arm, r.grade.pass ? 'PASS' : 'FAIL', `$${r.costUsd}`, `${Math.round(r.wallMs / 1000)}s`, `${r.engineerReplies} replies`, `${r.wordsRead} words read`);
  } catch (e: any) { log(task.id, arm, 'ERROR', e.message); }
}
