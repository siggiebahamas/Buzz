import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Timer, Wallet, Repeat, Target, AlertTriangle, BadgeCheck, FileText, Check, X, Sparkles, Send, Scale, MessageSquare, UserCheck } from 'lucide-react';
import { useDB, userById, campaignById, displayName, actions, reactionTotal } from '../lib/store';
import { matchScore, rankCreators } from '../lib/match';
import { peso, compact, timeAgo, DAY } from '../lib/format';
import { Card, Button, Badge, Avatar, Modal, Field, Textarea, Input, EmptyState, IconTile, useAct, cx } from '../components/ui';
import { MatchPill, FitChecks } from '../components/visuals';
import { DisputeThread } from './workspace/Disputes';

const median = (arr) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

// ---------------------------------------------------------------- health
export function HealthPanel() {
  const d = useDB();
  const now = Date.now();
  const recent = d.campaigns.filter((c) => c.published && !c.removed && c.createdAt > now - 60 * DAY);
  const appsFor = (c) => d.applications.filter((a) => a.campaignId === c.id && a.source === 'apply').sort((a, b) => a.createdAt - b.createdAt);
  const old = recent.filter((c) => c.createdAt < now - 3 * DAY);
  const liquid = old.filter((c) => appsFor(c).filter((a) => a.createdAt - c.createdAt < 3 * DAY).length >= 3).length;
  const firstApp = recent.map((c) => appsFor(c)[0]).filter(Boolean).map((a) => (a.createdAt - campaignById(d, a.campaignId).createdAt) / 3.6e6);
  const firstCollab = recent.map((c) => d.applications.filter((a) => a.campaignId === c.id && a.status === 'accepted').sort((a, b) => a.decidedAt - b.decidedAt)[0]).filter(Boolean).map((a) => (a.decidedAt - campaignById(d, a.campaignId).createdAt) / DAY);
  const funded = d.transactions.filter((t) => t.type === 'fund');
  const gmv30 = funded.filter((t) => t.ts > now - 30 * DAY).reduce((a, t) => a - t.amount, 0);
  const gmv = funded.reduce((a, t) => a - t.amount, 0);
  const brandCounts = {};
  d.campaigns.forEach((c) => { brandCounts[c.ownerId] = (brandCounts[c.ownerId] || 0) + 1; });
  const brands = Object.values(brandCounts);
  const repeat = brands.filter((n) => n >= 2).length / Math.max(1, brands.length);
  const decided = d.applications.filter((a) => ['accepted', 'declined'].includes(a.status));
  const scoreOf = (a) => matchScore(userById(d, a.creatorId), campaignById(d, a.campaignId), { brand: true, d }).score || 0;
  const accScores = decided.filter((a) => a.status === 'accepted').map(scoreOf);
  const decScores = decided.filter((a) => a.status === 'declined').map(scoreOf);
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const stuck = d.campaigns.filter((c) => c.published && !c.removed && c.status === 'recruiting' && c.createdAt < now - 3 * DAY && d.applications.filter((a) => a.campaignId === c.id).length <= 1);
  const kpis = [
    [Activity, old.length ? `${Math.round((liquid / old.length) * 100)}%` : '—', 'Listings with 3+ applicants in 72h', 'The #1 marketplace health number. Aim for 60%+.'],
    [Timer, median(firstApp) != null ? `${median(firstApp).toFixed(0)}h` : '—', 'Median time to first applicant', 'Under 24h keeps brands coming back.'],
    [Timer, median(firstCollab) != null ? `${median(firstCollab).toFixed(1)}d` : '—', 'Median time to first collaboration', 'From posting to an accepted creator.'],
    [Wallet, peso(gmv30, { compact: true }), 'Paid in, held by Buzz, last 30 days', `${peso(gmv, { compact: true })} all time`],
    [Repeat, `${Math.round(repeat * 100)}%`, 'Brands with 2+ campaigns', 'Repeat use means Buzz is working for them.'],
    [Target, accScores.length && decScores.length ? `${Math.round(avg(accScores))} vs ${Math.round(avg(decScores))}` : '—', 'Avg fit: accepted vs declined', 'If accepted pairs score higher, matching predicts success.'],
  ];
  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map(([Icon, v, l, hint]) => (
          <Card key={l} className="p-4">
            <div className="flex items-center gap-2 text-ink-muted"><Icon size={15} /><span className="text-[12.5px]">{l}</span></div>
            <p className="text-[26px] font-extrabold mt-1">{v}</p>
            <p className="text-[12px] text-ink-muted">{hint}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <p className="font-bold flex items-center gap-2"><AlertTriangle size={16} className="text-brand-dark" />Listings that need help ({stuck.length})</p>
        <p className="text-[12.5px] text-ink-muted">Recruiting for 3+ days with 0–1 applications. Invite matches for them so first-time brands don't give up.</p>
        {stuck.length === 0 ? <p className="text-[13px] text-emerald-700 mt-3">Every listing is getting applicants.</p> : (
          <div className="mt-3 divide-y divide-line">
            {stuck.map((c) => {
              const top = rankCreators(d, c).slice(0, 3);
              return (
                <div key={c.id} className="py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]"><Link to={`/opportunity/${c.id}`} className="font-medium hover:underline">{c.productName}</Link><p className="text-[12px] text-ink-muted">{displayName(userById(d, c.ownerId))} · posted {timeAgo(c.createdAt)}</p></div>
                  <div className="flex -space-x-2">{top.map((x) => <Avatar key={x.u.id} user={x.u} size={26} />)}</div>
                  <span className="text-[12px] text-ink-muted">Best: {top[0]?.m.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- verifications
export function VerificationsPanel() {
  const d = useDB();
  const act = useAct();
  const [view, setView] = useState(null);
  const [note, setNote] = useState('');
  const list = [...d.verifications].sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1) || b.createdAt - a.createdAt);
  return (
    <div className="mt-6 space-y-3">
      {list.length === 0 && <Card><EmptyState icon={BadgeCheck} title="No verification requests" /></Card>}
      {list.map((v) => {
        const u = userById(d, v.userId);
        return (
          <Card key={v.id} className="p-4 flex flex-wrap items-center gap-3">
            <Avatar user={u} size={36} />
            <div className="flex-1 min-w-[200px]">
              <p className="font-semibold">{v.kind === 'business' ? u.business?.name : `${u.name} (@${u.creator?.handle})`}</p>
              <p className="text-[12.5px] text-ink-muted">{v.kind === 'business' ? 'Business' : 'Creator stats'} · {v.docType}{v.docNumber ? ` #${v.docNumber}` : ''} · {timeAgo(v.createdAt)}</p>
            </div>
            <Badge tone={v.status === 'approved' ? 'green' : v.status === 'rejected' ? 'red' : 'soft'} className="capitalize">{v.status}</Badge>
            {v.status === 'pending' && <Button size="sm" onClick={() => { setView(v); setNote(''); }}>Review</Button>}
          </Card>
        );
      })}
      {view && (() => {
        const u = userById(d, view.userId);
        return (
          <Modal open onClose={() => setView(null)} title={`Review ${view.kind === 'business' ? 'business' : 'creator'} verification`} subtitle={view.kind === 'business' ? u.business?.name : u.name} width="max-w-2xl">
            <div className="space-y-3 text-[13.5px]">
              <p><b>Document:</b> {view.docType}{view.docNumber ? ` · No. ${view.docNumber}` : ''} · {view.docName}</p>
              {view.file?.type?.startsWith('image/') && <img src={view.file.data} alt="Uploaded document" className="rounded-xl border border-line max-h-72 w-full object-contain bg-canvas" />}
              {view.file && !view.file.type?.startsWith('image/') && <p className="rounded-xl bg-canvas p-3 flex items-center gap-2"><FileText size={16} />{view.docName} (PDF attached)</p>}
              {!view.file && <p className="rounded-xl bg-canvas p-3 text-ink-muted">Sample request: no file attached.</p>}
              {view.links?.length > 0 && <ul>{view.links.map((l) => <li key={l}><a href={l} target="_blank" rel="noreferrer" className="text-brand-dark break-all">{l}</a></li>)}</ul>}
              {view.kind === 'creator' && <p className="text-ink-muted">Profile claims: {u.creator.platforms.map((p) => `${p.id} ${compact(p.followers)}`).join(', ')} · {u.creator.engagement}% engagement. Check these against the screenshot.</p>}
              {view.kind === 'business' && <p className="text-ink-muted">Check that the name on the document matches "{u.business?.name}" and the permit is current.</p>}
              <Field label="Note to the user (required if rejecting)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} className="!min-h-[60px]" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" disabled={!note.trim()} onClick={() => { act(() => actions.reviewVerification(view.id, false, note.trim()), 'Sent back with your note'); setView(null); }}><X size={15} />Needs changes</Button>
                <Button onClick={() => { act(() => actions.reviewVerification(view.id, true, note.trim()), 'Verified'); setView(null); }}><Check size={15} />Approve</Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

// ---------------------------------------------------------------- creator approvals
export function ApprovalsPanel() {
  const d = useDB();
  const act = useAct();
  const pending = d.users.filter((u) => u.creator && u.approved === false);
  const on = !!d.flags?.requireCreatorApproval;
  return (
    <div className="mt-6 space-y-3">
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <UserCheck size={18} className="text-brand-dark" />
        <p className="flex-1 text-[13.5px]"><b>Curated launch:</b> {on ? 'new creators wait for approval before brands can see them.' : 'new creators appear right away.'}</p>
        <Button size="sm" variant={on ? 'outline' : 'primary'} onClick={() => act(() => actions.setFlag('requireCreatorApproval', !on), on ? 'New creators appear right away' : 'New creators now need approval')}>{on ? 'Turn off' : 'Require approval'}</Button>
      </Card>
      {pending.length === 0 ? <Card><EmptyState icon={UserCheck} title="No creators waiting" /></Card> : pending.map((u) => (
        <Card key={u.id} className="p-4 flex flex-wrap items-center gap-3">
          <Avatar user={u} size={36} />
          <div className="flex-1 min-w-[200px]"><Link to={`/profile/${u.id}`} className="font-semibold hover:underline">{u.name} @{u.creator.handle}</Link><p className="text-[12.5px] text-ink-muted">{u.creator.platforms.map((p) => `${p.id} ${compact(p.followers)}`).join(' · ') || 'No platforms yet'} · joined {timeAgo(u.joinedAt)}</p></div>
          <Button size="sm" variant="outline" onClick={() => act(() => actions.approveCreator(u.id, false), 'Asked to improve profile')}>Not yet</Button>
          <Button size="sm" onClick={() => act(() => actions.approveCreator(u.id, true), 'Approved')}><Check size={14} />Approve</Button>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- disputes
export function DisputesPanel() {
  const d = useDB();
  const [open, setOpen] = useState(null);
  return (
    <div className="mt-6 space-y-3">
      {d.disputes.length === 0 && <Card><EmptyState icon={Scale} title="No disputes" /></Card>}
      {d.disputes.map((x) => (
        <Card key={x.id} className="p-4 flex flex-wrap items-center gap-3">
          <Scale size={18} className="text-ink-muted" />
          <div className="flex-1 min-w-[200px]"><p className="font-semibold">{x.reason}</p><p className="text-[12.5px] text-ink-muted">{campaignById(d, x.campaignId)?.productName} · {displayName(userById(d, x.openedBy))} vs {displayName(userById(d, x.againstId))} · {timeAgo(x.createdAt)}{x.status === 'open' && x.respondBy < Date.now() ? ' · no reply in 3 days' : ''}</p></div>
          <Badge tone={x.status === 'resolved' ? 'green' : 'red'} className="capitalize">{x.status}</Badge>
          <Button size="sm" onClick={() => setOpen(x.id)}>{x.status === 'resolved' ? 'View' : 'Decide'}</Button>
        </Card>
      ))}
      {open && <Modal open onClose={() => setOpen(null)} title="Dispute" width="max-w-2xl"><DisputeThread x={d.disputes.find((y) => y.id === open)} admin /></Modal>}
    </div>
  );
}

// ---------------------------------------------------------------- hand-picked matching
export function ConciergePanel() {
  const d = useDB();
  const act = useAct();
  const [open, setOpen] = useState(null);
  const [picks, setPicks] = useState([]);
  const [msg, setMsg] = useState('');
  return (
    <div className="mt-6 space-y-3">
      {d.concierge.length === 0 && <Card><EmptyState icon={Sparkles} title="No hand-pick requests" /></Card>}
      {d.concierge.map((x) => {
        const c = campaignById(d, x.campaignId);
        return (
          <Card key={x.id} className="p-4 flex flex-wrap items-center gap-3">
            <Sparkles size={18} className="text-brand-dark" />
            <div className="flex-1 min-w-[200px]"><p className="font-semibold">{c?.productName}</p><p className="text-[12.5px] text-ink-muted">{displayName(userById(d, x.brandId))} · {timeAgo(x.createdAt)}{x.note ? ` · "${x.note}"` : ''}</p></div>
            <Badge tone={x.status === 'done' ? 'green' : 'soft'}>{x.status === 'done' ? `${x.picks.length} invited` : 'Open'}</Badge>
            {x.status === 'open' && <Button size="sm" onClick={() => { setOpen(x); setPicks([]); setMsg(''); }}>Pick creators</Button>}
          </Card>
        );
      })}
      {open && (() => {
        const c = campaignById(d, open.campaignId);
        const ranked = rankCreators(d, c).slice(0, 10);
        return (
          <Modal open onClose={() => setOpen(null)} title={`Hand-pick for ${c.productName}`} subtitle={open.note || 'Pick the creators you would stake Buzz\'s name on.'} width="max-w-3xl">
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {ranked.map(({ u, m }) => {
                const on = picks.includes(u.id);
                return (
                  <label key={u.id} className={cx('flex gap-3 rounded-xl border p-3 cursor-pointer', on ? 'border-brand bg-brand-softer' : 'border-line')}>
                    <input type="checkbox" checked={on} onChange={() => setPicks(on ? picks.filter((p) => p !== u.id) : [...picks, u.id])} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><Avatar user={u} size={26} /><span className="font-semibold text-[14px]">{u.name}</span>{u.creator.statsVerified && <BadgeCheck size={14} className="text-sky-600" />}<span className="ml-auto"><MatchPill {...m} /></span></div>
                      <div className="mt-2"><FitChecks checks={m.checks.slice(0, 4)} /></div>
                    </div>
                  </label>
                );
              })}
            </div>
            <Field label="Message to the creators" className="mt-4"><Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="We think you'd be great for this because…" /></Field>
            <Button size="lg" className="w-full mt-3" disabled={!picks.length || !msg.trim()} onClick={() => { act(() => actions.deliverConcierge(open.id, picks, msg.trim()), `Invited ${picks.length} creators`); setOpen(null); }}><Send size={15} />Invite {picks.length || ''} creators for the brand</Button>
          </Modal>
        );
      })()}
    </div>
  );
}

// ---------------------------------------------------------------- support inbox
export function SupportPanel() {
  const d = useDB();
  const act = useAct();
  const [reply, setReply] = useState({});
  return (
    <div className="mt-6 space-y-3">
      {d.tickets.length === 0 && <Card><EmptyState icon={MessageSquare} title="Inbox zero" /></Card>}
      {d.tickets.map((t) => {
        const u = userById(d, t.userId);
        return (
          <Card key={t.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Avatar user={u} size={28} /><span className="font-semibold">{t.subject}</span>
              <Badge className="capitalize" tone={t.status === 'open' ? 'red' : t.status === 'answered' ? 'green' : 'neutral'}>{t.status}</Badge>
              <span className="text-[12px] text-ink-muted ml-auto">{displayName(u)} · {t.topic} · {timeAgo(t.createdAt)}</span>
            </div>
            <p className="text-[13.5px] text-ink-soft mt-2">{t.body}</p>
            {t.replies.map((r, i) => <p key={i} className="text-[13px] mt-2 bg-canvas rounded-xl px-3 py-2"><b>{r.from === t.userId ? displayName(u) : 'Buzz'}:</b> {r.body}</p>)}
            {t.status !== 'closed' && (
              <form className="flex gap-2 mt-3" onSubmit={(e) => { e.preventDefault(); act(() => actions.replyTicket(t.id, reply[t.id] || ''), 'Reply sent'); setReply({ ...reply, [t.id]: '' }); }}>
                <Input value={reply[t.id] || ''} onChange={(e) => setReply({ ...reply, [t.id]: e.target.value })} placeholder="Reply as Buzz support…" />
                <Button type="submit" disabled={!(reply[t.id] || '').trim()}>Reply</Button>
                <Button type="button" variant="ghost" onClick={() => act(() => actions.replyTicket(t.id, '', true), 'Closed')}>Close</Button>
              </form>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export { IconTile, reactionTotal };
