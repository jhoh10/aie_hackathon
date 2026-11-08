import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/developer')({
  validateSearch: (search: Record<string, unknown>): { plan?: string } => typeof search['plan'] === 'string' ? { plan: search['plan'] } : {},
  head: () => ({ meta: [{ title: 'Developer · Trust Issues' }, { name: 'description', content: 'Approve exact claims and evidence before the coding agent builds.' }, { property: 'og:title', content: 'Developer · Trust Issues' }, { property: 'og:description', content: 'The engineer approves the claims, not the code.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: () => null,
});