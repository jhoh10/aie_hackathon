// Runs one scenario over HTTP from inside the no-egress network. Deterministic: no model involved.
const input = JSON.parse(await new Response(process.stdin).text());
const { scenario, baseUrl, superuser } = input;
const vars = {};
const fill = (v) => typeof v === 'string'
  ? v.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m))
  : Array.isArray(v) ? v.map(fill)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)])) : v;
const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const subset = (want, got, at = '$') => {
  if (want === null || typeof want !== 'object') return want === got ? [] : [`${at}: wanted ${JSON.stringify(want)}, got ${JSON.stringify(got)}`];
  if (got === null || typeof got !== 'object') return [`${at}: wanted object/array, got ${JSON.stringify(got)}`];
  return Object.entries(want).flatMap(([k, v]) => subset(v, got[k], `${at}.${k}`));
};
async function call(method, path, headers = {}, json) {
  const res = await fetch(baseUrl + path, {
    method, signal: AbortSignal.timeout(15000),
    headers: { ...(json !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  const text = await res.text();
  let body = text; try { body = JSON.parse(text); } catch {}
  return { status: res.status, body };
}
const out = { id: scenario.id, status: 'pass', steps: [] };
try {
  const auth = await call('POST', '/api/collections/_superusers/auth-with-password', {}, { identity: superuser.email, password: superuser.password });
  if (auth.status !== 200) throw new Error('superuser login failed: ' + auth.status);
  vars.superuser_token = auth.body.token;
  for (const step of scenario.steps) {
    const headers = fill(step.headers ?? {});
    if (step.as === 'superuser' && !headers.Authorization) headers.Authorization = vars.superuser_token;
    else if (step.as && step.as !== 'anon' && step.as !== 'superuser' && !headers.Authorization) headers.Authorization = fill(`{{${step.as}}}`);
    const path = fill(step.path), json = fill(step.json);
    const rec = { id: step.id, setup: !!step.setup, method: step.method, path, requestJson: json, requestHeaderNames: Object.keys(headers) };
    let failures = [];
    try {
      const res = await call(step.method, path, headers, json);
      rec.responseStatus = res.status; rec.responseBody = res.body;
      const e = step.expect ?? {};
      if (e.status !== undefined && e.status !== res.status) failures.push(`status: wanted ${e.status}, got ${res.status}`);
      if (e.json !== undefined) failures.push(...subset(fill(e.json), res.body));
      for (const [p, v] of Object.entries(fill(e.paths ?? {}))) failures.push(...subset(v, get(res.body, p), '$.' + p));
      for (const p of e.absent ?? []) if (get(res.body, p) !== undefined) failures.push(`$.${p}: expected absent`);
      for (const [name, p] of Object.entries(step.save ?? {})) { const v = get(res.body, p); if (v === undefined) failures.push(`save ${name}: nothing at ${p}`); else vars[name] = v; }
    } catch (err) { failures.push('request error: ' + err.message); }
    rec.failures = failures; out.steps.push(rec);
    if (failures.length) { out.status = step.setup ? 'setup_error' : 'fail'; if (scenario.kind !== 'probe' || step.setup) break; }
  }
} catch (err) { out.status = 'setup_error'; out.error = String(err.message ?? err); }
process.stdout.write(JSON.stringify(out));
