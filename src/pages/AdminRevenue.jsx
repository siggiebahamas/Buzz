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
