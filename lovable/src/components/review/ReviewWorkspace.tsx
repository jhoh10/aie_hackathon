import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronRight, CircleHelp, Copy, FileUp, GitPullRequest, LockKeyhole, Moon, RotateCcw, ShieldCheck, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CATEGORY, PLANS, STRENGTH } from '@/data/plans';
import { changeApproval, claimsOf, freshReview, lockReview, parsePlanJson, readPreference, savePreference, strongest, STRENGTH_ORDER, type ReviewState } from '@/data/review-state';
import type { Plan, Strength } from '@/data/types';
import { parseSourceHtml, reconcileSource, SOURCE_URL, startSourceRefresh } from '@/data/source-refresh';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { feedbackPlan } from '@/data/feedback';
import { useTrust } from './TrustContext';
import { cn } from '@/lib/utils';

const POLICY_KEY = 'vf-auto-approve-regression';
const THEME_KEY = 'claims-review-theme';
const initialPlans: Record<string, Plan> = PLANS;

function BoldText({ text }: { text: string }) {
  return <>{text.split(/(<b>.*?<\/b>)/g).map((part, i) => part.startsWith('<b>') ? <strong key={i}>{part.slice(3, -4)}</strong> : part)}</>;
}
function StrengthChip({ strength, definitions = STRENGTH }: { strength: Strength; definitions?: typeof STRENGTH }) {
  return <Tooltip><TooltipTrigger asChild><Badge variant="outline" className={cn('strength-chip', `strength-${strength}`)}>{definitions[strength].label}</Badge></TooltipTrigger><TooltipContent>{definitions[strength].tip}</TooltipContent></Tooltip>;
}
function IconTool({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) {
  return <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={label} onClick={onClick}>{children}</Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}

export function ReviewWorkspace({ visible = true }: { visible?: boolean }) {
  const location = useLocation(); const navigate = useNavigate(); const { edits, feedbackVersion } = useTrust();
  const [plans, setPlans] = useState(initialPlans);
  const [active, setActive] = useState('bugfix');
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const [categories, setCategories] = useState(CATEGORY);
  const [strengths, setStrengths] = useState(STRENGTH);
  const [lockedJson, setLockedJson] = useState<Record<string, string>>({});
  const [sourceStatus, setSourceStatus] = useState('Checking GitHub…');
  const latest = useRef({ plans, reviews, policy: false });
  const [policy, setPolicy] = useState(false);
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [isDark, setIsDark] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const plan = plans[active] ?? PLANS.bugfix;
  const state = reviews[active] ?? freshReview(plan, policy);
  const claims = claimsOf(plan);
  const done = claims.filter(c => state.approved.has(c.id)).length;
  const routine = claims.filter(c => c.category.routine);
  const totalChecks = claims.reduce((sum, c) => sum + c.evidence.length, 0);
  const json = lockedJson[active] ?? JSON.stringify({ claims: claims.map(({ id, text, kind, category }) => ({ id, text, kind, group: categories[category.cat].name })) }, null, 2);

  useEffect(() => { latest.current = { plans, reviews, policy }; }, [plans, reviews, policy]);
  useEffect(() => {
    let disposed = false;
    let previousHtml = '';
    const controller = new AbortController();
    const stop = startSourceRefresh(async () => {
      if (disposed) return;
      setSourceStatus('Checking GitHub…');
      const response = await fetch(SOURCE_URL, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
      const html = await response.text();
      if (disposed) return;
      if (html !== previousHtml) {
        setSourceStatus('Refreshing claims…');
        const source = parseSourceHtml(html);
        const current = latest.current;
        const next = reconcileSource(current.plans, current.reviews, source.plans, current.policy);
        latest.current = { ...next, policy: current.policy };
        setPlans(next.plans); setReviews(next.reviews);
        setCategories(source.categories); setStrengths(source.strengths);
        setActive(id => next.plans[id] ? id : 'bugfix');
        setFocused(null);
        previousHtml = html;
      }
      setSourceStatus(`GitHub checked ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    }, () => setSourceStatus('GitHub unavailable · keeping saved source; retrying in 1 minute'));
    return () => { disposed = true; controller.abort(); stop(); };
  }, []);

  useEffect(() => {
    const savedPolicy = readPreference(POLICY_KEY) === '1';
    setPolicy(savedPolicy);
    setReviews({ bugfix: freshReview(PLANS.bugfix, savedPolicy) });
    const savedTheme = readPreference(THEME_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
  }, []);
  useEffect(() => {
    const requested = new URLSearchParams(location.searchStr).get('plan');
    if (requested && plans[requested]) { setActive(requested); setFocused(null); }
  }, [location.searchStr, plans]);
  useEffect(() => {
    if (!edits.length) return;
    const next = feedbackPlan(PLANS.bugfix, edits);
    setPlans(previous => ({ ...previous, feedback: next }));
    setReviews(previous => ({ ...previous, feedback: freshReview(next, false) }));
    setActive('feedback'); setFocused(null);
  }, [feedbackVersion]);

  function update(fn: (current: ReviewState) => ReviewState) {
    setReviews(previous => ({ ...previous, [active]: fn(previous[active] ?? freshReview(plan, policy)) }));
  }
  function selectPlan(id: string) {
    const next = plans[id]; if (!next) return;
    setReviews(previous => ({ ...previous, [id]: previous[id] ?? freshReview(next, policy) }));
    setActive(id); setFocused(null);
    void navigate({ to: '/developer', search: { plan: id } });
  }
  function toggleSet(field: 'open' | 'evidence', id: string) {
    update(current => {
      if (current.locked) return current;
      const next = new Set(current[field]); next.has(id) ? next.delete(id) : next.add(id);
      return { ...current, [field]: next };
    });
  }
  function setPolicyValue(value: boolean) {
    setPolicy(value); savePreference(POLICY_KEY, value ? '1' : '0');
    // Like the source, enabling policy approves routine claims in this plan, never non-routine claims.
    if (value) update(current => changeApproval(current, routine.map(c => c.id), true));
  }
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (!visible) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.matches('input,textarea,select') || target.isContentEditable)) return;
      if (event.ctrlKey || event.metaKey || event.altKey || importOpen) return;
      if (/^[1-4]$/.test(event.key)) { event.preventDefault(); selectPlan(Object.keys(plans)[Number(event.key) - 1] ?? 'bugfix'); return; }
      if (state.locked) return;
      if (event.key === 'j' || event.key === 'k') {
        event.preventDefault();
        const index = claims.findIndex(c => c.id === focused);
        const next = claims[Math.max(0, Math.min(claims.length - 1, index + (event.key === 'j' ? 1 : -1)))];
        if (!next) return;
        update(current => ({ ...current, open: new Set([...current.open, next.category.cat]) }));
        setFocused(next.id);
        requestAnimationFrame(() => document.getElementById(`approve-${next.id}`)?.focus());
      }
      const claim = claims.find(c => c.id === focused); if (!claim) return;
      if (event.key === 'x') { event.preventDefault(); update(current => changeApproval(current, [claim.id], !current.approved.has(claim.id))); }
      if (event.key === 'e') { event.preventDefault(); toggleSet('evidence', claim.id); }
      if (event.shiftKey && event.key.toLowerCase() === 'a') { event.preventDefault(); update(current => changeApproval(current, claim.category.claims.map(c => c.id), true)); }
    }
    window.addEventListener('keydown', keyboard); return () => window.removeEventListener('keydown', keyboard);
  });
  function importPlan() {
    try {
      const next = parsePlanJson(input);
      setPlans(previous => ({ ...previous, imported: next }));
      setReviews(previous => ({ ...previous, imported: freshReview(next, policy) }));
      setActive('imported'); setFocused(null); setImportOpen(false); setInput(''); setError('');
      toast.success('Plan imported');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to import this plan.'); }
  }

  return <TooltipProvider delayDuration={200}><div className="review-workspace min-h-screen pb-28">
    <main className="mx-auto max-w-5xl px-4 pt-8 sm:px-8 sm:pt-10">
      <ol aria-label="Developer phases" className="phase-strip mb-7 grid grid-cols-5 gap-2">{['Discuss','Read code','Draft claims','Approve claims','Build and verify'].map((phase,i) => <li key={phase} className={cn('border-b-2 pb-3', (state.locked ? i === 4 : i === 3) ? 'border-primary text-primary' : 'border-border text-muted-foreground')}><span className="mb-1 block font-mono text-xs">{i < 3 || (state.locked && i === 3) ? '✓' : String.fromCharCode(65 + i)}</span><span className="text-[11px]">{phase}</span></li>)}</ol>
      {active === 'feedback' && <section className="mb-6 border-l-2 border-warn bg-warn-soft p-4"><h2 className="text-sm font-semibold">From review · needs approval</h2>{edits.map((edit,i) => <p key={i} className="mt-2 text-xs leading-5"><span className="font-mono">{edit.item}</span> · {edit.type === 'check' ? 'New check' : edit.type === 'structure' ? 'Structure claim' : 'Proposed claim edit'}: {edit.text}</p>)}</section>}
      <p role="status" aria-label="GitHub source status" className="mb-5 break-words text-xs text-muted-foreground">{sourceStatus}{state.locked ? ' · Locked plan preserved' : ''}</p>
      <Tabs value={active} onValueChange={selectPlan}><TabsList className="plan-tabs mb-8 grid h-auto w-full grid-cols-2 gap-1 p-1 sm:flex sm:w-fit">{Object.entries(plans).map(([id, p]) => <TabsTrigger key={id} value={id} className="min-w-0 whitespace-normal px-4 py-2.5 text-xs sm:text-sm">{p.label}</TabsTrigger>)}</TabsList></Tabs>
      <section className="mb-7">
        <p className="break-words font-mono text-[11px] text-muted-foreground sm:text-xs">{plan.eyebrow}</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4"><h2 className="max-w-2xl break-words text-2xl leading-tight font-semibold sm:text-3xl">{plan.title}</h2><Badge variant="outline" className={cn('status-badge shrink-0', state.locked && 'bg-ok-soft text-ok border-ok/25')}>{state.locked ? <LockKeyhole className="size-3" /> : <span className="size-1.5 rounded-full bg-warn" />}{state.locked ? 'Approved' : 'Awaiting review'}</Badge></div>
        <p className="mt-3 font-mono text-xs leading-6 text-muted-foreground">{plan.label} · {claims.length} claims in {plan.categories.length} categories · {totalChecks} checks</p>
      </section>
      {claims.length > 8 && <p className="mb-5 text-xs text-warn">Lean default is at most 8 claims</p>}
      <section className="why-section mb-7 border-l-2 border-primary pl-4"><h3 className="mb-1 text-xs font-semibold">Why this structure</h3><p className="text-sm leading-6 text-muted-foreground"><BoldText text={plan.why} /></p></section>
      <section className="progress-tool mb-6 rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-medium"><span className="font-mono font-semibold">{done} of {claims.length}</span> claims approved</h3><span className="font-mono text-xs text-muted-foreground">{Math.round(done / claims.length * 100)}%</span></div>
        <div role="progressbar" aria-label="Claims approved" aria-valuenow={done} aria-valuemin={0} aria-valuemax={claims.length} className="approval-progress mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-ok transition-[width] duration-300" style={{ width: `${done / claims.length * 100}%` }} /></div>
        <p className="mt-3 text-xs text-muted-foreground">{!routine.length ? 'No routine claims: review every one' : policy && routine.every(c => state.approved.has(c.id)) ? 'Routine regression: auto-approved by repo policy' : `Routine regression: ${routine.filter(c => state.approved.has(c.id)).length}/${routine.length}`}</p>
        <div className="mt-4 flex items-center gap-3 border-t pt-4"><Switch id="routine-policy" checked={policy} onCheckedChange={setPolicyValue} disabled={state.locked} /><label htmlFor="routine-policy" className="cursor-pointer text-xs leading-5 text-muted-foreground">Auto-approve routine regression claims on future PRs in this repo</label></div>
      </section>
      <div className="mb-7 flex flex-wrap items-center gap-2"><span className="mr-1 text-[11px] text-muted-foreground">Evidence strength, strongest first</span>{STRENGTH_ORDER.map(s => <StrengthChip key={s} strength={s} definitions={strengths} />)}</div>
      <div className="space-y-5">{plan.categories.map(category => {
        const definition = categories[category.cat];
        const count = category.claims.filter(c => state.approved.has(c.id)).length;
        const all = count === category.claims.length;
        return <Collapsible key={`${active}-${category.cat}`} open={state.open.has(category.cat)} onOpenChange={() => toggleSet('open', category.cat)} className={cn('review-category overflow-hidden rounded-xl border bg-card', `category-${category.cat}`, category.routine && 'routine-category border-dashed')}>
          <div className="category-heading flex flex-wrap items-center gap-3 p-4 sm:px-5 sm:py-5">
            <CollapsibleTrigger asChild><Button variant="ghost" disabled={state.locked} className="h-auto min-w-0 flex-1 justify-start gap-3 whitespace-normal p-0 text-left hover:bg-transparent">{state.open.has(category.cat) ? <ChevronDown /> : <ChevronRight />}<span className="min-w-0"><span className="block text-sm font-semibold">{definition.name}</span><span className="mt-1 block text-xs leading-5 font-normal text-muted-foreground">{definition.note}</span></span></Button></CollapsibleTrigger>
            <div className="category-actions flex items-center gap-3"><span className={cn('whitespace-nowrap font-mono text-[11px]', all ? 'text-ok' : 'text-muted-foreground')}>{count}/{category.claims.length} claims</span><Button variant="outline" size="sm" disabled={state.locked} onClick={() => update(current => changeApproval(current, category.claims.map(c => c.id), !all))}>{all ? 'Clear all' : 'Approve all'}</Button></div>
          </div>
          <CollapsibleContent className="review-collapse">{category.claims.map(claim => {
            const approved = state.approved.has(claim.id); const strength = strongest(claim);
            return <article key={claim.id} className={cn('claim-row flex gap-3 border-t px-4 py-5 transition-colors sm:gap-4 sm:px-5', approved && 'bg-ok-soft/60', focused === claim.id && 'claim-focused')}>
              <Checkbox id={`approve-${claim.id}`} aria-label={`Approve claim ${claim.id}`} checked={approved} disabled={state.locked} onFocus={() => setFocused(claim.id)} onCheckedChange={value => update(current => changeApproval(current, [claim.id], value === true))} className="mt-0.5 size-6 shrink-0 rounded-md data-[state=checked]:border-ok data-[state=checked]:bg-ok data-[state=checked]:text-primary-foreground" />
              <div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-1.5"><span className="mr-1 font-mono text-xs text-muted-foreground">{claim.id}</span>{strength && <StrengthChip strength={strength} definitions={strengths} />}{claim.refs?.map(ref => <Badge key={ref} variant="outline" className={cn('reference-chip', claim.sec ? 'bg-sec-soft text-sec border-sec/20' : 'bg-accent text-accent-foreground border-primary/15')}>{ref}</Badge>)}{claim.kind === 'no_behavior_change' && <Badge variant="outline" className="reference-chip text-muted-foreground">must not change</Badge>}{claim.amended && <Badge variant="outline" className="reference-chip border-warn/20 bg-warn-soft text-warn">amended by engineer</Badge>}</div>
                <p className="break-words text-sm leading-6">{claim.text}</p>
                <Collapsible open={state.evidence.has(claim.id)} onOpenChange={() => toggleSet('evidence', claim.id)}><CollapsibleTrigger asChild><Button variant="ghost" size="sm" disabled={state.locked} className="mt-2 h-7 gap-1 px-0 text-xs font-normal text-muted-foreground hover:bg-transparent">{state.evidence.has(claim.id) ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}Evidence · {claim.evidence.length} {claim.evidence.length === 1 ? 'check' : 'checks'}</Button></CollapsibleTrigger><CollapsibleContent className="review-collapse"><ul className="mt-3 space-y-4 border-l-2 pl-4">{claim.evidence.map((e, i) => <li key={i}><div className="mb-2 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold">{e.type}</span><StrengthChip strength={e.s} definitions={strengths} /></div>{e.code ? <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-[11px] leading-5">{e.code}</pre> : <p className="break-words text-xs leading-5 text-muted-foreground">{e.what}</p>}</li>)}</ul></CollapsibleContent></Collapsible>
              </div>
            </article>;
          })}</CollapsibleContent>
        </Collapsible>;
      })}</div>
      <section className="mt-9"><h3 className="mb-4 text-sm font-semibold">Considered and skipped <span className="ml-1 font-mono text-xs font-normal text-muted-foreground">{plan.skipped.length}</span></h3><div className="border-t">{plan.skipped.map(([category, reason]) => <div key={category} className="grid gap-2 border-b py-4 text-xs leading-5 sm:grid-cols-[210px_1fr]"><span className="font-medium">{category}</span><span className="text-muted-foreground">{reason}</span></div>)}</div></section>
      {state.locked && <section className="mt-8 rounded-xl border border-ok/30 bg-card p-5" aria-label="Approved claims handoff"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-ok" />Approved claims, handed to the verifier</h3><Button variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(json); toast.success('Copied'); } catch { toast.error('Unable to copy. Select the JSON to copy it manually.'); } }}><Copy />Copy JSON</Button></div><pre data-testid="handoff-json" className="mt-4 max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-4 font-mono text-xs leading-6">{json}</pre></section>}
      {state.locked && active === 'bugfix' && <Button asChild className="mt-5"><Link to="/reviewer" search={{ example: 'sympy-24661' }}>Open the review packet for this PR<ArrowRight /></Link></Button>}
      <div className="mt-7 flex items-center gap-2 text-[11px] text-muted-foreground"><ShieldCheck className="size-3.5" /><span>Trust Issues · Verification-first harness</span></div>
    </main>
    <footer className="fixed inset-x-0 bottom-0 z-20 border-t bg-card"><div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8"><div className="flex items-center gap-2 text-sm">{state.locked ? <LockKeyhole className="size-4 text-ok" /> : <span className="size-2 rounded-full bg-warn" />}<span>{state.locked ? 'Claims approved and locked' : done === claims.length ? 'Every claim approved' : <><span className="font-mono font-semibold">{claims.length - done}</span> claims left to approve</>}</span></div><div className="flex items-center gap-2"><Button variant="ghost" size="sm" disabled={state.locked} onClick={() => { update(() => freshReview(plan, policy)); setFocused(null); }}><RotateCcw />Reset</Button><Button disabled={done !== claims.length || state.locked} onClick={() => { setLockedJson(previous => ({ ...previous, [active]: json })); update(current => lockReview(plan, current)); toast.success('Claims approved'); }}>{state.locked ? <Check /> : null}{state.locked ? 'Approved' : 'Approve claims'}{!state.locked && <ArrowRight />}</Button></div></div></footer>
    <Dialog open={importOpen} onOpenChange={setImportOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Import plan</DialogTitle><DialogDescription>Upload a JSON file or paste a plan in the Plan format.</DialogDescription></DialogHeader><input ref={fileInput} type="file" accept="application/json,.json" className="hidden" aria-label="Upload plan JSON" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; try { setInput(await file.text()); setError(''); } catch { setError('Unable to read this file.'); } event.target.value = ''; }} /><Button variant="outline" onClick={() => fileInput.current?.click()}><FileUp />Choose JSON file</Button><Textarea aria-label="Plan JSON" placeholder={'{ "label": "My plan", "eyebrow": "repo · source", ... }'} value={input} onChange={event => { setInput(event.target.value); setError(''); }} className="min-h-60 font-mono text-xs" />{error && <p role="alert" className="whitespace-pre-wrap break-words text-xs text-destructive">{error}</p>}<Button disabled={!input.trim()} onClick={importPlan}>Import plan<ArrowRight /></Button></DialogContent></Dialog>
  </div></TooltipProvider>;
}