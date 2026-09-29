import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Plus, Wallet, BarChart2, Check, RotateCcw, Upload } from 'lucide-react';
import { useDB, userById, campaignById, brandName, actions, membersOf } from '../../lib/store';
import { PLATFORMS, DELIVERABLE_TYPES } from '../../lib/constants';
import { peso, compact, dueLabel, DAY, shortDate } from '../../lib/format';
import { Card, Button, Badge, Avatar, Select, Modal, Field, Input, Textarea, cx, useAct } from '../../components/ui';
import { SubmitDeliverableModal } from '../../components/forms';
import { useMode, ModeToggle, PageHead } from './Layout';

const COLS = [
  ['todo', 'To do'], ['revision', 'Revision requested'], ['submitted', 'Awaiting approval'], ['approved', 'Approved'],
];

function AddDeliverable({ onClose, campaigns }) {
  const d = useDB();
  const act = useAct();
  const [f, setF] = useState(() => {
    const c = campaigns[0];
    return { campaignId: c?.id || '', creatorId: membersOf(d, c?.id)[0] || '', type: 'Reel', platform: 'instagram', due: new Date(Date.now() + 10 * DAY).toISOString().slice(0, 10), fee: 0 };
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const members = membersOf(d, f.campaignId);
  const submit = (e) => {
    e.preventDefault();
    const c = campaignById(d, f.campaignId);
    if (act(() => actions.addDeliverable({ campaignId: f.campaignId, creatorId: f.creatorId, type: f.type, platform: f.platform, dueAt: new Date(f.due).getTime(), fee: Number(f.fee) || 0, title: `${f.type} for ${c.productName}` }), 'Deliverable added')) onClose();
  };
  return (
    <Modal open onClose={onClose} title="Add a deliverable" subtitle="The creator gets notified with the due date and fee.">
      {campaigns.length === 0 ? <p className="text-sm text-ink-muted">You need a campaign with at least one accepted creator first.</p> : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Campaign"><Select value={f.campaignId} onChange={(e) => { set('campaignId', e.target.value); set('creatorId', membersOf(d, e.target.value)[0] || ''); }}>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.productName}</option>)}</Select></Field>
            <Field label="Creator"><Select value={f.creatorId} onChange={(e) => set('creatorId', e.target.value)}>{members.map((m) => <option key={m} value={m}>{userById(d, m)?.name}</option>)}</Select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><Select value={f.type} onChange={(e) => set('type', e.target.value)}>{DELIVERABLE_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Platform"><Select value={f.platform} onChange={(e) => set('platform', e.target.value)}>{Object.entries(PLATFORMS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</Select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due date"><Input type="date" value={f.due} onChange={(e) => set('due', e.target.value)} /></Field>
            <Field label="Fee (₱)"><Input type="number" min="0" value={f.fee} onChange={(e) => set('fee', e.target.value)} /></Field>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={!f.creatorId}>Add deliverable</Button>
        </form>
      )}
    </Modal>
  );
}

function RevisionModal({ x, onClose }) {
  const act = useAct();
  const [note, setNote] = useState('');
  return (
    <Modal open onClose={onClose} title="Request a revision" subtitle={x.title}>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should change? Be specific." />
      <Button className="w-full mt-4" size="lg" disabled={!note.trim()} onClick={() => { if (act(() => actions.reviewDeliverable(x.id, false, note.trim()), 'Revision requested')) onClose(); }}>Send request</Button>
    </Modal>
  );
}

export default function Deliverables() {
  const d = useDB();
  const act = useAct();
  const { mode, me } = useMode();
  const biz = mode === 'business';
  const [cid, setCid] = useState('all');
  const [modal, setModal] = useState(null);
  const myCamps = d.campaigns.filter((c) => c.ownerId === me.id);
  const campIds = new Set(myCamps.map((c) => c.id));
  const all = d.deliverables.filter((x) => (biz ? campIds.has(x.campaignId) : x.creatorId === me.id));
  const rows = all.filter((x) => cid === 'all' || x.campaignId === cid);
  const campaignsInView = [...new Set(all.map((x) => x.campaignId))].map((id) => campaignById(d, id)).filter(Boolean);
  const unpaid = rows.filter((x) => x.status === 'approved' && x.fee && !x.paidAt).reduce((a, x) => a + x.fee, 0);
  const overdue = rows.filter((x) => ['todo', 'revision'].includes(x.status) && x.dueAt < Date.now()).length;

  return (
    <>
      <PageHead title="Deliverables" sub={biz ? 'Approve content and track payments to creators' : 'Your content tasks, due dates and payouts'}
        action={<><ModeToggle />{biz && <Button onClick={() => setModal({ kind: 'add' })}><Plus size={16} />Add deliverable</Button>}</>} />
      <div className="flex items-center gap-4 mb-5">
        <div className="w-72"><Select value={cid} onChange={(e) => setCid(e.target.value)}><option value="all">All campaigns</option>{campaignsInView.map((c) => <option key={c.id} value={c.id}>{c.productName}</option>)}</Select></div>
        <span className="text-[13px] text-ink-muted">{rows.length} deliverables · {overdue > 0 ? <b className="text-rose-600">{overdue} overdue</b> : 'none overdue'} · {peso(unpaid)} {biz ? 'to pay' : 'waiting for payment'}</span>
      </div>
      <div className="grid grid-cols-4 gap-4 items-start">
        {COLS.map(([status, label]) => {
          const items = rows.filter((x) => x.status === status).sort((a, b) => (status === 'approved' ? b.approvedAt - a.approvedAt : a.dueAt - b.dueAt));
          return (
            <div key={status} className="bg-[#F1EEE8] rounded-2xl p-3">
              <p className="text-[13px] font-semibold px-1 mb-2.5 flex justify-between">{label}<span className="text-ink-muted font-normal">{items.length}</span></p>
              <div className="space-y-2.5">
                {items.length === 0 && <p className="text-[12.5px] text-ink-faint px-1 py-3">Nothing here</p>}
                {items.map((x) => {
                  const c = campaignById(d, x.campaignId);
                  const other = biz ? userById(d, x.creatorId) : userById(d, c.ownerId);
                  const late = ['todo', 'revision'].includes(x.status) && x.dueAt < Date.now();
                  const eng = x.stats ? ((x.stats.likes + x.stats.comments + x.stats.shares + x.stats.saves) / Math.max(1, x.stats.reach)) * 100 : null;
                  return (
                    <Card key={x.id} className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: PLATFORMS[x.platform]?.color }} />
                        <span className="text-[12px] text-ink-muted">{PLATFORMS[x.platform]?.label} · {x.type}</span>
                      </div>
                      <Link to={biz ? `/workspace/campaigns/${c.id}` : `/opportunity/${c.id}`} className="block font-semibold text-[14px] mt-1 hover:underline">{c.productName}</Link>
                      <p className="flex items-center gap-1.5 text-[12.5px] text-ink-soft mt-1"><Avatar user={other} size={18} />{biz ? other.name : brandName(other)}</p>
                      {x.note && x.status === 'revision' && <p className="text-[12px] bg-rose-50 text-rose-700 rounded-lg p-2 mt-2">"{x.note}"</p>}
                      <div className="flex items-center justify-between mt-2.5 text-[12px]">
                        <span className={cx(late ? 'text-rose-600 font-semibold' : 'text-ink-muted')}>{status === 'approved' ? `Approved ${shortDate(x.approvedAt)}` : status === 'submitted' ? `Sent ${shortDate(x.submittedAt)}` : dueLabel(x.dueAt)}</span>
                        <span className="font-semibold">{x.fee ? peso(x.fee) : 'Commission'}</span>
                      </div>
                      {x.stats && <p className="text-[12px] text-ink-muted mt-1">{compact(x.stats.reach)} reach · {eng.toFixed(1)}% eng.</p>}
                      {status === 'approved' && x.fee > 0 && <div className="mt-2">{x.paidAt ? <Badge tone="green">Paid {shortDate(x.paidAt)}</Badge> : <Badge tone="soft">Payment pending</Badge>}</div>}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {x.contentUrl && <a href={x.contentUrl} target="_blank" rel="noreferrer" className="h-7 px-2 rounded-lg border border-line text-[12px] inline-flex items-center gap-1 hover:bg-canvas"><ExternalLink size={12} />Post</a>}
                        {!biz && ['todo', 'revision'].includes(status) && <Button size="sm" className="h-7 text-[12px]" onClick={() => setModal({ kind: 'submit', x })}><Upload size={12} />Submit</Button>}
                        {!biz && ['submitted', 'approved'].includes(status) && <Button size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => setModal({ kind: 'submit', x })}><BarChart2 size={12} />Update stats</Button>}
                        {biz && status === 'submitted' && (
                          <>
                            <Button size="sm" className="h-7 text-[12px]" onClick={() => act(() => actions.reviewDeliverable(x.id, true), 'Approved')}><Check size={12} />Approve</Button>
                            <Button size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => setModal({ kind: 'revise', x })}><RotateCcw size={12} />Revise</Button>
                          </>
                        )}
                        {biz && status === 'approved' && x.fee > 0 && !x.paidAt && <Button size="sm" variant="soft" className="h-7 text-[12px]" onClick={() => act(() => actions.markPaid(x.id), 'Marked as paid')}><Wallet size={12} />Mark paid</Button>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {modal?.kind === 'add' && <AddDeliverable onClose={() => setModal(null)} campaigns={myCamps.filter((c) => membersOf(d, c.id).length)} />}
      {modal?.kind === 'submit' && <SubmitDeliverableModal open deliverable={modal.x} onClose={() => setModal(null)} />}
      {modal?.kind === 'revise' && <RevisionModal x={modal.x} onClose={() => setModal(null)} />}
    </>
  );
}
