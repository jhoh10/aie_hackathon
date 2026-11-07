// Writes every prompt that doesn't depend on another model answer, so isolated writers can answer them.
//   node src/prepare.ts            write prompts for all cases
//   node src/prepare.ts tests <id> print the test-writer prompt for an answered claims file
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadCases, REPO } from './cases.ts';
import { diffFor, fullDiffFor } from './pipeline.ts';
import { CACHE } from './model.ts';
import * as P from './prompts.ts';

const [mode, id] = process.argv.slice(2);
if (mode === 'tests') {
  const raw = readFileSync(join(CACHE, id, 'claims.json'), 'utf8');
  const claims = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)).claims;
  const prompt = P.writeClaimTests(claims);
  writeFileSync(join(CACHE, id, 'claim_tests.prompt.txt'), prompt);
  process.stdout.write(prompt);
} else {
  for (const c of loadCases()) {
    const d = join(CACHE, c.id); mkdirSync(d, { recursive: true });
    const diff = diffFor(REPO, c.base, c.head);
    writeFileSync(join(d, 'claims.prompt.txt'), P.extractClaims(c.issue));
    writeFileSync(join(d, 'probes.prompt.txt'), P.writeProbes(diff));
    writeFileSync(join(d, 'agent_tests.prompt.txt'), P.writeAgentTests(c.issue, fullDiffFor(REPO, c.base, c.head)));
    writeFileSync(join(d, 'review.prompt.txt'), P.reviewDiff(c.issue, c.prTitle, c.prBody, fullDiffFor(REPO, c.base, c.head)));
    console.log(c.id, c.split, c.group, `diff ${diff.split('\n').length} lines`);
  }
}
