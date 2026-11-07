// GitHub integration through the gh CLI. Uses commit statuses and polling, so it needs no public webhook.
import { sh } from './sandbox.ts';
export const CONTEXT = 'vouch/verify';
const gh = (...a: string[]) => sh('gh', a);

export async function setStatus(repo: string, sha: string, state: 'pending' | 'success' | 'failure' | 'error', description: string, url?: string) {
  await gh('api', '-X', 'POST', `repos/${repo}/statuses/${sha}`, '-f', `state=${state}`, '-f', `context=${CONTEXT}`, '-f', `description=${description.slice(0, 140)}`, ...(url && !/localhost|127\.0\.0\.1/.test(url) ? ['-f', `target_url=${url}`] : []));
}
export async function comment(repo: string, pr: number, body: string) { await gh('pr', 'comment', String(pr), '-R', repo, '--body', body); }
export async function openPrs(repo: string): Promise<any[]> {
  return JSON.parse(await gh('pr', 'list', '-R', repo, '--state', 'open', '--json', 'number,title,body,headRefOid,baseRefOid,url', '--limit', '20'));
}
export async function linkedIssue(repo: string, body: string): Promise<string | null> {
  const m = body.match(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/i);
  if (!m) return null;
  return JSON.parse(await gh('issue', 'view', m[1], '-R', repo, '--json', 'title,body')) as any;
}
export async function fetchPr(clone: string, number: number) {
  await sh('git', ['-C', clone, 'fetch', '-q', 'origin', `pull/${number}/head`, 'HEAD']);
}
