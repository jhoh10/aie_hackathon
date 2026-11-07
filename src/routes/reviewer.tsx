import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/reviewer')({
  validateSearch: (search: Record<string, unknown>): { example?: string } => typeof search['example'] === 'string' ? { example: search['example'] } : {},
  head: () => ({ meta: [{ title: 'Reviewer · Trust Issues' }, { name: 'description', content: 'Review four real change packets, comment on behavior and return feedback to the Developer.' }, { property: 'og:title', content: 'Reviewer · Trust Issues' }, { property: 'og:description', content: 'The reviewer reviews the change, not the code.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: () => null,
});