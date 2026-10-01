import { useState } from 'react';
import { Scale, Send, Lock } from 'lucide-react';
import { useDB, userById, campaignById, displayName, actions } from '../../lib/store';
import { peso, timeAgo, shortDate } from '../../lib/format';
import { Card, Button, Badge, Avatar, Modal, Field, Textarea, Input, EmptyState, useAct, cx } from '../../components/ui';
import { PageHead } from './Layout';

export const DISPUTE_REASONS = ['Content not delivered', 'Content doesn\'t match the brief', 'Payment not released', 'Product never arrived', 'Posted without disclosure', 'Other'];
const STATUS = { open: ['Waiting for a reply', 'red'], responded: ['Under review by Buzz', 'soft'], resolved: ['Resolved', 'green'] };

export function OpenDisputeModal({ campaignId, deliverableId, againstId, onClose }) {
  const d = useDB();
  const act = useAct();
  const [reason, setReason] = useState(DISPUTE_REASONS[0]);
  const [details, setDetails] = useState('');
  const [evidence, setEvidence] = useState(['']);
  const c = campaignById(d, campaignId);
  const other = userById(d, againstId);
  return (
    <Modal open onClose={onClose} title="Report a problem" subtitle={`${c?.productName} · with ${displayName(other)}`}>
      <div className="rounded-xl bg-canvas p-3 text-[13px] text-ink-soft flex gap-2 mb-4"><Lock size={15} className="shrink-0 mt-0.5 text-brand-dark" />Money held by Buzz for this collaboration is frozen while Buzz reviews. {displayName(other)} has 3 days to respond.</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DISPUTE_REASONS.map((r) => <button key={r} type="button" onClick={() => setReason(r)} className={cx('text-left px-3 py-2.5 rounded-xl border text-[13.5px]', reason === r ? 'border-brand bg-brand-softer font-medium' : 'border-line hover:bg-canvas')}>{r}</button>)}
      </div>
      <Field label="What happened?" className="mt-4"><Textarea id="dsp-details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Dates, what was agreed, what you received. Be specific." /></Field>
      <Field label="Evidence links (optional)" hint="Links to the post, screenshots in a shared folder, courier tracking…" className="mt-3">
        <div className="space-y-2">{evidence.map((v, i) => <Input key={i} value={v} onChange={(e) => setEvidence(evidence.map((x, j) => (j === i ? e.target.value : x)))} placeholder="https://" />)}</div>
        {evidence.length < 4 && <button type="button" onClick={() => setEvidence([...evidence, ''])} className="text-[12.5px] text-brand-dark mt-1">+ Add another link</button>}
      </Field>
      <Button size="lg" className="w-full mt-4" disabled={!details.trim()} onClick={() => { if (act(() => actions.openDispute({ campaignId, deliverableId, againstId, reason, details, evidence }), 'Dispute opened. We\'ll keep you posted.')) onClose(); }}><Scale size={16} />Open dispute</Button>
    </Modal>
  );
}

