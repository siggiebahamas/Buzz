import { useState } from 'react';
import { CircleDollarSign, Plus, CheckCircle2 } from 'lucide-react';
import { useDB, userById, actions, displayName } from '../lib/store';
import { STREAMS, isOn, setting, revenueSummary } from '../lib/monetize';
import { peso, timeAgo } from '../lib/format';
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

export function OrdersPanel() {
  const d = useDB();
  const act = useAct();
  const [adding, setAdding] = useState(false);
  const [ev, setEv] = useState({ kind: 'Workshop', title: '', date: '', place: 'Online (Zoom)', price: 499, seats: 50, audience: 'business', desc: '' });
  return (
    <div className="mt-6 space-y-6">
      <section>
        <p className="font-bold mb-2">Service orders</p>
        {d.orders.length === 0 ? <Card><EmptyState icon={CircleDollarSign} title="No orders yet" body="Orders appear when Services, Managed campaigns or Paid hand-picks are switched on and bought." /></Card> : (
          <Card className="divide-y divide-line">
            {d.orders.map((o) => (
              <div key={o.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[220px]"><p className="font-semibold">{o.name}</p><p className="text-[12.5px] text-ink-muted">{displayName(userById(d, o.userId))} · {peso(o.price)} · {timeAgo(o.createdAt)}{o.notes ? ` · "${o.notes}"` : ''}</p></div>
                <Select value={o.status} onChange={(e) => act(() => actions.updateOrder(o.id, e.target.value), 'Customer notified')} className="!h-9 !w-40">
                  <option value="new">Received</option><option value="progress">In progress</option><option value="delivered">Delivered</option>
                </Select>
              </div>
            ))}
          </Card>
        )}
      </section>
      <section>
        <div className="flex items-center justify-between mb-2"><p className="font-bold">Events</p><Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus size={14} />Add event</Button></div>
        <Card className="divide-y divide-line">
          {d.meetups.map((e) => {
            const sold = d.eventTickets.filter((t) => t.eventId === e.id).reduce((a, t) => a + t.qty, 0);
            return <div key={e.id} className="p-4 flex flex-wrap items-center gap-3 text-[13.5px]"><span className="flex-1 min-w-[200px]"><b>{e.title}</b> <span className="text-ink-muted">· {new Date(e.date).toLocaleDateString('en-PH')} · {e.place}</span></span><span>{sold}/{e.seats} booked</span><span className="font-semibold">{peso(sold * e.price)}</span></div>;
          })}
        </Card>
        {!isOn(d, 'events') && <p className="text-[12.5px] text-ink-muted mt-2">Events are off, so this list isn't public yet.</p>}
      </section>
      {adding && (
        <Modal open onClose={() => setAdding(false)} title="Add an event">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Type"><Select value={ev.kind} onChange={(e) => setEv({ ...ev, kind: e.target.value })}><option>Workshop</option><option>Pop-up</option><option>Meetup</option></Select></Field>
            <Field label="For"><Select value={ev.audience} onChange={(e) => setEv({ ...ev, audience: e.target.value })}><option value="business">Founders</option><option value="creator">Creators</option><option value="all">Everyone</option></Select></Field>
            <Field label="Title" className="sm:col-span-2"><Input value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} /></Field>
            <Field label="Date"><Input type="date" value={ev.date} onChange={(e) => setEv({ ...ev, date: e.target.value })} /></Field>
            <Field label="Place"><Input value={ev.place} onChange={(e) => setEv({ ...ev, place: e.target.value })} /></Field>
            <Field label="Price (₱)"><Input type="number" value={ev.price} onChange={(e) => setEv({ ...ev, price: e.target.value })} /></Field>
            <Field label="Seats"><Input type="number" value={ev.seats} onChange={(e) => setEv({ ...ev, seats: e.target.value })} /></Field>
            <Field label="Description" className="sm:col-span-2"><Textarea value={ev.desc} onChange={(e) => setEv({ ...ev, desc: e.target.value })} className="!min-h-[70px]" /></Field>
          </div>
          <Button className="w-full mt-4" disabled={!ev.title.trim() || !ev.date} onClick={() => { act(() => actions.addEvent(ev), 'Event added'); setAdding(false); }}><CheckCircle2 size={15} />Add event</Button>
        </Modal>
      )}
    </div>
  );
}
