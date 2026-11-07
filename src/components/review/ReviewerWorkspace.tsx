import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowRight, Check, ChevronDown, Copy, Download, FileUp, MessageSquare, Moon, ShieldCheck, Sun, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { parseReviewPacket, addReviewComment, exportReview, diffForFile, type ReviewerState, type PacketItem, type Decision } from '@/data/reviewer';
import { readPreference, savePreference } from '@/data/review-state';
import { startSourceRefresh } from '@/data/source-refresh';
import packetSource from '../../../upstream/verification-first-reviewer-harness/examples/pylint-8898/.verify/review-packet.md?raw';
import diffSource from '../../../upstream/verification-first-reviewer-harness/examples/pylint-8898/pr.diff?raw';
import { cn } from '@/lib/utils';

const BASE = 'https://raw.githubusercontent.com/jhoh10/aie_hackathon/main/verification-first-reviewer-harness/examples/pylint-8898/';
function InlineText({ text }: { text: string }) {
  return <>{text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part)}</>;
}
export function ReviewerWorkspace() {
  const [raw, setRaw] = useState(packetSource);
  const [diff, setDiff] = useState(diffSource);
  const [review, setReview] = useState<ReviewerState>({ decision: null, comments: [] });
  const [reviewer, setReviewer] = useState('');
  const [dark, setDark] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [input, setInput] = useState('');
  const [importDiff, setImportDiff] = useState('');
  const [error, setError] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('Checking GitHub…');
  const [imported, setImported] = useState(false);
  const [pending, setPending] = useState<{ raw: string; diff: string } | null>(null);
  const packet = parseReviewPacket(raw);
  const blocking = review.comments.filter(c => c.blocking).length;
  const untouched = !review.decision && !review.comments.length;

  useEffect(() => {
    const saved = readPreference('claims-review-theme');
    const value = saved === 'dark' || (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDark(value); document.documentElement.classList.toggle('dark', value);
  }, []);
  useEffect(() => {
    if (imported) return;
    let stopped = false; const controller = new AbortController();
    const stop = startSourceRefresh(async () => {
      setStatus('Checking GitHub…');
      const checkedAt = Date.now();
      const response = await fetch(`${BASE}.verify/review-packet.md?checked=${checkedAt}`, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('GitHub unavailable');
      const next = await response.text(); parseReviewPacket(next);
      if (next !== raw) {
        const diffResponse = await fetch(`${BASE}pr.diff?checked=${checkedAt}`, { cache: 'no-store', signal: controller.signal });
        if (!diffResponse.ok) throw new Error('Diff unavailable');
        const nextDiff = await diffResponse.text();
        if (stopped) return;
        if (untouched) { setRaw(next); setDiff(nextDiff); } else setPending({ raw: next, diff: nextDiff });
      }
      if (!stopped) setStatus('GitHub up to date');
    }, error => setStatus(error instanceof Error && /Expected|Invalid/.test(error.message) ? 'Source packet incomplete · keeping last complete packet' : 'GitHub unavailable · retrying in 1 minute'));
    return () => { stopped = true; controller.abort(); stop(); };
  }, [raw, imported, untouched]);

  function comment(item: string) {
    setReview(current => addReviewComment(current, item)); setOutput('');
    requestAnimationFrame(() => { const fields = document.querySelectorAll<HTMLTextAreaElement>('[data-review-comment]'); fields[fields.length - 1]?.focus(); });
  }
  function exportMarkdown() { return exportReview(packet, review, reviewer, new Date().toISOString().slice(0, 10)); }
  function rows(items: PacketItem[], section: 'behavior' | 'test' | 'architecture') {
    return items.map(item => <article key={item.id} id={item.id} className={cn('scroll-mt-24 border-b py-5', item.untested && 'border-l-2 border-l-warn bg-warn-soft/50 px-4')}>
      <div className="flex items-start gap-3"><span className="w-7 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">{item.id}</span><div className="min-w-0 flex-1">
        <p className="break-words text-sm leading-6"><InlineText text={item.text} /></p>
        {section === 'behavior' && <div className="mt-2 flex flex-wrap gap-2">{item.untested ? <Badge variant="outline" className="border-warn/30 bg-warn-soft text-warn"><AlertTriangle className="mr-1 size-3" />No test</Badge> : item.detail.split(',').map(id => <Button key={id} asChild variant="link" size="sm" className="h-6 px-0 font-mono text-xs"><a href={`#${id.trim()}`}>{id.trim()}<ArrowRight className="size-3" /></a></Button>)}</div>}
        {section === 'test' && <div className="mt-3 flex items-start gap-2 text-sm leading-6 text-muted-foreground"><ArrowRight className="mt-1 size-3 shrink-0 text-ok" /><p className="min-w-0 break-words"><InlineText text={item.detail} /></p></div>}
        {section === 'architecture' && <details className="mt-2"><summary className="flex cursor-pointer items-center gap-2 break-all font-mono text-xs text-accent-foreground"><ChevronDown className="size-3 shrink-0" />{item.detail.replace(/`/g, '')}</summary><pre className="mt-3 max-h-96 overflow-auto rounded-md border bg-muted p-3 font-mono text-[11px] leading-5">{diffForFile(diff, item.detail) || 'No matching diff supplied.'}</pre></details>}
      </div><Button variant="ghost" size="icon" aria-label={`Comment on ${item.id}`} title={`Comment on ${item.id}`} onClick={() => comment(item.id)} className={cn('shrink-0', review.comments.some(c => c.item === item.id) && 'bg-accent text-accent-foreground')}><MessageSquare className="size-4" /></Button></div>
    </article>);
  }
  return <div className="min-h-screen pb-12">
    <header className="border-b bg-card"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8"><div className="flex items-center gap-3"><div className="brand-mark"><ShieldCheck className="size-5" /></div><div><p className="font-semibold">Trust Issues <span className="hidden font-normal text-muted-foreground sm:inline">/ Reviewer Harness</span></p><p className="text-xs text-muted-foreground">Verification-first review</p></div></div><div className="flex items-center gap-2"><Button asChild variant="ghost" size="sm"><Link to="/">Claims</Link></Button><Button variant="ghost" size="icon" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => { setDark(!dark); document.documentElement.classList.toggle('dark', !dark); savePreference('claims-review-theme', dark ? 'light' : 'dark'); }}>{dark ? <Sun /> : <Moon />}</Button><Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><FileUp />Import packet</Button></div></div></header>
    <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span className="font-mono">{imported ? 'Imported review packet' : 'pylint-dev/pylint · #8898 · Repository example'}</span><span role="status" aria-label="Reviewer source status">{imported ? 'Local packet' : status}</span></div>
      {pending && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-l-2 border-warn bg-warn-soft p-4 text-sm"><p>New source packet available. Your current feedback is preserved.</p><Button variant="outline" size="sm" onClick={() => { setRaw(pending.raw); setDiff(pending.diff); setReview({ decision: null, comments: [] }); setOutput(''); setPending(null); }}>Review new version</Button></div>}
      <h1 className="max-w-4xl break-words text-3xl leading-tight font-semibold">{packet.title}</h1><p className="mt-4 max-w-4xl text-lg leading-7">{packet.summary}</p>
      <div className="mt-6 grid gap-4 border-y py-5 sm:grid-cols-3">{packet.metrics.split(' · ').map((metric, index) => <div key={metric} className={cn('text-sm leading-6', index === 2 ? 'text-warn' : 'text-muted-foreground')}><span className="mb-1 block text-[10px] font-semibold uppercase text-muted-foreground">{['Verification', 'Test changes', 'Coverage gaps'][index]}</span>{metric}</div>)}</div>
      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0"><section id="behaviors" className="scroll-mt-8"><div className="flex items-center justify-between border-b pb-4"><h2 className="text-lg font-semibold">What the PR does</h2><span className="font-mono text-xs text-muted-foreground">{packet.behaviors.length} behaviors</span></div>{rows(packet.behaviors, 'behavior')}</section><section id="tests" className="mt-10 scroll-mt-8"><div className="flex items-center justify-between border-b pb-4"><h2 className="text-lg font-semibold">Tests</h2><span className="text-xs text-muted-foreground">Input → expected output</span></div>{rows(packet.tests, 'test')}</section>{packet.architecture.length > 0 && <section id="architecture" className="mt-10 scroll-mt-8"><h2 className="border-b pb-4 text-lg font-semibold">Architecture</h2>{rows(packet.architecture, 'architecture')}</section>}</div>
        <aside className="min-w-0 border-t pt-5 lg:sticky lg:top-6 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0"><h2 className="mb-4 text-base font-semibold">Your review</h2><div className="grid gap-2">{([['APPROVE','Approve',Check],['REQUEST_CHANGES','Request changes',AlertTriangle],['COMMENT','Comment only',MessageSquare]] as const).map(([value,label,Icon]) => <Button key={value} variant={review.decision === value ? 'default' : 'outline'} aria-pressed={review.decision === value} className="justify-start" onClick={() => { setReview(current => ({ ...current, decision: value as Decision })); setOutput(''); }}><Icon className="size-4" />{label}</Button>)}</div>
        {review.decision === 'APPROVE' && blocking > 0 && <p role="alert" className="mt-3 text-xs leading-5 text-warn">{blocking} blocking comments remain. Approve only if they can wait.</p>}
        <div className="mt-6 flex items-center justify-between"><h3 className="text-sm font-semibold">Comments</h3><span className="font-mono text-xs text-muted-foreground">{review.comments.length}</span></div>
        {review.comments.map(c => <div key={c.id} className="mt-4 border-t pt-3"><div className="mb-2 flex items-center justify-between"><a href={`#${c.item}`} className="font-mono text-xs text-accent-foreground">{c.item}</a><Button variant="ghost" size="icon" className="size-7" aria-label={`Remove comment ${c.item}`} onClick={() => setReview(current => ({ ...current, comments: current.comments.filter(item => item.id !== c.id) }))}><Trash2 className="size-3" /></Button></div><Textarea data-review-comment aria-label={`Feedback on ${c.item}`} value={c.text} placeholder="What should change?" className="min-h-24 text-xs" onChange={event => setReview(current => ({ ...current, comments: current.comments.map(item => item.id === c.id ? { ...item, text: event.target.value } : item) }))} /><div className="mt-2 flex items-center gap-2"><Switch id={`blocking-${c.id}`} checked={c.blocking} onCheckedChange={value => setReview(current => ({ ...current, comments: current.comments.map(item => item.id === c.id ? { ...item, blocking: value } : item) }))} /><label htmlFor={`blocking-${c.id}`} className="text-xs text-muted-foreground">Blocking</label></div></div>)}
        <label className="mt-6 block text-xs text-muted-foreground" htmlFor="reviewer-name">Reviewer</label><Input id="reviewer-name" value={reviewer} onChange={event => setReviewer(event.target.value)} placeholder="Your name" className="mt-2" />
        <div className="mt-4 flex gap-2"><Button variant="outline" className="flex-1" disabled={!review.decision} onClick={async () => { const md = exportMarkdown(); setOutput(md); try { await navigator.clipboard.writeText(md); toast.success('Review copied'); } catch { toast.error('Copy the review text below.'); } }}><Copy />Copy review</Button><Button variant="outline" size="icon" aria-label="Download review.md" title="Download review.md" disabled={!review.decision} onClick={() => { const md = exportMarkdown(); setOutput(md); const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'review.md'; anchor.click(); URL.revokeObjectURL(url); }}><Download /></Button></div>
        {output && <pre aria-label="Exported review" className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted p-3 font-mono text-[10px] leading-5">{output}</pre>}
        </aside>
      </div>
    </main>
    <Dialog open={importOpen} onOpenChange={setImportOpen}><DialogContent className="max-h-[90dvh] overflow-auto"><DialogHeader><DialogTitle>Import review packet</DialogTitle><DialogDescription>.verify/review-packet.md and optional pr.diff</DialogDescription></DialogHeader><Input type="file" accept=".md,text/markdown" aria-label="Upload review packet" onChange={async event => { const file = event.target.files?.[0]; if (file) setInput(await file.text()); }} /><Textarea aria-label="Review packet markdown" value={input} onChange={event => setInput(event.target.value)} placeholder="# Review: …" className="min-h-48 font-mono text-xs" /><Input type="file" aria-label="Upload PR diff" accept=".diff,.patch,text/plain" onChange={async event => { const file = event.target.files?.[0]; if (file) setImportDiff(await file.text()); }} />{error && <p role="alert" className="text-xs text-destructive">{error}</p>}<Button disabled={!input} onClick={() => { try { parseReviewPacket(input); setRaw(input); setDiff(importDiff); setReview({ decision: null, comments: [] }); setImported(true); setPending(null); setOutput(''); setImportOpen(false); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Invalid packet'); } }}>Import packet<ArrowRight /></Button></DialogContent></Dialog>
  </div>;
}