export function DisputeThread({ x, admin = false }) {
  const d = useDB();
  const act = useAct();
  const [msg, setMsg] = useState('');
  const [share, setShare] = useState(50);
  const [note, setNote] = useState('');
  const c = campaignById(d, x.campaignId);
  const held = d.deliverables.filter((y) => y.campaignId === x.campaignId && y.creatorId === x.creatorId && y.escrow === 'held').reduce((a, y) => a + y.fee, 0);
  const people = [x.openedBy, x.againstId].map((id) => userById(d, id));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS[x.status][1]}>{STATUS[x.status][0]}</Badge>
        <span className="text-[12.5px] text-ink-muted">{c?.productName} · opened {timeAgo(x.createdAt)} · {peso(held)} put on hold</span>
      </div>
      <div className="rounded-xl border border-line p-4">
        <p className="font-semibold">{x.reason}</p>
        <p className="text-[14px] text-ink-soft mt-1 whitespace-pre-line">{x.details}</p>
        {x.evidence.length > 0 && <ul className="mt-2 space-y-1">{x.evidence.map((e) => <li key={e}><a href={e} target="_blank" rel="noreferrer" className="text-[12.5px] text-brand-dark break-all">{e}</a></li>)}</ul>}
        <p className="text-[12px] text-ink-muted mt-2">By {displayName(people[0])}</p>
      </div>
      <div className="space-y-2.5">
        {x.messages.map((m) => {
          const u = userById(d, m.from);
          return (
            <div key={m.id} className="flex gap-2.5">
              <Avatar user={u} size={28} />
              <div className="bg-canvas rounded-2xl px-3 py-2 min-w-0"><p className="text-[12px] font-semibold">{u?.admin && !people.some((p) => p?.id === u.id) ? 'Buzz support' : displayName(u)} <span className="font-normal text-ink-muted">· {timeAgo(m.ts)}</span></p><p className="text-[13.5px] text-ink-soft">{m.body}</p></div>
            </div>
          );
        })}
      </div>
      {x.status !== 'resolved' ? (
        <form onSubmit={(e) => { e.preventDefault(); act(() => actions.disputeMessage(x.id, msg)); setMsg(''); }} className="flex gap-2">
          <Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={admin ? 'Ask both sides a question…' : 'Add your side of the story…'} />
          <Button type="submit" disabled={!msg.trim()}><Send size={15} /></Button>
        </form>
      ) : (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-[13.5px]">
          <b>Decision ({shortDate(x.resolvedAt)}):</b> {x.outcome.type === 'release' ? 'Paid to the creator' : x.outcome.type === 'refund' ? 'Refunded to the brand' : `Split: ${Math.round(x.outcome.share * 100)}% to the creator, ${100 - Math.round(x.outcome.share * 100)}% refunded`}. {x.outcome.note}
        </div>
      )}
      {admin && x.status !== 'resolved' && (
        <div className="rounded-xl border-2 border-dashed border-line-strong p-4 space-y-3">
          <p className="font-semibold text-[14px]">Decide this dispute</p>
          <Field label="Reason shared with both sides"><Textarea value={note} onChange={(e) => setNote(e.target.value)} className="!min-h-[70px]" placeholder="What the agreement says, what was delivered, what we found." /></Field>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => act(() => actions.resolveDispute(x.id, 'release', 1, note), 'Paid to the creator')}>Pay creator {peso(held)}</Button>
            <Button size="sm" variant="outline" onClick={() => act(() => actions.resolveDispute(x.id, 'refund', 0, note), 'Refunded to the brand')}>Refund brand {peso(held)}</Button>
            <span className="inline-flex items-center gap-2 text-[13px]">
              <input type="range" min="10" max="90" step="10" value={share} onChange={(e) => setShare(Number(e.target.value))} aria-label="Creator share" />
              <Button size="sm" variant="soft" onClick={() => act(() => actions.resolveDispute(x.id, 'split', share / 100, note), 'Split applied')}>Split {share}/{100 - share}</Button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Disputes() {
  const d = useDB();
  const me = d.session.userId;
  const [open, setOpen] = useState(null);
  const mine = d.disputes.filter((x) => x.openedBy === me || x.againstId === me);
  return (
    <>
      <PageHead title="Disputes" sub="When something goes wrong, Buzz reviews the agreement, messages and tracking data and decides where held money goes" />
      {mine.length === 0 ? (
        <Card><EmptyState icon={Scale} title="No disputes" body="Hopefully it stays that way. If a collaboration goes wrong, use Report a problem on the collab." /></Card>
      ) : (
        <Card className="divide-y divide-line">
          {mine.map((x) => (
            <button key={x.id} onClick={() => setOpen(x.id)} className="w-full text-left p-4 flex flex-wrap items-center gap-3 hover:bg-canvas">
              <Scale size={18} className="text-ink-muted" />
              <div className="flex-1 min-w-[200px]"><p className="font-semibold">{x.reason}</p><p className="text-[12.5px] text-ink-muted">{campaignById(d, x.campaignId)?.productName} · with {displayName(userById(d, x.openedBy === me ? x.againstId : x.openedBy))} · {timeAgo(x.createdAt)}</p></div>
              <Badge tone={STATUS[x.status][1]}>{STATUS[x.status][0]}</Badge>
            </button>
          ))}
        </Card>
      )}
      {open && <Modal open onClose={() => setOpen(null)} title="Dispute" width="max-w-2xl"><DisputeThread x={d.disputes.find((y) => y.id === open)} /></Modal>}
    </>
  );
}
