export type PacketItem = { id: string; text: string; detail: string; untested: boolean };
export type ReviewPacket = { title: string; summary: string; metrics: string; behaviors: PacketItem[]; tests: PacketItem[]; architecture: PacketItem[] };
export type Decision = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
export type ReviewComment = { id: number; item: string; text: string; blocking: boolean };
export type ReviewerState = { decision: Decision | null; comments: ReviewComment[] };

export function parseReviewPacket(markdown: string): ReviewPacket {
  if (markdown.length > 500_000) throw new Error('Review packet is too large.');
  const lines = markdown.split(/\r?\n/);
  const title = lines.find(line => line.startsWith('# Review: '))?.slice(10);
  const summary = lines.find(line => /^\*\*.+\*\*$/.test(line))?.slice(2, -2);
  const metrics = lines.find(line => line.startsWith('Claims proven '));
  if (!title || !summary || !metrics) throw new Error('Expected a review title, summary and Claims proven line.');
  const packet: ReviewPacket = { title, summary, metrics, behaviors: [], tests: [], architecture: [] };
  let section: PacketItem[] | undefined;
  const ids = new Set<string>();
  for (const line of lines) {
    if (line === '## What the PR does') section = packet.behaviors;
    else if (line === '## Tests') section = packet.tests;
    else if (line === '## Architecture') section = packet.architecture;
    else if (line.startsWith('## ')) section = undefined;
    else if (section && /^\|\s*[FTA]\d+\s*\|/.test(line)) {
      const cells = line.replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(cell => cell.trim());
      const [id, text, detail] = cells;
      if (!id || !text || !detail || cells.length !== 3 || ids.has(id)) throw new Error('Invalid or duplicate packet row.');
      ids.add(id); section.push({ id, text, detail, untested: detail.replace(/\*/g, '') === 'No test' });
    }
  }
  if (!packet.behaviors.length || !packet.tests.length) throw new Error('Expected behavior and test rows.');
  return packet;
}
export function addReviewComment(state: ReviewerState, item: string): ReviewerState {
  return { decision: state.decision ?? 'REQUEST_CHANGES', comments: [...state.comments, { id: Math.max(0, ...state.comments.map(c => c.id)) + 1, item, text: '', blocking: /^[FH]/.test(item) }] };
}
export function exportReview(packet: ReviewPacket, state: ReviewerState, reviewer: string, date: string): string {
  if (!state.decision) throw new Error('Choose a review decision.');
  const cell = (value: string) => value.replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
  return `# Review decision: ${packet.title}\n\nDecision: ${state.decision}\nReviewer: ${cell(reviewer.trim() || '<name>')} · ${date}\nPacket: .verify/review-packet.md\n\n## Comments\n\n| On | Comment | Blocking? | Becomes |\n| --- | --- | --- | --- |\n${state.comments.map(c => `| ${c.item} | ${cell(c.text)} | ${c.blocking ? 'Yes' : 'No'} | ${c.blocking ? 'claim or check edit in .verify/plan.md' : ''} |`).join('\n')}\n`;
}
export function diffForFile(diff: string, reference: string): string {
  const file = reference.replace(/`/g, '').trim();
  return diff.split(/(?=^diff --git )/m).find(part => part.split('\n')[0]?.endsWith(` b/${file}`)) ?? '';
}