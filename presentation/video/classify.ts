export function classifyClaimScenario(base: Observed, head: Observed): ClaimScenarioResult {
  if (!base.stable || !head.stable) return 'inconclusive';
  if (head.status === 'setup_error') return 'inconclusive';
  if (head.status === 'fail') return 'failed';
  if (base.status === 'pass') return 'not_distinguishing';
  if (base.status === 'setup_error') return 'inconclusive';
  return 'proven';
}
