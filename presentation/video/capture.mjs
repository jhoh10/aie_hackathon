// Captures 1080p frames of the deployed claim review app by driving headless Chrome over CDP.
// node capture.mjs <outdir>
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = process.argv[2];
const APP = 'https://verify-first-claim-review.lovable.app';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9337;
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cap-'))}`, '--hide-scrollbars', '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const waiting = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const n = ++id; waiting.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const go = async (path) => { await send('Page.navigate', { url: APP + path }); await sleep(4500); await js(`document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Dismiss'||b.getAttribute('aria-label')==='Dismiss')b.click()}); document.querySelectorAll('a[href*="lovable.dev"]').forEach(a=>{(a.closest('div[class*=fixed]')||a).style.display='none'}); 1`); await js(`document.documentElement.style.zoom='1.5'; 1`); await sleep(600); };
const clickText = (t, n = 'all') => js(`(()=>{const bs=[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()===${JSON.stringify(t)});(${JSON.stringify(n)}==='all'?bs:bs.slice(0,1)).forEach(b=>b.click());return bs.length})()`);
const scrollTo = (t) => js(`(()=>{const el=[...document.querySelectorAll('h2,h3,div,p,span')].find(e=>e.textContent.trim()===${JSON.stringify(t)});if(el){el.scrollIntoView({block:'start'});window.scrollBy(0,-120);return true}return false})()`);

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

await go('/developer');
await shot('app-dev-top');
await scrollTo('Intent');
await shot('app-dev-claims');
console.log('approve-all buttons', await clickText('Approve all'));
await sleep(600);
await js('window.scrollTo(0,0)'); await sleep(300);
await shot('app-dev-approved');
console.log('state', await js(`(document.body.innerText.match(/\\d+ of \\d+ claims approved/)||[''])[0]`));

await go('/reviewer');
await shot('app-review-top');
await scrollTo('What the PR does'); await sleep(400);
await shot('app-review-untested');

ws.close(); chrome.kill();
