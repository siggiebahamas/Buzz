import { useState } from 'react';
import { CircleDollarSign, Plus, CheckCircle2 } from 'lucide-react';
import { useDB, userById, actions, displayName } from '../lib/store';
import { STREAMS, isOn, setting, revenueSummary } from '../lib/monetize';
import { peso, timeAgo } from '../lib/format';
import { TOOLKIT } from '../lib/scout';
import { Card, Button, Badge, Input, Select, Modal, Field, Textarea, EmptyState, useAct, cx } from '../components/ui';

function Toggle({ on, onChange, label }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cx('relative h-6 w-11 rounded-full transition-colors shrink-0', on ? 'bg-emerald-500' : 'bg-line-strong')}>
      <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

export function RevenuePanel() {
  const d = useDB();
  const act = useAct();
  const [draft, setDraft] = useState({});
  const all = revenueSummary(d);
  const month = revenueSummary(d, 30);
  const groups = [...new Set(STREAMS.map((s) => s.group))];
  const val = (sid, key) => draft[`${sid}.${key}`] ?? setting(d, sid, key);
  const save = (s) => {
    const settings = Object.fromEntries(s.settings.map(([k]) => [k, Number(val(s.id, k))]));
    act(() => actions.setStream(s.id, { settings }), `${s.label}: prices saved`);
    setDraft((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !k.startsWith(`${s.id}.`))));
  };
  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4"><p className="text-[12.5px] text-ink-muted">Buzz revenue, last 30 days</p><p className="text-[26px] font-extrabold">{peso(month.total)}</p></Card>
        <Card className="p-4"><p className="text-[12.5px] text-ink-muted">Buzz revenue, all time</p><p className="text-[26px] font-extrabold">{peso(all.total)}</p></Card>
        <Card className="p-4"><p className="text-[12.5px] text-ink-muted">Streams switched on</p><p className="text-[26px] font-extrabold">{STREAMS.filter((s) => isOn(d, s.id)).length} <span className="text-[14px] font-medium text-ink-muted">of {STREAMS.length}</span></p></Card>
      </div>
      <p className="text-[13px] text-ink-muted">Switch a stream on and it appears on the site right away; switch it off and it disappears. Prices apply to new purchases only. Everything is in test mode until a payment provider is connected.</p>
      {groups.map((g) => (
        <section key={g}>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted mb-2">{g}</p>
          <div className="space-y-3">
            {STREAMS.filter((s) => s.group === g).map((s) => {
              const on = isOn(d, s.id);
              const dirty = s.settings.some(([k]) => draft[`${s.id}.${k}`] != null);
              return (
                <Card key={s.id} className={cx('p-4', on && 'border-emerald-200')}>
                  <div className="flex items-start gap-4">
                    <Toggle on={on} label={s.label} onChange={(v) => act(() => actions.setStream(s.id, { on: v }), `${s.label} ${v ? 'is live' : 'is off'}`)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{s.label}</p>{on ? <Badge tone="green">Live</Badge> : <Badge>Off</Badge>}<span className="ml-auto text-[13px] text-ink-soft">{peso(all.by[s.id] || 0)} earned</span></div>
                      <p className="text-[13px] text-ink-muted mt-0.5">{s.desc}</p>
                      {s.settings.length > 0 && (
                        <div className="flex flex-wrap items-end gap-3 mt-3">
                          {s.settings.map(([k, label]) => (
                            <label key={k} className="block"><span className="block text-[11.5px] text-ink-muted mb-1">{label}</span>
                              <Input type="number" min="0" step="any" value={val(s.id, k)} onChange={(e) => setDraft({ ...draft, [`${s.id}.${k}`]: e.target.value })} className="!h-9 !w-36" /></label>
                          ))}
                          {dirty && <Button size="sm" onClick={() => save(s)}>Save prices</Button>}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
      <Card className="p-5">
        <p className="font-bold mb-2">Latest revenue</p>
        {d.revenue.length === 0 ? <p className="text-[13px] text-ink-muted">Nothing yet.</p> : (
          <div className="divide-y divide-line">
            {[...d.revenue].sort((a, b) => b.ts - a.ts).slice(0, 15).map((r) => (
              <div key={r.id} className="py-2 flex items-center justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate">{r.note} <span className="text-ink-muted">· {displayName(userById(d, r.payer))} · {timeAgo(r.ts)}</span></span>
                <b className="shrink-0 text-emerald-700">+{peso(r.amount)}</b>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// Store buyers to verify, placements made, and toolkit partner referrals.
export function RetailPanel() {
  const d = useDB();
  const act = useAct();
  const [editing, setEditing] = useState(null);
  const pending = d.users.filter((u) => u.buyer && !u.buyer.verified);
  const placed = d.storeRequests.filter((r) => r.status === 'ordered');
  const LEAD = { new: 'Intro sent', contacted: 'Contacted', closed: 'Became customer', lost: 'No deal' };
  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4"><p className="text-[12.5px] text-ink-muted">Verified store buyers</p><p className="text-[26px] font-extrabold">{d.users.filter((u) => u.buyer?.verified).length}</p></Card>
        <Card className="p-4"><p className="text-[12.5px] text-ink-muted">Store placements · fees</p><p className="text-[26px] font-extrabold">{placed.length} <span className="text-[15px] font-semibold text-ink-muted">· {peso(placed.reduce((a, r) => a + (r.fee || 0), 0))}</span></p></Card>
        <Card className="p-4"><p className="text-[12.5px] text-ink-muted">Toolkit referrals closed · fees</p><p className="text-[26px] font-extrabold">{d.partnerLeads.filter((l) => l.status === 'closed').length} <span className="text-[15px] font-semibold text-ink-muted">· {peso(d.partnerLeads.reduce((a, l) => a + (l.fee || 0), 0))}</span></p></Card>
      </div>

      <section>
        <p className="font-bold mb-2">Store buyers to verify ({pending.length})</p>
        {pending.length === 0 ? <Card className="p-4 text-[13px] text-ink-muted">Nobody waiting.</Card> : (
          <Card className="divide-y divide-line">
            {pending.map((u) => (
              <div key={u.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[220px]"><p className="font-semibold">{u.buyer.company}</p><p className="text-[12.5px] text-ink-muted">{u.name} · {u.buyer.role} · {u.buyer.channel} · {u.buyer.stores} store{u.buyer.stores > 1 ? 's' : ''} · {u.email}</p></div>
                <Button size="sm" variant="outline" onClick={() => act(() => actions.verifyBuyer(u.id, false), 'Declined')}>Decline</Button>
                <Button size="sm" onClick={() => act(() => actions.verifyBuyer(u.id, true), 'Verified')}>Verify</Button>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <p className="font-bold mb-2">Store requests</p>
        <Card className="divide-y divide-line">
          {d.storeRequests.map((r) => (
            <div key={r.id} className="p-3 px-4 flex flex-wrap items-center gap-3 text-[13.5px]">
              <span className="flex-1 min-w-[220px]"><b>{userById(d, r.buyerId)?.buyer?.company}</b> → {displayName(userById(d, r.brandId))} <span className="text-ink-muted">· {timeAgo(r.createdAt)}</span></span>
              <Badge tone={r.status === 'ordered' ? 'green' : r.status === 'talking' ? 'blue' : r.status === 'declined' ? 'neutral' : 'soft'}>{r.status}</Badge>
              {r.orderValue ? <span className="font-semibold">{peso(r.orderValue)}{r.fee ? <span className="text-emerald-700"> · fee {peso(r.fee)}</span> : ''}</span> : null}
            </div>
          ))}
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2"><p className="font-bold">Toolkit partners</p><Button size="sm" variant="outline" onClick={() => setEditing({ category: 'packaging', region: 'Nationwide', active: true })}><Plus size={14} />Add partner</Button></div>
        <Card className="divide-y divide-line">
          {d.partners.map((p) => (
            <div key={p.id} className="p-3 px-4 flex flex-wrap items-center gap-3 text-[13.5px]">
              <span className="flex-1 min-w-[220px]"><b>{p.name}</b> <span className="text-ink-muted">· {p.category} · {p.perk}</span></span>
              <span className="text-ink-muted">{peso(p.fee || setting(d, 'partnerReferrals', 'defaultFee'))} per customer</span>
              {!p.active && <Badge>Hidden</Badge>}
              <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <p className="font-bold mb-2">Referrals</p>
        {d.partnerLeads.length === 0 ? <Card><EmptyState icon={CircleDollarSign} title="No intros yet" /></Card> : (
          <Card className="divide-y divide-line">
            {d.partnerLeads.map((l) => {
              const p = d.partners.find((x) => x.id === l.partnerId);
              return (
                <div key={l.id} className="p-3 px-4 flex flex-wrap items-center gap-3 text-[13.5px]">
                  <span className="flex-1 min-w-[220px]"><b>{displayName(userById(d, l.userId))}</b> → {p?.name} <span className="text-ink-muted">· {timeAgo(l.createdAt)}{l.note ? ` · "${l.note}"` : ''}</span></span>
                  {l.fee ? <span className="text-emerald-700 font-semibold">+{peso(l.fee)}</span> : null}
                  <Select value={l.status} disabled={l.status === 'closed'} onChange={(e) => act(() => actions.updateLead(l.id, e.target.value), 'Updated')} className="!h-9 !w-44">
                    {Object.entries(LEAD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
              );
            })}
          </Card>
        )}
      </section>
      {editing && <PartnerModal p={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function PartnerModal({ p, onClose }) {
  const act = useAct();
  const [f, setF] = useState({ ...p });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <Modal open onClose={onClose} title={p.id ? 'Edit partner' : 'Add partner'}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Name" className="sm:col-span-2"><Input value={f.name || ''} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Category"><Select value={f.category} onChange={(e) => set('category', e.target.value)}>{TOOLKIT.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Region"><Input value={f.region || ''} onChange={(e) => set('region', e.target.value)} /></Field>
        <Field label="What they do" className="sm:col-span-2"><Textarea value={f.blurb || ''} onChange={(e) => set('blurb', e.target.value)} className="!min-h-[60px]" /></Field>
        <Field label="Perk for Buzz sellers" className="sm:col-span-2"><Input value={f.perk || ''} onChange={(e) => set('perk', e.target.value)} placeholder="e.g. 10% off first order" /></Field>
        <Field label="Referral fee per customer (₱)"><Input type="number" min="0" value={f.fee || ''} onChange={(e) => set('fee', e.target.value)} /></Field>
        <Field label="Show to sellers"><Select value={f.active ? 'yes' : 'no'} onChange={(e) => set('active', e.target.value === 'yes')}><option value="yes">Yes</option><option value="no">Hidden</option></Select></Field>
      </div>
      <Button size="lg" className="w-full mt-4" onClick={() => { if (act(() => actions.savePartner(f), 'Saved')) onClose(); }}>Save</Button>
    </Modal>
  );
}
